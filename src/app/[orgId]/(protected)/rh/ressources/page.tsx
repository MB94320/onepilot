"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  ContactRound,
  FileWarning,
  MailWarning,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";

import HrDecisionDashboard, {
  HrDecisionInsightPanels,
} from "@/components/hr/HrDecisionDashboard";
import HrDirectory, {
  type HrDirectoryEmployee,
} from "@/components/hr/HrDirectory";
import HrDirectoryFilters, {
  type HrDirectoryFiltersValue,
} from "@/components/hr/HrDirectoryFilters";
import HrEmployeeDrawer from "@/components/hr/HrEmployeeDrawer";
import HrEmployeeEditForm from "@/components/hr/HrEmployeeEditForm";
import HrMemberForm from "@/components/hr/HrMemberForm";
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

type MembersData = {
  organization: Organization;
  employees: HrDirectoryEmployee[];
};

type PageTab = "directory" | "graphs" | "alerts";

type HrAuditEvent = {
  id: string;
  organization_id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  title: string | null;
  description: string | null;
  actor_name: string | null;
  created_at: string | null;
};

const initialFilters: HrDirectoryFiltersValue = {
  search: "",
  status: "all",
  site: "all",
  department: "all",
  contract: "all",
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatExportDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDisplayDate(value: string | null | undefined) {
  if (!value) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatExportNumber(value: number | null | undefined) {
  return value ?? null;
}

function getCompensationModeLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    salary: "Salaire",
    daily_rate: "TJM",
    hourly_rate: "Taux horaire",
    fixed_fee: "Forfait",
  };

  return value ? labels[value] ?? value : "";
}

function getStatusLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    preboarding: "Pré-intégration",
    probation: "Période d’essai",
    active: "Actif",
    notice_period: "Préavis",
    suspended: "Suspendu",
    departed: "Sorti",
    archived: "Archivé",
  };

  return value ? labels[value] ?? value : "Non renseigné";
}

function getAuditActionLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    created: "Création",
    updated: "Modification",
    archived: "Archivage",
    restored: "Réactivation",
    deleted: "Suppression",
    CREATE: "Création",
    UPDATE: "Modification",
    ARCHIVE: "Archivage",
    RESTORE: "Réactivation",
    DELETE: "Suppression",
  };

  return value ? labels[value] ?? value : "Événement";
}

function getAuditSignature(event: HrAuditEvent) {
  return [
    event.action,
    event.entity_type,
    event.entity_id,
    event.title,
    event.description,
  ].join("|");
}

function getAuditStorageKey(organizationId: string) {
  return `onepilot:hr-audit-history:${organizationId}`;
}

function isTodayIsoDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const eventDate = new Date(value);
  const today = new Date();

  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  );
}

function loadLocalAuditEvents(organizationId: string): HrAuditEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(
      getAuditStorageKey(organizationId),
    );

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as HrAuditEvent[];

    return parsedValue
      .filter((event) => isTodayIsoDate(event.created_at))
      .slice(0, 50);
  } catch {
    return [];
  }
}

function saveLocalAuditEvents(
  organizationId: string,
  events: HrAuditEvent[],
) {
  if (typeof window === "undefined") {
    return;
  }

  const todayEvents = events
    .filter((event) => isTodayIsoDate(event.created_at))
    .slice(0, 50);

  window.localStorage.setItem(
    getAuditStorageKey(organizationId),
    JSON.stringify(todayEvents),
  );
}

function getAuditActionClasses(action: string | null | undefined) {
  if (action === "created" || action === "CREATE") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (action === "updated" || action === "UPDATE") {
    return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300";
  }

  if (action === "archived" || action === "ARCHIVE") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }

  if (action === "restored" || action === "RESTORE") {
    return "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (supabase.from("organizations" as never) as any).select(
    "id, name, slug",
  );

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

async function loadMembersData(slugOrId: string): Promise<MembersData> {
  const organization = await resolveOrganization(slugOrId);

  const { data, error } = await (supabase.from(
    "hr_employee_overview" as never,
  ) as any)
    .select("*")
    .eq("organization_id", organization.id)
    .order("last_name", {
      ascending: true,
    })
    .order("first_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(`Impossible de charger les membres : ${error.message}`);
  }

  return {
    organization,
    employees: (data ?? []) as HrDirectoryEmployee[],
  };
}

async function loadHrAuditHistory(
  organizationId: string,
): Promise<HrAuditEvent[]> {
  const { data, error } = await (supabase.from(
    "hr_audit_history" as never,
  ) as any)
    .select(
      `
        id,
        organization_id,
        entity_type,
        entity_id,
        action,
        title,
        description,
        actor_name,
        created_at
      `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: false,
    })
    .limit(25);

  if (error) {
    return [];
  }

  return (data ?? []) as HrAuditEvent[];
}

async function recordHrAuditEvent({
  organizationId,
  entityType,
  entityId,
  action,
  title,
  description,
}: {
  organizationId: string;
  entityType: string;
  entityId: string | null;
  action: string;
  title: string;
  description: string;
}) {
  const { error } = await (supabase.from("hr_audit_history" as never) as any)
    .insert({
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      title,
      description,
      actor_name: null,
    });

  if (error) {
    console.warn("Historique RH non persisté :", error.message);
  }
}

const employeeExportColumns: ExportColumn<HrDirectoryEmployee>[] = [
  {
    key: "employee_number",
    label: "Matricule",
    value: (employee) => employee.employee_number,
  },
  {
    key: "last_name",
    label: "Nom",
    value: (employee) => employee.last_name,
  },
  {
    key: "first_name",
    label: "Prénom",
    value: (employee) => employee.first_name,
  },
  {
    key: "full_name",
    label: "Nom complet",
    value: (employee) => employee.full_name,
  },
  {
    key: "employment_status",
    label: "Statut",
    value: (employee) => getStatusLabel(employee.employment_status),
  },
  {
    key: "professional_email",
    label: "Email professionnel",
    value: (employee) => employee.professional_email,
  },
  {
    key: "professional_phone",
    label: "Téléphone professionnel",
    value: (employee) => employee.professional_phone,
  },
  {
    key: "site_name",
    label: "Site",
    value: (employee) => employee.site_name,
  },
  {
    key: "department_name",
    label: "Service",
    value: (employee) => employee.department_name,
  },
  {
    key: "job_name",
    label: "Métier",
    value: (employee) => employee.job_name,
  },
  {
    key: "function_name",
    label: "Fonction",
    value: (employee) => employee.function_name,
  },
  {
    key: "manager_name",
    label: "Manager N+1",
    value: (employee) => employee.manager_name,
  },
  {
    key: "contract_type_name",
    label: "Type de contrat",
    value: (employee) => employee.contract_type_name,
  },
  {
    key: "work_schedule_name",
    label: "Rythme de travail",
    value: (employee) => employee.work_schedule_name,
  },
  {
    key: "arrival_date",
    label: "Date d’arrivée",
    value: (employee) => formatExportDate(employee.arrival_date),
  },
  {
    key: "compensation_mode",
    label: "Mode de rémunération",
    value: (employee) => getCompensationModeLabel(employee.compensation_mode),
  },
  {
    key: "annual_gross_salary",
    label: "Salaire brut annuel (€)",
    value: (employee) => formatExportNumber(employee.annual_gross_salary),
  },
  {
    key: "external_daily_rate",
    label: "TJM d’achat (€)",
    value: (employee) => formatExportNumber(employee.external_daily_rate),
  },
  {
    key: "external_hourly_rate",
    label: "Taux horaire externe (€)",
    value: (employee) => formatExportNumber(employee.external_hourly_rate),
  },
  {
    key: "gross_hourly_rate",
    label: "Taux horaire brut (€)",
    value: (employee) => formatExportNumber(employee.gross_hourly_rate),
  },
  {
    key: "loaded_hourly_cost",
    label: "Taux horaire chargé (€)",
    value: (employee) => formatExportNumber(employee.loaded_hourly_cost),
  },
  {
    key: "loaded_daily_cost",
    label: "Coût journalier chargé (€)",
    value: (employee) => formatExportNumber(employee.loaded_daily_cost),
  },
];

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  accent: "indigo" | "emerald" | "amber" | "rose";
}) {
  const accentClasses = {
    indigo: {
      panel:
        "border-indigo-100 from-indigo-50/85 via-white to-violet-50/65 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20",
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      value: "text-indigo-700 dark:text-indigo-300",
    },
    emerald: {
      panel:
        "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
      panel:
        "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      value: "text-amber-700 dark:text-amber-300",
    },
    rose: {
      panel:
        "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-950 dark:to-pink-950/20",
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      value: "text-rose-700 dark:text-rose-300",
    },
  };

  const classes = accentClasses[accent];

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

function AlertCard({
  icon: Icon,
  title,
  value,
  description,
  accent,
}: {
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  title: string;
  value: number;
  description: string;
  accent: "indigo" | "emerald" | "amber" | "rose";
}) {
  const classes = {
    indigo:
      "border-indigo-100 bg-indigo-50/60 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300",
    emerald:
      "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300",
    amber:
      "border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300",
    rose:
      "border-rose-100 bg-rose-50/60 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300",
  };

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${classes[accent]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-white/70 p-2.5 dark:bg-slate-950/40">
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <p className="text-2xl font-black">{value}</p>
      </div>

      <h3 className="mt-4 text-sm font-black">{title}</h3>

      <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
    </article>
  );
}

function AuditHistoryPanel({
  events,
  onClose,
}: {
  events: HrAuditEvent[];
  onClose: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm dark:border-sky-900/60 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-white px-5 py-4 dark:border-sky-900/60 dark:from-sky-950/20 dark:via-slate-950 dark:to-slate-950">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Bell
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <div>
            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              Historique RH
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Créations, modifications, archivages et réactivations des fiches collaborateurs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-600 transition hover:bg-sky-50 dark:border-sky-900/60 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-sky-950/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {events.length === 0 ? (
          <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
            Aucun événement d’historique disponible pour le moment.
          </div>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className="p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    {event.title || getAuditActionLabel(event.action)}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {event.description || "Action RH historisée."}
                  </p>

                  {event.actor_name && (
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      Par {event.actor_name}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-left sm:text-right">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getAuditActionClasses(
                      event.action,
                    )}`}
                  >
                    {getAuditActionLabel(event.action)}
                  </span>

                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDisplayDate(event.created_at)}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function AlertsPanel({
  employees,
}: {
  employees: HrDirectoryEmployee[];
}) {
  const missingSite = employees.filter((employee) => !employee.site_name)
    .length;

  const missingDepartment = employees.filter(
    (employee) => !employee.department_name,
  ).length;

  const missingContact = employees.filter(
    (employee) =>
      !employee.professional_email && !employee.professional_phone,
  ).length;

  const missingContract = employees.filter(
    (employee) => !employee.contract_type_name,
  ).length;

  const missingCost = employees.filter(
    (employee) =>
      employee.loaded_daily_cost === null ||
      employee.loaded_daily_cost === undefined,
  ).length;

  const inactive = employees.filter(
    (employee) =>
      !employee.is_active ||
      employee.employment_status === "departed" ||
      employee.employment_status === "archived",
  ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Bell
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Alertes qualité
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Contrôle des fiches incomplètes, contrats, coûts et rattachements.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <HrDecisionInsightPanels employees={employees} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AlertCard
            icon={Building2}
            title="Site manquant"
            value={missingSite}
            description="Collaborateurs sans site de rattachement."
            accent={missingSite > 0 ? "amber" : "emerald"}
          />

          <AlertCard
            icon={ShieldAlert}
            title="Service manquant"
            value={missingDepartment}
            description="Collaborateurs sans service ou département."
            accent={missingDepartment > 0 ? "amber" : "emerald"}
          />

          <AlertCard
            icon={MailWarning}
            title="Coordonnées manquantes"
            value={missingContact}
            description="Fiches sans email ni téléphone professionnel."
            accent={missingContact > 0 ? "rose" : "emerald"}
          />

          <AlertCard
            icon={FileWarning}
            title="Contrat manquant"
            value={missingContract}
            description="Collaborateurs sans type de contrat rattaché."
            accent={missingContract > 0 ? "rose" : "emerald"}
          />

          <AlertCard
            icon={AlertCircle}
            title="Coût manquant"
            value={missingCost}
            description="Fiches sans coût journalier chargé exploitable."
            accent={missingCost > 0 ? "amber" : "emerald"}
          />

          <AlertCard
            icon={UserX}
            title="Fiches inactives"
            value={inactive}
            description="Collaborateurs archivés, sortis ou désactivés."
            accent="indigo"
          />
        </div>
      </div>
    </section>
  );
}

export default function HrResourcesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PageTab>("directory");

  const [filters, setFilters] =
    useState<HrDirectoryFiltersValue>(initialFilters);

  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [seenAuditCount, setSeenAuditCount] = useState(0);
  const [optimisticAuditEvents, setOptimisticAuditEvents] = useState<
    HrAuditEvent[]
  >([]);
  const [localAuditEvents, setLocalAuditEvents] = useState<HrAuditEvent[]>([]);

  const [selectedEmployee, setSelectedEmployee] =
    useState<HrDirectoryEmployee | null>(null);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(
    null,
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["hr-members", orgId],
    queryFn: () => loadMembersData(orgId),
    enabled: Boolean(orgId),
  });

  const {
    data: persistedAuditEvents = [],
  } = useQuery({
    queryKey: ["hr-audit-history", data?.organization.id],
    queryFn: () => loadHrAuditHistory(data?.organization.id ?? ""),
    enabled: Boolean(data?.organization.id),
  });

  useEffect(() => {
    if (!data?.organization.id) {
      return;
    }

    setLocalAuditEvents(loadLocalAuditEvents(data.organization.id));
  }, [data?.organization.id]);

  const auditEvents = useMemo(() => {
    const merged: HrAuditEvent[] = [];
    const signatures = new Set<string>();

    [
      ...optimisticAuditEvents,
      ...localAuditEvents,
      ...persistedAuditEvents,
    ].forEach((event) => {
      const signature = getAuditSignature(event);

      if (signatures.has(signature)) {
        return;
      }

      signatures.add(signature);
      merged.push(event);
    });

    return merged
      .sort(
        (firstEvent, secondEvent) =>
          new Date(secondEvent.created_at ?? 0).getTime() -
          new Date(firstEvent.created_at ?? 0).getTime(),
      )
      .slice(0, 25);
  }, [
    optimisticAuditEvents,
    localAuditEvents,
    persistedAuditEvents,
  ]);

  useEffect(() => {
    if (isHistoryOpen) {
      setSeenAuditCount(auditEvents.length);
    }
  }, [
    isHistoryOpen,
    auditEvents.length,
  ]);

  async function refreshMembers() {
    await queryClient.invalidateQueries({
      queryKey: ["hr-members", orgId],
    });

    await queryClient.refetchQueries({
      queryKey: ["hr-members", orgId],
    });
  }

  async function refreshAuditHistory() {
    await queryClient.invalidateQueries({
      queryKey: ["hr-audit-history", data?.organization.id],
    });
  }

  async function pushAuditEvent({
    organizationId,
    entityType,
    entityId,
    action,
    title,
    description,
  }: {
    organizationId: string;
    entityType: string;
    entityId: string | null;
    action: string;
    title: string;
    description: string;
  }) {
    const localEvent: HrAuditEvent = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      title,
      description,
      actor_name: null,
      created_at: new Date().toISOString(),
    };

    setOptimisticAuditEvents((currentEvents) => [
      localEvent,
      ...currentEvents,
    ].slice(0, 25));

    setLocalAuditEvents((currentEvents) => {
      const nextEvents = [
        localEvent,
        ...currentEvents,
      ]
        .filter((event) => isTodayIsoDate(event.created_at))
        .slice(0, 50);

      saveLocalAuditEvents(organizationId, nextEvents);

      return nextEvents;
    });

    await recordHrAuditEvent({
      organizationId,
      entityType,
      entityId,
      action,
      title,
      description,
    });

    await refreshAuditHistory();
  }

  const archiveEmployeeMutation = useMutation({
    mutationFn: async (employee: HrDirectoryEmployee) => {
      if (!data?.organization.id) {
        throw new Error("Organisation introuvable.");
      }

      const { error } = await (supabase.from("hr_employees" as never) as any)
        .update({
          is_active: false,
          employment_status: "departed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", employee.id)
        .eq("organization_id", data.organization.id);

      if (error) {
        throw new Error(`Impossible d’archiver la fiche : ${error.message}`);
      }

      await pushAuditEvent({
        organizationId: data.organization.id,
        entityType: "hr_employee",
        entityId: employee.id,
        action: "archived",
        title: `Archivage de ${employee.full_name}`,
        description: `La fiche collaborateur ${employee.full_name} a été archivée.`,
      });
    },
    onSuccess: async () => {
      setSelectedEmployee(null);
      await refreshMembers();
    },
  });

  const restoreEmployeeMutation = useMutation({
    mutationFn: async (employee: HrDirectoryEmployee) => {
      if (!data?.organization.id) {
        throw new Error("Organisation introuvable.");
      }

      const { error } = await (supabase.from("hr_employees" as never) as any)
        .update({
          is_active: true,
          employment_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", employee.id)
        .eq("organization_id", data.organization.id);

      if (error) {
        throw new Error(`Impossible de réactiver la fiche : ${error.message}`);
      }

      await pushAuditEvent({
        organizationId: data.organization.id,
        entityType: "hr_employee",
        entityId: employee.id,
        action: "restored",
        title: `Réactivation de ${employee.full_name}`,
        description: `La fiche collaborateur ${employee.full_name} a été réactivée.`,
      });
    },
    onSuccess: async () => {
      setSelectedEmployee(null);
      await refreshMembers();
    },
  });

  async function handleMemberCreated() {
    await refreshMembers();

    await queryClient.invalidateQueries({
      queryKey: ["hr-member-form-references", data?.organization.id],
    });

    if (data?.organization.id) {
      await pushAuditEvent({
        organizationId: data.organization.id,
        entityType: "hr_employee",
        entityId: null,
        action: "created",
        title: "Création d’une fiche collaborateur",
        description:
          "Une nouvelle fiche collaborateur a été créée depuis la page Ressources.",
      });
    }

    setIsMemberFormOpen(false);
  }

  async function handleEmployeeArchived() {
    setSelectedEmployee(null);
    await refreshMembers();
    await refreshAuditHistory();
  }

  async function handleEmployeeUpdated() {
    const employee =
      data?.employees.find((item) => item.id === editingEmployeeId) ?? null;

    if (data?.organization.id && employee) {
      await pushAuditEvent({
        organizationId: data.organization.id,
        entityType: "hr_employee",
        entityId: employee.id,
        action: "updated",
        title: `Modification de ${employee.full_name}`,
        description: `La fiche collaborateur ${employee.full_name} a été modifiée.`,
      });
    }

    await refreshMembers();

    await queryClient.invalidateQueries({
      queryKey: ["hr-member-form-references", data?.organization.id],
    });

    await refreshAuditHistory();
  }

  function handleEmployeeClick(employee: HrDirectoryEmployee) {
    setEditingEmployeeId(null);
    setSelectedEmployee(employee);
  }

  function handleEmployeeEdit(employee: HrDirectoryEmployee) {
    setSelectedEmployee(null);
    setEditingEmployeeId(employee.id);
  }

  async function handleEmployeeArchive(employee: HrDirectoryEmployee) {
    const confirmed = window.confirm(
      `Archiver la fiche de ${employee.full_name} ?`,
    );

    if (!confirmed) {
      return;
    }

    await archiveEmployeeMutation.mutateAsync(employee);
  }

  async function handleEmployeeRestore(employee: HrDirectoryEmployee) {
    const confirmed = window.confirm(
      `Réactiver la fiche de ${employee.full_name} ?`,
    );

    if (!confirmed) {
      return;
    }

    await restoreEmployeeMutation.mutateAsync(employee);
  }

  function closeEditForm() {
    setEditingEmployeeId(null);
  }

  const filteredEmployees = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedSearch = filters.search.trim().toLowerCase();

    return data.employees.filter((employee) => {
      const searchableContent = [
        employee.full_name,
        employee.employee_number,
        employee.professional_email,
        employee.professional_phone,
        employee.site_name,
        employee.department_name,
        employee.job_name,
        employee.function_name,
        employee.manager_name,
        employee.contract_type_name,
        employee.work_schedule_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableContent.includes(normalizedSearch);

      const matchesStatus =
        filters.status === "all" ||
        employee.employment_status === filters.status;

      const matchesSite =
        filters.site === "all" || employee.site_name === filters.site;

      const matchesDepartment =
        filters.department === "all" ||
        employee.department_name === filters.department;

      const matchesContract =
        filters.contract === "all" ||
        employee.contract_type_name === filters.contract;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSite &&
        matchesDepartment &&
        matchesContract
      );
    });
  }, [
    data,
    filters,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ressources"
          subtitle="Chargement des collaborateurs de l’organisation."
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
          title="Ressources"
          subtitle="Gestion des collaborateurs et des rattachements RH."
          flush
        />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <p className="text-sm text-red-700 dark:text-red-300">
              {error instanceof Error
                ? error.message
                : "Une erreur inconnue est survenue."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeEmployees = filteredEmployees.filter(
    (employee) =>
      employee.is_active &&
      ["active", "probation", "preboarding"].includes(
        employee.employment_status,
      ),
  ).length;

  const probationEmployees = filteredEmployees.filter(
    (employee) => employee.employment_status === "probation",
  ).length;

  const departures = filteredEmployees.filter(
    (employee) =>
      employee.employment_status === "notice_period" ||
      employee.employment_status === "departed" ||
      employee.employment_status === "archived" ||
      !employee.is_active,
  ).length;

  const unseenAuditCount = Math.max(
    0,
    auditEvents.length - seenAuditCount,
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Ressources"
          subtitle={`Annuaire, contrats, coûts et pilotage des collaborateurs de ${data.organization.name}.`}
          flush
          actions={
            <>
              <DataExportMenu
                data={filteredEmployees}
                columns={employeeExportColumns}
                fileName={`annuaire_rh_${data.organization.slug}`}
                sheetName="Annuaire RH"
              />

              <button
                type="button"
                onClick={() =>
                  setIsHistoryOpen((current) => !current)
                }
                className="relative inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-xs font-bold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/50"
                title="Consulter l’historique RH"
              >
                <Bell className="h-3.5 w-3.5" />
                Historique RH

                {!isHistoryOpen && unseenAuditCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                    {unseenAuditCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsMemberFormOpen(true)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter un membre
              </button>
            </>
          }
        />

        <PageTutorial
          title="Gérer et piloter les ressources"
          description="Cette page centralise les fiches collaborateurs, les rattachements, les contrats, les rythmes de travail, les coûts et les alertes qualité."
          objectives={[
            "Centraliser les salariés, freelances, alternants et prestataires.",
            "Garantir la cohérence entre la fiche, le contrat et l’architecture RH.",
            "Calculer les coûts réellement utilisables par les projets et la finance.",
            "Conserver une traçabilité complète des modifications et archivages.",
          ]}
          steps={[
            {
              title: "Définir le périmètre",
              description:
                "Utilise la recherche et les filtres pour isoler un site, un service, un statut ou un type de contrat.",
            },
            {
              title: "Consulter les indicateurs",
              description:
                "Les KPI sont recalculés automatiquement selon le périmètre filtré.",
            },
            {
              title: "Ouvrir une fiche",
              description:
                "Clique sur un collaborateur pour consulter ses coordonnées, son rattachement, son contrat et ses coûts.",
            },
            {
              title: "Modifier ou archiver",
              description:
                "Utilise le menu trois points pour consulter, modifier, archiver ou réactiver une fiche.",
            },
            {
              title: "Analyser les résultats",
              description:
                "Les onglets présentent les répartitions, la qualité des données, les alertes et l’historique RH.",
            },
          ]}
          analyses={[
            {
              title: "Structure de l’effectif",
              description:
                "Répartition par statut, contrat, service, site et manager.",
            },
            {
              title: "Qualité des données",
              description:
                "Complétude des rattachements, coordonnées, contrats et coûts.",
            },
            {
              title: "Coûts et valorisation",
              description:
                "Salaires, taux horaires, TJM et coûts journaliers chargés.",
            },
            {
              title: "Traçabilité",
              description:
                "Historique des créations, modifications, archivages et réactivations.",
            },
          ]}
          recommendations={[
            "Créer les référentiels dans Architecture RH avant d’ajouter massivement des collaborateurs.",
            "Compléter les contrats et rythmes de travail avant les analyses de capacité.",
            "Contrôler les coûts avant toute affectation projet ou estimation de marge.",
            "Archiver les collaborateurs sortis plutôt que supprimer leur historique.",
          ]}
        />

        {isHistoryOpen && (
          <AuditHistoryPanel
            events={auditEvents}
            onClose={() => setIsHistoryOpen(false)}
          />
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Effectif total"
            value={filteredEmployees.length}
            description="Collaborateurs correspondant au périmètre filtré."
            icon={Users}
            accent="indigo"
          />

          <MetricCard
            label="Collaborateurs actifs"
            value={activeEmployees}
            description="Actifs, pré-intégrations et périodes d’essai."
            icon={UserCheck}
            accent="emerald"
          />

          <MetricCard
            label="Périodes d’essai"
            value={probationEmployees}
            description="Suivis et échéances à anticiper."
            icon={CalendarClock}
            accent="amber"
          />

          <MetricCard
            label="Départs"
            value={departures}
            description="Préavis, fiches sorties ou archivées."
            icon={UserX}
            accent="rose"
          />
        </section>

        {data.employees.length > 0 ? (
          <>
            <HrDirectoryFilters
              employees={data.employees}
              value={filters}
              onChange={setFilters}
              resultCount={filteredEmployees.length}
            />

            <div className="flex justify-center">
              <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => setActiveTab("directory")}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                    activeTab === "directory"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                      : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                  }`}
                >
                  <ContactRound className="h-4 w-4" />
                  Annuaire
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("graphs")}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                    activeTab === "graphs"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                      : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Graphiques
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("alerts")}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                    activeTab === "alerts"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                      : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  Alertes
                </button>
              </div>
            </div>

            {activeTab === "directory" ? (
              <HrDirectory
                employees={filteredEmployees}
                totalCount={data.employees.length}
                onEmployeeClick={handleEmployeeClick}
                onEdit={handleEmployeeEdit}
                onArchive={handleEmployeeArchive}
                onRestore={handleEmployeeRestore}
              />
            ) : activeTab === "graphs" ? (
              <HrDecisionDashboard
                employees={filteredEmployees}
                totalEmployees={data.employees.length}
              />
            ) : (
              <AlertsPanel employees={filteredEmployees} />
            )}
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-16 text-center dark:border-indigo-900 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
            <Users className="mx-auto h-8 w-8 text-indigo-500" />

            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              Aucun membre enregistré
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajoute la première fiche collaborateur pour constituer l’annuaire de cette organisation.
            </p>

            <button
              type="button"
              onClick={() => setIsMemberFormOpen(true)}
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Ajouter le premier membre
            </button>
          </section>
        )}
      </div>

      <HrMemberForm
        organizationId={data.organization.id}
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        onCreated={handleMemberCreated}
      />

      <HrEmployeeDrawer
        employee={selectedEmployee}
        organizationId={data.organization.id}
        isOpen={selectedEmployee !== null}
        onClose={() => setSelectedEmployee(null)}
        onEdit={handleEmployeeEdit}
        onArchived={handleEmployeeArchived}
      />

      <HrEmployeeEditForm
        employeeId={editingEmployeeId}
        organizationId={data.organization.id}
        isOpen={editingEmployeeId !== null}
        onClose={closeEditForm}
        onUpdated={handleEmployeeUpdated}
      />
    </>
  );
}