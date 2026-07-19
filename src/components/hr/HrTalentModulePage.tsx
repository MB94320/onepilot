"use client";

import { use, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Expand,
  Eye,
  Gauge,
  GraduationCap,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TrendingUp,
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
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type PageParams = { orgId: string };
type HrTalentModuleKey = "time" | "skills" | "onboarding" | "reviews";
type DisplayMode = "cards" | "table";
type TabKey = "main" | "graphs" | "library" | "alerts" | "history";
type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky" | "slate";

type Organization = { id: string; name?: string | null; slug?: string | null };
type Employee = {
  id: string;
  full_name?: string | null;
  employee_number?: string | null;
  email?: string | null;
  professional_email?: string | null;
  status?: string | null;
  manager_employee_id?: string | null;
  manager_name?: string | null;
  site_name?: string | null;
  department_name?: string | null;
  job_name?: string | null;
  function_name?: string | null;
  site_free_text?: string | null;
  department_free_text?: string | null;
  job_free_text?: string | null;
  function_free_text?: string | null;
};

type SkillCatalogItem = {
  id: string;
  code?: string | null;
  name: string;
  family?: string | null;
  category?: string | null;
  description?: string | null;
  criticality?: string | null;
  level_expectations?: Record<string, string> | null;
  is_active?: boolean | null;
};

type AnyRow = Record<string, any>;
type ModuleData = {
  organization: Organization;
  employees: Employee[];
  rows: AnyRow[];
  catalog: SkillCatalogItem[];
  cycles: AnyRow[];
};

type FilterValue = {
  search: string;
  status: string;
  resource: string;
  department: string;
  module: string;
  submodule: string;
  level: string;
  need: string;
  period: string;
  activity: string;
};

const emptyFilters: FilterValue = {
  search: "",
  status: "all",
  resource: "all",
  department: "all",
  module: "all",
  submodule: "all",
  level: "all",
  need: "all",
  period: "all",
  activity: "all",
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

const levelLabels = [
  "Niveau 0 · Profane",
  "Niveau 1 · Sensibilisé",
  "Niveau 2 · Autonome encadré",
  "Niveau 3 · Confirmé",
  "Niveau 4 · Expert",
];

const levelShortLabels = ["N0", "N1", "N2", "N3", "N4"];
const chartPalette = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function clampLevel(value: unknown) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(4, numeric));
}

function formatDate(value?: string | null) {
  if (!value) return "Non renseigné";
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getWeekNumber(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return String(Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)).padStart(2, "0");
}

function getMonthLabel(value?: string | null) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
}

function getDayName(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
}

function addOneYear(value?: string | null) {
  if (!value) return "À planifier";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "À planifier";
  date.setFullYear(date.getFullYear() + 1);
  return formatDate(date.toISOString());
}

function uniqueValues<T>(items: T[], resolver: (item: T) => string | null | undefined) {
  return Array.from(new Set(items.map(resolver).filter((value): value is string => Boolean(value?.trim())))).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getEmployeeDepartment(row: AnyRow | Employee) {
  return row.department_free_text || row.department_name || "Non renseigné";
}

function getEmployeeJob(row: AnyRow | Employee) {
  return row.job_free_text || row.job_name || row.function_free_text || row.function_name || "Non renseigné";
}

function fullName(row: AnyRow | Employee) {
  const value = row as AnyRow;
  return value.full_name || value.employee_name || value.employee_number || "Ressource non renseignée";
}

function getConfig(moduleKey: HrTalentModuleKey) {
  if (moduleKey === "time") {
    return {
      title: "Temps & activités",
      subtitle: "Saisie, validation et pilotage des temps projet, internes, formation et écarts capacité/réel.",
      newLabel: "Nouveau temps",
      primaryTab: "Activités",
      exportFile: "rh_temps_activites",
      icon: Clock3,
      guideTitle: "Piloter les temps et activités",
      guideDescription: "Suivre le temps saisi, les validations, les écarts et la contribution aux projets sans ressaisie entre RH, staffing et finance. Les pointages alimentent les coûts, les rappels de clôture mensuelle, la capacité et le pilotage N+1.",
    };
  }

  if (moduleKey === "skills") {
    return {
      title: "Compétences",
      subtitle: "Bibliothèque, auto-évaluations, écarts, experts internes et préparation staffing/projets.",
      newLabel: "Nouvelle évaluation",
      primaryTab: "Ressources",
      exportFile: "rh_competences",
      icon: GraduationCap,
      guideTitle: "Piloter les compétences",
      guideDescription: "Structurer la bibliothèque, suivre les niveaux par ressource et préparer formation, mobilité, staffing et entretiens. Les niveaux 0 à 4 servent l’auto-évaluation, les besoins projet et le développement des compétences.",
    };
  }

  if (moduleKey === "onboarding") {
    return {
      title: "Onboarding",
      subtitle: "Parcours d’intégration, checklist RH/manager/IT/qualité et validation avant archivage.",
      newLabel: "Nouveau parcours",
      primaryTab: "Parcours",
      exportFile: "rh_onboarding",
      icon: ListChecks,
      guideTitle: "Piloter les intégrations",
      guideDescription: "Sécuriser l’arrivée, les accès, les objectifs 30/60/90 jours, la checklist et la validation RH/manager. Le parcours couvre RH, IT, qualité, projet, manager, livrables, période d’essai et preuves ISO 9001.",
    };
  }

  return {
    title: "Entretiens & objectifs",
    subtitle: "Campagnes, bilan N-1, objectifs en cours, formations, validations collaborateur et manager.",
    newLabel: "Nouvel entretien",
    primaryTab: "Entretiens",
    exportFile: "rh_entretiens_objectifs",
    icon: Target,
    guideTitle: "Piloter les entretiens et objectifs",
    guideDescription: "Consolider performance, objectifs, compétences, formation, feedbacks et validations collaborateur/manager. Les entretiens capitalisent l’année écoulée, les objectifs en cours et le plan de développement.",
  };
}

function labelStatus(moduleKey: HrTalentModuleKey, status?: string | null) {
  const common: Record<string, string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    manager_approved: "Validé manager",
    approved: "Validé",
    rejected: "Refusé",
    active: "Actif",
    to_develop: "À développer",
    validated: "Validé",
    obsolete: "Obsolète",
    prepared: "Préparé",
    in_progress: "En cours",
    completed: "Terminé",
    delayed: "En retard",
    cancelled: "Annulé",
    not_started: "Non démarré",
    employee_input: "Saisie collaborateur",
    manager_input: "Saisie manager",
    calibration: "Calibration",
    open: "Ouvert",
    archived: "Archivé",
  };

  return common[String(status || "")] || status || (moduleKey === "skills" ? "À évaluer" : "Non renseigné");
}

function getChecklistStats(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  const ok = items.filter((item: any) => item?.status === "OK").length;
  const nok = items.filter((item: any) => item?.status === "NOK").length;
  const na = items.filter((item: any) => item?.status === "NA").length;
  return { ok, nok, na, total: items.length };
}

async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (supabase.from("organizations" as never) as any).select("id, name, slug");
  const result = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();

  if (result.error) throw new Error(`Impossible d’identifier l’organisation : ${result.error.message}`);
  if (!result.data?.id) throw new Error("L’organisation demandée est introuvable.");
  return result.data as Organization;
}

async function loadData(slugOrId: string, moduleKey: HrTalentModuleKey): Promise<ModuleData> {
  const organization = await resolveOrganization(slugOrId);

  const [employeeResult, catalogResult, cycleResult] = await Promise.all([
    (supabase.from("hr_employee_overview" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .limit(500),
    (supabase.from("hr_skill_catalog" as never) as any)
      .select("id, code, name, family, category, description, criticality, level_expectations, is_active, archived_at")
      .eq("organization_id", organization.id)
      .is("archived_at", null)
      .order("family", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(1000),
    (supabase.from("hr_review_cycles" as never) as any)
      .select("id, name, review_type, period_start, period_end, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (employeeResult.error) throw new Error(`Impossible de charger les ressources : ${employeeResult.error.message}`);
  if (catalogResult.error) throw new Error(`Impossible de charger la bibliothèque de compétences : ${catalogResult.error.message}`);
  if (cycleResult.error) throw new Error(`Impossible de charger les campagnes : ${cycleResult.error.message}`);

  const employees = (employeeResult.data ?? []) as Employee[];
  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const cycles = (cycleResult.data ?? []) as AnyRow[];
  const cyclesById = new Map(cycles.map((cycle) => [cycle.id, cycle]));
  const catalog = (catalogResult.data ?? []) as SkillCatalogItem[];
  const catalogById = new Map(catalog.map((skill) => [skill.id, skill]));

  let rowResult: any;

  if (moduleKey === "time") {
    rowResult = await (supabase.from("hr_time_activity_entries" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("activity_date", { ascending: false })
      .limit(500);
  } else if (moduleKey === "skills") {
    rowResult = await (supabase.from("hr_employee_skills" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false })
      .limit(2000);
  } else if (moduleKey === "onboarding") {
    rowResult = await (supabase.from("hr_onboarding_plans" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(500);
  } else {
    rowResult = await (supabase.from("hr_review_items" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(500);
  }

  if (rowResult.error) throw new Error(`Impossible de charger les données : ${rowResult.error.message}`);

  const rows = ((rowResult.data ?? []) as AnyRow[]).map((row) => {
    const employee = employeesById.get(row.employee_id);
    const manager = employeesById.get(row.manager_employee_id || employee?.manager_employee_id || "");
    const skill = row.skill_id ? catalogById.get(row.skill_id) : null;
    const cycle = row.cycle_id ? cyclesById.get(row.cycle_id) : null;
    const currentLevel = clampLevel(row.current_level ?? row.level);
    const targetLevel = clampLevel(row.target_level ?? currentLevel);

    return {
      ...row,
      full_name: employee?.full_name ?? null,
      employee_number: employee?.employee_number ?? null,
      email: employee?.professional_email || employee?.email || null,
      site_name: employee?.site_free_text || employee?.site_name || null,
      department_name: employee?.department_free_text || employee?.department_name || null,
      job_name: employee?.job_free_text || employee?.job_name || employee?.function_free_text || employee?.function_name || null,
      manager_name: manager?.full_name || employee?.manager_name || null,
      skill_name: skill?.name ?? row.skill_name ?? null,
      family: skill?.family ?? row.family ?? null,
      category: skill?.category ?? row.category ?? null,
      skill_description: skill?.description ?? null,
      criticality: skill?.criticality ?? row.criticality ?? null,
      level_expectations: skill?.level_expectations ?? null,
      current_level: currentLevel,
      target_level: targetLevel,
      gap: Math.max(0, targetLevel - currentLevel),
      cycle_name: cycle?.name ?? null,
      review_type: cycle?.review_type ?? null,
      period_start: cycle?.period_start ?? null,
      period_end: cycle?.period_end ?? null,
    };
  });

  return { organization, employees, rows, catalog, cycles };
}

function filterRows(moduleKey: HrTalentModuleKey, rows: AnyRow[], filters: FilterValue) {
  const search = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    const searchable = [
      fullName(row),
      row.employee_number,
      row.email,
      getEmployeeDepartment(row),
      getEmployeeJob(row),
      row.manager_name,
      row.status,
      row.skill_name,
      row.family,
      row.category,
      row.description,
      row.notes,
      row.project_context,
      row.cycle_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (search && !searchable.includes(search)) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.resource !== "all" && row.employee_id !== filters.resource) return false;
    if (filters.department !== "all" && getEmployeeDepartment(row) !== filters.department) return false;

    if (moduleKey === "time") {
      if (filters.activity !== "all" && row.activity_type !== filters.activity) return false;
      if (filters.period !== "all") {
        const date = row.activity_date ? new Date(row.activity_date) : null;
        const now = new Date();
        if (!date || Number.isNaN(date.getTime())) return false;
        if (filters.period === "current_month" && (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth())) return false;
        if (filters.period === "current_year" && date.getFullYear() !== now.getFullYear()) return false;
        if (filters.period === "previous_month") {
          const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (date.getFullYear() !== previous.getFullYear() || date.getMonth() !== previous.getMonth()) return false;
        }
      }
    }

    if (moduleKey === "skills") {
      if (filters.module !== "all" && row.family !== filters.module) return false;
      if (filters.submodule !== "all" && row.category !== filters.submodule) return false;
      if (filters.level !== "all" && String(clampLevel(row.current_level ?? row.level)) !== filters.level) return false;
      if (filters.need === "gap" && Number(row.gap ?? 0) <= 0) return false;
      if (filters.need === "critical" && row.criticality !== "critical") return false;
      if (filters.need === "expert" && clampLevel(row.current_level) < 3) return false;
      if (filters.need === "project_gap" && !(String(row.project_context ?? "").length > 0 && Number(row.gap ?? 0) > 0)) return false;
    } else if (filters.need === "gap") {
      if (!["submitted", "manager_approved", "to_develop", "delayed", "employee_input", "manager_input", "calibration"].includes(String(row.status))) return false;
    } else if (filters.need === "critical") {
      if (!(row.risk_level === "high" || row.status === "rejected")) return false;
    }

    return true;
  });
}

function SectionCard({
  icon: Icon,
  title,
  description,
  right,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p>
            </div>
          </div>
          {right}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, description, icon: Icon, accent }: { label: string; value: ReactNode; description: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; accent: Accent }) {
  const accentClasses: Record<Accent, { panel: string; icon: string; value: string }> = {
    indigo: {
      panel: "border-indigo-100 from-indigo-50/85 via-white to-violet-50/65 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20",
      icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      value: "text-indigo-700 dark:text-indigo-300",
    },
    emerald: {
      panel: "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
      panel: "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      value: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      panel: "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-950 dark:to-pink-950/20",
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      value: "text-rose-700 dark:text-rose-300",
    },
    sky: {
      panel: "border-sky-100 from-sky-50/85 via-white to-cyan-50/65 dark:border-sky-900/50 dark:from-sky-950/30 dark:via-slate-950 dark:to-cyan-950/20",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      value: "text-sky-700 dark:text-sky-300",
    },
    slate: {
      panel: "border-slate-100 from-slate-50/85 via-white to-slate-50/65 dark:border-slate-800 dark:from-slate-900/40 dark:via-slate-950 dark:to-slate-900/20",
      icon: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
      value: "text-slate-700 dark:text-slate-300",
    },
  };
  const classes = accentClasses[accent];

  return (
    <article className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.panel}`}>
      <div className="flex h-full items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}>
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p>
            <p className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}>{value}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value, accent = "slate" }: { label: string; value: ReactNode; accent?: Accent }) {
  const classes: Record<Accent, string> = {
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  };

  return (
    <div className={`rounded-xl px-3 py-2 ${classes[accent]}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 truncate text-xs font-bold" title={String(value ?? "")}>{value}</p>
    </div>
  );
}

function ActionMenu({
  labels,
  onView,
  onEdit,
  onArchive,
  onRestore,
  canRestore = false,
}: {
  labels: { view: string; edit: string; archive: string; restore: string };
  onView?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  canRestore?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function executeAction(action?: () => void) {
    if (!action) return;
    setIsProcessing(true);
    try {
      action();
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Voir, modifier, archiver ou réactiver la fiche"
        title="Voir, modifier, archiver ou réactiver"
        disabled={isProcessing}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/60 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-700/35 dark:hover:text-indigo-300"
      >
        {isProcessing ? <Archive className="h-3.5 w-3.5 animate-pulse" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
      </button>

      {isOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-600/60 dark:bg-slate-700/70"
        >
          {canRestore ? (
            <button type="button" onClick={() => void executeAction(onRestore)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
              <ArchiveRestore className="h-4 w-4" />
              {labels.restore}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => void executeAction(onView)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-700/35">
                <Eye className="h-4 w-4" />
                {labels.view}
              </button>
              <button type="button" onClick={() => void executeAction(onEdit)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-700/35">
                <Edit3 className="h-4 w-4" />
                {labels.edit}
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-600/60" />
              <button type="button" onClick={() => void executeAction(onArchive)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600/70">
                <Archive className="h-4 w-4" />
                {labels.archive}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FiltersPanel({ moduleKey, rows, catalog, employees, value, onChange, resultCount }: { moduleKey: HrTalentModuleKey; rows: AnyRow[]; catalog: SkillCatalogItem[]; employees: Employee[]; value: FilterValue; onChange: (value: FilterValue) => void; resultCount: number }) {
  const statuses = uniqueValues(rows, (row) => row.status);
  const departments = uniqueValues(rows, getEmployeeDepartment);
  const modules = uniqueValues(catalog, (skill) => skill.family);
  const submodules = uniqueValues(catalog.filter((skill) => value.module === "all" || skill.family === value.module), (skill) => skill.category);
  const activityTypes = uniqueValues(rows, (row) => row.activity_type);
  const hasFilters = JSON.stringify(value) !== JSON.stringify(emptyFilters);

  function update<K extends keyof FilterValue>(field: K, fieldValue: FilterValue[K]) {
    const next = { ...value, [field]: fieldValue };
    if (field === "module") next.submodule = "all";
    onChange(next);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><SlidersHorizontal className="h-4 w-4" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Les filtres pilotent les KPI, les analyses, les graphiques et les exports.</p>
            </div>
          </div>
          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
            {resultCount} résultat{resultCount > 1 ? "s" : ""} sur {rows.length}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
          <input
            type="search"
            value={value.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Rechercher une ressource, compétence, module, projet, manager, statut..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select value={value.status} onChange={(event) => update("status", event.target.value)} className={selectClassName}>
            <option value="all">Tous les statuts</option>
            {statuses.map((status) => <option key={status} value={status}>{labelStatus(moduleKey, status)}</option>)}
          </select>
          <select value={value.department} onChange={(event) => update("department", event.target.value)} className={selectClassName}>
            <option value="all">Tous les services</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <select value={value.resource} onChange={(event) => update("resource", event.target.value)} className={selectClassName}>
            <option value="all">Toutes les ressources</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number || employee.id}</option>)}
          </select>
          {moduleKey === "skills" ? (
            <select value={value.module} onChange={(event) => update("module", event.target.value)} className={selectClassName}>
              <option value="all">Tous les modules</option>
              {modules.map((module) => <option key={module} value={module}>{module}</option>)}
            </select>
          ) : (
            <select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}>
              <option value="all">Tous les besoins</option>
              <option value="gap">Action à traiter</option>
              <option value="critical">Risque critique</option>
            </select>
          )}
          {moduleKey === "skills" && (
            <>
              <select value={value.submodule} onChange={(event) => update("submodule", event.target.value)} className={selectClassName}>
                <option value="all">Tous les sous-modules</option>
                {submodules.map((submodule) => <option key={submodule} value={submodule}>{submodule}</option>)}
              </select>
              <select value={value.level} onChange={(event) => update("level", event.target.value)} className={selectClassName}>
                <option value="all">Tous les niveaux</option>
                <option value="0">Niveau 0</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
                <option value="4">Niveau 4</option>
              </select>
              <select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}>
                <option value="all">Tous les besoins</option>
                <option value="gap">Écart cible / réel</option>
                <option value="critical">Compétence critique</option>
                <option value="expert">Experts disponibles</option>
                <option value="project_gap">Écart besoin projet</option>
              </select>
            </>
          )}
          {moduleKey === "time" && (
            <>
              <select value={value.period} onChange={(event) => update("period", event.target.value)} className={selectClassName}>
                <option value="all">Toutes les périodes</option>
                <option value="current_month">Mois en cours</option>
                <option value="previous_month">Mois précédent</option>
                <option value="current_year">Année en cours</option>
              </select>
              <select value={value.activity} onChange={(event) => update("activity", event.target.value)} className={selectClassName}>
                <option value="all">Toutes les rubriques</option>
                {activityTypes.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
              </select>
            </>
          )}
        </div>
        {hasFilters && (
          <div className="flex justify-end">
            <button type="button" onClick={() => onChange(emptyFilters)} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white">
              <X className="h-4 w-4" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function buildSkillResourceSummaries(rows: AnyRow[], employees: Employee[]) {
  const rowsByEmployee = new Map<string, AnyRow[]>();
  rows.forEach((row) => {
    const key = row.employee_id || "missing";
    rowsByEmployee.set(key, [...(rowsByEmployee.get(key) ?? []), row]);
  });

  return Array.from(rowsByEmployee.entries()).map(([employeeId, employeeRows]) => {
    const employee = employees.find((item) => item.id === employeeId) || employeeRows[0] || ({ id: employeeId } as Employee);
    const counts = [0, 0, 0, 0, 0];
    employeeRows.forEach((row) => counts[clampLevel(row.current_level)] += 1);
    const lastEvaluation = employeeRows.map((row) => row.last_self_assessment_at || row.assessment_date || row.updated_at).filter(Boolean).sort().at(-1) || null;
    const strongSkills = employeeRows.filter((row) => clampLevel(row.current_level) >= 3).map((row) => row.skill_name).filter(Boolean).slice(0, 4);
    const weakSkills = employeeRows.filter((row) => clampLevel(row.current_level) <= 1 || Number(row.gap ?? 0) > 0).map((row) => row.skill_name).filter(Boolean).slice(0, 4);
    const mentors = rows
      .filter((candidate) => candidate.employee_id !== employeeId && clampLevel(candidate.current_level) >= 3 && employeeRows.some((gap) => gap.skill_id === candidate.skill_id && Number(gap.gap ?? 0) > 0))
      .map((candidate) => fullName(candidate))
      .filter(Boolean)
      .slice(0, 5);

    return { employee, rows: employeeRows, counts, lastEvaluation, strongSkills, weakSkills, mentors };
  }).sort((a, b) => fullName(a.employee).localeCompare(fullName(b.employee), "fr", { sensitivity: "base" }));
}

function SkillResourceCard({ summary, onArchive }: { summary: ReturnType<typeof buildSkillResourceSummaries>[number]; onArchive: () => void }) {
  const employee = summary.employee as any;
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{fullName(employee)}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{employee.employee_number || "Matricule non renseigné"} · {getEmployeeDepartment(employee)} · {getEmployeeJob(employee)}</p>
        </div>
        <ActionMenu labels={{ view: "Voir la ressource", edit: "Modifier la ressource", archive: "Archiver la ressource", restore: "Réactiver la ressource" }} onArchive={onArchive} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Info label="Dernière évaluation" value={formatDate(summary.lastEvaluation)} accent="sky" />
        <Info label="Prochaine évaluation" value={addOneYear(summary.lastEvaluation)} accent="indigo" />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {summary.counts.map((count, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center dark:border-slate-600/60 dark:bg-slate-800/70">
            <p className="text-[10px] font-black text-slate-400">{levelShortLabels[index]}</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{count}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Compétences fortes ≥ 3</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">{summary.strongSkills.length ? summary.strongSkills.join(" · ") : "Aucune compétence forte identifiée sur le périmètre."}</p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-900/20">
          <p className="text-[10px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">Compétences ≤ 1 / écarts</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold text-rose-800 dark:text-rose-200">{summary.weakSkills.length ? summary.weakSkills.join(" · ") : "Aucun écart majeur détecté."}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-900/20">
        <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Experts internes pour accompagner</p>
        <p className="mt-1 line-clamp-2 text-xs font-bold text-indigo-800 dark:text-indigo-200">{summary.mentors.length ? summary.mentors.join(" · ") : "Aucun expert interne identifié sur les écarts filtrés."}</p>
      </div>
    </article>
  );
}

function SkillResourceTable({ rows, onArchive }: { rows: AnyRow[]; onArchive: (row: AnyRow) => void }) {
  return (
    <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70">
      <table className="w-full min-w-[1380px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <tr>
            <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Ressource</th>
            <th className="px-4 py-3 text-left">Module</th>
            <th className="px-4 py-3 text-left">Sous-module</th>
            <th className="px-4 py-3 text-left">Compétence</th>
            <th className="px-4 py-3 text-left">Niveau actuel</th>
            <th className="px-4 py-3 text-left">Niveau cible</th>
            <th className="px-4 py-3 text-left">Écart</th>
            <th className="px-4 py-3 text-left">Projet / besoin</th>
            <th className="px-4 py-3 text-left">Preuve</th>
            <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{fullName(row)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.family || "—"}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.category || "—"}</td>
              <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{row.skill_name || "—"}</td>
              <td className="px-4 py-3">{levelLabels[clampLevel(row.current_level)]}</td>
              <td className="px-4 py-3">{levelLabels[clampLevel(row.target_level)]}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${Number(row.gap ?? 0) > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>{row.gap ?? 0}</span></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.project_context || "—"}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.evidence || "—"}</td>
              <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu labels={{ view: "Voir la ressource", edit: "Modifier la ressource", archive: "Archiver la ressource", restore: "Réactiver la ressource" }} onArchive={() => onArchive(row)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LibraryPanel({ catalog, rows }: { catalog: SkillCatalogItem[]; rows: AnyRow[] }) {
  const employees = uniqueValues(rows, (row) => fullName(row));
  return (
    <SectionCard icon={BookOpen} title="Bibliothèque de compétences" description="Référentiel complet : modules, sous-modules, compétences, attendus de niveau et auto-évaluations par ressource.">
      <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70">
        <table className="w-full min-w-[1720px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65">
          <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Module</th>
              <th className="px-4 py-3 text-left">Sous-module</th>
              <th className="px-4 py-3 text-left">Compétence</th>
              <th className="px-4 py-3 text-left">Criticité</th>
              <th className="px-4 py-3 text-left">Description Niveau 0</th>
              <th className="px-4 py-3 text-left">Description Niveau 1</th>
              <th className="px-4 py-3 text-left">Description Niveau 2</th>
              <th className="px-4 py-3 text-left">Description Niveau 3</th>
              <th className="px-4 py-3 text-left">Description Niveau 4</th>
              {employees.slice(0, 12).map((employee) => <th key={employee} className="px-4 py-3 text-left">{employee}</th>)}
              <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((skill) => {
              const expectations = skill.level_expectations || {};
              return (
                <tr key={skill.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{skill.family || "—"}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{skill.category || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{skill.name}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300">{skill.criticality || "standard"}</span></td>
                  {[0, 1, 2, 3, 4].map((level) => <td key={level} className="px-4 py-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{expectations[String(level)] || "—"}</td>)}
                  {employees.slice(0, 12).map((employee) => {
                    const match = rows.find((row) => row.skill_id === skill.id && fullName(row) === employee);
                    return <td key={employee} className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{match ? `N${clampLevel(match.current_level)}` : "—"}</td>;
                  })}
                  <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu labels={{ view: "Voir la compétence", edit: "Modifier la compétence", archive: "Archiver la compétence", restore: "Réactiver la compétence" }} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function OnboardingChecklist({ row }: { row: AnyRow }) {
  const items = Array.isArray(row.checklist_items) ? row.checklist_items : [];
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-600/60 dark:bg-slate-800/55">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-950 dark:text-white">Checklist d’intégration</p>
        <div className="flex gap-1.5">
          {(["OK", "NOK", "NA"] as const).map((status) => (
            <span key={status} className={`rounded-full px-2 py-1 text-[10px] font-black ${status === "OK" ? "bg-emerald-50 text-emerald-700" : status === "NOK" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"}`}>{status} {items.filter((item: any) => item?.status === status).length}</span>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.filter((item: any) => item?.status === "NOK").slice(0, 5).map((item: any, index: number) => (
          <div key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-700/70">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{item.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-300">{item.owner} · {item.note}</p>
            </div>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">NOK</span>
          </div>
        ))}
        {items.filter((item: any) => item?.status === "NOK").length === 0 && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Aucun point bloquant déclaré.</p>}
      </div>
    </div>
  );
}

function ReviewTemplate({ row }: { row: AnyRow }) {
  const details = row.review_details || {};
  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <Info label="Bilan année écoulée" value={details?.previous_year?.objectives || "À compléter"} accent="sky" />
      <Info label="Atteinte N-1" value={`${details?.previous_year?.achievement ?? 0} %`} accent="emerald" />
      <Info label="Objectifs en cours" value={details?.current_year?.objectives || "À définir"} accent="indigo" />
      <Info label="Formations à prévoir" value={Array.isArray(details?.training) ? details.training.join(" · ") : "À qualifier"} accent="amber" />
      <Info label="Validation collaborateur" value={details?.employee_validation ? "OK" : "NOK"} accent={details?.employee_validation ? "emerald" : "rose"} />
      <Info label="Validation N+1" value={details?.manager_validation ? "OK" : "NOK"} accent={details?.manager_validation ? "emerald" : "rose"} />
    </div>
  );
}

function formatHours(value: unknown) {
  const numeric = Number(value ?? 0);
  return `${Number.isFinite(numeric) ? numeric.toFixed(2).replace(".00", "") : "0"} h`;
}

function formatCurrency(value: unknown) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number.isFinite(numeric) ? numeric : 0);
}

function getTimeTotalHours(row: AnyRow) {
  return Number(row.total_hours ?? row.total_pointage_hours ?? row.duration_hours ?? 0);
}

function getTimeTotalCost(row: AnyRow) {
  return Number(row.total_cost ?? row.total_pointage_cost ?? row.loaded_cost_total ?? 0);
}


type TimeProjectSummary = AnyRow & {
  detailRows: AnyRow[];
  resourcesCount: number;
  firstDate?: string | null;
  lastDate?: string | null;
};

const timeFields = [
  "avv_hours",
  "management_hours",
  "production_hours",
  "rework_hours",
  "training_hours",
  "intercontract_hours",
  "avv_cost",
  "management_cost",
  "production_cost",
  "rework_cost",
  "purchase_cost",
  "expense_cost",
  "total_hours",
  "total_cost",
];

function buildTimeProjectSummaries(rows: AnyRow[]): TimeProjectSummary[] {
  const groups = new Map<string, TimeProjectSummary>();

  rows.forEach((row) => {
    const projectNumber = row.project_number || "Projet non renseigné";
    const existing = groups.get(projectNumber);
    if (!existing) {
      groups.set(projectNumber, {
        ...row,
        id: `project-${projectNumber}`,
        project_number: projectNumber,
        project_designation: row.project_designation || row.description || "Pointages consolidés",
        detailRows: [row],
        resourcesCount: new Set([row.employee_id].filter(Boolean)).size,
        firstDate: row.activity_date,
        lastDate: row.activity_date,
      });
      return;
    }

    existing.detailRows.push(row);
    existing.resourcesCount = new Set(existing.detailRows.map((item) => item.employee_id).filter(Boolean)).size;
    existing.firstDate = [existing.firstDate, row.activity_date].filter(Boolean).sort()[0] || existing.firstDate;
    existing.lastDate = [existing.lastDate, row.activity_date].filter(Boolean).sort().slice(-1)[0] || existing.lastDate;
    existing.project_designation = existing.project_designation || row.project_designation || row.description;
    existing.status = existing.status === "rejected" || row.status === "rejected" ? "rejected" : existing.status === "submitted" || row.status === "submitted" ? "submitted" : existing.status || row.status;
    existing.validation_manager_status = existing.validation_manager_status === "rejected" || row.validation_manager_status === "rejected" ? "rejected" : existing.validation_manager_status === "submitted" || row.validation_manager_status === "submitted" ? "submitted" : existing.validation_manager_status || row.validation_manager_status;

    timeFields.forEach((field) => {
      existing[field] = Number(existing[field] || 0) + Number(row[field] || 0);
    });
  });

  return Array.from(groups.values()).sort((a, b) => String(a.project_number).localeCompare(String(b.project_number), "fr", { sensitivity: "base" }));
}

function ProjectTimeDrawer({ summary, onClose }: { summary: TimeProjectSummary; onClose: () => void }) {
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [week, setWeek] = useState("all");
  const [resource, setResource] = useState("all");
  const rows = summary.detailRows;
  const years = uniqueValues(rows, (row) => row.activity_date ? String(new Date(row.activity_date).getFullYear()) : null);
  const months = uniqueValues(rows, (row) => row.month_label || getMonthLabel(row.activity_date));
  const weeks = uniqueValues(rows, (row) => String(row.week_number || getWeekNumber(row.activity_date)));
  const resources = uniqueValues(rows, (row) => fullName(row));
  const isIntercontract = String(summary.project_number || "").startsWith("IC-");
  const filtered = rows.filter((row) => {
    const rowYear = row.activity_date ? String(new Date(row.activity_date).getFullYear()) : "";
    const rowMonth = row.month_label || getMonthLabel(row.activity_date);
    const rowWeek = String(row.week_number || getWeekNumber(row.activity_date));
    if (year !== "all" && rowYear !== year) return false;
    if (month !== "all" && rowMonth !== month) return false;
    if (week !== "all" && rowWeek !== week) return false;
    if (resource !== "all" && fullName(row) !== resource) return false;
    return true;
  });
  const total = (field: string) => filtered.reduce((sum, row) => sum + Number(row[field] || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}>
      <article className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">{summary.project_number} · {summary.project_designation}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Détail des pointages par ressource, jour, semaine et rubrique.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-h-[78vh] space-y-4 overflow-auto p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Info label="Date de début" value={formatDate(summary.firstDate)} accent="sky" />
            <Info label="Date de fin" value={formatDate(summary.lastDate)} accent="indigo" />
            <Info label="Statut projet" value={isIntercontract ? "Intercontrat annuel" : labelStatus("time", summary.status)} accent={isIntercontract ? "slate" : "emerald"} />
            <Info label="Ressources" value={summary.resourcesCount} accent="emerald" />
          </div>
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-600 dark:bg-slate-900/35 sm:grid-cols-2 xl:grid-cols-4">
            <select value={year} onChange={(event) => setYear(event.target.value)} className={selectClassName}><option value="all">Toutes les années</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={month} onChange={(event) => setMonth(event.target.value)} className={selectClassName}><option value="all">Tous les mois</option>{months.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={week} onChange={(event) => setWeek(event.target.value)} className={selectClassName}><option value="all">Toutes les semaines</option>{weeks.map((item) => <option key={item} value={item}>S{item}</option>)}</select>
            <select value={resource} onChange={(event) => setResource(event.target.value)} className={selectClassName}><option value="all">Toutes les ressources</option>{resources.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </div>
          <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70">
            <table className="w-full min-w-[1800px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65">
              <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                <tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Équipe</th><th className="px-4 py-3 text-left">Jour de semaine</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-right">AVV (h)</th><th className="px-4 py-3 text-right">Management (h)</th><th className="px-4 py-3 text-right">Production (h)</th><th className="px-4 py-3 text-right">Reprise (h)</th><th className="px-4 py-3 text-right">Formation (h)</th><th className="px-4 py-3 text-right">Intercontrat (h)</th><th className="px-4 py-3 text-right">AVV (€)</th><th className="px-4 py-3 text-right">Management (€)</th><th className="px-4 py-3 text-right">Production (€)</th><th className="px-4 py-3 text-right">Reprise (€)</th><th className="px-4 py-3 text-right">Achat (€)</th><th className="px-4 py-3 text-right">Frais (€)</th><th className="px-4 py-3 text-right">Total pointage (h)</th><th className="px-4 py-3 text-right">Total coûts (€)</th></tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{fullName(row)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getDayName(row.activity_date)} · S{row.week_number || getWeekNumber(row.activity_date)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(row.activity_date)}</td>
                    <td className="px-4 py-3 text-right">{formatHours(row.avv_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.management_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.production_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.rework_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.training_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.intercontract_hours)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.avv_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.management_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.production_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.rework_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.purchase_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.expense_cost)}</td><td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-300">{formatHours(getTimeTotalHours(row))}</td><td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(getTimeTotalCost(row))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-50 text-sm font-black text-slate-900 dark:bg-slate-700 dark:text-white">
                <tr><td className="sticky left-0 bg-slate-50 px-4 py-3 dark:bg-slate-700" colSpan={3}>Total</td><td className="px-4 py-3 text-right">{formatHours(total("avv_hours"))}</td><td className="px-4 py-3 text-right">{formatHours(total("management_hours"))}</td><td className="px-4 py-3 text-right">{formatHours(total("production_hours"))}</td><td className="px-4 py-3 text-right">{formatHours(total("rework_hours"))}</td><td className="px-4 py-3 text-right">{formatHours(total("training_hours"))}</td><td className="px-4 py-3 text-right">{formatHours(total("intercontract_hours"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("avv_cost"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("management_cost"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("production_cost"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("rework_cost"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("purchase_cost"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("expense_cost"))}</td><td className="px-4 py-3 text-right">{formatHours(total("total_hours"))}</td><td className="px-4 py-3 text-right">{formatCurrency(total("total_cost"))}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      </article>
    </div>
  );
}

function TimeProjectCard({ summary, onArchive, onRestore }: { summary: TimeProjectSummary; onArchive: () => void; onRestore: () => void }) {
  const [selected, setSelected] = useState<TimeProjectSummary | null>(null);
  const isArchived = Boolean(summary.archived_at) || summary.status === "archived";
  const labels = { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };
  return (<><article onClick={() => setSelected(summary)} className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{summary.project_number} · {summary.project_designation}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{summary.resourcesCount} ressource(s) · {formatDate(summary.firstDate)} → {formatDate(summary.lastDate)} · validation {summary.validation_manager_status || labelStatus("time", summary.status)}</p></div><ActionMenu labels={labels} canRestore={isArchived} onView={() => setSelected(summary)} onEdit={() => setSelected(summary)} onArchive={onArchive} onRestore={onRestore} /></div><div className="mt-4 grid gap-2 sm:grid-cols-4"><Info label="AVV" value={formatHours(summary.avv_hours)} accent="amber" /><Info label="Management" value={formatHours(summary.management_hours)} accent="indigo" /><Info label="Production" value={formatHours(summary.production_hours)} accent="emerald" /><Info label="Reprise" value={formatHours(summary.rework_hours)} accent="rose" /><Info label="Formation" value={formatHours(summary.training_hours)} accent="sky" /><Info label="Intercontrat" value={formatHours(summary.intercontract_hours)} accent="slate" /><Info label="Total heures" value={formatHours(summary.total_hours)} accent="emerald" /><Info label="Total coûts" value={formatCurrency(summary.total_cost)} accent="indigo" /></div></article>{selected && <ProjectTimeDrawer summary={selected} onClose={() => setSelected(null)} />}</>);
}

function TimeProjectTable({ rows, onArchive, onRestore }: { rows: TimeProjectSummary[]; onArchive: (row: TimeProjectSummary) => void; onRestore: (row: TimeProjectSummary) => void }) {
  const [selected, setSelected] = useState<TimeProjectSummary | null>(null);
  const labels = { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };
  return (<>{selected && <ProjectTimeDrawer summary={selected} onClose={() => setSelected(null)} />}<div className="max-h-[330px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70"><table className="w-full min-w-[2100px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65"><thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300"><tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">N° projet</th><th className="px-4 py-3 text-left">Désignation projet</th><th className="px-4 py-3 text-right">AVV (h)</th><th className="px-4 py-3 text-right">Management (h)</th><th className="px-4 py-3 text-right">Production (h)</th><th className="px-4 py-3 text-right">Reprise (h)</th><th className="px-4 py-3 text-right">Formation (h)</th><th className="px-4 py-3 text-right">Intercontrat (h)</th><th className="px-4 py-3 text-right">Achat (€)</th><th className="px-4 py-3 text-right">Frais (€)</th><th className="px-4 py-3 text-right">Total pointage (h)</th><th className="px-4 py-3 text-right">Total coûts (€)</th><th className="px-4 py-3 text-left">Validation N+1</th><th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th></tr></thead><tbody>{rows.map((row) => { const isArchived = Boolean(row.archived_at) || row.status === "archived"; return <tr key={row.id} onClick={() => setSelected(row)} className="cursor-pointer hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{row.project_number}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.project_designation}</td><td className="px-4 py-3 text-right">{formatHours(row.avv_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.management_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.production_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.rework_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.training_hours)}</td><td className="px-4 py-3 text-right">{formatHours(row.intercontract_hours)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.purchase_cost)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.expense_cost)}</td><td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-300">{formatHours(row.total_hours)}</td><td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(row.total_cost)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.validation_manager_status === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : row.validation_manager_status === "rejected" ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>{row.validation_manager_status || labelStatus("time", row.status)}</span></td><td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu labels={labels} canRestore={isArchived} onView={() => setSelected(row)} onEdit={() => setSelected(row)} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)} /></td></tr>; })}</tbody></table></div></>);
}

function TimeEntryCard({ row, onArchive, onRestore }: { row: AnyRow; onArchive: () => void; onRestore: () => void }) {
  const isArchived = Boolean(row.archived_at) || row.status === "archived";
  const labels = { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{row.project_number || "Projet non renseigné"} · {row.project_designation || row.description || "Pointage"}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{formatDate(row.activity_date)} · {fullName(row)} · validation {row.validation_manager_status || labelStatus("time", row.status)}</p>
        </div>
        <ActionMenu labels={labels} canRestore={isArchived} onView={() => window.alert(`Pointage : ${row.project_number || "projet"} / ${fullName(row)}`)} onEdit={() => window.alert("Le formulaire détaillé s’ouvre via + Nouveau temps ; l’édition inline sera branchée dans le lot CRUD complet.")} onArchive={onArchive} onRestore={onRestore} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Info label="AVV" value={formatHours(row.avv_hours)} accent="sky" />
        <Info label="Management" value={formatHours(row.management_hours)} accent="indigo" />
        <Info label="Production" value={formatHours(row.production_hours)} accent="emerald" />
        <Info label="Reprise" value={formatHours(row.rework_hours)} accent="rose" />
        <Info label="Formation" value={formatHours(row.training_hours)} accent="amber" />
        <Info label="Intercontrat" value={formatHours(row.intercontract_hours)} accent="slate" />
        <Info label="Total heures" value={formatHours(getTimeTotalHours(row))} accent="emerald" />
        <Info label="Total coûts" value={formatCurrency(getTimeTotalCost(row))} accent="indigo" />
      </div>
      <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{row.comments || row.description || "Commentaire non renseigné."}</p>
    </article>
  );
}

function TimeEntryTable({ rows, onArchive, onRestore }: { rows: AnyRow[]; onArchive: (row: AnyRow) => void; onRestore: (row: AnyRow) => void }) {
  const labels = { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };
  return (
    <div className="max-h-[430px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70">
      <table className="w-full min-w-[2400px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <tr>
            <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">N° projet</th>
            <th className="px-4 py-3 text-left">Désignation projet</th>
            <th className="px-4 py-3 text-left">Semaine</th>
            <th className="px-4 py-3 text-left">Mois</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Jour</th>
            <th className="px-4 py-3 text-left">Ressource</th>
            <th className="px-4 py-3 text-right">AVV (h)</th>
            <th className="px-4 py-3 text-right">Management (h)</th>
            <th className="px-4 py-3 text-right">Production (h)</th>
            <th className="px-4 py-3 text-right">Reprise (h)</th>
            <th className="px-4 py-3 text-right">Formation (h)</th>
            <th className="px-4 py-3 text-right">Intercontrat (h)</th>
            <th className="px-4 py-3 text-right">AVV (€)</th>
            <th className="px-4 py-3 text-right">Management (€)</th>
            <th className="px-4 py-3 text-right">Production (€)</th>
            <th className="px-4 py-3 text-right">Reprise (€)</th>
            <th className="px-4 py-3 text-right">Achat (€)</th>
            <th className="px-4 py-3 text-right">Frais (€)</th>
            <th className="px-4 py-3 text-right">Total pointage (h)</th>
            <th className="px-4 py-3 text-right">Total coûts (€)</th>
            <th className="px-4 py-3 text-left">Commentaires</th>
            <th className="px-4 py-3 text-left">Validation N+1</th>
            <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isArchived = Boolean(row.archived_at) || row.status === "archived";
            return (
              <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20">
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{row.project_number || "—"}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{row.project_designation || "—"}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">S{row.week_number || getWeekNumber(row.activity_date)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.month_label || getMonthLabel(row.activity_date)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(row.activity_date)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getDayName(row.activity_date)}</td>
                <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{fullName(row)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.avv_hours)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.management_hours)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.production_hours)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.rework_hours)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.training_hours)}</td>
                <td className="px-4 py-3 text-right">{formatHours(row.intercontract_hours)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.avv_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.management_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.production_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.rework_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.purchase_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.expense_cost ?? row.expense_hours)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-300">{formatHours(getTimeTotalHours(row))}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(getTimeTotalCost(row))}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.comments || row.description || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.validation_manager_status === "approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : row.validation_manager_status === "rejected" ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>{row.validation_manager_status || labelStatus("time", row.status)}</span></td>
                <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu labels={labels} canRestore={isArchived} onView={() => window.alert(`Pointage : ${row.project_number || "projet"} / ${fullName(row)}`)} onEdit={() => window.alert("Le formulaire détaillé s’ouvre via + Nouveau temps ; l’édition inline sera branchée dans le lot CRUD complet.")} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GenericCard({ moduleKey, row, onArchive, onRestore }: { moduleKey: HrTalentModuleKey; row: AnyRow; onArchive: () => void; onRestore: () => void }) {
  if (moduleKey === "time") return <TimeEntryCard row={row} onArchive={onArchive} onRestore={onRestore} />;
  const labels = moduleKey === "onboarding"
    ? { view: "Voir le parcours", edit: "Modifier le parcours", archive: "Archiver le parcours", restore: "Réactiver le parcours" }
    : moduleKey === "reviews"
      ? { view: "Voir l’entretien", edit: "Modifier l’entretien", archive: "Archiver l’entretien", restore: "Réactiver l’entretien" }
      : { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };
  const title = moduleKey === "onboarding" ? `Parcours ${fullName(row)}` : row.cycle_name || `Entretien ${fullName(row)}`;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{getEmployeeDepartment(row)} · {getEmployeeJob(row)} · {labelStatus(moduleKey, row.status)}</p>
        </div>
        <ActionMenu labels={labels} canRestore={Boolean(row.archived_at) || row.status === "archived"} onView={() => window.alert(`${labels.view} : ${fullName(row)}`)} onEdit={() => window.alert(`${labels.edit} : ${fullName(row)}`)} onArchive={onArchive} onRestore={onRestore} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Info label="Collaborateur" value={fullName(row)} accent="indigo" />
        <Info label="Manager" value={row.manager_name || "Non renseigné"} accent="sky" />
        <Info label="Service" value={getEmployeeDepartment(row)} />
        <Info label="Statut" value={labelStatus(moduleKey, row.status)} accent={row.status === "completed" || row.status === "approved" ? "emerald" : row.status === "delayed" || row.status === "rejected" ? "rose" : "amber"} />
      </div>
      {moduleKey === "onboarding" && <OnboardingChecklist row={row} />}
      {moduleKey === "reviews" && <ReviewTemplate row={row} />}
    </article>
  );
}

function GenericTable({ moduleKey, rows, onArchive, onRestore }: { moduleKey: HrTalentModuleKey; rows: AnyRow[]; onArchive: (row: AnyRow) => void; onRestore: (row: AnyRow) => void }) {
  if (moduleKey === "time") return <TimeEntryTable rows={rows} onArchive={onArchive} onRestore={onRestore} />;
  const labels = moduleKey === "onboarding"
    ? { view: "Voir le parcours", edit: "Modifier le parcours", archive: "Archiver le parcours", restore: "Réactiver le parcours" }
    : moduleKey === "reviews"
      ? { view: "Voir l’entretien", edit: "Modifier l’entretien", archive: "Archiver l’entretien", restore: "Réactiver l’entretien" }
      : { view: "Voir le pointage", edit: "Modifier le pointage", archive: "Archiver le pointage", restore: "Réactiver le pointage" };

  return (
    <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70">
      <table className="w-full min-w-[1180px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          <tr>
            <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Objet</th>
            <th className="px-4 py-3 text-left">Collaborateur</th>
            <th className="px-4 py-3 text-left">Service</th>
            <th className="px-4 py-3 text-left">Manager</th>
            <th className="px-4 py-3 text-left">Statut</th>
            <th className="px-4 py-3 text-left">Détail métier</th>
            <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{moduleKey === "onboarding" ? `Parcours ${fullName(row)}` : moduleKey === "reviews" ? row.cycle_name || `Entretien ${fullName(row)}` : `${formatDate(row.activity_date)} · ${row.activity_type || "activité"}`}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fullName(row)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getEmployeeDepartment(row)}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.manager_name || "—"}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300">{labelStatus(moduleKey, row.status)}</span></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{moduleKey === "onboarding" ? `${getChecklistStats(row.checklist_items).ok}/${getChecklistStats(row.checklist_items).total} OK · risque ${row.risk_level || "normal"}` : moduleKey === "reviews" ? `${row.completed_objective_count || 0}/${row.objective_count || 0} objectifs · note ${row.global_rating || "—"}/5` : `${row.duration_hours || 0}h · ${row.description || "—"}`}</td>
              <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu labels={labels} canRestore={Boolean(row.archived_at) || row.status === "archived"} onView={() => window.alert(`${labels.view} : ${fullName(row)}`)} onEdit={() => window.alert(`${labels.edit} : ${fullName(row)}`)} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkCardsAndTable({ moduleKey, rows, employees, onArchive, onRestore }: { moduleKey: HrTalentModuleKey; rows: AnyRow[]; employees: Employee[]; onArchive: (row: AnyRow) => void; onRestore: (row: AnyRow) => void }) {
  const [view, setView] = useState<DisplayMode>("cards");
  const summaries = moduleKey === "skills" ? buildSkillResourceSummaries(rows, employees) : [];
  const timeSummaries = moduleKey === "time" ? buildTimeProjectSummaries(rows) : [];

  return (
    <SectionCard
      icon={moduleKey === "skills" ? GraduationCap : moduleKey === "time" ? Clock3 : moduleKey === "onboarding" ? ListChecks : Target}
      title={getConfig(moduleKey).primaryTab}
      description="Cartes et tableau utilisent le périmètre filtré, les mêmes actions et les mêmes données Supabase."
      right={
        <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600/60 dark:bg-slate-700/70">
          <button type="button" onClick={() => setView("cards")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"}`}>Cartes</button>
          <button type="button" onClick={() => setView("table")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"}`}>Tableau</button>
        </div>
      }
    >
      {moduleKey === "skills" && view === "cards" && <div className="grid gap-4 xl:grid-cols-2">{summaries.map((summary) => <SkillResourceCard key={summary.employee.id} summary={summary} onArchive={() => summary.rows[0] && onArchive(summary.rows[0])} />)}</div>}
      {moduleKey === "skills" && view === "table" && <SkillResourceTable rows={rows} onArchive={onArchive} />}
      {moduleKey === "time" && view === "cards" && <div className="grid gap-4 xl:grid-cols-2">{timeSummaries.map((summary) => <TimeProjectCard key={summary.id} summary={summary} onArchive={() => summary.detailRows.forEach((row) => onArchive(row))} onRestore={() => summary.detailRows.forEach((row) => onRestore(row))} />)}</div>}
      {moduleKey === "time" && view === "table" && <TimeProjectTable rows={timeSummaries} onArchive={(summary) => summary.detailRows.forEach((row) => onArchive(row))} onRestore={(summary) => summary.detailRows.forEach((row) => onRestore(row))} />}
      {moduleKey !== "skills" && moduleKey !== "time" && view === "cards" && <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => <GenericCard key={row.id} moduleKey={moduleKey} row={row} onArchive={() => onArchive(row)} onRestore={() => onRestore(row)} />)}</div>}
      {moduleKey !== "skills" && moduleKey !== "time" && view === "table" && <GenericTable moduleKey={moduleKey} rows={rows} onArchive={onArchive} onRestore={onRestore} />}
    </SectionCard>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  async function copy() {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.font = "700 34px Arial";
    context.fillText(title, 48, 72);
    context.fillStyle = "#475569";
    context.font = "22px Arial";
    context.fillText(description, 48, 114);
    context.fillStyle = "#6366f1";
    context.font = "700 24px Arial";
    context.fillText("Graphique ONEPILOT — export depuis le périmètre filtré", 48, 184);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const ClipboardItemCtor = (window as any).ClipboardItem;
        if (!ClipboardItemCtor || !navigator.clipboard?.write) throw new Error("Clipboard PNG unavailable");
        await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
      } catch {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }, "image/png");
  }

  const card = (height: string) => (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-white" title={title}>{title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={copy} title="Copier le graphique" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:hover:bg-indigo-900/30"><Copy className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => setIsExpanded(true)} title="Agrandir le graphique" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:hover:bg-indigo-900/30"><Expand className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className={height}>{children}</div>
    </>
  );

  return (
    <>
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
        {card("h-[280px]")}
      </article>
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onClick={() => setIsExpanded(false)}>
          <article className="h-[86vh] w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-600 dark:bg-slate-800" onClick={(event) => event.stopPropagation()}>
            {card("h-[70vh]")}
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => setIsExpanded(false)} className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">Fermer</button></div>
          </article>
        </div>
      )}
    </>
  );
}

function GraphsPanel({ moduleKey, rows, catalog }: { moduleKey: HrTalentModuleKey; rows: AnyRow[]; catalog: SkillCatalogItem[] }) {
  const statusData = Object.entries(rows.reduce((acc: Record<string, number>, row) => { acc[labelStatus(moduleKey, row.status)] = (acc[labelStatus(moduleKey, row.status)] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const moduleData = Object.entries(rows.reduce((acc: Record<string, number>, row) => { const key = row.family || "Non renseigné"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const levelData = [0, 1, 2, 3, 4].map((level) => ({ name: `Niveau ${level}`, ressources: rows.filter((row) => clampLevel(row.current_level) === level).length }));
  const radarModuleData = Object.entries(rows.reduce((acc: Record<string, { total: number; count: number }>, row) => { const key = row.family || "Non renseigné"; acc[key] = acc[key] || { total: 0, count: 0 }; acc[key].total += clampLevel(row.current_level); acc[key].count += 1; return acc; }, {})).map(([module, item]) => ({ module, niveau: item.count ? Number((item.total / item.count).toFixed(2)) : 0 }));
  const radarSubmoduleData = Object.entries(rows.reduce((acc: Record<string, { total: number; count: number }>, row) => { const key = row.category || "Non renseigné"; acc[key] = acc[key] || { total: 0, count: 0 }; acc[key].total += clampLevel(row.current_level); acc[key].count += 1; return acc; }, {})).slice(0, 12).map(([module, item]) => ({ module, niveau: item.count ? Number((item.total / item.count).toFixed(2)) : 0 }));
  const criticalData = Object.entries(catalog.reduce((acc: Record<string, number>, skill) => { acc[skill.criticality || "standard"] = (acc[skill.criticality || "standard"] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const timeRubricData = [
    { name: "AVV", heures: rows.reduce((sum, row) => sum + Number(row.avv_hours || 0), 0) },
    { name: "Management", heures: rows.reduce((sum, row) => sum + Number(row.management_hours || 0), 0) },
    { name: "Production", heures: rows.reduce((sum, row) => sum + Number(row.production_hours || 0), 0) },
    { name: "Reprise", heures: rows.reduce((sum, row) => sum + Number(row.rework_hours || 0), 0) },
    { name: "Formation", heures: rows.reduce((sum, row) => sum + Number(row.training_hours || 0), 0) },
    { name: "Intercontrat", heures: rows.reduce((sum, row) => sum + Number(row.intercontract_hours || 0), 0) },
  ];
  const timeProjectData = Object.entries(rows.reduce((acc: Record<string, number>, row) => { const key = row.project_number || "Projet non renseigné"; acc[key] = (acc[key] || 0) + getTimeTotalHours(row); return acc; }, {})).map(([name, heures]) => ({ name, heures }));
  const timeCostProjectData = Object.entries(rows.reduce((acc: Record<string, number>, row) => { const key = row.project_number || "Projet non renseigné"; acc[key] = (acc[key] || 0) + getTimeTotalCost(row); return acc; }, {})).map(([name, cout]) => ({ name, cout }));
  const monthlyTimeData = Object.entries(rows.reduce((acc: Record<string, { heures: number; avv: number; management: number; production: number; formation: number; intercontrat: number; reprise: number; achat: number; frais: number }>, row) => {
    const date = row.activity_date ? new Date(row.activity_date) : null;
    const key = date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : "Non daté";
    acc[key] = acc[key] || { heures: 0, avv: 0, management: 0, production: 0, formation: 0, intercontrat: 0, reprise: 0, achat: 0, frais: 0 };
    acc[key].heures += getTimeTotalHours(row);
    acc[key].avv += Number(row.avv_hours || 0);
    acc[key].management += Number(row.management_hours || 0);
    acc[key].production += Number(row.production_hours || 0);
    acc[key].formation += Number(row.training_hours || 0);
    acc[key].intercontrat += Number(row.intercontract_hours || 0);
    acc[key].reprise += Number(row.rework_hours || 0);
    acc[key].achat += Number(row.purchase_cost || 0);
    acc[key].frais += Number(row.expense_cost ?? row.expense_hours ?? 0);
    return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({ month, ...values }));

  return (
    <div className="space-y-4">
      <SectionCard icon={BarChart3} title="Analyse décisionnelle" description="Graphiques consolidés sur le périmètre filtré pour arbitrer charge, compétences, intégrations et performance." right={<div className="whitespace-nowrap rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">{rows.length} lignes</div>}>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-300">Les graphiques utilisent uniquement les données Supabase filtrées : pas de capture statique, pas de donnée front inventée.</p>
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        {moduleKey === "skills" ? (
          <>
            <ChartCard title="Radar par module" description="Niveau moyen réel par module de compétences, de 0 à 4.">
              <ResponsiveContainer width="100%" height="100%"><RadarChart data={radarModuleData}><PolarGrid /><PolarAngleAxis dataKey="module" tick={{ fontSize: 10 }} /><PolarRadiusAxis domain={[0, 4]} /><Radar name="Niveau moyen" dataKey="niveau" stroke={chartPalette[0]} fill={chartPalette[0]} fillOpacity={0.22} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Radar par sous-module" description="Niveau moyen par sous-module pour identifier les zones fortes et faibles.">
              <ResponsiveContainer width="100%" height="100%"><RadarChart data={radarSubmoduleData}><PolarGrid /><PolarAngleAxis dataKey="module" tick={{ fontSize: 10 }} /><PolarRadiusAxis domain={[0, 4]} /><Radar name="Niveau moyen" dataKey="niveau" stroke={chartPalette[1]} fill={chartPalette[1]} fillOpacity={0.22} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ressources par module" description="Nombre d’évaluations disponibles par module.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={moduleData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="value" name="Évaluations" fill={chartPalette[2]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ressources par niveau" description="Répartition des niveaux 0 à 4 sur le périmètre filtré.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={levelData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="ressources" fill={chartPalette[3]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Criticité de la bibliothèque" description="Compétences standards, importantes et critiques dans le référentiel.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={criticalData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="value" fill={chartPalette[4]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
          </>
        ) : moduleKey === "time" ? (
          <>
            <ChartCard title="Pointages par projet" description="Total des heures pointées par numéro de projet.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={timeProjectData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="heures" name="Heures" fill={chartPalette[0]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Répartition par rubrique" description="AVV, management, production, reprise, formation et intercontrat.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={timeRubricData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="heures" name="Heures" fill={chartPalette[1]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Suivi mensuel des heures" description="Tendance des heures pointées par mois.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="heures" name="Heures" stroke={chartPalette[2]} strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Rubriques par mois" description="Production, AVV, management, formation, intercontrat et reprise sur le même graphique.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="production" name="Production" stroke="#10b981" strokeWidth={3} /><Line type="monotone" dataKey="avv" name="AVV" stroke="#f59e0b" strokeWidth={3} /><Line type="monotone" dataKey="management" name="Management" stroke="#6366f1" strokeWidth={3} /><Line type="monotone" dataKey="formation" name="Formation" stroke="#0ea5e9" strokeWidth={3} /><Line type="monotone" dataKey="intercontrat" name="IC" stroke="#f43f5e" strokeWidth={3} /><Line type="monotone" dataKey="reprise" name="Reprise" stroke="#dc2626" strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Intercontrat par mois" description="Heures d’intercontrat à suivre pour capacité et staffing.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="intercontrat" name="Intercontrat" stroke={chartPalette[3]} strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Reprises par mois" description="Suivi des reprises à analyser par projet et par ressource.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="reprise" name="Reprise" stroke={chartPalette[4]} strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Achats et frais par mois" description="Suivi des achats et frais déclarés sur le périmètre filtré.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyTimeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="achat" name="Achat (€)" stroke={chartPalette[0]} strokeWidth={3} /><Line type="monotone" dataKey="frais" name="Frais (€)" stroke={chartPalette[1]} strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Coûts par projet" description="Coûts chargés estimés par projet à partir des heures et taux RH.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={timeCostProjectData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="cout" name="Coût" fill={chartPalette[0]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
          </>
        ) : (
          <>
            <ChartCard title="Répartition par statut" description="Volume par statut sur le périmètre filtré.">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="value" name="Volume" fill={chartPalette[0]} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Suivi mensuel" description="Tendance des volumes créés ou déclarés par mois.">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="value" name="Volume" stroke={chartPalette[1]} strokeWidth={3} /></LineChart></ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}

function DecisionPanel({ icon: Icon, title, children, accent }: { icon: ComponentType<{ className?: string }>; title: string; children: ReactNode; accent: Accent }) {
  const colors: Record<Accent, string> = {
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/45 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><div className="flex items-center gap-3"><div className={`rounded-xl p-2.5 ${colors[accent]}`}><Icon className="h-4 w-4" /></div><div><h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">Lecture synthétique du périmètre filtré.</p></div></div><div className="mt-4 space-y-2">{children}</div></div>;
}

function AlertMetric({ icon: Icon, title, value, description, accent }: { icon: ComponentType<{ className?: string }>; title: string; value: ReactNode; description: string; accent: Accent }) {
  return <MetricCard icon={Icon} label={title} value={value} description={description} accent={accent} />;
}

function Insight({ title, description, level }: { title: string; description: string; level: "success" | "warning" | "danger" | "info" }) {
  const classes = level === "success" ? "border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200" : level === "danger" ? "border-rose-100 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-200" : level === "warning" ? "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200" : "border-indigo-100 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200";
  return <div className={`rounded-xl border px-3 py-2 ${classes}`}><p className="text-xs font-black">{title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 opacity-85">{description}</p></div>;
}

function AlertsPanel({ moduleKey, rows }: { moduleKey: HrTalentModuleKey; rows: AnyRow[] }) {
  const actionNeeded = rows.filter((row) => ["submitted", "manager_approved", "to_develop", "delayed", "employee_input", "manager_input", "calibration"].includes(row.status) || Number(row.gap ?? 0) > 0 || row.risk_level === "high").length;
  const ok = rows.filter((row) => ["approved", "validated", "completed"].includes(row.status) || (moduleKey === "skills" && Number(row.gap ?? 0) === 0)).length;
  const nok = rows.filter((row) => row.status === "rejected" || row.risk_level === "high" || Number(row.gap ?? 0) > 1).length;
  const missingManager = rows.filter((row) => !row.manager_name).length;
  const quality = percentage(Math.max(0, rows.length - actionNeeded - missingManager), Math.max(1, rows.length));

  return (
    <SectionCard icon={Bell} title="Alertes qualité" description="Synthèse, alertes et recommandations consolidées sur le périmètre filtré.">
      <div className="grid gap-4 xl:grid-cols-3">
        <DecisionPanel icon={Gauge} title="Synthèse" accent="indigo"><Insight title="Qualité globale" description={`Score estimé : ${quality} %. Contrôler complétude, statut, rattachement et données métier.`} level={quality >= 80 ? "success" : "info"} /><Insight title="Dossiers exploitables" description={`${ok} élément(s) validés, terminés ou exploitables.`} level="success" /></DecisionPanel>
        <DecisionPanel icon={AlertTriangle} title="Alertes" accent="rose"><Insight title="Actions à traiter" description={`${actionNeeded} élément(s) nécessitent validation, complétion, formation ou arbitrage.`} level={actionNeeded > 0 ? "warning" : "success"} /><Insight title="NOK / risques" description={`${nok} élément(s) bloquants ou à sécuriser.`} level={nok > 0 ? "danger" : "success"} /></DecisionPanel>
        <DecisionPanel icon={Lightbulb} title="Recommandations" accent="emerald"><Insight title="Relier compétences et entretiens" description="Capitaliser écarts, objectifs, formations et retours projet dans le plan de développement." level="info" /><Insight title="Prioriser les risques" description="Traiter d’abord checklists NOK, objectifs non validés, compétences critiques et saisies en attente." level="success" /></DecisionPanel>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AlertMetric icon={ShieldAlert} title="Actions à traiter" value={actionNeeded} description="Risque opérationnel ou RH à arbitrer." accent={actionNeeded > 0 ? "amber" : "emerald"} />
        <AlertMetric icon={CheckCircle2} title="OK" value={ok} description="Éléments validés ou exploitables." accent="emerald" />
        <AlertMetric icon={AlertTriangle} title="NOK" value={nok} description="Éléments bloquants ou insuffisants." accent={nok > 0 ? "rose" : "emerald"} />
        <AlertMetric icon={Users} title="Manager manquant" value={missingManager} description="Validation ou accompagnement fragilisé." accent={missingManager > 0 ? "rose" : "emerald"} />
        <AlertMetric icon={Gauge} title="Score qualité" value={`${quality}%`} description="Score global du périmètre filtré." accent={quality >= 80 ? "emerald" : "amber"} />
        <AlertMetric icon={Archive} title="Archivables" value={ok} description="Éléments pouvant être archivés après contrôle." accent="sky" />
      </div>
    </SectionCard>
  );
}

function buildMetrics(moduleKey: HrTalentModuleKey, rows: AnyRow[], catalog: SkillCatalogItem[]) {
  if (moduleKey === "skills") {
    const resources = new Set(rows.map((row) => row.employee_id).filter(Boolean)).size;
    const criticalGaps = rows.filter((row) => row.criticality === "critical" && Number(row.gap ?? 0) > 0).length;
    const experts = rows.filter((row) => clampLevel(row.current_level) >= 3).length;
    return [
      { label: "Ressources évaluées", value: resources, description: "Collaborateurs avec au moins une compétence évaluée.", icon: Users, accent: "indigo" as Accent },
      { label: "Bibliothèque", value: catalog.length, description: "Compétences de référence actives.", icon: BookOpen, accent: "emerald" as Accent },
      { label: "Écarts critiques", value: criticalGaps, description: "Compétences critiques sous le niveau cible.", icon: AlertTriangle, accent: "amber" as Accent },
      { label: "Experts internes", value: experts, description: "Niveaux 3 ou 4 mobilisables en mentorat.", icon: GraduationCap, accent: "rose" as Accent },
    ];
  }

  if (moduleKey === "onboarding") {
    return [
      { label: "Parcours", value: rows.length, description: "Parcours dans le périmètre filtré.", icon: ListChecks, accent: "indigo" as Accent },
      { label: "Terminés", value: rows.filter((row) => row.status === "completed").length, description: "Parcours complétés et contrôlables.", icon: CheckCircle2, accent: "emerald" as Accent },
      { label: "À risque", value: rows.filter((row) => row.risk_level === "high" || row.status === "delayed").length, description: "Retards, NOK ou intégration à sécuriser.", icon: AlertTriangle, accent: "amber" as Accent },
      { label: "Progression moyenne", value: `${Math.round(rows.reduce((sum, row) => sum + Number(row.progress_percent || 0), 0) / Math.max(1, rows.length))}%`, description: "Moyenne de complétion des checklists.", icon: TrendingUp, accent: "rose" as Accent },
    ];
  }

  if (moduleKey === "reviews") {
    return [
      { label: "Entretiens", value: rows.length, description: "Entretiens et objectifs suivis.", icon: Target, accent: "indigo" as Accent },
      { label: "Validés", value: rows.filter((row) => row.status === "completed").length, description: "Entretiens finalisés et exploitables.", icon: CheckCircle2, accent: "emerald" as Accent },
      { label: "En cours", value: rows.filter((row) => ["employee_input", "manager_input", "calibration"].includes(row.status)).length, description: "Saisies, arbitrages ou calibration en cours.", icon: CalendarClock, accent: "amber" as Accent },
      { label: "Objectifs atteints", value: `${percentage(rows.reduce((sum, row) => sum + Number(row.completed_objective_count || 0), 0), rows.reduce((sum, row) => sum + Number(row.objective_count || 0), 0))}%`, description: "Taux global des objectifs déclarés.", icon: Gauge, accent: "rose" as Accent },
    ];
  }

  return [
    { label: "Temps saisis", value: rows.length, description: "Lignes de temps dans le périmètre filtré.", icon: Clock3, accent: "indigo" as Accent },
    { label: "Validés", value: rows.filter((row) => ["approved", "manager_approved"].includes(row.status)).length, description: "Temps validés RH ou manager.", icon: CheckCircle2, accent: "emerald" as Accent },
    { label: "À valider", value: rows.filter((row) => ["submitted", "manager_approved"].includes(row.status)).length, description: "Saisies nécessitant un contrôle.", icon: CalendarClock, accent: "amber" as Accent },
    { label: "Heures", value: rows.reduce((sum, row) => sum + Number(row.duration_hours || 0), 0).toFixed(1), description: "Volume horaire total filtré.", icon: BriefcaseBusiness, accent: "rose" as Accent },
  ];
}

function buildExportColumns(moduleKey: HrTalentModuleKey): ExportColumn<AnyRow>[] {
  const base: ExportColumn<AnyRow>[] = [
    { key: "id", label: "ID", value: (row) => row.id },
    { key: "employee", label: "Collaborateur", value: (row) => fullName(row) },
    { key: "employee_number", label: "Matricule", value: (row) => row.employee_number },
    { key: "department", label: "Service", value: (row) => getEmployeeDepartment(row) },
    { key: "manager", label: "Manager", value: (row) => row.manager_name },
    { key: "status", label: "Statut", value: (row) => labelStatus(moduleKey, row.status) },
  ];

  if (moduleKey === "skills") return [...base, { key: "family", label: "Module", value: (row) => row.family }, { key: "category", label: "Sous-module", value: (row) => row.category }, { key: "skill", label: "Compétence", value: (row) => row.skill_name }, { key: "current_level", label: "Niveau actuel", value: (row) => clampLevel(row.current_level) }, { key: "target_level", label: "Niveau cible", value: (row) => clampLevel(row.target_level) }, { key: "gap", label: "Écart", value: (row) => row.gap }, { key: "criticality", label: "Criticité", value: (row) => row.criticality }, { key: "project_context", label: "Projet / besoin", value: (row) => row.project_context }, { key: "evidence", label: "Preuve", value: (row) => row.evidence }];
  if (moduleKey === "onboarding") return [...base, { key: "start_date", label: "Début", value: (row) => row.start_date }, { key: "target_end_date", label: "Fin cible", value: (row) => row.target_end_date }, { key: "progress", label: "Progression", value: (row) => row.progress_percent }, { key: "risk", label: "Risque", value: (row) => row.risk_level }, { key: "checklist", label: "Checklist", value: (row) => JSON.stringify(row.checklist_items ?? []) }, { key: "notes", label: "Notes", value: (row) => row.notes }];
  if (moduleKey === "reviews") return [...base, { key: "cycle", label: "Campagne", value: (row) => row.cycle_name }, { key: "objectives", label: "Objectifs", value: (row) => row.objective_count }, { key: "completed", label: "Objectifs complétés", value: (row) => row.completed_objective_count }, { key: "rating", label: "Note globale", value: (row) => row.global_rating }, { key: "employee_comment", label: "Commentaire collaborateur", value: (row) => row.employee_comment }, { key: "manager_comment", label: "Commentaire manager", value: (row) => row.manager_comment }, { key: "details", label: "Détail entretien", value: (row) => JSON.stringify(row.review_details ?? {}) }];
  return [
    ...base,
    { key: "project_number", label: "N° projet", value: (row) => row.project_number },
    { key: "project_designation", label: "Désignation projet", value: (row) => row.project_designation },
    { key: "activity_date", label: "Date", value: (row) => row.activity_date },
    { key: "avv_hours", label: "AVV (h)", value: (row) => row.avv_hours },
    { key: "management_hours", label: "Management (h)", value: (row) => row.management_hours },
    { key: "production_hours", label: "Production (h)", value: (row) => row.production_hours },
    { key: "rework_hours", label: "Reprise (h)", value: (row) => row.rework_hours },
    { key: "training_hours", label: "Formation (h)", value: (row) => row.training_hours },
    { key: "intercontract_hours", label: "Intercontrat (h)", value: (row) => row.intercontract_hours },
    { key: "avv_cost", label: "AVV (€)", value: (row) => row.avv_cost },
    { key: "management_cost", label: "Management (€)", value: (row) => row.management_cost },
    { key: "production_cost", label: "Production (€)", value: (row) => row.production_cost },
    { key: "rework_cost", label: "Reprise (€)", value: (row) => row.rework_cost },
    { key: "purchase_cost", label: "Achat (€)", value: (row) => row.purchase_cost },
    { key: "expense_cost", label: "Frais (€)", value: (row) => row.expense_cost ?? row.expense_hours },
    { key: "total_hours", label: "Total pointage (h)", value: (row) => getTimeTotalHours(row) },
    { key: "total_cost", label: "Total coûts (€)", value: (row) => getTimeTotalCost(row) },
    { key: "comments", label: "Commentaires", value: (row) => row.comments || row.description },
    { key: "validation_manager_status", label: "Validation N+1", value: (row) => row.validation_manager_status || labelStatus(moduleKey, row.status) },
  ];
}

function buildDefaultOnboardingChecklist() {
  return [
    { owner: "RH", label: "Contrat signé et dossier administratif complet", status: "NOK", note: "Contrat, avenant, coordonnées, urgence, RIB et justificatifs." },
    { owner: "RH", label: "Livret d’accueil disponible et remis", status: "NOK", note: "Preuve de remise à conserver pour audit interne." },
    { owner: "IT", label: "PC disponible et configuré", status: "NOK", note: "Poste, sécurité, chiffrement, antivirus et droits locaux." },
    { owner: "IT", label: "Adresse mail et accès SSO créés", status: "NOK", note: "Messagerie, MFA, groupes, outils projet et outils RH." },
    { owner: "Office", label: "Fournitures et environnement de travail prêts", status: "NA", note: "Badge, bureau, écran, casque, téléphone ou matériel distant." },
    { owner: "RH", label: "Présentation organisation et société réalisée", status: "NOK", note: "Organisation, valeurs, règles internes, confidentialité et éthique." },
    { owner: "Manager", label: "Présentation équipe et projet réalisée", status: "NOK", note: "Rôles, interlocuteurs, planning, objectifs et rituels." },
    { owner: "Manager", label: "Fiche de poste et fiche d’activités validées", status: "NOK", note: "Missions, responsabilités, livrables et critères de réussite." },
    { owner: "Manager", label: "Objectifs 30/60/90 jours définis", status: "NOK", note: "Objectifs opérationnels, compétences, jalons et points de contrôle." },
    { owner: "Qualité", label: "Livrables attendus connus", status: "NOK", note: "Templates, exigences ISO 9001, circuit de validation et archivage." },
    { owner: "Qualité", label: "Sensibilisation qualité / sécurité réalisée", status: "NOK", note: "Confidentialité, risques, non-conformités et bonnes pratiques." },
    { owner: "Manager", label: "Matrice de compétences initiale réalisée", status: "NOK", note: "Auto-évaluation, niveau cible, expert référent et plan d’accompagnement." },
    { owner: "RH", label: "Formation obligatoire planifiée", status: "NOK", note: "Formation métier, outils, sécurité, conformité ou habilitation." },
    { owner: "Manager", label: "Point manager planifié", status: "NOK", note: "Points 7 jours, 30 jours, 60 jours, 90 jours et fin période d’essai." },
    { owner: "RH", label: "Formulaire d’habilitation réalisé si besoin", status: "NA", note: "Accès spécifiques client, site sensible, données ou applications." },
    { owner: "Collaborateur", label: "Rapport d’étonnement prévu", status: "NA", note: "Retour à 30 jours sur intégration, outils, organisation et irritants." },
    { owner: "RH", label: "Validation période d’essai préparée", status: "NOK", note: "Décision RH/manager, preuves, objectifs et éventuelle prolongation." },
  ];
}

function CreateModal({ moduleKey, organizationId, employees, catalog, onClose }: { moduleKey: HrTalentModuleKey; organizationId: string; employees: Employee[]; catalog: SkillCatalogItem[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const firstEmployee = employees[0]?.id || "";
  const firstSkill = catalog[0]?.id || "";
  const [employeeId, setEmployeeId] = useState(firstEmployee);
  const [skillId, setSkillId] = useState(firstSkill);
  const [level, setLevel] = useState("1");
  const [projectNumber, setProjectNumber] = useState(`P-${new Date().getFullYear()}-0001`);
  const [projectDesignation, setProjectDesignation] = useState("Projet client / mission affectée");
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));
  const [avvHours, setAvvHours] = useState("0");
  const [managementHours, setManagementHours] = useState("0");
  const [productionHours, setProductionHours] = useState("7.5");
  const [reworkHours, setReworkHours] = useState("0");
  const [trainingHours, setTrainingHours] = useState("0");
  const [intercontractHours, setIntercontractHours] = useState("0");
  const [purchaseCost, setPurchaseCost] = useState("0");
  const [expenseCost, setExpenseCost] = useState("0");
  const [comments, setComments] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!employeeId) return;
    setIsSaving(true);
    try {
      if (moduleKey === "skills") {
        const skill = catalog.find((item) => item.id === skillId);
        const current = Number(level);
        const target = Math.min(4, current + 1);
        const { error } = await (supabase.from("hr_employee_skills" as never) as any).upsert({ organization_id: organizationId, employee_id: employeeId, skill_id: skillId, level: current, current_level: current, target_level: target, assessment_date: new Date().toISOString().slice(0, 10), last_self_assessment_at: new Date().toISOString().slice(0, 10), assessor_type: "self", project_context: "Auto-évaluation annuelle RH.", evidence: `Auto-évaluation créée depuis la page Compétences pour ${skill?.name || "compétence"}.`, status: current >= target ? "validated" : "to_develop" }, { onConflict: "organization_id,employee_id,skill_id" });
        if (error) throw error;
      } else if (moduleKey === "onboarding") {
        const { error } = await (supabase.from("hr_onboarding_plans" as never) as any).insert({ organization_id: organizationId, employee_id: employeeId, manager_employee_id: employees.find((item) => item.id === employeeId)?.manager_employee_id || null, recruiter_employee_id: null, start_date: new Date().toISOString().slice(0, 10), target_end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), status: "prepared", progress_percent: 0, risk_level: "watch", notes: "Nouveau parcours créé depuis ONEPILOT : checklist complète à initialiser avec RH, IT, manager et qualité.", checklist_items: buildDefaultOnboardingChecklist() });
        if (error) throw error;
      } else if (moduleKey === "reviews") {
        const year = new Date().getFullYear();
        let cycleId: string | null = null;
        const existingCycle = await (supabase.from("hr_review_cycles" as never) as any).select("id").eq("organization_id", organizationId).eq("name", `Campagne annuelle ${year}`).maybeSingle();
        if (existingCycle.error) throw existingCycle.error;
        cycleId = existingCycle.data?.id ?? null;
        if (!cycleId) {
          const cycleInsert = await (supabase.from("hr_review_cycles" as never) as any).insert({ organization_id: organizationId, name: `Campagne annuelle ${year}`, review_type: "annual", period_start: `${year}-01-01`, period_end: `${year}-12-31`, status: "open" }).select("id").single();
          if (cycleInsert.error) throw cycleInsert.error;
          cycleId = cycleInsert.data.id;
        }
        const reviewDetails = { previous_year: { objectives: "Bilan année écoulée à compléter.", achievement: 0, highlights: "Réussites, irritants et axes de progrès." }, current_year: { objectives: "Objectifs de l’année à définir.", priority: "Performance, compétences et contribution collective." }, training: ["Formation métier à qualifier"], employee_validation: false, manager_validation: false, development_plan: "Plan de développement à définir." };
        const { error } = await (supabase.from("hr_review_items" as never) as any).insert({ organization_id: organizationId, cycle_id: cycleId, employee_id: employeeId, manager_employee_id: employees.find((item) => item.id === employeeId)?.manager_employee_id || null, status: "employee_input", objective_count: 4, completed_objective_count: 0, global_rating: null, employee_comment: "Auto-évaluation à compléter.", manager_comment: "Évaluation manager à compléter.", review_details: reviewDetails });
        if (error) throw error;
      } else {
        const hourlyCost = 75;
        const avv = Number(avvHours || 0);
        const management = Number(managementHours || 0);
        const production = Number(productionHours || 0);
        const rework = Number(reworkHours || 0);
        const training = Number(trainingHours || 0);
        const intercontract = Number(intercontractHours || 0);
        const expenses = Number(expenseCost || 0);
        const purchase = Number(purchaseCost || 0);
        const totalHours = avv + management + production + rework + training + intercontract + expenses;
        const totalCost = (avv + management + production + rework + training + intercontract) * hourlyCost + purchase;
        const { error } = await (supabase.from("hr_time_activity_entries" as never) as any).insert({
          organization_id: organizationId,
          employee_id: employeeId,
          activity_date: activityDate,
          activity_type: intercontract > 0 ? "intercontract" : "project_delivery",
          duration_hours: totalHours,
          status: "submitted",
          project_number: projectNumber,
          project_designation: projectDesignation,
          avv_hours: avv,
          management_hours: management,
          production_hours: production,
          rework_hours: rework,
          training_hours: training,
          intercontract_hours: intercontract,
          avv_cost: avv * hourlyCost,
          management_cost: management * hourlyCost,
          production_cost: production * hourlyCost,
          rework_cost: rework * hourlyCost,
          purchase_cost: purchase,
          expense_cost: expenses,
          expense_hours: 0,
          total_hours: totalHours,
          total_cost: totalCost,
          comments,
          description: comments || "Pointage mensuel créé depuis ONEPILOT.",
          validation_manager_status: "submitted",
          manager_comment: "À valider par le N+1 avant la clôture hebdomadaire suivant la fin de mois.",
        });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["hr-talent-module"] });
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur d’enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-black text-slate-950 dark:text-white">{getConfig(moduleKey).newLabel}</h2><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        </div>
        <div className="max-h-[72vh] space-y-4 overflow-auto p-5">
          <label className="block"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ressource</span><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={`${selectClassName} mt-1 w-full`}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number || employee.id}</option>)}</select></label>
          {moduleKey === "skills" && <><label className="block"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Compétence</span><select value={skillId} onChange={(e) => setSkillId(e.target.value)} className={`${selectClassName} mt-1 w-full`}>{catalog.map((skill) => <option key={skill.id} value={skill.id}>{skill.family} / {skill.category} / {skill.name}</option>)}</select></label><label className="block"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Niveau actuel</span><select value={level} onChange={(e) => setLevel(e.target.value)} className={`${selectClassName} mt-1 w-full`}>{[0, 1, 2, 3, 4].map((item) => <option key={item} value={item}>Niveau {item}</option>)}</select></label></>}
          {moduleKey === "time" && <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/25 dark:text-indigo-300">Sélectionne la date de pointage puis renseigne les rubriques du projet. Pour un projet IC-AAAA-0001, seule la colonne Intercontrat doit être utilisée ; pour un projet P-AAAA-XXXX, la colonne IC reste à zéro.</div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-600">
              <table className="min-w-[1280px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-800">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300"><tr><th className="px-3 py-2 text-left">N° projet</th><th className="px-3 py-2 text-left">Désignation</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">AVV</th><th className="px-3 py-2 text-right">Management</th><th className="px-3 py-2 text-right">Production</th><th className="px-3 py-2 text-right">Reprise</th><th className="px-3 py-2 text-right">Formation</th><th className="px-3 py-2 text-right">IC</th><th className="px-3 py-2 text-right">Achat €</th><th className="px-3 py-2 text-right">Frais €</th></tr></thead>
                <tbody><tr><td className="p-2"><input value={projectNumber} onChange={(e)=>setProjectNumber(e.target.value)} placeholder="P-2026-0001 ou IC-2026-0001" className={`${selectClassName} w-full`} /></td><td className="p-2"><input value={projectDesignation} onChange={(e)=>setProjectDesignation(e.target.value)} className={`${selectClassName} w-full`} /></td><td className="p-2"><input type="date" value={activityDate} onChange={(e)=>setActivityDate(e.target.value)} className={`${selectClassName} w-full`} /></td><td className="p-2"><input type="number" step="0.25" value={avvHours} onChange={(e)=>setAvvHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="0.25" value={managementHours} onChange={(e)=>setManagementHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="0.25" value={productionHours} onChange={(e)=>setProductionHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="0.25" value={reworkHours} onChange={(e)=>setReworkHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="0.25" value={trainingHours} onChange={(e)=>setTrainingHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="0.25" value={intercontractHours} onChange={(e)=>setIntercontractHours(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="1" value={purchaseCost} onChange={(e)=>setPurchaseCost(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td><td className="p-2"><input type="number" step="1" value={expenseCost} onChange={(e)=>setExpenseCost(e.target.value)} className={`${selectClassName} w-24 text-right`} /></td></tr></tbody>
              </table>
            </div>
            <label className="block"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Commentaires</span><textarea value={comments} onChange={(e)=>setComments(e.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" /></label>
          </div>}
          {moduleKey === "onboarding" && <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-5 text-slate-600 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-300">Le parcours sera créé avec une checklist complète RH / IT / manager / qualité / collaborateur : livret, PC, mail, accès outils, projet, fiche poste, matrice compétences, formations, points manager et période d’essai.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Annuler</button><button type="button" onClick={() => void save()} disabled={isSaving || !employeeId || (moduleKey === "skills" && !skillId)} className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">Enregistrer</button></div>
        </div>
      </div>
    </div>
  );
}

export default function HrTalentModulePage({ params, moduleKey }: { params: Promise<PageParams>; moduleKey: HrTalentModuleKey }) {
  const { orgId } = use(params);
  const [filters, setFilters] = useState<FilterValue>(emptyFilters);
  const [activeTab, setActiveTab] = useState<TabKey>("main");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const config = getConfig(moduleKey);
  const query = useQuery({ queryKey: ["hr-talent-module", moduleKey, orgId], queryFn: () => loadData(orgId, moduleKey) });
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async (row: AnyRow) => {
      const table = moduleKey === "time" ? "hr_time_activity_entries" : moduleKey === "skills" ? "hr_employee_skills" : moduleKey === "onboarding" ? "hr_onboarding_plans" : "hr_review_items";
      const { error } = await (supabase.from(table as never) as any).update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-talent-module"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (row: AnyRow) => {
      const table = moduleKey === "time" ? "hr_time_activity_entries" : moduleKey === "skills" ? "hr_employee_skills" : moduleKey === "onboarding" ? "hr_onboarding_plans" : "hr_review_items";
      const status = moduleKey === "time" ? "submitted" : moduleKey === "skills" ? "active" : moduleKey === "onboarding" ? "in_progress" : "employee_input";
      const { error } = await (supabase.from(table as never) as any).update({ status, archived_at: null }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hr-talent-module"] }),
  });

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-700/70">Chargement...</div>;
  if (query.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger la page : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  const data = query.data as ModuleData;
  const filteredRows = filterRows(moduleKey, data.rows, filters);
  const metrics = buildMetrics(moduleKey, filteredRows, data.catalog);
  const tabs = [
    { key: "main" as TabKey, label: config.primaryTab, icon: moduleKey === "skills" ? Users : config.icon, accent: "indigo" },
    { key: "graphs" as TabKey, label: "Graphiques", icon: BarChart3, accent: "emerald" },
    ...(moduleKey === "skills" ? [{ key: "library" as TabKey, label: "Bibliothèque", icon: BookOpen, accent: "amber" }] : []),
    { key: "alerts" as TabKey, label: "Alertes", icon: Bell, accent: moduleKey === "skills" ? "rose" : "amber" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <>
            <button type="button" onClick={() => setHistoryOpen((current) => !current)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 text-sm font-bold text-sky-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 dark:border-sky-900 dark:bg-slate-700/70 dark:text-sky-300 dark:hover:bg-sky-900/30"><Clock3 className="h-4 w-4" />Historique RH</button>
            <DataExportMenu data={filteredRows} columns={buildExportColumns(moduleKey)} fileName={config.exportFile} sheetName={config.title} disabled={filteredRows.length === 0} />
            <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"><Plus className="h-4 w-4" />{config.newLabel}</button>
          </>
        }
      />

      <PageTutorial
        title={config.guideTitle}
        description={config.guideDescription}
        objectives={["Fiabiliser les données RH et managériales.", "Outiller les décisions formation, staffing, charge, intégration et performance.", "Produire un reporting exploitable sans ressaisie."]}
        steps={[{ title: "Filtrer", description: "Utiliser le périmètre d’analyse pour cibler ressources, statuts, modules, niveaux et besoins." }, { title: "Analyser", description: "Lire les KPI, cartes, tableaux, radars, alertes et recommandations." }, { title: "Agir", description: "Créer, modifier, archiver, exporter et capitaliser les actions RH." }]}
        analyses={[{ title: "Décision", description: "Comparer charge, disponibilité, niveau, risque, objectif, intégration et maturité RH." }]}
        recommendations={["Mettre à jour les compétences au moins une fois par an et en sortie de projet.", "Relier les écarts aux entretiens, formations, staffing et projets.", "Archiver uniquement après validation RH/manager et contrôle qualité."]}
      />

      {historyOpen && <SectionCard icon={Clock3} title="Historique RH" description="Historique local des actions réalisées sur la page."><p className="text-sm text-slate-500 dark:text-slate-300">Les créations, validations, exports et archivages seront rattachés à l’audit global ONEPILOT lors du lot audit transverse.</p></SectionCard>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>

      <FiltersPanel moduleKey={moduleKey} rows={data.rows} catalog={data.catalog} employees={data.employees} value={filters} onChange={setFilters} resultCount={filteredRows.length} />

      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const activeClasses: Record<string, string> = { indigo: "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none", emerald: "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none", amber: "bg-amber-500 text-white shadow-md shadow-amber-100 dark:shadow-none", rose: "bg-rose-600 text-white shadow-md shadow-rose-100 dark:shadow-none" };
            const inactiveClasses: Record<string, string> = { indigo: "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/35 dark:hover:text-indigo-300", emerald: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/35 dark:hover:text-emerald-300", amber: "text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/35 dark:hover:text-amber-300", rose: "text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/35 dark:hover:text-rose-300" };
            return <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${activeTab === tab.key ? activeClasses[tab.accent] : inactiveClasses[tab.accent]}`}><Icon className="h-4 w-4" />{tab.label}</button>;
          })}
        </div>
      </div>

      {activeTab === "main" && <WorkCardsAndTable moduleKey={moduleKey} rows={filteredRows} employees={data.employees} onArchive={(row) => archiveMutation.mutate(row)} onRestore={(row) => restoreMutation.mutate(row)} />}
      {activeTab === "graphs" && <GraphsPanel moduleKey={moduleKey} rows={filteredRows} catalog={data.catalog} />}
      {activeTab === "library" && <LibraryPanel catalog={data.catalog} rows={filteredRows} />}
      {activeTab === "alerts" && <AlertsPanel moduleKey={moduleKey} rows={filteredRows} />}

      {showCreateModal && <CreateModal moduleKey={moduleKey} organizationId={data.organization.id} employees={data.employees} catalog={data.catalog} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
