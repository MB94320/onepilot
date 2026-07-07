-- Consolidation du workflow Absences / congés / RTT.
-- Objectif : tracer les actions manager/RH/refus sans casser le schéma existant.
-- Les updates sont dynamiques afin de rester compatibles avec les colonnes déjà présentes.

create or replace function public.hr_absence_request_has_column(column_name_to_check text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hr_absence_requests'
      and column_name = column_name_to_check
  );
$$;

create or replace function public.update_hr_absence_request_status_dynamic(
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
  assignments text[];
  update_sql text;
begin
  select
    request.organization_id,
    request.status
  into
    target_organization_id,
    current_status
  from public.hr_absence_requests request
  where request.id = target_request_id
  for update;

  if target_organization_id is null then
    raise exception 'Demande d''absence introuvable : %', target_request_id;
  end if;

  assignments := array[
    format('status = %L', next_status)
  ];

  if public.hr_absence_request_has_column('updated_at') then
    assignments := assignments || 'updated_at = now()';
  end if;

  if public.hr_absence_request_has_column('updated_by') then
    assignments := assignments || format('updated_by = %L::uuid', actor_user_id);
  end if;

  if next_status = 'manager_approved' then
    if public.hr_absence_request_has_column('manager_approved_at') then
      assignments := assignments || 'manager_approved_at = now()';
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      assignments := assignments || format('manager_comment = nullif(%L, '''')', coalesce(action_comment, ''));
    end if;
  end if;

  if next_status = 'approved' then
    if public.hr_absence_request_has_column('approved_at') then
      assignments := assignments || 'approved_at = now()';
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      assignments := assignments || format('hr_comment = nullif(%L, '''')', coalesce(action_comment, ''));
    end if;
  end if;

  if next_status = 'rejected' then
    if public.hr_absence_request_has_column('rejected_at') then
      assignments := assignments || 'rejected_at = now()';
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      assignments := assignments || format('manager_comment = coalesce(manager_comment, nullif(%L, ''''))', coalesce(action_comment, ''));
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      assignments := assignments || format('hr_comment = coalesce(hr_comment, nullif(%L, ''''))', coalesce(action_comment, ''));
    end if;
  end if;

  update_sql := format(
    'update public.hr_absence_requests set %s where id = %L::uuid',
    array_to_string(assignments, ', '),
    target_request_id
  );

  execute update_sql;

  organization_id := target_organization_id;
  previous_status := current_status;
  final_status := next_status;

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
  )
  values (
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
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'approved',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status not in ('submitted', 'manager_approved') then
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
  )
  values (
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
  if nullif(trim(coalesce(action_comment, '')), '') is null then
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
  )
  values (
    workflow_result.organization_id,
    target_request_id,
    'reject',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'approver',
    action_comment
  );

  return target_request_id;
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;

-- Policies de lecture minimales utiles au module Absences si RLS est actif.
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'hr_absence_requests'
      and rowsecurity = true
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'hr_absence_requests'
        and policyname = 'hr_absence_requests_select_authenticated'
    ) then
      create policy hr_absence_requests_select_authenticated
      on public.hr_absence_requests
      for select
      to authenticated
      using (true);
    end if;
  end if;

  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'hr_absence_approvals'
      and rowsecurity = true
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'hr_absence_approvals'
        and policyname = 'hr_absence_approvals_select_authenticated'
    ) then
      create policy hr_absence_approvals_select_authenticated
      on public.hr_absence_approvals
      for select
      to authenticated
      using (true);
    end if;
  end if;
end $$;
