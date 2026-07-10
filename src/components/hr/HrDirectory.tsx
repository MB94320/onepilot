"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  ArchiveRestore,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  Edit3,
  Eye,
  Grid2X2,
  List,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  Users,
} from "lucide-react";

export type HrDirectoryEmployee = {
  id: string;
  employee_number: string;

  first_name: string;
  last_name: string;
  full_name: string;

  professional_email: string | null;
  professional_phone: string | null;
  photo_url: string | null;

  arrival_date: string | null;

  employment_status: string;
  is_active: boolean;

  site_name: string | null;
  site_free_text?: string | null;
  department_name: string | null;
  department_free_text?: string | null;
  job_name: string | null;
  job_free_text?: string | null;
  function_name: string | null;
  function_free_text?: string | null;
  manager_name: string | null;

  contract_type_name: string | null;
  work_schedule_name: string | null;

  compensation_mode?: string | null;
  annual_gross_salary?: number | null;
  external_daily_rate?: number | null;
  external_hourly_rate?: number | null;
  gross_hourly_rate?: number | null;
  loaded_hourly_cost?: number | null;
  loaded_daily_cost?: number | null;
};

type DirectoryView =
  | "cards"
  | "table";

type MaybePromise =
  | void
  | Promise<void>;

type EmployeeAction = (
  employee: HrDirectoryEmployee,
) => MaybePromise;

type HrDirectoryProps = {
  employees: HrDirectoryEmployee[];
  totalCount?: number;

  onEmployeeClick?: (
    employee: HrDirectoryEmployee,
  ) => void;

  onEdit?: EmployeeAction;
  onArchive?: EmployeeAction;
  onRestore?: EmployeeAction;
};

type ActionMenuProps = {
  employee: HrDirectoryEmployee;
  align?: "left" | "right";

  onView?: (
    employee: HrDirectoryEmployee,
  ) => void;

  onEdit?: EmployeeAction;
  onArchive?: EmployeeAction;
  onRestore?: EmployeeAction;
};


function getPreferredText(
  freeText: string | null | undefined,
  referenceText: string | null | undefined,
) {
  const normalizedFreeText = freeText?.trim();

  if (normalizedFreeText) {
    return normalizedFreeText;
  }

  return referenceText?.trim() || null;
}

export function getEmployeeSite(employee: HrDirectoryEmployee) {
  return getPreferredText(employee.site_free_text, employee.site_name);
}

export function getEmployeeDepartment(employee: HrDirectoryEmployee) {
  return getPreferredText(
    employee.department_free_text,
    employee.department_name,
  );
}

export function getEmployeeJob(employee: HrDirectoryEmployee) {
  return getPreferredText(employee.job_free_text, employee.job_name);
}

export function getEmployeeFunction(employee: HrDirectoryEmployee) {
  return getPreferredText(
    employee.function_free_text,
    employee.function_name,
  );
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function formatCurrency(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function getInitials(
  employee: HrDirectoryEmployee,
) {
  const firstInitial =
    employee.first_name
      ?.trim()
      .charAt(0) ?? "";

  const lastInitial =
    employee.last_name
      ?.trim()
      .charAt(0) ?? "";

  return (
    `${firstInitial}${lastInitial}`.toUpperCase() ||
    "NA"
  );
}

function getStatusDefinition(
  status: string,
) {
  const definitions: Record<
    string,
    {
      label: string;
      classes: string;
    }
  > = {
    draft: {
      label: "Brouillon",
      classes:
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    },

    preboarding: {
      label: "Pré-intégration",
      classes:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    },

    probation: {
      label: "Période d’essai",
      classes:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },

    active: {
      label: "Actif",
      classes:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    },

    notice_period: {
      label: "Préavis",
      classes:
        "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900",
    },

    suspended: {
      label: "Suspendu",
      classes:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    },

    departed: {
      label: "Sorti",
      classes:
        "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700",
    },

    archived: {
      label: "Archivé",
      classes:
        "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    },
  };

  return (
    definitions[status] ?? {
      label: status,
      classes:
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    }
  );
}

function getCompensationSummary(
  employee: HrDirectoryEmployee,
) {
  if (
    employee.compensation_mode ===
    "daily_rate"
  ) {
    return {
      label: "TJM",
      value: formatCurrency(
        employee.external_daily_rate,
      ),
    };
  }

  if (
    employee.compensation_mode ===
    "hourly_rate"
  ) {
    return {
      label: "Taux horaire",
      value: formatCurrency(
        employee.external_hourly_rate,
      ),
    };
  }

  if (
    employee.compensation_mode ===
    "salary"
  ) {
    return {
      label: "Salaire annuel",
      value: formatCurrency(
        employee.annual_gross_salary,
      ),
    };
  }

  return {
    label: "Coût",
    value: formatCurrency(
      employee.loaded_daily_cost,
    ),
  };
}

function isEmployeeArchived(
  employee: HrDirectoryEmployee,
) {
  return (
    !employee.is_active ||
    employee.employment_status ===
      "departed" ||
    employee.employment_status ===
      "archived"
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const definition =
    getStatusDefinition(status);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${definition.classes}`}
    >
      {definition.label}
    </span>
  );
}

function ArchivedBadge({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-200 font-black text-slate-700 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 ${
        compact
          ? "px-2 py-0.5 text-[10px] uppercase tracking-wide"
          : "px-2.5 py-1 text-[11px]"
      }`}
    >
      Archivé
    </span>
  );
}

function EmployeeAvatar({
  employee,
  size = "default",
}: {
  employee: HrDirectoryEmployee;
  size?: "default" | "small";
}) {
  const sizeClass =
    size === "small"
      ? "h-10 w-10 text-xs"
      : "h-12 w-12 text-sm";

  if (employee.photo_url) {
    return (
      <img
        src={employee.photo_url}
        alt={employee.full_name}
        className={`${sizeClass} shrink-0 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-900`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-sm`}
    >
      {getInitials(employee)}
    </div>
  );
}

function ActionMenu({
  employee,
  align = "right",
  onView,
  onEdit,
  onArchive,
  onRestore,
}: ActionMenuProps) {
  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const archived =
    isEmployeeArchived(employee);

  const canArchive = !archived;
  const canRestore = archived;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isOpen]);

  async function executeAction(
    callback: EmployeeAction | undefined,
  ) {
    setIsOpen(false);

    if (!callback) {
      return;
    }

    setIsProcessing(true);

    try {
      await callback(employee);
    } finally {
      setIsProcessing(false);
    }
  }

  function executeView() {
    setIsOpen(false);

    if (onView) {
      onView(employee);
    }
  }

  return (
    <div
      ref={menuRef}
      className="relative inline-flex"
    >
      <button
        type="button"
        aria-label="Voir, modifier, archiver ou réactiver la fiche"
        title="Voir, modifier, archiver ou réactiver"
        disabled={isProcessing}
        onClick={(event) => {
          event.stopPropagation();

          setIsOpen(
            (current) => !current,
          );
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
      >
        {isProcessing ? (
          <Archive className="h-3.5 w-3.5 animate-pulse" />
        ) : (
          <MoreHorizontal className="h-3.5 w-3.5" />
        )}
      </button>

      {isOpen && (
        <div
          onClick={(event) =>
            event.stopPropagation()
          }
          className={`absolute top-10 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950 ${
            align === "right"
              ? "right-0"
              : "left-0"
          }`}
        >
          {canRestore ? (
            <button
              type="button"
              onClick={() =>
                void executeAction(
                  onRestore,
                )
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <ArchiveRestore className="h-4 w-4" />
              Réactiver la fiche
            </button>
          ) : (
            <>
              {onView && (
                <button
                  type="button"
                  onClick={executeView}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30"
                >
                  <Eye className="h-4 w-4" />
                  Voir la fiche
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  void executeAction(
                    onEdit,
                  )
                }
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
              >
                <Edit3 className="h-4 w-4" />
                Modifier la fiche
              </button>

              {canArchive && (
                <>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() =>
                      void executeAction(
                        onArchive,
                      )
                    }
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <Archive className="h-4 w-4" />
                    Archiver la fiche
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ViewSwitch({
  view,
  onChange,
}: {
  view: DirectoryView;
  onChange: (
    view: DirectoryView,
  ) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() =>
          onChange("cards")
        }
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
        onClick={() =>
          onChange("table")
        }
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

function EmployeeCard({
  employee,
  onView,
  onEdit,
  onArchive,
  onRestore,
}: {
  employee: HrDirectoryEmployee;

  onView?: (
    employee: HrDirectoryEmployee,
  ) => void;

  onEdit?: EmployeeAction;
  onArchive?: EmployeeAction;
  onRestore?: EmployeeAction;
}) {
  const compensation =
    getCompensationSummary(employee);

  const archived =
    isEmployeeArchived(employee);

  return (
    <article
      onClick={
        onView
          ? () => onView(employee)
          : undefined
      }
      className={`group relative overflow-visible rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        archived
          ? "border-slate-200 bg-slate-50 opacity-80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      } ${
        onView
          ? "cursor-pointer"
          : ""
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <EmployeeAvatar
            employee={employee}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-slate-950 dark:text-white">
                  {employee.full_name}
                </h3>

                <p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {employee.employee_number ||
                    "Matricule non renseigné"}
                </p>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                <StatusBadge
                  status={
                    employee.employment_status
                  }
                />

                {archived && (
                  <ArchivedBadge />
                )}

                <ActionMenu
                  employee={employee}
                  onView={onView}
                  onEdit={onEdit}
                  onArchive={onArchive}
                  onRestore={onRestore}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-violet-500" />

            <span className="truncate">
              {getEmployeeFunction(employee) ||
                getEmployeeJob(employee) ||
                "Fonction non renseignée"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Building2 className="h-4 w-4 shrink-0 text-sky-500" />

            <span className="truncate">
              {getEmployeeDepartment(employee) ||
                "Service non renseigné"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 shrink-0 text-rose-500" />

            <span className="truncate">
              {getEmployeeSite(employee) ||
                "Site non renseigné"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 shrink-0 text-emerald-500" />

            <span className="truncate">
              {employee.professional_email ||
                "Email non renseigné"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 shrink-0 text-indigo-500" />

            <span className="truncate">
              {employee.professional_phone ||
                "Téléphone non renseigné"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/50">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Contrat
            </p>

            <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
              {employee.contract_type_name ||
                "—"}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/50">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Rythme
            </p>

            <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
              {employee.work_schedule_name ||
                "—"}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/50">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              {compensation.label}
            </p>

            <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
              {compensation.value}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-950/50">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Arrivée
            </p>

            <p className="mt-1 truncate text-xs font-bold text-slate-700 dark:text-slate-300">
              {formatDate(
                employee.arrival_date,
              )}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HrDirectory({
  employees,
  totalCount,
  onEmployeeClick,
  onEdit,
  onArchive,
  onRestore,
}: HrDirectoryProps) {
  const [
    view,
    setView,
  ] =
    useState<DirectoryView>(
      "cards",
    );

  const hasActions =
    Boolean(
      onEmployeeClick ||
        onEdit ||
        onArchive ||
        onRestore,
    );

  const headerColumns =
    useMemo(() => {
      const columns = [
        "Collaborateur",
        "Statut",
        "Fonction",
        "Service",
        "Site",
        "Contrat",
        "Rythme",
        "Arrivée",
        "Taux brut",
        "Taux chargé",
        "Coût journalier",
      ];

      if (hasActions) {
        columns.push("Actions");
      }

      return columns;
    }, [hasActions]);

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Users
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Collaborateurs
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Cartes opérationnelles ou tableau dense avec rattachements, contrat, rythme, coûts et actions rapides.
            </p>
          </div>
        </div>

        <ViewSwitch
          view={view}
          onChange={setView}
        />
      </div>

      {employees.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Search className="mx-auto h-8 w-8 text-indigo-400" />

          <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
            Aucun collaborateur trouvé
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Modifie ou réinitialise les filtres du périmètre d’analyse.
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-5 p-5 xl:grid-cols-2 2xl:grid-cols-3">
          {employees.map(
            (employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onView={
                  onEmployeeClick
                }
                onEdit={onEdit}
                onArchive={onArchive}
                onRestore={onRestore}
              />
            ),
          )}
        </div>
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1480px] border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                {headerColumns.map(
                  (heading) => (
                    <th
                      key={heading}
                      className={
                        heading === "Collaborateur"
                          ? "sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[1px_0_0_0_rgba(148,163,184,0.25)] dark:bg-slate-900"
                          : heading === "Actions"
                            ? "sticky right-0 z-30 bg-slate-50 px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[-1px_0_0_0_rgba(148,163,184,0.25)] dark:bg-slate-900"
                            : "px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500"
                      }
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => {
                const archived =
                  isEmployeeArchived(employee);

                return (
                  <tr
                    key={employee.id}
                    onClick={
                      onEmployeeClick
                        ? () =>
                            onEmployeeClick(
                              employee,
                            )
                        : undefined
                    }
                    className={`border-b border-slate-100 transition last:border-0 dark:border-slate-800 ${
                      archived
                        ? "bg-slate-50 text-slate-500 opacity-80 hover:bg-slate-100 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-900"
                        : onEmployeeClick
                          ? "cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgba(148,163,184,0.18)] dark:bg-slate-950">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          employee={
                            employee
                          }
                          size="small"
                        />

                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-black text-slate-950 dark:text-white">
                            {
                              employee.full_name
                            }
                          </p>

                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {employee.employee_number ||
                              "Matricule non renseigné"}
                          </p>

                          {employee.professional_email && (
                            <p className="mt-0.5 max-w-56 truncate text-xs text-slate-400">
                              {
                                employee.professional_email
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            employee.employment_status
                          }
                        />

                        {archived && (
                          <ArchivedBadge compact />
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {getEmployeeFunction(employee) ||
                          getEmployeeJob(employee) ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                        {getEmployeeDepartment(employee) ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                        {getEmployeeSite(employee) ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                        {employee.contract_type_name ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                        {employee.work_schedule_name ||
                          "—"}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CalendarDays className="h-4 w-4 shrink-0 text-indigo-400" />
                        {formatDate(
                          employee.arrival_date,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(
                          employee.gross_hourly_rate,
                        )}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Clock3 className="h-4 w-4 shrink-0 text-emerald-500" />
                        {formatCurrency(
                          employee.loaded_hourly_cost,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(
                          employee.loaded_daily_cost,
                        )}
                      </p>
                    </td>

                    {hasActions && (
                      <td
                        className="sticky right-0 z-10 bg-white px-4 py-3 text-right shadow-[-1px_0_0_0_rgba(148,163,184,0.18)] dark:bg-slate-950"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <ActionMenu
                          employee={
                            employee
                          }
                          align="right"
                          onView={
                            onEmployeeClick
                          }
                          onEdit={onEdit}
                          onArchive={
                            onArchive
                          }
                          onRestore={
                            onRestore
                          }
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}