
-- 202607060006_hr_absence_validation_and_resource_free_fields_fix.sql
-- Correctif final : contraintes actions validation, fonctions N+1/RH/refus, champs libres ressources.

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
      'approved',
      'reject',
      'rejected',
      'cancelled',
      'archived'
    )
  );

drop function if exists public.hr_absence_request_has_column(text);

create or replace function public.hr_absence_request_has_column(column_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hr_absence_requests'
      and columns.column_name = hr_absence_request_has_column.column_name
  );
$$;

create or replace function public.update_hr_absence_request_status_dynamic_v6(
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
  request_organization_id uuid;
  request_previous_status text;
  request_final_status text;
  set_clause text := 'status = $1';
begin
  select request.organization_id, request.status
  into request_organization_id, request_previous_status
  from public.hr_absence_requests request
  where request.id = target_request_id
  for update;

  if request_organization_id is null then
    raise exception 'Demande d’absence introuvable.';
  end if;

  if public.hr_absence_request_has_column('updated_at') then
    set_clause := set_clause || ', updated_at = now()';
  end if;

  if public.hr_absence_request_has_column('updated_by') then
    set_clause := set_clause || ', updated_by = $2';
  end if;

  if next_status = 'manager_approved' then
    if public.hr_absence_request_has_column('manager_approved_at') then
      set_clause := set_clause || ', manager_approved_at = now()';
    end if;
    if public.hr_absence_request_has_column('manager_comment') then
      set_clause := set_clause || ', manager_comment = coalesce($4, manager_comment)';
    end if;
  end if;

  if next_status = 'approved' then
    if public.hr_absence_request_has_column('approved_at') then
      set_clause := set_clause || ', approved_at = now()';
    end if;
    if public.hr_absence_request_has_column('hr_comment') then
      set_clause := set_clause || ', hr_comment = coalesce($4, hr_comment)';
    end if;
  end if;

  if next_status = 'rejected' then
    if public.hr_absence_request_has_column('rejected_at') then
      set_clause := set_clause || ', rejected_at = now()';
    end if;
    if public.hr_absence_request_has_column('manager_comment') then
      set_clause := set_clause || ', manager_comment = coalesce($4, manager_comment)';
    end if;
    if public.hr_absence_request_has_column('hr_comment') then
      set_clause := set_clause || ', hr_comment = coalesce($4, hr_comment)';
    end if;
  end if;

  execute format(
    'update public.hr_absence_requests set %s where id = $3 returning status',
    set_clause
  )
  using next_status, actor_user_id, target_request_id, action_comment
  into request_final_status;

  organization_id := request_organization_id;
  previous_status := request_previous_status;
  final_status := request_final_status;
  return next;
end;
$$;

create or replace function public.approve_hr_absence_request_manager(
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
  from public.update_hr_absence_request_status_dynamic_v6(
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

create or replace function public.approve_hr_absence_request_hr(
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
  from public.update_hr_absence_request_status_dynamic_v6(
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

create or replace function public.reject_hr_absence_request(
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
  from public.update_hr_absence_request_status_dynamic_v6(
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
    'manager',
    action_comment
  );

  return target_request_id;
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.update_hr_absence_request_status_dynamic_v6(uuid, text, uuid, text) to authenticated;
