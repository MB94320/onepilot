"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Diamond,
  FolderKanban,
} from "lucide-react";

type AnyRow = Record<string, any>;
type Scale = "week" | "month" | "quarter";
type Display = "projects" | "milestones";

const DAY = 86_400_000;

function noon(value: string | Date) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value.slice(0, 10)}T12:00:00`);
  date.setHours(12, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1, 12);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0, 12);
}

function differenceDays(start: Date, end: Date) {
  return Math.round((noon(end).getTime() - noon(start).getTime()) / DAY);
}

function statusTone(status: string) {
  if (["completed", "closed", "done"].includes(status)) return "from-emerald-300 to-emerald-400 text-emerald-950";
  if (["blocked", "red"].includes(status)) return "from-rose-300 to-rose-400 text-rose-950";
  if (["on_hold", "amber"].includes(status)) return "from-amber-200 to-amber-300 text-amber-950";
  if (["active", "in_progress"].includes(status)) return "from-indigo-300 to-sky-300 text-indigo-950";
  return "from-sky-200 to-sky-300 text-sky-950";
}

export default function ProjectTimelineBoard({
  projects,
  milestones,
  onOpenProject,
}: {
  projects: AnyRow[];
  milestones: AnyRow[];
  onOpenProject?: (project: AnyRow) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState<Scale>("month");
  const [display, setDisplay] = useState<Display>("projects");
  const today = useMemo(() => noon(new Date()), []);
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const range = useMemo(() => {
    const dates = [
      ...projects.flatMap((project) => [project.start_date, project.end_date]),
      ...milestones.flatMap((milestone) => [milestone.planned_date, milestone.forecast_date, milestone.actual_date]),
    ].filter(Boolean).map((value) => noon(String(value)));
    const minimum = dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : addDays(today, -90);
    const maximum = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : addDays(today, 270);
    return {
      start: addDays(startOfMonth(minimum), -31),
      end: addDays(endOfMonth(maximum), 31),
    };
  }, [milestones, projects, today]);

  const pixelPerDay = scale === "week" ? 18 : scale === "month" ? 6 : 2.6;
  const timelineWidth = Math.max(1100, (differenceDays(range.start, range.end) + 1) * pixelPerDay);
  const todayLeft = differenceDays(range.start, today) * pixelPerDay;

  const months = useMemo(() => {
    const result: Array<{ key: string; label: string; left: number; width: number }> = [];
    let cursor = startOfMonth(range.start);
    while (cursor <= range.end) {
      const monthEnd = endOfMonth(cursor);
      const visibleStart = cursor < range.start ? range.start : cursor;
      const visibleEnd = monthEnd > range.end ? range.end : monthEnd;
      result.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(cursor),
        left: differenceDays(range.start, visibleStart) * pixelPerDay,
        width: Math.max(28, (differenceDays(visibleStart, visibleEnd) + 1) * pixelPerDay),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    }
    return result;
  }, [pixelPerDay, range.end, range.start]);

  const rows = useMemo(() => {
    if (display === "projects") {
      return projects.map((project) => ({ kind: "project" as const, row: project, project }));
    }
    return milestones
      .filter((milestone) => !milestone.archived_at)
      .sort((a, b) => String(a.planned_date || "").localeCompare(String(b.planned_date || "")))
      .map((milestone) => ({ kind: "milestone" as const, row: milestone, project: projectMap.get(milestone.project_id) }));
  }, [display, milestones, projectMap, projects]);

  function focusToday() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: Math.max(0, todayLeft - scroller.clientWidth / 2), behavior: "smooth" });
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(focusToday);
    return () => window.cancelAnimationFrame(frame);
  }, [scale, todayLeft]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700">
            <button type="button" onClick={() => setDisplay("projects")} className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-black ${display === "projects" ? "bg-indigo-600 text-white" : "text-slate-500"}`}><FolderKanban className="h-3.5 w-3.5" />Projets</button>
            <button type="button" onClick={() => setDisplay("milestones")} className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-black ${display === "milestones" ? "bg-emerald-600 text-white" : "text-slate-500"}`}><Diamond className="h-3.5 w-3.5" />Jalons</button>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700">
            {(["week", "month", "quarter"] as Scale[]).map((item) => (
              <button key={item} type="button" onClick={() => setScale(item)} className={`h-8 rounded-lg px-3 text-xs font-black ${scale === item ? "bg-amber-400 text-amber-950" : "text-slate-500"}`}>
                {item === "week" ? "Semaines" : item === "month" ? "Mois" : "Trimestres"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => scrollerRef.current?.scrollBy({ left: -520, behavior: "smooth" })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={focusToday} className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-xs font-black text-sky-700 shadow-sm"><CalendarDays className="h-4 w-4" />Aujourd’hui</button>
          <button type="button" onClick={() => scrollerRef.current?.scrollBy({ left: 520, behavior: "smooth" })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div ref={scrollerRef} className="max-h-[430px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700">
        <div className="relative min-w-max" style={{ width: 340 + timelineWidth }}>
          <div className="sticky top-0 z-30 flex h-12 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-200">
            <div className="sticky left-0 z-40 flex w-[340px] shrink-0 items-center border-r border-slate-200 bg-inherit px-4">{display === "projects" ? "Projet / programme" : "Projet / jalon"}</div>
            <div className="relative h-full" style={{ width: timelineWidth }}>
              {months.map((month) => <div key={month.key} className="absolute inset-y-0 flex items-center justify-center border-r border-slate-200" style={{ left: month.left, width: month.width }}>{month.label}</div>)}
            </div>
          </div>

          {rows.map(({ kind, row, project }) => {
            const start = noon(String(kind === "project" ? row.start_date || range.start.toISOString() : row.forecast_date || row.planned_date));
            const end = noon(String(kind === "project" ? row.end_date || row.start_date || range.end.toISOString() : row.forecast_date || row.planned_date));
            const left = Math.max(0, differenceDays(range.start, start) * pixelPerDay);
            const width = Math.max(12, (differenceDays(start, end) + 1) * pixelPerDay);
            const late = end < today && !["completed", "closed", "done", "cancelled"].includes(String(row.status));
            return (
              <button key={`${kind}-${row.id}`} type="button" onClick={() => project && onOpenProject?.(project)} className="group flex h-14 w-full border-b border-slate-100 text-left transition hover:bg-indigo-50/30 dark:border-slate-600 dark:hover:bg-indigo-900/20">
                <div className="sticky left-0 z-20 flex w-[340px] shrink-0 items-center gap-3 border-r border-slate-200 bg-white px-4 group-hover:bg-indigo-50/80 dark:border-slate-600 dark:bg-slate-700 dark:group-hover:bg-slate-600">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${kind === "project" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"}`}>{kind === "project" ? <FolderKanban className="h-4 w-4" /> : <Diamond className="h-4 w-4" />}</span>
                  <span className="min-w-0"><span className="block truncate text-xs font-black text-slate-900 dark:text-white">{project?.code || row.code} · {kind === "project" ? row.name : row.name}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-300">{kind === "project" ? row.client_name || row.description : project?.name || "Projet non renseigné"}</span></span>
                </div>
                <div className="relative h-14" style={{ width: timelineWidth }}>
                  {months.map((month) => <span key={month.key} className="absolute inset-y-0 border-r border-slate-100 dark:border-slate-600" style={{ left: month.left + month.width }} />)}
                  {todayLeft >= 0 && todayLeft <= timelineWidth && <span className="absolute inset-y-0 z-10 w-0.5 bg-rose-400" style={{ left: todayLeft }} title="Aujourd’hui" />}
                  {kind === "project" ? (
                    <span className={`absolute top-3 flex h-8 items-center overflow-hidden rounded-lg bg-gradient-to-r px-2 text-[10px] font-black shadow-sm ${late ? "from-rose-300 to-rose-400 text-rose-950" : statusTone(String(row.status))}`} style={{ left, width }} title={`${row.code} · ${row.name}`}>
                      <span className="relative z-10 truncate">{Number(row.progress_percent || 0)} %</span>
                      <span className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${Math.max(0, Math.min(100, Number(row.progress_percent || 0)))}%` }} />
                    </span>
                  ) : (
                    <span className={`absolute top-[18px] h-5 w-5 rotate-45 rounded-[3px] border-2 border-white shadow ${late ? "bg-rose-400" : row.critical ? "bg-amber-400" : "bg-emerald-300"}`} style={{ left: left - 10 }} title={`${row.code} · ${row.name}`} />
                  )}
                </div>
              </button>
            );
          })}
          {!rows.length && <div className="p-8 text-center text-sm font-bold text-slate-500">Aucune donnée datée sur ce périmètre.</div>}
        </div>
      </div>
    </div>
  );
}
