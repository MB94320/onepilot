"use client";

import { useMemo, useState } from "react";
import { Boxes, ListTree } from "lucide-react";

import { HrActionMenu, HrInfo, HrStatusBadge } from "@/components/hr/HrReferenceUi";
import { ProjectProgress } from "@/components/projects/ProjectReferenceUi";

type AnyRow = Record<string, any>;
type View = "wbs" | "table";

function date(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
}

function status(value?: string | null) {
  const labels: Record<string, string> = { open: "Ouvert", todo: "Ouvert", planned: "Ouvert", active: "En cours", in_progress: "En cours", pending: "En attente", blocked: "Bloqué", done: "Clos", completed: "Clos", closed: "Clos", cancelled: "Annulé", archived: "Archivé" };
  return labels[String(value || "").toLowerCase()] || "Ouvert";
}

function statusTone(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (["done", "completed", "closed"].includes(normalized)) return "completed";
  if (["in_progress", "active", "pending"].includes(normalized)) return "in_progress";
  if (["blocked"].includes(normalized)) return "blocked";
  if (["cancelled", "archived"].includes(normalized)) return "archived";
  return "planned";
}

export default function ProjectWbsBoard({ tasks, onEdit, onArchive, onRestore }: { tasks: AnyRow[]; onEdit: (task: AnyRow) => void; onArchive?: (task: AnyRow) => void; onRestore?: (task: AnyRow) => void }) {
  const [view, setView] = useState<View>("wbs");
  const rows = useMemo(() => tasks.slice().sort((a, b) => String(a.project_code || "").localeCompare(String(b.project_code || ""), "fr", { numeric: true }) || String(a.wbs_code || a.code || "").localeCompare(String(b.wbs_code || b.code || ""), "fr", { numeric: true })), [tasks]);
  const projects = useMemo(() => {
    const groups = new Map<string, AnyRow[]>();
    rows.forEach((task) => { const key = String(task.project_code || task.project_id || "Projet"); groups.set(key, [...(groups.get(key) || []), task]); });
    return [...groups.entries()].map(([code, projectTasks]) => {
      const lots = new Map<string, AnyRow[]>();
      projectTasks.forEach((task) => { const key = String(task.deliverable_reference || task.work_package_name || task.wbs_code?.split(".").slice(0, 2).join(".") || "Lot principal"); lots.set(key, [...(lots.get(key) || []), task]); });
      return { code, name: projectTasks[0]?.project_name || code, tasks: projectTasks, lots: [...lots.entries()] };
    });
  }, [rows]);
  const switcher = <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700"><button type="button" onClick={() => setView("wbs")} className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold ${view === "wbs" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-300"}`}><ListTree className="h-3.5 w-3.5" />WBS</button><button type="button" onClick={() => setView("table")} className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-slate-300"}`}><Boxes className="h-3.5 w-3.5" />Tableau</button></div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{switcher}</div>
      {view === "wbs" ? <div className="space-y-5">{projects.map((project) => <article key={project.code} className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-indigo-800/50 dark:bg-slate-700/70"><div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-5 py-4 dark:border-indigo-800/50 dark:from-indigo-900/25 dark:via-slate-700 dark:to-sky-900/20"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-500">Niveau 1 · Projet</p><h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">{project.code} · {project.name}</h3></div><HrStatusBadge status="planned" label={`${project.tasks.length} élément(s)`} /></div></div><div className="grid gap-4 p-5 xl:grid-cols-2">{project.lots.map(([lot, lotTasks]) => <section key={lot} className="rounded-2xl border border-sky-100 bg-sky-50/35 p-4 dark:border-sky-800/45 dark:bg-sky-900/15"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-sky-600">Niveau 2 · Lot / livrable</p><h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">{lot}</h4></div><HrStatusBadge status="in_progress" label={`${lotTasks.length} tâche(s)`} /></div><div className="mt-4 space-y-2">{lotTasks.map((task) => { const archived = Boolean(task.archived_at) || task.status === "archived"; return <button key={task.id} type="button" onClick={() => onEdit(task)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/45 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-indigo-900/20"><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-200">N3</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black text-slate-950 dark:text-white">{task.wbs_code || task.code} · {task.name}</span><span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-slate-300">{task.owner_name || "Non affecté"} · {date(task.start_date)} → {date(task.due_date)}</span></span><span onClick={(event) => event.stopPropagation()}><HrActionMenu labels={{ view: "Voir la tâche", edit: "Modifier la tâche", archive: "Archiver la tâche", restore: "Réactiver la tâche" }} onView={() => onEdit(task)} onEdit={() => onEdit(task)} onArchive={() => onArchive?.(task)} onRestore={() => onRestore?.(task)} canRestore={archived} /></span></button>; })}</div></section>)}</div></article>)}{!projects.length && <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">Aucune tâche à décomposer.</p>}</div> : <div className="max-h-[342px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70"><table className="min-w-[2100px] w-full border-separate border-spacing-0 text-sm"><thead className="sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Projet", "WBS", "Tâche / jalon", "Niveau", "Lot / livrable", "Responsable", "Début", "Fin", "Charge prévue", "Charge consommée", "Reste à faire", "Avancement", "Marge totale", "Chemin critique", "Statut", "Actions"].map((label, index) => <th key={label} className={`border-b border-slate-200 px-4 py-3 text-left ${index === 0 ? "sticky left-0 z-30 bg-sky-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => { const archived = Boolean(row.archived_at) || row.status === "archived"; return <tr key={row.id} onClick={() => onEdit(row)} className="cursor-pointer hover:bg-indigo-50/35 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 font-black text-indigo-700 dark:border-slate-600 dark:bg-slate-700 dark:text-indigo-200">{row.project_code}</td><td className="border-b border-slate-100 px-4 py-3 font-bold dark:border-slate-600">{row.wbs_code || row.code}</td><td className="border-b border-slate-100 px-4 py-3 font-semibold dark:border-slate-600">{row.name}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{row.task_kind === "milestone" ? "Jalon" : "Niveau 3"}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{row.deliverable_reference || "Lot principal"}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{row.owner_name || "Non affecté"}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{date(row.start_date)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{date(row.due_date)}</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{Number(row.planned_hours || 0)} h</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{Number(row.actual_hours || 0)} h</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{Number(row.remaining_hours || 0)} h</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><ProjectProgress value={Number(row.progress_percent || 0)} /></td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">{Number(row.total_float_days || 0)} j</td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><HrStatusBadge status={row.is_critical ? "blocked" : "archived"} label={row.is_critical ? "Oui" : "Non"} /></td><td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"><HrStatusBadge status={statusTone(row.status)} label={status(row.status)} /></td><td onClick={(event) => event.stopPropagation()} className="border-b border-slate-100 px-4 py-3 text-right dark:border-slate-600"><HrActionMenu labels={{ view: "Voir la tâche", edit: "Modifier la tâche", archive: "Archiver la tâche", restore: "Réactiver la tâche" }} onView={() => onEdit(row)} onEdit={() => onEdit(row)} onArchive={() => onArchive?.(row)} onRestore={() => onRestore?.(row)} canRestore={archived} /></td></tr>; })}</tbody></table></div>}
    </div>
  );
}
