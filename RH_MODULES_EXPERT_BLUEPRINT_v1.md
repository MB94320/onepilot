# ONEPILOT — Cible expert des modules RH suivants

## Règles UI et comportement à conserver partout

- Même formalisme que les pages RH validées : PageHeader, KPI, bloc `Périmètre d’analyse`, barre de recherche en haut, filtres par lignes de 4, onglets couleur indigo/violet/emerald/amber/rose.
- Cartes : `rounded-2xl`, bord slate, fond blanc, ombre légère, menu horizontal `MoreHorizontal` en haut à droite.
- Tableaux : scroll vertical dès plus de 5 lignes, scroll horizontal si nécessaire, en-tête sticky, première colonne sticky, dernière colonne Actions avec menu trois points.
- Graphiques/widgets : boutons copier + agrandir visibles, copie PNG/SVG, légende intégrée, modale d’agrandissement.
- Exports : bouton Export complet vert, PDF rouge/blanc, export filtré selon rôle et périmètre.
- Multi-tenant : toutes les écritures portent `organization_id`, auteur, horodatage, audit et archivage logique.
- Multi-rôle : lecteur seul, manager, RH, direction, admin. Les boutons d’action doivent disparaître si le rôle n’a pas l’autorisation.
- Pas de mock data : les états vides doivent venir de Supabase.

## Temps & activités

Objectif expert : suivre les temps réels, imputation projet, activité interne, absences/temps non productif, validation N+1, écarts vs capacité et charge.

Attendus métier :
- Saisie jour/semaine/mois par collaborateur.
- Statuts : brouillon, soumis, validé manager, validé RH/finance si requis, rejeté, archivé.
- Contrôles : dépassement capacité, journée incomplète, projet non affecté, activité non facturable, retard de saisie.
- Liens : staffing/capacité, projets, absences, facturation, coûts RH.
- KPI : heures soumises, heures approuvées, taux de complétude, écarts capacité, retard de validation.

## Compétences

Objectif expert : cartographier les compétences, niveaux actuels/cibles, expertises critiques, dépendances et besoins de montée en compétence.

Attendus métier :
- Référentiel compétences par famille/catégorie/criticité.
- Niveaux 0 à 5 avec preuves, évaluateur, date d’évaluation.
- Matrice collaborateur x compétence.
- Écarts niveau actuel vs cible.
- Identification des experts, backups manquants, risques de dépendance.
- Liens : staffing, entretiens, formation, mobilité, recrutement.

## Onboarding

Objectif expert : sécuriser les arrivées et réduire le délai de productivité.

Attendus métier :
- Parcours par collaborateur avec manager, recruteur, jalons, tâches et risques.
- Statuts : préparé, en cours, terminé, retard, annulé, archivé.
- Alertes : matériel non prêt, contrat incomplet, accès manquant, formation obligatoire non faite.
- KPI : arrivées à venir, parcours actifs, tâches en retard, risques élevés, complétude dossier.
- Liens : ressources, recrutement, IT, formations, documents, entretiens période d’essai.

## Entretiens & objectifs

Objectif expert : piloter les campagnes, objectifs, feedbacks, calibrage, actions de suivi et performance.

Attendus métier :
- Cycles : annuel, professionnel, objectifs, mi-année, période d’essai, personnalisé.
- Statuts : non commencé, saisie collaborateur, saisie manager, calibration, terminé, archivé.
- Objectifs mesurables avec avancement, poids, échéance, résultat.
- Suivi actions post-entretien.
- Liens : compétences, rémunération, mobilité, formation, onboarding, alertes manager.
- KPI : campagnes ouvertes, entretiens à compléter, objectifs atteints, actions en retard, alertes calibration.
