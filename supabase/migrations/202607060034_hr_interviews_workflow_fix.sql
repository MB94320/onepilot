-- ONEPILOT V14.1 — Entretiens RH annuels, reprise et validations.
-- Une ressource ne possède qu'un entretien actif par année et par organisation.

alter table if exists public.hr_review_items
  add column if not exists review_year integer,
  add column if not exists interview_date date,
  add column if not exists employee_validated_at timestamptz,
  add column if not exists sent_to_manager_at timestamptz,
  add column if not exists manager_validated_at timestamptz,
  add column if not exists hr_validated_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table if exists public.hr_review_items
  drop constraint if exists hr_review_items_status_check;

update public.hr_review_items as review
set review_year = coalesce(
  review.review_year,
  extract(year from cycle.period_start)::integer,
  extract(year from review.created_at)::integer,
  extract(year from current_date)::integer
)
from public.hr_review_cycles as cycle
where cycle.id = review.cycle_id
  and review.review_year is null;

update public.hr_review_items
set review_year = coalesce(
  review_year,
  extract(year from created_at)::integer,
  extract(year from current_date)::integer
)
where review_year is null;

update public.hr_review_items
set status = case status
  when 'not_started' then 'in_progress'
  when 'employee_input' then 'in_progress'
  when 'manager_input' then 'sent_to_manager'
  when 'calibration' then 'manager_approved'
  when 'draft' then 'in_progress'
  else status
end;

-- Les anciens jeux de démonstration pouvaient créer plusieurs lignes pour la même
-- ressource et la même année. La plus récente reste active, les autres sont archivées.
with ranked_reviews as (
  select
    id,
    row_number() over (
      partition by organization_id, employee_id, review_year
      order by
        case status when 'completed' then 5 when 'hr_provisional' then 4 when 'manager_approved' then 3 when 'sent_to_manager' then 2 else 1 end desc,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as row_rank
  from public.hr_review_items
  where archived_at is null
)
update public.hr_review_items as review
set status = 'archived', archived_at = coalesce(review.archived_at, now()), updated_at = now()
from ranked_reviews as ranked
where ranked.id = review.id
  and ranked.row_rank > 1;

alter table if exists public.hr_review_items
  alter column review_year set default extract(year from current_date)::integer,
  alter column review_year set not null;

alter table if exists public.hr_review_items
  add constraint hr_review_items_status_check
  check (status in (
    'in_progress',
    'sent_to_manager',
    'manager_approved',
    'hr_provisional',
    'completed',
    'archived'
  ));

alter table if exists public.hr_review_items
  drop constraint if exists hr_review_items_review_year_check;

alter table if exists public.hr_review_items
  add constraint hr_review_items_review_year_check
  check (review_year between 2000 and 2200);

create unique index if not exists ux_hr_review_items_active_employee_year
  on public.hr_review_items (organization_id, employee_id, review_year)
  where archived_at is null;

create index if not exists idx_hr_review_items_org_year_status
  on public.hr_review_items (organization_id, review_year, status)
  where archived_at is null;

comment on column public.hr_review_items.review_year is
  'Année métier de l’entretien. Une seule fiche active est autorisée par ressource et par année.';

-- Harmonisation du chapitre compétences partagé par RH, staffing et Projets.
update public.hr_skill_catalog
set family = 'Projets / PMO', updated_at = now()
where lower(trim(coalesce(family, ''))) in (
  'projet / pmo',
  'projet & pmo',
  'projets & pmo',
  'projets/pmo',
  'projet/pmo'
);
