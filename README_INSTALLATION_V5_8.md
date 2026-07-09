# ONEPILOT RH V5.8

Pack construit depuis `onepilot-rh-current.zip` fourni par l’utilisateur.

## Ordre d’installation

1. Copier les fichiers en respectant les chemins.
2. Lancer `supabase db push`.
3. Lancer `npm run build`.
4. Tester Ressources et Absences avant commit.

## Commandes

```cmd
cd /d C:\projets\onepilot
supabase db push
npm run build
```

Si OK :

```cmd
cd /d C:\projets\onepilot
git status
git add .
git commit -m "fix rh absences resources and prepare next modules v5.8"
git push
```
