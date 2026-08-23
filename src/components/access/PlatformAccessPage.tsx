"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, KeyRound, LockKeyhole, Plus, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Users, X } from "lucide-react";

import {
  HrActionMenu,
  HrColumnFilterMenu,
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
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Params = { orgId: string };
type TabKey = "pilotage" | "analyses" | "alerts";
type ViewMode = "cards" | "table";

const supabase = createClient();

const modules = [
  { key: "pilotage", label: "Pilotage", submodules: ["Tableau de bord", "Rapports", "Objectifs", "Accès & partage"] },
  { key: "commerce", label: "Commerce", submodules: ["Clients", "Prospects", "Avant-vente", "Commandes", "Prévisions commerciales"] },
  { key: "projects", label: "Projets", submodules: ["Portefeuille projets", "Timeline globale", "Planification & Gantt", "Actions", "Performance projets"] },
  { key: "hr", label: "Ressources humaines", submodules: ["Vue d’ensemble RH", "Architecture RH", "Ressources", "Absences & congés", "Staffing & capacité", "Temps & activités", "Compétences", "Onboarding", "Entretiens & objectifs"] },
  { key: "quality", label: "Qualité & risques", submodules: ["Risques", "Non-conformités", "Audits", "Livrables", "Plans d’action"] },
  { key: "finance", label: "Finance", submodules: ["Budgets", "Production", "Facturation", "Encaissements", "Rentabilité"] },
  { key: "workspace", label: "Documents & outils", submodules: ["Documents", "Modèles", "Partages", "Automatisations"] },
] as const;

const accessLabels: Record<string, string> = { view: "Lecture", edit: "Modification", admin: "Administration" };
const moduleLabel = (key: string) => modules.find((module) => module.key === key)?.label || key;
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(value)) : "Sans limite";

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadAccess(orgId: string) {
  const organization = await resolveOrganization(orgId);
  const [employees, grants] = await Promise.all([
    (supabase.from("hr_employee_overview" as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("full_name"),
    (supabase.from("platform_access_grants" as never) as any).select("*").eq("organization_id", organization.id).order("created_at", { ascending: false }),
  ]);
  if (employees.error) throw new Error(employees.error.message);
  if (grants.error) throw new Error(grants.error.message);
  return { organization, employees: employees.data || [], grants: grants.data || [] };
}

export default function PlatformAccessPage({ params }: { params: Promise<Params> }) {
  const { orgId } = use(params);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["platform-access", orgId], queryFn: () => loadAccess(orgId) });
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [moduleKey, setModuleKey] = useState("projects");
  const [submodules, setSubmodules] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState("view");
  const [canExport, setCanExport] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [expiryCutoff] = useState(() => Date.now() + 30 * 86400000);

  const data = query.data;
  const employeeMap = useMemo(() => new Map((data?.employees || []).map((row: AnyRow) => [String(row.id), row])), [data?.employees]);
  const activeRows = useMemo(() => (data?.grants || []).filter((row: AnyRow) => !row.archived_at), [data?.grants]);

  const displayName = (row: AnyRow) => {
    const employee = employeeMap.get(String(row.employee_id)) as AnyRow | undefined;
    return employee?.full_name || row.external_name || row.external_email || "Utilisateur non renseigné";
  };
  const displayEmail = (row: AnyRow) => {
    const employee = employeeMap.get(String(row.employee_id)) as AnyRow | undefined;
    return employee?.professional_email || employee?.email || row.external_email || "—";
  };
  const valuesFor = (key: string) => activeRows.map((row: AnyRow) => key === "name" ? displayName(row) : key === "module" ? moduleLabel(row.module_key) : key === "access" ? accessLabels[row.access_level] : key === "status" ? (row.status === "suspended" ? "Suspendu" : "Actif") : String(row[key] || "—"));
  const visibleRows = activeRows.filter((row: AnyRow) => {
    const haystack = `${displayName(row)} ${displayEmail(row)} ${moduleLabel(row.module_key)} ${(row.submodule_keys || []).join(" ")} ${accessLabels[row.access_level]}`.toLocaleLowerCase("fr");
    const columnValues: Record<string, string> = { name: displayName(row), email: displayEmail(row), module: moduleLabel(row.module_key), access: accessLabels[row.access_level], status: row.status === "suspended" ? "Suspendu" : "Actif" };
    return (!search || haystack.includes(search.toLocaleLowerCase("fr")))
      && (!moduleFilter || row.module_key === moduleFilter)
      && (!accessFilter || row.access_level === accessFilter)
      && Object.entries(columnFilters).every(([key, selectedValues]) => !selectedValues.length || selectedValues.includes(columnValues[key] || String(row[key] || "—")));
  });
  const filtersActive = Boolean(search || moduleFilter || accessFilter || Object.values(columnFilters).some((values) => values.length));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId && !externalEmail.trim()) throw new Error("Sélectionnez une ressource ou renseignez un e-mail externe.");
      const payload = {
        organization_id: data!.organization.id,
        employee_id: employeeId || null,
        external_name: externalName.trim() || null,
        external_email: externalEmail.trim().toLocaleLowerCase("fr") || null,
        module_key: moduleKey,
        submodule_keys: submodules,
        access_level: accessLevel,
        can_export: canExport,
        can_share: canShare,
        ends_at: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null,
        archived_at: null,
        updated_at: new Date().toISOString(),
      };
      const result = editingId
        ? await (supabase.from("platform_access_grants" as never) as any).update(payload).eq("organization_id", data!.organization.id).eq("id", editingId)
        : await (supabase.from("platform_access_grants" as never) as any).insert(payload);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: async () => { setFormOpen(false); resetForm(); await client.invalidateQueries({ queryKey: ["platform-access", orgId] }); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer l’accès."),
  });

  const archiveMutation = useMutation({
    mutationFn: async (row: AnyRow) => {
      const result = await (supabase.from("platform_access_grants" as never) as any).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", data!.organization.id).eq("id", row.id);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: async () => client.invalidateQueries({ queryKey: ["platform-access", orgId] }),
  });

  function resetForm() {
    setEditingId(null); setEmployeeId(""); setExternalName(""); setExternalEmail(""); setModuleKey("projects"); setSubmodules([]); setAccessLevel("view"); setCanExport(false); setCanShare(false); setEndsAt(""); setError("");
  }
  function openEdit(row: AnyRow) {
    setEditingId(row.id); setEmployeeId(row.employee_id || ""); setExternalName(row.external_name || ""); setExternalEmail(row.external_email || ""); setModuleKey(row.module_key); setSubmodules(row.submodule_keys || []); setAccessLevel(row.access_level); setCanExport(Boolean(row.can_export)); setCanShare(Boolean(row.can_share)); setEndsAt(row.ends_at ? String(row.ends_at).slice(0, 10) : ""); setError(""); setFormOpen(true);
  }
  const resetFilters = () => { setSearch(""); setModuleFilter(""); setAccessFilter(""); setColumnFilters({}); };
  const availableSubmodules = modules.find((module) => module.key === moduleKey)?.submodules || [];
  const exportColumns: ExportColumn<AnyRow>[] = [
    { key: "name", label: "Utilisateur", value: displayName },
    { key: "email", label: "E-mail", value: displayEmail },
    { key: "module", label: "Module", value: (row) => moduleLabel(row.module_key) },
    { key: "submodules", label: "Sous-modules", value: (row) => (row.submodule_keys || []).join(", ") },
    { key: "access", label: "Niveau d’accès", value: (row) => accessLabels[row.access_level] },
    { key: "export", label: "Export autorisé", value: (row) => row.can_export ? "Oui" : "Non" },
    { key: "share", label: "Partage autorisé", value: (row) => row.can_share ? "Oui" : "Non" },
    { key: "start", label: "Début", value: (row) => formatDate(row.starts_at) },
    { key: "end", label: "Fin", value: (row) => formatDate(row.ends_at) },
    { key: "status", label: "Statut", value: (row) => row.status === "suspended" ? "Suspendu" : "Actif" },
  ];

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Chargement des accès…</div>;
  if (query.error || !data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger les accès : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  const externalCount = activeRows.filter((row: AnyRow) => !row.employee_id).length;
  const adminCount = activeRows.filter((row: AnyRow) => row.access_level === "admin").length;
  const expiringCount = activeRows.filter((row: AnyRow) => row.ends_at && new Date(row.ends_at).getTime() <= expiryCutoff).length;
  const alerts = [
    { label: "Accès administrateur", count: adminCount, impact: "Droits étendus à contrôler régulièrement.", action: "Valider le besoin, le périmètre et le propriétaire de chaque droit.", accent: "amber" as const },
    { label: "Échéances sous 30 jours", count: expiringCount, impact: "Des accès peuvent interrompre une collaboration en cours.", action: "Renouveler ou clôturer avec justification avant l’échéance.", accent: "rose" as const },
    { label: "Accès externes", count: externalCount, impact: "Partages hors annuaire interne à surveiller.", action: "Contrôler identité, confidentialité, durée et sous-modules autorisés.", accent: "sky" as const },
    { label: "Droits de partage", count: activeRows.filter((row: AnyRow) => row.can_share).length, impact: "Capacité de redistribuer des informations.", action: "Limiter le partage aux responsables habilités et l’auditer.", accent: "indigo" as const },
  ];
  const tabs: Array<{ key: TabKey; label: string; color: string }> = [
    { key: "pilotage", label: "Pilotage", color: "bg-indigo-600 text-white" },
    { key: "analyses", label: "Analyses", color: "bg-violet-600 text-white" },
    { key: "alerts", label: "Alertes", color: "bg-emerald-600 text-white" },
  ];

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title="Accès & partage" subtitle="Administrer les droits par module et sous-module, pour les ressources internes comme pour les collaborateurs externes." actions={<><DataExportMenu data={visibleRows} columns={exportColumns} fileName="onepilot_acces_partage" sheetName="Accès" disabled={!visibleRows.length} /><button type="button" onClick={() => { resetForm(); setFormOpen(true); }} className={hrSaveButtonClassName}><Plus className="h-4 w-4" />Nouvel accès</button></>} />
    <PageTutorial title="Guide de la page" description={"Définir qui peut consulter, modifier, administrer, exporter ou partager chaque module et sous-module de l’organisation.\nConserver une expérience autonome lorsque RH, Commerce ou Projets n’est pas souscrit, avec identité externe, durée, preuve et traçabilité."} objectives={["Appliquer le moindre privilège sans bloquer le travail transverse.", "Centraliser les droits qui étaient auparavant dispersés dans les objets métier."]} steps={[{ title: "Identifier", description: "Choisir une ressource ONEPILOT ou un collaborateur externe." }, { title: "Cadrer", description: "Définir module, sous-modules, niveau, export, partage et échéance." }, { title: "Contrôler", description: "Réviser les droits sensibles, expirants et externes dans les alertes." }]} analyses={[{ title: "Analyse des habilitations", description: "Comparer volumes par module, niveau d’accès, origine et échéance." }]} recommendations={["Réserver l’administration aux propriétaires de données.", "Limiter les accès externes dans le temps.", "Révoquer immédiatement les droits devenus inutiles."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Users} label="Accès actifs" value={activeRows.length} description="Autorisations non archivées sur l’ensemble des modules." accent="indigo" /><HrMetricCard icon={ShieldCheck} label="Modules couverts" value={new Set(activeRows.map((row: AnyRow) => row.module_key)).size} description="Modules disposant d’au moins une habilitation explicite." accent="emerald" /><HrMetricCard icon={LockKeyhole} label="Administrateurs" value={adminCount} description="Droits d’administration à réviser périodiquement." accent="amber" /><HrMetricCard icon={ShieldAlert} label="À échéance" value={expiringCount} description="Autorisations arrivant à échéance sous trente jours." accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="Recherchez un utilisateur puis filtrez les modules et niveaux d’accès.">
      <div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder="Rechercher un utilisateur, un e-mail, un module ou un sous-module…" /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className={hrSelectClassName}><option value="">Tous les modules</option>{modules.map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}</select><select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)} className={hrSelectClassName}><option value="">Tous les niveaux</option><option value="view">Lecture</option><option value="edit">Modification</option><option value="admin">Administration</option></select><div className="xl:col-span-2 flex items-center justify-end"><HrStatusBadge status="planned" label={`${visibleRows.length} résultat(s) sur ${activeRows.length}`} /></div></div>{filtersActive && <HrResetFilters onReset={resetFilters} />}</div>
    </HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-4 text-sm font-bold ${tab === item.key ? item.color : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>

    {tab === "pilotage" && <HrSectionCard icon={KeyRound} title="Habilitations centralisées" description="Cartes et tableau utilisent le même périmètre et la même source Supabase." right={<div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setViewMode("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${viewMode === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setViewMode("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div>}>
      {viewMode === "cards" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleRows.map((row: AnyRow) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-950">{displayName(row)}</p><p className="mt-1 text-xs text-slate-500">{displayEmail(row)}</p></div><HrActionMenu labels={{ view: "Voir l’accès", edit: "Modifier l’accès", archive: "Révoquer l’accès", restore: "Réactiver l’accès" }} onView={() => setSelected(row)} onEdit={() => openEdit(row)} onArchive={() => archiveMutation.mutateAsync(row)} /></div><div className="mt-4 flex flex-wrap gap-2"><HrStatusBadge status="planned" label={moduleLabel(row.module_key)} /><HrStatusBadge status={row.access_level === "admin" ? "completed" : row.access_level === "edit" ? "in_progress" : "planned"} label={accessLabels[row.access_level]} /><HrStatusBadge status={row.status === "suspended" ? "blocked" : "completed"} label={row.status === "suspended" ? "Suspendu" : "Actif"} /></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{(row.submodule_keys || []).length ? row.submodule_keys.join(" · ") : "Tous les sous-modules"}</p><p className="mt-3 text-[11px] font-semibold text-slate-500">Fin : {formatDate(row.ends_at)}</p></article>)}</div> : <div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200"><table className={`${hrTableClassName} min-w-[1500px]`}><thead className={hrTableHeaderClassName}><tr>{[
        ["name", "Utilisateur"], ["email", "E-mail"], ["module", "Module"], ["submodule", "Sous-modules"], ["access", "Droit"], ["status", "Statut"],
      ].map(([key, label], index) => <th key={key} className={index === 0 ? "sticky left-0 z-30 bg-sky-50 text-left" : "text-left"}><HrColumnFilterMenu label={label} values={valuesFor(key)} selected={columnFilters[key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [key]: values }))} /></th>)}<th>Export</th><th>Partage</th><th>Fin</th><th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{visibleRows.map((row: AnyRow) => <tr key={row.id} className="hover:bg-indigo-50/35"><td className="sticky left-0 z-10 bg-white font-bold text-indigo-700">{displayName(row)}</td><td>{displayEmail(row)}</td><td><HrStatusBadge status="planned" label={moduleLabel(row.module_key)} /></td><td className="max-w-80 whitespace-normal">{(row.submodule_keys || []).join(", ") || "Tous"}</td><td><HrStatusBadge status={row.access_level === "admin" ? "completed" : row.access_level === "edit" ? "in_progress" : "planned"} label={accessLabels[row.access_level]} /></td><td><HrStatusBadge status={row.status === "suspended" ? "blocked" : "completed"} label={row.status === "suspended" ? "Suspendu" : "Actif"} /></td><td>{row.can_export ? "Oui" : "Non"}</td><td>{row.can_share ? "Oui" : "Non"}</td><td>{formatDate(row.ends_at)}</td><td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: "Voir l’accès", edit: "Modifier l’accès", archive: "Révoquer l’accès", restore: "Réactiver l’accès" }} onView={() => setSelected(row)} onEdit={() => openEdit(row)} onArchive={() => archiveMutation.mutateAsync(row)} /></td></tr>)}</tbody></table></div>}
      {!visibleRows.length && <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">Aucun accès dans ce périmètre.</p>}
    </HrSectionCard>}

    {tab === "analyses" && <HrSectionCard icon={BarChart3} title="Analyse des habilitations" description="Répartition des accès par module et par niveau pour cibler les revues de droits."><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-3">{modules.map((module) => { const count = activeRows.filter((row: AnyRow) => row.module_key === module.key).length; const ratio = activeRows.length ? count / activeRows.length * 100 : 0; return <div key={module.key}><div className="mb-1 flex justify-between text-xs font-bold text-slate-600"><span>{module.label}</span><span>{count}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${ratio}%` }} /></div></div>; })}</div><div className="grid gap-3 sm:grid-cols-3">{["view", "edit", "admin"].map((level, index) => <article key={level} className={`rounded-2xl border p-4 ${index === 0 ? "border-sky-100 bg-sky-50" : index === 1 ? "border-amber-100 bg-amber-50" : "border-emerald-100 bg-emerald-50"}`}><p className="text-xs font-black uppercase text-slate-500">{accessLabels[level]}</p><p className="mt-2 text-3xl font-black text-slate-950">{activeRows.filter((row: AnyRow) => row.access_level === level).length}</p></article>)}</div></div></HrSectionCard>}
    {tab === "alerts" && <ProjectAlertsPanel title="Alertes d’accès et de partage" description="Synthèse des droits sensibles, temporaires et externes nécessitant une décision." items={alerts} />}

    {formOpen && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) { setFormOpen(false); resetForm(); } }}><section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div><h2 className="text-lg font-black text-slate-950">{editingId ? "Modifier l’accès" : "Nouvel accès"}</h2><p className="mt-1 text-xs text-slate-500">Droit transverse par module, sous-module, action sensible et durée.</p></div><button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-700"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><div className="grid gap-4 md:grid-cols-2"><label><span className="text-xs font-bold text-slate-600">Ressource ONEPILOT</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Collaborateur externe ou module RH absent</option>{data.employees.map((employee: AnyRow) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600">Nom externe</span><input value={externalName} onChange={(event) => setExternalName(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">E-mail externe</span><input type="email" value={externalEmail} onChange={(event) => setExternalEmail(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">Module</span><select value={moduleKey} onChange={(event) => { setModuleKey(event.target.value); setSubmodules([]); }} className={`${hrSelectClassName} mt-1 w-full`}>{modules.map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600">Niveau d’accès</span><select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="view">Lecture</option><option value="edit">Modification</option><option value="admin">Administration</option></select></label><label><span className="text-xs font-bold text-slate-600">Fin de validité</span><input type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label></div><div><p className="text-xs font-bold text-slate-600">Sous-modules autorisés</p><div className="mt-2 flex flex-wrap gap-2">{availableSubmodules.map((submodule) => <label key={submodule} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${submodules.includes(submodule) ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}><input type="checkbox" checked={submodules.includes(submodule)} onChange={() => setSubmodules((current) => current.includes(submodule) ? current.filter((value) => value !== submodule) : [...current, submodule])} className="sr-only" />{submodule}</label>)}</div></div><div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={canExport} onChange={(event) => setCanExport(event.target.checked)} />Autoriser l’export</label><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={canShare} onChange={(event) => setCanShare(event.target.checked)} />Autoriser le partage</label></div>{error && <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => { setFormOpen(false); resetForm(); }} className={hrCancelButtonClassName}>Annuler</button><button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className={hrSaveButtonClassName}>{saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}</button></div></div></section></div>}
    {selected && <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-950">Détail de l’accès</h2><button type="button" onClick={() => setSelected(null)} className={hrCancelButtonClassName}>Fermer</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Utilisateur" value={displayName(selected)} /><Info label="E-mail" value={displayEmail(selected)} /><Info label="Module" value={moduleLabel(selected.module_key)} /><Info label="Niveau" value={accessLabels[selected.access_level]} /><Info label="Sous-modules" value={(selected.submodule_keys || []).join(", ") || "Tous"} /><Info label="Validité" value={`${formatDate(selected.starts_at)} → ${formatDate(selected.ends_at)}`} /><Info label="Export" value={selected.can_export ? "Autorisé" : "Interdit"} /><Info label="Partage" value={selected.can_share ? "Autorisé" : "Interdit"} /></div></section></div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}
