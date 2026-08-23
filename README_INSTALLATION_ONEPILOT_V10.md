# ONEPILOT — installation du lot V10

Cette archive doit être décompressée directement dans :

```text
C:\projets\onepilot
```

Elle contient uniquement les fichiers nécessaires, avec leur arborescence complète. La page canonique du portefeuille projets est également incluse afin de remplacer une éventuelle mauvaise copie locale.

## 1. Appliquer la migration Supabase

Dans **Invite de commandes / CMD** :

```cmd
cd /d C:\projets\onepilot
npx supabase db push
```

La migration proposée doit être :

```text
202607060032_platform_access_sharing.sql
```

Répondre `Y`. En cas d’erreur SQL, arrêter ici et corriger la migration avant de lancer le build.

## 2. Nettoyer le cache et construire l’application

```cmd
cd /d C:\projets\onepilot
if exist .next rmdir /s /q .next
npm run build
```

## 3. Vérifier puis publier uniquement si le build est réussi

```cmd
cd /d C:\projets\onepilot
git status
git add "src\app\globals.css" "src\app\[orgId]\(protected)\projects\page.tsx" "src\app\[orgId]\(protected)\commerce\previsions\page.tsx" "src\app\[orgId]\(protected)\pilotage\acces-partage\page.tsx" "src\components\access\PlatformAccessPage.tsx" "src\components\commerce\CommercialForecastPage.tsx" "src\components\hr\HrEmployeeSkillsForm.tsx" "src\components\hr\HrReferenceUi.tsx" "src\components\hr\HrTalentModulePage.tsx" "src\components\layout\Sidebar.tsx" "src\components\projects\ProjectAuditArrow.tsx" "src\components\projects\ProjectDetailPage.tsx" "src\components\projects\ProjectManagementPage.tsx" "src\components\projects\ProjectPertBoard.tsx" "src\components\projects\ProjectPertGroup.tsx" "src\components\projects\ProjectSkillRequirementsForm.tsx" "src\components\projects\ProjectVisualActions.tsx" "src\config\navigation.ts" "supabase\migrations\202607060032_platform_access_sharing.sql" "README_INSTALLATION_ONEPILOT_V10.md"
git commit -m "Homogénéise les modules et centralise les accès"
git push
```

## Pages à contrôler après installation

```text
http://localhost:3000/onepilot/rh/competences
http://localhost:3000/onepilot/projects
http://localhost:3000/onepilot/projects/gantt
http://localhost:3000/onepilot/commerce/previsions
http://localhost:3000/onepilot/pilotage/acces-partage
```
