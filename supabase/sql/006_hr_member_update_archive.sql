-- ============================================================
-- ONEPILOT
-- 006_hr_member_update_archive.sql
--
-- Fonctions sécurisées pour :
-- - modifier une fiche collaborateur ;
-- - modifier son contrat principal ;
-- - archiver ou réactiver un collaborateur ;
-- - conserver l'historique RH.
-- ============================================================

begin;

-- ============================================================
-- 1. Suppression des anciennes versions éventuelles
-- ============================================================

drop function if exists
public.update_hr_employee_with_contract(
  uuid,
  jsonb
);

drop function if exists
public.set_hr_employee_archived(
  uuid,
  boolean
);

-- ============================================================
-- 2. Modification transactionnelle
-- ============================================================

create function public.update_hr_employee_with_contract(
  target_employee_id uuid,
  changes jsonb
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
  current_employee public.hr_employees%rowtype;
  current_contract public.hr_employee_contracts%rowtype;

  selected_site_id uuid;
  selected_department_id uuid;
  selected_job_id uuid;
  selected_function_id uuid;
  selected_manager_id uuid;

  selected_contract_type_id uuid;
  selected_work_schedule_id uuid;
  selected_charge_profile_id uuid;

  updated_contract_id uuid;
begin
  if auth.uid() is null then
    raise exception
      'Vous devez être authentifié.';
  end if;

  select *
  into current_employee
  from public.hr_employees employee
  where employee.id = target_employee_id
  for update;

  if not found then
    raise exception
      'Le collaborateur demandé est introuvable.';
  end if;

  if not public.has_organization_role(
    current_employee.organization_id,
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
      'Vous ne disposez pas des droits nécessaires.';
  end if;

  select *
  into current_contract
  from public.hr_employee_contracts contract
  where contract.employee_id = target_employee_id
    and contract.organization_id =
        current_employee.organization_id
    and contract.is_primary = true
    and contract.is_active = true
  order by contract.created_at desc
  limit 1
  for update;

  -- ==========================================================
  -- Référentiels collaborateurs
  -- ==========================================================

  selected_site_id :=
    case
      when changes ? 'site_id'
      then nullif(changes ->> 'site_id', '')::uuid
      else current_employee.site_id
    end;

  selected_department_id :=
    case
      when changes ? 'department_id'
      then nullif(
        changes ->> 'department_id',
        ''
      )::uuid
      else current_employee.department_id
    end;

  selected_job_id :=
    case
      when changes ? 'job_id'
      then nullif(changes ->> 'job_id', '')::uuid
      else current_employee.job_id
    end;

  selected_function_id :=
    case
      when changes ? 'function_id'
      then nullif(
        changes ->> 'function_id',
        ''
      )::uuid
      else current_employee.function_id
    end;

  selected_manager_id :=
    case
      when changes ? 'manager_id'
      then nullif(changes ->> 'manager_id', '')::uuid
      else current_employee.manager_employee_id
    end;

  if selected_site_id is not null
     and not exists (
       select 1
       from public.hr_sites site
       where site.id = selected_site_id
         and site.organization_id =
             current_employee.organization_id
         and site.is_active = true
     ) then
    raise exception
      'Le site sélectionné est invalide.';
  end if;

  if selected_department_id is not null
     and not exists (
       select 1
       from public.hr_departments department
       where department.id =
             selected_department_id
         and department.organization_id =
             current_employee.organization_id
         and department.is_active = true
     ) then
    raise exception
      'Le département sélectionné est invalide.';
  end if;

  if selected_job_id is not null
     and not exists (
       select 1
       from public.hr_jobs job
       where job.id = selected_job_id
         and job.organization_id =
             current_employee.organization_id
         and job.is_active = true
     ) then
    raise exception
      'Le métier sélectionné est invalide.';
  end if;

  if selected_function_id is not null
     and not exists (
       select 1
       from public.hr_functions function_row
       where function_row.id =
             selected_function_id
         and function_row.organization_id =
             current_employee.organization_id
         and function_row.is_active = true
     ) then
    raise exception
      'La fonction sélectionnée est invalide.';
  end if;

  if selected_manager_id = target_employee_id then
    raise exception
      'Un collaborateur ne peut pas être son propre manager.';
  end if;

  if selected_manager_id is not null
     and not exists (
       select 1
       from public.hr_employees manager
       where manager.id = selected_manager_id
         and manager.organization_id =
             current_employee.organization_id
         and manager.is_active = true
     ) then
    raise exception
      'Le manager sélectionné est invalide.';
  end if;

  -- ==========================================================
  -- Contrôles métier
  -- ==========================================================

  if changes ? 'first_name'
     and length(
       trim(changes ->> 'first_name')
     ) = 0 then
    raise exception
      'Le prénom est obligatoire.';
  end if;

  if changes ? 'last_name'
     and length(
       trim(changes ->> 'last_name')
     ) = 0 then
    raise exception
      'Le nom est obligatoire.';
  end if;

  if changes ? 'professional_email'
     and nullif(
       trim(changes ->> 'professional_email'),
       ''
     ) is not null
     and exists (
       select 1
       from public.hr_employees employee
       where employee.organization_id =
             current_employee.organization_id
         and employee.id <> target_employee_id
         and lower(employee.professional_email) =
             lower(
               trim(
                 changes ->> 'professional_email'
               )
             )
     ) then
    raise exception
      'Cette adresse email professionnelle est déjà utilisée.';
  end if;

  -- ==========================================================
  -- Mise à jour du collaborateur
  -- ==========================================================

  update public.hr_employees
  set
    title =
      case
        when changes ? 'title'
        then nullif(
          trim(changes ->> 'title'),
          ''
        )
        else title
      end,

    first_name =
      case
        when changes ? 'first_name'
        then trim(changes ->> 'first_name')
        else first_name
      end,

    last_name =
      case
        when changes ? 'last_name'
        then trim(changes ->> 'last_name')
        else last_name
      end,

    preferred_name =
      case
        when changes ? 'preferred_name'
        then nullif(
          trim(changes ->> 'preferred_name'),
          ''
        )
        else preferred_name
      end,

    professional_email =
      case
        when changes ? 'professional_email'
        then nullif(
          lower(
            trim(
              changes ->> 'professional_email'
            )
          ),
          ''
        )
        else professional_email
      end,

    professional_phone =
      case
        when changes ? 'professional_phone'
        then nullif(
          trim(
            changes ->> 'professional_phone'
          ),
          ''
        )
        else professional_phone
      end,

    personal_email =
      case
        when changes ? 'personal_email'
        then nullif(
          lower(
            trim(
              changes ->> 'personal_email'
            )
          ),
          ''
        )
        else personal_email
      end,

    personal_phone =
      case
        when changes ? 'personal_phone'
        then nullif(
          trim(changes ->> 'personal_phone'),
          ''
        )
        else personal_phone
      end,

    arrival_date =
      case
        when changes ? 'arrival_date'
        then nullif(
          changes ->> 'arrival_date',
          ''
        )::date
        else arrival_date
      end,

    departure_date =
      case
        when changes ? 'departure_date'
        then nullif(
          changes ->> 'departure_date',
          ''
        )::date
        else departure_date
      end,

    experience_years =
      case
        when changes ? 'experience_years'
        then coalesce(
          nullif(
            changes ->> 'experience_years',
            ''
          )::numeric,
          0
        )
        else experience_years
      end,

    employment_status =
      case
        when changes ? 'employment_status'
        then changes ->> 'employment_status'
        else employment_status
      end,

    site_id = selected_site_id,
    department_id = selected_department_id,
    job_id = selected_job_id,
    function_id = selected_function_id,
    manager_employee_id = selected_manager_id,

    comments =
      case
        when changes ? 'comments'
        then nullif(
          trim(changes ->> 'comments'),
          ''
        )
        else comments
      end,

    updated_by = auth.uid(),
    updated_at = now()

  where id = target_employee_id;

  -- ==========================================================
  -- Mise à jour du contrat principal
  -- ==========================================================

  if current_contract.id is not null then
    selected_contract_type_id :=
      case
        when changes ? 'contract_type_id'
        then nullif(
          changes ->> 'contract_type_id',
          ''
        )::uuid
        else current_contract.contract_type_id
      end;

    selected_work_schedule_id :=
      case
        when changes ? 'work_schedule_id'
        then nullif(
          changes ->> 'work_schedule_id',
          ''
        )::uuid
        else current_contract.work_schedule_id
      end;

    selected_charge_profile_id :=
      case
        when changes ?
             'employer_charge_profile_id'
        then nullif(
          changes ->>
          'employer_charge_profile_id',
          ''
        )::uuid
        else
          current_contract.employer_charge_profile_id
      end;

    if selected_contract_type_id is not null
       and not exists (
         select 1
         from public.hr_contract_types contract_type
         where contract_type.id =
               selected_contract_type_id
           and contract_type.organization_id =
               current_employee.organization_id
           and contract_type.is_active = true
       ) then
      raise exception
        'Le type de contrat sélectionné est invalide.';
    end if;

    if selected_work_schedule_id is not null
       and not exists (
         select 1
         from public.hr_work_schedules schedule
         where schedule.id =
               selected_work_schedule_id
           and schedule.organization_id =
               current_employee.organization_id
           and schedule.is_active = true
       ) then
      raise exception
        'Le rythme de travail sélectionné est invalide.';
    end if;

    if selected_charge_profile_id is not null
       and not exists (
         select 1
         from public.hr_employer_charge_profiles profile
         where profile.id =
               selected_charge_profile_id
           and profile.organization_id =
               current_employee.organization_id
           and profile.is_active = true
       ) then
      raise exception
        'Le profil de charges est invalide.';
    end if;

    update public.hr_employee_contracts
    set
      contract_type_id =
        selected_contract_type_id,

      work_schedule_id =
        selected_work_schedule_id,

      start_date =
        case
          when changes ? 'contract_start_date'
          then nullif(
            changes ->> 'contract_start_date',
            ''
          )::date
          else start_date
        end,

      end_date =
        case
          when changes ? 'contract_end_date'
          then nullif(
            changes ->> 'contract_end_date',
            ''
          )::date
          else end_date
        end,

      status =
        case
          when changes ? 'contract_status'
          then changes ->> 'contract_status'
          else status
        end,

      employment_status =
        case
          when changes ?
               'contract_employment_status'
          then changes ->>
               'contract_employment_status'
          else employment_status
        end,

      working_time_type =
        case
          when changes ? 'working_time_type'
          then changes ->> 'working_time_type'
          else working_time_type
        end,

      activity_rate =
        case
          when changes ? 'activity_rate'
          then nullif(
            changes ->> 'activity_rate',
            ''
          )::numeric
          else activity_rate
        end,

      weekly_hours =
        case
          when changes ? 'weekly_hours'
          then nullif(
            changes ->> 'weekly_hours',
            ''
          )::numeric
          else weekly_hours
        end,

      annual_working_days =
        case
          when changes ? 'annual_working_days'
          then nullif(
            changes ->> 'annual_working_days',
            ''
          )::integer
          else annual_working_days
        end,

      daily_working_hours =
        case
          when changes ? 'daily_working_hours'
          then nullif(
            changes ->> 'daily_working_hours',
            ''
          )::numeric
          else daily_working_hours
        end,

      compensation_mode =
        case
          when changes ? 'compensation_mode'
          then changes ->> 'compensation_mode'
          else compensation_mode
        end,

      annual_gross_salary =
        case
          when changes ? 'annual_gross_salary'
          then nullif(
            changes ->> 'annual_gross_salary',
            ''
          )::numeric
          else annual_gross_salary
        end,

      employer_charge_profile_id =
        selected_charge_profile_id,

      employer_charge_rate =
        case
          when changes ? 'employer_charge_rate'
          then coalesce(
            nullif(
              changes ->> 'employer_charge_rate',
              ''
            )::numeric,
            0
          )
          else employer_charge_rate
        end,

      external_daily_rate =
        case
          when changes ? 'external_daily_rate'
          then nullif(
            changes ->> 'external_daily_rate',
            ''
          )::numeric
          else external_daily_rate
        end,

      external_hourly_rate =
        case
          when changes ? 'external_hourly_rate'
          then nullif(
            changes ->> 'external_hourly_rate',
            ''
          )::numeric
          else external_hourly_rate
        end,

      external_overhead_rate =
        case
          when changes ?
               'external_overhead_rate'
          then coalesce(
            nullif(
              changes ->
              'external_overhead_rate',
              'null'::jsonb
            )::text::numeric,
            0
          )
          else external_overhead_rate
        end,

      comments =
        case
          when changes ? 'contract_comments'
          then nullif(
            trim(
              changes ->> 'contract_comments'
            ),
            ''
          )
          else comments
        end,

      updated_by = auth.uid(),
      updated_at = now()

    where id = current_contract.id

    returning id
    into updated_contract_id;
  end if;

  return query
  select
    current_employee.id,
    current_employee.employee_number,
    updated_contract_id;
end;
$$;

-- ============================================================
-- 3. Archivage et réactivation
-- ============================================================

create function public.set_hr_employee_archived(
  target_employee_id uuid,
  archived boolean
)
returns table (
  employee_id uuid,
  employment_status text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_employee public.hr_employees%rowtype;
begin
  if auth.uid() is null then
    raise exception
      'Vous devez être authentifié.';
  end if;

  select *
  into current_employee
  from public.hr_employees employee
  where employee.id = target_employee_id
  for update;

  if not found then
    raise exception
      'Le collaborateur demandé est introuvable.';
  end if;

  if not public.has_organization_role(
    current_employee.organization_id,
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
      'Vous ne disposez pas des droits nécessaires.';
  end if;

  update public.hr_employees
  set
    employment_status =
      case
        when archived then 'archived'
        else 'active'
      end,

    is_active = not archived,

    updated_by = auth.uid(),
    updated_at = now()

  where id = target_employee_id;

  if archived then
    update public.hr_employee_contracts
    set
      status = 'archived',
      is_active = false,
      updated_by = auth.uid(),
      updated_at = now()
    where employee_id = target_employee_id
      and organization_id =
          current_employee.organization_id
      and is_active = true;
  end if;

  return query
  select
    employee.id,
    employee.employment_status,
    employee.is_active
  from public.hr_employees employee
  where employee.id = target_employee_id;
end;
$$;

-- ============================================================
-- 4. Droits
-- ============================================================

revoke all
on function public.update_hr_employee_with_contract(
  uuid,
  jsonb
)
from public;

grant execute
on function public.update_hr_employee_with_contract(
  uuid,
  jsonb
)
to authenticated;

revoke all
on function public.set_hr_employee_archived(
  uuid,
  boolean
)
from public;

grant execute
on function public.set_hr_employee_archived(
  uuid,
  boolean
)
to authenticated;

commit;