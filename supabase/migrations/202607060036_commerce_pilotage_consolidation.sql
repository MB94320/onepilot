-- ONEPILOT V16 — consolidation Commerce, Pilotage et compatibilité Administration.
-- Migration additive, idempotente et isolée par organisation.

create extension if not exists pgcrypto;

-- Les historiques d'installation ont utilisé created_at ou performed_at.
-- Les deux colonnes sont désormais garanties, sans supprimer l'historique.
do $$
begin
  if to_regclass('public.hr_audit_logs') is not null then
    alter table public.hr_audit_logs add column if not exists created_at timestamptz;
    alter table public.hr_audit_logs add column if not exists performed_at timestamptz;
    update public.hr_audit_logs
       set created_at = coalesce(created_at, performed_at, now()),
           performed_at = coalesce(performed_at, created_at, now())
     where created_at is null or performed_at is null;
    alter table public.hr_audit_logs alter column created_at set default now();
    alter table public.hr_audit_logs alter column performed_at set default now();
  end if;
end;
$$;

alter table if exists public.pilotage_objectives
  add column if not exists source_metric_key text,
  add column if not exists calculation_rule text,
  add column if not exists improvement_direction text not null default 'increase',
  add column if not exists warning_threshold numeric(18,4),
  add column if not exists critical_threshold numeric(18,4),
  add column if not exists refresh_frequency text not null default 'monthly';

alter table if exists public.pilotage_reports
  add column if not exists scope_filter jsonb not null default '{}'::jsonb,
  add column if not exists sections jsonb not null default '{}'::jsonb,
  add column if not exists last_refresh_at timestamptz;

create table if not exists public.pilotage_objective_measurements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  objective_id uuid not null references public.pilotage_objectives(id) on delete cascade,
  measured_on date not null,
  measured_value numeric(18,4) not null default 0,
  target_value numeric(18,4),
  confidence_percent numeric(7,2) not null default 60 check (confidence_percent between 0 and 100),
  source_module text,
  source_snapshot jsonb not null default '{}'::jsonb,
  management_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, objective_id, measured_on)
);

-- La mesure et son objectif doivent appartenir au même tenant, y compris
-- lorsque l'identifiant d'un objectif d'une autre organisation est connu.
create unique index if not exists pilotage_objectives_organization_id_id_key
  on public.pilotage_objectives(organization_id, id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pilotage_objective_measurements_tenant_objective_fkey'
      and conrelid = 'public.pilotage_objective_measurements'::regclass
  ) then
    alter table public.pilotage_objective_measurements
      add constraint pilotage_objective_measurements_tenant_objective_fkey
      foreign key (organization_id, objective_id)
      references public.pilotage_objectives(organization_id, id)
      on delete cascade not valid;
  end if;
end;
$$;

create index if not exists pilotage_objective_measurements_org_date_idx
  on public.pilotage_objective_measurements(organization_id, measured_on, objective_id);

drop trigger if exists set_pilotage_objective_measurements_updated_at on public.pilotage_objective_measurements;
create trigger set_pilotage_objective_measurements_updated_at
before update on public.pilotage_objective_measurements
for each row execute function public.set_updated_at();

alter table public.pilotage_objective_measurements enable row level security;
drop policy if exists pilotage_objective_measurements_tenant_select on public.pilotage_objective_measurements;
drop policy if exists pilotage_objective_measurements_tenant_insert on public.pilotage_objective_measurements;
drop policy if exists pilotage_objective_measurements_tenant_update on public.pilotage_objective_measurements;
drop policy if exists pilotage_objective_measurements_tenant_delete on public.pilotage_objective_measurements;
create policy pilotage_objective_measurements_tenant_select on public.pilotage_objective_measurements for select to authenticated using (public.is_organization_member(organization_id));
create policy pilotage_objective_measurements_tenant_insert on public.pilotage_objective_measurements for insert to authenticated with check (public.is_organization_member(organization_id));
create policy pilotage_objective_measurements_tenant_update on public.pilotage_objective_measurements for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy pilotage_objective_measurements_tenant_delete on public.pilotage_objective_measurements for delete to authenticated using (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.pilotage_objective_measurements to authenticated;

do $$
declare
  demo_org uuid;
  demo_employee uuid;
  objective_row record;
  month_no integer;
  month_date date;
  measured numeric;
begin
  select id into demo_org
  from public.organizations
  where lower(coalesce(slug, '')) = 'onepilot'
  order by created_at
  limit 1;
  if demo_org is null then return; end if;

  select id into demo_employee
  from public.hr_employees
  where organization_id = demo_org and coalesce(is_active, true) = true
  order by id
  limit 1;

  insert into public.pilotage_objectives(
    organization_id, code, title, description, strategic_axis, status, priority,
    owner_employee_id, owner_name, start_date, target_date, baseline_value,
    current_value, target_value, unit, confidence_percent, source_module,
    source_metric_key, calculation_rule, improvement_direction,
    warning_threshold, critical_threshold, refresh_frequency, management_comment
  ) values
    (demo_org,'OBJ-2026-0005','Réduire les actions échues','Clôturer dans les délais les actions issues des projets, risques, audits et non-conformités.','Actions','in_progress','high',demo_employee,'PMO','2026-01-01','2026-12-31',18,7,2,'actions',90,'projects','overdue_actions','Nombre d’actions non clôturées dont l’échéance est dépassée.','decrease',8,14,'weekly','Arbitrage hebdomadaire des responsables et échéances.'),
    (demo_org,'OBJ-2026-0006','Renforcer la satisfaction client','Maintenir la satisfaction moyenne et traiter chaque verbatim défavorable.','Performance','in_progress','medium',demo_employee,'Direction clients','2026-01-01','2026-12-31',3.5,4.1,4.5,'/ 5',86,'projects','customer_satisfaction','Moyenne mensuelle des cinq dimensions du questionnaire client.','increase',3.8,3.2,'monthly','Action obligatoire pour toute note inférieure à 3.'),
    (demo_org,'OBJ-2026-0007','Sécuriser la couverture du plan de charge','Rapprocher charge vendue, charge planifiée, capacité et compétences disponibles.','Ressources humaines','in_progress','high',demo_employee,'Direction RH','2026-01-01','2026-12-31',68,84,95,'%',88,'hr','staffing_coverage','Charge affectée divisée par la charge requise sur la période.','increase',80,65,'weekly','Prioriser recrutement, formation ou réallocation.'),
    (demo_org,'OBJ-2026-0008','Atteindre la conformité des audits','Sécuriser les quatre revues AVV et les exigences Delivery applicables.','Qualité','in_progress','high',demo_employee,'Direction qualité','2026-01-01','2026-12-31',67,82,90,'%',92,'quality','audit_conformity','Réponses conformes divisées par réponses applicables, pondérées par criticité.','increase',80,65,'monthly','Traiter les écarts par actions synchronisées.')
  on conflict (organization_id, code) do update set
    title=excluded.title, description=excluded.description,
    source_metric_key=excluded.source_metric_key,
    calculation_rule=excluded.calculation_rule,
    warning_threshold=excluded.warning_threshold,
    critical_threshold=excluded.critical_threshold,
    refresh_frequency=excluded.refresh_frequency,
    updated_at=now(), archived_at=null;

  insert into public.pilotage_reports(
    organization_id, code, title, report_type, frequency, status,
    owner_employee_id, owner_name, period_start, period_end,
    reliability_percent, executive_summary, decisions, recommended_actions,
    source_modules, generated_at, last_refresh_at, scope_filter, sections
  ) values
    (demo_org,'RAP-2026-0003','Revue commerciale et prévisions','commercial','monthly','published',demo_employee,'Direction commerciale','2026-07-01','2026-07-31',87,'Analyse des prospects, décisions Go/No-Go, marge AVV, commandes et transformation en projets.','Prioriser les offres à forte valeur pondérée et sécuriser les dossiers incomplets.','Dater les prochaines actions, passer les revues AVV et rapprocher capacité et charge vendue.','{commerce,projects,hr}'::text[],now(),now(),'{}'::jsonb,'{"kpi":["pipeline","conversion","margin","orders"],"views":["kanban","choropleth"]}'::jsonb),
    (demo_org,'RAP-2026-0004','Revue ressources et capacité','hr','monthly','approved',demo_employee,'Direction RH','2026-07-01','2026-07-31',90,'Effectif, disponibilité, charge, compétences critiques, absences et plans de développement.','Réallouer les surcharges et traiter les écarts de compétences prioritaires.','Synchroniser staffing, plan de charge et besoins projet.','{hr,projects,commerce}'::text[],now(),now(),'{}'::jsonb,'{"kpi":["headcount","capacity","staffing","skills"]}'::jsonb),
    (demo_org,'RAP-2026-0005','Revue qualité et risques','quality','monthly','approved',demo_employee,'Direction qualité','2026-07-01','2026-07-31',93,'Risques, livrables, OTD, OQD, non-conformités, audits et efficacité des actions.','Traiter les risques inacceptables et les écarts d’audit échus.','Piloter les actions dans le registre unique et vérifier leur efficacité.','{quality,projects,actions}'::text[],now(),now(),'{}'::jsonb,'{"kpi":["risks","deliverables","nonconformities","audits"]}'::jsonb),
    (demo_org,'RAP-2026-0006','Revue finance et trésorerie','finance','monthly','approved',demo_employee,'Direction financière','2026-07-01','2026-07-31',91,'Production, coûts, marge, facturation, encaissement, PCA, encours et prévision à terminaison.','Sécuriser la prochaine facturation et corriger les dérives de marge.','Rapprocher AVV, temps, achats, notes de frais et finance projet.','{finance,commerce,projects,hr}'::text[],now(),now(),'{}'::jsonb,'{"kpi":["production","cost","margin","billing","cash"]}'::jsonb)
  on conflict (organization_id, code) do update set
    executive_summary=excluded.executive_summary,
    decisions=excluded.decisions,
    recommended_actions=excluded.recommended_actions,
    scope_filter=excluded.scope_filter,
    sections=excluded.sections,
    last_refresh_at=now(), updated_at=now(), archived_at=null;

  update public.pilotage_objectives set
    source_metric_key = coalesce(source_metric_key, case code
      when 'OBJ-2026-0001' then 'portfolio_margin'
      when 'OBJ-2026-0002' then 'deliverable_otd'
      when 'OBJ-2026-0003' then 'critical_skills_coverage'
      when 'OBJ-2026-0004' then 'commercial_data_quality'
      else null end),
    calculation_rule = coalesce(calculation_rule, 'Calcul consolidé depuis le module source sans ressaisie.'),
    refresh_frequency = coalesce(refresh_frequency, 'monthly')
  where organization_id = demo_org;

  for objective_row in
    select id, code, baseline_value, current_value, target_value, confidence_percent, source_module
    from public.pilotage_objectives
    where organization_id = demo_org and archived_at is null
  loop
    for month_no in 1..8 loop
      month_date := make_date(2026, month_no, 1);
      measured := objective_row.baseline_value + (objective_row.current_value - objective_row.baseline_value) * month_no / 8.0;
      insert into public.pilotage_objective_measurements(
        organization_id, objective_id, measured_on, measured_value,
        target_value, confidence_percent, source_module, source_snapshot,
        management_comment
      ) values (
        demo_org, objective_row.id, month_date, round(measured, 4),
        objective_row.target_value,
        greatest(55, objective_row.confidence_percent - (8 - month_no) * 2),
        objective_row.source_module,
        jsonb_build_object('objective_code', objective_row.code, 'period', to_char(month_date, 'YYYY-MM')),
        'Mesure mensuelle consolidée depuis les données opérationnelles.'
      ) on conflict (organization_id, objective_id, measured_on) do update set
        measured_value=excluded.measured_value,
        target_value=excluded.target_value,
        confidence_percent=excluded.confidence_percent,
        source_snapshot=excluded.source_snapshot,
        updated_at=now();
    end loop;
  end loop;
end;
$$;

comment on table public.pilotage_objective_measurements is
  'Historique multi-tenant des mesures d’objectifs, avec cible, confiance et preuve de source.';
