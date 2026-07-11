"use client";

import { use, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
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

import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type HrTalentModuleKey = "time" | "skills" | "onboarding" | "reviews";
type PageParams = { orgId: string };
type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky";
type TabKey = "pilotage" | "graphs" | "library" | "alerts";

type Organization = { id: string; name: string; slug: string };
type EmployeeOption = {
  id: string;
  full_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  site_name: string | null;
  site_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  function_name: string | null;
  function_free_text: string | null;
  manager_name: string | null;
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
  level_expectations?: Record<string, string> | null;
  archived_at: string | null;
};
type SkillRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  site_name: string | null;
  site_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  function_name: string | null;
  function_free_text: string | null;
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
  project_context: string | null;
  last_self_assessment_at: string | null;
  status: string | null;
  archived_at: string | null;
};
type TimeRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  site_name: string | null;
  site_free_text: string | null;
  job_name: string | null;
  job_free_text: string | null;
  manager_name: string | null;
  activity_date: string | null;
  activity_type: string | null;
  duration_hours: number | null;
  status: string | null;
  description: string | null;
  manager_comment: string | null;
  archived_at: string | null;
};
type ChecklistItem = { owner: string; label: string; status: "OK" | "NOK" | "NA"; note?: string; due?: string };
type OnboardingRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  site_name: string | null;
  site_free_text: string | null;
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
  checklist_items: ChecklistItem[] | null;
  archived_at: string | null;
};
type ReviewDetails = {
  previous_year?: { objectives?: string; achievement?: number; highlights?: string };
  current_year?: { objectives?: string; priority?: string };
  training?: string[];
  employee_validation?: boolean;
  manager_validation?: boolean;
  development_plan?: string;
};
type ReviewRow = {
  id: string;
  organization_id: string;
  employee_id: string | null;
  employee_name: string | null;
  employee_number: string | null;
  department_name: string | null;
  department_free_text: string | null;
  site_name: string | null;
  site_free_text: string | null;
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
  review_details: ReviewDetails | null;
  archived_at: string | null;
};
type ModuleRow = SkillRow | TimeRow | OnboardingRow | ReviewRow;
type ModuleData = { organization: Organization; employees: EmployeeOption[]; rows: ModuleRow[]; skillCatalog: SkillCatalogItem[] };
type FilterValue = { search: string; status: string; department: string; resource: string; module: string; submodule: string; level: string; need: string };
type ChartData = { name: string; value: number };
type SkillResourceSummary = { employee: EmployeeOption; rows: SkillRow[]; topGaps: SkillRow[]; strongSkills: SkillRow[]; mentors: string[]; averageLevel: number; criticalGaps: number };

const initialFilters: FilterValue = { search: "", status: "all", department: "all", resource: "all", module: "all", submodule: "all", level: "all", need: "all" };
const chartColors = ["#a5b4fc", "#6ee7b7", "#fcd34d", "#fda4af", "#7dd3fc", "#c4b5fd", "#99f6e4", "#fecdd3"];
const levelLabels: Record<number, string> = { 0: "0 · Profane", 1: "1 · Sensibilisé", 2: "2 · Autonome encadré", 3: "3 · Confirmé", 4: "4 · Expert" };

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
function getDepartment(row: Partial<EmployeeOption>) { return row.department_free_text || row.department_name || "Non renseigné"; }
function getSite(row: Partial<EmployeeOption>) { return row.site_free_text || row.site_name || "Non renseigné"; }
function getJob(row: Partial<EmployeeOption>) { return row.job_free_text || row.job_name || row.function_free_text || row.function_name || "Non renseigné"; }
function fullName(row: Partial<EmployeeOption> & { employee_name?: string | null }) { return row.employee_name || row.full_name || "Collaborateur non renseigné"; }
function formatDate(value?: string | null) { if (!value) return "Non renseigné"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fr-FR").format(date); }
function percentage(part: number, total: number) { return total > 0 ? Math.round((part / total) * 100) : 0; }
function uniqueValues<T>(items: T[], resolver: (item: T) => string | null | undefined) { return Array.from(new Set(items.map(resolver).filter((value): value is string => Boolean(value?.trim())))).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })); }
function labelStatus(moduleKey: HrTalentModuleKey, status?: string | null) {
  const common: Record<string, string> = { archived: "Archivé", active: "Actif", approved: "Validé", submitted: "Soumis", rejected: "Refusé", draft: "Brouillon", to_develop: "À développer", validated: "Validé", prepared: "Préparé", in_progress: "En cours", delayed: "En retard", completed: "Terminé", not_started: "Non démarré", employee_input: "Saisie collaborateur", manager_input: "Saisie manager", calibration: "Calibration", manager_approved: "Validé manager" };
  return common[status || ""] || status || (moduleKey === "skills" ? "À évaluer" : "Non renseigné");
}
function getConfig(moduleKey: HrTalentModuleKey) {
  if (moduleKey === "time") return { title: "Temps & activités", subtitle: "Piloter les temps déclarés, validations manager, écarts de charge, activités projet et contribution interne.", newLabel: "Nouvelle activité", primaryTab: "Activités", icon: Clock3, exportFile: "rh_temps_activites", guideTitle: "Guide de la page", guideDescription: "Gérer et piloter les temps, activités, validations et écarts de capacité.\nLes données alimentent RH, PMO, finance, staffing et contrôle de charge." };
  if (moduleKey === "skills") return { title: "Compétences", subtitle: "Cartographier les compétences par ressource, module, sous-module, niveau attendu, expertise disponible et besoin projet.", newLabel: "Nouvelle compétence", primaryTab: "Ressources", icon: GraduationCap, exportFile: "rh_competences", guideTitle: "Guide de la page", guideDescription: "Gérer la matrice de compétences, les écarts et la bibliothèque de référence.\nIdentifier les experts, les accompagnements et les besoins de formation." };
  if (moduleKey === "onboarding") return { title: "Onboarding", subtitle: "Suivre les parcours d’intégration, checklists RH/manager/IT/qualité, risques et validations avant archivage.", newLabel: "Nouveau parcours", primaryTab: "Parcours", icon: ListChecks, exportFile: "rh_onboarding", guideTitle: "Guide de la page", guideDescription: "Piloter l’intégration de bout en bout avec une checklist contrôlable.\nSécuriser l’arrivée, les accès, les objectifs 30/60/90 jours et la validation RH/manager." };
  return { title: "Entretiens & objectifs", subtitle: "Suivre campagnes, objectifs, bilan annuel, formation, validations collaborateur/N+1 et plans de développement.", newLabel: "Nouvel entretien", primaryTab: "Entretiens", icon: Target, exportFile: "rh_entretiens_objectifs", guideTitle: "Guide de la page", guideDescription: "Piloter les entretiens annuels, objectifs et plans d’action individuels.\nConsolider l’atteinte, les besoins formation et la validation collaborateur/manager." };
}
async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (supabase.from("organizations" as never) as any).select("id, name, slug");
  const { data, error } = isUuid(slugOrId) ? await query.eq("id", slugOrId).maybeSingle() : await query.eq("slug", slugOrId).maybeSingle();
  if (error) throw new Error(`Impossible d’identifier l’organisation : ${error.message}`);
  if (!data?.id) throw new Error("L’organisation demandée est introuvable.");
  return data as Organization;
}
async function loadData(slugOrId: string, moduleKey: HrTalentModuleKey): Promise<ModuleData> {
  const organization = await resolveOrganization(slugOrId);
  const { data: employeesRaw, error: employeeError } = await (supabase.from("hr_employee_overview" as never) as any)
    .select("id, full_name, employee_number, department_name, department_free_text, site_name, site_free_text, job_name, job_free_text, function_name, function_free_text, manager_name")
    .eq("organization_id", organization.id)
    .order("full_name", { ascending: true });
  if (employeeError) throw new Error(`Impossible de charger les ressources : ${employeeError.message}`);
  const employees = (employeesRaw || []) as EmployeeOption[];
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const { data: catalogRaw, error: catalogError } = await (supabase.from("hr_skill_catalog" as never) as any)
    .select("id, organization_id, code, name, family, category, description, criticality, is_active, level_expectations, archived_at")
    .eq("organization_id", organization.id)
    .order("family", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (catalogError && moduleKey === "skills") throw new Error(`Impossible de charger la bibliothèque de compétences : ${catalogError.message}`);
  const skillCatalog = (catalogRaw || []) as SkillCatalogItem[];
  const skillMap = new Map(skillCatalog.map((skill) => [skill.id, skill]));
  let rawRows: any[] = [];
  if (moduleKey === "time") {
    const { data, error } = await (supabase.from("hr_time_activity_entries" as never) as any).select("*").eq("organization_id", organization.id).order("activity_date", { ascending: false });
    if (error) throw new Error(`Impossible de charger les temps : ${error.message}`);
    rawRows = data || [];
  } else if (moduleKey === "skills") {
    const { data, error } = await (supabase.from("hr_employee_skills" as never) as any).select("*").eq("organization_id", organization.id).order("updated_at", { ascending: false });
    if (error) throw new Error(`Impossible de charger les compétences : ${error.message}`);
    rawRows = data || [];
  } else if (moduleKey === "onboarding") {
    const { data, error } = await (supabase.from("hr_onboarding_plans" as never) as any).select("*").eq("organization_id", organization.id).order("start_date", { ascending: false });
    if (error) throw new Error(`Impossible de charger l’onboarding : ${error.message}`);
    rawRows = data || [];
  } else {
    const { data: cyclesRaw } = await (supabase.from("hr_review_cycles" as never) as any)
      .select("id, name, review_type, period_start, period_end")
      .eq("organization_id", organization.id);

    type ReviewCycleLookup = {
      id: string;
      name?: string | null;
      review_type?: string | null;
      period_start?: string | null;
      period_end?: string | null;
    };

    const cycleMap = new Map<string, ReviewCycleLookup>(
      ((cyclesRaw || []) as ReviewCycleLookup[]).map((cycle) => [cycle.id, cycle]),
    );

    const { data, error } = await (supabase.from("hr_review_items" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Impossible de charger les entretiens : ${error.message}`);

    rawRows = (data || []).map((row: any) => {
      const cycle = cycleMap.get(row.cycle_id || "");

      return {
        ...row,
        cycle_name: cycle?.name ?? null,
        review_type: cycle?.review_type ?? null,
        period_start: cycle?.period_start ?? null,
        period_end: cycle?.period_end ?? null,
      };
    });
  }
  const rows = rawRows.map((row) => {
    const employee = employeeMap.get(row.employee_id || "");
    const skill = skillMap.get(row.skill_id || "");
    return {
      ...row,
      employee_name: employee?.full_name ?? null,
      employee_number: employee?.employee_number ?? null,
      department_name: employee?.department_name ?? null,
      department_free_text: employee?.department_free_text ?? null,
      site_name: employee?.site_name ?? null,
      site_free_text: employee?.site_free_text ?? null,
      job_name: employee?.job_name ?? null,
      job_free_text: employee?.job_free_text ?? null,
      function_name: employee?.function_name ?? null,
      function_free_text: employee?.function_free_text ?? null,
      manager_name: employee?.manager_name ?? null,
      skill_name: skill?.name ?? row.skill_name ?? null,
      family: skill?.family ?? row.family ?? null,
      category: skill?.category ?? row.category ?? null,
      criticality: skill?.criticality ?? row.criticality ?? null,
      current_level: typeof row.current_level === "number" ? row.current_level : typeof row.level === "number" ? row.level : null,
      target_level: typeof row.target_level === "number" ? row.target_level : null,
      gap: Math.max(0, Number(row.target_level ?? row.level ?? 0) - Number(row.current_level ?? row.level ?? 0)),
    };
  }) as ModuleRow[];
  return { organization, employees, rows, skillCatalog };
}
function filterRows(moduleKey: HrTalentModuleKey, rows: ModuleRow[], filters: FilterValue) {
  return rows.filter((row: any) => {
    const haystack = [fullName(row), row.employee_number, getDepartment(row), getSite(row), getJob(row), row.status, row.skill_name, row.family, row.category, row.description, row.notes, row.cycle_name, row.project_context].filter(Boolean).join(" ").toLowerCase();
    if (filters.search.trim() && !haystack.includes(filters.search.trim().toLowerCase())) return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.department !== "all" && getDepartment(row) !== filters.department) return false;
    if (filters.resource !== "all" && row.employee_id !== filters.resource) return false;
    if (moduleKey === "skills") {
      if (filters.module !== "all" && row.family !== filters.module) return false;
      if (filters.submodule !== "all" && row.category !== filters.submodule) return false;
      if (filters.level !== "all" && Number(row.current_level ?? -1) !== Number(filters.level)) return false;
      if (filters.need === "gap" && Number(row.gap ?? 0) <= 0) return false;
      if (filters.need === "critical" && row.criticality !== "critical") return false;
      if (filters.need === "expert" && Number(row.current_level ?? 0) < 3) return false;
      if (filters.need === "project_gap" && !(Number(row.gap ?? 0) > 0 && row.project_context)) return false;
    }
    return true;
  });
}
function groupByValue(rows: ModuleRow[], resolver: (row: any) => string | null | undefined, fallback: string): ChartData[] {
  const map = new Map<string, number>();
  rows.forEach((row) => { const label = resolver(row)?.trim() || fallback; map.set(label, (map.get(label) || 0) + 1); });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
}
function monthly(rows: ModuleRow[], resolver: (row: any) => string | null | undefined): ChartData[] {
  const now = new Date();
  const months = Array.from({ length: 12 }).map((_, index) => { const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1); return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, name: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(date).replace(".", ""), value: 0 }; });
  const map = new Map(months.map((item) => [item.key, item]));
  rows.forEach((row) => { const value = resolver(row); const date = value ? new Date(value) : null; if (date && !Number.isNaN(date.getTime())) { const item = map.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`); if (item) item.value += 1; } });
  return months;
}
function buildSkillResourceSummaries(rows: ModuleRow[], employees: EmployeeOption[]): SkillResourceSummary[] {
  const skillRows = rows as SkillRow[];
  const byEmployee = new Map<string, SkillRow[]>();
  skillRows.forEach((row) => { if (row.employee_id) byEmployee.set(row.employee_id, [...(byEmployee.get(row.employee_id) || []), row]); });
  return employees.filter((employee) => byEmployee.has(employee.id)).map((employee) => {
    const employeeRows = byEmployee.get(employee.id) || [];
    const topGaps = [...employeeRows].filter((row) => row.gap > 0).sort((a, b) => (b.gap - a.gap) || ((b.criticality === "critical" ? 1 : 0) - (a.criticality === "critical" ? 1 : 0))).slice(0, 4);
    const strongSkills = employeeRows.filter((row) => Number(row.current_level || 0) >= 3).slice(0, 5);
    const mentorSet = new Set<string>();
    topGaps.forEach((gap) => {
      skillRows.filter((candidate) => candidate.skill_id === gap.skill_id && candidate.employee_id !== employee.id && Number(candidate.current_level || 0) >= 3).slice(0, 3).forEach((candidate) => mentorSet.add(candidate.employee_name || "Expert interne"));
    });
    const averageLevel = employeeRows.length ? Math.round((employeeRows.reduce((sum, row) => sum + Number(row.current_level || 0), 0) / employeeRows.length) * 10) / 10 : 0;
    return { employee, rows: employeeRows, topGaps, strongSkills, mentors: Array.from(mentorSet).slice(0, 4), averageLevel, criticalGaps: topGaps.filter((row) => row.criticality === "critical").length };
  });
}
function getMetrics(moduleKey: HrTalentModuleKey, rows: ModuleRow[], skillCatalog: SkillCatalogItem[]) {
  if (moduleKey === "skills") {
    const skillRows = rows as SkillRow[];
    return [
      { label: "Ressources évaluées", value: new Set(skillRows.map((row) => row.employee_id).filter(Boolean)).size, description: "Collaborateurs avec au moins une auto-évaluation ou évaluation compétence.", icon: Users, accent: "indigo" as Accent },
      { label: "Compétences suivies", value: skillCatalog.filter((skill) => !skill.archived_at).length, description: "Bibliothèque active organisée par modules et sous-modules.", icon: BookOpen, accent: "emerald" as Accent },
      { label: "Écarts critiques", value: skillRows.filter((row) => row.gap > 0 && row.criticality === "critical").length, description: "Écarts sur compétences critiques à traiter en priorité.", icon: AlertTriangle, accent: "amber" as Accent },
      { label: "Experts internes", value: skillRows.filter((row) => Number(row.current_level || 0) >= 3).length, description: "Ressources confirmées ou expertes mobilisables comme référents.", icon: GraduationCap, accent: "rose" as Accent },
    ];
  }
  if (moduleKey === "onboarding") {
    const onboarding = rows as OnboardingRow[];
    return [
      { label: "Parcours actifs", value: onboarding.filter((row) => !["completed", "archived"].includes(row.status || "")).length, description: "Intégrations à suivre dans le périmètre filtré.", icon: ListChecks, accent: "indigo" as Accent },
      { label: "Checklists OK", value: onboarding.filter((row) => getChecklistStats(row.checklist_items).nok === 0 && getChecklistStats(row.checklist_items).total > 0).length, description: "Parcours sans point NOK dans la checklist.", icon: CheckCircle2, accent: "emerald" as Accent },
      { label: "Points NOK", value: onboarding.reduce((sum, row) => sum + getChecklistStats(row.checklist_items).nok, 0), description: "Actions bloquantes RH, manager, IT ou qualité.", icon: AlertTriangle, accent: "amber" as Accent },
      { label: "Risques élevés", value: onboarding.filter((row) => row.risk_level === "high" || row.status === "delayed").length, description: "Parcours à arbitrer avant retard ou rupture d’intégration.", icon: ShieldAlert, accent: "rose" as Accent },
    ];
  }
  if (moduleKey === "reviews") {
    const reviews = rows as ReviewRow[];
    return [
      { label: "Entretiens", value: reviews.length, description: "Entretiens et objectifs dans le périmètre filtré.", icon: Target, accent: "indigo" as Accent },
      { label: "Validés", value: reviews.filter((row) => row.status === "completed").length, description: "Entretiens finalisés ou validés.", icon: CheckCircle2, accent: "emerald" as Accent },
      { label: "En cours", value: reviews.filter((row) => ["employee_input", "manager_input", "calibration"].includes(row.status || "")).length, description: "Entretiens nécessitant une action collaborateur, N+1 ou RH.", icon: CalendarClock, accent: "amber" as Accent },
      { label: "Objectifs en retard", value: reviews.filter((row) => Number(row.completed_objective_count || 0) < Number(row.objective_count || 0)).length, description: "Objectifs non atteints ou à recalibrer.", icon: AlertTriangle, accent: "rose" as Accent },
    ];
  }
  const time = rows as TimeRow[];
  return [
    { label: "Saisies", value: time.length, description: "Activités et temps déclarés dans le périmètre filtré.", icon: Clock3, accent: "indigo" as Accent },
    { label: "Heures", value: Math.round(time.reduce((sum, row) => sum + Number(row.duration_hours || 0), 0)), description: "Total des heures déclarées visibles.", icon: Gauge, accent: "emerald" as Accent },
    { label: "À valider", value: time.filter((row) => ["submitted", "manager_approved"].includes(row.status || "")).length, description: "Saisies en attente manager, RH ou finance.", icon: CalendarClock, accent: "amber" as Accent },
    { label: "Rejets", value: time.filter((row) => row.status === "rejected").length, description: "Saisies refusées ou à corriger.", icon: AlertTriangle, accent: "rose" as Accent },
  ];
}

const selectClassName = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40";
function MetricCard({ label, value, description, icon: Icon, accent }: { label: string; value: number; description: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; accent: Accent }) {
  const accentClasses = {
    indigo: { panel: "border-indigo-100 from-indigo-50/85 via-white to-sky-50/65 dark:border-indigo-900/50 dark:from-indigo-800/25 dark:via-slate-700/85 dark:to-emerald-700/20", icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200", value: "text-indigo-700 dark:text-indigo-300" },
    sky: { panel: "border-sky-100 from-sky-50/85 via-white to-cyan-50/65 dark:border-sky-900/50 dark:from-sky-800/25 dark:via-slate-700/85 dark:to-cyan-700/20", icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200", value: "text-sky-700 dark:text-sky-300" },
    emerald: { panel: "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-800/25 dark:via-slate-700/85 dark:to-teal-700/20", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200", value: "text-emerald-700 dark:text-emerald-300" },
    amber: { panel: "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-800/25 dark:via-slate-700/85 dark:to-orange-700/20", icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200", value: "text-amber-700 dark:text-amber-300" },
    rose: { panel: "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-800/25 dark:via-slate-700/85 dark:to-pink-700/20", icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200", value: "text-rose-700 dark:text-rose-300" },
  } as const;
  const classes = accentClasses[accent];
  return <article className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.panel}`}><div className="flex h-full items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}><Icon className="h-4 w-4" strokeWidth={1.9} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p><p className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}>{value}</p></div><p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-300">{description}</p></div></div></article>;
}
function SectionCard({ icon: Icon, title, description, children, right }: { icon: ComponentType<{ className?: string }>; title: string; description: string; children: ReactNode; right?: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200"><Icon className="h-4 w-4" /></div><div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-950 dark:text-white" title={title}>{title}</h2><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p></div></div>{right}</div></div><div className="p-5">{children}</div></section>;
}
function FiltersPanel({ moduleKey, rows, skillCatalog, employees, value, onChange, resultCount }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; skillCatalog: SkillCatalogItem[]; employees: EmployeeOption[]; value: FilterValue; onChange: (value: FilterValue) => void; resultCount: number }) {
  const departments = uniqueValues(rows, getDepartment);
  const statuses = uniqueValues(rows, (row: any) => row.status);
  const modules = uniqueValues(skillCatalog, (skill) => skill.family);
  const submodules = uniqueValues(skillCatalog.filter((skill) => value.module === "all" || skill.family === value.module), (skill) => skill.category);
  const hasFilters = value.search.trim() || value.status !== "all" || value.department !== "all" || value.resource !== "all" || value.module !== "all" || value.submodule !== "all" || value.level !== "all" || value.need !== "all";
  const update = <K extends keyof FilterValue>(field: K, fieldValue: FilterValue[K]) => onChange({ ...value, [field]: fieldValue, ...(field === "module" ? { submodule: "all" } : {}) });
  const reset = () => onChange(initialFilters);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200"><SlidersHorizontal className="h-4 w-4" /></div><div><h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Les filtres pilotent les KPI, les cartes, tableaux, graphiques, alertes et exports.</p></div></div><div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-700/80 dark:text-indigo-300">{resultCount} résultat{resultCount > 1 ? "s" : ""} sur {rows.length}</div></div></div><div className="space-y-4 p-5"><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input type="search" value={value.search} onChange={(event) => update("search", event.target.value)} placeholder="Rechercher ressource, compétence, module, projet, manager, statut..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:bg-slate-700 dark:focus:ring-indigo-900/40" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select value={value.status} onChange={(event) => update("status", event.target.value)} className={selectClassName}><option value="all">Tous les statuts</option>{statuses.map((status) => <option key={status} value={status}>{labelStatus(moduleKey, status)}</option>)}</select><select value={value.department} onChange={(event) => update("department", event.target.value)} className={selectClassName}><option value="all">Tous les services</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select><select value={value.resource} onChange={(event) => update("resource", event.target.value)} className={selectClassName}><option value="all">Toutes les ressources</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number || employee.id}</option>)}</select>{moduleKey === "skills" ? <select value={value.module} onChange={(event) => update("module", event.target.value)} className={selectClassName}><option value="all">Tous les modules</option>{modules.map((module) => <option key={module} value={module}>{module}</option>)}</select> : <select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}><option value="all">Tous les besoins</option><option value="gap">Action à traiter</option><option value="critical">Risque critique</option></select>}{moduleKey === "skills" && <><select value={value.submodule} onChange={(event) => update("submodule", event.target.value)} className={selectClassName}><option value="all">Tous les sous-modules</option>{submodules.map((submodule) => <option key={submodule} value={submodule}>{submodule}</option>)}</select><select value={value.level} onChange={(event) => update("level", event.target.value)} className={selectClassName}><option value="all">Tous les niveaux</option><option value="0">Niveau 0 · Profane</option><option value="1">Niveau 1 · Sensibilisé</option><option value="2">Niveau 2 · Autonome encadré</option><option value="3">Niveau 3 · Confirmé</option><option value="4">Niveau 4 · Expert</option></select><select value={value.need} onChange={(event) => update("need", event.target.value)} className={selectClassName}><option value="all">Tous les besoins</option><option value="gap">Écart cible / réel</option><option value="critical">Compétence critique</option><option value="expert">Experts disponibles</option><option value="project_gap">Écart sur besoin projet</option></select></>}</div>{hasFilters && <div className="flex justify-end"><button type="button" onClick={reset} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-600 dark:hover:text-white"><X className="h-4 w-4" />Réinitialiser les filtres</button></div>}</div></section>;
}
function TabButton({ active, accent, icon: Icon, label, onClick }: { active: boolean; accent: Accent; icon: ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  const colors = { indigo: active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/35 dark:hover:text-indigo-300", emerald: active ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/35 dark:hover:text-emerald-300", amber: active ? "bg-amber-500 text-white shadow-md shadow-amber-100" : "text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/35 dark:hover:text-amber-300", rose: active ? "bg-rose-600 text-white shadow-md shadow-rose-100" : "text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/35 dark:hover:text-rose-300", sky: active ? "bg-sky-600 text-white shadow-md shadow-sky-100" : "text-slate-500 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/35 dark:hover:text-sky-300" } as const;
  return <button type="button" onClick={onClick} className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${colors[accent]}`}><Icon className="h-4 w-4" />{label}</button>;
}
function Info({ label, value, accent = "indigo" }: { label: string; value: ReactNode; accent?: Accent }) { const color = accent === "emerald" ? "text-emerald-700 dark:text-emerald-300" : accent === "amber" ? "text-amber-700 dark:text-amber-300" : accent === "rose" ? "text-rose-700 dark:text-rose-300" : "text-indigo-700 dark:text-indigo-300"; return <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-600/60 dark:bg-slate-600/55"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 line-clamp-2 text-xs font-bold ${color}`} title={typeof value === "string" ? value : undefined}>{value}</p></div>; }
function ActionMenu({ onArchive }: { onArchive: () => void }) { const [open, setOpen] = useState(false); return <div className="relative"><button type="button" onClick={() => setOpen(!open)} title="Actions" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-600"><MoreHorizontal className="h-4 w-4" /></button>{open && <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-xs font-bold shadow-xl dark:border-slate-600 dark:bg-slate-700"><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-900/25"><Eye className="h-3.5 w-3.5" />Voir</button><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/25"><Pencil className="h-3.5 w-3.5" />Modifier</button><button type="button" onClick={onArchive} className="flex w-full items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-600"><Archive className="h-3.5 w-3.5" />Archiver</button></div>}</div>; }
function WorkCardsAndTable({ moduleKey, rows, employees, onArchive }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; employees: EmployeeOption[]; onArchive: (row: ModuleRow) => void }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const summaries = moduleKey === "skills" ? buildSkillResourceSummaries(rows, employees) : [];
  return <SectionCard icon={moduleKey === "skills" ? GraduationCap : moduleKey === "time" ? Clock3 : moduleKey === "onboarding" ? ListChecks : Target} title={getConfig(moduleKey).primaryTab} description="Cartes et tableau utilisent le périmètre filtré, les mêmes actions et les mêmes données Supabase." right={<div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600/60 dark:bg-slate-700/70"><button type="button" onClick={() => setView("cards")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`h-8 rounded-lg px-3 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-indigo-50"}`}>Tableau</button></div>}>
    {moduleKey === "skills" && view === "cards" && <div className="grid gap-4 xl:grid-cols-2">{summaries.map((summary) => <SkillResourceCard key={summary.employee.id} summary={summary} onArchive={() => summary.rows[0] && onArchive(summary.rows[0])} />)}</div>}
    {moduleKey === "skills" && view === "table" && <SkillResourceTable rows={rows as SkillRow[]} onArchive={onArchive} />}
    {moduleKey !== "skills" && view === "cards" && <div className="grid gap-4 xl:grid-cols-2">{rows.map((row: any) => <GenericCard key={row.id} moduleKey={moduleKey} row={row} onArchive={() => onArchive(row)} />)}</div>}
    {moduleKey !== "skills" && view === "table" && <GenericTable moduleKey={moduleKey} rows={rows} onArchive={onArchive} />}
  </SectionCard>;
}
function SkillResourceCard({ summary, onArchive }: { summary: SkillResourceSummary; onArchive: () => void }) { return <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-700/65"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{summary.employee.full_name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{getDepartment(summary.employee)} · {getJob(summary.employee)} · niveau moyen {summary.averageLevel}/4</p></div><ActionMenu onArchive={onArchive} /></div><div className="mt-4 grid gap-2 sm:grid-cols-4"><Info label="Compétences" value={summary.rows.length} /><Info label="Écarts" value={summary.topGaps.length} accent={summary.topGaps.length > 0 ? "amber" : "emerald"} /><Info label="Critiques" value={summary.criticalGaps} accent={summary.criticalGaps > 0 ? "rose" : "emerald"} /><Info label="Experts relais" value={summary.mentors.length} accent="indigo" /></div><div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-600/60 dark:bg-slate-600/55"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Écarts à traiter</p><div className="mt-2 space-y-1.5">{summary.topGaps.length > 0 ? summary.topGaps.map((gap) => <div key={gap.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px] dark:bg-slate-700/70"><span className="truncate text-slate-600 dark:text-slate-200" title={`${gap.family} / ${gap.category} · ${gap.skill_name}`}>{gap.family} / {gap.category} · {gap.skill_name}</span><span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-black text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">{gap.current_level ?? 0}→{gap.target_level ?? 0}</span></div>) : <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Aucun écart prioritaire détecté.</p>}</div></div><div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-900/20"><p className="text-[10px] font-black uppercase tracking-wide text-indigo-500">Accompagnement possible</p><p className="mt-1 line-clamp-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">{summary.mentors.length > 0 ? summary.mentors.join(" · ") : "Aucun expert interne identifié sur les écarts filtrés."}</p></div></article>; }
function SkillResourceTable({ rows, onArchive }: { rows: SkillRow[]; onArchive: (row: ModuleRow) => void }) { return <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70"><table className="min-w-[1280px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65"><thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300"><tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Ressource</th><th className="px-4 py-3 text-left">Module</th><th className="px-4 py-3 text-left">Sous-module</th><th className="px-4 py-3 text-left">Compétence</th><th className="px-4 py-3 text-left">Niveau</th><th className="px-4 py-3 text-left">Cible</th><th className="px-4 py-3 text-left">Besoin projet</th><th className="px-4 py-3 text-left">Preuve</th><th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{fullName(row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.family || "—"}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.category || "—"}</td><td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{row.skill_name || "—"}</td><td className="px-4 py-3">{levelLabels[Number(row.current_level ?? 0)]}</td><td className="px-4 py-3">{levelLabels[Number(row.target_level ?? 0)]}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.project_context || "—"}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.evidence || "—"}</td><td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu onArchive={() => onArchive(row)} /></td></tr>)}</tbody></table></div>; }
function GenericCard({ moduleKey, row, onArchive }: { moduleKey: HrTalentModuleKey; row: any; onArchive: () => void }) { const title = moduleKey === "time" ? `${fullName(row)} · ${formatDate(row.activity_date)}` : moduleKey === "onboarding" ? `Parcours ${fullName(row)}` : row.cycle_name || `Entretien ${fullName(row)}`; return <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-600/70 dark:bg-slate-700/65"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{getDepartment(row)} · {getJob(row)} · {labelStatus(moduleKey, row.status)}</p></div><ActionMenu onArchive={onArchive} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Info label="Collaborateur" value={fullName(row)} /><Info label="Manager" value={row.manager_name || "Non renseigné"} /><Info label="Service" value={getDepartment(row)} /><Info label="Statut" value={labelStatus(moduleKey, row.status)} /></div>{moduleKey === "onboarding" && <OnboardingChecklist row={row as OnboardingRow} />}{moduleKey === "reviews" && <ReviewTemplate row={row as ReviewRow} />}{moduleKey === "time" && <div className="mt-4 grid gap-2 sm:grid-cols-3"><Info label="Date" value={formatDate(row.activity_date)} /><Info label="Durée" value={`${row.duration_hours || 0} h`} accent="emerald" /><Info label="Activité" value={row.activity_type || "—"} /></div>}</article>; }
function GenericTable({ moduleKey, rows, onArchive }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; onArchive: (row: ModuleRow) => void }) { return <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70"><table className="min-w-[1120px] w-full border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700/65"><thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-700 dark:text-slate-300"><tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left dark:bg-slate-700">Objet</th><th className="px-4 py-3 text-left">Collaborateur</th><th className="px-4 py-3 text-left">Service</th><th className="px-4 py-3 text-left">Manager</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-left">Détail métier</th><th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right dark:bg-slate-700">Actions</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-slate-950 dark:bg-slate-700 dark:text-slate-100">{moduleKey === "onboarding" ? `Parcours ${fullName(row)}` : moduleKey === "reviews" ? row.cycle_name || `Entretien ${fullName(row)}` : `${formatDate(row.activity_date)} · ${row.activity_type || "activité"}`}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fullName(row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{getDepartment(row)}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.manager_name || "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300">{labelStatus(moduleKey, row.status)}</span></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{moduleKey === "onboarding" ? `${getChecklistStats(row.checklist_items).ok}/${getChecklistStats(row.checklist_items).total} OK · risque ${row.risk_level || "normal"}` : moduleKey === "reviews" ? `${row.completed_objective_count || 0}/${row.objective_count || 0} objectifs · note ${row.global_rating || "—"}/5` : `${row.duration_hours || 0}h · ${row.description || "—"}`}</td><td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><ActionMenu onArchive={() => onArchive(row)} /></td></tr>)}</tbody></table></div>; }
function getChecklistStats(items: ChecklistItem[] | null | undefined) { const list = Array.isArray(items) ? items : []; return { total: list.length, ok: list.filter((item) => item.status === "OK").length, nok: list.filter((item) => item.status === "NOK").length, na: list.filter((item) => item.status === "NA").length }; }
function OnboardingChecklist({ row }: { row: OnboardingRow }) { const stats = getChecklistStats(row.checklist_items); return <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-600/60 dark:bg-slate-600/55"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-slate-950 dark:text-slate-100">Checklist détaillée RH / Manager / IT / Qualité</p><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">{stats.ok}/{stats.total} OK</span></div><div className="grid gap-2 sm:grid-cols-3"><Info label="OK" value={stats.ok} accent="emerald" /><Info label="NOK" value={stats.nok} accent={stats.nok > 0 ? "rose" : "emerald"} /><Info label="NA" value={stats.na} accent="indigo" /></div><div className="space-y-1.5">{(row.checklist_items || []).map((item) => <div key={`${item.owner}-${item.label}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-1.5 text-[11px] dark:bg-slate-700/70"><span className="truncate text-slate-600 dark:text-slate-200" title={`${item.owner} · ${item.label} · ${item.note || ""}`}>{item.owner} · {item.label}</span><span className={`shrink-0 rounded-full px-2 py-0.5 font-black ${item.status === "OK" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : item.status === "NOK" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"}`}>{item.status}</span></div>)}</div></div>; }
function ReviewTemplate({ row }: { row: ReviewRow }) { const details = row.review_details; return <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-600/60 dark:bg-slate-600/55"><p className="text-xs font-black text-slate-950 dark:text-slate-100">Template entretien annuel & objectifs</p><div className="grid gap-2 sm:grid-cols-2"><Info label="Atteinte N-1" value={details?.previous_year?.achievement !== undefined ? `${details.previous_year.achievement}%` : "Non renseigné"} accent="emerald" /><Info label="Objectifs en cours" value={`${row.completed_objective_count || 0}/${row.objective_count || 0}`} accent="amber" /><Info label="Validation collaborateur" value={details?.employee_validation ? "OK" : "NOK"} accent={details?.employee_validation ? "emerald" : "rose"} /><Info label="Validation N+1" value={details?.manager_validation ? "OK" : "NOK"} accent={details?.manager_validation ? "emerald" : "rose"} /></div><Info label="Bilan année écoulée" value={details?.previous_year?.objectives || "À compléter"} /><Info label="Objectifs année en cours" value={details?.current_year?.objectives || "À définir"} /><Info label="Formation / développement" value={details?.training?.join(" · ") || details?.development_plan || "À définir"} accent="indigo" /></div>; }
function LibraryPanel({ skillCatalog }: { skillCatalog: SkillCatalogItem[] }) { return <SectionCard icon={BookOpen} title="Bibliothèque de compétences" description="Référentiel complet par module, sous-module, criticité et attendus niveau 0 à 4."><div className="grid gap-4 xl:grid-cols-2">{skillCatalog.map((skill) => <article key={skill.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600/70 dark:bg-slate-700/65"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950 dark:text-slate-100">{skill.name}</h3><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">{skill.family} · {skill.category}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${skill.criticality === "critical" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : skill.criticality === "important" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"}`}>{skill.criticality || "standard"}</span></div><p className="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{skill.description}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{[0,1,2,3,4].map((level) => <Info key={level} label={levelLabels[level]} value={skill.level_expectations?.[String(level)] || "Attendu à formaliser"} accent={level >= 3 ? "emerald" : level === 2 ? "amber" : "indigo"} />)}</div></article>)}</div></SectionCard>; }
async function copyChartCanvas(title: string, description: string, data: ChartData[]) { const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 720; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,1200,720); ctx.fillStyle = "#f8fafc"; ctx.roundRect(28,24,1144,672,28); ctx.fill(); ctx.strokeStyle = "#bae6fd"; ctx.stroke(); ctx.fillStyle = "#0f172a"; ctx.font = "800 28px Arial"; ctx.fillText(title, 72, 72); ctx.fillStyle = "#64748b"; ctx.font = "14px Arial"; ctx.fillText(description.slice(0, 130), 72, 100); const max = Math.max(1, ...data.map((item) => item.value)); const left=90, top=150, width=980, height=390; ctx.strokeStyle = "#cbd5e1"; ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top+height); ctx.lineTo(left+width, top+height); ctx.stroke(); const barW = Math.max(28, Math.min(72, width / Math.max(1, data.length) * .55)); data.slice(0,10).forEach((item, index) => { const x = left + (width / Math.max(1, data.length)) * index + 20; const h = (item.value / max) * height; ctx.fillStyle = chartColors[index % chartColors.length]; ctx.roundRect(x, top + height - h, barW, h, 10); ctx.fill(); ctx.fillStyle = "#334155"; ctx.font = "bold 13px Arial"; ctx.fillText(String(item.value), x, top + height - h - 8); ctx.font = "12px Arial"; ctx.fillText(item.name.slice(0,18), x, top + height + 24); }); const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1)); if (!blob) return; try { if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); return; } } catch {} const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`${title.toLowerCase().replace(/[^a-z0-9]+/gi,"-")}.png`; a.click(); URL.revokeObjectURL(url); }
function ChartCard({ title, description, data, children }: { title: string; description: string; data: ChartData[]; children: ReactNode }) { const [status, setStatus] = useState(""); return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-950 dark:text-slate-100">{title}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">{description}</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-[10px] font-bold text-slate-400">{status}</span><button type="button" onClick={async()=>{ setStatus("..."); await copyChartCanvas(title, description, data); setStatus("Copié/PNG"); }} title="Copier" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200"><Copy className="h-4 w-4" /></button><button type="button" onClick={(event)=>event.currentTarget.closest('article')?.requestFullscreen?.()} title="Agrandir" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200"><Expand className="h-4 w-4" /></button></div></div><div className="h-80 p-4">{children}</div></article>; }
function ChartsPanel({ moduleKey, rows, skillCatalog }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[]; skillCatalog: SkillCatalogItem[] }) { const statusData = groupByValue(rows, (row:any)=>labelStatus(moduleKey,row.status), "Non renseigné"); const departmentData = groupByValue(rows, getDepartment, "Sans service"); const monthlyData = monthly(rows, (row:any)=> moduleKey === "onboarding" ? row.start_date : moduleKey === "reviews" ? row.period_start : row.activity_date); const moduleData = moduleKey === "skills" ? groupByValue(rows, (row:any)=>row.family, "Sans module") : departmentData; const radarData = moduleKey === "skills" ? uniqueValues(skillCatalog, (s)=>s.family).slice(0,8).map((module)=>({ name: module, value: Math.round(((rows as SkillRow[]).filter((row)=>row.family===module).reduce((sum,row)=>sum+Number(row.current_level||0),0)/Math.max(1,(rows as SkillRow[]).filter((row)=>row.family===module).length))*20) })) : groupByValue(rows, (row:any)=>row.status, "Statut").map((item)=>({ name:item.name, value:item.value })); return <section className="space-y-6"><div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-indigo-50/75 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-sky-800/50 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /><h2 className="text-lg font-black text-slate-950 dark:text-slate-100">Analyse décisionnelle</h2></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Lecture RH filtrée pour décider, prioriser, accompagner et préparer les comités.</p></div><div className="whitespace-nowrap rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-700/80 dark:text-indigo-300">{rows.length} lignes</div></div><div className="grid gap-5 xl:grid-cols-2"><ChartCard title="Répartition par statut" description="Volumes par statut métier." data={statusData}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>{statusData.map((item,index)=><Cell key={item.name} fill={chartColors[index%chartColors.length]} />)}</Pie><Tooltip/><Legend verticalAlign="bottom"/></PieChart></ResponsiveContainer></ChartCard><ChartCard title={moduleKey === "skills" ? "Radar compétences par module" : "Répartition par service"} description="Lecture décisionnelle par périmètre." data={moduleKey === "skills" ? radarData : departmentData}>{moduleKey === "skills" ? <ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid/><PolarAngleAxis dataKey="name" tick={{fontSize:11}}/><PolarRadiusAxis domain={[0,100]}/><Radar dataKey="value" name="Niveau moyen" stroke={chartColors[0]} fill={chartColors[1]} fillOpacity={0.25}/><Tooltip/><Legend/></RadarChart></ResponsiveContainer> : <ResponsiveContainer width="100%" height="100%"><BarChart data={departmentData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={140}/><Tooltip/><Legend/><Bar dataKey="value" name="Volume" fill={chartColors[0]} radius={[0,8,8,0]}/></BarChart></ResponsiveContainer>}</ChartCard><ChartCard title="Évolution mensuelle" description="Tendance sur les 12 derniers mois." data={monthlyData}><ResponsiveContainer width="100%" height="100%"><LineChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="value" name="Volume" stroke={chartColors[1]} strokeWidth={3}/></LineChart></ResponsiveContainer></ChartCard><ChartCard title={moduleKey === "skills" ? "Couverture par module" : "Volumes par catégorie"} description="Top périmètres à piloter." data={moduleData}><ResponsiveContainer width="100%" height="100%"><BarChart data={moduleData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:11}} interval={0} angle={-20} textAnchor="end" height={70}/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="value" name="Volume" fill={chartColors[2]} radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></ChartCard></div></section>; }
function Insight({ title, description, level }: { title: string; description: string; level: "success" | "warning" | "info" }) { const style = level === "success" ? { c:"border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-900/20", i:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200", b:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200", l:"OK", Icon:CheckCircle2 } : level === "warning" ? { c:"border-rose-100 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-900/20", i:"bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200", b:"bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200", l:"NOK", Icon:AlertTriangle } : { c:"border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-900/20", i:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200", b:"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200", l:"Info", Icon:ShieldAlert }; const Icon=style.Icon; return <article className={`rounded-xl border px-3.5 py-3 ${style.c}`} title={`${title} — ${description}`}><div className="flex items-start gap-3"><div className={`rounded-lg p-1.5 ${style.i}`}><Icon className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h4 className="line-clamp-2 text-xs font-black leading-snug text-slate-950 dark:text-slate-100">{title}</h4><span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${style.b}`}>{style.l}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-600 dark:text-slate-300">{description}</p></div></div></article>; }
function DecisionPanel({ icon: Icon, title, description, children }: { icon: ComponentType<{ className?: string }>; title: string; description: string; children: ReactNode }) { return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200"><Icon className="h-4 w-4" /></div><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-slate-100">{title}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">{description}</p></div></div></div><div className="space-y-3 p-4">{children}</div></section>; }
function AlertMetric({ icon: Icon, title, value, description, accent }: { icon: ComponentType<{className?:string}>; title:string; value:number; description:string; accent:Accent }) { return <MetricCard label={title} value={value} description={description} icon={Icon} accent={accent} />; }
function AlertsPanel({ moduleKey, rows }: { moduleKey: HrTalentModuleKey; rows: ModuleRow[] }) { const actionNeeded = rows.filter((row:any)=>["submitted","manager_approved","to_develop","delayed","employee_input","manager_input","calibration"].includes(row.status)||row.gap>0||row.risk_level==="high").length; const ok = rows.filter((row:any)=>["approved","validated","completed"].includes(row.status)).length; const nok = rows.filter((row:any)=>row.status==="rejected"||row.risk_level==="high"||row.gap>1).length; const missingManager = rows.filter((row:any)=>!row.manager_name).length; const quality = percentage(Math.max(0, rows.length-actionNeeded-missingManager), Math.max(1, rows.length)); return <SectionCard icon={Bell} title="Alertes qualité" description="Synthèse, alertes et recommandations consolidées sur le périmètre filtré."><div className="grid gap-4 xl:grid-cols-3"><DecisionPanel icon={Gauge} title="Synthèse" description="Lecture rapide de la qualité et des actions."><Insight title="Qualité globale" description={`Score estimé : ${quality} %. À contrôler selon complétude, statut, rattachement et données métier.`} level={quality>=80?"success":"info"}/><Insight title="Dossiers exploitables" description={`${ok} élément(s) validés, terminés ou exploitables en reporting.`} level="success"/></DecisionPanel><DecisionPanel icon={AlertTriangle} title="Alertes" description="Points nécessitant une vérification ou action."><Insight title="Actions à traiter" description={`${actionNeeded} élément(s) nécessitent validation, complétion, formation ou arbitrage.`} level={actionNeeded>0?"warning":"success"}/><Insight title="Rattachements incomplets" description={`${missingManager} élément(s) sans manager exploitable pour validation ou accompagnement.`} level={missingManager>0?"warning":"success"}/></DecisionPanel><DecisionPanel icon={Lightbulb} title="Recommandations" description="Actions suggérées pour améliorer le pilotage."><Insight title="Prioriser les écarts critiques" description="Traiter d’abord les niveaux insuffisants, checklists NOK, objectifs non validés et saisies en attente." level="info"/><Insight title="Capitaliser dans les entretiens" description="Relier compétences, projets, formation et objectifs annuels pour bâtir le plan de développement." level="success"/></DecisionPanel></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><AlertMetric icon={ShieldAlert} title="Actions à traiter" value={actionNeeded} description="Risque opérationnel ou RH à arbitrer." accent={actionNeeded>0?"amber":"emerald"}/><AlertMetric icon={CheckCircle2} title="OK" value={ok} description="Éléments validés ou exploitables." accent="emerald"/><AlertMetric icon={AlertTriangle} title="NOK" value={nok} description="Éléments bloquants ou insuffisants." accent={nok>0?"rose":"emerald"}/><AlertMetric icon={Users} title="Manager manquant" value={missingManager} description="Validation ou accompagnement fragilisé." accent={missingManager>0?"rose":"emerald"}/><AlertMetric icon={Gauge} title="Score qualité" value={quality} description="Score global du périmètre filtré." accent={quality>=80?"emerald":"amber"}/><AlertMetric icon={Archive} title="Archivables" value={ok} description="Éléments pouvant être archivés après contrôle." accent="sky"/></div></SectionCard>; }
function buildExportColumns(moduleKey: HrTalentModuleKey): ExportColumn<any>[] {
  function column(key: string, label: string): ExportColumn<any> {
    return {
      key,
      label,
      value: (row: any) => {
        const value = row?.[key];

        if (value === null || value === undefined) {
          return "";
        }

        if (typeof value === "object") {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }

        return value;
      },
    };
  }

  const base: ExportColumn<any>[] = [
    column("id", "ID"),
    column("employee_name", "Collaborateur"),
    column("employee_number", "Matricule"),
    column("department_name", "Service référentiel"),
    column("department_free_text", "Service libre"),
    column("manager_name", "Manager"),
    column("status", "Statut"),
    column("archived_at", "Archivé le"),
  ];

  if (moduleKey === "skills") {
    return [
      ...base,
      column("family", "Module"),
      column("category", "Sous-module"),
      column("skill_name", "Compétence"),
      column("current_level", "Niveau actuel"),
      column("target_level", "Niveau cible"),
      column("gap", "Écart"),
      column("criticality", "Criticité"),
      column("project_context", "Besoin projet"),
      column("evidence", "Preuve"),
    ];
  }

  if (moduleKey === "onboarding") {
    return [
      ...base,
      column("start_date", "Début"),
      column("target_end_date", "Fin cible"),
      column("progress_percent", "Progression"),
      column("risk_level", "Risque"),
      column("notes", "Notes"),
      column("checklist_items", "Checklist"),
    ];
  }

  if (moduleKey === "reviews") {
    return [
      ...base,
      column("cycle_name", "Campagne"),
      column("objective_count", "Objectifs"),
      column("completed_objective_count", "Objectifs atteints"),
      column("global_rating", "Note"),
      column("employee_comment", "Commentaire collaborateur"),
      column("manager_comment", "Commentaire manager"),
      column("review_details", "Détail entretien"),
    ];
  }

  return [
    ...base,
    column("activity_date", "Date"),
    column("activity_type", "Type activité"),
    column("duration_hours", "Durée"),
    column("description", "Description"),
    column("manager_comment", "Commentaire manager"),
  ];
}
function CreateModal({ moduleKey, data, isOpen, onClose, onCreated }: { moduleKey: HrTalentModuleKey; data: ModuleData; isOpen: boolean; onClose: () => void; onCreated: () => Promise<void> }) { const [employeeId,setEmployeeId]=useState(data.employees[0]?.id||""); const [title,setTitle]=useState(""); const [saving,setSaving]=useState(false); if(!isOpen) return null; async function save(){ setSaving(true); try{ const employee=data.employees.find((item)=>item.id===employeeId); if(moduleKey==="time") { const {error}=await (supabase.from("hr_time_activity_entries" as never) as any).insert({organization_id:data.organization.id, employee_id:employeeId, activity_date:new Date().toISOString().slice(0,10), activity_type:"project_delivery", duration_hours:7.5, status:"draft", description:title||"Nouvelle activité projet", manager_comment:"À contrôler par le manager."}); if(error) throw error; } if(moduleKey==="skills") { const code=(title||"Nouvelle compétence").toUpperCase().replace(/[^A-Z0-9]+/g,"_").slice(0,40); const {data:skill,error}=await (supabase.from("hr_skill_catalog" as never) as any).insert({organization_id:data.organization.id, code, name:title||"Nouvelle compétence", family:"Module à classer", category:"Sous-module à classer", criticality:"important", description:"Compétence créée depuis l’interface RH.", is_active:true}).select("id").single(); if(error) throw error; await (supabase.from("hr_skills" as never) as any).insert({id:skill.id, organization_id:data.organization.id, code, name:title||"Nouvelle compétence", skill_type:"functional", description:"Compétence synchronisée RH/staffing.", is_active:true}); } if(moduleKey==="onboarding") { const checklist=defaultChecklist(); const {error}=await (supabase.from("hr_onboarding_plans" as never) as any).insert({organization_id:data.organization.id, employee_id:employeeId, manager_employee_id:null, start_date:new Date().toISOString().slice(0,10), target_end_date:new Date(Date.now()+45*86400000).toISOString().slice(0,10), status:"prepared", progress_percent:0, risk_level:"normal", notes:title||"Nouveau parcours d’intégration", checklist_items:checklist}); if(error) throw error; } if(moduleKey==="reviews") { const {data:cycle,error:cycleError}=await (supabase.from("hr_review_cycles" as never) as any).insert({organization_id:data.organization.id, name:title||`Campagne ${new Date().getFullYear()}`, review_type:"annual", period_start:`${new Date().getFullYear()}-01-01`, period_end:`${new Date().getFullYear()}-12-31`, status:"open"}).select("id").single(); if(cycleError) throw cycleError; const {error}=await (supabase.from("hr_review_items" as never) as any).insert({organization_id:data.organization.id, cycle_id:cycle.id, employee_id:employeeId, status:"not_started", objective_count:4, completed_objective_count:0, global_rating:null, employee_comment:"Auto-évaluation à compléter.", manager_comment:"Évaluation manager à compléter.", review_details:defaultReviewDetails(employee?.full_name||"")}); if(error) throw error; } await onCreated(); setTitle(""); onClose(); } finally { setSaving(false); } } return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-700"><div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/20 dark:via-slate-700/85 dark:to-indigo-900/20"><div><h2 className="text-sm font-black text-slate-950 dark:text-slate-100">{getConfig(moduleKey).newLabel}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Création rapide avec données métier exploitables immédiatement.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5">{moduleKey!=="skills"&&<select value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} className={selectClassName}>{data.employees.map((e)=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select>}<input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder={moduleKey==="skills"?"Nom de la compétence":"Libellé / contexte"} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"/><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Annuler</button><button type="button" onClick={save} disabled={saving} className="h-9 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">Enregistrer</button></div></div></section></div>; }
function defaultChecklist(): ChecklistItem[] { return [ {owner:"RH",label:"Contrat signé et dossier administratif complet",status:"NOK",note:"Contrat, RIB, urgence, justificatifs."}, {owner:"RH",label:"Documents RH et règlement intérieur remis",status:"NOK",note:"Traçabilité documentaire."}, {owner:"Manager",label:"Objectifs 30/60/90 jours définis",status:"NOK",note:"Critères de réussite."}, {owner:"Manager",label:"Parrain / référent identifié",status:"NA",note:"Accompagnement proximité."}, {owner:"IT",label:"Compte, matériel et accès applicatifs prêts",status:"NOK",note:"PC, mail, SSO, outils."}, {owner:"Qualité",label:"Sensibilisation qualité / sécurité réalisée",status:"NOK",note:"ISO 9001, confidentialité, risques."}, {owner:"Collaborateur",label:"Rapport d’étonnement prévu",status:"NA",note:"Point 30 jours."}, {owner:"RH",label:"Point intégration 30 jours planifié",status:"NOK",note:"Satisfaction et risque."} ]; }
function defaultReviewDetails(name:string): ReviewDetails { return { previous_year:{ objectives:`Bilan à compléter pour ${name || "le collaborateur"}.`, achievement:0, highlights:"Réussites, difficultés, contribution projet et qualité." }, current_year:{ objectives:"Objectifs : performance, qualité, compétences, contribution transverse.", priority:"Développement compétences critiques" }, training:["Formation métier ciblée","Accompagnement par expert interne","Coaching manager ou mentorat"], employee_validation:false, manager_validation:false, development_plan:"Plan d’action à définir : objectifs mesurables, compétence critique, action formation, revue à mi-parcours." }; }
export default function HrTalentModulePage({ params, moduleKey }: { params: Promise<PageParams>; moduleKey: HrTalentModuleKey }) { const { orgId } = use(params); const queryClient=useQueryClient(); const config=getConfig(moduleKey); const [filters,setFilters]=useState<FilterValue>(initialFilters); const [activeTab,setActiveTab]=useState<TabKey>("pilotage"); const [historyOpen,setHistoryOpen]=useState(false); const [createOpen,setCreateOpen]=useState(false); const {data,isLoading,error}=useQuery({queryKey:["hr-talent-module",moduleKey,orgId],queryFn:()=>loadData(orgId,moduleKey),enabled:Boolean(orgId)}); const archiveMutation=useMutation({mutationFn:async(row:ModuleRow)=>{ const table=moduleKey==="time"?"hr_time_activity_entries":moduleKey==="skills"?"hr_employee_skills":moduleKey==="onboarding"?"hr_onboarding_plans":"hr_review_items"; const {error}=await (supabase.from(table as never) as any).update({archived_at:new Date().toISOString(),status:"archived"}).eq("id",(row as any).id); if(error) throw new Error(error.message);},onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:["hr-talent-module",moduleKey,orgId]});}}); const filteredRows=useMemo(()=>data?filterRows(moduleKey,data.rows,filters):[],[data,moduleKey,filters]); const metrics=useMemo(()=>data?getMetrics(moduleKey,filteredRows,data.skillCatalog):[],[data,filteredRows,moduleKey]); if(isLoading) return <div className="space-y-6"><PageHeader title={config.title} subtitle="Chargement des données RH." flush/><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-[106px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-600/60 dark:bg-slate-700/70"/>)}</section></div>; if(error||!data) return <div className="space-y-6"><PageHeader title={config.title} subtitle={config.subtitle} flush/><div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30"><p className="text-sm text-red-700 dark:text-red-300">{error instanceof Error?error.message:"Une erreur inconnue est survenue."}</p></div></div>; const PrimaryIcon=config.icon; return <><div className="space-y-6"><PageHeader title={config.title} subtitle={`${config.subtitle} Organisation : ${data.organization.name}.`} flush actions={<><button type="button" onClick={()=>setHistoryOpen(!historyOpen)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 text-xs font-bold text-sky-700 shadow-md shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg dark:border-sky-900/60 dark:bg-slate-700/70 dark:text-sky-300 dark:shadow-none"><Bell className="h-3.5 w-3.5"/>Historique RH</button><DataExportMenu data={filteredRows} columns={buildExportColumns(moduleKey)} fileName={`${config.exportFile}_${data.organization.slug}`} sheetName={config.title}/><button type="button" onClick={()=>setCreateOpen(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"><Plus className="h-3.5 w-3.5"/>{config.newLabel}</button></>}/><PageTutorial title={config.guideTitle} description={config.guideDescription} objectives={["Piloter uniquement des données Supabase réelles filtrées par organisation.","Exploiter les ressources, managers, services, statuts, modules et besoins.","Donner une lecture décisionnelle aux RH, managers, direction, PMO et formation.","Conserver la traçabilité via menus d’action, exports et archivage logique."]} steps={[{title:"Définir le périmètre",description:"Utiliser la recherche et les filtres en cascade."},{title:"Analyser les KPI",description:"Les widgets suivent strictement le périmètre filtré."},{title:"Exploiter cartes et tableaux",description:"Cartes 2 colonnes et tableaux sticky avec actions trois points."},{title:"Décider avec les graphiques",description:"Graphiques copiables et agrandissables pour comité."}]} analyses={[{title:"Répartition",description:"Statuts, services, managers, modules."},{title:"Tendance",description:"Évolution mensuelle."},{title:"Qualité",description:"Complétude, risques, retards."},{title:"Décision",description:"Priorisation des actions."}]} recommendations={["Traiter les alertes rose et amber en priorité.","Relier compétences, projets, formation et entretiens.","Archiver via menus trois points.","Exporter les données filtrées pour les comités."]}/>{historyOpen&&<SectionCard icon={Bell} title="Historique RH" description="Événements de création, modification, archivage et futures actions auditées."><p className="text-sm text-slate-500 dark:text-slate-300">Les créations et archivages sont enregistrés dans les tables métier. Le raccordement audit détaillé sera généralisé dans le module Admin / audit.</p></SectionCard>}<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric)=><MetricCard key={metric.label} {...metric}/>)}</section><FiltersPanel moduleKey={moduleKey} rows={data.rows} skillCatalog={data.skillCatalog} employees={data.employees} value={filters} onChange={setFilters} resultCount={filteredRows.length}/><div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70"><TabButton active={activeTab==="pilotage"} accent="indigo" icon={PrimaryIcon} label={config.primaryTab} onClick={()=>setActiveTab("pilotage")}/><TabButton active={activeTab==="graphs"} accent="emerald" icon={BarChart3} label="Graphiques" onClick={()=>setActiveTab("graphs")}/>{moduleKey==="skills"&&<TabButton active={activeTab==="library"} accent="amber" icon={BookOpen} label="Bibliothèque" onClick={()=>setActiveTab("library")}/>}<TabButton active={activeTab==="alerts"} accent={moduleKey==="skills"?"rose":"amber"} icon={Bell} label="Alertes" onClick={()=>setActiveTab("alerts")}/></div></div>{activeTab==="pilotage"&&<WorkCardsAndTable moduleKey={moduleKey} rows={filteredRows} employees={data.employees} onArchive={(row)=>archiveMutation.mutate(row)}/>} {activeTab==="graphs"&&<ChartsPanel moduleKey={moduleKey} rows={filteredRows} skillCatalog={data.skillCatalog}/>} {activeTab==="library"&&<LibraryPanel skillCatalog={data.skillCatalog.filter((skill)=>filters.module==="all"||skill.family===filters.module).filter((skill)=>filters.submodule==="all"||skill.category===filters.submodule)}/>} {activeTab==="alerts"&&<AlertsPanel moduleKey={moduleKey} rows={filteredRows}/>}</div><CreateModal moduleKey={moduleKey} data={data} isOpen={createOpen} onClose={()=>setCreateOpen(false)} onCreated={async()=>{await queryClient.invalidateQueries({queryKey:["hr-talent-module",moduleKey,orgId]});}}/></>; }
