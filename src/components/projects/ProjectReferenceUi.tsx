"use client";

import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";

import {
  HrInfo,
  HrSectionCard,
  HrStatusBadge,
  type HrAccent,
} from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;

export type ProjectAlertItem = {
  label: string;
  count: number;
  impact: string;
  action: string;
  owner?: string;
  due?: string;
  accent?: HrAccent;
};

export function ProjectProgress({ value, tone = "indigo" }: { value?: number | null; tone?: "indigo" | "emerald" | "amber" | "rose" | "sky" }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  const colors = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-400",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
  };
  return (
    <div className="min-w-32">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-black text-slate-600 dark:text-slate-300">
        <span>{new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(safe)} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-600">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function ProjectPriorityBadge({ priority }: { priority?: string | null }) {
  const normalized = String(priority || "normal").toLowerCase();
  const status = normalized === "high" || normalized === "critical" ? "blocked" : normalized === "low" ? "planned" : "in_progress";
  const label = normalized === "high" || normalized === "critical" ? "Haute" : normalized === "low" ? "Faible" : "Moyenne";
  return <HrStatusBadge status={status} label={label} />;
}

export function ProjectOriginBadge({ origin }: { origin?: string | null }) {
  const normalized = String(origin || "generic").toLowerCase();
  const definitions: Record<string, { status: string; label: string }> = {
    project: { status: "planned", label: "Projet" },
    risk: { status: "blocked", label: "Risque" },
    nonconformity: { status: "blocked", label: "Non-conformité" },
    non_conformity: { status: "blocked", label: "Non-conformité" },
    audit: { status: "in_progress", label: "Audit" },
    quality: { status: "in_progress", label: "Qualité" },
    customer: { status: "planned", label: "Client" },
    finance: { status: "completed", label: "Finance" },
    management: { status: "in_progress", label: "Management" },
    generic: { status: "archived", label: "Générique" },
  };
  const definition = definitions[normalized] || { status: "archived", label: String(origin || "Générique") };
  return <HrStatusBadge status={definition.status} label={definition.label} />;
}

function AlertColumn({
  icon: Icon,
  title,
  subtitle,
  iconClassName,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  iconClassName: string;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}><Icon className="h-5 w-5" /></span>
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div className="min-h-64 space-y-3 p-5">{children}</div>
    </article>
  );
}

export function ProjectAlertsPanel({
  items,
  title = "Alertes qualité",
  description = "Contrôle des données, dérives, risques et décisions nécessitant une action.",
}: {
  items: ProjectAlertItem[];
  title?: string;
  description?: string;
}) {
  const active = items.filter((item) => item.count > 0);
  const critical = items.reduce((total, item) => total + item.count, 0);
  const controlled = items.length - active.length;
  return (
    <HrSectionCard icon={ShieldAlert} title={title} description={description}>
      <div className="grid gap-5 xl:grid-cols-3">
        <AlertColumn icon={Gauge} title="Synthèse" subtitle="Lecture rapide de la santé et des priorités." iconClassName="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/45 dark:text-indigo-200">
          <HrInfo label="Points nécessitant une action" value={critical} accent={critical ? "rose" : "emerald"} />
          <HrInfo label="Contrôles maîtrisés" value={`${controlled}/${items.length}`} accent="emerald" />
          <HrInfo label="Niveau de vigilance" value={critical > 8 ? "Critique" : critical > 0 ? "À surveiller" : "Maîtrisé"} accent={critical > 8 ? "rose" : critical > 0 ? "amber" : "emerald"} />
        </AlertColumn>
        <AlertColumn icon={AlertTriangle} title="Alertes" subtitle="Points nécessitant une vérification ou une action." iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-200">
          {active.length ? active.slice(0, 5).map((item) => (
            <div key={item.label} className="rounded-2xl border border-sky-100 bg-sky-50/55 p-4 dark:border-sky-800/45 dark:bg-sky-900/20">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p><span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-700 dark:bg-sky-900/55 dark:text-sky-200">À SUIVRE</span></div>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.count} élément(s). {item.impact}</p>
            </div>
          )) : <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-800/45 dark:bg-emerald-900/20 dark:text-emerald-200">Aucune alerte active sur ce périmètre.</div>}
        </AlertColumn>
        <AlertColumn icon={Lightbulb} title="Recommandations" subtitle="Actions suggérées pour améliorer le pilotage." iconClassName="bg-amber-100 text-amber-700 dark:bg-amber-900/45 dark:text-amber-200">
          {(active.length ? active : items.slice(0, 2)).slice(0, 5).map((item) => (
            <div key={item.label} className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4 dark:border-emerald-800/45 dark:bg-emerald-900/20">
              <div className="flex gap-3"><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" /></span><div><p className="text-sm font-black text-slate-950 dark:text-white">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.action}</p></div></div>
            </div>
          ))}
        </AlertColumn>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const accent = item.accent || (item.count ? "rose" : "emerald");
          return (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50/45 via-white to-indigo-50/35 p-4 shadow-sm dark:border-slate-600/60 dark:from-sky-900/15 dark:via-slate-700/75 dark:to-indigo-900/15">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.count ? "bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-200"}`}><ShieldAlert className="h-4 w-4" /></span><p className="truncate text-sm font-black text-slate-950 dark:text-white">{item.label}</p></div><HrStatusBadge status={item.count ? "blocked" : "completed"} label={item.count ? "ACTION" : "OK"} /></div>
              <div className="mt-3 flex items-end justify-between gap-4"><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{item.impact} Action : {item.action}</p><span className={`text-2xl font-black ${accent === "rose" ? "text-rose-700 dark:text-rose-200" : accent === "amber" ? "text-amber-700 dark:text-amber-200" : "text-emerald-700 dark:text-emerald-200"}`}>{item.count}</span></div>
            </article>
          );
        })}
      </div>
    </HrSectionCard>
  );
}

export function ProjectHealthTable({ projects }: { projects: AnyRow[] }) {
  const rows = projects.map((project) => {
    const schedule = Number(project.spi || 0) ? Math.min(100, Number(project.spi) * 100) : Number(project.schedule_score || 60);
    const resources = Number(project.tace || 0) ? Math.max(0, 100 - Math.abs(85 - Number(project.tace)) * 2) : 60;
    const budget = Number(project.cpi || 0) ? Math.min(100, Number(project.cpi) * 100) : Number(project.cost_score || 60);
    const risks = Math.max(0, 100 - Number(project.critical_risks || 0) * 25);
    const quality = Math.max(0, 100 - Number(project.late_deliverables || 0) * 10 - Number(project.nonconformities || 0) * 8);
    const satisfaction = Math.min(100, Number(project.satisfaction_score || 0) * 20 || 60);
    return { project, schedule, resources, budget, risks, quality, satisfaction, overall: Math.round((schedule + resources + budget + risks + quality + satisfaction) / 6) };
  });
  return (
    <div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
      <table className="min-w-[1500px] w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Projet", "Planning", "Ressources", "Budget", "Risques", "Qualité", "Satisfaction", "Santé globale", "Lecture managériale"].map((label, index) => <th key={label} className={`border-b border-slate-200 px-4 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-sky-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ project, overall, ...axes }) => <tr key={project.id || project.code} className="hover:bg-indigo-50/35 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 font-black text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-indigo-200">{project.code} · {project.name}</td>{Object.values(axes).map((score, index) => <td key={index} className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${score >= 75 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-rose-500"}`} /><span className="font-bold text-slate-700 dark:text-slate-200">{Math.round(score)}/100</span></div></td>)}<td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><HrStatusBadge status={overall >= 75 ? "completed" : overall >= 55 ? "in_progress" : "blocked"} label={`${overall}/100`} /></td><td className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">{overall >= 75 ? "Projet maîtrisé : préserver la trajectoire." : overall >= 55 ? "Projet à surveiller : arbitrer les axes dégradés." : "Projet critique : plan de redressement et escalade requis."}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
