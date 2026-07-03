-- ============================================================
-- ONEPILOT
-- 001_hr_architecture.sql
--
-- Socle des référentiels du domaine RESSOURCES.
--
-- Ce script :
-- - conserve l'architecture multi-tenant existante ;
-- - s'appuie sur public.organizations ;
-- - s'appuie sur public.organization_members ;
-- - active la sécurité RLS ;
-- - prépare les futurs modules RH ;
-- - ne supprime et ne modifie aucune table métier existante.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Fonction générique de mise à jour de updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 2. Fonction de contrôle d'appartenance à une organisation
-- ============================================================

create or replace function public.is_organization_member(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;

grant execute on function public.is_organization_member(uuid)
to authenticated;

-- ============================================================
-- 3. Fonction de contrôle d'un rôle d'organisation
-- ============================================================

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and lower(coalesce(membership.role, '')) = any (
        select lower(role_name)
        from unnest(allowed_roles) as role_name
      )
  );
$$;

revoke all on function public.has_organization_role(uuid, text[])
from public;

grant execute on function public.has_organization_role(uuid, text[])
to authenticated;

-- ============================================================
-- 4. Paramètres RH de l'organisation
-- ============================================================

create table if not exists public.hr_settings (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  default_country_code text not null default 'FR',
  default_currency text not null default 'EUR',
  default_locale text not null default 'fr-FR',
  default_timezone text not null default 'Europe/Paris',

  default_weekly_hours numeric(5, 2) not null default 35,
  default_working_days_per_week numeric(3, 2) not null default 5,
  default_annual_working_days integer not null default 218,

  default_employer_charge_rate numeric(6, 3) not null default 0,
  default_daily_hours numeric(5, 2) not null default 7,

  absence_manager_approval_required boolean not null default true,
  absence_hr_approval_optional boolean not null default true,

  project_time_manager_approval_required boolean not null default true,
  project_time_hr_approval_required boolean not null default false,

  probation_review_automation_enabled boolean not null default true,
  annual_review_automation_enabled boolean not null default true,
  professional_review_automation_enabled boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_settings_organization_unique
    unique (organization_id),

  constraint hr_settings_weekly_hours_valid
    check (
      default_weekly_hours > 0
      and default_weekly_hours <= 80
    ),

  constraint hr_settings_working_days_valid
    check (
      default_working_days_per_week > 0
      and default_working_days_per_week <= 7
    ),

  constraint hr_settings_annual_days_valid
    check (
      default_annual_working_days > 0
      and default_annual_working_days <= 366
    ),

  constraint hr_settings_charge_rate_valid
    check (
      default_employer_charge_rate >= 0
      and default_employer_charge_rate <= 5
    ),

  constraint hr_settings_daily_hours_valid
    check (
      default_daily_hours > 0
      and default_daily_hours <= 24
    )
);

create index if not exists hr_settings_organization_idx
  on public.hr_settings (organization_id);

drop trigger if exists hr_settings_set_updated_at
on public.hr_settings;

create trigger hr_settings_set_updated_at
before update on public.hr_settings
for each row
execute function public.set_updated_at();

-- ============================================================
-- 5. Sites et implantations
-- ============================================================

create table if not exists public.hr_sites (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,

  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  region text,
  country_code text not null default 'FR',
  timezone text not null default 'Europe/Paris',

  is_head_office boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_sites_code_unique
    unique (organization_id, code),

  constraint hr_sites_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_sites_code_not_empty
    check (length(trim(code)) > 0)
);

create index if not exists hr_sites_organization_idx
  on public.hr_sites (organization_id);

create index if not exists hr_sites_active_idx
  on public.hr_sites (organization_id, is_active);

drop trigger if exists hr_sites_set_updated_at
on public.hr_sites;

create trigger hr_sites_set_updated_at
before update on public.hr_sites
for each row
execute function public.set_updated_at();

-- ============================================================
-- 6. Départements, services et unités organisationnelles
-- ============================================================

create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  parent_department_id uuid
    references public.hr_departments(id)
    on delete set null,

  site_id uuid
    references public.hr_sites(id)
    on delete set null,

  code text not null,
  name text not null,
  description text,

  cost_center_code text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_departments_code_unique
    unique (organization_id, code),

  constraint hr_departments_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_departments_code_not_empty
    check (length(trim(code)) > 0)
);

create index if not exists hr_departments_organization_idx
  on public.hr_departments (organization_id);

create index if not exists hr_departments_parent_idx
  on public.hr_departments (parent_department_id);

create index if not exists hr_departments_site_idx
  on public.hr_departments (site_id);

drop trigger if exists hr_departments_set_updated_at
on public.hr_departments;

create trigger hr_departments_set_updated_at
before update on public.hr_departments
for each row
execute function public.set_updated_at();

-- ============================================================
-- 7. Familles de métiers
-- ============================================================

create table if not exists public.hr_job_families (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  display_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_job_families_code_unique
    unique (organization_id, code),

  constraint hr_job_families_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_job_families_code_not_empty
    check (length(trim(code)) > 0)
);

create index if not exists hr_job_families_organization_idx
  on public.hr_job_families (organization_id);

drop trigger if exists hr_job_families_set_updated_at
on public.hr_job_families;

create trigger hr_job_families_set_updated_at
before update on public.hr_job_families
for each row
execute function public.set_updated_at();

-- ============================================================
-- 8. Métiers
-- ============================================================

create table if not exists public.hr_jobs (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  job_family_id uuid
    references public.hr_job_families(id)
    on delete set null,

  code text not null,
  name text not null,
  description text,

  default_experience_years numeric(5, 2),
  display_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_jobs_code_unique
    unique (organization_id, code),

  constraint hr_jobs_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_jobs_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_jobs_experience_valid
    check (
      default_experience_years is null
      or default_experience_years >= 0
    )
);

create index if not exists hr_jobs_organization_idx
  on public.hr_jobs (organization_id);

create index if not exists hr_jobs_family_idx
  on public.hr_jobs (job_family_id);

drop trigger if exists hr_jobs_set_updated_at
on public.hr_jobs;

create trigger hr_jobs_set_updated_at
before update on public.hr_jobs
for each row
execute function public.set_updated_at();

-- ============================================================
-- 9. Fonctions et postes
-- ============================================================

create table if not exists public.hr_functions (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  job_id uuid
    references public.hr_jobs(id)
    on delete set null,

  code text not null,
  name text not null,
  description text,

  management_level integer not null default 0,
  is_managerial boolean not null default false,

  display_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_functions_code_unique
    unique (organization_id, code),

  constraint hr_functions_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_functions_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_functions_management_level_valid
    check (
      management_level >= 0
      and management_level <= 20
    )
);

create index if not exists hr_functions_organization_idx
  on public.hr_functions (organization_id);

create index if not exists hr_functions_job_idx
  on public.hr_functions (job_id);

drop trigger if exists hr_functions_set_updated_at
on public.hr_functions;

create trigger hr_functions_set_updated_at
before update on public.hr_functions
for each row
execute function public.set_updated_at();

-- ============================================================
-- 10. Types de contrat
-- ============================================================

create table if not exists public.hr_contract_types (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  employment_category text not null default 'employee',
  employment_status text not null default 'non_cadre',

  is_permanent boolean not null default true,
  is_external boolean not null default false,

  default_probation_months numeric(4, 2) not null default 0,
  default_notice_months numeric(4, 2) not null default 0,

  is_active boolean not null default true,
  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_contract_types_code_unique
    unique (organization_id, code),

  constraint hr_contract_types_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_contract_types_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_contract_types_category_valid
    check (
      employment_category in (
        'employee',
        'intern',
        'apprentice',
        'freelance',
        'subcontractor',
        'temporary_worker',
        'other'
      )
    ),

  constraint hr_contract_types_status_valid
    check (
      employment_status in (
        'cadre',
        'non_cadre',
        'dirigeant',
        'independent',
        'not_applicable'
      )
    ),

  constraint hr_contract_types_probation_valid
    check (default_probation_months >= 0),

  constraint hr_contract_types_notice_valid
    check (default_notice_months >= 0)
);

create index if not exists hr_contract_types_organization_idx
  on public.hr_contract_types (organization_id);

drop trigger if exists hr_contract_types_set_updated_at
on public.hr_contract_types;

create trigger hr_contract_types_set_updated_at
before update on public.hr_contract_types
for each row
execute function public.set_updated_at();

-- ============================================================
-- 11. Cycles et horaires de travail
-- ============================================================

create table if not exists public.hr_work_schedules (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  schedule_type text not null default 'weekly_hours',

  weekly_hours numeric(5, 2),
  annual_working_days integer,
  working_days_per_week numeric(3, 2) not null default 5,

  monday_hours numeric(5, 2) not null default 7,
  tuesday_hours numeric(5, 2) not null default 7,
  wednesday_hours numeric(5, 2) not null default 7,
  thursday_hours numeric(5, 2) not null default 7,
  friday_hours numeric(5, 2) not null default 7,
  saturday_hours numeric(5, 2) not null default 0,
  sunday_hours numeric(5, 2) not null default 0,

  is_default boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_work_schedules_code_unique
    unique (organization_id, code),

  constraint hr_work_schedules_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_work_schedules_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_work_schedules_type_valid
    check (
      schedule_type in (
        'weekly_hours',
        'annual_days',
        'part_time',
        'custom'
      )
    ),

  constraint hr_work_schedules_weekly_hours_valid
    check (
      weekly_hours is null
      or (
        weekly_hours > 0
        and weekly_hours <= 80
      )
    ),

  constraint hr_work_schedules_annual_days_valid
    check (
      annual_working_days is null
      or (
        annual_working_days > 0
        and annual_working_days <= 366
      )
    ),

  constraint hr_work_schedules_days_per_week_valid
    check (
      working_days_per_week > 0
      and working_days_per_week <= 7
    ),

  constraint hr_work_schedules_day_hours_valid
    check (
      monday_hours between 0 and 24
      and tuesday_hours between 0 and 24
      and wednesday_hours between 0 and 24
      and thursday_hours between 0 and 24
      and friday_hours between 0 and 24
      and saturday_hours between 0 and 24
      and sunday_hours between 0 and 24
    )
);

create index if not exists hr_work_schedules_organization_idx
  on public.hr_work_schedules (organization_id);

drop trigger if exists hr_work_schedules_set_updated_at
on public.hr_work_schedules;

create trigger hr_work_schedules_set_updated_at
before update on public.hr_work_schedules
for each row
execute function public.set_updated_at();

-- ============================================================
-- 12. Types d'absence
-- ============================================================

create table if not exists public.hr_absence_types (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  category text not null default 'leave',

  unit text not null default 'day',

  reduces_capacity boolean not null default true,
  requires_manager_approval boolean not null default true,
  requires_hr_review boolean not null default false,
  hr_review_is_blocking boolean not null default false,

  requires_document boolean not null default false,
  is_paid boolean not null default true,
  is_visible_to_employee boolean not null default true,

  color text not null default '#64748B',
  display_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_absence_types_code_unique
    unique (organization_id, code),

  constraint hr_absence_types_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_absence_types_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_absence_types_category_valid
    check (
      category in (
        'leave',
        'rtt',
        'sickness',
        'training',
        'remote_work',
        'business_trip',
        'family_event',
        'unpaid_leave',
        'maternity',
        'paternity',
        'compensatory_time',
        'other'
      )
    ),

  constraint hr_absence_types_unit_valid
    check (
      unit in ('hour', 'half_day', 'day')
    ),

  constraint hr_absence_types_color_valid
    check (
      color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

create index if not exists hr_absence_types_organization_idx
  on public.hr_absence_types (organization_id);

drop trigger if exists hr_absence_types_set_updated_at
on public.hr_absence_types;

create trigger hr_absence_types_set_updated_at
before update on public.hr_absence_types
for each row
execute function public.set_updated_at();

-- ============================================================
-- 13. Calendriers de jours fériés
-- ============================================================

create table if not exists public.hr_holiday_calendars (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  site_id uuid
    references public.hr_sites(id)
    on delete set null,

  code text not null,
  name text not null,

  country_code text not null default 'FR',
  region_code text,

  is_default boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_holiday_calendars_code_unique
    unique (organization_id, code),

  constraint hr_holiday_calendars_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_holiday_calendars_code_not_empty
    check (length(trim(code)) > 0)
);

create index if not exists hr_holiday_calendars_organization_idx
  on public.hr_holiday_calendars (organization_id);

create index if not exists hr_holiday_calendars_site_idx
  on public.hr_holiday_calendars (site_id);

drop trigger if exists hr_holiday_calendars_set_updated_at
on public.hr_holiday_calendars;

create trigger hr_holiday_calendars_set_updated_at
before update on public.hr_holiday_calendars
for each row
execute function public.set_updated_at();

-- ============================================================
-- 14. Jours fériés
-- ============================================================

create table if not exists public.hr_holidays (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  calendar_id uuid not null
    references public.hr_holiday_calendars(id)
    on delete cascade,

  holiday_date date not null,
  name text not null,

  is_working_day boolean not null default false,
  hours_override numeric(5, 2),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  constraint hr_holidays_calendar_date_unique
    unique (calendar_id, holiday_date),

  constraint hr_holidays_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_holidays_hours_valid
    check (
      hours_override is null
      or hours_override between 0 and 24
    )
);

create index if not exists hr_holidays_organization_idx
  on public.hr_holidays (organization_id);

create index if not exists hr_holidays_calendar_date_idx
  on public.hr_holidays (calendar_id, holiday_date);

drop trigger if exists hr_holidays_set_updated_at
on public.hr_holidays;

create trigger hr_holidays_set_updated_at
before update on public.hr_holidays
for each row
execute function public.set_updated_at();

-- ============================================================
-- 15. Activation de Row Level Security
-- ============================================================

alter table public.hr_settings enable row level security;
alter table public.hr_sites enable row level security;
alter table public.hr_departments enable row level security;
alter table public.hr_job_families enable row level security;
alter table public.hr_jobs enable row level security;
alter table public.hr_functions enable row level security;
alter table public.hr_contract_types enable row level security;
alter table public.hr_work_schedules enable row level security;
alter table public.hr_absence_types enable row level security;
alter table public.hr_holiday_calendars enable row level security;
alter table public.hr_holidays enable row level security;

-- ============================================================
-- 16. Suppression contrôlée des anciennes policies du script
-- ============================================================

do $$
declare
  table_name_value text;
  policy_name_value text;
begin
  foreach table_name_value in array array[
    'hr_settings',
    'hr_sites',
    'hr_departments',
    'hr_job_families',
    'hr_jobs',
    'hr_functions',
    'hr_contract_types',
    'hr_work_schedules',
    'hr_absence_types',
    'hr_holiday_calendars',
    'hr_holidays'
  ]
  loop
    foreach policy_name_value in array array[
      'organization_members_can_read',
      'organization_managers_can_insert',
      'organization_managers_can_update',
      'organization_managers_can_delete'
    ]
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_name_value,
        table_name_value
      );
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- 17. Création uniforme des policies RLS
-- ============================================================

do $$
declare
  table_name_value text;
begin
  foreach table_name_value in array array[
    'hr_settings',
    'hr_sites',
    'hr_departments',
    'hr_job_families',
    'hr_jobs',
    'hr_functions',
    'hr_contract_types',
    'hr_work_schedules',
    'hr_absence_types',
    'hr_holiday_calendars',
    'hr_holidays'
  ]
  loop
    execute format(
      $policy$
        create policy organization_members_can_read
        on public.%I
        for select
        to authenticated
        using (
          public.is_organization_member(organization_id)
        )
      $policy$,
      table_name_value
    );

    execute format(
      $policy$
        create policy organization_managers_can_insert
        on public.%I
        for insert
        to authenticated
        with check (
          public.has_organization_role(
            organization_id,
            array[
              'owner',
              'admin',
              'super_admin',
              'rh',
              'hr',
              'direction'
            ]
          )
        )
      $policy$,
      table_name_value
    );

    execute format(
      $policy$
        create policy organization_managers_can_update
        on public.%I
        for update
        to authenticated
        using (
          public.has_organization_role(
            organization_id,
            array[
              'owner',
              'admin',
              'super_admin',
              'rh',
              'hr',
              'direction'
            ]
          )
        )
        with check (
          public.has_organization_role(
            organization_id,
            array[
              'owner',
              'admin',
              'super_admin',
              'rh',
              'hr',
              'direction'
            ]
          )
        )
      $policy$,
      table_name_value
    );

    execute format(
      $policy$
        create policy organization_managers_can_delete
        on public.%I
        for delete
        to authenticated
        using (
          public.has_organization_role(
            organization_id,
            array[
              'owner',
              'admin',
              'super_admin'
            ]
          )
        )
      $policy$,
      table_name_value
    );
  end loop;
end;
$$;

-- ============================================================
-- 18. Fonction d'initialisation des référentiels RH par défaut
-- ============================================================

create or replace function public.seed_default_hr_architecture(
  target_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hr_settings (
    organization_id
  )
  values (
    target_organization_id
  )
  on conflict (organization_id) do nothing;

  insert into public.hr_sites (
    organization_id,
    code,
    name,
    is_head_office
  )
  values (
    target_organization_id,
    'SIEGE',
    'Siège social',
    true
  )
  on conflict (organization_id, code) do nothing;

  insert into public.hr_job_families (
    organization_id,
    code,
    name,
    display_order
  )
  values
    (
      target_organization_id,
      'DIRECTION',
      'Direction et management',
      10
    ),
    (
      target_organization_id,
      'PROJECT',
      'Gestion de projet',
      20
    ),
    (
      target_organization_id,
      'ENGINEERING',
      'Ingénierie',
      30
    ),
    (
      target_organization_id,
      'QUALITY',
      'Qualité',
      40
    ),
    (
      target_organization_id,
      'COMMERCIAL',
      'Commerce',
      50
    ),
    (
      target_organization_id,
      'FINANCE',
      'Finance et administration',
      60
    ),
    (
      target_organization_id,
      'HR',
      'Ressources humaines',
      70
    ),
    (
      target_organization_id,
      'SUPPORT',
      'Fonctions support',
      80
    )
  on conflict (organization_id, code) do nothing;

  insert into public.hr_contract_types (
    organization_id,
    code,
    name,
    employment_category,
    employment_status,
    is_permanent,
    is_external,
    default_probation_months,
    display_order
  )
  values
    (
      target_organization_id,
      'CDI_CADRE',
      'CDI Cadre',
      'employee',
      'cadre',
      true,
      false,
      4,
      10
    ),
    (
      target_organization_id,
      'CDI_NON_CADRE',
      'CDI Non-cadre',
      'employee',
      'non_cadre',
      true,
      false,
      2,
      20
    ),
    (
      target_organization_id,
      'CDD_CADRE',
      'CDD Cadre',
      'employee',
      'cadre',
      false,
      false,
      1,
      30
    ),
    (
      target_organization_id,
      'CDD_NON_CADRE',
      'CDD Non-cadre',
      'employee',
      'non_cadre',
      false,
      false,
      1,
      40
    ),
    (
      target_organization_id,
      'ALTERNANCE',
      'Alternance',
      'apprentice',
      'non_cadre',
      false,
      false,
      1,
      50
    ),
    (
      target_organization_id,
      'STAGE',
      'Stage',
      'intern',
      'not_applicable',
      false,
      false,
      0,
      60
    ),
    (
      target_organization_id,
      'FREELANCE',
      'Freelance',
      'freelance',
      'independent',
      false,
      true,
      0,
      70
    ),
    (
      target_organization_id,
      'SOUS_TRAITANT',
      'Sous-traitant',
      'subcontractor',
      'not_applicable',
      false,
      true,
      0,
      80
    ),
    (
      target_organization_id,
      'INTERIM',
      'Intérim',
      'temporary_worker',
      'non_cadre',
      false,
      true,
      0,
      90
    )
  on conflict (organization_id, code) do nothing;

  insert into public.hr_work_schedules (
    organization_id,
    code,
    name,
    schedule_type,
    weekly_hours,
    annual_working_days,
    working_days_per_week,
    monday_hours,
    tuesday_hours,
    wednesday_hours,
    thursday_hours,
    friday_hours,
    saturday_hours,
    sunday_hours,
    is_default
  )
  values
    (
      target_organization_id,
      '35H',
      'Temps plein 35 heures',
      'weekly_hours',
      35,
      null,
      5,
      7,
      7,
      7,
      7,
      7,
      0,
      0,
      true
    ),
    (
      target_organization_id,
      '37H',
      'Temps plein 37 heures',
      'weekly_hours',
      37,
      null,
      5,
      7.4,
      7.4,
      7.4,
      7.4,
      7.4,
      0,
      0,
      false
    ),
    (
      target_organization_id,
      '39H',
      'Temps plein 39 heures',
      'weekly_hours',
      39,
      null,
      5,
      7.8,
      7.8,
      7.8,
      7.8,
      7.8,
      0,
      0,
      false
    ),
    (
      target_organization_id,
      '40H',
      'Temps plein 40 heures',
      'weekly_hours',
      40,
      null,
      5,
      8,
      8,
      8,
      8,
      8,
      0,
      0,
      false
    ),
    (
      target_organization_id,
      'FORFAIT_218',
      'Forfait annuel 218 jours',
      'annual_days',
      null,
      218,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      false
    ),
    (
      target_organization_id,
      'FORFAIT_220',
      'Forfait annuel 220 jours',
      'annual_days',
      null,
      220,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      false
    ),
    (
      target_organization_id,
      'FORFAIT_210',
      'Forfait annuel 210 jours',
      'annual_days',
      null,
      210,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      false
    )
  on conflict (organization_id, code) do nothing;

  insert into public.hr_absence_types (
    organization_id,
    code,
    name,
    category,
    unit,
    reduces_capacity,
    requires_manager_approval,
    requires_hr_review,
    hr_review_is_blocking,
    requires_document,
    is_paid,
    color,
    display_order
  )
  values
    (
      target_organization_id,
      'CP',
      'Congés payés',
      'leave',
      'day',
      true,
      true,
      true,
      false,
      false,
      true,
      '#0EA5E9',
      10
    ),
    (
      target_organization_id,
      'RTT',
      'Réduction du temps de travail',
      'rtt',
      'day',
      true,
      true,
      true,
      false,
      false,
      true,
      '#8B5CF6',
      20
    ),
    (
      target_organization_id,
      'MALADIE',
      'Maladie',
      'sickness',
      'day',
      true,
      true,
      true,
      false,
      true,
      true,
      '#EF4444',
      30
    ),
    (
      target_organization_id,
      'FORMATION',
      'Formation',
      'training',
      'day',
      true,
      true,
      true,
      false,
      false,
      true,
      '#10B981',
      40
    ),
    (
      target_organization_id,
      'TELETRAVAIL',
      'Télétravail',
      'remote_work',
      'day',
      false,
      true,
      true,
      false,
      false,
      true,
      '#14B8A6',
      50
    ),
    (
      target_organization_id,
      'DEPLACEMENT',
      'Déplacement professionnel',
      'business_trip',
      'day',
      false,
      true,
      true,
      false,
      false,
      true,
      '#F59E0B',
      60
    ),
    (
      target_organization_id,
      'SANS_SOLDE',
      'Congé sans solde',
      'unpaid_leave',
      'day',
      true,
      true,
      true,
      false,
      false,
      false,
      '#64748B',
      70
    ),
    (
      target_organization_id,
      'MATERNITE',
      'Congé maternité',
      'maternity',
      'day',
      true,
      true,
      true,
      false,
      true,
      true,
      '#EC4899',
      80
    ),
    (
      target_organization_id,
      'PATERNITE',
      'Congé paternité',
      'paternity',
      'day',
      true,
      true,
      true,
      false,
      true,
      true,
      '#6366F1',
      90
    ),
    (
      target_organization_id,
      'EVT_FAMILIAL',
      'Évènement familial',
      'family_event',
      'day',
      true,
      true,
      true,
      false,
      true,
      true,
      '#F97316',
      100
    )
  on conflict (organization_id, code) do nothing;

  insert into public.hr_holiday_calendars (
    organization_id,
    code,
    name,
    country_code,
    is_default
  )
  values (
    target_organization_id,
    'FR_DEFAULT',
    'France - calendrier principal',
    'FR',
    true
  )
  on conflict (organization_id, code) do nothing;
end;
$$;

revoke all on function public.seed_default_hr_architecture(uuid)
from public;

grant execute on function public.seed_default_hr_architecture(uuid)
to authenticated;

-- ============================================================
-- 19. Initialisation des organisations déjà existantes
-- ============================================================

do $$
declare
  organization_row record;
begin
  for organization_row in
    select id
    from public.organizations
  loop
    perform public.seed_default_hr_architecture(
      organization_row.id
    );
  end loop;
end;
$$;

-- ============================================================
-- 20. Initialisation automatique des futures organisations
-- ============================================================

create or replace function public.initialize_hr_after_organization_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_hr_architecture(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_initialize_hr
on public.organizations;

create trigger organizations_initialize_hr
after insert on public.organizations
for each row
execute function public.initialize_hr_after_organization_insert();

commit;