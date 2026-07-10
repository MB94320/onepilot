# ONEPILOT RH — Correctif V5.9

## Ordre d'installation

1. Copier tout le contenu de ce dossier dans `C:\projets\onepilot`.
2. Remplacer les fichiers existants quand Windows le demande.
3. Lancer :

```cmd
cd /d C:\projets\onepilot
supabase db push
npm run build
```

Si `supabase db push` renvoie une erreur SQL, arrêter et corriger SQL avant le build.

## Corrections incluses

- Persistance des champs libres site / service / métier / fonction en modification ressource.
- Persistance vérifiée du rythme hebdomadaire détaillé après création et modification.
- Référentiels RH de base ajoutés par organisation pour afficher des listes dans les formulaires.
- Correction des colonnes manquantes dans les tables RH préparées, notamment `hr_employee_skills.status`.
- Routes alias pour éviter les 404 courants : `temps-et-activites`, `temps`, `activites`, `entretiens`, `objectifs`, `entretiens-et-objectifs`.
- Nouvelles pages RH remises au formalisme validé : guide, widgets, filtres 4 par ligne, onglets couleur, toggle cartes/tableau, tableaux sticky.
- Copie graphique Absences remise en `image/svg+xml` comme la page Staffing/Charge validée.
- Export Absences enrichi avec ID demande, email, code absence, jours ouvrés, dates création/mise à jour.
- Addendums PRD/SFS RH UI livrés pour figer les règles de formalisme.

## Après build OK

```cmd
cd /d C:\projets\onepilot
git status
git add .
git commit -m "fix rh persistence references modules v5.9"
git push
```
