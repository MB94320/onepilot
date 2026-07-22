-- ONEPILOT PMO v3 — règles métier portefeuille, actions, qualité et performance.
-- Migration additive, idempotente et isolée par organisation.

create extension if not exists pgcrypto;

-- Informations exécutives et fiabilité du portefeuille.
alter table if exists public.project_projects
  add column if not exists business_unit_name text,
  add column if not exists ptf_reference text,
  add column if not exists reporting_reliability_percent numeric(7,4) not null default 60,
  add column if not exists data_confidence_percent numeric(7,4) not null default 60,
  add column if not exists last_reporting_at timestamptz,
  add column if not exists schedule_variance_days integer not null default 0,
  add column if not exists target_margin_rate numeric(9,4),
  add column if not exists reporting_comment text;

alter table if exists public.project_projects
  drop constraint if exists project_projects_reporting_reliability_check;
alter table if exists public.project_projects
  add constraint project_projects_reporting_reliability_check
  check (reporting_reliability_percent between 0 and 100);

alter table if exists public.project_projects
  drop constraint if exists project_projects_data_confidence_check;
alter table if exists public.project_projects
  add constraint project_projects_data_confidence_check
  check (data_confidence_percent between 0 and 100);

alter table if exists public.project_tasks
  add column if not exists acceptance_criteria text;

-- Les actions peuvent être transverses (projet = NA) et disposent d'un identifiant
-- unique au niveau de l'organisation, indépendamment du projet.
alter table if exists public.project_actions
  alter column project_id drop not null;

alter table if exists public.project_actions
  add column if not exists contributor_ids jsonb not null default '[]'::jsonb,
  add column if not exists generic_reason text,
  add column if not exists closure_validated boolean not null default false,
  add column if not exists closure_validated_by uuid,
  add column if not exists closure_validated_at timestamptz,
  add column if not exists effectiveness_review_date date,
  add column if not exists reopened_count integer not null default 0,
  add column if not exists proof_reference text,
  add column if not exists root_cause_method text;

-- Normalisation des anciens identifiants d'action avant l'unicité organisationnelle.
update public.project_actions
set code = 'TMP-' || replace(id::text, '-', '')
where code !~ '^ACT-[0-9]{4}-[0-9]{4,}$'
   or exists (
     select 1 from public.project_actions duplicate_action
     where duplicate_action.organization_id = project_actions.organization_id
       and duplicate_action.code = project_actions.code
       and duplicate_action.id < project_actions.id
   );

with numbered as (
  select
    id,
    organization_id,
    extract(year from coalesce(opened_at, created_at::date, current_date))::integer as action_year,
    row_number() over (
      partition by organization_id, extract(year from coalesce(opened_at, created_at::date, current_date))::integer
      order by coalesce(opened_at, created_at::date), created_at, id
    ) as sequence_value
  from public.project_actions
)
update public.project_actions action
set code = 'ACT-' || numbered.action_year::text || '-' || lpad(numbered.sequence_value::text, 4, '0')
from numbered
where action.id = numbered.id;

create unique index if not exists project_actions_org_code_uq
  on public.project_actions(organization_id, code);

-- Toutes les références projet deviennent P-AAAA-NNNN, y compris les anciennes
-- démonstrations de staffing. Aucun projet n'est supprimé.
do $$
declare
  project_record record;
  target_year integer;
  next_value integer;
begin
  for project_record in
    select id, organization_id, start_date, created_at
    from public.project_projects
    where code !~ '^P-[0-9]{4}-[0-9]{4,}$'
    order by organization_id, coalesce(start_date, created_at::date), created_at, id
  loop
    target_year := extract(year from coalesce(project_record.start_date, project_record.created_at::date, current_date))::integer;
    select coalesce(max(substring(code from ('^P-' || target_year::text || '-([0-9]+)$'))::integer), 0) + 1
      into next_value
    from public.project_projects
    where organization_id = project_record.organization_id
      and code ~ ('^P-' || target_year::text || '-[0-9]+$');
    update public.project_projects
    set code = 'P-' || target_year::text || '-' || lpad(next_value::text, 4, '0'),
        updated_at = now()
    where id = project_record.id;
  end loop;
end;
$$;

-- Numérotation transactionnelle commune aux projets, tâches, jalons et actions.
create or replace function public.next_project_code(
  target_organization_id uuid,
  target_year integer default extract(year from current_date)::integer,
  code_prefix text default 'P'
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_prefix text := coalesce(nullif(regexp_replace(upper(trim(coalesce(code_prefix, 'P'))), '[^A-Z0-9]', '', 'g'), ''), 'P');
  sequence_key text;
  current_value integer := 0;
  existing_value integer := 0;
  next_value integer;
begin
  if not public.is_organization_member(target_organization_id) then
    raise exception 'Accès refusé à l’organisation %.', target_organization_id using errcode = '42501';
  end if;

  sequence_key := lower(normalized_prefix);
  insert into public.project_number_sequences(organization_id, sequence_year, sequence_kind, last_value)
  values (target_organization_id, target_year, sequence_key, 0)
  on conflict (organization_id, sequence_year, sequence_kind) do nothing;

  select last_value into current_value
  from public.project_number_sequences
  where organization_id = target_organization_id
    and sequence_year = target_year
    and sequence_kind = sequence_key
  for update;

  if normalized_prefix = 'P' then
    select coalesce(max(substring(code from ('^P-' || target_year::text || '-([0-9]+)$'))::integer), 0)
      into existing_value from public.project_projects
      where organization_id = target_organization_id and code ~ ('^P-' || target_year::text || '-[0-9]+$');
  elsif normalized_prefix = 'T' then
    select coalesce(max(substring(code from ('^T-' || target_year::text || '-([0-9]+)$'))::integer), 0)
      into existing_value from public.project_tasks
      where organization_id = target_organization_id and code ~ ('^T-' || target_year::text || '-[0-9]+$');
  elsif normalized_prefix = 'J' then
    select coalesce(max(substring(code from ('^J-' || target_year::text || '-([0-9]+)$'))::integer), 0)
      into existing_value from public.project_milestones
      where organization_id = target_organization_id and code ~ ('^J-' || target_year::text || '-[0-9]+$');
  elsif normalized_prefix = 'ACT' then
    select coalesce(max(substring(code from ('^ACT-' || target_year::text || '-([0-9]+)$'))::integer), 0)
      into existing_value from public.project_actions
      where organization_id = target_organization_id and code ~ ('^ACT-' || target_year::text || '-[0-9]+$');
  end if;

  next_value := greatest(coalesce(current_value, 0), coalesce(existing_value, 0)) + 1;
  update public.project_number_sequences
  set last_value = next_value, updated_at = now()
  where organization_id = target_organization_id
    and sequence_year = target_year
    and sequence_kind = sequence_key;

  return normalized_prefix || '-' || target_year::text || '-' || lpad(next_value::text, 4, '0');
end;
$$;

revoke all on function public.next_project_code(uuid, integer, text) from public;
grant execute on function public.next_project_code(uuid, integer, text) to authenticated;

-- Registre des non-conformités projet, utilisable avec ou sans souscription au
-- module Qualité. Les identifiants externes assurent la synchronisation optionnelle.
create table if not exists public.project_nonconformities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  nonconformity_type text not null default 'project',
  severity text not null default 'minor',
  status text not null default 'open',
  detected_at date not null default current_date,
  due_date date,
  closed_at date,
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  owner_name text,
  impact_description text,
  root_cause text,
  corrective_action text,
  recurrence_count integer not null default 0,
  effectiveness_status text,
  evidence_url text,
  quality_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, project_id, code)
);

create index if not exists project_nonconformities_project_status_idx
  on public.project_nonconformities(project_id, status, severity)
  where archived_at is null;

drop trigger if exists set_project_nonconformities_updated_at on public.project_nonconformities;
create trigger set_project_nonconformities_updated_at
before update on public.project_nonconformities
for each row execute function public.set_updated_at();

drop trigger if exists audit_pmo_project_nonconformities on public.project_nonconformities;
create trigger audit_pmo_project_nonconformities
after insert or update or delete on public.project_nonconformities
for each row execute function public.log_project_audit_event();

alter table public.project_nonconformities enable row level security;
drop policy if exists project_nonconformities_tenant_select on public.project_nonconformities;
drop policy if exists project_nonconformities_tenant_insert on public.project_nonconformities;
drop policy if exists project_nonconformities_tenant_update on public.project_nonconformities;
drop policy if exists project_nonconformities_tenant_delete on public.project_nonconformities;
create policy project_nonconformities_tenant_select on public.project_nonconformities
  for select to authenticated using (public.is_organization_member(organization_id));
create policy project_nonconformities_tenant_insert on public.project_nonconformities
  for insert to authenticated with check (public.is_organization_member(organization_id));
create policy project_nonconformities_tenant_update on public.project_nonconformities
  for update to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy project_nonconformities_tenant_delete on public.project_nonconformities
  for delete to authenticated using (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.project_nonconformities to authenticated;

-- Mesures financières complètes : BL, BF, encours et objectifs de marge.
alter table if exists public.project_financial_periods
  add column if not exists delivery_note_amount numeric(16,2) not null default 0,
  add column if not exists billing_authorization_amount numeric(16,2) not null default 0,
  add column if not exists outstanding_amount numeric(16,2) not null default 0,
  add column if not exists target_margin_rate numeric(9,4),
  add column if not exists reporting_reliability_percent numeric(7,4) not null default 60;

-- Notes client saisies par entiers de 0 à 5. Les historiques sont normalisés.
update public.project_satisfaction_surveys set
  customer_listening_score = round(customer_listening_score),
  planning_score = round(planning_score),
  technical_skills_score = round(technical_skills_score),
  monitoring_score = round(monitoring_score),
  risk_management_score = round(risk_management_score);

alter table public.project_satisfaction_surveys
  drop constraint if exists project_satisfaction_integer_scores_check;
alter table public.project_satisfaction_surveys
  add constraint project_satisfaction_integer_scores_check check (
    (customer_listening_score is null or customer_listening_score = round(customer_listening_score)) and
    (planning_score is null or planning_score = round(planning_score)) and
    (technical_skills_score is null or technical_skills_score = round(technical_skills_score)) and
    (monitoring_score is null or monitoring_score = round(monitoring_score)) and
    (risk_management_score is null or risk_management_score = round(risk_management_score))
  );

alter table if exists public.project_health_snapshots
  add column if not exists customer_score numeric(7,4),
  add column if not exists margin_score numeric(7,4),
  add column if not exists data_reliability_score numeric(7,4),
  add column if not exists project_health_score numeric(7,4),
  add column if not exists health_score_details jsonb not null default '{}'::jsonb;

-- Retard des livrables en jours ouvrés (week-ends et jours fériés France exclus).
alter table if exists public.project_deliverables
  add column if not exists delay_business_days integer not null default 0;

update public.project_deliverables deliverable
set delay_business_days = case
  when deliverable.actual_delivery_date is null then 0
  when deliverable.actual_delivery_date <= coalesce(deliverable.replanned_date, deliverable.planned_date) then 0
  else (
    select count(*)::integer
    from generate_series(
      coalesce(deliverable.replanned_date, deliverable.planned_date) + 1,
      deliverable.actual_delivery_date,
      interval '1 day'
    ) day_value
    where extract(isodow from day_value) between 1 and 5
      and not public.is_french_public_holiday(day_value::date)
  )
end;

-- Vue financière enrichie sans modifier les formules EVM existantes.
create or replace view public.project_financial_performance
with (security_invoker = true)
as
select
  f.organization_id, f.project_id, p.code as project_code, p.name as project_name,
  f.period_start, f.period_end, f.baseline_budget as bac,
  f.planned_value as pv, f.earned_value as ev, f.actual_cost as ac,
  f.earned_value - f.actual_cost as cost_variance,
  f.earned_value - f.planned_value as schedule_variance,
  case when f.actual_cost = 0 then null else round(f.earned_value / f.actual_cost, 4) end as cpi,
  case when f.planned_value = 0 then null else round(f.earned_value / f.planned_value, 4) end as spi,
  case when f.earned_value = 0 or f.actual_cost = 0 then null else round(f.baseline_budget / nullif(f.earned_value / f.actual_cost, 0), 2) end as estimate_at_completion,
  case when f.forecast_to_complete is not null then f.forecast_to_complete
       when f.earned_value = 0 or f.actual_cost = 0 then null
       else round((f.baseline_budget / nullif(f.earned_value / f.actual_cost, 0)) - f.actual_cost, 2) end as estimate_to_complete,
  f.production_amount, f.invoiced_amount, f.collected_amount,
  greatest(f.production_amount - f.invoiced_amount, 0) as fae,
  greatest(f.invoiced_amount - f.production_amount, 0) as pca,
  f.production_amount - f.actual_cost as project_margin,
  case when f.production_amount = 0 then null else round((f.production_amount - f.actual_cost) / f.production_amount, 4) end as margin_rate,
  f.purchase_amount, f.expense_amount, f.comment,
  f.delivery_note_amount, f.billing_authorization_amount,
  greatest(f.invoiced_amount - f.collected_amount, 0) as outstanding_amount,
  f.target_margin_rate, f.reporting_reliability_percent,
  f.baseline_budget - case when f.earned_value = 0 or f.actual_cost = 0 then f.baseline_budget else round(f.baseline_budget / nullif(f.earned_value / f.actual_cost, 0), 2) end as variance_at_completion,
  case when f.earned_value >= f.baseline_budget then null
       else round((f.baseline_budget - f.earned_value) / nullif(f.baseline_budget - f.actual_cost, 0), 4) end as tcpi
from public.project_financial_periods f
join public.project_projects p on p.id = f.project_id and p.organization_id = f.organization_id
where f.archived_at is null;

grant select on public.project_financial_performance to authenticated;
create or replace view public.project_financial_metrics with (security_invoker = true)
as select * from public.project_financial_performance;
grant select on public.project_financial_metrics to authenticated;

-- Exemple qualité cohérent sur le premier projet de démonstration disponible.
insert into public.project_nonconformities (
  organization_id, project_id, code, title, description, nonconformity_type,
  severity, status, detected_at, due_date, owner_employee_id, owner_name,
  impact_description, root_cause, corrective_action, recurrence_count
)
select
  project.organization_id, project.id, 'NC-2026-0001',
  'Écart de traçabilité sur un livrable',
  'La preuve de validation client doit être consolidée avant facturation.',
  'livrable', 'major', 'in_progress', date '2026-07-08', date '2026-07-31',
  project.project_manager_employee_id, project.project_manager_name,
  'Risque de décalage du bon de facturation et de baisse OQD.',
  'Critère d’acceptation non formalisé dans la baseline.',
  'Formaliser le critère, obtenir la preuve client et contrôler l’efficacité.', 0
from public.project_projects project
where lower(coalesce((select slug from public.organizations where id = project.organization_id), '')) = 'onepilot'
order by project.created_at, project.id
limit 1
on conflict (organization_id, project_id, code) do update set
  title = excluded.title, description = excluded.description,
  corrective_action = excluded.corrective_action, updated_at = now();
