-- ONEPILOT PMO v2 — fondation métier additive et multi-tenant.
-- Compatible avec 202607050001_staffing_capacity_foundation.sql et
-- 202607060023_project_pmo_v1_foundation.sql.
-- Cette migration ne supprime aucune donnée métier. Elle remplace uniquement
-- les anciennes policies project_* permissives par une isolation organisationnelle.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Référentiels programmes et numérotation annuelle
-- -----------------------------------------------------------------------------

create table if not exists public.project_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  portfolio_id uuid references public.project_portfolios(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active',
  sponsor_employee_id uuid references public.hr_employees(id) on delete set null,
  sponsor_name text,
  program_manager_employee_id uuid references public.hr_employees(id) on delete set null,
  program_manager_name text,
  start_date date,
  end_date date,
  budget_amount numeric(16,2) not null default 0,
  currency text not null default 'EUR',
  objectives jsonb not null default '[]'::jsonb,
  governance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.project_number_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sequence_year integer not null,
  sequence_kind text not null default 'project',
  last_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, sequence_year, sequence_kind)
);

create or replace function public.next_project_code(
  target_organization_id uuid,
  target_year integer default extract(year from current_date)::integer,
  code_prefix text default 'P'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_prefix text := coalesce(
    nullif(regexp_replace(upper(coalesce(trim(code_prefix), '')), '[^A-Z0-9]', '', 'g'), ''),
    'P'
  );
  next_value integer;
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception 'Accès refusé à l’organisation %.', target_organization_id
      using errcode = '42501';
  end if;

  insert into public.project_number_sequences (
    organization_id, sequence_year, sequence_kind, last_value
  )
  select
    target_organization_id,
    target_year,
    lower(normalized_prefix),
    coalesce(max(
      nullif(
        substring(
          project.code from
          ('^' || normalized_prefix || '-' || target_year::text || '-([0-9]+)$')
        ),
        ''
      )::integer
    ), 0) + 1
  from public.project_projects project
  where project.organization_id = target_organization_id
    and project.code ~ ('^' || normalized_prefix || '-' || target_year::text || '-[0-9]+$')
  on conflict (organization_id, sequence_year, sequence_kind)
  do update set
    last_value = public.project_number_sequences.last_value + 1,
    updated_at = now()
  returning last_value into next_value;

  return normalized_prefix || '-' || target_year::text || '-' || lpad(next_value::text, 4, '0');
end;
$$;

revoke all on function public.next_project_code(uuid, integer, text) from public;
grant execute on function public.next_project_code(uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Extension additive du portefeuille, des tâches et des actions
-- -----------------------------------------------------------------------------

alter table if exists public.project_projects
  add column if not exists program_id uuid references public.project_programs(id) on delete set null,
  add column if not exists client_name text,
  add column if not exists sector_name text,
  add column if not exists project_manager_name text,
  add column if not exists sponsor_name text,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists source_reference text,
  add column if not exists ordered_budget numeric(16,2) not null default 0,
  add column if not exists consumed_budget numeric(16,2) not null default 0,
  add column if not exists baseline_budget numeric(16,2) not null default 0,
  add column if not exists planned_value numeric(16,2) not null default 0,
  add column if not exists earned_value numeric(16,2) not null default 0,
  add column if not exists actual_cost_total numeric(16,2) not null default 0,
  add column if not exists physical_progress_percent numeric(7,4) not null default 0,
  add column if not exists schedule_progress_percent numeric(7,4) not null default 0,
  add column if not exists governance_status text not null default 'standard',
  add column if not exists executive_comment text,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists next_review_date date,
  add column if not exists baseline_start_date date,
  add column if not exists baseline_end_date date;

alter table if exists public.project_tasks
  add column if not exists task_kind text not null default 'task',
  add column if not exists wbs_code text,
  add column if not exists sequence_order integer not null default 0,
  add column if not exists baseline_start_date date,
  add column if not exists baseline_end_date date,
  add column if not exists actual_start_date date,
  add column if not exists actual_end_date date,
  add column if not exists progress_percent numeric(7,4) not null default 0,
  add column if not exists physical_weight numeric(12,4) not null default 1,
  add column if not exists actual_hours numeric(14,2) not null default 0,
  add column if not exists planned_cost numeric(16,2) not null default 0,
  add column if not exists actual_cost numeric(16,2) not null default 0,
  add column if not exists constraint_type text,
  add column if not exists constraint_date date,
  add column if not exists total_float_days integer,
  add column if not exists free_float_days integer,
  add column if not exists is_critical boolean not null default false,
  add column if not exists owner_name text,
  add column if not exists deliverable_reference text;

alter table if exists public.project_actions
  add column if not exists origin_type text not null default 'project',
  add column if not exists origin_id uuid,
  add column if not exists origin_reference text,
  add column if not exists owner_name text,
  add column if not exists replanned_due_date date,
  add column if not exists expected_result text,
  add column if not exists actual_result text,
  add column if not exists effectiveness_status text,
  add column if not exists effectiveness_comment text,
  add column if not exists actual_completion_date date,
  add column if not exists comments text;

-- Statuts PMO de référence, compatibles avec les valeurs historiques.
alter table if exists public.project_projects
  drop constraint if exists project_projects_status_check;
alter table if exists public.project_projects
  add constraint project_projects_status_check check (
    status in ('draft', 'open', 'planned', 'active', 'in_progress', 'on_hold', 'blocked', 'completed', 'closed', 'cancelled', 'archived')
  );

alter table if exists public.project_tasks
  drop constraint if exists project_tasks_status_check;
alter table if exists public.project_tasks
  add constraint project_tasks_status_check check (
    status in ('draft', 'open', 'todo', 'planned', 'active', 'in_progress', 'pending', 'on_hold', 'blocked', 'review', 'done', 'completed', 'closed', 'cancelled', 'archived')
  );

alter table if exists public.project_actions
  drop constraint if exists project_actions_status_check;
alter table if exists public.project_actions
  add constraint project_actions_status_check check (
    status in ('draft', 'open', 'todo', 'planned', 'active', 'in_progress', 'pending', 'on_hold', 'blocked', 'review', 'done', 'completed', 'closed', 'cancelled', 'archived')
  );

-- -----------------------------------------------------------------------------
-- Livrables, risques, affectations, compétences et liens Commerce
-- -----------------------------------------------------------------------------

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  task_id uuid references public.project_tasks(id) on delete set null,
  milestone_id uuid references public.project_milestones(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  deliverable_type text not null default 'document',
  status text not null default 'planned',
  quality_status text not null default 'pending',
  planned_date date not null,
  replanned_date date,
  actual_delivery_date date,
  accepted_date date,
  first_time_right boolean,
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  owner_name text,
  approver_employee_id uuid references public.hr_employees(id) on delete set null,
  approver_name text,
  acceptance_criteria text,
  evidence_url text,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, code)
);

create table if not exists public.project_risks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  task_id uuid references public.project_tasks(id) on delete set null,
  code text not null,
  title text not null,
  description text,
  category text not null default 'project',
  risk_type text not null default 'threat',
  status text not null default 'open',
  probability integer not null default 1 check (probability between 1 and 4),
  impact integer not null default 1 check (impact between 1 and 4),
  revenue_impact_amount numeric(16,2) not null default 0,
  cost_impact_amount numeric(16,2) not null default 0,
  schedule_impact_days integer not null default 0,
  inherent_score integer generated always as (probability * impact) stored,
  residual_probability integer check (residual_probability between 1 and 4),
  residual_impact integer check (residual_impact between 1 and 4),
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  owner_name text,
  response_strategy text,
  mitigation_plan text,
  contingency_plan text,
  trigger_condition text,
  review_date date,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, code)
);

create table if not exists public.project_task_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  employee_id uuid references public.hr_employees(id) on delete set null,
  resource_name text not null,
  assignment_role text,
  assignment_status text not null default 'planned',
  start_date date,
  end_date date,
  allocation_percent numeric(7,4) not null default 1 check (allocation_percent between 0 and 2),
  planned_hours numeric(14,2) not null default 0,
  actual_hours numeric(14,2) not null default 0,
  planned_hourly_cost numeric(14,2),
  actual_hourly_cost numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, task_id, resource_name)
);

create table if not exists public.project_skill_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  task_id uuid references public.project_tasks(id) on delete cascade,
  staffing_need_id uuid references public.project_staffing_needs(id) on delete set null,
  skill_id uuid,
  skill_code text,
  skill_name text not null,
  skill_family text,
  required_level integer not null default 2 check (required_level between 0 and 4),
  minimum_people integer not null default 1 check (minimum_people >= 0),
  importance text not null default 'required',
  planned_hours numeric(14,2) not null default 0,
  coverage_percent numeric(7,4) not null default 0,
  justification text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists project_skill_requirements_scope_uq
  on public.project_skill_requirements (
    organization_id,
    project_id,
    coalesce(task_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(skill_name)
  );

create table if not exists public.project_commerce_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  source_module text not null default 'commerce',
  source_entity_type text not null,
  source_entity_id uuid,
  source_reference text,
  source_label text,
  client_id uuid references public.project_clients(id) on delete set null,
  client_name text,
  ordered_amount numeric(16,2),
  currency text not null default 'EUR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists project_commerce_links_source_uq
  on public.project_commerce_links (
    organization_id,
    project_id,
    source_entity_type,
    coalesce(source_reference, source_entity_id::text, '')
  );

-- -----------------------------------------------------------------------------
-- Finance projet, satisfaction et audit consolidé
-- -----------------------------------------------------------------------------

create table if not exists public.project_financial_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  baseline_budget numeric(16,2) not null default 0,
  planned_value numeric(16,2) not null default 0,
  earned_value numeric(16,2) not null default 0,
  actual_cost numeric(16,2) not null default 0,
  production_amount numeric(16,2) not null default 0,
  invoiced_amount numeric(16,2) not null default 0,
  collected_amount numeric(16,2) not null default 0,
  purchase_amount numeric(16,2) not null default 0,
  expense_amount numeric(16,2) not null default 0,
  forecast_to_complete numeric(16,2),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (period_end >= period_start),
  unique (organization_id, project_id, period_start)
);

create table if not exists public.project_satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  survey_month date not null,
  respondent_name text,
  respondent_role text,
  customer_listening_score numeric(3,2) check (customer_listening_score between 0 and 5),
  planning_score numeric(3,2) check (planning_score between 0 and 5),
  technical_skills_score numeric(3,2) check (technical_skills_score between 0 and 5),
  monitoring_score numeric(3,2) check (monitoring_score between 0 and 5),
  risk_management_score numeric(3,2) check (risk_management_score between 0 and 5),
  overall_score numeric(3,2) generated always as (
    round((
      coalesce(customer_listening_score, 0) + coalesce(planning_score, 0) +
      coalesce(technical_skills_score, 0) + coalesce(monitoring_score, 0) +
      coalesce(risk_management_score, 0)
    ) / nullif(
      (customer_listening_score is not null)::integer + (planning_score is not null)::integer +
      (technical_skills_score is not null)::integer + (monitoring_score is not null)::integer +
      (risk_management_score is not null)::integer,
      0
    ), 2)
  ) stored,
  verbatim text,
  improvement_actions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, survey_month)
);

create table if not exists public.project_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.project_projects(id) on delete cascade,
  entity_table text not null,
  entity_id uuid,
  action text not null,
  actor_user_id uuid,
  before_data jsonb,
  after_data jsonb,
  business_context text,
  created_at timestamptz not null default now()
);

create or replace view public.project_financial_performance
with (security_invoker = true)
as
select
  f.organization_id,
  f.project_id,
  p.code as project_code,
  p.name as project_name,
  f.period_start,
  f.period_end,
  f.baseline_budget as bac,
  f.planned_value as pv,
  f.earned_value as ev,
  f.actual_cost as ac,
  f.earned_value - f.actual_cost as cost_variance,
  f.earned_value - f.planned_value as schedule_variance,
  case when f.actual_cost = 0 then null else round(f.earned_value / f.actual_cost, 4) end as cpi,
  case when f.planned_value = 0 then null else round(f.earned_value / f.planned_value, 4) end as spi,
  case when f.earned_value = 0 or f.actual_cost = 0 then null
       else round(f.baseline_budget / nullif(f.earned_value / f.actual_cost, 0), 2) end as estimate_at_completion,
  case when f.forecast_to_complete is not null then f.forecast_to_complete
       when f.earned_value = 0 or f.actual_cost = 0 then null
       else round((f.baseline_budget / nullif(f.earned_value / f.actual_cost, 0)) - f.actual_cost, 2) end as estimate_to_complete,
  f.production_amount,
  f.invoiced_amount,
  f.collected_amount,
  greatest(f.production_amount - f.invoiced_amount, 0) as fae,
  greatest(f.invoiced_amount - f.production_amount, 0) as pca,
  f.production_amount - f.actual_cost as project_margin,
  case when f.production_amount = 0 then null
       else round((f.production_amount - f.actual_cost) / f.production_amount, 4) end as margin_rate,
  f.purchase_amount,
  f.expense_amount,
  f.comment
from public.project_financial_periods f
join public.project_projects p on p.id = f.project_id and p.organization_id = f.organization_id
where f.archived_at is null;

grant select on public.project_financial_performance to authenticated;

-- Alias stable utilisé par les écrans PMO. La vue reste security_invoker :
-- les policies de project_financial_periods continuent donc de s'appliquer.
create or replace view public.project_financial_metrics
with (security_invoker = true)
as
select * from public.project_financial_performance;

grant select on public.project_financial_metrics to authenticated;

-- -----------------------------------------------------------------------------
-- Avancement physique pondéré : le réalisé métier pilote l'avancement projet.
-- -----------------------------------------------------------------------------

create or replace function public.recalculate_project_physical_progress(target_project_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_progress numeric(7,4);
begin
  if auth.uid() is not null and not public.is_organization_member(
    (select organization_id from public.project_projects where id = target_project_id)
  ) then
    raise exception 'Accès refusé au projet %.', target_project_id using errcode = '42501';
  end if;

  select coalesce(
    sum(greatest(0, least(100, task.progress_percent)) * greatest(task.physical_weight, 0)) /
      nullif(sum(greatest(task.physical_weight, 0)), 0),
    0
  )
  into calculated_progress
  from public.project_tasks task
  where task.project_id = target_project_id
    and task.archived_at is null
    and coalesce(task.task_kind, 'task') <> 'summary';

  update public.project_projects
  set physical_progress_percent = round(calculated_progress, 4),
      progress_percent = round(calculated_progress, 2),
      updated_at = now()
  where id = target_project_id;

  return round(calculated_progress, 4);
end;
$$;

revoke all on function public.recalculate_project_physical_progress(uuid) from public;
grant execute on function public.recalculate_project_physical_progress(uuid) to authenticated;

create or replace function public.refresh_project_progress_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_project_physical_progress(coalesce(new.project_id, old.project_id));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.refresh_project_progress_from_task() from public;

drop trigger if exists refresh_project_progress_after_task on public.project_tasks;
drop trigger if exists refresh_project_progress_after_task_change on public.project_tasks;
drop trigger if exists refresh_project_progress_after_task_update on public.project_tasks;
create trigger refresh_project_progress_after_task_change
after insert or delete on public.project_tasks
for each row execute function public.refresh_project_progress_from_task();
create trigger refresh_project_progress_after_task_update
after update of progress_percent, physical_weight, archived_at on public.project_tasks
for each row execute function public.refresh_project_progress_from_task();

-- -----------------------------------------------------------------------------
-- Traçabilité ISO 9001 / audit transverse projet
-- -----------------------------------------------------------------------------

create or replace function public.log_project_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row jsonb;
  target_org uuid;
  target_project uuid;
  target_id uuid;
begin
  source_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_org := nullif(source_row ->> 'organization_id', '')::uuid;
  target_id := nullif(source_row ->> 'id', '')::uuid;
  target_project := case
    when tg_table_name = 'project_projects' then target_id
    else nullif(source_row ->> 'project_id', '')::uuid
  end;

  insert into public.project_audit_events (
    organization_id, project_id, entity_table, entity_id, action,
    actor_user_id, before_data, after_data, business_context
  ) values (
    target_org, target_project, tg_table_name, target_id, lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    'Traçabilité projet, PMO, qualité et décision'
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.log_project_audit_event() from public;

-- -----------------------------------------------------------------------------
-- Indexes, updated_at et audit
-- -----------------------------------------------------------------------------

create index if not exists project_programs_org_status_idx on public.project_programs(organization_id, status);
create index if not exists project_projects_program_idx on public.project_projects(program_id);
create index if not exists project_projects_org_dates_idx on public.project_projects(organization_id, start_date, end_date);
create index if not exists project_tasks_gantt_idx on public.project_tasks(project_id, start_date, due_date, sequence_order);
create index if not exists project_tasks_critical_idx on public.project_tasks(project_id, is_critical) where archived_at is null;
create index if not exists project_deliverables_due_idx on public.project_deliverables(project_id, planned_date, status);
create index if not exists project_risks_matrix_idx on public.project_risks(project_id, probability, impact) where archived_at is null;
create index if not exists project_task_assignments_project_idx on public.project_task_assignments(project_id, start_date, end_date);
create index if not exists project_task_assignments_employee_idx on public.project_task_assignments(employee_id, start_date, end_date);
create index if not exists project_skill_requirements_project_idx on public.project_skill_requirements(project_id, importance);
create index if not exists project_financial_periods_project_idx on public.project_financial_periods(project_id, period_start);
create index if not exists project_satisfaction_project_idx on public.project_satisfaction_surveys(project_id, survey_month);
create index if not exists project_audit_org_date_idx on public.project_audit_events(organization_id, created_at desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'project_programs', 'project_number_sequences', 'project_projects', 'project_tasks',
    'project_actions', 'project_deliverables', 'project_risks', 'project_task_assignments',
    'project_skill_requirements', 'project_commerce_links', 'project_financial_periods',
    'project_satisfaction_surveys'
  ] loop
    if to_regclass('public.' || target_table) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = target_table and column_name = 'updated_at'
       ) then
      execute format('drop trigger if exists set_%I_updated_at on public.%I', target_table, target_table);
      execute format(
        'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        target_table, target_table
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'project_programs', 'project_projects', 'project_tasks', 'project_milestones',
    'project_dependencies', 'project_actions', 'project_baselines', 'project_health_snapshots',
    'project_deliverables', 'project_risks', 'project_task_assignments',
    'project_skill_requirements', 'project_commerce_links', 'project_financial_periods',
    'project_satisfaction_surveys'
  ] loop
    if to_regclass('public.' || target_table) is not null then
      execute format('drop trigger if exists audit_pmo_%I on public.%I', target_table, target_table);
      execute format(
        'create trigger audit_pmo_%I after insert or update or delete on public.%I for each row execute function public.log_project_audit_event()',
        target_table, target_table
      );
    end if;
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS : suppression de toutes les policies historiques project_* puis recréation
-- stricte par organization_id via is_organization_member(uuid).
-- -----------------------------------------------------------------------------

do $$
declare
  relation_record record;
  policy_record record;
begin
  for relation_record in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name like 'project\_%' escape '\'
      and exists (
        select 1 from information_schema.columns column_info
        where column_info.table_schema = 'public'
          and column_info.table_name = information_schema.tables.table_name
          and column_info.column_name = 'organization_id'
      )
  loop
    execute format('alter table public.%I enable row level security', relation_record.table_name);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = relation_record.table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_record.policyname, relation_record.table_name);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_organization_member(organization_id))',
      relation_record.table_name || '_tenant_select', relation_record.table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_organization_member(organization_id))',
      relation_record.table_name || '_tenant_insert', relation_record.table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id))',
      relation_record.table_name || '_tenant_update', relation_record.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_organization_member(organization_id))',
      relation_record.table_name || '_tenant_delete', relation_record.table_name
    );

    execute format('grant select, insert, update, delete on public.%I to authenticated', relation_record.table_name);
  end loop;
end;
$$;

-- Les séquences et l'audit ne sont jamais écrits directement par le client.
-- Ils sont alimentés exclusivement par les fonctions security definer ci-dessus.
alter table public.project_number_sequences enable row level security;
drop policy if exists project_number_sequences_tenant_select on public.project_number_sequences;
drop policy if exists project_number_sequences_tenant_insert on public.project_number_sequences;
drop policy if exists project_number_sequences_tenant_update on public.project_number_sequences;
drop policy if exists project_number_sequences_tenant_delete on public.project_number_sequences;
create policy project_number_sequences_tenant_select
on public.project_number_sequences for select to authenticated
using (public.is_organization_member(organization_id));
revoke insert, update, delete on public.project_number_sequences from authenticated;
grant select on public.project_number_sequences to authenticated;

alter table public.project_audit_events enable row level security;
drop policy if exists project_audit_events_tenant_select on public.project_audit_events;
drop policy if exists project_audit_events_tenant_insert on public.project_audit_events;
drop policy if exists project_audit_events_tenant_update on public.project_audit_events;
drop policy if exists project_audit_events_tenant_delete on public.project_audit_events;
create policy project_audit_events_tenant_select
on public.project_audit_events for select to authenticated
using (public.is_organization_member(organization_id));
revoke insert, update, delete on public.project_audit_events from authenticated;
grant select on public.project_audit_events to authenticated;

do $$
begin
  if to_regclass('public.project_staffing_audit_events') is not null then
    revoke insert, update, delete on public.project_staffing_audit_events from authenticated;
    grant select on public.project_staffing_audit_events to authenticated;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Jeu de démonstration cohérent et idempotent, limité à une organisation existante.
-- -----------------------------------------------------------------------------

do $$
declare
  demo_org uuid;
  demo_portfolio uuid;
  demo_program uuid;
  demo_client uuid;
  project_alpha uuid;
  project_beta uuid;
  project_gamma uuid;
  employee_one uuid;
  employee_two uuid;
  task_a1 uuid;
  task_a2 uuid;
  task_a3 uuid;
  task_b1 uuid;
begin
  select id into demo_org
  from public.organizations
  where lower(coalesce(slug, '')) = 'onepilot'
  order by created_at, id
  limit 1;
  if demo_org is null then
    raise notice 'Seed PMO ignoré : organisation de démonstration onepilot absente.';
    return;
  end if;

  select id into employee_one from public.hr_employees
  where organization_id = demo_org and coalesce(is_active, true) = true
  order by created_at, id limit 1;
  select id into employee_two from public.hr_employees
  where organization_id = demo_org and coalesce(is_active, true) = true and id is distinct from employee_one
  order by created_at, id limit 1;

  insert into public.project_clients (organization_id, code, name, client_type, status)
  values (demo_org, 'CLI-PMO-DEMO', 'Asteria Industries', 'customer', 'active')
  on conflict (organization_id, code) do update set name = excluded.name, updated_at = now()
  returning id into demo_client;

  insert into public.project_portfolios (organization_id, code, name, description, status, owner_employee_id)
  values (demo_org, 'PORT-STRAT', 'Portefeuille stratégique 2026', 'Transformation, industrie et excellence opérationnelle.', 'active', employee_one)
  on conflict (organization_id, code) do update set name = excluded.name, description = excluded.description, updated_at = now()
  returning id into demo_portfolio;

  insert into public.project_programs (
    organization_id, portfolio_id, code, name, description, status,
    sponsor_employee_id, program_manager_employee_id, start_date, end_date, budget_amount
  ) values (
    demo_org, demo_portfolio, 'PRG-TRANSFO-26', 'Programme transformation industrielle',
    'Programme de digitalisation, sécurisation qualité et performance des opérations.', 'active',
    employee_two, employee_one, date '2026-01-05', date '2026-12-18', 1450000
  )
  on conflict (organization_id, code) do update set
    portfolio_id = excluded.portfolio_id, name = excluded.name, description = excluded.description,
    budget_amount = excluded.budget_amount, updated_at = now()
  returning id into demo_program;

  insert into public.project_projects (
    organization_id, client_id, portfolio_id, program_id, code, name, description,
    project_type, status, priority, start_date, end_date,
    project_manager_employee_id, sponsor_employee_id, budget_amount, sold_amount,
    ordered_budget, baseline_budget, consumed_budget, billing_model, currency,
    client_name, sector_name, source_type, source_reference, source_id,
    health_status, risk_level, quality_status, executive_comment,
    baseline_start_date, baseline_end_date
  ) values (
    demo_org, demo_client, demo_portfolio, demo_program, 'P-2026-0001',
    'Déploiement plateforme industrielle', 'Déploiement multi-sites avec reprise de données et conduite du changement.',
    'delivery', 'active', 'high', date '2026-01-12', date '2026-10-30',
    employee_one, employee_two, 520000, 640000, 640000, 520000, 246000,
    'fixed_price', 'EUR', 'Asteria Industries', 'Industrie', 'avant_vente', 'AVV-2026-0042', null,
    'amber', 'high', 'compliant', 'Sécuriser le chemin critique migration–recette–bascule.',
    date '2026-01-12', date '2026-10-30'
  )
  on conflict (organization_id, code) do update set
    program_id = excluded.program_id, client_id = excluded.client_id, client_name = excluded.client_name,
    ordered_budget = excluded.ordered_budget, baseline_budget = excluded.baseline_budget,
    source_reference = excluded.source_reference, updated_at = now()
  returning id into project_alpha;

  insert into public.project_projects (
    organization_id, client_id, portfolio_id, program_id, code, name, description,
    project_type, status, priority, start_date, end_date, project_manager_employee_id,
    budget_amount, sold_amount, ordered_budget, baseline_budget, consumed_budget,
    billing_model, currency, client_name, sector_name, health_status, risk_level, quality_status
  ) values (
    demo_org, demo_client, demo_portfolio, demo_program, 'P-2026-0002',
    'Excellence qualité fournisseurs', 'Réduction des non-conformités et sécurisation des fournisseurs critiques.',
    'delivery', 'active', 'normal', date '2026-03-02', date '2026-11-27', employee_two,
    280000, 350000, 350000, 280000, 104000, 'time_and_material', 'EUR',
    'Asteria Industries', 'Industrie', 'green', 'normal', 'compliant'
  )
  on conflict (organization_id, code) do update set
    program_id = excluded.program_id, client_name = excluded.client_name, updated_at = now()
  returning id into project_beta;

  insert into public.project_projects (
    organization_id, portfolio_id, program_id, code, name, description, project_type,
    status, priority, start_date, end_date, project_manager_employee_id, budget_amount,
    ordered_budget, baseline_budget, consumed_budget, billing_model, currency,
    client_name, sector_name, health_status, risk_level, quality_status
  ) values (
    demo_org, demo_portfolio, demo_program, 'P-2026-0003', 'Modernisation PMO interne',
    'Standardisation du pilotage, des indicateurs EVM et des revues de gouvernance.',
    'internal', 'planned', 'normal', date '2026-06-01', date '2026-12-18', employee_one,
    165000, 165000, 165000, 18000, 'internal', 'EUR', 'Interne', 'Conseil',
    'green', 'normal', 'compliant'
  )
  on conflict (organization_id, code) do update set
    program_id = excluded.program_id, updated_at = now()
  returning id into project_gamma;

  insert into public.project_tasks (
    organization_id, project_id, code, wbs_code, name, description, task_type, task_kind,
    status, priority, start_date, due_date, baseline_start_date, baseline_end_date,
    planned_hours, remaining_hours, actual_hours, progress_percent, physical_weight,
    sequence_order, assignee_employee_id, owner_name, planned_cost, actual_cost, is_critical
  ) values
    (demo_org, project_alpha, 'T-001', '1.1', 'Cadrage et architecture', 'Cadrer le périmètre, l’architecture et les critères de succès.', 'analysis', 'task', 'done', 'high', date '2026-01-12', date '2026-02-13', date '2026-01-12', date '2026-02-13', 420, 0, 438, 100, 15, 10, employee_one, 'Direction de projet', 47250, 48900, true),
    (demo_org, project_alpha, 'T-002', '1.2', 'Migration des données', 'Nettoyage, reprises et contrôles de cohérence.', 'build', 'task', 'in_progress', 'critical', date '2026-02-16', date '2026-06-26', date '2026-02-16', date '2026-06-12', 1180, 490, 760, 58, 35, 20, employee_two, 'Équipe data', 132000, 91800, true),
    (demo_org, project_alpha, 'T-003', '1.3', 'Recette et bascule', 'Recette métier, décision Go/No-Go et bascule.', 'test', 'task', 'todo', 'critical', date '2026-06-29', date '2026-09-25', date '2026-06-15', date '2026-09-11', 960, 960, 0, 0, 30, 30, employee_one, 'Pilotage recette', 108000, 0, true),
    (demo_org, project_alpha, 'J-001', '1.4', 'Go-live industriel', 'Jalon de mise en production.', 'delivery', 'milestone', 'todo', 'critical', date '2026-09-28', date '2026-09-28', date '2026-09-14', date '2026-09-14', 0, 0, 0, 0, 20, 40, employee_one, 'Comité de pilotage', 0, 0, true),
    (demo_org, project_beta, 'T-001', '1.1', 'Diagnostic fournisseurs', 'Cartographier les défauts, causes et fournisseurs critiques.', 'analysis', 'task', 'in_progress', 'high', date '2026-03-02', date '2026-05-29', date '2026-03-02', date '2026-05-15', 520, 170, 365, 67, 40, 10, employee_two, 'Qualité fournisseurs', 58500, 40150, true),
    (demo_org, project_beta, 'T-002', '1.2', 'Plans de progrès', 'Déployer et vérifier les plans d’actions fournisseurs.', 'quality', 'task', 'todo', 'normal', date '2026-06-01', date '2026-10-30', date '2026-05-18', date '2026-10-16', 780, 780, 0, 0, 60, 20, employee_one, 'Équipe qualité', 87750, 0, false)
  on conflict (organization_id, project_id, code) do update set
    wbs_code = excluded.wbs_code, task_kind = excluded.task_kind,
    baseline_start_date = excluded.baseline_start_date, baseline_end_date = excluded.baseline_end_date,
    progress_percent = excluded.progress_percent, physical_weight = excluded.physical_weight,
    actual_hours = excluded.actual_hours, planned_cost = excluded.planned_cost,
    actual_cost = excluded.actual_cost, is_critical = excluded.is_critical, updated_at = now();

  select id into task_a1 from public.project_tasks where organization_id = demo_org and project_id = project_alpha and code = 'T-001';
  select id into task_a2 from public.project_tasks where organization_id = demo_org and project_id = project_alpha and code = 'T-002';
  select id into task_a3 from public.project_tasks where organization_id = demo_org and project_id = project_alpha and code = 'T-003';
  select id into task_b1 from public.project_tasks where organization_id = demo_org and project_id = project_beta and code = 'T-001';

  insert into public.project_dependencies (
    organization_id, project_id, predecessor_task_id, successor_task_id, dependency_type, lag_days, is_critical
  ) values
    (demo_org, project_alpha, task_a1, task_a2, 'FS', 0, true),
    (demo_org, project_alpha, task_a2, task_a3, 'FS', 0, true)
  on conflict (organization_id, predecessor_task_id, successor_task_id) do update set
    dependency_type = excluded.dependency_type, lag_days = excluded.lag_days, is_critical = excluded.is_critical;

  insert into public.project_milestones (
    organization_id, project_id, code, name, description, milestone_type, status,
    planned_date, forecast_date, critical, owner_employee_id, acceptance_criteria
  ) values
    (demo_org, project_alpha, 'M-001', 'Go/No-Go recette', 'Décision de passage en recette.', 'governance', 'planned', date '2026-06-15', date '2026-06-29', true, employee_one, 'Migration qualifiée et anomalies bloquantes levées.'),
    (demo_org, project_alpha, 'M-002', 'Go-live industriel', 'Bascule de production.', 'delivery', 'planned', date '2026-09-14', date '2026-09-28', true, employee_one, 'PV de recette signé et plan de retour arrière testé.')
  on conflict (organization_id, project_id, code) do update set
    forecast_date = excluded.forecast_date, critical = excluded.critical, updated_at = now();

  insert into public.project_actions (
    organization_id, project_id, code, action_type, title, description, status, priority,
    owner_employee_id, owner_name, opened_at, due_date, replanned_due_date,
    progress_percent, origin_type, origin_reference, expected_result, comments
  ) values
    (demo_org, project_alpha, 'ACT-001', 'corrective', 'Sécuriser la qualité des données sources', 'Traiter les règles de reprise non conformes.', 'in_progress', 'high', employee_two, 'Responsable data', date '2026-04-06', date '2026-05-15', date '2026-05-29', 65, 'risk', 'RSK-001', 'Taux d’anomalies inférieur à 1 %.', 'Revue hebdomadaire avec le métier.'),
    (demo_org, project_alpha, 'ACT-002', 'action', 'Arbitrer le renfort recette', 'Décider du renfort de deux testeurs.', 'todo', 'normal', employee_one, 'Directeur de projet', date '2026-05-04', date '2026-05-22', null, 20, 'project', null, 'Capacité recette sécurisée avant le 1er juin.', null),
    (demo_org, project_beta, 'ACT-001', 'preventive', 'Auditer le fournisseur critique', 'Audit processus et plan de progrès.', 'in_progress', 'high', employee_two, 'Responsable qualité', date '2026-04-13', date '2026-06-05', null, 45, 'non_conformity', 'NC-2026-0017', 'Réduction de 50 % des défauts récurrents.', null)
  on conflict (organization_id, project_id, code) do update set
    status = excluded.status, progress_percent = excluded.progress_percent,
    origin_type = excluded.origin_type, origin_reference = excluded.origin_reference,
    expected_result = excluded.expected_result, updated_at = now();

  insert into public.project_risks (
    organization_id, project_id, task_id, code, title, description, category, risk_type,
    status, probability, impact, revenue_impact_amount, cost_impact_amount,
    schedule_impact_days, owner_employee_id, owner_name, response_strategy,
    mitigation_plan, contingency_plan, review_date
  ) values
    (demo_org, project_alpha, task_a2, 'RSK-001', 'Qualité insuffisante des données sources', 'Risque de reprises multiples et de retard de recette.', 'data', 'threat', 'mitigating', 4, 4, 180000, 62000, 20, employee_two, 'Responsable data', 'mitigate', 'Profilage automatisé, règles de qualité et répétition des migrations à blanc.', 'Renforcer l’équipe data et décaler le lot non critique.', date '2026-05-22'),
    (demo_org, project_alpha, task_a3, 'RSK-002', 'Capacité recette insuffisante', 'Disponibilité limitée des key users.', 'resources', 'threat', 'open', 3, 3, 90000, 35000, 15, employee_one, 'Directeur de projet', 'mitigate', 'Planification nominative et suppléants par domaine.', 'Prioriser le périmètre critique.', date '2026-05-29'),
    (demo_org, project_beta, task_b1, 'RSK-001', 'Récurrence des défauts fournisseur', 'Le plan d’action pourrait ne pas traiter les causes racines.', 'quality', 'threat', 'open', 3, 4, 125000, 48000, 10, employee_two, 'Responsable qualité', 'mitigate', 'Audit terrain et validation d’efficacité à 30/60/90 jours.', 'Double sourcing temporaire.', date '2026-06-12')
  on conflict (organization_id, project_id, code) do update set
    probability = excluded.probability, impact = excluded.impact,
    mitigation_plan = excluded.mitigation_plan, updated_at = now();

  insert into public.project_deliverables (
    organization_id, project_id, task_id, code, name, description, deliverable_type,
    status, quality_status, planned_date, replanned_date, actual_delivery_date,
    first_time_right, owner_employee_id, owner_name, acceptance_criteria
  ) values
    (demo_org, project_alpha, task_a1, 'LIV-001', 'Dossier d’architecture', 'Architecture fonctionnelle et technique validée.', 'document', 'delivered', 'accepted', date '2026-02-13', null, date '2026-02-12', true, employee_one, 'Architecte solution', 'Validation architecture, sécurité et exploitation.'),
    (demo_org, project_alpha, task_a2, 'LIV-002', 'Rapport migration à blanc', 'Résultats de la répétition de migration.', 'report', 'late', 'review', date '2026-05-15', date '2026-05-29', null, null, employee_two, 'Lead data', 'Taux de reprise supérieur à 99 %, anomalies tracées.'),
    (demo_org, project_alpha, task_a3, 'LIV-003', 'PV de recette', 'Procès-verbal de recette métier.', 'approval', 'planned', 'pending', date '2026-09-11', null, null, null, employee_one, 'Responsable recette', 'Zéro anomalie bloquante et réserves acceptées.'),
    (demo_org, project_beta, task_b1, 'LIV-001', 'Diagnostic fournisseurs', 'Cartographie Pareto et causes racines.', 'report', 'in_progress', 'review', date '2026-05-29', null, null, null, employee_two, 'Responsable qualité', 'Causes confirmées par données et terrain.')
  on conflict (organization_id, project_id, code) do update set
    status = excluded.status, quality_status = excluded.quality_status,
    replanned_date = excluded.replanned_date, actual_delivery_date = excluded.actual_delivery_date,
    first_time_right = excluded.first_time_right, updated_at = now();

  insert into public.project_task_assignments (
    organization_id, project_id, task_id, employee_id, resource_name, assignment_role,
    assignment_status, start_date, end_date, allocation_percent, planned_hours,
    actual_hours, planned_hourly_cost, actual_hourly_cost
  ) values
    (demo_org, project_alpha, task_a1, employee_one, coalesce((select full_name from public.hr_employee_overview where id = employee_one), 'Directeur de projet'), 'Direction de projet', 'active', date '2026-01-12', date '2026-02-13', 0.5, 210, 225, 112.50, 114.00),
    (demo_org, project_alpha, task_a2, employee_two, coalesce((select full_name from public.hr_employee_overview where id = employee_two), 'Lead data'), 'Lead data', 'active', date '2026-02-16', date '2026-06-26', 0.8, 720, 510, 96.00, 98.50)
  on conflict (organization_id, task_id, resource_name) do update set
    assignment_status = excluded.assignment_status, planned_hours = excluded.planned_hours,
    actual_hours = excluded.actual_hours, actual_hourly_cost = excluded.actual_hourly_cost,
    updated_at = now();

  insert into public.project_skill_requirements (
    organization_id, project_id, task_id, skill_id, skill_code, skill_name, skill_family,
    required_level, minimum_people, importance, planned_hours, coverage_percent, justification
  ) values
    (demo_org, project_alpha, task_a2, null, 'DATA-MIGRATION', 'Migration de données', 'Data', 4, 2, 'required', 1180, 50, 'Compétence critique du chemin de bascule.'),
    (demo_org, project_alpha, task_a3, null, 'TEST-MANAGEMENT', 'Pilotage de recette', 'Qualité', 3, 3, 'required', 960, 67, 'Couverture des domaines métier et des tests de non-régression.'),
    (demo_org, project_beta, task_b1, null, 'ROOT-CAUSE', 'Analyse des causes racines', 'Qualité', 3, 2, 'required', 520, 75, 'Indispensable pour mesurer l’efficacité des plans de progrès.')
  on conflict (
    organization_id,
    project_id,
    (coalesce(task_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    (lower(skill_name))
  )
  do update set required_level = excluded.required_level, coverage_percent = excluded.coverage_percent,
    justification = excluded.justification, updated_at = now();

  insert into public.project_commerce_links (
    organization_id, project_id, source_module, source_entity_type, source_reference,
    source_label, client_id, client_name, ordered_amount, currency, metadata
  ) values
    (demo_org, project_alpha, 'commerce', 'avant_vente', 'AVV-2026-0042', 'Transformation digitale Asteria', demo_client, 'Asteria Industries', 640000, 'EUR', '{"status":"gagnée","ptf":"PTF-2026-0019"}'::jsonb),
    (demo_org, project_beta, 'commerce', 'commande', 'CMD-2026-0018', 'Excellence qualité fournisseurs', demo_client, 'Asteria Industries', 350000, 'EUR', '{"status":"signée"}'::jsonb)
  on conflict (
    organization_id,
    project_id,
    source_entity_type,
    (coalesce(source_reference, source_entity_id::text, ''))
  )
  do update set ordered_amount = excluded.ordered_amount, client_name = excluded.client_name,
    metadata = excluded.metadata, updated_at = now();

  insert into public.project_financial_periods (
    organization_id, project_id, period_start, period_end, baseline_budget,
    planned_value, earned_value, actual_cost, production_amount, invoiced_amount,
    collected_amount, purchase_amount, expense_amount, forecast_to_complete, comment
  ) values
    (demo_org, project_alpha, date '2026-03-01', date '2026-03-31', 520000, 98000, 96000, 102000, 118000, 128000, 90000, 4500, 2300, 402000, 'Démarrage conforme, légère avance de facturation.'),
    (demo_org, project_alpha, date '2026-04-01', date '2026-04-30', 520000, 156000, 142000, 158000, 151000, 139000, 124000, 7800, 3150, 370000, 'Écart coût lié aux reprises de migration.'),
    (demo_org, project_alpha, date '2026-05-01', date '2026-05-31', 520000, 218000, 191000, 212000, 205000, 176000, 158000, 5200, 2900, 344000, 'FAE à piloter et retard du livrable migration.'),
    (demo_org, project_beta, date '2026-04-01', date '2026-04-30', 280000, 52000, 49000, 47000, 58000, 62000, 50000, 1600, 900, 231000, 'Performance coûts favorable.')
  on conflict (organization_id, project_id, period_start) do update set
    planned_value = excluded.planned_value, earned_value = excluded.earned_value,
    actual_cost = excluded.actual_cost, production_amount = excluded.production_amount,
    invoiced_amount = excluded.invoiced_amount, collected_amount = excluded.collected_amount,
    forecast_to_complete = excluded.forecast_to_complete, comment = excluded.comment,
    updated_at = now();

  insert into public.project_satisfaction_surveys (
    organization_id, project_id, survey_month, respondent_name, respondent_role,
    customer_listening_score, planning_score, technical_skills_score,
    monitoring_score, risk_management_score, verbatim, improvement_actions
  ) values
    (demo_org, project_alpha, date '2026-03-01', 'Direction transformation Asteria', 'Sponsor', 4.5, 4.0, 4.4, 4.2, 3.8, 'Pilotage clair et équipe engagée.', 'Renforcer la communication sur les risques data.'),
    (demo_org, project_alpha, date '2026-04-01', 'Direction transformation Asteria', 'Sponsor', 4.3, 3.7, 4.5, 4.1, 3.6, 'Bonne expertise, vigilance sur la migration.', 'Partager une trajectoire de sécurisation hebdomadaire.'),
    (demo_org, project_beta, date '2026-04-01', 'Direction qualité Asteria', 'Client métier', 4.6, 4.2, 4.3, 4.4, 4.1, 'Diagnostic factuel et exploitable.', 'Accélérer la validation des causes racines.')
  on conflict (organization_id, project_id, survey_month) do update set
    customer_listening_score = excluded.customer_listening_score,
    planning_score = excluded.planning_score,
    technical_skills_score = excluded.technical_skills_score,
    monitoring_score = excluded.monitoring_score,
    risk_management_score = excluded.risk_management_score,
    verbatim = excluded.verbatim, improvement_actions = excluded.improvement_actions,
    updated_at = now();

  perform public.recalculate_project_physical_progress(project_alpha);
  perform public.recalculate_project_physical_progress(project_beta);
  perform public.recalculate_project_physical_progress(project_gamma);
end;
$$;
