-- ============================================================
-- ONEPILOT
-- 002_hr_members.sql
--
-- Socle du module "Membres de l'équipe".
--
-- Ce script crée :
-- - les fiches collaborateurs ;
-- - les rattachements organisationnels ;
-- - les responsables hiérarchiques ;
-- - les contrats ;
-- - les paramètres de coût et de capacité ;
-- - les informations de période d'essai ;
-- - les règles RLS multi-tenant.
--
-- Ce script ne supprime aucune table existante.
-- ============================================================

begin;

-- ============================================================
-- 1. Séquences internes par organisation
-- ============================================================

create table if not exists public.hr_employee_sequences (
  organization_id uuid primary key
    references public.organizations(id)
    on delete cascade,

  last_value bigint not null default 0,

  updated_at timestamptz not null default now(),

  constraint hr_employee_sequences_last_value_valid
    check (last_value >= 0)
);

alter table public.hr_employee_sequences
enable row level security;

drop policy if exists organization_members_can_read
on public.hr_employee_sequences;

drop policy if exists organization_managers_can_insert
on public.hr_employee_sequences;

drop policy if exists organization_managers_can_update
on public.hr_employee_sequences;

create policy organization_members_can_read
on public.hr_employee_sequences
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy organization_managers_can_insert
on public.hr_employee_sequences
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
);

create policy organization_managers_can_update
on public.hr_employee_sequences
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
);

-- ============================================================
-- 2. Génération d'un matricule par organisation
-- ============================================================

create or replace function public.generate_hr_employee_number(
  target_organization_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_value bigint;
begin
  insert into public.hr_employee_sequences (
    organization_id,
    last_value
  )
  values (
    target_organization_id,
    1
  )
  on conflict (organization_id)
  do update
  set
    last_value = public.hr_employee_sequences.last_value + 1,
    updated_at = now()
  returning last_value
  into generated_value;

  return 'EMP-' || lpad(generated_value::text, 6, '0');
end;
$$;

revoke all
on function public.generate_hr_employee_number(uuid)
from public;

grant execute
on function public.generate_hr_employee_number(uuid)
to authenticated;

-- ============================================================
-- 3. Fiches collaborateurs
-- ============================================================

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  employee_number text not null,

  title text,
  first_name text not null,
  last_name text not null,
  preferred_name text,

  birth_date date,
  birth_city text,
  birth_country_code text,

  professional_email text,
  personal_email text,
  professional_phone text,
  personal_phone text,

  address_line_1 text,
  address_line_2 text,
  postal_code text,
  city text,
  region text,
  country_code text not null default 'FR',

  photo_url text,

  site_id uuid
    references public.hr_sites(id)
    on delete set null,

  department_id uuid
    references public.hr_departments(id)
    on delete set null,

  job_id uuid
    references public.hr_jobs(id)
    on delete set null,

  function_id uuid
    references public.hr_functions(id)
    on delete set null,

  manager_employee_id uuid
    references public.hr_employees(id)
    on delete set null,

  arrival_date date,
  departure_date date,

  experience_years numeric(5, 2) not null default 0,

  employment_status text not null default 'active',

  profile_visibility text not null default 'organization',

  comments text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_employees_number_unique
    unique (organization_id, employee_number),

  constraint hr_employees_user_unique
    unique (organization_id, user_id),

  constraint hr_employees_first_name_not_empty
    check (length(trim(first_name)) > 0),

  constraint hr_employees_last_name_not_empty
    check (length(trim(last_name)) > 0),

  constraint hr_employees_experience_valid
    check (experience_years >= 0),

  constraint hr_employees_status_valid
    check (
      employment_status in (
        'draft',
        'preboarding',
        'active',
        'probation',
        'suspended',
        'notice_period',
        'departed',
        'archived'
      )
    ),

  constraint hr_employees_visibility_valid
    check (
      profile_visibility in (
        'private',
        'manager',
        'department',
        'organization'
      )
    ),

  constraint hr_employees_dates_valid
    check (
      departure_date is null
      or arrival_date is null
      or departure_date >= arrival_date
    ),

  constraint hr_employees_manager_not_self
    check (
      manager_employee_id is null
      or manager_employee_id <> id
    ),

  constraint hr_employees_professional_email_valid
    check (
      professional_email is null
      or professional_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    ),

  constraint hr_employees_personal_email_valid
    check (
      personal_email is null
      or personal_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
);

create index if not exists hr_employees_organization_idx
  on public.hr_employees (organization_id);

create index if not exists hr_employees_name_idx
  on public.hr_employees (
    organization_id,
    last_name,
    first_name
  );

create index if not exists hr_employees_manager_idx
  on public.hr_employees (manager_employee_id);

create index if not exists hr_employees_department_idx
  on public.hr_employees (department_id);

create index if not exists hr_employees_site_idx
  on public.hr_employees (site_id);

create index if not exists hr_employees_job_idx
  on public.hr_employees (job_id);

create index if not exists hr_employees_function_idx
  on public.hr_employees (function_id);

create index if not exists hr_employees_status_idx
  on public.hr_employees (
    organization_id,
    employment_status,
    is_active
  );

drop trigger if exists hr_employees_set_updated_at
on public.hr_employees;

create trigger hr_employees_set_updated_at
before update on public.hr_employees
for each row
execute function public.set_updated_at();

-- ============================================================
-- 4. Génération automatique du matricule
-- ============================================================

create or replace function public.set_hr_employee_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.employee_number is null
     or length(trim(new.employee_number)) = 0 then
    new.employee_number :=
      public.generate_hr_employee_number(new.organization_id);
  end if;

  return new;
end;
$$;

drop trigger if exists hr_employees_set_employee_number
on public.hr_employees;

create trigger hr_employees_set_employee_number
before insert on public.hr_employees
for each row
execute function public.set_hr_employee_number();

-- ============================================================
-- 5. Contrats collaborateurs
-- ============================================================

create table if not exists public.hr_employee_contracts (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  employee_id uuid not null
    references public.hr_employees(id)
    on delete cascade,

  contract_type_id uuid
    references public.hr_contract_types(id)
    on delete restrict,

  work_schedule_id uuid
    references public.hr_work_schedules(id)
    on delete restrict,

  contract_number text,

  start_date date not null,
  end_date date,

  employment_status text not null default 'non_cadre',

  working_time_type text not null default 'full_time',

  activity_rate numeric(6, 3) not null default 1,

  weekly_hours numeric(5, 2),

  annual_working_days integer,

  annual_gross_salary numeric(14, 2),

  monthly_gross_salary numeric(14, 2),

  employer_charge_rate numeric(6, 3) not null default 0,

  annual_employer_cost numeric(14, 2),

  monthly_employer_cost numeric(14, 2),

  daily_cost numeric(14, 2),

  hourly_cost numeric(14, 2),

  probation_start_date date,
  probation_end_date date,

  probation_duration_months numeric(4, 2),

  probation_renewable boolean not null default false,
  probation_renewed boolean not null default false,

  notice_duration_months numeric(4, 2),

  status text not null default 'draft',

  is_primary boolean not null default true,
  is_active boolean not null default true,

  comments text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_employee_contracts_number_unique
    unique (organization_id, contract_number),

  constraint hr_employee_contracts_dates_valid
    check (
      end_date is null
      or end_date >= start_date
    ),

  constraint hr_employee_contracts_probation_dates_valid
    check (
      probation_end_date is null
      or probation_start_date is null
      or probation_end_date >= probation_start_date
    ),

  constraint hr_employee_contracts_status_valid
    check (
      status in (
        'draft',
        'pending_signature',
        'signed',
        'active',
        'suspended',
        'ended',
        'cancelled',
        'archived'
      )
    ),

  constraint hr_employee_contracts_employment_status_valid
    check (
      employment_status in (
        'cadre',
        'non_cadre',
        'dirigeant',
        'independent',
        'not_applicable'
      )
    ),

  constraint hr_employee_contracts_working_time_valid
    check (
      working_time_type in (
        'full_time',
        'part_time',
        'annual_days',
        'custom'
      )
    ),

  constraint hr_employee_contracts_activity_rate_valid
    check (
      activity_rate > 0
      and activity_rate <= 1
    ),

  constraint hr_employee_contracts_weekly_hours_valid
    check (
      weekly_hours is null
      or (
        weekly_hours > 0
        and weekly_hours <= 80
      )
    ),

  constraint hr_employee_contracts_annual_days_valid
    check (
      annual_working_days is null
      or (
        annual_working_days > 0
        and annual_working_days <= 366
      )
    ),

  constraint hr_employee_contracts_salary_valid
    check (
      annual_gross_salary is null
      or annual_gross_salary >= 0
    ),

  constraint hr_employee_contracts_monthly_salary_valid
    check (
      monthly_gross_salary is null
      or monthly_gross_salary >= 0
    ),

  constraint hr_employee_contracts_charge_rate_valid
    check (
      employer_charge_rate >= 0
      and employer_charge_rate <= 5
    ),

  constraint hr_employee_contracts_costs_valid
    check (
      (annual_employer_cost is null or annual_employer_cost >= 0)
      and
      (monthly_employer_cost is null or monthly_employer_cost >= 0)
      and
      (daily_cost is null or daily_cost >= 0)
      and
      (hourly_cost is null or hourly_cost >= 0)
    ),

  constraint hr_employee_contracts_probation_duration_valid
    check (
      probation_duration_months is null
      or probation_duration_months >= 0
    ),

  constraint hr_employee_contracts_notice_duration_valid
    check (
      notice_duration_months is null
      or notice_duration_months >= 0
    )
);

create index if not exists hr_employee_contracts_organization_idx
  on public.hr_employee_contracts (organization_id);

create index if not exists hr_employee_contracts_employee_idx
  on public.hr_employee_contracts (employee_id);

create index if not exists hr_employee_contracts_type_idx
  on public.hr_employee_contracts (contract_type_id);

create index if not exists hr_employee_contracts_schedule_idx
  on public.hr_employee_contracts (work_schedule_id);

create index if not exists hr_employee_contracts_status_idx
  on public.hr_employee_contracts (
    organization_id,
    status,
    is_active
  );

create unique index if not exists
  hr_employee_contracts_one_primary_active_idx
on public.hr_employee_contracts (employee_id)
where is_primary = true
  and is_active = true
  and status not in ('ended', 'cancelled', 'archived');

drop trigger if exists hr_employee_contracts_set_updated_at
on public.hr_employee_contracts;

create trigger hr_employee_contracts_set_updated_at
before update on public.hr_employee_contracts
for each row
execute function public.set_updated_at();

-- ============================================================
-- 6. Calcul automatique des coûts
-- ============================================================

create or replace function public.calculate_hr_employee_contract_costs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_annual_days numeric;
  selected_weekly_hours numeric;
  selected_annual_hours numeric;
begin
  if new.annual_gross_salary is not null then
    new.monthly_gross_salary :=
      round(new.annual_gross_salary / 12, 2);

    new.annual_employer_cost :=
      round(
        new.annual_gross_salary
        * (1 + coalesce(new.employer_charge_rate, 0)),
        2
      );

    new.monthly_employer_cost :=
      round(new.annual_employer_cost / 12, 2);

    selected_annual_days :=
      coalesce(
        new.annual_working_days,
        (
          select schedule.annual_working_days
          from public.hr_work_schedules schedule
          where schedule.id = new.work_schedule_id
        ),
        (
          select settings.default_annual_working_days
          from public.hr_settings settings
          where settings.organization_id = new.organization_id
        ),
        218
      );

    selected_weekly_hours :=
      coalesce(
        new.weekly_hours,
        (
          select schedule.weekly_hours
          from public.hr_work_schedules schedule
          where schedule.id = new.work_schedule_id
        ),
        (
          select settings.default_weekly_hours
          from public.hr_settings settings
          where settings.organization_id = new.organization_id
        ),
        35
      );

    selected_annual_hours :=
      selected_weekly_hours * 52;

    if selected_annual_days > 0 then
      new.daily_cost :=
        round(
          new.annual_employer_cost
          / selected_annual_days,
          2
        );
    end if;

    if selected_annual_hours > 0 then
      new.hourly_cost :=
        round(
          new.annual_employer_cost
          / selected_annual_hours,
          2
        );
    end if;
  else
    new.monthly_gross_salary := null;
    new.annual_employer_cost := null;
    new.monthly_employer_cost := null;
    new.daily_cost := null;
    new.hourly_cost := null;
  end if;

  return new;
end;
$$;

drop trigger if exists hr_employee_contracts_calculate_costs
on public.hr_employee_contracts;

create trigger hr_employee_contracts_calculate_costs
before insert or update of
  annual_gross_salary,
  employer_charge_rate,
  work_schedule_id,
  weekly_hours,
  annual_working_days
on public.hr_employee_contracts
for each row
execute function public.calculate_hr_employee_contract_costs();

-- ============================================================
-- 7. Vérification de cohérence multi-tenant
-- ============================================================

create or replace function public.validate_hr_employee_relations()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.site_id is not null
     and not exists (
       select 1
       from public.hr_sites site
       where site.id = new.site_id
         and site.organization_id = new.organization_id
     ) then
    raise exception
      'Le site sélectionné ne correspond pas à l''organisation.';
  end if;

  if new.department_id is not null
     and not exists (
       select 1
       from public.hr_departments department
       where department.id = new.department_id
         and department.organization_id = new.organization_id
     ) then
    raise exception
      'Le département sélectionné ne correspond pas à l''organisation.';
  end if;

  if new.job_id is not null
     and not exists (
       select 1
       from public.hr_jobs job
       where job.id = new.job_id
         and job.organization_id = new.organization_id
     ) then
    raise exception
      'Le métier sélectionné ne correspond pas à l''organisation.';
  end if;

  if new.function_id is not null
     and not exists (
       select 1
       from public.hr_functions function_row
       where function_row.id = new.function_id
         and function_row.organization_id = new.organization_id
     ) then
    raise exception
      'La fonction sélectionnée ne correspond pas à l''organisation.';
  end if;

  if new.manager_employee_id is not null
     and not exists (
       select 1
       from public.hr_employees manager
       where manager.id = new.manager_employee_id
         and manager.organization_id = new.organization_id
     ) then
    raise exception
      'Le manager sélectionné ne correspond pas à l''organisation.';
  end if;

  return new;
end;
$$;

drop trigger if exists hr_employees_validate_relations
on public.hr_employees;

create trigger hr_employees_validate_relations
before insert or update on public.hr_employees
for each row
execute function public.validate_hr_employee_relations();

create or replace function public.validate_hr_employee_contract_relations()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.hr_employees employee
    where employee.id = new.employee_id
      and employee.organization_id = new.organization_id
  ) then
    raise exception
      'Le collaborateur ne correspond pas à l''organisation.';
  end if;

  if new.contract_type_id is not null
     and not exists (
       select 1
       from public.hr_contract_types contract_type
       where contract_type.id = new.contract_type_id
         and contract_type.organization_id = new.organization_id
     ) then
    raise exception
      'Le type de contrat ne correspond pas à l''organisation.';
  end if;

  if new.work_schedule_id is not null
     and not exists (
       select 1
       from public.hr_work_schedules work_schedule
       where work_schedule.id = new.work_schedule_id
         and work_schedule.organization_id = new.organization_id
     ) then
    raise exception
      'Le rythme de travail ne correspond pas à l''organisation.';
  end if;

  return new;
end;
$$;

drop trigger if exists hr_employee_contracts_validate_relations
on public.hr_employee_contracts;

create trigger hr_employee_contracts_validate_relations
before insert or update on public.hr_employee_contracts
for each row
execute function public.validate_hr_employee_contract_relations();

-- ============================================================
-- 8. Activation RLS
-- ============================================================

alter table public.hr_employees
enable row level security;

alter table public.hr_employee_contracts
enable row level security;

-- ============================================================
-- 9. RLS des fiches collaborateurs
-- ============================================================

drop policy if exists organization_members_can_read
on public.hr_employees;

drop policy if exists organization_hr_can_insert
on public.hr_employees;

drop policy if exists organization_hr_can_update
on public.hr_employees;

drop policy if exists organization_admins_can_delete
on public.hr_employees;

create policy organization_members_can_read
on public.hr_employees
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy organization_hr_can_insert
on public.hr_employees
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
);

create policy organization_hr_can_update
on public.hr_employees
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
);

create policy organization_admins_can_delete
on public.hr_employees
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
);

-- ============================================================
-- 10. RLS des contrats
-- ============================================================

drop policy if exists organization_hr_can_read_contracts
on public.hr_employee_contracts;

drop policy if exists organization_hr_can_insert_contracts
on public.hr_employee_contracts;

drop policy if exists organization_hr_can_update_contracts
on public.hr_employee_contracts;

drop policy if exists organization_admins_can_delete_contracts
on public.hr_employee_contracts;

create policy organization_hr_can_read_contracts
on public.hr_employee_contracts
for select
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
      'direction',
      'manager'
    ]
  )
);

create policy organization_hr_can_insert_contracts
on public.hr_employee_contracts
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
);

create policy organization_hr_can_update_contracts
on public.hr_employee_contracts
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
);

create policy organization_admins_can_delete_contracts
on public.hr_employee_contracts
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
);

-- ============================================================
-- 11. Vue opérationnelle des collaborateurs
-- ============================================================

create or replace view public.hr_employee_overview
with (security_invoker = true)
as
select
  employee.id,
  employee.organization_id,
  employee.user_id,
  employee.employee_number,

  employee.title,
  employee.first_name,
  employee.last_name,
  employee.preferred_name,

  concat_ws(
    ' ',
    nullif(trim(employee.first_name), ''),
    nullif(trim(employee.last_name), '')
  ) as full_name,

  employee.professional_email,
  employee.professional_phone,

  employee.photo_url,

  employee.arrival_date,
  employee.departure_date,
  employee.experience_years,

  employee.employment_status,
  employee.profile_visibility,
  employee.is_active,

  site.id as site_id,
  site.code as site_code,
  site.name as site_name,

  department.id as department_id,
  department.code as department_code,
  department.name as department_name,

  job.id as job_id,
  job.code as job_code,
  job.name as job_name,

  function_row.id as function_id,
  function_row.code as function_code,
  function_row.name as function_name,

  manager.id as manager_id,

  concat_ws(
    ' ',
    nullif(trim(manager.first_name), ''),
    nullif(trim(manager.last_name), '')
  ) as manager_name,

  contract.id as primary_contract_id,
  contract.start_date as contract_start_date,
  contract.end_date as contract_end_date,
  contract.status as contract_status,
  contract.employment_status as contract_employment_status,
  contract.working_time_type,
  contract.activity_rate,
  contract.weekly_hours,
  contract.annual_working_days,
  contract.probation_start_date,
  contract.probation_end_date,

  contract_type.id as contract_type_id,
  contract_type.code as contract_type_code,
  contract_type.name as contract_type_name,

  work_schedule.id as work_schedule_id,
  work_schedule.code as work_schedule_code,
  work_schedule.name as work_schedule_name,

  employee.created_at,
  employee.updated_at
from public.hr_employees employee
left join public.hr_sites site
  on site.id = employee.site_id
left join public.hr_departments department
  on department.id = employee.department_id
left join public.hr_jobs job
  on job.id = employee.job_id
left join public.hr_functions function_row
  on function_row.id = employee.function_id
left join public.hr_employees manager
  on manager.id = employee.manager_employee_id
left join public.hr_employee_contracts contract
  on contract.employee_id = employee.id
 and contract.is_primary = true
 and contract.is_active = true
 and contract.status not in (
   'ended',
   'cancelled',
   'archived'
 )
left join public.hr_contract_types contract_type
  on contract_type.id = contract.contract_type_id
left join public.hr_work_schedules work_schedule
  on work_schedule.id = contract.work_schedule_id;

grant select
on public.hr_employee_overview
to authenticated;

commit;