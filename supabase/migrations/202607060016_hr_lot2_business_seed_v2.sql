create extension if not exists pgcrypto;

alter table if exists public.hr_time_activity_entries add column if not exists description text;
alter table if exists public.hr_time_activity_entries add column if not exists manager_comment text;
alter table if exists public.hr_time_activity_entries add column if not exists archived_at timestamptz;

alter table if exists public.hr_skill_catalog add column if not exists code text;
alter table if exists public.hr_skill_catalog add column if not exists family text;
alter table if exists public.hr_skill_catalog add column if not exists category text;
alter table if exists public.hr_skill_catalog add column if not exists description text;
alter table if exists public.hr_skill_catalog add column if not exists criticality text default 'standard';
alter table if exists public.hr_skill_catalog add column if not exists is_active boolean default true;
alter table if exists public.hr_skill_catalog add column if not exists level_expectations jsonb default '{}'::jsonb;
alter table if exists public.hr_skill_catalog add column if not exists archived_at timestamptz;
alter table if exists public.hr_skill_catalog add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_employee_skills add column if not exists current_level integer;
alter table if exists public.hr_employee_skills add column if not exists target_level integer;
alter table if exists public.hr_employee_skills add column if not exists assessment_date date;
alter table if exists public.hr_employee_skills add column if not exists evidence text;
alter table if exists public.hr_employee_skills add column if not exists status text default 'active';
alter table if exists public.hr_employee_skills add column if not exists project_context text;
alter table if exists public.hr_employee_skills add column if not exists last_self_assessment_at date;
alter table if exists public.hr_employee_skills add column if not exists assessor_type text default 'self';
alter table if exists public.hr_employee_skills add column if not exists archived_at timestamptz;
alter table if exists public.hr_employee_skills add column if not exists updated_at timestamptz default now();


-- Aligne la contrainte historique Staffing sur le modèle métier RH Compétences validé : niveaux 0 à 4.
alter table if exists public.hr_employee_skills drop constraint if exists hr_employee_skills_level_check;
update public.hr_employee_skills
set level = greatest(0, least(4, coalesce(level, 0)))
where level is null or level < 0 or level > 4;
alter table if exists public.hr_employee_skills
  add constraint hr_employee_skills_level_check check (level between 0 and 4);

alter table if exists public.hr_onboarding_plans add column if not exists notes text;
alter table if exists public.hr_onboarding_plans add column if not exists progress_percent numeric default 0;
alter table if exists public.hr_onboarding_plans add column if not exists risk_level text default 'normal';
alter table if exists public.hr_onboarding_plans add column if not exists checklist_items jsonb default '[]'::jsonb;
alter table if exists public.hr_onboarding_plans add column if not exists archived_at timestamptz;

alter table if exists public.hr_review_items add column if not exists objective_count integer default 0;
alter table if exists public.hr_review_items add column if not exists completed_objective_count integer default 0;
alter table if exists public.hr_review_items add column if not exists global_rating numeric;
alter table if exists public.hr_review_items add column if not exists employee_comment text;
alter table if exists public.hr_review_items add column if not exists manager_comment text;
alter table if exists public.hr_review_items add column if not exists review_details jsonb default '{}'::jsonb;
alter table if exists public.hr_review_items add column if not exists archived_at timestamptz;

do $$
declare
  org record;
  employee record;
  skill record;
  v_skill_id uuid;
  v_cycle_id uuid;
  employee_index integer;
  skill_index integer;
  skill_names text[] := array[
    'Pilotage portefeuille projets','Cadrage besoin client','Planification et jalons','Gestion des risques projet','Suivi budget et marge','Animation comité de pilotage',
    'CRM prospection','Qualification opportunités','Négociation commerciale','Prévision pipeline','Gestion contrats clients','Relance et fidélisation',
    'Analyse financière','Contrôle de gestion','Facturation et recouvrement','Prévision trésorerie','Calcul marge projet','Export comptable',
    'Recrutement','Sourcing candidats','Conduite entretien recrutement','Onboarding collaborateur','Gestion absences','Entretiens annuels','Gestion compétences','Droit social opérationnel',
    'Ingénierie formation','Gestion plan de développement','People review','Gestion mobilité interne','Communication RH','Expérience collaborateur',
    'ISO 9001','Gestion non-conformités','Actions correctives','Audit interne','Gestion documentaire','Analyse causes racines',
    'Sécurité multi-tenant','Architecture Supabase','Next.js TypeScript','UX enterprise','Automatisation IA','Analyse données RH'
  ];
  skill_families text[] := array[
    'Projets / PMO','Projets / PMO','Projets / PMO','Projets / PMO','Projets / PMO','Projets / PMO',
    'Commerce / CRM','Commerce / CRM','Commerce / CRM','Commerce / CRM','Commerce / CRM','Commerce / CRM',
    'Finance','Finance','Finance','Finance','Finance','Finance',
    'RH / SIRH','RH / SIRH','RH / SIRH','RH / SIRH','RH / SIRH','RH / SIRH','RH / SIRH','RH / SIRH',
    'Développement RH','Développement RH','Développement RH','Développement RH','Développement RH','Développement RH',
    'Qualité & risques','Qualité & risques','Qualité & risques','Qualité & risques','Qualité & risques','Qualité & risques',
    'Technologie / IA','Technologie / IA','Technologie / IA','Technologie / IA','Technologie / IA','Technologie / IA'
  ];
  skill_categories text[] := array[
    'Portefeuille','Cadrage','Planification','Risques','Finance projet','Gouvernance',
    'Prospection','Qualification','Négociation','Prévision','Contrats','Fidélisation',
    'Analyse','Contrôle','Facturation','Trésorerie','Rentabilité','Comptabilité',
    'Talent acquisition','Sourcing','Évaluation candidat','Intégration','Administration RH','Performance','Compétences','Conformité RH',
    'Formation','Développement','Talent review','Mobilité','Communication','Engagement',
    'Système qualité','Non-conformités','CAPA','Audit','GED qualité','Résolution problème',
    'Sécurité','Base de données','Développement','Design produit','IA','Analytics'
  ];
  v_checklist jsonb;
  v_review_payload jsonb;
begin
  for org in select id from public.organizations loop
    for skill_index in 1..array_length(skill_names, 1) loop
      select id into v_skill_id
      from public.hr_skill_catalog
      where organization_id = org.id and name = skill_names[skill_index]
      limit 1;

      if v_skill_id is null then
        v_skill_id := gen_random_uuid();
        insert into public.hr_skill_catalog (
          id, organization_id, code, name, family, category, description, criticality, is_active, level_expectations
        ) values (
          v_skill_id,
          org.id,
          'OP_' || lpad(skill_index::text, 3, '0') || '_' || upper(regexp_replace(skill_categories[skill_index], '[^A-Za-z0-9]+', '_', 'g')),
          skill_names[skill_index],
          skill_families[skill_index],
          skill_categories[skill_index],
          'Compétence de référence ONEPILOT pour piloter ' || skill_families[skill_index] || ' / ' || skill_categories[skill_index] || '. Niveau 0 à 4, cible, criticité, preuve, auto-évaluation annuelle et besoin projet.',
          case when skill_index in (4,5,13,18,19,21,22,24,25,27,28,33,34,35,39,40,41,43,44) then 'critical' when skill_index % 3 = 0 then 'important' else 'standard' end,
          true,
          jsonb_build_object(
            '0','Profane : ne connaît pas le sujet ou nécessite une sensibilisation complète.',
            '1','Sensibilisé : comprend les principes et peut contribuer avec accompagnement.',
            '2','Autonome encadré : réalise les tâches courantes avec revue ponctuelle.',
            '3','Confirmé : pilote le sujet, accompagne les pairs et sécurise la qualité.',
            '4','Expert : référence interne, forme, arbitre et améliore les pratiques.'
          )
        );
      else
        update public.hr_skill_catalog set
          family = skill_families[skill_index],
          category = skill_categories[skill_index],
          description = 'Compétence de référence ONEPILOT pour piloter ' || skill_families[skill_index] || ' / ' || skill_categories[skill_index] || '. Niveau 0 à 4, cible, criticité, preuve, auto-évaluation annuelle et besoin projet.',
          criticality = case when skill_index in (4,5,13,18,19,21,22,24,25,27,28,33,34,35,39,40,41,43,44) then 'critical' when skill_index % 3 = 0 then 'important' else 'standard' end,
          is_active = true,
          level_expectations = jsonb_build_object(
            '0','Profane : ne connaît pas le sujet ou nécessite une sensibilisation complète.',
            '1','Sensibilisé : comprend les principes et peut contribuer avec accompagnement.',
            '2','Autonome encadré : réalise les tâches courantes avec revue ponctuelle.',
            '3','Confirmé : pilote le sujet, accompagne les pairs et sécurise la qualité.',
            '4','Expert : référence interne, forme, arbitre et améliore les pratiques.'
          ),
          updated_at = now()
        where id = v_skill_id;
      end if;

      insert into public.hr_skills (id, organization_id, code, name, description, skill_type, is_active)
      values (
        v_skill_id,
        org.id,
        'OP_' || lpad(skill_index::text, 3, '0') || '_' || upper(regexp_replace(skill_categories[skill_index], '[^A-Za-z0-9]+', '_', 'g')),
        skill_names[skill_index],
        'Compétence synchronisée depuis hr_skill_catalog pour compatibilité staffing et projet.',
        case when skill_families[skill_index] = 'Technologie / IA' then 'technical' when skill_families[skill_index] in ('Projets / PMO','Qualité & risques') then 'methodology' when skill_families[skill_index] in ('RH / SIRH','Développement RH','Commerce / CRM','Finance') then 'functional' else 'other' end,
        true
      ) on conflict (organization_id, code) do update set name = excluded.name, description = excluded.description, is_active = true, updated_at = now();
    end loop;

    employee_index := 0;
    for employee in
      select id, manager_employee_id, arrival_date
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 40
    loop
      employee_index := employee_index + 1;

      insert into public.hr_time_activity_entries (
        organization_id, employee_id, activity_date, activity_type, duration_hours, status, description, manager_comment
      ) values
        (org.id, employee.id, current_date - ((employee_index % 18) + 1), 'project_delivery', 7.50, case when employee_index % 5 = 0 then 'submitted' when employee_index % 4 = 0 then 'manager_approved' else 'approved' end, 'Production projet client, livrables, coordination équipe, préparation comité et arbitrage PMO.', 'Contrôle manager requis selon statut.'),
        (org.id, employee.id, current_date - ((employee_index % 12) + 8), 'internal', 2.00, case when employee_index % 6 = 0 then 'rejected' else 'approved' end, 'Capitalisation, amélioration continue, support interne et documentation.', 'Vérifier imputation si rejetée.'),
        (org.id, employee.id, current_date - ((employee_index % 8) + 16), 'training', 3.50, 'approved', 'Formation, veille métier, montée en compétence et partage de connaissances.', 'Temps valorisé dans le plan de développement.')
      on conflict do nothing;

      for skill in
        select c.id, c.name, c.criticality
        from public.hr_skill_catalog c
        where c.organization_id = org.id
        order by c.family, c.category, c.name
        offset greatest(0, (employee_index - 1) % 16)
        limit 12
      loop
        if exists (select 1 from public.hr_employee_skills es where es.organization_id = org.id and es.employee_id = employee.id and es.skill_id = skill.id) then
          update public.hr_employee_skills es set
            level = greatest(0, least(4, ((employee_index + length(skill.name)) % 5))),
            current_level = greatest(0, least(4, ((employee_index + length(skill.name)) % 5))),
            target_level = greatest(1, least(4, ((employee_index + length(skill.name)) % 5) + case when employee_index % 3 = 0 then 2 else 1 end)),
            evidence = 'Auto-évaluation annuelle et retour projet : preuve à confirmer en entretien ou staffing.',
            project_context = case when employee_index % 2 = 0 then 'Projet client / besoin PMO : niveau attendu selon staffing.' else 'Mission interne / besoin développement RH.' end,
            last_self_assessment_at = current_date - (employee_index * 4),
            assessor_type = 'self',
            status = case when employee_index % 4 = 0 then 'to_develop' when employee_index % 5 = 0 then 'validated' else 'active' end,
            updated_at = now()
          where es.organization_id = org.id and es.employee_id = employee.id and es.skill_id = skill.id;
        else
          insert into public.hr_employee_skills (
            organization_id, employee_id, skill_id, level, current_level, target_level, assessment_date, evidence, project_context, last_self_assessment_at, assessor_type, status
          ) values (
            org.id,
            employee.id,
            skill.id,
            greatest(0, least(4, ((employee_index + length(skill.name)) % 5))),
            greatest(0, least(4, ((employee_index + length(skill.name)) % 5))),
            greatest(1, least(4, ((employee_index + length(skill.name)) % 5) + case when employee_index % 3 = 0 then 2 else 1 end)),
            current_date - (employee_index * 3),
            'Auto-évaluation annuelle et retour projet : preuve à confirmer en entretien ou staffing.',
            case when employee_index % 2 = 0 then 'Projet client / besoin PMO : niveau attendu selon staffing.' else 'Mission interne / besoin développement RH.' end,
            current_date - (employee_index * 4),
            'self',
            case when employee_index % 4 = 0 then 'to_develop' when employee_index % 5 = 0 then 'validated' else 'active' end
          );
        end if;
      end loop;

      v_checklist := jsonb_build_array(
        jsonb_build_object('owner','RH','label','Contrat signé et dossier administratif complet','status',case when employee_index % 7 = 0 then 'NOK' else 'OK' end,'note','Contrat, coordonnées, urgence, RIB et justificatifs.'),
        jsonb_build_object('owner','RH','label','Documents RH et règlement intérieur remis','status','OK','note','Remise et traçabilité documentaire.'),
        jsonb_build_object('owner','Manager','label','Objectifs 30/60/90 jours définis','status',case when employee_index % 5 = 0 then 'NOK' else 'OK' end,'note','Objectifs opérationnels et critères de réussite.'),
        jsonb_build_object('owner','Manager','label','Parrain / référent identifié','status',case when employee_index % 6 = 0 then 'NA' else 'OK' end,'note','Accompagnement de proximité.'),
        jsonb_build_object('owner','IT','label','Compte, matériel et accès applicatifs prêts','status',case when employee_index % 4 = 0 then 'NOK' else 'OK' end,'note','PC, messagerie, SSO, outils métier.'),
        jsonb_build_object('owner','Qualité','label','Sensibilisation qualité / sécurité réalisée','status',case when employee_index % 3 = 0 then 'NOK' else 'OK' end,'note','ISO 9001, confidentialité, risques.'),
        jsonb_build_object('owner','Collaborateur','label','Rapport d’étonnement prévu','status','NA','note','Point à 30 jours.'),
        jsonb_build_object('owner','RH','label','Point intégration 30 jours planifié','status',case when employee_index % 8 = 0 then 'NOK' else 'OK' end,'note','Risque et satisfaction collaborateur.')
      );

      insert into public.hr_onboarding_plans (
        organization_id, employee_id, manager_employee_id, recruiter_employee_id, start_date, target_end_date, status, progress_percent, risk_level, notes, checklist_items
      ) values (
        org.id,
        employee.id,
        employee.manager_employee_id,
        employee.manager_employee_id,
        coalesce(employee.arrival_date, current_date - (employee_index * 5)),
        coalesce(employee.arrival_date, current_date - (employee_index * 5)) + interval '45 days',
        case when employee_index % 7 = 0 then 'delayed' when employee_index % 5 = 0 then 'prepared' when employee_index % 4 = 0 then 'completed' else 'in_progress' end,
        case when employee_index % 4 = 0 then 100 else least(95, 25 + employee_index * 6) end,
        case when employee_index % 7 = 0 then 'high' when employee_index % 5 = 0 then 'watch' else 'normal' end,
        'Parcours standard : RH, manager, IT, qualité, documents, point 30/60/90 jours et validation avant archivage.',
        v_checklist
      ) on conflict do nothing;
    end loop;

    insert into public.hr_review_cycles (organization_id, name, review_type, period_start, period_end, status)
    values
      (org.id, 'Campagne annuelle ' || extract(year from current_date)::int, 'annual', make_date(extract(year from current_date)::int, 1, 1), make_date(extract(year from current_date)::int, 12, 31), 'open'),
      (org.id, 'Objectifs S2 ' || extract(year from current_date)::int, 'objective', make_date(extract(year from current_date)::int, 7, 1), make_date(extract(year from current_date)::int, 12, 31), 'in_progress')
    on conflict do nothing;

    select id into v_cycle_id
    from public.hr_review_cycles
    where organization_id = org.id
    order by created_at desc
    limit 1;

    employee_index := 0;
    for employee in
      select id, manager_employee_id
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 40
    loop
      employee_index := employee_index + 1;
      v_review_payload := jsonb_build_object(
        'previous_year', jsonb_build_object('objectives','Bilan année écoulée : delivery, qualité, contribution équipe, satisfaction client, compétences et comportement professionnel.','achievement',55 + ((employee_index * 7) % 45),'highlights','Réussites projet, irritants, axes de progrès et impact collectif.'),
        'current_year', jsonb_build_object('objectives','Objectifs en cours : performance, qualité, montée en compétence, contribution transverse et amélioration continue.','priority',case when employee_index % 3 = 0 then 'Développement compétences critiques' else 'Performance opérationnelle et qualité' end),
        'training', jsonb_build_array('Formation métier ciblée','Renforcement outils ONEPILOT','Coaching manager ou mentorat'),
        'employee_validation', employee_index % 4 <> 0,
        'manager_validation', employee_index % 5 <> 0,
        'development_plan','Plan d’action : objectifs mesurables, compétence critique, action formation, revue à mi-parcours.'
      );
      insert into public.hr_review_items (
        organization_id, cycle_id, employee_id, manager_employee_id, status, objective_count, completed_objective_count, global_rating, employee_comment, manager_comment, review_details
      ) values (
        org.id,
        v_cycle_id,
        employee.id,
        employee.manager_employee_id,
        case when employee_index % 6 = 0 then 'calibration' when employee_index % 5 = 0 then 'manager_input' when employee_index % 4 = 0 then 'completed' else 'employee_input' end,
        4 + (employee_index % 4),
        least(4 + (employee_index % 4), employee_index % 6),
        round((2.5 + ((employee_index % 5) * 0.5))::numeric, 2),
        'Auto-évaluation : résultats obtenus, objectifs atteints, besoins de formation, souhaits d’évolution.',
        'Évaluation manager : performance, comportements, potentiel, objectifs et plan de développement.',
        v_review_payload
      ) on conflict do nothing;
    end loop;
  end loop;
end $$;
