-- ONEPILOT V13 — consolidation métier Pilotage, droits, Qualité, Finance,
-- bibliothèque documentaire et assistants IA.
-- Migration additive, idempotente et isolée par organisation.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Pilotage stratégique et rapports de management
-- -----------------------------------------------------------------------------

create table if not exists public.pilotage_objectives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  strategic_axis text not null default 'performance',
  status text not null default 'open' check (status in ('open','in_progress','blocked','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  owner_name text,
  start_date date,
  target_date date,
  baseline_value numeric(18,4) not null default 0,
  current_value numeric(18,4) not null default 0,
  target_value numeric(18,4) not null default 0,
  unit text not null default '%',
  confidence_percent numeric(7,2) not null default 60 check (confidence_percent between 0 and 100),
  source_module text,
  source_entity_id uuid,
  last_review_at timestamptz,
  management_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.pilotage_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  report_type text not null default 'executive',
  frequency text not null default 'monthly' check (frequency in ('weekly','monthly','quarterly','annual','on_demand')),
  status text not null default 'planned' check (status in ('planned','in_progress','review','approved','published','archived')),
  owner_employee_id uuid references public.hr_employees(id) on delete set null,
  owner_name text,
  period_start date,
  period_end date,
  reliability_percent numeric(7,2) not null default 60 check (reliability_percent between 0 and 100),
  executive_summary text,
  decisions text,
  recommended_actions text,
  source_modules text[] not null default '{}'::text[],
  generated_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create index if not exists pilotage_objectives_org_status_idx on public.pilotage_objectives(organization_id, status, target_date) where archived_at is null;
create index if not exists pilotage_reports_org_period_idx on public.pilotage_reports(organization_id, period_end desc, status) where archived_at is null;

drop trigger if exists set_pilotage_objectives_updated_at on public.pilotage_objectives;
create trigger set_pilotage_objectives_updated_at before update on public.pilotage_objectives for each row execute function public.set_updated_at();
drop trigger if exists set_pilotage_reports_updated_at on public.pilotage_reports;
create trigger set_pilotage_reports_updated_at before update on public.pilotage_reports for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Habilitations mixtes : un même module peut être en lecture et certains
-- sous-modules en modification ou administration.
-- -----------------------------------------------------------------------------

alter table if exists public.platform_access_grants
  add column if not exists permission_matrix jsonb not null default '{}'::jsonb,
  add column if not exists justification text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

comment on column public.platform_access_grants.permission_matrix is
  'Droits par sous-module, par exemple {"Portefeuille":"edit","Performance":"view"}. Le droit du module reste la valeur par défaut.';

-- -----------------------------------------------------------------------------
-- Qualité et actions reliées
-- -----------------------------------------------------------------------------

alter table if exists public.project_deliverables
  add column if not exists first_time_right_date date,
  add column if not exists acceptance_decision text,
  add column if not exists acceptance_comment text;

update public.project_deliverables
set first_time_right_date = coalesce(first_time_right_date, accepted_date, actual_delivery_date)
where first_time_right is true and first_time_right_date is null;

alter table if exists public.project_nonconformities
  add column if not exists containment_action text,
  add column if not exists correction_action text,
  add column if not exists preventive_action text,
  add column if not exists analysis_method text not null default '8D',
  add column if not exists five_whys jsonb not null default '[]'::jsonb,
  add column if not exists eight_d jsonb not null default '{}'::jsonb,
  add column if not exists effectiveness_date date,
  add column if not exists effectiveness_comment text;

alter table if exists public.project_actions
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists source_reference text,
  add column if not exists synchronization_status text not null default 'synchronized';

create index if not exists project_actions_source_idx
  on public.project_actions(organization_id, source_entity_type, source_entity_id)
  where archived_at is null;

alter table if exists public.project_audits
  add column if not exists responsible_employee_id uuid references public.hr_employees(id) on delete set null,
  add column if not exists responsible_name text,
  add column if not exists checklist_status text not null default 'not_started',
  add column if not exists action_plan_required boolean not null default false,
  add column if not exists action_plan_status text not null default 'open';

-- -----------------------------------------------------------------------------
-- Finance et notes de frais
-- -----------------------------------------------------------------------------

alter table if exists public.project_financial_periods
  add column if not exists payment_terms_days integer not null default 30 check (payment_terms_days in (0,30,45,60,90)),
  add column if not exists next_invoice_date date,
  add column if not exists pca_amount numeric(16,2) not null default 0,
  add column if not exists unbilled_revenue_amount numeric(16,2) not null default 0,
  add column if not exists period_margin_amount numeric(16,2) not null default 0,
  add column if not exists period_margin_percent numeric(9,4) not null default 0,
  add column if not exists forecast_production_amount numeric(16,2) not null default 0,
  add column if not exists forecast_cost_amount numeric(16,2) not null default 0,
  add column if not exists forecast_invoice_amount numeric(16,2) not null default 0;

update public.project_financial_periods
set pca_amount = greatest(0, coalesce(invoiced_amount, 0) - coalesce(production_amount, 0)),
    unbilled_revenue_amount = greatest(0, coalesce(production_amount, 0) - coalesce(invoiced_amount, 0)),
    period_margin_amount = coalesce(production_amount, 0) - coalesce(actual_cost, 0),
    period_margin_percent = case when coalesce(production_amount, 0) = 0 then 0 else round(((production_amount - actual_cost) / production_amount) * 100, 4) end,
    forecast_production_amount = coalesce(nullif(forecast_production_amount, 0), earned_value, production_amount, 0),
    forecast_cost_amount = coalesce(nullif(forecast_cost_amount, 0), actual_cost, 0),
    forecast_invoice_amount = coalesce(nullif(forecast_invoice_amount, 0), invoiced_amount, 0);

create or replace function public.set_project_financial_derived_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.pca_amount := greatest(0, coalesce(new.invoiced_amount, 0) - coalesce(new.production_amount, 0));
  new.unbilled_revenue_amount := greatest(0, coalesce(new.production_amount, 0) - coalesce(new.invoiced_amount, 0));
  new.period_margin_amount := coalesce(new.production_amount, 0) - coalesce(new.actual_cost, 0);
  new.period_margin_percent := case when coalesce(new.production_amount, 0) = 0 then 0 else round(((new.production_amount - new.actual_cost) / new.production_amount) * 100, 4) end;
  new.outstanding_amount := greatest(0, coalesce(new.invoiced_amount, 0) - coalesce(new.collected_amount, 0));
  if new.period_start is not null and new.payment_terms_days is not null and new.next_invoice_date is null then
    new.next_invoice_date := (new.period_start + make_interval(days => new.payment_terms_days))::date;
  end if;
  return new;
end;
$$;

drop trigger if exists project_financial_periods_derived_values on public.project_financial_periods;
create trigger project_financial_periods_derived_values
before insert or update of production_amount, actual_cost, invoiced_amount, collected_amount, period_start, payment_terms_days
on public.project_financial_periods
for each row execute function public.set_project_financial_derived_values();

create table if not exists public.finance_expense_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.hr_employees(id) on delete set null,
  employee_name text not null,
  employee_number text,
  report_number text not null,
  expense_month date not null,
  company_name text,
  agency_name text,
  project_id uuid references public.project_projects(id) on delete set null,
  client_name text,
  training_related boolean not null default false,
  billable_to_client boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','manager_approved','finance_approved','rejected','paid','archived')),
  total_amount numeric(16,2) not null default 0,
  reimbursable_amount numeric(16,2) not null default 0,
  manager_comment text,
  finance_comment text,
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, report_number),
  unique (organization_id, employee_id, expense_month)
);

create table if not exists public.finance_expense_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.finance_expense_reports(id) on delete cascade,
  receipt_number text,
  expense_date date not null,
  nature text not null,
  justification text,
  travel_location text,
  mission_reference text,
  meeting_purpose text,
  guest_names text,
  payment_method text not null default 'personal',
  amount_excluding_tax numeric(16,2) not null default 0,
  vat_amount numeric(16,2) not null default 0,
  amount_including_tax numeric(16,2) not null default 0,
  mileage_km numeric(12,2) not null default 0,
  receipt_url text,
  is_compliant boolean,
  control_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists finance_expense_reports_org_month_idx on public.finance_expense_reports(organization_id, expense_month desc, status) where archived_at is null;
create index if not exists finance_expense_items_report_idx on public.finance_expense_items(report_id, expense_date) where archived_at is null;
drop trigger if exists set_finance_expense_reports_updated_at on public.finance_expense_reports;
create trigger set_finance_expense_reports_updated_at before update on public.finance_expense_reports for each row execute function public.set_updated_at();
drop trigger if exists set_finance_expense_items_updated_at on public.finance_expense_items;
create trigger set_finance_expense_items_updated_at before update on public.finance_expense_items for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Documents, procédures, modèles et assistants IA
-- -----------------------------------------------------------------------------

create table if not exists public.platform_document_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  module_key text not null,
  phase text not null default 'transverse',
  category text not null default 'template',
  file_format text not null default 'DOCX',
  version text not null default '1.0',
  status text not null default 'approved',
  owner_name text,
  source_reference text,
  download_url text,
  is_mandatory boolean not null default false,
  ai_generation_supported boolean not null default false,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.platform_ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  domain text not null,
  description text,
  trigger_type text not null default 'manual',
  autonomy_level text not null default 'assisted' check (autonomy_level in ('assisted','supervised','automatic')),
  status text not null default 'draft' check (status in ('draft','active','paused','error','archived')),
  input_contract jsonb not null default '{}'::jsonb,
  output_contract jsonb not null default '{}'::jsonb,
  safeguards jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  success_rate_percent numeric(7,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create index if not exists platform_document_catalog_org_idx on public.platform_document_catalog(organization_id, module_key, phase, category) where archived_at is null;
create index if not exists platform_ai_agents_org_idx on public.platform_ai_agents(organization_id, domain, status) where archived_at is null;
drop trigger if exists set_platform_document_catalog_updated_at on public.platform_document_catalog;
create trigger set_platform_document_catalog_updated_at before update on public.platform_document_catalog for each row execute function public.set_updated_at();
drop trigger if exists set_platform_ai_agents_updated_at on public.platform_ai_agents;
create trigger set_platform_ai_agents_updated_at before update on public.platform_ai_agents for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS multi-tenant des nouveaux référentiels
-- -----------------------------------------------------------------------------

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'pilotage_objectives','pilotage_reports','finance_expense_reports','finance_expense_items',
    'platform_document_catalog','platform_ai_agents'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_select', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_update', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_tenant_delete', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_organization_member(organization_id))', table_name || '_tenant_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_organization_member(organization_id))', table_name || '_tenant_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id))', table_name || '_tenant_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_organization_member(organization_id))', table_name || '_tenant_delete', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Nettoyage du référentiel de compétences : un chapitre métier unique.
-- -----------------------------------------------------------------------------

update public.hr_skill_catalog
set family = 'Projet & PMO', updated_at = now()
where lower(regexp_replace(coalesce(family, ''), '[^a-zA-Z0-9]+', '', 'g')) in ('projetpmo','projectpmo');

update public.hr_skill_catalog
set family = initcap(trim(family)), category = initcap(trim(category)), name = trim(name), updated_at = now()
where family is not null and category is not null and name is not null;

update public.hr_skill_catalog
set family = 'Projet & PMO', updated_at = now()
where lower(regexp_replace(coalesce(family, ''), '[^a-zA-Z0-9]+', '', 'g')) in ('projetpmo','projectpmo');

-- -----------------------------------------------------------------------------
-- Données de démonstration corrélées au tenant ONEPILOT
-- -----------------------------------------------------------------------------

do $$
declare demo_org uuid; demo_project uuid; demo_employee uuid;
begin
  select id into demo_org from public.organizations where lower(coalesce(slug, '')) = 'onepilot' order by created_at limit 1;
  if demo_org is null then return; end if;
  select id into demo_project from public.project_projects where organization_id = demo_org and archived_at is null order by code limit 1;
  -- hr_employees ne possède volontairement pas de colonne archived_at dans tous
  -- les historiques d'installation. is_active est le critère transversal fiable.
  select id into demo_employee
  from public.hr_employees
  where organization_id = demo_org
    and coalesce(is_active, true) = true
  order by employee_number nulls last, id
  limit 1;

  insert into public.pilotage_objectives(organization_id, code, title, description, strategic_axis, status, priority, owner_employee_id, owner_name, start_date, target_date, baseline_value, current_value, target_value, unit, confidence_percent, source_module, management_comment)
  values
    (demo_org,'OBJ-2026-0001','Sécuriser la marge du portefeuille','Maintenir la marge consolidée au-dessus de la cible tout en fiabilisant les coûts à terminaison.','Finance','in_progress','high',demo_employee,'Direction financière','2026-01-01','2026-12-31',18,21.4,24,'%',86,'finance','Prioriser les projets dont la VAC est négative.'),
    (demo_org,'OBJ-2026-0002','Améliorer la ponctualité des livrables','Réduire les retards et augmenter le taux de livraison à l’heure.','Qualité','in_progress','high',demo_employee,'Direction des projets','2026-01-01','2026-12-31',78,84,92,'%',91,'quality','Plans d’action ouverts sur les causes récurrentes.'),
    (demo_org,'OBJ-2026-0003','Accroître la couverture des compétences critiques','Rapprocher le besoin projet de la matrice RH et déclencher les plans de développement.','Ressources','open','medium',demo_employee,'Direction RH','2026-02-01','2026-11-30',64,72,90,'%',78,'hr','Former et affecter les ressources sur les écarts prioritaires.'),
    (demo_org,'OBJ-2026-0004','Fiabiliser le pipeline commercial','Améliorer la qualité des probabilités et la transformation AVV vers projets.','Commerce','in_progress','medium',demo_employee,'Direction commerciale','2026-01-01','2026-12-31',55,68,80,'%',82,'commerce','Revue Go/No-Go mensuelle et prochaine action obligatoire.')
  on conflict (organization_id, code) do update set current_value=excluded.current_value, target_value=excluded.target_value, confidence_percent=excluded.confidence_percent, updated_at=now(), archived_at=null;

  insert into public.pilotage_reports(organization_id, code, title, report_type, frequency, status, owner_employee_id, owner_name, period_start, period_end, reliability_percent, executive_summary, decisions, recommended_actions, source_modules, generated_at)
  values
    (demo_org,'RAP-2026-0001','Revue exécutive mensuelle','executive','monthly','published',demo_employee,'Direction générale','2026-07-01','2026-07-31',89,'Trajectoire globalement maîtrisée avec vigilance sur deux projets et la concentration des livrables.','Renforcer la capacité sur les compétences critiques et sécuriser la prochaine facturation.','Rebaseliner les restes à faire, clôturer les actions échues et lancer les relances clients.','{commerce,projects,hr,quality,finance}'::text[],now()),
    (demo_org,'RAP-2026-0002','Revue portefeuille projets','portfolio','monthly','approved',demo_employee,'PMO','2026-07-01','2026-07-31',92,'Les indices CPI et SPI restent lisibles, mais la fiabilité de deux reportings doit progresser.','Maintenir le plan de récupération et arbitrer les charges en surcharge.','Mettre à jour les jalons, les risques majeurs et les prévisions à terminaison.','{projects,hr,quality,finance}'::text[],now())
  on conflict (organization_id, code) do update set reliability_percent=excluded.reliability_percent, executive_summary=excluded.executive_summary, updated_at=now(), archived_at=null;

  insert into public.platform_document_catalog(organization_id, code, title, description, module_key, phase, category, file_format, version, status, owner_name, source_reference, is_mandatory, ai_generation_supported, tags)
  values
    (demo_org,'MOD-AVV-001','Dossier d’opportunité et décision Go/No-Go','Qualification du besoin, risques AVV, stratégie de réponse, critères de décision et preuves.','commerce','AVV','template','XLSX','1.0','approved','Commerce','ADM234_SU_13 / revue opportunité',true,true,'{opportunité,go-no-go,risques}'::text[]),
    (demo_org,'MOD-PRJ-001','Plan de management de projet','Périmètre, PBS/WBS/OBS, gouvernance, RACI, qualité, risques, ressources, planning et indicateurs.','projects','Delivery','template','DOCX','1.0','approved','PMO','ADM234_SU_25_20',true,true,'{PMP,RACI,WBS,planning}'::text[]),
    (demo_org,'MOD-QUA-001','Plan d’assurance qualité','Référentiel des contrôles, audits, non-conformités, preuves, actions et critères d’acceptation.','quality','Delivery','template','DOCX','1.0','approved','Qualité','PPQA ADM234',true,true,'{audit,qualité,conformité}'::text[]),
    (demo_org,'PRO-RSK-001','Processus de gestion des risques et opportunités','Identifier, analyser, valoriser, traiter, surveiller et reporter les risques AVV et Delivery.','quality','Transverse','procedure','PDF','1.0','approved','Qualité','RSKM ADM234',true,false,'{risque,opportunité,actions}'::text[]),
    (demo_org,'MOD-FIN-001','Note de frais mensuelle','Saisie des dépenses, justificatifs, rattachement projet/client, validations manager et finance.','finance','Transverse','template','XLSX','1.0','approved','Finance','Note de frais.xlsx',false,true,'{dépenses,justificatifs,remboursement}'::text[]),
    (demo_org,'MOD-COPIL-001','Support de COPIL externe','Activité, livrables, planning, budget, qualité, risques, satisfaction, décisions et priorités.','projects','Delivery','template','PPTX','1.0','approved','PMO','ADM234_SU_36_10',false,true,'{COPIL,reporting,décisions}'::text[]),
    (demo_org,'PRO-PMO-001','Processus de pilotage projet','Évaluer les performances, traiter les écarts, rendre compte, gérer actions, changements et problèmes.','projects','Delivery','procedure','PDF','1.0','approved','PMO','PMC - Pilotage projet ADM234_PRA_05_10.pdf',true,false,'{pilotage,EVM,actions,changements}'::text[]),
    (demo_org,'PRO-PLAN-001','Processus de planification projet','Structurer PBS, WBS, OBS et SOW, ordonnancer, calculer PERT, marges et chemin critique puis établir la référence.','projects','AVV et Delivery','procedure','PDF','1.0','approved','PMO','PP - Planification projet ADM234_PRA_06_10.pdf',true,false,'{PBS,WBS,OBS,SOW,PERT}'::text[]),
    (demo_org,'PRO-QUA-001','Processus d’assurance qualité','Planifier les contrôles, vérifier les critères d’acceptation, auditer les pratiques et traiter NC et dérogations.','quality','AVV et Delivery','procedure','PDF','1.0','approved','Qualité','PPQA - Assurance qualité ADM234_PRA_07_12.pdf',true,false,'{audit,livrables,NC,dérogations}'::text[]),
    (demo_org,'PRO-REQ-001','Processus de gestion des exigences','Identifier, analyser, approuver, tracer, vérifier et gérer les changements d’exigences client et réglementaires.','quality','AVV et Delivery','procedure','PDF','1.0','approved','Qualité','REQM - Gestion Exigences ADM234_PRA_08_11.pdf',true,false,'{exigences,traçabilité,validation}'::text[]),
    (demo_org,'PRO-DOC-001','Processus de gestion documentaire','Créer, identifier, vérifier, approuver, diffuser, versionner, archiver et retirer les documents applicables.','workspace','Transverse','procedure','PDF','1.0','approved','Qualité','DOC - Gestion documentation ADM234_PRA_02_12.pdf',true,false,'{documents,versions,approbation}'::text[]),
    (demo_org,'MOD-SAT-001','Évaluation mensuelle de satisfaction client','Écoute client, respect des engagements, expertise, pilotage et maîtrise des risques, avec tendance et plan d’action.','projects','Delivery','template','DOCX','1.0','approved','PMO','Evaluation satisfaction client ADM234_SU_03_12.docx',false,true,'{satisfaction,client,performance}'::text[]),
    (demo_org,'MOD-CMP-001','Matrice des compétences projet et profils','Besoin projet, niveaux attendus 0 à 4, niveaux initial et actuel, écarts par ressource et plan de développement.','hr','AVV et Delivery','template','XLSM','1.0','approved','Ressources humaines','Matrice des compétences PROFIL / PROJET ADM234',true,true,'{compétences,besoin,écarts,formation}'::text[]),
    (demo_org,'MOD-RIS-001','Registre exigences, risques, opportunités et actions','Identification continue, évaluation, valorisation financière, stratégie, actions, suivi et reporting.','quality','AVV et Delivery','template','XLSM','1.0','approved','Qualité','Exigences Risques Opportunités Actions ADM234_SU_14_25.xlsm',true,true,'{risques,opportunités,actions}'::text[]),
    (demo_org,'MOD-BL-001','Bon de livraison et acceptation','Preuve de remise, version, date, réserves, critères d’acceptation, validation client et bon du premier coup.','quality','Delivery','template','XLSX','1.0','approved','Qualité','Bon de Livraison ADM34_SU_10_12.xlsx',true,true,'{livrable,acceptation,OTD,OQD}'::text[]),
    (demo_org,'MOD-CRR-001','Compte rendu de revue hebdomadaire','Avancement, reste à faire, charge, planning, livrables, risques, actions, décisions et points d’escalade.','projects','Delivery','template','XLSX','1.0','approved','PMO','CRR Hebdo projet.xlsx',false,true,'{hebdomadaire,reporting,actions}'::text[]),
    (demo_org,'MOD-RACI-001','Matrice RACI et gouvernance','Rôles responsable, approbateur, consulté et informé par processus, livrable, jalon et décision.','projects','AVV et Delivery','template','XLSX','1.0','approved','PMO','Process Hibiscus - RASCI awareness.xlsx',false,true,'{RACI,RASCI,gouvernance}'::text[])
  on conflict (organization_id, code) do update set title=excluded.title, description=excluded.description, updated_at=now(), archived_at=null;

  insert into public.platform_ai_agents(organization_id, code, name, domain, description, trigger_type, autonomy_level, status, input_contract, output_contract, safeguards)
  values
    (demo_org,'AGT-PMO-001','Préparateur de COPIL','Projets','Sélectionne les KPI et graphiques du projet, explique les écarts et prépare décisions et support de comité.','monthly','supervised','active','{"sources":["projects","quality","finance","hr"]}'::jsonb,'{"deliverables":["synthèse","présentation","actions"]}'::jsonb,'{"human_validation":true,"no_external_send":true}'::jsonb),
    (demo_org,'AGT-CRM-001','Veille et relance commerciale','Commerce','Détecte les opportunités sans prochaine action, prépare les relances et suggère les prospects prioritaires.','daily','supervised','active','{"sources":["clients","prospects","offers"]}'::jsonb,'{"deliverables":["priorités","brouillons_email","alertes"]}'::jsonb,'{"human_validation":true,"no_external_send":true}'::jsonb),
    (demo_org,'AGT-QUA-001','Assistant 8D et actions qualité','Qualité','Guide l’analyse causale, propose corrections, actions et preuves de contrôle sans clôture automatique.','event','assisted','active','{"sources":["nonconformities","audits","risks"]}'::jsonb,'{"deliverables":["5_pourquoi","8D","actions"]}'::jsonb,'{"human_validation":true,"no_auto_close":true}'::jsonb),
    (demo_org,'AGT-FIN-001','Contrôleur de marge et trésorerie','Finance','Analyse production, coûts, facturation, PCA, FAE, encaissement et prévisions pour recommander des leviers.','monthly','supervised','active','{"sources":["avv","time","expenses","billing"]}'::jsonb,'{"deliverables":["forecast","alertes","leviers"]}'::jsonb,'{"human_validation":true,"no_payment_action":true}'::jsonb)
  on conflict (organization_id, code) do update set description=excluded.description, safeguards=excluded.safeguards, updated_at=now(), archived_at=null;

  if demo_project is not null then
    insert into public.finance_expense_reports(organization_id, employee_id, employee_name, employee_number, report_number, expense_month, company_name, agency_name, project_id, client_name, billable_to_client, status, total_amount, reimbursable_amount)
    values (demo_org,demo_employee,'Ressource démonstration','EMP-DEMO','NDF-2026-0001','2026-07-01','ONEPILOT','Paris',demo_project,'Client démonstration',true,'finance_approved',428.60,428.60)
    on conflict (organization_id, report_number) do update set total_amount=excluded.total_amount, status=excluded.status, updated_at=now(), archived_at=null;
  end if;
end;
$$;

comment on table public.pilotage_objectives is 'Objectifs stratégiques reliés aux sources Commerce, Projets, RH, Qualité et Finance.';
comment on table public.pilotage_reports is 'Rapports de management versionnés par période, avec fiabilité, décisions et recommandations.';
comment on table public.finance_expense_reports is 'En-têtes mensuels de notes de frais, avec workflow manager et Finance.';
comment on table public.platform_document_catalog is 'Catalogue des modèles, procédures, processus et références téléchargeables de ONEPILOT.';
comment on table public.platform_ai_agents is 'Catalogue des assistants et agents IA gouvernés, avec entrées, sorties et garde-fous.';
