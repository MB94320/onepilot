# ONEPILOT — Installation du correctif Projets V4

Ce paquet met à jour uniquement le module Projets et le moteur de copie des graphiques partagé. Il conserve le formalisme validé de la page Ressources.

## Principales évolutions

- Portefeuille : opportunité `OPP-AAAA-0001`, tri croissant, priorités colorées, barres d’avancement, budgets, marges, risques, livrables, non-conformités, satisfaction et charge synchronisés.
- Analyses : vrais donuts copiables, budget consommé/restant empilé, satisfaction, TACE, santé portefeuille, quatre graphiques Livrables/OTD/OQD/DoD et matrice des risques 4 × 4.
- Alertes : structure Ressources avec Synthèse, Alertes, Recommandations et widgets opérationnels.
- Timeline : navigation temporelle centrée sur aujourd’hui.
- Planification : WBS hiérarchique, modification des tâches, Gantt jours/semaines/mois/trimestres, jalons, retards, chemin critique et diagramme PERT.
- Actions : pilotage détaillé séparé de la synthèse automatique par projet, filtres Ressource et origines colorées.
- Performance : bascule Cartes/Tableau et actions contextuelles.
- Cockpit projet : santé synthétique, planification modifiable, écarts de compétences, plan de développement, audit regroupé dans Qualité et définitions des indicateurs.
- SQL : synchronisation facultative Commerce/Projets, normalisation des références et jeu de compétences projet de démonstration.

## Installation

Décompresser le zip directement dans :

```text
C:\projets\onepilot
```

Accepter le remplacement des fichiers.

## Commandes CMD obligatoires

Appliquer d’abord la migration :

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

La migration attendue est :

```text
202607060026_project_pmo_v4_portfolio_sync_planning.sql
```

Répondre `Y`. Si le SQL échoue, arrêter et transmettre l’erreur complète avant de lancer le build.

Si le SQL est correct :

```cmd
cd /d C:\projets\onepilot && npm run build
```

Si le build est correct :

```cmd
cd /d C:\projets\onepilot && git status && git add src/components/hr/HrReferenceUi.tsx src/components/projects/ProjectReferenceUi.tsx src/components/projects/ProjectPertBoard.tsx src/components/projects/ProjectWbsBoard.tsx src/components/projects/ProjectTaskEditDrawer.tsx src/components/projects/ProjectGanttBoard.tsx src/components/projects/ProjectTimelineBoard.tsx src/components/projects/ProjectSpecializedUi.tsx src/components/projects/ProjectManagementPage.tsx src/components/projects/ProjectAnalyticsPanel.tsx src/components/projects/ProjectDetailPage.tsx supabase/migrations/202607060026_project_pmo_v4_portfolio_sync_planning.sql README_INSTALLATION_PROJECTS_V4.md && git commit -m "Finalise le pilotage métier du module Projets" && git push
```

## Contrôles fonctionnels recommandés

- `/onepilot/projects`
- `/onepilot/projects/timeline`
- `/onepilot/projects/gantt`
- `/onepilot/projects/actions`
- `/onepilot/projects/performance`
- ouverture d’un projet depuis le Portefeuille

