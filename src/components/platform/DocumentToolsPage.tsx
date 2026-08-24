"use client";

import { use, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CheckCircle2, Download, FileText, FolderKanban, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  HrActionMenu,
  HrChartCard,
  HrColumnFilterMenu,
  HrMetricCard,
  HrResetFilters,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSelectClassName,
  hrTableClassName,
  hrTableHeaderClassName,
} from "@/components/hr/HrReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
export type DocumentToolsMode = "documents" | "library" | "templates" | "processes" | "sharing" | "automations";
type Tab = "pilotage" | "analyses" | "alerts";

const supabase = createClient();
const modeConfig: Record<DocumentToolsMode, { title: string; subtitle: string; category?: string[]; agents?: boolean }> = {
  documents: { title: "Documents & outils", subtitle: "Accédez aux modèles, procédures, processus et assistants qui sécurisent chaque étape métier." },
  library: { title: "Bibliothèque documentaire", subtitle: "Retrouvez les références applicables par module, phase, format, version et propriétaire." },
  templates: { title: "Modèles téléchargeables", subtitle: "Téléchargez des trames ONEPILOT prêtes à compléter, sans repartir d’un document vide.", category: ["template"] },
  processes: { title: "Processus & procédures", subtitle: "Comprenez les activités, responsabilités, contrôles, entrées, sorties et preuves attendues.", category: ["process", "procedure"] },
  sharing: { title: "Partages documentaires", subtitle: "Préparez la diffusion contrôlée des documents et identifiez ceux encore sans fichier publié." },
  automations: { title: "Assistants & agents IA", subtitle: "Choisissez un assistant gouverné, ses sources, ses livrables et le niveau de validation humaine.", agents: true },
};

const text = (value: unknown) => String(value ?? "").trim();
const frenchCategory = (value: unknown) => ({ template: "Modèle", procedure: "Procédure", process: "Processus", reference: "Référence" } as Record<string, string>)[text(value).toLowerCase()] || text(value) || "Document";
const frenchStatus = (value: unknown) => ({ approved: "Validé", active: "Actif", draft: "Brouillon", paused: "En pause", error: "En erreur", archived: "Archivé" } as Record<string, string>)[text(value).toLowerCase()] || text(value) || "Brouillon";
const statusTone = (value: unknown) => {
  const key = frenchStatus(value).toLowerCase();
  if (key.includes("valid") || key.includes("actif")) return "completed";
  if (key.includes("erreur")) return "blocked";
  if (key.includes("pause")) return "in_progress";
  if (key.includes("archiv")) return "archived";
  return "planned";
};

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadDocumentTools(orgId: string) {
  const organization = await resolveOrganization(orgId);
  const [documentsResult, agentsResult] = await Promise.all([
    (supabase.from("platform_document_catalog" as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("code"),
    (supabase.from("platform_ai_agents" as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("code"),
  ]);
  if (documentsResult.error) throw new Error(documentsResult.error.message);
  if (agentsResult.error) throw new Error(agentsResult.error.message);
  return { organization, documents: documentsResult.data || [], agents: agentsResult.data || [] };
}

function downloadName(row: AnyRow) {
  const extension = text(row.file_format || "pdf").toLowerCase();
  return `${text(row.code || "document").toLowerCase()}-${text(row.version || "1-0").replaceAll(".", "-")}.${extension}`;
}

export default function DocumentToolsPage({ params, mode }: { params: Promise<{ orgId: string }>; mode: DocumentToolsMode }) {
  const { orgId } = use(params);
  const config = modeConfig[mode];
  const query = useQuery({ queryKey: ["document-tools", orgId], queryFn: () => loadDocumentTools(orgId) });
  const [tab, setTab] = useState<Tab>("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [phase, setPhase] = useState("");
  const [format, setFormat] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [assistantRequest, setAssistantRequest] = useState("");
  const tableRef = useRef<HTMLElement | null>(null);

  const baseRows: AnyRow[] = config.agents ? query.data?.agents || [] : query.data?.documents || [];
  const rows = baseRows.filter((row) => !config.category || config.category.includes(text(row.category).toLowerCase()));
  const columns = config.agents ? [
    { key: "code", label: "Référence", value: (row: AnyRow) => row.code || "—" },
    { key: "name", label: "Assistant", value: (row: AnyRow) => row.name || "—" },
    { key: "domain", label: "Domaine", value: (row: AnyRow) => row.domain || "—" },
    { key: "trigger", label: "Déclenchement", value: (row: AnyRow) => ({ manual: "Manuel", daily: "Quotidien", monthly: "Mensuel", event: "Sur événement" } as AnyRow)[row.trigger_type] || row.trigger_type || "Manuel" },
    { key: "autonomy", label: "Autonomie", value: (row: AnyRow) => ({ assisted: "Assisté", supervised: "Supervisé", automatic: "Automatique" } as AnyRow)[row.autonomy_level] || row.autonomy_level || "Assisté" },
    { key: "status", label: "Statut", value: (row: AnyRow) => frenchStatus(row.status) },
    { key: "success", label: "Taux de réussite", value: (row: AnyRow) => `${Number(row.success_rate_percent || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` },
  ] : [
    { key: "code", label: "Référence", value: (row: AnyRow) => row.code || "—" },
    { key: "title", label: "Document", value: (row: AnyRow) => row.title || "—" },
    { key: "module", label: "Module", value: (row: AnyRow) => row.module_key || "—" },
    { key: "phase", label: "Phase", value: (row: AnyRow) => row.phase || "—" },
    { key: "category", label: "Catégorie", value: (row: AnyRow) => frenchCategory(row.category) },
    { key: "format", label: "Format", value: (row: AnyRow) => text(row.file_format).toUpperCase() || "—" },
    { key: "version", label: "Version", value: (row: AnyRow) => row.version || "—" },
    { key: "owner", label: "Propriétaire", value: (row: AnyRow) => row.owner_name || "Non affecté" },
    { key: "status", label: "Statut", value: (row: AnyRow) => frenchStatus(row.status) },
    { key: "download", label: "Fichier publié", value: (row: AnyRow) => row.download_url ? "Oui" : "Non" },
  ];
  const valueFor = (row: AnyRow, column: (typeof columns)[number]) => text(column.value(row)) || "—";
  const filteredRows = rows.filter((row) => {
    const haystack = columns.map((column) => valueFor(row, column)).join(" ").toLocaleLowerCase("fr");
    return (!search || haystack.includes(search.toLocaleLowerCase("fr")))
      && (!moduleKey || row.module_key === moduleKey || row.domain === moduleKey)
      && (!phase || row.phase === phase)
      && (!format || text(row.file_format).toUpperCase() === format)
      && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(valueFor(row, column)));
  });
  const modules = [...new Set(rows.map((row) => text(row.module_key || row.domain)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const phases = [...new Set(rows.map((row) => text(row.phase)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const formats = [...new Set(rows.map((row) => text(row.file_format).toUpperCase()).filter(Boolean))].sort();
  const filtersActive = Boolean(search || moduleKey || phase || format || Object.values(columnFilters).some((values) => values.length));
  const resetFilters = () => { setSearch(""); setModuleKey(""); setPhase(""); setFormat(""); setColumnFilters({}); };
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column) => ({ key: column.key, label: column.label, value: (row) => valueFor(row, column) }));
  const published = filteredRows.filter((row) => config.agents ? row.status === "active" : Boolean(row.download_url)).length;
  const mandatory = filteredRows.filter((row) => Boolean(row.is_mandatory)).length;
  const aiReady = filteredRows.filter((row) => config.agents ? row.autonomy_level !== "assisted" : Boolean(row.ai_generation_supported)).length;
  const analysisData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; available: number }>();
    filteredRows.forEach((row) => {
      const key = text(row.module_key || row.domain || "Transverse");
      const current = map.get(key) || { name: key, total: 0, available: 0 };
      current.total += 1;
      if (config.agents ? row.status === "active" : row.download_url) current.available += 1;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredRows, config.agents]);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">Chargement de la bibliothèque…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger les documents : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title={config.title} subtitle={config.subtitle} actions={<DataExportMenu data={filteredRows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={config.title} disabled={!filteredRows.length} />} />
    <PageTutorial title="Guide de la page" description={`${config.subtitle}\nLes références sont rattachées au tenant, versionnées et utilisables même lorsque le module source n’est pas souscrit.`} objectives={["Retrouver immédiatement le bon support selon la phase et le métier.", "Éviter les modèles obsolètes et les documents locaux non maîtrisés.", "Encadrer les usages IA par des sources, livrables et validations explicites."]} steps={[{ title: "Choisir", description: "Filtrer par module, phase, format ou catégorie." }, { title: "Comprendre", description: "Ouvrir la fiche pour lire l’usage, le propriétaire et la référence source." }, { title: "Utiliser", description: "Télécharger le fichier publié ou préparer la demande à un assistant." }]} recommendations={["Publier uniquement une version approuvée et conserver la source de référence.", "Ne jamais autoriser un agent à envoyer ou clôturer sans validation humaine explicite."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={FolderKanban} label={config.agents ? "Assistants référencés" : "Supports référencés"} value={filteredRows.length} description="Périmètre filtré" accent="indigo" /><HrMetricCard icon={CheckCircle2} label={config.agents ? "Assistants actifs" : "Fichiers publiés"} value={published} description="Immédiatement utilisables" accent="emerald" /><HrMetricCard icon={ShieldCheck} label="Obligatoires" value={mandatory} description="Contrôles ou preuves attendus" accent="amber" /><HrMetricCard icon={Sparkles} label="Compatibles IA" value={aiReady} description="Génération ou automatisation encadrée" accent="sky" /></section>
    <HrSectionCard icon={Search} title="Périmètre documentaire" description="Les filtres pilotent les cartes, le tableau, les analyses et l’export."><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder="Rechercher un modèle, processus, module, mot-clé…" /></div><div className="mt-4 grid gap-3 md:grid-cols-3"><select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className={hrSelectClassName}><option value="">Tous les modules</option>{modules.map((item) => <option key={item}>{item}</option>)}</select>{!config.agents && <select value={phase} onChange={(event) => setPhase(event.target.value)} className={hrSelectClassName}><option value="">Toutes les phases</option>{phases.map((item) => <option key={item}>{item}</option>)}</select>}{!config.agents && <select value={format} onChange={(event) => setFormat(event.target.value)} className={hrSelectClassName}><option value="">Tous les formats</option>{formats.map((item) => <option key={item}>{item}</option>)}</select>}</div>{filtersActive && <div className="mt-4 flex justify-end"><HrResetFilters onReset={resetFilters} /></div>}</HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">{([{ key: "pilotage", label: "Pilotage", color: "indigo" }, { key: "analyses", label: "Analyses", color: "violet" }, { key: "alerts", label: "Alertes", color: "emerald" }] as const).map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`rounded-xl px-5 py-2.5 text-sm font-bold ${tab === item.key ? item.color === "indigo" ? "bg-indigo-600 text-white" : item.color === "violet" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>
    {tab === "pilotage" && <HrSectionCard icon={config.agents ? Bot : FileText} title={config.title} description="Cartes et tableau exploitent le même référentiel et les mêmes filtres." right={<div className="flex items-center gap-2"><button type="button" onClick={() => setView("cards")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>Tableau</button>{view === "table" && <ProjectVisualActions targetRef={tableRef} fileName={`onepilot_${mode}`} label={config.title} />}</div>}>
      {view === "cards" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredRows.map((row) => <article key={row.id} onClick={() => setSelected(row)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{row.code}</p><h3 className="mt-1 text-sm font-bold text-slate-950">{row.title || row.name}</h3></div><HrActionMenu labels={{ view: config.agents ? "Voir l’assistant" : "Voir le document", edit: "Modifier", archive: "Archiver", restore: "Réactiver" }} onView={() => setSelected(row)} /></div><p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500">{row.description || "Description à compléter."}</p><div className="mt-4 flex items-center justify-between"><HrStatusBadge status={statusTone(row.status)} label={frenchStatus(row.status)} /><span className="text-xs font-bold text-slate-500">{config.agents ? row.domain : `${frenchCategory(row.category)} · ${text(row.file_format).toUpperCase()}`}</span></div></article>)}</div> : <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div data-visual-scroll className="max-h-[520px] overflow-auto"><table className={`${hrTableClassName} min-w-[1500px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={`${index === 0 ? "sticky left-0 z-30 bg-sky-50" : ""} min-w-40 text-left`}><HrColumnFilterMenu label={column.label} values={rows.map((row) => valueFor(row, column))} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th className="sticky right-0 z-30 min-w-36 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id}>{columns.map((column, index) => <td key={column.key} className={index === 0 ? "sticky left-0 z-10 bg-white font-normal text-slate-800" : "font-normal"}>{column.key === "status" ? <HrStatusBadge status={statusTone(row.status)} label={frenchStatus(row.status)} /> : valueFor(row, column)}</td>)}<td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: config.agents ? "Voir l’assistant" : "Voir le document", edit: "Modifier", archive: "Archiver", restore: "Réactiver" }} onView={() => setSelected(row)} /></td></tr>)}</tbody></table></div></section>}
    </HrSectionCard>}
    {tab === "analyses" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title={config.agents ? "Assistants par domaine" : "Documents par module"} description="Couverture du référentiel et part immédiatement disponible." exportConfig={{ type: "bar", data: analysisData, nameKey: "name", series: [{ key: "total", label: "Référencés", color: "#818cf8" }, { key: "available", label: "Disponibles", color: "#34d399" }] }}><ResponsiveContainer width="100%" height="100%"><BarChart data={analysisData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="total" name="Référencés" fill="#818cf8" radius={[5, 5, 0, 0]} /><Bar dataKey="available" name="Disponibles" fill="#34d399" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={Sparkles} title="Lecture décisionnelle" description="Ce que le périmètre permet de décider immédiatement."><div className="space-y-3 text-sm text-slate-600"><p><strong className="text-slate-950">Couverture :</strong> {published} élément(s) utilisable(s) sur {filteredRows.length}.</p><p><strong className="text-slate-950">Conformité :</strong> {mandatory} support(s) obligatoire(s) doivent disposer d’une version validée et publiée.</p><p><strong className="text-slate-950">Automatisation :</strong> {aiReady} élément(s) peuvent être produits ou contrôlés avec assistance IA et validation humaine.</p></div></HrSectionCard></div>}
    {tab === "alerts" && <HrSectionCard icon={ShieldCheck} title="Alertes documentaires" description="Écarts de publication et recommandations de maîtrise."><div className="grid gap-4 xl:grid-cols-3"><div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5"><p className="font-black text-rose-950">Fichiers manquants</p><p className="mt-2 text-sm text-rose-800">{config.agents ? 0 : filteredRows.filter((row) => !row.download_url).length} référence(s) ne disposent pas encore d’un fichier téléchargeable.</p></div><div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5"><p className="font-black text-amber-950">Supports obligatoires</p><p className="mt-2 text-sm text-amber-800">Vérifier la version, l’approbation et l’usage des {mandatory} support(s) obligatoires.</p></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"><p className="font-black text-emerald-950">Recommandation</p><p className="mt-2 text-sm text-emerald-800">Publier un seul modèle maître par usage, avec propriétaire, version, source et date de prochaine revue.</p></div></div></HrSectionCard>}
    {selected && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/25 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="max-h-[94vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{selected.code}</p><h2 className="mt-1 text-lg font-black text-slate-950">{selected.title || selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-rose-200 hover:text-rose-700"><X className="h-4 w-4" /></button></header><div className="space-y-5 p-5"><p className="text-sm leading-6 text-slate-600">{selected.description || "Description à compléter."}</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900"><strong>Module</strong><br />{selected.module_key || selected.domain || "Transverse"}</div><div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900"><strong>{config.agents ? "Autonomie" : "Phase"}</strong><br />{selected.autonomy_level || selected.phase || "Transverse"}</div><div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><strong>{config.agents ? "Déclenchement" : "Version"}</strong><br />{selected.trigger_type || selected.version || "—"}</div><div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Statut</strong><br />{frenchStatus(selected.status)}</div></div>{config.agents ? <><label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">Demande à préparer</span><textarea rows={5} value={assistantRequest} onChange={(event) => setAssistantRequest(event.target.value)} className={`${hrInputClassName} h-auto w-full py-2`} placeholder="Décrivez le résultat attendu, le périmètre, la période et les contraintes de validation…" /></label><div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs leading-5 text-indigo-900"><strong>Garde-fous :</strong> l’assistant prépare une proposition. Aucun envoi externe, paiement, clôture d’action ou décision irréversible n’est exécuté sans validation humaine.</div></> : <><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"><strong>Référence source :</strong> {selected.source_reference || "Référence interne ONEPILOT"}<br /><strong>Format :</strong> {text(selected.file_format).toUpperCase()} · <strong>Propriétaire :</strong> {selected.owner_name || "Non affecté"}</div>{selected.download_url ? <a href={selected.download_url} download={downloadName(selected)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Download className="h-4 w-4" />Télécharger le modèle</a> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Le référentiel est disponible, mais le fichier maître doit encore être publié par son propriétaire.</p>}</>}</div></section></div>}
  </div>;
}
