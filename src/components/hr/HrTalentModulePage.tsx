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
  AlertCircle,
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Expand,
  Eye,
  FileSpreadsheet,
  Gauge,
  GraduationCap,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
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

import type { HrDirectoryEmployee } from "@/components/hr/HrDirectory";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type HrTalentModuleKey = "time" | "skills" | "onboarding" | "reviews";

type PageParams = { orgId: string };

type Organization = { id: string; name: string; slug: string };

type EmployeeOption = {
  id: string;
  full_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  function_name: string | null;
  function_free_text: string | null;
  manager_name: string | null;
};

type TimeEntry = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  manager_name: string | null;
  activity_date: string | null;
  activity_type: string | null;
  duration_hours: number | null;
  status: string | null;
  description: string | null;
  manager_comment: string | null;
  created_at: string | null;
  archived_at: string | null;
};

type SkillCatalogItem = {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  family: string | null;
  category: string | null;
  description: string | null;
  criticality: string | null;
  is_active: boolean | null;
  created_at: string | null;
  archived_at: string | null;
};

type EmployeeSkill = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  manager_name: string | null;
  skill_id: string | null;
  skill_name: string | null;
  family: string | null;
  category: string | null;
  criticality: string | null;
  current_level: number | null;
  target_level: number | null;
  gap: number;
  evidence: string | null;
  status: string | null;
  created_at: string | null;
  archived_at: string | null;
};

type OnboardingPlan = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  manager_name: string | null;
  recruiter_name: string | null;
  start_date: string | null;
  target_end_date: string | null;
  status: string | null;
  progress_percent: number | null;
  risk_level: string | null;
  notes: string | null;
  checklist_items?: ChecklistItem[] | null;
  created_at: string | null;
  archived_at: string | null;
};

type ChecklistItem = { label: string; owner: string; status: "OK" | "NOK" | "NA"; due?: string; note?: string };

type ReviewDetails = { previous_year?: { objectives?: string; achievement?: number; highlights?: string }; current_year?: { objectives?: string; priority?: string }; training?: string[]; employee_validation?: boolean; manager_validation?: boolean; development_plan?: string };

type ReviewItem = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  manager_name: string | null;
  cycle_name: string | null;
  review_type: string | null;
  period_start: string | null;
  period_end: string | null;
  status: string | null;
  objective_count: number | null;
  completed_objective_count: number | null;
  global_rating: number | null;
  employee_comment: string | null;
  manager_comment: string | null;
  review_details?: ReviewDetails | null;
  created_at: string | null;
  archived_at: string | null;
};

type ModuleRow = TimeEntry | EmployeeSkill | OnboardingPlan | ReviewItem;

type FiltersValue = {
  search: string;
  status: string;
  department: string;
  resource: string;
  module: string;
  submodule: string;
  level: string;
  need: string;
};

type ChartData = { name: string; value: number; extra?: number };

type ModuleData = {
  organization: Organization;
  employees: EmployeeOption[];
  rows: ModuleRow[];
  skillCatalog: SkillCatalogItem[];
};

type MetricDefinition = {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: Accent;
};

type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky";

type PageTab = "pilotage" | "graphs" | "library" | "alerts";

const initialFilters: FiltersValue = {
  search: "",
  status: "all",
  department: "all",
  resource: "all",
  module: "all",
  submodule: "all",
  level: "all",
  need: "all",
};

const chartColors = ["#a5b4fc", "#6ee7b7", "#fcd34d", "#fda4af", "#7dd3fc", "#c4b5fd", "#99f6e4", "#fecdd3"];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (supabase.from("organizations" as never) as any).select("id, name, slug");
  const { data, error } = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();

  if (error) throw new Error(`Impossible d’identifier l’organisation : ${error.message}`);
  if (!data?.id) throw new Error("L’organisation demandée est introuvable.");
  return data as Organization;
}

function getDepartment(row: Partial<EmployeeOption>) {
  return row.department_free_text || row.department_name || "Non renseigné";
}

function getJob(row: Partial<EmployeeOption>) {
  return row.job_free_text || row.job_name || "Non renseigné";
}

function getRowEmployeeName(row: Partial<TimeEntry & EmployeeSkill & OnboardingPlan & ReviewItem>) {
  return row.employee_name || "Collaborateur non renseigné";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatMonthLabel(value: string | null | undefined) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(date).replace(".", "");
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value ?? 0);
}

function statusLabel(moduleKey: HrTalentModuleKey, value: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    manager_approved: "Validé manager",
    approved: "Approuvé",
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
    archived: "Archivé",
  };

  return value ? labels[value] ?? value : moduleKey === "skills" ? "Actif" : "Non renseigné";
}

function uniqueValues<T>(rows: T[], resolver: (row: T) => string | null | undefined) {
  return Array.from(new Set(rows.map(resolver).filter((value): value is string => Boolean(value?.trim())))).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}

function groupBy<T>(rows: T[], resolver: (row: T) => string | null | undefined, fallback = "Non renseigné") {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const label = resolver(row)?.trim() || fallback;
    map.set(label, (map.get(label) ?? 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function monthly<T>(rows: T[], resolver: (row: T) => string | null | undefined) {
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, name: formatMonthLabel(date.toISOString()), value: 0 };
  });
  const map = new Map(months.map((item) => [item.key, item]));
  rows.forEach((row) => {
    const value = resolver(row);
    if (!value) return;
    const date = new Date(value);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const item = map.get(key);
    if (item) item.value += 1;
  });
  return months;
}

function averageBy<T>(rows: T[], groupResolver: (row: T) => string | null | undefined, valueResolver: (row: T) => number | null | undefined) {
  const map = new Map<string, { total: number; count: number }>();
  rows.forEach((row) => {
    const value = valueResolver(row);
    if (typeof value !== "number" || Number.isNaN(value)) return;
    const label = groupResolver(row)?.trim() || "Non renseigné";
    const current = map.get(label) ?? { total: 0, count: 0 };
    current.total += value;
    current.count += 1;
    map.set(label, current);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value.total / Math.max(1, value.count)) })).sort((a, b) => b.value - a.value);
}

function percentage(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function getConfig(moduleKey: HrTalentModuleKey) {
  const configs = {
    time: {
      title: "Temps & activités",
      subtitle: "Feuilles de temps, validation manager, charge réelle et écarts capacité/projet.",
      newLabel: "Nouvelle activité",
      exportFile: "temps_activites_rh",
      primaryTab: "Temps & activités",
      primaryIcon: Clock3,
      guideTitle: "Piloter les temps et activités",
      guideDescription: "Contrôler les heures déclarées, les validations manager, les écarts charge/capacité et les activités projet.\nSécuriser les exports RH, finance et PMO avec des données filtrées et traçables.",
    },
    skills: {
      title: "Compétences",
      subtitle: "Matrice de compétences, bibliothèque, criticité, écarts niveau cible/réel et plans de développement.",
      newLabel: "Nouvelle compétence",
      exportFile: "competences_rh",
      primaryTab: "Matrice",
      primaryIcon: GraduationCap,
      guideTitle: "Piloter les compétences",
      guideDescription: "Cartographier les compétences par module, sous-module, niveau, criticité, besoin et collaborateur.\nIdentifier les écarts, les expertises disponibles et les compétences critiques à sécuriser.",
    },
    onboarding: {
      title: "Onboarding",
      subtitle: "Parcours d’intégration, checklists RH/manager/IT/qualité, risques, progression et relances.",
      newLabel: "Nouveau parcours",
      exportFile: "onboarding_rh",
      primaryTab: "Parcours",
      primaryIcon: ListChecks,
      guideTitle: "Piloter les intégrations",
      guideDescription: "Suivre les arrivées, les parcours d’intégration, les risques, les retards et la progression par manager.\nGarantir une expérience collaborateur homogène avec des preuves et actions traçables.",
    },
    reviews: {
      title: "Entretiens & objectifs",
      subtitle: "Campagnes, objectifs, auto-évaluation, évaluation manager, calibration et plans d’action.",
      newLabel: "Nouvel entretien",
      exportFile: "entretiens_objectifs_rh",
      primaryTab: "Entretiens",
      primaryIcon: Target,
      guideTitle: "Piloter les entretiens et objectifs",
      guideDescription: "Suivre les campagnes, objectifs individuels, validations manager, notes et plans de développement.\nPréparer la calibration, les décisions RH et les synthèses direction avec des données filtrées.",
    },
  } as const;

  return configs[moduleKey];
}

async function loadModuleData(slugOrId: string, moduleKey: HrTalentModuleKey): Promise<ModuleData> {
  const organization = await resolveOrganization(slugOrId);
  const { data: employeesRaw, error: employeeError } = await (supabase.from("hr_employee_overview" as never) as any)
    .select("id, full_name, employee_number, department_name, department_free_text, job_name, job_free_text, function_name, function_free_text, manager_name")
    .eq("organization_id", organization.id)
    .order("full_name", { ascending: true });

  if (employeeError) throw new Error(`Impossible de charger les ressources : ${employeeError.message}`);
  const employees = (employeesRaw ?? []) as EmployeeOption[];

  const { data: catalogRaw } = await (supabase.from("hr_skill_catalog" as never) as any)
    .select("id, organization_id, code, name, family, category, description, criticality, is_active, created_at, archived_at")
    .eq("organization_id", organization.id)
    .order("family", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  const skillCatalog = (catalogRaw ?? []) as SkillCatalogItem[];

  if (moduleKey === "time") {
    const { data, error } = await (supabase.from("hr_time_activity_entries" as never) as any)
      .select("id, organization_id, employee_id, activity_date, activity_type, duration_hours, status, description, manager_comment, created_at, archived_at")
      .eq("organization_id", organization.id)
      .order("activity_date", { ascending: false });
    if (error) throw new Error(`Impossible de charger les temps : ${error.message}`);
    const rows = ((data ?? []) as any[]).map((row) => {
      const employee = employees.find((item) => item.id === row.employee_id);
      return { ...row, employee_name: employee?.full_name, employee_number: employee?.employee_number, department_name: employee?.department_name, department_free_text: employee?.department_free_text, job_name: employee?.job_name, job_free_text: employee?.job_free_text, manager_name: employee?.manager_name } as TimeEntry;
    });
    return { organization, employees, rows, skillCatalog };
  }

  if (moduleKey === "skills") {
    const { data, error } = await (supabase.from("hr_employee_skills" as never) as any)
      .select("id, organization_id, employee_id, skill_id, current_level, target_level, evidence, status, created_at, archived_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Impossible de charger les compétences : ${error.message}`);
    const rows = ((data ?? []) as any[]).map((row) => {
      const employee = employees.find((item) => item.id === row.employee_id);
      const skill = skillCatalog.find((item) => item.id === row.skill_id);
      return { ...row, employee_name: employee?.full_name, employee_number: employee?.employee_number, department_name: employee?.department_name, department_free_text: employee?.department_free_text, job_name: employee?.job_name, job_free_text: employee?.job_free_text, manager_name: employee?.manager_name, skill_name: skill?.name, family: skill?.family, category: skill?.category, criticality: skill?.criticality, gap: Math.max(0, Number(row.target_level ?? 0) - Number(row.current_level ?? 0)) } as EmployeeSkill;
    });
    return { organization, employees, rows, skillCatalog };
  }

  if (moduleKey === "onboarding") {
    const { data, error } = await (supabase.from("hr_onboarding_plans" as never) as any)
      .select("id, organization_id, employee_id, manager_employee_id, recruiter_employee_id, start_date, target_end_date, status, progress_percent, risk_level, notes, checklist_items, created_at, archived_at")
      .eq("organization_id", organization.id)
      .order("start_date", { ascending: false });
    if (error) throw new Error(`Impossible de charger l’onboarding : ${error.message}`);
    const rows = ((data ?? []) as any[]).map((row) => {
      const employee = employees.find((item) => item.id === row.employee_id);
      const manager = employees.find((item) => item.id === row.manager_employee_id);
      const recruiter = employees.find((item) => item.id === row.recruiter_employee_id);
      return { ...row, employee_name: employee?.full_name, employee_number: employee?.employee_number, department_name: employee?.department_name, department_free_text: employee?.department_free_text, job_name: employee?.job_name, job_free_text: employee?.job_free_text, manager_name: manager?.full_name ?? employee?.manager_name, recruiter_name: recruiter?.full_name } as OnboardingPlan;
    });
    return { organization, employees, rows, skillCatalog };
  }

  const { data: cyclesRaw } = await (supabase.from("hr_review_cycles" as never) as any)
    .select("id, name, review_type, period_start, period_end, status")
    .eq("organization_id", organization.id);
  const cycles = (cyclesRaw ?? []) as any[];
  const { data, error } = await (supabase.from("hr_review_items" as never) as any)
    .select("id, organization_id, cycle_id, employee_id, manager_employee_id, status, objective_count, completed_objective_count, global_rating, employee_comment, manager_comment, review_details, created_at, archived_at")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Impossible de charger les entretiens : ${error.message}`);
  const rows = ((data ?? []) as any[]).map((row) => {
    const employee = employees.find((item) => item.id === row.employee_id);
    const manager = employees.find((item) => item.id === row.manager_employee_id);
    const cycle = cycles.find((item) => item.id === row.cycle_id);
    return { ...row, employee_name: employee?.full_name, employee_number: employee?.employee_number, department_name: employee?.department_name, department_free_text: employee?.department_free_text, job_name: employee?.job_name, job_free_text: employee?.job_free_text, manager_name: manager?.full_name ?? employee?.manager_name, cycle_name: cycle?.name, review_type: cycle?.review_type, period_start: cycle?.period_start, period_end: cycle?.period_end } as ReviewItem;
  });
  return { organization, employees, rows, skillCatalog };
}

function MetricCard({ label, value, description, icon: Icon, accent }: MetricDefinition) {
  const accentClasses: Record<Accent, { panel: string; icon: string; value: string }> = {
    indigo: { panel: "border-indigo-100 from-indigo-50/85 via-white to-sky-50/65 dark:border-indigo-900/50 dark:from-indigo-800/25 dark:via-slate-700/85 dark:to-emerald-700/20", icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200", value: "text-indigo-700 dark:text-indigo-300" },
    emerald: { panel: "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-800/25 dark:via-slate-700/85 dark:to-teal-700/20", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200", value: "text-emerald-700 dark:text-emerald-300" },
    amber: { panel: "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-800/25 dark:via-slate-700/85 dark:to-orange-700/20", icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200", value: "text-amber-700 dark:text-amber-300" },
    rose: { panel: "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-800/25 dark:via-slate-700/85 dark:to-pink-700/20", icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200", value: "text-rose-700 dark:text-rose-300" },
    sky: { panel: "border-sky-100 from-sky-50/85 via-white to-cyan-50/65 dark:border-sky-900/50 dark:from-sky-800/25 dark:via-slate-700/85 dark:to-cyan-700/20", icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200", value: "text-sky-700 dark:text-sky-300" },
  };
  const classes = accentClasses[accent];
  return (
    <article className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.panel}`}>
      <div className="flex h-full items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}><Icon className="h-4 w-4" strokeWidth={1.9} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p>
            <p className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}>{value}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-300">{description}</p>
        </div>
      </div>
    </article>
  );
}

function SectionCard({ icon: Icon, title, description, children, right }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; description: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/70 dark:bg-slate-600/65">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/20 dark:via-slate-700/85 dark:to-indigo-900/20">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"><Icon className="h-4 w-4" strokeWidth={1.9} /></div>
          <div className="min-w-0"><h2 className="truncate text-sm font-black text-slate-950 dark:text-slate-100" title={title}>{title}</h2><p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p></div>
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function TabButton({ active, accent, icon: Icon, label, onClick }: { active: boolean; accent: Accent; icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  const colors: Record<Accent, string> = {
    indigo: active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none" : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/35 dark:hover:text-indigo-300",
    emerald: active ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/35 dark:hover:text-emerald-300",
    amber: active ? "bg-amber-500 text-white shadow-md shadow-amber-100 dark:shadow-none" : "text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/35 dark:hover:text-amber-300",
    rose: active ? "bg-rose-600 text-white shadow-md shadow-rose-100 dark:shadow-none" : "text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/35 dark:hover:text-rose-300",
    sky: active ? "bg-sky-600 text-white shadow-md shadow-sky-100 dark:shadow-none" : "text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/35 dark:hover:text-sky-300",
  };
  return <button type="button" onClick={onClick} className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${colors[accent]}`}><Icon className="h-4 w-4" />{label}</button>;
}

function FiltersPanel({ moduleKey, rows, skillCatalog, employees, value, onChange, resultCount }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; skillCatalog: SkillCatalogItem[]; employees: EmployeeOption[]; value: FiltersValue; onChange: (value: FiltersValue) => void; resultCount: number }) {
  const departments = uniqueValues(rows, (row: any) => getDepartment(row));
  const statuses = uniqueValues(rows, (row: any) => row.status).map((status) => ({ value: status, label: statusLabel(moduleKey, status) }));
  const modules = uniqueValues(skillCatalog, (skill) => skill.family);
  const submodules = uniqueValues(skillCatalog.filter((skill) => value.module === "all" || skill.family === value.module), (skill) => skill.category);
  const resourceOptions = employees.map((employee) => ({ value: employee.id, label: employee.full_name || "Sans nom" }));
  const hasActiveFilters = Object.entries(value).some(([key, filterValue]) => key === "search" ? filterValue.trim().length > 0 : filterValue !== "all");
  function update<K extends keyof FiltersValue>(field: K, fieldValue: FiltersValue[K]) {
    onChange({ ...value, [field]: fieldValue, ...(field === "module" ? { submodule: "all" } : {}) });
  }
  function reset() { onChange(initialFilters); }
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><SlidersHorizontal className="h-4 w-4" /></div><div><h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Les filtres pilotent les KPI, les analyses, les graphiques et les exports.</p></div></div>
          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">{resultCount} résultat{resultCount > 1 ? "s" : ""} sur {rows.length}</div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input type="search" value={value.search} onChange={(event) => update("search", event.target.value)} placeholder="Rechercher un collaborateur, statut, métier, compétence, commentaire..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select value={value.status} onChange={(event) => update("status", event.target.value)} className={selectClassName}><option value="all">Tous les statuts</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select value={value.department} onChange={(event) => update("department", event.target.value)} className={selectClassName}><option value="all">Tous les services</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={value.resource} onChange={(event) => update("resource", event.target.value)} className={selectClassName}><option value="all">Toutes les ressources</option>{resourceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          {moduleKey === "skills" ? <select value={value.module} onChange={(event) => update("module", event.target.value)} className={selectClassName}><option value="all">Tous les modules</option>{modules.map((item) => <option key={item} value={item}>{item}</option>)}</select> : <select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}><option value="all">Tous les besoins</option><option value="late">Retards / risques</option><option value="action">Actions à traiter</option><option value="complete">Dossiers complets</option></select>}
          {moduleKey === "skills" && <><select value={value.submodule} onChange={(event) => update("submodule", event.target.value)} className={selectClassName}><option value="all">Tous les sous-modules</option>{submodules.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={value.level} onChange={(event) => update("level", event.target.value)} className={selectClassName}><option value="all">Tous les niveaux</option><option value="0-1">Niveau 0 à 1</option><option value="2-3">Niveau 2 à 3</option><option value="4-5">Niveau 4 à 5</option></select><select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}><option value="all">Tous les besoins</option><option value="gap">Écart cible/réel</option><option value="critical">Compétences critiques</option><option value="to_develop">À développer</option></select></>}
        </div>
        {hasActiveFilters && <div className="flex justify-end"><button type="button" onClick={reset} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"><X className="h-4 w-4" />Réinitialiser les filtres</button></div>}
      </div>
    </section>
  );
}

const selectClassName = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

function createPngFromChart(title: string, description: string, data: ChartData[], kind: "donut" | "bar" | "line" | "radar", unit: "count" | "percent" | "currency" = "count") {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 820;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ctx = context;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafc"; roundRect(ctx, 34, 32, 1332, 756, 30); ctx.fill();
  ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 2; roundRect(ctx, 34, 32, 1332, 756, 30); ctx.stroke();
  const gradient = ctx.createLinearGradient(34, 32, 1366, 32); gradient.addColorStop(0, "#f0f9ff"); gradient.addColorStop(0.5, "#ffffff"); gradient.addColorStop(1, "#eef2ff"); ctx.fillStyle = gradient; roundRect(ctx, 34, 32, 1332, 96, 30); ctx.fill();
  ctx.fillStyle = "#0f172a"; ctx.font = "800 28px Arial"; ctx.fillText(title, 96, 78);
  ctx.fillStyle = "#64748b"; ctx.font = "15px Arial"; ctx.fillText(description.slice(0, 145), 96, 106);
  const chart = { left: 120, top: 170, width: 1160, height: 500 };
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const label = (value: number) => unit === "currency" ? formatCurrency(value) : unit === "percent" ? `${Math.round(value)} %` : String(Math.round(value));
  if (kind === "donut") {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    let start = -Math.PI / 2;
    data.slice(0, 8).forEach((item, index) => { const angle = (item.value / total) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(700, 410); ctx.arc(700, 410, 190, start, start + angle); ctx.closePath(); ctx.fillStyle = chartColors[index % chartColors.length]; ctx.fill(); start += angle; });
    ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(700, 410, 108, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0f172a"; ctx.font = "800 42px Arial"; ctx.textAlign = "center"; ctx.fillText(String(total), 700, 405); ctx.font = "14px Arial"; ctx.fillStyle = "#64748b"; ctx.fillText("total", 700, 432); ctx.textAlign = "left";
  } else if (kind === "line") {
    drawAxes(ctx, chart); const points = data.map((item, index) => ({ x: chart.left + (data.length === 1 ? chart.width / 2 : (chart.width / (data.length - 1)) * index), y: chart.top + chart.height - (item.value / maxValue) * chart.height, ...item }));
    ctx.strokeStyle = chartColors[1]; ctx.lineWidth = 5; ctx.beginPath(); points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)); ctx.stroke();
    points.forEach((point) => { ctx.fillStyle = chartColors[0]; ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#334155"; ctx.font = "700 13px Arial"; ctx.textAlign = "center"; ctx.fillText(label(point.value), point.x, point.y - 16); ctx.fillStyle = "#64748b"; ctx.font = "12px Arial"; ctx.fillText(point.name, point.x, chart.top + chart.height + 30); }); ctx.textAlign = "left";
  } else if (kind === "radar") {
    const cx = 700, cy = 420, radius = 210; data.slice(0, 8).forEach((item, index, arr) => { const angle = -Math.PI / 2 + (index / arr.length) * Math.PI * 2; const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius; ctx.strokeStyle = "#cbd5e1"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); ctx.fillStyle = "#475569"; ctx.font = "13px Arial"; ctx.textAlign = "center"; ctx.fillText(item.name.slice(0, 18), x, y); });
    const points = data.slice(0, 8).map((item, index, arr) => { const angle = -Math.PI / 2 + (index / arr.length) * Math.PI * 2; const r = radius * (item.value / 5); return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }; });
    ctx.fillStyle = "rgba(110, 231, 183, .28)"; ctx.strokeStyle = chartColors[0]; ctx.lineWidth = 4; ctx.beginPath(); points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.textAlign = "left";
  } else {
    drawAxes(ctx, chart); const barWidth = Math.min(70, chart.width / Math.max(1, data.length) * 0.55); data.slice(0, 12).forEach((item, index) => { const slot = chart.width / Math.max(1, data.length); const height = (item.value / maxValue) * chart.height; const x = chart.left + index * slot + slot / 2 - barWidth / 2; const y = chart.top + chart.height - height; ctx.fillStyle = chartColors[index % chartColors.length]; roundRect(ctx, x, y, barWidth, height, 12); ctx.fill(); ctx.fillStyle = "#334155"; ctx.font = "700 13px Arial"; ctx.textAlign = "center"; ctx.fillText(label(item.value), x + barWidth / 2, y - 10); ctx.fillStyle = "#64748b"; ctx.font = "11px Arial"; ctx.fillText(item.name.slice(0, 16), x + barWidth / 2, chart.top + chart.height + 30); }); ctx.textAlign = "left";
  }
  data.slice(0, 8).forEach((item, index) => { const x = 120 + (index % 4) * 300; const y = 730 + Math.floor(index / 4) * 28; ctx.fillStyle = chartColors[index % chartColors.length]; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#475569"; ctx.font = "13px Arial"; ctx.fillText(`${item.name} · ${label(item.value)}`, x + 16, y + 5); });
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath(); }
function drawAxes(ctx: CanvasRenderingContext2D, chart: { left: number; top: number; width: number; height: number }) { ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(chart.left, chart.top); ctx.lineTo(chart.left, chart.top + chart.height); ctx.lineTo(chart.left + chart.width, chart.top + chart.height); ctx.stroke(); }

async function copyChartAsPng(title: string, description: string, data: ChartData[], kind: "donut" | "bar" | "line" | "radar", unit?: "count" | "percent" | "currency") {
  const canvas = createPngFromChart(title, description, data, kind, unit);
  if (!canvas) return "failed" as const;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) return "failed" as const;
  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); return "copied" as const; } catch {}
  }
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.png`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); return "downloaded" as const;
}

function ChartCard({ title, description, data, kind, unit, children }: { title: string; description: string; data: ChartData[]; kind: "donut" | "bar" | "line" | "radar"; unit?: "count" | "percent" | "currency"; children: ReactNode }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "downloaded" | "failed">("idle");
  async function handleCopy() { const result = await copyChartAsPng(title, description, data, kind, unit); setCopyState(result); window.setTimeout(() => setCopyState("idle"), 1800); }
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-600/65"><div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold text-slate-950 dark:text-slate-100" title={title}>{title}</h3><p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-[10px] font-bold text-slate-400">{copyState === "copied" ? "Copié" : copyState === "downloaded" ? "PNG téléchargé" : copyState === "failed" ? "Échec" : ""}</span><button type="button" onClick={handleCopy} title="Copier" aria-label={`Copier ${title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35"><Copy className="h-4 w-4" /></button><button type="button" onClick={(event) => event.currentTarget.closest("article")?.requestFullscreen?.()} title="Agrandir" aria-label={`Agrandir ${title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35"><Expand className="h-4 w-4" /></button></div></div><div className="h-80 p-4">{children}</div></article>;
}

function getMetrics(moduleKey: HrTalentModuleKey, rows: ModuleRow[], skillCatalog: SkillCatalogItem[]): MetricDefinition[] {
  if (moduleKey === "time") {
    const hours = rows.reduce((sum, row: any) => sum + Number(row.duration_hours ?? 0), 0);
    const submitted = rows.filter((row: any) => ["submitted", "manager_approved"].includes(row.status)).length;
    const approved = rows.filter((row: any) => row.status === "approved").length;
    return [{ label: "Heures déclarées", value: Math.round(hours), description: "Total des heures du périmètre filtré.", icon: Clock3, accent: "indigo" }, { label: "Saisies soumises", value: submitted, description: "Feuilles en attente de validation manager ou RH.", icon: CalendarClock, accent: "emerald" }, { label: "Saisies approuvées", value: approved, description: "Temps validés et exploitables finance/PMO.", icon: CheckCircle2, accent: "amber" }, { label: "Écarts à traiter", value: rows.filter((row: any) => row.status === "rejected" || Number(row.duration_hours ?? 0) === 0).length, description: "Rejets, heures nulles ou anomalies de saisie.", icon: AlertTriangle, accent: "rose" }];
  }
  if (moduleKey === "skills") {
    const averageLevel = Math.round((rows.reduce((sum, row: any) => sum + Number(row.current_level ?? 0), 0) / Math.max(1, rows.length)) * 10) / 10;
    return [{ label: "Compétences suivies", value: rows.length, description: "Évaluations collaborateurs dans le périmètre.", icon: GraduationCap, accent: "indigo" }, { label: "Bibliothèque", value: skillCatalog.length, description: "Compétences disponibles par module et sous-module.", icon: BookOpen, accent: "emerald" }, { label: "Niveau moyen", value: Math.round(averageLevel), description: `Moyenne arrondie des niveaux de 0 à 5 (${averageLevel}/5).`, icon: Gauge, accent: "amber" }, { label: "Écarts cible", value: rows.filter((row: any) => row.gap > 0).length, description: "Compétences dont le niveau cible dépasse le niveau réel.", icon: Target, accent: "rose" }];
  }
  if (moduleKey === "onboarding") {
    const active = rows.filter((row: any) => ["prepared", "in_progress", "delayed"].includes(row.status)).length;
    const avg = Math.round(rows.reduce((sum, row: any) => sum + Number(row.progress_percent ?? 0), 0) / Math.max(1, rows.length));
    return [{ label: "Parcours suivis", value: rows.length, description: "Intégrations présentes dans le périmètre.", icon: ListChecks, accent: "indigo" }, { label: "Parcours actifs", value: active, description: "Préparés, en cours ou en retard.", icon: Users, accent: "emerald" }, { label: "Progression moyenne", value: avg, description: "Avancement moyen des parcours filtrés.", icon: Gauge, accent: "amber" }, { label: "Risques élevés", value: rows.filter((row: any) => row.risk_level === "high" || row.status === "delayed").length, description: "Parcours nécessitant une action RH/manager.", icon: AlertTriangle, accent: "rose" }];
  }
  const completed = rows.filter((row: any) => row.status === "completed").length;
  const objectives = rows.reduce((sum, row: any) => sum + Number(row.objective_count ?? 0), 0);
  const doneObjectives = rows.reduce((sum, row: any) => sum + Number(row.completed_objective_count ?? 0), 0);
  return [{ label: "Entretiens suivis", value: rows.length, description: "Entretiens et objectifs du périmètre.", icon: Target, accent: "indigo" }, { label: "Entretiens terminés", value: completed, description: "Dossiers finalisés et exploitables en historique.", icon: CheckCircle2, accent: "emerald" }, { label: "Objectifs", value: objectives, description: "Objectifs déclarés sur les entretiens filtrés.", icon: ListChecks, accent: "amber" }, { label: "Objectifs atteints", value: doneObjectives, description: "Objectifs complétés ou validés manager.", icon: Sparkles, accent: "rose" }];
}

function filterRows(moduleKey: HrTalentModuleKey, rows: ModuleRow[], filters: FiltersValue) {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row: any) => {
    const content = [row.employee_name, row.employee_number, getDepartment(row), getJob(row), row.manager_name, row.status, row.description, row.notes, row.skill_name, row.family, row.category, row.evidence, row.cycle_name, row.employee_comment, row.manager_comment].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !search || content.includes(search);
    const matchesStatus = filters.status === "all" || row.status === filters.status;
    const matchesDepartment = filters.department === "all" || getDepartment(row) === filters.department;
    const matchesResource = filters.resource === "all" || row.employee_id === filters.resource;
    const matchesModule = moduleKey !== "skills" || filters.module === "all" || row.family === filters.module;
    const matchesSubmodule = moduleKey !== "skills" || filters.submodule === "all" || row.category === filters.submodule;
    const level = Number(row.current_level ?? 0);
    const matchesLevel = moduleKey !== "skills" || filters.level === "all" || (filters.level === "0-1" && level <= 1) || (filters.level === "2-3" && level >= 2 && level <= 3) || (filters.level === "4-5" && level >= 4);
    const matchesNeed = filters.need === "all" || (filters.need === "gap" && row.gap > 0) || (filters.need === "critical" && row.criticality === "critical") || (filters.need === "to_develop" && row.status === "to_develop") || (filters.need === "late" && (row.status === "delayed" || row.risk_level === "high")) || (filters.need === "action" && ["submitted", "manager_approved", "delayed", "employee_input", "manager_input", "calibration"].includes(row.status)) || (filters.need === "complete" && ["approved", "completed", "validated"].includes(row.status));
    return matchesSearch && matchesStatus && matchesDepartment && matchesResource && matchesModule && matchesSubmodule && matchesLevel && matchesNeed;
  });
}

function rowTitle(moduleKey: HrTalentModuleKey, row: any) {
  if (moduleKey === "skills") return row.skill_name || "Compétence non renseignée";
  if (moduleKey === "time") return row.description || row.activity_type || "Activité";
  if (moduleKey === "onboarding") return `Parcours ${getRowEmployeeName(row)}`;
  return row.cycle_name || `Entretien ${getRowEmployeeName(row)}`;
}

function rowDescription(moduleKey: HrTalentModuleKey, row: any) {
  if (moduleKey === "skills") return `${row.family || "Module"} · ${row.category || "Sous-module"} · niveau ${row.current_level ?? 0}/5 cible ${row.target_level ?? 0}/5`;
  if (moduleKey === "time") return `${formatDate(row.activity_date)} · ${row.duration_hours ?? 0}h · ${getDepartment(row)}`;
  if (moduleKey === "onboarding") return `${formatDate(row.start_date)} → ${formatDate(row.target_end_date)} · progression ${Math.round(Number(row.progress_percent ?? 0))}%`;
  return `${row.review_type || "Entretien"} · ${row.objective_count ?? 0} objectif(s) · note ${row.global_rating ?? "—"}/5`;
}

function WorkCardsAndTable({ moduleKey, rows, onArchive }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; onArchive: (row: ModuleRow) => void }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  return <SectionCard icon={moduleKey === "skills" ? GraduationCap : moduleKey === "time" ? Clock3 : moduleKey === "onboarding" ? ListChecks : Target} title={getConfig(moduleKey).primaryTab} description="Cartes et tableau utilisent le même périmètre filtré, les mêmes actions et les mêmes données Supabase." right={<div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600/60 dark:bg-slate-700/70"><button type="button" onClick={() => setView("cards")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50"}`}>Tableau</button></div>}>
    {view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{rows.map((row: any) => <article key={row.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-700/65 dark:hover:border-indigo-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100" title={rowTitle(moduleKey, row)}>{rowTitle(moduleKey, row)}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300" title={rowDescription(moduleKey, row)}>{rowDescription(moduleKey, row)}</p></div><ActionMenu row={row} onArchive={onArchive} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Info label="Collaborateur" value={getRowEmployeeName(row)} /><Info label="Service" value={getDepartment(row)} /><Info label="Métier" value={getJob(row)} /><Info label="Statut" value={statusLabel(moduleKey, row.status)} /></div><ModuleBusinessSummary moduleKey={moduleKey} row={row} /></article>)}</div> : <div className="max-h-[460px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70"><table className="min-w-[980px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65"><thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300"><tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Objet</th><th className="px-4 py-3 text-left">Collaborateur</th><th className="px-4 py-3 text-left">Service</th><th className="px-4 py-3 text-left">Métier</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Détail</th><th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100 hover:bg-indigo-50/45 dark:border-slate-600/70 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 max-w-[260px] bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{rowTitle(moduleKey, row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getRowEmployeeName(row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getDepartment(row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getJob(row)}</td><td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300">{statusLabel(moduleKey, row.status)}</span></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rowDescription(moduleKey, row)}</td><td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu row={row} onArchive={onArchive} /></td></tr>)}</tbody></table></div>}
  </SectionCard>;
}

function getChecklistStats(items: ChecklistItem[] | null | undefined) {
  const list = Array.isArray(items) ? items : [];
  return {
    total: list.length,
    ok: list.filter((item) => item.status === "OK").length,
    nok: list.filter((item) => item.status === "NOK").length,
    na: list.filter((item) => item.status === "NA").length,
  };
}

function ModuleBusinessSummary({ moduleKey, row }: { moduleKey: HrTalentModuleKey; row: any }) {
  if (moduleKey === "skills") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Info label="Niveau actuel" value={`${row.current_level ?? 0}/5`} />
        <Info label="Niveau cible" value={`${row.target_level ?? 0}/5`} />
        <Info label="Écart" value={row.gap > 0 ? `+${row.gap}` : "OK"} />
        <Info label="Criticité" value={row.criticality || "standard"} />
      </div>
    );
  }

  if (moduleKey === "onboarding") {
    const stats = getChecklistStats(row.checklist_items);
    return (
      <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-600/60 dark:bg-slate-600/55">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black text-slate-950 dark:text-slate-100">Checklist intégration</p>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{stats.ok}/{stats.total} OK</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Info label="OK" value={stats.ok} />
          <Info label="NOK" value={stats.nok} />
          <Info label="NA" value={stats.na} />
        </div>
        <div className="space-y-1.5">
          {(Array.isArray(row.checklist_items) ? row.checklist_items.slice(0, 5) : []).map((item: ChecklistItem) => (
            <div key={`${item.owner}-${item.label}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px] dark:bg-slate-700/70">
              <span className="truncate text-slate-600 dark:text-slate-200" title={`${item.owner} · ${item.label}`}>{item.owner} · {item.label}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-black ${item.status === "OK" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : item.status === "NOK" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (moduleKey === "reviews") {
    const details = row.review_details as ReviewDetails | null | undefined;
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Info label="Atteinte année écoulée" value={details?.previous_year?.achievement !== undefined ? `${details.previous_year.achievement}%` : "Non renseigné"} />
        <Info label="Objectifs en cours" value={`${row.completed_objective_count ?? 0}/${row.objective_count ?? 0}`} />
        <Info label="Validation collaborateur" value={details?.employee_validation ? "OK" : "NOK"} />
        <Info label="Validation N+1" value={details?.manager_validation ? "OK" : "NOK"} />
        <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-600/60 dark:bg-slate-600/55">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Plan de développement</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold text-slate-700 dark:text-slate-200" title={details?.development_plan || details?.training?.join(', ') || "À définir"}>{details?.development_plan || details?.training?.join(', ') || "À définir"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      <Info label="Date" value={formatDate(row.activity_date)} />
      <Info label="Durée" value={`${row.duration_hours ?? 0}h`} />
      <Info label="Commentaire manager" value={row.manager_comment || "À contrôler"} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) { return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-600/60 dark:bg-slate-600/55"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={String(value ?? "Non renseigné")}>{value ?? "Non renseigné"}</p></div>; }

function ActionMenu({ row, onArchive }: { row: ModuleRow; onArchive: (row: ModuleRow) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative inline-flex"><button type="button" onClick={() => setOpen((current) => !current)} title="Actions" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"><MoreHorizontal className="h-4 w-4" /></button>{open && <div className="absolute right-0 top-9 z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-600 dark:bg-slate-700"><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/30"><Eye className="h-4 w-4" />Voir</button><button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/30"><Pencil className="h-4 w-4" />Modifier</button><button type="button" onClick={() => { setOpen(false); onArchive(row); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-600"><Archive className="h-4 w-4" />Archiver</button></div>}</div>;
}

function ChartsPanel({ moduleKey, rows, skillCatalog }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; skillCatalog: SkillCatalogItem[] }) {
  const statusData = groupBy(rows, (row: any) => statusLabel(moduleKey, row.status)).slice(0, 8);
  const departmentData = groupBy(rows, (row: any) => getDepartment(row)).slice(0, 10);
  const monthlyData = monthly(rows, (row: any) => row.activity_date || row.start_date || row.created_at || row.period_start);
  const managerData = groupBy(rows, (row: any) => row.manager_name).slice(0, 10);
  const skillModuleData = moduleKey === "skills" ? averageBy(rows as EmployeeSkill[], (row) => row.family, (row) => row.current_level).slice(0, 8) : [];
  const radarData = moduleKey === "skills" ? skillModuleData.map((item) => ({ name: item.name, value: item.value })) : averageBy(rows, (row: any) => getDepartment(row), (row: any) => moduleKey === "onboarding" ? Number(row.progress_percent ?? 0) : moduleKey === "reviews" ? Number(row.global_rating ?? 0) : Number(row.duration_hours ?? 0)).slice(0, 8);
  const catalogData = groupBy(skillCatalog, (skill) => skill.family).slice(0, 10);
  return <section className="space-y-5"><div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/75 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-sky-800/50 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Analyse décisionnelle</h2></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Les graphiques suivent le périmètre filtré et donnent une lecture complète des volumes, tendances, risques, managers, services et besoins de décision RH.</p></div><div className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-600/55 dark:text-indigo-300"><Users className="h-4 w-4" />{rows.length} ligne{rows.length > 1 ? "s" : ""}</div></div><div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Répartition par statut" description="Volumes par étape de workflow." data={statusData} kind="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={3}>{statusData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer></ChartCard><ChartCard title="Répartition par service" description="Concentration des sujets par service." data={departmentData} kind="bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={departmentData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="value" name="Volume" radius={[0, 8, 8, 0]} fill={chartColors[0]} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Évolution mensuelle" description="Tendance des créations et échéances sur 12 mois." data={monthlyData} kind="line"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="value" name="Volume" stroke={chartColors[1]} strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></ChartCard><ChartCard title="Charge par manager" description="Répartition des dossiers par responsable." data={managerData} kind="bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={managerData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" /><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="value" name="Dossiers" radius={[8, 8, 0, 0]} fill={chartColors[4]} /></BarChart></ResponsiveContainer></ChartCard>{moduleKey === "skills" && <><ChartCard title="Radar de compétences" description="Niveau moyen par module sur une échelle de 0 à 5." data={radarData} kind="radar"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid /><PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} /><Radar name="Niveau moyen" dataKey="value" stroke={chartColors[0]} fill={chartColors[1]} fillOpacity={0.24} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></ChartCard><ChartCard title="Bibliothèque par module" description="Nombre de compétences disponibles par module." data={catalogData} kind="bar"><ResponsiveContainer width="100%" height="100%"><BarChart data={catalogData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="value" name="Compétences" radius={[0, 8, 8, 0]} fill={chartColors[2]} /></BarChart></ResponsiveContainer></ChartCard></>}</div></section>;
}

function AlertsPanel({ moduleKey, rows }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[] }) {
  const actionNeeded = rows.filter((row: any) => ["submitted", "manager_approved", "to_develop", "delayed", "employee_input", "manager_input", "calibration"].includes(row.status) || row.gap > 0 || row.risk_level === "high").length;
  const completed = rows.filter((row: any) => ["approved", "completed", "validated"].includes(row.status)).length;
  const missingManager = rows.filter((row: any) => !row.manager_name).length;
  const missingDepartment = rows.filter((row: any) => !getDepartment(row) || getDepartment(row) === "Non renseigné").length;
  const archived = rows.filter((row: any) => row.archived_at || row.status === "archived").length;
  const quality = Math.round(100 - percentage(actionNeeded + missingManager + missingDepartment, Math.max(1, rows.length * 3)));
  return <SectionCard icon={Bell} title="Alertes qualité" description="Synthèse, alertes et recommandations consolidées sur le périmètre filtré."><div className="grid gap-4 xl:grid-cols-3"><DecisionPanel icon={Gauge} title="Synthèse" description="Lecture rapide de la qualité et des actions."><Insight title="Qualité globale" description={`Score estimé : ${quality} %. À contrôler selon complétude, statut et rattachement.`} level={quality >= 80 ? "success" : "info"} /><Insight title="Dossiers complets" description={`${completed} élément(s) sont terminés, validés ou exploitables en historique.`} level="success" /></DecisionPanel><DecisionPanel icon={AlertTriangle} title="Alertes" description="Points nécessitant une vérification ou action."><Insight title="Actions à traiter" description={`${actionNeeded} élément(s) nécessitent validation, complétion ou arbitrage.`} level={actionNeeded > 0 ? "warning" : "success"} /><Insight title="Rattachements incomplets" description={`${missingDepartment + missingManager} élément(s) sans service ou manager exploitable.`} level={missingDepartment + missingManager > 0 ? "warning" : "success"} /></DecisionPanel><DecisionPanel icon={Lightbulb} title="Recommandations" description="Actions suggérées pour améliorer le pilotage."><Insight title="Prioriser le périmètre critique" description="Traiter d’abord les éléments critiques, en retard ou bloquants pour la paie, le staffing, l’intégration ou la revue RH." level="info" /><Insight title="Conserver la traçabilité" description="Archiver via les menus trois points afin de préserver l’historique et les exports." level="success" /></DecisionPanel></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><AlertCard icon={ShieldAlert} title="Actions à traiter" value={actionNeeded} description="Risque : workflow bloqué. Action : valider, compléter ou arbitrer les éléments concernés." accent={actionNeeded > 0 ? "amber" : "emerald"} /><AlertCard icon={Users} title="Manager manquant" value={missingManager} description="Impact : validations et relances fragiles. Action : renseigner le manager responsable." accent={missingManager > 0 ? "amber" : "emerald"} /><AlertCard icon={BriefcaseBusiness} title="Service manquant" value={missingDepartment} description="Impact : reporting et filtres incomplets. Action : rattacher au bon service." accent={missingDepartment > 0 ? "rose" : "emerald"} /><AlertCard icon={CheckCircle2} title="Dossiers terminés" value={completed} description="Éléments exploitables en reporting, historique et export." accent="indigo" /><AlertCard icon={Archive} title="Archivés" value={archived} description="Éléments sortis du flux actif mais conservés pour traçabilité." accent="sky" /><AlertCard icon={Gauge} title="Score qualité" value={quality} description="Score estimé de complétude et fiabilité métier sur le périmètre filtré." accent={quality >= 80 ? "emerald" : "amber"} /></div></SectionCard>;
}

function DecisionPanel({ icon: Icon, title, description, children }: { icon: ComponentType<{ className?: string }>; title: string; description: string; children: ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-600/65"><div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200"><Icon className="h-4 w-4" /></div><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100" title={title}>{title}</h3><p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p></div></div></div><div className="space-y-3 p-4">{children}</div></section>; }
function Insight({ title, description, level }: { title: string; description: string; level: "info" | "warning" | "success" }) { const colors = level === "warning" ? "border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300" : level === "success" ? "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300" : "border-sky-100 bg-sky-50/60 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300"; return <article className={`rounded-xl border px-3.5 py-3 ${colors}`} title={`${title} — ${description}`}><p className="text-xs font-black text-slate-950 dark:text-slate-100">{title}</p><p className="mt-1 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{description}</p></article>; }
function AlertCard({ icon: Icon, title, value, description, accent }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; value: number; description: string; accent: Accent }) { const color = accent === "rose" ? "text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-900/40" : accent === "amber" ? "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40" : accent === "emerald" ? "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/40" : accent === "sky" ? "text-sky-700 bg-sky-100 dark:text-sky-200 dark:bg-sky-900/40" : "text-indigo-700 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-900/45"; return <article className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-3.5 py-3 shadow-sm dark:border-slate-600/70 dark:from-sky-900/20 dark:via-slate-700/85 dark:to-indigo-900/20" title={`${title} — ${description}`}><div className="flex items-start gap-3"><div className={`rounded-lg p-1.5 ${color}`}><Icon className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="min-h-[2rem] overflow-hidden text-xs font-black leading-4 text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-slate-100">{title}</h3><p className="shrink-0 text-xl font-black text-indigo-700 dark:text-indigo-300">{value}</p></div><p className="mt-1.5 min-h-[2rem] overflow-hidden text-[11px] leading-4 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-slate-200">{description}</p></div></div></article>; }

function LibraryPanel({ skillCatalog }: { skillCatalog: SkillCatalogItem[] }) {
  return <SectionCard icon={BookOpen} title="Bibliothèque de compétences" description="Référentiel structuré par module, sous-module, criticité et description métier."><div className="grid gap-4 xl:grid-cols-2">{skillCatalog.map((skill) => <article key={skill.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-700/65"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950 dark:text-slate-100">{skill.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{skill.family || "Module"} · {skill.category || "Sous-module"}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{skill.criticality || "standard"}</span></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{skill.description || "Description à compléter."}</p></article>)}</div></SectionCard>;
}

function buildExportColumns(moduleKey: HrTalentModuleKey): ExportColumn<ModuleRow>[] {
  return [
    { key: "id", label: "ID", value: (row: any) => row.id },
    { key: "organization_id", label: "Organisation", value: (row: any) => row.organization_id },
    { key: "employee", label: "Collaborateur", value: (row: any) => row.employee_name },
    { key: "employee_number", label: "Matricule", value: (row: any) => row.employee_number },
    { key: "department", label: "Service", value: (row: any) => getDepartment(row) },
    { key: "job", label: "Métier", value: (row: any) => getJob(row) },
    { key: "manager", label: "Manager", value: (row: any) => row.manager_name },
    { key: "status", label: "Statut", value: (row: any) => statusLabel(moduleKey, row.status) },
    { key: "title", label: "Objet", value: (row: any) => rowTitle(moduleKey, row) },
    { key: "description", label: "Description", value: (row: any) => rowDescription(moduleKey, row) },
    { key: "created_at", label: "Création", value: (row: any) => formatDate(row.created_at) },
    { key: "archived_at", label: "Archivage", value: (row: any) => formatDate(row.archived_at) },
  ];
}

function CreateModal({ moduleKey, data, isOpen, onClose, onCreated }: { moduleKey: HrTalentModuleKey; data: ModuleData; isOpen: boolean; onClose: () => void; onCreated: () => Promise<void> }) {
  const [employeeId, setEmployeeId] = useState(data.employees[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (!isOpen) return null;
  async function handleSave() {
    if (!employeeId && moduleKey !== "skills") return;
    setIsSaving(true);
    try {
      if (moduleKey === "time") await (supabase.from("hr_time_activity_entries" as never) as any).insert({ organization_id: data.organization.id, employee_id: employeeId, activity_date: new Date().toISOString().slice(0, 10), activity_type: "work", duration_hours: 7, status: "draft", description: title || "Nouvelle activité" });
      if (moduleKey === "skills") { const skillCode = title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 30) || `SKILL_${Date.now()}`; await (supabase.from("hr_skill_catalog" as never) as any).insert({ organization_id: data.organization.id, code: skillCode, name: title || "Nouvelle compétence", family: "ONEPILOT", category: "À classer", criticality: "important", description: "Compétence créée depuis l’interface RH." }); await (supabase.from("hr_skills" as never) as any).insert({ organization_id: data.organization.id, code: skillCode, name: title || "Nouvelle compétence", description: "Compétence créée depuis l’interface RH.", skill_type: "functional", is_active: true }); }
      if (moduleKey === "onboarding") await (supabase.from("hr_onboarding_plans" as never) as any).insert({ organization_id: data.organization.id, employee_id: employeeId, start_date: new Date().toISOString().slice(0, 10), target_end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10), status: "prepared", progress_percent: 0, risk_level: "normal", notes: title || "Nouveau parcours d’intégration" });
      if (moduleKey === "reviews") {
        const { data: cycle } = await (supabase.from("hr_review_cycles" as never) as any).insert({ organization_id: data.organization.id, name: title || `Campagne ${new Date().getFullYear()}`, review_type: "annual", period_start: `${new Date().getFullYear()}-01-01`, period_end: `${new Date().getFullYear()}-12-31`, status: "open" }).select("id").single();
        await (supabase.from("hr_review_items" as never) as any).insert({ organization_id: data.organization.id, cycle_id: cycle?.id, employee_id: employeeId, status: "not_started", objective_count: 0, completed_objective_count: 0 });
      }
      await onCreated();
      onClose();
    } finally { setIsSaving(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-700"><div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/20 dark:via-slate-700/85 dark:to-indigo-900/20"><div><h2 className="text-sm font-black text-slate-950 dark:text-slate-100">{getConfig(moduleKey).newLabel}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Création rapide. Les formulaires complets seront enrichis ensuite sur cette même base.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5">{moduleKey !== "skills" && <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={selectClassName}>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select>}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={moduleKey === "skills" ? "Nom de la compétence" : "Libellé / note"} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Annuler</button><button type="button" onClick={handleSave} disabled={isSaving} className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">Enregistrer</button></div></div></section></div>;
}

export default function HrTalentModulePage({ params, moduleKey }: { params: Promise<PageParams>; moduleKey: HrTalentModuleKey }) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();
  const config = getConfig(moduleKey);
  const [filters, setFilters] = useState<FiltersValue>(initialFilters);
  const [activeTab, setActiveTab] = useState<PageTab>("pilotage");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["hr-talent-module", moduleKey, orgId], queryFn: () => loadModuleData(orgId, moduleKey), enabled: Boolean(orgId) });
  const archiveMutation = useMutation({ mutationFn: async (row: ModuleRow) => { const table = moduleKey === "time" ? "hr_time_activity_entries" : moduleKey === "skills" ? "hr_employee_skills" : moduleKey === "onboarding" ? "hr_onboarding_plans" : "hr_review_items"; const { error } = await (supabase.from(table as never) as any).update({ archived_at: new Date().toISOString(), status: "archived" }).eq("id", (row as any).id); if (error) throw new Error(error.message); }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["hr-talent-module", moduleKey, orgId] }); } });
  const filteredRows = useMemo(() => data ? filterRows(moduleKey, data.rows, filters) : [], [data, moduleKey, filters]);
  const metrics = useMemo(() => data ? getMetrics(moduleKey, filteredRows, data.skillCatalog) : [], [data, filteredRows, moduleKey]);
  if (isLoading) return <div className="space-y-6"><PageHeader title={config.title} subtitle="Chargement des données RH." flush /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[106px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-600/60 dark:bg-slate-700/70" />)}</div></div>;
  if (error || !data) return <div className="space-y-6"><PageHeader title={config.title} subtitle={config.subtitle} flush /><div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30"><p className="text-sm text-red-700 dark:text-red-300">{error instanceof Error ? error.message : "Une erreur inconnue est survenue."}</p></div></div>;
  const PrimaryIcon = config.primaryIcon;
  return <><div className="space-y-6"><PageHeader title={config.title} subtitle={`${config.subtitle} Organisation : ${data.organization.name}.`} flush actions={<><button type="button" onClick={() => setHistoryOpen((current) => !current)} className="relative inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 text-xs font-bold text-sky-700 shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg dark:border-sky-900/60 dark:bg-slate-700/70 dark:text-sky-300 dark:shadow-none dark:hover:bg-sky-700/35"><Bell className="h-3.5 w-3.5" />Historique RH</button><DataExportMenu data={filteredRows} columns={buildExportColumns(moduleKey)} fileName={`${config.exportFile}_${data.organization.slug}`} sheetName={config.title} /><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"><Plus className="h-3.5 w-3.5" />{config.newLabel}</button></>} />
    <PageTutorial title={config.guideTitle} description={config.guideDescription} objectives={["Piloter uniquement des données Supabase réelles filtrées par organisation.", "Comparer le périmètre RH selon collaborateur, service, statut, module et besoin.", "Donner une lecture décisionnelle immédiate aux RH, managers, direction et PMO.", "Conserver la traçabilité via menus d’action, exports et archivage logique."]} steps={[{ title: "Définir le périmètre", description: "Utilise la recherche et les filtres en cascade pour isoler une population, un module ou un besoin." }, { title: "Analyser les KPI", description: "Les widgets reprennent la même structure que Ressources et suivent les filtres actifs." }, { title: "Exploiter les cartes et tableaux", description: "Consulte les éléments en cartes ou tableau sticky avec actions trois points." }, { title: "Décider avec les graphiques", description: "Les graphiques sont copiables en PNG et agrandissables pour comité ou PowerPoint." }]} analyses={[{ title: "Répartition", description: "Statuts, services, managers, modules et volumes." }, { title: "Tendance", description: "Évolution mensuelle sur les 12 derniers mois." }, { title: "Qualité", description: "Complétude, risques, retards et actions à traiter." }, { title: "Décision", description: "Priorisation des actions RH et arbitrages métiers." }]} recommendations={["Traiter d’abord les alertes rouges et amber.", "Utiliser les exports filtrés pour les comités RH/PMO.", "Archiver via le menu trois points plutôt que supprimer.", "Compléter les référentiels avant de massifier les données."]} />
    {historyOpen && <SectionCard icon={Bell} title="Historique RH" description="Événements locaux de consultation et futures actions auditées."><p className="text-sm text-slate-500 dark:text-slate-300">L’historique complet sera raccordé aux événements d’audit au fur et à mesure des workflows. Les actions de création et d’archivage sont déjà disponibles sur cette page.</p></SectionCard>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>
    <FiltersPanel moduleKey={moduleKey} rows={data.rows} skillCatalog={data.skillCatalog} employees={data.employees} value={filters} onChange={setFilters} resultCount={filteredRows.length} />
    <div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><TabButton active={activeTab === "pilotage"} accent="indigo" icon={PrimaryIcon} label={config.primaryTab} onClick={() => setActiveTab("pilotage")} /><TabButton active={activeTab === "graphs"} accent="emerald" icon={BarChart3} label="Graphiques" onClick={() => setActiveTab("graphs")} />{moduleKey === "skills" && <TabButton active={activeTab === "library"} accent="amber" icon={BookOpen} label="Bibliothèque" onClick={() => setActiveTab("library")} />}<TabButton active={activeTab === "alerts"} accent={moduleKey === "skills" ? "rose" : "amber"} icon={Bell} label="Alertes" onClick={() => setActiveTab("alerts")} /></div></div>
    {activeTab === "pilotage" && <WorkCardsAndTable moduleKey={moduleKey} rows={filteredRows} onArchive={(row) => archiveMutation.mutate(row)} />}
    {activeTab === "graphs" && <ChartsPanel moduleKey={moduleKey} rows={filteredRows} skillCatalog={data.skillCatalog} />}
    {activeTab === "library" && <LibraryPanel skillCatalog={data.skillCatalog.filter((skill) => filters.module === "all" || skill.family === filters.module).filter((skill) => filters.submodule === "all" || skill.category === filters.submodule)} />}
    {activeTab === "alerts" && <AlertsPanel moduleKey={moduleKey} rows={filteredRows} />}
  </div><CreateModal moduleKey={moduleKey} data={data} isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["hr-talent-module", moduleKey, orgId] }); }} /></>;
}
