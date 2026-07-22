"use client";

import { use, useMemo, useState, type ComponentType } from "react";
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
  ShieldAlert,
  Target,
  Users,
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
  HrChartCard,
  HrInfo,
  HrMetricCard,
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
  ]);
  const results = [clients, employees, tasks, dependencies, milestones, actions, deliverables, risks, nonconformities, assignments, skills, financials, satisfaction, health, audit];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
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
    financials: financials.data || [],
    satisfaction: satisfaction.data || [],
    health: health.data || [],
    audit: audit.data || [],
  };
}

function ProjectTable({ columns, rows }: { columns: Array<{ label: string; value: (row: AnyRow) => any }>; rows: AnyRow[] }) {
  return (
    <div className="max-h-[252px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600">
      <table className="w-full min-w-[1280px] border-separate border-spacing-0 bg-white text-sm dark:bg-slate-700">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200">
          <tr>{columns.map((column, index) => <th key={column.label} className={`${index === 0 ? "sticky left-0 z-30" : ""} whitespace-nowrap border-b border-slate-200 bg-inherit px-4 py-3 text-left`}>{column.label}</th>)}</tr>
        </thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={row.id || rowIndex} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20">{columns.map((column, index) => <td key={column.label} className={`${index === 0 ? "sticky left-0 z-10 bg-white font-black dark:bg-slate-700" : ""} whitespace-nowrap border-b border-slate-100 px-4 py-3 dark:border-slate-600`}>{column.value(row)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function RiskMatrix({ risks }: { risks: AnyRow[] }) {
  return (
    <div className="grid grid-cols-[110px_repeat(4,minmax(70px,1fr))] gap-1 text-center text-[11px] font-black">
      <div />
      {[1, 2, 3, 4].map((impact) => <div key={impact} className="rounded-lg bg-slate-100 px-2 py-2 text-slate-600">Impact {impact}</div>)}
      {[4, 3, 2, 1].flatMap((probability) => [
        <div key={`p-${probability}`} className="flex items-center justify-center rounded-lg bg-slate-100 px-2 py-3 text-slate-600">Probabilité {probability}</div>,
        ...[1, 2, 3, 4].map((impact) => {
          const score = probability * impact;
          const items = risks.filter((risk) => Number(risk.probability) === probability && Number(risk.impact) === impact && !risk.archived_at);
          const tone = score >= 12 ? "bg-rose-200 text-rose-900" : score >= 8 ? "bg-amber-200 text-amber-900" : score >= 4 ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800";
          return <div key={`${probability}-${impact}`} className={`min-h-16 rounded-xl p-2 ${tone}`} title={items.map((item) => `${item.code} · ${item.title}`).join("\n")}><div className="text-base font-black">{score}</div>{items.length > 0 && <div className="mt-1 text-xs font-black">{items.length} risque{items.length > 1 ? "s" : ""}</div>}</div>;
        }),
      ])}
    </div>
  );
}

const auditExport: ExportColumn<AnyRow>[] = [
  { key: "date", label: "Date", value: (row) => row.created_at },
  { key: "entity", label: "Table", value: (row) => row.entity_table },
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
  const query = useQuery({ queryKey: ["project-detail", orgId, id], queryFn: () => loadProject(orgId, id) });
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">Chargement du cockpit projet…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger le projet : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const data = query.data;
  const project = data.project;
  const latestFinance = data.financials[data.financials.length - 1] || {};
  const latestHealth = data.health[data.health.length - 1] || {};
  const criticalRisks = data.risks.filter((risk: AnyRow) => Number(risk.inherent_score || Number(risk.probability) * Number(risk.impact)) >= 12 && !risk.archived_at).length;
  const lateDeliverables = data.deliverables.filter((row: AnyRow) => !["accepted", "cancelled"].includes(row.status) && (row.replanned_date || row.planned_date) < new Date().toISOString().slice(0, 10)).length;
  const financialSeries = data.financials.map((row: AnyRow) => ({ month: formatMonth(row.period_start), pv: Number(row.pv ?? row.planned_value ?? 0), ev: Number(row.ev ?? row.earned_value ?? 0), ac: Number(row.ac ?? row.actual_cost ?? 0), production: Number(row.production_amount || 0), billed: Number(row.invoiced_amount || 0) }));
  const satisfactionRadar = [
    ["Écoute client", "customer_listening_score"], ["Planification", "planning_score"], ["Compétences", "technical_skills_score"], ["Indicateurs", "monitoring_score"], ["Risques", "risk_management_score"],
  ].map(([name, key]) => ({ name, score: data.satisfaction.length ? data.satisfaction.reduce((sum: number, row: AnyRow) => sum + Number(row[key] || 0), 0) / data.satisfaction.length : 0 }));
  const skillRadar = data.skills.slice(0, 8).map((row: AnyRow) => ({
    name: row.skill_name,
    besoin: Number(row.required_level || 0),
    équipe: Number(row.team_average_level ?? (Number(row.required_level || 0) * Math.min(100, Number(row.coverage_percent || 0)) / 100)),
  }));
  const tabs: Array<{ key: TabKey; label: string; icon: ComponentType<{ className?: string }>; active: string }> = [
    { key: "cockpit", label: "Cockpit", icon: Gauge, active: "bg-indigo-600 text-white" },
    { key: "planning", label: "Planning & WBS", icon: CalendarDays, active: "bg-emerald-600 text-white" },
    { key: "team", label: "Équipe & compétences", icon: Users, active: "bg-amber-500 text-white" },
    { key: "quality", label: "Qualité", icon: ShieldAlert, active: "bg-rose-600 text-white" },
    { key: "finance", label: "Finance & performance", icon: CircleDollarSign, active: "bg-sky-600 text-white" },
  ];
  return <div className="space-y-6">
    <PageHeader title={`${project.code} · ${project.name}`} subtitle="Cockpit projet complet : exécution, charge, compétences, qualité, risques, finance, performance et décisions." actions={<><DataExportMenu data={data.audit} columns={auditExport} fileName={`onepilot_${project.code}_audit`} sheetName="Audit projet" disabled={!data.audit.length} /><button type="button" onClick={() => router.push(`/${encodeURIComponent(orgId)}/projects`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50"><ArrowLeft className="h-4 w-4" />Portefeuille</button></>} />
    <PageTutorial title="Guide de la page" description={`Piloter ${project.code} du cadrage à la clôture avec une lecture unique du réalisé, du reste à faire et des engagements.\nRelier planning, équipe, compétences, livrables, risques, qualité, valeur acquise, marge, facturation et satisfaction client.`} objectives={["Donner à la direction, au chef de projet et à l’équipe une source de vérité commune.", "Décider sur l’avancement physique, la charge, les coûts, les risques et la valeur client."]} steps={[{ title: "Cadrer", description: "Valider baseline, équipe, compétences, livrables, budget et gouvernance." }, { title: "Exécuter", description: "Mettre à jour tâches, reste à faire, temps, actions, risques et preuves." }, { title: "Arbitrer", description: "Traiter les écarts, replanifier avec traçabilité et sécuriser la marge." }]} analyses={[{ title: "Analyse intégrée", description: "Comparer VP, VA, CR, SPI, CPI, charge, capacité, OTD, OQD, DoD, risques et satisfaction." }]} recommendations={["Mesurer l’avancement sur le travail réellement achevé, jamais sur le seul temps écoulé.", "Baseliner toute modification engageante et conserver la preuve de décision.", "Relier les actions aux causes, responsables, échéances, résultats et contrôles d’efficacité."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Target} label="Avancement physique" value={percent(project.progress_percent)} description="Pondération du travail réellement terminé dans la WBS." accent="indigo" /><HrMetricCard icon={CircleDollarSign} label="Budget restant" value={money(Number(project.ordered_budget || project.budget_amount || latestFinance.bac || 0) - Number(project.consumed_budget || project.actual_cost || latestFinance.ac || 0))} description="Budget commandé moins coûts réels cumulés." accent="emerald" /><HrMetricCard icon={Gauge} label="SPI / CPI" value={`${Number(latestFinance.spi || latestHealth.spi || 0).toFixed(2)} / ${Number(latestFinance.cpi || latestHealth.cpi || 0).toFixed(2)}`} description="Indices délais et coûts issus de la valeur acquise." accent="amber" /><HrMetricCard icon={AlertTriangle} label="Points critiques" value={criticalRisks + lateDeliverables} description={`${criticalRisks} risque(s) critique(s), ${lateDeliverables} livrable(s) en retard.`} accent="rose" /></section>
    <HrSectionCard icon={BriefcaseBusiness} title="Identité et gouvernance" description="Données contractuelles, rattachement Commerce et responsabilités du projet."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Client" value={project.client_name} accent="sky" /><HrInfo label="Chef de projet" value={project.manager_name} accent="indigo" /><HrInfo label="Sponsor" value={project.sponsor_name} accent="amber" /><HrInfo label="Statut" value={<HrStatusBadge status={project.status} />} accent="emerald" /><HrInfo label="AVV / offre source" value={project.source_avv_reference || "Création autonome"} /><HrInfo label="Début" value={formatDate(project.start_date)} /><HrInfo label="Fin" value={formatDate(project.end_date)} /><HrInfo label="Santé" value={project.health_status || "À qualifier"} accent={project.health_status === "red" ? "rose" : project.health_status === "amber" ? "amber" : "emerald"} /></div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-700">{tabs.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-600"}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></div>

    {tab === "cockpit" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Courbe en S du projet" description="Valeur planifiée (VP), valeur acquise (VA) et coûts réels (CR) cumulés." exportConfig={{ type: "line", data: financialSeries, nameKey: "month", series: [{ key: "pv", label: "VP", color: colors.indigo }, { key: "ev", label: "VA", color: colors.emerald }, { key: "ac", label: "CR", color: colors.rose }], unit: " €" }}><ResponsiveContainer width="100%" height={300}><LineChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="pv" name="VP" stroke={colors.indigo} strokeWidth={3} /><Line type="monotone" dataKey="ev" name="VA" stroke={colors.emerald} strokeWidth={3} /><Line type="monotone" dataKey="ac" name="CR" stroke={colors.rose} strokeWidth={3} /></LineChart></ResponsiveContainer></HrChartCard><HrChartCard title="Radar de satisfaction client" description="Écoute, planification, compétences, reporting et gestion des risques sur 5." exportConfig={{ type: "radar", data: satisfactionRadar, nameKey: "name", series: [{ key: "score", label: "Satisfaction", color: colors.sky }], unit: "/5" }}><ResponsiveContainer width="100%" height={300}><RadarChart data={satisfactionRadar}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="score" name="Satisfaction" stroke={colors.sky} fill={colors.sky} fillOpacity={0.25} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={ListChecks} title="Décisions et actions prioritaires" description="Actions ouvertes, bloquées ou en retard qui conditionnent les engagements."><ProjectTable rows={data.actions.filter((row: AnyRow) => !["closed", "done", "archived"].includes(row.status))} columns={[{ label: "Action", value: (row) => `${row.code} · ${row.title}` }, { label: "Origine", value: (row) => row.origin_type || row.source_module || row.action_type }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Échéance", value: (row) => formatDate(row.replanned_due_date || row.rescheduled_due_date || row.due_date) }, { label: "Priorité", value: (row) => row.priority }, { label: "Avancement", value: (row) => percent(row.progress_percent) }]} /></HrSectionCard><HrSectionCard icon={FileCheck2} title="Prochains jalons et livrables" description="Échéances contractuelles et qualité à sécuriser dans les prochaines semaines."><ProjectTable rows={[...data.milestones, ...data.deliverables].sort((a: AnyRow, b: AnyRow) => String(a.forecast_date || a.replanned_date || a.planned_date).localeCompare(String(b.forecast_date || b.replanned_date || b.planned_date))).slice(0, 12)} columns={[{ label: "Objet", value: (row) => `${row.code} · ${row.name}` }, { label: "Type", value: (row) => row.milestone_type || row.deliverable_type }, { label: "Date", value: (row) => formatDate(row.forecast_date || row.replanned_date || row.planned_date) }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Statut", value: (row) => <HrStatusBadge status={row.status} /> }]} /></HrSectionCard></div>}
    {tab === "cockpit" && <HrSectionCard icon={Gauge} title="Santé synthétique du projet" description="Lecture homogène planning, ressources, budget, risques, qualité et satisfaction avec seuils de décision."><ProjectHealthTable projects={[{ ...project, ...latestHealth, ...latestFinance, critical_risks: criticalRisks, late_deliverables: lateDeliverables, satisfaction_score: data.satisfaction.at(-1)?.overall_score }]} /></HrSectionCard>}
    {tab === "planning" && <ProjectGanttBoard tasks={data.tasks} dependencies={data.dependencies} employeeMap={data.employeeMap} onEditTask={setTaskEditing} />}
    {tab === "team" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Radar compétences besoin / équipe" description="Écart entre niveaux requis par le projet et couverture disponible dans l’équipe." exportConfig={{ type: "radar", data: skillRadar, nameKey: "name", series: [{ key: "besoin", label: "Besoin", color: colors.rose }, { key: "équipe", label: "Équipe", color: colors.emerald }] }}><ResponsiveContainer width="100%" height={300}><RadarChart data={skillRadar}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="besoin" name="Besoin" stroke={colors.rose} fill={colors.rose} fillOpacity={0.14} /><Radar dataKey="équipe" name="Équipe" stroke={colors.emerald} fill={colors.emerald} fillOpacity={0.16} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={Users} title="Équipe et plan de charge" description="Affectations, rôles, charges, coûts et rattachement aux tâches du projet."><ProjectTable rows={data.assignments} columns={[{ label: "Ressource", value: (row) => row.resource_name }, { label: "Rôle", value: (row) => row.assignment_role }, { label: "Tâche", value: (row) => row.task_name }, { label: "Début", value: (row) => formatDate(row.start_date) }, { label: "Fin", value: (row) => formatDate(row.end_date) }, { label: "Allocation", value: (row) => percent(Number(row.allocation_percent || 0) * 100) }, { label: "Charge prévue", value: (row) => `${Number(row.planned_hours || 0)} h` }, { label: "Charge réelle", value: (row) => `${Number(row.actual_hours || 0)} h` }]} /></HrSectionCard><HrSectionCard icon={Network} title="Besoins en compétences" description="Exigences projet reliées à la bibliothèque RH, avec fallback autonome si RH n’est pas souscrit."><ProjectTable rows={data.skills} columns={[{ label: "Compétence", value: (row) => row.skill_name }, { label: "Niveau requis", value: (row) => `${row.required_level}/4` }, { label: "Importance", value: (row) => row.importance }, { label: "Effectif minimum", value: (row) => row.minimum_people }, { label: "Couverture", value: (row) => percent(row.coverage_percent) }, { label: "Charge", value: (row) => `${Number(row.planned_hours || 0)} h` }, { label: "Justification", value: (row) => row.justification || "—" }]} /></HrSectionCard></div>}
    {tab === "quality" && <div className="grid gap-5 xl:grid-cols-2"><HrSectionCard icon={ShieldAlert} title="Matrice des risques 4 × 4" description="Probabilité × impact, exposition brute et plans de réduction par projet."><RiskMatrix risks={data.risks} /></HrSectionCard><HrSectionCard icon={FileCheck2} title="Livrables et critères d’acceptation" description="Baseline, replanification, livraison, acceptation, preuve et bon du premier coup."><ProjectTable rows={data.deliverables} columns={[{ label: "Livrable", value: (row) => `${row.code} · ${row.name}` }, { label: "Planifié", value: (row) => formatDate(row.planned_date) }, { label: "Replanifié", value: (row) => formatDate(row.replanned_date) }, { label: "Livré", value: (row) => formatDate(row.actual_delivery_date) }, { label: "Statut", value: (row) => <HrStatusBadge status={row.status} /> }, { label: "Premier coup", value: (row) => row.first_time_right == null ? "—" : row.first_time_right ? "Oui" : "Non" }, { label: "Critères", value: (row) => row.acceptance_criteria || "—" }]} /></HrSectionCard><HrSectionCard icon={AlertTriangle} title="Registre des risques" description="Exposition, réponse, responsabilité, échéance, revue et tendance."><ProjectTable rows={data.risks} columns={[{ label: "Risque", value: (row) => `${row.code} · ${row.title}` }, { label: "P × I", value: (row) => `${row.probability} × ${row.impact} = ${row.inherent_score || row.probability * row.impact}` }, { label: "Exposition", value: (row) => money(Number(row.revenue_impact_amount || 0) + Number(row.cost_impact_amount || 0)) }, { label: "Stratégie", value: (row) => row.response_strategy }, { label: "Responsable", value: (row) => row.owner_name }, { label: "Prochaine revue", value: (row) => formatDate(row.review_date) }, { label: "Plan", value: (row) => row.mitigation_plan || "—" }]} /></HrSectionCard><HrSectionCard icon={CheckCircle2} title="Qualité et efficacité" description="Décisions, actions correctives, preuves et contrôle d’efficacité ISO 9001."><ProjectTable rows={data.actions.filter((row: AnyRow) => ["quality", "risk", "nonconformity", "audit"].includes(String(row.origin_type || row.source_module || row.action_type)))} columns={[{ label: "Action", value: (row) => `${row.code} · ${row.title}` }, { label: "Origine", value: (row) => row.origin_reference || row.source_reference || row.origin_type }, { label: "Résultat attendu", value: (row) => row.expected_result || "—" }, { label: "Efficacité", value: (row) => row.effectiveness_status || "À évaluer" }, { label: "Résultat", value: (row) => row.actual_result || "À renseigner" }]} /></HrSectionCard></div>}
    {tab === "team" && <HrSectionCard icon={Target} title="Écarts et plan de développement" description="Compétences sous le niveau requis, ressources à accompagner et formations recommandées."><ProjectTable rows={data.skills.filter((row: AnyRow) => Number(row.coverage_percent || 0) < 100)} columns={[{ label: "Compétence", value: (row) => row.skill_name }, { label: "Niveau requis", value: (row) => `${row.required_level}/4` }, { label: "Couverture actuelle", value: (row) => percent(row.coverage_percent) }, { label: "Écart", value: (row) => `${Math.max(0, 100 - Number(row.coverage_percent || 0))} %` }, { label: "Plan recommandé", value: (row) => Number(row.coverage_percent || 0) < 50 ? "Formation certifiante et tutorat projet" : "Accompagnement ciblé et mise en situation" }, { label: "Priorité", value: (row) => row.importance === "critical" ? "Haute" : "Moyenne" }]} /></HrSectionCard>}
    {tab === "quality" && <HrSectionCard icon={ClipboardCheck} title="Audit et conformité projet" description="Statut des contrôles, décisions, preuves et traçabilité des mises à jour sensibles."><ProjectTable rows={data.audit} columns={[{ label: "Date", value: (row) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.created_at)) }, { label: "Objet contrôlé", value: (row) => row.entity_table }, { label: "Action", value: (row) => row.action }, { label: "Utilisateur", value: (row) => row.actor_user_id || "Système" }, { label: "Motif / preuve", value: (row) => row.reason || row.business_context || "—" }]} /></HrSectionCard>}
    {tab === "finance" && <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Valeur acquise et coûts cumulés" description="VP, VA et CR avec lecture CPI/SPI et prévision à terminaison." exportConfig={{ type: "line", data: financialSeries, nameKey: "month", series: [{ key: "pv", label: "VP", color: colors.indigo }, { key: "ev", label: "VA", color: colors.emerald }, { key: "ac", label: "CR", color: colors.rose }], unit: " €" }}><ResponsiveContainer width="100%" height={300}><LineChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line dataKey="pv" name="VP" stroke={colors.indigo} strokeWidth={3} /><Line dataKey="ev" name="VA" stroke={colors.emerald} strokeWidth={3} /><Line dataKey="ac" name="CR" stroke={colors.rose} strokeWidth={3} /></LineChart></ResponsiveContainer></HrChartCard><HrChartCard title="Production et facturation" description="Production, facturé et encaissement mensuels pour piloter FAE, PCA et trésorerie." exportConfig={{ type: "bar", data: financialSeries, nameKey: "month", series: [{ key: "production", label: "Production", color: colors.emerald }, { key: "billed", label: "Facturé", color: colors.indigo }] }}><ResponsiveContainer width="100%" height={300}><BarChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="production" name="Production" fill={colors.emerald} radius={[7, 7, 0, 0]} /><Bar dataKey="billed" name="Facturé" fill={colors.indigo} radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={CircleDollarSign} title="Synthèse financière et EVM" description="Indicateurs calculés depuis le journal mensuel, avec formules traçables et dénominateurs sécurisés."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="BAC" value={money(latestFinance.bac || project.ordered_budget || project.budget_amount)} accent="indigo" /><HrInfo label="CPI = VA / CR" value={Number(latestFinance.cpi || 0).toFixed(3)} accent={Number(latestFinance.cpi || 0) >= 1 ? "emerald" : "rose"} /><HrInfo label="SPI = VA / VP" value={Number(latestFinance.spi || 0).toFixed(3)} accent={Number(latestFinance.spi || 0) >= 1 ? "emerald" : "rose"} /><HrInfo label="EAC" value={money(latestFinance.estimate_at_completion)} accent="amber" /><HrInfo label="Écart coût = VA − CR" value={money(latestFinance.cost_variance)} /><HrInfo label="Écart délai = VA − VP" value={money(latestFinance.schedule_variance)} /><HrInfo label="FAE" value={money(latestFinance.fae)} accent="sky" /><HrInfo label="PCA" value={money(latestFinance.pca)} accent="amber" /></div></HrSectionCard><HrSectionCard icon={Activity} title="Historique satisfaction" description="Notes mensuelles par critère et actions d’amélioration client."><ProjectTable rows={data.satisfaction} columns={[{ label: "Mois", value: (row) => formatMonth(row.survey_month) }, { label: "Écoute", value: (row) => `${row.customer_listening_score}/5` }, { label: "Planification", value: (row) => `${row.planning_score}/5` }, { label: "Compétences", value: (row) => `${row.technical_skills_score}/5` }, { label: "Indicateurs", value: (row) => `${row.monitoring_score}/5` }, { label: "Risques", value: (row) => `${row.risk_management_score}/5` }, { label: "Global", value: (row) => `${Number(row.overall_score || 0).toFixed(1)}/5` }, { label: "Action", value: (row) => row.improvement_actions || "—" }]} /></HrSectionCard></div>}
    {tab === "finance" && <HrSectionCard icon={BarChart3} title="Définitions des indicateurs" description="Vocabulaire commun pour une lecture fiable des performances du projet."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="VP / PV" value="Valeur planifiée du travail prévu" accent="indigo" /><HrInfo label="VA / EV" value="Valeur acquise du travail réellement achevé" accent="emerald" /><HrInfo label="CR / AC" value="Coûts réels engagés" accent="rose" /><HrInfo label="SPI" value="VA ÷ VP · inférieur à 1 = retard" accent="amber" /><HrInfo label="CPI" value="VA ÷ CR · inférieur à 1 = dérive coût" accent="amber" /><HrInfo label="EAC" value="Prévision du coût total à terminaison" accent="sky" /><HrInfo label="OTD / OQD / DoD" value="Ponctualité, qualité au premier passage, profondeur de retard" accent="emerald" /><HrInfo label="TACE" value="Taux d’activité congés exclus" accent="indigo" /></div></HrSectionCard>}
    {taskEditing && <ProjectTaskEditDrawer task={taskEditing} organizationId={data.organization.id} employees={data.employees} tasks={data.tasks} dependencies={data.dependencies} onClose={() => setTaskEditing(null)} onSaved={() => void query.refetch()} />}
  </div>;
}
