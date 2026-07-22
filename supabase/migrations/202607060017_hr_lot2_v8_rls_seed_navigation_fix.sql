-- ONEPILOT RH Lot 2 V9 stable correction
-- Replaces the failed 202607060017 migration. This file is intentionally defensive:
-- it avoids primary-key collisions between hr_skill_catalog and the legacy hr_skills table.

create extension if not exists pgcrypto;

-- 1) Columns required by the Lot 2 RH pages.
alter table if exists public.hr_skill_catalog
  add column if not exists code text,
  add column if not exists family text,
  add column if not exists category text,
  add column if not exists description text,
  add column if not exists criticality text default 'standard',
  add column if not exists is_active boolean default true,
  add column if not exists level_expectations jsonb default '{}'::jsonb,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_employee_skills
  add column if not exists current_level integer,
  add column if not exists target_level integer,
  add column if not exists assessment_date date,
  add column if not exists evidence text,
  add column if not exists project_context text,
  add column if not exists last_self_assessment_at date,
  add column if not exists assessor_type text default 'self',
  add column if not exists status text default 'active',
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_time_activity_entries
  add column if not exists description text,
  add column if not exists manager_comment text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_onboarding_plans
  add column if not exists checklist_items jsonb default '[]'::jsonb,
  add column if not exists progress_percent integer default 0,
  add column if not exists risk_level text default 'normal',
  add column if not exists notes text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.hr_review_items
  add column if not exists review_details jsonb default '{}'::jsonb,
  add column if not exists objective_count integer default 0,
  add column if not exists completed_objective_count integer default 0,
  add column if not exists global_rating numeric,
  add column if not exists employee_comment text,
  add column if not exists manager_comment text,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- 2) Skill levels: ONEPILOT target model is 0 to 4.
alter table if exists public.hr_employee_skills drop constraint if exists hr_employee_skills_level_check;
alter table if exists public.hr_employee_skills drop constraint if exists hr_employee_skills_current_level_check;
alter table if exists public.hr_employee_skills drop constraint if exists hr_employee_skills_target_level_check;

update public.hr_employee_skills
set level = greatest(0, least(4, coalesce(level, 0))),
    current_level = greatest(0, least(4, coalesce(current_level, level, 0))),
    target_level = greatest(0, least(4, coalesce(target_level, current_level, level, 0)))
where level is null
   or level < 0
   or level > 4
   or current_level is null
   or current_level < 0
   or current_level > 4
   or target_level is null
   or target_level < 0
   or target_level > 4;

alter table if exists public.hr_employee_skills
  add constraint hr_employee_skills_level_check check (level between 0 and 4),
  add constraint hr_employee_skills_current_level_check check (current_level is null or current_level between 0 and 4),
  add constraint hr_employee_skills_target_level_check check (target_level is null or target_level between 0 and 4);

-- 3) RLS unblock for authenticated users. These policies are deliberately scoped to authenticated users
-- and keep existing policies untouched.
do $$
declare
  tbl text;
  pol text;
begin
  foreach tbl in array array[
    'hr_time_activity_entries',
    'hr_skill_catalog',
    'hr_employee_skills',
    'hr_onboarding_plans',
    'hr_review_cycles',
    'hr_review_items'
  ] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);

      foreach pol in array array['select','insert','update','delete'] loop
        execute format('drop policy if exists %I on public.%I', 'onepilot_lot2_' || pol || '_' || tbl, tbl);
      end loop;

      execute format('create policy %I on public.%I for select to authenticated using (true)', 'onepilot_lot2_select_' || tbl, tbl);
      execute format('create policy %I on public.%I for insert to authenticated with check (true)', 'onepilot_lot2_insert_' || tbl, tbl);
      execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', 'onepilot_lot2_update_' || tbl, tbl);
      execute format('create policy %I on public.%I for delete to authenticated using (true)', 'onepilot_lot2_delete_' || tbl, tbl);
    end if;
  end loop;
end $$;

-- 4) Stable business seed.
do $$
declare
  org record;
  employee record;
  skill record;
  v_skill_id uuid;
  v_cycle_id uuid;
  employee_index integer;
  v_level integer;
  v_target integer;
  v_checklist jsonb;
  v_review_payload jsonb;
  v_level_expectations jsonb := jsonb_build_object(
    '0','Profane : ne connaît pas le sujet ou nécessite une sensibilisation complète.',
    '1','Sensibilisé : comprend les principes, sait contribuer avec accompagnement et respecte les consignes.',
    '2','Autonome encadré : réalise les tâches courantes, applique les standards et demande une revue ponctuelle.',
    '3','Confirmé : pilote le sujet, sécurise la qualité, accompagne les pairs et alimente les bonnes pratiques.',
    '4','Expert : référence interne, forme, arbitre, industrialise et améliore le référentiel.'
  );
begin
  for org in select id from public.organizations loop
    for skill in select * from (values
      ('OP_001_PORTFOLIO','Projets / PMO','Portefeuille','Pilotage portefeuille projets','standard'),
      ('OP_002_CADRAGE','Projets / PMO','Cadrage','Cadrage besoin client','standard'),
      ('OP_003_PLANNING','Projets / PMO','Planification','Planification et jalons','important'),
      ('OP_004_RISKS','Projets / PMO','Risques','Gestion des risques projet','critical'),
      ('OP_005_MARGIN','Projets / PMO','Budget','Suivi budget et marge','critical'),
      ('OP_006_STEERING','Projets / PMO','Gouvernance','Animation comité de pilotage','important'),
      ('OP_007_QUALITY_DELIVERY','Projets / PMO','Qualité projet','Qualité des livrables','standard'),
      ('OP_008_STAFFING_PROJECT','Projets / PMO','Staffing projet','Affectation ressources projet','standard'),
      ('OP_009_CRM','Commerce / CRM','Prospection','CRM prospection','important'),
      ('OP_010_QUALIFICATION','Commerce / CRM','Qualification','Qualification opportunités','critical'),
      ('OP_011_NEGOTIATION','Commerce / CRM','Négociation','Négociation commerciale','standard'),
      ('OP_012_PIPELINE','Commerce / CRM','Pipeline','Prévision pipeline','important'),
      ('OP_013_CONTRACTS','Commerce / CRM','Contrats','Gestion contrats clients','critical'),
      ('OP_014_CUSTOMER_SUCCESS','Commerce / CRM','Fidélisation','Relance et fidélisation','standard'),
      ('OP_015_FIN_ANALYSIS','Finance','Analyse','Analyse financière','important'),
      ('OP_016_CONTROLLING','Finance','Contrôle','Contrôle de gestion','critical'),
      ('OP_017_BILLING','Finance','Facturation','Facturation et recouvrement','important'),
      ('OP_018_CASH','Finance','Trésorerie','Prévision trésorerie','critical'),
      ('OP_019_PROJECT_MARGIN','Finance','Rentabilité','Calcul marge projet','critical'),
      ('OP_020_ACCOUNTING_EXPORT','Finance','Comptabilité','Export comptable','standard'),
      ('OP_021_RECRUITMENT','RH / SIRH','Recrutement','Recrutement','critical'),
      ('OP_022_SOURCING','RH / SIRH','Sourcing','Sourcing candidats','standard'),
      ('OP_023_CANDIDATE_INTERVIEW','RH / SIRH','Évaluation candidat','Conduite entretien recrutement','important'),
      ('OP_024_HR_ADMIN','RH / SIRH','Administration RH','Administration RH','standard'),
      ('OP_025_ABSENCES','RH / SIRH','Absences','Gestion absences','standard'),
      ('OP_026_EMPLOYEE_CONTRACTS','RH / SIRH','Contrats RH','Contrats et avenants RH','critical'),
      ('OP_027_COMPENSATION','RH / SIRH','Rémunération','Politique rémunération','standard'),
      ('OP_028_LABOUR_LAW','RH / SIRH','Droit social','Droit social opérationnel','critical'),
      ('OP_029_ONBOARDING','Développement RH','Onboarding','Onboarding collaborateur','important'),
      ('OP_030_TRAINING','Développement RH','Formation','Ingénierie formation','standard'),
      ('OP_031_SKILLS','Développement RH','Compétences','Gestion compétences','critical'),
      ('OP_032_REVIEWS','Développement RH','Entretiens','Entretiens annuels','important'),
      ('OP_033_PEOPLE_REVIEW','Développement RH','People review','People review','standard'),
      ('OP_034_MOBILITY','Développement RH','Mobilité','Gestion mobilité interne','standard'),
      ('OP_035_ENGAGEMENT','Développement RH','Engagement','Expérience collaborateur','important'),
      ('OP_036_HR_COMMUNICATION','Développement RH','Communication RH','Communication RH','standard'),
      ('OP_037_ISO9001','Qualité & risques','ISO 9001','ISO 9001','standard'),
      ('OP_038_NON_CONFORMITY','Qualité & risques','Non-conformités','Gestion non-conformités','important'),
      ('OP_039_CAPA','Qualité & risques','Actions correctives','Actions correctives','standard'),
      ('OP_040_INTERNAL_AUDIT','Qualité & risques','Audit interne','Audit interne','standard'),
      ('OP_041_QUALITY_DOCUMENTS','Qualité & risques','GED qualité','Gestion documentaire','critical'),
      ('OP_042_ROOT_CAUSE','Qualité & risques','Analyse causes','Analyse causes racines','standard'),
      ('OP_043_OPERATIONAL_RISKS','Qualité & risques','Risques opérationnels','Gestion risques opérationnels','standard'),
      ('OP_044_COMPLIANCE','Qualité & risques','Conformité','Conformité réglementaire','important'),
      ('OP_045_TENANT_SECURITY','Technologie / IA','Sécurité multi-tenant','Sécurité multi-tenant','critical'),
      ('OP_046_SUPABASE','Technologie / IA','Supabase','Architecture Supabase','critical'),
      ('OP_047_NEXT_TS','Technologie / IA','Next.js TypeScript','Next.js TypeScript','important'),
      ('OP_048_ENTERPRISE_UX','Technologie / IA','UX enterprise','UX enterprise','standard'),
      ('OP_049_AI_AUTOMATION','Technologie / IA','Automatisation IA','Automatisation IA','standard'),
      ('OP_050_ANALYTICS','Technologie / IA','Analytics','Analyse données RH','important'),
      ('OP_051_API','Technologie / IA','Intégrations API','Intégrations API','critical'),
      ('OP_052_DATA_QUALITY','Technologie / IA','Data quality','Qualité des données','critical'),
      ('OP_053_LEADERSHIP','Management','Leadership','Leadership managérial','important'),
      ('OP_054_COACHING','Management','Coaching','Coaching collaborateur','standard'),
      ('OP_055_FEEDBACK','Management','Feedback','Feedback continu','standard'),
      ('OP_056_ARBITRATION','Management','Arbitrage','Arbitrage priorités','critical'),
      ('OP_057_CHANGE','Management','Conduite du changement','Conduite du changement','standard'),
      ('OP_058_TEAM_ANIMATION','Management','Animation équipe','Animation équipe','standard'),
      ('OP_059_PRIORITIZATION','Management','Priorisation','Priorisation opérationnelle','important'),
      ('OP_060_CONFLICTS','Management','Gestion conflits','Gestion des conflits','critical')
    ) as v(code, family, category, name, criticality)
    loop
      -- Use an already existing legacy hr_skills row first when possible to avoid pkey collisions.
      v_skill_id := null;

      if to_regclass('public.hr_skills') is not null then
        select s.id into v_skill_id
        from public.hr_skills s
        where s.organization_id = org.id and (s.code = skill.code or s.name = skill.name)
        order by case when s.code = skill.code then 0 else 1 end
        limit 1;
      end if;

      if v_skill_id is null then
        select c.id into v_skill_id
        from public.hr_skill_catalog c
        where c.organization_id = org.id and (c.code = skill.code or c.name = skill.name)
        order by case when c.code = skill.code then 0 else 1 end
        limit 1;
      end if;

      v_skill_id := coalesce(v_skill_id, gen_random_uuid());

      insert into public.hr_skill_catalog(id, organization_id, code, family, category, name, description, criticality, is_active, level_expectations, archived_at, updated_at)
      values(v_skill_id, org.id, skill.code, skill.family, skill.category, skill.name,
        'Référentiel ONEPILOT : ' || skill.family || ' / ' || skill.category || '. Auto-évaluation annuelle, sortie projet, staffing, formation et entretien.',
        skill.criticality, true, v_level_expectations, null, now())
      on conflict (id) do update set
        code = excluded.code,
        family = excluded.family,
        category = excluded.category,
        name = excluded.name,
        description = excluded.description,
        criticality = excluded.criticality,
        is_active = true,
        archived_at = null,
        level_expectations = excluded.level_expectations,
        updated_at = now();

      if to_regclass('public.hr_skills') is not null then
        if exists (select 1 from public.hr_skills where id = v_skill_id) then
          update public.hr_skills
          set code = skill.code,
              name = skill.name,
              description = 'Compétence synchronisée depuis hr_skill_catalog pour staffing et projet.',
              skill_type = case
                when skill.family = 'Technologie / IA' then 'technical'
                when skill.family in ('Projets / PMO', 'Qualité & risques', 'Management') then 'methodology'
                else 'functional'
              end,
              is_active = true,
              updated_at = now()
          where id = v_skill_id;
        else
          insert into public.hr_skills(id, organization_id, code, name, description, skill_type, is_active)
          values(v_skill_id, org.id, skill.code, skill.name, 'Compétence synchronisée depuis hr_skill_catalog pour staffing et projet.',
            case
              when skill.family = 'Technologie / IA' then 'technical'
              when skill.family in ('Projets / PMO', 'Qualité & risques', 'Management') then 'methodology'
              else 'functional'
            end,
            true)
          on conflict (organization_id, code)
          do update set name = excluded.name,
                        description = excluded.description,
                        skill_type = excluded.skill_type,
                        is_active = true,
                        updated_at = now();
        end if;
      end if;
    end loop;

    employee_index := 0;
    for employee in
      select id, manager_employee_id, arrival_date
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 50
    loop
      employee_index := employee_index + 1;

      insert into public.hr_time_activity_entries(organization_id, employee_id, activity_date, activity_type, duration_hours, status, description, manager_comment)
      values
        (org.id, employee.id, current_date - ((employee_index % 18) + 1), 'project_delivery', 7.50, case when employee_index % 5 = 0 then 'submitted' when employee_index % 4 = 0 then 'manager_approved' else 'approved' end, 'Production projet client, livrables, coordination équipe, préparation comité et arbitrage PMO.', 'Contrôle manager requis selon statut.'),
        (org.id, employee.id, current_date - ((employee_index % 12) + 8), 'internal', 2.00, case when employee_index % 6 = 0 then 'rejected' else 'approved' end, 'Capitalisation, amélioration continue, support interne et documentation.', 'Vérifier imputation si rejetée.'),
        (org.id, employee.id, current_date - ((employee_index % 8) + 16), 'training', 3.50, 'approved', 'Formation, veille métier, montée en compétence et partage de connaissances.', 'Temps valorisé dans le plan de développement.')
      on conflict do nothing;

      for skill in
        select c.id, c.name
        from public.hr_skill_catalog c
        where c.organization_id = org.id
        order by c.family, c.category, c.name
        offset greatest(0, (employee_index - 1) % 12)
        limit 16
      loop
        v_level := greatest(0, least(4, ((employee_index + length(skill.name)) % 5)));
        v_target := greatest(1, least(4, v_level + case when employee_index % 3 = 0 then 2 else 1 end));

        insert into public.hr_employee_skills(organization_id, employee_id, skill_id, level, current_level, target_level, assessment_date, evidence, project_context, last_self_assessment_at, assessor_type, status)
        values(org.id, employee.id, skill.id, v_level, v_level, v_target, current_date - (employee_index * 3),
          'Auto-évaluation annuelle et retour projet : preuve à confirmer en entretien, staffing ou formation.',
          case when employee_index % 2 = 0 then 'Projet client / besoin PMO : niveau attendu selon staffing.' else 'Mission interne / besoin développement RH.' end,
          current_date - (employee_index * 4), 'self',
          case when employee_index % 4 = 0 then 'to_develop' when employee_index % 5 = 0 then 'validated' else 'active' end)
        on conflict (organization_id, employee_id, skill_id)
        do update set level = excluded.level,
                      current_level = excluded.current_level,
                      target_level = excluded.target_level,
                      assessment_date = excluded.assessment_date,
                      evidence = excluded.evidence,
                      project_context = excluded.project_context,
                      last_self_assessment_at = excluded.last_self_assessment_at,
                      assessor_type = excluded.assessor_type,
                      status = excluded.status,
                      updated_at = now();
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

      insert into public.hr_onboarding_plans(organization_id, employee_id, manager_employee_id, recruiter_employee_id, start_date, target_end_date, status, progress_percent, risk_level, notes, checklist_items)
      select org.id, employee.id, employee.manager_employee_id, employee.manager_employee_id,
             coalesce(employee.arrival_date, current_date - (employee_index * 5)),
             coalesce(employee.arrival_date, current_date - (employee_index * 5)) + interval '45 days',
             case when employee_index % 7 = 0 then 'delayed' when employee_index % 5 = 0 then 'prepared' when employee_index % 4 = 0 then 'completed' else 'in_progress' end,
             case when employee_index % 4 = 0 then 100 else least(95, 25 + employee_index * 6) end,
             case when employee_index % 7 = 0 then 'high' when employee_index % 5 = 0 then 'watch' else 'normal' end,
             'Parcours standard : RH, manager, IT, qualité, documents, point 30/60/90 jours et validation avant archivage.',
             v_checklist
      where not exists (
        select 1 from public.hr_onboarding_plans p
        where p.organization_id = org.id and p.employee_id = employee.id and p.archived_at is null
      );
    end loop;

    select id into v_cycle_id
    from public.hr_review_cycles
    where organization_id = org.id and name = 'Campagne annuelle ' || extract(year from current_date)::int
    limit 1;

    if v_cycle_id is null then
      v_cycle_id := gen_random_uuid();
      insert into public.hr_review_cycles(id, organization_id, name, review_type, period_start, period_end, status)
      values(v_cycle_id, org.id, 'Campagne annuelle ' || extract(year from current_date)::int, 'annual', make_date(extract(year from current_date)::int, 1, 1), make_date(extract(year from current_date)::int, 12, 31), 'open');
    end if;

    employee_index := 0;
    for employee in
      select id, manager_employee_id
      from public.hr_employees
      where organization_id = org.id
      order by created_at nulls last, id
      limit 50
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

      insert into public.hr_review_items(organization_id, cycle_id, employee_id, manager_employee_id, status, objective_count, completed_objective_count, global_rating, employee_comment, manager_comment, review_details)
      select org.id, v_cycle_id, employee.id, employee.manager_employee_id,
             case when employee_index % 6 = 0 then 'calibration' when employee_index % 5 = 0 then 'manager_input' when employee_index % 4 = 0 then 'completed' else 'employee_input' end,
             4 + (employee_index % 4),
             least(4 + (employee_index % 4), employee_index % 6),
             round((2.5 + ((employee_index % 5) * 0.5))::numeric, 2),
             'Auto-évaluation : résultats obtenus, objectifs atteints, besoins de formation, souhaits d’évolution.',
             'Évaluation manager : performance, comportements, potentiel, objectifs et plan de développement.',
             v_review_payload
      where not exists (
        select 1 from public.hr_review_items ri
        where ri.organization_id = org.id and ri.cycle_id = v_cycle_id and ri.employee_id = employee.id
      );
    end loop;
  end loop;
end $$;
