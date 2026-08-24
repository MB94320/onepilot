-- ONEPILOT V15 — finance opérationnelle, notes de frais détaillées et fichiers publiés

create extension if not exists pgcrypto;

-- Les validations sont distinctes afin de conserver la preuve du workflow.
alter table if exists public.finance_expense_reports
  add column if not exists manager_approved_at timestamptz,
  add column if not exists finance_approved_at timestamptz,
  add column if not exists manager_approved_by uuid references public.hr_employees(id) on delete set null,
  add column if not exists finance_approved_by uuid references public.hr_employees(id) on delete set null,
  add column if not exists payment_method text,
  add column if not exists reimbursement_reference text;

alter table if exists public.finance_expense_items
  add column if not exists supplier_name text,
  add column if not exists project_id uuid references public.project_projects(id) on delete set null,
  add column if not exists client_name text,
  add column if not exists billable_to_client boolean not null default false,
  add column if not exists currency text not null default 'EUR',
  add column if not exists exchange_rate numeric(14,6) not null default 1,
  add column if not exists amount_eur numeric(16,2) not null default 0,
  add column if not exists receipt_status text not null default 'missing'
    check (receipt_status in ('missing','received','verified','rejected'));

create or replace function public.set_finance_expense_report_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  report_year integer := extract(year from coalesce(new.expense_month, current_date))::integer;
  next_sequence integer;
begin
  if nullif(btrim(coalesce(new.report_number, '')), '') is not null then return new; end if;
  perform pg_advisory_xact_lock(hashtext(new.organization_id::text || ':NDF:' || report_year::text));
  select coalesce(max((regexp_match(report_number, '^NDF-' || report_year::text || '-([0-9]+)$'))[1]::integer), 0) + 1
    into next_sequence
  from public.finance_expense_reports
  where organization_id = new.organization_id;
  new.report_number := 'NDF-' || report_year::text || '-' || lpad(next_sequence::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists finance_expense_reports_number on public.finance_expense_reports;
create trigger finance_expense_reports_number
before insert on public.finance_expense_reports
for each row execute function public.set_finance_expense_report_number();

create or replace function public.recalculate_expense_report_totals(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization_id uuid;
begin
  select organization_id into target_organization_id
  from public.finance_expense_reports
  where id = target_report_id;
  if target_organization_id is null then return; end if;
  if auth.uid() is not null and not public.is_organization_member(target_organization_id) then
    raise exception 'Accès refusé à l’organisation %.', target_organization_id using errcode = '42501';
  end if;
  update public.finance_expense_reports report
  set total_amount = coalesce((
        select round(sum(coalesce(nullif(item.amount_eur, 0), item.amount_including_tax * item.exchange_rate, 0)), 2)
        from public.finance_expense_items item
        where item.report_id = target_report_id and item.archived_at is null
      ), 0),
      reimbursable_amount = coalesce((
        select round(sum(case when coalesce(item.is_compliant, true) then coalesce(nullif(item.amount_eur, 0), item.amount_including_tax * item.exchange_rate, 0) else 0 end), 2)
        from public.finance_expense_items item
        where item.report_id = target_report_id and item.archived_at is null
      ), 0),
      updated_at = now()
  where report.id = target_report_id;
end;
$$;

create or replace function public.sync_expense_report_totals()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_expense_report_totals(old.report_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.report_id is distinct from new.report_id then
    perform public.recalculate_expense_report_totals(old.report_id);
  end if;
  perform public.recalculate_expense_report_totals(new.report_id);
  return new;
end;
$$;

drop trigger if exists finance_expense_items_sync_totals on public.finance_expense_items;
create trigger finance_expense_items_sync_totals
after insert or update or delete on public.finance_expense_items
for each row execute function public.sync_expense_report_totals();

-- Champs spécialisés de facturation, trésorerie et recouvrement.
alter table if exists public.project_financial_periods
  add column if not exists invoice_reference text,
  add column if not exists invoice_date date,
  add column if not exists invoice_due_date date,
  add column if not exists forecast_collection_date date,
  add column if not exists collection_status text not null default 'not_due'
    check (collection_status in ('not_due','due','reminded','promise_received','disputed','collected','written_off')),
  add column if not exists last_reminder_at timestamptz,
  add column if not exists next_reminder_date date,
  add column if not exists collection_owner_name text,
  add column if not exists dispute_reason text,
  add column if not exists cash_outflow_amount numeric(16,2) not null default 0;

create or replace function public.set_project_financial_derived_values()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.pca_amount := greatest(0, coalesce(new.invoiced_amount, 0) - coalesce(new.production_amount, 0));
  new.unbilled_revenue_amount := greatest(0, coalesce(new.production_amount, 0) - coalesce(new.invoiced_amount, 0));
  new.period_margin_amount := coalesce(new.production_amount, 0) - coalesce(new.actual_cost, 0);
  new.period_margin_percent := case when coalesce(new.production_amount, 0) = 0 then 0 else round(((new.production_amount - new.actual_cost) / new.production_amount) * 100, 4) end;
  new.outstanding_amount := greatest(0, coalesce(new.invoiced_amount, 0) - coalesce(new.collected_amount, 0));
  new.cash_outflow_amount := coalesce(new.actual_cost, 0) + coalesce(new.purchase_amount, 0) + coalesce(new.expense_amount, 0);
  if new.period_start is not null and new.payment_terms_days is not null and new.next_invoice_date is null then
    new.next_invoice_date := (new.period_start + make_interval(days => new.payment_terms_days))::date;
  end if;
  if new.invoice_date is not null and new.invoice_due_date is null then
    new.invoice_due_date := (new.invoice_date + make_interval(days => coalesce(new.payment_terms_days, 30)))::date;
  end if;
  if coalesce(new.outstanding_amount, 0) <= 0 and coalesce(new.collected_amount, 0) > 0 then
    new.collection_status := 'collected';
  elsif new.invoice_due_date is not null and new.invoice_due_date < current_date and coalesce(new.outstanding_amount, 0) > 0 and new.collection_status = 'not_due' then
    new.collection_status := 'due';
  end if;
  return new;
end;
$$;

drop trigger if exists project_financial_periods_derived_values on public.project_financial_periods;
create trigger project_financial_periods_derived_values
before insert or update on public.project_financial_periods
for each row execute function public.set_project_financial_derived_values();

-- Complète uniquement les périodes de démonstration afin de rendre visibles
-- facturation, échéances, encaissement, PCA, FAE, marge et trésorerie.
update public.project_financial_periods period
set invoice_reference = coalesce(period.invoice_reference, 'FAC-' || to_char(period.period_start, 'YYYYMM') || '-' || right(replace(project.code, '-', ''), 4)),
    invoice_date = coalesce(period.invoice_date, period.period_start + 19),
    invoice_due_date = coalesce(period.invoice_due_date, period.period_start + 49),
    forecast_collection_date = coalesce(period.forecast_collection_date, period.period_start + 54),
    collection_owner_name = coalesce(period.collection_owner_name, 'Responsable financier'),
    collection_status = case
      when coalesce(period.invoiced_amount, 0) <= coalesce(period.collected_amount, 0) then 'collected'
      when period.period_start + 49 < current_date then 'due'
      else 'not_due'
    end,
    forecast_production_amount = coalesce(nullif(period.forecast_production_amount, 0), period.production_amount * 1.04),
    forecast_cost_amount = coalesce(nullif(period.forecast_cost_amount, 0), period.actual_cost * 1.03),
    forecast_invoice_amount = coalesce(nullif(period.forecast_invoice_amount, 0), period.invoiced_amount * 1.05),
    updated_at = now()
from public.project_projects project
where period.project_id = project.id
  and period.organization_id = project.organization_id
  and period.comment like 'Démonstration PMO corrélée%';

do $$
declare
  demo_report public.finance_expense_reports%rowtype;
begin
  select * into demo_report
  from public.finance_expense_reports
  where report_number = 'NDF-2026-0001' and archived_at is null
  order by created_at
  limit 1;
  if demo_report.id is null then return; end if;

  insert into public.finance_expense_items
    (organization_id, report_id, receipt_number, expense_date, nature, justification, supplier_name, project_id, client_name, billable_to_client, payment_method, amount_excluding_tax, vat_amount, amount_including_tax, amount_eur, receipt_status, is_compliant)
  select demo_report.organization_id, demo_report.id, item.receipt_number, item.expense_date, item.nature, item.justification, item.supplier_name, demo_report.project_id, demo_report.client_name, demo_report.billable_to_client, 'personal', item.amount_ht, item.tva, item.amount_ttc, item.amount_ttc, 'verified', true
  from (values
    ('JUS-2026-0701','2026-07-04'::date,'Repas','Repas de mission client','Restaurant démonstration',48.83::numeric,9.77::numeric,58.60::numeric),
    ('JUS-2026-0702','2026-07-11'::date,'Hôtel','Nuitée pendant atelier projet','Hôtel démonstration',127.27::numeric,12.73::numeric,140.00::numeric),
    ('JUS-2026-0703','2026-07-18'::date,'Train','Déplacement revue de jalon','Transport démonstration',209.09::numeric,20.91::numeric,230.00::numeric)
  ) item(receipt_number,expense_date,nature,justification,supplier_name,amount_ht,tva,amount_ttc)
  where not exists (
    select 1 from public.finance_expense_items existing
    where existing.organization_id = demo_report.organization_id
      and existing.report_id = demo_report.id
      and existing.receipt_number = item.receipt_number
  );
end;
$$;

-- Les fichiers originaux ONEPILOT sont réellement téléchargeables depuis la bibliothèque.
update public.platform_document_catalog
set download_url = '/templates/modele-note-de-frais-onepilot.xlsx',
    file_format = 'XLSX',
    ai_generation_supported = true,
    updated_at = now()
where code = 'MOD-FIN-001'
  and nullif(btrim(coalesce(download_url, '')), '') is null;

update public.platform_document_catalog
set download_url = '/templates/modele-go-no-go-onepilot.xlsx',
    file_format = 'XLSX',
    ai_generation_supported = true,
    updated_at = now()
where code = 'MOD-AVV-001'
  and nullif(btrim(coalesce(download_url, '')), '') is null;

update public.platform_document_catalog
set download_url = '/templates/procedure-gestion-risques-onepilot.pdf',
    file_format = 'PDF',
    ai_generation_supported = true,
    updated_at = now()
where code = 'PRO-RSK-001'
  and nullif(btrim(coalesce(download_url, '')), '') is null;

-- Compléments au catalogue, idempotents et propres à chaque tenant.
insert into public.platform_document_catalog
  (organization_id, code, title, description, module_key, phase, category, file_format, version, status, owner_name, source_reference, download_url, is_mandatory, ai_generation_supported, tags)
select organization_id, code, title, description, module_key, phase, category, file_format, version, status, owner_name, source_reference, download_url, is_mandatory, ai_generation_supported, tags
from (
  select o.id organization_id, values_data.*
  from public.organizations o
  cross join (values
    ('MOD-AVV-002','Check-list Go / No-Go ONEPILOT','Décision pondérée, critères bloquants, réserves, responsables et échéances.','commerce','AVV','template','XLSX','1.0','approved','Commerce','Revue d’opportunité ONEPILOT','/templates/modele-go-no-go-onepilot.xlsx',true,true,array['opportunité','go-no-go','décision']::text[]),
    ('MOD-FIN-002','Note de frais détaillée ONEPILOT','En-tête mensuel et lignes multiples par date, nature, fournisseur, projet, client et justificatif.','finance','Transverse','template','XLSX','1.0','approved','Finance','Note de frais ONEPILOT','/templates/modele-note-de-frais-onepilot.xlsx',false,true,array['dépenses','TVA','justificatifs','workflow']::text[]),
    ('PRO-RSK-002','Processus de gestion des risques et opportunités','Processus opérationnel complet : identification, criticité 4 × 4, valorisation, actions, gouvernance, clôture et indicateurs.','quality','AVV & Delivery','procedure','PDF','1.0','approved','Qualité','Processus ONEPILOT','/templates/procedure-gestion-risques-onepilot.pdf',true,true,array['risques','opportunités','actions','ISO 9001']::text[])
  ) as values_data(code,title,description,module_key,phase,category,file_format,version,status,owner_name,source_reference,download_url,is_mandatory,ai_generation_supported,tags)
) seeded
on conflict (organization_id, code) do update
set title = excluded.title,
    description = excluded.description,
    download_url = excluded.download_url,
    file_format = excluded.file_format,
    updated_at = now(),
    archived_at = null;

revoke all on function public.recalculate_expense_report_totals(uuid) from public;
grant execute on function public.recalculate_expense_report_totals(uuid) to authenticated;

comment on function public.recalculate_expense_report_totals(uuid) is 'Recalcule les totaux d’une note de frais depuis ses lignes datées et ses justificatifs.';
