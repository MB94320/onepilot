-- V1 - Socle des prochains modules RH : Temps & activités, Compétences, Onboarding, Entretiens & objectifs.
-- Tables multi-tenant, audit minimal, archivage logique. Aucun jeu de données fictif.

create table if not exists public.hr_time_activity_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.hr_employees(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  activity_date date not null,
  activity_type text not null default 'work',
  duration_hours numeric(8,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','submitted','manager_approved','approved','rejected','archived')),
  description text,
  manager_comment text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_skill_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text,
  name text not null,
  family text,
  category text,
  description text,
  criticality text not null default 'standard' check (criticality in ('standard','important','critical')),
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, name)
);

create table if not exists public.hr_employee_skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  skill_id uuid not null references public.hr_skill_catalog(id) on delete cascade,
  current_level integer not null default 1 check (current_level between 0 and 5),
  target_level integer not null default 1 check (target_level between 0 and 5),
  assessed_by_employee_id uuid references public.hr_employees(id) on delete set null,
  assessment_date date,
  evidence text,
  status text not null default 'active' check (status in ('active','to_develop','validated','obsolete','archived')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, employee_id, skill_id)
);

create table if not exists public.hr_onboarding_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  manager_employee_id uuid references public.hr_employees(id) on delete set null,
  recruiter_employee_id uuid references public.hr_employees(id) on delete set null,
  start_date date,
  target_end_date date,
  status text not null default 'draft' check (status in ('draft','prepared','in_progress','completed','delayed','cancelled','archived')),
  progress_percent numeric(5,2) not null default 0,
  risk_level text not null default 'normal' check (risk_level in ('normal','watch','high')),
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  review_type text not null default 'annual' check (review_type in ('annual','professional','objective','mid_year','probation','custom')),
  period_start date,
  period_end date,
  status text not null default 'draft' check (status in ('draft','open','in_progress','closed','archived')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.hr_review_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cycle_id uuid references public.hr_review_cycles(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  manager_employee_id uuid references public.hr_employees(id) on delete set null,
  status text not null default 'not_started' check (status in ('not_started','employee_input','manager_input','calibration','completed','archived')),
  objective_count integer not null default 0,
  completed_objective_count integer not null default 0,
  global_rating numeric(4,2),
  employee_comment text,
  manager_comment text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists idx_hr_time_activity_entries_org_employee_date on public.hr_time_activity_entries(organization_id, employee_id, activity_date);
create index if not exists idx_hr_employee_skills_org_employee on public.hr_employee_skills(organization_id, employee_id);
create index if not exists idx_hr_onboarding_plans_org_status on public.hr_onboarding_plans(organization_id, status);
create index if not exists idx_hr_review_items_org_status on public.hr_review_items(organization_id, status);
