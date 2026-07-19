-- ONEPILOT RH lot 2 V13
-- Stabilisation données de pointage : totaux, frais en €, intercontrat annuel et lignes de démonstration IC.

update public.hr_time_activity_entries
set
  expense_cost = coalesce(expense_cost, expense_hours, 0),
  expense_hours = 0
where organization_id is not null;

update public.hr_time_activity_entries
set
  total_hours = coalesce(avv_hours, 0)
    + coalesce(management_hours, 0)
    + coalesce(production_hours, 0)
    + coalesce(rework_hours, 0)
    + coalesce(training_hours, 0)
    + coalesce(intercontract_hours, 0),
  total_cost = coalesce(avv_cost, 0)
    + coalesce(management_cost, 0)
    + coalesce(production_cost, 0)
    + coalesce(rework_cost, 0)
    + coalesce(purchase_cost, 0)
    + coalesce(expense_cost, 0),
  updated_at = now()
where organization_id is not null;

do $$
declare
  org record;
  employee record;
  employee_index integer;
  v_year integer := extract(year from current_date)::integer;
  v_day date;
  v_hourly_cost numeric := 75;
begin
  for org in select id from public.organizations loop
    employee_index := 0;

    for employee in
      select id, manager_employee_id
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 12
    loop
      employee_index := employee_index + 1;
      v_day := make_date(v_year, 7, 13) + ((employee_index - 1) % 5);

      insert into public.hr_time_activity_entries (
        organization_id,
        employee_id,
        activity_date,
        activity_type,
        duration_hours,
        status,
        project_number,
        project_designation,
        avv_hours,
        management_hours,
        production_hours,
        rework_hours,
        training_hours,
        intercontract_hours,
        avv_cost,
        management_cost,
        production_cost,
        rework_cost,
        purchase_cost,
        expense_cost,
        expense_hours,
        total_hours,
        total_cost,
        comments,
        description,
        validation_manager_status,
        manager_comment,
        week_number,
        month_number,
        month_label,
        time_entry_status
      )
      select
        org.id,
        employee.id,
        v_day,
        'intercontract',
        4.5,
        'submitted',
        'IC-' || v_year::text || '-0001',
        'Intercontrat annuel ' || v_year::text,
        0,
        0,
        0,
        0,
        0,
        4.5,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        4.5,
        4.5 * v_hourly_cost,
        'Pointage intercontrat de démonstration pour suivi IC annuel.',
        'Intercontrat annuel : uniquement la rubrique IC doit être alimentée.',
        'submitted',
        'À valider par le N+1 lors de la clôture hebdomadaire.',
        extract(week from v_day)::integer,
        extract(month from v_day)::integer,
        trim(to_char(v_day, 'TMMonth YYYY')),
        'weekly_draft'
      where not exists (
        select 1
        from public.hr_time_activity_entries existing
        where existing.organization_id = org.id
          and existing.employee_id = employee.id
          and existing.project_number = 'IC-' || v_year::text || '-0001'
          and existing.activity_date = v_day
      );
    end loop;
  end loop;
end $$;
