-- ONEPILOT PMO v4 — synchronisation Commerce, référentiels PMO et démos corrélées.
-- Migration additive et idempotente. Les modules Commerce/RH restent optionnels.

alter table if exists public.project_projects
  add column if not exists opportunity_id uuid,
  add column if not exists opportunity_number text,
  add column if not exists source_sync_status text not null default 'autonomous',
  add column if not exists source_sync_at timestamptz,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;

create unique index if not exists project_projects_org_opportunity_uq
  on public.project_projects(organization_id, opportunity_number)
  where opportunity_number is not null and archived_at is null;

update public.project_projects
set opportunity_number = source_reference
where opportunity_number is null
  and source_reference ~ '^OPP-[0-9]{4}-[0-9]{4,}$';

create or replace function public.sync_project_from_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row jsonb;
  opportunity_year integer;
  opportunity_sequence integer;
  estimated_amount numeric;
begin
  if new.source_id is null or to_regclass('public.prospects') is null then
    return new;
  end if;

  execute 'select to_jsonb(p) from public.prospects p where p.id = $1 and p.organization_id = $2 limit 1'
    into source_row using new.source_id, new.organization_id;

  if source_row is null then
    return new;
  end if;

  opportunity_year := coalesce(
    case when coalesce(source_row ->> 'created_at', '') ~ '^[0-9]{4}-' then substring(source_row ->> 'created_at' from 1 for 4)::integer end,
    extract(year from coalesce(new.start_date, current_date))::integer
  );
  opportunity_sequence := case
    when coalesce(source_row ->> 'opp_number', '') ~ '^[0-9]+$' then (source_row ->> 'opp_number')::integer
    else null
  end;
  estimated_amount := coalesce(
    case when coalesce(source_row ->> 'montant', '') ~ '^[0-9]+([.,][0-9]+)?$' then replace(source_row ->> 'montant', ',', '.')::numeric end,
    case when coalesce(source_row ->> 'ca_estime_k€', '') ~ '^[0-9]+([.,][0-9]+)?$' then replace(source_row ->> 'ca_estime_k€', ',', '.')::numeric * 1000 end,
    case when coalesce(source_row ->> 'ca_estime', '') ~ '^[0-9]+([.,][0-9]+)?$' then replace(source_row ->> 'ca_estime', ',', '.')::numeric end
  );

  new.opportunity_id := new.source_id;
  new.opportunity_number := coalesce(
    nullif(new.opportunity_number, ''),
    nullif(new.source_reference, ''),
    case when opportunity_sequence is not null then 'OPP-' || opportunity_year::text || '-' || lpad(opportunity_sequence::text, 4, '0') end
  );
  new.source_reference := coalesce(nullif(new.source_reference, ''), new.opportunity_number);
  new.source_type := coalesce(nullif(new.source_type, ''), 'opportunity');
  new.name := coalesce(nullif(new.name, ''), nullif(source_row ->> 'titre', ''), 'Projet issu de l''opportunité');
  new.ordered_budget := case when coalesce(new.ordered_budget, 0) = 0 then coalesce(estimated_amount, 0) else new.ordered_budget end;
  new.sold_amount := case when coalesce(new.sold_amount, 0) = 0 then estimated_amount else new.sold_amount end;
  new.source_snapshot := source_row;
  new.source_sync_status := 'synchronized';
  new.source_sync_at := now();
  return new;
end;
$$;

drop trigger if exists sync_project_from_opportunity_before_write on public.project_projects;
create trigger sync_project_from_opportunity_before_write
before insert or update of source_id, source_reference, opportunity_number, start_date
on public.project_projects
for each row execute function public.sync_project_from_opportunity();

-- Déclenche le rattrapage des projets déjà liés à une opportunité, sans écraser
-- les champs volontairement modifiés dans le cockpit projet.
update public.project_projects
set source_id = source_id
where source_id is not null;

-- Référentiel unique des statuts réellement proposés dans la planification.
update public.project_tasks set status = 'open' where status in ('draft', 'todo', 'planned');
update public.project_tasks set status = 'in_progress' where status = 'active';
update public.project_tasks set status = 'pending' where status in ('on_hold', 'review');
update public.project_tasks set status = 'closed' where status in ('done', 'completed');

-- Harmonisation des références qualité dans les démonstrations et historiques.
update public.project_actions
set origin_reference = regexp_replace(origin_reference, '^RISK-', 'RIS-')
where origin_reference ~ '^RISK-[0-9]{4}-[0-9]{4,}$';

-- Matrice de compétences projet autonome, exploitable même sans abonnement RH.
with first_demo_project as (
  select project.id, project.organization_id
  from public.project_projects project
  join public.organizations organization on organization.id = project.organization_id
  where lower(coalesce(organization.slug, '')) = 'onepilot'
  order by project.code
  limit 1
), requirements(skill_code, skill_name, skill_family, required_level, minimum_people, importance, planned_hours, coverage_percent, justification) as (
  values
    ('PMO-PLAN', 'Planification complexe', 'Pilotage projet', 4, 1, 'critical', 180::numeric, 75::numeric, 'Sécuriser WBS, dépendances, chemin critique et replanification.'),
    ('PMO-EVM', 'Valeur acquise et contrôle des coûts', 'Contrôle projet', 3, 1, 'required', 120::numeric, 58::numeric, 'Fiabiliser VP, VA, CR, CPI, SPI et EAC.'),
    ('QUAL-RISK', 'Management des risques', 'Qualité et risques', 4, 2, 'critical', 96::numeric, 62::numeric, 'Piloter la matrice 4×4 et les plans de réduction.'),
    ('CLIENT-GOV', 'Gouvernance et relation client', 'Management', 3, 2, 'required', 140::numeric, 88::numeric, 'Animer COPIL, arbitrages et satisfaction.'),
    ('DATA-BI', 'Analyse de données projet', 'Pilotage de la performance', 3, 1, 'required', 80::numeric, 45::numeric, 'Construire les analyses de tendance et de fiabilité.'),
    ('FIN-PROJ', 'Finance et facturation projet', 'Finance projet', 3, 1, 'required', 90::numeric, 70::numeric, 'Rapprocher production, facturation, encaissement, FAE et PCA.')
)
insert into public.project_skill_requirements (
  organization_id, project_id, skill_code, skill_name, skill_family,
  required_level, minimum_people, importance, planned_hours,
  coverage_percent, justification
)
select project.organization_id, project.id, requirement.skill_code,
  requirement.skill_name, requirement.skill_family, requirement.required_level,
  requirement.minimum_people, requirement.importance, requirement.planned_hours,
  requirement.coverage_percent, requirement.justification
from first_demo_project project
cross join requirements requirement
where not exists (
  select 1 from public.project_skill_requirements existing
  where existing.organization_id = project.organization_id
    and existing.project_id = project.id
    and lower(existing.skill_name) = lower(requirement.skill_name)
);

grant execute on function public.sync_project_from_opportunity() to authenticated;
