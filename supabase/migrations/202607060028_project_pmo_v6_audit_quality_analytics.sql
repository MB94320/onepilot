-- ONEPILOT PMO v6 — référentiel d'audit projet, conformité et démonstration analytique réelle.
-- Source métier : AUDIT.xlsx. Migration additive, idempotente et isolée par organisation.

create extension if not exists pgcrypto;

create table if not exists public.project_audit_themes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.project_audit_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  theme_id uuid not null references public.project_audit_themes(id) on delete cascade,
  code text not null,
  question_order integer not null,
  question_text text not null,
  weight numeric(8,2) not null default 1 check (weight > 0),
  default_answer text check (default_answer in ('yes','no','na')),
  default_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, code)
);

create table if not exists public.project_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  audit_number text not null,
  audit_type text not null default 'delivery' check (audit_type in ('avv','delivery','closure','internal','client')),
  audit_date date not null,
  auditor_name text,
  status text not null default 'completed' check (status in ('planned','in_progress','completed','blocked','cancelled')),
  overall_score numeric(7,2) check (overall_score between 0 and 100),
  previous_score numeric(7,2) check (previous_score between 0 and 100),
  decision text,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, audit_number)
);

create table if not exists public.project_audit_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  audit_id uuid not null references public.project_audits(id) on delete cascade,
  theme_id uuid not null references public.project_audit_themes(id) on delete cascade,
  question_id uuid not null references public.project_audit_questions(id) on delete cascade,
  answer text not null check (answer in ('yes','no','na')),
  score numeric(7,2),
  comment text,
  evidence_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (organization_id, audit_id, question_id)
);

create index if not exists project_audit_themes_order_idx on public.project_audit_themes(organization_id, display_order);
create index if not exists project_audit_questions_theme_idx on public.project_audit_questions(organization_id, theme_id, question_order);
create index if not exists project_audits_project_idx on public.project_audits(organization_id, project_id, audit_date desc);
create index if not exists project_audit_responses_audit_idx on public.project_audit_responses(organization_id, audit_id, theme_id);

do $$
declare tbl text;
begin
  foreach tbl in array array['project_audit_themes','project_audit_questions','project_audits','project_audit_responses'] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_tenant_select', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_tenant_insert', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_tenant_update', tbl);
    execute format('drop policy if exists %I on public.%I', tbl || '_tenant_delete', tbl);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_organization_member(organization_id))', tbl || '_tenant_select', tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_organization_member(organization_id))', tbl || '_tenant_insert', tbl);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id))', tbl || '_tenant_update', tbl);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_organization_member(organization_id))', tbl || '_tenant_delete', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
  end loop;
end $$;

do $$
declare demo_org uuid;
declare demo_project record;
declare demo_audit_id uuid;
declare demo_task uuid;
declare project_index integer := 0;
declare month_index integer;
declare month_date date;
begin
  select id into demo_org from public.organizations where lower(coalesce(slug, '')) = 'onepilot' order by created_at limit 1;
  if demo_org is null then return; end if;

  insert into public.project_audit_themes (organization_id, code, name, display_order)
  select demo_org, source.code, source.name, source.display_order
  from (values
    ('A', 'Gestion des Exigences', 1),
    ('B', 'Risques et Opportunités', 2),
    ('C', 'Planification', 3),
    ('D', 'Pilotage de la Performance', 4),
    ('E', 'Réunions, Communication', 5),
    ('F', 'Vérification et Validation', 6),
    ('G', 'Capitalisation', 7),
    ('H', 'Gestion de Configuration', 8),
    ('I', 'Gestion Documentaire', 9),
    ('J', 'Sécurité des Personnes', 10),
    ('K', 'Sûreté et Sécurité des Données', 11),
    ('L', 'Gestion des Ressources', 12),
    ('M', 'Sous-Traitance', 13),
    ('N', 'X-Shore', 14),
    ('O', 'Transnational', 15),
    ('P', 'Gestion des Non-Conformités', 16),
    ('Q', 'Gestion des Insatisfactions', 17),
    ('R', 'Plan de Management Projet', 18)
  ) as source(code, name, display_order)
  on conflict (organization_id, code) do update set name = excluded.name, display_order = excluded.display_order, archived_at = null, updated_at = now();

  insert into public.project_audit_questions (organization_id, theme_id, code, question_order, question_text, weight, default_answer, default_comment)
  select demo_org, theme.id, source.code, source.question_order, source.question_text, source.weight, source.default_answer, source.default_comment
  from (values
    ('A', 1, 'AUD-A-001', 'Les exigences sont identifiées et tracées dans un outil de traçabilité des exigences', 2, 'yes', null),
    ('A', 2, 'AUD-A-002', 'Les exigences du contrat (s''il existe) sont tracées dans cet outil', 2, 'yes', null),
    ('A', 3, 'AUD-A-003', 'Les preuves du respect des exigences sont identifiées et enregistrées', 2, 'no', '09/10/2018: Action toujours en cours ==> A finaliser
01/08/2018: En cours côté PM'),
    ('A', 4, 'AUD-A-004', 'Les évolutions des exigences sont identifiées et tracées dans un outil de traçabilité des exigences', 2, 'na', null),
    ('A', 5, 'AUD-A-005', 'Suite à une demande d''évolution, les impacts ont été identifiés et mesurés, et une demande d''avenant a été faite', 2, 'na', null),
    ('A', 6, 'AUD-A-006', 'La traçablité des exigence à été mise à jour depuis moins de 6 mois', 2, 'yes', '01/08/2018: Juillet 2018'),
    ('A', 7, 'AUD-A-007', 'Les exigences spéciales sont identifiées et tracées dans outil de traçabilité des exigences pour des projets aéronautique, spatiale et défense', 2, 'na', null),
    ('A', 8, 'AUD-A-008', 'Les éléments critiques et caractéristiques clés associés aux exigences spéciales sont identifiés pour des projets aéronautique, spatiale et défense', 2, 'na', null),
    ('A', 9, 'AUD-A-009', 'Les exigences liées au contrôle des exportations sont identifiées et tracées dans un outil de tracabilité des exigences', 2, 'na', null),
    ('A', 10, 'AUD-A-010', 'La checklist Export-Control est renseignée, archivée et transmise au responsable Export-Control', 2, 'yes', '01/08/2018: Diffusé en juin - Vérifier si archivé'),
    ('B', 11, 'AUD-B-011', 'Les risques et opportunités sont identifiés et tracés via un outil de suivi des risques', 2, 'yes', null),
    ('B', 12, 'AUD-B-012', 'Le suivi des risques intègre les risques et opportunités du DOP', 2, 'na', 'projet démarré en ADM3 qui a permis d''avoir le RETEX pour chiffrer les UO'),
    ('B', 13, 'AUD-B-013', 'Le suivi des risques intègre les risques et opportunités issus de la revue des exigences', 2, 'no', '09/10/2018: Action toujours en cours ==> A finaliser
01/08/2018: En cours côté PM'),
    ('B', 14, 'AUD-B-014', 'Le suivi des risques intègre les risques et opportunités issus de la revue de lancement', 2, 'no', '09/10/2018: Action toujours en cours ==> A finaliser
01/08/2018: En cours côté PM'),
    ('B', 15, 'AUD-B-015', 'La criticité des risques est évaluée, tracée et suivie', 2, 'yes', null),
    ('B', 16, 'AUD-B-016', 'L''impact financier lié aux risques est évalué, tracé et suivi', 2, 'no', '09/10/2018: Action toujours en cours ==> A finaliser
01/08/2018: En cours côté PM'),
    ('B', 17, 'AUD-B-017', 'Le statut des risques est évalué, tracé et suivi', 2, 'yes', null),
    ('B', 18, 'AUD-B-018', 'Les actions de mitigation sont identifiées, tracées et suivies', 2, 'yes', null),
    ('B', 19, 'AUD-B-019', 'Les risques et les actions de mitigation associées sont communiqués en COPIL DPI', 2, 'yes', 'risques transparaissent dans les actions / copil interne plutôt financier'),
    ('B', 20, 'AUD-B-020', 'Les risques et les actions de mitigation diffusables associées sont communiqués au client', 2, 'yes', null),
    ('C', 21, 'AUD-C-021', 'Un outil adapté à la planificationn des activités est mise en place', 1, 'yes', 'TdB '),
    ('C', 22, 'AUD-C-022', 'Un planning a été initialisé sur la base des activités du WBS avec ordonnancement et dépendance des tâches et des jalons', 1, 'na', 'UO donc pas de dépendance des taches'),
    ('C', 23, 'AUD-C-023', 'Une estimation du type, de la quantité, de la charge et de la disponibilité des ressources (matériel, personnes, équipement ou sous-traitants) a été menée par une ressource spécialiste de l''activité', 1, 'yes', null),
    ('C', 24, 'AUD-C-024', 'Le planning affiche l''affectation des ressources aux tâches, la charge référencée de chaque tâche, ses dépendances', 1, 'yes', null),
    ('C', 25, 'AUD-C-025', 'Les risques et impacts de glissements de planning sont connus, suivis et maîtrisés', 1, 'yes', 'date replanif dans TBD '),
    ('C', 26, 'AUD-C-026', 'Le planning est mis à jour suite à d''éventuelles modifications (glissements, évolutions…)', 1, 'yes', null),
    ('C', 27, 'AUD-C-027', 'Le planning mis à jour est partagé à l''équipe projet', 1, 'yes', null),
    ('C', 28, 'AUD-C-028', 'Le planning est communiqué au client (notamment suite à modifications)', 1, 'yes', null),
    ('D', 29, 'AUD-D-029', 'Les éléments de mesure de la Performance sont définis', 2, 'yes', 'dans TBD'),
    ('D', 30, 'AUD-D-030', 'Les objectifs du projet et les indicateurs associés sont définis', 2, 'yes', null),
    ('D', 31, 'AUD-D-031', 'Les objectifs du projet comportent les objectifs spécifiques répondant aux besoins client', 2, 'yes', null),
    ('D', 32, 'AUD-D-032', 'Un indicateur sur la conformité des livrables est suivi', 2, 'yes', null),
    ('D', 33, 'AUD-D-033', 'Un indicateur sur le respect des délais est suivi', 2, 'yes', null),
    ('D', 34, 'AUD-D-034', 'Un tableau de bord à jour consolide le résultat des indicateurs', 2, 'yes', null),
    ('D', 35, 'AUD-D-035', 'Ce tableau de bord est revu et analysé en COPIL DPI', 2, 'no', 'Uniquement financier'),
    ('D', 36, 'AUD-D-036', 'Ce tableau de bord est revu et analysé en COPIL externe avec le client', 2, 'yes', 'client pas Fan des KPI + partage en COTECH'),
    ('D', 37, 'AUD-D-037', 'Un plan d''action, identifiant les responsables, états d''avancement et dates de fin planifiées et réalisées, est mis en place et suivi en cas d''objectifs non atteints', 2, 'no', '01/08/2018: A maj les actions dans le TdB + intégrer les NC
créer un plan d''action dans le fichier de suivi des actions'),
    ('D', 38, 'AUD-D-038', 'Les actions sont suivies à une fréquence conforme à celle définie', 2, 'no', '09/10/2018: Item 38 dépendant de l''item 37'),
    ('D', 39, 'AUD-D-039', 'L''efficacité des actions est mesurée et tracée', 2, 'no', '01/08/2018: Action identifiée en cours'),
    ('E', 40, 'AUD-E-040', 'Les modalités de communication en interne et avec le client sont définies', 1, 'yes', '09/10/2018: Action closed
01/08/2018: PMP à màj ==> Action en cours'),
    ('E', 41, 'AUD-E-041', 'Les moyens et la fréquence de communication sont appliqués conformément à ce qui a été défini', 1, 'yes', null),
    ('E', 42, 'AUD-E-042', 'Les réunions, leur fréquence, leurs objectifs et les participants prévus sont définis', 1, 'yes', '09/10/2018: Action closed
01/08/2018: PMP à màj ==> Action en cours'),
    ('E', 43, 'AUD-E-043', 'Les réunions internes et avec le client sont réalisées conformément à ce qui a été défini', 1, 'yes', null),
    ('E', 44, 'AUD-E-044', 'La réunion de lancement est formalisée par un compte rendu identifiant les actions, les responsables associés et les dates objectif de clôture', 1, 'yes', null),
    ('E', 45, 'AUD-E-045', 'Les réunions internes et avec le client sont formalisées par un compte rendu identifiant les actions, les responsables associés et les dates objectif de clôture', 1, 'yes', 'les actions issues des CR sont transférées dans le fichier des actions'),
    ('F', 46, 'AUD-F-046', 'Les modalités de V&V est définies', 2, 'yes', 'test pour voir si ca fonctionne check list Thales  + check croisé par le RT ou RQ'),
    ('F', 47, 'AUD-F-047', 'Les livrables soumis au V&V et leurs critères d''acceptation sont identifiés', 2, 'yes', null),
    ('F', 48, 'AUD-F-048', 'Les acteurs du V&V sont identifiés', 2, 'yes', 'RT et RQ'),
    ('F', 49, 'AUD-F-049', 'Les acteurs du V&V utilisent une check-list prenant en compte les critères d''acceptation', 2, 'yes', 'CL livrées avec les livrables = jalons projets'),
    ('F', 50, 'AUD-F-050', 'La check-list de V&V est mise à jour suite à une éventuelle non-conformité', 2, 'na', 'CL client'),
    ('F', 51, 'AUD-F-051', 'Les preuves de relecture sont conservées', 2, 'yes', null),
    ('F', 52, 'AUD-F-052', 'Le process de V&V est appliqué conformément à ce qui a été défini', 2, 'yes', null),
    ('F', 53, 'AUD-F-053', 'Un bon de livraison est édité pour chaque livraison et transmis au client pour signature', 2, 'yes', 'BL THALES '),
    ('F', 54, 'AUD-F-054', 'Les bons de livraison contiennent la désignation, la référence et la version des livrables, la date de livraison et la signature du chef de projet ou de son délégataire.', 2, 'yes', null),
    ('F', 55, 'AUD-F-055', 'L''acceptation des livrables est formalisée par un Procès-Verbal d''Acceptation signé par le client, et tout refus ou réserve de livrable est établi sur la base des critères d''acceptation', 2, 'yes', 'livraisons statuées par JIRA quand c solve = accepté'),
    ('G', 56, 'AUD-G-056', 'Un retour d''expérience basé sur la méthode SWOT est réalisé et formalisé par le chef de projet tout au long du projet', 1, 'yes', 'SWOT en COSTRAT '),
    ('G', 57, 'AUD-G-057', 'Un retour d''expérience technique est réalisé et formalisé par l''équipe projet tout au long du projet', 1, 'no', '01/08/2018: En cours
démarrage / partage de fiches sous TOOL => en cours'),
    ('G', 58, 'AUD-G-058', 'Les éléments de capitalisation sont partagés avec l''équipe projet', 1, 'no', null),
    ('G', 59, 'AUD-G-059', 'Les actions issues des retours d''expérience sont tracées et transmises à la DPI ou aux Solutions Managers', 1, 'no', null),
    ('H', 60, 'AUD-H-060', 'Les articles à gérer en configuration sont identifiés', 1, 'na', 'gestion de conf THALES'),
    ('H', 61, 'AUD-H-061', 'Les informations de configuration associés aux articles sont identifiées', 1, 'na', null),
    ('H', 62, 'AUD-H-062', 'Les états de configuration sont enregistrées', 1, 'na', null),
    ('H', 63, 'AUD-H-063', 'Les données d''entrée sont gérées en configuration', 1, 'na', null),
    ('I', 64, 'AUD-I-064', 'Les modalités de Gestion Documentaire sont définies', 1, 'yes', 'a indiquer dans PMP => référence THALES'),
    ('I', 65, 'AUD-I-065', 'Un classeur projet électronique existe dans un espace sauvegardé et sécurisé', 1, 'yes', null),
    ('I', 66, 'AUD-I-066', 'L''arborescence du classeur projet est conforme à l''arborescence projet type sauf spécification particulière', 1, 'yes', null),
    ('I', 67, 'AUD-I-067', 'Tous les documents produits sur le projet sont référencés via un fichier dédié', 1, 'no', 'Pas gérable en plus doc stockés sur serveur client'),
    ('I', 68, 'AUD-I-068', 'Les dernières versions des modèles de document sont accessibles par l''équipe projet', 1, 'yes', null),
    ('I', 69, 'AUD-I-069', 'Les modalités de stockage sont définies et respectées', 1, 'yes', null),
    ('I', 70, 'AUD-I-070', 'Les modalités d''archivage sont définies et respectées', 1, 'yes', null),
    ('J', 71, 'AUD-J-071', 'Le Plan de Prévention, s’il est nécessaire, existe pour la prestation', 1, 'yes', null),
    ('J', 72, 'AUD-J-072', 'Le Plan de Prévention est validé par le chef de projet et par tous les consultants de l''équipe sur MINOS', 1, 'yes', null),
    ('J', 73, 'AUD-J-073', 'Le Plan de Prévention est connu par les consultants de l''équipe', 1, 'yes', null),
    ('J', 74, 'AUD-J-074', 'Les consignes de sécurité particulières sont prises en compte (environnement dangereux…)', 1, 'na', null),
    ('J', 75, 'AUD-J-075', 'Les consultants de l’équipe ont reçu les formations et habilitations obligatoires', 1, 'yes', 'B0  => intervention sur env elect + CD (moitiée)'),
    ('J', 76, 'AUD-J-076', 'Les consultants de l’équipe ont reçu les EPI nécessaires', 1, 'yes', 'Blouses'),
    ('J', 77, 'AUD-J-077', 'Les consultants ont été formés à leur poste de travail (dont procédures d’urgence du site)', 1, 'yes', null),
    ('J', 78, 'AUD-J-078', 'Le Plan de Prévention est signé avec les sous-traitants (ou les consignes de sécurité ont bien été cascadées aux sous-traitants)', 1, 'na', null),
    ('K', 79, 'AUD-K-079', 'Les règles de Sécurité de l''Information applicables au projet sont connues et identifiées', 2, 'yes', null),
    ('K', 80, 'AUD-K-080', 'Si des exigences particulières de protection de l’information s’appliquent au projet, un Dossier Sécurité Information a été produit pour définir les moyens et procédures spécifiques de protection de l’information.', 2, 'na', null),
    ('K', 81, 'AUD-K-081', 'Le chef de projet est sensibilisé aux règles de Sécurité de l''Information', 2, 'yes', null),
    ('K', 82, 'AUD-K-082', 'L''équipe projet est sensibilisé aux règles de Sécurité de l''Information', 2, 'yes', null),
    ('K', 83, 'AUD-K-083', 'Les données du projet sont manipulées et conservées via des moyens adaptés aux règles de Sécurité de l''Information identifiées', 2, 'yes', null),
    ('K', 84, 'AUD-K-084', 'Les exceptions aux règles de Sécurité de l''Information sont tracées et partagées avec le client', 2, 'na', null),
    ('K', 85, 'AUD-K-085', 'Le classeur projet est enregistré soit sur réseau Altran sécurisé (projets hors réseau client) soit sur un espace dédié Altran (projets sur réseau client)', 2, 'yes', null),
    ('K', 86, 'AUD-K-086', 'Les accès aux données du projet sont limités aux membres de l''équipe projet', 2, 'yes', null),
    ('K', 87, 'AUD-K-087', 'Tous les documents sensibles (papier ou électronique) ne sont accessibles et visibles qu''aux personnes ayant droit (pas de documents papier laissés devant l''imprimante…)', 2, 'yes', null),
    ('K', 88, 'AUD-K-088', 'Les ordinateurs de l''équipe projet sont verrouillés sur leur bureau', 2, 'yes', null),
    ('K', 89, 'AUD-K-089', 'Les médias amovibles (disques durs, clés USB…) sont uniquement utilisés pour des échanges de données et non de conservation de celles-ci', 2, 'yes', null),
    ('K', 90, 'AUD-K-090', 'Les sous-traitants ont accès uniquement aux données concernant leur périmètre d''intervention défini dans le contrat', 2, 'na', null),
    ('L', 91, 'AUD-L-091', 'Les modalités de Gestion des Ressources sont définies (Intégration, Compétences, Back-up)', 2, 'yes', '09/10/2018: Actio closed 
01/08/2018: Intégrer dans le PMP'),
    ('L', 92, 'AUD-L-092', 'Les rôles et responsabilités de chacun ainsi que l''OBS sont définis et connus', 2, 'yes', '09/10/2018: Actio closed 
01/08/2018: Intégrer dans le PMP'),
    ('L', 93, 'AUD-L-093', 'Les rôles et responsabilités de chacun ainsi que l''OBS sont conformes à ce qui a été défini', 2, 'yes', null),
    ('L', 94, 'AUD-L-094', 'Un kit d''intégration des nouveaux arrivants sur projet existe et est utilisé systématiquement', 2, 'no', '09/10/2018: A finaliser
mettre a jour le ppt d''intégration / voir pour l''intégration technique'),
    ('L', 95, 'AUD-L-095', 'Un kit d''intégration des nouveaux arrivants présente à minima le projet, la fiche de poste, les données relatives aux projet, les interlocuteurs', 2, 'no', '09/10/2018: A finaliser (voir mail de Mégane du 01/08/2018 ==> A compléter
01/08/2018: A intégrer dans la CL nouveaux arrivants'),
    ('L', 96, 'AUD-L-096', 'Le process d''intégration des nouveaux arrivants est déployé (tous les éléments du kit d''intégration sont balayés)', 2, 'no', '09/10/2018: Idem action ci-dessus
01/08/2018: A intégrer dans la CL nouveaux arrivants'),
    ('L', 97, 'AUD-L-097', 'Le kit d''intégration des nouveaux arrivants permet de présenter les éléments du Plan de Prévention', 2, 'yes', '09/10/2018: L''item PdP est indiqué dans le Kit d''intégration et renvoie vers Minos pour le lire et le valider
01/08/2018: A intégrer dans la CL nouveaux arrivants'),
    ('L', 98, 'AUD-L-098', 'Les compétences cibles sont définies dans une Matrice des Compétences', 2, 'yes', null),
    ('L', 99, 'AUD-L-099', 'Les compétences de l''équipe sont tracées et mises à jour dans la Matrice des Compétences', 2, 'yes', null),
    ('L', 100, 'AUD-L-100', 'Un plan de formation est déployé suite à analyse de la Matrice des Compétences', 2, 'yes', null),
    ('L', 101, 'AUD-L-101', 'Les dossiers de compétence de l''ensemble de l''équipe projet sont mis à jour dans l''outil dédié LINX', 2, 'yes', null),
    ('L', 102, 'AUD-L-102', 'Une gestion des back-up est définie sur le projet en fonction des compétences', 2, 'yes', 'Tout le monde est interchangeable / DP abs = DP remplacant'),
    ('M', 103, 'AUD-M-103', 'Un cahier des charges est rédigé et signé par une personne habilitée', 1, 'na', null),
    ('M', 104, 'AUD-M-104', 'Les exigences client cascadées vers le sous-traitant sont tracées dans le cahier des charges', 1, 'na', null),
    ('M', 105, 'AUD-M-105', 'Les exigences du cahier des charges et contractuelles (ECA) sont tracées dans une Matrice de Traçabilité des Exigences, suivies, et les preuves du respect des exigences sont enregistrées', 1, 'na', null),
    ('M', 106, 'AUD-M-106', 'La réunion de lancement avec le sous-traitant est formalisée par un compte rendu identifiant les actions, les responsables associés et les dates objectif de clôture', 1, 'na', null),
    ('M', 107, 'AUD-M-107', 'Les réunions de suivi avec le sous-traitant sont formalisées par un compte rendu identifiant les actions, les responsables associés et les dates objectif de clôture', 1, 'na', null),
    ('M', 108, 'AUD-M-108', 'La distinction du sous-traitant est visible dans l''équipe projet (badge, bureau, signature mail)', 1, 'na', null),
    ('M', 109, 'AUD-M-109', 'La vérification et l''acceptation des livrables produits par le sous-traitant sont formalisées', 1, 'na', null),
    ('M', 110, 'AUD-M-110', 'Des indicateurs liés à la performance du sous-traitant sont définis et suivis conformément au cahier des charges et aux ECA', 1, 'na', null),
    ('M', 111, 'AUD-M-111', 'Une évaluation de la prestation est réalisée et tracée', 1, 'na', null),
    ('M', 112, 'AUD-M-112', 'En cas d''écart, un plan d''actions d''amélioration est tracé et suivi', 1, 'na', null),
    ('M', 113, 'AUD-M-113', 'A la fin de la prestation sous-traitée, le bilan de prestation est réalisé', 1, 'na', null),
    ('N', 114, 'AUD-N-114', 'Une ressource dédiée à la gestion du process X-Shore est identifiée sur le projet', 1, 'na', null),
    ('N', 115, 'AUD-N-115', 'Les besoins Altran sont formalisés et tracés dans des Statement of Work ou Fiches de Travaux, et transmis aux équipes X-Shore', 1, 'na', null),
    ('N', 116, 'AUD-N-116', 'Les critères d''acceptation sont définis et tracés dans les Statement of Work ou Fiches de Travaux', 1, 'na', null),
    ('N', 117, 'AUD-N-117', 'La réunion de lancement avec les équipes X-Shore est formalisée par un compte rendu identifiant les actions, les responsables associés, les dates objectif de clôture, les inputs et la charge', 1, 'na', null),
    ('N', 118, 'AUD-N-118', 'Les réunions de suivi avec les équipes X-Shore sont formalisées par un compte rendu identifiant les actions, les responsables associés, les dates objectif de clôture, les inputs, l''impact sur la modification des inputs, la charge et l''état d''avancement des livrables', 1, 'na', null),
    ('N', 119, 'AUD-N-119', 'Le planning de l''activité X-Shore est géré et suivi', 1, 'na', null),
    ('N', 120, 'AUD-N-120', 'La vérification et la validation des livrables produits par les équipes X-Shore sont formalisées', 1, 'na', null),
    ('N', 121, 'AUD-N-121', 'Les indicateurs de suivi de l''activité X-Shore sont suivis', 1, 'na', null),
    ('N', 122, 'AUD-N-122', 'En cas de non atteinte des objectifs, un plan d''actions d''amélioration est tracé et suivi', 1, 'na', null),
    ('N', 123, 'AUD-N-123', 'Les risques de l''activité X-Shore sont identifiés, tracés et suivis', 1, 'na', null),
    ('N', 124, 'AUD-N-124', 'La capitalisation de l''activité X-Shore est réalisée tout au long du projet (check-list, manuel d''utilisateur et note technique)', 1, 'na', null),
    ('O', 125, 'AUD-O-125', 'Le process de Gestion du projet Transnat est défini dans un PMP unique', 1, 'na', null),
    ('O', 126, 'AUD-O-126', 'Un responsable technique unique (PM Transnat responsable de l''ensemble des livrables) et un responsable commercial unique (BM Transnat) sont identifiés sur le projet', 1, 'na', null),
    ('O', 127, 'AUD-O-127', 'Un encadrant technique (PL) est identifié pour chaque entité', 1, 'na', null),
    ('O', 128, 'AUD-O-128', 'Un responsable de ressources est identifié pour chaque entité', 1, 'na', null),
    ('O', 129, 'AUD-O-129', 'Les outils de gestion du projet (planning, gestion des ressources, gestion des livrables...) sont déployés sur un espace partagé', 1, 'na', null),
    ('O', 130, 'AUD-O-130', 'Le type d''engagement est clairement défini au cours de la réunion de lancement', 1, 'na', null),
    ('O', 131, 'AUD-O-131', 'Tous les Cooperation Agreement entre Altran France et les différentes entités européennes sont disponibles, datés et signés', 1, 'na', null),
    ('O', 132, 'AUD-O-132', 'Les réunions internes (COPIL Transnat) entre les acteurs de chaque entité impliquée sont réalisées conformément à ce qui a été défini', 1, 'na', null),
    ('P', 133, 'AUD-P-133', 'Les non-conformités sont détectées à partir du document de suivi des livrables', 2, 'yes', null),
    ('P', 134, 'AUD-P-134', 'Les non-conformités sont tracées et suivies dans un tableau récapitulatif dédié', 2, 'yes', '01/08/2018: Réalisé en juin
créer un onglet NC => a envoyer a Nicolas'),
    ('P', 135, 'AUD-P-135', 'Une analyse des causes a été réalisée et tracée suite à non-conformités majeures', 2, 'na', null),
    ('P', 136, 'AUD-P-136', 'Des actions curatives, correctives et préventives ont été mises en place et tracées suite à non-conformités majeures', 2, 'na', null),
    ('P', 137, 'AUD-P-137', 'L''efficacité des actions curatives/correctives/préventives est mesurée et tracée', 2, 'no', '01/08/2018: Pas de NC actuellement, à prendre en compte en cours de projet'),
    ('P', 138, 'AUD-P-138', 'Les coûts des non-conformités sont estimés', 2, 'no', '01/08/2018: Pas de NC actuellement, à prendre en compte en cours de projet'),
    ('P', 139, 'AUD-P-139', 'La Fiche de Non-Conformité a été clôturée uniquement après un traitement efficace des actions curatives, correctives et préventives', 2, 'na', null),
    ('Q', 140, 'AUD-Q-140', 'Une Fiche d''Evaluation de la Satisfaction Client est transmise à minima à une fréquence trimestrielle', 1, 'yes', null),
    ('Q', 141, 'AUD-Q-141', 'Une Fiche de Non-Conformité est ouverte dans un délai de 3 jours suivant la date de communication de l''insatisfaction par le client', 1, 'yes', null),
    ('Q', 142, 'AUD-Q-142', 'Des actions curatives ont été mises en place et tracées dans un délai de 5 jours suivant la date de communication de l''insatisfaction par le client', 1, 'yes', null),
    ('Q', 143, 'AUD-Q-143', 'Une analyse des causes a été réalisée et tracée suite à insatisfaction', 1, 'yes', null),
    ('Q', 144, 'AUD-Q-144', 'Des actions correctives et préventives ont été mises en place et tracées suite à insatisfaction', 1, 'yes', null),
    ('Q', 145, 'AUD-Q-145', 'La Fiche d''Insatisfaction comprenant l''analyse causale et le plan d''action est communiquée au client', 1, 'no', '09/10/2018: Une insatisfaction existait mais non présentée au client'),
    ('Q', 146, 'AUD-Q-146', 'L''efficacité des actions curatives/correctives/préventives est mesurée et tracée', 1, 'yes', null),
    ('Q', 147, 'AUD-Q-147', 'Les coûts des insatisfactions sont estimés', 1, 'yes', null),
    ('Q', 148, 'AUD-Q-148', 'La Fiche de Non-Conformité a été clôturée uniquement par la Direction Qualité après un retour à la satisfaction client', 1, 'na', null),
    ('R', 149, 'AUD-R-149', 'Si spécifié, un PMP ou équivalent (ex: PAQ) est rédigé sur le projet', 1, 'yes', null),
    ('R', 150, 'AUD-R-150', 'Les process spécifiques au projet sont définis', 1, 'yes', null),
    ('R', 151, 'AUD-R-151', 'Le PMP est disponible pour l''équipe projet', 1, 'yes', null),
    ('R', 152, 'AUD-R-152', 'Le PMP est mis à jour conformément à ce qui a été défini', 1, 'yes', null)
  ) as source(theme_code, question_order, code, question_text, weight, default_answer, default_comment)
  join public.project_audit_themes theme on theme.organization_id = demo_org and theme.code = source.theme_code
  on conflict (organization_id, code) do update set theme_id = excluded.theme_id, question_order = excluded.question_order, question_text = excluded.question_text, weight = excluded.weight, default_answer = excluded.default_answer, default_comment = excluded.default_comment, archived_at = null, updated_at = now();

  for demo_project in
    select id, code, coalesce(nullif(baseline_budget, 0), nullif(ordered_budget, 0), nullif(budget_amount, 0), 500000) as budget
    from public.project_projects where organization_id = demo_org and archived_at is null order by code limit 3
  loop
    project_index := project_index + 1;
    select id into demo_task from public.project_tasks where organization_id = demo_org and project_id = demo_project.id and archived_at is null order by start_date nulls last, code limit 1;
    insert into public.project_audits (organization_id, project_id, audit_number, audit_type, audit_date, auditor_name, status, previous_score, decision, comments)
    values (demo_org, demo_project.id, 'AUD-2026-' || lpad(project_index::text, 4, '0'), case when project_index = 1 then 'avv' else 'delivery' end, make_date(2026, 7, 8 + project_index), 'Responsable qualité projet', 'completed', 67, 'Poursuivre sous réserve de clôturer les écarts prioritaires.', 'Audit de démonstration construit depuis le référentiel qualité projet ONEPILOT.')
    on conflict (organization_id, audit_number) do update set project_id = excluded.project_id, audit_type = excluded.audit_type, audit_date = excluded.audit_date, status = excluded.status, archived_at = null, updated_at = now()
    returning id into demo_audit_id;

    insert into public.project_audit_responses (organization_id, project_id, audit_id, theme_id, question_id, answer, score, comment)
    select demo_org, demo_project.id, demo_audit_id, question.theme_id, question.id,
      case when project_index = 2 and question.question_order % 11 = 0 then 'no' else question.default_answer end,
      case when (case when project_index = 2 and question.question_order % 11 = 0 then 'no' else question.default_answer end) = 'yes' then 100
           when (case when project_index = 2 and question.question_order % 11 = 0 then 'no' else question.default_answer end) = 'no' then 0 else null end,
      question.default_comment
    from public.project_audit_questions question
    where question.organization_id = demo_org and question.archived_at is null
    on conflict (organization_id, audit_id, question_id) do update set answer = excluded.answer, score = excluded.score, comment = excluded.comment, archived_at = null, updated_at = now();

    update public.project_audits audit
    set overall_score = score.value,
        decision = case when score.value >= 80 then 'Conforme — poursuivre et maintenir les pratiques.' when score.value >= 65 then 'Partiellement conforme — plan d’action requis.' else 'Non conforme — escalade et plan de redressement requis.' end,
        updated_at = now()
    from (
      select round(sum(response.score * question.weight) / nullif(sum(question.weight) filter (where response.answer <> 'na'), 0), 2) as value
      from public.project_audit_responses response
      join public.project_audit_questions question on question.id = response.question_id
      where response.audit_id = demo_audit_id and response.answer <> 'na' and response.archived_at is null
    ) score
    where audit.id = demo_audit_id;

    for month_index in 8..12 loop
      month_date := make_date(2026, month_index, 1);
      insert into public.project_financial_periods (organization_id, project_id, period_start, period_end, baseline_budget, planned_value, earned_value, actual_cost, production_amount, invoiced_amount, collected_amount, purchase_amount, expense_amount, forecast_to_complete, comment)
      values (demo_org, demo_project.id, month_date, (month_date + interval '1 month - 1 day')::date, demo_project.budget,
        42000 * month_index * (1 + project_index * 0.08),
        38500 * month_index * (1 + project_index * 0.07) - case when month_index in (9,10) then 12000 else 0 end,
        35500 * month_index * (1 + project_index * 0.09),
        44500 * month_index * (1 + project_index * 0.06),
        40500 * month_index * (1 + project_index * 0.05),
        37000 * month_index * (1 + project_index * 0.04),
        1800 * project_index + 350 * month_index, 900 * project_index + 180 * month_index,
        greatest(0, demo_project.budget - 35500 * month_index), 'Démonstration PMO corrélée — période ' || to_char(month_date, 'MM/YYYY'))
      on conflict (organization_id, project_id, period_start) do update set baseline_budget = excluded.baseline_budget, planned_value = excluded.planned_value, earned_value = excluded.earned_value, actual_cost = excluded.actual_cost, production_amount = excluded.production_amount, invoiced_amount = excluded.invoiced_amount, collected_amount = excluded.collected_amount, purchase_amount = excluded.purchase_amount, expense_amount = excluded.expense_amount, forecast_to_complete = excluded.forecast_to_complete, comment = excluded.comment, archived_at = null, updated_at = now();

      insert into public.project_satisfaction_surveys (organization_id, project_id, survey_month, respondent_name, respondent_role, customer_listening_score, planning_score, technical_skills_score, monitoring_score, risk_management_score, verbatim)
      values (demo_org, demo_project.id, month_date, 'Client démonstration', 'Direction de programme', least(5, 3 + (month_index % 3)), least(5, 2 + (month_index % 4)), least(5, 3 + (project_index % 2)), least(5, 3 + (month_index % 2)), least(5, 2 + ((month_index + project_index) % 3)), 'Revue client mensuelle synchronisée avec la performance projet.')
      on conflict (organization_id, project_id, survey_month) do update set customer_listening_score = excluded.customer_listening_score, planning_score = excluded.planning_score, technical_skills_score = excluded.technical_skills_score, monitoring_score = excluded.monitoring_score, risk_management_score = excluded.risk_management_score, verbatim = excluded.verbatim, archived_at = null, updated_at = now();

      insert into public.project_deliverables (organization_id, project_id, task_id, code, name, description, deliverable_type, status, quality_status, planned_date, replanned_date, actual_delivery_date, first_time_right, owner_name, acceptance_criteria)
      values (demo_org, demo_project.id, demo_task, 'LIV-2026-' || lpad((project_index * 100 + month_index)::text, 4, '0'), 'Livrable mensuel ' || month_index || ' — ' || demo_project.code, 'Livrable de démonstration corrélé aux indicateurs OTD, OQD et DoD.', 'document', case when month_index <= 11 then 'delivered' else 'planned' end, case when month_index in (9,11) then 'review' else 'accepted' end, (month_date + interval '18 days')::date, case when month_index in (9,10) then (month_date + interval '22 days')::date else null end, case when month_index <= 11 then (month_date + ((case when month_index in (9,10) then 27 else 17 end) || ' days')::interval)::date else null end, case when month_index in (9,11) then false when month_index <= 11 then true else null end, 'Responsable livrable', 'Validation du contenu, de la qualité et de la preuve de remise.')
      on conflict (organization_id, project_id, code) do update set status = excluded.status, quality_status = excluded.quality_status, planned_date = excluded.planned_date, replanned_date = excluded.replanned_date, actual_delivery_date = excluded.actual_delivery_date, first_time_right = excluded.first_time_right, archived_at = null, updated_at = now();
    end loop;
  end loop;
end $$;
