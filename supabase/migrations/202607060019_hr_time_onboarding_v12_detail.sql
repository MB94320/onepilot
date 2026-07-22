create extension if not exists pgcrypto;

alter table if exists public.hr_time_activity_entries
  add column if not exists week_number integer,
  add column if not exists month_number integer,
  add column if not exists month_label text,
  add column if not exists expense_cost numeric default 0,
  add column if not exists time_entry_status text default 'draft';

update public.hr_time_activity_entries
set week_number = coalesce(week_number, extract(week from activity_date)::integer),
    month_number = coalesce(month_number, extract(month from activity_date)::integer),
    month_label = coalesce(month_label, to_char(activity_date, 'YYYY-MM')),
    expense_cost = coalesce(expense_cost, 0),
    total_hours = coalesce(nullif(total_hours, 0), coalesce(avv_hours,0) + coalesce(management_hours,0) + coalesce(production_hours,0) + coalesce(rework_hours,0) + coalesce(training_hours,0) + coalesce(intercontract_hours,0), coalesce(duration_hours,0)),
    total_cost = coalesce(nullif(total_cost, 0), coalesce(avv_cost,0) + coalesce(management_cost,0) + coalesce(production_cost,0) + coalesce(rework_cost,0) + coalesce(purchase_cost,0) + coalesce(expense_cost,0));

alter table if exists public.hr_onboarding_plans
  add column if not exists onboarding_decision_note text,
  add column if not exists onboarding_risk_comment text;

-- Démo opérationnelle idempotente avec semaine/mois, IC annuel et rubriques visibles.
do $$
declare
  org record;
  employee record;
  idx integer;
  base_day date := date '2026-07-13';
  current_day date;
  loaded_rate numeric := 75;
begin
  for org in select id from public.organizations loop
    idx := 0;
    for employee in
      select id, manager_employee_id
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 12
    loop
      idx := idx + 1;
      for current_day in select generate_series(base_day, base_day + interval '4 days', interval '1 day')::date loop
        insert into public.hr_time_activity_entries (
          organization_id, employee_id, activity_date, activity_type, duration_hours, status,
          project_number, project_designation, week_number, month_number, month_label,
          avv_hours, management_hours, production_hours, rework_hours, training_hours, intercontract_hours,
          avv_cost, management_cost, production_cost, rework_cost, purchase_cost, expense_cost,
          total_hours, total_cost, comments, description, validation_manager_status, manager_comment, time_entry_status
        ) values (
          org.id,
          employee.id,
          current_day,
          case when idx % 4 = 0 then 'intercontract' else 'project_delivery' end,
          case when idx % 4 = 0 then 7.5 else 7.5 end,
          case when idx % 5 = 0 then 'submitted' else 'approved' end,
          case when idx % 4 = 0 then 'IC-2026-0001' else 'P-2026-' || lpad(idx::text, 4, '0') end,
          case when idx % 4 = 0 then 'Intercontrat annuel 2026' else 'Projet client ' || lpad(idx::text, 2, '0') end,
          extract(week from current_day)::integer,
          extract(month from current_day)::integer,
          to_char(current_day, 'YYYY-MM'),
          case when idx % 4 = 0 then 0 else case when extract(isodow from current_day) = 1 then 1 else 0 end end,
          case when idx % 4 = 0 then 0 else case when extract(isodow from current_day) = 2 then 1.5 else 0.5 end end,
          case when idx % 4 = 0 then 0 else 5.5 end,
          case when idx % 6 = 0 and idx % 4 <> 0 then 1 else 0 end,
          case when extract(isodow from current_day) = 5 then 1 else 0 end,
          case when idx % 4 = 0 then 7.5 else 0 end,
          case when idx % 4 = 0 then 0 else (case when extract(isodow from current_day) = 1 then 1 else 0 end) * loaded_rate end,
          case when idx % 4 = 0 then 0 else (case when extract(isodow from current_day) = 2 then 1.5 else 0.5 end) * loaded_rate end,
          case when idx % 4 = 0 then 0 else 5.5 * loaded_rate end,
          case when idx % 6 = 0 and idx % 4 <> 0 then loaded_rate else 0 end,
          case when extract(isodow from current_day) = 3 then 120 else 0 end,
          case when extract(isodow from current_day) = 4 then 35 else 0 end,
          7.5,
          case when idx % 4 = 0 then 7.5 * loaded_rate else (7.5 * loaded_rate) + case when extract(isodow from current_day) = 3 then 120 else 0 end + case when extract(isodow from current_day) = 4 then 35 else 0 end end,
          'Pointage hebdomadaire démo : semaine ' || extract(week from current_day)::integer || ', jour ' || to_char(current_day, 'DD/MM/YYYY') || '.',
          'Pointage hebdomadaire structuré par projet, rubrique et validation N+1.',
          case when idx % 5 = 0 then 'submitted' else 'approved' end,
          'Validation N+1 selon clôture mensuelle.',
          case when idx % 5 = 0 then 'submitted' else 'finalized' end
        ) on conflict do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- Checklist onboarding exhaustive : uniquement pour les parcours existants incomplets.
update public.hr_onboarding_plans
set checklist_items = jsonb_build_array(
  jsonb_build_object('owner','RH','label','Contrat signé et dossier administratif complet','status','OK','note','Contrat, RIB, urgence, identité, documents.'),
  jsonb_build_object('owner','RH','label','Livret d’accueil disponible et remis','status','OK','note','Support d’accueil société et règles internes.'),
  jsonb_build_object('owner','IT','label','PC disponible et configuré','status','OK','note','Matériel, sécurité, accès session.'),
  jsonb_build_object('owner','IT','label','Adresse mail, SSO et accès outils créés','status','OK','note','Messagerie, ONEPILOT, outils projet.'),
  jsonb_build_object('owner','RH','label','Fournitures et badge remis','status','NA','note','Selon site et statut.'),
  jsonb_build_object('owner','Manager','label','Présentation organisation et société réalisée','status','OK','note','Organisation, stratégie, clients, processus.'),
  jsonb_build_object('owner','Manager','label','Présentation équipe projet réalisée','status','NOK','note','À planifier avec le chef de projet.'),
  jsonb_build_object('owner','Manager','label','Fiche de poste expliquée','status','OK','note','Missions, responsabilités, critères de réussite.'),
  jsonb_build_object('owner','CdP','label','Présentation du projet affecté','status','NOK','note','Périmètre, planning, livrables, risques.'),
  jsonb_build_object('owner','Qualité','label','Fiche d’activités et livrables attendus présentés','status','NOK','note','ISO 9001 : livrables et preuves attendues.'),
  jsonb_build_object('owner','IT','label','Accès projet et outils opérationnels validés','status','OK','note','Dépôts, dossiers, CRM, PMO, GED.'),
  jsonb_build_object('owner','RH','label','Matrice de compétences initiale réalisée','status','NOK','note','Auto-évaluation initiale à compléter.'),
  jsonb_build_object('owner','Qualité','label','Sensibilisation confidentialité / sécurité réalisée','status','OK','note','Confidentialité, RGPD, sécurité, ISO.'),
  jsonb_build_object('owner','RH','label','Formations obligatoires planifiées','status','NOK','note','Sécurité, qualité, outils, métier.'),
  jsonb_build_object('owner','Manager','label','Point manager 30/60/90 jours planifié','status','OK','note','Suivi intégration et période d’essai.'),
  jsonb_build_object('owner','RH','label','Formulaire d’habilitation réalisé si besoin','status','NA','note','Selon poste et projet.'),
  jsonb_build_object('owner','Collaborateur','label','Rapport d’étonnement prévu','status','NA','note','Retour collaborateur à 30 jours.'),
  jsonb_build_object('owner','RH','label','Validation période d’essai préparée','status','NOK','note','Décision RH + manager à consolider.')
),
    onboarding_decision_note = coalesce(onboarding_decision_note, 'Décision à prendre après validation RH, manager, qualité et retours collaborateur.'),
    onboarding_risk_comment = coalesce(onboarding_risk_comment, 'Suivre les NOK avant validation définitive de la période d’essai.'),
    updated_at = now()
where checklist_items is null or jsonb_array_length(checklist_items) < 12;
