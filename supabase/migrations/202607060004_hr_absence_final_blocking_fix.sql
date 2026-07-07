
-- Correctif Absences V4 : remplacement forcé RPC, workflow sans tableau, fériés FR, soldes CP/RTT, recalcul existant.
create extension if not exists pgcrypto;

create or replace function public.get_french_easter_date(target_year integer)
returns date language plpgsql immutable as $$
declare a integer; b integer; c integer; d integer; e integer; f integer; g integer; h integer; i integer; k integer; l integer; m integer; target_month integer; target_day integer;
begin
  a := target_year % 19; b := floor(target_year / 100); c := target_year % 100; d := floor(b / 4); e := b % 4; f := floor((b + 8) / 25); g := floor((b - f + 1) / 3); h := (19 * a + b - d - g + 15) % 30; i := floor(c / 4); k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := floor((a + 11 * h + 22 * l) / 451); target_month := floor((h + l - 7 * m + 114) / 31); target_day := ((h + l - 7 * m + 114) % 31) + 1; return make_date(target_year, target_month, target_day);
end; $$;

create or replace function public.is_french_public_holiday(target_date date)
returns boolean language sql immutable as $$
  with easter as (select public.get_french_easter_date(extract(year from target_date)::int) as date_value), holidays as (
    select make_date(extract(year from target_date)::int, 1, 1) union all select (select date_value from easter) + 1 union all select make_date(extract(year from target_date)::int, 5, 1) union all select make_date(extract(year from target_date)::int, 5, 8) union all select (select date_value from easter) + 39 union all select (select date_value from easter) + 50 union all select make_date(extract(year from target_date)::int, 7, 14) union all select make_date(extract(year from target_date)::int, 8, 15) union all select make_date(extract(year from target_date)::int, 11, 1) union all select make_date(extract(year from target_date)::int, 11, 11) union all select make_date(extract(year from target_date)::int, 12, 25)
  ) select exists (select 1 from holidays where make_date = target_date);
$$;

create or replace function public.hr_absence_request_has_column(column_name_to_check text)
returns boolean language sql stable as $$
  select exists (select 1 from information_schema.columns where table_schema='public' and table_name='hr_absence_requests' and column_name = column_name_to_check);
$$;

drop function if exists public.calculate_hr_absence_amount(uuid, date, date, text, text) cascade;
drop function if exists public.calculate_hr_absence_amount(uuid, date, date, varchar, varchar) cascade;

create function public.calculate_hr_absence_amount(target_employee_id uuid, target_start_date date, target_end_date date, target_start_period text default 'full_day', target_end_period text default 'full_day')
returns table (calendar_days numeric, working_days numeric, holiday_days numeric, non_working_days numeric, requested_amount numeric, holiday_calendar_id uuid, work_schedule_id uuid, contract_type_id uuid, calculation_details jsonb)
language plpgsql stable as $$
declare
  target_holiday_calendar_id uuid := null;
  target_work_schedule_id uuid := null;
  target_contract_type_id uuid := null;
begin
  if target_start_date is null or target_end_date is null then raise exception 'Les dates de début et de fin sont obligatoires.'; end if;
  if target_end_date < target_start_date then raise exception 'La date de fin ne peut pas précéder la date de début.'; end if;
  -- Compatible avec ton schéma actuel : la vue hr_employee_overview ne contient pas holiday_calendar_id.
  -- On garde ces identifiants à null pour ne pas bloquer le calcul.
  -- Le calcul applique déjà les jours fériés français standards.
  return query
  with days as (select generate_series(target_start_date, target_end_date, interval '1 day')::date as day_date), calculated as (
    select day_date, extract(isodow from day_date)::int as iso_weekday, extract(isodow from day_date)::int in (6,7) as is_weekend, public.is_french_public_holiday(day_date) as is_holiday,
      case
        when extract(isodow from day_date)::int in (6,7) then 0::numeric
        when public.is_french_public_holiday(day_date) then 0::numeric
        when target_start_date = target_end_date then case when coalesce(target_start_period,'full_day')='afternoon' and coalesce(target_end_period,'full_day')='morning' then 0::numeric when coalesce(target_start_period,'full_day') in ('morning','afternoon') and coalesce(target_end_period,'full_day') in ('morning','afternoon') then 0.5::numeric else 1::numeric end
        when day_date = target_start_date and coalesce(target_start_period,'full_day')='afternoon' then 0.5::numeric
        when day_date = target_end_date and coalesce(target_end_period,'full_day')='morning' then 0.5::numeric
        else 1::numeric end as day_amount
    from days
  )
  select count(*)::numeric, coalesce(sum(day_amount),0)::numeric, count(*) filter (where is_holiday and not is_weekend)::numeric, count(*) filter (where is_weekend)::numeric, coalesce(sum(day_amount),0)::numeric, target_holiday_calendar_id, target_work_schedule_id, target_contract_type_id,
    jsonb_build_object('method','fr_public_holidays_and_half_days_v4','calendar_days',count(*)::numeric,'working_days',coalesce(sum(day_amount),0)::numeric,'holiday_days',count(*) filter (where is_holiday and not is_weekend)::numeric,'non_working_days',count(*) filter (where is_weekend)::numeric,'days',coalesce(jsonb_agg(jsonb_build_object('date',day_date,'amount',day_amount,'source',case when is_weekend then 'weekend_excluded_v4' when is_holiday then 'french_public_holiday_excluded_v4' when day_amount=0.5 then 'half_day_v4' else 'working_day_v4' end,'iso_weekday',iso_weekday,'is_weekend',is_weekend,'is_holiday',is_holiday,'is_working_day',day_amount > 0) order by day_date),'[]'::jsonb))
  from calculated;
end; $$;

grant execute on function public.calculate_hr_absence_amount(uuid, date, date, text, text) to authenticated;

drop function if exists public.update_hr_absence_request_status_dynamic(uuid, text, uuid, text) cascade;
create function public.update_hr_absence_request_status_dynamic(target_request_id uuid, next_status text, actor_user_id uuid default null, action_comment text default null)
returns table (organization_id uuid, previous_status text, final_status text) language plpgsql security definer set search_path = public as $$
declare target_organization_id uuid; current_status text; set_clause text; update_sql text;
begin
  select request.organization_id, request.status into target_organization_id, current_status from public.hr_absence_requests request where request.id = target_request_id for update;
  if target_organization_id is null then raise exception 'Demande d''absence introuvable : %', target_request_id; end if;
  set_clause := format('status = %L', next_status);
  if public.hr_absence_request_has_column('updated_at') then set_clause := set_clause || ', updated_at = now()'; end if;
  if actor_user_id is not null and public.hr_absence_request_has_column('updated_by') then set_clause := set_clause || format(', updated_by = %L::uuid', actor_user_id); end if;
  if next_status = 'manager_approved' then
    if public.hr_absence_request_has_column('manager_approved_at') then set_clause := set_clause || ', manager_approved_at = now()'; end if;
    if public.hr_absence_request_has_column('manager_comment') then set_clause := set_clause || ', manager_comment = ' || quote_literal(nullif(coalesce(action_comment,''),'')); end if;
  elsif next_status = 'approved' then
    if public.hr_absence_request_has_column('approved_at') then set_clause := set_clause || ', approved_at = now()'; end if;
    if public.hr_absence_request_has_column('hr_comment') then set_clause := set_clause || ', hr_comment = ' || quote_literal(nullif(coalesce(action_comment,''),'')); end if;
  elsif next_status = 'rejected' then
    if public.hr_absence_request_has_column('rejected_at') then set_clause := set_clause || ', rejected_at = now()'; end if;
    if public.hr_absence_request_has_column('manager_comment') then set_clause := set_clause || ', manager_comment = coalesce(manager_comment, ' || quote_literal(nullif(coalesce(action_comment,''),'')) || ')'; end if;
    if public.hr_absence_request_has_column('hr_comment') then set_clause := set_clause || ', hr_comment = coalesce(hr_comment, ' || quote_literal(nullif(coalesce(action_comment,''),'')) || ')'; end if;
  end if;
  update_sql := format('update public.hr_absence_requests set %s where id = %L::uuid', set_clause, target_request_id);
  execute update_sql;
  organization_id := target_organization_id; previous_status := current_status; final_status := next_status; return next;
end; $$;

drop function if exists public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) cascade;
drop function if exists public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) cascade;
drop function if exists public.reject_hr_absence_request(uuid, uuid, uuid, text) cascade;

create function public.approve_hr_absence_request_manager(target_request_id uuid, actor_user_id uuid default null, actor_employee_id uuid default null, action_comment text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare workflow_result record; begin select * into workflow_result from public.update_hr_absence_request_status_dynamic(target_request_id,'manager_approved',actor_user_id,action_comment); if workflow_result.previous_status <> 'submitted' then raise exception 'Transition interdite : % vers manager_approved.', workflow_result.previous_status; end if; insert into public.hr_absence_approvals (organization_id, request_id, action, previous_status, next_status, actor_user_id, actor_employee_id, actor_role, comment) values (workflow_result.organization_id,target_request_id,'manager_approve',workflow_result.previous_status,workflow_result.final_status,actor_user_id,actor_employee_id,'manager',action_comment); return target_request_id; end; $$;
create function public.approve_hr_absence_request_hr(target_request_id uuid, actor_user_id uuid default null, actor_employee_id uuid default null, action_comment text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare workflow_result record; begin select * into workflow_result from public.update_hr_absence_request_status_dynamic(target_request_id,'approved',actor_user_id,action_comment); if workflow_result.previous_status not in ('manager_approved','submitted') then raise exception 'Transition interdite : % vers approved.', workflow_result.previous_status; end if; insert into public.hr_absence_approvals (organization_id, request_id, action, previous_status, next_status, actor_user_id, actor_employee_id, actor_role, comment) values (workflow_result.organization_id,target_request_id,'hr_approve',workflow_result.previous_status,workflow_result.final_status,actor_user_id,actor_employee_id,'hr',action_comment); return target_request_id; end; $$;
create function public.reject_hr_absence_request(target_request_id uuid, actor_user_id uuid default null, actor_employee_id uuid default null, action_comment text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare workflow_result record; begin if coalesce(trim(action_comment),'')='' then raise exception 'Un commentaire est obligatoire pour refuser une demande.'; end if; select * into workflow_result from public.update_hr_absence_request_status_dynamic(target_request_id,'rejected',actor_user_id,action_comment); if workflow_result.previous_status not in ('submitted','manager_approved') then raise exception 'Transition interdite : % vers rejected.', workflow_result.previous_status; end if; insert into public.hr_absence_approvals (organization_id, request_id, action, previous_status, next_status, actor_user_id, actor_employee_id, actor_role, comment) values (workflow_result.organization_id,target_request_id,'reject',workflow_result.previous_status,workflow_result.final_status,actor_user_id,actor_employee_id,'validator',action_comment); return target_request_id; end; $$;

grant execute on function public.approve_hr_absence_request_manager(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.approve_hr_absence_request_hr(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.reject_hr_absence_request(uuid, uuid, uuid, text) to authenticated;

create or replace function public.recalculate_existing_hr_absence_requests_v4() returns integer language plpgsql security definer set search_path=public as $$
declare request_record record; calculated record; set_clause text; affected_count integer := 0;
begin
  for request_record in select id, employee_id, start_date, end_date, coalesce(start_period,'full_day') as start_period, coalesce(end_period,'full_day') as end_period from public.hr_absence_requests where employee_id is not null and start_date is not null and end_date is not null loop
    select * into calculated from public.calculate_hr_absence_amount(request_record.employee_id, request_record.start_date, request_record.end_date, request_record.start_period, request_record.end_period);
    set_clause := format('requested_amount = %s', calculated.requested_amount);
    if public.hr_absence_request_has_column('calendar_days') then set_clause := set_clause || format(', calendar_days = %s', calculated.calendar_days); end if;
    if public.hr_absence_request_has_column('working_days') then set_clause := set_clause || format(', working_days = %s', calculated.working_days); end if;
    if public.hr_absence_request_has_column('holiday_days') then set_clause := set_clause || format(', holiday_days = %s', calculated.holiday_days); end if;
    if public.hr_absence_request_has_column('non_working_days') then set_clause := set_clause || format(', non_working_days = %s', calculated.non_working_days); end if;
    if public.hr_absence_request_has_column('calculation_details') then set_clause := set_clause || format(', calculation_details = %L::jsonb', calculated.calculation_details::text); end if;
    if public.hr_absence_request_has_column('updated_at') then set_clause := set_clause || ', updated_at = now()'; end if;
    execute format('update public.hr_absence_requests set %s where id = %L::uuid', set_clause, request_record.id);
    affected_count := affected_count + 1;
  end loop;
  return affected_count;
end; $$;
select public.recalculate_existing_hr_absence_requests_v4();

alter table if exists public.hr_employee_contracts add column if not exists leave_acquisition_start_month integer default 6, add column if not exists paid_leave_annual_entitlement numeric default 25, add column if not exists rtt_annual_entitlement numeric default 10, add column if not exists leave_prorata_on_arrival boolean default true, add column if not exists leave_prorata_on_departure boolean default true, add column if not exists leave_carryover_allowed boolean default true, add column if not exists maximum_leave_carryover numeric null;

insert into public.hr_absence_types (organization_id, code, name, unit, color, reduces_capacity, requires_manager_approval, requires_hr_review, hr_review_is_blocking, requires_document, is_paid, is_active) select org.id, 'CP', 'Congés payés', 'day', '#4f46e5', true, true, false, false, false, true, true from public.organizations org where not exists (select 1 from public.hr_absence_types t where t.organization_id=org.id and (upper(coalesce(t.code,'')) in ('CP','PAID_LEAVE','CONGES_PAYES','CONGÉS_PAYÉS') or lower(coalesce(t.name,'')) like '%congé%pay%'));
insert into public.hr_absence_types (organization_id, code, name, unit, color, reduces_capacity, requires_manager_approval, requires_hr_review, hr_review_is_blocking, requires_document, is_paid, is_active) select org.id, 'RTT', 'RTT', 'day', '#7c3aed', true, true, false, false, false, true, true from public.organizations org where not exists (select 1 from public.hr_absence_types t where t.organization_id=org.id and (upper(coalesce(t.code,'')) = 'RTT' or lower(coalesce(t.name,'')) like '%rtt%'));

with active_employees as (select id, organization_id from public.hr_employee_overview where coalesce(is_active,true)=true), leave_types as (select t.id, t.organization_id, 25::numeric as entitlement from public.hr_absence_types t where upper(coalesce(t.code,'')) in ('CP','PAID_LEAVE','CONGES_PAYES','CONGÉS_PAYÉS') or lower(coalesce(t.name,'')) like '%congé%pay%' union all select t.id, t.organization_id, 10::numeric as entitlement from public.hr_absence_types t where upper(coalesce(t.code,''))='RTT' or lower(coalesce(t.name,'')) like '%rtt%') insert into public.hr_absence_balances (organization_id, employee_id, absence_type_id, period_start, period_end, annual_entitlement, opening_balance, carried_over_amount, accrued_amount, adjustment_amount, consumed_amount, pending_amount) select e.organization_id, e.id, t.id, date '2026-06-01', date '2027-05-31', t.entitlement, t.entitlement, 0,0,0,0,0 from active_employees e join leave_types t on t.organization_id=e.organization_id where not exists (select 1 from public.hr_absence_balances b where b.organization_id=e.organization_id and b.employee_id=e.id and b.absence_type_id=t.id and b.period_start=date '2026-06-01' and b.period_end=date '2027-05-31');

create or replace function public.auto_archive_completed_hr_absence_requests() returns integer language plpgsql security definer set search_path=public as $$ declare affected_count integer := 0; begin if not public.hr_absence_request_has_column('is_archived') then return 0; end if; if public.hr_absence_request_has_column('archived_at') then update public.hr_absence_requests set is_archived=true, archived_at=now() where coalesce(is_archived,false)=false and status in ('approved','rejected','cancelled') and end_date < current_date; else update public.hr_absence_requests set is_archived=true where coalesce(is_archived,false)=false and status in ('approved','rejected','cancelled') and end_date < current_date; end if; get diagnostics affected_count = row_count; return affected_count; end; $$;
select public.auto_archive_completed_hr_absence_requests();
