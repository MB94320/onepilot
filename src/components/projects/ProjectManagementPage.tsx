"use client";

import {
  use,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flag,
  FolderKanban,
  Gauge,
  GitBranch,
  Lightbulb,
  ListChecks,
  Plus,
  Route,
  Search,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  HrActionMenu,
  HrChartCard,
  HrInfo,
  HrMetricCard,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSelectClassName,
  type HrAccent,
} from "@/components/hr/HrReferenceUi";
import DataExportMenu, {
  type ExportColumn,
} from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type AnyRow = Record<string, any>;
type PageParams = { orgId: string };
export type ProjectPageMode =
  | "portfolio"
  | "timeline"
  | "gantt"
  | "actions"
  | "performance";
type TabKey = "pilotage" | "analyses" | "alerts" | "history";
type ViewMode = "cards" | "table";

type ProjectData = {
  organization: AnyRow;
  projects: AnyRow[];
  portfolios: AnyRow[];
  clients: AnyRow[];
  employees: AnyRow[];
  workPackages: AnyRow[];
  tasks: AnyRow[];
  assignments: AnyRow[];
  milestones: AnyRow[];
  actions: AnyRow[];
  health: AnyRow[];
  dependencies: AnyRow[];
  audit: AnyRow[];
};

const colors = {
  indigo: "#818cf8",
  emerald: "#6ee7b7",
  amber: "#fcd34d",
  rose: "#fda4af",
  sky: "#7dd3fc",
  slate: "#94a3b8",
};

const configs: Record<
  ProjectPageMode,
  {
    title: string;
    subtitle: string;
    guide: string;
    entity: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  portfolio: {
    title: "Portefeuille projets",
    subtitle:
      "Arbitrer le portefeuille, les budgets, les ressources, les marges, les risques et les priorités.",
    guide:
      "Piloter les projets, programmes et portefeuilles avec une lecture consolidée des engagements, coûts et capacités.\nRelier Commerce, Ressources, staffing, qualité et finance pour décider sur des données réelles et traçables.",
    entity: "projet",
    icon: FolderKanban,
  },
  timeline: {
    title: "Timeline globale",
    subtitle:
      "Synchroniser jalons, échéances, dépendances et décisions sur l’ensemble du portefeuille.",
    guide:
      "Visualiser les jalons contractuels, opérationnels, qualité et financiers dans une chronologie transverse.\nDétecter les collisions, retards, dépendances critiques et arbitrages nécessaires avant qu’ils ne dérivent.",
    entity: "jalon",
    icon: Route,
  },
  gantt: {
    title: "Planification & Gantt",
    subtitle:
      "Planifier lots, tâches, dépendances, charge, chemin critique, baselines et reste à faire.",
    guide:
      "Construire une planification multi-projet reliée aux ressources, capacités, compétences et coûts réels.\nComparer baseline, prévision et réalisé pour sécuriser délais, charge, qualité et engagements client.",
    entity: "tâche",
    icon: CalendarDays,
  },
  actions: {
    title: "Actions projet",
    subtitle:
      "Piloter actions, décisions, problèmes, changements, risques et preuves jusqu’à clôture.",
    guide:
      "Centraliser les actions projet avec responsable, échéance, impact, cause, recommandation et preuve.\nTracer les décisions et points qualité ISO 9001 afin de réduire le reste à faire et les récidives.",
    entity: "action",
    icon: ListChecks,
  },
  performance: {
    title: "Performance projets",
    subtitle:
      "Mesurer avancement, délais, coûts, qualité, ressources, risques, SPI, CPI et prévision à terminaison.",
    guide:
      "Comparer performance réelle, baseline et prévision à terminaison avec des indicateurs explicables.\nTransformer les écarts coûts-délais-qualité en alertes, recommandations et décisions exécutives auditables.",
    entity: "revue de performance",
    icon: Gauge,
  },
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatHours(value?: number | null) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(value || 0))} h`;
}

function employeeName(employee?: AnyRow | null) {
  if (!employee) return "Non renseigné";
  return (
    employee.full_name ||
    [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
    "Non renseigné"
  );
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    planned: "À faire",
    todo: "À faire",
    active: "En cours",
    in_progress: "En cours",
    review: "En revue",
    on_hold: "En stand-by",
    blocked: "Bloqué",
    completed: "Terminé",
    done: "Terminé",
    approved: "Validé",
    cancelled: "Annulé",
    archived: "Archivé",
    green: "Maîtrisé",
    amber: "À surveiller",
    red: "Critique",
    open: "Ouvert",
    closed: "Clos",
  };
  return labels[String(status || "")] || status || "Non renseigné";
}

function projectStatus(row: AnyRow) {
  return row.archived_at ? "archived" : row.status;
}

async function resolveOrganization(slugOrId: string) {
  const query = (supabase.from("organizations" as never) as any).select(
    "id, name, slug",
  );
  const result = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data;
}

async function loadProjectData(slugOrId: string): Promise<ProjectData> {
  const organization = await resolveOrganization(slugOrId);
  const table = (name: string) =>
    (supabase.from(name as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .limit(5000);
  const [
    projects,
    portfolios,
    clients,
    employees,
    workPackages,
    tasks,
    assignments,
    milestones,
    actions,
    health,
    dependencies,
    audit,
  ] = await Promise.all([
    table("project_projects"),
    table("project_portfolios"),
    table("project_clients"),
    table("hr_employee_overview"),
    table("project_work_packages"),
    table("project_tasks"),
    table("project_staffing_assignments"),
    table("project_milestones"),
    table("project_actions"),
    table("project_health_snapshots"),
    table("project_dependencies"),
    table("project_staffing_audit_events"),
  ]);
  const results = [
    projects,
    portfolios,
    clients,
    employees,
    workPackages,
    tasks,
    assignments,
    milestones,
    actions,
    health,
    dependencies,
    audit,
  ];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  return {
    organization,
    projects: projects.data || [],
    portfolios: portfolios.data || [],
    clients: clients.data || [],
    employees: employees.data || [],
    workPackages: workPackages.data || [],
    tasks: tasks.data || [],
    assignments: assignments.data || [],
    milestones: milestones.data || [],
    actions: actions.data || [],
    health: health.data || [],
    dependencies: dependencies.data || [],
    audit: audit.data || [],
  };
}

function enrichData(data: ProjectData) {
  const portfolioMap = new Map(data.portfolios.map((row) => [row.id, row]));
  const clientMap = new Map(data.clients.map((row) => [row.id, row]));
  const employeeMap = new Map(data.employees.map((row) => [row.id, row]));
  const projectMap = new Map(data.projects.map((row) => [row.id, row]));
  const projects: AnyRow[] = data.projects.map((row: AnyRow) => ({
    ...row,
    portfolio_name: portfolioMap.get(row.portfolio_id)?.name || null,
    client_name: clientMap.get(row.client_id)?.name || null,
    manager_name: employeeName(employeeMap.get(row.project_manager_employee_id)),
    resources_count: new Set(
      data.assignments
        .filter((assignment) => assignment.project_id === row.id)
        .map((assignment) => assignment.employee_id),
    ).size,
    tasks_count: data.tasks.filter((task) => task.project_id === row.id).length,
    milestones_count: data.milestones.filter(
      (milestone) => milestone.project_id === row.id && !milestone.archived_at,
    ).length,
  }) as AnyRow);
  const attach = (rows: AnyRow[]): AnyRow[] =>
    rows.map((row: AnyRow) => ({
      ...row,
      project_code: projectMap.get(row.project_id)?.code || "—",
      project_name: projectMap.get(row.project_id)?.name || "Projet inconnu",
      owner_name: employeeName(employeeMap.get(row.owner_employee_id)),
    }) as AnyRow);
  const latestHealth: AnyRow[] = Array.from(
    data.health
      .slice()
      .sort((a, b) => String(b.snapshot_date).localeCompare(String(a.snapshot_date)))
      .reduce((map: Map<string, AnyRow>, row: AnyRow) => {
        if (!map.has(row.project_id)) map.set(row.project_id, row);
        return map;
      }, new Map<string, AnyRow>())
      .values(),
  ).map((row: AnyRow) => ({
    ...row,
    project_code: projectMap.get(row.project_id)?.code || "—",
    project_name: projectMap.get(row.project_id)?.name || "Projet inconnu",
  }) as AnyRow);
  return {
    projects,
    milestones: attach(data.milestones),
    tasks: attach(data.tasks),
    actions: attach(data.actions),
    latestHealth,
  };
}

function EntityFilters({
  data,
  search,
  status,
  project,
  onSearch,
  onStatus,
  onProject,
  resultCount,
  totalCount,
}: {
  data: ProjectData;
  search: string;
  status: string;
  project: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onProject: (value: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  const active = Boolean(search) || status !== "all" || project !== "all";
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-700 dark:to-indigo-900/25">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Les filtres pilotent KPI, cartes, tableaux, graphiques, alertes et exports.</p>
            </div>
          </div>
          <span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
            {resultCount} résultats sur {totalCount}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Rechercher un projet, client, responsable, jalon, tâche ou action…"
            className={`${hrInputClassName} w-full pl-10`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select value={status} onChange={(event) => onStatus(event.target.value)} className={hrSelectClassName}>
            <option value="all">Tous les statuts</option>
            {["draft", "planned", "active", "in_progress", "on_hold", "blocked", "completed", "cancelled", "archived"].map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
          <select value={project} onChange={(event) => onProject(event.target.value)} className={hrSelectClassName}>
            <option value="all">Tous les projets</option>
            {data.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}
          </select>
        </div>
        {active && (
          <div className="flex justify-end">
            <button type="button" onClick={() => { onSearch(""); onStatus("all"); onProject("all"); }} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function entityRows(mode: ProjectPageMode, data: ReturnType<typeof enrichData>) {
  if (mode === "timeline") return data.milestones;
  if (mode === "gantt") return data.tasks;
  if (mode === "actions") return data.actions;
  if (mode === "performance") return data.latestHealth;
  return data.projects;
}

function entityTitle(mode: ProjectPageMode, row: AnyRow) {
  if (mode === "portfolio") return `${row.code} · ${row.name}`;
  if (mode === "performance") return `${row.project_code} · ${row.project_name}`;
  return `${row.project_code} · ${row.name || row.title}`;
}

function entityDescription(mode: ProjectPageMode, row: AnyRow) {
  if (mode === "portfolio") return row.description || row.client_name || "Projet sans description";
  if (mode === "timeline") return `${formatDate(row.planned_date)} · ${row.milestone_type || "Jalon"}`;
  if (mode === "gantt") return `${formatDate(row.start_date)} → ${formatDate(row.due_date)} · ${formatHours(row.planned_hours)}`;
  if (mode === "actions") return `${row.action_type || "Action"} · échéance ${formatDate(row.due_date)}`;
  return `Situation au ${formatDate(row.snapshot_date)} · avancement ${Number(row.progress_percent || 0)} %`;
}

function EntityCard({
  mode,
  row,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  mode: ProjectPageMode;
  row: AnyRow;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const archived = Boolean(row.archived_at) || row.status === "archived";
  return (
    <article onClick={onView} className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600 dark:bg-slate-700/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{entityTitle(mode, row)}</h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300" title={entityDescription(mode, row)}>{entityDescription(mode, row)}</p>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <HrActionMenu
            labels={{ view: `Voir ${configs[mode].entity}`, edit: `Modifier ${configs[mode].entity}`, archive: `Archiver ${configs[mode].entity}`, restore: `Réactiver ${configs[mode].entity}` }}
            onView={onView}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            canRestore={archived}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <HrStatusBadge status={mode === "performance" ? row.health_status : projectStatus(row)} label={statusLabel(mode === "performance" ? row.health_status : projectStatus(row))} />
        {row.priority && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">{row.priority}</span>}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {mode === "portfolio" && <>
          <HrInfo label="Client" value={row.client_name || "Interne"} accent="sky" />
          <HrInfo label="Chef de projet" value={row.manager_name} accent="indigo" />
          <HrInfo label="Budget" value={formatCurrency(row.budget_amount)} accent="emerald" />
          <HrInfo label="Avancement" value={`${Number(row.progress_percent || 0)} %`} accent="amber" />
        </>}
        {mode === "timeline" && <>
          <HrInfo label="Date prévisionnelle" value={formatDate(row.forecast_date || row.planned_date)} accent="sky" />
          <HrInfo label="Responsable" value={row.owner_name} accent="indigo" />
          <HrInfo label="Criticité" value={row.critical ? "Jalon critique" : "Standard"} accent={row.critical ? "rose" : "emerald"} />
          <HrInfo label="Preuve" value={row.evidence_url ? "Disponible" : "À fournir"} accent={row.evidence_url ? "emerald" : "amber"} />
        </>}
        {mode === "gantt" && <>
          <HrInfo label="Début" value={formatDate(row.start_date)} accent="sky" />
          <HrInfo label="Échéance" value={formatDate(row.due_date)} accent="amber" />
          <HrInfo label="Planifié" value={formatHours(row.planned_hours)} accent="indigo" />
          <HrInfo label="Reste à faire" value={formatHours(row.remaining_hours)} accent={Number(row.remaining_hours || 0) > Number(row.planned_hours || 0) ? "rose" : "emerald"} />
        </>}
        {mode === "actions" && <>
          <HrInfo label="Responsable" value={row.owner_name} accent="indigo" />
          <HrInfo label="Échéance" value={formatDate(row.due_date)} accent="amber" />
          <HrInfo label="Avancement" value={`${Number(row.progress_percent || 0)} %`} accent="emerald" />
          <HrInfo label="Impact" value={row.impact || "À qualifier"} accent={row.impact ? "rose" : "slate"} />
        </>}
        {mode === "performance" && <>
          <HrInfo label="SPI" value={row.spi ?? "—"} accent={Number(row.spi || 0) >= 1 ? "emerald" : "rose"} />
          <HrInfo label="CPI" value={row.cpi ?? "—"} accent={Number(row.cpi || 0) >= 1 ? "emerald" : "rose"} />
          <HrInfo label="EAC" value={formatCurrency(row.estimate_at_completion)} accent="amber" />
          <HrInfo label="Qualité" value={`${Number(row.quality_score || 0)} %`} accent="sky" />
        </>}
      </div>
    </article>
  );
}

function valueFor(mode: ProjectPageMode, row: AnyRow, key: string): ReactNode {
  const values: Record<string, ReactNode> = {
    title: entityTitle(mode, row),
    status: statusLabel(mode === "performance" ? row.health_status : projectStatus(row)),
    owner: row.manager_name || row.owner_name || "—",
    start: formatDate(row.start_date || row.planned_date || row.snapshot_date),
    end: formatDate(row.end_date || row.due_date || row.forecast_date),
    budget: formatCurrency(row.budget_amount || row.estimate_at_completion),
    progress: `${Number(row.progress_percent || 0)} %`,
    risk:
      row.risk_level ||
      row.priority ||
      (row.critical ? "Critique" : "Normal"),
  };
  return values[key] ?? "—";
}

const tableColumns = [
  ["title", "Objet"],
  ["status", "Statut"],
  ["owner", "Responsable"],
  ["start", "Début / date"],
  ["end", "Fin / échéance"],
  ["budget", "Budget / EAC"],
  ["progress", "Avancement"],
  ["risk", "Risque / priorité"],
] as const;

function EntityTable({
  mode,
  rows,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  mode: ProjectPageMode;
  rows: AnyRow[];
  onView: (row: AnyRow) => void;
  onEdit: (row: AnyRow) => void;
  onArchive: (row: AnyRow) => void;
  onRestore: (row: AnyRow) => void;
}) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600">
      <table className="min-w-[1450px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200">
          <tr>
            {tableColumns.map(([, label], index) => <th key={label} className={`${index === 0 ? "sticky left-0 z-30" : ""} whitespace-nowrap border-b border-slate-200 bg-inherit px-4 py-3 text-left`}>{label}</th>)}
            <th className="whitespace-nowrap border-b border-slate-200 bg-inherit px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onView(row)} className="cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20">
              {tableColumns.map(([key], index) => <td key={key} className={`${index === 0 ? "sticky left-0 z-10 bg-white font-black dark:bg-slate-700" : ""} border-b border-slate-100 px-4 py-3 dark:border-slate-600`}>{valueFor(mode, row, key)}</td>)}
              <td onClick={(event) => event.stopPropagation()} className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                <HrActionMenu
                  labels={{ view: `Voir ${configs[mode].entity}`, edit: `Modifier ${configs[mode].entity}`, archive: `Archiver ${configs[mode].entity}`, restore: `Réactiver ${configs[mode].entity}` }}
                  onView={() => onView(row)} onEdit={() => onEdit(row)} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)}
                  canRestore={Boolean(row.archived_at) || row.status === "archived"}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GanttOverview({ tasks }: { tasks: AnyRow[] }) {
  const dated = tasks.filter((row) => row.start_date && row.due_date).slice(0, 30);
  if (!dated.length) return <p className="text-sm text-slate-500">Aucune tâche datée à afficher.</p>;
  const min = Math.min(...dated.map((row) => new Date(row.start_date).getTime()));
  const max = Math.max(...dated.map((row) => new Date(row.due_date).getTime()));
  const span = Math.max(86400000, max - min);
  return (
    <div className="space-y-2 overflow-x-auto">
      {dated.map((row) => {
        const left = ((new Date(row.start_date).getTime() - min) / span) * 100;
        const width = Math.max(3, ((new Date(row.due_date).getTime() - new Date(row.start_date).getTime()) / span) * 100);
        return <div key={row.id} className="grid min-w-[900px] grid-cols-[260px_1fr] items-center gap-3">
          <div className="truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={entityTitle("gantt", row)}>{entityTitle("gantt", row)}</div>
          <div className="relative h-8 rounded-lg bg-slate-100 dark:bg-slate-600">
            <div className="absolute top-1 h-6 rounded-md bg-gradient-to-r from-indigo-300 to-sky-300 px-2 text-[10px] font-black leading-6 text-indigo-950" style={{ left: `${left}%`, width: `${width}%` }}>{Number(row.planned_hours || 0)} h</div>
          </div>
        </div>;
      })}
    </div>
  );
}

function AnalysesPanel({ data }: { data: ProjectData }) {
  const enriched = enrichData(data);
  const statusData = Array.from(new Set(enriched.projects.map((row) => row.status))).map((status) => ({ name: statusLabel(status), value: enriched.projects.filter((row) => row.status === status).length }));
  const budgetData = enriched.projects.map((row) => ({ name: row.code, budget: Number(row.budget_amount || 0), actual: Number(row.actual_cost || 0), forecast: Number(row.forecast_cost || 0) })).slice(0, 14);
  const progressData = enriched.projects.map((row) => ({ name: row.code, progress: Number(row.progress_percent || 0), remaining: Math.max(0, 100 - Number(row.progress_percent || 0)) })).slice(0, 14);
  const healthData = ["schedule", "cost", "scope", "quality", "resource", "risk"].map((key) => ({ name: key, score: enriched.latestHealth.length ? Math.round(enriched.latestHealth.reduce((sum, row) => sum + Number(row[`${key}_score`] || 0), 0) / enriched.latestHealth.length) : 0 }));
  return <div className="space-y-5">
    <HrSectionCard icon={BarChart3} title="Analyse décisionnelle" description="Lecture consolidée du portefeuille, des coûts, délais, avancement, charge, qualité et risques." right={<span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">{enriched.projects.length} projets analysés</span>}>
      <div className="grid gap-4 xl:grid-cols-2">
        <HrChartCard title="Répartition par statut" description="Volume de projets selon leur état d’avancement." exportConfig={{ type: "bar", data: statusData, nameKey: "name", series: [{ key: "value", label: "Projets", color: colors.indigo }] }}>
          <ResponsiveContainer width="100%" height={300}><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="value" name="Projets" fill={colors.indigo} radius={[8,8,0,0]} /></BarChart></ResponsiveContainer>
        </HrChartCard>
        <HrChartCard title="Budget, réalisé et prévision" description="Comparaison financière par projet en euros." exportConfig={{ type: "bar", data: budgetData, nameKey: "name", series: [{ key: "budget", label: "Budget", color: colors.indigo }, { key: "actual", label: "Réalisé", color: colors.emerald }, { key: "forecast", label: "Prévision", color: colors.amber }] }}>
          <ResponsiveContainer width="100%" height={300}><BarChart data={budgetData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="budget" name="Budget" fill={colors.indigo} /><Bar dataKey="actual" name="Réalisé" fill={colors.emerald} /><Bar dataKey="forecast" name="Prévision" fill={colors.amber} /></BarChart></ResponsiveContainer>
        </HrChartCard>
        <HrChartCard title="Avancement du portefeuille" description="Avancement réel et reste à faire par projet." exportConfig={{ type: "bar", data: progressData, nameKey: "name", series: [{ key: "progress", label: "Avancement", color: colors.emerald }, { key: "remaining", label: "Reste", color: colors.sky }] }}>
          <ResponsiveContainer width="100%" height={300}><BarChart data={progressData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0,100]} /><Tooltip /><Legend /><Bar dataKey="progress" stackId="a" name="Avancement" fill={colors.emerald} /><Bar dataKey="remaining" stackId="a" name="Reste" fill={colors.sky} /></BarChart></ResponsiveContainer>
        </HrChartCard>
        <HrChartCard title="Radar de santé projet" description="Maturité moyenne délais, coûts, périmètre, qualité, ressources et risques." exportConfig={{ type: "radar", data: healthData, nameKey: "name", series: [{ key: "score", label: "Santé", color: colors.rose }] }}>
          <ResponsiveContainer width="100%" height={300}><RadarChart data={healthData}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="score" name="Santé" stroke={colors.rose} fill={colors.rose} fillOpacity={0.25} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer>
        </HrChartCard>
      </div>
    </HrSectionCard>
  </div>;
}

function AlertsPanel({ data }: { data: ProjectData }) {
  const now = new Date().toISOString().slice(0, 10);
  const lateTasks = data.tasks.filter((row) => !["done", "cancelled", "archived"].includes(row.status) && row.due_date && row.due_date < now).length;
  const lateMilestones = data.milestones.filter((row) => !row.archived_at && row.status !== "completed" && row.planned_date < now).length;
  const lateActions = data.actions.filter((row) => !row.archived_at && !["done", "closed", "cancelled"].includes(row.status) && row.due_date && row.due_date < now).length;
  const red = data.projects.filter((row) => row.health_status === "red" || row.risk_level === "critical").length;
  const missingManager = data.projects.filter((row) => !row.project_manager_employee_id).length;
  const missingBudget = data.projects.filter((row) => Number(row.budget_amount || 0) <= 0).length;
  return <HrSectionCard icon={AlertTriangle} title="Alertes qualité" description="Synthèse, alertes et recommandations PMO pour sécuriser engagements, ressources, coûts, délais et conformité.">
    <div className="grid gap-4 xl:grid-cols-3">
      {[
        { title: "Synthèse", icon: Gauge, accent: "indigo" as HrAccent, text: `${data.projects.length} projet(s), ${lateTasks} tâche(s) en retard et ${red} projet(s) critiques.` },
        { title: "Alertes", icon: AlertTriangle, accent: "rose" as HrAccent, text: `${lateMilestones} jalon(s) et ${lateActions} action(s) dépassent leur échéance.` },
        { title: "Recommandations", icon: Lightbulb, accent: "emerald" as HrAccent, text: "Arbitrer d’abord les chemins critiques, coûts incomplets, surcharges et preuves ISO manquantes." },
      ].map((item) => <div key={item.title} className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50/60 via-white to-indigo-50/50 p-4 dark:border-slate-600 dark:from-sky-900/20 dark:via-slate-700 dark:to-indigo-900/20"><div className="flex items-center gap-2"><item.icon className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-black text-slate-900 dark:text-white">{item.title}</h3></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300" title={item.text}>{item.text}</p></div>)}
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <HrMetricCard icon={CalendarDays} label="Tâches en retard" value={lateTasks} description="Tâches non closes après échéance." accent={lateTasks ? "rose" : "emerald"} />
      <HrMetricCard icon={Flag} label="Jalons en retard" value={lateMilestones} description="Jalons critiques ou contractuels dépassés." accent={lateMilestones ? "rose" : "emerald"} />
      <HrMetricCard icon={ListChecks} label="Actions en retard" value={lateActions} description="Actions ouvertes après échéance." accent={lateActions ? "amber" : "emerald"} />
      <HrMetricCard icon={AlertTriangle} label="Projets critiques" value={red} description="Santé rouge ou risque critique." accent={red ? "rose" : "emerald"} />
      <HrMetricCard icon={Users} label="Sans chef de projet" value={missingManager} description="Responsabilité projet à compléter." accent={missingManager ? "amber" : "emerald"} />
      <HrMetricCard icon={CircleDollarSign} label="Budget manquant" value={missingBudget} description="Projet sans budget de référence." accent={missingBudget ? "amber" : "emerald"} />
    </div>
  </HrSectionCard>;
}

function HistoryPanel({ rows }: { rows: AnyRow[] }) {
  return <HrSectionCard icon={Clock3} title="Historique projet" description="Traçabilité des créations, arbitrages, validations, changements, archivages et décisions sensibles.">
    <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600">
      <table className="min-w-[1000px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700"><thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Événement","Action","Objet","Contrôle ISO","Date"].map((label,index)=><th key={label} className={`${index===0?"sticky left-0 z-30":""} border-b border-slate-200 bg-inherit px-4 py-3 text-left`}>{label}</th>)}</tr></thead><tbody>{rows.map((row)=><tr key={row.id} className="hover:bg-indigo-50/40"><td className="sticky left-0 bg-white px-4 py-3 font-black dark:bg-slate-700">{row.event_title || row.action}</td><td className="px-4 py-3">{row.action}</td><td className="px-4 py-3">{row.entity_table}</td><td className="px-4 py-3">{row.iso9001_control_point || "—"}</td><td className="px-4 py-3">{formatDate(row.created_at)}</td></tr>)}</tbody></table>
    </div>
  </HrSectionCard>;
}

function EntityDrawer({ mode, row, onClose, onEdit }: { mode: ProjectPageMode; row: AnyRow; onClose: () => void; onEdit: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"><aside className="h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-800"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/30 dark:via-slate-800 dark:to-indigo-900/30"><div><h2 className="text-base font-black text-slate-950 dark:text-white">{entityTitle(mode,row)}</h2><p className="mt-1 text-xs text-slate-500">{entityDescription(mode,row)}</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button></div><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2"><HrInfo label="Statut" value={statusLabel(mode === "performance" ? row.health_status : projectStatus(row))} accent="emerald" /><HrInfo label="Responsable" value={row.manager_name || row.owner_name || "Non renseigné"} accent="indigo" /><HrInfo label="Début / situation" value={formatDate(row.start_date || row.planned_date || row.snapshot_date)} accent="sky" /><HrInfo label="Fin / échéance" value={formatDate(row.end_date || row.due_date || row.forecast_date)} accent="amber" /><HrInfo label="Avancement" value={`${Number(row.progress_percent || 0)} %`} accent="emerald" /><HrInfo label="Risque / priorité" value={row.risk_level || row.priority || "Normal"} accent="rose" /></div><HrSectionCard icon={Target} title="Contexte métier" description="Informations de pilotage, impacts, décisions, preuves et recommandations."><div className="grid gap-3 sm:grid-cols-2"><HrInfo label="Description" value={row.description || row.executive_comment || "À compléter"} /><HrInfo label="Impact" value={row.impact || "À qualifier"} accent="amber" /><HrInfo label="Cause" value={row.root_cause || "À analyser"} accent="rose" /><HrInfo label="Recommandation" value={row.recommendation || "À formaliser"} accent="emerald" /></div></HrSectionCard><div className="flex justify-end"><button type="button" onClick={onEdit} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Modifier {configs[mode].entity}</button></div></div></aside></div>;
}

function EntityForm({ mode, data, row, onClose, onSaved }: { mode: ProjectPageMode; data: ProjectData; row?: AnyRow | null; onClose: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState(
    row?.project_id ||
      (mode === "portfolio" ? row?.id : null) ||
      data.projects[0]?.id ||
      "",
  );
  const [name, setName] = useState(
    row?.name ||
      row?.title ||
      row?.project_name ||
      (mode === "performance" ? "Revue de performance" : ""),
  );
  const [code, setCode] = useState(row?.code || "");
  const [status, setStatus] = useState(
    row?.status ||
      (mode === "portfolio" || mode === "timeline"
        ? "planned"
        : mode === "performance"
          ? "green"
          : "todo"),
  );
  const [startDate, setStartDate] = useState(row?.start_date || row?.planned_date || row?.snapshot_date || new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(row?.end_date || row?.due_date || row?.forecast_date || "");
  const [description, setDescription] = useState(row?.description || row?.executive_comment || "");
  const [value, setValue] = useState(String(row?.budget_amount || row?.planned_hours || row?.progress_percent || ""));
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!name.trim() || (mode !== "portfolio" && !projectId)) return;
    setSaving(true);
    try {
      const count = entityRows(mode, enrichData(data)).length + 1;
      const generated = `${mode === "portfolio" ? "P" : mode === "timeline" ? "J" : mode === "gantt" ? "T" : mode === "actions" ? "A" : "H"}-${new Date().getFullYear()}-${String(count).padStart(4,"0")}`;
      let table = "project_projects";
      let payload: AnyRow = {};
      if (mode === "portfolio") payload = { organization_id: data.organization.id, code: code || generated, name: name.trim(), description: description || null, status, start_date: startDate || null, end_date: endDate || null, priority: "normal", project_type: "delivery", budget_amount: Number(value || 0), updated_at: new Date().toISOString() };
      if (mode === "timeline") { table = "project_milestones"; payload = { organization_id: data.organization.id, project_id: projectId, code: code || generated, name: name.trim(), description: description || null, status, planned_date: startDate, forecast_date: endDate || null, milestone_type: "delivery", updated_at: new Date().toISOString() }; }
      if (mode === "gantt") { table = "project_tasks"; payload = { organization_id: data.organization.id, project_id: projectId, code: code || generated, name: name.trim(), description: description || null, status, start_date: startDate || null, due_date: endDate || null, planned_hours: Number(value || 0), remaining_hours: Number(value || 0), task_type: "delivery", priority: "normal", updated_at: new Date().toISOString() }; }
      if (mode === "actions") { table = "project_actions"; payload = { organization_id: data.organization.id, project_id: projectId, code: code || generated, title: name.trim(), description: description || null, status, opened_at: startDate, due_date: endDate || null, priority: "normal", progress_percent: Number(value || 0), updated_at: new Date().toISOString() }; }
      if (mode === "performance") { table = "project_health_snapshots"; payload = { organization_id: data.organization.id, project_id: projectId, snapshot_date: startDate, progress_percent: Number(value || 0), schedule_score: 100, cost_score: 100, scope_score: 100, quality_score: 100, resource_score: 100, risk_score: 100, health_status: status, executive_comment: description || null, updated_at: new Date().toISOString() }; }
      const query = supabase.from(table as never) as any;
      const result = row ? await query.update(payload).eq("id", row.id).eq("organization_id", data.organization.id) : await query.insert(payload);
      if (result.error) throw result.error;
      onSaved(); onClose();
    } catch (error) { alert(error instanceof Error ? error.message : `Impossible d’enregistrer ${configs[mode].entity}.`); }
    finally { setSaving(false); }
  }
  const statusOptions =
    mode === "performance"
      ? ["green", "amber", "red"]
      : mode === "portfolio"
        ? ["draft", "planned", "active", "on_hold", "completed", "cancelled"]
        : mode === "timeline"
          ? ["planned", "active", "on_hold", "completed", "cancelled"]
          : ["todo", "in_progress", "blocked", "review", "done", "cancelled"];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/30 dark:via-slate-800 dark:to-indigo-900/30"><div><h2 className="text-sm font-black text-slate-950 dark:text-white">{row ? "Modifier" : "Nouveau"} {configs[mode].entity}</h2><p className="mt-1 text-xs text-slate-500">Formulaire PMO relié au portefeuille, aux ressources et aux indicateurs de pilotage.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2">{mode !== "portfolio" && <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Projet</span><select value={projectId} onChange={(event)=>setProjectId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{data.projects.map((project)=><option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label>}<label><span className="text-xs font-bold text-slate-600">Code</span><input value={code} onChange={(event)=>setCode(event.target.value)} placeholder="Généré automatiquement si vide" className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">Nom / titre</span><input value={name} onChange={(event)=>setName(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">Statut</span><select value={status} onChange={(event)=>setStatus(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{statusOptions.map((item)=><option key={item} value={item}>{statusLabel(item)}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600">Début / date</span><input type="date" value={startDate} onChange={(event)=>setStartDate(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">Fin / échéance</span><input type="date" value={endDate} onChange={(event)=>setEndDate(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label><span className="text-xs font-bold text-slate-600">{mode === "portfolio" ? "Budget (€)" : mode === "gantt" ? "Heures planifiées" : "Avancement (%)"}</span><input type="number" value={value} onChange={(event)=>setValue(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label><label className="sm:col-span-2"><span className="text-xs font-bold text-slate-600">Description / commentaire exécutif</span><textarea value={description} onChange={(event)=>setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700" /></label></div><div className="flex justify-end gap-2 border-t border-slate-100 p-5"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Annuler</button><button type="button" onClick={()=>void save()} disabled={saving || !name.trim()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">Enregistrer</button></div></div></div>;
}

const exportColumns: ExportColumn<AnyRow>[] = [
  { key: "id", label: "ID", value: (row) => row.id },
  { key: "project", label: "Projet", value: (row) => row.project_code || row.code },
  { key: "name", label: "Nom / titre", value: (row) => row.name || row.title || row.project_name },
  { key: "description", label: "Description", value: (row) => row.description || row.executive_comment },
  { key: "status", label: "Statut", value: (row) => row.health_status || row.status },
  { key: "owner", label: "Responsable", value: (row) => row.manager_name || row.owner_name },
  { key: "start", label: "Début / date", value: (row) => row.start_date || row.planned_date || row.snapshot_date },
  { key: "end", label: "Fin / échéance", value: (row) => row.end_date || row.due_date || row.forecast_date },
  { key: "progress", label: "Avancement (%)", value: (row) => row.progress_percent },
  { key: "budget", label: "Budget", value: (row) => row.budget_amount },
  { key: "actual_cost", label: "Coût réel", value: (row) => row.actual_cost },
  { key: "forecast", label: "Prévision à terminaison", value: (row) => row.estimate_at_completion || row.forecast_cost },
  { key: "risk", label: "Risque / priorité", value: (row) => row.risk_level || row.priority },
  { key: "organization", label: "Organisation", value: (row) => row.organization_id },
  { key: "created", label: "Créé le", value: (row) => row.created_at },
  { key: "updated", label: "Mis à jour le", value: (row) => row.updated_at },
  { key: "archived", label: "Archivé le", value: (row) => row.archived_at },
];

export default function ProjectManagementPage({ params, mode }: { params: Promise<PageParams>; mode: ProjectPageMode }) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();
  const config = configs[mode];
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [editing, setEditing] = useState<AnyRow | null | undefined>(undefined);
  const query = useQuery({ queryKey: ["project-pmo", orgId], queryFn: () => loadProjectData(orgId) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["project-pmo", orgId] });
  const archiveMutation = useMutation({ mutationFn: async ({ row, restore }: { row: AnyRow; restore: boolean }) => {
    const table = mode === "portfolio" ? "project_projects" : mode === "timeline" ? "project_milestones" : mode === "gantt" ? "project_tasks" : mode === "actions" ? "project_actions" : "project_health_snapshots";
    const payload = restore ? { archived_at: null, status: mode === "portfolio" ? "active" : mode === "timeline" ? "planned" : mode === "gantt" || mode === "actions" ? "todo" : undefined } : { archived_at: new Date().toISOString(), status: mode === "performance" ? undefined : "archived" };
    const { error } = await (supabase.from(table as never) as any).update(payload).eq("id", row.id).eq("organization_id", row.organization_id); if (error) throw error;
  }, onSuccess: refresh });
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">Chargement du module Projets…</div>;
  if (query.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger {config.title} : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const data = query.data as ProjectData;
  const enriched = enrichData(data);
  const rawRows = entityRows(mode, enriched);
  const rows = rawRows.filter((row) => {
    const haystack = [entityTitle(mode,row), entityDescription(mode,row), row.owner_name, row.manager_name].join(" ").toLowerCase();
    return (!search.trim() || haystack.includes(search.trim().toLowerCase())) && (status === "all" || String(mode === "performance" ? row.health_status : projectStatus(row)) === status) && (project === "all" || row.project_id === project || row.id === project);
  });
  const totalBudget = enriched.projects.reduce((sum,row)=>sum+Number(row.budget_amount||0),0);
  const activeProjects = enriched.projects.filter((row)=>["active","planned"].includes(row.status)).length;
  const late = data.tasks.filter((row)=>row.due_date && row.due_date < new Date().toISOString().slice(0,10) && !["done","cancelled","archived"].includes(row.status)).length;
  const averageProgress = enriched.projects.length ? Math.round(enriched.projects.reduce((sum,row)=>sum+Number(row.progress_percent||0),0)/enriched.projects.length) : 0;
  const tabs: Array<{key:TabKey;label:string;icon:ComponentType<{className?:string}>;active:string;inactive:string}> = [
    {key:"pilotage",label:"Pilotage",icon:config.icon,active:"bg-indigo-600 text-white",inactive:"text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"},
    {key:"analyses",label:"Analyses",icon:BarChart3,active:"bg-emerald-600 text-white",inactive:"text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"},
    {key:"alerts",label:"Alertes",icon:AlertTriangle,active:"bg-amber-500 text-white",inactive:"text-slate-500 hover:bg-amber-50 hover:text-amber-700"},
    {key:"history",label:"Historique",icon:Clock3,active:"bg-rose-600 text-white",inactive:"text-slate-500 hover:bg-rose-50 hover:text-rose-700"},
  ];
  return <div className="space-y-6">
    <PageHeader title={config.title} subtitle={config.subtitle} actions={<><DataExportMenu data={rows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={config.title} disabled={!rows.length} /><button type="button" onClick={()=>setEditing(null)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />Nouveau {config.entity}</button></>} />
    <PageTutorial title="Guide de la page" description={config.guide} objectives={["Piloter délais, coûts, périmètre, qualité, ressources, risques et valeur client.","Relier portefeuille, commerce, staffing, temps, compétences, finance et preuves ISO 9001."]} steps={[{title:"Cadrer",description:"Créer les objets PMO, responsables, dates, budgets, baselines, jalons et critères d’acceptation."},{title:"Piloter",description:"Mettre à jour avancement, reste à faire, coûts, dépendances, actions, santé et prévisions."},{title:"Arbitrer",description:"Analyser alertes, capacité, écarts et recommandations avant décision."}]} analyses={[{title:"Performance intégrée",description:"Comparer avancement, SPI, CPI, EAC, charge, marge, qualité et risque sur le même périmètre."}]} recommendations={["Baseliner tout engagement client avant démarrage.","Tracer chaque changement, décision et preuve qualité.","Arbitrer charge et compétences avec Ressources et Staffing."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={FolderKanban} label="Projets actifs" value={activeProjects} description="Projets planifiés ou en cours." accent="indigo" /><HrMetricCard icon={CircleDollarSign} label="Budget portefeuille" value={formatCurrency(totalBudget)} description="Budget total du périmètre projet." accent="emerald" /><HrMetricCard icon={Target} label="Avancement moyen" value={`${averageProgress} %`} description="Progression consolidée du portefeuille." accent="amber" /><HrMetricCard icon={AlertTriangle} label="Tâches en retard" value={late} description="Échéances dépassées non closes." accent="rose" /></section>
    <EntityFilters data={data} search={search} status={status} project={project} onSearch={setSearch} onStatus={setStatus} onProject={setProject} resultCount={rows.length} totalCount={rawRows.length} />
    <div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700/70">{tabs.map((item)=>{const Icon=item.icon;return <button key={item.key} type="button" onClick={()=>setTab(item.key)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-bold transition ${tab===item.key?item.active:item.inactive}`}><Icon className="h-4 w-4" />{item.label}</button>;})}</div></div>
    {tab === "pilotage" && <HrSectionCard icon={config.icon} title={config.title} description="Cards et tableau professionnels avec actions Voir, Modifier, Archiver et Réactiver." right={<div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={()=>setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view==="cards"?"bg-indigo-600 text-white":"text-slate-500"}`}>Cartes</button><button type="button" onClick={()=>setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view==="table"?"bg-indigo-600 text-white":"text-slate-500"}`}>Tableau</button></div>}>
      {mode === "gantt" && <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-600 dark:bg-slate-700"><GanttOverview tasks={rows} /></div>}
      {!rows.length ? <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">Aucune donnée dans ce périmètre. Utilise “Nouveau {config.entity}” pour commencer.</p> : view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{rows.map((row)=><EntityCard key={row.id} mode={mode} row={row} onView={()=>setSelected(row)} onEdit={()=>setEditing(row)} onArchive={()=>archiveMutation.mutate({row,restore:false})} onRestore={()=>archiveMutation.mutate({row,restore:true})} />)}</div> : <EntityTable mode={mode} rows={rows} onView={setSelected} onEdit={setEditing} onArchive={(row)=>archiveMutation.mutate({row,restore:false})} onRestore={(row)=>archiveMutation.mutate({row,restore:true})} />}
    </HrSectionCard>}
    {tab === "analyses" && <AnalysesPanel data={data} />}
    {tab === "alerts" && <AlertsPanel data={data} />}
    {tab === "history" && <HistoryPanel rows={data.audit} />}
    {selected && <EntityDrawer mode={mode} row={selected} onClose={()=>setSelected(null)} onEdit={()=>{setEditing(selected);setSelected(null);}} />}
    {editing !== undefined && <EntityForm mode={mode} data={data} row={editing} onClose={()=>setEditing(undefined)} onSaved={refresh} />}
  </div>;
}
