"use client";

import { useMemo, useRef } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Diamond, FolderKanban, UserRound } from "lucide-react";

import { HrStatusBadge } from "@/components/hr/HrReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";

type AnyRow = Record<string, any>;

function date(value?: string | null) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
}

function status(value?: string | null) {
  const key = String(value || "planned").toLowerCase();
  return ({ planned: "Ouvert", open: "Ouvert", active: "En cours", in_progress: "En cours", completed: "Clos", closed: "Clos", blocked: "Bloqué", cancelled: "Annulé", on_hold: "En attente" } as Record<string, string>)[key] || "Ouvert";
}

function statusTone(value?: string | null) {
  const key = String(value || "planned").toLowerCase();
  if (["completed", "closed"].includes(key)) return "completed";
  if (["active", "in_progress", "on_hold"].includes(key)) return "in_progress";
  if (key === "blocked") return "blocked";
  if (key === "cancelled") return "archived";
  return "planned";
}

export default function ProjectTimelineBoard({ projects, milestones, onOpenProject }: { projects: AnyRow[]; milestones: AnyRow[]; onOpenProject?: (project: AnyRow) => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const rows = useMemo(() => projects.slice().sort((a, b) => String(a.end_date || "9999-12-31").localeCompare(String(b.end_date || "9999-12-31")) || String(a.code || "").localeCompare(String(b.code || ""), "fr", { numeric: true })), [projects]);
  const milestonesByProject = useMemo(() => {
    const map = new Map<string, AnyRow[]>();
    milestones.filter((row) => !row.archived_at).forEach((row) => map.set(String(row.project_id), [...(map.get(String(row.project_id)) || []), row]));
    return map;
  }, [milestones]);

  return <div ref={captureRef} className="space-y-4 bg-white p-1 fullscreen:overflow-auto fullscreen:p-5 dark:bg-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={() => scrollerRef.current?.scrollBy({ left: -720, behavior: "smooth" })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => scrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" })} className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-xs font-black text-sky-700 shadow-sm"><CalendarDays className="h-4 w-4" />Trajectoire complète</button><button type="button" onClick={() => scrollerRef.current?.scrollBy({ left: 720, behavior: "smooth" })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"><ChevronRight className="h-4 w-4" /></button></div><ProjectVisualActions targetRef={captureRef} fileName="onepilot-timeline-portefeuille" label="la timeline" /></div>
    <div ref={scrollerRef} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800">
      <div className="relative min-w-max bg-gradient-to-b from-sky-50/35 via-white to-indigo-50/25 px-12 py-8 dark:from-sky-950/20 dark:via-slate-800 dark:to-indigo-950/20" style={{ width: Math.max(1180, rows.length * 300 + 120), height: 620 }}>
        <div className="absolute left-20 right-20 top-[300px] h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-emerald-300 shadow-inner" />
        <div className="absolute right-10 top-[300px] -translate-y-1/2 border-y-[16px] border-l-[28px] border-y-transparent border-l-emerald-300" />
        {rows.map((project, index) => {
          const above = index % 2 === 0;
          const projectMilestones = (milestonesByProject.get(String(project.id)) || []).slice().sort((a, b) => String(a.forecast_date || a.planned_date || "").localeCompare(String(b.forecast_date || b.planned_date || "")));
          const nextMilestone = projectMilestones.find((row) => !row.actual_date) || projectMilestones[0];
          const late = project.end_date && new Date(`${project.end_date}T12:00:00`) < new Date() && Number(project.progress_percent || 0) < 100;
          const left = 80 + index * 300;
          return <div key={project.id} className="absolute" style={{ left, top: above ? 36 : 340, width: 250 }}>
            <button type="button" onClick={() => onOpenProject?.(project)} className={`group h-[248px] w-full overflow-hidden rounded-2xl border bg-white text-left shadow-md transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl dark:bg-slate-700 ${late || project.status === "blocked" ? "border-rose-200" : "border-slate-200 dark:border-slate-600"}`}>
              <div className={`h-2 ${project.status === "completed" ? "bg-emerald-400" : project.status === "blocked" ? "bg-rose-400" : project.status === "cancelled" ? "bg-slate-400" : project.status === "active" ? "bg-amber-300" : "bg-sky-300"}`} />
              <div className="p-4"><div className="flex items-start justify-between gap-3"><span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-200"><FolderKanban className="h-4 w-4" /></span><HrStatusBadge status={statusTone(project.status)} label={status(project.status)} /></div><h3 className="mt-3 truncate text-sm font-black text-slate-950 dark:text-white">{project.code} · {project.name}</h3><p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-300">{project.client_name || "Projet interne"}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><span className="rounded-lg bg-sky-50 px-2 py-1.5 font-bold text-sky-700 dark:bg-sky-900/25 dark:text-sky-200">{date(project.start_date)}</span><span className="rounded-lg bg-indigo-50 px-2 py-1.5 text-right font-bold text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-200">{date(project.end_date)}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-600"><span className="block h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, Number(project.progress_percent || 0)))}%` }} /></div><div className="mt-1 flex justify-between text-[10px] font-black text-slate-500"><span>Avancement</span><span>{Math.round(Number(project.progress_percent || 0))} %</span></div><div className="mt-2 flex gap-1.5 text-[9px] font-black"><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{Number(project.risk_count || project.critical_risks || 0)} risque(s)</span><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">{Number(project.nonconformities || 0)} NC</span><span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{Number(project.action_count || 0)} action(s)</span></div><div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-600"><p className="flex items-center gap-2 truncate text-[10px] font-bold text-slate-600 dark:text-slate-200"><UserRound className="h-3.5 w-3.5 text-indigo-500" />{project.manager_name || "Responsable à affecter"}</p><p className="flex items-center gap-2 truncate text-[10px] font-bold text-slate-600 dark:text-slate-200"><Diamond className="h-3.5 w-3.5 text-emerald-500" />{nextMilestone ? `${nextMilestone.code || "Jalon"} · ${date(nextMilestone.forecast_date || nextMilestone.planned_date)}` : "Aucun jalon renseigné"}</p></div></div>
            </button>
            <span className={`absolute left-1/2 w-0.5 -translate-x-1/2 ${late ? "bg-rose-400" : "bg-indigo-300"}`} style={{ top: above ? 248 : -40, height: above ? 16 : 40 }} />
            <span className={`absolute left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-[4px] border-2 border-white shadow ${late ? "bg-rose-400" : project.status === "completed" ? "bg-emerald-400" : "bg-indigo-400"}`} style={{ top: above ? 256 : -50 }} />
          </div>;
        })}
        {!rows.length && <div className="absolute inset-0 flex items-center justify-center"><p className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-6 text-sm font-bold text-slate-500">Aucun projet daté à positionner sur la timeline.</p></div>}
        <div className="absolute bottom-5 left-12 right-12 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-[10px] font-bold text-slate-500 shadow-sm"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Clos</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-amber-500" />En cours</span><span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-rose-500" />Retard ou blocage</span><span className="inline-flex items-center gap-1.5"><Diamond className="h-3.5 w-3.5 text-indigo-500" />Position temporelle</span><span className="ml-auto">Ordre croissant des dates de fin projet</span></div>
      </div>
    </div>
  </div>;
}
