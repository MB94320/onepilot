-- ============================================================
-- ONEPILOT
-- 004_hr_compensation_model.sql
--
-- Extension du modèle de rémunération et de coûts :
-- - salarié ;
-- - freelance ;
-- - sous-traitant ;
-- - TJM ;
-- - taux horaire ;
-- - taux horaire chargé ;
-- - profils indicatifs de charges employeur.
-- ============================================================

begin;

-- ============================================================
-- 1. Profils indicatifs de charges employeur
-- ============================================================

create table if not exists public.hr_employer_charge_profiles (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  charge_rate numeric(6, 3) not null default 0,

  is_default boolean not null default false,
  is_system_preset boolean not null default false,
  is_active boolean not null default true,

  display_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  constraint hr_employer_charge_profiles_code_unique
    unique (organization_id, code),

  constraint hr_employer_charge_profiles_name_not_empty
    check (length(trim(name)) > 0),

  constraint hr_employer_charge_profiles_code_not_empty
    check (length(trim(code)) > 0),

  constraint hr_employer_charge_profiles_rate_valid
    check (
      charge_rate >= 0
      and charge_rate <= 5
    )
);

create index if not exists
  hr_employer_charge_profiles_organization_idx
on public.hr_employer_charge_profiles (
  organization_id
);

drop trigger if exists
  hr_employer_charge_profiles_set_updated_at
on public.hr_employer_charge_profiles;

create trigger
  hr_employer_charge_profiles_set_updated_at
before update
on public.hr_employer_charge_profiles
for each row
execute function public.set_updated_at();

alter table public.hr_employer_charge_profiles
enable row level security;

drop policy if exists organization_members_can_read
on public.hr_employer_charge_profiles;

drop policy if exists organization_hr_can_insert
on public.hr_employer_charge_profiles;

drop policy if exists organization_hr_can_update
on public.hr_employer_charge_profiles;

drop policy if exists organization_admins_can_delete
on public.hr_employer_charge_profiles;

create policy organization_members_can_read
on public.hr_employer_charge_profiles
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

create policy organization_hr_can_insert
on public.hr_employer_charge_profiles
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
on public.hr_employer_charge_profiles
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
on public.hr_employer_charge_profiles
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
-- 2. Extension des contrats
-- ============================================================

alter table public.hr_employee_contracts
  add column if not exists compensation_mode text
  not null default 'salary';

alter table public.hr_employee_contracts
  add column if not exists employer_charge_profile_id uuid
  references public.hr_employer_charge_profiles(id)
  on delete set null;

alter table public.hr_employee_contracts
  add column if not exists external_daily_rate numeric(14, 2);

alter table public.hr_employee_contracts
  add column if not exists external_hourly_rate numeric(14, 2);

alter table public.hr_employee_contracts
  add column if not exists external_overhead_rate numeric(6, 3)
  not null default 0;

alter table public.hr_employee_contracts
  add column if not exists gross_hourly_rate numeric(14, 2);

alter table public.hr_employee_contracts
  add column if not exists loaded_hourly_cost numeric(14, 2);

alter table public.hr_employee_contracts
  add column if not exists loaded_daily_cost numeric(14, 2);

alter table public.hr_employee_contracts
  add column if not exists daily_working_hours numeric(5, 2);

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_compensation_mode_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_compensation_mode_valid
  check (
    compensation_mode in (
      'salary',
      'daily_rate',
      'hourly_rate',
      'fixed_fee'
    )
  );

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_external_daily_rate_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_external_daily_rate_valid
  check (
    external_daily_rate is null
    or external_daily_rate >= 0
  );

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_external_hourly_rate_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_external_hourly_rate_valid
  check (
    external_hourly_rate is null
    or external_hourly_rate >= 0
  );

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_external_overhead_rate_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_external_overhead_rate_valid
  check (
    external_overhead_rate >= 0
    and external_overhead_rate <= 5
  );

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_daily_working_hours_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_daily_working_hours_valid
  check (
    daily_working_hours is null
    or (
      daily_working_hours > 0
      and daily_working_hours <= 24
    )
  );

alter table public.hr_employee_contracts
  drop constraint if exists
  hr_employee_contracts_calculated_rates_valid;

alter table public.hr_employee_contracts
  add constraint
  hr_employee_contracts_calculated_rates_valid
  check (
    (
      gross_hourly_rate is null
      or gross_hourly_rate >= 0
    )
    and
    (
      loaded_hourly_cost is null
      or loaded_hourly_cost >= 0
    )
    and
    (
      loaded_daily_cost is null
      or loaded_daily_cost >= 0
    )
  );

create index if not exists
  hr_employee_contracts_charge_profile_idx
on public.hr_employee_contracts (
  employer_charge_profile_id
);

-- ============================================================
-- 3. Calcul automatique unifié
-- ============================================================

create or replace function
public.calculate_hr_employee_contract_costs()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_annual_days numeric;
  selected_weekly_hours numeric;
  selected_annual_hours numeric;
  selected_daily_hours numeric;
  selected_charge_rate numeric;
begin
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
        where settings.organization_id =
              new.organization_id
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
        where settings.organization_id =
              new.organization_id
      ),

      35
    );

  selected_daily_hours :=
    coalesce(
      new.daily_working_hours,

      case
        when selected_annual_days > 0
          and selected_weekly_hours is not null
        then selected_weekly_hours / 5
        else null
      end,

      (
        select settings.default_daily_hours
        from public.hr_settings settings
        where settings.organization_id =
              new.organization_id
      ),

      7
    );

  selected_annual_hours :=
    selected_weekly_hours * 52;

  selected_charge_rate :=
    coalesce(
      (
        select profile.charge_rate
        from public.hr_employer_charge_profiles profile
        where profile.id =
              new.employer_charge_profile_id
          and profile.organization_id =
              new.organization_id
      ),

      new.employer_charge_rate,

      0
    );

  new.employer_charge_rate :=
    selected_charge_rate;

  new.daily_working_hours :=
    selected_daily_hours;

  -- ==========================================================
  -- Salarié
  -- ==========================================================

  if new.compensation_mode = 'salary' then
    new.external_daily_rate := null;
    new.external_hourly_rate := null;

    if new.annual_gross_salary is not null then
      new.monthly_gross_salary :=
        round(
          new.annual_gross_salary / 12,
          2
        );

      new.annual_employer_cost :=
        round(
          new.annual_gross_salary
          * (
            1 + selected_charge_rate
          ),
          2
        );

      new.monthly_employer_cost :=
        round(
          new.annual_employer_cost / 12,
          2
        );

      if selected_annual_days > 0 then
        new.daily_cost :=
          round(
            new.annual_employer_cost
            / selected_annual_days,
            2
          );

        new.loaded_daily_cost :=
          new.daily_cost;
      end if;

      if selected_annual_hours > 0 then
        new.gross_hourly_rate :=
          round(
            new.annual_gross_salary
            / selected_annual_hours,
            2
          );

        new.hourly_cost :=
          round(
            new.annual_employer_cost
            / selected_annual_hours,
            2
          );

        new.loaded_hourly_cost :=
          new.hourly_cost;
      end if;
    else
      new.monthly_gross_salary := null;
      new.annual_employer_cost := null;
      new.monthly_employer_cost := null;
      new.daily_cost := null;
      new.hourly_cost := null;
      new.gross_hourly_rate := null;
      new.loaded_hourly_cost := null;
      new.loaded_daily_cost := null;
    end if;
  end if;

  -- ==========================================================
  -- Freelance ou sous-traitant au TJM
  -- ==========================================================

  if new.compensation_mode = 'daily_rate' then
    new.annual_gross_salary := null;
    new.monthly_gross_salary := null;
    new.annual_employer_cost := null;
    new.monthly_employer_cost := null;

    if new.external_daily_rate is not null then
      new.external_hourly_rate :=
        round(
          new.external_daily_rate
          / selected_daily_hours,
          2
        );

      new.gross_hourly_rate :=
        new.external_hourly_rate;

      new.daily_cost :=
        new.external_daily_rate;

      new.hourly_cost :=
        new.external_hourly_rate;

      new.loaded_daily_cost :=
        round(
          new.external_daily_rate
          * (
            1 + coalesce(
              new.external_overhead_rate,
              0
            )
          ),
          2
        );

      new.loaded_hourly_cost :=
        round(
          new.loaded_daily_cost
          / selected_daily_hours,
          2
        );
    else
      new.external_hourly_rate := null;
      new.daily_cost := null;
      new.hourly_cost := null;
      new.gross_hourly_rate := null;
      new.loaded_daily_cost := null;
      new.loaded_hourly_cost := null;
    end if;
  end if;

  -- ==========================================================
  -- Prestataire au taux horaire
  -- ==========================================================

  if new.compensation_mode = 'hourly_rate' then
    new.annual_gross_salary := null;
    new.monthly_gross_salary := null;
    new.annual_employer_cost := null;
    new.monthly_employer_cost := null;

    if new.external_hourly_rate is not null then
      new.external_daily_rate :=
        round(
          new.external_hourly_rate
          * selected_daily_hours,
          2
        );

      new.gross_hourly_rate :=
        new.external_hourly_rate;

      new.hourly_cost :=
        new.external_hourly_rate;

      new.daily_cost :=
        new.external_daily_rate;

      new.loaded_hourly_cost :=
        round(
          new.external_hourly_rate
          * (
            1 + coalesce(
              new.external_overhead_rate,
              0
            )
          ),
          2
        );

      new.loaded_daily_cost :=
        round(
          new.loaded_hourly_cost
          * selected_daily_hours,
          2
        );
    else
      new.external_daily_rate := null;
      new.daily_cost := null;
      new.hourly_cost := null;
      new.gross_hourly_rate := null;
      new.loaded_daily_cost := null;
      new.loaded_hourly_cost := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  hr_employee_contracts_calculate_costs
on public.hr_employee_contracts;

create trigger
  hr_employee_contracts_calculate_costs
before insert or update of
  compensation_mode,
  annual_gross_salary,
  employer_charge_profile_id,
  employer_charge_rate,
  external_daily_rate,
  external_hourly_rate,
  external_overhead_rate,
  work_schedule_id,
  weekly_hours,
  annual_working_days,
  daily_working_hours
on public.hr_employee_contracts
for each row
execute function
  public.calculate_hr_employee_contract_costs();

-- ============================================================
-- 4. Profils indicatifs par défaut
-- ============================================================

insert into public.hr_employer_charge_profiles (
  organization_id,
  code,
  name,
  description,
  charge_rate,
  is_default,
  is_system_preset,
  display_order
)
select
  organization_row.id,
  preset.code,
  preset.name,
  preset.description,
  preset.charge_rate,
  preset.is_default,
  true,
  preset.display_order
from public.organizations organization_row
cross join (
  values
    (
      'CUSTOM',
      'Saisie manuelle',
      'Taux libre défini par l’entreprise.',
      0.000::numeric,
      false,
      10
    ),
    (
      'ESTIMATE_25',
      'Estimation légère — 25 %',
      'Hypothèse indicative de pilotage.',
      0.250::numeric,
      false,
      20
    ),
    (
      'ESTIMATE_35',
      'Estimation intermédiaire — 35 %',
      'Hypothèse indicative de pilotage.',
      0.350::numeric,
      false,
      30
    ),
    (
      'ESTIMATE_42',
      'Estimation standard — 42 %',
      'Hypothèse par défaut modifiable.',
      0.420::numeric,
      true,
      40
    ),
    (
      'ESTIMATE_45',
      'Estimation renforcée — 45 %',
      'Hypothèse indicative de pilotage.',
      0.450::numeric,
      false,
      50
    ),
    (
      'ESTIMATE_50',
      'Estimation prudente — 50 %',
      'Hypothèse haute intégrant une marge de prudence.',
      0.500::numeric,
      false,
      60
    )
) as preset (
  code,
  name,
  description,
  charge_rate,
  is_default,
  display_order
)
on conflict (
  organization_id,
  code
)
do nothing;

-- ============================================================
-- 5. Initialisation automatique des nouvelles organisations
-- ============================================================

create or replace function
public.seed_default_hr_charge_profiles(
  target_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hr_employer_charge_profiles (
    organization_id,
    code,
    name,
    description,
    charge_rate,
    is_default,
    is_system_preset,
    display_order
  )
  values
    (
      target_organization_id,
      'CUSTOM',
      'Saisie manuelle',
      'Taux libre défini par l’entreprise.',
      0,
      false,
      true,
      10
    ),
    (
      target_organization_id,
      'ESTIMATE_25',
      'Estimation légère — 25 %',
      'Hypothèse indicative de pilotage.',
      0.25,
      false,
      true,
      20
    ),
    (
      target_organization_id,
      'ESTIMATE_35',
      'Estimation intermédiaire — 35 %',
      'Hypothèse indicative de pilotage.',
      0.35,
      false,
      true,
      30
    ),
    (
      target_organization_id,
      'ESTIMATE_42',
      'Estimation standard — 42 %',
      'Hypothèse par défaut modifiable.',
      0.42,
      true,
      true,
      40
    ),
    (
      target_organization_id,
      'ESTIMATE_45',
      'Estimation renforcée — 45 %',
      'Hypothèse indicative de pilotage.',
      0.45,
      false,
      true,
      50
    ),
    (
      target_organization_id,
      'ESTIMATE_50',
      'Estimation prudente — 50 %',
      'Hypothèse haute intégrant une marge de prudence.',
      0.50,
      false,
      true,
      60
    )
  on conflict (
    organization_id,
    code
  )
  do nothing;
end;
$$;

create or replace function
public.initialize_hr_after_organization_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_hr_architecture(new.id);
  perform public.seed_default_hr_charge_profiles(new.id);

  return new;
end;
$$;

-- ============================================================
-- 6. Mise à jour de la vue collaborateurs
-- ============================================================

drop view if exists public.hr_employee_overview;

create view public.hr_employee_overview
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

  contract.compensation_mode,
  contract.annual_gross_salary,
  contract.monthly_gross_salary,
  contract.employer_charge_rate,
  contract.external_daily_rate,
  contract.external_hourly_rate,
  contract.external_overhead_rate,
  contract.gross_hourly_rate,
  contract.loaded_hourly_cost,
  contract.loaded_daily_cost,
  contract.daily_working_hours,

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
  on contract_type.id =
     contract.contract_type_id

left join public.hr_work_schedules work_schedule
  on work_schedule.id =
     contract.work_schedule_id;

grant select
on public.hr_employee_overview
to authenticated;

commit;