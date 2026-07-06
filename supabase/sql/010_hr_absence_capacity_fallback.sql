-- ============================================================
-- ONEPILOT
-- 010_hr_absence_capacity_fallback.sql
--
-- Sécurisation du calcul des absences et de la capacité :
-- - 7 h par défaut du lundi au vendredi ;
-- - 0 h le samedi et le dimanche ;
-- - 0 h pour les jours fériés non travaillés ;
-- - prise en compte prioritaire d'un rythme explicite valide ;
-- - un forfait annuel en jours ne produit jamais 0 h en semaine
--   uniquement parce qu'aucun horaire journalier n'est défini.
--
-- Dépendance :
-- - 009_hr_absences_automation.sql
-- ============================================================

begin;

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
security invoker
set search_path = public
as $$
declare
  current_day date;

  current_day_hours numeric;
  configured_day_hours numeric;
  current_day_amount numeric;

  selected_calendar_id uuid;
  selected_schedule_id uuid;
  selected_contract_type_id uuid;

  selected_schedule public.hr_work_schedules%rowtype;

  total_calendar_days numeric := 0;
  total_working_days numeric := 0;
  total_holiday_days numeric := 0;
  total_non_working_days numeric := 0;

  is_weekend boolean;
  is_holiday boolean;
  holiday_is_working boolean;
  holiday_hours numeric;

  day_source text;

  day_details jsonb := '[]'::jsonb;
begin
  if target_start_date is null
    or target_end_date is null
  then
    raise exception
      'Les dates de début et de fin sont obligatoires.';
  end if;

  if target_end_date < target_start_date then
    raise exception
      'La date de fin ne peut pas précéder la date de début.';
  end if;

  if target_start_period not in (
    'full_day',
    'morning',
    'afternoon'
  ) then
    raise exception
      'La période de début est invalide.';
  end if;

  if target_end_period not in (
    'full_day',
    'morning',
    'afternoon'
  ) then
    raise exception
      'La période de fin est invalide.';
  end if;

  select
    active_contract.contract_type_id,
    active_contract.work_schedule_id
  into
    selected_contract_type_id,
    selected_schedule_id
  from public.get_hr_employee_active_contract(
    target_employee_id,
    target_start_date
  ) active_contract;

  if selected_schedule_id is not null then
    select schedule.*
    into selected_schedule
    from public.hr_work_schedules schedule
    where schedule.id = selected_schedule_id;
  end if;

  selected_calendar_id :=
    public.get_hr_employee_holiday_calendar(
      target_employee_id
    );

  current_day := target_start_date;

  while current_day <= target_end_date loop
    total_calendar_days :=
      total_calendar_days + 1;

    is_weekend :=
      extract(
        isodow from current_day
      ) in (6, 7);

    configured_day_hours :=
      case extract(
        isodow from current_day
      )
        when 1 then
          selected_schedule.monday_hours

        when 2 then
          selected_schedule.tuesday_hours

        when 3 then
          selected_schedule.wednesday_hours

        when 4 then
          selected_schedule.thursday_hours

        when 5 then
          selected_schedule.friday_hours

        when 6 then
          selected_schedule.saturday_hours

        when 7 then
          selected_schedule.sunday_hours

        else null
      end;

    /*
     * Règle de capacité :
     *
     * - week-end : 0 h par défaut ;
     * - lundi à vendredi :
     *   - horaire explicite strictement positif s'il existe ;
     *   - sinon 7 h.
     *
     * Cette règle empêche un forfait annuel en jours ou un contrat
     * sans rythme détaillé de produire une capacité quotidienne nulle.
     */
    if is_weekend then
      current_day_hours :=
        greatest(
          coalesce(
            configured_day_hours,
            0
          ),
          0
        );

      day_source :=
        case
          when configured_day_hours is not null
            and configured_day_hours > 0
          then 'work_schedule'
          else 'weekend_default'
        end;
    else
      if configured_day_hours is not null
        and configured_day_hours > 0
      then
        current_day_hours :=
          configured_day_hours;

        day_source :=
          'work_schedule';
      else
        current_day_hours := 7;

        day_source :=
          'weekday_fallback';
      end if;
    end if;

    is_holiday := false;
    holiday_is_working := false;
    holiday_hours := null;

    if selected_calendar_id is not null then
      select
        true,
        holiday.is_working_day,
        holiday.hours_override
      into
        is_holiday,
        holiday_is_working,
        holiday_hours
      from public.hr_holidays holiday
      where holiday.calendar_id =
        selected_calendar_id
        and holiday.organization_id = (
          select employee.organization_id
          from public.hr_employees employee
          where employee.id =
            target_employee_id
        )
        and holiday.holiday_date =
          current_day
      limit 1;
    end if;

    is_holiday :=
      coalesce(
        is_holiday,
        false
      );

    holiday_is_working :=
      coalesce(
        holiday_is_working,
        false
      );

    /*
     * Un jour férié non travaillé annule toujours la capacité,
     * même si le rythme prévoit des heures ce jour-là.
     */
    if is_holiday
      and not holiday_is_working
    then
      current_day_hours := 0;
      current_day_amount := 0;
      day_source := 'non_working_holiday';

      total_holiday_days :=
        total_holiday_days + 1;

    else
      /*
       * Un jour férié explicitement travaillé peut imposer un
       * nombre d'heures particulier.
       */
      if is_holiday
        and holiday_is_working
        and holiday_hours is not null
      then
        current_day_hours :=
          greatest(
            holiday_hours,
            0
          );

        day_source :=
          'working_holiday_override';
      end if;

      if current_day_hours <= 0 then
        current_day_amount := 0;

        total_non_working_days :=
          total_non_working_days + 1;
      else
        current_day_amount := 1;

        if target_start_date =
          target_end_date
        then
          if target_start_period <>
              'full_day'
            or target_end_period <>
              'full_day'
          then
            current_day_amount := 0.5;
          end if;
        else
          if current_day =
              target_start_date
            and target_start_period =
              'afternoon'
          then
            current_day_amount := 0.5;
          end if;

          if current_day =
              target_end_date
            and target_end_period =
              'morning'
          then
            current_day_amount := 0.5;
          end if;
        end if;

        total_working_days :=
          total_working_days +
          current_day_amount;
      end if;
    end if;

    day_details :=
      day_details ||
      jsonb_build_array(
        jsonb_build_object(
          'date',
          current_day,

          'iso_weekday',
          extract(
            isodow from current_day
          ),

          'is_weekend',
          is_weekend,

          'configured_hours',
          configured_day_hours,

          'scheduled_hours',
          current_day_hours,

          'capacity_hours',
          (
            current_day_hours *
            current_day_amount
          ),

          'source',
          day_source,

          'is_holiday',
          is_holiday,

          'is_working_holiday',
          holiday_is_working,

          'holiday_hours_override',
          holiday_hours,

          'amount',
          current_day_amount
        )
      );

    current_day :=
      current_day + 1;
  end loop;

  return query
  select
    total_calendar_days,
    total_working_days,
    total_holiday_days,
    total_non_working_days,
    total_working_days,
    selected_calendar_id,
    selected_schedule_id,
    selected_contract_type_id,

    jsonb_build_object(
      'default_weekday_hours',
      7,

      'calendar_days',
      total_calendar_days,

      'working_days',
      total_working_days,

      'holiday_days',
      total_holiday_days,

      'non_working_days',
      total_non_working_days,

      'days',
      day_details,

      'calculated_at',
      now()
    );
end;
$$;

grant execute
on function public.calculate_hr_absence_amount(
  uuid,
  date,
  date,
  text,
  text
)
to authenticated;

-- ============================================================
-- Recalcul des demandes existantes
-- ============================================================

update public.hr_absence_requests request
set
  start_date = request.start_date,

  updated_at = now()
where request.is_archived = false;

commit;