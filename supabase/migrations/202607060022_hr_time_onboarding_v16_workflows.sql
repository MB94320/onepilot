-- ONEPILOT RH Lot 2 V16
-- Pointages : cohérence absences/jours fériés, validation N+1, dédoublonnage journalier.
-- Onboarding : un parcours actif par ressource et champs décisionnels détaillés.

alter table if exists public.hr_time_activity_entries
  add column if not exists manager_validated_at timestamptz,
  add column if not exists manager_validated_by uuid,
  add column if not exists manager_rejected_at timestamptz,
  add column if not exists manager_rejection_reason text,
  add column if not exists submitted_at timestamptz;

alter table if exists public.hr_onboarding_plans
  add column if not exists decision_score numeric(5,2),
  add column if not exists decision_comment text,
  add column if not exists risk_comment text,
  add column if not exists manager_validation_status text default 'pending',
  add column if not exists hr_validation_status text default 'pending',
  add column if not exists probation_validation_status text default 'pending';

-- Les mois sont stockés en français, indépendamment de la locale PostgreSQL.
update public.hr_time_activity_entries
set month_number = extract(month from activity_date)::integer,
    week_number = extract(week from activity_date)::integer,
    month_label = case extract(month from activity_date)::integer
      when 1 then 'Janvier'
      when 2 then 'Février'
      when 3 then 'Mars'
      when 4 then 'Avril'
      when 5 then 'Mai'
      when 6 then 'Juin'
      when 7 then 'Juillet'
      when 8 then 'Août'
      when 9 then 'Septembre'
      when 10 then 'Octobre'
      when 11 then 'Novembre'
      when 12 then 'Décembre'
    end
where activity_date is not null;

-- Une absence validée neutralise les pointages, achats et frais du jour.
update public.hr_time_activity_entries entry
set avv_hours = 0,
    management_hours = 0,
    production_hours = 0,
    rework_hours = 0,
    training_hours = 0,
    intercontract_hours = 0,
    duration_hours = 0,
    avv_cost = 0,
    management_cost = 0,
    production_cost = 0,
    rework_cost = 0,
    training_cost = 0,
    intercontract_cost = 0,
    purchase_cost = 0,
    expense_cost = 0,
    total_hours = 0,
    total_cost = 0,
    absence_label = coalesce(
      (
        select request.absence_type_name
        from public.hr_absence_request_overview request
        where request.organization_id = entry.organization_id
          and request.employee_id = entry.employee_id
          and request.status in ('manager_approved', 'approved')
          and entry.activity_date between request.start_date and request.end_date
        order by request.updated_at desc nulls last
        limit 1
      ),
      'Absence validée'
    ),
    comments = coalesce(entry.comments, 'Pointage neutralisé automatiquement : absence validée.'),
    updated_at = now()
where exists (
  select 1
  from public.hr_absence_request_overview request
  where request.organization_id = entry.organization_id
    and request.employee_id = entry.employee_id
    and request.status in ('manager_approved', 'approved')
    and entry.activity_date between request.start_date and request.end_date
    and not public.is_french_public_holiday(entry.activity_date)
);

-- Les jours fériés français sont toujours non pointables, y compris au milieu d'une absence.
update public.hr_time_activity_entries
set avv_hours = 0,
    management_hours = 0,
    production_hours = 0,
    rework_hours = 0,
    training_hours = 0,
    intercontract_hours = 0,
    duration_hours = 0,
    avv_cost = 0,
    management_cost = 0,
    production_cost = 0,
    rework_cost = 0,
    training_cost = 0,
    intercontract_cost = 0,
    purchase_cost = 0,
    expense_cost = 0,
    total_hours = 0,
    total_cost = 0,
    absence_label = 'Férié',
    comments = coalesce(comments, 'Pointage neutralisé automatiquement : jour férié.'),
    updated_at = now()
where public.is_french_public_holiday(activity_date);

-- Consolidation : une seule ligne active par organisation, ressource, projet et jour.
-- Les heures/rubriques de lignes historiques sont additionnées sur la ligne la plus récente.
with grouped as (
  select
    organization_id,
    employee_id,
    coalesce(project_number, 'NON-RENSEIGNE') as project_key,
    activity_date,
    (array_agg(id order by updated_at desc nulls last, created_at desc nulls last, id desc))[1] as keeper_id,
    sum(coalesce(avv_hours, 0)) as avv_hours,
    sum(coalesce(management_hours, 0)) as management_hours,
    sum(coalesce(production_hours, 0)) as production_hours,
    sum(coalesce(rework_hours, 0)) as rework_hours,
    sum(coalesce(training_hours, 0)) as training_hours,
    sum(coalesce(intercontract_hours, 0)) as intercontract_hours,
    sum(coalesce(purchase_cost, 0)) as purchase_cost,
    sum(coalesce(expense_cost, 0)) as expense_cost,
    max(loaded_hourly_rate) as loaded_hourly_rate,
    count(*) as row_count
  from public.hr_time_activity_entries
  where archived_at is null
  group by organization_id, employee_id, coalesce(project_number, 'NON-RENSEIGNE'), activity_date
), updated_keeper as (
  update public.hr_time_activity_entries entry
  set avv_hours = grouped.avv_hours,
      management_hours = grouped.management_hours,
      production_hours = grouped.production_hours,
      rework_hours = grouped.rework_hours,
      training_hours = grouped.training_hours,
      intercontract_hours = grouped.intercontract_hours,
      purchase_cost = grouped.purchase_cost,
      expense_cost = grouped.expense_cost,
      loaded_hourly_rate = coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate),
      total_hours = round(grouped.avv_hours + grouped.management_hours + grouped.production_hours + grouped.rework_hours + grouped.training_hours + grouped.intercontract_hours, 2),
      avv_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.avv_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      management_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.management_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      production_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.production_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      rework_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.rework_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      training_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.training_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      intercontract_cost = case when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(grouped.intercontract_hours * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate), 2) else null end,
      total_cost = case
        when coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate) > 0 then round(
          (grouped.avv_hours + grouped.management_hours + grouped.production_hours + grouped.rework_hours + grouped.training_hours + grouped.intercontract_hours)
          * coalesce(grouped.loaded_hourly_rate, entry.loaded_hourly_rate)
          + grouped.purchase_cost + grouped.expense_cost,
          2
        )
        when (grouped.avv_hours + grouped.management_hours + grouped.production_hours + grouped.rework_hours + grouped.training_hours + grouped.intercontract_hours) = 0
          then round(grouped.purchase_cost + grouped.expense_cost, 2)
        else null
      end,
      updated_at = now()
  from grouped
  where entry.id = grouped.keeper_id
  returning entry.id
)
update public.hr_time_activity_entries duplicate
set status = 'archived',
    archived_at = now(),
    comments = coalesce(duplicate.comments, 'Ligne archivée lors de la consolidation quotidienne V16.'),
    updated_at = now()
from grouped
where grouped.row_count > 1
  and duplicate.organization_id = grouped.organization_id
  and duplicate.employee_id = grouped.employee_id
  and coalesce(duplicate.project_number, 'NON-RENSEIGNE') = grouped.project_key
  and duplicate.activity_date = grouped.activity_date
  and duplicate.id <> grouped.keeper_id
  and duplicate.archived_at is null;

create unique index if not exists uq_hr_time_activity_active_employee_project_day
  on public.hr_time_activity_entries (organization_id, employee_id, (coalesce(project_number, 'NON-RENSEIGNE')), activity_date)
  where archived_at is null;

-- Nettoyage des doublons onboarding : la ligne active la plus récente est conservée.
with ranked as (
  select id,
         row_number() over (
           partition by organization_id, employee_id
           order by archived_at nulls first, updated_at desc nulls last, created_at desc nulls last, id desc
         ) as row_number
  from public.hr_onboarding_plans
  where archived_at is null
)
update public.hr_onboarding_plans plan
set status = 'archived',
    archived_at = now(),
    notes = coalesce(plan.notes, 'Parcours archivé lors du dédoublonnage V16.'),
    updated_at = now()
from ranked
where ranked.id = plan.id
  and ranked.row_number > 1;

create unique index if not exists uq_hr_onboarding_active_employee
  on public.hr_onboarding_plans (organization_id, employee_id)
  where archived_at is null;
