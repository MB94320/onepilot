-- ============================================================
-- ONEPILOT
-- 007_hr_audit_history.sql
--
-- Historisation automatique :
-- - collaborateurs ;
-- - contrats ;
-- - créations ;
-- - modifications ;
-- - archivages ;
-- - réactivations.
-- ============================================================

begin;

-- ============================================================
-- 1. Table d'audit RH
-- ============================================================

create table if not exists public.hr_audit_logs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  employee_id uuid
    references public.hr_employees(id)
    on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  action text not null,

  old_values jsonb,
  new_values jsonb,

  changed_fields text[] not null
    default array[]::text[],

  performed_by uuid
    references auth.users(id)
    on delete set null,

  performed_at timestamptz not null
    default now(),

  metadata jsonb not null
    default '{}'::jsonb,

  constraint hr_audit_logs_entity_type_check
    check (
      entity_type in (
        'employee',
        'contract'
      )
    ),

  constraint hr_audit_logs_action_check
    check (
      action in (
        'created',
        'updated',
        'archived',
        'reactivated',
        'deleted'
      )
    )
);

create index if not exists
hr_audit_logs_organization_idx
on public.hr_audit_logs(
  organization_id,
  performed_at desc
);

create index if not exists
hr_audit_logs_employee_idx
on public.hr_audit_logs(
  employee_id,
  performed_at desc
);

create index if not exists
hr_audit_logs_entity_idx
on public.hr_audit_logs(
  entity_type,
  entity_id,
  performed_at desc
);

-- ============================================================
-- 2. RLS
-- ============================================================

alter table public.hr_audit_logs
enable row level security;

drop policy if exists
"hr_audit_logs_select_members"
on public.hr_audit_logs;

create policy
"hr_audit_logs_select_members"
on public.hr_audit_logs
for select
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
      'direction',
      'manager',
      'member'
    ]
  )
);

drop policy if exists
"hr_audit_logs_insert_system"
on public.hr_audit_logs;

create policy
"hr_audit_logs_insert_system"
on public.hr_audit_logs
for insert
to authenticated
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
-- 3. Fonction utilitaire :
--    liste des champs réellement modifiés
-- ============================================================

create or replace function
public.jsonb_changed_fields(
  old_values jsonb,
  new_values jsonb
)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(
    array_agg(key order by key),
    array[]::text[]
  )
  from (
    select key
    from jsonb_object_keys(
      coalesce(old_values, '{}'::jsonb)
      ||
      coalesce(new_values, '{}'::jsonb)
    ) as key
    where
      coalesce(old_values -> key, 'null'::jsonb)
      is distinct from
      coalesce(new_values -> key, 'null'::jsonb)
  ) changed;
$$;

-- ============================================================
-- 4. Audit des collaborateurs
-- ============================================================

create or replace function
public.audit_hr_employee_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
  old_payload jsonb;
  new_payload jsonb;
  fields text[];
begin
  if tg_op = 'INSERT' then
    audit_action := 'created';

    new_payload := to_jsonb(new);

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      new.organization_id,
      new.id,
      'employee',
      new.id,
      audit_action,
      null,
      new_payload,
      array(
        select jsonb_object_keys(new_payload)
      ),
      coalesce(
        new.created_by,
        auth.uid()
      ),
      now()
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    old_payload := to_jsonb(old);
    new_payload := to_jsonb(new);

    fields := public.jsonb_changed_fields(
      old_payload,
      new_payload
    );

    if cardinality(fields) = 0 then
      return new;
    end if;

    if old.employment_status <> 'archived'
       and new.employment_status = 'archived'
    then
      audit_action := 'archived';

    elsif old.employment_status = 'archived'
          and new.employment_status <> 'archived'
    then
      audit_action := 'reactivated';

    else
      audit_action := 'updated';
    end if;

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      new.organization_id,
      new.id,
      'employee',
      new.id,
      audit_action,
      old_payload,
      new_payload,
      fields,
      coalesce(
        new.updated_by,
        auth.uid()
      ),
      now()
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    old_payload := to_jsonb(old);

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      old.organization_id,
      old.id,
      'employee',
      old.id,
      'deleted',
      old_payload,
      null,
      array(
        select jsonb_object_keys(old_payload)
      ),
      auth.uid(),
      now()
    );

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists
trigger_audit_hr_employees
on public.hr_employees;

create trigger trigger_audit_hr_employees
after insert or update or delete
on public.hr_employees
for each row
execute function
public.audit_hr_employee_changes();

-- ============================================================
-- 5. Audit des contrats
-- ============================================================

create or replace function
public.audit_hr_contract_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text;
  target_employee_id uuid;
  target_organization_id uuid;
  target_entity_id uuid;

  old_payload jsonb;
  new_payload jsonb;
  fields text[];
begin
  if tg_op = 'INSERT' then
    audit_action := 'created';

    target_employee_id := new.employee_id;
    target_organization_id := new.organization_id;
    target_entity_id := new.id;
    new_payload := to_jsonb(new);

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      target_organization_id,
      target_employee_id,
      'contract',
      target_entity_id,
      audit_action,
      null,
      new_payload,
      array(
        select jsonb_object_keys(new_payload)
      ),
      coalesce(
        new.created_by,
        auth.uid()
      ),
      now()
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    target_employee_id := new.employee_id;
    target_organization_id := new.organization_id;
    target_entity_id := new.id;

    old_payload := to_jsonb(old);
    new_payload := to_jsonb(new);

    fields := public.jsonb_changed_fields(
      old_payload,
      new_payload
    );

    if cardinality(fields) = 0 then
      return new;
    end if;

    if old.is_active = true
       and new.is_active = false
       and new.status = 'archived'
    then
      audit_action := 'archived';

    elsif old.is_active = false
          and new.is_active = true
    then
      audit_action := 'reactivated';

    else
      audit_action := 'updated';
    end if;

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      target_organization_id,
      target_employee_id,
      'contract',
      target_entity_id,
      audit_action,
      old_payload,
      new_payload,
      fields,
      coalesce(
        new.updated_by,
        auth.uid()
      ),
      now()
    );

    return new;
  end if;

  if tg_op = 'DELETE' then
    target_employee_id := old.employee_id;
    target_organization_id := old.organization_id;
    target_entity_id := old.id;
    old_payload := to_jsonb(old);

    insert into public.hr_audit_logs (
      organization_id,
      employee_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      changed_fields,
      performed_by,
      performed_at
    )
    values (
      target_organization_id,
      target_employee_id,
      'contract',
      target_entity_id,
      'deleted',
      old_payload,
      null,
      array(
        select jsonb_object_keys(old_payload)
      ),
      auth.uid(),
      now()
    );

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists
trigger_audit_hr_employee_contracts
on public.hr_employee_contracts;

create trigger
trigger_audit_hr_employee_contracts
after insert or update or delete
on public.hr_employee_contracts
for each row
execute function
public.audit_hr_contract_changes();

-- ============================================================
-- 6. Vue de lecture simplifiée
-- ============================================================

create or replace view
public.hr_employee_audit_history
as
select
  log.id,

  log.organization_id,
  log.employee_id,

  log.entity_type,
  log.entity_id,
  log.action,

  log.changed_fields,
  log.old_values,
  log.new_values,

  log.performed_by,
  log.performed_at,

  coalesce(
    profile.full_name,
    profile.email,
    'Utilisateur inconnu'
  ) as performed_by_name

from public.hr_audit_logs as log

left join public.profiles as profile
  on profile.id = log.performed_by;

-- ============================================================
-- 7. Droits
-- ============================================================

revoke all
on table public.hr_audit_logs
from public;

grant select
on table public.hr_audit_logs
to authenticated;

grant select
on table public.hr_employee_audit_history
to authenticated;

commit;