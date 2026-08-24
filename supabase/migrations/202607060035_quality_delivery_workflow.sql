-- ONEPILOT V15 — chaîne Qualité AVV/Delivery, acceptation des livrables
-- et synchronisation des actions. Migration additive, idempotente et multi-tenant.

create extension if not exists pgcrypto;

-- Les quatre revues AVV sont volontairement séparées du référentiel Delivery.
alter table if exists public.project_audit_themes
  add column if not exists audit_scope text not null default 'delivery';

alter table if exists public.project_audit_themes
  drop constraint if exists project_audit_themes_audit_scope_check;
alter table if exists public.project_audit_themes
  add constraint project_audit_themes_audit_scope_check
  check (audit_scope in ('avv','delivery'));

update public.project_audit_themes
set audit_scope = 'delivery',
    display_order = case code
      when 'A' then 101 when 'B' then 102 when 'C' then 103 when 'D' then 104
      when 'E' then 105 when 'F' then 106 when 'G' then 107 when 'H' then 108
      when 'I' then 109 when 'J' then 110 when 'K' then 111 when 'L' then 112
      when 'M' then 113 when 'N' then 114 when 'O' then 115 when 'P' then 116
      when 'Q' then 117 when 'R' then 118 else display_order end,
    updated_at = now()
where code in ('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R');

insert into public.project_audit_themes
  (organization_id, code, name, display_order, audit_scope)
select organization.id, source.code, source.name, source.display_order, 'delivery'
from public.organizations organization
cross join (values
  ('A','Gestion des Exigences',101), ('B','Risques et Opportunités',102),
  ('C','Planification',103), ('D','Pilotage de la Performance',104),
  ('E','Réunions, Communication',105), ('F','Vérification et Validation',106),
  ('G','Capitalisation',107), ('H','Gestion de Configuration',108),
  ('I','Gestion Documentaire',109), ('J','Sécurité des Personnes',110),
  ('K','Sûreté et Sécurité des Données',111), ('L','Gestion des Ressources',112),
  ('M','Sous-Traitance',113), ('N','X-Shore',114), ('O','Transnational',115),
  ('P','Gestion des Non-Conformités',116), ('Q','Gestion des Insatisfactions',117),
  ('R','Plan de Management Projet',118)
) as source(code, name, display_order)
on conflict (organization_id, code) do update
set name = excluded.name, display_order = excluded.display_order, audit_scope = 'delivery',
    archived_at = null, updated_at = now();

-- Le questionnaire Delivery détaillé existant devient un référentiel réutilisable
-- par tous les tenants, sans recopier les réponses de démonstration.
with reference_questions as (
  select distinct on (question.code)
    theme.code as theme_code, question.code, question.question_order,
    question.question_text, question.weight
  from public.project_audit_questions question
  join public.project_audit_themes theme on theme.id = question.theme_id
  join public.organizations organization on organization.id = question.organization_id
  where theme.code in ('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R')
    and lower(coalesce(organization.slug, '')) = 'onepilot'
    and question.archived_at is null
  order by question.code, question.created_at
)
insert into public.project_audit_questions
  (organization_id, theme_id, code, question_order, question_text, weight)
select organization.id, target_theme.id, reference.code, reference.question_order,
       reference.question_text, reference.weight
from public.organizations organization
join public.project_audit_themes target_theme
  on target_theme.organization_id = organization.id and target_theme.audit_scope = 'delivery'
join reference_questions reference on reference.theme_code = target_theme.code
on conflict (organization_id, code) do nothing;

-- Le référentiel ne préremplit jamais un nouvel audit avec les anciennes
-- réponses de démonstration. Les preuves restent portées par les réponses.
update public.project_audit_questions question
set default_answer = null, default_comment = null, updated_at = now()
from public.project_audit_themes theme
join public.organizations organization on organization.id = theme.organization_id
where theme.id = question.theme_id
  and lower(coalesce(organization.slug, '')) = 'onepilot'
  and theme.audit_scope in ('avv','delivery')
  and question.archived_at is null;

insert into public.project_audit_themes
  (organization_id, code, name, description, display_order, audit_scope)
select organization.id, source.code, source.name, source.description, source.display_order, 'avv'
from public.organizations organization
cross join (values
  ('AVV-OPP', 'Revue d’Opportunité',
   'Qualification du besoin, adéquation stratégique, capacité à répondre, risques initiaux et décision Go/No-Go.', 1),
  ('AVV-REP', 'Pilotage de la Réponse',
   'Gouvernance de la réponse, planning, contributeurs, exigences, risques et maîtrise des validations.', 2),
  ('AVV-CTR', 'Revue de Contrat',
   'Alignement du contrat avec la proposition, engagements, critères d’acceptation, risques et conditions financières.', 3),
  ('AVV-PRO', 'Revue de Proposition',
   'Cohérence technique, financière et contractuelle de la proposition avant validation et remise au client.', 4)
) as source(code, name, description, display_order)
on conflict (organization_id, code) do update
set name = excluded.name,
    description = excluded.description,
    display_order = excluded.display_order,
    audit_scope = 'avv',
    archived_at = null,
    updated_at = now();

insert into public.project_audit_questions
  (organization_id, theme_id, code, question_order, question_text, weight)
select organization.id, theme.id, source.code, source.question_order, source.question_text, source.weight
from public.organizations organization
join public.project_audit_themes theme
  on theme.organization_id = organization.id
join (values
  ('AVV-OPP', 'AUD-AVV-OPP-001', 1, 'Le besoin client, son contexte, ses objectifs et les résultats attendus sont formalisés.', 2::numeric),
  ('AVV-OPP', 'AUD-AVV-OPP-002', 2, 'L’opportunité est cohérente avec la stratégie, les offres et les références de l’entreprise.', 1::numeric),
  ('AVV-OPP', 'AUD-AVV-OPP-003', 3, 'Les parties prenantes, décideurs, concurrents et critères de décision du client sont identifiés.', 1::numeric),
  ('AVV-OPP', 'AUD-AVV-OPP-004', 4, 'Les capacités, compétences, délais et contraintes nécessaires à la réponse ont été évalués.', 2::numeric),
  ('AVV-OPP', 'AUD-AVV-OPP-005', 5, 'Les risques et opportunités initiaux sont évalués et la décision Go/No-Go est tracée avec ses réserves.', 2::numeric),

  ('AVV-REP', 'AUD-AVV-REP-001', 11, 'Le responsable de la réponse, les contributeurs, rôles et circuits de validation sont définis.', 2::numeric),
  ('AVV-REP', 'AUD-AVV-REP-002', 12, 'Le planning de réponse couvre les jalons internes, les revues et la date de remise client.', 2::numeric),
  ('AVV-REP', 'AUD-AVV-REP-003', 13, 'Les exigences de consultation sont affectées, suivies et couvertes par des preuves de réponse.', 2::numeric),
  ('AVV-REP', 'AUD-AVV-REP-004', 14, 'Les hypothèses, dépendances, risques, actions et arbitrages de la réponse sont tenus à jour.', 2::numeric),
  ('AVV-REP', 'AUD-AVV-REP-005', 15, 'Les versions des contributions et la configuration du dossier de réponse sont maîtrisées.', 1::numeric),

  ('AVV-CTR', 'AUD-AVV-CTR-001', 21, 'Le périmètre contractuel correspond à la proposition validée et les écarts sont explicités.', 2::numeric),
  ('AVV-CTR', 'AUD-AVV-CTR-002', 22, 'Les livrables, jalons, critères d’acceptation, responsabilités et dépendances client sont définis.', 2::numeric),
  ('AVV-CTR', 'AUD-AVV-CTR-003', 23, 'Les conditions de prix, facturation, paiement, indexation, pénalités et responsabilité sont revues.', 2::numeric),
  ('AVV-CTR', 'AUD-AVV-CTR-004', 24, 'Les exigences juridiques, sécurité, confidentialité, propriété intellectuelle et export sont validées.', 2::numeric),
  ('AVV-CTR', 'AUD-AVV-CTR-005', 25, 'Les réserves contractuelles disposent d’un responsable, d’une décision et d’une preuve de levée.', 2::numeric),

  ('AVV-PRO', 'AUD-AVV-PRO-001', 31, 'La solution proposée couvre les exigences et expose clairement hypothèses, exclusions et variantes.', 2::numeric),
  ('AVV-PRO', 'AUD-AVV-PRO-002', 32, 'Les charges, coûts, achats, sous-traitance, prix et marge sont cohérents et approuvés.', 2::numeric),
  ('AVV-PRO', 'AUD-AVV-PRO-003', 33, 'Le planning, les ressources, les livrables et la gouvernance proposés sont réalistes et cohérents.', 2::numeric),
  ('AVV-PRO', 'AUD-AVV-PRO-004', 34, 'La proposition a fait l’objet des validations technique, commerciale, juridique, qualité et financière requises.', 2::numeric),
  ('AVV-PRO', 'AUD-AVV-PRO-005', 35, 'La version remise, la date, le canal de transmission et l’accusé de réception sont tracés.', 1::numeric)
) as source(theme_code, code, question_order, question_text, weight)
  on theme.code = source.theme_code
on conflict (organization_id, code) do update
set theme_id = excluded.theme_id,
    question_order = excluded.question_order,
    question_text = excluded.question_text,
    weight = excluded.weight,
    archived_at = null,
    updated_at = now();

create index if not exists project_audit_themes_scope_order_idx
  on public.project_audit_themes(organization_id, audit_scope, display_order)
  where archived_at is null;

-- La validation client et la date du bon du premier coup alimentent l’OQD.
alter table if exists public.project_deliverables
  add column if not exists first_time_right_date date,
  add column if not exists acceptance_decision text,
  add column if not exists acceptance_comment text;

update public.project_deliverables
set accepted_date = coalesce(accepted_date, first_time_right_date, actual_delivery_date),
    first_time_right_date = case
      when first_time_right is true then coalesce(first_time_right_date, accepted_date, actual_delivery_date)
      else first_time_right_date end,
    acceptance_decision = coalesce(acceptance_decision,
      case when quality_status = 'accepted' or status = 'accepted' then 'accepted'
           when first_time_right is false then 'accepted_with_reservations'
           else null end),
    updated_at = now()
where accepted_date is null
   or (first_time_right is true and first_time_right_date is null)
   or acceptance_decision is null;

-- Calcul serveur : le score et la décision ne dépendent jamais d’une saisie manuelle.
create or replace function public.refresh_project_audit_score(target_audit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_scope text;
  target_organization_id uuid;
  target_project_id uuid;
  target_audit_type text;
  target_audit_date date;
  computed_score numeric(7,2);
  question_count integer;
  response_count integer;
  gap_count integer;
begin
  select case when audit_type = 'avv' then 'avv' else 'delivery' end,
         organization_id, project_id, audit_type, audit_date
  into target_scope, target_organization_id, target_project_id, target_audit_type, target_audit_date
  from public.project_audits
  where id = target_audit_id;

  if target_scope is null then return; end if;
  if auth.uid() is not null and not public.is_organization_member(target_organization_id) then
    raise exception 'Accès refusé à l’organisation %.', target_organization_id using errcode = '42501';
  end if;

  select count(*) into question_count
  from public.project_audit_questions question
  join public.project_audit_themes theme on theme.id = question.theme_id
  where theme.audit_scope = target_scope
    and theme.organization_id = target_organization_id
    and ((target_scope = 'avv' and theme.code in ('AVV-OPP','AVV-REP','AVV-CTR','AVV-PRO'))
      or (target_scope = 'delivery' and theme.code in ('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R')))
    and theme.archived_at is null and question.archived_at is null;

  select count(distinct response.question_id),
         count(*) filter (where response.answer = 'no'),
         round(
           sum(case when response.answer = 'yes' then question.weight * 100 else 0 end)
           / nullif(sum(question.weight) filter (where response.answer <> 'na'), 0), 2
         )
  into response_count, gap_count, computed_score
  from public.project_audit_responses response
  join public.project_audit_questions question on question.id = response.question_id
  join public.project_audit_themes theme on theme.id = response.theme_id
  where response.audit_id = target_audit_id
    and response.organization_id = target_organization_id
    and question.organization_id = target_organization_id
    and theme.organization_id = target_organization_id
    and response.archived_at is null
    and question.archived_at is null
    and theme.archived_at is null
    and theme.audit_scope = target_scope
    and ((target_scope = 'avv' and theme.code in ('AVV-OPP','AVV-REP','AVV-CTR','AVV-PRO'))
      or (target_scope = 'delivery' and theme.code in ('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R')));

  update public.project_audits
  set overall_score = computed_score,
      previous_score = (
        select previous.overall_score
        from public.project_audits previous
        where previous.organization_id = target_organization_id
          and previous.project_id = target_project_id
          and previous.audit_type = target_audit_type
          and previous.id <> target_audit_id
          and previous.audit_date < target_audit_date
          and previous.overall_score is not null
          and previous.archived_at is null
        order by previous.audit_date desc, previous.created_at desc
        limit 1
      ),
      decision = case
        when computed_score is null then null
        when computed_score >= 80 then 'Conforme'
        when computed_score >= 65 then 'Partiellement conforme'
        else 'Non conforme' end,
      checklist_status = case
        when coalesce(response_count, 0) = 0 then 'not_started'
        when response_count < question_count then 'in_progress'
        else 'completed' end,
      status = case
        when coalesce(response_count, 0) = 0 then 'planned'
        when response_count < question_count or coalesce(gap_count, 0) > 0 then 'in_progress'
        else 'completed' end,
      action_plan_required = coalesce(gap_count, 0) > 0,
      action_plan_status = case when coalesce(gap_count, 0) > 0 then 'open' else 'not_required' end,
      updated_at = now()
  where id = target_audit_id;
end;
$$;

revoke all on function public.refresh_project_audit_score(uuid) from public;
grant execute on function public.refresh_project_audit_score(uuid) to authenticated;

create or replace function public.refresh_project_audit_score_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_project_audit_score(old.audit_id);
  else
    perform public.refresh_project_audit_score(new.audit_id);
  end if;
  return null;
end;
$$;

drop trigger if exists refresh_project_audit_score_after_response on public.project_audit_responses;
create trigger refresh_project_audit_score_after_response
after insert or update or delete on public.project_audit_responses
for each row execute function public.refresh_project_audit_score_trigger();

-- Alimentation de démonstration uniquement pour l’audit AVV déjà livré avec ONEPILOT.
insert into public.project_audit_responses
  (organization_id, project_id, audit_id, theme_id, question_id, answer, score, comment)
select audit.organization_id, audit.project_id, audit.id, question.theme_id, question.id,
       case when question.question_order in (14,25,32) then 'no' else 'yes' end,
       case when question.question_order in (14,25,32) then 0 else 100 end,
       case when question.question_order in (14,25,32)
         then 'Écart de démonstration : responsable, échéance et preuve à renseigner.'
         else 'Preuve contrôlée dans le dossier de réponse.' end
from public.project_audits audit
join public.organizations organization on organization.id = audit.organization_id
join public.project_audit_themes theme
  on theme.organization_id = audit.organization_id and theme.audit_scope = 'avv' and theme.archived_at is null
join public.project_audit_questions question
  on question.theme_id = theme.id and question.organization_id = audit.organization_id and question.archived_at is null
where lower(coalesce(organization.slug, '')) = 'onepilot'
  and audit.audit_type = 'avv'
  and audit.comments = 'Audit de démonstration construit depuis le référentiel qualité projet ONEPILOT.'
  and audit.archived_at is null
on conflict (organization_id, audit_id, question_id) do update
set answer = excluded.answer, score = excluded.score, comment = excluded.comment,
    archived_at = null, updated_at = now();

do $$
declare audit_record record;
begin
  for audit_record in
    select id from public.project_audits
    where archived_at is null
    order by organization_id, project_id, audit_type, audit_date, created_at
  loop
    perform public.refresh_project_audit_score(audit_record.id);
  end loop;
end;
$$;

-- Recalage des séquences sur les références déjà présentes : aucun doublon lors
-- de la prochaine création RIS/LIV/NC/AUD/ACT.
with existing_codes as (
  select organization_id, substring(code from '^RIS-([0-9]{4})-')::integer as sequence_year,
         'ris'::text as sequence_kind, max(substring(code from '-([0-9]+)$')::integer) as last_value
  from public.project_risks where code ~ '^RIS-[0-9]{4}-[0-9]+$' group by organization_id, substring(code from '^RIS-([0-9]{4})-')
  union all
  select organization_id, substring(code from '^LIV-([0-9]{4})-')::integer,
         'liv', max(substring(code from '-([0-9]+)$')::integer)
  from public.project_deliverables where code ~ '^LIV-[0-9]{4}-[0-9]+$' group by organization_id, substring(code from '^LIV-([0-9]{4})-')
  union all
  select organization_id, substring(code from '^NC-([0-9]{4})-')::integer,
         'nc', max(substring(code from '-([0-9]+)$')::integer)
  from public.project_nonconformities where code ~ '^NC-[0-9]{4}-[0-9]+$' group by organization_id, substring(code from '^NC-([0-9]{4})-')
  union all
  select organization_id, substring(audit_number from '^AUD-([0-9]{4})-')::integer,
         'aud', max(substring(audit_number from '-([0-9]+)$')::integer)
  from public.project_audits where audit_number ~ '^AUD-[0-9]{4}-[0-9]+$' group by organization_id, substring(audit_number from '^AUD-([0-9]{4})-')
  union all
  select organization_id, substring(code from '^ACT-([0-9]{4})-')::integer,
         'act', max(substring(code from '-([0-9]+)$')::integer)
  from public.project_actions where code ~ '^ACT-[0-9]{4}-[0-9]+$' group by organization_id, substring(code from '^ACT-([0-9]{4})-')
)
insert into public.project_number_sequences(organization_id, sequence_year, sequence_kind, last_value)
select organization_id, sequence_year, sequence_kind, last_value from existing_codes where sequence_year is not null
on conflict (organization_id, sequence_year, sequence_kind) do update
set last_value = greatest(public.project_number_sequences.last_value, excluded.last_value), updated_at = now();

comment on column public.project_audit_themes.audit_scope is
  'Sépare strictement les quatre revues AVV du référentiel Delivery Gestion des exigences à PMP.';
comment on column public.project_deliverables.first_time_right_date is
  'Date de validation du bon du premier coup utilisée pour le calcul OQD.';
