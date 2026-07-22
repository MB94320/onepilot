# ONEPILOT — Installation du module Projets V2

Cette livraison complète les cinq sous-modules Projets sans modifier les pages RH validées :

- Portefeuille projets ;
- Timeline globale ;
- Planification & Gantt ;
- Actions projet ;
- Performance projets ;
- cockpit détaillé d’un projet.

## Installation

Décompresser le zip directement dans :

```text
C:\projets\onepilot
```

La migration `202607060025_project_pmo_v3_business_rules.sql` est nouvelle. Les migrations `023` et `024` déjà appliquées ne sont pas modifiées.

## 1. Base Supabase

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

Répondre `Y` lorsque Supabase propose la migration `202607060025_project_pmo_v3_business_rules.sql`.

En cas d’erreur SQL, arrêter la procédure et transmettre les lignes `ERROR:` et `At statement:`. Ne pas lancer le build tant que la migration n’est pas terminée.

## 2. Build obligatoire

```cmd
cd /d C:\projets\onepilot && npm run build
```

## 3. Commit et push si SQL et build sont corrects

```cmd
cd /d C:\projets\onepilot && git status && git add src/components/projects/ProjectManagementPage.tsx src/components/projects/ProjectAnalyticsPanel.tsx src/components/projects/ProjectDetailPage.tsx src/components/projects/ProjectSpecializedUi.tsx supabase/migrations/202607060025_project_pmo_v3_business_rules.sql README_INSTALLATION_PROJECTS_V2.md && git commit -m "Enrichit les cinq sous-modules Projets V2" && git push
```

## Contrôles fonctionnels prioritaires

- `/onepilot/projects`
- `/onepilot/projects/timeline`
- `/onepilot/projects/gantt`
- `/onepilot/projects/actions`
- `/onepilot/projects/performance`
- ouverture d’un projet depuis le portefeuille ;
- création d’une action générique avec projet `NA` ;
- création multi-lignes de tâches ;
- saisie mensuelle de satisfaction client ;
- exports en français ;
- isolation des données entre organisations.
