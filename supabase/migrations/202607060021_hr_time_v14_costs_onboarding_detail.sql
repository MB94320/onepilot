create extension if not exists pgcrypto;

alter table if exists public.hr_time_activity_entries
  add column if not exists training_cost numeric,
  add column if not exists intercontract_cost numeric,
  add column if not exists loaded_hourly_rate numeric,
  add column if not exists absence_label text,
  add column if not exists project_status text default 'in_progress',
  add column if not exists project_start_date date,
  add column if not exists project_end_date date;

-- La source de vérité des coûts est Ressources / hr_employee_overview.
-- Aucun coût fictif n'est injecté si le coût chargé manque.
update public.hr_time_activity_entries entry
set loaded_hourly_rate = overview.loaded_hourly_cost
from public.hr_employee_overview overview
where overview.organization_id = entry.organization_id
  and overview.id = entry.employee_id
  and overview.loaded_hourly_cost is not null
  and overview.loaded_hourly_cost > 0;

update public.hr_time_activity_entries
set
  avv_cost = case when coalesce(avv_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(avv_hours * loaded_hourly_rate, 2) else null end,
  management_cost = case when coalesce(management_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(management_hours * loaded_hourly_rate, 2) else null end,
  production_cost = case when coalesce(production_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(production_hours * loaded_hourly_rate, 2) else null end,
  rework_cost = case when coalesce(rework_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(rework_hours * loaded_hourly_rate, 2) else null end,
  training_cost = case when coalesce(training_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(training_hours * loaded_hourly_rate, 2) else null end,
  intercontract_cost = case when coalesce(intercontract_hours, 0) = 0 then 0 when loaded_hourly_rate > 0 then round(intercontract_hours * loaded_hourly_rate, 2) else null end,
  expense_hours = 0,
  week_number = extract(week from activity_date)::integer,
  month_number = extract(month from activity_date)::integer,
  month_label = initcap(to_char(activity_date, 'TMMonth')),
  project_start_date = coalesce(project_start_date, date_trunc('month', activity_date)::date),
  project_status = coalesce(project_status, 'in_progress')
where organization_id is not null;

update public.hr_time_activity_entries
set total_hours = round(
      coalesce(avv_hours,0) + coalesce(management_hours,0) + coalesce(production_hours,0) +
      coalesce(rework_hours,0) + coalesce(training_hours,0) + coalesce(intercontract_hours,0), 2),
    total_cost = case
      when loaded_hourly_rate is null
       and (coalesce(avv_hours,0) + coalesce(management_hours,0) + coalesce(production_hours,0) + coalesce(rework_hours,0) + coalesce(training_hours,0) + coalesce(intercontract_hours,0)) > 0
      then null
      else round(
        coalesce(avv_cost,0) + coalesce(management_cost,0) + coalesce(production_cost,0) +
        coalesce(rework_cost,0) + coalesce(training_cost,0) + coalesce(intercontract_cost,0) +
        coalesce(purchase_cost,0) + coalesce(expense_cost,0), 2)
    end
where organization_id is not null;

-- Compléter le projet intercontrat annuel uniquement avec des ressources ayant un coût chargé réel.
do $$
declare
  org record;
  employee record;
  idx integer;
  d date;
  hours_value numeric;
begin
  for org in select id from public.organizations loop
    idx := 0;
    for employee in
      select id, loaded_hourly_cost
      from public.hr_employee_overview
      where organization_id = org.id
      order by created_at nulls last, id
      limit 12
    loop
      idx := idx + 1;
      hours_value := case when idx % 3 = 0 then 4.5 else 2.5 end;
      for d in select generate_series(date '2026-07-13', date '2026-07-17', interval '1 day')::date loop
        if not exists (
          select 1 from public.hr_time_activity_entries e
          where e.organization_id = org.id and e.employee_id = employee.id
            and e.project_number = 'IC-2026-0001' and e.activity_date = d
        ) then
          insert into public.hr_time_activity_entries(
            organization_id, employee_id, activity_date, activity_type, duration_hours, status,
            project_number, project_designation, project_status, project_start_date,
            intercontract_hours, intercontract_cost, loaded_hourly_rate,
            week_number, month_number, month_label, expense_cost, purchase_cost,
            total_hours, total_cost, validation_manager_status, comments, description
          ) values (
            org.id, employee.id, d, 'intercontract', hours_value, 'submitted',
            'IC-2026-0001', 'Intercontrat annuel 2026', 'in_progress', date '2026-01-01',
            hours_value,
            case when employee.loaded_hourly_cost > 0 then round(hours_value * employee.loaded_hourly_cost, 2) else null end,
            employee.loaded_hourly_cost,
            extract(week from d)::integer, extract(month from d)::integer, initcap(to_char(d, 'TMMonth')),
            0, 0, hours_value,
            case when employee.loaded_hourly_cost > 0 then round(hours_value * employee.loaded_hourly_cost, 2) else null end,
            'submitted', 'Intercontrat déclaré pour suivi capacité/staffing.', 'Intercontrat annuel.'
          );
        end if;
      end loop;
    end loop;
  end loop;
end $$;

update public.hr_onboarding_plans
set checklist_items = coalesce(checklist_items, '[]'::jsonb)
where checklist_items is null;
