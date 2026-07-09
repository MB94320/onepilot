-- V5.8 - Correctif final ciblé RH Absences/Ressources.
-- Objectifs : persistance rattachement libre, persistance rythme hebdomadaire,
-- recalcul réel des soldes consommés/en cours, et sécurité workflow validation.

alter table if exists public.hr_employees
  add column if not exists site_free_text text,
  add column if not exists department_free_text text,
  add column if not exists job_free_text text,
  add column if not exists function_free_text text;

alter table if exists public.hr_employee_contracts
  add column if not exists weekly_pattern jsonb,
  add column if not exists weekly_work_pattern jsonb,
  add column if not exists paid_leave_annual_entitlement numeric(8,2),
  add column if not exists rtt_employee_annual_entitlement numeric(8,2),
  add column if not exists rtt_employer_annual_entitlement numeric(8,2),
  add column if not exists leave_acquisition_start_month integer,
  add column if not exists leave_prorata_on_arrival boolean,
  add column if not exists leave_prorata_on_departure boolean,
  add column if not exists leave_carryover_allowed boolean,
  add column if not exists maximum_leave_carryover numeric(8,2);

update public.hr_employee_contracts
set
  paid_leave_annual_entitlement = coalesce(paid_leave_annual_entitlement, 25),
  rtt_employee_annual_entitlement = coalesce(rtt_employee_annual_entitlement, 7),
  rtt_employer_annual_entitlement = coalesce(rtt_employer_annual_entitlement, 3),
  leave_acquisition_start_month = coalesce(leave_acquisition_start_month, 6),
  leave_prorata_on_arrival = coalesce(leave_prorata_on_arrival, true),
  leave_prorata_on_departure = coalesce(leave_prorata_on_departure, true),
  leave_carryover_allowed = coalesce(leave_carryover_allowed, true),
  maximum_leave_carryover = coalesce(maximum_leave_carryover, 0)
where true;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'hr_absence_approvals'
  ) then
    alter table public.hr_absence_approvals
      drop constraint if exists hr_absence_approvals_action_valid;

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
  end if;
end $$;

create or replace function public.recalculate_hr_absence_balances_v5_8(
  target_organization_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.hr_absence_balances as balance
  set
    consumed_amount = coalesce((
      select sum(coalesce(request.requested_amount, 0))
      from public.hr_absence_requests as request
      where request.organization_id = balance.organization_id
        and request.employee_id = balance.employee_id
        and request.absence_type_id = balance.absence_type_id
        and request.status = 'approved'
        and coalesce(request.is_archived, false) = false
        and request.start_date <= balance.period_end
        and request.end_date >= balance.period_start
    ), 0),
    pending_amount = coalesce((
      select sum(coalesce(request.requested_amount, 0))
      from public.hr_absence_requests as request
      where request.organization_id = balance.organization_id
        and request.employee_id = balance.employee_id
        and request.absence_type_id = balance.absence_type_id
        and request.status in ('submitted', 'manager_approved')
        and coalesce(request.is_archived, false) = false
        and request.start_date <= balance.period_end
        and request.end_date >= balance.period_start
    ), 0),
    updated_at = now()
  from public.hr_absence_types as absence_type
  where absence_type.id = balance.absence_type_id
    and (target_organization_id is null or balance.organization_id = target_organization_id)
    and coalesce(absence_type.code, '') in ('CP', 'RTT_EMPLOYE', 'RTT_EMPLOYEUR');
end;
$$;

grant execute on function public.recalculate_hr_absence_balances_v5_8(uuid) to authenticated;

create or replace function public.hr_absence_recalculate_balances_trigger_v5_8()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_to_recalculate uuid;
begin
  organization_to_recalculate := coalesce(new.organization_id, old.organization_id);

  if organization_to_recalculate is not null then
    perform public.recalculate_hr_absence_balances_v5_8(organization_to_recalculate);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists hr_absence_recalculate_balances_v5_8_trigger on public.hr_absence_requests;

create trigger hr_absence_recalculate_balances_v5_8_trigger
after insert or update or delete on public.hr_absence_requests
for each row
execute function public.hr_absence_recalculate_balances_trigger_v5_8();

select public.recalculate_hr_absence_balances_v5_8(null);
