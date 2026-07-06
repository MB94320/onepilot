create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.project_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  code text not null,
  name text not null,
  legal_name text,
  client_type text not null default 'customer'
    check (client_type in ('customer', 'internal', 'partner', 'supplier')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),

  billing_currency text not null default 'EUR',
  default_payment_terms_days integer not null default 30,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

create table if not exists public.project_portfolios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  code text not null,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),

  owner_employee_id uuid references public.hr_employees(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

create table if not exists public.project_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  client_id uuid references public.project_clients(id) on delete set null,
  portfolio_id uuid references public.project_portfolios(id) on delete set null,

  code text not null,
  name text not null,
  description text,

  project_type text not null default 'delivery'
    check (project_type in ('delivery', 'internal', 'run', 'support', 'investment', 'pre_sales')),
  status text not null default 'draft'
    check (status in ('draft', 'planned', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),

  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),

  start_date date,
  end_date date,

  project_manager_employee_id uuid references public.hr_employees(id) on delete set null,
  sponsor_employee_id uuid references public.hr_employees(id) on delete set null,

  budget_amount numeric(14, 2),
  sold_amount numeric(14, 2),
  target_margin_rate numeric(8, 4),

  billing_model text not null default 'time_and_material'
    check (billing_model in ('fixed_price', 'time_and_material', 'internal', 'retainer', 'non_billable')),

  currency text not null default 'EUR',

  iso9001_critical boolean not null default false,
  quality_plan_required boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

create table if not exists public.project_work_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,

  parent_work_package_id uuid references public.project_work_packages(id) on delete cascade,

  code text not null,
  name text not null,
  description text,

  status text not null default 'planned'
    check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled', 'archived')),

  start_date date,
  end_date date,

  planned_hours numeric(12, 2) not null default 0,
  planned_amount numeric(14, 2),

  owner_employee_id uuid references public.hr_employees(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, project_id, code)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  work_package_id uuid references public.project_work_packages(id) on delete set null,

  parent_task_id uuid references public.project_tasks(id) on delete cascade,

  code text not null,
  name text not null,
  description text,

  task_type text not null default 'delivery'
    check (task_type in ('delivery', 'analysis', 'design', 'build', 'test', 'run', 'support', 'management', 'quality', 'other')),

  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled', 'archived')),

  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),

  start_date date,
  due_date date,

  planned_hours numeric(12, 2) not null default 0,
  remaining_hours numeric(12, 2) not null default 0,

  assignee_employee_id uuid references public.hr_employees(id) on delete set null,
  reviewer_employee_id uuid references public.hr_employees(id) on delete set null,

  iso9001_evidence_required boolean not null default false,
  acceptance_criteria text,
  quality_evidence_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, project_id, code)
);

create table if not exists public.hr_skill_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

create table if not exists public.hr_skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain_id uuid references public.hr_skill_domains(id) on delete set null,

  code text not null,
  name text not null,
  description text,

  skill_type text not null default 'technical'
    check (skill_type in ('technical', 'functional', 'methodology', 'language', 'management', 'certification', 'tool', 'other')),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

create table if not exists public.hr_employee_skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  skill_id uuid not null references public.hr_skills(id) on delete cascade,

  level integer not null default 1
    check (level between 1 and 5),

  interest_level integer
    check (interest_level between 1 and 5),

  years_experience numeric(6, 2),
  last_used_on date,

  validation_status text not null default 'declared'
    check (validation_status in ('declared', 'manager_validated', 'hr_validated', 'expired', 'rejected')),

  validated_by_employee_id uuid references public.hr_employees(id) on delete set null,
  validated_at timestamptz,

  evidence_url text,
  comments text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, employee_id, skill_id)
);

create table if not exists public.project_staffing_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  project_id uuid not null references public.project_projects(id) on delete cascade,
  work_package_id uuid references public.project_work_packages(id) on delete set null,
  task_id uuid references public.project_tasks(id) on delete set null,

  code text not null,
  title text not null,
  description text,

  requested_job_id uuid references public.hr_jobs(id) on delete set null,
  requested_function_id uuid references public.hr_functions(id) on delete set null,

  seniority_level text not null default 'confirmed'
    check (seniority_level in ('junior', 'confirmed', 'senior', 'lead', 'expert')),

  staffing_status text not null default 'open'
    check (staffing_status in ('draft', 'open', 'partially_staffed', 'staffed', 'cancelled', 'closed')),

  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),

  start_date date not null,
  end_date date not null,

  requested_capacity_percent numeric(8, 4) not null default 1,
  requested_hours numeric(12, 2) not null default 0,

  target_daily_rate numeric(12, 2),
  maximum_daily_cost numeric(12, 2),
  target_margin_rate numeric(8, 4),

  remote_allowed boolean not null default true,
  location_requirement text,

  requested_by_employee_id uuid references public.hr_employees(id) on delete set null,
  approved_by_employee_id uuid references public.hr_employees(id) on delete set null,
  approved_at timestamptz,

  iso9001_justification text,
  decision_comment text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, project_id, code),

  check (end_date >= start_date)
);

create table if not exists public.project_staffing_need_skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  staffing_need_id uuid not null references public.project_staffing_needs(id) on delete cascade,
  skill_id uuid not null references public.hr_skills(id) on delete cascade,

  required_level integer not null default 3
    check (required_level between 1 and 5),

  importance text not null default 'required'
    check (importance in ('required', 'important', 'nice_to_have')),

  created_at timestamptz not null default now(),

  unique (organization_id, staffing_need_id, skill_id)
);

create table if not exists public.project_staffing_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  staffing_need_id uuid references public.project_staffing_needs(id) on delete set null,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  work_package_id uuid references public.project_work_packages(id) on delete set null,
  task_id uuid references public.project_tasks(id) on delete set null,

  employee_id uuid not null references public.hr_employees(id) on delete cascade,

  assignment_status text not null default 'planned'
    check (assignment_status in ('draft', 'proposed', 'planned', 'confirmed', 'active', 'completed', 'cancelled', 'archived')),

  start_date date not null,
  end_date date not null,

  allocation_percent numeric(8, 4) not null default 1,
  planned_hours numeric(12, 2) not null default 0,

  planned_hourly_cost numeric(12, 2),
  planned_daily_cost numeric(12, 2),
  planned_daily_rate numeric(12, 2),

  billable boolean not null default true,

  margin_rate numeric(8, 4),

  proposed_by_employee_id uuid references public.hr_employees(id) on delete set null,
  approved_by_employee_id uuid references public.hr_employees(id) on delete set null,
  approved_at timestamptz,

  assignment_reason text,
  iso9001_decision_trace text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date),
  check (allocation_percent >= 0 and allocation_percent <= 2)
);

create table if not exists public.project_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  project_id uuid not null references public.project_projects(id) on delete cascade,
  work_package_id uuid references public.project_work_packages(id) on delete set null,
  task_id uuid references public.project_tasks(id) on delete set null,
  assignment_id uuid references public.project_staffing_assignments(id) on delete set null,

  employee_id uuid not null references public.hr_employees(id) on delete cascade,

  entry_date date not null,
  hours numeric(10, 2) not null check (hours >= 0 and hours <= 24),

  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'manager_approved', 'hr_approved', 'rejected', 'cancelled')),

  description text,

  submitted_at timestamptz,
  manager_approved_by_employee_id uuid references public.hr_employees(id) on delete set null,
  manager_approved_at timestamptz,
  hr_approved_by_employee_id uuid references public.hr_employees(id) on delete set null,
  hr_approved_at timestamptz,

  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_staffing_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  entity_table text not null,
  entity_id uuid,
  action text not null,

  actor_user_id uuid,
  event_title text,
  event_description text,

  before_data jsonb,
  after_data jsonb,

  iso9001_control_point text,
  created_at timestamptz not null default now()
);

create index if not exists project_clients_org_idx
  on public.project_clients(organization_id);

create index if not exists project_portfolios_org_idx
  on public.project_portfolios(organization_id);

create index if not exists project_projects_org_status_idx
  on public.project_projects(organization_id, status);

create index if not exists project_projects_manager_idx
  on public.project_projects(project_manager_employee_id);

create index if not exists project_work_packages_project_idx
  on public.project_work_packages(project_id);

create index if not exists project_tasks_project_status_idx
  on public.project_tasks(project_id, status);

create index if not exists hr_skills_org_type_idx
  on public.hr_skills(organization_id, skill_type);

create index if not exists hr_employee_skills_employee_idx
  on public.hr_employee_skills(employee_id);

create index if not exists staffing_needs_project_status_idx
  on public.project_staffing_needs(project_id, staffing_status);

create index if not exists staffing_needs_period_idx
  on public.project_staffing_needs(organization_id, start_date, end_date);

create index if not exists staffing_assignments_employee_period_idx
  on public.project_staffing_assignments(employee_id, start_date, end_date);

create index if not exists staffing_assignments_project_idx
  on public.project_staffing_assignments(project_id);

create index if not exists time_entries_employee_date_idx
  on public.project_time_entries(employee_id, entry_date);

create index if not exists time_entries_project_date_idx
  on public.project_time_entries(project_id, entry_date);

create index if not exists staffing_audit_org_created_idx
  on public.project_staffing_audit_events(organization_id, created_at desc);

drop trigger if exists set_updated_at_project_clients on public.project_clients;
create trigger set_updated_at_project_clients
before update on public.project_clients
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_portfolios on public.project_portfolios;
create trigger set_updated_at_project_portfolios
before update on public.project_portfolios
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_projects on public.project_projects;
create trigger set_updated_at_project_projects
before update on public.project_projects
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_work_packages on public.project_work_packages;
create trigger set_updated_at_project_work_packages
before update on public.project_work_packages
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_tasks on public.project_tasks;
create trigger set_updated_at_project_tasks
before update on public.project_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_hr_skill_domains on public.hr_skill_domains;
create trigger set_updated_at_hr_skill_domains
before update on public.hr_skill_domains
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_hr_skills on public.hr_skills;
create trigger set_updated_at_hr_skills
before update on public.hr_skills
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_hr_employee_skills on public.hr_employee_skills;
create trigger set_updated_at_hr_employee_skills
before update on public.hr_employee_skills
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_staffing_needs on public.project_staffing_needs;
create trigger set_updated_at_project_staffing_needs
before update on public.project_staffing_needs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_staffing_assignments on public.project_staffing_assignments;
create trigger set_updated_at_project_staffing_assignments
before update on public.project_staffing_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_project_time_entries on public.project_time_entries;
create trigger set_updated_at_project_time_entries
before update on public.project_time_entries
for each row execute function public.set_updated_at();

create or replace function public.log_project_staffing_audit_event()
returns trigger
language plpgsql
security definer
as $$
declare
  target_organization_id uuid;
  target_entity_id uuid;
  event_title text;
begin
  if tg_op = 'DELETE' then
    target_organization_id := old.organization_id;
    target_entity_id := old.id;
  else
    target_organization_id := new.organization_id;
    target_entity_id := new.id;
  end if;

  event_title :=
    case tg_op
      when 'INSERT' then 'Création'
      when 'UPDATE' then 'Modification'
      when 'DELETE' then 'Suppression'
      else tg_op
    end || ' — ' || tg_table_name;

  insert into public.project_staffing_audit_events (
    organization_id,
    entity_table,
    entity_id,
    action,
    actor_user_id,
    event_title,
    event_description,
    before_data,
    after_data,
    iso9001_control_point
  )
  values (
    target_organization_id,
    tg_table_name,
    target_entity_id,
    lower(tg_op),
    auth.uid(),
    event_title,
    'Événement automatiquement historisé pour traçabilité projet, staffing, capacité et ISO 9001.',
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    'Traçabilité des modifications critiques projet / capacité / staffing'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists audit_project_clients on public.project_clients;
create trigger audit_project_clients
after insert or update or delete on public.project_clients
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_projects on public.project_projects;
create trigger audit_project_projects
after insert or update or delete on public.project_projects
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_work_packages on public.project_work_packages;
create trigger audit_project_work_packages
after insert or update or delete on public.project_work_packages
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_tasks on public.project_tasks;
create trigger audit_project_tasks
after insert or update or delete on public.project_tasks
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_hr_skills on public.hr_skills;
create trigger audit_hr_skills
after insert or update or delete on public.hr_skills
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_hr_employee_skills on public.hr_employee_skills;
create trigger audit_hr_employee_skills
after insert or update or delete on public.hr_employee_skills
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_staffing_needs on public.project_staffing_needs;
create trigger audit_project_staffing_needs
after insert or update or delete on public.project_staffing_needs
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_staffing_assignments on public.project_staffing_assignments;
create trigger audit_project_staffing_assignments
after insert or update or delete on public.project_staffing_assignments
for each row execute function public.log_project_staffing_audit_event();

drop trigger if exists audit_project_time_entries on public.project_time_entries;
create trigger audit_project_time_entries
after insert or update or delete on public.project_time_entries
for each row execute function public.log_project_staffing_audit_event();

create or replace view public.project_staffing_project_overview as
select
  p.organization_id,
  p.id as project_id,
  p.code as project_code,
  p.name as project_name,
  p.status as project_status,
  p.priority,
  p.start_date,
  p.end_date,
  p.project_manager_employee_id,

  count(distinct n.id) as staffing_need_count,
  count(distinct a.id) as assignment_count,

  coalesce(sum(n.requested_hours), 0) as requested_hours,
  coalesce(sum(a.planned_hours), 0) as assigned_hours,

  greatest(
    coalesce(sum(n.requested_hours), 0) - coalesce(sum(a.planned_hours), 0),
    0
  ) as remaining_to_staff_hours,

  case
    when coalesce(sum(n.requested_hours), 0) = 0 then 0
    else round(
      coalesce(sum(a.planned_hours), 0) / nullif(coalesce(sum(n.requested_hours), 0), 0),
      4
    )
  end as staffing_coverage_rate

from public.project_projects p
left join public.project_staffing_needs n
  on n.project_id = p.id
left join public.project_staffing_assignments a
  on a.project_id = p.id
group by
  p.organization_id,
  p.id,
  p.code,
  p.name,
  p.status,
  p.priority,
  p.start_date,
  p.end_date,
  p.project_manager_employee_id;

create or replace view public.project_staffing_employee_overview as
select
  e.organization_id,
  e.id as employee_id,
  e.full_name,
  e.employee_number,
  e.employment_status,
  e.is_active,
  e.site_name,
  e.department_name,
  e.job_name,
  e.function_name,
  e.manager_name,

  coalesce(sum(a.planned_hours), 0) as assigned_hours,
  count(distinct a.project_id) as assigned_project_count,
  count(distinct a.id) as assignment_count,

  coalesce(avg(a.allocation_percent), 0) as average_allocation_percent,

  coalesce(max(e.loaded_hourly_cost), 0) as loaded_hourly_cost,
  coalesce(max(e.loaded_daily_cost), 0) as loaded_daily_cost

from public.hr_employee_overview e
left join public.project_staffing_assignments a
  on a.employee_id = e.id
  and a.assignment_status in ('planned', 'confirmed', 'active')
group by
  e.organization_id,
  e.id,
  e.full_name,
  e.employee_number,
  e.employment_status,
  e.is_active,
  e.site_name,
  e.department_name,
  e.job_name,
  e.function_name,
  e.manager_name;

create or replace view public.project_staffing_skill_match_overview as
select
  n.organization_id,
  n.id as staffing_need_id,
  n.project_id,
  n.title as staffing_need_title,
  n.start_date,
  n.end_date,
  n.requested_hours,

  e.id as employee_id,
  e.full_name,
  e.employee_number,
  e.job_name,
  e.function_name,
  e.department_name,

  count(ns.skill_id) as required_skill_count,
  count(es.skill_id) filter (
    where es.level >= ns.required_level
  ) as matched_skill_count,

  case
    when count(ns.skill_id) = 0 then 1
    else round(
      count(es.skill_id) filter (
        where es.level >= ns.required_level
      )::numeric / nullif(count(ns.skill_id), 0),
      4
    )
  end as skill_match_rate,

  max(e.loaded_daily_cost) as loaded_daily_cost,
  max(e.loaded_hourly_cost) as loaded_hourly_cost

from public.project_staffing_needs n
join public.hr_employee_overview e
  on e.organization_id = n.organization_id
  and e.is_active = true
left join public.project_staffing_need_skills ns
  on ns.staffing_need_id = n.id
left join public.hr_employee_skills es
  on es.employee_id = e.id
  and es.skill_id = ns.skill_id
  and es.validation_status in ('manager_validated', 'hr_validated')
where n.staffing_status in ('open', 'partially_staffed')
group by
  n.organization_id,
  n.id,
  n.project_id,
  n.title,
  n.start_date,
  n.end_date,
  n.requested_hours,
  e.id,
  e.full_name,
  e.employee_number,
  e.job_name,
  e.function_name,
  e.department_name;