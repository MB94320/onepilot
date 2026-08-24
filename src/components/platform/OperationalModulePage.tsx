"use client";

import { use, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Bell, CheckCircle2, ClipboardCheck, Euro, Plus, Search, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  HrActionMenu,
  HrChartCard,
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
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type QualityMode = "quality" | "risks" | "deliverables" | "nonconformities" | "audits";
type FinanceMode = "finance" | "margins" | "billing" | "cash" | "collections" | "expenses";
export type OperationalMode = QualityMode | FinanceMode;
type Tab = "pilotage" | "analyses" | "alerts";
type Column = { key: string; label: string; value: (row: AnyRow) => ReactNode; raw: (row: AnyRow) => unknown; width?: string };

const supabase = createClient();
const isFinance = (mode: OperationalMode) => ["finance", "margins", "billing", "cash", "collections", "expenses"].includes(mode);
const configs: Record<OperationalMode, { title: string; subtitle: string; singular: string; table?: string; prefix?: string }> = {
  quality: { title: "Qualité & risques", subtitle: "Pilotez les risques, livrables, non-conformités et audits dans un registre transverse unique.", singular: "élément qualité" },
  risks: { title: "Registre des risques", subtitle: "Identifiez, valorisez et traitez les menaces et opportunités projet ou transverses.", singular: "risque", table: "project_risks", prefix: "RIS" },
  deliverables: { title: "Livrables", subtitle: "Suivez les engagements, leur acceptation, leur ponctualité et leur conformité du premier coup.", singular: "livrable", table: "project_deliverables", prefix: "LIV" },
  nonconformities: { title: "Non-conformités", subtitle: "Centralisez les écarts, causes racines, corrections, preuves et contrôles d’efficacité.", singular: "non-conformité", table: "project_nonconformities", prefix: "NC" },
  audits: { title: "Audits", subtitle: "Planifiez les audits AVV et Delivery, mesurez la conformité et suivez les décisions.", singular: "audit", table: "project_audits", prefix: "AUD" },
  finance: { title: "Finance", subtitle: "Réconciliez valeur planifiée, valeur acquise, coûts, production, facturation et encaissement.", singular: "période financière", table: "project_financial_periods" },
  margins: { title: "Marges", subtitle: "Analysez les marges prévisionnelles et réelles, leurs écarts et leurs causes.", singular: "période financière", table: "project_financial_periods" },
  billing: { title: "Facturation", subtitle: "Pilotez production, bons de livraison, autorisations de facturation et factures.", singular: "période de facturation", table: "project_financial_periods" },
  cash: { title: "Trésorerie", subtitle: "Suivez facturation, encaissements, décaissements et besoin de trésorerie.", singular: "flux financier", table: "project_financial_periods" },
  collections: { title: "Relances & recouvrement", subtitle: "Priorisez les encours, retards de paiement et actions de recouvrement.", singular: "encours", table: "project_financial_periods" },
  expenses: { title: "Notes de frais", subtitle: "Contrôlez les dépenses, justificatifs et rattachements analytiques projet.", singular: "dépense", table: "project_financial_periods" },
};

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = (value: unknown) => String(value ?? "").trim();
const euro = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(number(value));
const percent = (value: unknown) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(number(value))} %`;
const date = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—";
const month = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—";
const projectLabel = (row: AnyRow) => row.project_code ? `${row.project_code} · ${row.project_name}` : "Dossier transverse";

function frenchStatus(value: unknown) {
  const key = text(value).toLowerCase();
  return ({ planned: "Planifié", open: "Ouvert", active: "En cours", in_progress: "En cours", pending: "En attente", review: "En revue", delivered: "Livré", accepted: "Accepté", completed: "Clos", closed: "Clos", done: "Clos", blocked: "Bloqué", cancelled: "Annulé", archived: "Archivé", rejected: "Refusé", conform: "Conforme", non_conform: "Non conforme" } as Record<string, string>)[key] || (value ? text(value) : "Ouvert");
}
function tone(value: unknown) {
  const key = frenchStatus(value).toLowerCase();
  if (["clos", "livré", "accepté", "conforme"].some((item) => key.includes(item))) return "completed";
  if (["en cours", "en revue"].some((item) => key.includes(item))) return "in_progress";
  if (["bloqué", "refusé", "non conforme", "retard"].some((item) => key.includes(item))) return "blocked";
  if (["annulé", "archivé"].some((item) => key.includes(item))) return "archived";
  return "planned";
}
function riskLevel(score: number) { return score >= 12 ? "Inacceptable" : score >= 8 ? "Critique" : score >= 4 ? "Significatif" : "Négligeable"; }
function severity(value: unknown) { return ({ minor: "Mineure", major: "Majeure", critical: "Critique", observation: "Observation" } as Record<string, string>)[text(value).toLowerCase()] || text(value) || "Mineure"; }
function strategy(value: unknown) { return ({ mitigate: "Réduire", avoid: "Éviter", transfer: "Transférer", accept: "Accepter", exploit: "Exploiter" } as Record<string, string>)[text(value).toLowerCase()] || text(value) || "À définir"; }

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadOperational(orgId: string, mode: OperationalMode) {
  const organization = await resolveOrganization(orgId);
  const projectResult = await (supabase.from("project_projects" as never) as any).select("id,code,name,status").eq("organization_id", organization.id).order("code");
  if (projectResult.error) throw new Error(projectResult.error.message);
  const projects: AnyRow[] = projectResult.data || [];
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const read = async (table: string) => {
    const result = await (supabase.from(table as never) as any).select("*").eq("organization_id", organization.id).is("archived_at", null).order("created_at", { ascending: false }).limit(1000);
    if (result.error) throw new Error(result.error.message);
    return (result.data || []).map((row: AnyRow) => ({ ...row, project_code: projectMap.get(row.project_id)?.code, project_name: projectMap.get(row.project_id)?.name }));
  };
  if (mode === "quality") {
    const [risks, deliverables, nonconformities, audits] = await Promise.all([read("project_risks"), read("project_deliverables"), read("project_nonconformities"), read("project_audits")]);
    return { organization, projects, rows: [
      ...risks.map((row: AnyRow) => ({ ...row, entity_type: "Risque", display_code: row.code, display_name: row.title })),
      ...deliverables.map((row: AnyRow) => ({ ...row, entity_type: "Livrable", display_code: row.code, display_name: row.name })),
      ...nonconformities.map((row: AnyRow) => ({ ...row, entity_type: "Non-conformité", display_code: row.code, display_name: row.title })),
      ...audits.map((row: AnyRow) => ({ ...row, entity_type: "Audit", display_code: row.audit_number, display_name: row.decision || row.audit_type })),
    ] };
  }
  const rows = configs[mode].table ? await read(configs[mode].table!) : [];
  return { organization, projects, rows };
}

function columnsFor(mode: OperationalMode): Column[] {
  const badge = (value: unknown) => <HrStatusBadge status={tone(value)} label={frenchStatus(value)} />;
  const commonProject: Column = { key: "project", label: "Projet", value: projectLabel, raw: projectLabel, width: "min-w-60" };
  if (mode === "quality") return [
    { key: "type", label: "Type", value: (row) => row.entity_type, raw: (row) => row.entity_type },
    { key: "code", label: "Référence", value: (row) => row.display_code || "—", raw: (row) => row.display_code || "—" }, commonProject,
    { key: "name", label: "Désignation", value: (row) => row.display_name || "—", raw: (row) => row.display_name || "—", width: "min-w-72" },
    { key: "status", label: "Statut", value: (row) => badge(row.status), raw: (row) => frenchStatus(row.status) },
    { key: "owner", label: "Responsable", value: (row) => row.owner_name || row.auditor_name || "Non affecté", raw: (row) => row.owner_name || row.auditor_name || "Non affecté" },
    { key: "date", label: "Échéance / revue", value: (row) => date(row.review_date || row.planned_date || row.due_date || row.audit_date), raw: (row) => date(row.review_date || row.planned_date || row.due_date || row.audit_date) },
  ];
  if (mode === "risks") return [
    { key: "code", label: "N° risque", value: (row) => row.code, raw: (row) => row.code }, commonProject,
    { key: "title", label: "Risque", value: (row) => row.title, raw: (row) => row.title, width: "min-w-72" },
    { key: "probability", label: "Probabilité", value: (row) => row.probability, raw: (row) => row.probability },
    { key: "impact", label: "Impact", value: (row) => row.impact, raw: (row) => row.impact },
    { key: "criticality", label: "Criticité", value: (row) => <HrStatusBadge status={number(row.inherent_score) >= 8 ? "blocked" : number(row.inherent_score) >= 4 ? "in_progress" : "completed"} label={riskLevel(number(row.inherent_score || number(row.probability) * number(row.impact)))} />, raw: (row) => riskLevel(number(row.inherent_score || number(row.probability) * number(row.impact))) },
    { key: "value", label: "Impact valorisé", value: (row) => euro(number(row.revenue_impact_amount) + number(row.cost_impact_amount)), raw: (row) => number(row.revenue_impact_amount) + number(row.cost_impact_amount) },
    { key: "strategy", label: "Stratégie", value: (row) => strategy(row.response_strategy), raw: (row) => strategy(row.response_strategy) },
    { key: "owner", label: "Responsable", value: (row) => row.owner_name || "Non affecté", raw: (row) => row.owner_name || "Non affecté" },
    { key: "status", label: "Statut", value: (row) => badge(row.status), raw: (row) => frenchStatus(row.status) },
    { key: "review", label: "Prochaine revue", value: (row) => date(row.review_date), raw: (row) => date(row.review_date) },
  ];
  if (mode === "deliverables") return [
    { key: "code", label: "N° livrable", value: (row) => row.code, raw: (row) => row.code }, commonProject,
    { key: "name", label: "Livrable", value: (row) => row.name, raw: (row) => row.name, width: "min-w-72" },
    { key: "owner", label: "Responsable", value: (row) => row.owner_name || "Non affecté", raw: (row) => row.owner_name || "Non affecté" },
    { key: "planned", label: "Date planifiée", value: (row) => date(row.planned_date), raw: (row) => date(row.planned_date) },
    { key: "forecast", label: "Date replanifiée", value: (row) => date(row.replanned_date), raw: (row) => date(row.replanned_date) },
    { key: "actual", label: "Date réelle", value: (row) => date(row.actual_delivery_date), raw: (row) => date(row.actual_delivery_date) },
    { key: "status", label: "Statut", value: (row) => badge(row.status), raw: (row) => frenchStatus(row.status) },
    { key: "quality", label: "Qualité", value: (row) => <HrStatusBadge status={row.first_time_right ? "completed" : row.first_time_right === false ? "blocked" : "planned"} label={row.first_time_right ? "Bon du premier coup" : row.first_time_right === false ? "Reprise nécessaire" : "À évaluer"} />, raw: (row) => row.first_time_right ? "Bon du premier coup" : row.first_time_right === false ? "Reprise nécessaire" : "À évaluer" },
  ];
  if (mode === "nonconformities") return [
    { key: "code", label: "N° non-conformité", value: (row) => row.code, raw: (row) => row.code }, commonProject,
    { key: "title", label: "Non-conformité", value: (row) => row.title, raw: (row) => row.title, width: "min-w-72" },
    { key: "severity", label: "Gravité", value: (row) => <HrStatusBadge status={text(row.severity) === "critical" ? "blocked" : text(row.severity) === "major" ? "in_progress" : "planned"} label={severity(row.severity)} />, raw: (row) => severity(row.severity) },
    { key: "detected", label: "Détectée le", value: (row) => date(row.detected_at), raw: (row) => date(row.detected_at) },
    { key: "due", label: "Échéance", value: (row) => date(row.due_date), raw: (row) => date(row.due_date) },
    { key: "owner", label: "Responsable", value: (row) => row.owner_name || "Non affecté", raw: (row) => row.owner_name || "Non affecté" },
    { key: "recurrence", label: "Récurrence", value: (row) => row.recurrence_count || 0, raw: (row) => row.recurrence_count || 0 },
    { key: "effectiveness", label: "Efficacité", value: (row) => row.effectiveness_status || "À vérifier", raw: (row) => row.effectiveness_status || "À vérifier" },
    { key: "status", label: "Statut", value: (row) => badge(row.status), raw: (row) => frenchStatus(row.status) },
  ];
  if (mode === "audits") return [
    { key: "code", label: "N° audit", value: (row) => row.audit_number, raw: (row) => row.audit_number }, commonProject,
    { key: "type", label: "Type", value: (row) => text(row.audit_type).toUpperCase(), raw: (row) => text(row.audit_type).toUpperCase() },
    { key: "date", label: "Date", value: (row) => date(row.audit_date), raw: (row) => date(row.audit_date) },
    { key: "auditor", label: "Auditeur", value: (row) => row.auditor_name || "Non affecté", raw: (row) => row.auditor_name || "Non affecté" },
    { key: "score", label: "Conformité", value: (row) => percent(row.overall_score), raw: (row) => number(row.overall_score) },
    { key: "previous", label: "Audit précédent", value: (row) => percent(row.previous_score), raw: (row) => number(row.previous_score) },
    { key: "decision", label: "Décision", value: (row) => row.decision || "À statuer", raw: (row) => row.decision || "À statuer" },
    { key: "status", label: "Statut", value: (row) => badge(row.status), raw: (row) => frenchStatus(row.status) },
  ];
  return [
    commonProject,
    { key: "period", label: "Période", value: (row) => `${date(row.period_start)} — ${date(row.period_end)}`, raw: (row) => `${date(row.period_start)} — ${date(row.period_end)}` },
    { key: "pv", label: "VP", value: (row) => euro(row.planned_value), raw: (row) => number(row.planned_value) },
    { key: "ev", label: "VA", value: (row) => euro(row.earned_value), raw: (row) => number(row.earned_value) },
    { key: "ac", label: "CR", value: (row) => euro(row.actual_cost), raw: (row) => number(row.actual_cost) },
    { key: "production", label: "Production", value: (row) => euro(row.production_amount), raw: (row) => number(row.production_amount) },
    { key: "invoiced", label: "Facturé", value: (row) => euro(row.invoiced_amount), raw: (row) => number(row.invoiced_amount) },
    { key: "collected", label: "Encaissé", value: (row) => euro(row.collected_amount), raw: (row) => number(row.collected_amount) },
    { key: "margin", label: "Marge réelle", value: (row) => percent(number(row.production_amount) ? ((number(row.production_amount) - number(row.actual_cost)) / number(row.production_amount)) * 100 : 0), raw: (row) => number(row.production_amount) ? ((number(row.production_amount) - number(row.actual_cost)) / number(row.production_amount)) * 100 : 0 },
    { key: "outstanding", label: "Encours", value: (row) => euro(row.outstanding_amount || Math.max(0, number(row.invoiced_amount) - number(row.collected_amount))), raw: (row) => number(row.outstanding_amount || Math.max(0, number(row.invoiced_amount) - number(row.collected_amount))) },
    { key: "reliability", label: "Fiabilité", value: (row) => percent(row.reporting_reliability_percent), raw: (row) => number(row.reporting_reliability_percent) },
  ];
}

const blankForm = () => ({ project_id: "", code: "", name: "", description: "", owner_name: "", status: "open", date1: "", date2: "", date3: "", probability: "1", impact: "1", amount1: "0", amount2: "0", amount3: "0", amount4: "0", amount5: "0", amount6: "0", amount7: "0", amount8: "0", amount9: "0", strategy: "mitigate", severity: "minor", quality_status: "pending", first_time_right: "", audit_type: "delivery", score: "", previous_score: "", decision: "", comment: "" });

export default function OperationalModulePage({ params, mode }: { params: Promise<{ orgId: string }>; mode: OperationalMode }) {
  const { orgId } = use(params);
  const page = configs[mode];
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["operational-module", orgId, mode], queryFn: () => loadOperational(orgId, mode) });
  const [tab, setTab] = useState<Tab>("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [form, setForm] = useState(blankForm());
  const tableRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = query.data?.rows || [];
  const columns = useMemo(() => columnsFor(mode), [mode]);
  const valueFor = (row: AnyRow, column: Column) => String(column.raw(row) ?? "—");
  const filteredRows = rows.filter((row) => {
    const haystack = columns.map((column) => valueFor(row, column)).join(" ").toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!project || row.project_id === project) && (!status || frenchStatus(row.status) === status) && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(valueFor(row, column)));
  });
  const filtersActive = Boolean(search || project || status || Object.values(columnFilters).some((values) => values.length));
  const statuses = [...new Set(rows.map((row) => frenchStatus(row.status)))].sort((a, b) => a.localeCompare(b, "fr"));
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column) => ({ key: column.key, label: column.label, value: (row) => valueFor(row, column) }));
  const resetFilters = () => { setSearch(""); setProject(""); setStatus(""); setColumnFilters({}); };

  const financialSeries = useMemo(() => {
    const map = new Map<string, AnyRow>();
    filteredRows.forEach((row) => { const key = String(row.period_start || "").slice(0, 7); if (!key) return; const current = map.get(key) || { key, month: month(row.period_start), pv: 0, ev: 0, ac: 0, production: 0, invoiced: 0, collected: 0 }; current.pv += number(row.planned_value); current.ev += number(row.earned_value); current.ac += number(row.actual_cost); current.production += number(row.production_amount); current.invoiced += number(row.invoiced_amount); current.collected += number(row.collected_amount); current.margin = current.production ? ((current.production - current.ac) / current.production) * 100 : 0; map.set(key, current); });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRows]);
  const monthlySeries = useMemo(() => {
    const map = new Map<string, AnyRow>();
    filteredRows.forEach((row) => { const source = row.audit_date || row.detected_at || row.planned_date || row.review_date || row.created_at; const key = String(source || "").slice(0, 7); if (!key) return; const current = map.get(key) || { key, month: month(source), total: 0, critical: 0 }; current.total += 1; if (tone(row.status) === "blocked" || number(row.inherent_score) >= 8 || row.severity === "critical") current.critical += 1; map.set(key, current); });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRows]);
  const deliverableSeries = useMemo(() => {
    const deliverables = filteredRows.filter((row) => mode === "deliverables" || row.entity_type === "Livrable");
    const map = new Map<string, AnyRow>();
    deliverables.forEach((row) => {
      const key = String(row.planned_date || "").slice(0, 7);
      if (!key) return;
      const current = map.get(key) || { key, month: month(row.planned_date), planned: 0, delivered: 0, onTime: 0, firstTime: 0, delay: 0 };
      current.planned += 1;
      if (row.actual_delivery_date) {
        current.delivered += 1;
        const target = row.replanned_date || row.planned_date;
        const delayDays = Math.max(0, Math.ceil((new Date(`${row.actual_delivery_date}T12:00:00`).getTime() - new Date(`${target}T12:00:00`).getTime()) / 86_400_000));
        current.delay += delayDays;
        if (delayDays === 0) current.onTime += 1;
        if (row.first_time_right) current.firstTime += 1;
      }
      current.otd = current.planned ? (current.delivered / current.planned) * 100 : 0;
      current.oqd = current.delivered ? (current.firstTime / current.delivered) * 100 : 0;
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRows, mode]);
  const auditSeries = useMemo(() => filteredRows
    .filter((row) => mode === "audits" || row.entity_type === "Audit")
    .slice()
    .sort((a, b) => String(a.audit_date || "").localeCompare(String(b.audit_date || "")))
    .map((row) => ({ date: date(row.audit_date), score: number(row.overall_score), previous: number(row.previous_score), project: row.project_code || "Dossier transverse" })), [filteredRows, mode]);

  const openForm = (row?: AnyRow) => {
    setEditing(row || {});
    setForm(row ? {
      project_id: row.project_id || "", code: row.code || row.audit_number || "", name: row.title || row.name || "", description: row.description || "", owner_name: row.owner_name || row.auditor_name || "", status: row.status || "open",
      date1: row.review_date || row.planned_date || row.detected_at || row.audit_date || row.period_start || "", date2: row.replanned_date || row.due_date || row.period_end || "", date3: row.actual_delivery_date || "",
      probability: String(row.probability || 1), impact: String(row.impact || 1), amount1: String(row.revenue_impact_amount || row.baseline_budget || 0), amount2: String(row.cost_impact_amount || row.planned_value || 0), amount3: String(row.schedule_impact_days || row.earned_value || 0), amount4: String(row.actual_cost || 0), amount5: String(row.production_amount || 0), amount6: String(row.invoiced_amount || 0), amount7: String(row.collected_amount || 0), amount8: String(row.outstanding_amount || 0), amount9: String(row.reporting_reliability_percent || 0),
      strategy: row.response_strategy || "mitigate", severity: row.severity || "minor", quality_status: row.quality_status || "pending", first_time_right: row.first_time_right == null ? "" : String(row.first_time_right), audit_type: row.audit_type || "delivery", score: String(row.overall_score ?? ""), previous_score: String(row.previous_score ?? ""), decision: row.decision || row.effectiveness_status || "", comment: row.comments || row.comment || row.mitigation_plan || row.acceptance_criteria || row.corrective_action || "",
    } : { ...blankForm(), status: mode === "audits" || mode === "deliverables" ? "planned" : "open" });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!page.table || !editing) return;
      if (!form.project_id) throw new Error("Sélectionnez un projet ou créez d’abord un dossier projet transverse.");
      const year = new Date().getFullYear();
      const generatedCode = form.code || `${page.prefix}-${year}-${String(rows.length + 1).padStart(4, "0")}`;
      let payload: AnyRow;
      if (mode === "risks") payload = { project_id: form.project_id, code: generatedCode, title: form.name, description: form.description, owner_name: form.owner_name, status: form.status, probability: number(form.probability), impact: number(form.impact), revenue_impact_amount: number(form.amount1), cost_impact_amount: number(form.amount2), schedule_impact_days: number(form.amount3), response_strategy: form.strategy, mitigation_plan: form.comment, review_date: form.date1 || null };
      else if (mode === "deliverables") payload = { project_id: form.project_id, code: generatedCode, name: form.name, description: form.description, owner_name: form.owner_name, status: form.status, quality_status: form.quality_status, planned_date: form.date1, replanned_date: form.date2 || null, actual_delivery_date: form.date3 || null, first_time_right: form.first_time_right === "" ? null : form.first_time_right === "true", acceptance_criteria: form.comment };
      else if (mode === "nonconformities") payload = { project_id: form.project_id, code: generatedCode, title: form.name, description: form.description, owner_name: form.owner_name, status: form.status, severity: form.severity, detected_at: form.date1 || new Date().toISOString().slice(0, 10), due_date: form.date2 || null, effectiveness_status: form.decision || null, corrective_action: form.comment };
      else if (mode === "audits") payload = { project_id: form.project_id, audit_number: generatedCode, audit_type: form.audit_type, audit_date: form.date1, auditor_name: form.owner_name, status: form.status, overall_score: form.score === "" ? null : number(form.score), previous_score: form.previous_score === "" ? null : number(form.previous_score), decision: form.decision || null, comments: form.comment };
      else payload = { project_id: form.project_id, period_start: form.date1, period_end: form.date2, baseline_budget: number(form.amount1), planned_value: number(form.amount2), earned_value: number(form.amount3), actual_cost: number(form.amount4), production_amount: number(form.amount5), invoiced_amount: number(form.amount6), collected_amount: number(form.amount7), outstanding_amount: number(form.amount8), reporting_reliability_percent: number(form.amount9), comment: form.comment };
      payload.organization_id = query.data!.organization.id;
      const request = editing.id ? (supabase.from(page.table as never) as any).update(payload).eq("id", editing.id) : (supabase.from(page.table as never) as any).insert(payload);
      const result = await request;
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: async () => { setEditing(null); setForm(blankForm()); await queryClient.invalidateQueries({ queryKey: ["operational-module", orgId, mode] }); },
  });
  const archiveMutation = useMutation({ mutationFn: async (row: AnyRow) => { if (!page.table) return; const result = await (supabase.from(page.table as never) as any).update({ archived_at: new Date().toISOString() }).eq("id", row.id); if (result.error) throw new Error(result.error.message); }, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["operational-module", orgId, mode] }) });

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">Chargement de {page.title.toLowerCase()}…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger la page : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  const mastered = filteredRows.filter((row) => tone(row.status) === "completed").length;
  const critical = filteredRows.filter((row) => tone(row.status) === "blocked" || number(row.inherent_score) >= 8 || row.severity === "critical").length;
  const unassigned = filteredRows.filter((row) => !row.owner_name && !row.auditor_name && !isFinance(mode)).length;
  const overdue = filteredRows.filter((row) => { const due = row.review_date || row.planned_date || row.due_date; return due && new Date(`${due}T23:59:59`) < new Date() && tone(row.status) !== "completed"; }).length;
  const alerts = [
    { label: "Éléments critiques", count: critical, impact: "Risque élevé de dérive, non-conformité ou perte financière.", action: "Nommer un responsable et sécuriser un plan daté avec preuve de clôture.", accent: "rose" as const },
    { label: "Échéances dépassées", count: overdue, impact: "Retard susceptible d’affecter les engagements client et la trajectoire.", action: "Arbitrer le reste à faire, replanifier et informer les parties prenantes.", accent: "amber" as const },
    { label: "Responsables manquants", count: unassigned, impact: "Élément sans propriétaire ni redevabilité opérationnelle.", action: "Affecter le bon rôle et une date de prochaine revue.", accent: "sky" as const },
    { label: "Éléments maîtrisés", count: mastered, impact: "Clôtures et conformités disponibles comme preuves.", action: "Capitaliser les causes de succès et les standards réutilisables.", accent: "emerald" as const },
  ];

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title={page.title} subtitle={page.subtitle} actions={<div className="flex items-center gap-2">{page.table && <button type="button" onClick={() => openForm()} className={hrSaveButtonClassName}><Plus className="h-4 w-4" />Nouveau {page.singular}</button>}<DataExportMenu data={filteredRows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={page.title} disabled={!filteredRows.length} /></div>} />
    <PageTutorial title="Guide de la page" description={`${page.subtitle}\nLes données sont partagées avec le portefeuille et les cockpits projets : une modification n’est saisie qu’une seule fois.`} objectives={["Piloter les écarts du portefeuille jusqu’à leur traitement vérifié.", "Conserver une lecture exploitable même lorsque le module Projets n’est pas souscrit."]} steps={[{ title: "Cadrer", description: "Sélectionner le projet ou le dossier transverse, le responsable et l’échéance." }, { title: "Analyser", description: "Comparer tendance, criticité, coût, qualité et reste à traiter." }, { title: "Agir", description: "Décider, affecter et contrôler la preuve avant clôture." }]} recommendations={["Aucune clôture sans responsable, preuve et contrôle d’efficacité.", "Réutiliser les mêmes références dans les actions, audits et reporting financier."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={isFinance(mode) ? Euro : ClipboardCheck} label="Éléments suivis" value={filteredRows.length} description="Périmètre filtré et synchronisé" accent="indigo" /><HrMetricCard icon={CheckCircle2} label="Maîtrisés" value={mastered} description="Clôturés, acceptés ou conformes" accent="emerald" /><HrMetricCard icon={AlertTriangle} label="Échéances dépassées" value={overdue} description="À replanifier ou sécuriser" accent="amber" /><HrMetricCard icon={ShieldAlert} label="Critiques" value={critical} description="Priorité de décision" accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="Les filtres pilotent les cartes, le tableau, les analyses, les alertes et l’export." right={<HrStatusBadge status="planned" label={`${filteredRows.length} résultat(s) sur ${rows.length}`} />}><div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder="Rechercher une référence, un projet, un responsable ou un statut…" /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={project} onChange={(event) => setProject(event.target.value)} className={hrSelectClassName}><option value="">Tous les projets</option>{query.data.projects.map((item: AnyRow) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className={hrSelectClassName}><option value="">Tous les statuts</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>{filtersActive && <HrResetFilters onReset={resetFilters} />}</div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{([{ key: "pilotage", label: "Pilotage", active: "bg-indigo-600 text-white" }, { key: "analyses", label: "Analyses", active: "bg-violet-600 text-white" }, { key: "alerts", label: "Alertes", active: "bg-emerald-600 text-white" }] as const).map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-5 text-sm font-bold ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>
    {tab === "pilotage" && <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><BarChart3 className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-950">Pilotage — {page.title}</h2><p className="mt-1 text-xs text-slate-500">Lecture opérationnelle et managériale issue des registres communs.</p></div></div><div className="flex items-center gap-2"><ProjectVisualActions targetRef={tableRef} fileName={`onepilot_${mode}`} label={page.title} /><button type="button" onClick={() => setView("cards")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "border border-slate-200 text-slate-600"}`}>Tableau</button></div></div>
      {view === "cards" ? <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{filteredRows.map((row) => <article key={`${row.entity_type || mode}-${row.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{row.code || row.audit_number || row.entity_type || month(row.period_start)}</p><h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-950">{row.title || row.name || row.display_name || projectLabel(row)}</h3></div><HrActionMenu labels={{ view: `Voir ${page.singular}`, edit: `Modifier ${page.singular}`, archive: `Archiver ${page.singular}`, restore: `Réactiver ${page.singular}` }} onView={() => setSelected(row)} onEdit={page.table ? () => openForm(row) : undefined} onArchive={page.table ? () => archiveMutation.mutate(row) : undefined} /></div><p className="mt-3 text-xs font-semibold text-slate-500">{projectLabel(row)}</p><div className="mt-3 flex items-center justify-between"><HrStatusBadge status={tone(row.status)} label={isFinance(mode) ? month(row.period_start) : frenchStatus(row.status)} /><span className="text-xs font-bold text-slate-500">{row.owner_name || row.auditor_name || (isFinance(mode) ? euro(row.production_amount) : "Non affecté")}</span></div></article>)}{!filteredRows.length && <p className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">Aucune donnée dans ce périmètre.</p>}</div> : <div data-visual-scroll className="max-h-[460px] overflow-auto"><table className={`${hrTableClassName} min-w-[1700px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={`${column.width || "min-w-36"} ${index === 0 ? "sticky left-0 z-30 bg-sky-50" : ""} text-left`}><HrColumnFilterMenu label={column.label} values={rows.map((row) => valueFor(row, column))} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th className="sticky right-0 z-30 min-w-32 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={`${row.entity_type || mode}-${row.id}`}>{columns.map((column, index) => <td key={column.key} className={`${index === 0 ? "sticky left-0 z-10 bg-white font-bold text-indigo-700" : "font-normal"}`}>{column.value(row)}</td>)}<td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: `Voir ${page.singular}`, edit: `Modifier ${page.singular}`, archive: `Archiver ${page.singular}`, restore: `Réactiver ${page.singular}` }} onView={() => setSelected(row)} onEdit={page.table ? () => openForm(row) : undefined} onArchive={page.table ? () => archiveMutation.mutate(row) : undefined} /></td></tr>)}</tbody></table></div>}
    </section>}
    {tab === "analyses" && (mode === "quality" || mode === "risks") && <RiskMatrixCard risks={filteredRows.filter((row) => mode === "risks" || row.entity_type === "Risque")} />}
    {tab === "analyses" && (mode === "quality" || mode === "deliverables") && <DeliverableCharts data={deliverableSeries} />}
    {tab === "analyses" && (mode === "quality" || mode === "audits") && auditSeries.length > 0 && <AuditTrendChart data={auditSeries} />}
    {tab === "analyses" && <div className="space-y-5">{isFinance(mode) ? <><HrChartCard title="Courbe en S — VP, VA et CR" description="VP : valeur planifiée · VA : valeur acquise · CR : coûts réels." exportConfig={{ type: "line", data: financialSeries, nameKey: "month", series: [{ key: "pv", label: "Valeur planifiée", color: "#818cf8" }, { key: "ev", label: "Valeur acquise", color: "#34d399" }, { key: "ac", label: "Coûts réels", color: "#fb7185" }] }}><ResponsiveContainer width="100%" height="100%"><LineChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" interval={0} /><YAxis /><Tooltip formatter={(value) => euro(value)} /><Legend /><Line dataKey="pv" name="Valeur planifiée" stroke="#818cf8" strokeWidth={3} /><Line dataKey="ev" name="Valeur acquise" stroke="#34d399" strokeWidth={3} /><Line dataKey="ac" name="Coûts réels" stroke="#fb7185" strokeWidth={3} /></LineChart></ResponsiveContainer></HrChartCard><HrChartCard title="Coûts, production et marge" description="Lecture mensuelle de la production, des coûts et de la marge réelle." exportConfig={{ type: "bar", data: financialSeries, nameKey: "month", series: [{ key: "production", label: "Production", color: "#38bdf8" }, { key: "ac", label: "Coûts", color: "#fb7185" }, { key: "margin", label: "Marge (%)", color: "#34d399" }] }}><ResponsiveContainer width="100%" height="100%"><BarChart data={financialSeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" interval={0} /><YAxis /><Tooltip /><Legend /><Bar dataKey="production" name="Production" fill="#38bdf8" radius={[5, 5, 0, 0]} /><Bar dataKey="ac" name="Coûts" fill="#fb7185" radius={[5, 5, 0, 0]} /><Bar dataKey="margin" name="Marge (%)" fill="#34d399" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard></> : <div className="grid gap-5 xl:grid-cols-2"><HrChartCard title="Évolution du volume et des criticités" description="Tendance mensuelle des éléments suivis et des points critiques." exportConfig={{ type: "bar", data: monthlySeries, nameKey: "month", series: [{ key: "total", label: "Volume", color: "#818cf8" }, { key: "critical", label: "Critiques", color: "#fb7185" }] }}><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlySeries}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" interval={0} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="total" name="Volume" fill="#818cf8" radius={[5, 5, 0, 0]} /><Bar dataKey="critical" name="Critiques" fill="#fb7185" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrSectionCard icon={ShieldAlert} title="Synthèse décisionnelle" description="Lecture consolidée du périmètre filtré."><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-indigo-50 p-4"><p className="text-xs font-bold text-indigo-700">Volume suivi</p><p className="mt-2 text-2xl font-black text-indigo-950">{filteredRows.length}</p></div><div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs font-bold text-rose-700">Critiques</p><p className="mt-2 text-2xl font-black text-rose-950">{critical}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-bold text-amber-700">Échéances dépassées</p><p className="mt-2 text-2xl font-black text-amber-950">{overdue}</p></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-bold text-emerald-700">Maîtrisés</p><p className="mt-2 text-2xl font-black text-emerald-950">{mastered}</p></div></div></HrSectionCard></div>}</div>}
    {tab === "alerts" && <ProjectAlertsPanel title={`Alertes — ${page.title}`} description="Synthèse, détection, recommandation et condition de clôture sur le périmètre courant." items={alerts} />}
    {selected && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}><section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{selected.code || selected.audit_number || selected.entity_type || month(selected.period_start)}</p><h2 className="mt-1 text-lg font-black text-slate-950">{selected.title || selected.name || selected.display_name || projectLabel(selected)}</h2></div><button type="button" onClick={() => setSelected(null)} className={hrCancelButtonClassName}>Fermer</button></header><div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{columns.map((column) => <div key={column.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{column.label}</p><div className="mt-1 text-sm font-semibold text-slate-900">{column.value(selected)}</div></div>)}</div></section></div>}
    {editing && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}><section className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div><h2 className="text-lg font-black text-slate-950">{editing.id ? `Modifier ${page.singular}` : `Nouveau ${page.singular}`}</h2><p className="mt-1 text-xs text-slate-500">Référence automatique, tenant sécurisé et synchronisation avec le portefeuille.</p></div><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-700"><X className="h-4 w-4" /></button></header><div className="space-y-5 p-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Field label="Projet / dossier"><select value={form.project_id} onChange={(event) => setForm((current) => ({ ...current, project_id: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="">Sélectionner…</option>{query.data.projects.map((item: AnyRow) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></Field>{!isFinance(mode) && mode !== "audits" && <Field label={mode === "deliverables" ? "Désignation du livrable" : mode === "risks" ? "Intitulé du risque" : "Intitulé de la non-conformité"}><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>}{!isFinance(mode) && <Field label={mode === "audits" ? "Auditeur" : "Responsable"}><input value={form.owner_name} onChange={(event) => setForm((current) => ({ ...current, owner_name: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>}{!isFinance(mode) && <Field label="Statut"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="planned">Planifié</option><option value="open">Ouvert</option><option value="in_progress">En cours</option><option value="pending">En attente</option><option value="blocked">Bloqué</option><option value="completed">Clos</option><option value="cancelled">Annulé</option>{mode === "deliverables" && <option value="delivered">Livré</option>}{mode === "deliverables" && <option value="accepted">Accepté</option>}</select></Field>}
        {mode === "risks" && <><Field label="Probabilité (1 à 4)"><input type="number" min="1" max="4" value={form.probability} onChange={(event) => setForm((current) => ({ ...current, probability: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Impact (1 à 4)"><input type="number" min="1" max="4" value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Impact chiffre d’affaires (€)"><input type="number" value={form.amount1} onChange={(event) => setForm((current) => ({ ...current, amount1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Impact coût (€)"><input type="number" value={form.amount2} onChange={(event) => setForm((current) => ({ ...current, amount2: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Impact délai (jours)"><input type="number" value={form.amount3} onChange={(event) => setForm((current) => ({ ...current, amount3: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Stratégie"><select value={form.strategy} onChange={(event) => setForm((current) => ({ ...current, strategy: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="mitigate">Réduire</option><option value="avoid">Éviter</option><option value="transfer">Transférer</option><option value="accept">Accepter</option></select></Field><Field label="Prochaine revue"><input type="date" value={form.date1} onChange={(event) => setForm((current) => ({ ...current, date1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field></>}
        {mode === "deliverables" && <><Field label="Date planifiée"><input type="date" value={form.date1} onChange={(event) => setForm((current) => ({ ...current, date1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Date replanifiée"><input type="date" value={form.date2} onChange={(event) => setForm((current) => ({ ...current, date2: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Date réelle"><input type="date" value={form.date3} onChange={(event) => setForm((current) => ({ ...current, date3: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Bon du premier coup"><select value={form.first_time_right} onChange={(event) => setForm((current) => ({ ...current, first_time_right: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="">À évaluer</option><option value="true">Oui</option><option value="false">Non</option></select></Field></>}
        {mode === "nonconformities" && <><Field label="Gravité"><select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="minor">Mineure</option><option value="major">Majeure</option><option value="critical">Critique</option></select></Field><Field label="Date de détection"><input type="date" value={form.date1} onChange={(event) => setForm((current) => ({ ...current, date1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Échéance"><input type="date" value={form.date2} onChange={(event) => setForm((current) => ({ ...current, date2: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Efficacité"><input value={form.decision} onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field></>}
        {mode === "audits" && <><Field label="Type d’audit"><select value={form.audit_type} onChange={(event) => setForm((current) => ({ ...current, audit_type: event.target.value }))} className={`${hrSelectClassName} w-full`}><option value="avv">AVV</option><option value="delivery">Delivery</option><option value="closure">Clôture</option><option value="internal">Interne</option><option value="client">Client</option></select></Field><Field label="Date de l’audit"><input type="date" value={form.date1} onChange={(event) => setForm((current) => ({ ...current, date1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Conformité globale (%)"><input type="number" min="0" max="100" value={form.score} onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Audit précédent (%)"><input type="number" min="0" max="100" value={form.previous_score} onChange={(event) => setForm((current) => ({ ...current, previous_score: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Décision"><input value={form.decision} onChange={(event) => setForm((current) => ({ ...current, decision: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field></>}
        {isFinance(mode) && <><Field label="Début de période"><input type="date" value={form.date1} onChange={(event) => setForm((current) => ({ ...current, date1: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field><Field label="Fin de période"><input type="date" value={form.date2} onChange={(event) => setForm((current) => ({ ...current, date2: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>{[["Budget de référence", "amount1"], ["Valeur planifiée (VP)", "amount2"], ["Valeur acquise (VA)", "amount3"], ["Coûts réels (CR)", "amount4"], ["Production", "amount5"], ["Facturé", "amount6"], ["Encaissé", "amount7"], ["Encours", "amount8"], ["Fiabilité du reporting (%)", "amount9"]].map(([label, key]) => <Field key={key} label={label}><input type="number" value={(form as AnyRow)[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>)}</>}
      </div>{!isFinance(mode) && mode !== "audits" && <Field label="Description"><textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>}<Field label={mode === "risks" ? "Plan de réduction" : mode === "deliverables" ? "Critères d’acceptation" : mode === "nonconformities" ? "Action corrective" : "Commentaires"}><textarea rows={3} value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} className={`${hrInputClassName} w-full`} /></Field>{saveMutation.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{saveMutation.error instanceof Error ? saveMutation.error.message : "Enregistrement impossible."}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className={hrCancelButtonClassName}>Annuler</button><button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className={hrSaveButtonClassName}>{saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}</button></div></div></section></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }

function RiskMatrixCard({ risks }: { risks: AnyRow[] }) {
  const ref = useRef<HTMLElement | null>(null);
  const probabilityLabels = ["Improbable", "Possible", "Probable", "Très probable"];
  const impactLabels = ["Majeur", "Sérieux", "Moyen", "Faible"];
  const count = (probability: number, impact: number) => risks.filter((risk) => number(risk.probability) === probability && number(risk.impact) === impact).length;
  const color = (score: number) => score >= 12 ? "border-rose-200 bg-rose-100 text-rose-800" : score >= 8 ? "border-orange-200 bg-orange-100 text-orange-800" : score >= 4 ? "border-amber-200 bg-amber-100 text-amber-800" : "border-emerald-200 bg-emerald-100 text-emerald-800";
  return <section ref={ref} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><ShieldAlert className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950">Matrice des risques 4 × 4</h3><p className="mt-1 text-xs text-slate-500">Nombre de risques par combinaison probabilité × impact.</p></div></div><ProjectVisualActions targetRef={ref} fileName="onepilot_matrice_risques" label="la matrice des risques" /></header><div data-visual-diagram className="p-5"><div className="grid grid-cols-[110px_repeat(4,minmax(120px,1fr))] gap-2"><span />{probabilityLabels.map((label) => <span key={label} className="px-2 pb-1 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>)}{impactLabels.map((impactLabel, rowIndex) => { const impact = 4 - rowIndex; return [<span key={`${impactLabel}-label`} className="flex items-center text-xs font-black text-slate-600">{impactLabel}</span>, ...probabilityLabels.map((_, columnIndex) => { const probability = columnIndex + 1; const score = probability * impact; return <div key={`${probability}-${impact}`} className={`flex h-20 flex-col items-center justify-center rounded-xl border ${color(score)}`}><strong className="text-2xl font-black">{count(probability, impact)}</strong><span className="mt-1 text-[9px] font-black uppercase">{riskLevel(score)}</span></div>; })]; })}</div><div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-600"><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Négligeable</span><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Significatif</span><span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">Critique</span><span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">Inacceptable</span></div></div></section>;
}

function DeliverableCharts({ data }: { data: AnyRow[] }) {
  if (!data.length) return null;
  const charts = [
    { title: "Livrables prévus et livrés", key: "planned", second: "delivered", unit: "", firstLabel: "Prévus", secondLabel: "Livrés", firstColor: "#818cf8", secondColor: "#38bdf8" },
    { title: "OTD — livrés sur la période", key: "otd", unit: "%", firstLabel: "OTD", firstColor: "#34d399" },
    { title: "OQD — bons du premier coup", key: "oqd", unit: "%", firstLabel: "OQD", firstColor: "#fbbf24" },
    { title: "DoD — profondeur du retard", key: "delay", unit: "j", firstLabel: "DoD", firstColor: "#fb7185" },
  ];
  return <div className="grid gap-5 xl:grid-cols-2">{charts.map((chart) => <HrChartCard key={chart.title} title={chart.title} description="Lecture mensuelle issue des dates planifiées, replanifiées et réelles." exportConfig={{ type: "bar", data, nameKey: "month", series: [{ key: chart.key, label: chart.firstLabel, color: chart.firstColor }, ...(chart.second ? [{ key: chart.second, label: chart.secondLabel!, color: chart.secondColor! }] : [])] }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" interval={0} /><YAxis /><Tooltip formatter={(value) => `${number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${chart.unit}`} /><Legend /><Bar dataKey={chart.key} name={chart.firstLabel} fill={chart.firstColor} radius={[5, 5, 0, 0]} />{chart.second && <Bar dataKey={chart.second} name={chart.secondLabel} fill={chart.secondColor} radius={[5, 5, 0, 0]} />}</BarChart></ResponsiveContainer></HrChartCard>)}</div>;
}

function AuditTrendChart({ data }: { data: AnyRow[] }) {
  return <HrChartCard title="Conformité des audits" description="Évolution du score courant par rapport au précédent, tous projets confondus." exportConfig={{ type: "line", data, nameKey: "date", series: [{ key: "score", label: "Conformité", color: "#34d399" }, { key: "previous", label: "Audit précédent", color: "#fbbf24" }] }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" interval={0} /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line dataKey="score" name="Conformité" stroke="#34d399" strokeWidth={3} /><Line dataKey="previous" name="Audit précédent" stroke="#fbbf24" strokeWidth={2} strokeDasharray="6 4" /></LineChart></ResponsiveContainer></HrChartCard>;
}
