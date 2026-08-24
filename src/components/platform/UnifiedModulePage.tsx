"use client";

import { use, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Bell, CheckCircle2, Eye, FolderKanban, Search, SlidersHorizontal, Target, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import { createClient } from "@/lib/supabase/client";
import { HrActionMenu, HrChartCard, HrColumnFilterMenu, HrMetricCard, HrResetFilters, HrSectionCard, HrStatusBadge, hrInputClassName, hrSelectClassName, hrTableClassName, hrTableHeaderClassName } from "@/components/hr/HrReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";

type AnyRow = Record<string, any>;
type Mode = "dashboard" | "reports" | "objectives" | "quality" | "risks" | "deliverables" | "nonconformities" | "audits" | "qualityDocuments" | "finance" | "margins" | "billing" | "cash" | "collections" | "expenses" | "documents" | "library" | "templates" | "processes" | "sharing" | "automations";

const configs: Record<Mode, { title: string; singular: string; subtitle: string; table?: string; domain: string }> = {
  dashboard: { title: "Pilotage exécutif", singular: "indicateur", subtitle: "Consolidez la trajectoire de l’entreprise et arbitrez à partir des données opérationnelles réelles.", table: "project_projects", domain: "Pilotage" },
  reports: { title: "Rapports & tableaux de bord", singular: "rapport", subtitle: "Centralisez les rapports de management, leur fiabilité et leur fréquence de mise à jour.", table: "project_health_snapshots", domain: "Pilotage" },
  objectives: { title: "Objectifs stratégiques", singular: "objectif", subtitle: "Suivez les objectifs, leurs responsables, leurs échéances et leur contribution à la stratégie.", table: "project_projects", domain: "Pilotage" },
  quality: { title: "Qualité & risques", singular: "élément qualité", subtitle: "Pilotez les risques, livrables, non-conformités et audits dans un référentiel transverse.", table: "project_risks", domain: "Qualité & risques" },
  risks: { title: "Risques", singular: "risque", subtitle: "Identifiez, valorisez, traitez et surveillez les risques de l’organisation et des projets.", table: "project_risks", domain: "Qualité & risques" },
  deliverables: { title: "Livrables", singular: "livrable", subtitle: "Suivez les engagements, l’acceptation client, les retards et la conformité du premier coup.", table: "project_deliverables", domain: "Qualité & risques" },
  nonconformities: { title: "Non-conformités", singular: "non-conformité", subtitle: "Centralisez les écarts, causes, corrections et preuves d’efficacité des plans d’action.", table: "project_nonconformities", domain: "Qualité & risques" },
  audits: { title: "Audits", singular: "audit", subtitle: "Planifiez les audits et exploitez les résultats, écarts et actions de mise en conformité.", table: "project_audits", domain: "Qualité & risques" },
  qualityDocuments: { title: "Documents qualité", singular: "document", subtitle: "Retrouvez les documents qualité depuis la bibliothèque documentaire transverse.", domain: "Qualité & risques" },
  finance: { title: "Finance", singular: "période financière", subtitle: "Consolidez coûts, production, facturation, encaissement, marge, PCA et FAE.", table: "project_financial_periods", domain: "Finance" },
  margins: { title: "Marges", singular: "marge", subtitle: "Analysez les marges prévisionnelles et réelles, leurs écarts et leurs causes.", table: "project_financial_periods", domain: "Finance" },
  billing: { title: "Facturation", singular: "facturation", subtitle: "Réconciliez production, bons de livraison, facturation et reste à facturer.", table: "project_financial_periods", domain: "Finance" },
  cash: { title: "Trésorerie", singular: "flux", subtitle: "Suivez les encaissements, décaissements, encours et besoins de trésorerie.", table: "project_financial_periods", domain: "Finance" },
  collections: { title: "Recouvrement", singular: "encours", subtitle: "Priorisez les créances, retards de paiement et actions de recouvrement.", table: "project_financial_periods", domain: "Finance" },
  expenses: { title: "Notes de frais", singular: "note de frais", subtitle: "Contrôlez les dépenses, justificatifs, validations et rattachements analytiques.", table: "project_financial_periods", domain: "Finance" },
  documents: { title: "Documents & outils", singular: "document", subtitle: "Centralisez les PDF, modèles, processus, partages et automatisations de la plateforme.", domain: "Documents & outils" },
  library: { title: "Bibliothèque documentaire", singular: "document", subtitle: "Classez et retrouvez les PDF et documents de référence par module et par activité.", domain: "Documents & outils" },
  templates: { title: "Modèles", singular: "modèle", subtitle: "Gérez les modèles de documents réutilisables et leurs versions validées.", domain: "Documents & outils" },
  processes: { title: "Processus", singular: "processus", subtitle: "Documentez les processus, responsables, contrôles et preuves applicables.", domain: "Documents & outils" },
  sharing: { title: "Partages documentaires", singular: "partage", subtitle: "Maîtrisez les destinataires, droits, échéances et traces de consultation.", domain: "Documents & outils" },
  automations: { title: "Automatisations", singular: "automatisation", subtitle: "Pilotez les automatisations, déclencheurs, résultats et anomalies de traitement.", domain: "Documents & outils" },
};

function text(value: unknown) { return String(value ?? "").trim(); }
function amount(value: unknown) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function date(value: unknown) { if (!value) return "—"; const parsed = new Date(String(value)); return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR").format(parsed); }
function normalized(row: AnyRow) {
  const status = text(row.status || row.quality_status || row.health_status || "Ouvert");
  return {
    ...row,
    displayCode: text(row.code || row.project_code || row.reference || row.id?.slice?.(0, 8) || "—"),
    displayName: text(row.name || row.title || row.description || row.comment || "Élément sans désignation"),
    displayOwner: text(row.owner_name || row.responsible_name || row.project_manager_name || row.auditor_name || "Non affecté"),
    displayStatus: status,
    displayDate: row.review_date || row.planned_date || row.period_start || row.audit_date || row.end_date || row.updated_at || row.created_at,
    displayAmount: Number(row.actual_cost || row.cost_impact_amount || row.production_amount || row.baseline_budget || 0),
  };
}
function statusTone(value: unknown) { const key = text(value).toLocaleLowerCase("fr"); if (["clos", "clôtur", "livré", "accept", "conforme", "termin", "actif"].some((v) => key.includes(v))) return "completed"; if (["en cours", "traitement", "réalis"].some((v) => key.includes(v))) return "in_progress"; if (["bloqu", "critique", "refus", "retard", "non conforme"].some((v) => key.includes(v))) return "blocked"; if (["annul", "archiv", "supprim"].some((v) => key.includes(v))) return "archived"; return "planned"; }

async function loadRows(orgId: string, mode: Mode) {
  const supabase = createClient();
  const { data: organization, error: organizationError } = await supabase.from("organizations").select("id,name,slug").eq("slug", orgId).single();
  if (organizationError || !organization) throw new Error(organizationError?.message || "Organisation introuvable");
  const config = configs[mode];
  if (!config.table) {
    if (["documents", "library", "templates", "processes", "sharing", "automations", "qualityDocuments"].includes(mode)) {
      const [offersResult, ordersResult, deliverablesResult, auditsResult] = await Promise.all([
        (supabase.from("offres" as never) as any).select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(250),
        (supabase.from("commandes" as never) as any).select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(250),
        (supabase.from("project_deliverables" as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("created_at", { ascending: false }).limit(250),
        (supabase.from("project_audits" as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("audit_date", { ascending: false }).limit(250),
      ]);
      const firstError = [offersResult, ordersResult, deliverablesResult, auditsResult].find((result) => result.error)?.error;
      if (firstError) throw new Error(firstError.message);
      const generated = [
        ...(offersResult.data || []).flatMap((offer: AnyRow) => [
          { id: `ft-${offer.id}`, code: offer.numero_offre || offer.reference || "OFFRE", title: `Fiche technique — ${offer.titre || offer.nom || "Offre"}`, owner_name: offer.commercial_name || "Commerce", status: "Disponible", updated_at: offer.updated_at || offer.created_at, document_type: "PDF commercial", source_module: "Avant-vente" },
          { id: `gng-${offer.id}`, code: offer.numero_offre || offer.reference || "OFFRE", title: `Check-list Go/No-Go — ${offer.titre || offer.nom || "Offre"}`, owner_name: offer.commercial_name || "Commerce", status: "Disponible", updated_at: offer.updated_at || offer.created_at, document_type: "PDF commercial", source_module: "Avant-vente" },
        ]),
        ...(ordersResult.data || []).map((order: AnyRow) => ({ id: `cmd-${order.id}`, code: order.numero_commande || order.reference || "COMMANDE", title: `Revue de commande — ${order.objet || order.designation || order.numero_commande || "Commande"}`, owner_name: order.responsable_name || "Commerce", status: "Disponible", updated_at: order.updated_at || order.created_at, document_type: "PDF de contrôle", source_module: "Commandes" })),
        ...(deliverablesResult.data || []).map((deliverable: AnyRow) => ({ id: `liv-${deliverable.id}`, code: deliverable.code, title: deliverable.name, owner_name: deliverable.owner_name || "Projet", status: deliverable.status || "Planifié", updated_at: deliverable.updated_at || deliverable.created_at, document_type: "Livrable", source_module: "Qualité & risques" })),
        ...(auditsResult.data || []).map((audit: AnyRow) => ({ id: `aud-${audit.id}`, code: audit.audit_number, title: `Rapport d’audit ${String(audit.audit_type || "").toUpperCase()}`, owner_name: audit.auditor_name || "Qualité", status: audit.status || "Planifié", updated_at: audit.audit_date, document_type: "Rapport d’audit", source_module: "Qualité & risques" })),
      ];
      const references = [
        { id: "tpl-ft", code: "MOD-COM-001", title: "Modèle de fiche technique avant-vente", owner_name: "Commerce", status: "Validé", updated_at: new Date().toISOString(), document_type: "Modèle", source_module: "Avant-vente" },
        { id: "tpl-gng", code: "MOD-COM-002", title: "Check-list de décision Go/No-Go", owner_name: "Commerce", status: "Validé", updated_at: new Date().toISOString(), document_type: "Modèle", source_module: "Avant-vente" },
        { id: "tpl-audit", code: "MOD-QUA-001", title: "Référentiel d’audit AVV et Delivery", owner_name: "Qualité", status: "Validé", updated_at: new Date().toISOString(), document_type: "Modèle", source_module: "Qualité & risques" },
        { id: "prc-delivery", code: "PRO-PRJ-001", title: "Processus de transformation AVV gagnée en projet", owner_name: "PMO", status: "Actif", updated_at: new Date().toISOString(), document_type: "Processus", source_module: "Projets" },
        { id: "prc-closing", code: "PRO-FIN-001", title: "Processus production, facturation et encaissement", owner_name: "Finance", status: "Actif", updated_at: new Date().toISOString(), document_type: "Processus", source_module: "Finance" },
      ];
      const scoped = mode === "templates" ? references.filter((row) => row.document_type === "Modèle") : mode === "processes" || mode === "automations" ? references.filter((row) => row.document_type === "Processus") : generated;
      return { organization, rows: scoped.map(normalized) };
    }
    return { organization, rows: [] as AnyRow[] };
  }
  const result = await (supabase.from(config.table as any) as any).select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(500);
  if (result.error) throw new Error(result.error.message);
  return { organization, rows: (result.data || []).map(normalized) };
}

export function UnifiedModulePage({ params, mode }: { params: Promise<{ orgId: string }>; mode: Mode }) {
  const { orgId } = use(params);
  const config = configs[mode];
  const query = useQuery({ queryKey: ["unified-module", orgId, mode], queryFn: () => loadRows(orgId, mode) });
  const [activeTab, setActiveTab] = useState<"pilotage" | "analyses" | "alerts">("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const tableRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = (query.data?.rows || []) as AnyRow[];
  const columns = [
    { key: "code", label: "Référence", value: (row: AnyRow) => row.displayCode },
    { key: "name", label: "Désignation", value: (row: AnyRow) => row.displayName },
    { key: "owner", label: "Responsable", value: (row: AnyRow) => row.displayOwner },
    { key: "status", label: "Statut", value: (row: AnyRow) => row.displayStatus },
    { key: "date", label: "Échéance / période", value: (row: AnyRow) => date(row.displayDate) },
    { key: "amount", label: "Valeur", value: (row: AnyRow) => amount(row.displayAmount) },
  ];
  const valueFor = (row: AnyRow, column: (typeof columns)[number]) => text(column.value(row)) || "—";
  const statuses: string[] = [...new Set<string>(rows.map((row: AnyRow) => text(row.displayStatus)))].sort((a, b) => a.localeCompare(b, "fr"));
  const owners: string[] = [...new Set<string>(rows.map((row: AnyRow) => text(row.displayOwner)))].sort((a, b) => a.localeCompare(b, "fr"));
  const filteredRows = rows.filter((row) => { const haystack = columns.map((column) => valueFor(row, column)).join(" ").toLocaleLowerCase("fr"); return (!search || haystack.includes(search.toLocaleLowerCase("fr"))) && (!status || row.displayStatus === status) && (!owner || row.displayOwner === owner) && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(valueFor(row, column))); });
  const filtersActive = Boolean(search || status || owner || Object.values(columnFilters).some((values) => values.length));
  const reset = () => { setSearch(""); setStatus(""); setOwner(""); setColumnFilters({}); };
  const statusData: Array<{ name: string; value: number }> = useMemo(() => [...new Set<string>(filteredRows.map((row: AnyRow) => text(row.displayStatus)))].map((name) => ({ name, value: filteredRows.filter((row: AnyRow) => text(row.displayStatus) === name).length })), [filteredRows]);
  const monthlyData = useMemo(() => { const map = new Map<string, number>(); filteredRows.forEach((row) => { const key = text(row.displayDate).slice(0, 7); if (key) map.set(key, (map.get(key) || 0) + 1); }); return [...map].sort().map(([month, value]) => ({ month: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`)), value })); }, [filteredRows]);
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column) => ({ key: column.key, label: column.label, value: (row) => valueFor(row, column) }));
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Chargement de {config.title.toLocaleLowerCase("fr")}…</div>;
  if (query.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">Impossible de charger la page : {(query.error as Error).message}</div>;
  return <div className="space-y-6">
    <PageHeader title={config.title} subtitle={config.subtitle} actions={<DataExportMenu<AnyRow> data={filteredRows} columns={exportColumns} fileName={`onepilot-${mode}`} sheetName={config.title} disabled={!filteredRows.length} />} />
    <PageTutorial title={`Piloter ${config.title.toLocaleLowerCase("fr")}`} description={`Cette page consolide les données réelles du tenant et limite les doubles saisies.\nLes filtres, cartes, tableaux, analyses, alertes et exports partagent exactement le même périmètre.`} objectives={["Fiabiliser les données métier et leur responsabilité.", "Accélérer les décisions avec une lecture synthétique et détaillée."]} steps={[{ title: "Filtrer", description: "Définissez le périmètre utile à votre revue." }, { title: "Analyser", description: "Comparez les volumes, statuts et échéances." }]} recommendations={["Traiter d’abord les éléments bloqués, en retard ou sans responsable."]} />
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={FolderKanban} label="Éléments suivis" value={filteredRows.length} description="Périmètre filtré" accent="indigo" /><HrMetricCard icon={CheckCircle2} label="Maîtrisés" value={filteredRows.filter((row) => statusTone(row.displayStatus) === "completed").length} description="Clôturés ou conformes" accent="emerald" /><HrMetricCard icon={Target} label="À suivre" value={filteredRows.filter((row) => ["planned", "in_progress"].includes(statusTone(row.displayStatus))).length} description="Planifiés ou en cours" accent="amber" /><HrMetricCard icon={AlertTriangle} label="Critiques" value={filteredRows.filter((row) => statusTone(row.displayStatus) === "blocked").length} description="Bloqués, en retard ou critiques" accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description={`Affinez les données de ${config.domain.toLocaleLowerCase("fr")} visibles dans toutes les zones.`} right={<span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-bold text-sky-700">{filteredRows.length} résultats sur {rows.length}</span>}><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input className={`${hrInputClassName} w-full pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans le périmètre…" /></div><div className="mt-4 grid gap-3 lg:grid-cols-4"><select className={hrSelectClassName} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><select className={hrSelectClassName} value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">Tous les responsables</option>{owners.map((item) => <option key={item}>{item}</option>)}</select></div>{filtersActive && <div className="mt-4 flex justify-end"><HrResetFilters onReset={reset} /></div>}</HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">{([{ key: "pilotage", label: "Pilotage", color: "indigo" }, { key: "analyses", label: "Analyses", color: "violet" }, { key: "alerts", label: "Alertes", color: "emerald" }] as const).map((tab) => <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${activeTab === tab.key ? tab.color === "indigo" ? "bg-indigo-600 text-white shadow-md" : tab.color === "violet" ? "bg-violet-600 text-white shadow-md" : "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}>{tab.label}</button>)}</div></div>
    {activeTab === "pilotage" && <HrSectionCard icon={FolderKanban} title={`Pilotage — ${config.title}`} description="Cartes ou tableau issus du même périmètre, avec actions et export homogènes." right={<div className="flex items-center gap-2"><button type="button" onClick={() => setView("cards")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Tableau</button>{view === "table" && <ProjectVisualActions targetRef={tableRef} fileName={`onepilot-${mode}`} label={config.title} />}</div>}>
      {!filteredRows.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><FolderKanban className="mx-auto h-8 w-8 text-indigo-400" /><p className="mt-3 text-sm font-bold text-slate-800">Aucune donnée dans ce périmètre</p><p className="mt-1 text-xs text-slate-500">La page est prête ; les éléments apparaîtront dès leur création ou leur synchronisation depuis un module lié.</p></div> : view === "cards" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredRows.map((row: AnyRow) => <article key={String(row.id)} onClick={() => setSelected(row)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{row.displayCode}</p><h3 className="mt-1 text-sm font-bold text-slate-950">{row.displayName}</h3></div><HrActionMenu labels={{ view: `Voir ${config.singular}`, edit: `Modifier ${config.singular}`, archive: `Archiver ${config.singular}`, restore: `Réactiver ${config.singular}` }} onView={() => setSelected(row)} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><span className="text-slate-500">Responsable<br /><strong className="font-semibold text-slate-800">{row.displayOwner}</strong></span><span className="text-slate-500">Échéance<br /><strong className="font-semibold text-slate-800">{date(row.displayDate)}</strong></span></div><div className="mt-4"><HrStatusBadge status={statusTone(row.displayStatus)} label={row.displayStatus} /></div></article>)}</div> : <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="max-h-[430px] overflow-auto"><table className={hrTableClassName}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={`${index === 0 ? "sticky left-0 z-20 bg-sky-50" : ""} min-w-40 px-4 py-3 text-left`}><span className="flex items-center justify-between gap-2">{column.label}<HrColumnFilterMenu label={column.label} values={[...new Set<string>(rows.map((row: AnyRow) => valueFor(row, column)))]} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></span></th>)}<th className="sticky right-0 z-20 min-w-32 bg-sky-50 px-4 py-3 text-left">Actions</th></tr></thead><tbody>{filteredRows.map((row: AnyRow) => <tr key={String(row.id)} className="border-t border-slate-100"><td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-bold text-indigo-700">{row.displayCode}</td><td className="px-4 py-3 text-xs font-semibold text-slate-900">{row.displayName}</td><td className="px-4 py-3 text-xs text-slate-600">{row.displayOwner}</td><td className="px-4 py-3"><HrStatusBadge status={statusTone(row.displayStatus)} label={row.displayStatus} /></td><td className="px-4 py-3 text-xs text-slate-600">{date(row.displayDate)}</td><td className="px-4 py-3 text-xs font-semibold text-emerald-700">{amount(row.displayAmount)}</td><td className="sticky right-0 z-10 bg-white px-4 py-3"><HrActionMenu labels={{ view: `Voir ${config.singular}`, edit: `Modifier ${config.singular}`, archive: `Archiver ${config.singular}`, restore: `Réactiver ${config.singular}` }} onView={() => setSelected(row)} /></td></tr>)}</tbody></table></div></section>}
    </HrSectionCard>}
    {activeTab === "analyses" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Répartition par statut" description="Répartition des éléments du périmètre filtré." exportConfig={{ type: "donut", data: statusData, nameKey: "name", series: [{ key: "value", label: "Volume", color: "#818cf8" }] }}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} label={({ value }) => value}>{statusData.map((_, index) => <Cell key={index} fill={["#818cf8", "#6ee7b7", "#fcd34d", "#fda4af", "#7dd3fc", "#94a3b8"][index % 6]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></HrChartCard><HrChartCard title="Évolution mensuelle" description="Nombre d’éléments positionnés par mois." exportConfig={{ type: "bar", data: monthlyData, nameKey: "month", series: [{ key: "value", label: "Volume", color: "#818cf8" }] }}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard></div>}
    {activeTab === "alerts" && <HrSectionCard icon={Bell} title="Alertes qualité" description="Synthèse, alertes et recommandations actionnables sur le périmètre filtré."><div className="grid gap-4 xl:grid-cols-3"><div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5"><p className="text-sm font-black text-indigo-950">Synthèse</p><p className="mt-2 text-xs leading-5 text-indigo-800">{filteredRows.length} élément(s), dont {filteredRows.filter((row) => statusTone(row.displayStatus) === "blocked").length} critique(s).</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><p className="text-sm font-black text-emerald-950">Alertes</p><p className="mt-2 text-xs leading-5 text-emerald-800">Prioriser les éléments bloqués, en retard ou sans responsable identifié.</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5"><p className="text-sm font-black text-amber-950">Recommandations</p><p className="mt-2 text-xs leading-5 text-amber-800">Affecter un responsable, une échéance et une condition de clôture vérifiable.</p></div></div></HrSectionCard>}
    {selected && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{selected.displayCode}</p><h2 className="mt-1 text-lg font-black text-slate-950">{selected.displayName}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-700"><X className="h-4 w-4" /></button></header><div className="grid gap-4 p-5 sm:grid-cols-2"><p className="text-xs text-slate-500">Responsable<br /><strong className="mt-1 block text-sm text-slate-900">{selected.displayOwner}</strong></p><p className="text-xs text-slate-500">Statut<br /><span className="mt-1 block"><HrStatusBadge status={statusTone(selected.displayStatus)} label={selected.displayStatus} /></span></p><p className="text-xs text-slate-500">Échéance / période<br /><strong className="mt-1 block text-sm text-slate-900">{date(selected.displayDate)}</strong></p><p className="text-xs text-slate-500">Valeur<br /><strong className="mt-1 block text-sm text-emerald-700">{amount(selected.displayAmount)}</strong></p></div></section></div>}
  </div>;
}
