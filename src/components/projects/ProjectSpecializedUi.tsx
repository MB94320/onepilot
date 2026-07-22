"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import {
  HrInfo,
  HrActionMenu,
  HrStatusBadge,
  hrInputClassName,
  hrSelectClassName,
} from "@/components/hr/HrReferenceUi";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;

const supabase = createClient();

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  todo: "Ouverte",
  planned: "Ouvert",
  active: "En cours",
  in_progress: "En cours",
  pending: "En attente",
  on_hold: "En attente",
  blocked: "Bloqué",
  review: "En revue",
  done: "Clôturé",
  completed: "Clos",
  closed: "Clos",
  cancelled: "Annulé",
  archived: "Archivé",
  green: "Sain",
  amber: "À surveiller",
  red: "Critique",
};

const priorityLabels: Record<string, string> = {
  low: "Faible",
  normal: "Moyenne",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(number(value));
}

function percent(value: unknown) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(number(value))} %`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("fr-FR").format(date);
}

function person(row?: AnyRow | null) {
  return row?.full_name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || row?.name || "Non renseigné";
}

function healthTone(score: number, critical = false) {
  if (critical || score < 55) return { status: "blocked", label: "Critique" };
  if (score < 75) return { status: "in_progress", label: "À surveiller" };
  return { status: "completed", label: "Sain" };
}

export function calculateProjectHealth(project: AnyRow) {
  const cpi = number(project.cpi);
  const spi = number(project.spi);
  const satisfaction = number(project.satisfaction_score) * 20;
  const margin = number(project.margin_rate) * (Math.abs(number(project.margin_rate)) <= 1 ? 100 : 1);
  const tace = number(project.tace);
  const quality = Math.max(0, 100 - number(project.late_deliverables) * 12 - number(project.nonconformities) * 8);
  const risk = Math.max(0, 100 - number(project.critical_risks) * 25);
  const scores = {
    coût: Math.max(0, Math.min(100, cpi ? cpi * 100 : 60)),
    délai: Math.max(0, Math.min(100, spi ? spi * 100 : 60)),
    qualité: quality,
    satisfaction: satisfaction || 60,
    risques: risk,
    charge: tace ? Math.max(0, 100 - Math.abs(85 - tace) * 2) : 60,
    finance: margin ? Math.max(0, Math.min(100, 50 + margin)) : 60,
  };
  const weighted = scores.coût * 0.2 + scores.délai * 0.2 + scores.qualité * 0.15 + scores.satisfaction * 0.1 + scores.risques * 0.15 + scores.charge * 0.1 + scores.finance * 0.1;
  const critical = scores.coût < 40 || scores.délai < 40 || scores.qualité < 40 || scores.risques < 40;
  return { score: Math.round(critical ? Math.min(weighted, 49) : weighted), scores, critical };
}

export function ActionPortfolioSummary({ actions, projects }: { actions: AnyRow[]; projects: AnyRow[] }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const summaries = useMemo<AnyRow[]>(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));
    const groups = new Map<string, AnyRow[]>();
    actions.filter((action) => !action.archived_at).forEach((action) => {
      const key = action.project_id || "NA";
      groups.set(key, [...(groups.get(key) || []), action]);
    });
    return [...groups.entries()].map(([key, rows]): AnyRow => {
      const project = projectMap.get(key) || { code: "NA", name: "Actions génériques", status: "open" };
      const late = rows.filter((row) => (row.replanned_due_date || row.due_date) < new Date().toISOString().slice(0, 10) && !["done", "closed", "completed", "cancelled"].includes(row.status)).length;
      const closed = rows.filter((row) => ["done", "closed", "completed"].includes(row.status)).length;
      const effective = rows.filter((row) => row.effectiveness_status === "compliant").length;
      const dueDates = rows.map((row) => row.replanned_due_date || row.due_date).filter(Boolean).sort();
      return {
        ...project,
        total_actions: rows.length,
        open_actions: rows.filter((row) => ["open", "todo", "planned"].includes(row.status)).length,
        in_progress_actions: rows.filter((row) => ["active", "in_progress", "pending", "review"].includes(row.status)).length,
        closed_actions: closed,
        late_actions: late,
        high_actions: rows.filter((row) => ["high", "critical"].includes(row.priority)).length,
        next_due_date: dueDates[0] || null,
        effectiveness_rate: closed ? (effective / closed) * 100 : 0,
      };
    }).sort((a, b) => b.late_actions - a.late_actions || b.high_actions - a.high_actions);
  }, [actions, projects]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700"><button type="button" onClick={() => setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div></div>
      {view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">
        {summaries.map((row) => (
          <article key={row.id || row.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">{row.code} · {row.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Synthèse du stock, des échéances, priorités et contrôles d’efficacité.</p></div><HrStatusBadge status={row.status} label={statusLabels[row.status] || row.status} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><HrInfo label="Actions" value={row.total_actions} accent="indigo" /><HrInfo label="En retard" value={row.late_actions} accent={row.late_actions ? "rose" : "emerald"} /><HrInfo label="Priorité haute" value={row.high_actions} accent={row.high_actions ? "amber" : "sky"} /><HrInfo label="Efficacité" value={percent(row.effectiveness_rate)} accent="emerald" /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><HrInfo label="Ouvertes" value={row.open_actions} accent="sky" /><HrInfo label="En cours" value={row.in_progress_actions} accent="amber" /><HrInfo label="Clôturées" value={row.closed_actions} accent="emerald" /><HrInfo label="Prochaine échéance" value={formatDate(row.next_due_date)} accent="rose" /></div>
          </article>
        ))}
      </div> :
      <div className="max-h-[252px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
        <table className="min-w-[1280px] w-full text-xs"><thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Projet", "Statut projet", "Total", "Ouvertes", "En cours", "Clôturées", "En retard", "Priorité haute", "Échéance proche", "Efficacité"].map((label, index) => <th key={label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-slate-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead><tbody>{summaries.map((row) => <tr key={row.id || row.code} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"><td className="sticky left-0 bg-white px-3 py-3 font-black text-indigo-700 dark:bg-slate-700 dark:text-indigo-200">{row.code} · {row.name}</td><td className="px-3 py-3"><HrStatusBadge status={row.status} label={statusLabels[row.status] || row.status} /></td><td className="px-3 py-3">{row.total_actions}</td><td className="px-3 py-3">{row.open_actions}</td><td className="px-3 py-3">{row.in_progress_actions}</td><td className="px-3 py-3">{row.closed_actions}</td><td className="px-3 py-3 font-black text-rose-700">{row.late_actions}</td><td className="px-3 py-3">{row.high_actions}</td><td className="px-3 py-3">{formatDate(row.next_due_date)}</td><td className="px-3 py-3">{percent(row.effectiveness_rate)}</td></tr>)}</tbody></table>
      </div>}
    </div>
  );
}

export function PerformancePilotage({ projects, onOpen, onEdit, onArchive, onRestore }: { projects: AnyRow[]; onOpen: (row: AnyRow) => void; onEdit?: (row: AnyRow) => void; onArchive?: (row: AnyRow) => void; onRestore?: (row: AnyRow) => void }) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const sorted = projects.slice().sort((a, b) => String(a.code || "").localeCompare(String(b.code || ""), "fr", { numeric: true }));
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700"><button type="button" onClick={() => setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div></div>
      {view === "cards" ? <div className="grid gap-4 xl:grid-cols-2">{sorted.map((project) => {
        const health = calculateProjectHealth(project);
        const tone = healthTone(health.score, health.critical);
        const archived = Boolean(project.archived_at) || project.status === "archived";
        return <article key={project.id} onClick={() => onOpen(project)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/25 dark:border-slate-600 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">{project.code} · {project.name}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{project.client_name} · {project.manager_name}</p></div><div className="flex items-center gap-2"><HrStatusBadge status={tone.status} label={`${tone.label} · ${health.score}/100`} /><span onClick={(event) => event.stopPropagation()}><HrActionMenu labels={{ view: "Voir la performance", edit: "Modifier la performance", archive: "Archiver la performance", restore: "Réactiver la performance" }} onView={() => onOpen(project)} onEdit={() => onEdit?.(project)} onArchive={() => onArchive?.(project)} onRestore={() => onRestore?.(project)} canRestore={archived} /></span></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><HrInfo label="TACE" value={percent(project.tace)} accent="indigo" /><HrInfo label="Satisfaction" value={`${Math.round(number(project.satisfaction_score) * 20)}/100`} accent="emerald" /><HrInfo label="CPI / SPI" value={`${number(project.cpi).toFixed(2)} / ${number(project.spi).toFixed(2)}`} accent="amber" /><HrInfo label="Marge" value={percent(number(project.margin_rate) * (Math.abs(number(project.margin_rate)) <= 1 ? 100 : 1))} accent="rose" /></div></article>;
      })}</div> :
      <div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70"><table className="min-w-[2600px] w-full border-separate border-spacing-0 text-sm"><thead className="sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Projet", "Client", "Responsable", "Période", "Santé", "Avancement physique", "VP", "VA", "CR", "BAC", "EAC", "ETC", "VAC", "CPI", "SPI", "TACE", "Livrables", "Livrables en retard", "OTD", "DoD", "OQD", "Satisfaction", "Risques critiques", "Charge prévue", "Charge réelle", "Production", "Coûts", "Marge", "Fiabilité", "Dernière mise à jour", "Actions"].map((label, index) => <th key={label} className={`whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-sky-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead><tbody>{sorted.map((project) => { const health = calculateProjectHealth(project); const tone = healthTone(health.score, health.critical); const bac = number(project.bac || project.baseline_budget || project.ordered_budget); const eac = number(project.eac); const ac = number(project.actual_cost_total || project.consumed_budget); const archived = Boolean(project.archived_at) || project.status === "archived"; return <tr key={project.id} onClick={() => onOpen(project)} className="cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 font-black text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-indigo-200">{project.code} · {project.name}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{project.client_name}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{project.manager_name}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{project.reporting_period || "Dernière période"}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><HrStatusBadge status={tone.status} label={`${health.score}/100`} /></td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(project.progress_percent)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(project.planned_value)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(project.earned_value)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(ac)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(bac)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(eac)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(eac - ac)}</td><td className={`border-b border-slate-100 px-4 py-3 font-black dark:border-slate-600 ${bac - eac < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(bac - eac)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.cpi).toFixed(2)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.spi).toFixed(2)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(project.tace)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.deliverable_count)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.late_deliverables)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(project.otd)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.dod)} j</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(project.oqd)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{Math.round(number(project.satisfaction_score) * 20)}/100</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.critical_risks)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.planned_hours)} h</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{number(project.actual_hours)} h</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(project.production_amount)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{money(ac)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(number(project.margin_rate) * (Math.abs(number(project.margin_rate)) <= 1 ? 100 : 1))}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{percent(project.reporting_reliability_percent || 60)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{formatDate(project.last_reporting_at || project.updated_at)}</td><td onClick={(event) => event.stopPropagation()} className="sticky right-0 border-b border-slate-100 bg-white px-4 py-3 text-right dark:border-slate-600 dark:bg-slate-700"><HrActionMenu labels={{ view: "Voir la performance", edit: "Modifier la performance", archive: "Archiver la performance", restore: "Réactiver la performance" }} onView={() => onOpen(project)} onEdit={() => onEdit?.(project)} onArchive={() => onArchive?.(project)} onRestore={() => onRestore?.(project)} canRestore={archived} /></td></tr>; })}</tbody></table></div>}
    </div>
  );
}

export function PerformanceDetailsDrawer({ project, surveys, onClose }: { project: AnyRow; surveys: AnyRow[]; onClose: () => void }) {
  const health = calculateProjectHealth(project);
  return <div className="fixed inset-0 z-50 bg-slate-950/35" onClick={onClose}><aside onClick={(event) => event.stopPropagation()} className="ml-auto h-full w-full max-w-5xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25"><div><h2 className="text-base font-black text-slate-950 dark:text-white">{project.code} · Performance détaillée</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Santé, valeur acquise, satisfaction, qualité, risques, charge et rentabilité.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Score santé" value={`${health.score}/100`} accent={health.critical ? "rose" : health.score < 75 ? "amber" : "emerald"} /><HrInfo label="CPI — efficacité coûts" value={number(project.cpi).toFixed(2)} accent={number(project.cpi) < 1 ? "rose" : "emerald"} /><HrInfo label="SPI — efficacité délais" value={number(project.spi).toFixed(2)} accent={number(project.spi) < 1 ? "rose" : "emerald"} /><HrInfo label="TACE" value={percent(project.tace)} accent="indigo" /></div><div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-600"><h3 className="text-sm font-black text-slate-950 dark:text-white">Définition des indicateurs</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><HrInfo label="VP — valeur planifiée" value="Budget du travail prévu à date" /><HrInfo label="VA — valeur acquise" value="Budget du travail réellement achevé" /><HrInfo label="CR — coût réel" value="Coût engagé pour le travail réalisé" /><HrInfo label="EAC — coût à terminaison" value="Prévision du coût final du projet" /><HrInfo label="CPI = VA / CR" value="< 1 : dérive coût" /><HrInfo label="SPI = VA / VP" value="< 1 : retard planning" /><HrInfo label="TACE" value="Activité productive / capacité hors congés" /><HrInfo label="VAC = BAC − EAC" value="< 0 : dépassement prévisionnel" /></div></div><div className="max-h-[252px] overflow-auto rounded-2xl border border-slate-200"><table className="min-w-[1400px] w-full text-xs"><thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-black uppercase text-slate-500"><tr>{["Mois", "Écoute client", "Planification", "Compétences", "Indicateurs", "Risques", "Note globale", "Commentaire"].map((label, index) => <th key={label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-slate-50" : ""}`}>{label}</th>)}</tr></thead><tbody>{surveys.filter((row) => row.project_id === project.id).map((row) => <tr key={row.id}><td className="sticky left-0 bg-white px-3 py-3 font-black text-indigo-700">{new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${row.survey_month}T12:00:00`))}</td><td className="px-3 py-3">{row.customer_listening_score}/5</td><td className="px-3 py-3">{row.planning_score}/5</td><td className="px-3 py-3">{row.technical_skills_score}/5</td><td className="px-3 py-3">{row.monitoring_score}/5</td><td className="px-3 py-3">{row.risk_management_score}/5</td><td className="px-3 py-3 font-black">{Math.round(number(row.overall_score) * 20)}/100</td><td className="px-3 py-3">{row.verbatim || "—"}</td></tr>)}</tbody></table></div></div></aside></div>;
}

export function SatisfactionForm({ organizationId, projects, row, onClose, onSaved }: { organizationId: string; projects: AnyRow[]; row?: AnyRow | null; onClose: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState(row?.project_id || projects[0]?.id || "");
  const [month, setMonth] = useState(String(row?.survey_month || new Date().toISOString().slice(0, 7)).slice(0, 7));
  const [scores, setScores] = useState({ écoute: number(row?.customer_listening_score ?? 3), planification: number(row?.planning_score ?? 3), compétences: number(row?.technical_skills_score ?? 3), indicateurs: number(row?.monitoring_score ?? 3), risques: number(row?.risk_management_score ?? 3) });
  const [comment, setComment] = useState(row?.verbatim || "");
  const [saving, setSaving] = useState(false);
  const global = Math.round((Object.values(scores).reduce((sum, value) => sum + value, 0) / 25) * 100);
  async function save() { setSaving(true); try { const payload = { organization_id: organizationId, project_id: projectId, survey_month: `${month}-01`, customer_listening_score: scores.écoute, planning_score: scores.planification, technical_skills_score: scores.compétences, monitoring_score: scores.indicateurs, risk_management_score: scores.risques, verbatim: comment || null, updated_at: new Date().toISOString() }; const result = await (supabase.from("project_satisfaction_surveys" as never) as any).upsert(payload, { onConflict: "organization_id,project_id,survey_month" }); if (result.error) throw result.error; onSaved(); onClose(); } catch (error) { window.alert(error instanceof Error ? error.message : "Impossible d’enregistrer la satisfaction client."); } finally { setSaving(false); } }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25"><div><h2 className="text-sm font-black text-slate-950 dark:text-white">Satisfaction client mensuelle</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Évaluer cinq dimensions projet et historiser la note globale sur 100.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></div><div className="space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Projet</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Mois et année</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label></div><div className="space-y-3">{Object.entries(scores).map(([key, value]) => <label key={key} className="grid items-center gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[220px_1fr_72px] dark:border-slate-600"><span className="text-xs font-black capitalize text-slate-700 dark:text-slate-200">{key === "indicateurs" ? "Qualité des indicateurs de suivi" : key === "risques" ? "Gestion des risques" : key}</span><input type="range" min="0" max="5" step="1" value={value} onChange={(event) => setScores((current) => ({ ...current, [key]: Number(event.target.value) }))} className="accent-indigo-600" /><span className="rounded-xl bg-indigo-50 px-3 py-2 text-center text-sm font-black text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">{value}/5</span></label>)}</div><div className="grid gap-4 sm:grid-cols-[180px_1fr]"><HrInfo label="Note globale" value={`${global}/100`} accent={global < 60 ? "rose" : global < 75 ? "amber" : "emerald"} /><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Commentaire client / management</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white" /></label></div></div><div className="flex justify-end gap-2 border-t border-slate-100 p-5 dark:border-slate-600"><button type="button" onClick={onClose} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700">Annuler</button><button type="button" onClick={() => void save()} disabled={saving || !projectId || !month} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button></div></div></div>;
}

type TaskDraft = { code: string; name: string; description: string; wbs: string; lot: string; owner: string; start: string; end: string; hours: string; progress: string; predecessor: string; successor: string; milestone: boolean; risk: boolean; status: string; critical: boolean; comments: string };
const emptyTask = (): TaskDraft => ({ code: "", name: "", description: "", wbs: "", lot: "", owner: "", start: "", end: "", hours: "", progress: "0", predecessor: "", successor: "", milestone: false, risk: false, status: "open", critical: false, comments: "" });

export function BulkTaskForm({ organizationId, projects, employees, tasks = [], onClose, onSaved }: { organizationId: string; projects: AnyRow[]; employees: AnyRow[]; tasks?: AnyRow[]; onClose: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [rows, setRows] = useState<TaskDraft[]>([emptyTask(), emptyTask(), emptyTask()]);
  const [saving, setSaving] = useState(false);
  const project = projects.find((item) => item.id === projectId);
  const update = (index: number, key: keyof TaskDraft, value: string | boolean) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  async function nextCode() { const result = await (supabase.rpc as any)("next_project_code", { target_organization_id: organizationId, target_year: new Date().getFullYear(), code_prefix: "T" }); if (result.error) throw result.error; return String(result.data); }
  async function allocateCodes() { const missing = rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.code); if (!missing.length) return; const allocated = await Promise.all(missing.map(() => nextCode())); setRows((current) => current.map((row, index) => { const position = missing.findIndex((item) => item.index === index); return position >= 0 && !row.code ? { ...row, code: allocated[position] } : row; })); }
  useEffect(() => { void allocateCodes(); }, [projectId]);
  async function save() { const valid = rows.filter((row) => row.name.trim()); if (!projectId || !valid.length) return; setSaving(true); try { const payloads: AnyRow[] = []; for (const row of valid) { const code = row.code.trim() || await nextCode(); payloads.push({ organization_id: organizationId, project_id: projectId, code, name: row.name.trim(), description: row.description || row.comments || null, wbs_code: row.wbs || null, work_package_id: null, deliverable_reference: row.lot || null, assignee_employee_id: row.owner || null, start_date: row.start || null, due_date: row.end || null, planned_hours: number(row.hours), remaining_hours: number(row.hours) * (1 - number(row.progress) / 100), progress_percent: number(row.progress), task_kind: row.milestone ? "milestone" : "task", task_type: row.milestone ? "delivery" : "other", status: row.status, is_critical: row.critical, priority: row.risk ? "high" : "normal", acceptance_criteria: row.comments || null, updated_at: new Date().toISOString(), predecessor_code: row.predecessor, successor_code: row.successor }); }
      const clean = payloads.map(({ predecessor_code: _p, successor_code: _s, ...row }) => row); const inserted = await (supabase.from("project_tasks" as never) as any).insert(clean).select("id,code"); if (inserted.error) throw inserted.error; const idMap = new Map((inserted.data || []).map((row: AnyRow) => [row.code, row.id])); const existing = await (supabase.from("project_tasks" as never) as any).select("id,code").eq("organization_id", organizationId).eq("project_id", projectId); if (existing.error) throw existing.error; (existing.data || []).forEach((row: AnyRow) => idMap.set(row.code, row.id)); const links: AnyRow[] = []; payloads.forEach((row) => { const successorId = idMap.get(row.code); String(row.predecessor_code || "").split(",").map((value) => value.trim()).filter(Boolean).forEach((code) => { const predecessorId = idMap.get(code); if (predecessorId && successorId) links.push({ organization_id: organizationId, project_id: projectId, predecessor_task_id: predecessorId, successor_task_id: successorId, dependency_type: "FS", lag_days: 0, is_critical: row.is_critical }); }); }); if (links.length) { const dependency = await (supabase.from("project_dependencies" as never) as any).upsert(links, { onConflict: "organization_id,predecessor_task_id,successor_task_id" }); if (dependency.error) throw dependency.error; } onSaved(); onClose();
    } catch (error) { window.alert(error instanceof Error ? error.message : "Impossible d’enregistrer les tâches."); } finally { setSaving(false); } }
  const availableCodes = [...tasks.filter((task) => task.project_id === projectId).map((task) => task.code), ...rows.map((row) => row.code)].filter(Boolean);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[94vh] w-full max-w-[96vw] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"><div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25"><div><h2 className="text-sm font-black text-slate-950 dark:text-white">Nouvelles tâches</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Créer en série la WBS, les tâches, jalons, charges et dépendances d’un projet.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-700"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5"><div className="grid gap-4 sm:grid-cols-[minmax(320px,1fr)_220px]"><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Projet</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><HrInfo label="Statut projet" value={statusLabels[project?.status] || project?.status || "Non renseigné"} accent="sky" /></div><div className="overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600"><table className="min-w-[2600px] w-full text-sm"><thead className="sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Code automatique", "Nom de la tâche", "Description", "Niveau WBS", "Lot / livrable", "Responsable", "Début", "Fin", "Charge (h)", "Avancement", "Prédécesseur", "Successeur", "Jalon", "Risque", "Statut", "Critique", "Commentaires", "Actions"].map((label, index) => <th key={label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-sky-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td className="sticky left-0 z-10 bg-white p-1.5 dark:bg-slate-700"><span className="inline-flex h-10 min-w-36 items-center rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-black text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-200">{row.code || "Attribution…"}</span></td>{(["name", "description", "wbs", "lot"] as const).map((key) => <td key={key} className="p-1.5"><input value={row[key]} onChange={(event) => update(index, key, event.target.value)} className={`${hrInputClassName} min-w-[150px]`} /></td>)}<td className="p-1.5"><select value={row.owner} onChange={(event) => update(index, "owner", event.target.value)} className={`${hrSelectClassName} min-w-[180px]`}><option value="">Non affecté</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{person(employee)}</option>)}</select></td>{(["start", "end"] as const).map((key) => <td key={key} className="p-1.5"><input type="date" value={row[key]} onChange={(event) => update(index, key, event.target.value)} className={hrInputClassName} /></td>)}{(["hours", "progress"] as const).map((key) => <td key={key} className="p-1.5"><input type="number" min="0" max={key === "progress" ? 100 : undefined} value={row[key]} onChange={(event) => update(index, key, event.target.value)} className={`${hrInputClassName} w-24`} /></td>)}{(["predecessor", "successor"] as const).map((key) => <td key={key} className="p-1.5"><select value={row[key]} onChange={(event) => update(index, key, event.target.value)} className={`${hrSelectClassName} min-w-[160px]`}><option value="">Aucun</option>{availableCodes.filter((code) => code !== row.code).map((code) => <option key={code} value={code}>{code}</option>)}</select></td>)}{(["milestone", "risk"] as const).map((key) => <td key={key} className="p-1.5 text-center"><input type="checkbox" checked={row[key]} onChange={(event) => update(index, key, event.target.checked)} /></td>)}<td className="p-1.5"><select value={row.status} onChange={(event) => update(index, "status", event.target.value)} className={`${hrSelectClassName} min-w-[130px]`}>{["open", "in_progress", "pending", "blocked", "closed", "cancelled"].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td><td className="p-1.5 text-center"><input type="checkbox" checked={row.critical} onChange={(event) => update(index, "critical", event.target.checked)} /></td><td className="p-1.5"><input value={row.comments} onChange={(event) => update(index, "comments", event.target.value)} className={`${hrInputClassName} min-w-[180px]`} /></td><td className="p-1.5"><button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><button type="button" onClick={async () => { const code = await nextCode(); setRows((current) => [...current, { ...emptyTask(), code }]); }} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700"><Plus className="h-4 w-4" />Ajouter une ligne</button></div><div className="flex justify-end gap-2 border-t border-slate-100 p-5 dark:border-slate-600"><button type="button" onClick={onClose} className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700">Annuler</button><button type="button" onClick={() => void save()} disabled={saving || !projectId || !rows.some((row) => row.name.trim())} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer les tâches"}</button></div></div></div>;
}

export function WbsTable({ tasks }: { tasks: AnyRow[] }) {
  const rows = tasks.slice().sort((a, b) => String(a.project_code || "").localeCompare(String(b.project_code || "")) || String(a.wbs_code || a.code).localeCompare(String(b.wbs_code || b.code), "fr", { numeric: true }));
  return <div className="max-h-[342px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70"><table className="min-w-[1800px] w-full text-xs"><thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Projet", "WBS", "Tâche / jalon", "Type", "Responsable", "Début", "Fin", "Durée", "Charge prévue", "Charge consommée", "Reste à faire", "Avancement", "Marge totale", "Chemin critique", "Statut"].map((label, index) => <th key={label} className={`px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-slate-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => { const start = row.start_date ? new Date(`${row.start_date}T12:00:00`) : null; const end = row.due_date ? new Date(`${row.due_date}T12:00:00`) : null; const duration = start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1) : 0; return <tr key={row.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20"><td className="sticky left-0 bg-white px-3 py-3 font-black text-indigo-700 dark:bg-slate-700 dark:text-indigo-200">{row.project_code}</td><td className="px-3 py-3">{row.wbs_code || row.code}</td><td className="px-3 py-3 font-bold">{row.name}</td><td className="px-3 py-3">{row.task_kind === "milestone" ? "Jalon" : "Tâche"}</td><td className="px-3 py-3">{row.owner_name}</td><td className="px-3 py-3">{formatDate(row.start_date)}</td><td className="px-3 py-3">{formatDate(row.due_date)}</td><td className="px-3 py-3">{duration} j</td><td className="px-3 py-3">{number(row.planned_hours)} h</td><td className="px-3 py-3">{number(row.actual_hours)} h</td><td className="px-3 py-3">{number(row.remaining_hours)} h</td><td className="px-3 py-3">{percent(row.progress_percent)}</td><td className="px-3 py-3">{number(row.total_float_days)} j</td><td className="px-3 py-3"><HrStatusBadge status={row.is_critical ? "blocked" : "completed"} label={row.is_critical ? "Oui" : "Non"} /></td><td className="px-3 py-3"><HrStatusBadge status={row.status} label={statusLabels[row.status] || row.status} /></td></tr>; })}</tbody></table></div>;
}

export { priorityLabels, statusLabels };
