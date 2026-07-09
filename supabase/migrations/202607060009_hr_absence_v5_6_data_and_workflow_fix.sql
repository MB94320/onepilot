-- V5.6 - Correctifs ciblés : workflow RH, champs libres de rattachement, helpers sûrs.

alter table if exists public.hr_employees
  add column if not exists site_free_text text,
  add column if not exists department_free_text text,
  add column if not exists job_free_text text,
  add column if not exists function_free_text text;

alter table if exists public.hr_employee_contracts
  add column if not exists paid_leave_annual_days numeric(8,2) default 25,
  add column if not exists rtt_employee_annual_days numeric(8,2) default 7,
  add column if not exists rtt_employer_annual_days numeric(8,2) default 3,
  add column if not exists leave_acquisition_start_month integer default 6,
  add column if not exists leave_acquisition_start_day integer default 1,
  add column if not exists leave_acquisition_end_month integer default 5,
  add column if not exists leave_acquisition_end_day integer default 31,
  add column if not exists leave_prorate_on_entry boolean default true,
  add column if not exists leave_prorate_on_exit boolean default true,
  add column if not exists leave_carryover_allowed boolean default true,
  add column if not exists leave_carryover_max_days numeric(8,2) default 0;

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'hr_absence_approvals'
    and c.conname = 'hr_absence_approvals_action_valid'
  limit 1;

  if constraint_name is not null then
    execute 'alter table public.hr_absence_approvals drop constraint ' || quote_ident(constraint_name);
  end if;

  alter table public.hr_absence_approvals
    add constraint hr_absence_approvals_action_valid
    check (
      action in (
        'created',
        'submitted',
        'manager_approve',
        'manager_approved',
        'hr_approve',
        'approved',
        'reject',
        'rejected',
        'cancel',
        'cancelled',
        'archive',
        'archived',
        'restore',
        'restored'
      )
    );
end $$;

drop function if exists public.approve_hr_absence_request_manager(uuid, uuid, uuid, text);
drop function if exists public.approve_hr_absence_request_hr(uuid, uuid, uuid, text);
drop function if exists public.reject_hr_absence_request(uuid, uuid, uuid, text);

create or replace function public.approve_hr_absence_request_manager(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
begin
  select status
    into previous_status
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if previous_status is null then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if previous_status <> 'submitted' then
    raise exception 'Seules les demandes soumises peuvent être validées par le N+1. Statut actuel : %', previous_status;
  end if;

  update public.hr_absence_requests
  set
    status = 'manager_approved',
    approved_at = null,
    manager_comment = coalesce(nullif(action_comment, ''), manager_comment),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    request_id,
    actor_user_id,
    actor_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_at
  ) values (
    target_request_id,
    actor_user_id,
    actor_employee_id,
    'manager_approve',
    previous_status,
    'manager_approved',
    'manager',
    nullif(action_comment, ''),
    now()
  );
end;
$$;

create or replace function public.approve_hr_absence_request_hr(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
begin
  select status
    into previous_status
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if previous_status is null then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if previous_status not in ('manager_approved', 'submitted') then
    raise exception 'Seules les demandes validées manager ou soumises peuvent être approuvées RH. Statut actuel : %', previous_status;
  end if;

  update public.hr_absence_requests
  set
    status = 'approved',
    approved_at = now(),
    hr_comment = coalesce(nullif(action_comment, ''), hr_comment),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    request_id,
    actor_user_id,
    actor_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_at
  ) values (
    target_request_id,
    actor_user_id,
    actor_employee_id,
    'hr_approve',
    previous_status,
    'approved',
    'hr',
    nullif(action_comment, ''),
    now()
  );
end;
$$;

create or replace function public.reject_hr_absence_request(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
begin
  if nullif(action_comment, '') is null then
    raise exception 'Un commentaire est obligatoire pour refuser une demande.';
  end if;

  select status
    into previous_status
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if previous_status is null then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if previous_status in ('approved', 'rejected', 'cancelled') then
    raise exception 'Cette demande ne peut plus être refusée. Statut actuel : %', previous_status;
  end if;

  update public.hr_absence_requests
  set
    status = 'rejected',
    manager_comment = coalesce(manager_comment, nullif(action_comment, '')),
    hr_comment = case when previous_status = 'manager_approved' then coalesce(hr_comment, nullif(action_comment, '')) else hr_comment end,
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    request_id,
    actor_user_id,
    actor_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_at
  ) values (
    target_request_id,
    actor_user_id,
    actor_employee_id,
    'reject',
    previous_status,
    'rejected',
    case when previous_status = 'manager_approved' then 'hr' else 'manager' end,
    nullif(action_comment, ''),
    now()
  );
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;
