-- V5.9 - Correctifs RH ciblés : persistance rattachement/rythme, référentiels RH,
-- colonnes manquantes des nouveaux modules, et recalcul soldes.

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

-- Tables créées précédemment avec create table if not exists : on ajoute aussi les colonnes si une version ancienne existait déjà.
alter table if exists public.hr_time_activity_entries
  add column if not exists status text default 'draft',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists description text,
  add column if not exists manager_comment text;

alter table if exists public.hr_employee_skills
  add column if not exists status text default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists evidence text;

alter table if exists public.hr_onboarding_plans
  add column if not exists status text default 'draft',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists progress_percent numeric(5,2) default 0,
  add column if not exists risk_level text default 'normal',
  add column if not exists notes text;

alter table if exists public.hr_review_items
  add column if not exists status text default 'not_started',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists objective_count integer default 0,
  add column if not exists completed_objective_count integer default 0,
  add column if not exists global_rating numeric(4,2),
  add column if not exists employee_comment text,
  add column if not exists manager_comment text;

-- Référentiels RH de base par organisation : listes visibles immédiatement dans les formulaires.
do $$
declare
  org record;
begin
  for org in select id from public.organizations loop
    if to_regclass('public.hr_sites') is not null then
      insert into public.hr_sites (organization_id, code, name, is_active)
      values
        (org.id, 'SIEGE', 'Siège', true),
        (org.id, 'REMOTE', 'Télétravail / Remote', true),
        (org.id, 'CLIENT', 'Site client', true),
        (org.id, 'AGENCE', 'Agence / Bureau régional', true)
      on conflict do nothing;
    end if;

    if to_regclass('public.hr_departments') is not null then
      insert into public.hr_departments (organization_id, code, name, is_active)
      values
        (org.id, 'DIRECTION', 'Direction générale', true),
        (org.id, 'RH', 'Ressources humaines', true),
        (org.id, 'FINANCE', 'Finance', true),
        (org.id, 'SALES', 'Commerce', true),
        (org.id, 'MARKETING', 'Marketing', true),
        (org.id, 'OPS', 'Opérations', true),
        (org.id, 'IT', 'IT / Systèmes d’information', true),
        (org.id, 'PRODUCT', 'Produit', true),
        (org.id, 'DELIVERY', 'Delivery / Projets', true),
        (org.id, 'SUPPORT', 'Support client', true),
        (org.id, 'RECRUITMENT', 'Recrutement', true)
      on conflict do nothing;
    end if;

    if to_regclass('public.hr_jobs') is not null then
      insert into public.hr_jobs (organization_id, code, name, is_active)
      values
        (org.id, 'CEO', 'Dirigeant / CEO', true),
        (org.id, 'HR_MANAGER', 'Responsable RH', true),
        (org.id, 'RECRUITER', 'Responsable recrutement', true),
        (org.id, 'PROJECT_MANAGER', 'Chef de projet', true),
        (org.id, 'PRODUCT_MANAGER', 'Product Manager', true),
        (org.id, 'DEVELOPER', 'Développeur', true),
        (org.id, 'CONSULTANT', 'Consultant', true),
        (org.id, 'SALES_MANAGER', 'Responsable commercial', true),
        (org.id, 'ACCOUNT_MANAGER', 'Account Manager', true),
        (org.id, 'SUPPORT_AGENT', 'Chargé de support', true),
        (org.id, 'FINANCE_MANAGER', 'Responsable financier', true)
      on conflict do nothing;
    end if;

    if to_regclass('public.hr_functions') is not null then
      insert into public.hr_functions (organization_id, code, name, is_active)
      values
        (org.id, 'EXECUTIVE', 'Direction', true),
        (org.id, 'MANAGEMENT', 'Management', true),
        (org.id, 'HR', 'Ressources humaines', true),
        (org.id, 'RECRUITMENT', 'Recrutement', true),
        (org.id, 'PROJECT_DELIVERY', 'Pilotage projet', true),
        (org.id, 'EXPERTISE', 'Expertise métier', true),
        (org.id, 'SALES', 'Développement commercial', true),
        (org.id, 'OPERATIONS', 'Opérations', true),
        (org.id, 'SUPPORT', 'Support', true),
        (org.id, 'FINANCE', 'Finance', true),
        (org.id, 'IT', 'Systèmes d’information', true)
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- Données par défaut côté contrats si non renseignées.
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

-- Recalcul soldes sécurisé.
create or replace function public.recalculate_hr_absence_balances_v5_9(
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

grant execute on function public.recalculate_hr_absence_balances_v5_9(uuid) to authenticated;
select public.recalculate_hr_absence_balances_v5_9(null);
