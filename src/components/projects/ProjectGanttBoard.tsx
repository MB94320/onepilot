"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, Diamond, ListChecks } from "lucide-react";

type AnyRow = Record<string, unknown>;
type GanttScale = "week" | "month" | "quarter";

export type ProjectGanttBoardProps = {
  tasks: AnyRow[];
  dependencies?: AnyRow[];
  employeeMap?: Map<string, AnyRow | string> | Record<string, AnyRow | string>;
};

type NormalizedTask = {
  source: AnyRow;
  id: string;
  project: string;
  code: string;
  name: string;
  employee: string;
  start: Date;
  end: Date;
  startLabel: string;
  endLabel: string;
  duration: number;
  workload: number;
  progress: number;
  floatDays: number;
  critical: boolean;
  milestone: boolean;
  overdue: boolean;
  status: string;
};

const DAY_MS = 86_400_000;
const ROW_HEIGHT = 54;
const LEFT_WIDTH = 1000;

const leftColumns =
  "130px 178px 120px 82px 82px 58px 58px 80px 94px 48px 70px";

function asText(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(`${asText(value).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function diffDays(from: Date, to: Date) {
  return Math.round((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / DAY_MS);
}

function businessDays(from: Date, to: Date) {
  let count = 0;
  for (let cursor = startOfUtcDay(from); cursor <= to; cursor = addDays(cursor, 1)) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return Math.max(1, count);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function employeeLabel(
  id: string,
  employeeMap?: ProjectGanttBoardProps["employeeMap"],
) {
  if (!id || !employeeMap) return "Non affecté";
  const employee =
    employeeMap instanceof Map ? employeeMap.get(id) : employeeMap[id];
  if (!employee) return "Non affecté";
  if (typeof employee === "string") return employee;
  return (
    asText(employee.full_name) ||
    [asText(employee.first_name), asText(employee.last_name)]
      .filter(Boolean)
      .join(" ") ||
    asText(employee.name) ||
    "Non affecté"
  );
}

function isCompleted(status: string, progress: number) {
  return (
    progress >= 100 ||
    ["done", "completed", "closed", "cancelled", "archived"].includes(status)
  );
}

function normalizeTask(
  task: AnyRow,
  employeeMap?: ProjectGanttBoardProps["employeeMap"],
): NormalizedTask | null {
  const start = parseDate(task.start_date ?? task.planned_start_date);
  const rawEnd = parseDate(
    task.due_date ?? task.end_date ?? task.planned_end_date ?? task.forecast_date,
  );
  if (!start && !rawEnd) return null;

  const safeStart = start ?? rawEnd!;
  const safeEnd = rawEnd && rawEnd >= safeStart ? rawEnd : safeStart;
  const planned = asNumber(task.planned_hours ?? task.workload_hours);
  const remaining = asNumber(task.remaining_hours, planned);
  const inferredProgress = planned > 0 ? ((planned - remaining) / planned) * 100 : 0;
  const progress = Math.max(
    0,
    Math.min(
      100,
      asNumber(task.progress_percent ?? task.percent_complete, inferredProgress),
    ),
  );
  const milestone =
    asBoolean(task.is_milestone) ||
    asText(task.task_type).toLowerCase() === "milestone" ||
    asText(task.type).toLowerCase() === "milestone";
  const status = asText(task.status).toLowerCase();
  const critical =
    asBoolean(task.critical ?? task.is_critical) ||
    asText(task.priority).toLowerCase() === "critical";
  const today = startOfUtcDay(new Date());

  return {
    source: task,
    id: asText(task.id),
    project:
      asText(task.project_code) ||
      asText(task.project_name) ||
      asText(task.project_number) ||
      asText(task.project_id).slice(0, 8) ||
      "Projet",
    code: asText(task.code),
    name: asText(task.name ?? task.title) || "Tâche sans libellé",
    employee: employeeLabel(
      asText(task.assignee_employee_id ?? task.employee_id ?? task.owner_employee_id),
      employeeMap,
    ),
    start: safeStart,
    end: safeEnd,
    startLabel: formatDate(safeStart),
    endLabel: formatDate(safeEnd),
    duration: asNumber(task.duration_days, businessDays(safeStart, safeEnd)),
    workload: planned,
    progress,
    floatDays: asNumber(task.total_float_days ?? task.float_days ?? task.slack_days),
    critical,
    milestone,
    overdue: !isCompleted(status, progress) && safeEnd < today,
    status,
  };
}

function isoWeek(date: Date) {
  const working = new Date(date.getTime());
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
  return Math.ceil(((working.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function scaleConfiguration(scale: GanttScale) {
  if (scale === "week") return { dayWidth: 30, before: 3, after: 10 };
  if (scale === "month") return { dayWidth: 14, before: 7, after: 28 };
  return { dayWidth: 6, before: 14, after: 84 };
}

function axisLabel(date: Date, scale: GanttScale, index: number) {
  if (scale === "week") {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }
  if (scale === "month") {
    return date.getUTCDay() === 1 || index === 0 ? `S${isoWeek(date)}` : "";
  }
  return date.getUTCDate() === 1 || index === 0
    ? new Intl.DateTimeFormat("fr-FR", {
        month: "short",
        timeZone: "UTC",
      }).format(date)
    : "";
}

function predecessorIds(taskId: string, dependencies: AnyRow[]) {
  return dependencies
    .filter(
      (dependency) =>
        asText(dependency.successor_task_id ?? dependency.successor_id) === taskId,
    )
    .map((dependency) =>
      asText(dependency.predecessor_task_id ?? dependency.predecessor_id),
    )
    .filter(Boolean);
}

function ControlBadge({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-200"
          : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function ProjectGanttBoard({
  tasks,
  dependencies = [],
  employeeMap,
}: ProjectGanttBoardProps) {
  const [scale, setScale] = useState<GanttScale>("month");
  const [showTasks, setShowTasks] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);
  const markerId = `gantt-arrow-${useId().replace(/:/g, "")}`;

  const normalized = useMemo(
    () =>
      tasks
        .map((task) => normalizeTask(task, employeeMap))
        .filter((task): task is NormalizedTask => Boolean(task))
        .sort(
          (left, right) =>
            left.start.getTime() - right.start.getTime() ||
            left.project.localeCompare(right.project, "fr"),
        ),
    [employeeMap, tasks],
  );

  const visibleTasks = useMemo(
    () =>
      normalized.filter((task) =>
        task.milestone ? showMilestones : showTasks,
      ),
    [normalized, showMilestones, showTasks],
  );

  const { rangeStart, rangeEnd, dates, dayWidth, timelineWidth } = useMemo(() => {
    const config = scaleConfiguration(scale);
    const today = startOfUtcDay(new Date());
    const earliest = visibleTasks.length
      ? new Date(Math.min(...visibleTasks.map((task) => task.start.getTime())))
      : today;
    const latest = visibleTasks.length
      ? new Date(Math.max(...visibleTasks.map((task) => task.end.getTime())))
      : addDays(today, 14);
    const start = addDays(earliest < today ? earliest : today, -config.before);
    const end = addDays(latest > today ? latest : today, config.after);
    const count = Math.max(1, diffDays(start, end) + 1);
    return {
      rangeStart: start,
      rangeEnd: end,
      dates: Array.from({ length: count }, (_, index) => addDays(start, index)),
      dayWidth: config.dayWidth,
      timelineWidth: count * config.dayWidth,
    };
  }, [scale, visibleTasks]);

  const rowIndex = useMemo(
    () => new Map(visibleTasks.map((task, index) => [task.id, index])),
    [visibleTasks],
  );
  const taskMap = useMemo(
    () => new Map(visibleTasks.map((task) => [task.id, task])),
    [visibleTasks],
  );

  const dependencyLines = useMemo(
    () =>
      dependencies.flatMap((dependency) => {
        const predecessorId = asText(
          dependency.predecessor_task_id ?? dependency.predecessor_id,
        );
        const successorId = asText(
          dependency.successor_task_id ?? dependency.successor_id,
        );
        const predecessor = taskMap.get(predecessorId);
        const successor = taskMap.get(successorId);
        const fromRow = rowIndex.get(predecessorId);
        const toRow = rowIndex.get(successorId);
        if (!predecessor || !successor || fromRow === undefined || toRow === undefined)
          return [];
        const fromX = (diffDays(rangeStart, predecessor.end) + 1) * dayWidth;
        const toX = diffDays(rangeStart, successor.start) * dayWidth;
        const fromY = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
        const toY = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;
        const bend = Math.max(fromX + 9, Math.min(toX - 9, (fromX + toX) / 2));
        return [
          {
            id: asText(dependency.id) || `${predecessorId}-${successorId}`,
            path: `M ${fromX} ${fromY} H ${bend} V ${toY} H ${toX}`,
            critical:
              asBoolean(dependency.is_critical) ||
              (predecessor.critical && successor.critical),
          },
        ];
      }),
    [dependencies, dayWidth, rangeStart, rowIndex, taskMap],
  );

  const todayOffset = diffDays(rangeStart, startOfUtcDay(new Date())) * dayWidth;
  const gridWidth = LEFT_WIDTH + timelineWidth;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/70 dark:bg-slate-800/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3 dark:border-slate-600/70 dark:from-sky-900/20 dark:via-slate-800 dark:to-indigo-900/20">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Planification détaillée
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Dépendances, charge, avancement, jalons et chemin critique sur une même vue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ControlBadge active={showTasks} onClick={() => setShowTasks((value) => !value)}>
            <ListChecks className="h-3.5 w-3.5" />
            Tâches
          </ControlBadge>
          <ControlBadge
            active={showMilestones}
            onClick={() => setShowMilestones((value) => !value)}
          >
            <Diamond className="h-3.5 w-3.5" />
            Jalons
          </ControlBadge>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          {(["week", "month", "quarter"] as const).map((value) => (
            <ControlBadge key={value} active={scale === value} onClick={() => setScale(value)}>
              {value === "week" ? "Semaine" : value === "month" ? "Mois" : "Trimestre"}
            </ControlBadge>
          ))}
        </div>
      </div>

      <div className="max-h-[342px] overflow-auto overscroll-contain">
        <div style={{ minWidth: gridWidth }}>
          <div
            role="row"
            className="sticky top-0 z-40 grid h-12 border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            style={{ gridTemplateColumns: `${LEFT_WIDTH}px ${timelineWidth}px` }}
          >
            <div
              className="sticky left-0 z-50 grid h-full items-center border-r border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700"
              style={{ gridTemplateColumns: leftColumns }}
            >
              {["Projet", "Tâche", "Ressource", "Début", "Fin", "Durée", "Charge", "Avancement", "Prédécesseurs", "Float", "Critique"].map(
                (label) => (
                  <div key={label} className="truncate px-2" title={label}>
                    {label}
                  </div>
                ),
              )}
            </div>
            <div className="relative flex h-full overflow-hidden">
              {dates.map((date, index) => {
                const weekend = [0, 6].includes(date.getUTCDay());
                return (
                  <div
                    key={date.toISOString()}
                    className={`flex shrink-0 items-center justify-center border-r border-slate-200/70 px-0.5 text-center normal-case tracking-normal dark:border-slate-600/70 ${weekend ? "bg-slate-100/80 dark:bg-slate-600/70" : ""}`}
                    style={{ width: dayWidth }}
                    title={formatDate(date)}
                  >
                    {axisLabel(date, scale, index)}
                  </div>
                );
              })}
            </div>
          </div>

          {visibleTasks.length ? (
            <div className="relative" style={{ height: visibleTasks.length * ROW_HEIGHT }}>
              {visibleTasks.map((task, index) => {
                const predecessorList = predecessorIds(task.id, dependencies)
                  .map((id) => taskMap.get(id)?.code || id.slice(0, 6))
                  .join(", ");
                const left = diffDays(rangeStart, task.start) * dayWidth;
                const width = Math.max(
                  task.milestone ? 18 : dayWidth,
                  (diffDays(task.start, task.end) + 1) * dayWidth,
                );
                const barColor = task.critical
                  ? "bg-rose-700 dark:bg-rose-600"
                  : task.overdue
                    ? "bg-rose-300 dark:bg-rose-500"
                    : "bg-indigo-300 dark:bg-indigo-400";
                return (
                  <div
                    key={task.id || `${task.name}-${index}`}
                    role="row"
                    className="absolute left-0 grid border-b border-slate-100 text-xs text-slate-700 hover:bg-indigo-50/30 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-indigo-900/15"
                    style={{
                      top: index * ROW_HEIGHT,
                      width: gridWidth,
                      height: ROW_HEIGHT,
                      gridTemplateColumns: `${LEFT_WIDTH}px ${timelineWidth}px`,
                    }}
                  >
                    <div
                      className="sticky left-0 z-30 grid items-center border-r border-slate-200 bg-white shadow-[5px_0_10px_-9px_rgba(15,23,42,0.6)] dark:border-slate-600 dark:bg-slate-800"
                      style={{ gridTemplateColumns: leftColumns }}
                    >
                      <div className="truncate px-2 font-black text-indigo-700 dark:text-indigo-300" title={task.project}>
                        {task.project}
                      </div>
                      <div className="truncate px-2 font-bold" title={`${task.code} ${task.name}`}>
                        {task.code ? `${task.code} · ` : ""}{task.name}
                      </div>
                      <div className="truncate px-2" title={task.employee}>{task.employee}</div>
                      <div className="px-2 tabular-nums">{task.startLabel}</div>
                      <div className="px-2 tabular-nums">{task.endLabel}</div>
                      <div className="px-2 text-right font-bold tabular-nums">{task.duration} j</div>
                      <div className="px-2 text-right font-bold tabular-nums">{task.workload.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h</div>
                      <div className="px-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-600">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="mt-0.5 block text-right text-[10px] font-black tabular-nums">{Math.round(task.progress)} %</span>
                      </div>
                      <div className="truncate px-2" title={predecessorList || "Aucun"}>{predecessorList || "—"}</div>
                      <div className="px-2 text-right font-bold tabular-nums">{task.floatDays} j</div>
                      <div className="px-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${task.critical ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"}`}>
                          {task.critical ? "Oui" : "Non"}
                        </span>
                      </div>
                    </div>

                    <div className="relative">
                      {dates.map((date) => (
                        <div
                          key={date.toISOString()}
                          className={`absolute inset-y-0 border-r border-slate-100 dark:border-slate-700 ${[0, 6].includes(date.getUTCDay()) ? "bg-slate-50/80 dark:bg-slate-700/45" : ""}`}
                          style={{ left: diffDays(rangeStart, date) * dayWidth, width: dayWidth }}
                        />
                      ))}
                      {task.milestone ? (
                        <div
                          className={`absolute top-1/2 z-20 h-4 w-4 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-white shadow-sm ${task.critical || task.overdue ? "bg-rose-600" : "bg-amber-400"}`}
                          style={{ left: left + dayWidth / 2 - 8 }}
                          title={`${task.name} · ${task.progress}%`}
                        />
                      ) : (
                        <div
                          className={`absolute top-1/2 z-20 h-6 -translate-y-1/2 overflow-hidden rounded-md shadow-sm ring-1 ring-white/70 ${barColor}`}
                          style={{ left, width }}
                          title={`${task.name} · ${Math.round(task.progress)} %`}
                        >
                          <div
                            className="h-full bg-emerald-500/70 dark:bg-emerald-300/65"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center px-1 text-[10px] font-black text-slate-950 drop-shadow-sm">
                            {Math.round(task.progress)} %
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <svg
                aria-hidden="true"
                className="pointer-events-none absolute top-0 z-20 overflow-visible"
                style={{ left: LEFT_WIDTH, width: timelineWidth, height: visibleTasks.length * ROW_HEIGHT }}
                viewBox={`0 0 ${timelineWidth} ${visibleTasks.length * ROW_HEIGHT}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {dependencyLines.map((line) => (
                  <path
                    key={line.id}
                    d={line.path}
                    fill="none"
                    stroke={line.critical ? "#be123c" : "#64748b"}
                    strokeWidth={line.critical ? 2 : 1.5}
                    strokeDasharray={line.critical ? undefined : "4 3"}
                    markerEnd={`url(#${markerId})`}
                    opacity={0.82}
                  />
                ))}
              </svg>

              {todayOffset >= 0 && todayOffset <= timelineWidth && (
                <div
                  className="pointer-events-none absolute top-0 z-20 border-l-2 border-rose-500"
                  style={{ left: LEFT_WIDTH + todayOffset, height: visibleTasks.length * ROW_HEIGHT }}
                >
                  <span className="absolute -top-0.5 left-1 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-700 shadow-sm dark:bg-rose-900/80 dark:text-rose-100">
                    Aujourd’hui
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-300">
              Aucune tâche ou jalon daté à afficher dans ce périmètre.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 bg-slate-50/60 px-4 py-2 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-700/45 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-5 rounded bg-indigo-300" /> Tâche planifiée</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-5 rounded bg-emerald-400" /> Avancement réel</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-5 rounded bg-rose-300" /> En retard</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-5 rounded bg-rose-700" /> Chemin critique</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rotate-45 rounded-[1px] bg-amber-400" /> Jalon</span>
        <span className="ml-auto tabular-nums">{visibleTasks.length} élément(s) · du {formatDate(rangeStart)} au {formatDate(rangeEnd)}</span>
      </div>
    </section>
  );
}
