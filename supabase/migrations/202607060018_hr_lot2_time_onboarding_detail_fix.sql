-- ONEPILOT RH Lot 2 V11 - Temps & activités + Onboarding détaillé
-- Migration idempotente : enrichit les colonnes métier sans modifier les migrations déjà appliquées.

create extension if not exists pgcrypto;

alter table if exists public.hr_time_activity_entries
  add column if not exists project_number text,
  add column if not exists project_designation text,
  add column if not exists project_assignment_reference text,
  add column if not exists avv_hours numeric default 0,
  add column if not exists management_hours numeric default 0,
  add column if not exists production_hours numeric default 0,
  add column if not exists rework_hours numeric default 0,
  add column if not exists training_hours numeric default 0,
  add column if not exists intercontract_hours numeric default 0,
  add column if not exists avv_cost numeric default 0,
  add column if not exists management_cost numeric default 0,
  add column if not exists production_cost numeric default 0,
  add column if not exists rework_cost numeric default 0,
  add column if not exists purchase_cost numeric default 0,
  add column if not exists expense_hours numeric default 0,
  add column if not exists total_hours numeric default 0,
  add column if not exists total_cost numeric default 0,
  add column if not exists comments text,
  add column if not exists validation_manager_status text default 'submitted',
  add column if not exists validation_manager_comment text,
  add column if not exists finalized_at timestamptz,
  add column if not exists manager_validation_due_at date;

alter table if exists public.hr_onboarding_plans
  add column if not exists probation_validation_status text default 'to_do',
  add column if not exists probation_validation_comment text,
  add column if not exists manager_validation_status text default 'to_do',
  add column if not exists hr_validation_status text default 'to_do';

-- Normalisation douce des valeurs existantes.
update public.hr_time_activity_entries
set
  avv_hours = coalesce(avv_hours, case when activity_type in ('avv', 'pre_sales') then duration_hours else 0 end, 0),
  management_hours = coalesce(management_hours, case when activity_type in ('management', 'internal') then duration_hours else 0 end, 0),
  production_hours = coalesce(production_hours, case when activity_type in ('project_delivery', 'production') then duration_hours else 0 end, 0),
  rework_hours = coalesce(rework_hours, case when activity_type in ('rework', 'reprise') then duration_hours else 0 end, 0),
  training_hours = coalesce(training_hours, case when activity_type = 'training' then duration_hours else 0 end, 0),
  intercontract_hours = coalesce(intercontract_hours, case when activity_type in ('intercontract', 'bench') then duration_hours else 0 end, 0),
  project_number = coalesce(project_number, case when activity_type in ('intercontract', 'bench') then 'IC-' || extract(year from current_date)::int || '-0001' else 'P-' || extract(year from current_date)::int || '-0001' end),
  project_designation = coalesce(project_designation, case when activity_type in ('intercontract', 'bench') then 'Intercontrat annuel' else 'Projet client / mission affectée' end),
  comments = coalesce(comments, description),
  validation_manager_status = coalesce(validation_manager_status, status, 'submitted'),
  manager_validation_due_at = coalesce(manager_validation_due_at, (date_trunc('month', coalesce(activity_date, current_date)) + interval '1 month 7 days')::date)
where organization_id is not null;

update public.hr_time_activity_entries
set
  avv_cost = coalesce(avv_cost, 0),
  management_cost = coalesce(management_cost, 0),
  production_cost = coalesce(production_cost, 0),
  rework_cost = coalesce(rework_cost, 0),
  purchase_cost = coalesce(purchase_cost, 0),
  total_hours = coalesce(nullif(total_hours, 0), coalesce(avv_hours,0) + coalesce(management_hours,0) + coalesce(production_hours,0) + coalesce(rework_hours,0) + coalesce(training_hours,0) + coalesce(intercontract_hours,0) + coalesce(expense_hours,0), coalesce(duration_hours,0)),
  total_cost = coalesce(nullif(total_cost, 0), coalesce(avv_cost,0) + coalesce(management_cost,0) + coalesce(production_cost,0) + coalesce(rework_cost,0) + coalesce(purchase_cost,0))
where organization_id is not null;

-- Checklist onboarding étendue : appliquée aux parcours vides ou incomplets.
do $$
declare
  plan_row record;
  v_checklist jsonb;
begin
  for plan_row in select id from public.hr_onboarding_plans loop
    v_checklist := jsonb_build_array(
      jsonb_build_object('owner','RH','label','Contrat signé et dossier administratif complet','status','NOK','note','Contrat, avenant, coordonnées, urgence, RIB et justificatifs.'),
      jsonb_build_object('owner','RH','label','Livret d’accueil disponible et remis','status','NOK','note','Preuve de remise à conserver pour audit interne.'),
      jsonb_build_object('owner','IT','label','PC disponible et configuré','status','NOK','note','Poste, sécurité, chiffrement, antivirus et droits locaux.'),
      jsonb_build_object('owner','IT','label','Adresse mail et accès SSO créés','status','NOK','note','Messagerie, MFA, groupes, outils projet et outils RH.'),
      jsonb_build_object('owner','Office','label','Fournitures et environnement de travail prêts','status','NA','note','Badge, bureau, écran, casque, téléphone ou matériel distant.'),
      jsonb_build_object('owner','RH','label','Présentation organisation et société réalisée','status','NOK','note','Organisation, valeurs, règles internes, confidentialité et éthique.'),
      jsonb_build_object('owner','Manager','label','Présentation équipe et projet réalisée','status','NOK','note','Rôles, interlocuteurs, planning, objectifs et rituels.'),
      jsonb_build_object('owner','Manager','label','Fiche de poste et fiche d’activités validées','status','NOK','note','Missions, responsabilités, livrables et critères de réussite.'),
      jsonb_build_object('owner','Manager','label','Objectifs 30/60/90 jours définis','status','NOK','note','Objectifs opérationnels, compétences, jalons et points de contrôle.'),
      jsonb_build_object('owner','Qualité','label','Livrables attendus connus','status','NOK','note','Templates, exigences ISO 9001, circuit de validation et archivage.'),
      jsonb_build_object('owner','Qualité','label','Sensibilisation qualité / sécurité réalisée','status','NOK','note','Confidentialité, risques, non-conformités et bonnes pratiques.'),
      jsonb_build_object('owner','Manager','label','Matrice de compétences initiale réalisée','status','NOK','note','Auto-évaluation, niveau cible, expert référent et plan d’accompagnement.'),
      jsonb_build_object('owner','RH','label','Formation obligatoire planifiée','status','NOK','note','Formation métier, outils, sécurité, conformité ou habilitation.'),
      jsonb_build_object('owner','Manager','label','Point manager planifié','status','NOK','note','Points 7 jours, 30 jours, 60 jours, 90 jours et fin période d’essai.'),
      jsonb_build_object('owner','RH','label','Formulaire d’habilitation réalisé si besoin','status','NA','note','Accès spécifiques client, site sensible, données ou applications.'),
      jsonb_build_object('owner','Collaborateur','label','Rapport d’étonnement prévu','status','NA','note','Retour à 30 jours sur intégration, outils, organisation et irritants.'),
      jsonb_build_object('owner','RH','label','Validation période d’essai préparée','status','NOK','note','Décision RH/manager, preuves, objectifs et éventuelle prolongation.')
    );
    update public.hr_onboarding_plans
    set checklist_items = case
        when checklist_items is null or jsonb_array_length(checklist_items) < 10 then v_checklist
        else checklist_items
      end,
      probation_validation_status = coalesce(probation_validation_status, 'to_do'),
      manager_validation_status = coalesce(manager_validation_status, 'to_do'),
      hr_validation_status = coalesce(hr_validation_status, 'to_do'),
      updated_at = now()
    where id = plan_row.id;
  end loop;
end $$;

-- Ajout de quelques pointages structurés si l'organisation a des ressources mais peu de données.
do $$
declare
  org record;
  emp record;
  idx integer;
  v_year integer := extract(year from current_date)::int;
  v_hourly numeric := 75;
begin
  for org in select id from public.organizations loop
    idx := 0;
    for emp in select id from public.hr_employees where organization_id = org.id order by created_at nulls last, id limit 20 loop
      idx := idx + 1;
      insert into public.hr_time_activity_entries(
        organization_id, employee_id, activity_date, activity_type, duration_hours, status,
        project_number, project_designation, avv_hours, management_hours, production_hours, rework_hours,
        training_hours, intercontract_hours, avv_cost, management_cost, production_cost, rework_cost,
        purchase_cost, expense_hours, total_hours, total_cost, comments, description,
        validation_manager_status, manager_validation_due_at
      )
      select org.id, emp.id, current_date - (idx % 20), 'project_delivery', 7.5,
        case when idx % 4 = 0 then 'submitted' else 'approved' end,
        'P-' || v_year || '-' || lpad(((idx % 6)+1)::text, 4, '0'),
        'Projet client ' || ((idx % 6)+1)::text,
        case when idx % 5 = 0 then 1 else 0 end,
        case when idx % 3 = 0 then 1.5 else 0.5 end,
        case when idx % 4 = 0 then 5 else 6.5 end,
        case when idx % 7 = 0 then 1 else 0 end,
        case when idx % 6 = 0 then 2 else 0 end,
        0,
        (case when idx % 5 = 0 then 1 else 0 end) * v_hourly,
        (case when idx % 3 = 0 then 1.5 else 0.5 end) * v_hourly,
        (case when idx % 4 = 0 then 5 else 6.5 end) * v_hourly,
        (case when idx % 7 = 0 then 1 else 0 end) * v_hourly,
        case when idx % 8 = 0 then 120 else 0 end,
        0,
        7.5,
        7.5 * v_hourly + case when idx % 8 = 0 then 120 else 0 end,
        'Pointage de démonstration métier : projet, rubrique, coût et validation N+1.',
        'Pointage structuré généré pour contrôle RH/capacity/finance.',
        case when idx % 4 = 0 then 'submitted' else 'approved' end,
        (date_trunc('month', current_date) + interval '1 month 7 days')::date
      where not exists (
        select 1 from public.hr_time_activity_entries e
        where e.organization_id = org.id and e.employee_id = emp.id and e.project_number = 'P-' || v_year || '-' || lpad(((idx % 6)+1)::text, 4, '0') and e.activity_date = current_date - (idx % 20)
      );
    end loop;
  end loop;
end $$;
