-- ============================================================
-- ONEPILOT
-- 003_hr_member_create_rpc.sql
--
-- Création atomique d'un collaborateur et de son contrat.
-- ============================================================

begin;

-- Suppression sécurisée d'une éventuelle version précédente.
do $$
declare
  function_signature text;
begin
  for function_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_hr_employee_with_contract'
  loop
    execute format(
      'drop function if exists %s cascade',
      function_signature
    );
  end loop;
end;
$$;

create function public.create_hr_employee_with_contract(
  target_organization_id uuid,

  employee_first_name text,
  employee_last_name text,

  employee_title text default null,
  employee_preferred_name text default null,

  employee_birth_date date default null,
  employee_birth_city text default null,
  employee_birth_country_code text default 'FR',

  employee_professional_email text default null,
  employee_personal_email text default null,
  employee_professional_phone text default null,
  employee_personal_phone text default null,

  employee_address_line_1 text default null,
  employee_address_line_2 text default null,
  employee_postal_code text default null,
  employee_city text default null,
  employee_region text default null,
  employee_country_code text default 'FR',

  employee_site_id uuid default null,
  employee_department_id uuid default null,
  employee_job_id uuid default null,
  employee_function_id uuid default null,
  employee_manager_id uuid default null,

  employee_arrival_date date default null,
  employee_experience_years numeric default 0,
  employee_employment_status text default 'active',
  employee_comments text default null,

  contract_type_id_value uuid default null,
  work_schedule_id_value uuid default null,

  contract_start_date date default null,
  contract_end_date date default null,

  contract_employment_status text default 'non_cadre',
  contract_working_time_type text default 'full_time',
  contract_activity_rate numeric default 1,

  contract_weekly_hours numeric default null,
  contract_annual_working_days integer default null,

  contract_annual_gross_salary numeric default null,
  contract_employer_charge_rate numeric default 0,

  contract_probation_start_date date default null,
  contract_probation_end_date date default null,
  contract_probation_duration_months numeric default null,
  contract_probation_renewable boolean default false,

  contract_notice_duration_months numeric default null,
  contract_status text default 'active',

  contract_comments text default null
)
returns table (
  employee_id uuid,
  employee_number text,
  contract_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_employee_id uuid;
  created_employee_number text;
  created_contract_id uuid;
  effective_contract_start_date date;
begin
  -- ==========================================================
  -- 1. Contrôle de l'utilisateur connecté
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Vous devez être authentifié pour créer un collaborateur.';
  end if;

  if not public.has_organization_role(
    target_organization_id,
    array[
      'owner',
      'admin',
      'super_admin',
      'rh',
      'hr',
      'direction'
    ]
  ) then
    raise exception
      'Vous ne disposez pas des droits nécessaires pour créer un collaborateur.';
  end if;

  -- ==========================================================
  -- 2. Contrôles des informations obligatoires
  -- ==========================================================

  if employee_first_name is null
     or length(trim(employee_first_name)) = 0 then
    raise exception
      'Le prénom du collaborateur est obligatoire.';
  end if;

  if employee_last_name is null
     or length(trim(employee_last_name)) = 0 then
    raise exception
      'Le nom du collaborateur est obligatoire.';
  end if;

  if employee_experience_years is not null
     and employee_experience_years < 0 then
    raise exception
      'Le nombre d''années d''expérience ne peut pas être négatif.';
  end if;

  if contract_activity_rate is not null
     and (
       contract_activity_rate <= 0
       or contract_activity_rate > 1
     ) then
    raise exception
      'Le taux d''activité doit être supérieur à 0 et inférieur ou égal à 1.';
  end if;

  if contract_end_date is not null
     and contract_start_date is not null
     and contract_end_date < contract_start_date then
    raise exception
      'La date de fin du contrat ne peut pas précéder sa date de début.';
  end if;

  if contract_probation_end_date is not null
     and contract_probation_start_date is not null
     and contract_probation_end_date < contract_probation_start_date then
    raise exception
      'La date de fin de période d''essai ne peut pas précéder sa date de début.';
  end if;

  -- ==========================================================
  -- 3. Contrôle de l'organisation
  -- ==========================================================

  if not exists (
    select 1
    from public.organizations organization_row
    where organization_row.id = target_organization_id
  ) then
    raise exception
      'L''organisation sélectionnée est introuvable.';
  end if;

  -- ==========================================================
  -- 4. Contrôle des référentiels
  -- ==========================================================

  if employee_site_id is not null
     and not exists (
       select 1
       from public.hr_sites site
       where site.id = employee_site_id
         and site.organization_id = target_organization_id
         and site.is_active = true
     ) then
    raise exception
      'Le site sélectionné est invalide pour cette organisation.';
  end if;

  if employee_department_id is not null
     and not exists (
       select 1
       from public.hr_departments department
       where department.id = employee_department_id
         and department.organization_id = target_organization_id
         and department.is_active = true
     ) then
    raise exception
      'Le département sélectionné est invalide pour cette organisation.';
  end if;

  if employee_job_id is not null
     and not exists (
       select 1
       from public.hr_jobs job
       where job.id = employee_job_id
         and job.organization_id = target_organization_id
         and job.is_active = true
     ) then
    raise exception
      'Le métier sélectionné est invalide pour cette organisation.';
  end if;

  if employee_function_id is not null
     and not exists (
       select 1
       from public.hr_functions function_row
       where function_row.id = employee_function_id
         and function_row.organization_id = target_organization_id
         and function_row.is_active = true
     ) then
    raise exception
      'La fonction sélectionnée est invalide pour cette organisation.';
  end if;

  if employee_manager_id is not null
     and not exists (
       select 1
       from public.hr_employees manager
       where manager.id = employee_manager_id
         and manager.organization_id = target_organization_id
         and manager.is_active = true
     ) then
    raise exception
      'Le manager sélectionné est invalide pour cette organisation.';
  end if;

  if contract_type_id_value is not null
     and not exists (
       select 1
       from public.hr_contract_types contract_type
       where contract_type.id = contract_type_id_value
         and contract_type.organization_id = target_organization_id
         and contract_type.is_active = true
     ) then
    raise exception
      'Le type de contrat sélectionné est invalide pour cette organisation.';
  end if;

  if work_schedule_id_value is not null
     and not exists (
       select 1
       from public.hr_work_schedules work_schedule
       where work_schedule.id = work_schedule_id_value
         and work_schedule.organization_id = target_organization_id
         and work_schedule.is_active = true
     ) then
    raise exception
      'Le rythme de travail sélectionné est invalide pour cette organisation.';
  end if;

  -- ==========================================================
  -- 5. Unicité de l'email professionnel
  -- ==========================================================

  if employee_professional_email is not null
     and length(trim(employee_professional_email)) > 0
     and exists (
       select 1
       from public.hr_employees existing_employee
       where existing_employee.organization_id =
             target_organization_id
         and lower(existing_employee.professional_email) =
             lower(trim(employee_professional_email))
     ) then
    raise exception
      'Un collaborateur utilise déjà cette adresse email professionnelle.';
  end if;

  -- ==========================================================
  -- 6. Création de la fiche collaborateur
  -- ==========================================================

  insert into public.hr_employees (
    organization_id,
    employee_number,

    title,
    first_name,
    last_name,
    preferred_name,

    birth_date,
    birth_city,
    birth_country_code,

    professional_email,
    personal_email,
    professional_phone,
    personal_phone,

    address_line_1,
    address_line_2,
    postal_code,
    city,
    region,
    country_code,

    site_id,
    department_id,
    job_id,
    function_id,
    manager_employee_id,

    arrival_date,
    experience_years,
    employment_status,

    comments,

    is_active,

    created_by,
    updated_by
  )
  values (
    target_organization_id,
    public.generate_hr_employee_number(
      target_organization_id
    ),

    nullif(trim(employee_title), ''),
    trim(employee_first_name),
    trim(employee_last_name),
    nullif(trim(employee_preferred_name), ''),

    employee_birth_date,
    nullif(trim(employee_birth_city), ''),
    coalesce(
      nullif(trim(employee_birth_country_code), ''),
      'FR'
    ),

    nullif(lower(trim(employee_professional_email)), ''),
    nullif(lower(trim(employee_personal_email)), ''),
    nullif(trim(employee_professional_phone), ''),
    nullif(trim(employee_personal_phone), ''),

    nullif(trim(employee_address_line_1), ''),
    nullif(trim(employee_address_line_2), ''),
    nullif(trim(employee_postal_code), ''),
    nullif(trim(employee_city), ''),
    nullif(trim(employee_region), ''),
    coalesce(
      nullif(trim(employee_country_code), ''),
      'FR'
    ),

    employee_site_id,
    employee_department_id,
    employee_job_id,
    employee_function_id,
    employee_manager_id,

    employee_arrival_date,
    coalesce(employee_experience_years, 0),
    coalesce(
      nullif(trim(employee_employment_status), ''),
      'active'
    ),

    nullif(trim(employee_comments), ''),

    true,

    auth.uid(),
    auth.uid()
  )
  returning
    id,
    hr_employees.employee_number
  into
    created_employee_id,
    created_employee_number;

  -- ==========================================================
  -- 7. Création du contrat principal
  -- ==========================================================

  effective_contract_start_date :=
    coalesce(
      contract_start_date,
      employee_arrival_date
    );

  if contract_type_id_value is not null
     or work_schedule_id_value is not null
     or effective_contract_start_date is not null
     or contract_annual_gross_salary is not null then

    if effective_contract_start_date is null then
      raise exception
        'La date de début du contrat est obligatoire lorsqu''un contrat est créé.';
    end if;

    insert into public.hr_employee_contracts (
      organization_id,
      employee_id,

      contract_type_id,
      work_schedule_id,

      start_date,
      end_date,

      employment_status,
      working_time_type,
      activity_rate,

      weekly_hours,
      annual_working_days,

      annual_gross_salary,
      employer_charge_rate,

      probation_start_date,
      probation_end_date,
      probation_duration_months,
      probation_renewable,

      notice_duration_months,

      status,
      is_primary,
      is_active,

      comments,

      created_by,
      updated_by
    )
    values (
      target_organization_id,
      created_employee_id,

      contract_type_id_value,
      work_schedule_id_value,

      effective_contract_start_date,
      contract_end_date,

      coalesce(
        nullif(trim(contract_employment_status), ''),
        'non_cadre'
      ),

      coalesce(
        nullif(trim(contract_working_time_type), ''),
        'full_time'
      ),

      coalesce(contract_activity_rate, 1),

      contract_weekly_hours,
      contract_annual_working_days,

      contract_annual_gross_salary,
      coalesce(contract_employer_charge_rate, 0),

      contract_probation_start_date,
      contract_probation_end_date,
      contract_probation_duration_months,
      coalesce(contract_probation_renewable, false),

      contract_notice_duration_months,

      coalesce(
        nullif(trim(contract_status), ''),
        'active'
      ),

      true,
      true,

      nullif(trim(contract_comments), ''),

      auth.uid(),
      auth.uid()
    )
    returning id
    into created_contract_id;
  end if;

  return query
  select
    created_employee_id,
    created_employee_number,
    created_contract_id;
end;
$$;

-- ============================================================
-- Attribution dynamique des droits sur la fonction créée.
-- Cela évite les erreurs de signature PostgreSQL.
-- ============================================================

do $$
declare
  function_signature text;
begin
  select p.oid::regprocedure::text
  into function_signature
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_hr_employee_with_contract'
  order by p.oid desc
  limit 1;

  if function_signature is null then
    raise exception
      'La fonction create_hr_employee_with_contract est introuvable.';
  end if;

  execute format(
    'revoke all on function %s from public',
    function_signature
  );

  execute format(
    'grant execute on function %s to authenticated',
    function_signature
  );
end;
$$;

commit;