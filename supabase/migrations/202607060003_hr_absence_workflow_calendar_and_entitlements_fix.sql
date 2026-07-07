-- Correctif Absences V3 : calendrier férié, demi-journées, workflow, archivage auto, droits CP/RTT.

create or replace function public.get_french_easter_date(target_year integer)
returns date
language plpgsql
immutable
as $$
declare
  a integer; b integer; c integer; d integer; e integer; f integer; g integer; h integer; i integer; k integer; l integer; m integer;
  target_month integer; target_day integer;
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
  select exists (select 1 from holidays where date_value = target_date);
$$;

create or replace function public.is_hr_absence_non_working_day(target_date date)
returns boolean
language sql
immutable
as $$
  select extract(isodow from target_date)::int in (6, 7)
      or public.is_french_public_holiday(target_date);
$$;

-- On remplace explicitement la RPC existante : le résultat précédent montrait encore l’ancien body.
drop function if exists public.calculate_hr_absence_amount(uuid, date, date, text, text);

create function public.calculate_hr_absence_amount(
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
      extract(isodow from day_date)::int as iso_weekday,
      extract(isodow from day_date)::int in (6, 7) as is_weekend,
      public.is_french_public_holiday(day_date) as is_holiday,
      case
        when extract(isodow from day_date)::int in (6, 7) then 0::numeric
        when public.is_french_public_holiday(day_date) then 0::numeric
        when target_start_date = target_end_date then
          case
            when coalesce(target_start_period, 'full_day') = 'afternoon'
             and coalesce(target_end_period, 'full_day') = 'morning' then 0::numeric
            when coalesce(target_start_period, 'full_day') in ('morning', 'afternoon')
             and coalesce(target_end_period, 'full_day') in ('morning', 'afternoon') then 0.5::numeric
            else 1::numeric
          end
        when day_date = target_start_date and coalesce(target_start_period, 'full_day') = 'afternoon' then 0.5::numeric
        when day_date = target_end_date and coalesce(target_end_period, 'full_day') = 'morning' then 0.5::numeric
        else 1::numeric
      end as day_amount
    from days
  )
  select
    count(*)::numeric as calendar_days,
    coalesce(sum(day_amount), 0)::numeric as working_days,
    count(*) filter (where is_holiday and not is_weekend)::numeric as holiday_days,
    count(*) filter (where is_weekend)::numeric as non_working_days,
    coalesce(sum(day_amount), 0)::numeric as requested_amount,
    employee_record.holiday_calendar_id::uuid,
    employee_record.work_schedule_id::uuid,
    employee_record.contract_type_id::uuid,
    jsonb_build_object(
      'method', 'working_days_excluding_weekends_and_public_holidays_v3',
      'start_period', target_start_period,
      'end_period', target_end_period,
      'calendar_days', count(*)::numeric,
      'working_days', coalesce(sum(day_amount), 0)::numeric,
      'holiday_days', count(*) filter (where is_holiday and not is_weekend)::numeric,
      'non_working_days', count(*) filter (where is_weekend)::numeric,
      'days', coalesce(jsonb_agg(jsonb_build_object(
        'date', day_date,
        'amount', day_amount,
        'iso_weekday', iso_weekday,
        'is_weekend', is_weekend,
        'is_holiday', is_holiday,
        'is_working_day', day_amount > 0
      ) order by day_date), '[]'::jsonb)
    ) as calculation_details
  from calculated;
end;
$$;

grant execute on function public.calculate_hr_absence_amount(uuid, date, date, text, text) to authenticated;

drop function if exists public.update_hr_absence_request_status_dynamic(uuid, text, uuid, text);

create function public.update_hr_absence_request_status_dynamic(
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
  set_clause text;
  update_sql text;
begin
  select request.organization_id, request.status
  into target_organization_id, current_status
  from public.hr_absence_requests request
  where request.id = target_request_id
  for update;

  if target_organization_id is null then
    raise exception 'Demande d''absence introuvable : %', target_request_id;
  end if;

  set_clause := format('status = %L', next_status);

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='updated_at') then
    set_clause := set_clause || ', updated_at = now()';
  end if;

  if actor_user_id is not null and exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='updated_by') then
    set_clause := set_clause || format(', updated_by = %L::uuid', actor_user_id);
  end if;

  if next_status = 'manager_approved' then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='manager_approved_at') then
      set_clause := set_clause || ', manager_approved_at = now()';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='manager_comment') then
      set_clause := set_clause || format(', manager_comment = nullif(%L, '''')', coalesce(action_comment, ''));
    end if;
  elsif next_status = 'approved' then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='approved_at') then
      set_clause := set_clause || ', approved_at = now()';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='hr_comment') then
      set_clause := set_clause || format(', hr_comment = nullif(%L, '''')', coalesce(action_comment, ''));
    end if;
  elsif next_status = 'rejected' then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='rejected_at') then
      set_clause := set_clause || ', rejected_at = now()';
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='manager_comment') then
      set_clause := set_clause || format(', manager_comment = coalesce(manager_comment, nullif(%L, ''''))', coalesce(action_comment, ''));
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='hr_comment') then
      set_clause := set_clause || format(', hr_comment = coalesce(hr_comment, nullif(%L, ''''))', coalesce(action_comment, ''));
    end if;
  end if;

  update_sql := format('update public.hr_absence_requests set %s where id = %L::uuid', set_clause, target_request_id);
  execute update_sql;

  organization_id := target_organization_id;
  previous_status := current_status;
  final_status := next_status;
  return next;
end;
$$;

drop function if exists public.approve_hr_absence_request_manager(uuid, uuid, uuid, text);
drop function if exists public.approve_hr_absence_request_hr(uuid, uuid, uuid, text);
drop function if exists public.reject_hr_absence_request(uuid, uuid, uuid, text);

create function public.approve_hr_absence_request_manager(
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
declare workflow_result record;
begin
  select * into workflow_result
  from public.update_hr_absence_request_status_dynamic(target_request_id, 'manager_approved', actor_user_id, action_comment);

  if workflow_result.previous_status <> 'submitted' then
    raise exception 'Transition interdite : % vers manager_approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id, request_id, action, previous_status, next_status,
    actor_user_id, actor_employee_id, actor_role, comment
  ) values (
    workflow_result.organization_id, target_request_id, 'manager_approve',
    workflow_result.previous_status, workflow_result.final_status,
    actor_user_id, actor_employee_id, 'manager', action_comment
  );

  return target_request_id;
end;
$$;

create function public.approve_hr_absence_request_hr(
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
declare workflow_result record;
begin
  select * into workflow_result
  from public.update_hr_absence_request_status_dynamic(target_request_id, 'approved', actor_user_id, action_comment);

  if workflow_result.previous_status not in ('manager_approved', 'submitted') then
    raise exception 'Transition interdite : % vers approved.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id, request_id, action, previous_status, next_status,
    actor_user_id, actor_employee_id, actor_role, comment
  ) values (
    workflow_result.organization_id, target_request_id, 'hr_approve',
    workflow_result.previous_status, workflow_result.final_status,
    actor_user_id, actor_employee_id, 'hr', action_comment
  );

  return target_request_id;
end;
$$;

create function public.reject_hr_absence_request(
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
declare workflow_result record;
begin
  if coalesce(trim(action_comment), '') = '' then
    raise exception 'Un commentaire est obligatoire pour refuser une demande.';
  end if;

  select * into workflow_result
  from public.update_hr_absence_request_status_dynamic(target_request_id, 'rejected', actor_user_id, action_comment);

  if workflow_result.previous_status not in ('submitted', 'manager_approved') then
    raise exception 'Transition interdite : % vers rejected.', workflow_result.previous_status;
  end if;

  insert into public.hr_absence_approvals (
    organization_id, request_id, action, previous_status, next_status,
    actor_user_id, actor_employee_id, actor_role, comment
  ) values (
    workflow_result.organization_id, target_request_id, 'reject',
    workflow_result.previous_status, workflow_result.final_status,
    actor_user_id, actor_employee_id, 'validator', action_comment
  );

  return target_request_id;
end;
$$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;

create or replace function public.auto_archive_completed_hr_absence_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected_count integer := 0;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name='is_archived') then
    return 0;
  end if;

  execute $sql$
    update public.hr_absence_requests
       set is_archived = true,
           archived_at = case when exists (
             select 1 from information_schema.columns
             where table_schema='public' and table_name='hr_absence_requests' and column_name='archived_at'
           ) then now() else archived_at end
     where coalesce(is_archived, false) = false
       and status in ('approved', 'rejected', 'cancelled')
       and end_date < current_date
  $sql$;
  get diagnostics affected_count = row_count;
  return affected_count;
exception
  when undefined_column then
    execute $sql$
      update public.hr_absence_requests
         set is_archived = true
       where coalesce(is_archived, false) = false
         and status in ('approved', 'rejected', 'cancelled')
         and end_date < current_date
    $sql$;
    get diagnostics affected_count = row_count;
    return affected_count;
end;
$$;

grant execute on function public.auto_archive_completed_hr_absence_requests() to authenticated;

-- Champs contractuels nécessaires pour CP/RTT. Ne casse pas l’existant.
alter table public.hr_employee_contracts
  add column if not exists leave_acquisition_start_month integer default 6,
  add column if not exists paid_leave_annual_entitlement numeric(8,2) default 25,
  add column if not exists rtt_annual_entitlement numeric(8,2) default 10,
  add column if not exists leave_prorata_on_arrival boolean default true,
  add column if not exists leave_prorata_on_departure boolean default true,
  add column if not exists leave_carryover_allowed boolean default true,
  add column if not exists maximum_leave_carryover numeric(8,2);

create or replace function public.ensure_default_absence_balances_2026_2027(target_organization_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare inserted_count integer := 0;
begin
  insert into public.hr_absence_balances (
    organization_id, employee_id, absence_type_id, period_start, period_end,
    annual_entitlement, opening_balance, accrued_amount, adjustment_amount,
    carried_over_amount, consumed_amount, pending_amount, notes
  )
  select
    e.organization_id,
    e.id,
    t.id,
    date '2026-06-01',
    date '2027-05-31',
    case
      when upper(coalesce(t.code, '')) in ('RTT', 'JRTT') or lower(coalesce(t.name, '')) like '%rtt%' then coalesce(c.rtt_annual_entitlement, 10)
      else coalesce(c.paid_leave_annual_entitlement, 25)
    end,
    case
      when upper(coalesce(t.code, '')) in ('RTT', 'JRTT') or lower(coalesce(t.name, '')) like '%rtt%' then coalesce(c.rtt_annual_entitlement, 10)
      else coalesce(c.paid_leave_annual_entitlement, 25)
    end,
    0, 0, 0, 0, 0,
    'Solde initial généré pour période 2026-2027.'
  from public.hr_employees e
  join lateral (
    select c.* from public.hr_employee_contracts c
    where c.organization_id = e.organization_id and c.employee_id = e.id
    order by coalesce(c.is_primary, false) desc, c.created_at desc
    limit 1
  ) c on true
  join public.hr_absence_types t on t.organization_id = e.organization_id
  where e.organization_id = target_organization_id
    and coalesce(e.is_active, true) = true
    and (
      upper(coalesce(t.code, '')) in ('CP', 'CONGES_PAYES', 'CONGES', 'PAID_LEAVE', 'RTT', 'JRTT')
      or lower(coalesce(t.name, '')) like '%congé%'
      or lower(coalesce(t.name, '')) like '%conge%'
      or lower(coalesce(t.name, '')) like '%rtt%'
    )
    and not exists (
      select 1 from public.hr_absence_balances b
      where b.organization_id = e.organization_id
        and b.employee_id = e.id
        and b.absence_type_id = t.id
        and b.period_start = date '2026-06-01'
        and b.period_end = date '2027-05-31'
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.ensure_default_absence_balances_2026_2027(uuid) to authenticated;

-- Exécute pour toutes les organisations existantes.
do $$
declare org_record record;
begin
  for org_record in select id from public.organizations loop
    perform public.ensure_default_absence_balances_2026_2027(org_record.id);
  end loop;
end $$;
