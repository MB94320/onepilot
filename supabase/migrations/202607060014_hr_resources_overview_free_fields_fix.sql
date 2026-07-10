-- V5.10 - Ressources : exposition des rattachements libres et rythmes hebdomadaires dans la vue RH.
-- Objectif : permettre aux cartes, tableaux, filtres, exports et fiches Ressources
-- de relire les champs libres réellement sauvegardés sur hr_employees / hr_employee_contracts.

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
  employee.updated_at,

  employee.site_free_text,
  employee.department_free_text,
  employee.job_free_text,
  employee.function_free_text,

  contract.weekly_pattern,
  contract.weekly_work_pattern

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
