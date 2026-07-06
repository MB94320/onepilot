-- ============================================================
-- ONEPILOT
-- 008_hr_absences.sql
--
-- Socle métier du module Absences & congés.
--
-- Ce script crée :
-- - les soldes d'absence par collaborateur et par période ;
-- - les demandes d'absence ;
-- - le journal des validations et transitions ;
-- - les contrôles de cohérence multi-tenant ;
-- - les règles de transition de statut ;
-- - une vue de consultation enrichie ;
-- - les politiques RLS.
--
-- Dépendances :
-- - public.organizations
-- - public.organization_members
-- - public.hr_settings
-- - public.hr_employees
-- - public.hr_absence_types
-- - public.set_updated_at()
-- - public.is_organization_member(uuid)
-- - public.has_organization_role(uuid, text[])
--
-- Ce script ne supprime aucune donnée métier existante.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Soldes d'absence
-- ============================================================

create table if not exists public.hr_absence_balances (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  employee_id uuid not null
    references public.hr_employees(id)
    on delete cascade,

  absence_type_id uuid not null
    references public.hr_absence_types(id)
    on delete restrict,

  period_start date not null,
  period_end date not null,

  opening_balance numeric(10, 2) not null default 0,
  accrued_amount numeric(10, 2) not null default 0,
  adjustment_amount numeric(10, 2) not null default 0,
  consumed_amount numeric(10, 2) not null default 0,
  pending_amount numeric(10, 2) not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_absence_balances_period_valid
    check (period_end >= period_start),

  constraint hr_absence_balances_values_valid
    check (
      opening_balance >= 0
      and accrued_amount >= 0
      and consumed_amount >= 0
      and pending_amount >= 0
    ),

  constraint hr_absence_balances_unique
    unique (
      organization_id,
      employee_id,
      absence_type_id,
      period_start,
      period_end
    )
);

create index if not exists hr_absence_balances_organization_idx
  on public.hr_absence_balances (organization_id);

create index if not exists hr_absence_balances_employee_idx
  on public.hr_absence_balances (
    organization_id,
    employee_id
  );

create index if not exists hr_absence_balances_period_idx
  on public.hr_absence_balances (
    organization_id,
    period_start,
    period_end
  );

drop trigger if exists hr_absence_balances_set_updated_at
  on public.hr_absence_balances;

create trigger hr_absence_balances_set_updated_at
before update on public.hr_absence_balances
for each row
execute function public.set_updated_at();

-- ============================================================
-- 2. Demandes d'absence
-- ============================================================

create table if not exists public.hr_absence_requests (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  employee_id uuid not null
    references public.hr_employees(id)
    on delete cascade,

  absence_type_id uuid not null
    references public.hr_absence_types(id)
    on delete restrict,

  balance_id uuid
    references public.hr_absence_balances(id)
    on delete set null,

  start_date date not null,
  end_date date not null,

  start_period text not null default 'full_day',
  end_period text not null default 'full_day',

  requested_amount numeric(10, 2) not null,

  reason text,
  employee_comment text,
  manager_comment text,
  hr_comment text,

  document_url text,
  document_name text,

  status text not null default 'draft',

  manager_employee_id uuid
    references public.hr_employees(id)
    on delete set null,

  submitted_at timestamptz,

  manager_reviewed_at timestamptz,

  manager_reviewed_by uuid
    references auth.users(id)
    on delete set null,

  hr_reviewed_at timestamptz,

  hr_reviewed_by uuid
    references auth.users(id)
    on delete set null,

  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_absence_requests_dates_valid
    check (end_date >= start_date),

  constraint hr_absence_requests_amount_valid
    check (requested_amount > 0),

  constraint hr_absence_requests_start_period_valid
    check (
      start_period in (
        'full_day',
        'morning',
        'afternoon'
      )
    ),

  constraint hr_absence_requests_end_period_valid
    check (
      end_period in (
        'full_day',
        'morning',
        'afternoon'
      )
    ),

  constraint hr_absence_requests_status_valid
    check (
      status in (
        'draft',
        'submitted',
        'manager_approved',
        'approved',
        'rejected',
        'cancelled'
      )
    ),

  constraint hr_absence_requests_document_consistent
    check (
      document_url is not null
      or document_name is null
    )
);

create index if not exists hr_absence_requests_organization_idx
  on public.hr_absence_requests (organization_id);

create index if not exists hr_absence_requests_employee_idx
  on public.hr_absence_requests (
    organization_id,
    employee_id
  );

create index if not exists hr_absence_requests_status_idx
  on public.hr_absence_requests (
    organization_id,
    status
  );

create index if not exists hr_absence_requests_dates_idx
  on public.hr_absence_requests (
    organization_id,
    start_date,
    end_date
  );

create index if not exists hr_absence_requests_manager_idx
  on public.hr_absence_requests (
    organization_id,
    manager_employee_id,
    status
  );

drop trigger if exists hr_absence_requests_set_updated_at
  on public.hr_absence_requests;

create trigger hr_absence_requests_set_updated_at
before update on public.hr_absence_requests
for each row
execute function public.set_updated_at();

-- ============================================================
-- 3. Journal des validations et transitions
-- ============================================================

create table if not exists public.hr_absence_approvals (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  request_id uuid not null
    references public.hr_absence_requests(id)
    on delete cascade,

  action text not null,

  previous_status text,
  next_status text not null,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  actor_employee_id uuid
    references public.hr_employees(id)
    on delete set null,

  actor_role text,

  comment text,

  created_at timestamptz not null default now(),

  constraint hr_absence_approvals_action_valid
    check (
      action in (
        'created',
        'submitted',
        'manager_approved',
        'hr_reviewed',
        'approved',
        'rejected',
        'cancelled',
        'reopened'
      )
    ),

  constraint hr_absence_approvals_next_status_valid
    check (
      next_status in (
        'draft',
        'submitted',
        'manager_approved',
        'approved',
        'rejected',
        'cancelled'
      )
    )
);

create index if not exists hr_absence_approvals_organization_idx
  on public.hr_absence_approvals (organization_id);

create index if not exists hr_absence_approvals_request_idx
  on public.hr_absence_approvals (
    request_id,
    created_at
  );

-- ============================================================
-- 4. Contrôle multi-tenant des clés étrangères
-- ============================================================

create or replace function public.validate_hr_absence_request_scope()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  employee_organization_id uuid;
  absence_type_organization_id uuid;
  balance_organization_id uuid;
  balance_employee_id uuid;
  balance_absence_type_id uuid;
  manager_organization_id uuid;
begin
  select employee.organization_id
  into employee_organization_id
  from public.hr_employees employee
  where employee.id = new.employee_id;

  if employee_organization_id is null then
    raise exception
      'Le collaborateur sélectionné est introuvable.';
  end if;

  if employee_organization_id <> new.organization_id then
    raise exception
      'Le collaborateur ne appartient pas à cette organisation.';
  end if;

  select absence_type.organization_id
  into absence_type_organization_id
  from public.hr_absence_types absence_type
  where absence_type.id = new.absence_type_id;

  if absence_type_organization_id is null then
    raise exception
      'Le type absence sélectionné est introuvable.';
  end if;

  if absence_type_organization_id <> new.organization_id then
    raise exception
      'Le type absence ne appartient pas à cette organisation.';
  end if;

  if new.balance_id is not null then
    select
      balance.organization_id,
      balance.employee_id,
      balance.absence_type_id
    into
      balance_organization_id,
      balance_employee_id,
      balance_absence_type_id
    from public.hr_absence_balances balance
    where balance.id = new.balance_id;

    if balance_organization_id is null then
      raise exception
        'Le solde sélectionné est introuvable.';
    end if;

    if balance_organization_id <> new.organization_id then
      raise exception
        'Le solde ne appartient pas à cette organisation.';
    end if;

    if balance_employee_id <> new.employee_id then
      raise exception
        'Le solde ne correspond pas au collaborateur sélectionné.';
    end if;

    if balance_absence_type_id <> new.absence_type_id then
      raise exception
        'Le solde ne correspond pas au type absence sélectionné.';
    end if;
  end if;

  if new.manager_employee_id is not null then
    select manager.organization_id
    into manager_organization_id
    from public.hr_employees manager
    where manager.id = new.manager_employee_id;

    if manager_organization_id is null then
      raise exception
        'Le manager sélectionné est introuvable.';
    end if;

    if manager_organization_id <> new.organization_id then
      raise exception
        'Le manager ne appartient pas à cette organisation.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hr_absence_requests_validate_scope
  on public.hr_absence_requests;

create trigger hr_absence_requests_validate_scope
before insert or update
on public.hr_absence_requests
for each row
execute function public.validate_hr_absence_request_scope();

-- ============================================================
-- 5. Contrôle des périodes identiques
-- ============================================================

create or replace function public.validate_hr_absence_request_periods()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.start_date = new.end_date then
    if (
      new.start_period = 'morning'
      and new.end_period = 'afternoon'
    ) then
      raise exception
        'Une demande sur une seule journée ne peut pas commencer le matin et se terminer uniquement après-midi.';
    end if;

    if (
      new.start_period = 'afternoon'
      and new.end_period = 'morning'
    ) then
      raise exception
        'La période de fin ne peut pas précéder la période de début.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hr_absence_requests_validate_periods
  on public.hr_absence_requests;

create trigger hr_absence_requests_validate_periods
before insert or update
on public.hr_absence_requests
for each row
execute function public.validate_hr_absence_request_periods();

-- ============================================================
-- 6. Transitions de statut autorisées
-- ============================================================

create or replace function public.validate_hr_absence_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'draft'
    and new.status in (
      'submitted',
      'cancelled'
    )
  then
    return new;
  end if;

  if old.status = 'submitted'
    and new.status in (
      'manager_approved',
      'rejected',
      'cancelled'
    )
  then
    return new;
  end if;

  if old.status = 'manager_approved'
    and new.status in (
      'approved',
      'rejected',
      'cancelled'
    )
  then
    return new;
  end if;

  if old.status = 'rejected'
    and new.status = 'draft'
  then
    return new;
  end if;

  raise exception
    'Transition de statut interdite : % vers %.',
    old.status,
    new.status;
end;
$$;

drop trigger if exists hr_absence_requests_validate_status
  on public.hr_absence_requests;

create trigger hr_absence_requests_validate_status
before update of status
on public.hr_absence_requests
for each row
execute function public.validate_hr_absence_status_transition();

-- ============================================================
-- 7. Alimentation automatique des dates de workflow
-- ============================================================

create or replace function public.set_hr_absence_workflow_dates()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'submitted'
      and new.submitted_at is null
    then
      new.submitted_at = now();
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'submitted' then
      new.submitted_at = coalesce(
        new.submitted_at,
        now()
      );
    end if;

    if new.status = 'manager_approved' then
      new.manager_reviewed_at = coalesce(
        new.manager_reviewed_at,
        now()
      );
    end if;

    if new.status = 'approved' then
      new.approved_at = coalesce(
        new.approved_at,
        now()
      );
    end if;

    if new.status = 'rejected' then
      new.rejected_at = coalesce(
        new.rejected_at,
        now()
      );
    end if;

    if new.status = 'cancelled' then
      new.cancelled_at = coalesce(
        new.cancelled_at,
        now()
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hr_absence_requests_set_workflow_dates
  on public.hr_absence_requests;

create trigger hr_absence_requests_set_workflow_dates
before insert or update
on public.hr_absence_requests
for each row
execute function public.set_hr_absence_workflow_dates();

-- ============================================================
-- 8. Journal automatique des transitions
-- ============================================================

create or replace function public.audit_hr_absence_request_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action :=
      case new.status
        when 'submitted' then 'submitted'
        else 'created'
      end;

    insert into public.hr_absence_approvals (
      organization_id,
      request_id,
      action,
      previous_status,
      next_status,
      actor_user_id,
      actor_role
    )
    values (
      new.organization_id,
      new.id,
      event_action,
      null,
      new.status,
      auth.uid(),
      'creator'
    );

    return new;
  end if;

  if new.status is distinct from old.status then
    event_action :=
      case new.status
        when 'submitted' then 'submitted'
        when 'manager_approved' then 'manager_approved'
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        when 'cancelled' then 'cancelled'
        when 'draft' then 'reopened'
        else 'created'
      end;

    insert into public.hr_absence_approvals (
      organization_id,
      request_id,
      action,
      previous_status,
      next_status,
      actor_user_id
    )
    values (
      new.organization_id,
      new.id,
      event_action,
      old.status,
      new.status,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists hr_absence_requests_audit_transition
  on public.hr_absence_requests;

create trigger hr_absence_requests_audit_transition
after insert or update of status
on public.hr_absence_requests
for each row
execute function public.audit_hr_absence_request_transition();

-- ============================================================
-- 9. Vue enrichie des demandes
-- ============================================================

create or replace view public.hr_absence_request_overview
with (security_invoker = true)
as
select
  request.id,
  request.organization_id,

  request.employee_id,
  employee.employee_number,

  concat_ws(
    ' ',
    nullif(trim(employee.first_name), ''),
    nullif(trim(employee.last_name), '')
  ) as employee_name,

  employee.professional_email,

  employee.site_id,
  site.name as site_name,

  employee.department_id,
  department.name as department_name,

  request.manager_employee_id,

  concat_ws(
    ' ',
    nullif(trim(manager.first_name), ''),
    nullif(trim(manager.last_name), '')
  ) as manager_name,

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
  request.requested_amount,

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

  request.created_at,
  request.updated_at,
  request.created_by,
  request.updated_by,

  balance.period_start as balance_period_start,
  balance.period_end as balance_period_end,

  coalesce(
    balance.opening_balance,
    0
  ) as opening_balance,

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
  on employee.id = request.employee_id
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
  on site.id = employee.site_id
  and site.organization_id =
    request.organization_id

left join public.hr_departments department
  on department.id =
    employee.department_id
  and department.organization_id =
    request.organization_id

left join public.hr_absence_balances balance
  on balance.id =
    request.balance_id
  and balance.organization_id =
    request.organization_id;

-- ============================================================
-- 10. Activation de Row Level Security
-- ============================================================

alter table public.hr_absence_balances
  enable row level security;

alter table public.hr_absence_requests
  enable row level security;

alter table public.hr_absence_approvals
  enable row level security;

-- ============================================================
-- 11. Suppression contrôlée des anciennes policies
-- ============================================================

drop policy if exists organization_members_can_read
  on public.hr_absence_balances;

drop policy if exists organization_hr_can_manage
  on public.hr_absence_balances;

drop policy if exists organization_members_can_read
  on public.hr_absence_requests;

drop policy if exists organization_members_can_insert
  on public.hr_absence_requests;

drop policy if exists organization_members_can_update
  on public.hr_absence_requests;

drop policy if exists organization_hr_can_delete
  on public.hr_absence_requests;

drop policy if exists organization_members_can_read
  on public.hr_absence_approvals;

drop policy if exists organization_members_can_insert
  on public.hr_absence_approvals;

-- ============================================================
-- 12. Policies des soldes
-- ============================================================

create policy organization_members_can_read
on public.hr_absence_balances
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

create policy organization_hr_can_manage
on public.hr_absence_balances
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

-- ============================================================
-- 13. Policies des demandes
-- ============================================================

create policy organization_members_can_read
on public.hr_absence_requests
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

create policy organization_members_can_insert
on public.hr_absence_requests
for insert
to authenticated
with check (
  public.is_organization_member(
    organization_id
  )
  and (
    created_by = auth.uid()
    or created_by is null
    or public.has_organization_role(
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
);

create policy organization_members_can_update
on public.hr_absence_requests
for update
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
)
with check (
  public.is_organization_member(
    organization_id
  )
);

create policy organization_hr_can_delete
on public.hr_absence_requests
for delete
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array[
      'owner',
      'admin',
      'super_admin',
      'rh',
      'hr'
    ]
  )
);

-- ============================================================
-- 14. Policies du journal
-- ============================================================

create policy organization_members_can_read
on public.hr_absence_approvals
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

create policy organization_members_can_insert
on public.hr_absence_approvals
for insert
to authenticated
with check (
  public.is_organization_member(
    organization_id
  )
);

-- ============================================================
-- 15. Droits sur la vue
-- ============================================================

grant select
on public.hr_absence_request_overview
to authenticated;

commit;