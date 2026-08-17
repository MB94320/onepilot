# ONEPILOT — Module Projets V7.1 corrective

Ce lot conserve le formalisme validé des pages RH et complète les cinq sous-modules Projets.

## Principales évolutions

- correction de la source Supabase des données financières et de la période des graphiques ;
- courbe en S et graphique coûts / production / marge alimentés par les périodes financières réelles ;
- plan de charge aligné sur les couleurs et les indicateurs de Staffing & capacité ;
- tableaux projet homogénéisés avec export, copie et agrandissement sur la ligne de titre ;
- Gantt par projet avec vues Jours, Semaines, Mois, Trimestres et Années ;
- distinction entre planning normal et planning avec chemin critique ;
- Timeline décisionnelle triée selon la date de fin, avec légende, copie et agrandissement ;
- PERT réorganisé par projet avec synthèse, séquence critique, recommandation et réseau ;
- chaîne de conformité projet sous forme de flèche d’audit ;
- statuts, priorités, stratégies, preuves et efficacités traduits et colorés ;
- référentiel unique RH / Projets de 829 compétences, 16 chapitres et 69 sous-chapitres ;
- listes de compétences en cascade avec codes chapitre, sous-chapitre et compétence ;
- comparaison nominative entre niveau réel de la ressource et niveau requis par le projet ;
- filtres du radar par ressource, chapitre, sous-chapitre, niveau et importance.
- correction de l’avertissement Recharts sur les dimensions négatives des graphiques ;
- WBS séparé par projet, avec export, copie et agrandissement propres à chaque organigramme ;
- flèche d’audit reconstruite : les blocs forment la chaîne de l’AVV jusqu’au Delivery ;
- copie des tableaux et schémas avec téléchargement PNG automatique lorsque le navigateur refuse le presse-papiers.

## Migration

La migration `202607060029_project_pmo_v7_skill_referential.sql` ajoute les colonnes de classement et charge la bibliothèque de compétences v2 fournie. Elle synchronise désormais chaque identifiant avec la table historique `hr_skills` avant d’alimenter `hr_employee_skills`. Cette correction traite précisément l’erreur `hr_employee_skills_skill_id_fkey` rencontrée lors du premier essai V29.

La V29 ayant échoué, elle n’a pas été enregistrée par Supabase. Il faut remplacer le fichier V29 précédent par celui de ce paquet et relancer la même commande ; il ne faut pas créer une migration supplémentaire.

La migration V27 est également incluse dans le paquet, car elle a déjà été appliquée à distance mais n’avait pas été ajoutée au commit Git précédent.

## Installation CMD

```cmd
cd /d C:\projets\onepilot && npx supabase db push
```

Puis :

```cmd
cd /d C:\projets\onepilot && if exist .next rmdir /s /q .next && npm run build
```

Ne lancer le commit que si la migration et le build sont terminés sans erreur.
