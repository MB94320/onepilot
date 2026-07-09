-- V5.5 - Correctifs finaux Absences/Ressources
-- Objectifs : validation RH robuste, champs libres de rattachement, types d'action autorisés,
-- et compatibilité avec les écrans actuels.

alter table if exists public.hr_employees
  add column if not exists site_free_text text,
  add column if not exists department_free_text text,
  add column if not exists job_free_text text,
  add column if not exists function_free_text text;

alter table if exists public.hr_employee_contracts
  add column if not exists leave_acquisition_start_month integer default 6,
  add column if not exists paid_leave_annual_entitlement numeric(8,2) default 25,
  add column if not exists rtt_annual_entitlement numeric(8,2) default 10,
  add column if not exists rtt_employer_annual_entitlement numeric(8,2) default 3,
  add column if not exists rtt_employee_annual_entitlement numeric(8,2) default 7,
  add column if not exists leave_prorata_on_arrival boolean default true,
  add column if not exists leave_prorata_on_departure boolean default true,
  add column if not exists leave_carryover_allowed boolean default true,
  add column if not exists maximum_leave_carryover numeric(8,2) default 5;

alter table if exists public.hr_absence_approvals
  drop constraint if exists hr_absence_approvals_action_valid;

alter table if exists public.hr_absence_approvals
  add constraint hr_absence_approvals_action_valid
  check (
    action in (
      'created',
      'submitted',
      'manager_approve',
      'manager_approved',
      'hr_approve',
      'hr_approved',
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


-- Recréation forcée des fonctions dont le type de retour a changé.
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
  request_record public.hr_absence_requests%rowtype;
begin
  select *
    into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d''absence introuvable.';
  end if;

  if request_record.status <> 'submitted' then
    raise exception 'Seules les demandes soumises peuvent être validées par le manager.';
  end if;

  update public.hr_absence_requests
  set
    status = 'manager_approved',
    manager_reviewed_at = now(),
    manager_reviewed_by = actor_user_id,
    manager_comment = coalesce(action_comment, manager_comment),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment,
    created_at
  ) values (
    request_record.organization_id,
    target_request_id,
    'manager_approve',
    request_record.status,
    'manager_approved',
    actor_user_id,
    actor_employee_id,
    'manager',
    action_comment,
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
  request_record public.hr_absence_requests%rowtype;
begin
  select *
    into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d''absence introuvable.';
  end if;

  if request_record.status not in ('submitted', 'manager_approved') then
    raise exception 'Seules les demandes soumises ou validées manager peuvent être approuvées RH.';
  end if;

  update public.hr_absence_requests
  set
    status = 'approved',
    hr_reviewed_at = now(),
    hr_reviewed_by = actor_user_id,
    hr_comment = coalesce(action_comment, hr_comment),
    approved_at = now(),
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment,
    created_at
  ) values (
    request_record.organization_id,
    target_request_id,
    'hr_approve',
    request_record.status,
    'approved',
    actor_user_id,
    actor_employee_id,
    'hr',
    action_comment,
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
  request_record public.hr_absence_requests%rowtype;
begin
  if action_comment is null or length(trim(action_comment)) = 0 then
    raise exception 'Un commentaire est obligatoire pour refuser une demande.';
  end if;

  select *
    into request_record
  from public.hr_absence_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Demande d''absence introuvable.';
  end if;

  if request_record.status in ('approved', 'cancelled', 'rejected') then
    raise exception 'Cette demande ne peut plus être refusée.';
  end if;

  update public.hr_absence_requests
  set
    status = 'rejected',
    rejected_at = now(),
    manager_comment = case
      when request_record.status = 'submitted' then action_comment
      else manager_comment
    end,
    hr_comment = case
      when request_record.status <> 'submitted' then action_comment
      else hr_comment
    end,
    updated_by = actor_user_id,
    updated_at = now()
  where id = target_request_id;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment,
    created_at
  ) values (
    request_record.organization_id,
    target_request_id,
    'reject',
    request_record.status,
    'rejected',
    actor_user_id,
    actor_employee_id,
    case
      when request_record.status = 'submitted' then 'manager'
      else 'hr'
    end,
    action_comment,
    now()
  );
end;
$$;

-- Les soldes restent sur la ventilation validée : CP 25, RTT employé 7, RTT employeur 3.
update public.hr_absence_balances as balance
set
  annual_entitlement = case
    when absence_type.code = 'CP' then 25
    when absence_type.code = 'RTT_EMPLOYE' then 7
    when absence_type.code = 'RTT_EMPLOYEUR' then 3
    else balance.annual_entitlement
  end,
  opening_balance = case
    when absence_type.code = 'CP' then 25
    when absence_type.code = 'RTT_EMPLOYE' then 7
    when absence_type.code = 'RTT_EMPLOYEUR' then 3
    else balance.opening_balance
  end,
  updated_at = now()
from public.hr_absence_types as absence_type
where absence_type.id = balance.absence_type_id
  and balance.period_start = '2026-06-01'
  and balance.period_end = '2027-05-31'
  and absence_type.code in ('CP', 'RTT_EMPLOYE', 'RTT_EMPLOYEUR');
