"use client";

import { use, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BarChart3, Building2, CreditCard, Database, KeyRound, Search, Settings, ShieldAlert, ShieldCheck, SlidersHorizontal, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  HrActionMenu,
  HrChartCard,
  HrColumnFilterMenu,
  HrInfo,
  HrMetricCard,
  HrResetFilters,
  HrSectionCard,
  HrStatusBadge,
  hrCancelButtonClassName,
  hrInputClassName,
  hrSaveButtonClassName,
  hrSelectClassName,
  hrTableClassName,
  hrTableHeaderClassName,
} from "@/components/hr/HrReferenceUi";
import { ProjectAlertsPanel } from "@/components/projects/ProjectReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Mode = "overview" | "organizations" | "users" | "subscriptions" | "security" | "settings";
type TabKey = "pilotage" | "analyses" | "alerts";
type Column = { key: string; label: string; value: (row: AnyRow) => ReactNode; raw?: (row: AnyRow) => unknown };

const supabase = createClient();
const date = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(String(value))) : "—";
const display = (value: ReactNode) => typeof value === "string" || typeof value === "number" ? String(value) : "—";

const definitions: Record<Mode, { title: string; subtitle: string; singular: string; icon: typeof Users }> = {
  overview: { title: "Administration plateforme", subtitle: "Superviser organisations, utilisateurs, abonnements, sécurité et qualité des données.", singular: "élément", icon: ShieldCheck },
  organizations: { title: "Organisations", subtitle: "Administrer les tenants, leur statut, leur offre et leur cycle de vie sans mélange de données.", singular: "organisation", icon: Building2 },
  users: { title: "Utilisateurs & rôles", subtitle: "Piloter les identités, rôles, statuts et rattachements organisationnels.", singular: "utilisateur", icon: Users },
  subscriptions: { title: "Offres & abonnements", subtitle: "Contrôler les plans, statuts, renouvellements et droits associés aux organisations.", singular: "abonnement", icon: CreditCard },
  security: { title: "Sécurité & audit", subtitle: "Analyser les événements sensibles, changements de droits et opérations d’administration.", singular: "événement", icon: ShieldAlert },
  settings: { title: "Paramétrage plateforme", subtitle: "Centraliser les paramètres communs, modules activés et règles de gouvernance.", singular: "paramètre", icon: Settings },
};

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("*");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadAdministration(orgId: string, mode: Mode) {
  const organization = await resolveOrganization(orgId);
  const table = (name: string) => (supabase.from(name as never) as any).select("*").eq("organization_id", organization.id);
  const [membersResult, auditResult, accessResult] = await Promise.all([
    table("organization_members").order("created_at", { ascending: false }),
    table("hr_audit_logs").order("created_at", { ascending: false }).limit(1000),
    table("platform_access_grants").is("archived_at", null).order("created_at", { ascending: false }),
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (auditResult.error) throw new Error(auditResult.error.message);
  if (accessResult.error) throw new Error(accessResult.error.message);
  let organizations: AnyRow[] = [organization];
  if (mode === "organizations") {
    const result = await (supabase.from("organizations" as never) as any).select("*").order("created_at", { ascending: false });
    if (result.error) throw new Error(result.error.message);
    organizations = result.data || [];
  }
  const memberships: AnyRow[] = membersResult.data || [];
  const memberIds = memberships.map((row) => row.user_id).filter(Boolean);
  let profiles: AnyRow[] = [];
  if (memberIds.length) {
    const profilesResult = await (supabase.from("profiles" as never) as any)
      .select("*")
      .in("id", memberIds)
      .order("created_at", { ascending: false });
    if (profilesResult.error) throw new Error(profilesResult.error.message);
    const roleByUser = new Map(memberships.map((membership) => [membership.user_id, membership.role]));
    profiles = (profilesResult.data || []).map((profile: AnyRow) => ({
      ...profile,
      name: profile.full_name,
      organization_role: roleByUser.get(profile.id),
      role: roleByUser.get(profile.id) || profile.role,
      status: "ACTIVE",
    }));
  }
  const audits: AnyRow[] = auditResult.data || [];
  const accesses: AnyRow[] = accessResult.data || [];
  const settings = [
    { id: "tenant", organization_id: organization.id, category: "Organisation", name: "Tenant courant", value: organization.name || organization.slug, status: "Actif", updated_at: organization.updated_at || organization.created_at },
    { id: "modules", organization_id: organization.id, category: "Modules", name: "Modules explicitement partagés", value: new Set(accesses.map((row) => row.module_key)).size, status: "Actif", updated_at: accesses[0]?.updated_at },
    { id: "permissions", organization_id: organization.id, category: "Sécurité", name: "Autorisations actives", value: accesses.length, status: "Actif", updated_at: accesses[0]?.updated_at },
  ];
  const rows = mode === "organizations" ? organizations : mode === "security" ? audits : mode === "settings" ? settings : profiles;
  return { organization, organizations, profiles, audits, accesses, rows };
}

function tone(value: unknown) {
  const key = String(value || "").toLocaleLowerCase("fr");
  if (["active", "actif", "enabled", "paid", "valid"].some((value) => key.includes(value))) return "completed";
  if (["pending", "trial", "attente", "invited"].some((value) => key.includes(value))) return "in_progress";
  if (["blocked", "suspended", "inactive", "error", "failed"].some((value) => key.includes(value))) return "blocked";
  return "planned";
}

export default function AdministrationModulePage({ params, mode }: { params: Promise<{ orgId: string }>; mode: Mode }) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();
  const page = definitions[mode];
  const query = useQuery({ queryKey: ["administration-reference", mode, orgId], queryFn: () => loadAdministration(orgId, mode) });
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "", plan: "", status: "" });
  const tableRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = query.data?.rows || [];

  const columns: Column[] = useMemo(() => mode === "organizations" ? [
    { key: "name", label: "Organisation", value: (row) => row.name || "—" }, { key: "slug", label: "Identifiant", value: (row) => row.slug || "—" }, { key: "plan", label: "Offre", value: (row) => row.plan || row.subscription_plan || "Non renseignée" }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status={tone(row.status || "active")} label={row.status || "Actif"} />, raw: (row) => row.status || "Actif" }, { key: "date", label: "Création", value: (row) => date(row.created_at) },
  ] : mode === "security" ? [
    { key: "date", label: "Date", value: (row) => date(row.created_at) }, { key: "user", label: "Utilisateur", value: (row) => row.user_email || row.actor_email || row.actor_user_id || "Système" }, { key: "action", label: "Action", value: (row) => row.action || "Événement" }, { key: "details", label: "Détail", value: (row) => row.details || row.reason || "—" }, { key: "status", label: "Niveau", value: (row) => <HrStatusBadge status={String(row.action || "").includes("ERROR") ? "blocked" : "planned"} label={String(row.action || "").includes("ERROR") ? "Alerte" : "Information"} />, raw: (row) => String(row.action || "").includes("ERROR") ? "Alerte" : "Information" },
  ] : mode === "settings" ? [
    { key: "category", label: "Catégorie", value: (row) => row.category }, { key: "name", label: "Paramètre", value: (row) => row.name }, { key: "value", label: "Valeur", value: (row) => String(row.value ?? "—") }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status="completed" label={row.status} />, raw: (row) => row.status }, { key: "date", label: "Mise à jour", value: (row) => date(row.updated_at) },
  ] : [
    { key: "name", label: "Utilisateur", value: (row) => row.name || row.full_name || "Non renseigné" }, { key: "email", label: "E-mail", value: (row) => row.email || "—" }, { key: "role", label: "Rôle", value: (row) => row.role || "Collaborateur" }, { key: "plan", label: "Offre", value: (row) => row.plan || row.subscription_plan || "Non renseignée" }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status={tone(row.status || "active")} label={row.status || "Actif"} />, raw: (row) => row.status || "Actif" }, { key: "date", label: "Dernière activité", value: (row) => date(row.last_sign_in_at || row.updated_at || row.created_at) },
  ], [mode]);

  const valueFor = (row: AnyRow, column: Column) => String(column.raw ? column.raw(row) ?? "—" : display(column.value(row)));
  const statuses = [...new Set(rows.map((row) => String(row.status || "Actif")))].sort((a, b) => a.localeCompare(b, "fr"));
  const visibleRows = rows.filter((row) => { const haystack = columns.map((column) => valueFor(row, column)).join(" ").toLocaleLowerCase("fr"); return (!search || haystack.includes(search.toLocaleLowerCase("fr"))) && (!status || String(row.status || "Actif") === status) && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(valueFor(row, column))); });
  const filtersActive = Boolean(search || status || Object.values(columnFilters).some((values) => values.length));
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column) => ({ key: column.key, label: column.label, value: (row) => valueFor(row, column) }));
  const activeCount = rows.filter((row) => tone(row.status || "active") === "completed").length;
  const sensitiveCount = query.data?.accesses.filter((row) => row.access_level === "admin" || row.can_share).length || 0;
  const externalCount = query.data?.accesses.filter((row) => !row.employee_id && row.external_email).length || 0;
  const analysis = useMemo(() => { const map = new Map<string, number>(); rows.forEach((row) => { const key = mode === "security" ? String(row.action || "Autre") : String(row.role || row.plan || row.subscription_plan || row.status || "Non renseigné"); map.set(key, (map.get(key) || 0) + 1); }); return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 12); }, [mode, rows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const payload = mode === "organizations"
        ? { name: form.name }
        : { full_name: form.name, email: form.email, role: form.role };
      const tableName = mode === "organizations" ? "organizations" : "profiles";
      const result = await (supabase.from(tableName as never) as any).update(payload).eq("id", selected.id);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: async () => { setEditing(false); setSelected(null); await queryClient.invalidateQueries({ queryKey: ["administration-reference", mode, orgId] }); },
  });
  const openEdit = (row: AnyRow) => { setSelected(row); setForm({ name: row.name || row.full_name || "", email: row.email || "", role: row.role || "collaborator", plan: row.plan || row.subscription_plan || "", status: row.status || "ACTIVE" }); setEditing(true); };

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Chargement de l’administration…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger l’administration : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  const tabs: Array<{ key: TabKey; label: string; active: string }> = [{ key: "pilotage", label: "Pilotage", active: "bg-indigo-600 text-white" }, { key: "analyses", label: "Analyses", active: "bg-violet-600 text-white" }, { key: "alerts", label: "Alertes", active: "bg-emerald-600 text-white" }];
  const alerts = [
    { label: "Droits sensibles", count: sensitiveCount, impact: "Administration ou partage étendu de données.", action: "Réviser le propriétaire, le besoin et la durée de chaque habilitation.", accent: "rose" as const },
    { label: "Accès externes", count: externalCount, impact: "Partage hors annuaire interne à contrôler.", action: "Vérifier identité, confidentialité, périmètre et échéance.", accent: "amber" as const },
    { label: "Profils incomplets", count: query.data.profiles.filter((row) => !row.email || !row.role).length, impact: "Rôles et communication non fiables.", action: "Compléter l’e-mail, le rôle et le rattachement organisationnel.", accent: "sky" as const },
    { label: "Événements audités", count: query.data.audits.length, impact: "Traçabilité des opérations sensibles disponible.", action: "Analyser les événements anormaux et clôturer les investigations.", accent: "indigo" as const },
  ];
  const Icon = page.icon;

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title={page.title} subtitle={page.subtitle} actions={<DataExportMenu data={visibleRows} columns={exportColumns} fileName={`onepilot_admin_${mode}`} sheetName={page.title} disabled={!visibleRows.length} />} />
    <PageTutorial title="Guide de la page" description={`Administrer ${page.title.toLocaleLowerCase("fr")} dans un périmètre multi-tenant, audité et cohérent avec les autres modules.\nContrôler les droits, la qualité des identités, les offres souscrites et les opérations sensibles sans exposer les données d’une autre organisation.`} objectives={["Sécuriser les identités, rôles et habilitations.", "Garantir la traçabilité et la cohérence des paramètres plateforme."]} steps={[{ title: "Contrôler", description: "Filtrer les objets, vérifier leur statut et leur propriétaire." }, { title: "Analyser", description: "Comparer volumes, répartitions et anomalies." }, { title: "Corriger", description: "Mettre à jour avec justification puis vérifier l’audit." }]} analyses={[{ title: "Gouvernance", description: "Toutes les vues utilisent les données Supabase autorisées par les politiques de sécurité." }]} recommendations={["Appliquer le moindre privilège.", "Limiter dans le temps les accès externes.", "Auditer toute modification sensible."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Icon} label="Éléments du périmètre" value={visibleRows.length} description="Objets visibles selon les filtres et les droits." accent="indigo" /><HrMetricCard icon={Activity} label="Actifs" value={activeCount} description="Objets actifs ou validés dans le périmètre." accent="emerald" /><HrMetricCard icon={KeyRound} label="Droits sensibles" value={sensitiveCount} description="Autorisations d’administration ou de partage." accent="amber" /><HrMetricCard icon={ShieldAlert} label="Accès externes" value={externalCount} description="Collaborateurs hors annuaire interne." accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="Recherche et filtres pilotent cartes, tableau, analyses, alertes et export."><div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder={`Rechercher dans ${page.title.toLocaleLowerCase("fr")}…`} /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={status} onChange={(event) => setStatus(event.target.value)} className={hrSelectClassName}><option value="">Tous les statuts</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><div className="xl:col-span-3 flex items-center justify-end"><HrStatusBadge status="planned" label={`${visibleRows.length} résultat(s) sur ${rows.length}`} /></div></div>{filtersActive && <HrResetFilters onReset={() => { setSearch(""); setStatus(""); setColumnFilters({}); }} />}</div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-4 text-sm font-bold ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>
    {tab === "pilotage" && <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-950">Pilotage de {page.title.toLocaleLowerCase("fr")}</h2><p className="mt-1 text-xs text-slate-500">Cartes et tableau utilisent la même source autorisée.</p></div></div><div className="flex items-center gap-2"><ProjectVisualActions targetRef={tableRef} fileName={`onepilot_admin_${mode}`} label={`le pilotage ${page.title}`} /><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div></div></div>{view === "cards" ? <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{visibleRows.map((row) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950">{valueFor(row, columns[0])}</h3><p className="mt-1 text-xs text-slate-500">{valueFor(row, columns[1] || columns[0])}</p></div><HrActionMenu labels={{ view: `Voir ${page.singular}`, edit: `Modifier ${page.singular}`, archive: `Archiver ${page.singular}`, restore: `Réactiver ${page.singular}` }} onView={() => setSelected(row)} onEdit={mode === "security" || mode === "settings" ? undefined : () => openEdit(row)} /></div><div className="mt-4 grid grid-cols-2 gap-2">{columns.slice(2, 6).map((column) => <HrInfo key={column.key} label={column.label} value={column.value(row)} />)}</div></article>)}</div> : <div data-visual-scroll className="max-h-[334px] overflow-auto"><table className={`${hrTableClassName} min-w-[1350px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={index === 0 ? "sticky left-0 z-30 bg-sky-50 text-left" : "text-left"}><HrColumnFilterMenu label={column.label} values={rows.map((row) => valueFor(row, column))} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{columns.map((column, index) => <td key={column.key} className={index === 0 ? "sticky left-0 z-10 bg-white font-bold text-indigo-700" : "font-normal"}>{column.value(row)}</td>)}<td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: `Voir ${page.singular}`, edit: `Modifier ${page.singular}`, archive: `Archiver ${page.singular}`, restore: `Réactiver ${page.singular}` }} onView={() => setSelected(row)} onEdit={mode === "security" || mode === "settings" ? undefined : () => openEdit(row)} /></td></tr>)}</tbody></table></div>}</section>}
    {tab === "analyses" && <div className="space-y-5"><HrChartCard title={`Répartition — ${page.title}`} description="Volume par rôle, offre, statut ou type d’événement selon la page." exportConfig={{ type: "bar", data: analysis, nameKey: "label", series: [{ key: "count", label: "Volume", color: "#818cf8" }] }}><ResponsiveContainer width="100%" height={300}><BarChart data={analysis}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} /><YAxis /><Tooltip /><Legend /><Bar dataKey="count" name="Volume" fill="#818cf8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={Database} title="Synthèse de gouvernance" description="Volumes, droits sensibles, accès externes et traçabilité disponible."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Éléments" value={rows.length} accent="indigo" /><HrInfo label="Actifs" value={activeCount} accent="emerald" /><HrInfo label="Droits sensibles" value={sensitiveCount} accent="amber" /><HrInfo label="Événements audités" value={query.data.audits.length} accent="rose" /></div></HrSectionCard></div>}
    {tab === "alerts" && <ProjectAlertsPanel title="Alertes d’administration" description="Accès sensibles, identités incomplètes et événements à contrôler." items={alerts} />}
    {selected && !editing && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Détail — {page.singular}</h2><p className="mt-1 text-xs text-slate-500">Données autorisées et traçables du périmètre courant.</p></div><button type="button" onClick={() => setSelected(null)} className={hrCancelButtonClassName}>Fermer</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{columns.map((column) => <HrInfo key={column.key} label={column.label} value={column.value(selected)} />)}</div></section></div>}
    {editing && selected && <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) { setEditing(false); setSelected(null); } }}><section className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div><h2 className="text-lg font-black text-slate-950">Modifier {page.singular}</h2><p className="mt-1 text-xs text-slate-500">Les modifications restent limitées au tenant et sont auditables.</p></div><button type="button" onClick={() => { setEditing(false); setSelected(null); }} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-700"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label><span className="text-xs font-bold text-slate-600">Nom</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={`${hrInputClassName} mt-1 w-full`} /></label>{mode !== "organizations" && <label><span className="text-xs font-bold text-slate-600">E-mail</span><input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={`${hrInputClassName} mt-1 w-full`} /></label>}{mode !== "organizations" && <label><span className="text-xs font-bold text-slate-600">Rôle</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className={`${hrSelectClassName} mt-1 w-full`}><option value="reader">Lecteur</option><option value="collaborator">Collaborateur</option><option value="manager">Manager</option><option value="direction">Direction</option><option value="admin">Administrateur</option><option value="super_admin">Super administrateur</option></select></label>}{mode !== "organizations" && <label><span className="text-xs font-bold text-slate-600">Offre</span><input value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} className={`${hrInputClassName} mt-1 w-full`} /></label>}<label><span className="text-xs font-bold text-slate-600">Statut</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={`${hrSelectClassName} mt-1 w-full`}><option value="ACTIVE">Actif</option><option value="PENDING">En attente</option><option value="SUSPENDED">Suspendu</option><option value="INACTIVE">Inactif</option></select></label></div><div className="flex justify-end gap-3 border-t border-slate-200 p-5"><button type="button" onClick={() => { setEditing(false); setSelected(null); }} className={hrCancelButtonClassName}>Annuler</button><button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className={hrSaveButtonClassName}>{saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}</button></div></section></div>}
  </div>;
}
