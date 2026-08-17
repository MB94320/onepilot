# ONEPILOT — Module Projets V6

Ce paquet complète la V5 déjà installée. Il conserve les pages RH validées et modifie uniquement les composants communs nécessaires au formalisme Projet, les cinq sous-modules Projet et la nouvelle migration d’audit/analyses.

## 1. Installation

Décompresser le zip directement dans :

```text
C:\projets\onepilot
```

Accepter le remplacement des fichiers présents.

## 2. Migration Supabase

La migration V27 étant déjà appliquée, Supabase doit proposer uniquement :

```text
202607060028_project_pmo_v6_audit_quality_analytics.sql
```

Commande CMD :

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

Répondre `Y`. Si SQL échoue, ne pas lancer le build et transmettre le message complet.

La migration crée un référentiel multi-tenant d’audit projet, 18 thèmes, 152 contrôles issus de `AUDIT.xlsx`, les audits/réponses de démonstration et les périodes financières, satisfaction et livrables nécessaires aux graphiques annuels.

## 3. Nettoyage du cache Next.js et build

L’erreur dans `.next/dev/types/validator.ts` vient d’un fichier généré corrompu. Ne pas modifier ce fichier manuellement. Supprimer uniquement le cache `.next`, puis reconstruire :

```cmd
cd /d C:\projets\onepilot && if exist .next rmdir /s /q .next && npm run build
```

L’avertissement concernant `middleware` n’empêche pas le build.

## 4. Commit et push si le build est OK

```cmd
cd /d C:\projets\onepilot && git status && git add "src\components\hr\HrReferenceUi.tsx" "src\components\projects\ProjectAnalyticsPanel.tsx" "src\components\projects\ProjectDetailPage.tsx" "src\components\projects\ProjectGanttBoard.tsx" "src\components\projects\ProjectManagementPage.tsx" "src\components\projects\ProjectPertBoard.tsx" "src\components\projects\ProjectReferenceUi.tsx" "src\components\projects\ProjectTimelineBoard.tsx" "src\components\projects\ProjectVisualActions.tsx" "supabase\migrations\202607060028_project_pmo_v6_audit_quality_analytics.sql" "README_INSTALLATION_PROJECTS_V6.md" && git commit -m "Finalise les analyses et audits du module Projets" && git push
```

Ne pas ajouter le fichier temporaire `supabase/.temp/cli-latest` au commit.

## 5. Contrôles principaux

- Portefeuille : un seul bloc Analyses, radar aligné sur les six axes du tableau de santé, courbe en S, coûts/production/marge, plan de charge et tableau de santé en fin de page.
- Détail projet : tableaux décisions et jalons en pleine largeur, tableau santé exportable/copier/agrandir, Gantt avec vue chemin critique, compétences classées et audit qualité exhaustif.
- Timeline : ordre par date de fin, jalons alignés sur la flèche, risques/NC/actions, copie et plein écran réductible.
- Planification : un cadre Gantt et un réseau PERT par projet, copie/agrandissement/réduction conservés en plein écran.
- Statuts : ouvert sky, en cours/attente amber, clos emerald, bloqué rose, annulé gris.
