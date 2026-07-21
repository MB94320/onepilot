"use client";

import {
  use,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  Lightbulb,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  HrActionMenu,
  HrChartCard,
  HrInfo,
  HrMetricCard,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSelectClassName,
  type HrAccent,
} from "@/components/hr/HrReferenceUi";
import DataExportMenu, {
  type ExportColumn,
} from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type PageParams = { orgId: string };
type AnyRow = Record<string, any>;
type TabKey = "paths" | "graphs" | "alerts";
type ViewMode = "cards" | "table";
type ChecklistStatus = "OK" | "NOK" | "NA";
type ChecklistItem = {
  id: string;
  theme: string;
  owner: string;
  label: string;
  status: ChecklistStatus;
  note: string;
};
type Employee = {
  id: string;
  full_name?: string | null;
  employee_number?: string | null;
  department_name?: string | null;
  department_free_text?: string | null;
  job_name?: string | null;
  job_free_text?: string | null;
  manager_employee_id?: string | null;
  manager_name?: string | null;
  arrival_date?: string | null;
};
type OnboardingRow = AnyRow & {
  id: string;
  organization_id: string;
  employee_id: string;
  full_name: string;
  checklist_items: ChecklistItem[];
};
type Data = {
  organization: { id: string; name?: string | null };
  employees: Employee[];
  rows: OnboardingRow[];
};
type Filters = {
  search: string;
  status: string;
  resource: string;
  department: string;
  risk: string;
};

const emptyFilters: Filters = {
  search: "",
  status: "all",
  resource: "all",
  department: "all",
  risk: "all",
};
const themes = [
  "Administration RH",
  "IT & outils",
  "Manager & projet",
  "Qualité & compétences",
  "Intégration & période d’essai",
];
const colors = {
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  slate: "#64748b",
};

const checklistTemplate: Array<Omit<ChecklistItem, "status" | "note">> = [
  {
    id: "contract",
    theme: "Administration RH",
    owner: "RH",
    label: "Contrat signé et dossier administratif complet",
  },
  {
    id: "welcome_book",
    theme: "Administration RH",
    owner: "RH",
    label: "Livret d’accueil disponible et remis",
  },
  {
    id: "internal_rules",
    theme: "Administration RH",
    owner: "RH",
    label: "Règlement intérieur et politiques internes remis",
  },
  {
    id: "benefits",
    theme: "Administration RH",
    owner: "RH",
    label: "Mutuelle, prévoyance, titres restaurant et avantages expliqués",
  },
  {
    id: "supplies",
    theme: "Administration RH",
    owner: "RH",
    label: "Fournitures, badge et moyens d’accès disponibles",
  },
  {
    id: "computer",
    theme: "IT & outils",
    owner: "IT",
    label: "PC, téléphone et matériel disponibles",
  },
  {
    id: "email",
    theme: "IT & outils",
    owner: "IT",
    label: "Adresse mail, SSO et identité numérique créés",
  },
  {
    id: "business_tools",
    theme: "IT & outils",
    owner: "IT",
    label: "Accès aux outils métier et licences validés",
  },
  {
    id: "security",
    theme: "IT & outils",
    owner: "IT",
    label: "Sensibilisation cybersécurité et confidentialité réalisée",
  },
  {
    id: "habilitation",
    theme: "IT & outils",
    owner: "IT",
    label: "Formulaire d’habilitation réalisé si nécessaire",
  },
  {
    id: "company_intro",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Présentation de la société et de l’organisation",
  },
  {
    id: "team_intro",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Présentation de l’équipe et des interlocuteurs clés",
  },
  {
    id: "job_description",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Fiche de poste expliquée et validée",
  },
  {
    id: "activity_sheet",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Fiche d’activités et responsabilités remises",
  },
  {
    id: "project_intro",
    theme: "Manager & projet",
    owner: "Chef de projet",
    label: "Projet, client, contexte, gouvernance et équipe présentés",
  },
  {
    id: "deliverables",
    theme: "Manager & projet",
    owner: "Chef de projet",
    label: "Livrables attendus, standards et échéances connus",
  },
  {
    id: "objectives",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Objectifs 30/60/90 jours définis",
  },
  {
    id: "mentor",
    theme: "Manager & projet",
    owner: "Manager",
    label: "Parrain, référent ou mentor identifié",
  },
  {
    id: "quality",
    theme: "Qualité & compétences",
    owner: "Qualité",
    label: "Sensibilisation qualité, ISO 9001 et risques réalisée",
  },
  {
    id: "skills_matrix",
    theme: "Qualité & compétences",
    owner: "RH",
    label: "Matrice de compétences initiale réalisée",
  },
  {
    id: "training",
    theme: "Qualité & compétences",
    owner: "RH",
    label: "Formations obligatoires et métier planifiées",
  },
  {
    id: "procedures",
    theme: "Qualité & compétences",
    owner: "Qualité",
    label: "Procédures, modèles et documents de référence connus",
  },
  {
    id: "manager_30",
    theme: "Intégration & période d’essai",
    owner: "Manager",
    label: "Point manager à 30 jours planifié/réalisé",
  },
  {
    id: "manager_60",
    theme: "Intégration & période d’essai",
    owner: "Manager",
    label: "Point manager à 60 jours planifié/réalisé",
  },
  {
    id: "manager_90",
    theme: "Intégration & période d’essai",
    owner: "Manager",
    label: "Point manager à 90 jours planifié/réalisé",
  },
  {
    id: "surprise_report",
    theme: "Intégration & période d’essai",
    owner: "Collaborateur",
    label: "Rapport d’étonnement recueilli",
  },
  {
    id: "hr_followup",
    theme: "Intégration & période d’essai",
    owner: "RH",
    label: "Point d’intégration RH réalisé",
  },
  {
    id: "probation",
    theme: "Intégration & période d’essai",
    owner: "RH / Manager",
    label: "Validation de la période d’essai tracée",
  },
];

function defaultChecklist(): ChecklistItem[] {
  return checklistTemplate.map((item) => ({ ...item, status: "NA", note: "" }));
}
function normalizeChecklist(value: unknown): ChecklistItem[] {
  const source = Array.isArray(value) ? value : [];
  const map = new Map(
    source.map((item: AnyRow) => [String(item.id || item.label), item]),
  );
  return checklistTemplate.map((template) => {
    const existing =
      map.get(template.id) ||
      source.find((item: AnyRow) => item.label === template.label);
    const status = ["OK", "NOK", "NA"].includes(String(existing?.status))
      ? (existing.status as ChecklistStatus)
      : "NA";
    return {
      ...template,
      status,
      note: String(existing?.note || existing?.comment || ""),
    };
  });
}
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
function fullName(row?: Employee | AnyRow | null) {
  return row?.full_name || row?.employee_number || "Ressource non renseignée";
}
function department(row?: Employee | AnyRow | null) {
  return row?.department_free_text || row?.department_name || "Non renseigné";
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}
function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
}
function stats(checklist: ChecklistItem[]) {
  const ok = checklist.filter((item) => item.status === "OK").length;
  const nok = checklist.filter((item) => item.status === "NOK").length;
  const na = checklist.filter((item) => item.status === "NA").length;
  return {
    ok,
    nok,
    na,
    total: checklist.length,
    progress: checklist.length ? Math.round((ok / checklist.length) * 100) : 0,
  };
}
function themeStats(checklist: ChecklistItem[], theme: string) {
  const rows = checklist.filter((item) => item.theme === theme);
  return { ...stats(rows), rows };
}
function statusLabel(status?: string | null) {
  const values: Record<string, string> = {
    prepared: "À faire",
    draft: "À faire",
    in_progress: "En cours",
    completed: "Terminé",
    approved: "Validé",
    validated: "Validé",
    delayed: "Bloqué",
    blocked: "Bloqué",
    rejected: "Refusé",
    cancelled: "Annulé",
    archived: "Archivé",
  };
  return values[String(status || "")] || status || "À faire";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
function isArchived(row: OnboardingRow) {
  return Boolean(row.archived_at) || row.status === "archived";
}

async function resolveOrganization(slugOrId: string) {
  const query = (supabase.from("organizations" as never) as any).select(
    "id, name, slug",
  );
  const result = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data;
}
async function loadData(slugOrId: string): Promise<Data> {
  const organization = await resolveOrganization(slugOrId);
  const [employeeResult, rowResult] = await Promise.all([
    (supabase.from("hr_employee_overview" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .limit(1000),
    (supabase.from("hr_onboarding_plans" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  if (employeeResult.error || rowResult.error)
    throw new Error(
      employeeResult.error?.message ||
        rowResult.error?.message ||
        "Erreur de chargement.",
    );
  const employees = (employeeResult.data || []) as Employee[];
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const raw = (rowResult.data || []) as AnyRow[];
  const deduplicated = new Map<string, AnyRow>();
  raw.forEach((row) => {
    const current = deduplicated.get(row.employee_id);
    if (
      !current ||
      (!row.archived_at && current.archived_at) ||
      String(row.updated_at || row.created_at) >
        String(current.updated_at || current.created_at)
    )
      deduplicated.set(row.employee_id, row);
  });
  const rows = Array.from(deduplicated.values()).map((row) => {
    const employee = employeeMap.get(row.employee_id);
    const manager = employeeMap.get(
      row.manager_employee_id || employee?.manager_employee_id || "",
    );
    return {
      ...row,
      full_name: fullName(employee),
      employee_number: employee?.employee_number || null,
      department_name: department(employee),
      job_name: employee?.job_free_text || employee?.job_name || null,
      manager_name:
        fullName(manager) === "Ressource non renseignée"
          ? employee?.manager_name || null
          : fullName(manager),
      checklist_items: normalizeChecklist(row.checklist_items),
    } as unknown as OnboardingRow;
  });
  return { organization, employees, rows };
}

function filterRows(rows: OnboardingRow[], filters: Filters) {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (
      search &&
      ![
        row.full_name,
        row.employee_number,
        row.department_name,
        row.job_name,
        row.manager_name,
        row.notes,
        row.risk_comment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
      return false;
    if (filters.status !== "all" && row.status !== filters.status) return false;
    if (filters.resource !== "all" && row.employee_id !== filters.resource)
      return false;
    if (
      filters.department !== "all" &&
      row.department_name !== filters.department
    )
      return false;
    if (filters.risk !== "all" && row.risk_level !== filters.risk) return false;
    return true;
  });
}

function FiltersPanel({
  data,
  value,
  onChange,
  resultCount,
}: {
  data: Data;
  value: Filters;
  onChange: (value: Filters) => void;
  resultCount: number;
}) {
  const statuses = unique(data.rows.map((row) => row.status));
  const departments = unique(data.rows.map((row) => row.department_name));
  const risks = unique(data.rows.map((row) => row.risk_level));
  const active = JSON.stringify(value) !== JSON.stringify(emptyFilters);
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
                Les filtres pilotent les KPI, parcours, checklists, graphiques,
                alertes et exports.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
            {resultCount} résultat{resultCount > 1 ? "s" : ""} sur{" "}
            {data.rows.length}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
          <input
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            placeholder="Rechercher une ressource, un manager, un service, un risque..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={value.status}
            onChange={(event) =>
              onChange({ ...value, status: event.target.value })
            }
            className={hrSelectClassName}
          >
            <option value="all">Tous les statuts</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
          <select
            value={value.resource}
            onChange={(event) =>
              onChange({ ...value, resource: event.target.value })
            }
            className={hrSelectClassName}
          >
            <option value="all">Toutes les ressources</option>
            {data.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {fullName(employee)}
              </option>
            ))}
          </select>
          <select
            value={value.department}
            onChange={(event) =>
              onChange({ ...value, department: event.target.value })
            }
            className={hrSelectClassName}
          >
            <option value="all">Tous les services</option>
            {departments.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={value.risk}
            onChange={(event) =>
              onChange({ ...value, risk: event.target.value })
            }
            className={hrSelectClassName}
          >
            <option value="all">Tous les niveaux de risque</option>
            {risks.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {active && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChange(emptyFilters)}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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

function ChecklistBadges({ checklist }: { checklist: ChecklistItem[] }) {
  const value = stats(checklist);
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
        OK {value.ok}
      </span>
      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-700">
        NOK {value.nok}
      </span>
      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
        NA {value.na}
      </span>
    </div>
  );
}

function OnboardingCard({
  row,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  row: OnboardingRow;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const value = stats(row.checklist_items);
  return (
    <article
      onClick={onView}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md dark:border-slate-600 dark:bg-slate-700/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">
            {row.full_name}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-300">
            {row.employee_number || "Matricule non renseigné"} ·{" "}
            {row.department_name || "Service non renseigné"}
          </p>
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <HrActionMenu
            labels={{
              view: "Voir le parcours",
              edit: "Modifier le parcours",
              archive: "Archiver le parcours",
              restore: "Réactiver le parcours",
            }}
            onView={onView}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            canRestore={isArchived(row)}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ChecklistBadges checklist={row.checklist_items} />
        <HrStatusBadge status={row.status} label={statusLabel(row.status)} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <HrInfo
          label="Début du parcours"
          value={formatDate(row.start_date)}
          accent="sky"
        />
        <HrInfo
          label="Fin cible / période d’essai"
          value={formatDate(row.target_end_date)}
          accent="amber"
        />
        <HrInfo
          label="Manager"
          value={row.manager_name || "À désigner"}
          accent="indigo"
        />
        <HrInfo
          label="Progression"
          value={`${value.progress} %`}
          accent={value.nok ? "rose" : "emerald"}
        />
      </div>
    </article>
  );
}

function OnboardingTable({
  rows,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  rows: OnboardingRow[];
  onView: (row: OnboardingRow) => void;
  onEdit: (row: OnboardingRow) => void;
  onArchive: (row: OnboardingRow) => void;
  onRestore: (row: OnboardingRow) => void;
}) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-600">
      <table className="min-w-[1900px] w-full bg-white text-sm dark:bg-slate-700">
        <thead className="sticky top-0 z-20 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200">
          <tr>
            {[
              "Ressource",
              "Statut",
              "Début",
              "Fin cible",
              "Manager",
              ...themes,
              "OK",
              "NOK",
              "NA",
              "Note",
              "Risques / commentaires",
              "Actions",
            ].map((label, index) => (
              <th
                key={label}
                className={`${index === 0 ? "sticky left-0 z-30" : ""} whitespace-nowrap border-b border-slate-200 bg-inherit px-4 py-3 text-left`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const value = stats(row.checklist_items);
            return (
              <tr
                key={row.id}
                onClick={() => onView(row)}
                className="cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20"
              >
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
                  <p className="font-black text-slate-950 dark:text-white">
                    {row.full_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {row.employee_number || "—"} · {row.department_name || "—"}
                  </p>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                  <HrStatusBadge
                    status={row.status}
                    label={statusLabel(row.status)}
                  />
                </td>
                <td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                  {formatDate(row.start_date)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                  {formatDate(row.target_end_date)}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                  {row.manager_name || "—"}
                </td>
                {themes.map((theme) => {
                  const result = themeStats(row.checklist_items, theme);
                  return (
                    <td
                      key={theme}
                      className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"
                    >
                      <span className="font-black text-emerald-700">
                        {result.ok}/{result.total}
                      </span>
                      <span className="ml-2 text-rose-700">
                        {result.nok} NOK
                      </span>
                    </td>
                  );
                })}
                <td className="border-b border-slate-100 px-4 py-3 font-black text-emerald-700 dark:border-slate-600">
                  {value.ok}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-black text-rose-700 dark:border-slate-600">
                  {value.nok}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-black text-indigo-700 dark:border-slate-600">
                  {value.na}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 dark:border-slate-600">
                  {row.decision_score ?? "—"}/10
                </td>
                <td
                  className="max-w-72 truncate border-b border-slate-100 px-4 py-3 dark:border-slate-600"
                  title={
                    row.risk_comment || row.decision_comment || row.notes || ""
                  }
                >
                  {row.risk_comment || row.decision_comment || row.notes || "—"}
                </td>
                <td
                  onClick={(event) => event.stopPropagation()}
                  className="border-b border-slate-100 px-4 py-3 dark:border-slate-600"
                >
                  <HrActionMenu
                    labels={{
                      view: "Voir le parcours",
                      edit: "Modifier le parcours",
                      archive: "Archiver le parcours",
                      restore: "Réactiver le parcours",
                    }}
                    onView={() => onView(row)}
                    onEdit={() => onEdit(row)}
                    onArchive={() => onArchive(row)}
                    onRestore={() => onRestore(row)}
                    canRestore={isArchived(row)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OnboardingDrawer({
  row,
  onClose,
  onEdit,
}: {
  row: OnboardingRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  const value = stats(row.checklist_items);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
      <aside className="h-full w-full max-w-5xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-800">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-600 dark:from-sky-900/30 dark:via-slate-800 dark:to-indigo-900/30">
          <div>
            <h2 className="text-base font-black text-slate-950 dark:text-white">
              Parcours onboarding · {row.full_name}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Checklist exhaustive, preuves, responsables, risques et
              validations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HrInfo
              label="Statut"
              value={statusLabel(row.status)}
              accent={
                row.status === "completed"
                  ? "emerald"
                  : row.status === "delayed"
                    ? "rose"
                    : row.status === "in_progress"
                      ? "amber"
                      : "sky"
              }
            />
            <HrInfo
              label="Début"
              value={formatDate(row.start_date)}
              accent="sky"
            />
            <HrInfo
              label="Fin cible"
              value={formatDate(row.target_end_date)}
              accent="amber"
            />
            <HrInfo
              label="Manager"
              value={row.manager_name || "À désigner"}
              accent="indigo"
            />
            <HrInfo
              label="Progression"
              value={`${value.progress} %`}
              accent={value.nok ? "rose" : "emerald"}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {themes.map((theme) => {
              const result = themeStats(row.checklist_items, theme);
              return (
                <HrSectionCard
                  key={theme}
                  icon={ListChecks}
                  title={theme}
                  description={`${result.ok}/${result.total} OK · ${result.nok} NOK · ${result.na} NA`}
                >
                  <div className="space-y-2">
                    {result.rows.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:grid-cols-[1fr_auto] dark:border-slate-600 dark:bg-slate-700/70"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {item.label}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                            {item.owner} · {item.note || "Aucun commentaire"}
                          </p>
                        </div>
                        <span
                          className={`h-fit rounded-full px-2.5 py-1 text-[10px] font-black ${item.status === "OK" ? "bg-emerald-50 text-emerald-700" : item.status === "NOK" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700"}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </HrSectionCard>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <HrInfo
              label="Note décisionnelle"
              value={`${row.decision_score ?? "—"}/10`}
              accent="indigo"
            />
            <HrInfo
              label="Commentaires / risques / RàF"
              value={
                row.risk_comment ||
                row.decision_comment ||
                row.notes ||
                "À compléter"
              }
              accent={row.risk_level === "high" ? "rose" : "amber"}
            />
          </div>
          <div className="flex justify-end">
            {isArchived(row) ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500">
                Réactive le parcours depuis le menu trois points avant de le
                modifier.
              </p>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700"
              >
                Modifier le parcours
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function OnboardingForm({
  data,
  row,
  onClose,
  onSaved,
}: {
  data: Data;
  row?: OnboardingRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState(
    row?.employee_id || data.employees[0]?.id || "",
  );
  const employee = data.employees.find((item) => item.id === employeeId);
  const [status, setStatus] = useState(row?.status || "prepared");
  const [startDate, setStartDate] = useState(
    row?.start_date || new Date().toISOString().slice(0, 10),
  );
  const [targetEndDate, setTargetEndDate] = useState(
    row?.target_end_date ||
      (() => {
        const date = new Date();
        date.setDate(date.getDate() + 90);
        return date.toISOString().slice(0, 10);
      })(),
  );
  const [risk, setRisk] = useState(row?.risk_level || "normal");
  const [score, setScore] = useState(String(row?.decision_score ?? ""));
  const [comment, setComment] = useState(
    row?.risk_comment || row?.decision_comment || row?.notes || "",
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    row ? normalizeChecklist(row.checklist_items) : defaultChecklist(),
  );
  const [saving, setSaving] = useState(false);
  const value = stats(checklist);
  function updateItem(id: string, field: "status" | "note", next: string) {
    setChecklist((current) =>
      current.map((item) =>
        item.id === id ? ({ ...item, [field]: next } as ChecklistItem) : item,
      ),
    );
  }
  async function save() {
    if (!employeeId) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: data.organization.id,
        employee_id: employeeId,
        manager_employee_id: employee?.manager_employee_id || null,
        recruiter_employee_id: null,
        start_date: startDate,
        target_end_date: targetEndDate,
        status,
        progress_percent: value.progress,
        risk_level: risk,
        decision_score: score === "" ? null : Number(score),
        decision_comment: comment || null,
        risk_comment: comment || null,
        notes: comment || null,
        checklist_items: checklist,
        manager_validation_status:
          status === "completed" ? "approved" : "pending",
        hr_validation_status: status === "completed" ? "approved" : "pending",
        probation_validation_status:
          status === "completed" ? "approved" : "pending",
        archived_at: null,
        updated_at: new Date().toISOString(),
      };
      const existingActive = data.rows.find(
        (item) => item.employee_id === employeeId && !isArchived(item),
      );
      const result = row
        ? await (supabase.from("hr_onboarding_plans" as never) as any)
            .update(payload)
            .eq("id", row.id)
            .eq("organization_id", data.organization.id)
            .select("id")
            .maybeSingle()
        : existingActive
          ? await (supabase.from("hr_onboarding_plans" as never) as any)
              .update(payload)
              .eq("id", existingActive.id)
              .eq("organization_id", data.organization.id)
              .select("id")
              .maybeSingle()
          : await (supabase.from("hr_onboarding_plans" as never) as any)
              .insert(payload)
              .select("id")
              .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data?.id) {
        throw new Error(
          "Le parcours n’a pas été enregistré. Vérifie les droits de l’organisation active.",
        );
      }
      await onSaved();
      onClose();
    } catch (error) {
      alert(errorMessage(error, "Impossible d’enregistrer le parcours."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-800 dark:to-indigo-900/25">
          <div>
            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              {row ? "Modifier le parcours" : "Nouveau parcours"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Compléter la checklist dès la création et suivre les preuves
              jusqu’à la période d’essai.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Ressource
              </span>
              <select
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                disabled={Boolean(row)}
                className={`${hrSelectClassName} mt-1 w-full disabled:bg-slate-100`}
              >
                {data.employees.map((item) => (
                  <option key={item.id} value={item.id}>
                    {fullName(item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Statut
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={`${hrSelectClassName} mt-1 w-full`}
              >
                <option value="prepared">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="delayed">Bloqué</option>
                <option value="cancelled">Refusé / annulé</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Début
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={`${hrInputClassName} mt-1 w-full`}
              />
            </label>
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Fin cible / période d’essai
              </span>
              <input
                type="date"
                value={targetEndDate}
                onChange={(event) => setTargetEndDate(event.target.value)}
                className={`${hrInputClassName} mt-1 w-full`}
              />
            </label>
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Risque
              </span>
              <select
                value={risk}
                onChange={(event) => setRisk(event.target.value)}
                className={`${hrSelectClassName} mt-1 w-full`}
              >
                <option value="normal">Normal</option>
                <option value="watch">À surveiller</option>
                <option value="high">Élevé</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {themes.map((theme) => {
              const result = themeStats(checklist, theme);
              return (
                <HrSectionCard
                  key={theme}
                  icon={ListChecks}
                  title={theme}
                  description={`${result.ok}/${result.total} OK · ${result.nok} NOK · ${result.na} NA`}
                >
                  <div className="space-y-3">
                    {result.rows.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[1.4fr_110px_1fr] dark:border-slate-600 dark:bg-slate-700/60"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {item.label}
                          </p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {item.owner}
                          </p>
                        </div>
                        <select
                          value={item.status}
                          onChange={(event) =>
                            updateItem(item.id, "status", event.target.value)
                          }
                          className={hrSelectClassName}
                        >
                          <option value="OK">OK</option>
                          <option value="NOK">NOK</option>
                          <option value="NA">NA</option>
                        </select>
                        <input
                          value={item.note}
                          onChange={(event) =>
                            updateItem(item.id, "note", event.target.value)
                          }
                          placeholder="Preuve, commentaire ou reste à faire..."
                          className={`${hrInputClassName} w-full`}
                        />
                      </div>
                    ))}
                  </div>
                </HrSectionCard>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Note décisionnelle /10
              </span>
              <input
                type="number"
                min="0"
                max="10"
                value={score}
                onChange={(event) => setScore(event.target.value)}
                className={`${hrInputClassName} mt-1 w-full`}
              />
            </label>
            <label>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Commentaires, risques et reste à faire
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Enregistrer le parcours
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GraphsPanel({ rows }: { rows: OnboardingRow[] }) {
  const themeData = themes.map((theme) => {
    const all = rows.flatMap((row) =>
      row.checklist_items.filter((item) => item.theme === theme),
    );
    const value = stats(all);
    return {
      name: theme.replace(" & ", " / "),
      score: value.progress,
      OK: value.ok,
      NOK: value.nok,
      NA: value.na,
    };
  });
  const serviceMap = new Map<string, number>();
  rows.forEach((row) =>
    serviceMap.set(
      row.department_name || "Non renseigné",
      (serviceMap.get(row.department_name || "Non renseigné") || 0) + 1,
    ),
  );
  const serviceData = Array.from(serviceMap, ([name, value]) => ({
    name,
    value,
  }));
  const statusMap = new Map<string, number>();
  rows.forEach((row) =>
    statusMap.set(
      statusLabel(row.status),
      (statusMap.get(statusLabel(row.status)) || 0) + 1,
    ),
  );
  const statusData = Array.from(statusMap, ([name, value]) => ({
    name,
    value,
  }));
  return (
    <div className="space-y-5">
      <HrSectionCard
        icon={BarChart3}
        title="Analyse décisionnelle"
        description="Maturité par thème, répartition par service, statuts et points OK/NOK/NA du périmètre filtré."
        right={
          <span className="whitespace-nowrap rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
            {rows.length} parcours
          </span>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Les graphiques facilitent les décisions RH, recrutement, manager, chef
          de projet et qualité ISO 9001.
        </p>
      </HrSectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <HrChartCard
          title="Radar de maturité onboarding"
          description="Taux de critères OK par grand thème de la checklist."
          exportConfig={{
            type: "radar",
            data: themeData,
            nameKey: "name",
            series: [{ key: "score", label: "Maturité", color: colors.indigo }],
            unit: "%",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={themeData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Radar
                dataKey="score"
                name="Maturité (%)"
                stroke={colors.indigo}
                fill={colors.indigo}
                fillOpacity={0.24}
              />
            </RadarChart>
          </ResponsiveContainer>
        </HrChartCard>
        <HrChartCard
          title="Onboarding par service"
          description="Répartition des parcours actifs et terminés par service."
          exportConfig={{
            type: "bar",
            data: serviceData,
            nameKey: "name",
            series: [
              { key: "value", label: "Parcours", color: colors.emerald },
            ],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                name="Parcours"
                fill={colors.emerald}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </HrChartCard>
        <HrChartCard
          title="OK / NOK / NA par thème"
          description="Détail des critères complets, bloquants ou non applicables."
          exportConfig={{
            type: "bar",
            data: themeData,
            nameKey: "name",
            series: [
              { key: "OK", label: "OK", color: colors.emerald },
              { key: "NOK", label: "NOK", color: colors.rose },
              { key: "NA", label: "NA", color: colors.indigo },
            ],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={themeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="OK" stackId="a" fill={colors.emerald} />
              <Bar dataKey="NOK" stackId="a" fill={colors.rose} />
              <Bar
                dataKey="NA"
                stackId="a"
                fill={colors.indigo}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </HrChartCard>
        <HrChartCard
          title="Répartition par statut"
          description="À faire, en cours, terminé, bloqué ou refusé."
          exportConfig={{
            type: "bar",
            data: statusData,
            nameKey: "name",
            series: [{ key: "value", label: "Parcours", color: colors.amber }],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                name="Parcours"
                fill={colors.amber}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </HrChartCard>
      </div>
    </div>
  );
}

function DecisionPanel({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  accent: HrAccent;
  children: ReactNode;
}) {
  const color: Record<HrAccent, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    sky: "bg-sky-100 text-sky-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${color[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Lecture synthétique du périmètre filtré.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}
function Insight({
  title,
  description,
  level,
}: {
  title: string;
  description: string;
  level: "success" | "warning" | "danger" | "info";
}) {
  const classes =
    level === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-800"
      : level === "danger"
        ? "border-rose-100 bg-rose-50 text-rose-800"
        : level === "warning"
          ? "border-amber-100 bg-amber-50 text-amber-800"
          : "border-indigo-100 bg-indigo-50 text-indigo-800";
  return (
    <div className={`rounded-xl border px-3 py-2 ${classes}`}>
      <p className="text-xs font-black">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 opacity-85">
        {description}
      </p>
    </div>
  );
}
function AlertsPanel({ rows }: { rows: OnboardingRow[] }) {
  const nok = rows.reduce(
    (sum, row) => sum + stats(row.checklist_items).nok,
    0,
  );
  const overdue = rows.filter(
    (row) =>
      row.target_end_date &&
      row.target_end_date < new Date().toISOString().slice(0, 10) &&
      row.status !== "completed",
  ).length;
  const withoutManager = rows.filter(
    (row) => !row.manager_employee_id && !row.manager_name,
  ).length;
  const missingIt = rows.filter((row) =>
    row.checklist_items.some(
      (item) => item.theme === "IT & outils" && item.status === "NOK",
    ),
  ).length;
  const missingSkills = rows.filter((row) =>
    row.checklist_items.some(
      (item) => item.id === "skills_matrix" && item.status !== "OK",
    ),
  ).length;
  const probation = rows.filter((row) =>
    row.checklist_items.some(
      (item) => item.id === "probation" && item.status !== "OK",
    ),
  ).length;
  return (
    <HrSectionCard
      icon={Bell}
      title="Alertes qualité"
      description="Synthèse, alertes et recommandations pour sécuriser chaque intégration jusqu’à la validation de période d’essai."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <DecisionPanel icon={Gauge} title="Synthèse" accent="indigo">
          <Insight
            title="Parcours actifs"
            description={`${rows.filter((row) => !isArchived(row) && row.status !== "completed").length} parcours sont à suivre.`}
            level="info"
          />
          <Insight
            title="Critères bloquants"
            description={`${nok} critère(s) NOK sont visibles dans les fiches détaillées.`}
            level={nok ? "warning" : "success"}
          />
        </DecisionPanel>
        <DecisionPanel icon={AlertTriangle} title="Alertes" accent="rose">
          <Insight
            title="Parcours en retard"
            description={`${overdue} parcours ont dépassé leur date cible.`}
            level={overdue ? "danger" : "success"}
          />
          <Insight
            title="Responsable manquant"
            description={`${withoutManager} parcours ne disposent pas de manager identifié.`}
            level={withoutManager ? "warning" : "success"}
          />
        </DecisionPanel>
        <DecisionPanel
          icon={Lightbulb}
          title="Recommandations"
          accent="emerald"
        >
          <Insight
            title="Traçabilité ISO 9001"
            description="Conserver preuves, commentaires, responsables et décisions pour chaque critère."
            level="success"
          />
          <Insight
            title="Validation période d’essai"
            description="Ne clôturer et archiver qu’après validation collaborateur, manager et RH."
            level="info"
          />
        </DecisionPanel>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HrMetricCard
          icon={ShieldAlert}
          label="Critères NOK"
          value={nok}
          description="Points bloquants à traiter."
          accent={nok ? "rose" : "emerald"}
        />
        <HrMetricCard
          icon={CalendarClock}
          label="Parcours en retard"
          value={overdue}
          description="Date cible dépassée."
          accent={overdue ? "rose" : "emerald"}
        />
        <HrMetricCard
          icon={Users}
          label="Manager manquant"
          value={withoutManager}
          description="Accompagnement fragilisé."
          accent={withoutManager ? "amber" : "emerald"}
        />
        <HrMetricCard
          icon={Gauge}
          label="IT / outils NOK"
          value={missingIt}
          description="Matériel ou accès incomplets."
          accent={missingIt ? "rose" : "emerald"}
        />
        <HrMetricCard
          icon={ListChecks}
          label="Matrice compétences"
          value={missingSkills}
          description="Évaluation initiale à finaliser."
          accent={missingSkills ? "amber" : "emerald"}
        />
        <HrMetricCard
          icon={CheckCircle2}
          label="Période d’essai"
          value={probation}
          description="Validations encore attendues."
          accent={probation ? "amber" : "emerald"}
        />
      </div>
    </HrSectionCard>
  );
}

function buildExportRows(rows: OnboardingRow[]) {
  return rows.flatMap((row) =>
    row.checklist_items.map((item) => ({
      ...row,
      checklist_theme: item.theme,
      checklist_owner: item.owner,
      checklist_label: item.label,
      checklist_status: item.status,
      checklist_note: item.note,
    })),
  );
}
const exportColumns: ExportColumn<AnyRow>[] = [
  { key: "employee", label: "Ressource", value: (row) => row.full_name },
  {
    key: "employee_number",
    label: "Matricule",
    value: (row) => row.employee_number,
  },
  { key: "department", label: "Service", value: (row) => row.department_name },
  { key: "manager", label: "Manager", value: (row) => row.manager_name },
  {
    key: "status",
    label: "Statut parcours",
    value: (row) => statusLabel(row.status),
  },
  { key: "start_date", label: "Début", value: (row) => row.start_date },
  {
    key: "target_end_date",
    label: "Fin cible",
    value: (row) => row.target_end_date,
  },
  { key: "theme", label: "Thème", value: (row) => row.checklist_theme },
  { key: "owner", label: "Responsable", value: (row) => row.checklist_owner },
  { key: "criterion", label: "Critère", value: (row) => row.checklist_label },
  {
    key: "criterion_status",
    label: "OK/NOK/NA",
    value: (row) => row.checklist_status,
  },
  {
    key: "criterion_note",
    label: "Preuve/commentaire",
    value: (row) => row.checklist_note,
  },
  {
    key: "score",
    label: "Note décisionnelle",
    value: (row) => row.decision_score,
  },
  { key: "risk", label: "Risque", value: (row) => row.risk_level },
  {
    key: "comments",
    label: "Risques/commentaires/RàF",
    value: (row) => row.risk_comment || row.decision_comment || row.notes,
  },
];

export default function HrOnboardingPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [activeTab, setActiveTab] = useState<TabKey>("paths");
  const [view, setView] = useState<ViewMode>("cards");
  const [formRow, setFormRow] = useState<OnboardingRow | null | undefined>(
    undefined,
  );
  const [drawerRow, setDrawerRow] = useState<OnboardingRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const query = useQuery({
    queryKey: ["hr-onboarding", orgId],
    queryFn: () => loadData(orgId),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["hr-onboarding", orgId] });
    await queryClient.refetchQueries({ queryKey: ["hr-onboarding", orgId] });
  };
  const statusMutation = useMutation({
    mutationFn: async ({
      row,
      restore,
    }: {
      row: OnboardingRow;
      restore: boolean;
    }) => {
      if (restore) {
        const { error: competingPlanError } = await (
          supabase.from("hr_onboarding_plans" as never) as any
        )
          .update({
            status: "archived",
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", row.organization_id)
          .eq("employee_id", row.employee_id)
          .is("archived_at", null)
          .neq("id", row.id);
        if (competingPlanError) throw competingPlanError;
      }

      const { data: updatedPlan, error } = await (
        supabase.from("hr_onboarding_plans" as never) as any
      )
        .update(
          restore
            ? {
                status: "in_progress",
                archived_at: null,
                updated_at: new Date().toISOString(),
              }
            : {
                status: "archived",
                archived_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
        )
        .eq("id", row.id)
        .eq("organization_id", row.organization_id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedPlan?.id) {
        throw new Error(
          "Le parcours n’a pas été mis à jour. Vérifie les droits de l’organisation active.",
        );
      }
    },
    onSuccess: async () => {
      await refresh();
    },
    onError: (error) => {
      alert(errorMessage(error, "Impossible de mettre à jour le parcours."));
    },
  });

  function archivePath(row: OnboardingRow) {
    if (!window.confirm(`Archiver le parcours de ${row.full_name} ?`)) return;
    statusMutation.mutate({ row, restore: false });
  }

  function restorePath(row: OnboardingRow) {
    if (!window.confirm(`Réactiver le parcours de ${row.full_name} ?`)) return;
    statusMutation.mutate({ row, restore: true });
  }

  if (query.isLoading)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
        Chargement...
      </div>
    );
  if (query.error)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
        Impossible de charger Onboarding :{" "}
        {query.error instanceof Error ? query.error.message : "erreur inconnue"}
      </div>
    );
  const data = query.data as Data;
  const rows = filterRows(data.rows, filters);
  const exportRows = buildExportRows(rows);
  const allStats = stats(rows.flatMap((row) => row.checklist_items));
  const tabs = [
    {
      key: "paths" as TabKey,
      label: "Parcours",
      icon: ListChecks,
      active: "bg-indigo-600 text-white shadow-md shadow-indigo-100",
      inactive: "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700",
    },
    {
      key: "graphs" as TabKey,
      label: "Graphiques",
      icon: BarChart3,
      active: "bg-emerald-600 text-white shadow-md shadow-emerald-100",
      inactive: "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
    },
    {
      key: "alerts" as TabKey,
      label: "Alertes",
      icon: Bell,
      active: "bg-amber-500 text-white shadow-md shadow-amber-100",
      inactive: "text-slate-500 hover:bg-amber-50 hover:text-amber-700",
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        subtitle="Parcours d’intégration et validation RH, manager, IT et qualité jusqu’à la période d’essai."
        actions={
          <>
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 text-sm font-bold text-sky-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
            >
              <Clock3 className="h-4 w-4" />
              Historique RH
            </button>
            <DataExportMenu
              data={exportRows}
              columns={exportColumns}
              fileName="rh_onboarding_checklist_detail"
              sheetName="Onboarding"
              disabled={exportRows.length === 0}
            />
            <button
              type="button"
              onClick={() => setFormRow(null)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Nouveau parcours
            </button>
          </>
        }
      />
      <PageTutorial
        title="Guide de la page"
        description={
          "Préparer chaque arrivée : dossier RH, matériel, accès, projet, compétences, formation et période d’essai.\nTracer par critère le responsable, le statut OK/NOK/NA, la preuve, le risque et le reste à faire ISO 9001."
        }
        objectives={[
          "Garantir que chaque collaborateur dispose de tous les prérequis dès son arrivée.",
          "Tracer les responsabilités RH, IT, manager, chef de projet, qualité et collaborateur.",
          "Décider la clôture uniquement après validation complète de la période d’essai.",
        ]}
        steps={[
          {
            title: "Créer",
            description:
              "Sélectionner la ressource et compléter immédiatement la checklist par thème.",
          },
          {
            title: "Suivre",
            description:
              "Mettre à jour les statuts, preuves, commentaires, risques et dates de suivi.",
          },
          {
            title: "Valider",
            description:
              "Contrôler les points 30/60/90 jours, la matrice de compétences et la période d’essai.",
          },
        ]}
        analyses={[
          {
            title: "Décision",
            description:
              "Comparer progression, NOK, services, responsables, risques et échéances avant clôture.",
          },
        ]}
        recommendations={[
          "Traiter en priorité les critères NOK liés aux accès, au projet, à la sécurité et aux livrables.",
          "Conserver les preuves et commentaires nécessaires aux audits ISO 9001.",
          "Archiver uniquement après validation manager, RH et période d’essai.",
        ]}
      />
      {historyOpen && (
        <HrSectionCard
          icon={Clock3}
          title="Historique RH"
          description="Historique des créations, modifications, validations, archivages et exports de parcours."
        >
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Les événements seront consolidés dans le journal d’audit transverse
            ONEPILOT.
          </p>
        </HrSectionCard>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HrMetricCard
          label="Parcours suivis"
          value={rows.length}
          description="Une ligne active maximum par ressource."
          icon={Users}
          accent="indigo"
        />
        <HrMetricCard
          label="Critères OK"
          value={allStats.ok}
          description="Préparatifs et actions validés."
          icon={CheckCircle2}
          accent="emerald"
        />
        <HrMetricCard
          label="Critères NOK"
          value={allStats.nok}
          description="Points bloquants ou incomplets."
          icon={AlertTriangle}
          accent="amber"
        />
        <HrMetricCard
          label="En retard"
          value={
            rows.filter(
              (row) =>
                row.target_end_date &&
                row.target_end_date < new Date().toISOString().slice(0, 10) &&
                row.status !== "completed",
            ).length
          }
          description="Date cible dépassée sans clôture."
          icon={CalendarClock}
          accent="rose"
        />
      </section>
      <FiltersPanel
        data={data}
        value={filters}
        onChange={setFilters}
        resultCount={rows.length}
      />
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${activeTab === tab.key ? tab.active : tab.inactive}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {activeTab === "paths" && (
        <HrSectionCard
          icon={ListChecks}
          title="Parcours d’intégration"
          description="Une card ou ligne par ressource ; ouvrir la fiche pour consulter toute la checklist, les preuves, risques et validations."
          right={
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
              >
                Cartes
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}
              >
                Tableau
              </button>
            </div>
          }
        >
          {view === "cards" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {rows.map((row) => (
                <OnboardingCard
                  key={row.id}
                  row={row}
                  onView={() => setDrawerRow(row)}
                  onEdit={() => setFormRow(row)}
                  onArchive={() => archivePath(row)}
                  onRestore={() => restorePath(row)}
                />
              ))}
            </div>
          ) : (
            <OnboardingTable
              rows={rows}
              onView={setDrawerRow}
              onEdit={setFormRow}
              onArchive={archivePath}
              onRestore={restorePath}
            />
          )}
        </HrSectionCard>
      )}
      {activeTab === "graphs" && <GraphsPanel rows={rows} />}
      {activeTab === "alerts" && <AlertsPanel rows={rows} />}
      {formRow !== undefined && (
        <OnboardingForm
          data={data}
          row={formRow}
          onClose={() => setFormRow(undefined)}
          onSaved={refresh}
        />
      )}
      {drawerRow && (
        <OnboardingDrawer
          row={drawerRow}
          onClose={() => setDrawerRow(null)}
          onEdit={() => {
            setFormRow(drawerRow);
            setDrawerRow(null);
          }}
        />
      )}
    </div>
  );
}
