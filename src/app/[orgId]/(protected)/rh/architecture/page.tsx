"use client";

import {
  use,
  useMemo,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BadgeEuro,
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  Copy,
  Database,
  FileSignature,
  FileText,
  Grid2X2,
  Layers3,
  List,
  Loader2,
  Maximize2,
  MapPin,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";

import DataExportMenu, {
  type ExportColumn,
} from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type PageParams = {
  orgId: string;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type HrSettings = {
  id: string;
  organization_id: string;

  default_country_code: string | null;
  default_currency: string | null;
  default_locale: string | null;
  default_timezone: string | null;

  default_weekly_hours: number | null;
  default_working_days_per_week: number | null;
  default_annual_working_days: number | null;
  default_daily_hours: number | null;

  absence_manager_approval_required: boolean | null;
  absence_hr_approval_optional: boolean | null;

  project_time_manager_approval_required: boolean | null;
  project_time_hr_approval_required: boolean | null;

  probation_review_automation_enabled: boolean | null;
  annual_review_automation_enabled: boolean | null;
  professional_review_automation_enabled: boolean | null;
};

type ReferenceItem = {
  id: string;
  code: string;
  name: string;
  is_active?: boolean | null;
};

type ArchitectureData = {
  organization: Organization;
  settings: HrSettings | null;

  sites: ReferenceItem[];
  departments: ReferenceItem[];
  jobFamilies: ReferenceItem[];
  jobs: ReferenceItem[];
  functions: ReferenceItem[];
  contractTypes: ReferenceItem[];
  workSchedules: ReferenceItem[];
  absenceTypes: ReferenceItem[];
  holidayCalendars: ReferenceItem[];
};

type ArchitectureTab =
  | "mapping"
  | "references"
  | "workflows";

type DirectoryView =
  | "cards"
  | "table";

type Accent =
  | "indigo"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "sky";

type ReferenceStatusFilter =
  | "all"
  | "active"
  | "inactive";

type ReferenceGroupFilter =
  | "all"
  | "structure"
  | "jobs"
  | "contracts"
  | "time"
  | "absences";

type ReferenceImpactFilter =
  | "all"
  | "employee"
  | "capacity"
  | "project"
  | "audit";

type ReferenceCategory = {
  id: string;
  tableName: string;
  title: string;
  shortTitle: string;
  description: string;
  businessUse: string;
  group: ReferenceGroupFilter;
  impacts: ReferenceImpactFilter[];
  items: ReferenceItem[];
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  accent: Accent;
};

type ExportRow = {
  category: string;
  code: string;
  name: string;
  status: string;
};

type ReferenceFormState = {
  categoryId: string;
  code: string;
  name: string;
};

type WorkflowNodeKind =
  | "start"
  | "process"
  | "document"
  | "decision"
  | "end";

type WorkflowNode = {
  id: string;
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  actor: string;
  yesLabel?: string;
  noLabel?: string;
};

type WorkflowDefinition = {
  id: string;
  title: string;
  description: string;
  objective: string;
  accent: Accent;
  nodes: WorkflowNode[];
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

const exportColumns: ExportColumn<ExportRow>[] = [
  {
    key: "category",
    label: "Catégorie",
    value: (row) => row.category,
  },
  {
    key: "code",
    label: "Code",
    value: (row) => row.code,
  },
  {
    key: "name",
    label: "Nom",
    value: (row) => row.name,
  },
  {
    key: "status",
    label: "Statut",
    value: (row) => row.status,
  },
];

const initialReferenceForm: ReferenceFormState = {
  categoryId: "sites",
  code: "",
  name: "",
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
}

function formatNumber(
  value: number | null | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getActiveCount(items: ReferenceItem[]) {
  return items.filter(
    (item) => item.is_active !== false,
  ).length;
}

function getReferenceStatus(item: ReferenceItem) {
  return item.is_active === false
    ? "Inactif"
    : "Actif";
}

function getAccentClasses(accent: Accent) {
  const classes = {
    indigo: {
      panel:
        "border-indigo-100 from-indigo-50/85 via-white to-violet-50/65 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20",
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      value:
        "text-indigo-700 dark:text-indigo-300",
      badge:
        "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",
      border:
        "border-indigo-200 dark:border-indigo-900",
    },
    emerald: {
      panel:
        "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      value:
        "text-emerald-700 dark:text-emerald-300",
      badge:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
      border:
        "border-emerald-200 dark:border-emerald-900",
    },
    violet: {
      panel:
        "border-violet-100 from-violet-50/85 via-white to-fuchsia-50/65 dark:border-violet-900/50 dark:from-violet-950/30 dark:via-slate-950 dark:to-fuchsia-950/20",
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
      value:
        "text-violet-700 dark:text-violet-300",
      badge:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
      border:
        "border-violet-200 dark:border-violet-900",
    },
    amber: {
      panel:
        "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      value:
        "text-amber-700 dark:text-amber-300",
      badge:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
      border:
        "border-amber-200 dark:border-amber-900",
    },
    rose: {
      panel:
        "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-950 dark:to-pink-950/20",
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      value:
        "text-rose-700 dark:text-rose-300",
      badge:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      border:
        "border-rose-200 dark:border-rose-900",
    },
    sky: {
      panel:
        "border-sky-100 from-sky-50/85 via-white to-cyan-50/65 dark:border-sky-900/50 dark:from-sky-950/30 dark:via-slate-950 dark:to-cyan-950/20",
      icon:
        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      value:
        "text-sky-700 dark:text-sky-300",
      badge:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
      border:
        "border-sky-200 dark:border-sky-900",
    },
  };

  return classes[accent];
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  accent: Accent;
}) {
  const classes = getAccentClasses(accent);

  return (
    <article
      className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.panel}`}
    >
      <div className="flex h-full items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {label}
            </p>

            <p
              className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}
            >
              {value}
            </p>
          </div>

          <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
  accent,
  rightSlot,
}: {
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  title: string;
  description: string;
  accent: Accent;
  rightSlot?: React.ReactNode;
}) {
  const classes = getAccentClasses(accent);

  return (
    <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 ${classes.icon}`}>
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {rightSlot}
    </div>
  );
}

function ScopePanel({
  searchValue,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusFilterChange,
  groupFilter,
  onGroupFilterChange,
  impactFilter,
  onImpactFilterChange,
  categories,
  resultCount,
  totalCount,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  statusFilter: ReferenceStatusFilter;
  onStatusFilterChange: (value: ReferenceStatusFilter) => void;
  groupFilter: ReferenceGroupFilter;
  onGroupFilterChange: (value: ReferenceGroupFilter) => void;
  impactFilter: ReferenceImpactFilter;
  onImpactFilterChange: (value: ReferenceImpactFilter) => void;
  categories: ReferenceCategory[];
  resultCount: number;
  totalCount: number;
}) {
  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    groupFilter !== "all" ||
    impactFilter !== "all";

  function resetFilters() {
    onSearchChange("");
    onCategoryChange("all");
    onStatusFilterChange("all");
    onGroupFilterChange("all");
    onImpactFilterChange("all");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Périmètre d’analyse
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Les filtres pilotent les KPI, les analyses, les référentiels, les workflows et les exports.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
            {resultCount} résultat
            {resultCount > 1 ? "s" : ""} sur{" "}
            {totalCount}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />

          <input
            type="search"
            value={searchValue}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Rechercher un site, service, métier, contrat, rythme, calendrier ou code..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <select
            value={selectedCategory}
            onChange={(event) =>
              onCategoryChange(event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">
              Toutes les catégories
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.title}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(event) =>
              onGroupFilterChange(
                event.target.value as ReferenceGroupFilter,
              )
            }
            className={selectClassName}
          >
            <option value="all">
              Toutes les familles
            </option>
            <option value="structure">
              Structure
            </option>
            <option value="jobs">
              Métiers & fonctions
            </option>
            <option value="contracts">
              Contrats
            </option>
            <option value="time">
              Temps & capacité
            </option>
            <option value="absences">
              Absences
            </option>
          </select>

          <select
            value={impactFilter}
            onChange={(event) =>
              onImpactFilterChange(
                event.target.value as ReferenceImpactFilter,
              )
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les usages
            </option>
            <option value="employee">
              Fiches collaborateurs
            </option>
            <option value="capacity">
              Capacité
            </option>
            <option value="project">
              Projets / staffing
            </option>
            <option value="audit">
              Audit / conformité
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(
                event.target.value as ReferenceStatusFilter,
              )
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les statuts
            </option>
            <option value="active">
              Actifs uniquement
            </option>
            <option value="inactive">
              Inactifs uniquement
            </option>
          </select>

          <select
            value="all"
            onChange={() => undefined}
            className={selectClassName}
          >
            <option value="all">
              Tous les modules
            </option>
            <option value="resources">
              Ressources
            </option>
            <option value="absences">
              Absences
            </option>
            <option value="staffing">
              Staffing
            </option>
            <option value="performance">
              Performance
            </option>
          </select>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
  activeClassName,
  hoverClassName,
}: {
  label: string;
  icon: ComponentType<{
    className?: string;
  }>;
  isActive: boolean;
  onClick: () => void;
  activeClassName: string;
  hoverClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
        isActive
          ? activeClassName
          : `text-slate-500 ${hoverClassName}`
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: DirectoryView;
  onChange: (view: DirectoryView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
          view === "cards"
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
        }`}
      >
        <Grid2X2 className="h-4 w-4" />
        Cartes
      </button>

      <button
        type="button"
        onClick={() => onChange("table")}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
          view === "table"
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
        }`}
      >
        <List className="h-4 w-4" />
        Tableau
      </button>
    </div>
  );
}

function ReferenceCategoryCard({
  category,
}: {
  category: ReferenceCategory;
}) {
  const classes = getAccentClasses(category.accent);
  const activeItems = category.items.filter(
    (item) => item.is_active !== false,
  );
  const inactiveItems = category.items.filter(
    (item) => item.is_active === false,
  );
  const visibleItems = category.items.slice(0, 5);
  const Icon = category.icon;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className={`border-b bg-gradient-to-r px-4 py-4 ${classes.panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${classes.icon}`}>
              <Icon
                className="h-4 w-4"
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">
                {category.title}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {category.description}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${classes.badge}`}
          >
            {activeItems.length} actif
            {activeItems.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Actifs
            </p>

            <p className={`mt-1 text-xl font-black ${classes.value}`}>
              {activeItems.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Inactifs
            </p>

            <p className="mt-1 text-xl font-black text-slate-500">
              {inactiveItems.length}
            </p>
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {category.businessUse}
        </p>

        <div className="flex flex-wrap gap-2">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <span
                key={item.id}
                className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                  item.is_active === false
                    ? "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
                    : "bg-white text-slate-700 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800"
                }`}
              >
                <span className="truncate">
                  {item.name}
                </span>
              </span>
            ))
          ) : (
            <p className="text-xs font-bold text-slate-400">
              Aucun élément dans ce périmètre.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ReferenceTable({
  rows,
}: {
  rows: Array<{
    category: ReferenceCategory;
    item: ReferenceItem;
  }>;
}) {
  return (
  <div className="max-h-[360px] overflow-auto">
    <table className="w-full min-w-[1100px] border-collapse">
      <thead className="sticky top-0 z-10">
        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Catégorie
            </th>

            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Code
            </th>

            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Nom
            </th>

            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Usage métier
            </th>

            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Famille
            </th>

            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Statut
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(({ category, item }) => {
            const classes = getAccentClasses(category.accent);

            return (
              <tr
                key={`${category.id}-${item.id}`}
                className="border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/20"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${classes.badge}`}
                  >
                    {category.shortTitle}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {item.code}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="max-w-72 truncate text-sm font-black text-slate-950 dark:text-white">
                    {item.name}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {category.businessUse}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {category.group}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                      item.is_active === false
                        ? "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
                    }`}
                  >
                    {getReferenceStatus(item)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-indigo-400" />

          <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
            Aucun référentiel trouvé
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Modifie ou réinitialise les filtres du périmètre d’analyse.
          </p>
        </div>
      )}
    </div>
  );
}

function ReferenceDenseBoard({
  categories,
}: {
  categories: ReferenceCategory[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {categories.map((category) => {
        const classes = getAccentClasses(category.accent);
        const Icon = category.icon;

        return (
          <section
            key={category.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${classes.icon}`}>
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={1.9}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                    {category.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {category.businessUse}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${classes.badge}`}
              >
                {category.items.length}
              </span>
            </div>

            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {category.items.length > 0 ? (
                category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-2.5 transition hover:border-indigo-200 hover:bg-indigo-50/60 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20 ${
                      item.is_active === false
                        ? "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {item.code}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                          item.is_active === false
                            ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        }`}
                      >
                        {item.is_active === false ? "Off" : "On"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="sm:col-span-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-500">
                    Aucun élément à afficher.
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWorkflowCopyText(workflow: WorkflowDefinition) {
  const lines = [
    `Workflow : ${workflow.title}`,
    workflow.description,
    "",
    workflow.objective,
    "",
    "Étapes :",
    ...workflow.nodes.map(
      (node, index) =>
        `${index + 1}. [${node.kind}] ${node.title} — ${node.actor} — ${node.description}`,
    ),
  ];

  return lines.join("\n");
}

function buildWorkflowSvg(workflow: WorkflowDefinition) {
  const nodeWidth = 170;
  const nodeHeight = 92;
  const gap = 72;
  const padding = 32;
  const titleHeight = 74;

  const width =
    padding * 2 +
    workflow.nodes.length * nodeWidth +
    (workflow.nodes.length - 1) * gap;

  const height = 250;

  const nodeFillByKind: Record<WorkflowNodeKind, string> = {
    start: "#EEF2FF",
    process: "#FFFFFF",
    document: "#F8FAFC",
    decision: "#FFFBEB",
    end: "#ECFDF5",
  };

  const nodeStrokeByKind: Record<WorkflowNodeKind, string> = {
    start: "#6366F1",
    process: "#CBD5E1",
    document: "#94A3B8",
    decision: "#F59E0B",
    end: "#10B981",
  };

  const nodesSvg = workflow.nodes
    .map((node, index) => {
      const x = padding + index * (nodeWidth + gap);
      const y = titleHeight + 48;
      const centerX = x + nodeWidth / 2;
      const centerY = y + nodeHeight / 2;

      const title = escapeSvgText(node.title);
      const actor = escapeSvgText(node.actor);
      const description = escapeSvgText(node.description);

      const shape =
        node.kind === "decision"
          ? `
            <polygon
              points="${centerX},${y - 4} ${x + nodeWidth + 4},${centerY} ${centerX},${y + nodeHeight + 4} ${x - 4},${centerY}"
              fill="${nodeFillByKind[node.kind]}"
              stroke="${nodeStrokeByKind[node.kind]}"
              stroke-width="2"
            />
          `
          : node.kind === "start" || node.kind === "end"
            ? `
              <rect
                x="${x}"
                y="${y}"
                width="${nodeWidth}"
                height="${nodeHeight}"
                rx="46"
                fill="${nodeFillByKind[node.kind]}"
                stroke="${nodeStrokeByKind[node.kind]}"
                stroke-width="2"
              />
            `
            : `
              <rect
                x="${x}"
                y="${y}"
                width="${nodeWidth}"
                height="${nodeHeight}"
                rx="14"
                fill="${nodeFillByKind[node.kind]}"
                stroke="${nodeStrokeByKind[node.kind]}"
                stroke-width="2"
              />
              ${
                node.kind === "document"
                  ? `
                    <path
                      d="M ${x + nodeWidth - 26} ${y} L ${x + nodeWidth} ${y + 26} L ${x + nodeWidth - 26} ${y + 26} Z"
                      fill="#E2E8F0"
                      stroke="#CBD5E1"
                      stroke-width="1"
                    />
                  `
                  : ""
              }
            `;

      const connector =
        index < workflow.nodes.length - 1
          ? `
            <line
              x1="${x + nodeWidth + 10}"
              y1="${centerY}"
              x2="${x + nodeWidth + gap - 14}"
              y2="${centerY}"
              stroke="#94A3B8"
              stroke-width="2"
            />
            <polygon
              points="${x + nodeWidth + gap - 14},${centerY - 6} ${x + nodeWidth + gap},${centerY} ${x + nodeWidth + gap - 14},${centerY + 6}"
              fill="#94A3B8"
            />
            ${
              node.kind === "decision"
                ? `
                  <text
                    x="${x + nodeWidth + 24}"
                    y="${centerY - 10}"
                    font-family="Arial, sans-serif"
                    font-size="10"
                    font-weight="700"
                    fill="#047857"
                  >
                    ${escapeSvgText(node.yesLabel ?? "Oui")}
                  </text>
                `
                : ""
            }
          `
          : "";

      return `
        <g>
          ${shape}
          <text
            x="${centerX}"
            y="${centerY - 18}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="13"
            font-weight="700"
            fill="#0F172A"
          >
            ${title}
          </text>
          <text
            x="${centerX}"
            y="${centerY + 2}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="10"
            font-weight="700"
            fill="#64748B"
          >
            ${actor}
          </text>
          <text
            x="${centerX}"
            y="${centerY + 22}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="9"
            fill="#64748B"
          >
            ${description.length > 42 ? `${description.slice(0, 42)}...` : description}
          </text>
          ${connector}
        </g>
      `;
    })
    .join("");

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${width}"
      height="${height}"
      viewBox="0 0 ${width} ${height}"
    >
      <rect width="100%" height="100%" fill="#FFFFFF" />
      <text
        x="${padding}"
        y="34"
        font-family="Arial, sans-serif"
        font-size="20"
        font-weight="800"
        fill="#0F172A"
      >
        ${escapeSvgText(workflow.title)}
      </text>
      <text
        x="${padding}"
        y="58"
        font-family="Arial, sans-serif"
        font-size="12"
        fill="#64748B"
      >
        ${escapeSvgText(workflow.description)}
      </text>
      ${nodesSvg}
      <text
        x="${padding}"
        y="${height - 24}"
        font-family="Arial, sans-serif"
        font-size="11"
        fill="#475569"
      >
        ${escapeSvgText(workflow.objective)}
      </text>
    </svg>
  `.trim();
}

async function copyWorkflowDiagram(workflow: WorkflowDefinition) {
  const svg = buildWorkflowSvg(workflow);

  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      const svgBlob = new Blob([svg], {
        type: "image/svg+xml",
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": svgBlob,
          "text/plain": new Blob(
            [buildWorkflowCopyText(workflow)],
            {
              type: "text/plain",
            },
          ),
        }),
      ]);

      return;
    }
  } catch {
    // Fallback texte ci-dessous.
  }

  await navigator.clipboard.writeText(
    buildWorkflowCopyText(workflow),
  );
}

function FlowNode({
  node,
  accent,
  isLarge = false,
}: {
  node: WorkflowNode;
  accent: Accent;
  isLarge?: boolean;
}) {
  const classes = getAccentClasses(accent);
  const nodeWidth = isLarge ? "min-w-[220px]" : "min-w-[160px]";
  const nodeHeight = isLarge ? "min-h-[132px]" : "min-h-[104px]";

  if (node.kind === "decision") {
    return (
      <div
        className={`relative flex ${nodeHeight} ${nodeWidth} items-center justify-center px-5`}
      >
        <div
          className={`flex ${isLarge ? "h-32 w-32" : "h-24 w-24"} rotate-45 items-center justify-center border bg-white shadow-sm dark:bg-slate-950 ${classes.border}`}
        >
          <div className="-rotate-45 px-2 text-center">
            <p className={`${isLarge ? "text-xs" : "text-[10px]"} font-black text-slate-950 dark:text-white`}>
              {node.title}
            </p>

            <p className="mt-1 text-[9px] leading-3 text-slate-500 dark:text-slate-400">
              {node.actor}
            </p>
          </div>
        </div>

        <span className="absolute right-1 top-4 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 ring-1 ring-emerald-200">
          {node.yesLabel ?? "Oui"}
        </span>

        <span className="absolute bottom-4 right-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-700 ring-1 ring-rose-200">
          {node.noLabel ?? "Non"}
        </span>
      </div>
    );
  }

  if (node.kind === "document") {
    return (
      <div
        className={`relative ${nodeHeight} ${nodeWidth} rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-950 ${classes.border}`}
      >
        <div className="absolute right-0 top-0 h-6 w-6 rounded-bl-xl border-b border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />

        <div className="flex items-start gap-2">
          <div className={`rounded-lg p-1.5 ${classes.icon}`}>
            <FileText className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0">
            <p className={`${isLarge ? "text-sm" : "text-xs"} font-black text-slate-950 dark:text-white`}>
              {node.title}
            </p>

            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              {node.actor}
            </p>
          </div>
        </div>

        <p className={`mt-2 ${isLarge ? "text-xs leading-5" : "text-[10px] leading-4"} text-slate-500 dark:text-slate-400`}>
          {node.description}
        </p>
      </div>
    );
  }

  const isStartOrEnd =
    node.kind === "start" ||
    node.kind === "end";

  return (
    <div
      className={`${nodeHeight} ${nodeWidth} border p-3 shadow-sm dark:bg-slate-950 ${
        isStartOrEnd
          ? `rounded-full bg-white ${classes.border}`
          : `rounded-2xl bg-white ${classes.border}`
      }`}
    >
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className={`rounded-lg p-1.5 ${classes.icon}`}>
          {node.kind === "start" ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : node.kind === "end" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <ClipboardCheck className="h-3.5 w-3.5" />
          )}
        </div>

        <p className={`mt-2 ${isLarge ? "text-sm" : "text-xs"} font-black text-slate-950 dark:text-white`}>
          {node.title}
        </p>

        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
          {node.actor}
        </p>

        <p className={`mt-1.5 ${isLarge ? "text-xs leading-5" : "text-[10px] leading-4"} text-slate-500 dark:text-slate-400`}>
          {node.description}
        </p>
      </div>
    </div>
  );
}

function FlowConnector({
  label,
}: {
  label?: string;
}) {
  return (
    <div className="flex min-w-[48px] flex-col items-center justify-center">
      {label && (
        <span className="mb-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {label}
        </span>
      )}

      <div className="flex w-full items-center">
        <div className="h-0.5 flex-1 bg-slate-300 dark:bg-slate-700" />
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </div>
    </div>
  );
}

function WorkflowFlowchart({
  workflow,
  onOpen,
  isLarge = false,
}: {
  workflow: WorkflowDefinition;
  onOpen?: (workflow: WorkflowDefinition) => void;
  isLarge?: boolean;
}) {
  const classes = getAccentClasses(workflow.accent);

  async function copyWorkflow() {
  await copyWorkflowDiagram(workflow);
}

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={Workflow}
        title={workflow.title}
        description={workflow.description}
        accent={workflow.accent}
        rightSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void copyWorkflow()}
              title="Copier le schéma"
              aria-label="Copier le schéma"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ring-1 transition hover:-translate-y-0.5 ${classes.badge}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(workflow)}
                title="Agrandir le schéma"
                aria-label="Agrandir le schéma"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ring-1 transition hover:-translate-y-0.5 ${classes.badge}`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        }
      />

      <div className="overflow-x-auto p-4">
        <div className="flex min-w-max items-center">
          {workflow.nodes.map((node, index) => (
            <div
              key={node.id}
              className="flex items-center"
            >
              <FlowNode
                node={node}
                accent={workflow.accent}
                isLarge={isLarge}
              />

              {index < workflow.nodes.length - 1 && (
                <FlowConnector
                  label={
                    node.kind === "decision"
                      ? "Oui"
                      : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {workflow.objective}
        </p>
      </div>
    </section>
  );
}

function WorkflowFullScreen({
  workflow,
  onClose,
}: {
  workflow: WorkflowDefinition | null;
  onClose: () => void;
}) {
  if (!workflow) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              Workflow RH
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              {workflow.title}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Version agrandie pour capture d’écran, documentation interne ou support d’audit.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          <WorkflowFlowchart
            workflow={workflow}
            isLarge
          />
        </div>
      </div>
    </div>
  );
}

function ReferenceCreatePanel({
  isOpen,
  categories,
  organizationId,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  categories: ReferenceCategory[];
  organizationId: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<ReferenceFormState>(
    initialReferenceForm,
  );

  const selectedCategory =
    categories.find(
      (category) => category.id === form.categoryId,
    ) ?? categories[0];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) {
        throw new Error("Catégorie de référentiel introuvable.");
      }

      const code = normalizeCode(form.code);
      const name = form.name.trim();

      if (!code || !name) {
        throw new Error("Le code et le nom sont obligatoires.");
      }

      const { error } = await (
        supabase.from(selectedCategory.tableName as never) as any
      ).insert({
        organization_id: organizationId,
        code,
        name,
        is_active: true,
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: async () => {
      setForm(initialReferenceForm);
      await onCreated();
      onClose();
    },
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Fermer le formulaire de référentiel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Plus className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                Architecture RH
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                Nouveau référentiel
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Crée un élément simple utilisé ensuite dans Ressources, Absences, Staffing et Performance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            createMutation.mutate();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {createMutation.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "La création a échoué."}
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Catégorie
              </label>

              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                disabled={createMutation.isPending}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Code
              </label>

              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                disabled={createMutation.isPending}
                placeholder="Ex : PARIS, DEV, CDI..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Nom
              </label>

              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                disabled={createMutation.isPending}
                placeholder="Nom affiché dans les formulaires"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {selectedCategory && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                  Impact métier
                </p>

                <p className="mt-2 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                  {selectedCategory.businessUse}
                </p>
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Créer le référentiel
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (
    supabase.from("organizations" as never) as any
  ).select("id, name, slug");

  const { data, error } = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();

  if (error) {
    throw new Error(
      `Impossible d’identifier l’organisation : ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error("L’organisation demandée est introuvable.");
  }

  return data as Organization;
}

async function fetchReferenceItems(
  tableName: string,
  organizationId: string,
): Promise<ReferenceItem[]> {
  const { data, error } = await (
    supabase.from(tableName as never) as any
  )
    .select("id, code, name, is_active")
    .eq("organization_id", organizationId)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Impossible de charger ${tableName} : ${error.message}`,
    );
  }

  return (data ?? []) as ReferenceItem[];
}

async function loadArchitectureData(
  slugOrId: string,
): Promise<ArchitectureData> {
  const organization = await resolveOrganization(slugOrId);

  const [
    settingsResult,
    sites,
    departments,
    jobFamilies,
    jobs,
    functions,
    contractTypes,
    workSchedules,
    absenceTypes,
    holidayCalendars,
  ] = await Promise.all([
    (
      supabase.from("hr_settings" as never) as any
    )
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle(),

    fetchReferenceItems("hr_sites", organization.id),
    fetchReferenceItems("hr_departments", organization.id),
    fetchReferenceItems("hr_job_families", organization.id),
    fetchReferenceItems("hr_jobs", organization.id),
    fetchReferenceItems("hr_functions", organization.id),
    fetchReferenceItems("hr_contract_types", organization.id),
    fetchReferenceItems("hr_work_schedules", organization.id),
    fetchReferenceItems("hr_absence_types", organization.id),
    fetchReferenceItems("hr_holiday_calendars", organization.id),
  ]);

  if (settingsResult.error) {
    throw new Error(
      `Impossible de charger les paramètres RH : ${settingsResult.error.message}`,
    );
  }

  return {
    organization,
    settings: (settingsResult.data as HrSettings | null) ?? null,
    sites,
    departments,
    jobFamilies,
    jobs,
    functions,
    contractTypes,
    workSchedules,
    absenceTypes,
    holidayCalendars,
  };
}

export default function HrArchitecturePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();

  const [
    activeTab,
    setActiveTab,
  ] = useState<ArchitectureTab>("mapping");

  const [
    directoryView,
    setDirectoryView,
  ] = useState<DirectoryView>("cards");

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<ReferenceStatusFilter>("all");

  const [
    groupFilter,
    setGroupFilter,
  ] = useState<ReferenceGroupFilter>("all");

  const [
    impactFilter,
    setImpactFilter,
  ] = useState<ReferenceImpactFilter>("all");

  const [
    isReferenceFormOpen,
    setIsReferenceFormOpen,
  ] = useState(false);

  const [
    openedWorkflow,
    setOpenedWorkflow,
  ] = useState<WorkflowDefinition | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["hr-architecture", orgId],
    queryFn: () => loadArchitectureData(orgId),
    enabled: Boolean(orgId),
  });

  const referenceCategories = useMemo<ReferenceCategory[]>(() => {
    if (!data) {
      return [];
    }

    return [
      {
        id: "sites",
        tableName: "hr_sites",
        title: "Sites",
        shortTitle: "Sites",
        description: "Sièges, agences et implantations.",
        businessUse:
          "Utilisé pour rattacher les collaborateurs, filtrer l’annuaire, segmenter les absences et piloter la capacité par localisation.",
        group: "structure",
        impacts: ["employee", "capacity", "project", "audit"],
        items: data.sites,
        icon: MapPin,
        accent: "indigo",
      },
      {
        id: "departments",
        tableName: "hr_departments",
        title: "Départements",
        shortTitle: "Services",
        description: "Services et unités de l’organisation.",
        businessUse:
          "Structure les équipes, managers, charges, budgets, droits de validation et reporting RH.",
        group: "structure",
        impacts: ["employee", "capacity", "project", "audit"],
        items: data.departments,
        icon: Network,
        accent: "emerald",
      },
      {
        id: "job-families",
        tableName: "hr_job_families",
        title: "Familles de métiers",
        shortTitle: "Familles",
        description: "Classification générale des métiers.",
        businessUse:
          "Prépare l’analyse compétences, staffing, filières de progression et cohérence des fiches de poste.",
        group: "jobs",
        impacts: ["employee", "capacity", "project"],
        items: data.jobFamilies,
        icon: UsersRound,
        accent: "violet",
      },
      {
        id: "jobs",
        tableName: "hr_jobs",
        title: "Métiers",
        shortTitle: "Métiers",
        description: "Métiers opérationnels disponibles.",
        businessUse:
          "Relie les collaborateurs aux besoins projets, aux compétences attendues et aux profils de staffing.",
        group: "jobs",
        impacts: ["employee", "capacity", "project"],
        items: data.jobs,
        icon: Users,
        accent: "amber",
      },
      {
        id: "functions",
        tableName: "hr_functions",
        title: "Fonctions",
        shortTitle: "Fonctions",
        description: "Fonctions et responsabilités.",
        businessUse:
          "Précise le rôle opérationnel, la séniorité, le positionnement dans l’organisation et les responsabilités.",
        group: "jobs",
        impacts: ["employee", "capacity", "project"],
        items: data.functions,
        icon: Building2,
        accent: "sky",
      },
      {
        id: "contract-types",
        tableName: "hr_contract_types",
        title: "Types de contrat",
        shortTitle: "Contrats",
        description: "Contrats salariés et externes.",
        businessUse:
          "Pilote le statut, les règles d’essai, les préavis, les coûts et les droits liés au collaborateur.",
        group: "contracts",
        impacts: ["employee", "capacity", "audit"],
        items: data.contractTypes,
        icon: FileSignature,
        accent: "violet",
      },
      {
        id: "work-schedules",
        tableName: "hr_work_schedules",
        title: "Rythmes de travail",
        shortTitle: "Rythmes",
        description: "Horaires, temps partiels et forfaits.",
        businessUse:
          "Alimente les calculs de capacité, absences, charge disponible, coûts journaliers et staffing.",
        group: "time",
        impacts: ["employee", "capacity", "project", "audit"],
        items: data.workSchedules,
        icon: Clock3,
        accent: "emerald",
      },
      {
        id: "absence-types",
        tableName: "hr_absence_types",
        title: "Types d’absence",
        shortTitle: "Absences",
        description: "Congés, RTT et indisponibilités.",
        businessUse:
          "Détermine les règles d’absence, impacts capacité, validations, soldes et historique RH.",
        group: "absences",
        impacts: ["employee", "capacity", "audit"],
        items: data.absenceTypes,
        icon: CalendarDays,
        accent: "amber",
      },
      {
        id: "holiday-calendars",
        tableName: "hr_holiday_calendars",
        title: "Calendriers",
        shortTitle: "Calendriers",
        description: "Calendriers et jours fériés.",
        businessUse:
          "Neutralise les jours non travaillés et sécurise les calculs de capacité par pays ou site.",
        group: "absences",
        impacts: ["employee", "capacity", "audit"],
        items: data.holidayCalendars,
        icon: CalendarCheck2,
        accent: "rose",
      },
    ];
  }, [data]);

  const filteredCategories = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return referenceCategories
      .filter((category) =>
        selectedCategory === "all"
          ? true
          : category.id === selectedCategory,
      )
      .filter((category) =>
        groupFilter === "all"
          ? true
          : category.group === groupFilter,
      )
      .filter((category) =>
        impactFilter === "all"
          ? true
          : category.impacts.includes(impactFilter),
      )
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesSearch =
            search.length === 0 ||
            [
              category.title,
              category.description,
              category.businessUse,
              item.name,
              item.code,
            ]
              .join(" ")
              .toLowerCase()
              .includes(search);

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" &&
              item.is_active !== false) ||
            (statusFilter === "inactive" &&
              item.is_active === false);

          return matchesSearch && matchesStatus;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [
    referenceCategories,
    searchValue,
    selectedCategory,
    statusFilter,
    groupFilter,
    impactFilter,
  ]);

  const flatReferenceRows = useMemo(
    () =>
      filteredCategories.flatMap((category) =>
        category.items.map((item) => ({
          category,
          item,
        })),
      ),
    [filteredCategories],
  );

  const exportRows = useMemo<ExportRow[]>(
    () =>
      referenceCategories.flatMap((category) =>
        category.items.map((item) => ({
          category: category.title,
          code: item.code,
          name: item.name,
          status: getReferenceStatus(item),
        })),
      ),
    [referenceCategories],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Architecture RH"
          subtitle="Chargement des référentiels de l’organisation."
          flush
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[106px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Architecture RH"
          subtitle="Configuration structurelle du domaine Ressources humaines."
          flush
        />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            {error instanceof Error
              ? error.message
              : "Une erreur inconnue est survenue."}
          </p>
        </div>
      </div>
    );
  }

  const settings = data.settings;

  const totalReferenceCount = exportRows.length;

  const activeReferenceCount = exportRows.filter(
    (row) => row.status === "Actif",
  ).length;

  const inactiveReferenceCount = exportRows.filter(
    (row) => row.status === "Inactif",
  ).length;

  const structureCount =
    getActiveCount(data.sites) +
    getActiveCount(data.departments);

  const jobCount =
    getActiveCount(data.jobFamilies) +
    getActiveCount(data.jobs) +
    getActiveCount(data.functions);

  const workflows: WorkflowDefinition[] = [
    {
      id: "absence-request",
      title: "Demande d’absence",
      description:
        "Demande, validation manager, contrôle RH et impact capacité.",
      objective:
        "Objectif : sécuriser les droits, la continuité opérationnelle et la traçabilité des absences.",
      accent: "emerald",
      nodes: [
        {
          id: "start",
          kind: "start",
          title: "Début",
          description: "Le collaborateur prépare sa demande.",
          actor: "Collaborateur",
        },
        {
          id: "request",
          kind: "document",
          title: "Demande",
          description: "Dates, type, commentaire et justificatif.",
          actor: "Collaborateur",
        },
        {
          id: "manager-check",
          kind: "decision",
          title: "Manager ?",
          description: "Validation N+1 requise.",
          actor: "OnePilot",
          yesLabel: "Oui",
          noLabel: "Auto",
        },
        {
          id: "manager",
          kind: "process",
          title: "Validation",
          description: "Contrôle planning et continuité.",
          actor: "Manager",
        },
        {
          id: "hr-check",
          kind: "decision",
          title: "RH ?",
          description: "Contrôle RH optionnel.",
          actor: "OnePilot",
        },
        {
          id: "end",
          kind: "end",
          title: "Capacité",
          description: "Absence intégrée au planning.",
          actor: "OnePilot",
        },
      ],
    },
    {
      id: "time-entry",
      title: "Temps projet",
      description:
        "Saisie, validation N+1, contrôle RH et valorisation projet.",
      objective:
        "Objectif : fiabiliser le réalisé, les coûts, la marge, la facturation et la performance projet.",
      accent: "indigo",
      nodes: [
        {
          id: "start",
          kind: "start",
          title: "Début",
          description: "Saisie des temps.",
          actor: "Collaborateur",
        },
        {
          id: "timesheet",
          kind: "document",
          title: "Feuille",
          description: "Projet, tâche, heures, période.",
          actor: "Collaborateur",
        },
        {
          id: "approval",
          kind: "decision",
          title: "Valide ?",
          description: "Validation manager.",
          actor: "Manager",
        },
        {
          id: "finance",
          kind: "process",
          title: "Valoriser",
          description: "Coût, marge, consommé.",
          actor: "Finance",
        },
        {
          id: "end",
          kind: "end",
          title: "Performance",
          description: "Reporting alimenté.",
          actor: "OnePilot",
        },
      ],
    },
    {
      id: "staffing-capacity",
      title: "Staffing & capacité",
      description:
        "Besoin projet, compétences, disponibilité, coût et arbitrage.",
      objective:
        "Objectif : proposer le bon profil au bon moment selon capacité, compétences, prix et marge.",
      accent: "violet",
      nodes: [
        {
          id: "need",
          kind: "document",
          title: "Besoin",
          description: "Profil, charge, dates, budget.",
          actor: "Projet",
        },
        {
          id: "capacity",
          kind: "process",
          title: "Capacité",
          description: "Disponibilité nette absences.",
          actor: "OnePilot",
        },
        {
          id: "skills",
          kind: "decision",
          title: "Compétent ?",
          description: "Matching compétences.",
          actor: "Manager",
        },
        {
          id: "price",
          kind: "decision",
          title: "Prix OK ?",
          description: "Coût, TJM, marge.",
          actor: "Finance",
        },
        {
          id: "assign",
          kind: "process",
          title: "Affecter",
          description: "Allocation confirmée.",
          actor: "Manager",
        },
        {
          id: "end",
          kind: "end",
          title: "Plan",
          description: "Charge mise à jour.",
          actor: "OnePilot",
        },
      ],
    },
    {
      id: "onboarding",
      title: "Onboarding",
      description:
        "Pré-intégration, documents, matériel, accès et validation d’arrivée.",
      objective:
        "Objectif : garantir une arrivée conforme, documentée et sans oubli opérationnel.",
      accent: "sky",
      nodes: [
        {
          id: "start",
          kind: "start",
          title: "Préboarding",
          description: "Fiche créée.",
          actor: "RH",
        },
        {
          id: "docs",
          kind: "document",
          title: "Dossier",
          description: "Contrat, pièces, politique.",
          actor: "RH",
        },
        {
          id: "access",
          kind: "process",
          title: "Accès",
          description: "IT, outils, matériel.",
          actor: "IT",
        },
        {
          id: "ready",
          kind: "decision",
          title: "Prêt ?",
          description: "Contrôle checklist.",
          actor: "RH",
        },
        {
          id: "end",
          kind: "end",
          title: "Actif",
          description: "Collaborateur intégré.",
          actor: "OnePilot",
        },
      ],
    },
    {
      id: "offboarding",
      title: "Offboarding",
      description:
        "Départ, restitution, révocation accès, solde et archivage.",
      objective:
        "Objectif : sécuriser la sortie, protéger les accès et conserver l’historique.",
      accent: "rose",
      nodes: [
        {
          id: "notice",
          kind: "document",
          title: "Départ",
          description: "Préavis ou fin contrat.",
          actor: "RH",
        },
        {
          id: "handover",
          kind: "process",
          title: "Passation",
          description: "Transfert projets et savoir.",
          actor: "Manager",
        },
        {
          id: "access",
          kind: "decision",
          title: "Accès clos ?",
          description: "Sécurité et matériel.",
          actor: "IT",
        },
        {
          id: "balance",
          kind: "document",
          title: "Solde",
          description: "Congés, documents, finance.",
          actor: "RH",
        },
        {
          id: "archive",
          kind: "end",
          title: "Archiver",
          description: "Fiche conservée.",
          actor: "OnePilot",
        },
      ],
    },
    {
      id: "skills",
      title: "Compétences",
      description:
        "Déclaration, validation, niveau, preuve et exploitation staffing.",
      objective:
        "Objectif : relier compétences, capacité et besoins projet pour proposer des profils fiables.",
      accent: "amber",
      nodes: [
        {
          id: "declare",
          kind: "document",
          title: "Déclarer",
          description: "Compétence et niveau.",
          actor: "Collaborateur",
        },
        {
          id: "proof",
          kind: "document",
          title: "Preuve",
          description: "Certificat ou expérience.",
          actor: "Collaborateur",
        },
        {
          id: "validate",
          kind: "decision",
          title: "Validée ?",
          description: "Contrôle manager/RH.",
          actor: "Manager",
        },
        {
          id: "matrix",
          kind: "process",
          title: "Matrice",
          description: "Compétence exploitable.",
          actor: "OnePilot",
        },
        {
          id: "staffing",
          kind: "end",
          title: "Staffing",
          description: "Profil proposé.",
          actor: "OnePilot",
        },
      ],
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Architecture RH"
          subtitle={`Référentiels, capacités et processus structurants de ${data.organization.name}.`}
          flush
          actions={
            <>
              <DataExportMenu
                data={exportRows}
                columns={exportColumns}
                fileName={`architecture_rh_${data.organization.slug}`}
                sheetName="Architecture RH"
              />

              <button
                type="button"
                onClick={() => setIsReferenceFormOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau référentiel
              </button>
            </>
          }
        />

        <PageTutorial
          title="Configurer et contrôler le socle RH"
          description="Cette page rassemble les référentiels réellement enregistrés dans Supabase, les paramètres de capacité et les circuits de validation utilisés par les autres modules RH."
          objectives={[
            "Structurer les sites, départements, métiers, fonctions et contrats.",
            "Définir les bases horaires utilisées dans Ressources, Absences, Staffing et Performance.",
            "Contrôler les référentiels proposés dans les fiches collaborateurs.",
            "Visualiser les workflows RH sous forme de processus auditables.",
          ]}
          steps={[
            {
              title: "Contrôler les indicateurs",
              description:
                "Vérifie les volumes actifs, inactifs et les paramètres de capacité.",
            },
            {
              title: "Définir le périmètre",
              description:
                "Utilise recherche, catégorie, famille, usage et statut dans le bloc Périmètre d’analyse.",
            },
            {
              title: "Analyser la cartographie",
              description:
                "Consulte les référentiels sous forme de cartes ou tableau.",
            },
            {
              title: "Créer un référentiel",
              description:
                "Le bouton Nouveau référentiel alimente directement la table RH ciblée.",
            },
            {
              title: "Auditer les workflows",
              description:
                "Les workflows explicitent les validations, conditions et traces à conserver.",
            },
          ]}
          analyses={[
            {
              title: "Complétude structurelle",
              description:
                "Contrôle que les référentiels nécessaires aux fiches collaborateurs sont disponibles.",
            },
            {
              title: "Capacité théorique",
              description:
                "Vérifie les valeurs utilisées par le staffing, les temps et les coûts.",
            },
            {
              title: "Traçabilité ISO",
              description:
                "Identifie les documents, validations et décisions nécessaires à l’audit.",
            },
          ]}
          recommendations={[
            "Stabiliser les référentiels avant un import massif de collaborateurs.",
            "Éviter les doublons dans les métiers, fonctions, services et contrats.",
            "Vérifier les horaires et calendriers avant d’activer le staffing.",
            "Conserver une trace des validations pour les audits ISO 9001.",
          ]}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Référentiels actifs"
            value={activeReferenceCount}
            description="Éléments utilisables dans les formulaires RH."
            icon={Database}
            accent="indigo"
          />

          <MetricCard
            label="Structures"
            value={structureCount}
            description="Sites et départements actifs."
            icon={Network}
            accent="emerald"
          />

          <MetricCard
            label="Métiers & fonctions"
            value={jobCount}
            description="Familles, métiers et fonctions configurés."
            icon={UsersRound}
            accent="amber"
          />

          <MetricCard
            label="Inactifs"
            value={inactiveReferenceCount}
            description="Éléments conservés mais non proposés."
            icon={AlertCircle}
            accent="rose"
          />
        </section>

        <ScopePanel
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          groupFilter={groupFilter}
          onGroupFilterChange={setGroupFilter}
          impactFilter={impactFilter}
          onImpactFilterChange={setImpactFilter}
          categories={referenceCategories}
          resultCount={flatReferenceRows.length}
          totalCount={totalReferenceCount}
        />

        <div className="flex justify-center">
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <TabButton
              label="Cartographie"
              icon={Layers3}
              isActive={activeTab === "mapping"}
              onClick={() => setActiveTab("mapping")}
              activeClassName="bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
              hoverClassName="hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
            />

            <TabButton
              label="Référentiels"
              icon={Settings2}
              isActive={activeTab === "references"}
              onClick={() => setActiveTab("references")}
              activeClassName="bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
              hoverClassName="hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
            />

            <TabButton
              label="Workflows"
              icon={Workflow}
              isActive={activeTab === "workflows"}
              onClick={() => setActiveTab("workflows")}
              activeClassName="bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
              hoverClassName="hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            />
          </div>
        </div>

        {activeTab === "mapping" && (
          <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelHeader
              icon={BarChart3}
              title="Cartographie des référentiels"
              description="Lecture métier des référentiels disponibles dans le périmètre filtré."
              accent="indigo"
              rightSlot={
                <ViewSwitch
                  view={directoryView}
                  onChange={setDirectoryView}
                />
              }
            />

            {directoryView === "cards" ? (
              <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredCategories.map((category) => (
                  <ReferenceCategoryCard
                    key={category.id}
                    category={category}
                  />
                ))}
              </div>
            ) : (
              <ReferenceTable rows={flatReferenceRows} />
            )}
          </section>
        )}

        {activeTab === "references" && (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Base hebdo"
                value={
                  settings?.default_weekly_hours
                    ? `${formatNumber(settings.default_weekly_hours)} h`
                    : "—"
                }
                description="Base capacité utilisée par Staffing."
                icon={Clock3}
                accent="indigo"
              />

              <MetricCard
                label="Jours/an"
                value={formatNumber(settings?.default_annual_working_days)}
                description="Base annuelle pour forfait et capacité."
                icon={CalendarDays}
                accent="emerald"
              />

              <MetricCard
                label="Devise"
                value={settings?.default_currency ?? "—"}
                description="Devise de valorisation RH/projets."
                icon={BadgeEuro}
                accent="amber"
              />

              <MetricCard
                label="Pays"
                value={settings?.default_country_code ?? "—"}
                description="Pays par défaut de l’organisation."
                icon={MapPin}
                accent="rose"
              />
            </section>

            <ReferenceDenseBoard categories={filteredCategories} />
          </div>
        )}

        {activeTab === "workflows" && (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Workflows RH"
                value={workflows.length}
                description="Processus métier représentés sous forme flowchart."
                icon={Workflow}
                accent="indigo"
              />

              <MetricCard
                label="Traçabilité"
                value="ISO"
                description="Documents et décisions conservables pour audit."
                icon={ShieldCheck}
                accent="emerald"
              />

              <MetricCard
                label="Intermodules"
                value="RH + Projet"
                description="Liens capacité, temps, performance et staffing."
                icon={Network}
                accent="amber"
              />
            </section>

            <div className="grid gap-5">
              {workflows.map((workflow) => (
                <WorkflowFlowchart
                  key={workflow.id}
                  workflow={workflow}
                  onOpen={setOpenedWorkflow}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ReferenceCreatePanel
        isOpen={isReferenceFormOpen}
        categories={referenceCategories}
        organizationId={data.organization.id}
        onClose={() => setIsReferenceFormOpen(false)}
        onCreated={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["hr-architecture", orgId],
          });
        }}
      />

      <WorkflowFullScreen
        workflow={openedWorkflow}
        onClose={() => setOpenedWorkflow(null)}
      />
    </>
  );
}