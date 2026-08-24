"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, BarChart3, Check, ChevronDown, Copy, Edit3, Expand, Eye, Filter, Minimize2, MoreHorizontal, Search, X } from "lucide-react";

export type HrAccent = "indigo" | "emerald" | "amber" | "rose" | "sky" | "slate";

export const hrSelectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

export const hrInputClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

export const hrCancelButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-slate-800 dark:text-rose-300";

export const hrSaveButtonClassName =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50";

export const hrResetButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white";

export const hrTableClassName =
  "w-full border-separate border-spacing-0 bg-white text-xs font-normal text-slate-700 dark:bg-slate-700/70 dark:text-slate-200";

export const hrTableHeaderClassName =
  "sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200";

export function HrResetFilters({ onReset, label = "Réinitialiser les filtres" }: { onReset: () => void; label?: string }) {
  return <div className="flex justify-end"><button type="button" onClick={onReset} className={hrResetButtonClassName}><X className="h-4 w-4" />{label}</button></div>;
}

export function HrColumnFilterMenu({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const options = useMemo(() => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" })), [values]);
  const visible = options.filter((value) => value.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")));
  const active = selected.length > 0;

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const bounds = anchorRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const menuWidth = 288;
      const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, bounds.right - menuWidth));
      const estimatedHeight = Math.min(430, 182 + Math.min(options.length, 8) * 38);
      const openAbove = bounds.bottom + estimatedHeight > window.innerHeight && bounds.top > estimatedHeight;
      setPosition({ left, top: openAbove ? Math.max(12, bounds.top - estimatedHeight - 8) : Math.min(window.innerHeight - 80, bounds.bottom + 8) });
    };
    updatePosition();
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  const menu = open && typeof document !== "undefined" ? createPortal(<div ref={menuRef} onClick={(event) => event.stopPropagation()} style={{ left: position.left, top: position.top }} className="fixed z-[300] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white text-left normal-case tracking-normal shadow-2xl dark:border-slate-600 dark:bg-slate-700">
      <div className="border-b border-slate-100 p-3 dark:border-slate-600"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher dans la colonne" className={`${hrInputClassName} h-9 w-full pl-9 text-xs font-medium`} /></label></div>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-600"><button type="button" onClick={() => onChange(options)} className="text-xs font-bold text-indigo-700 hover:underline dark:text-indigo-200">Tout sélectionner</button><button type="button" onClick={() => onChange([])} className="text-xs font-bold text-slate-500 hover:underline dark:text-slate-300">Effacer</button></div>
      <div className="max-h-64 overflow-auto p-2">{visible.map((value) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 dark:text-slate-100 dark:hover:bg-indigo-900/30"><input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} className="sr-only" /><span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.includes(value) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"}`}>{selected.includes(value) && <Check className="h-3 w-3" />}</span><span className="truncate" title={value}>{value}</span></label>)}{!visible.length && <p className="px-3 py-6 text-center text-xs font-semibold text-slate-400">Aucune valeur</p>}</div>
      <div className="flex justify-end border-t border-slate-100 p-2 dark:border-slate-600"><button type="button" onClick={() => setOpen(false)} className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700">Appliquer</button></div>
    </div>, document.body) : null;

  return <div className="relative min-w-max">
    <button ref={anchorRef} type="button" onClick={(event) => { event.stopPropagation(); setOpen((current) => !current); }} className={`group flex w-full min-w-28 items-center justify-between gap-2 text-left ${active ? "text-indigo-700 dark:text-indigo-200" : "text-inherit"}`} aria-label={`Filtrer la colonne ${label}`} aria-expanded={open}>
      <span>{label}</span><span className={`relative inline-flex h-5 w-5 items-center justify-center rounded-md transition ${active ? "bg-indigo-600 text-white" : "text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-700"}`}>{active ? <Filter className="h-3 w-3" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
    </button>
    {menu}
  </div>;
}

export function HrSectionCard({
  icon: Icon,
  title,
  description,
  right,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-900/45 dark:text-sky-200">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p>
            </div>
          </div>
          {right}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function HrMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: HrAccent;
}) {
  const accentClasses: Record<HrAccent, { panel: string; icon: string; value: string }> = {
    indigo: {
      panel: "from-indigo-50/90 via-white to-white border-indigo-100 dark:from-indigo-900/28 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-indigo-800/55",
      icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/55 dark:text-indigo-200",
      value: "text-indigo-700 dark:text-indigo-200",
    },
    emerald: {
      panel: "from-emerald-50/90 via-white to-white border-emerald-100 dark:from-emerald-900/28 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-emerald-800/55",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/55 dark:text-emerald-200",
      value: "text-emerald-700 dark:text-emerald-200",
    },
    amber: {
      panel: "from-amber-50/90 via-white to-white border-amber-100 dark:from-amber-900/28 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-amber-800/55",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/55 dark:text-amber-200",
      value: "text-amber-700 dark:text-amber-200",
    },
    rose: {
      panel: "from-rose-50/90 via-white to-white border-rose-100 dark:from-rose-900/28 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-rose-800/55",
      icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/55 dark:text-rose-200",
      value: "text-rose-700 dark:text-rose-200",
    },
    sky: {
      panel: "from-sky-50/90 via-white to-white border-sky-100 dark:from-sky-900/28 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-sky-800/55",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/55 dark:text-sky-200",
      value: "text-sky-700 dark:text-sky-200",
    },
    slate: {
      panel: "from-slate-50 via-white to-white border-slate-200 dark:from-slate-600/55 dark:via-slate-700/85 dark:to-slate-700/80 dark:border-slate-600/60",
      icon: "bg-slate-100 text-slate-700 dark:bg-slate-600/80 dark:text-slate-200",
      value: "text-slate-700 dark:text-slate-100",
    },
  };
  const classes = accentClasses[accent];

  return (
    <article className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${classes.panel}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 ${classes.icon}`}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p>
            <p className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}>{value}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400" title={description}>{description}</p>
        </div>
      </div>
    </article>
  );
}

export function HrInfo({ label, value, accent = "slate" }: { label: string; value: ReactNode; accent?: HrAccent }) {
  const classes: Record<HrAccent, string> = {
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
  };
  const valueTitle = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  return <div className={`rounded-xl px-3 py-2 ${classes[accent]}`}><p className="text-[10px] font-black uppercase tracking-wide opacity-70">{label}</p><div className={`mt-1 min-w-0 truncate font-bold ${label === "Note globale" ? "flex min-h-16 items-center justify-center text-2xl font-black" : "text-xs"}`} title={valueTitle}>{value}</div></div>;
}

export function HrStatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const normalized = String(status || "").toLowerCase();
  const translations: Record<string, string> = {
    completed: "Clôturé", closed: "Clôturé", done: "Terminé", delivered: "Livré", accepted: "Accepté",
    approved: "Validé", validated: "Validé", manager_approved: "Validé manager", hr_approved: "Validé RH",
    in_progress: "En cours", active: "En cours", pending: "En attente", on_hold: "En attente", submitted: "Soumis",
    prepared: "Préparé", draft: "Brouillon", not_started: "Non démarré", planned: "Planifié", open: "Ouvert",
    rejected: "Refusé", blocked: "Bloqué", delayed: "En retard", late: "En retard", cancelled: "Annulé", archived: "Archivé",
    review: "En revue", compliant: "Conforme", partially_compliant: "Partiellement conforme", non_compliant: "Non conforme",
  };
  const className = normalized === "completed" || normalized === "closed" || normalized === "done" || normalized === "delivered" || normalized === "accepted" || normalized === "approved" || normalized === "validated" || normalized === "manager_approved" || normalized === "hr_approved" || normalized === "compliant"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : normalized === "in_progress" || normalized === "active" || normalized === "pending" || normalized === "on_hold" || normalized === "submitted" || normalized === "manager_input" || normalized === "employee_input" || normalized === "calibration"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : normalized === "prepared" || normalized === "draft" || normalized === "not_started" || normalized === "planned" || normalized === "open"
        ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        : normalized === "rejected" || normalized === "blocked" || normalized === "delayed" || normalized === "late" || normalized === "non_compliant"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          : "bg-slate-100 text-slate-700 dark:bg-slate-600/60 dark:text-slate-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${className}`}>{label || translations[normalized] || status || "Non renseigné"}</span>;
}

export function HrActionMenu({
  labels,
  onView,
  onEdit,
  onArchive,
  onRestore,
  canRestore = false,
}: {
  labels: { view: string; edit: string; archive: string; restore: string };
  onView?: () => void;
  onEdit?: () => void;
  onArchive?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  canRestore?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !buttonRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 240;
      const estimatedHeight = canRestore ? 58 : 160;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
      const top = rect.bottom + estimatedHeight + 12 <= window.innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - estimatedHeight - 8);
      setMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [canRestore, isOpen]);

  async function executeAction(action?: () => void | Promise<void>) {
    if (!action) return;
    setIsProcessing(true);
    try {
      await action();
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="inline-flex">
      <button ref={buttonRef} type="button" aria-label="Voir, modifier, archiver ou réactiver la fiche" title="Voir, modifier, archiver ou réactiver" disabled={isProcessing} onClick={(event) => { event.stopPropagation(); setIsOpen((current) => !current); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/60 dark:bg-slate-700/70 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-700/35 dark:hover:text-indigo-300">
        {isProcessing ? <Archive className="h-3.5 w-3.5 animate-pulse" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
      </button>
      {isOpen && menuPosition && createPortal(
        <div ref={menuRef} onClick={(event) => event.stopPropagation()} style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed z-[320] w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-600/60 dark:bg-slate-700/95">
          {canRestore ? (
            <button type="button" onClick={() => void executeAction(onRestore)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"><ArchiveRestore className="h-4 w-4" />{labels.restore}</button>
          ) : (
            <>
              {onView && <button type="button" onClick={() => void executeAction(onView)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-700/35"><Eye className="h-4 w-4" />{labels.view}</button>}
              {onEdit && <button type="button" onClick={() => void executeAction(onEdit)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-700/35"><Edit3 className="h-4 w-4" />{labels.edit}</button>}
              {onArchive && <><div className="my-1 border-t border-slate-100 dark:border-slate-600/60" /><button type="button" onClick={() => void executeAction(onArchive)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600/70"><Archive className="h-4 w-4" />{labels.archive}</button></>}
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

export type HrChartType = "bar" | "line" | "radar" | "donut" | "matrix";
export type HrChartSeries = { key: string; label: string; color: string };
export type HrChartExportConfig = { type: HrChartType; data: Array<Record<string, string | number>>; nameKey: string; series: HrChartSeries[]; unit?: string };

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath(); context.moveTo(x + r, y); context.lineTo(x + width - r, y); context.quadraticCurveTo(x + width, y, x + width, y + r); context.lineTo(x + width, y + height - r); context.quadraticCurveTo(x + width, y + height, x + width - r, y + height); context.lineTo(x + r, y + height); context.quadraticCurveTo(x, y + height, x, y + height - r); context.lineTo(x, y + r); context.quadraticCurveTo(x, y, x + r, y); context.closePath();
}

function truncate(context: CanvasRenderingContext2D, value: string, width: number) {
  if (context.measureText(value).width <= width) return value;
  let text = value;
  while (text.length > 4 && context.measureText(`${text}…`).width > width) text = text.slice(0, -1);
  return `${text}…`;
}

function createChartCanvas(title: string, description: string, config: HrChartExportConfig) {
  const canvas = document.createElement("canvas");
  canvas.width = 1320; canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const width = canvas.width; const height = canvas.height;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
  roundedRect(ctx, 28, 24, width - 56, height - 48, 30); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 2; ctx.stroke();
  const gradient = ctx.createLinearGradient(28, 24, width - 28, 112); gradient.addColorStop(0, "#f0f9ff"); gradient.addColorStop(0.5, "#ffffff"); gradient.addColorStop(1, "#eef2ff"); roundedRect(ctx, 28, 24, width - 56, 94, 30); ctx.fillStyle = gradient; ctx.fill();
  ctx.fillStyle = "#0f172a"; ctx.font = "800 27px Arial"; ctx.fillText(truncate(ctx, title, 1050), 76, 64);
  ctx.fillStyle = "#64748b"; ctx.font = "15px Arial"; ctx.fillText(truncate(ctx, description, 1120), 76, 91);
  const data = config.data.slice(0, 14);
  const left = 100; const top = 156; const right = 64; const bottom = 132; const chartWidth = width - left - right; const chartHeight = height - top - bottom; const baseY = top + chartHeight;
  const values = data.flatMap((item) => config.series.map((series) => Number(item[series.key] || 0)));
  const maxValue = Math.max(1, ...values);
  if (config.type === "donut") {
    const valueKey = config.series[0]?.key || "value";
    const total = data.reduce((sum, item) => sum + Math.max(0, Number(item[valueKey] || 0)), 0);
    const cx = width / 2; const cy = 390; const outerRadius = 205; const innerRadius = 112;
    let startAngle = -Math.PI / 2;
    data.forEach((item, index) => {
      const value = Math.max(0, Number(item[valueKey] || 0));
      const angle = total ? (value / total) * Math.PI * 2 : 0;
      const endAngle = startAngle + angle;
      ctx.beginPath(); ctx.arc(cx, cy, outerRadius, startAngle, endAngle); ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true); ctx.closePath();
      ctx.fillStyle = config.series[index]?.color || ["#818cf8", "#6ee7b7", "#fcd34d", "#fda4af", "#7dd3fc", "#94a3b8"][index % 6]; ctx.fill();
      if (angle > 0.18) { const middle = startAngle + angle / 2; const labelRadius = (outerRadius + innerRadius) / 2; ctx.fillStyle = "#0f172a"; ctx.font = "800 15px Arial"; ctx.textAlign = "center"; ctx.fillText(`${value}${config.unit || ""}`, cx + Math.cos(middle) * labelRadius, cy + Math.sin(middle) * labelRadius + 5); }
      startAngle = endAngle;
    });
    ctx.fillStyle = "#0f172a"; ctx.font = "900 34px Arial"; ctx.textAlign = "center"; ctx.fillText(`${total}${config.unit || ""}`, cx, cy + 8);
    ctx.fillStyle = "#64748b"; ctx.font = "14px Arial"; ctx.fillText("Total", cx, cy + 34);
    const columns = 3; const legendWidth = 360; const startX = 100; const startY = 645;
    data.forEach((item, index) => { const x = startX + (index % columns) * legendWidth; const y = startY + Math.floor(index / columns) * 30; ctx.fillStyle = config.series[index]?.color || ["#818cf8", "#6ee7b7", "#fcd34d", "#fda4af", "#7dd3fc", "#94a3b8"][index % 6]; roundedRect(ctx, x, y - 12, 18, 12, 4); ctx.fill(); ctx.fillStyle = "#475569"; ctx.font = "13px Arial"; ctx.textAlign = "left"; ctx.fillText(`${truncate(ctx, String(item[config.nameKey] || ""), 220)} : ${Number(item[valueKey] || 0)}${config.unit || ""}`, x + 26, y); });
    return canvas;
  }
  if (config.type === "matrix") {
    const probabilities = [1, 2, 3, 4];
    const impacts = [4, 3, 2, 1];
    const probabilityLabels = ["Improbable", "Possible", "Probable", "Très probable"];
    const impactLabels: Record<number, string> = { 4: "Majeur", 3: "Sérieux", 2: "Moyen", 1: "Faible" };
    const counts = new Map(data.map((item) => [`${Number(item.probability)}-${Number(item.impact)}`, Number(item.count || 0)]));
    const matrixLeft = 190; const matrixTop = 190; const cellWidth = 250; const cellHeight = 92; const gap = 10;
    probabilityLabels.forEach((label, index) => { ctx.fillStyle = "#475569"; ctx.font = "800 15px Arial"; ctx.textAlign = "center"; ctx.fillText(label, matrixLeft + index * (cellWidth + gap) + cellWidth / 2, matrixTop - 22); });
    impacts.forEach((impact, rowIndex) => {
      ctx.fillStyle = "#475569"; ctx.font = "800 15px Arial"; ctx.textAlign = "right"; ctx.fillText(impactLabels[impact], matrixLeft - 22, matrixTop + rowIndex * (cellHeight + gap) + cellHeight / 2 + 5);
      probabilities.forEach((probability, columnIndex) => {
        const score = impact * probability;
        const count = counts.get(`${probability}-${impact}`) || 0;
        const color = score >= 12 ? "#fb7185" : score >= 6 ? "#fdba74" : score >= 3 ? "#fcd34d" : "#6ee7b7";
        const x = matrixLeft + columnIndex * (cellWidth + gap); const y = matrixTop + rowIndex * (cellHeight + gap);
        roundedRect(ctx, x, y, cellWidth, cellHeight, 14); ctx.fillStyle = color; ctx.fill();
        ctx.fillStyle = "#0f172a"; ctx.font = "900 29px Arial"; ctx.textAlign = "center"; ctx.fillText(String(count), x + cellWidth / 2, y + cellHeight / 2 + 10);
      });
    });
    ctx.fillStyle = "#64748b"; ctx.font = "13px Arial"; ctx.textAlign = "left"; ctx.fillText("Volumes de risques par probabilité et impact — faible, modéré, élevé, critique", matrixLeft, 655);
    return canvas;
  }
  ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
  for (let index = 0; index <= 5; index += 1) { const y = top + (chartHeight / 5) * index; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + chartWidth, y); ctx.stroke(); const value = Math.round(maxValue * (1 - index / 5)); ctx.fillStyle = "#64748b"; ctx.font = "12px Arial"; ctx.fillText(`${value}${config.unit || ""}`, 48, y + 4); }
  if (config.type === "bar") {
    const groupWidth = chartWidth / Math.max(1, data.length); const barWidth = Math.max(7, Math.min(26, groupWidth / Math.max(2, config.series.length + 1)));
    data.forEach((item, itemIndex) => { config.series.forEach((series, seriesIndex) => { const value = Number(item[series.key] || 0); const h = (value / maxValue) * chartHeight; const x = left + itemIndex * groupWidth + groupWidth / 2 - (config.series.length * barWidth) / 2 + seriesIndex * barWidth; ctx.fillStyle = series.color; roundedRect(ctx, x, baseY - h, barWidth - 2, h, 5); ctx.fill(); if (value !== 0) { ctx.fillStyle = "#334155"; ctx.font = "800 10px Arial"; ctx.textAlign = "center"; ctx.fillText(`${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}${config.unit || ""}`, x + (barWidth - 2) / 2, Math.max(top + 11, baseY - h - 7)); } }); ctx.save(); ctx.translate(left + itemIndex * groupWidth + groupWidth / 2, baseY + 16); ctx.rotate(-Math.PI / 5); ctx.fillStyle = "#475569"; ctx.font = "12px Arial"; ctx.textAlign = "right"; ctx.fillText(truncate(ctx, String(item[config.nameKey] || ""), 100), 0, 0); ctx.restore(); });
  } else if (config.type === "line") {
    const step = chartWidth / Math.max(1, data.length - 1);
    config.series.forEach((series, seriesIndex) => { ctx.beginPath(); data.forEach((item, index) => { const value = Number(item[series.key] || 0); const x = left + index * step; const y = baseY - (value / maxValue) * chartHeight; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.strokeStyle = series.color; ctx.lineWidth = 4; ctx.stroke(); data.forEach((item, index) => { const value = Number(item[series.key] || 0); const x = left + index * step; const y = baseY - (value / maxValue) * chartHeight; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = series.color; ctx.fill(); if (value !== 0) { ctx.fillStyle = "#334155"; ctx.font = "800 10px Arial"; ctx.textAlign = "center"; ctx.fillText(`${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}${config.unit || ""}`, x, y - 9 - seriesIndex * 12); } }); }); data.forEach((item, index) => { const x = left + index * step; ctx.save(); ctx.translate(x, baseY + 18); ctx.rotate(-Math.PI / 5); ctx.fillStyle = "#475569"; ctx.font = "12px Arial"; ctx.textAlign = "right"; ctx.fillText(truncate(ctx, String(item[config.nameKey] || ""), 100), 0, 0); ctx.restore(); });
  } else {
    const cx = left + chartWidth / 2; const cy = top + chartHeight / 2; const radius = Math.min(chartWidth, chartHeight) / 2 - 45;
    const axes = data.map((item, index) => { const angle = -Math.PI / 2 + (index / Math.max(1, data.length)) * Math.PI * 2; const x = cx + Math.cos(angle) * radius; const y = cy + Math.sin(angle) * radius; return { item, angle, x, y }; });
    for (let level = 1; level <= 5; level += 1) { ctx.beginPath(); axes.forEach((axis, index) => { const x = cx + Math.cos(axis.angle) * radius * level / 5; const y = cy + Math.sin(axis.angle) * radius * level / 5; index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.closePath(); ctx.strokeStyle = "#e2e8f0"; ctx.stroke(); }
    axes.forEach((axis) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(axis.x, axis.y); ctx.strokeStyle = "#cbd5e1"; ctx.stroke(); ctx.fillStyle = "#475569"; ctx.font = "12px Arial"; ctx.textAlign = "center"; ctx.fillText(truncate(ctx, String(axis.item[config.nameKey] || ""), 120), axis.x, axis.y); });
    config.series.forEach((series, seriesIndex) => { ctx.beginPath(); axes.forEach((axis, index) => { const value = Number(axis.item[series.key] || 0); const valueRadius = radius * (value / maxValue); const x = cx + Math.cos(axis.angle) * valueRadius; const y = cy + Math.sin(axis.angle) * valueRadius; index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.closePath(); ctx.globalAlpha = 0.16; ctx.fillStyle = series.color; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = series.color; ctx.lineWidth = seriesIndex === 0 ? 4 : 3; ctx.stroke(); axes.forEach((axis) => { const value = Number(axis.item[series.key] || 0); const valueRadius = radius * (value / maxValue); const x = cx + Math.cos(axis.angle) * valueRadius; const y = cy + Math.sin(axis.angle) * valueRadius; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = series.color; ctx.fill(); ctx.fillStyle = "#334155"; ctx.font = "800 11px Arial"; ctx.textAlign = "center"; ctx.fillText(`${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}${config.unit || ""}`, x, y - 10 - seriesIndex * 12); }); });
  }
  let legendX = 90; const legendY = height - 54; config.series.forEach((series) => { ctx.fillStyle = series.color; roundedRect(ctx, legendX, legendY - 12, 18, 12, 4); ctx.fill(); ctx.fillStyle = "#475569"; ctx.font = "13px Arial"; ctx.textAlign = "left"; ctx.fillText(series.label, legendX + 26, legendY); legendX += 34 + ctx.measureText(series.label).width; });
  return canvas;
}

async function copyChart(title: string, description: string, config: HrChartExportConfig) {
  if (typeof document === "undefined") return "failed" as const;
  const canvas = createChartCanvas(title, description, config);
  if (!canvas) return "failed" as const;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) return "failed" as const;
  if (typeof navigator !== "undefined" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); return "copied" as const; } catch { /* fallback */ }
  }
  const link = document.createElement("a"); link.href = canvas.toDataURL("image/png", 1); link.download = "onepilot-graphique.png"; document.body.appendChild(link); link.click(); link.remove(); return "downloaded" as const;
}

export function HrChartCard({ title, description, exportConfig, children }: { title: string; description: string; exportConfig: HrChartExportConfig; children: ReactNode }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "downloaded" | "failed">("idle");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { const update = () => setExpanded(document.fullscreenElement === containerRef.current); document.addEventListener("fullscreenchange", update); return () => document.removeEventListener("fullscreenchange", update); }, []);
  async function handleCopy() { setCopyStatus("idle"); setCopyStatus(await copyChart(title, description, exportConfig)); window.setTimeout(() => setCopyStatus("idle"), 2600); }
  async function toggleFullscreen() { if (document.fullscreenElement === containerRef.current) await document.exitFullscreen(); else await containerRef.current?.requestFullscreen?.(); }
  return (
    <article ref={containerRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto dark:border-slate-600/60 dark:bg-slate-600/65">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/25 dark:via-slate-700/85 dark:to-indigo-900/25">
        <div className="flex min-w-0 flex-1 items-start gap-3"><span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><BarChart3 className="h-4 w-4" /></span><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-950 dark:text-slate-100" title={title}>{title}</h3><p className="mt-1 truncate whitespace-nowrap text-xs text-slate-500 dark:text-slate-300" title={description}>{description}</p></div></div>
        <div className="flex shrink-0 items-center gap-2">
          {copyStatus !== "idle" && <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-600 shadow-sm dark:border-slate-500/70 dark:bg-slate-600/80 dark:text-slate-100">{copyStatus === "copied" ? "Copié" : copyStatus === "downloaded" ? "PNG téléchargé" : "Copie impossible"}</span>}
          <button type="button" onClick={() => void handleCopy()} title="Copier" aria-label={`Copier ${title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35"><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={() => void toggleFullscreen()} title={expanded ? "Réduire" : "Agrandir"} aria-label={`${expanded ? "Réduire" : "Agrandir"} ${title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-800/70 dark:bg-slate-600/65 dark:text-indigo-200 dark:hover:bg-indigo-900/35">{expanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}</button>
        </div>
      </div>
      <div className="h-[330px] min-h-[330px] min-w-0 w-full p-4">{children}</div>
    </article>
  );
}
