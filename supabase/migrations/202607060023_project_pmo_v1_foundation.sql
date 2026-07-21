-- ONEPILOT PMO v1 : portefeuille, timeline, planification, actions et performance.
-- Les objets complètent le socle project_* existant sans supprimer ni recréer les données validées.

create extension if not exists pgcrypto;

alter table if exists public.project_projects
  add column if not exists progress_percent numeric(5,2) not null default 0,
  add column if not exists health_status text not null default 'green',
  add column if not exists risk_level text not null default 'normal',
  add column if not exists quality_status text not null default 'compliant',
  add column if not exists actual_hours numeric(14,2) not null default 0,
  add column if not exists remaining_hours numeric(14,2) not null default 0,
  add column if not exists actual_cost numeric(14,2) not null default 0,
  add column if not exists forecast_cost numeric(14,2),
  add column if not exists archived_at timestamptz;

alter table if exists public.project_tasks
  add column if not exists archived_at timestamptz;

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  milestone_type text not null default 'delivery',
  status text not null default 'planned',
  planned_date date not null,
  forecast_date date,
  actual_date date,
  critical boolean not null default false,
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  acceptance_criteria text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, code)
);

create table if not exists public.project_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  predecessor_task_id uuid not null references public.project_tasks(id) on delete cascade,
  successor_task_id uuid not null references public.project_tasks(id) on delete cascade,
  dependency_type text not null default 'FS',
  lag_days integer not null default 0,
  is_critical boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, predecessor_task_id, successor_task_id)
);

create table if not exists public.project_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  code text not null,
  action_type text not null default 'action',
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'normal',
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  opened_at date not null default current_date,
  due_date date,
  closed_at date,
  progress_percent numeric(5,2) not null default 0,
  impact text,
  root_cause text,
  recommendation text,
  decision text,
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, code)
);

create table if not exists public.project_baselines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  version integer not null default 1,
  label text not null,
  status text not null default 'draft',
  baseline_date date not null default current_date,
  planned_start_date date,
  planned_end_date date,
  budget_amount numeric(14,2),
  planned_hours numeric(14,2),
  snapshot jsonb not null default '{}'::jsonb,
  approved_by_employee_id uuid references public.hr_employees(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, project_id, version)
);

create table if not exists public.project_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  snapshot_date date not null default current_date,
  progress_percent numeric(5,2) not null default 0,
  schedule_score numeric(5,2) not null default 100,
  cost_score numeric(5,2) not null default 100,
  scope_score numeric(5,2) not null default 100,
  quality_score numeric(5,2) not null default 100,
  resource_score numeric(5,2) not null default 100,
  risk_score numeric(5,2) not null default 100,
  spi numeric(8,4),
  cpi numeric(8,4),
  estimate_at_completion numeric(14,2),
  estimate_to_complete numeric(14,2),
  variance_at_completion numeric(14,2),
  health_status text not null default 'green',
  executive_comment text,
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, snapshot_date)
);

create index if not exists project_milestones_project_date_idx
  on public.project_milestones(project_id, planned_date);
create index if not exists project_actions_project_status_idx
  on public.project_actions(project_id, status, due_date);
create index if not exists project_health_project_date_idx
  on public.project_health_snapshots(project_id, snapshot_date desc);
create index if not exists project_dependencies_project_idx
  on public.project_dependencies(project_id);

alter table public.project_milestones enable row level security;
alter table public.project_dependencies enable row level security;
alter table public.project_actions enable row level security;
alter table public.project_baselines enable row level security;
alter table public.project_health_snapshots enable row level security;

grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.project_dependencies to authenticated;
grant select, insert, update, delete on public.project_actions to authenticated;
grant select, insert, update, delete on public.project_baselines to authenticated;
grant select, insert, update, delete on public.project_health_snapshots to authenticated;
grant insert, update on public.project_projects to authenticated;
grant insert, update on public.project_tasks to authenticated;

drop policy if exists project_milestones_authenticated on public.project_milestones;
create policy project_milestones_authenticated on public.project_milestones
  for all to authenticated using (true) with check (true);
drop policy if exists project_dependencies_authenticated on public.project_dependencies;
create policy project_dependencies_authenticated on public.project_dependencies
  for all to authenticated using (true) with check (true);
drop policy if exists project_actions_authenticated on public.project_actions;
create policy project_actions_authenticated on public.project_actions
  for all to authenticated using (true) with check (true);
drop policy if exists project_baselines_authenticated on public.project_baselines;
create policy project_baselines_authenticated on public.project_baselines
  for all to authenticated using (true) with check (true);
drop policy if exists project_health_snapshots_authenticated on public.project_health_snapshots;
create policy project_health_snapshots_authenticated on public.project_health_snapshots
  for all to authenticated using (true) with check (true);

drop policy if exists project_projects_write_authenticated on public.project_projects;
create policy project_projects_write_authenticated on public.project_projects
  for insert to authenticated with check (true);
drop policy if exists project_projects_update_authenticated on public.project_projects;
create policy project_projects_update_authenticated on public.project_projects
  for update to authenticated using (true) with check (true);
drop policy if exists project_tasks_write_authenticated on public.project_tasks;
create policy project_tasks_write_authenticated on public.project_tasks
  for insert to authenticated with check (true);
drop policy if exists project_tasks_update_authenticated on public.project_tasks;
create policy project_tasks_update_authenticated on public.project_tasks
  for update to authenticated using (true) with check (true);

drop trigger if exists set_project_milestones_updated_at on public.project_milestones;
create trigger set_project_milestones_updated_at before update on public.project_milestones
for each row execute function public.set_updated_at();
drop trigger if exists set_project_actions_updated_at on public.project_actions;
create trigger set_project_actions_updated_at before update on public.project_actions
for each row execute function public.set_updated_at();
drop trigger if exists set_project_health_updated_at on public.project_health_snapshots;
create trigger set_project_health_updated_at before update on public.project_health_snapshots
for each row execute function public.set_updated_at();
