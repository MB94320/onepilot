"use client";

import {
  use,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FolderKanban,
  Gauge,
  GitBranch,
  History,
  Lightbulb,
  ListChecks,
  Network,
  Plus,
  Route,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from "lucide-react";

import {
  HrActionMenu,
  HrInfo,
  HrMetricCard,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSelectClassName,
} from "@/components/hr/HrReferenceUi";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";
import ProjectAnalyticsPanel from "@/components/projects/ProjectAnalyticsPanel";
import ProjectGanttBoard from "@/components/projects/ProjectGanttBoard";
import ProjectTimelineBoard from "@/components/projects/ProjectTimelineBoard";

const supabase = createClient();

type AnyRow = Record<string, any>;
type PageParams = { orgId: string };
export type ProjectPageMode = "portfolio" | "timeline" | "gantt" | "actions" | "performance";
type TabKey = "pilotage" | "analyses" | "alerts" | "summary" | "history";
type ViewMode = "cards" | "table";

type ProjectData = {
  organization: AnyRow;
  projects: AnyRow[];
  portfolios: AnyRow[];
  programs: AnyRow[];
  clients: AnyRow[];
  employees: AnyRow[];
  workPackages: AnyRow[];
  tasks: AnyRow[];
  staffingAssignments: AnyRow[];
  taskAssignments: AnyRow[];
  milestones: AnyRow[];
  dependencies: AnyRow[];
  actions: AnyRow[];
  health: AnyRow[];
  deliverables: AnyRow[];
  risks: AnyRow[];
  skillRequirements: AnyRow[];
  financials: AnyRow[];
  satisfaction: AnyRow[];
  commerceLinks: AnyRow[];
  audit: AnyRow[];
};

const config: Record<ProjectPageMode, {
  title: string;
  subtitle: string;
  guide: string;
  entity: string;
  icon: ComponentType<{ className?: string }>;
}> = {
  portfolio: {
    title: "Portefeuille projets",
    subtitle: "Arbitrer les projets, budgets, ressources, marges, risques et engagements depuis une vue de direction unique.",
    guide: "Piloter projets et programmes avec une lecture consolidée du réalisé, du reste à faire et des engagements client.\nRelier Commerce, Ressources, staffing, qualité et finance pour décider sur des données réelles, explicables et traçables.",
    entity: "projet",
    icon: FolderKanban,
  },
  timeline: {
    title: "Timeline globale",
    subtitle: "Synchroniser projets, jalons, échéances et dépendances critiques sur une chronologie transverse et navigable.",
    guide: "Visualiser les jalons contractuels, opérationnels, qualité et financiers de tout le portefeuille dans le temps.\nDétecter collisions, retards et arbitrages nécessaires grâce aux vues semaine, mois, trimestre et au repère Aujourd’hui.",
    entity: "jalon",
    icon: Route,
  },
  gantt: {
    title: "Planification & Gantt",
    subtitle: "Planifier WBS, tâches, jalons, ressources, charges, dépendances, baselines et chemin critique sans complexité inutile.",
    guide: "Construire une planification multi-projet reliée aux ressources, capacités, compétences, coûts et livrables attendus.\nComparer baseline, prévision et réalisé pour sécuriser délais, charge, qualité et engagements avec une traçabilité complète.",
    entity: "tâche",
    icon: CalendarDays,
  },
  actions: {
    title: "Actions projet",
    subtitle: "Centraliser les actions issues des projets, risques, non-conformités, audits et décisions jusqu’au contrôle d’efficacité.",
    guide: "Piloter chaque action avec origine, responsable, priorité, échéance, résultat attendu, preuve et efficacité contrôlée.\nRéunir les actions de tous les modules pour réduire les retards, traiter les causes et satisfaire les exigences ISO 9001.",
    entity: "action",
    icon: ListChecks,
  },
  performance: {
    title: "Performance projets",
    subtitle: "Mesurer santé, avancement physique, valeur acquise, TACE, satisfaction, qualité, risques et prévision à terminaison.",
    guide: "Comparer performance réelle, baseline et prévision avec EVM, charge, occupation, marge, satisfaction et santé projet.\nTransformer chaque dérive coût-délai-qualité en alerte, recommandation et décision exécutive explicable et auditée.",
    entity: "revue de performance",
    icon: Gauge,
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const number = (value: unknown) => Number(value || 0);
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat("fr-FR").format(parsed);
}

function money(value?: unknown) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(number(value));
}

function percent(value?: unknown) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(number(value))} %`;
}

function person(row?: AnyRow | null) {
  return row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || row?.name || "Non renseigné";
}

function statusLabel(value?: unknown) {
  const key = String(value || "").toLowerCase();
  return ({
    draft: "Brouillon", planned: "Ouvert", open: "Ouvert", todo: "Ouvert",
    active: "En cours", in_progress: "En cours", on_hold: "En stand-by",
    pending: "En attente", review: "En revue", blocked: "Bloqué", red: "Critique",
    amber: "À surveiller", green: "Maîtrisé", completed: "Clos", done: "Clos",
    closed: "Clos", approved: "Validé", cancelled: "Annulé", archived: "Archivé",
    compliant: "Conforme", partially_compliant: "Partiellement conforme", non_compliant: "Non conforme",
  } as Record<string, string>)[key] || String(value || "Non renseigné");
}

function badgeStatus(value?: unknown) {
  const key = String(value || "").toLowerCase();
  if (["open", "todo", "planned"].includes(key)) return "planned";
  if (["active", "in_progress", "pending", "review", "amber", "partially_compliant"].includes(key)) return "in_progress";
  if (["completed", "done", "closed", "approved", "green", "compliant"].includes(key)) return "completed";
  if (["blocked", "red", "non_compliant"].includes(key)) return "blocked";
  return key;
}

async function resolveOrganization(slugOrId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id, name, slug");
  const result = isUuid(slugOrId)
    ? await request.eq("id", slugOrId).limit(1).maybeSingle()
    : await request.eq("slug", slugOrId).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data;
}

async function loadProjectData(slugOrId: string): Promise<ProjectData> {
  const organization = await resolveOrganization(slugOrId);
  const table = (name: string) => (supabase.from(name as never) as any).select("*").eq("organization_id", organization.id).limit(5000);
  const names = [
    "project_projects", "project_portfolios", "project_programs", "project_clients", "hr_employee_overview",
    "project_work_packages", "project_tasks", "project_staffing_assignments", "project_task_assignments",
    "project_milestones", "project_dependencies", "project_actions", "project_health_snapshots",
    "project_deliverables", "project_risks", "project_skill_requirements", "project_financial_performance",
    "project_satisfaction_surveys", "project_commerce_links", "project_audit_events",
  ];
  const results = await Promise.all(names.map(table));
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  const value = (index: number) => results[index].data || [];
  return {
    organization,
    projects: value(0), portfolios: value(1), programs: value(2), clients: value(3), employees: value(4),
    workPackages: value(5), tasks: value(6), staffingAssignments: value(7), taskAssignments: value(8),
    milestones: value(9), dependencies: value(10), actions: value(11), health: value(12), deliverables: value(13),
    risks: value(14), skillRequirements: value(15), financials: value(16), satisfaction: value(17),
    commerceLinks: value(18), audit: value(19),
  };
}

function enrich(data: ProjectData) {
  const clientMap = new Map<string, AnyRow>(data.clients.map((row) => [String(row.id), row]));
  const portfolioMap = new Map<string, AnyRow>(data.portfolios.map((row) => [String(row.id), row]));
  const programMap = new Map<string, AnyRow>(data.programs.map((row) => [String(row.id), row]));
  const employeeMap = new Map<string, AnyRow>(data.employees.map((row) => [String(row.id), row]));
  const projectMap = new Map<string, AnyRow>(data.projects.map((row) => [String(row.id), row]));
  const latest = (rows: AnyRow[], key: string, dateKey: string) => new Map(
    rows.slice().sort((a, b) => String(b[dateKey] || "").localeCompare(String(a[dateKey] || "")))
      .map((row) => [row[key], row] as const).reverse(),
  );
  const financeMap = latest(data.financials, "project_id", "period_start");
  const healthMap = latest(data.health, "project_id", "snapshot_date");
  const satisfactionMap = latest(data.satisfaction, "project_id", "survey_month");
  const commerceMap = latest(data.commerceLinks, "project_id", "created_at");
  const projects: AnyRow[] = data.projects.map((row) => {
    const finance = financeMap.get(row.id) || {};
    const health = healthMap.get(row.id) || {};
    const satisfaction = satisfactionMap.get(row.id) || {};
    const ordered = number(row.ordered_budget || row.sold_amount || row.budget_amount || commerceMap.get(row.id)?.ordered_amount);
    const consumed = number(row.consumed_budget || row.actual_cost_total || row.actual_cost || finance.ac || finance.actual_cost);
    const assignments = data.taskAssignments.filter((item) => item.project_id === row.id && !item.archived_at);
    const plannedHours = assignments.reduce((sum, item) => sum + number(item.planned_hours), 0);
    const actualHours = assignments.reduce((sum, item) => sum + number(item.actual_hours), 0);
    return {
      ...row,
      client_name: row.client_name || clientMap.get(row.client_id)?.name || commerceMap.get(row.id)?.client_name || "Interne",
      portfolio_name: portfolioMap.get(row.portfolio_id)?.name || "Hors portefeuille",
      program_name: programMap.get(row.program_id)?.name || "Hors programme",
      manager_name: row.project_manager_name || person(employeeMap.get(row.project_manager_employee_id)),
      commerce_reference: row.source_reference || commerceMap.get(row.id)?.source_reference || "Création autonome",
      ordered_budget: ordered,
      consumed_budget: consumed,
      remaining_budget: ordered - consumed,
      progress_percent: number(row.physical_progress_percent ?? row.progress_percent),
      health_status: health.health_status || row.health_status || "green",
      spi: finance.spi ?? health.spi,
      cpi: finance.cpi ?? health.cpi,
      eac: finance.estimate_at_completion ?? health.estimate_at_completion,
      satisfaction_score: satisfaction.overall_score,
      tace: plannedHours > 0 ? Math.min(100, (actualHours / plannedHours) * 100) : 0,
      critical_risks: data.risks.filter((risk) => risk.project_id === row.id && !risk.archived_at && number(risk.inherent_score || number(risk.probability) * number(risk.impact)) >= 12).length,
      late_deliverables: data.deliverables.filter((delivery) => delivery.project_id === row.id && !delivery.archived_at && !["accepted", "cancelled"].includes(delivery.status) && String(delivery.replanned_date || delivery.planned_date || "") < today()).length,
    };
  });
  const attach = (rows: AnyRow[]): AnyRow[] => rows.map((row) => ({
    ...row,
    project_code: projectMap.get(row.project_id)?.code || "—",
    project_name: projectMap.get(row.project_id)?.name || "Projet inconnu",
    owner_name: row.owner_name || person(employeeMap.get(row.owner_employee_id || row.assignee_employee_id)),
  }));
  return { projects, milestones: attach(data.milestones), tasks: attach(data.tasks), actions: attach(data.actions), employeeMap };
}

function rowsForMode(mode: ProjectPageMode, data: ReturnType<typeof enrich>): AnyRow[] {
  if (mode === "timeline") return data.milestones;
  if (mode === "gantt") return data.tasks;
  if (mode === "actions") return data.actions;
  return data.projects;
}

function rowTitle(mode: ProjectPageMode, row: AnyRow) {
  if (["portfolio", "performance"].includes(mode)) return `${row.code} · ${row.name}`;
  return `${row.project_code} · ${row.name || row.title}`;
}

function RowStatus({ row, mode }: { row: AnyRow; mode: ProjectPageMode }) {
  const status = row.archived_at ? "archived" : mode === "performance" ? row.health_status : row.status;
  return <HrStatusBadge status={badgeStatus(status)} label={statusLabel(status)} />;
}

function Filters({ data, values, onChange, count, total }: {
  data: ProjectData;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  count: number;
  total: number;
}) {
  const active = Object.entries(values).some(([key, value]) => key === "search" ? Boolean(value.trim()) : value !== "all");
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
    <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200"><SlidersHorizontal className="h-4 w-4" /></div><div><h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Les filtres pilotent réellement KPI, cartes, tableaux, graphiques, alertes, synthèses et export.</p></div></div><span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-slate-700 dark:text-indigo-200">{count} résultats sur {total}</span></div>
    </div>
    <div className="space-y-4 p-5"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={values.search} onChange={(event) => onChange("search", event.target.value)} placeholder="Rechercher un projet, client, programme, responsable, tâche, jalon ou action…" className={`${hrInputClassName} w-full pl-10`} /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select value={values.status} onChange={(event) => onChange("status", event.target.value)} className={hrSelectClassName}><option value="all">Tous les statuts</option>{["draft","planned","active","in_progress","on_hold","blocked","completed","cancelled","archived"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select>
        <select value={values.project} onChange={(event) => onChange("project", event.target.value)} className={hrSelectClassName}><option value="all">Tous les projets</option>{data.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select>
        <select value={values.client} onChange={(event) => onChange("client", event.target.value)} className={hrSelectClassName}><option value="all">Tous les clients</option>{data.clients.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
        <select value={values.manager} onChange={(event) => onChange("manager", event.target.value)} className={hrSelectClassName}><option value="all">Tous les responsables</option>{data.employees.map((row) => <option key={row.id} value={row.id}>{person(row)}</option>)}</select>
      </div>
      {active && <div className="flex justify-end"><button type="button" onClick={() => ["search","status","project","client","manager"].forEach((key) => onChange(key, key === "search" ? "" : "all"))} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600"><X className="h-4 w-4" />Réinitialiser les filtres</button></div>}
    </div>
  </section>;
}

function ViewSwitch({ value, onChange }: { value: ViewMode; onChange: (value: ViewMode) => void }) {
  return <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700"><button type="button" onClick={() => onChange("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${value === "cards" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-300"}`}>Cartes</button><button type="button" onClick={() => onChange("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${value === "table" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-300"}`}>Tableau</button></div>;
}

function ProjectCard({ mode, row, onView, onEdit, onArchive, onRestore }: { mode: ProjectPageMode; row: AnyRow; onView: () => void; onEdit: () => void; onArchive: () => void; onRestore: () => void }) {
  const archived = Boolean(row.archived_at) || row.status === "archived";
  const info: Array<[string, ReactNode, any]> = mode === "portfolio"
    ? [["Client", row.client_name, "sky"], ["Chef de projet", row.manager_name, "indigo"], ["Avancement", percent(row.progress_percent), "amber"], ["Budget restant", money(row.remaining_budget), row.remaining_budget < 0 ? "rose" : "emerald"]]
    : mode === "actions"
      ? [["Origine", row.origin_type || row.action_type, "sky"], ["Responsable", row.owner_name, "indigo"], ["Échéance", formatDate(row.replanned_due_date || row.due_date), "amber"], ["Avancement", percent(row.progress_percent), "emerald"]]
      : mode === "performance"
        ? [["Satisfaction", row.satisfaction_score == null ? "—" : `${number(row.satisfaction_score).toFixed(1)}/5`, "sky"], ["TACE", percent(row.tace), "indigo"], ["SPI / CPI", `${number(row.spi).toFixed(2)} / ${number(row.cpi).toFixed(2)}`, "amber"], ["Santé", statusLabel(row.health_status), row.health_status === "red" ? "rose" : row.health_status === "amber" ? "amber" : "emerald"]]
        : [["Responsable", row.owner_name, "indigo"], ["Début", formatDate(row.start_date || row.planned_date), "sky"], ["Fin", formatDate(row.due_date || row.forecast_date), "amber"], ["Avancement", percent(row.progress_percent), "emerald"]];
  return <article onClick={onView} className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{rowTitle(mode, row)}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{row.description || row.client_name || row.expected_result || "Informations métier à compléter"}</p></div><div onClick={(event) => event.stopPropagation()}><HrActionMenu labels={{ view: `Voir ${config[mode].entity}`, edit: `Modifier ${config[mode].entity}`, archive: `Archiver ${config[mode].entity}`, restore: `Réactiver ${config[mode].entity}` }} onView={onView} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} canRestore={archived} /></div></div>
    <div className="mt-3 flex items-center justify-between gap-3"><RowStatus row={row} mode={mode} />{row.priority && <HrStatusBadge status={row.priority === "high" || row.priority === "critical" ? "blocked" : row.priority === "normal" ? "in_progress" : "planned"} label={row.priority === "high" ? "Haute" : row.priority === "critical" ? "Critique" : row.priority === "low" ? "Faible" : "Moyenne"} />}</div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{info.map(([label, value, accent]) => <HrInfo key={label} label={label} value={value} accent={accent} />)}</div>
  </article>;
}

type Column = { label: string; value: (row: AnyRow) => ReactNode; className?: string };

function columnsFor(mode: ProjectPageMode, onCommerce: (row: AnyRow) => void): Column[] {
  if (mode === "portfolio") return [
    { label: "N° projet", value: (row) => row.code }, { label: "Désignation du projet", value: (row) => row.name },
    { label: "Client", value: (row) => row.client_name }, { label: "Chef de projet", value: (row) => row.manager_name },
    { label: "AVV source", value: (row) => <button type="button" onClick={(event) => { event.stopPropagation(); onCommerce(row); }} className="font-bold text-sky-700 hover:underline dark:text-sky-300">{row.commerce_reference}</button> },
    { label: "Date de début", value: (row) => formatDate(row.start_date) }, { label: "Date de fin", value: (row) => formatDate(row.end_date) },
    { label: "Avancement", value: (row) => percent(row.progress_percent) }, { label: "Statut", value: (row) => <RowStatus mode={mode} row={row} /> },
    { label: "Budget commandé", value: (row) => money(row.ordered_budget) }, { label: "Budget consommé", value: (row) => money(row.consumed_budget) },
    { label: "Budget restant", value: (row) => <span className={row.remaining_budget < 0 ? "font-black text-rose-700" : "font-black text-emerald-700"}>{money(row.remaining_budget)}</span> },
    { label: "Commentaires", value: (row) => row.executive_comment || row.description || "—" },
  ];
  if (mode === "actions") return [
    { label: "ID action", value: (row) => row.code }, { label: "N° projet", value: (row) => row.project_code }, { label: "Désignation projet", value: (row) => row.project_name },
    { label: "Origine", value: (row) => row.origin_type || row.action_type }, { label: "Référence origine", value: (row) => row.origin_reference || "—" },
    { label: "Description de l’action", value: (row) => row.title }, { label: "Responsable", value: (row) => row.owner_name },
    { label: "Priorité", value: (row) => row.priority }, { label: "Fin prévisionnelle", value: (row) => formatDate(row.due_date) },
    { label: "Date replanifiée", value: (row) => formatDate(row.replanned_due_date) }, { label: "Résultat attendu", value: (row) => row.expected_result || "—" },
    { label: "Avancement", value: (row) => percent(row.progress_percent) }, { label: "Statut", value: (row) => <RowStatus mode={mode} row={row} /> },
    { label: "Fin réelle", value: (row) => formatDate(row.actual_completion_date || row.closed_at) }, { label: "Efficacité", value: (row) => statusLabel(row.effectiveness_status) },
    { label: "Commentaires", value: (row) => row.comments || row.effectiveness_comment || "—" },
  ];
  if (mode === "performance") return [
    { label: "Projet", value: (row) => `${row.code} · ${row.name}` }, { label: "Santé", value: (row) => <RowStatus row={row} mode={mode} /> },
    { label: "Avancement physique", value: (row) => percent(row.progress_percent) }, { label: "Satisfaction", value: (row) => row.satisfaction_score == null ? "—" : `${number(row.satisfaction_score).toFixed(1)}/5` },
    { label: "TACE", value: (row) => percent(row.tace) }, { label: "VP", value: (row) => money(row.planned_value) }, { label: "VA", value: (row) => money(row.earned_value) },
    { label: "CR", value: (row) => money(row.actual_cost_total || row.consumed_budget) }, { label: "SPI", value: (row) => number(row.spi).toFixed(2) },
    { label: "CPI", value: (row) => number(row.cpi).toFixed(2) }, { label: "EAC", value: (row) => money(row.eac) },
    { label: "Risques critiques", value: (row) => row.critical_risks }, { label: "Livrables en retard", value: (row) => row.late_deliverables },
  ];
  if (mode === "timeline") return [
    { label: "Projet / jalon", value: (row) => `${row.project_code} · ${row.name}` }, { label: "Type", value: (row) => row.milestone_type },
    { label: "Date initiale", value: (row) => formatDate(row.planned_date) }, { label: "Prévision", value: (row) => formatDate(row.forecast_date || row.planned_date) },
    { label: "Date réelle", value: (row) => formatDate(row.actual_date) }, { label: "Responsable", value: (row) => row.owner_name },
    { label: "Critique", value: (row) => row.critical ? "Oui" : "Non" }, { label: "Statut", value: (row) => <RowStatus row={row} mode={mode} /> },
  ];
  return [
    { label: "Projet", value: (row) => row.project_code }, { label: "WBS", value: (row) => row.wbs_code || row.code }, { label: "Tâche", value: (row) => row.name },
    { label: "Ressource", value: (row) => row.owner_name }, { label: "Début", value: (row) => formatDate(row.start_date) }, { label: "Fin", value: (row) => formatDate(row.due_date) },
    { label: "Durée", value: (row) => `${number(row.duration_days)} j` }, { label: "Charge", value: (row) => `${number(row.planned_hours)} h` },
    { label: "Avancement", value: (row) => percent(row.progress_percent) }, { label: "Float", value: (row) => `${number(row.total_float_days)} j` },
    { label: "Chemin critique", value: (row) => row.is_critical ? "Oui" : "Non" }, { label: "Statut", value: (row) => <RowStatus row={row} mode={mode} /> },
  ];
}

function DataTable({ mode, rows, columns, onView, onEdit, onArchive, onRestore }: { mode: ProjectPageMode; rows: AnyRow[]; columns: Column[]; onView: (row: AnyRow) => void; onEdit: (row: AnyRow) => void; onArchive: (row: AnyRow) => void; onRestore: (row: AnyRow) => void }) {
  return <div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70"><table className="min-w-max w-full border-separate border-spacing-0 text-left text-xs"><thead className="sticky top-0 z-30 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{columns.map((column, index) => <th key={`${column.label}-${index}`} className={`border-b border-slate-200 px-3 py-3 ${index === 0 ? "sticky left-0 z-40 bg-slate-50 dark:bg-slate-600" : ""}`}>{column.label}</th>)}<th className="sticky right-0 z-40 border-b border-slate-200 bg-slate-50 px-3 py-3 text-right dark:bg-slate-600">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} onClick={() => onView(row)} className="cursor-pointer hover:bg-indigo-50/35 dark:hover:bg-indigo-900/20">{columns.map((column, index) => <td key={`${row.id}-${index}`} className={`max-w-[240px] truncate border-b border-slate-100 px-3 py-3 text-slate-700 dark:border-slate-600 dark:text-slate-200 ${index === 0 ? "sticky left-0 z-20 bg-white font-black text-indigo-700 dark:bg-slate-700 dark:text-indigo-200" : ""}`} title={typeof column.value(row) === "string" ? String(column.value(row)) : undefined}>{column.value(row)}</td>)}<td onClick={(event) => event.stopPropagation()} className="sticky right-0 z-20 border-b border-slate-100 bg-white px-3 py-2 text-right dark:border-slate-600 dark:bg-slate-700"><HrActionMenu labels={{ view: `Voir ${config[mode].entity}`, edit: `Modifier ${config[mode].entity}`, archive: `Archiver ${config[mode].entity}`, restore: `Réactiver ${config[mode].entity}` }} onView={() => onView(row)} onEdit={() => onEdit(row)} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)} canRestore={Boolean(row.archived_at) || row.status === "archived"} /></td></tr>)}</tbody></table></div>;
}

function Drawer({ mode, row, onClose, onEdit }: { mode: ProjectPageMode; row: AnyRow; onClose: () => void; onEdit: () => void }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={onClose}><aside onClick={(event) => event.stopPropagation()} className="ml-auto h-full w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25"><div><h2 className="text-base font-black text-slate-950 dark:text-white">{rowTitle(mode, row)}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Fiche détaillée, décisions, indicateurs, responsabilités et traçabilité.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Statut" value={<RowStatus row={row} mode={mode} />} accent="sky" /><HrInfo label="Responsable" value={row.manager_name || row.owner_name || "Non renseigné"} accent="indigo" /><HrInfo label="Début" value={formatDate(row.start_date || row.opened_at || row.planned_date || row.snapshot_date)} accent="emerald" /><HrInfo label="Fin / échéance" value={formatDate(row.end_date || row.replanned_due_date || row.due_date || row.forecast_date)} accent="amber" /></div><HrSectionCard icon={Target} title="Contexte et décision" description="Données métier, impacts, résultats, preuves et éléments d’arbitrage."><div className="grid gap-3 sm:grid-cols-2"><HrInfo label="Description" value={row.description || row.executive_comment || row.title || "À compléter"} /><HrInfo label="Résultat attendu" value={row.expected_result || "À formaliser"} accent="emerald" /><HrInfo label="Impact / risque" value={row.impact || row.risk_level || "À qualifier"} accent="rose" /><HrInfo label="Commentaire" value={row.comments || row.effectiveness_comment || row.recommendation || "À compléter"} accent="amber" /></div></HrSectionCard><div className="flex justify-end"><button type="button" onClick={onEdit} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Modifier {config[mode].entity}</button></div></div></aside></div>;
}

function Form({ mode, data, row, onClose, onSaved }: { mode: ProjectPageMode; data: ProjectData; row?: AnyRow | null; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({
    project_id: row?.project_id || (mode === "portfolio" || mode === "performance" ? row?.id : "") || data.projects[0]?.id || "",
    code: row?.code || "", name: row?.name || row?.title || "", description: row?.description || row?.executive_comment || "",
    status: row?.status || (mode === "performance" ? row?.health_status || "green" : mode === "portfolio" || mode === "timeline" ? "planned" : "todo"),
    start_date: row?.start_date || row?.planned_date || row?.opened_at || row?.snapshot_date || today(),
    end_date: row?.end_date || row?.due_date || row?.forecast_date || "", client_id: row?.client_id || "", manager_id: row?.project_manager_employee_id || row?.owner_employee_id || row?.assignee_employee_id || "",
    amount: String(row?.ordered_budget || row?.budget_amount || row?.planned_hours || row?.progress_percent || ""),
    priority: row?.priority || "normal", origin: row?.origin_type || row?.action_type || "project", origin_reference: row?.origin_reference || "",
    expected_result: row?.expected_result || "", replanned_due_date: row?.replanned_due_date || "", effectiveness_status: row?.effectiveness_status || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  async function generatedCode(prefix: string) {
    if (values.code.trim()) return values.code.trim();
    const result = await (supabase.rpc as any)("next_project_code", { target_organization_id: data.organization.id, target_year: new Date().getFullYear(), code_prefix: prefix });
    if (result.error) throw result.error;
    return result.data;
  }
  async function save() {
    if (!values.name.trim() && mode !== "performance") return;
    setSaving(true);
    try {
      let table = "project_projects";
      let payload: AnyRow;
      if (mode === "portfolio") payload = { organization_id: data.organization.id, code: await generatedCode("P"), name: values.name.trim(), description: values.description || null, status: values.status, start_date: values.start_date || null, end_date: values.end_date || null, client_id: values.client_id || null, project_manager_employee_id: values.manager_id || null, ordered_budget: number(values.amount), budget_amount: number(values.amount), priority: values.priority, project_type: "delivery", source_type: values.origin_reference ? "commerce" : "manual", source_reference: values.origin_reference || null, updated_at: new Date().toISOString() };
      else if (mode === "timeline") { table = "project_milestones"; payload = { organization_id: data.organization.id, project_id: values.project_id, code: await generatedCode("J"), name: values.name.trim(), description: values.description || null, status: values.status, planned_date: values.start_date, forecast_date: values.end_date || null, owner_employee_id: values.manager_id || null, milestone_type: "delivery", updated_at: new Date().toISOString() }; }
      else if (mode === "gantt") { table = "project_tasks"; payload = { organization_id: data.organization.id, project_id: values.project_id, code: await generatedCode("T"), name: values.name.trim(), description: values.description || null, status: values.status, start_date: values.start_date || null, due_date: values.end_date || null, assignee_employee_id: values.manager_id || null, planned_hours: number(values.amount), remaining_hours: row ? number(row.remaining_hours) : number(values.amount), progress_percent: number(row?.progress_percent), priority: values.priority, task_type: "delivery", task_kind: "task", updated_at: new Date().toISOString() }; }
      else if (mode === "actions") { table = "project_actions"; payload = { organization_id: data.organization.id, project_id: values.project_id, code: await generatedCode("A"), title: values.name.trim(), description: values.description || null, status: values.status, opened_at: values.start_date, due_date: values.end_date || null, replanned_due_date: values.replanned_due_date || null, owner_employee_id: values.manager_id || null, owner_name: person(data.employees.find((item) => item.id === values.manager_id)), priority: values.priority, origin_type: values.origin, origin_reference: values.origin_reference || null, expected_result: values.expected_result || null, effectiveness_status: values.effectiveness_status || null, progress_percent: number(values.amount), comments: values.description || null, updated_at: new Date().toISOString() }; }
      else { table = "project_health_snapshots"; payload = { organization_id: data.organization.id, project_id: values.project_id, snapshot_date: values.start_date, progress_percent: number(values.amount), health_status: values.status, schedule_score: 100, cost_score: 100, scope_score: 100, quality_score: 100, resource_score: 100, risk_score: 100, executive_comment: values.description || null, updated_at: new Date().toISOString() }; }
      const query = supabase.from(table as never) as any;
      const result = row && mode !== "performance" ? await query.update(payload).eq("id", row.id).eq("organization_id", data.organization.id) : await query.insert(payload);
      if (result.error) throw result.error;
      onSaved(); onClose();
    } catch (error) { window.alert(error instanceof Error ? error.message : `Impossible d’enregistrer ${config[mode].entity}.`); }
    finally { setSaving(false); }
  }
  const statuses = mode === "performance" ? ["green","amber","red"] : mode === "portfolio" || mode === "timeline" ? ["planned","active","on_hold","blocked","completed","cancelled"] : ["todo","in_progress","pending","blocked","review","done","cancelled"];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25"><div><h2 className="text-sm font-black text-slate-950 dark:text-white">{row ? "Modifier" : "Nouveau"} {config[mode].entity}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Formulaire métier relié aux projets, clients, ressources, budgets et objets transverses.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
    {mode !== "portfolio" && <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Projet</span><select value={values.project_id} onChange={(event) => set("project_id", event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{data.projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>}
    {mode !== "performance" && <><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Code</span><input value={values.code} onChange={(event) => set("code", event.target.value)} placeholder="Généré automatiquement" className={`${hrInputClassName} mt-1 w-full`} /></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Nom / titre</span><input value={values.name} onChange={(event) => set("name", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label></>}
    <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Statut / santé</span><select value={values.status} onChange={(event) => set("status", event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></label>
    {mode === "portfolio" && <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Client</span><select value={values.client_id} onChange={(event) => set("client_id", event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Projet interne</option>{data.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {mode !== "performance" && <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Responsable</span><select value={values.manager_id} onChange={(event) => set("manager_id", event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Non renseigné</option>{data.employees.map((item) => <option key={item.id} value={item.id}>{person(item)}</option>)}</select></label>}
    <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Date / début</span><input type="date" value={values.start_date} onChange={(event) => set("start_date", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>
    {mode !== "performance" && <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Fin / échéance</span><input type="date" value={values.end_date} onChange={(event) => set("end_date", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>}
    <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">{mode === "portfolio" ? "Budget commandé (€)" : mode === "gantt" ? "Charge planifiée (h)" : "Avancement (%)"}</span><input type="number" value={values.amount} onChange={(event) => set("amount", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>
    {mode === "actions" && <><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Origine</span><select value={values.origin} onChange={(event) => set("origin", event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{["project","risk","nonconformity","audit","quality","customer","finance"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Référence origine</span><input value={values.origin_reference} onChange={(event) => set("origin_reference", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Date replanifiée</span><input type="date" value={values.replanned_due_date} onChange={(event) => set("replanned_due_date", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Résultat attendu</span><input value={values.expected_result} onChange={(event) => set("expected_result", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label></>}
    {mode === "portfolio" && <label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Référence AVV / Commerce</span><input value={values.origin_reference} onChange={(event) => set("origin_reference", event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>}
    <label className="sm:col-span-2 xl:col-span-4"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Description / commentaire exécutif</span><textarea value={values.description} onChange={(event) => set("description", event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" /></label>
  </div><div className="flex justify-end gap-2 border-t border-slate-100 p-5 dark:border-slate-600"><button type="button" onClick={onClose} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700">Annuler</button><button type="button" onClick={() => void save()} disabled={saving || (mode !== "performance" && !values.name.trim())} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></div></div>;
}

function Alerts({ data }: { data: ProjectData }) {
  const now = today();
  const lateTasks = data.tasks.filter((row) => !row.archived_at && row.due_date && row.due_date < now && !["done","cancelled","archived"].includes(row.status));
  const criticalRisks = data.risks.filter((row) => !row.archived_at && number(row.inherent_score || number(row.probability) * number(row.impact)) >= 12);
  const lateActions = data.actions.filter((row) => !row.archived_at && (row.replanned_due_date || row.due_date) < now && !["done","closed","cancelled","archived"].includes(row.status));
  const lateDeliverables = data.deliverables.filter((row) => !row.archived_at && (row.replanned_date || row.planned_date) < now && !["accepted","cancelled"].includes(row.status));
  const items = [
    { label: "Tâches en retard", count: lateTasks.length, impact: "Dérive délai, charge et engagements client.", action: "Recalculer le chemin critique et le reste à faire." },
    { label: "Risques critiques", count: criticalRisks.length, impact: "Exposition forte sur CA, coût, délai ou qualité.", action: "Arbitrer la réponse, le responsable et le plan de réduction." },
    { label: "Actions échues", count: lateActions.length, impact: "Décisions non exécutées et causes non traitées.", action: "Relancer, replanifier avec justification ou escalader." },
    { label: "Livrables en retard", count: lateDeliverables.length, impact: "Dégradation OTD, facturation et satisfaction.", action: "Sécuriser acceptation, preuve et nouvelle prévision." },
  ];
  return <HrSectionCard icon={AlertTriangle} title="Alertes qualité" description="Synthèse, alertes et recommandations issues des données réelles du portefeuille."><div className="grid gap-4 xl:grid-cols-3"><div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/75 to-white p-4 dark:border-sky-800/50 dark:from-sky-900/20 dark:to-slate-700"><h3 className="text-sm font-black text-sky-900 dark:text-sky-200">Synthèse</h3><div className="mt-3 grid grid-cols-2 gap-2">{items.map((item) => <HrInfo key={item.label} label={item.label} value={item.count} accent={item.count ? "rose" : "emerald"} />)}</div></div><div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/70 to-white p-4 dark:border-rose-800/50 dark:from-rose-900/20 dark:to-slate-700"><h3 className="text-sm font-black text-rose-900 dark:text-rose-200">Alertes</h3><div className="mt-3 space-y-2">{items.filter((item) => item.count).map((item) => <div key={item.label} className="rounded-xl bg-white/80 p-3 text-xs dark:bg-slate-700"><p className="font-black text-rose-700 dark:text-rose-200">{item.count} · {item.label}</p><p className="mt-1 text-slate-500 dark:text-slate-300">{item.impact}</p></div>)}{!items.some((item) => item.count) && <p className="text-xs font-bold text-emerald-700">Aucune alerte critique sur ce périmètre.</p>}</div></div><div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-4 dark:border-emerald-800/50 dark:from-emerald-900/20 dark:to-slate-700"><h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">Recommandations</h3><div className="mt-3 space-y-2">{items.filter((item) => item.count).map((item) => <div key={item.label} className="flex gap-2 rounded-xl bg-white/80 p-3 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-200"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item.action}</span></div>)}</div></div></div></HrSectionCard>;
}

function Summary({ projects }: { projects: AnyRow[] }) {
  const columns: Column[] = [
    { label: "Projet", value: (row) => `${row.code} · ${row.name}` }, { label: "Client", value: (row) => row.client_name },
    { label: "Chef de projet", value: (row) => row.manager_name }, { label: "Avancement", value: (row) => percent(row.progress_percent) },
    { label: "Santé", value: (row) => <HrStatusBadge status={badgeStatus(row.health_status)} label={statusLabel(row.health_status)} /> },
    { label: "Budget commandé", value: (row) => money(row.ordered_budget) }, { label: "Consommé", value: (row) => money(row.consumed_budget) },
    { label: "Restant", value: (row) => money(row.remaining_budget) }, { label: "SPI", value: (row) => number(row.spi).toFixed(2) },
    { label: "CPI", value: (row) => number(row.cpi).toFixed(2) }, { label: "Satisfaction", value: (row) => row.satisfaction_score == null ? "—" : `${number(row.satisfaction_score).toFixed(1)}/5` },
    { label: "TACE", value: (row) => percent(row.tace) }, { label: "Risques critiques", value: (row) => row.critical_risks }, { label: "Livrables en retard", value: (row) => row.late_deliverables },
  ];
  return <HrSectionCard icon={BriefcaseBusiness} title="Synthèse exécutive" description="Vue macro des projets, valeur, santé, performance, satisfaction, occupation, risques et livrables."><div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200"><table className="min-w-max w-full text-xs"><thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr>{columns.map((item, index) => <th key={item.label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-slate-50" : ""}`}>{item.label}</th>)}</tr></thead><tbody>{projects.map((row) => <tr key={row.id} className="hover:bg-indigo-50/30">{columns.map((item, index) => <td key={item.label} className={`border-t border-slate-100 px-3 py-3 ${index === 0 ? "sticky left-0 bg-white font-black text-indigo-700" : ""}`}>{item.value(row)}</td>)}</tr>)}</tbody></table></div></HrSectionCard>;
}

function Audit({ rows }: { rows: AnyRow[] }) {
  return <HrSectionCard icon={History} title="Historique et audit" description="Créations, modifications, archivages et décisions sensibles historisés par organisation."><div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200"><table className="min-w-full text-xs"><thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr>{["Date","Projet","Objet","Action","Utilisateur","Contexte"].map((label, index) => <th key={label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-slate-50" : ""}`}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="hover:bg-indigo-50/30"><td className="sticky left-0 border-t border-slate-100 bg-white px-3 py-3 font-bold">{row.created_at ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created_at)) : "—"}</td><td className="border-t border-slate-100 px-3 py-3">{row.project_id || "Transverse"}</td><td className="border-t border-slate-100 px-3 py-3">{row.entity_table}</td><td className="border-t border-slate-100 px-3 py-3">{row.action}</td><td className="border-t border-slate-100 px-3 py-3">{row.actor_user_id || "Système"}</td><td className="border-t border-slate-100 px-3 py-3">{row.business_context || "—"}</td></tr>)}</tbody></table></div></HrSectionCard>;
}

const exportColumns: ExportColumn<AnyRow>[] = [
  { key: "id", label: "ID", value: (row) => row.id }, { key: "organization_id", label: "Organisation", value: (row) => row.organization_id },
  { key: "project_code", label: "N° projet", value: (row) => row.project_code || row.code }, { key: "project_name", label: "Désignation projet", value: (row) => row.project_name || row.name },
  { key: "client", label: "Client", value: (row) => row.client_name }, { key: "manager", label: "Chef de projet / responsable", value: (row) => row.manager_name || row.owner_name },
  { key: "commerce", label: "AVV / Commerce source", value: (row) => row.commerce_reference || row.origin_reference }, { key: "description", label: "Description", value: (row) => row.description || row.title || row.executive_comment },
  { key: "status", label: "Statut", value: (row) => row.status || row.health_status }, { key: "priority", label: "Priorité", value: (row) => row.priority },
  { key: "origin", label: "Origine", value: (row) => row.origin_type || row.action_type }, { key: "start", label: "Début", value: (row) => row.start_date || row.opened_at || row.planned_date || row.snapshot_date },
  { key: "end", label: "Fin / échéance", value: (row) => row.end_date || row.replanned_due_date || row.due_date || row.forecast_date },
  { key: "progress", label: "Avancement (%)", value: (row) => row.progress_percent }, { key: "ordered", label: "Budget commandé", value: (row) => row.ordered_budget },
  { key: "consumed", label: "Budget consommé", value: (row) => row.consumed_budget }, { key: "remaining", label: "Budget restant", value: (row) => row.remaining_budget },
  { key: "pv", label: "Valeur planifiée", value: (row) => row.planned_value }, { key: "ev", label: "Valeur acquise", value: (row) => row.earned_value },
  { key: "ac", label: "Coûts réels", value: (row) => row.actual_cost_total || row.actual_cost }, { key: "spi", label: "SPI", value: (row) => row.spi }, { key: "cpi", label: "CPI", value: (row) => row.cpi },
  { key: "effectiveness", label: "Efficacité", value: (row) => row.effectiveness_status }, { key: "comment", label: "Commentaires", value: (row) => row.comments || row.executive_comment },
  { key: "created", label: "Créé le", value: (row) => row.created_at }, { key: "updated", label: "Mis à jour le", value: (row) => row.updated_at }, { key: "archived", label: "Archivé le", value: (row) => row.archived_at },
];

export default function ProjectManagementPage({ params, mode }: { params: Promise<PageParams>; mode: ProjectPageMode }) {
  const { orgId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const page = config[mode];
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<ViewMode>("cards");
  const [filters, setFilters] = useState({ search: "", status: "all", project: "all", client: "all", manager: "all" });
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [editing, setEditing] = useState<AnyRow | null | undefined>(undefined);
  const query = useQuery({ queryKey: ["project-management-v2", orgId], queryFn: () => loadProjectData(orgId) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["project-management-v2", orgId] });
  const archive = useMutation({ mutationFn: async ({ row, restore }: { row: AnyRow; restore: boolean }) => {
    const table = mode === "portfolio" ? "project_projects" : mode === "timeline" ? "project_milestones" : mode === "gantt" ? "project_tasks" : mode === "actions" ? "project_actions" : "project_health_snapshots";
    const payload: AnyRow = { archived_at: restore ? null : new Date().toISOString(), updated_at: new Date().toISOString() };
    if (mode !== "performance") payload.status = restore ? (mode === "portfolio" ? "active" : mode === "timeline" ? "planned" : "todo") : "archived";
    const result = await (supabase.from(table as never) as any).update(payload).eq("id", row.id).eq("organization_id", row.organization_id);
    if (result.error) throw result.error;
  }, onSuccess: refresh });
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">Chargement du module Projets…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger {page.title} : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const data = query.data;
  const enriched = enrich(data);
  const rawRows = rowsForMode(mode, enriched);
  const projectMap = new Map<string, AnyRow>(enriched.projects.map((row) => [String(row.id), row]));
  const rows = rawRows.filter((row) => {
    const parent = mode === "portfolio" || mode === "performance" ? row : projectMap.get(row.project_id) || {};
    const haystack = [rowTitle(mode, row), row.description, row.title, row.owner_name, parent.client_name, parent.manager_name, parent.program_name].join(" ").toLowerCase();
    const rowStatus = row.archived_at ? "archived" : mode === "performance" ? row.health_status : row.status;
    return (!filters.search.trim() || haystack.includes(filters.search.trim().toLowerCase()))
      && (filters.status === "all" || rowStatus === filters.status)
      && (filters.project === "all" || row.id === filters.project || row.project_id === filters.project)
      && (filters.client === "all" || parent.client_id === filters.client)
      && (filters.manager === "all" || parent.project_manager_employee_id === filters.manager || row.owner_employee_id === filters.manager || row.assignee_employee_id === filters.manager);
  });
  const projectScope = enriched.projects.filter((row) => filters.project === "all" || row.id === filters.project).filter((row) => filters.client === "all" || row.client_id === filters.client).filter((row) => filters.manager === "all" || row.project_manager_employee_id === filters.manager);
  const totalBudget = projectScope.reduce((sum, row) => sum + number(row.ordered_budget), 0);
  const consumed = projectScope.reduce((sum, row) => sum + number(row.consumed_budget), 0);
  const late = data.tasks.filter((row) => !row.archived_at && row.due_date < today() && !["done","cancelled","archived"].includes(row.status)).length;
  const critical = data.risks.filter((row) => !row.archived_at && number(row.inherent_score || number(row.probability) * number(row.impact)) >= 12).length;
  const columns = columnsFor(mode, (row) => row.source_id ? router.push(`/${encodeURIComponent(orgId)}/avant-vente/${row.source_id}`) : router.push(`/${encodeURIComponent(orgId)}/avant-vente`));
  const openRow = (row: AnyRow) => mode === "portfolio" ? router.push(`/${encodeURIComponent(orgId)}/projects/${row.id}`) : setSelected(row);
  const analyticsData = { projects: projectScope, tasks: data.tasks, actions: data.actions, health: data.health, deliverables: data.deliverables, risks: data.risks, financials: data.financials, satisfaction: data.satisfaction, assignments: data.taskAssignments, employees: data.employees };
  const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }>; active: string }> = [
    { key: "pilotage", label: "Pilotage", icon: page.icon, active: "bg-indigo-600 text-white" },
    { key: "analyses", label: "Analyses", icon: BarChart3, active: "bg-emerald-600 text-white" },
    { key: "alerts", label: "Alertes", icon: AlertTriangle, active: "bg-amber-500 text-white" },
    { key: "summary", label: "Synthèses", icon: BriefcaseBusiness, active: "bg-rose-600 text-white" },
    { key: "history", label: "Historique", icon: History, active: "bg-sky-600 text-white" },
  ];
  return <div className="space-y-6">
    <PageHeader title={page.title} subtitle={page.subtitle} actions={<><DataExportMenu data={rows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={page.title} disabled={!rows.length} /><button type="button" onClick={() => setEditing(null)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />Nouveau {page.entity}</button></>} />
    <PageTutorial title="Guide de la page" description={page.guide} objectives={["Piloter délais, coûts, périmètre, qualité, ressources, risques, valeur client et conformité depuis une source de vérité commune.", "Permettre une utilisation autonome du module Projets tout en exploitant Commerce, RH, Staffing, Finance et Qualité lorsqu’ils sont activés."]} steps={[{ title: "Cadrer", description: "Créer l’objet, ses responsabilités, sa baseline, son budget, ses jalons, livrables, compétences et critères d’acceptation." }, { title: "Exécuter", description: "Mettre à jour travail réalisé, reste à faire, charge, coûts, dépendances, actions, risques, preuves et satisfaction." }, { title: "Arbitrer", description: "Comparer prévision et réalisé, analyser les alertes et tracer les décisions avant toute replanification." }]} analyses={[{ title: "Pilotage intégré", description: "Comparer avancement physique, SPI, CPI, EAC, charge, capacité, OTD, OQD, DoD, risques, satisfaction, TACE et marge." }]} recommendations={["Mesurer l’avancement sur le travail réellement achevé, jamais sur le seul temps écoulé.", "Baseliner tout engagement client et conserver la preuve des changements et arbitrages.", "Relier chaque action à sa cause, son résultat attendu, son responsable et son contrôle d’efficacité."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={FolderKanban} label="Projets actifs" value={projectScope.filter((row) => ["planned","active"].includes(row.status)).length} description="Projets ouverts, planifiés ou en cours dans le périmètre." accent="indigo" /><HrMetricCard icon={CircleDollarSign} label="Budget restant" value={money(totalBudget - consumed)} description={`${money(totalBudget)} commandés et ${money(consumed)} consommés.`} accent="emerald" /><HrMetricCard icon={Target} label="Avancement moyen" value={percent(projectScope.length ? projectScope.reduce((sum, row) => sum + number(row.progress_percent), 0) / projectScope.length : 0)} description="Avancement physique pondéré du travail réellement achevé." accent="amber" /><HrMetricCard icon={AlertTriangle} label="Points critiques" value={late + critical} description={`${late} tâche(s) en retard et ${critical} risque(s) critique(s).`} accent="rose" /></section>
    <Filters data={data} values={filters} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))} count={rows.length} total={rawRows.length} />
    <div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700/70">{tabs.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-bold transition ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>
    {tab === "pilotage" && <div className="space-y-5">
      {mode === "timeline" && <HrSectionCard icon={Route} title="Timeline décisionnelle" description="Chronologie navigable des projets et jalons, avec repère Aujourd’hui, retards, échelles et accès au cockpit projet."><ProjectTimelineBoard projects={projectScope} milestones={rows} onOpenProject={(row) => router.push(`/${encodeURIComponent(orgId)}/projects/${row.id}`)} /></HrSectionCard>}
      {mode === "gantt" && <HrSectionCard icon={CalendarDays} title="Gantt multi-projet" description="WBS, ressources, dates, durée, charge, avancement, jalons, dépendances, float, chemin critique et Aujourd’hui."><ProjectGanttBoard tasks={rows} dependencies={data.dependencies} employeeMap={enriched.employeeMap} /></HrSectionCard>}
      <HrSectionCard icon={page.icon} title={page.title} description="Cards et tableau complets avec données métier, statut, indicateurs et actions contextuelles." right={<ViewSwitch value={view} onChange={setView} />}>
        {!rows.length ? <p className="rounded-xl bg-slate-50 px-4 py-7 text-center text-sm font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-200">Aucune donnée dans ce périmètre.</p> : view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => <ProjectCard key={row.id} mode={mode} row={row} onView={() => openRow(row)} onEdit={() => setEditing(row)} onArchive={() => archive.mutate({ row, restore: false })} onRestore={() => archive.mutate({ row, restore: true })} />)}</div> : <DataTable mode={mode} rows={rows} columns={columns} onView={openRow} onEdit={setEditing} onArchive={(row) => archive.mutate({ row, restore: false })} onRestore={(row) => archive.mutate({ row, restore: true })} />}
      </HrSectionCard>
    </div>}
    {tab === "analyses" && <ProjectAnalyticsPanel mode={mode} data={analyticsData} />}
    {tab === "alerts" && <Alerts data={data} />}
    {tab === "summary" && <Summary projects={projectScope} />}
    {tab === "history" && <Audit rows={data.audit} />}
    {selected && <Drawer mode={mode} row={selected} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setSelected(null); }} />}
    {editing !== undefined && <Form mode={mode} data={data} row={editing} onClose={() => setEditing(undefined)} onSaved={refresh} />}
  </div>;
}
