"use client";

import { isValidElement, use, useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  ListChecks,
  Network,
  Plus,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip,
  XAxis as RechartsXAxis,
  YAxis,
} from "recharts";

function ResponsiveContainer(props: ComponentProps<typeof RechartsResponsiveContainer>) {
  return <RechartsResponsiveContainer minWidth={1} minHeight={1} initialDimension={{ width: 640, height: 300 }} {...props} />;
}

function XAxis(props: ComponentProps<typeof RechartsXAxis>) {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => { const update = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", update); return () => document.removeEventListener("fullscreenchange", update); }, []);
  return <RechartsXAxis interval={fullscreen ? 0 : 2} minTickGap={fullscreen ? 0 : 22} {...props} />;
}

import {
  HrActionMenu,
  HrChartCard,
  HrColumnFilterMenu,
  HrInfo,
  HrMetricCard,
  HrResetFilters,
  HrSectionCard,
  HrStatusBadge,
} from "@/components/hr/HrReferenceUi";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";
import ProjectGanttBoard from "@/components/projects/ProjectGanttBoard";
import ProjectTaskEditDrawer from "@/components/projects/ProjectTaskEditDrawer";
import { ProjectHealthTable } from "@/components/projects/ProjectReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import ProjectAuditArrow from "@/components/projects/ProjectAuditArrow";
import ProjectSkillRequirementsForm from "@/components/projects/ProjectSkillRequirementsForm";

type AnyRow = Record<string, any>;
type Params = { orgId: string; id: string };
type TabKey = "cockpit" | "planning" | "team" | "quality" | "finance";

const supabase = createClient();
const colors = {
  indigo: "#818cf8",
  emerald: "#6ee7b7",
  amber: "#fcd34d",
  rose: "#fda4af",
  sky: "#7dd3fc",
  slate: "#94a3b8",
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("fr-FR").format(date);
}

function formatMonth(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(date);
}

function money(value?: number | null) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function percent(value?: number | null) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Number(value || 0))} %`;
}

function employeeName(row?: AnyRow | null) {
  return row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || row?.resource_name || "Non renseigné";
}

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = isUuid(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadProject(orgId: string, projectId: string) {
  const organization = await resolveOrganization(orgId);
  const table = (name: string) => (supabase.from(name as never) as any).select("*").eq("organization_id", organization.id);
  const projectResult = await table("project_projects").eq("id", projectId).maybeSingle();
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data) throw new Error("Projet introuvable dans cette organisation.");
  const project = projectResult.data as AnyRow;
  const [
    clients,
    employees,
    tasks,
    dependencies,
    milestones,
    actions,
    deliverables,
    risks,
    nonconformities,
    assignments,
    skills,
    financials,
    satisfaction,
    health,
    audit,
    auditThemes,
    auditQuestions,
    projectAudits,
    auditResponses,
  ] = await Promise.all([
    table("project_clients"),
    table("hr_employee_overview"),
    table("project_tasks").eq("project_id", projectId),
    table("project_dependencies").eq("project_id", projectId),
    table("project_milestones").eq("project_id", projectId),
    table("project_actions").eq("project_id", projectId),
    table("project_deliverables").eq("project_id", projectId),
    table("project_risks").eq("project_id", projectId),
    table("project_nonconformities").eq("project_id", projectId),
    table("project_task_assignments").eq("project_id", projectId),
    table("project_skill_requirements").eq("project_id", projectId),
    table("project_financial_metrics").eq("project_id", projectId).order("period_start"),
    table("project_satisfaction_surveys").eq("project_id", projectId).order("survey_month"),
    table("project_health_snapshots").eq("project_id", projectId).order("snapshot_date"),
    table("project_audit_events").eq("project_id", projectId).order("created_at", { ascending: false }).limit(300),
    table("project_audit_themes").order("display_order"),
    table("project_audit_questions").order("question_order"),
    table("project_audits").eq("project_id", projectId).order("audit_date", { ascending: false }),
    table("project_audit_responses").eq("project_id", projectId),
  ]);
  const results = [clients, employees, tasks, dependencies, milestones, actions, deliverables, risks, nonconformities, assignments, skills, financials, satisfaction, health, audit, auditThemes, auditQuestions, projectAudits, auditResponses];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  const [skillLibraryResult, employeeSkillsResult] = await Promise.all([
    table("hr_skill_catalog").is("archived_at", null).order("family").order("category").order("code"),
    table("hr_employee_skills").is("archived_at", null),
  ]);
  const employeeMap = new Map<string, AnyRow>((employees.data || []).map((row: AnyRow) => [String(row.id), row]));
  const taskMap = new Map<string, AnyRow>((tasks.data || []).map((row: AnyRow) => [String(row.id), row]));
  const client = (clients.data || []).find((row: AnyRow) => row.id === project.client_id) || null;
  return {
    organization,
    project: {
      ...project,
      client_name: client?.name || project.client_name || "Interne / autonome",
      manager_name: employeeName(employeeMap.get(project.project_manager_employee_id)),
      sponsor_name: employeeName(employeeMap.get(project.sponsor_employee_id)),
    } as AnyRow,
    employees: employees.data || [],
    employeeMap,
    tasks: (tasks.data || []).map((row: AnyRow) => ({
      ...row,
      project_code: project.code,
      project_name: project.name,
      assignee_name: employeeName(employeeMap.get(row.assignee_employee_id)),
    })),
    dependencies: dependencies.data || [],
    milestones: (milestones.data || []).map((row: AnyRow) => ({ ...row, owner_name: employeeName(employeeMap.get(row.owner_employee_id)) })),
    actions: (actions.data || []).map((row: AnyRow) => ({ ...row, owner_name: employeeName(employeeMap.get(row.owner_employee_id)) })),
    deliverables: (deliverables.data || []).map((row: AnyRow) => ({ ...row, owner_name: row.owner_name || employeeName(employeeMap.get(row.owner_employee_id)) })),
    risks: (risks.data || []).map((row: AnyRow) => ({ ...row, owner_name: row.owner_name || employeeName(employeeMap.get(row.owner_employee_id)) })),
    nonconformities: (nonconformities.data || []).map((row: AnyRow) => ({ ...row, owner_name: row.owner_name || employeeName(employeeMap.get(row.owner_employee_id)) })),
    assignments: (assignments.data || []).map((row: AnyRow) => ({ ...row, resource_name: row.resource_name || employeeName(employeeMap.get(row.employee_id)), task_name: taskMap.get(row.task_id)?.name || "—" })),
    skills: skills.data || [],
    skillLibrary: skillLibraryResult.error ? [] : skillLibraryResult.data || [],
    employeeSkills: employeeSkillsResult.error ? [] : employeeSkillsResult.data || [],
    financials: financials.data || [],
    satisfaction: satisfaction.data || [],
    health: health.data || [],
    audit: audit.data || [],
    auditThemes: auditThemes.data || [],
    auditQuestions: auditQuestions.data || [],
    projectAudits: projectAudits.data || [],
    auditResponses: auditResponses.data || [],
  };
}

function filterText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return value === false ? "Non" : value === true ? "Oui" : "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(filterText).filter(Boolean).join(" · ");
  if (isValidElement(value)) {
    const props = value.props as Record<string, unknown>;
    return filterText((props.label ?? props.children ?? props.status ?? "—") as ReactNode);
  }
  return String(value);
}

type ProjectColumn = { label: string; value: (row: AnyRow) => ReactNode; filterValue?: (row: AnyRow) => string };

function ProjectTable({ title, description, icon: Icon = ListChecks, columns, rows }: { title?: string; description?: string; icon?: ComponentType<{ className?: string }>; columns: ProjectColumn[]; rows: AnyRow[] }) {
  const captureRef = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<number, string[]>>({});
  const textFor = (column: ProjectColumn, row: AnyRow) => column.filterValue?.(row) ?? filterText(column.value(row));
  const visibleRows = rows.filter((row) => columns.every((column, index) => !columnFilters[index]?.length || columnFilters[index].includes(textFor(column, row))));
  const hasColumnFilters = Object.values(columnFilters).some((values) => values.length > 0);
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column, index) => ({ key: `column_${index}`, label: column.label, value: (row) => textFor(column, row) }));
  return (
    <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto dark:border-slate-600 dark:bg-slate-700/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3 dark:border-slate-600 dark:from-sky-900/20 dark:via-slate-700 dark:to-indigo-900/20"><div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200"><Icon className="h-4 w-4" /></span><div className="min-w-0"><h3 className="text-sm font-black text-slate-950 dark:text-white">{title || "Détail du projet"}</h3><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">{description || "Données détaillées, filtrées et traçables du projet."}</p></div></div><div className="flex items-center gap-2"><DataExportMenu data={visibleRows} columns={exportColumns} fileName="onepilot_detail_projet" sheetName={title || "Détail projet"} disabled={!visibleRows.length} /><ProjectVisualActions targetRef={captureRef} fileName="onepilot-detail-projet" label="le tableau" /></div></div>
      <div className="max-h-[252px] overflow-auto">
      <table className="w-full min-w-[1280px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200">
          <tr>{columns.map((column, index) => <th key={column.label} className={`${index === 0 ? "sticky left-0 z-30" : ""} whitespace-nowrap border-b border-slate-200 bg-inherit px-4 py-3 text-left`}><HrColumnFilterMenu label={column.label} values={rows.map((row) => textFor(column, row))} selected={columnFilters[index] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [index]: values }))} /></th>)}<th className="sticky right-0 z-30 whitespace-nowrap border-b border-slate-200 bg-sky-50 px-4 py-3 text-right">Actions</th></tr>
        </thead>
        <tbody>{visibleRows.map((row, rowIndex) => <tr key={row.id || rowIndex} onDoubleClick={() => setSelected(row)} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20">{columns.map((column, index) => <td key={column.label} className={`${index === 0 ? "sticky left-0 z-10 bg-white font-black dark:bg-slate-700" : ""} ${/question|commentaire|critère|description|plan/i.test(column.label) ? "max-w-96 whitespace-normal" : "whitespace-nowrap"} border-b border-slate-100 px-4 py-3 dark:border-slate-600`}>{column.value(row)}</td>)}<td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-right"><HrActionMenu labels={{ view: "Voir le détail", edit: "Modifier", archive: "Archiver", restore: "Réactiver" }} onView={() => setSelected(row)} /></td></tr>)}</tbody>
      </table>
    </div>{hasColumnFilters && <div className="border-t border-slate-100 px-4 py-2"><HrResetFilters onReset={() => setColumnFilters({})} /></div>}{selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-5" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-black text-slate-950">{title || "Détail"}</h3><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700">Fermer</button></div><div className="grid gap-3 sm:grid-cols-2">{columns.map((column) => <div key={column.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{column.label}</p><div className="mt-1 text-sm text-slate-800">{column.value(selected)}</div></div>)}</div></section></div>}</section>
  );
}

function BusinessBadge({ value, kind = "status" }: { value: unknown; kind?: "status" | "priority" | "strategy" | "effectiveness" | "origin" }) {
  const key = String(value || "").toLowerCase();
  const dictionaries: Record<string, Record<string, string>> = {
    priority: { low: "Faible", medium: "Moyenne", normal: "Moyenne", high: "Haute", critical: "Critique" },
    strategy: { avoid: "Éviter", mitigate: "Réduire", transfer: "Transférer", accept: "Accepter" },
    effectiveness: { compliant: "Conforme", partially_compliant: "Partiellement conforme", non_compliant: "Non conforme", effective: "Efficace", partially_effective: "Partiellement efficace", ineffective: "Inefficace", pending: "À évaluer" },
    origin: { project: "Projet", risk: "Risque", nonconformity: "Non-conformité", non_conformity: "Non-conformité", audit: "Audit", quality: "Qualité", customer: "Client", finance: "Finance", management: "Management" },
  };
  const label = dictionaries[kind]?.[key] || String(value || "Non renseigné");
  const tone = kind === "priority" ? (key === "low" ? "planned" : ["high", "critical"].includes(key) ? "blocked" : "in_progress") : kind === "effectiveness" ? (["compliant", "effective"].includes(key) ? "completed" : ["non_compliant", "ineffective"].includes(key) ? "blocked" : "in_progress") : kind === "strategy" ? (key === "mitigate" ? "in_progress" : key === "avoid" ? "blocked" : key === "transfer" ? "planned" : "archived") : kind === "origin" ? (key === "risk" || key === "nonconformity" ? "blocked" : key === "audit" || key === "quality" ? "in_progress" : "planned") : key;
  return <HrStatusBadge status={tone} label={label} />;
}

function frenchValue(value: unknown) {
  const key = String(value || "").toLowerCase();
  return ({ open: "Ouvert", planned: "Ouvert", active: "En cours", in_progress: "En cours", pending: "En attente", blocked: "Bloqué", completed: "Clos", closed: "Clos", done: "Clos", cancelled: "Annulé", archived: "Archivé", milestone: "Jalon", document: "Document", report: "Rapport", audit: "Audit", risk: "Risque", quality: "Qualité", project: "Projet", create: "Création", insert: "Création", update: "Modification", archive: "Archivage", delete: "Suppression", project_projects: "Projet", project_tasks: "Tâche", project_actions: "Action", project_deliverables: "Livrable", project_risks: "Risque", high: "Haute", medium: "Moyenne", low: "Faible", critical: "Critique", required: "Obligatoire", important: "Importante", nice_to_have: "Souhaitable" } as Record<string, string>)[key] || String(value || "Non renseigné");
}

function riskCriticality(row: AnyRow) {
  const raw = Number(row.inherent_score || Number(row.probability || 0) * Number(row.impact || 0));
  const normalized = Math.round((raw / 16) * 36);
  if (normalized >= 36) return { label: "Inacceptable", status: "blocked", factor: 1 };
  if (normalized >= 18) return { label: "Critique", status: "blocked", factor: 0.8 };
  if (normalized >= 8) return { label: "Significatif", status: "in_progress", factor: 0.5 };
  return { label: "Négligeable", status: "completed", factor: 0.2 };
}

function RiskMatrix({ risks }: { risks: AnyRow[] }) {
  const captureRef = useRef<HTMLElement | null>(null);
  const columns: ExportColumn<AnyRow>[] = [
    { key: "code", label: "N° risque", value: (row) => row.code },
    { key: "title", label: "Risque", value: (row) => row.title },
    { key: "probability", label: "Probabilité", value: (row) => row.probability },
    { key: "impact", label: "Impact", value: (row) => row.impact },
    { key: "score", label: "Criticité", value: (row) => Number(row.probability || 0) * Number(row.impact || 0) },
  ];
  return (
    <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto dark:border-slate-600 dark:bg-slate-700/70"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3 dark:border-slate-600 dark:from-sky-900/20 dark:via-slate-700 dark:to-indigo-900/20"><div className="flex items-start gap-3"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><AlertTriangle className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Matrice des risques 4 × 4</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Probabilité × impact, exposition brute et plans de réduction par projet.</p></div></div><div className="flex items-center gap-2"><DataExportMenu data={risks} columns={columns} fileName="onepilot_risques_projet" sheetName="Risques" disabled={!risks.length} /><ProjectVisualActions targetRef={captureRef} fileName="onepilot-matrice-risques" label="la matrice des risques" /></div></div><div className="grid grid-cols-[110px_repeat(4,minmax(70px,1fr))] gap-1 p-5 text-center text-[11px] font-black">
      <div />
      {["Improbable", "Possible", "Probable", "Très probable"].map((label) => <div key={label} className="rounded-lg bg-slate-100 px-2 py-2 text-slate-600">{label}</div>)}
      {[4, 3, 2, 1].flatMap((impact) => [
        <div key={`i-${impact}`} className="flex items-center justify-center rounded-lg bg-slate-100 px-2 py-3 text-slate-600">{impact === 4 ? "Majeur" : impact === 3 ? "Sérieux" : impact === 2 ? "Moyen" : "Faible"}</div>,
        ...[1, 2, 3, 4].map((probability) => {
          const score = probability * impact;
          const items = risks.filter((risk) => Number(risk.probability) === probability && Number(risk.impact) === impact && !risk.archived_at);
          const tone = score >= 12 ? "bg-rose-200 text-rose-900" : score >= 8 ? "bg-amber-200 text-amber-900" : score >= 4 ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800";
          return <div key={`${probability}-${impact}`} className={`flex min-h-14 items-center justify-center rounded-xl p-2 text-lg ${tone}`} title={items.map((item) => `${item.code} · ${item.title}`).join("\n")}>{items.length}</div>;
        }),
      ])}
    </div><div className="flex flex-wrap gap-4 border-t border-slate-100 px-5 py-3 text-[10px] font-black dark:border-slate-600"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Négligeable</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-300" />Significatif</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-orange-400" />Critique</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-500" />Inacceptable</span></div></section>
  );
}

function AuditComplianceArrow({ themes, questions, audits, responses }: { themes: AnyRow[]; questions: AnyRow[]; audits: AnyRow[]; responses: AnyRow[] }) {
  const captureRef = useRef<HTMLDivElement | null>(null);
  const latest = audits[0];
  const latestResponses = responses.filter((row) => String(row.audit_id) === String(latest?.id) && !row.archived_at);
  const rows: AnyRow[] = themes.map((theme: AnyRow): AnyRow => {
    const questionCount = questions.filter((question) => String(question.theme_id) === String(theme.id)).length;
    const applicable = latestResponses.filter((response) => String(response.theme_id) === String(theme.id) && response.answer !== "na");
    const score = applicable.length ? Math.round(applicable.reduce((sum, response) => sum + Number(response.score || 0), 0) / applicable.length) : null;
    return { ...theme, questionCount, score };
  });
  const tone = (score: number | null) => score == null ? "bg-slate-300 text-slate-700" : score >= 80 ? "bg-emerald-400 text-emerald-950" : score >= 65 ? "bg-amber-300 text-amber-950" : "bg-rose-400 text-rose-950";
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3 dark:border-slate-600 dark:from-sky-900/20 dark:via-slate-700 dark:to-indigo-900/20"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Chaîne de conformité AVV et Delivery</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Référentiel exhaustif issu de l’audit projet : conformité par thème, écarts et priorités d’action.</p></div><ProjectVisualActions targetRef={captureRef} fileName="onepilot-audit-conformite" label="la chaîne de conformité" /></div><div ref={captureRef} className="space-y-4 bg-slate-50/45 p-5 dark:bg-slate-800/30"><div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{rows.map((row) => <article key={row.id} className={`min-h-24 px-5 py-3 shadow-sm ${tone(row.score)}`} style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)" }}><p className="line-clamp-2 text-xs font-black">{row.code} · {row.name}</p><p className="mt-2 text-lg font-black">{row.score == null ? "N/A" : `${row.score} %`}</p><p className="text-[10px] font-bold opacity-75">{row.questionCount} contrôle(s)</p></article>)}</div><div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black text-slate-600"><span className="text-emerald-700">Emerald · conforme ≥ 80 %</span><span className="text-amber-700">Amber · partiellement conforme 65–79 %</span><span className="text-rose-700">Rose · non conforme &lt; 65 %</span><span className="text-slate-600">Gris · non applicable</span><span className="ml-auto">{latest ? `${latest.audit_number} · ${formatDate(latest.audit_date)} · ${Number(latest.overall_score || 0).toFixed(1)} %` : "Aucun audit réalisé"}</span></div></div></section>;
}

function ProjectSkillForm({ organizationId, projectId, library, initialRows, onClose, onSaved }: { organizationId: string; projectId: string; library: AnyRow[]; initialRows: AnyRow[]; onClose: () => void; onSaved: () => void }) {
  const emptyRow = { skill_name: "", required_level: 2, minimum_people: 1, importance: "required", planned_hours: 0, coverage_percent: 0, justification: "" };
  const [rows, setRows] = useState<AnyRow[]>(initialRows.length ? initialRows.map((row) => ({ ...row })) : [{ ...emptyRow }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sortedLibrary = useMemo(() => library.slice().sort((left, right) => String(left.code || "").localeCompare(String(right.code || ""), "fr", { numeric: true }) || String(left.name || left.label || "").localeCompare(String(right.name || right.label || ""), "fr")), [library]);
  const skillMeta = (row: AnyRow) => {
    const selected = library.find((skill) => String(skill.id) === String(row.skill_id));
    return {
      chapter: selected?.domain_name || selected?.domain || selected?.chapter || selected?.family || row.skill_chapter || "Général",
      subchapter: selected?.subdomain_name || selected?.subdomain || selected?.subchapter || selected?.category || row.skill_subchapter || "Compétences",
    };
  };
  const updateRow = (index: number, patch: AnyRow) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const save = async () => {
    const validRows = rows.filter((row) => String(row.skill_name || "").trim());
    if (!validRows.length) { setError("Renseignez au moins une compétence."); return; }
    setSaving(true); setError("");
    for (const row of validRows) {
      const selected = library.find((skill) => String(skill.id) === String(row.skill_id));
      const payload = { organization_id: organizationId, project_id: projectId, skill_id: selected?.id || null, skill_code: selected?.code || row.skill_code || null, skill_name: String(row.skill_name).trim(), skill_family: selected?.family || selected?.category || row.skill_family || null, required_level: Number(row.required_level || 0), minimum_people: Number(row.minimum_people || 0), importance: row.importance || "required", planned_hours: Number(row.planned_hours || 0), coverage_percent: Number(row.coverage_percent || 0), justification: row.justification || null, updated_at: new Date().toISOString() };
      const request = row.id ? (supabase.from("project_skill_requirements" as never) as any).update(payload).eq("id", row.id).eq("organization_id", organizationId) : (supabase.from("project_skill_requirements" as never) as any).insert(payload);
      const result = await request;
      if (result.error) { setError(result.error.message); setSaving(false); return; }
    }
    setSaving(false); onSaved(); onClose();
  };
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside className="h-full w-full max-w-7xl overflow-y-auto bg-slate-50 p-5 shadow-2xl dark:bg-slate-800">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950 dark:text-white">Besoins en compétences du projet</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Sélectionnez les compétences du référentiel RH, classées par chapitre et sous-chapitre, ou utilisez la saisie autonome.</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700">
        <table className="w-full min-w-[1680px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-40 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Chapitre", "Sous-chapitre", "Compétence", "Niveau requis", "Effectif", "Importance", "Charge", "Couverture", "Justification"].map((label, index) => <th key={label} className={"whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left " + (index === 0 ? "sticky left-0 z-50 w-40 bg-sky-50 dark:bg-slate-600" : index === 1 ? "sticky left-40 z-50 w-48 bg-sky-50 dark:bg-slate-600" : index === 2 ? "sticky left-[352px] z-50 min-w-80 bg-sky-50 dark:bg-slate-600" : "")}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => { const meta = skillMeta(row); return <tr key={row.id || index} className="hover:bg-indigo-50/35 dark:hover:bg-indigo-900/20">
            <td className="sticky left-0 z-30 w-40 border-b border-slate-100 bg-white px-3 py-2 font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">{meta.chapter}</td>
            <td className="sticky left-40 z-30 w-48 border-b border-slate-100 bg-white px-3 py-2 font-bold text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">{meta.subchapter}</td>
            <td className="sticky left-[352px] z-30 min-w-80 border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700"><select value={row.skill_id || "manual"} onChange={(event) => { const selected = library.find((skill) => String(skill.id) === event.target.value); updateRow(index, selected ? { skill_id: selected.id, skill_name: selected.name || selected.label, skill_code: selected.code, skill_chapter: selected.domain_name || selected.domain || selected.family, skill_subchapter: selected.subdomain_name || selected.subdomain || selected.category } : { skill_id: null }); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold outline-none focus:border-indigo-400 dark:border-slate-500 dark:bg-slate-700"><option value="manual">Saisie autonome</option>{sortedLibrary.map((skill) => <option key={skill.id} value={skill.id}>{(skill.code ? String(skill.code) + " · " : "") + (skill.name || skill.label)}</option>)}</select>{!row.skill_id && <input value={row.skill_name || ""} onChange={(event) => updateRow(index, { skill_name: event.target.value })} placeholder="Nom de la compétence" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400" />}</td>
            <td className="border-b border-slate-100 px-3 py-2"><select value={row.required_level ?? 2} onChange={(event) => updateRow(index, { required_level: Number(event.target.value) })} className="rounded-xl border border-slate-200 px-3 py-2">{[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>{level} / 4</option>)}</select></td>
            <td className="border-b border-slate-100 px-3 py-2"><input type="number" min="0" value={row.minimum_people ?? 1} onChange={(event) => updateRow(index, { minimum_people: event.target.value })} className="w-24 rounded-xl border border-slate-200 px-3 py-2" /></td>
            <td className="border-b border-slate-100 px-3 py-2"><select value={row.importance || "required"} onChange={(event) => updateRow(index, { importance: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2"><option value="critical">Critique</option><option value="required">Requise</option><option value="useful">Utile</option></select></td>
            <td className="border-b border-slate-100 px-3 py-2"><input type="number" min="0" value={row.planned_hours || 0} onChange={(event) => updateRow(index, { planned_hours: event.target.value })} className="w-28 rounded-xl border border-slate-200 px-3 py-2" /></td>
            <td className="border-b border-slate-100 px-3 py-2"><input type="number" min="0" max="100" value={row.coverage_percent || 0} onChange={(event) => updateRow(index, { coverage_percent: event.target.value })} className="w-24 rounded-xl border border-slate-200 px-3 py-2" /></td>
            <td className="min-w-72 border-b border-slate-100 px-3 py-2"><input value={row.justification || ""} onChange={(event) => updateRow(index, { justification: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" /></td>
          </tr>; })}</tbody>
        </table>
      </div>
      <button type="button" onClick={() => setRows((current) => [...current, { ...emptyRow }])} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700"><Plus className="h-4 w-4" />Ajouter une compétence</button>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50">Annuler</button><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
    </aside>
  </div>;
}

const auditExport: ExportColumn<AnyRow>[] = [
  { key: "date", label: "Date", value: (row) => row.created_at },
  { key: "entity", label: "Table", value: (row) => frenchValue(row.entity_table) },
  { key: "entity_id", label: "ID objet", value: (row) => row.entity_id },
  { key: "action", label: "Action", value: (row) => row.action },
  { key: "actor", label: "Utilisateur", value: (row) => row.actor_user_id },
  { key: "reason", label: "Motif", value: (row) => row.reason },
];

export default function ProjectDetailPage({ params }: { params: Promise<Params> }) {
  const { orgId, id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("cockpit");
  const [taskEditing, setTaskEditing] = useState<AnyRow | null>(null);
  const [skillsEditing, setSkillsEditing] = useState(false);
  const [skillChapter, setSkillChapter] = useState("");
  const [skillSubchapter, setSkillSubchapter] = useState("");
  const [skillResource, setSkillResource] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [skillImportance, setSkillImportance] = useState("");
  const [scopeSearch, setScopeSearch] = useState("");
  const [scopeStatus, setScopeStatus] = useState("");
  const [scopeStart, setScopeStart] = useState("");
  const [scopeEnd, setScopeEnd] = useState("");
  const query = useQuery({ queryKey: ["project-detail", orgId, id], queryFn: () => loadProject(orgId, id) });
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">Chargement du cockpit projet…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger le projet : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const data = query.data;
  const project = data.project;
  const scopeActive = Boolean(scopeSearch || scopeStatus || scopeStart || scopeEnd);
  const matchesScope = (row: AnyRow) => {
    const searchable = Object.values(row).map((value) => filterText(value)).join(" ").toLocaleLowerCase("fr");
    const status = String(row.status || row.quality_status || row.answer || "").toLocaleLowerCase("fr");
    const date = String(row.start_date || row.period_start || row.planned_date || row.forecast_date || row.due_date || row.created_at || "").slice(0, 10);
    return (!scopeSearch || searchable.includes(scopeSearch.toLocaleLowerCase("fr")))
      && (!scopeStatus || status === scopeStatus)
      && (!scopeStart || !date || date >= scopeStart)
      && (!scopeEnd || !date || date <= scopeEnd);
  };
  const scopedTasks = data.tasks.filter(matchesScope);
  const scopedActions = data.actions.filter(matchesScope);
  const scopedMilestones = data.milestones.filter(matchesScope);
  const scopedDeliverables = data.deliverables.filter(matchesScope);
  const scopedRisks = data.risks.filter(matchesScope);
  const scopedNonconformities = data.nonconformities.filter(matchesScope);
  const scopedFinancials = data.financials.filter(matchesScope);
  const scopedSatisfaction = data.satisfaction.filter(matchesScope);
  const scopedAudit = data.audit.filter(matchesScope);
  const scopedAuditResponses = data.auditResponses.filter(matchesScope);
  const scopeStatuses = [...new Set([
    ...data.tasks, ...data.actions, ...scopedMilestones, ...scopedDeliverables,
    ...data.risks, ...data.nonconformities, ...data.audit,
  ].map((row: AnyRow) => String(row.status || row.quality_status || row.answer || "").toLocaleLowerCase("fr")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const latestFinance = data.financials[data.financials.length - 1] || {};
  const latestHealth = data.health[data.health.length - 1] || {};
  const criticalRisks = data.risks.filter((risk: AnyRow) => Number(risk.inherent_score || Number(risk.probability) * Number(risk.impact)) >= 12 && !risk.archived_at).length;
  const lateDeliverables = data.deliverables.filter((row: AnyRow) => !["accepted", "cancelled"].includes(row.status) && (row.replanned_date || row.planned_date) < new Date().toISOString().slice(0, 10)).length;
  const financialSeries = scopedFinancials.map((row: AnyRow) => { const costs = Number(row.ac ?? row.actual_cost ?? 0); const production = Number(row.production_amount || 0); return { month: formatMonth(row.period_start), pv: Number(row.pv ?? row.planned_value ?? 0), ev: Number(row.ev ?? row.earned_value ?? 0), ac: costs, costs, production, billed: Number(row.invoiced_amount || 0), margin: production ? ((production - costs) / production) * 100 : 0, plannedCosts: Number(row.planned_cost ?? row.planned_value ?? 0), plannedProduction: Number(row.planned_production ?? row.earned_value ?? 0) }; });
  const satisfactionRadar = [
    ["Écoute client", "customer_listening_score"], ["Planification", "planning_score"], ["Compétences", "technical_skills_score"], ["Indicateurs", "monitoring_score"], ["Risques", "risk_management_score"],
  ].map(([name, key]) => ({ name, score: scopedSatisfaction.length ? scopedSatisfaction.reduce((sum: number, row: AnyRow) => sum + Number(row[key] || 0), 0) / scopedSatisfaction.length : 0 }));
  const skillCatalogById = new Map<string, AnyRow>(data.skillLibrary.map((row: AnyRow) => [String(row.id), row]));
  const skillMeta = (row: AnyRow) => {
    const catalog = skillCatalogById.get(String(row.skill_id)) || {};
    const [legacyChapter = "Général", legacySubchapter = "Compétences"] = String(row.skill_family || "Général / Compétences").split("/").map((value: string) => value.trim());
    return { chapter: catalog.family || row.skill_chapter || legacyChapter, subchapter: catalog.category || row.skill_subchapter || legacySubchapter, chapterCode: catalog.chapter_code || "—", subchapterCode: catalog.subchapter_code || "—", skillCode: catalog.code || row.skill_code || "—" };
  };
  const skillChapters: string[] = [...new Set<string>(data.skillLibrary.map((row: AnyRow) => String(row.family || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const skillSubchapters: string[] = [...new Set<string>(data.skillLibrary.filter((row: AnyRow) => !skillChapter || row.family === skillChapter).map((row: AnyRow) => String(row.category || "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const scopedSkills = data.skills.filter((row: AnyRow) => { const meta = skillMeta(row); const searchable = `${meta.chapter} ${meta.subchapter} ${row.skill_name || ""} ${row.justification || ""}`.toLocaleLowerCase("fr"); return (!scopeSearch || searchable.includes(scopeSearch.toLocaleLowerCase("fr"))) && (!skillChapter || meta.chapter === skillChapter) && (!skillSubchapter || meta.subchapter === skillSubchapter) && (!skillLevel || Number(row.required_level) === Number(skillLevel)) && (!skillImportance || row.importance === skillImportance); });
  const assignedEmployeeIds = [...new Set<string>(data.assignments.map((row: AnyRow) => String(row.employee_id || "")).filter(Boolean))];
  const skillGapRows = scopedSkills.flatMap((requirement: AnyRow) => assignedEmployeeIds.map((employeeId) => {
    const employee = data.employeeMap.get(employeeId) || {};
    const assessment = data.employeeSkills.find((row: AnyRow) => String(row.employee_id) === employeeId && String(row.skill_id) === String(requirement.skill_id)) || {};
    const currentLevel = Number(assessment.current_level ?? assessment.level ?? 0);
    const requiredLevel = Number(requirement.required_level || 0);
    const meta = skillMeta(requirement);
    return { id: `${requirement.id}-${employeeId}`, employee_id: employeeId, resource_name: employeeName(employee), ...meta, skill_name: requirement.skill_name, current_level: currentLevel, required_level: requiredLevel, gap: Math.max(0, requiredLevel - currentLevel), importance: requirement.importance, evidence: assessment.evidence || "Aucune preuve enregistrée", action: currentLevel === 0 ? "Évaluation initiale puis formation structurée" : requiredLevel - currentLevel >= 2 ? "Formation certifiante et tutorat projet" : requiredLevel > currentLevel ? "Accompagnement ciblé et mise en situation" : "Maintenir et valoriser le niveau" };
  })).filter((row: AnyRow) => !skillResource || row.employee_id === skillResource);
  const skillRadar = scopedSkills.slice().sort((left: AnyRow, right: AnyRow) => String(skillMeta(left).skillCode).localeCompare(String(skillMeta(right).skillCode), "fr", { numeric: true })).slice(0, 12).map((row: AnyRow) => {
    const assessments = skillGapRows.filter((item: AnyRow) => item.skill_name === row.skill_name);
    return { name: row.skill_name, besoin: Number(row.required_level || 0), équipe: assessments.length ? Number((assessments.reduce((sum: number, item: AnyRow) => sum + Number(item.current_level || 0), 0) / assessments.length).toFixed(2)) : 0 };
  });
  const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }>; active: string }> = [
    { key: "cockpit", label: "Cockpit", icon: Gauge, active: "bg-indigo-600 text-white" },
    { key: "planning", label: "Planning & WBS", icon: CalendarDays, active: "bg-violet-600 text-white" },
    { key: "team", label: "Équipe & compétences", icon: Users, active: "bg-emerald-600 text-white" },
    { key: "quality", label: "Qualité", icon: ShieldAlert, active: "bg-amber-500 text-white" },
    { key: "finance", label: "Finance & performance", icon: CircleDollarSign, active: "bg-rose-600 text-white" },
  ];
  return <div className="project-module space-y-6">
    <PageHeader title={`${project.code} · ${project.name}`} subtitle="Cockpit projet complet : exécution, charge, compétences, qualité, risques, finance, performance et décisions." actions={<><DataExportMenu data={data.audit} columns={auditExport} fileName={`onepilot_${project.code}_audit`} sheetName="Audit projet" disabled={!data.audit.length} /><button type="button" onClick={() => router.push(`/${encodeURIComponent(orgId)}/projects`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50"><ArrowLeft className="h-4 w-4" />Portefeuille</button></>} />
    <PageTutorial title="Guide de la page" description={`Piloter ${project.code} du cadrage à la clôture avec une lecture unique du réalisé, du reste à faire et des engagements.\nRelier planning, équipe, compétences, livrables, risques, qualité, valeur acquise, marge, facturation et satisfaction client.`} objectives={["Donner à la direction, au chef de projet et à l’équipe une source de vérité commune.", "Décider sur l’avancement physique, la charge, les coûts, les risques et la valeur client."]} steps={[{ title: "Cadrer", description: "Valider baseline, équipe, compétences, livrables, budget et gouvernance." }, { title: "Exécuter", description: "Mettre à jour tâches, reste à faire, temps, actions, risques et preuves." }, { title: "Arbitrer", description: "Traiter les écarts, replanifier avec traçabilité et sécuriser la marge." }]} analyses={[{ title: "Analyse intégrée", description: "Comparer VP, VA, CR, SPI, CPI, charge, capacité, OTD, OQD, DoD, risques et satisfaction." }]} recommendations={["Mesurer l’avancement sur le travail réellement achevé, jamais sur le seul temps écoulé.", "Baseliner toute modification engageante et conserver la preuve de décision.", "Relier les actions aux causes, responsables, échéances, résultats et contrôles d’efficacité."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Target} label="Avancement physique" value={percent(project.progress_percent)} description="Pondération du travail réellement terminé dans la WBS." accent="indigo" /><HrMetricCard icon={CircleDollarSign} label="Budget restant" value={money(Number(project.ordered_budget || project.budget_amount || latestFinance.bac || 0) - Number(project.consumed_budget || project.actual_cost || latestFinance.ac || 0))} description="Budget commandé moins coûts réels cumulés." accent="emerald" /><HrMetricCard icon={Gauge} label="SPI / CPI" value={`${Number(latestFinance.spi || latestHealth.spi || 0).toFixed(2)} / ${Number(latestFinance.cpi || latestHealth.cpi || 0).toFixed(2)}`} description="Indices délais et coûts issus de la valeur acquise." accent="amber" /><HrMetricCard icon={AlertTriangle} label="Points critiques" value={criticalRisks + lateDeliverables} description={`${criticalRisks} risque(s) critique(s), ${lateDeliverables} livrable(s) en retard.`} accent="rose" /></section>
    <HrSectionCard icon={BriefcaseBusiness} title="Identité et gouvernance" description="Données contractuelles, rattachement Commerce et responsabilités du projet."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Client" value={project.client_name} accent="sky" /><HrInfo label="Chef de projet" value={project.manager_name} accent="indigo" /><HrInfo label="Sponsor" value={project.sponsor_name} accent="amber" /><HrInfo label="Statut" value={<HrStatusBadge status={project.status} />} accent="emerald" /><HrInfo label="N° Opportunité" value={project.opportunity_number || project.source_avv_reference || "Création autonome"} /><HrInfo label="Début" value={formatDate(project.start_date)} /><HrInfo label="Fin" value={formatDate(project.end_date)} /><HrInfo label="Santé" value={project.health_status || "À qualifier"} accent={project.health_status === "red" ? "rose" : project.health_status === "amber" ? "amber" : "emerald"} /></div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700">{tabs.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>

    {["cockpit", "planning", "team", "quality", "finance"].includes(tab) && <HrSectionCard icon={SlidersHorizontal} title={tab === "team" ? "Recherche et périmètre des compétences" : "Périmètre du détail"} description={tab === "team" ? "Recherchez une compétence puis affinez le radar et les écarts par ressource, chapitre, niveau et importance." : "Affinez les objets du projet affichés dans l’onglet actif ; les cartes, tableaux et graphiques suivent ce même périmètre."}>
      <div className="space-y-4">
        <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={scopeSearch} onChange={(event) => setScopeSearch(event.target.value)} placeholder="Rechercher une tâche, un livrable, un risque, une action ou une période…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100" /></label>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">Statut</span><select value={scopeStatus} onChange={(event) => setScopeStatus(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:border-slate-500 dark:bg-slate-700"><option value="">Tous les statuts</option>{scopeStatuses.map((status) => <option key={status} value={status}>{frenchValue(status)}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">Début de période</span><input type="date" value={scopeStart} onChange={(event) => setScopeStart(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:border-slate-500 dark:bg-slate-700" /></label>
          <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">Fin de période</span><input type="date" value={scopeEnd} onChange={(event) => setScopeEnd(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-indigo-400 dark:border-slate-500 dark:bg-slate-700" /></label>
          <div className="flex items-end justify-end"><HrStatusBadge status="planned" label={`${[scopedTasks, scopedActions, scopedDeliverables, scopedRisks].reduce((sum, rows) => sum + rows.length, 0)} objets visibles`} /></div>
        </div>
        {scopeActive && <HrResetFilters onReset={() => { setScopeSearch(""); setScopeStatus(""); setScopeStart(""); setScopeEnd(""); }} />}
      </div>
    </HrSectionCard>}

    {tab === "cockpit" && <div className="grid gap-5 xl:grid-cols-2 [&>section:nth-child(n+3)]:xl:col-span-2"><HrChartCard title="Courbe en S du projet" description="Valeur planifiée (VP), valeur acquise (VA) et coûts réels (CR) cumulés." exportConfig={{ type: "line", data: financialSeries, nameKey: "month", series: [{ key: "pv", label: "VP", color: colors.indigo }, { key: "ev", label: "VA", color: colors.emerald }, { key: "ac", label: "CR", color: colors.rose }], unit: " €" }}><ResponsiveContainer width="100%" height={300}><LineChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="pv" name="VP" stroke={colors.indigo} strokeWidth={3} /><Line type="monotone" dataKey="ev" name="VA" stroke={colors.emerald} strokeWidth={3} /><Line type="monotone" dataKey="ac" name="CR" stroke={colors.rose} strokeWidth={3} /></LineChart></ResponsiveContainer></HrChartCard><HrChartCard title="Radar de satisfaction client" description="Écoute, planification, compétences, reporting et gestion des risques sur 5." exportConfig={{ type: "radar", data: satisfactionRadar, nameKey: "name", series: [{ key: "score", label: "Satisfaction", color: colors.sky }], unit: "/5" }}><ResponsiveContainer width="100%" height={300}><RadarChart data={satisfactionRadar}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="score" name="Satisfaction" stroke={colors.sky} fill={colors.sky} fillOpacity={0.25} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></HrChartCard><ProjectTable title="Décisions et actions prioritaires" description="Actions ouvertes, bloquées ou en retard qui conditionnent les engagements." icon={ListChecks} rows={scopedActions.filter((row: AnyRow) => !["closed", "done", "archived"].includes(row.status))} columns={[{ label: "Action", value: (row) => `${row.code} · ${row.title}` }, { label: "Origine", value: (row) => <BusinessBadge value={row.origin_type || row.source_module || row.action_type} kind="origin" /> }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Échéance", value: (row) => formatDate(row.replanned_due_date || row.rescheduled_due_date || row.due_date) }, { label: "Priorité", value: (row) => <BusinessBadge value={row.priority} kind="priority" /> }, { label: "Avancement", value: (row) => percent(row.progress_percent) }]} /><ProjectTable title="Prochains jalons et livrables" description="Échéances contractuelles et qualité à sécuriser dans les prochaines semaines." icon={FileCheck2} rows={[...scopedMilestones, ...scopedDeliverables].sort((a: AnyRow, b: AnyRow) => String(a.forecast_date || a.replanned_date || a.planned_date).localeCompare(String(b.forecast_date || b.replanned_date || b.planned_date))).slice(0, 12)} columns={[{ label: "Objet", value: (row) => `${row.code} · ${row.name}` }, { label: "Type", value: (row) => frenchValue(row.milestone_type || row.deliverable_type) }, { label: "Date", value: (row) => formatDate(row.forecast_date || row.replanned_date || row.planned_date) }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Statut", value: (row) => <HrStatusBadge status={row.status} /> }]} /></div>}
    {tab === "cockpit" && <ProjectHealthTable title="Santé synthétique du projet" description="Lecture homogène planning, ressources, budget, risques, qualité et satisfaction avec seuils de décision." projects={[{ ...project, ...latestHealth, ...latestFinance, critical_risks: criticalRisks, late_deliverables: lateDeliverables, satisfaction_score: data.satisfaction.at(-1)?.overall_score }]} />}
    {tab === "planning" && <ProjectGanttBoard tasks={scopedTasks} dependencies={data.dependencies} employeeMap={data.employeeMap} onEditTask={setTaskEditing} />}
    {tab === "team" && <HrSectionCard icon={Network} title="Périmètre du radar de compétences" description="Affiner la comparaison du besoin projet et des niveaux réels de l’équipe par ressource, chapitre, sous-chapitre, niveau et importance."><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ressource</span><select value={skillResource} onChange={(event) => setSkillResource(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">Toutes les ressources</option>{assignedEmployeeIds.map((employeeId) => <option key={employeeId} value={employeeId}>{employeeName(data.employeeMap.get(employeeId))}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Chapitre</span><select value={skillChapter} onChange={(event) => { setSkillChapter(event.target.value); setSkillSubchapter(""); }} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">Tous les chapitres</option>{skillChapters.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sous-chapitre</span><select value={skillSubchapter} onChange={(event) => setSkillSubchapter(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">Tous les sous-chapitres</option>{skillSubchapters.map((subchapter) => <option key={subchapter} value={subchapter}>{subchapter}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Niveau requis</span><select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">Tous les niveaux</option>{[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>N{level} / 4</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Importance</span><select value={skillImportance} onChange={(event) => setSkillImportance(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"><option value="">Toutes les importances</option><option value="critical">Critique</option><option value="required">Requise</option><option value="useful">Utile</option></select></label></div></HrSectionCard>}
    {tab === "team" && <div className="space-y-5"><div className="flex justify-end"><button type="button" onClick={() => setSkillsEditing(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />Définir les besoins de compétences</button></div><HrChartCard title="Radar compétences besoin / équipe" description="Écart entre niveaux requis par le projet et couverture disponible dans l’équipe." exportConfig={{ type: "radar", data: skillRadar, nameKey: "name", series: [{ key: "besoin", label: "Besoin", color: colors.rose }, { key: "équipe", label: "Équipe", color: colors.emerald }] }}><ResponsiveContainer width="100%" height={300}><RadarChart data={skillRadar}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="besoin" name="Besoin" stroke={colors.rose} fill={colors.rose} fillOpacity={0.14} /><Radar dataKey="équipe" name="Équipe" stroke={colors.emerald} fill={colors.emerald} fillOpacity={0.16} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></HrChartCard><ProjectTable title="Équipe et plan de charge" description="Affectations, rôles, charges, coûts et rattachement aux tâches du projet." icon={Users} rows={data.assignments} columns={[{ label: "Ressource", value: (row) => row.resource_name }, { label: "Rôle", value: (row) => row.assignment_role }, { label: "Tâche", value: (row) => row.task_name }, { label: "Début", value: (row) => formatDate(row.start_date) }, { label: "Fin", value: (row) => formatDate(row.end_date) }, { label: "Allocation", value: (row) => percent(Number(row.allocation_percent || 0) * 100) }, { label: "Charge prévue", value: (row) => `${Number(row.planned_hours || 0)} h` }, { label: "Charge réelle", value: (row) => `${Number(row.actual_hours || 0)} h` }]} /><ProjectTable title="Besoins en compétences" description="Exigences projet reliées à la bibliothèque RH, avec fonctionnement autonome si le module RH n’est pas souscrit." icon={Network} rows={data.skills} columns={[{ label: "Compétence", value: (row) => row.skill_name }, { label: "Niveau requis", value: (row) => `${row.required_level}/4` }, { label: "Importance", value: (row) => <BusinessBadge value={row.importance === "critical" ? "high" : row.importance === "required" ? "medium" : "low"} kind="priority" /> }, { label: "Effectif minimum", value: (row) => row.minimum_people }, { label: "Couverture", value: (row) => percent(row.coverage_percent) }, { label: "Charge", value: (row) => `${Number(row.planned_hours || 0)} h` }, { label: "Justification", value: (row) => row.justification || "—" }]} /></div>}
    {tab === "quality" && <ProjectAuditArrow themes={data.auditThemes} questions={data.auditQuestions} audits={data.projectAudits} responses={data.auditResponses} />}
    {tab === "quality" && <div className="space-y-5">
      <RiskMatrix risks={data.risks} />
      <ProjectTable title="Livrables et critères d’acceptation" description="Baseline, replanification, livraison, acceptation, preuve et bon du premier coup." icon={FileCheck2} rows={scopedDeliverables} columns={[{ label: "Livrable", value: (row) => `${row.code} · ${row.name}` }, { label: "Planifié", value: (row) => formatDate(row.planned_date) }, { label: "Replanifié", value: (row) => formatDate(row.replanned_date) }, { label: "Livré", value: (row) => formatDate(row.actual_delivery_date) }, { label: "Statut", value: (row) => <HrStatusBadge status={row.status} /> }, { label: "Premier coup", value: (row) => row.first_time_right == null ? "—" : row.first_time_right ? "Oui" : "Non" }, { label: "Critères", value: (row) => row.acceptance_criteria || "—" }]} />
      <ProjectTable title="Registre des risques" description="Criticité, impact financier valorisé, stratégie et plan d’action synchronisé." icon={AlertTriangle} rows={scopedRisks} columns={[{ label: "Risque", value: (row) => `${row.code} · ${row.title}` }, { label: "Criticité", value: (row) => { const level = riskCriticality(row); return <HrStatusBadge status={level.status} label={level.label} />; } }, { label: "Impact valorisé", value: (row) => { const level = riskCriticality(row); return money((Number(row.revenue_impact_amount || 0) + Number(row.cost_impact_amount || 0)) * level.factor); } }, { label: "Stratégie", value: (row) => <BusinessBadge value={row.response_strategy} kind="strategy" /> }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Prochaine revue", value: (row) => formatDate(row.review_date) }, { label: "Plan", value: (row) => row.mitigation_plan || "—" }, { label: "Statut de l’action", value: (row) => { const action = data.actions.find((item: AnyRow) => String(item.origin_reference || item.source_reference) === String(row.code)); return <HrStatusBadge status={action?.status || "planned"} label={frenchValue(action?.status || "open")} />; } }]} />
      <ProjectTable title="Qualité et efficacité" description="Décisions, actions correctives, preuves et contrôle d’efficacité ISO 9001." icon={CheckCircle2} rows={scopedActions.filter((row: AnyRow) => ["quality", "risk", "nonconformity", "audit"].includes(String(row.origin_type || row.source_module || row.action_type)))} columns={[{ label: "Action", value: (row) => `${row.code} · ${row.title}` }, { label: "Origine", value: (row) => <BusinessBadge value={row.origin_type || row.source_module || row.action_type} kind="origin" /> }, { label: "Résultat attendu", value: (row) => row.expected_result || "—" }, { label: "Efficacité", value: (row) => <BusinessBadge value={row.effectiveness_status || "pending"} kind="effectiveness" /> }, { label: "Résultat", value: (row) => row.actual_result || "À renseigner" }]} />
    </div>}
    {tab === "team" && <ProjectTable title="Écarts et plan de développement" description="Comparaison nominative du niveau réel de chaque ressource avec le besoin projet, preuves et plan d’action recommandé." icon={Target} rows={skillGapRows.filter((row: AnyRow) => row.gap > 0).sort((a: AnyRow, b: AnyRow) => String(a.chapter).localeCompare(String(b.chapter), "fr") || String(a.subchapter).localeCompare(String(b.subchapter), "fr") || String(a.skill_name).localeCompare(String(b.skill_name), "fr"))} columns={[{ label: "Ressource", value: (row) => row.resource_name }, { label: "Chapitre", value: (row) => row.chapter }, { label: "Sous-chapitre", value: (row) => row.subchapter }, { label: "Compétence", value: (row) => row.skill_name }, { label: "Niveau réel", value: (row) => row.current_level }, { label: "Besoin projet", value: (row) => row.required_level }, { label: "Écart", value: (row) => <HrStatusBadge status={row.gap >= 2 ? "blocked" : "in_progress"} label={`−${row.gap} niveau${row.gap > 1 ? "x" : ""}`} /> }, { label: "Preuve", value: (row) => row.evidence }, { label: "Plan recommandé", value: (row) => row.action }, { label: "Priorité", value: (row) => <BusinessBadge value={row.importance === "critical" ? "high" : row.gap >= 2 ? "high" : "medium"} kind="priority" /> }]} />}
    {tab === "quality" && <ProjectTable title="Audit et conformité projet" description="Statut des contrôles, décisions, preuves et traçabilité des mises à jour sensibles." icon={ClipboardCheck} rows={scopedAudit} columns={[{ label: "Date", value: (row) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created_at)) }, { label: "Objet contrôlé", value: (row) => frenchValue(row.entity_table) }, { label: "Action", value: (row) => frenchValue(row.action) }, { label: "Utilisateur", value: (row) => row.actor_user_id || "Système" }, { label: "Motif / preuve", value: (row) => row.reason || row.business_context || "—" }]} />}
    {tab === "quality" && <ProjectTable title="Référentiel et résultats détaillés de l’audit" description="Questions applicables, conformité, commentaires et preuves, classés selon les thèmes AVV et Delivery." icon={ClipboardCheck} rows={scopedAuditResponses.map((response: AnyRow) => { const question = data.auditQuestions.find((item: AnyRow) => item.id === response.question_id) || {}; const theme = data.auditThemes.find((item: AnyRow) => item.id === response.theme_id) || {}; return { ...response, question_code: question.code, question_text: question.question_text, theme_name: theme.name }; })} columns={[{ label: "Thème", value: (row) => row.theme_name }, { label: "Référence", value: (row) => row.question_code }, { label: "Question de contrôle", value: (row) => row.question_text }, { label: "Résultat", value: (row) => <HrStatusBadge status={row.answer === "yes" ? "completed" : row.answer === "no" ? "blocked" : "archived"} label={row.answer === "yes" ? "Conforme" : row.answer === "no" ? "Non conforme" : "Non applicable"} /> }, { label: "Score", value: (row) => row.score == null ? "—" : row.score + " %" }, { label: "Commentaire / preuve", value: (row) => row.comment || row.evidence_reference || "—" }]} />}
    {tab === "finance" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Valeur acquise et coûts cumulés" description="VP, VA et CR avec lecture CPI/SPI et prévision à terminaison." exportConfig={{ type: "line", data: financialSeries, nameKey: "month", series: [{ key: "pv", label: "VP", color: colors.indigo }, { key: "ev", label: "VA", color: colors.emerald }, { key: "ac", label: "CR", color: colors.rose }], unit: " €" }}><ResponsiveContainer width="100%" height={300}><LineChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line dataKey="pv" name="VP" stroke={colors.indigo} strokeWidth={3} /><Line dataKey="ev" name="VA" stroke={colors.emerald} strokeWidth={3} /><Line dataKey="ac" name="CR" stroke={colors.rose} strokeWidth={3} /></LineChart></ResponsiveContainer></HrChartCard><HrChartCard title="Production et facturation" description="Production, facturé et encaissement mensuels pour piloter FAE, PCA et trésorerie." exportConfig={{ type: "bar", data: financialSeries, nameKey: "month", series: [{ key: "production", label: "Production", color: colors.emerald }, { key: "billed", label: "Facturé", color: colors.indigo }] }}><ResponsiveContainer width="100%" height={300}><BarChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="production" name="Production" fill={colors.emerald} radius={[7, 7, 0, 0]} /><Bar dataKey="billed" name="Facturé" fill={colors.indigo} radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={CircleDollarSign} title="Synthèse financière et EVM" description="Indicateurs calculés depuis le journal mensuel, avec formules traçables et dénominateurs sécurisés."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="BAC" value={money(latestFinance.bac || project.ordered_budget || project.budget_amount)} accent="indigo" /><HrInfo label="CPI = VA / CR" value={Number(latestFinance.cpi || 0).toFixed(3)} accent={Number(latestFinance.cpi || 0) >= 1 ? "emerald" : "rose"} /><HrInfo label="SPI = VA / VP" value={Number(latestFinance.spi || 0).toFixed(3)} accent={Number(latestFinance.spi || 0) >= 1 ? "emerald" : "rose"} /><HrInfo label="EAC" value={money(latestFinance.estimate_at_completion)} accent="amber" /><HrInfo label="Écart coût = VA − CR" value={money(latestFinance.cost_variance)} /><HrInfo label="Écart délai = VA − VP" value={money(latestFinance.schedule_variance)} /><HrInfo label="FAE" value={money(latestFinance.fae)} accent="sky" /><HrInfo label="PCA" value={money(latestFinance.pca)} accent="amber" /></div></HrSectionCard><ProjectTable title="Historique satisfaction" description="Notes mensuelles par critère et actions d’amélioration client." icon={Activity} rows={scopedSatisfaction} columns={[{ label: "Mois", value: (row) => formatMonth(row.survey_month) }, { label: "Écoute", value: (row) => `${row.customer_listening_score}/5` }, { label: "Planification", value: (row) => `${row.planning_score}/5` }, { label: "Compétences", value: (row) => `${row.technical_skills_score}/5` }, { label: "Indicateurs", value: (row) => `${row.monitoring_score}/5` }, { label: "Risques", value: (row) => `${row.risk_management_score}/5` }, { label: "Global", value: (row) => `${Number(row.overall_score || 0).toFixed(1)}/5` }, { label: "Action", value: (row) => row.improvement_actions || "—" }]} /></div>}
    {tab === "finance" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Coûts, production et marge" description="Lecture mensuelle des coûts et de la production, complétée par la marge réelle en pourcentage." exportConfig={{ type: "bar", data: financialSeries, nameKey: "month", series: [{ key: "costs", label: "Coûts", color: colors.rose }, { key: "production", label: "Production", color: colors.emerald }, { key: "margin", label: "Marge", color: colors.indigo }] }}><ResponsiveContainer width="100%" height={300}><ComposedChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis yAxisId="amount" /><YAxis yAxisId="margin" orientation="right" unit=" %" /><Tooltip /><Legend /><Bar yAxisId="amount" dataKey="costs" name="Coûts" fill={colors.rose} /><Bar yAxisId="amount" dataKey="production" name="Production" fill={colors.emerald} /><Line yAxisId="margin" dataKey="margin" name="Marge (%)" stroke={colors.indigo} strokeWidth={3} /></ComposedChart></ResponsiveContainer></HrChartCard><HrChartCard title="Prévisionnel et réel — coûts et production" description="Comparaison des références prévues avec les montants réellement constatés pour anticiper les dérives." exportConfig={{ type: "bar", data: financialSeries, nameKey: "month", series: [{ key: "plannedCosts", label: "Coûts prévus", color: colors.sky }, { key: "costs", label: "Coûts réels", color: colors.rose }, { key: "plannedProduction", label: "Production prévue", color: colors.indigo }, { key: "production", label: "Production réelle", color: colors.emerald }] }}><ResponsiveContainer width="100%" height={300}><BarChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="plannedCosts" name="Coûts prévus" fill={colors.sky} /><Bar dataKey="costs" name="Coûts réels" fill={colors.rose} /><Bar dataKey="plannedProduction" name="Production prévue" fill={colors.indigo} /><Bar dataKey="production" name="Production réelle" fill={colors.emerald} /></BarChart></ResponsiveContainer></HrChartCard></div>}
    {tab === "finance" && <HrSectionCard icon={BarChart3} title="Définitions des indicateurs" description="Vocabulaire commun pour une lecture fiable des performances du projet."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="VP / PV" value="Valeur planifiée du travail prévu" accent="indigo" /><HrInfo label="VA / EV" value="Valeur acquise du travail réellement achevé" accent="emerald" /><HrInfo label="CR / AC" value="Coûts réels engagés" accent="rose" /><HrInfo label="SPI" value="VA ÷ VP · inférieur à 1 = retard" accent="amber" /><HrInfo label="CPI" value="VA ÷ CR · inférieur à 1 = dérive coût" accent="amber" /><HrInfo label="EAC" value="Prévision du coût total à terminaison" accent="sky" /><HrInfo label="OTD / OQD / DoD" value="Ponctualité, qualité au premier passage, profondeur de retard" accent="emerald" /><HrInfo label="TACE" value="Taux d’activité congés exclus" accent="indigo" /></div></HrSectionCard>}
    {taskEditing && <ProjectTaskEditDrawer task={taskEditing} organizationId={data.organization.id} employees={data.employees} tasks={data.tasks} dependencies={data.dependencies} onClose={() => setTaskEditing(null)} onSaved={() => void query.refetch()} />}
    {skillsEditing && <ProjectSkillRequirementsForm organizationId={data.organization.id} projectId={project.id} library={data.skillLibrary} initialRows={data.skills} onClose={() => setSkillsEditing(false)} onSaved={() => void query.refetch()} />}
  </div>;
}
