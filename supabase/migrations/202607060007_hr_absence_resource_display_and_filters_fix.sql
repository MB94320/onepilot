-- V5.4 - Correctifs UI/métier absences + ressources
-- Objectifs :
-- 1. garantir les champs libres de rattachement sur hr_employees ;
-- 2. autoriser les actions de validation tracées ;
-- 3. sécuriser les fonctions N+1 / RH / refus / archivage ;
-- 4. permettre l'affichage des champs libres sans casser les vues existantes.

alter table if exists public.hr_employees
  add column if not exists site_free_text text,
  add column if not exists department_free_text text,
  add column if not exists job_free_text text,
  add column if not exists function_free_text text;

alter table if exists public.hr_absence_approvals
  drop constraint if exists hr_absence_approvals_action_valid;

alter table if exists public.hr_absence_approvals
  add constraint hr_absence_approvals_action_valid
  check (
    action in (
      'created',
      'submitted',
      'updated',
      'manager_approve',
      'manager_approved',
      'hr_approve',
      'hr_approved',
      'approved',
      'reject',
      'rejected',
      'cancelled',
      'archived',
      'restored'
    )
  );

drop function if exists public.approve_hr_absence_request_manager(uuid, text);
drop function if exists public.approve_hr_absence_request_hr(uuid, text);
drop function if exists public.reject_hr_absence_request(uuid, text);
drop function if exists public.archive_hr_absence_request(uuid, text);

create or replace function public.approve_hr_absence_request_manager(
  target_request_id uuid,
  approval_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record record;
  actor_user_id uuid := auth.uid();
begin
  select *
  into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if request_record.status <> 'submitted' then
    raise exception 'La demande doit être au statut submitted pour validation N+1.';
  end if;

  update public.hr_absence_requests
  set
    status = 'manager_approved',
    manager_comment = coalesce(approval_comment, manager_comment),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    approver_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_by,
    updated_by
  )
  values (
    request_record.organization_id,
    target_request_id,
    request_record.manager_employee_id,
    'manager_approve',
    request_record.status,
    'manager_approved',
    'manager',
    approval_comment,
    actor_user_id,
    actor_user_id
  );
end;
$$;

create or replace function public.approve_hr_absence_request_hr(
  target_request_id uuid,
  approval_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record record;
  actor_user_id uuid := auth.uid();
begin
  select *
  into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if request_record.status not in ('manager_approved', 'submitted') then
    raise exception 'La demande doit être validée N+1 ou soumise pour approbation RH.';
  end if;

  update public.hr_absence_requests
  set
    status = 'approved',
    hr_comment = coalesce(approval_comment, hr_comment),
    approved_at = coalesce(approved_at, now()),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    approver_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_by,
    updated_by
  )
  values (
    request_record.organization_id,
    target_request_id,
    null,
    'hr_approve',
    request_record.status,
    'approved',
    'hr',
    approval_comment,
    actor_user_id,
    actor_user_id
  );
end;
$$;

create or replace function public.reject_hr_absence_request(
  target_request_id uuid,
  rejection_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record record;
  actor_user_id uuid := auth.uid();
begin
  select *
  into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if request_record.status not in ('submitted', 'manager_approved') then
    raise exception 'La demande ne peut être refusée que si elle est en validation.';
  end if;

  update public.hr_absence_requests
  set
    status = 'rejected',
    manager_comment = case when request_record.status = 'submitted' then coalesce(rejection_comment, manager_comment) else manager_comment end,
    hr_comment = case when request_record.status = 'manager_approved' then coalesce(rejection_comment, hr_comment) else hr_comment end,
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    approver_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_by,
    updated_by
  )
  values (
    request_record.organization_id,
    target_request_id,
    request_record.manager_employee_id,
    'reject',
    request_record.status,
    'rejected',
    case when request_record.status = 'submitted' then 'manager' else 'hr' end,
    rejection_comment,
    actor_user_id,
    actor_user_id
  );
end;
$$;

create or replace function public.archive_hr_absence_request(
  target_request_id uuid,
  archive_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record record;
  actor_user_id uuid := auth.uid();
begin
  select *
  into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d’absence introuvable.';
  end if;

  update public.hr_absence_requests
  set
    is_archived = true,
    archived_at = coalesce(archived_at, now()),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    approver_employee_id,
    action,
    previous_status,
    next_status,
    actor_role,
    comment,
    created_by,
    updated_by
  )
  values (
    request_record.organization_id,
    target_request_id,
    null,
    'archived',
    request_record.status,
    request_record.status,
    'system',
    archive_comment,
    actor_user_id,
    actor_user_id
  );
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, text) to authenticated;
grant execute on function public.archive_hr_absence_request(uuid, text) to authenticated;
