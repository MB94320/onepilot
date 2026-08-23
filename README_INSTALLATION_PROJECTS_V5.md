# ONEPILOT — Module Projets V5

Cette livraison corrige et enrichit les cinq sous-modules Projets sans modifier le formalisme validé des pages RH Ressources.

## Correctifs principaux

- correction de l’erreur d’hydratation provoquée par un composant complexe placé dans un paragraphe ;
- fermeture automatique des menus d’actions lors d’un clic hors du menu ou avec la touche Échap ;
- homogénéisation des tableaux, cartes, onglets, boutons, formulaires et alertes avec la page Ressources ;
- consolidation de l’onglet Analyses du portefeuille : huit indicateurs, graphiques organisés par thème et tableau de santé exploitable ;
- copie fidèle des donuts, radars, histogrammes et matrices, avec affichage des valeurs ;
- matrice des risques 4 × 4 compacte affichant le nombre de risques par cellule ;
- timeline décisionnelle sous forme de trajectoire portefeuille, distincte du Gantt ;
- WBS hiérarchique Projet → Lots/Livrables → Tâches avec vue tableau complémentaire ;
- Gantt et PERT copiables et agrandissables, avec conventions de couleurs métier ;
- formulaire des besoins en compétences projet relié à la bibliothèque RH, avec saisie autonome possible ;
- indicateurs Actions centrés sur le stock, les actions ouvertes, les retards et les priorités hautes ;
- formulaire Actions enrichi avec les informations de clôture et d’efficacité ;
- Performance enrichie avec le TACE par ressource et des valeurs réconciliées ;
- chronos projets, opportunités et risques homogénéisés ;
- données Supabase réelles et multi-tenant pour courbes en S, satisfaction, livrables, OTD/OQD/DoD, finance et risques.

## Installation

Décompresser le zip dans `C:\projets\onepilot` en conservant l’arborescence et en remplaçant les fichiers proposés.

La livraison contient une nouvelle migration :

`supabase\migrations\202607060027_project_pmo_v5_analytics_consistency.sql`

Appliquer d’abord la migration :

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

Répondre `Y` si Supabase demande une confirmation. En cas d’erreur SQL, arrêter et transmettre le message complet avant de lancer le build.

Si la migration est correcte, lancer :

```cmd
cd /d C:\projets\onepilot && npm run build
```

## Vérification et publication

Si le build est correct :

```cmd
cd /d C:\projets\onepilot && git status && git add . && git commit -m "Améliore le pilotage et les analyses du module Projets" && git push
```

## Contrôles réalisés avant livraison

- `npx tsc --noEmit` : correct ;
- `npm run build -- --webpack` : correct avec Next.js 16.2.7 ;
- routes Projets générées : portefeuille, détail projet, actions, Gantt, performance et timeline.

L’avertissement Next.js relatif à l’ancienne convention `middleware` est non bloquant et indépendant de cette livraison.
