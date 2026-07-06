-- ============================================================
-- ONEPILOT
-- 009_hr_absences_automation.sql
--
-- Automatisation du module Absences & congés :
-- - règles de droits par type de contrat et type d'absence ;
-- - sélection automatique du calendrier selon le site/pays ;
-- - calcul des jours ouvrés selon le rythme de travail ;
-- - exclusion automatique des jours fériés ;
-- - calcul et synchronisation automatique des soldes ;
-- - archivage réversible des demandes ;
-- - vue enrichie pour l'interface.
--
-- Dépendances :
-- - 001_hr_architecture.sql
-- - 002_hr_members.sql
-- - 008_hr_absences.sql
-- ============================================================

begin;

-- ============================================================
-- 1. Règles de droits par contrat et type d'absence
-- ============================================================

create table if not exists public.hr_absence_entitlement_rules (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  contract_type_id uuid
    references public.hr_contract_types(id)
    on delete cascade,

  absence_type_id uuid not null
    references public.hr_absence_types(id)
    on delete cascade,

  annual_entitlement numeric(10, 2) not null default 0,

  accrual_frequency text not null default 'annual',

  accrual_start_month integer not null default 1,

  carryover_allowed boolean not null default false,

  maximum_carryover numeric(10, 2),

  prorata_on_arrival boolean not null default true,

  prorata_on_departure boolean not null default true,

  is_active boolean not null default true,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_absence_entitlement_rules_frequency_valid
    check (
      accrual_frequency in (
        'annual',
        'monthly',
        'none'
      )
    ),

  constraint hr_absence_entitlement_rules_start_month_valid
    check (
      accrual_start_month between 1 and 12
    ),

  constraint hr_absence_entitlement_rules_entitlement_valid
    check (
      annual_entitlement >= 0
    ),

  constraint hr_absence_entitlement_rules_carryover_valid
    check (
      maximum_carryover is null
      or maximum_carryover >= 0
    )
);

create unique index if not exists
  hr_absence_entitlement_rules_unique_contract_type
on public.hr_absence_entitlement_rules (
  organization_id,
  contract_type_id,
  absence_type_id
)
where contract_type_id is not null;

create unique index if not exists
  hr_absence_entitlement_rules_unique_default
on public.hr_absence_entitlement_rules (
  organization_id,
  absence_type_id
)
where contract_type_id is null;

create index if not exists
  hr_absence_entitlement_rules_organization_idx
on public.hr_absence_entitlement_rules (
  organization_id
);

drop trigger if exists
  hr_absence_entitlement_rules_set_updated_at
on public.hr_absence_entitlement_rules;

create trigger
  hr_absence_entitlement_rules_set_updated_at
before update
on public.hr_absence_entitlement_rules
for each row
execute function public.set_updated_at();

-- ============================================================
-- 2. Colonnes de calcul et d'archivage des demandes
-- ============================================================

alter table public.hr_absence_requests
  add column if not exists holiday_calendar_id uuid
    references public.hr_holiday_calendars(id)
    on delete set null;

alter table public.hr_absence_requests
  add column if not exists work_schedule_id uuid
    references public.hr_work_schedules(id)
    on delete set null;

alter table public.hr_absence_requests
  add column if not exists contract_type_id uuid
    references public.hr_contract_types(id)
    on delete set null;

alter table public.hr_absence_requests
  add column if not exists calendar_days numeric(10, 2)
    not null default 0;

alter table public.hr_absence_requests
  add column if not exists working_days numeric(10, 2)
    not null default 0;

alter table public.hr_absence_requests
  add column if not exists holiday_days numeric(10, 2)
    not null default 0;

alter table public.hr_absence_requests
  add column if not exists non_working_days numeric(10, 2)
    not null default 0;

alter table public.hr_absence_requests
  add column if not exists calculation_details jsonb
    not null default '{}'::jsonb;

alter table public.hr_absence_requests
  add column if not exists is_archived boolean
    not null default false;

alter table public.hr_absence_requests
  add column if not exists archived_at timestamptz;

alter table public.hr_absence_requests
  add column if not exists archived_by uuid
    references auth.users(id)
    on delete set null;

create index if not exists
  hr_absence_requests_archived_idx
on public.hr_absence_requests (
  organization_id,
  is_archived
);

-- ============================================================
-- 3. Colonnes complémentaires des soldes
-- ============================================================

alter table public.hr_absence_balances
  add column if not exists entitlement_rule_id uuid
    references public.hr_absence_entitlement_rules(id)
    on delete set null;

alter table public.hr_absence_balances
  add column if not exists annual_entitlement numeric(10, 2)
    not null default 0;

alter table public.hr_absence_balances
  add column if not exists carried_over_amount numeric(10, 2)
    not null default 0;

alter table public.hr_absence_balances
  add column if not exists calculated_at timestamptz;

-- ============================================================
-- 4. Normalisation de l'unité
-- ============================================================

update public.hr_absence_types
set unit = 'day'
where unit is null
   or unit not in (
     'hour',
     'half_day',
     'day'
   );

-- ============================================================
-- 5. Récupération du contrat actif d'un collaborateur
-- ============================================================

create or replace function public.get_hr_employee_active_contract(
  target_employee_id uuid,
  reference_date date default current_date
)
returns table (
  contract_id uuid,
  contract_type_id uuid,
  work_schedule_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    contract.id,
    contract.contract_type_id,
    contract.work_schedule_id
  from public.hr_employee_contracts contract
  where contract.employee_id = target_employee_id
    and contract.start_date <= reference_date
    and (
      contract.end_date is null
      or contract.end_date >= reference_date
    )
    and coalesce(contract.is_active, true) = true
  order by
    contract.is_primary desc,
    contract.start_date desc,
    contract.created_at desc
  limit 1;
$$;

-- ============================================================
-- 6. Calendrier applicable au collaborateur
-- ============================================================

create or replace function public.get_hr_employee_holiday_calendar(
  target_employee_id uuid
)
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  target_organization_id uuid;
  target_site_id uuid;
  target_country_code text;
  selected_calendar_id uuid;
begin
  select
    employee.organization_id,
    employee.site_id,
    coalesce(
      site.country_code,
      employee.country_code
    )
  into
    target_organization_id,
    target_site_id,
    target_country_code
  from public.hr_employees employee
  left join public.hr_sites site
    on site.id = employee.site_id
   and site.organization_id = employee.organization_id
  where employee.id = target_employee_id;

  if target_organization_id is null then
    return null;
  end if;

  -- Priorité 1 : calendrier du site.
  select calendar.id
  into selected_calendar_id
  from public.hr_holiday_calendars calendar
  where calendar.organization_id =
    target_organization_id
    and calendar.is_active = true
    and calendar.site_id = target_site_id
  order by
    calendar.is_default desc,
    calendar.created_at asc
  limit 1;

  if selected_calendar_id is not null then
    return selected_calendar_id;
  end if;

  -- Priorité 2 : calendrier du pays.
  select calendar.id
  into selected_calendar_id
  from public.hr_holiday_calendars calendar
  where calendar.organization_id =
    target_organization_id
    and calendar.is_active = true
    and calendar.site_id is null
    and upper(calendar.country_code) =
      upper(target_country_code)
  order by
    calendar.is_default desc,
    calendar.created_at asc
  limit 1;

  if selected_calendar_id is not null then
    return selected_calendar_id;
  end if;

  -- Priorité 3 : calendrier par défaut de l'organisation.
  select calendar.id
  into selected_calendar_id
  from public.hr_holiday_calendars calendar
  where calendar.organization_id =
    target_organization_id
    and calendar.is_active = true
    and calendar.is_default = true
  order by calendar.created_at asc
  limit 1;

  return selected_calendar_id;
end;
$$;

-- ============================================================
-- 7. Calcul des jours d'absence réellement décomptés
-- ============================================================

create or replace function public.calculate_hr_absence_amount(
  target_employee_id uuid,
  target_start_date date,
  target_end_date date,
  target_start_period text default 'full_day',
  target_end_period text default 'full_day'
)
returns table (
  calendar_days numeric,
  working_days numeric,
  holiday_days numeric,
  non_working_days numeric,
  requested_amount numeric,
  holiday_calendar_id uuid,
  work_schedule_id uuid,
  contract_type_id uuid,
  calculation_details jsonb
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  current_day date;
  current_day_hours numeric;
  current_day_amount numeric;

  selected_calendar_id uuid;
  selected_schedule_id uuid;
  selected_contract_type_id uuid;

  selected_schedule public.hr_work_schedules%rowtype;

  total_calendar_days numeric := 0;
  total_working_days numeric := 0;
  total_holiday_days numeric := 0;
  total_non_working_days numeric := 0;

  is_holiday boolean;
  holiday_is_working boolean;
  holiday_hours numeric;

  day_details jsonb := '[]'::jsonb;
begin
  if target_start_date is null
    or target_end_date is null
  then
    raise exception
      'Les dates de début et de fin sont obligatoires.';
  end if;

  if target_end_date < target_start_date then
    raise exception
      'La date de fin ne peut pas précéder la date de début.';
  end if;

  select
    active_contract.contract_type_id,
    active_contract.work_schedule_id
  into
    selected_contract_type_id,
    selected_schedule_id
  from public.get_hr_employee_active_contract(
    target_employee_id,
    target_start_date
  ) active_contract;

  if selected_schedule_id is not null then
    select *
    into selected_schedule
    from public.hr_work_schedules schedule
    where schedule.id = selected_schedule_id;
  end if;

  selected_calendar_id :=
    public.get_hr_employee_holiday_calendar(
      target_employee_id
    );

  current_day := target_start_date;

  while current_day <= target_end_date loop
    total_calendar_days :=
      total_calendar_days + 1;

    current_day_hours :=
      case extract(isodow from current_day)
        when 1 then coalesce(
          selected_schedule.monday_hours,
          7
        )
        when 2 then coalesce(
          selected_schedule.tuesday_hours,
          7
        )
        when 3 then coalesce(
          selected_schedule.wednesday_hours,
          7
        )
        when 4 then coalesce(
          selected_schedule.thursday_hours,
          7
        )
        when 5 then coalesce(
          selected_schedule.friday_hours,
          7
        )
        when 6 then coalesce(
          selected_schedule.saturday_hours,
          0
        )
        when 7 then coalesce(
          selected_schedule.sunday_hours,
          0
        )
        else 0
      end;

    select
      true,
      holiday.is_working_day,
      holiday.hours_override
    into
      is_holiday,
      holiday_is_working,
      holiday_hours
    from public.hr_holidays holiday
    where holiday.calendar_id =
      selected_calendar_id
      and holiday.holiday_date =
        current_day
    limit 1;

    is_holiday :=
      coalesce(is_holiday, false);

    holiday_is_working :=
      coalesce(
        holiday_is_working,
        false
      );

    if is_holiday
      and holiday_hours is not null
    then
      current_day_hours :=
        holiday_hours;
    end if;

    if is_holiday
      and not holiday_is_working
    then
      total_holiday_days :=
        total_holiday_days + 1;

      current_day_amount := 0;

    elsif current_day_hours <= 0 then
      total_non_working_days :=
        total_non_working_days + 1;

      current_day_amount := 0;

    else
      current_day_amount := 1;

      if target_start_date = target_end_date then
        if target_start_period <> 'full_day'
          or target_end_period <> 'full_day'
        then
          current_day_amount := 0.5;
        end if;

      else
        if current_day = target_start_date
          and target_start_period = 'afternoon'
        then
          current_day_amount := 0.5;
        end if;

        if current_day = target_end_date
          and target_end_period = 'morning'
        then
          current_day_amount := 0.5;
        end if;
      end if;

      total_working_days :=
        total_working_days +
        current_day_amount;
    end if;

    day_details :=
      day_details ||
      jsonb_build_array(
        jsonb_build_object(
          'date',
          current_day,
          'scheduled_hours',
          current_day_hours,
          'is_holiday',
          is_holiday,
          'is_working_holiday',
          holiday_is_working,
          'amount',
          current_day_amount
        )
      );

    current_day :=
      current_day + 1;

    is_holiday := false;
    holiday_is_working := false;
    holiday_hours := null;
  end loop;

  return query
  select
    total_calendar_days,
    total_working_days,
    total_holiday_days,
    total_non_working_days,
    total_working_days,
    selected_calendar_id,
    selected_schedule_id,
    selected_contract_type_id,
    jsonb_build_object(
      'days',
      day_details,
      'calculated_at',
      now()
    );
end;
$$;

grant execute
on function public.calculate_hr_absence_amount(
  uuid,
  date,
  date,
  text,
  text
)
to authenticated;

-- ============================================================
-- 8. Calcul automatique avant enregistrement
-- ============================================================

create or replace function public.set_hr_absence_calculation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  calculation record;
begin
  select *
  into calculation
  from public.calculate_hr_absence_amount(
    new.employee_id,
    new.start_date,
    new.end_date,
    new.start_period,
    new.end_period
  );

  new.calendar_days :=
    calculation.calendar_days;

  new.working_days :=
    calculation.working_days;

  new.holiday_days :=
    calculation.holiday_days;

  new.non_working_days :=
    calculation.non_working_days;

  new.requested_amount :=
    calculation.requested_amount;

  new.holiday_calendar_id :=
    calculation.holiday_calendar_id;

  new.work_schedule_id :=
    calculation.work_schedule_id;

  new.contract_type_id :=
    calculation.contract_type_id;

  new.calculation_details :=
    calculation.calculation_details;

  return new;
end;
$$;

drop trigger if exists
  hr_absence_requests_set_calculation
on public.hr_absence_requests;

create trigger
  hr_absence_requests_set_calculation
before insert or update of
  employee_id,
  start_date,
  end_date,
  start_period,
  end_period
on public.hr_absence_requests
for each row
execute function public.set_hr_absence_calculation();

-- ============================================================
-- 9. Recherche de la règle applicable
-- ============================================================

create or replace function public.get_hr_absence_entitlement_rule(
  target_organization_id uuid,
  target_contract_type_id uuid,
  target_absence_type_id uuid
)
returns public.hr_absence_entitlement_rules
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  selected_rule public.hr_absence_entitlement_rules%rowtype;
begin
  select rule.*
  into selected_rule
  from public.hr_absence_entitlement_rules rule
  where rule.organization_id =
    target_organization_id
    and rule.absence_type_id =
      target_absence_type_id
    and rule.is_active = true
    and (
      rule.contract_type_id =
        target_contract_type_id
      or rule.contract_type_id is null
    )
  order by
    (
      rule.contract_type_id =
      target_contract_type_id
    ) desc
  limit 1;

  return selected_rule;
end;
$$;

-- ============================================================
-- 10. Initialisation automatique du solde annuel
-- ============================================================

create or replace function public.ensure_hr_absence_balance(
  target_request_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_request public.hr_absence_requests%rowtype;
  entitlement_rule public.hr_absence_entitlement_rules%rowtype;

  selected_balance_id uuid;

  target_period_start date;
  target_period_end date;

  target_entitlement numeric := 0;
begin
  select *
  into target_request
  from public.hr_absence_requests request
  where request.id = target_request_id;

  if target_request.id is null then
    return null;
  end if;

  target_period_start :=
    make_date(
      extract(
        year from target_request.start_date
      )::integer,
      1,
      1
    );

  target_period_end :=
    make_date(
      extract(
        year from target_request.start_date
      )::integer,
      12,
      31
    );

  entitlement_rule :=
    public.get_hr_absence_entitlement_rule(
      target_request.organization_id,
      target_request.contract_type_id,
      target_request.absence_type_id
    );

  target_entitlement :=
    coalesce(
      entitlement_rule.annual_entitlement,
      0
    );

  insert into public.hr_absence_balances (
    organization_id,
    employee_id,
    absence_type_id,
    period_start,
    period_end,
    entitlement_rule_id,
    annual_entitlement,
    opening_balance,
    accrued_amount,
    adjustment_amount,
    consumed_amount,
    pending_amount,
    calculated_at
  )
  values (
    target_request.organization_id,
    target_request.employee_id,
    target_request.absence_type_id,
    target_period_start,
    target_period_end,
    entitlement_rule.id,
    target_entitlement,
    0,
    target_entitlement,
    0,
    0,
    0,
    now()
  )
  on conflict (
    organization_id,
    employee_id,
    absence_type_id,
    period_start,
    period_end
  )
  do update
  set
    entitlement_rule_id =
      excluded.entitlement_rule_id,

    annual_entitlement =
      excluded.annual_entitlement,

    accrued_amount =
      excluded.accrued_amount,

    calculated_at = now(),

    updated_at = now()
  returning id
  into selected_balance_id;

  update public.hr_absence_requests
  set balance_id =
    selected_balance_id
  where id = target_request_id
    and balance_id is distinct from
      selected_balance_id;

  return selected_balance_id;
end;
$$;

-- ============================================================
-- 11. Recalcul intégral d'un solde
-- ============================================================

create or replace function public.recalculate_hr_absence_balance(
  target_balance_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_balance public.hr_absence_balances%rowtype;
  calculated_consumed numeric := 0;
  calculated_pending numeric := 0;
begin
  select *
  into target_balance
  from public.hr_absence_balances balance
  where balance.id = target_balance_id;

  if target_balance.id is null then
    return;
  end if;

  select
    coalesce(
      sum(request.requested_amount)
        filter (
          where request.status = 'approved'
            and request.is_archived = false
        ),
      0
    ),

    coalesce(
      sum(request.requested_amount)
        filter (
          where request.status in (
            'submitted',
            'manager_approved'
          )
            and request.is_archived = false
        ),
      0
    )
  into
    calculated_consumed,
    calculated_pending
  from public.hr_absence_requests request
  where request.balance_id =
    target_balance_id;

  update public.hr_absence_balances
  set
    consumed_amount =
      calculated_consumed,

    pending_amount =
      calculated_pending,

    calculated_at = now(),

    updated_at = now()
  where id = target_balance_id;
end;
$$;

-- ============================================================
-- 12. Synchronisation après création ou changement
-- ============================================================

create or replace function public.sync_hr_absence_request_balance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_balance_id uuid;
begin
  if tg_op = 'DELETE' then
    if old.balance_id is not null then
      perform
        public.recalculate_hr_absence_balance(
          old.balance_id
        );
    end if;

    return old;
  end if;

  selected_balance_id :=
    public.ensure_hr_absence_balance(
      new.id
    );

  if old.balance_id is not null
    and old.balance_id is distinct from
      selected_balance_id
  then
    perform
      public.recalculate_hr_absence_balance(
        old.balance_id
      );
  end if;

  if selected_balance_id is not null then
    perform
      public.recalculate_hr_absence_balance(
        selected_balance_id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists
  hr_absence_requests_sync_balance
on public.hr_absence_requests;

create trigger
  hr_absence_requests_sync_balance
after insert or update of
  employee_id,
  absence_type_id,
  start_date,
  status,
  requested_amount,
  is_archived
or delete
on public.hr_absence_requests
for each row
execute function public.sync_hr_absence_request_balance();

-- ============================================================
-- 13. Archivage et réactivation
-- ============================================================

create or replace function public.set_hr_absence_request_archived(
  target_request_id uuid,
  archived boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
begin
  select request.organization_id
  into target_organization_id
  from public.hr_absence_requests request
  where request.id = target_request_id;

  if target_organization_id is null then
    raise exception
      'La demande d’absence est introuvable.';
  end if;

  if not public.has_organization_role(
    target_organization_id,
    array[
      'owner',
      'admin',
      'super_admin',
      'rh',
      'hr',
      'direction'
    ]
  ) then
    raise exception
      'Vous ne disposez pas des droits nécessaires.';
  end if;

  update public.hr_absence_requests
  set
    is_archived = archived,

    archived_at =
      case
        when archived then now()
        else null
      end,

    archived_by =
      case
        when archived then auth.uid()
        else null
      end,

    updated_by = auth.uid(),

    updated_at = now()
  where id = target_request_id;
end;
$$;

revoke all
on function public.set_hr_absence_request_archived(
  uuid,
  boolean
)
from public;

grant execute
on function public.set_hr_absence_request_archived(
  uuid,
  boolean
)
to authenticated;

-- ============================================================
-- 14. Vue enrichie pour l'interface
-- ============================================================

drop view if exists public.hr_absence_request_overview;

create view public.hr_absence_request_overview
with (security_invoker = true)
as
select
  request.id,
  request.organization_id,

  request.employee_id,

  employee.employee_number,
  employee.first_name,
  employee.last_name,
  employee.photo_url,
  employee.professional_email,

  concat_ws(
    ' ',
    nullif(
      trim(employee.first_name),
      ''
    ),
    nullif(
      trim(employee.last_name),
      ''
    )
  ) as employee_name,

  employee.site_id,
  site.name as site_name,
  site.country_code as site_country_code,

  employee.department_id,
  department.name as department_name,

  request.manager_employee_id,

  concat_ws(
    ' ',
    nullif(
      trim(manager.first_name),
      ''
    ),
    nullif(
      trim(manager.last_name),
      ''
    )
  ) as manager_name,

  request.contract_type_id,
  contract_type.name as contract_type_name,

  request.work_schedule_id,
  work_schedule.name as work_schedule_name,

  request.holiday_calendar_id,
  holiday_calendar.name as holiday_calendar_name,
  holiday_calendar.country_code as holiday_country_code,
  holiday_calendar.region_code as holiday_region_code,

  request.absence_type_id,
  absence_type.code as absence_type_code,
  absence_type.name as absence_type_name,
  absence_type.category as absence_category,
  absence_type.unit as absence_unit,
  absence_type.color as absence_color,

  absence_type.reduces_capacity,
  absence_type.requires_manager_approval,
  absence_type.requires_hr_review,
  absence_type.hr_review_is_blocking,
  absence_type.requires_document,
  absence_type.is_paid,

  request.balance_id,

  request.start_date,
  request.end_date,
  request.start_period,
  request.end_period,

  request.calendar_days,
  request.working_days,
  request.holiday_days,
  request.non_working_days,
  request.requested_amount,
  request.calculation_details,

  request.reason,
  request.employee_comment,
  request.manager_comment,
  request.hr_comment,

  request.document_url,
  request.document_name,

  request.status,

  request.submitted_at,
  request.manager_reviewed_at,
  request.manager_reviewed_by,
  request.hr_reviewed_at,
  request.hr_reviewed_by,
  request.approved_at,
  request.rejected_at,
  request.cancelled_at,

  request.is_archived,
  request.archived_at,
  request.archived_by,

  request.created_at,
  request.updated_at,
  request.created_by,
  request.updated_by,

  balance.period_start as balance_period_start,
  balance.period_end as balance_period_end,

  coalesce(
    balance.annual_entitlement,
    0
  ) as annual_entitlement,

  coalesce(
    balance.opening_balance,
    0
  ) as opening_balance,

  coalesce(
    balance.carried_over_amount,
    0
  ) as carried_over_amount,

  coalesce(
    balance.accrued_amount,
    0
  ) as accrued_amount,

  coalesce(
    balance.adjustment_amount,
    0
  ) as adjustment_amount,

  coalesce(
    balance.consumed_amount,
    0
  ) as consumed_amount,

  coalesce(
    balance.pending_amount,
    0
  ) as pending_amount,

  (
    coalesce(
      balance.opening_balance,
      0
    )
    +
    coalesce(
      balance.carried_over_amount,
      0
    )
    +
    coalesce(
      balance.accrued_amount,
      0
    )
    +
    coalesce(
      balance.adjustment_amount,
      0
    )
    -
    coalesce(
      balance.consumed_amount,
      0
    )
    -
    coalesce(
      balance.pending_amount,
      0
    )
  ) as available_balance

from public.hr_absence_requests request

join public.hr_employees employee
  on employee.id =
    request.employee_id
 and employee.organization_id =
    request.organization_id

join public.hr_absence_types absence_type
  on absence_type.id =
    request.absence_type_id
 and absence_type.organization_id =
    request.organization_id

left join public.hr_employees manager
  on manager.id =
    request.manager_employee_id
 and manager.organization_id =
    request.organization_id

left join public.hr_sites site
  on site.id =
    employee.site_id
 and site.organization_id =
    request.organization_id

left join public.hr_departments department
  on department.id =
    employee.department_id
 and department.organization_id =
    request.organization_id

left join public.hr_contract_types contract_type
  on contract_type.id =
    request.contract_type_id
 and contract_type.organization_id =
    request.organization_id

left join public.hr_work_schedules work_schedule
  on work_schedule.id =
    request.work_schedule_id
 and work_schedule.organization_id =
    request.organization_id

left join public.hr_holiday_calendars holiday_calendar
  on holiday_calendar.id =
    request.holiday_calendar_id
 and holiday_calendar.organization_id =
    request.organization_id

left join public.hr_absence_balances balance
  on balance.id =
    request.balance_id
 and balance.organization_id =
    request.organization_id;

grant select
on public.hr_absence_request_overview
to authenticated;

-- ============================================================
-- 15. RLS des règles de droits
-- ============================================================

alter table public.hr_absence_entitlement_rules
  enable row level security;

drop policy if exists
  organization_members_can_read
on public.hr_absence_entitlement_rules;

drop policy if exists
  organization_hr_can_manage
on public.hr_absence_entitlement_rules;

create policy organization_members_can_read
on public.hr_absence_entitlement_rules
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

create policy organization_hr_can_manage
on public.hr_absence_entitlement_rules
for all
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array[
      'owner',
      'admin',
      'super_admin',
      'rh',
      'hr',
      'direction'
    ]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array[
      'owner',
      'admin',
      'super_admin',
      'rh',
      'hr',
      'direction'
    ]
  )
);

commit;