# ONEPILOT V15 — installation et contrôle

Ce lot est cumulatif par rapport au dépôt actuellement présent dans `C:\projets\onepilot`.

## Contenu fonctionnel

- RH : entretiens annuels réouvrables, workflow manager/RH, objectifs, cartes et graphiques ; compétences harmonisées.
- Qualité : audits AVV sur quatre revues, audits Delivery de Gestion des exigences à PMP, check-list pondérée, actions synchronisées, livrables/OQD et analyses NC/risques.
- Commerce : données reliées aux projets et commandes, Kanban, carte France AVV, Go/No-Go, fiche technique, revue et synthèse de commande.
- Pilotage : tableau de bord exécutif multi-modules, rapports, objectifs et trajectoires.
- Administration : compatibilité avec les schémas historiques de journalisation.
- Finance : synthèse sans formulaire, valorisation, facturation, trésorerie, recouvrement et notes de frais multi-lignes.
- Documents & outils : bibliothèque réelle, modèles téléchargeables, processus et catalogue d’assistants IA gouvernés.

## Commandes CMD après extraction dans le dépôt

```cmd
cd /d C:\projets\onepilot
npx supabase db push
if exist .next rmdir /s /q .next
npm run build
```

Les migrations attendues sont `202607060034` à `202607060037`. Les messages `NOTICE ... does not exist, skipping` ou `already exists, skipping` sont normaux pour les opérations idempotentes.

## Contrôle réalisé avant livraison

- TypeScript : succès (`npx tsc --noEmit`).
- Build Next.js 16.2.7 complet : succès avec webpack et les variables de l’environnement local du dépôt.
- Fichiers XLSX : inspection des formules et rendu visuel vérifiés.
- Procédure PDF : cinq pages rendues et contrôlées.

L’avertissement Next.js concernant le remplacement futur de `middleware` par `proxy` reste non bloquant.
