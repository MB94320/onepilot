# Hotfix V5.8.1

Corrige le build Next.js en supprimant la prop `icon` transmise à `PageHeader` dans les 4 nouvelles pages RH.

Fichiers à remplacer :

- `src/app/[orgId]/(protected)/rh/competences/page.tsx`
- `src/app/[orgId]/(protected)/rh/entretiens-objectifs/page.tsx`
- `src/app/[orgId]/(protected)/rh/onboarding/page.tsx`
- `src/app/[orgId]/(protected)/rh/temps-activites/page.tsx`

Puis lancer :

```cmd
cd /d C:\projets\onepilot
npm run build
```

Si build OK :

```cmd
cd /d C:\projets\onepilot
git rm --cached onepilot-rh-current.zip
del onepilot-rh-current.zip
git add .
git commit -m "fix page header props in rh module pages v5.8.1"
git push
```
