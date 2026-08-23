# ONEPILOT V9 — homogénéisation RH, Projets, Commerce et Administration

Cette livraison est un paquet différentiel prêt à décompresser à la racine de `C:\projets\onepilot`.

## Contenu principal

- référentiel transversal des tableaux, en-têtes, cellules, colonnes figées et plein écran blanc ;
- copie visuelle PNG des tableaux et diagrammes, avec téléchargement PNG de secours si le navigateur bloque le presse-papiers ;
- statuts métier traduits en français et couleurs homogènes ;
- filtres de tableaux Projet et réinitialisation contextuelle des périmètres Commerce ;
- nouveau parcours RH Compétences par ressource, chapitre et sous-chapitre ;
- attendus explicites des niveaux 0 à 4, niveau initial historisé, niveau actuel et évolution ;
- bibliothèque Compétences filtrable, sans références techniques affichées, avec menu Actions fonctionnel ;
- matrice des risques et légendes alignées sur Négligeable, Significatif, Critique et Inacceptable ;
- chaîne de conformité AVV / DELIVERY regroupée et encadrée ;
- guides métier ajoutés ou enrichis pour RH, Projets, Commerce et Administration ;
- navigation par grands modules conservée et francisée.

## Commandes CMD obligatoires

```cmd
cd /d C:\projets\onepilot
npx supabase db push
```

La migration proposée doit être :

```text
202607060031_hr_project_v9_skill_history.sql
```

Après réussite SQL :

```cmd
cd /d C:\projets\onepilot
if exist .next rmdir /s /q .next
npm run build
```

Si le build est correct :

```cmd
cd /d C:\projets\onepilot
git status
git add "src\app\globals.css" "src\app\[orgId]\(protected)\admin\page.tsx" "src\app\[orgId]\(protected)\avant-vente\page.tsx" "src\app\[orgId]\(protected)\clients\page.tsx" "src\app\[orgId]\(protected)\commandes\page.tsx" "src\app\[orgId]\(protected)\prospects\page.tsx" "src\components\hr\HrEmployeeSkillsForm.tsx" "src\components\hr\HrReferenceUi.tsx" "src\components\hr\HrTalentModulePage.tsx" "src\components\layout\Sidebar.tsx" "src\components\projects\ProjectAnalyticsPanel.tsx" "src\components\projects\ProjectAuditArrow.tsx" "src\components\projects\ProjectDetailPage.tsx" "src\components\projects\ProjectReferenceUi.tsx" "src\components\projects\ProjectVisualActions.tsx" "supabase\migrations\202607060031_hr_project_v9_skill_history.sql" "README_INSTALLATION_ONEPILOT_V9.md"
git commit -m "Homogénéise les modules RH Projets Commerce et Administration"
git push
```

## Contrôles réalisés avant livraison

- contrôle TypeScript sans émission : OK ;
- build Next.js complet en mode Webpack : OK ;
- routes RH, Projets, Commerce et Administration générées : OK ;
- contenu et extraction du ZIP vérifiés par empreintes SHA-256.
