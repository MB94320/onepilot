# ONEPILOT V14 — correctif Supabase et consolidation métier

Cette livraison corrige le blocage de la migration V13 et consolide les pages réellement installées sans supprimer les cockpits détaillés Projets.

## Correctifs bloquants

- La migration ne filtre plus `hr_employees` sur une colonne `archived_at` inexistante.
- Administration utilise `hr_audit_logs.performed_at` et les colonnes réellement présentes.
- La matrice des risques, la timeline, les Gantt et la chaîne d’audit disposent d’une copie PNG dédiée.
- La chaîne de conformité est une flèche continue, segmentée entre AVV et Delivery.

## Commerce

- Architecture homogène Pilotage / Analyses / Alertes.
- Cartes, tableau et pipeline Kanban selon le sous-module.
- Chronos `OPP-AAAA-0001`, Go/No-Go, prix de vente, coûts, marge, CA pondéré et prochaine action.
- Filtres globaux et filtres de colonnes, exports, agrandissement, copie et menus d’actions homogènes.
- Les fiches détaillées Avant-vente et Commandes existantes restent les points d’accès aux check-lists, lots et revues détaillées.

## Commandes CMD à exécuter

Depuis l’invite de commandes Windows :

```cmd
cd /d C:\Users\moham\Downloads
tar -xf ONEPILOT_V14_CORRECTIF_METIER_2026-08-24.zip -C C:\projets\onepilot
cd /d C:\projets\onepilot
npx supabase db push
if exist .next rmdir /s /q .next
npm run build
```

Le message demandant `[Y/n]` attend uniquement la touche `Y` puis Entrée. Il ne faut pas saisir la lettre `n` comme une commande séparée.

## Contrôle réalisé avant livraison

- TypeScript : validé.
- Build Next.js 16.2.7 : validé.
- Routes Commerce, Pilotage, Administration, Projets, RH, Qualité, Finance et Documents : générées.
