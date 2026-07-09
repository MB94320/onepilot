# Hotfix V5.8.2

Correction du build TypeScript sur les 4 pages RH préparatoires.

Erreur corrigée : `created_at` utilisé dans le tableau mais absent du type local `rows`.

Fichiers remplacés :

- `src/app/[orgId]/(protected)/rh/competences/page.tsx`
- `src/app/[orgId]/(protected)/rh/entretiens-objectifs/page.tsx`
- `src/app/[orgId]/(protected)/rh/onboarding/page.tsx`
- `src/app/[orgId]/(protected)/rh/temps-activites/page.tsx`

Après extraction à la racine du projet :

```cmd
cd /d C:\projets\onepilot
npm run build
```
