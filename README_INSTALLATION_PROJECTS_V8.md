# ONEPILOT — Module Projets V8

Ce paquet doit être extrait à la racine de `C:\projets\onepilot` en conservant l’arborescence.

## Contenu principal

- référentiel visuel commun des tableaux Projets aligné sur les pages RH validées ;
- copie d’image sécurisée avec téléchargement PNG de secours sur localhost/HTTP ;
- plein écran clair avec boutons Copier et Réduire conservés ;
- Gantt multi-projets unique et commandes temporelles sur une deuxième ligne ;
- PERT repliable par projet ;
- chaîne d’audit AVV–Delivery compacte et continue ;
- matrice des risques 4 × 4 en français et registre avec criticité/impact valorisé/statut d’action ;
- formulaire exhaustif des compétences RH par ressource ;
- besoins projet sans références affichées, triés alphabétiquement et niveaux 0 à 4 ;
- comparaison des besoins projet avec les niveaux réels RH ;
- droits d’accès projet en lecture, modification ou administration, par sous-page et avec mode autonome sans RH ;
- libellé « Nouvelle action » ;
- abscisses mensuelles allégées en vue normale et exhaustives en plein écran.

## Commandes CMD

Appliquer d’abord la migration :

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

La migration attendue est :

```text
202607060030_project_pmo_v8_access_sharing.sql
```

Si la migration est terminée, nettoyer puis construire :

```cmd
cd /d C:\projets\onepilot && if exist .next rmdir /s /q .next && npm run build
```

Si le build est correct :

```cmd
cd /d C:\projets\onepilot && git status
git add src\app\globals.css src\components\hr\HrReferenceUi.tsx src\components\hr\HrTalentModulePage.tsx src\components\hr\HrEmployeeSkillsForm.tsx src\components\projects\ProjectAccessPanel.tsx src\components\projects\ProjectAnalyticsPanel.tsx src\components\projects\ProjectAuditArrow.tsx src\components\projects\ProjectDetailPage.tsx src\components\projects\ProjectGanttBoard.tsx src\components\projects\ProjectManagementPage.tsx src\components\projects\ProjectPertGroup.tsx src\components\projects\ProjectSkillRequirementsForm.tsx src\components\projects\ProjectVisualActions.tsx supabase\migrations\202607060030_project_pmo_v8_access_sharing.sql README_INSTALLATION_PROJECTS_V8.md
git commit -m "Homogénéise le module Projets et ajoute les accès partagés"
git push
```

Ne pas lancer le commit ni le push si la migration ou le build échoue.
