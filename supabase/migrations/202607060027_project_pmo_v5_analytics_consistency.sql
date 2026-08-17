-- ONEPILOT PMO v5 — cohérence analytique, chronos et démonstration Supabase corrélée.
-- Migration additive et idempotente. Aucun jeu de données n'est créé côté interface.

alter table if exists public.project_actions
  add column if not exists action_category text not null default 'corrective',
  add column if not exists contributors_text text,
  add column if not exists closure_comment text;

-- Tous les projets possèdent un chrono exploitable, y compris les anciennes démonstrations.
with invalid_projects as (
  select id, row_number() over (partition by organization_id order by created_at, id) as sequence
  from public.project_projects
  where code !~ '^P-[0-9]{4}-[0-9]{4,}$'
)
update public.project_projects project
set code = 'P-2026-' || lpad((9000 + invalid.sequence)::text, 4, '0'), updated_at = now()
from invalid_projects invalid
where invalid.id = project.id;

-- Une opportunité manuelle reste identifiable et suit le même chrono que Commerce.
with opportunity_maximum as (
  select organization_id, coalesce(max(substring(opportunity_number from '([0-9]+)$')::integer), 0) as maximum
  from public.project_projects
  where opportunity_number ~ '^OPP-[0-9]{4}-[0-9]{4,}$'
  group by organization_id
), projects_without_opportunity as (
  select project.id,
    row_number() over (partition by project.organization_id order by project.code, project.id)
      + coalesce(maximum.maximum, 0) as sequence
  from public.project_projects project
  left join opportunity_maximum maximum on maximum.organization_id = project.organization_id
  where coalesce(project.opportunity_number, '') !~ '^OPP-[0-9]{4}-[0-9]{4,}$'
)
update public.project_projects project
set opportunity_number = 'OPP-2026-' || lpad(missing.sequence::text, 4, '0'),
    source_reference = coalesce(nullif(project.source_reference, ''), 'OPP-2026-' || lpad(missing.sequence::text, 4, '0')),
    source_sync_status = case when project.source_id is null then 'manual' else project.source_sync_status end,
    updated_at = now()
from projects_without_opportunity missing
where missing.id = project.id;

-- Références de risques homogènes avec le référentiel RIS-AAAA-0001.
with numbered_risks as (
  select id, row_number() over (partition by organization_id order by created_at, id) as sequence
  from public.project_risks
  where code !~ '^RIS-[0-9]{4}-[0-9]{4,}$'
)
update public.project_risks risk
set code = 'RIS-2026-' || lpad(numbered.sequence::text, 4, '0'), updated_at = now()
from numbered_risks numbered
where numbered.id = risk.id;

update public.project_actions
set origin_reference = regexp_replace(regexp_replace(origin_reference, '^RISK-', 'RIS-2026-'), '^RSK-', 'RIS-2026-'), updated_at = now()
where origin_reference ~ '^(RISK|RSK)-';

do $$
declare
  demo_org uuid;
  demo_project record;
  demo_task uuid;
  month_date date;
  month_index integer;
  project_index integer := 0;
begin
  select id into demo_org from public.organizations where lower(coalesce(slug, '')) = 'onepilot' order by created_at limit 1;
  if demo_org is null then return; end if;

  for demo_project in
    select id, code, ordered_budget, coalesce(baseline_budget, ordered_budget, budget_amount, 500000) as budget
    from public.project_projects
    where organization_id = demo_org and archived_at is null
    order by code
    limit 3
  loop
    project_index := project_index + 1;
    select id into demo_task from public.project_tasks where organization_id = demo_org and project_id = demo_project.id and archived_at is null order by start_date nulls last, code limit 1;

    for month_index in 1..7 loop
      month_date := make_date(2026, month_index, 1);
      insert into public.project_financial_periods (
        organization_id, project_id, period_start, period_end, baseline_budget,
        planned_value, earned_value, actual_cost, production_amount, invoiced_amount,
        collected_amount, purchase_amount, expense_amount, forecast_to_complete, comment
      ) values (
        demo_org, demo_project.id, month_date, (month_date + interval '1 month - 1 day')::date,
        coalesce(nullif(demo_project.budget, 0), 500000),
        42000 * month_index * (1 + project_index * 0.08),
        38000 * month_index * (1 + project_index * 0.07) - case when month_index in (4,5) then 9000 else 0 end,
        35000 * month_index * (1 + project_index * 0.09),
        43000 * month_index * (1 + project_index * 0.06),
        39000 * month_index * (1 + project_index * 0.05),
        35000 * month_index * (1 + project_index * 0.04),
        1800 * project_index + 350 * month_index,
        900 * project_index + 180 * month_index,
        greatest(0, coalesce(nullif(demo_project.budget, 0), 500000) - 35000 * month_index),
        'Démonstration PMO corrélée — période ' || to_char(month_date, 'MM/YYYY')
      ) on conflict (organization_id, project_id, period_start) do update set
        baseline_budget = excluded.baseline_budget, planned_value = excluded.planned_value,
        earned_value = excluded.earned_value, actual_cost = excluded.actual_cost,
        production_amount = excluded.production_amount, invoiced_amount = excluded.invoiced_amount,
        collected_amount = excluded.collected_amount, purchase_amount = excluded.purchase_amount,
        expense_amount = excluded.expense_amount, forecast_to_complete = excluded.forecast_to_complete,
        comment = excluded.comment, archived_at = null, updated_at = now();

      insert into public.project_satisfaction_surveys (
        organization_id, project_id, survey_month, respondent_name, respondent_role,
        customer_listening_score, planning_score, technical_skills_score,
        monitoring_score, risk_management_score, verbatim
      ) values (
        demo_org, demo_project.id, month_date, 'Client démonstration', 'Direction de programme',
        round(greatest(0, least(5, 3.3 + month_index * 0.12 - project_index * 0.05)))::integer,
        round(greatest(0, least(5, 3.1 + month_index * 0.10 - project_index * 0.08)))::integer,
        round(greatest(0, least(5, 3.5 + month_index * 0.08)))::integer,
        round(greatest(0, least(5, 3.2 + month_index * 0.11)))::integer,
        round(greatest(0, least(5, 3.0 + month_index * 0.09 - project_index * 0.04)))::integer,
        'Revue client mensuelle synchronisée avec la performance projet.'
      ) on conflict (organization_id, project_id, survey_month) do update set
        customer_listening_score = excluded.customer_listening_score,
        planning_score = excluded.planning_score,
        technical_skills_score = excluded.technical_skills_score,
        monitoring_score = excluded.monitoring_score,
        risk_management_score = excluded.risk_management_score,
        verbatim = excluded.verbatim, archived_at = null, updated_at = now();

      insert into public.project_deliverables (
        organization_id, project_id, task_id, code, name, description, deliverable_type,
        status, quality_status, planned_date, replanned_date, actual_delivery_date,
        first_time_right, owner_name, acceptance_criteria
      ) values (
        demo_org, demo_project.id, demo_task,
        'LIV-2026-' || lpad((project_index * 100 + month_index)::text, 4, '0'),
        'Livrable mensuel ' || month_index || ' — ' || demo_project.code,
        'Livrable utilisé pour les indicateurs OTD, OQD et DoD.', 'document',
        case when month_index <= 6 then 'delivered' else 'planned' end,
        case when month_index in (3,6) then 'review' else 'accepted' end,
        (month_date + interval '19 days')::date,
        case when month_index in (3,5) then (month_date + interval '22 days')::date else null end,
        case when month_index <= 6 then (month_date + ((case when month_index in (3,5) then 27 else 18 end) || ' days')::interval)::date else null end,
        case when month_index in (3,6) then false when month_index <= 6 then true else null end,
        'Responsable livrable', 'Validation du contenu, de la qualité et de la preuve de remise.'
      ) on conflict (organization_id, project_id, code) do update set
        status = excluded.status, quality_status = excluded.quality_status,
        planned_date = excluded.planned_date, replanned_date = excluded.replanned_date,
        actual_delivery_date = excluded.actual_delivery_date, first_time_right = excluded.first_time_right,
        archived_at = null, updated_at = now();
    end loop;

    insert into public.project_risks (
      organization_id, project_id, task_id, code, title, description, category,
      status, probability, impact, revenue_impact_amount, cost_impact_amount,
      schedule_impact_days, owner_name, response_strategy, mitigation_plan, review_date
    )
    select demo_org, demo_project.id, demo_task,
      'RIS-2026-' || lpad((8000 + project_index * 10 + risk_no)::text, 4, '0'),
      risk_title, 'Risque de démonstration corrélé au projet.', 'project', 'open', probability, impact,
      20000 * impact, 5000 * probability, probability * impact, 'Chef de projet', 'mitigate',
      'Réduire la probabilité, contenir l’impact et suivre le plan d’action.', current_date + 14
    from (values
      (1, 2, 2, 'Disponibilité d’une compétence critique'),
      (2, 2, 3, 'Dérive de validation client'),
      (3, 3, 3, 'Retard d’un livrable structurant'),
      (4, 4, 4, 'Blocage contractuel ou financier')
    ) as risk_data(risk_no, probability, impact, risk_title)
    on conflict (organization_id, project_id, code) do update set
      probability = excluded.probability, impact = excluded.impact,
      mitigation_plan = excluded.mitigation_plan, archived_at = null, updated_at = now();
  end loop;
end;
$$;

-- Le retard affiché dans le portefeuille doit être identique à celui des analyses.
update public.project_deliverables
set delay_business_days = case when actual_delivery_date <= coalesce(replanned_date, planned_date) then 0 else (
  select count(*)::integer
  from generate_series(coalesce(replanned_date, planned_date) + 1, actual_delivery_date, interval '1 day') as day_value
  where extract(isodow from day_value) between 1 and 5
) end
where actual_delivery_date is not null
  and planned_date is not null;

comment on column public.project_actions.action_category is 'Type d’action : corrective, préventive, amélioration ou décision.';
