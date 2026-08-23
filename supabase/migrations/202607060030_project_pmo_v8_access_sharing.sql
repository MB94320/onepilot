create extension if not exists pgcrypto;

create table if not exists public.project_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.project_projects(id) on delete cascade,
  employee_id uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  external_name text null,
  external_email text null,
  access_level text not null default 'view' check (access_level in ('view', 'edit', 'admin')),
  scopes text[] not null default array['cockpit','planning','team','quality','finance']::text[],
  granted_by uuid null references auth.users(id) on delete set null default auth.uid(),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint project_access_grants_identity_check check (employee_id is not null or user_id is not null or external_email is not null)
);

create unique index if not exists project_access_grants_employee_uq on public.project_access_grants(organization_id, project_id, employee_id) where employee_id is not null;
create unique index if not exists project_access_grants_user_uq on public.project_access_grants(organization_id, project_id, user_id) where user_id is not null;
create unique index if not exists project_access_grants_email_uq on public.project_access_grants(organization_id, project_id, lower(external_email)) where external_email is not null;
create index if not exists project_access_grants_project_idx on public.project_access_grants(project_id, access_level) where archived_at is null;

alter table public.project_access_grants enable row level security;
drop policy if exists project_access_grants_tenant_select on public.project_access_grants;
drop policy if exists project_access_grants_tenant_insert on public.project_access_grants;
drop policy if exists project_access_grants_tenant_update on public.project_access_grants;
drop policy if exists project_access_grants_tenant_delete on public.project_access_grants;
create policy project_access_grants_tenant_select on public.project_access_grants for select to authenticated using (public.is_organization_member(organization_id));
create policy project_access_grants_tenant_insert on public.project_access_grants for insert to authenticated with check (public.is_organization_member(organization_id));
create policy project_access_grants_tenant_update on public.project_access_grants for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy project_access_grants_tenant_delete on public.project_access_grants for delete to authenticated using (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.project_access_grants to authenticated;

drop trigger if exists set_project_access_grants_updated_at on public.project_access_grants;
create trigger set_project_access_grants_updated_at before update on public.project_access_grants for each row execute function public.set_updated_at();

comment on table public.project_access_grants is 'Droits explicites de lecture, modification ou administration sur un projet, utilisables avec ou sans module RH.';
