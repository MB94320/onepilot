-- Correctifs Absences / congés / RTT / workflow.
-- Objectifs :
-- 1. corriger le bug "malformed array literal" des fonctions de validation ;
-- 2. recalculer précisément les jours décomptés hors week-end et jours fériés ;
-- 3. gérer les demi-journées ;
-- 4. préparer les droits CP / RTT par défaut sur période 01/06/2026 -> 31/05/2027.

create or replace function public.hr_absence_request_has_column(column_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'hr_absence_requests'
      and information_schema.columns.column_name = $1
  );
$$;

create or replace function public.get_french_easter_date(target_year integer)
returns date
language plpgsql
immutable
as $$
declare
  a integer;
  b integer;
  c integer;
  d integer;
  e integer;
  f integer;
  g integer;
  h integer;
  i integer;
  k integer;
  l integer;
  m integer;
  target_month integer;
  target_day integer;
begin
  a := target_year % 19;
  b := floor(target_year / 100);
  c := target_year % 100;
  d := floor(b / 4);
  e := b % 4;
  f := floor((b + 8) / 25);
  g := floor((b - f + 1) / 3);
  h := (19 * a + b - d - g + 15) % 30;
  i := floor(c / 4);
  k := c % 4;
  l := (32 + 2 * e + 2 * i - h - k) % 7;
  m := floor((a + 11 * h + 22 * l) / 451);
  target_month := floor((h + l - 7 * m + 114) / 31);
  target_day := ((h + l - 7 * m + 114) % 31) + 1;

  return make_date(target_year, target_month, target_day);
end;
$$;

create or replace function public.is_french_public_holiday(target_date date)
returns boolean
language sql
immutable
as $$
  with easter as (
    select public.get_french_easter_date(extract(year from target_date)::int) as date_value
  ), holidays as (
    select make_date(extract(year from target_date)::int, 1, 1) as date_value
    union all select (select date_value from easter) + 1
    union all select make_date(extract(year from target_date)::int, 5, 1)
    union all select make_date(extract(year from target_date)::int, 5, 8)
    union all select (select date_value from easter) + 39
    union all select (select date_value from easter) + 50
    union all select make_date(extract(year from target_date)::int, 7, 14)
    union all select make_date(extract(year from target_date)::int, 8, 15)
    union all select make_date(extract(year from target_date)::int, 11, 1)
    union all select make_date(extract(year from target_date)::int, 11, 11)
    union all select make_date(extract(year from target_date)::int, 12, 25)
  )
  select exists (
    select 1
    from holidays
    where date_value = target_date
  );
$$;

create or replace function public.is_hr_capacity_working_day(target_date date)
returns boolean
language sql
immutable
as $$
  select extract(isodow from target_date)::int between 1 and 5
     and not public.is_french_public_holiday(target_date);
$$;

create or replace function public.get_hr_absence_day_amount(
  target_date date,
  target_start_date date,
  target_end_date date,
  target_start_period text,
  target_end_period text
)
returns numeric
language plpgsql
immutable
as $$
declare
  amount numeric := 1;
  start_period text := coalesce(target_start_period, 'full_day');
  end_period text := coalesce(target_end_period, 'full_day');
begin
  if not public.is_hr_capacity_working_day(target_date) then
    return 0;
  end if;

  if target_start_date = target_end_date then
    if start_period = 'afternoon' and end_period = 'morning' then
      return 0;
    end if;

    if start_period = 'morning' and end_period = 'morning' then
      return 0.5;
    end if;

    if start_period = 'afternoon' and end_period = 'afternoon' then
      return 0.5;
    end if;

    return 1;
  end if;

  if target_date = target_start_date and start_period = 'afternoon' then
    amount := amount - 0.5;
  end if;

  if target_date = target_end_date and end_period = 'morning' then
    amount := amount - 0.5;
  end if;

  return greatest(amount, 0);
end;
$$;

create or replace function public.calculate_hr_absence_amount(
  target_employee_id uuid,
  target_start_date date,
  target_end_date date,
  target_start_period text default 'full_day',
  target_end_period text default 'full_day'
)
returns table (
  calendar_days numeric,
  working_days numeric,
  holiday_days numeric,
  non_working_days numeric,
  requested_amount numeric,
  holiday_calendar_id uuid,
  work_schedule_id uuid,
  contract_type_id uuid,
  calculation_details jsonb
)
language plpgsql
stable
as $$
declare
  employee_record record;
begin
  if target_start_date is null or target_end_date is null then
    raise exception 'Les dates de début et de fin sont obligatoires.';
  end if;

  if target_end_date < target_start_date then
    raise exception 'La date de fin ne peut pas précéder la date de début.';
  end if;

  select
    overview.holiday_calendar_id,
    overview.work_schedule_id,
    overview.contract_type_id
  into employee_record
  from public.hr_employee_overview overview
  where overview.id = target_employee_id
  limit 1;

  return query
  with days as (
    select generate_series(target_start_date, target_end_date, interval '1 day')::date as day_date
  ), calculated as (
    select
      day_date,
      extract(isodow from day_date)::int in (6, 7) as is_weekend,
      public.is_french_public_holiday(day_date) as is_holiday,
      public.is_hr_capacity_working_day(day_date) as is_working_day,
      public.get_hr_absence_day_amount(
        day_date,
        target_start_date,
        target_end_date,
        target_start_period,
        target_end_period
      ) as day_amount
    from days
  )
  select
    count(*)::numeric as calendar_days,
    coalesce(sum(day_amount), 0)::numeric as working_days,
    count(*) filter (
      where is_holiday and not is_weekend
    )::numeric as holiday_days,
    count(*) filter (
      where is_weekend
    )::numeric as non_working_days,
    coalesce(sum(day_amount), 0)::numeric as requested_amount,
    employee_record.holiday_calendar_id::uuid as holiday_calendar_id,
    employee_record.work_schedule_id::uuid as work_schedule_id,
    employee_record.contract_type_id::uuid as contract_type_id,
    jsonb_build_object(
      'method', 'working_days_excluding_weekends_and_french_public_holidays',
      'start_period', target_start_period,
      'end_period', target_end_period,
      'days', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', day_date,
            'is_weekend', is_weekend,
            'is_holiday', is_holiday,
            'is_working_day', is_working_day,
            'amount', day_amount
          ) order by day_date
        ),
        '[]'::jsonb
      )
    ) as calculation_details
  from calculated;
end;
$$;

create or replace function public.update_hr_absence_request_status_dynamic(
  target_request_id uuid,
  next_status text,
  actor_user_id uuid default null,
  action_comment text default null
)
returns table (
  organization_id uuid,
  previous_status text,
  final_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
  current_status text;
  assignments text[];
  update_sql text;
begin
  select
    request.organization_id,
    request.status
  into
    target_organization_id,
    current_status
  from public.hr_absence_requests request
  where request.id = target_request_id
  for update;

  if target_organization_id is null then
    raise exception 'Demande d''absence introuvable : %', target_request_id;
  end if;

  assignments := array[
    format('status = %L', next_status)
  ];

  if public.hr_absence_request_has_column('updated_at') then
    assignments := array_append(assignments, 'updated_at = now()');
  end if;

  if public.hr_absence_request_has_column('updated_by') then
    assignments := array_append(assignments, format('updated_by = %L::uuid', actor_user_id));
  end if;

  if next_status = 'manager_approved' then
    if public.hr_absence_request_has_column('manager_approved_at') then
      assignments := array_append(assignments, 'manager_approved_at = now()');
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      assignments := array_append(assignments, format('manager_comment = nullif(%L, '''')', coalesce(action_comment, '')));
    end if;
  end if;

  if next_status = 'approved' then
    if public.hr_absence_request_has_column('approved_at') then
      assignments := array_append(assignments, 'approved_at = now()');
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      assignments := array_append(assignments, format('hr_comment = nullif(%L, '''')', coalesce(action_comment, '')));
    end if;
  end if;

  if next_status = 'rejected' then
    if public.hr_absence_request_has_column('rejected_at') then
      assignments := array_append(assignments, 'rejected_at = now()');
    end if;

    if public.hr_absence_request_has_column('manager_comment') then
      assignments := array_append(assignments, format('manager_comment = coalesce(manager_comment, nullif(%L, ''''))', coalesce(action_comment, '')));
    end if;

    if public.hr_absence_request_has_column('hr_comment') then
      assignments := array_append(assignments, format('hr_comment = coalesce(hr_comment, nullif(%L, ''''))', coalesce(action_comment, '')));
    end if;
  end if;

  update_sql := format(
    'update public.hr_absence_requests set %s where id = %L::uuid',
    array_to_string(assignments, ', '),
    target_request_id
  );

  execute update_sql;

  organization_id := target_organization_id;
  previous_status := current_status;
  final_status := next_status;

  return next;
end;
$$;

create or replace function public.approve_hr_absence_request_manager(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'manager_approved',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status <> 'submitted' then
    raise exception 'Transition interdite : % vers manager_approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'manager_approve',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'manager',
    action_comment
  );

  return target_request_id;
end;
$$;

create or replace function public.approve_hr_absence_request_hr(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'approved',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status not in ('submitted', 'manager_approved') then
    raise exception 'Transition interdite : % vers approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'hr_approve',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'hr',
    action_comment
  );

  return target_request_id;
end;
$$;

create or replace function public.reject_hr_absence_request(
  target_request_id uuid,
  actor_user_id uuid default null,
  actor_employee_id uuid default null,
  action_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  workflow_result record;
begin
  if nullif(trim(coalesce(action_comment, '')), '') is null then
    raise exception 'Un commentaire est obligatoire pour refuser une demande.';
  end if;

  select *
  into workflow_result
  from public.update_hr_absence_request_status_dynamic(
    target_request_id,
    'rejected',
    actor_user_id,
    action_comment
  );

  if workflow_result.previous_status not in ('submitted', 'manager_approved') then
    raise exception 'Transition interdite : % vers rejected.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id,
    request_id,
    action,
    previous_status,
    next_status,
    actor_user_id,
    actor_employee_id,
    actor_role,
    comment
  ) values (
    workflow_result.organization_id,
    target_request_id,
    'reject',
    workflow_result.previous_status,
    workflow_result.final_status,
    actor_user_id,
    actor_employee_id,
    'approver',
    action_comment
  );

  return target_request_id;
end;
$$;

grant execute on function public.calculate_hr_absence_amount(uuid, date, date, text, text) to authenticated;
grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;

-- Préparation CP / RTT par défaut 01/06/2026 -> 31/05/2027.
-- On insère seulement si les types d'absence existent et si aucun solde équivalent n'existe déjà.
do $$
declare
  target_period_start date := date '2026-06-01';
  target_period_end date := date '2027-05-31';
  org_record record;
  absence_type_record record;
  employee_record record;
  entitlement numeric;
begin
  for org_record in
    select id
    from public.organizations
  loop
    for absence_type_record in
      select id, upper(coalesce(code, '')) as code, upper(coalesce(name, '')) as name
      from public.hr_absence_types
      where organization_id = org_record.id
        and coalesce(is_active, true) = true
        and (
          upper(coalesce(code, '')) in ('CP', 'CONGES_PAYES', 'CONGÉS_PAYÉS', 'PAID_LEAVE', 'RTT')
          or upper(coalesce(name, '')) like '%CONG%PAY%'
          or upper(coalesce(name, '')) like '%RTT%'
        )
    loop
      entitlement := case
        when absence_type_record.code = 'RTT' or absence_type_record.name like '%RTT%' then 10
        else 25
      end;

      if exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'hr_absence_entitlement_rules'
      ) then
        insert into public.hr_absence_entitlement_rules (
          organization_id,
          contract_type_id,
          absence_type_id,
          annual_entitlement,
          accrual_frequency,
          accrual_start_month,
          carryover_allowed,
          maximum_carryover,
          prorata_on_arrival,
          prorata_on_departure,
          is_active,
          notes
        )
        select
          org_record.id,
          null,
          absence_type_record.id,
          entitlement,
          'annual',
          6,
          true,
          null,
          true,
          true,
          true,
          case
            when entitlement = 10 then 'Règle RTT par défaut : 10 jours, période 01/06 -> 31/05. À ajuster par entreprise/année.'
            else 'Règle CP par défaut France : 25 jours, période 01/06 -> 31/05. À ajuster par entreprise si besoin.'
          end
        where not exists (
          select 1
          from public.hr_absence_entitlement_rules existing_rule
          where existing_rule.organization_id = org_record.id
            and existing_rule.absence_type_id = absence_type_record.id
            and existing_rule.contract_type_id is null
            and existing_rule.accrual_start_month = 6
        );
      end if;

      for employee_record in
        select id
        from public.hr_employee_overview
        where organization_id = org_record.id
          and coalesce(is_active, true) = true
          and employment_status in ('preboarding', 'probation', 'active', 'notice_period')
      loop
        insert into public.hr_absence_balances (
          organization_id,
          employee_id,
          absence_type_id,
          period_start,
          period_end,
          opening_balance,
          accrued_amount,
          adjustment_amount,
          consumed_amount,
          pending_amount,
          notes,
          annual_entitlement,
          carried_over_amount,
          calculated_at
        )
        select
          org_record.id,
          employee_record.id,
          absence_type_record.id,
          target_period_start,
          target_period_end,
          entitlement,
          0,
          0,
          0,
          0,
          case
            when entitlement = 10 then 'Solde RTT initial par défaut 2026-2027. À ajuster selon accord entreprise.'
            else 'Solde congés payés initial par défaut 2026-2027.'
          end,
          entitlement,
          0,
          now()
        where not exists (
          select 1
          from public.hr_absence_balances existing_balance
          where existing_balance.organization_id = org_record.id
            and existing_balance.employee_id = employee_record.id
            and existing_balance.absence_type_id = absence_type_record.id
            and existing_balance.period_start = target_period_start
            and existing_balance.period_end = target_period_end
        );
      end loop;
    end loop;
  end loop;
end $$;
