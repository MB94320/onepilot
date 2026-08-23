-- ONEPILOT V9 — historisation du niveau initial des compétences.
alter table if exists public.hr_employee_skills
  add column if not exists initial_level integer;

update public.hr_employee_skills
set initial_level = greatest(0, least(4, coalesce(current_level, level, 0)))
where initial_level is null;

alter table if exists public.hr_employee_skills
  drop constraint if exists hr_employee_skills_initial_level_check;

alter table if exists public.hr_employee_skills
  add constraint hr_employee_skills_initial_level_check
  check (initial_level between 0 and 4);

comment on column public.hr_employee_skills.initial_level is
  'Niveau constaté à la première évaluation, conservé pour mesurer l évolution de la ressource.';
