-- Correctif Absences / Ressources V5
-- Objectifs :
-- 1) conserver le calcul validé 3,5j avec fériés FR + demi-journées ;
-- 2) remplacer définitivement les fonctions de validation sans tableau PostgreSQL ;
-- 3) nettoyer les soldes générés sur des types non suivis ;
-- 4) séparer CP, RTT employeur et RTT employé ;
-- 5) ajouter les colonnes métier CP/RTT et rattachement libre côté contrat/collaborateur.

create extension if not exists pgcrypto;

create or replace function public.get_french_easter_date(target_year integer)
returns date
language plpgsql
immutable
as $$
declare
  a integer;
  b integer;
  c integer;
  d integer;
  e integer;
  f integer;
  g integer;
  h integer;
  i integer;
  k integer;
  l integer;
  m integer;
  target_month integer;
  target_day integer;
begin
  a := target_year % 19;
  b := floor(target_year / 100);
  c := target_year % 100;
  d := floor(b / 4);
  e := b % 4;
  f := floor((b + 8) / 25);
  g := floor((b - f + 1) / 3);
  h := (19 * a + b - d - g + 15) % 30;
  i := floor(c / 4);
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := floor((a + 11 * h + 22 * l) / 451);
  target_month := floor((h + l - 7 * m + 114) / 31);
  target_day := ((h + l - 7 * m + 114) % 31) + 1;

  return make_date(target_year, target_month, target_day);
end;
$$;

create or replace function public.is_french_public_holiday(target_date date)
returns boolean
language sql
immutable
as $$
  with easter as (
    select public.get_french_easter_date(extract(year from target_date)::int) as date_value
  ), holidays as (
    select make_date(extract(year from target_date)::int, 1, 1) as holiday_date
    union all select (select date_value from easter) + 1
    union all select make_date(extract(year from target_date)::int, 5, 1)
    union all select make_date(extract(year from target_date)::int, 5, 8)
    union all select (select date_value from easter) + 39
    union all select (select date_value from easter) + 50
    union all select make_date(extract(year from target_date)::int, 7, 14)
    union all select make_date(extract(year from target_date)::int, 8, 15)
    union all select make_date(extract(year from target_date)::int, 11, 1)
    union all select make_date(extract(year from target_date)::int, 11, 11)
    union all select make_date(extract(year from target_date)::int, 12, 25)
  )
  select exists (
    select 1
    from holidays
    where holiday_date = target_date
  );
$$;

create or replace function public.hr_table_has_column(
  target_table text,
  target_column text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = target_table
      and column_name = target_column
  );
$$;

create or replace function public.hr_absence_request_has_column(column_name text)
returns boolean
language sql
stable
as $$
  select public.hr_table_has_column('hr_absence_requests', $1);
$$;

-- Remplacement réel du calcul d'absence.
drop function if exists public.calculate_hr_absence_amount(uuid, date, date, text, text) cascade;
drop function if exists public.calculate_hr_absence_amount(uuid, date, date, varchar, varchar) cascade;

create function public.calculate_hr_absence_amount(
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
as $$
declare
  target_holiday_calendar_id uuid := null;
  target_work_schedule_id uuid := null;
  target_contract_type_id uuid := null;
begin
  if target_start_date is null or target_end_date is null then
    raise exception 'Les dates de début et de fin sont obligatoires.';
  end if;

  if target_end_date < target_start_date then
    raise exception 'La date de fin ne peut pas précéder la date de début.';
  end if;

  return query
  with days as (
    select generate_series(target_start_date, target_end_date, interval '1 day')::date as day_date
  ), calculated as (
    select
      day_date,
      extract(isodow from day_date)::int as iso_weekday,
      extract(isodow from day_date)::int in (6, 7) as is_weekend,
      public.is_french_public_holiday(day_date) as is_holiday,
      case
        when extract(isodow from day_date)::int in (6, 7) then 0::numeric
        when public.is_french_public_holiday(day_date) then 0::numeric
        when target_start_date = target_end_date then
          case
            when coalesce(target_start_period, 'full_day') = 'afternoon'
             and coalesce(target_end_period, 'full_day') = 'morning'
              then 0::numeric
            when coalesce(target_start_period, 'full_day') in ('morning', 'afternoon')
             and coalesce(target_end_period, 'full_day') in ('morning', 'afternoon')
              then 0.5::numeric
            else 1::numeric
          end
        when day_date = target_start_date
         and coalesce(target_start_period, 'full_day') = 'afternoon'
          then 0.5::numeric
        when day_date = target_end_date
         and coalesce(target_end_period, 'full_day') = 'morning'
          then 0.5::numeric
        else 1::numeric
      end as day_amount
    from days
  )
  select
    count(*)::numeric as calendar_days,
    coalesce(sum(day_amount), 0)::numeric as working_days,
    count(*) filter (where is_holiday and not is_weekend)::numeric as holiday_days,
    count(*) filter (where is_weekend)::numeric as non_working_days,
    coalesce(sum(day_amount), 0)::numeric as requested_amount,
    target_holiday_calendar_id,
    target_work_schedule_id,
    target_contract_type_id,
    jsonb_build_object(
      'method', 'fr_public_holidays_and_half_days_v5',
      'calendar_days', count(*)::numeric,
      'working_days', coalesce(sum(day_amount), 0)::numeric,
      'holiday_days', count(*) filter (where is_holiday and not is_weekend)::numeric,
      'non_working_days', count(*) filter (where is_weekend)::numeric,
      'days', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', day_date,
            'amount', day_amount,
            'source', case
              when is_weekend then 'weekend_excluded_v5'
              when is_holiday then 'french_public_holiday_excluded_v5'
              when day_amount = 0.5 then 'half_day_v5'
              else 'working_day_v5'
            end,
            'iso_weekday', iso_weekday,
            'is_weekend', is_weekend,
            'is_holiday', is_holiday,
            'is_working_day', day_amount > 0
          )
          order by day_date
        ),
        '[]'::jsonb
      )
    )
  from calculated;
end;
$$;

grant execute on function public.calculate_hr_absence_amount(uuid, date, date, text, text) to authenticated;

-- Validation sans tableau PostgreSQL / sans array_append.
drop function if exists public.update_hr_absence_request_status_dynamic(uuid, text, uuid, text) cascade;
drop function if exists public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) cascade;
drop function if exists public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) cascade;
drop function if exists public.reject_hr_absence_request(uuid, uuid, uuid, text) cascade;

create function public.update_hr_absence_request_status_dynamic(
  target_request_id uuid,
  next_status text,
  actor_user_id uuid default null,
  action_comment text default null
)
returns table (
  organization_id uuid,
  previous_status text,
  final_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  current_status text;
  set_clause text;
  update_sql text;
begin
  select request.organization_id, request.status
  into target_organization_id, current_status
  from public.hr_absence_requests request
  where request.id = target_request_id
  for update;

  if target_organization_id is null then
    raise exception 'Demande d''absence introuvable : %', target_request_id;
  end if;

  set_clause := format('status = %L', next_status);

  if public.hr_absence_request_has_column('updated_at') then
    set_clause := set_clause || ', updated_at = now()';
  end if;

  if actor_user_id is not null and public.hr_absence_request_has_column('updated_by') then
    set_clause := set_clause || format(', updated_by = %L::uuid', actor_user_id);
  end if;

  if next_status = 'manager_approved' then
    if public.hr_absence_request_has_column('manager_approved_at') then
      set_clause := set_clause || ', manager_approved_at = now()';
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      set_clause := set_clause || format(', manager_comment = %L', nullif(coalesce(action_comment, ''), ''));
    end if;
  elsif next_status = 'approved' then
    if public.hr_absence_request_has_column('approved_at') then
      set_clause := set_clause || ', approved_at = now()';
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      set_clause := set_clause || format(', hr_comment = %L', nullif(coalesce(action_comment, ''), ''));
    end if;
  elsif next_status = 'rejected' then
    if public.hr_absence_request_has_column('rejected_at') then
      set_clause := set_clause || ', rejected_at = now()';
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      set_clause := set_clause || format(', manager_comment = coalesce(manager_comment, %L)', nullif(coalesce(action_comment, ''), ''));
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      set_clause := set_clause || format(', hr_comment = coalesce(hr_comment, %L)', nullif(coalesce(action_comment, ''), ''));
    end if;
  end if;

  update_sql := format(
    'update public.hr_absence_requests set %s where id = %L::uuid',
    set_clause,
    target_request_id
  );

  execute update_sql;

  organization_id := target_organization_id;
  previous_status := current_status;
  final_status := next_status;

  return next;
end;
$$;

create function public.approve_hr_absence_request_manager(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'manager_approved',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status <> 'submitted' then
    raise exception 'Transition interdite : % vers manager_approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'manager_approve',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'manager',
    action_comment
  );

  return target_request_id;
end;
$$;

create function public.approve_hr_absence_request_hr(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'approved',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status not in ('manager_approved', 'submitted') then
    raise exception 'Transition interdite : % vers approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'hr_approve',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'hr',
    action_comment
  );

  return target_request_id;
end;
$$;

create function public.reject_hr_absence_request(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  if coalesce(trim(action_comment), '') = '' then
    raise exception 'Un commentaire est obligatoire pour refuser une demande.';
  end if;

  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'rejected',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status not in ('submitted', 'manager_approved') then
    raise exception 'Transition interdite : % vers rejected.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'reject',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'validator',
    action_comment
  );

  return target_request_id;
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;

create or replace function public.recalculate_existing_hr_absence_requests_v5()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record record;
  calculated record;
  set_clause text;
  affected_count integer := 0;
begin
  for request_record in
    select
      id,
      employee_id,
      start_date,
      end_date,
      coalesce(start_period, 'full_day') as start_period,
      coalesce(end_period, 'full_day') as end_period
    from public.hr_absence_requests
    where employee_id is not null
      and start_date is not null
      and end_date is not null
  loop
    select *
    into calculated
    from public.calculate_hr_absence_amount(
      request_record.employee_id,
      request_record.start_date,
      request_record.end_date,
      request_record.start_period,
      request_record.end_period
    );

    set_clause := format('requested_amount = %s', calculated.requested_amount);

    if public.hr_absence_request_has_column('calendar_days') then
      set_clause := set_clause || format(', calendar_days = %s', calculated.calendar_days);
    end if;

    if public.hr_absence_request_has_column('working_days') then
      set_clause := set_clause || format(', working_days = %s', calculated.working_days);
    end if;

    if public.hr_absence_request_has_column('holiday_days') then
      set_clause := set_clause || format(', holiday_days = %s', calculated.holiday_days);
    end if;

    if public.hr_absence_request_has_column('non_working_days') then
      set_clause := set_clause || format(', non_working_days = %s', calculated.non_working_days);
    end if;

    if public.hr_absence_request_has_column('calculation_details') then
      set_clause := set_clause || format(', calculation_details = %L::jsonb', calculated.calculation_details::text);
    end if;

    if public.hr_absence_request_has_column('updated_at') then
      set_clause := set_clause || ', updated_at = now()';
    end if;

    execute format(
      'update public.hr_absence_requests set %s where id = %L::uuid',
      set_clause,
      request_record.id
    );

    affected_count := affected_count + 1;
  end loop;

  return affected_count;
end;
$$;

select public.recalculate_existing_hr_absence_requests_v5();

-- Colonnes métier côté ressources / contrat.
alter table if exists public.hr_employee_contracts
  add column if not exists leave_acquisition_start_month integer default 6,
  add column if not exists paid_leave_annual_entitlement numeric default 25,
  add column if not exists rtt_annual_entitlement numeric default 10,
  add column if not exists rtt_employer_annual_entitlement numeric default 10,
  add column if not exists rtt_employee_annual_entitlement numeric default 0,
  add column if not exists leave_prorata_on_arrival boolean default true,
  add column if not exists leave_prorata_on_departure boolean default true,
  add column if not exists leave_carryover_allowed boolean default true,
  add column if not exists maximum_leave_carryover numeric null;

alter table if exists public.hr_employees
  add column if not exists site_free_text text,
  add column if not exists department_free_text text,
  add column if not exists job_free_text text,
  add column if not exists function_free_text text;

-- Normalisation des types suivis.
update public.hr_absence_types
set
  code = 'CP',
  name = 'Congés payés',
  unit = coalesce(unit, 'day'),
  reduces_capacity = true,
  requires_manager_approval = true,
  requires_hr_review = false,
  hr_review_is_blocking = false,
  is_paid = true,
  is_active = true
where upper(coalesce(code, '')) in ('CP', 'PAID_LEAVE', 'CONGES_PAYES', 'CONGÉS_PAYÉS')
   or lower(coalesce(name, '')) like '%congé%pay%';

update public.hr_absence_types
set
  code = 'RTT_EMPLOYEUR',
  name = 'RTT employeur',
  unit = coalesce(unit, 'day'),
  reduces_capacity = true,
  requires_manager_approval = true,
  requires_hr_review = false,
  hr_review_is_blocking = false,
  is_paid = true,
  is_active = true
where upper(coalesce(code, '')) in ('RTT', 'RTT_EMPLOYEUR', 'RTT_EMPLOYER')
   or lower(coalesce(name, '')) in ('rtt', 'réduction du temps de travail')
   or lower(coalesce(name, '')) like '%rtt employeur%';

insert into public.hr_absence_types (
  organization_id,
  code,
  name,
  unit,
  color,
  reduces_capacity,
  requires_manager_approval,
  requires_hr_review,
  hr_review_is_blocking,
  requires_document,
  is_paid,
  is_active
)
select
  org.id,
  'CP',
  'Congés payés',
  'day',
  '#4f46e5',
  true,
  true,
  false,
  false,
  false,
  true,
  true
from public.organizations org
where not exists (
  select 1
  from public.hr_absence_types t
  where t.organization_id = org.id
    and upper(coalesce(t.code, '')) = 'CP'
);

insert into public.hr_absence_types (
  organization_id,
  code,
  name,
  unit,
  color,
  reduces_capacity,
  requires_manager_approval,
  requires_hr_review,
  hr_review_is_blocking,
  requires_document,
  is_paid,
  is_active
)
select
  org.id,
  'RTT_EMPLOYEUR',
  'RTT employeur',
  'day',
  '#7c3aed',
  true,
  true,
  false,
  false,
  false,
  true,
  true
from public.organizations org
where not exists (
  select 1
  from public.hr_absence_types t
  where t.organization_id = org.id
    and upper(coalesce(t.code, '')) = 'RTT_EMPLOYEUR'
);

insert into public.hr_absence_types (
  organization_id,
  code,
  name,
  unit,
  color,
  reduces_capacity,
  requires_manager_approval,
  requires_hr_review,
  hr_review_is_blocking,
  requires_document,
  is_paid,
  is_active
)
select
  org.id,
  'RTT_EMPLOYE',
  'RTT employé',
  'day',
  '#0ea5e9',
  true,
  true,
  false,
  false,
  false,
  true,
  true
from public.organizations org
where not exists (
  select 1
  from public.hr_absence_types t
  where t.organization_id = org.id
    and upper(coalesce(t.code, '')) = 'RTT_EMPLOYE'
);

-- Suppression des soldes générés sur des types qui ne sont pas des compteurs annuels.
-- On ne supprime pas s'il existe une demande reliée au même collaborateur/type.
delete from public.hr_absence_balances b
using public.hr_absence_types t
where t.id = b.absence_type_id
  and b.period_start = date '2026-06-01'
  and b.period_end = date '2027-05-31'
  and upper(coalesce(t.code, '')) not in ('CP', 'RTT_EMPLOYEUR', 'RTT_EMPLOYE')
  and not exists (
    select 1
    from public.hr_absence_requests r
    where r.employee_id = b.employee_id
      and r.absence_type_id = b.absence_type_id
  );

-- Création / mise à jour des soldes CP, RTT employeur, RTT employé uniquement.
with active_employees as (
  select
    employee.id,
    employee.organization_id
  from public.hr_employee_overview employee
  where coalesce(employee.is_active, true) = true
), latest_contract as (
  select distinct on (contract.employee_id)
    contract.employee_id,
    contract.organization_id,
    coalesce(contract.paid_leave_annual_entitlement, 25) as cp_entitlement,
    coalesce(contract.rtt_employer_annual_entitlement, contract.rtt_annual_entitlement, 10) as rtt_employer_entitlement,
    coalesce(contract.rtt_employee_annual_entitlement, 0) as rtt_employee_entitlement
  from public.hr_employee_contracts contract
  order by
    contract.employee_id,
    coalesce(contract.is_primary, false) desc,
    contract.start_date desc nulls last,
    contract.created_at desc nulls last
), tracked_types as (
  select
    t.id,
    t.organization_id,
    upper(coalesce(t.code, '')) as code
  from public.hr_absence_types t
  where upper(coalesce(t.code, '')) in ('CP', 'RTT_EMPLOYEUR', 'RTT_EMPLOYE')
), target_balances as (
  select
    employee.organization_id,
    employee.id as employee_id,
    type.id as absence_type_id,
    case
      when type.code = 'CP' then coalesce(contract.cp_entitlement, 25)
      when type.code = 'RTT_EMPLOYEUR' then coalesce(contract.rtt_employer_entitlement, 10)
      when type.code = 'RTT_EMPLOYE' then coalesce(contract.rtt_employee_entitlement, 0)
      else 0
    end::numeric as entitlement
  from active_employees employee
  join tracked_types type
    on type.organization_id = employee.organization_id
  left join latest_contract contract
    on contract.employee_id = employee.id
   and contract.organization_id = employee.organization_id
)
insert into public.hr_absence_balances (
  organization_id,
  employee_id,
  absence_type_id,
  period_start,
  period_end,
  annual_entitlement,
  opening_balance,
  carried_over_amount,
  accrued_amount,
  adjustment_amount,
  consumed_amount,
  pending_amount
)
select
  organization_id,
  employee_id,
  absence_type_id,
  date '2026-06-01',
  date '2027-05-31',
  entitlement,
  entitlement,
  0,
  0,
  0,
  0,
  0
from target_balances target
where not exists (
  select 1
  from public.hr_absence_balances balance
  where balance.organization_id = target.organization_id
    and balance.employee_id = target.employee_id
    and balance.absence_type_id = target.absence_type_id
    and balance.period_start = date '2026-06-01'
    and balance.period_end = date '2027-05-31'
);

with latest_contract as (
  select distinct on (contract.employee_id)
    contract.employee_id,
    contract.organization_id,
    coalesce(contract.paid_leave_annual_entitlement, 25) as cp_entitlement,
    coalesce(contract.rtt_employer_annual_entitlement, contract.rtt_annual_entitlement, 10) as rtt_employer_entitlement,
    coalesce(contract.rtt_employee_annual_entitlement, 0) as rtt_employee_entitlement
  from public.hr_employee_contracts contract
  order by
    contract.employee_id,
    coalesce(contract.is_primary, false) desc,
    contract.start_date desc nulls last,
    contract.created_at desc nulls last
)
update public.hr_absence_balances balance
set
  annual_entitlement = case
    when upper(coalesce(type.code, '')) = 'CP' then contract.cp_entitlement
    when upper(coalesce(type.code, '')) = 'RTT_EMPLOYEUR' then contract.rtt_employer_entitlement
    when upper(coalesce(type.code, '')) = 'RTT_EMPLOYE' then contract.rtt_employee_entitlement
    else balance.annual_entitlement
  end,
  opening_balance = case
    when coalesce(balance.consumed_amount, 0) = 0
     and coalesce(balance.pending_amount, 0) = 0
     and coalesce(balance.adjustment_amount, 0) = 0
      then case
        when upper(coalesce(type.code, '')) = 'CP' then contract.cp_entitlement
        when upper(coalesce(type.code, '')) = 'RTT_EMPLOYEUR' then contract.rtt_employer_entitlement
        when upper(coalesce(type.code, '')) = 'RTT_EMPLOYE' then contract.rtt_employee_entitlement
        else balance.opening_balance
      end
    else balance.opening_balance
  end
from public.hr_absence_types type, latest_contract contract
where type.id = balance.absence_type_id
  and contract.employee_id = balance.employee_id
  and contract.organization_id = balance.organization_id
  and balance.period_start = date '2026-06-01'
  and balance.period_end = date '2027-05-31'
  and upper(coalesce(type.code, '')) in ('CP', 'RTT_EMPLOYEUR', 'RTT_EMPLOYE');

create or replace function public.auto_archive_completed_hr_absence_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  if not public.hr_absence_request_has_column('is_archived') then
    return 0;
  end if;

  if public.hr_absence_request_has_column('archived_at') then
    update public.hr_absence_requests
    set
      is_archived = true,
      archived_at = now()
    where coalesce(is_archived, false) = false
      and status in ('approved', 'rejected', 'cancelled')
      and end_date < current_date;
  else
    update public.hr_absence_requests
    set is_archived = true
    where coalesce(is_archived, false) = false
      and status in ('approved', 'rejected', 'cancelled')
      and end_date < current_date;
  end if;

  get diagnostics affected_count = row_count;

  return affected_count;
end;
$$;

select public.auto_archive_completed_hr_absence_requests();
