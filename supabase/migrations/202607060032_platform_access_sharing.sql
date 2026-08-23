create extension if not exists pgcrypto;

create table if not exists public.platform_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid null,
  user_id uuid null references auth.users(id) on delete set null,
  external_name text null,
  external_email text null,
  module_key text not null check (module_key in ('pilotage','commerce','projects','hr','quality','finance','workspace')),
  submodule_keys text[] not null default '{}'::text[],
  access_level text not null default 'view' check (access_level in ('view','edit','admin')),
  can_export boolean not null default false,
  can_share boolean not null default false,
  status text not null default 'active' check (status in ('active','suspended')),
  granted_by uuid null references auth.users(id) on delete set null default auth.uid(),
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  constraint platform_access_grants_identity_check check (
    employee_id is not null or user_id is not null or nullif(trim(external_email), '') is not null
  ),
  constraint platform_access_grants_dates_check check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists platform_access_grants_employee_uq
  on public.platform_access_grants(organization_id, module_key, employee_id)
  where employee_id is not null and archived_at is null;
create unique index if not exists platform_access_grants_user_uq
  on public.platform_access_grants(organization_id, module_key, user_id)
  where user_id is not null and archived_at is null;
create unique index if not exists platform_access_grants_email_uq
  on public.platform_access_grants(organization_id, module_key, lower(external_email))
  where external_email is not null and archived_at is null;
create index if not exists platform_access_grants_org_idx
  on public.platform_access_grants(organization_id, module_key, access_level)
  where archived_at is null;

alter table public.platform_access_grants enable row level security;
drop policy if exists platform_access_grants_tenant_select on public.platform_access_grants;
drop policy if exists platform_access_grants_tenant_insert on public.platform_access_grants;
drop policy if exists platform_access_grants_tenant_update on public.platform_access_grants;
drop policy if exists platform_access_grants_tenant_delete on public.platform_access_grants;
create policy platform_access_grants_tenant_select on public.platform_access_grants
  for select to authenticated using (public.is_organization_member(organization_id));
create policy platform_access_grants_tenant_insert on public.platform_access_grants
  for insert to authenticated with check (public.is_organization_member(organization_id));
create policy platform_access_grants_tenant_update on public.platform_access_grants
  for update to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));
create policy platform_access_grants_tenant_delete on public.platform_access_grants
  for delete to authenticated using (public.is_organization_member(organization_id));
grant select, insert, update, delete on public.platform_access_grants to authenticated;

drop trigger if exists set_platform_access_grants_updated_at on public.platform_access_grants;
create trigger set_platform_access_grants_updated_at
  before update on public.platform_access_grants
  for each row execute function public.set_updated_at();

comment on table public.platform_access_grants is
  'Autorisations transverses multi-modules et multi-sous-modules, utilisables avec ou sans souscription au module RH.';
