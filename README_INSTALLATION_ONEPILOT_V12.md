# ONEPILOT V12 — restauration métier et consolidation transverse

Cette livraison restaure les pages métier riches qui avaient été remplacées par des pages génériques et conserve les correctifs d’homogénéisation précédents.

## Contenu principal

- restauration du Portefeuille projets et de sa fiche détaillée : Cockpit, Planning & WBS, Équipe & compétences, Qualité, Finance & performance ;
- restauration des pages Commerce riches : Clients, Prospects, Avant-vente, Go/No-Go, Commandes et tableau de bord ;
- correction de l’administration multi-tenant : rattachement des profils via `organization_members` ;
- correction de la page Pilotage / Accès & partage : suppression du filtre sur une colonne absente de la vue RH ;
- Administration plateforme replacée comme accès indépendant réservé au super-administrateur ;
- modules Qualité & risques enrichis : registres, formulaires, colonnes métier, matrices, indicateurs, analyses, alertes et exports ;
- modules Finance enrichis : VP, VA, CR, production, facturation, encaissement, marge, encours, courbe en S et analyses mensuelles ;
- bibliothèque Documents & outils réalimentée depuis les fiches techniques, Go/No-Go, revues de commande, livrables et audits ;
- correction des copies visuelles du Gantt, de la Timeline, du PERT et de la chaîne d’audit : génération PNG au lieu d’un cadre vide ;
- conservation des tableaux, filtres, menus d’actions, formulaires et agrandissements communs aux modules RH, Projets, Commerce, Pilotage, Qualité, Finance et Administration.

## Base de données

Cette livraison ne contient aucune nouvelle migration Supabase. Il ne faut donc pas exécuter `npx supabase db push` pour cette version.

## Commandes CMD

Après décompression du ZIP dans `C:\projets\onepilot` :

```cmd
cd /d C:\projets\onepilot
if exist .next rmdir /s /q .next
npm run build
git status
git add src README_INSTALLATION_ONEPILOT_V12.md
git commit -m "Restaure et consolide les modules métiers ONEPILOT"
git push
```

Le message Next.js concernant la convention `middleware` dépréciée reste un avertissement et ne bloque pas la compilation.

## Validation réalisée

- compilation Next.js avec Webpack : réussie ;
- contrôle TypeScript : réussi ;
- ensemble des routes Projets, Commerce, Pilotage, Qualité, Finance, Documents, RH et Administration : généré ;
- contrôle navigateur local tenté : la session de test isolée a été redirigée vers la connexion, sans erreur console ; la session authentifiée de l’utilisateur reste nécessaire pour le contrôle visuel des données réelles.
