-- Lecture des tables Projet / Staffing côté application.
-- Objectif : permettre à la page RH / Staffing & capacité de lire les données project_*.
-- À remplacer plus tard par des policies par rôle/périmètre manager/RH si le modèle de droits est enrichi.

alter table if exists public.project_clients enable row level security;
alter table if exists public.project_projects enable row level security;
alter table if exists public.project_staffing_needs enable row level security;
alter table if exists public.project_staffing_assignments enable row level security;
alter table if exists public.project_time_entries enable row level security;

alter table if exists public.project_portfolios enable row level security;
alter table if exists public.project_work_packages enable row level security;
alter table if exists public.project_tasks enable row level security;
alter table if exists public.project_staffing_need_skills enable row level security;
alter table if exists public.hr_skill_domains enable row level security;
alter table if exists public.hr_skills enable row level security;
alter table if exists public.hr_employee_skills enable row level security;

grant select on public.project_clients to authenticated;
grant select on public.project_projects to authenticated;
grant select on public.project_staffing_needs to authenticated;
grant select on public.project_staffing_assignments to authenticated;
grant select on public.project_time_entries to authenticated;

grant select on public.project_portfolios to authenticated;
grant select on public.project_work_packages to authenticated;
grant select on public.project_tasks to authenticated;
grant select on public.project_staffing_need_skills to authenticated;
grant select on public.hr_skill_domains to authenticated;
grant select on public.hr_skills to authenticated;
grant select on public.hr_employee_skills to authenticated;

grant select on public.project_staffing_project_overview to authenticated;
grant select on public.project_staffing_employee_overview to authenticated;
grant select on public.project_staffing_skill_match_overview to authenticated;

drop policy if exists project_clients_select_authenticated on public.project_clients;
create policy project_clients_select_authenticated
on public.project_clients
for select
to authenticated
using (true);

drop policy if exists project_projects_select_authenticated on public.project_projects;
create policy project_projects_select_authenticated
on public.project_projects
for select
to authenticated
using (true);

drop policy if exists project_staffing_needs_select_authenticated on public.project_staffing_needs;
create policy project_staffing_needs_select_authenticated
on public.project_staffing_needs
for select
to authenticated
using (true);

drop policy if exists project_staffing_assignments_select_authenticated on public.project_staffing_assignments;
create policy project_staffing_assignments_select_authenticated
on public.project_staffing_assignments
for select
to authenticated
using (true);

drop policy if exists project_time_entries_select_authenticated on public.project_time_entries;
create policy project_time_entries_select_authenticated
on public.project_time_entries
for select
to authenticated
using (true);

drop policy if exists project_portfolios_select_authenticated on public.project_portfolios;
create policy project_portfolios_select_authenticated
on public.project_portfolios
for select
to authenticated
using (true);

drop policy if exists project_work_packages_select_authenticated on public.project_work_packages;
create policy project_work_packages_select_authenticated
on public.project_work_packages
for select
to authenticated
using (true);

drop policy if exists project_tasks_select_authenticated on public.project_tasks;
create policy project_tasks_select_authenticated
on public.project_tasks
for select
to authenticated
using (true);

drop policy if exists project_staffing_need_skills_select_authenticated on public.project_staffing_need_skills;
create policy project_staffing_need_skills_select_authenticated
on public.project_staffing_need_skills
for select
to authenticated
using (true);

drop policy if exists hr_skill_domains_select_authenticated on public.hr_skill_domains;
create policy hr_skill_domains_select_authenticated
on public.hr_skill_domains
for select
to authenticated
using (true);

drop policy if exists hr_skills_select_authenticated on public.hr_skills;
create policy hr_skills_select_authenticated
on public.hr_skills
for select
to authenticated
using (true);

drop policy if exists hr_employee_skills_select_authenticated on public.hr_employee_skills;
create policy hr_employee_skills_select_authenticated
on public.hr_employee_skills
for select
to authenticated
using (true);
