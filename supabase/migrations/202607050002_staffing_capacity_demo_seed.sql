do $$
declare
  target_org_slug text := 'onepilot';

  target_organization_id uuid;
  first_employee_id uuid;
  second_employee_id uuid;
  target_client_id uuid;
  target_project_id uuid;
  target_need_id uuid;
  today_monday date;
begin
  select id
  into target_organization_id
  from public.organizations
  where slug = target_org_slug
  limit 1;

  if target_organization_id is null then
    raise exception 'Organisation introuvable pour slug = %. Vérifie public.organizations.slug.', target_org_slug;
  end if;

  select id
  into first_employee_id
  from public.hr_employees
  where organization_id = target_organization_id
    and coalesce(is_active, true) = true
    and employment_status in (
      'preboarding',
      'probation',
      'active',
      'notice_period'
    )
  order by created_at
  limit 1;

  select id
  into second_employee_id
  from public.hr_employees
  where organization_id = target_organization_id
    and coalesce(is_active, true) = true
    and employment_status in (
      'preboarding',
      'probation',
      'active',
      'notice_period'
    )
    and id is distinct from first_employee_id
  order by created_at
  limit 1;

  today_monday :=
    current_date - (extract(isodow from current_date)::int - 1);

  insert into public.project_clients (
    organization_id,
    code,
    name,
    legal_name,
    client_type,
    status,
    billing_currency,
    default_payment_terms_days
  )
  values (
    target_organization_id,
    'CLIENT-DEMO-001',
    'Client démonstration',
    'Client démonstration SAS',
    'customer',
    'active',
    'EUR',
    30
  )
  on conflict (organization_id, code)
  do update set
    name = excluded.name,
    legal_name = excluded.legal_name,
    status = excluded.status,
    updated_at = now()
  returning id into target_client_id;

  insert into public.project_projects (
    organization_id,
    client_id,
    code,
    name,
    description,
    project_type,
    status,
    priority,
    start_date,
    end_date,
    billing_model,
    budget_amount,
    sold_amount,
    target_margin_rate,
    currency,
    iso9001_critical,
    quality_plan_required
  )
  values (
    target_organization_id,
    target_client_id,
    'PROJ-DEMO-STAFFING',
    'Projet démonstration staffing',
    'Projet de démonstration pour valider le plan de charge, la capacité, les écarts prévu/réel et les arbitrages.',
    'delivery',
    'active',
    'high',
    today_monday - interval '6 weeks',
    today_monday + interval '10 weeks',
    'time_and_material',
    90000,
    130000,
    0.30,
    'EUR',
    true,
    true
  )
  on conflict (organization_id, code)
  do update set
    client_id = excluded.client_id,
    name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    priority = excluded.priority,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    budget_amount = excluded.budget_amount,
    sold_amount = excluded.sold_amount,
    target_margin_rate = excluded.target_margin_rate,
    updated_at = now()
  returning id into target_project_id;

  insert into public.project_staffing_needs (
    organization_id,
    project_id,
    code,
    title,
    description,
    seniority_level,
    staffing_status,
    priority,
    start_date,
    end_date,
    requested_capacity_percent,
    requested_hours,
    target_daily_rate,
    maximum_daily_cost,
    target_margin_rate,
    iso9001_justification,
    decision_comment
  )
  values (
    target_organization_id,
    target_project_id,
    'NEED-DEMO-001',
    'Renfort chef de projet / consultant senior',
    'Besoin de staffing pour absorber un pic de charge projet et sécuriser le planning client.',
    'senior',
    'open',
    'high',
    today_monday - interval '2 weeks',
    today_monday + interval '8 weeks',
    0.80,
    280,
    850,
    520,
    0.30,
    'Besoin critique suivi dans le cadre de la traçabilité staffing et capacité.',
    'Décision à documenter selon disponibilité, compétence et coût chargé.'
  )
  on conflict (organization_id, project_id, code)
  do update set
    title = excluded.title,
    description = excluded.description,
    staffing_status = excluded.staffing_status,
    priority = excluded.priority,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    requested_capacity_percent = excluded.requested_capacity_percent,
    requested_hours = excluded.requested_hours,
    target_daily_rate = excluded.target_daily_rate,
    maximum_daily_cost = excluded.maximum_daily_cost,
    target_margin_rate = excluded.target_margin_rate,
    iso9001_justification = excluded.iso9001_justification,
    decision_comment = excluded.decision_comment,
    updated_at = now()
  returning id into target_need_id;

  delete from public.project_time_entries
  where organization_id = target_organization_id
    and project_id = target_project_id
    and description like 'Réel validé démonstration%';

  delete from public.project_staffing_assignments
  where organization_id = target_organization_id
    and project_id = target_project_id
    and assignment_reason like 'Affectation démonstration%';

  if first_employee_id is not null then
    insert into public.project_staffing_assignments (
      organization_id,
      staffing_need_id,
      project_id,
      employee_id,
      assignment_status,
      start_date,
      end_date,
      allocation_percent,
      planned_hours,
      planned_hourly_cost,
      planned_daily_cost,
      planned_daily_rate,
      billable,
      margin_rate,
      assignment_reason,
      iso9001_decision_trace
    )
    values (
      target_organization_id,
      target_need_id,
      target_project_id,
      first_employee_id,
      'confirmed',
      today_monday - interval '4 weeks',
      today_monday + interval '4 weeks',
      0.80,
      224,
      65,
      455,
      850,
      true,
      0.46,
      'Affectation démonstration principale.',
      'Affectation historisée pour preuve de décision staffing.'
    );
  end if;

  if second_employee_id is not null then
    insert into public.project_staffing_assignments (
      organization_id,
      staffing_need_id,
      project_id,
      employee_id,
      assignment_status,
      start_date,
      end_date,
      allocation_percent,
      planned_hours,
      planned_hourly_cost,
      planned_daily_cost,
      planned_daily_rate,
      billable,
      margin_rate,
      assignment_reason,
      iso9001_decision_trace
    )
    values (
      target_organization_id,
      target_need_id,
      target_project_id,
      second_employee_id,
      'planned',
      today_monday + interval '2 weeks',
      today_monday + interval '8 weeks',
      0.50,
      105,
      58,
      406,
      760,
      true,
      0.47,
      'Affectation démonstration renfort futur.',
      'Affectation planifiée historisée pour arbitrage capacité.'
    );
  end if;

  if first_employee_id is not null then
    insert into public.project_time_entries (
      organization_id,
      project_id,
      employee_id,
      entry_date,
      hours,
      status,
      description,
      submitted_at,
      manager_approved_at
    )
    values
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '3 weeks',
        8,
        'manager_approved',
        'Réel validé démonstration S-3 J1.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '3 weeks' + interval '1 day',
        8,
        'manager_approved',
        'Réel validé démonstration S-3 J2.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '3 weeks' + interval '2 days',
        8,
        'manager_approved',
        'Réel validé démonstration S-3 J3.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '3 weeks' + interval '3 days',
        8,
        'manager_approved',
        'Réel validé démonstration S-3 J4.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '2 weeks',
        8,
        'manager_approved',
        'Réel validé démonstration S-2 J1.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '2 weeks' + interval '1 day',
        8,
        'manager_approved',
        'Réel validé démonstration S-2 J2.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '2 weeks' + interval '2 days',
        8,
        'manager_approved',
        'Réel validé démonstration S-2 J3.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '2 weeks' + interval '3 days',
        8,
        'manager_approved',
        'Réel validé démonstration S-2 J4.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '2 weeks' + interval '4 days',
        6,
        'manager_approved',
        'Réel validé démonstration S-2 J5.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '1 week',
        8,
        'hr_approved',
        'Réel validé démonstration S-1 J1 avec pic de charge.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '1 week' + interval '1 day',
        8,
        'hr_approved',
        'Réel validé démonstration S-1 J2 avec pic de charge.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '1 week' + interval '2 days',
        8,
        'hr_approved',
        'Réel validé démonstration S-1 J3 avec pic de charge.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '1 week' + interval '3 days',
        8,
        'hr_approved',
        'Réel validé démonstration S-1 J4 avec pic de charge.',
        now(),
        now()
      ),
      (
        target_organization_id,
        target_project_id,
        first_employee_id,
        today_monday - interval '1 week' + interval '4 days',
        8,
        'hr_approved',
        'Réel validé démonstration S-1 J5 avec pic de charge.',
        now(),
        now()
      );
  end if;

  raise notice 'Seed staffing terminé pour organisation %, projet %, collaborateur principal %, renfort %.',
    target_organization_id,
    target_project_id,
    first_employee_id,
    second_employee_id;
end;
$$;