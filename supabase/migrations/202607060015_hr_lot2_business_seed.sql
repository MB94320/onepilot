-- ONEPILOT RH Lot 2 — socle métier et données de démonstration réelles.
-- Objectif : rendre Temps & activités, Compétences, Onboarding et Entretiens exploitables immédiatement.
-- Idempotent : peut être relancé sans dupliquer les référentiels principaux.

create extension if not exists pgcrypto;

alter table if exists public.hr_time_activity_entries
  add column if not exists description text,
  add column if not exists manager_comment text,
  add column if not exists archived_at timestamptz;

alter table if exists public.hr_skill_catalog
  add column if not exists code text,
  add column if not exists family text,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists criticality text default 'standard',
  add column if not exists is_active boolean default true,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_employee_skills
  add column if not exists current_level integer,
  add column if not exists target_level integer,
  add column if not exists assessment_date date,
  add column if not exists evidence text,
  add column if not exists status text default 'active',
  add column if not exists archived_at timestamptz;

update public.hr_employee_skills
set current_level = coalesce(current_level, level, 1),
    target_level = coalesce(target_level, greatest(coalesce(level, 1), 3))
where current_level is null or target_level is null;

alter table if exists public.hr_onboarding_plans
  add column if not exists notes text,
  add column if not exists progress_percent numeric(5,2) default 0,
  add column if not exists risk_level text default 'normal',
  add column if not exists checklist_items jsonb not null default '[]'::jsonb,
  add column if not exists archived_at timestamptz;

alter table if exists public.hr_review_items
  add column if not exists objective_count integer default 0,
  add column if not exists completed_objective_count integer default 0,
  add column if not exists global_rating numeric(4,2),
  add column if not exists employee_comment text,
  add column if not exists manager_comment text,
  add column if not exists review_details jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz;

do $$
declare
  org record;
  employee record;
  skill record;
  cycle_id uuid;
  employee_index integer;
  skill_index integer;
  v_skill_id uuid;
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
  checklist jsonb;
  review_payload jsonb;
begin
  for org in select id from public.organizations loop
    for skill_index in 1..array_length(skill_names, 1) loop
      v_skill_id := gen_random_uuid();

      insert into public.hr_skill_catalog (
        id, organization_id, code, name, family, category, description, criticality, is_active
      ) values (
        v_skill_id,
        org.id,
        'OP_' || lpad(skill_index::text, 3, '0') || '_' || upper(regexp_replace(skill_categories[skill_index], '[^A-Za-z0-9]+', '_', 'g')),
        skill_names[skill_index],
        skill_families[skill_index],
        skill_categories[skill_index],
        'Compétence de référence ONEPILOT pour piloter ' || skill_families[skill_index] || ' / ' || skill_categories[skill_index] || '. Niveau 0 à 5, cible, criticité et preuves attendues.',
        case when skill_index in (4,5,13,18,19,21,22,24,25,27,28,33,34,35,39,40,41,43,44) then 'critical' when skill_index % 3 = 0 then 'important' else 'standard' end,
        true
      ) on conflict (organization_id, name) do update set
        code = excluded.code,
        family = excluded.family,
        category = excluded.category,
        description = excluded.description,
        criticality = excluded.criticality,
        is_active = true,
        updated_at = now()
      returning id into v_skill_id;

      -- L'ancienne fondation staffing référence public.hr_skills dans hr_employee_skills.
      -- On synchronise donc un jumeau technique avec le même id pour satisfaire la FK existante.
      insert into public.hr_skills (id, organization_id, code, name, description, skill_type, is_active)
      values (
        v_skill_id,
        org.id,
        'OP_' || lpad(skill_index::text, 3, '0') || '_' || upper(regexp_replace(skill_categories[skill_index], '[^A-Za-z0-9]+', '_', 'g')),
        skill_names[skill_index],
        'Compétence synchronisée depuis hr_skill_catalog pour compatibilité staffing.',
        case when skill_families[skill_index] in ('Technologie / IA') then 'technical' when skill_families[skill_index] in ('Projets / PMO','Qualité & risques') then 'methodology' when skill_families[skill_index] in ('RH / SIRH','Développement RH','Commerce / CRM','Finance') then 'functional' else 'other' end,
        true
      ) on conflict (organization_id, code) do update set
        name = excluded.name,
        description = excluded.description,
        is_active = true,
        updated_at = now();
    end loop;

    employee_index := 0;
    for employee in
      select id, manager_employee_id, arrival_date
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 30
    loop
      employee_index := employee_index + 1;

      insert into public.hr_time_activity_entries (
        organization_id, employee_id, activity_date, activity_type, duration_hours, status, description, manager_comment
      ) values
        (org.id, employee.id, current_date - ((employee_index % 18) + 1), 'project_delivery', 7.50, case when employee_index % 5 = 0 then 'submitted' when employee_index % 4 = 0 then 'manager_approved' else 'approved' end, 'Production projet client, suivi livrables, coordination équipe et préparation comité.', 'Contrôle manager requis selon statut.'),
        (org.id, employee.id, current_date - ((employee_index % 12) + 8), 'internal', 2.00, case when employee_index % 6 = 0 then 'rejected' else 'approved' end, 'Activité interne : capitalisation, amélioration continue, préparation support.', 'Vérifier l’imputation si rejetée.'),
        (org.id, employee.id, current_date - ((employee_index % 8) + 16), 'training', 3.50, 'approved', 'Formation, veille métier, montée en compétence et partage de connaissances.', 'Temps valorisé dans le plan de développement.')
      on conflict do nothing;

      for skill in
        select c.id, c.name
        from public.hr_skill_catalog c
        where c.organization_id = org.id
        order by c.family, c.category, c.name
        offset greatest(0, (employee_index - 1) % 16)
        limit 10
      loop
        insert into public.hr_employee_skills (
          organization_id, employee_id, skill_id, level, current_level, target_level, assessment_date, evidence, status
        ) values (
          org.id,
          employee.id,
          skill.id,
          greatest(1, ((employee_index + length(skill.name)) % 5)),
          ((employee_index + length(skill.name)) % 6),
          least(5, ((employee_index + length(skill.name)) % 6) + case when employee_index % 3 = 0 then 2 else 1 end),
          current_date - (employee_index * 3),
          'Évaluation initiale issue du référentiel ONEPILOT : preuve à confirmer en entretien, staffing ou formation.',
          case when employee_index % 4 = 0 then 'to_develop' when employee_index % 5 = 0 then 'validated' else 'active' end
        ) on conflict (organization_id, employee_id, skill_id) do update set
          level = excluded.level,
          current_level = excluded.current_level,
          target_level = excluded.target_level,
          evidence = excluded.evidence,
          status = excluded.status,
          updated_at = now();
      end loop;

      checklist := jsonb_build_array(
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
        checklist
      ) on conflict do nothing;
    end loop;

    insert into public.hr_review_cycles (organization_id, name, review_type, period_start, period_end, status)
    values
      (org.id, 'Campagne annuelle ' || extract(year from current_date)::int, 'annual', make_date(extract(year from current_date)::int, 1, 1), make_date(extract(year from current_date)::int, 12, 31), 'open'),
      (org.id, 'Objectifs S2 ' || extract(year from current_date)::int, 'objective', make_date(extract(year from current_date)::int, 7, 1), make_date(extract(year from current_date)::int, 12, 31), 'in_progress')
    on conflict do nothing;

    select id into cycle_id
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
      limit 30
    loop
      employee_index := employee_index + 1;
      review_payload := jsonb_build_object(
        'previous_year', jsonb_build_object(
          'objectives', 'Bilan année écoulée : delivery, qualité, contribution équipe, satisfaction client et développement des compétences.',
          'achievement', 55 + ((employee_index * 7) % 45),
          'highlights', 'Points forts, irritants, réussites projet et axes de progrès à consolider.'
        ),
        'current_year', jsonb_build_object(
          'objectives', 'Objectifs en cours : performance, qualité, montée en compétence, contribution transverse et amélioration continue.',
          'priority', case when employee_index % 3 = 0 then 'Développement compétences critiques' else 'Performance opérationnelle et qualité' end
        ),
        'training', jsonb_build_array('Formation métier ciblée', 'Renforcement outils ONEPILOT', 'Coaching manager ou mentorat'),
        'employee_validation', employee_index % 4 <> 0,
        'manager_validation', employee_index % 5 <> 0,
        'development_plan', 'Plan d’action : 2 objectifs mesurables, 1 compétence critique, 1 action formation, revue à mi-parcours.'
      );

      insert into public.hr_review_items (
        organization_id, cycle_id, employee_id, manager_employee_id, status, objective_count, completed_objective_count, global_rating, employee_comment, manager_comment, review_details
      ) values (
        org.id,
        cycle_id,
        employee.id,
        employee.manager_employee_id,
        case when employee_index % 6 = 0 then 'calibration' when employee_index % 5 = 0 then 'manager_input' when employee_index % 4 = 0 then 'completed' else 'employee_input' end,
        4 + (employee_index % 4),
        least(4 + (employee_index % 4), employee_index % 6),
        round((2.5 + ((employee_index % 5) * 0.5))::numeric, 2),
        'Auto-évaluation : résultats obtenus, objectifs atteints, besoins de formation, souhaits d’évolution.',
        'Évaluation manager : performance, comportements, potentiel, objectifs et plan de développement.',
        review_payload
      ) on conflict do nothing;
    end loop;
  end loop;
end $$;
