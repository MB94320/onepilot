"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Grid2X2,
  List,
  Mail,
  MapPin,
  Search,
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
  department_name: string | null;
  job_name: string | null;
  function_name: string | null;
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

type DirectoryView = "cards" | "table";

type HrDirectoryProps = {
  employees: HrDirectoryEmployee[];

  onEmployeeClick?: (
    employee: HrDirectoryEmployee,
  ) => void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(
  value: number | null | undefined,
) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getInitials(employee: HrDirectoryEmployee) {
  const firstInitial =
    employee.first_name?.trim().charAt(0) ?? "";

  const lastInitial =
    employee.last_name?.trim().charAt(0) ?? "";

  return `${firstInitial}${lastInitial}`.toUpperCase() || "NA";
}

function getStatusDefinition(status: string) {
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
    suspended: {
      label: "Suspendu",
      classes:
        "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900",
    },
    notice_period: {
      label: "Préavis",
      classes:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    },
    departed: {
      label: "Sorti",
      classes:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    },
    archived: {
      label: "Archivé",
      classes:
        "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
    },
  };

  return (
    definitions[status] ?? {
      label: status,
      classes:
        "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

function getCompensationLabel(
  employee: HrDirectoryEmployee,
) {
  if (employee.compensation_mode === "daily_rate") {
    return {
      label: "TJM",
      value: formatCurrency(
        employee.external_daily_rate,
      ),
    };
  }

  if (employee.compensation_mode === "hourly_rate") {
    return {
      label: "Taux horaire",
      value: formatCurrency(
        employee.external_hourly_rate,
      ),
    };
  }

  return {
    label: "Taux chargé",
    value: formatCurrency(
      employee.loaded_hourly_cost,
    ),
  };
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const definition = getStatusDefinition(status);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${definition.classes}`}
    >
      {definition.label}
    </span>
  );
}

function EmployeeAvatar({
  employee,
  size = "normal",
}: {
  employee: HrDirectoryEmployee;
  size?: "small" | "normal";
}) {
  const sizeClasses =
    size === "small"
      ? "h-9 w-9 text-xs"
      : "h-12 w-12 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white shadow-sm ${sizeClasses}`}
    >
      {employee.photo_url ? (
        <img
          src={employee.photo_url}
          alt={employee.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(employee)
      )}
    </div>
  );
}

function EmployeeCard({
  employee,
  onClick,
}: {
  employee: HrDirectoryEmployee;
  onClick?: () => void;
}) {
  const compensation =
    getCompensationLabel(employee);

  return (
    <article
      onClick={onClick}
      className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-800 dark:bg-slate-950 ${
        onClick
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg dark:hover:border-indigo-800"
          : ""
      }`}
    >
      <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          <EmployeeAvatar employee={employee} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-950 dark:text-white">
                  {employee.full_name}
                </h3>

                <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {employee.employee_number}
                </p>
              </div>

              <StatusBadge
                status={employee.employment_status}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-violet-500" />

            <span className="truncate">
              {employee.function_name ||
                employee.job_name ||
                "Fonction non renseignée"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <Building2 className="h-4 w-4 shrink-0 text-sky-500" />

            <span className="truncate">
              {employee.department_name ||
                "Service non renseigné"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 shrink-0 text-rose-500" />

            <span className="truncate">
              {employee.site_name ||
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
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Contrat
            </p>

            <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
              {employee.contract_type_name || "—"}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {compensation.label}
            </p>

            <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
              {compensation.value}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function HrDirectory({
  employees,
  onEmployeeClick,
}: HrDirectoryProps) {
  const [view, setView] =
    useState<DirectoryView>("cards");

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-white">
            Collaborateurs
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {employees.length} collaborateur
            {employees.length > 1 ? "s" : ""} affiché
            {employees.length > 1 ? "s" : ""}.
          </p>
        </div>

        <div className="inline-flex self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:self-auto dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition ${
              view === "cards"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <Grid2X2 className="h-4 w-4" />
            Cartes
          </button>

          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition ${
              view === "table"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <List className="h-4 w-4" />
            Tableau
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950">
          <Search className="mx-auto h-7 w-7 text-indigo-400" />

          <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
            Aucun collaborateur trouvé
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Modifie ou réinitialise les filtres.
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onClick={
                onEmployeeClick
                  ? () => onEmployeeClick(employee)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  {[
                    "Collaborateur",
                    "Statut",
                    "Fonction",
                    "Service",
                    "Site",
                    "Contrat",
                    "Arrivée",
                    "Taux brut",
                    "Taux chargé",
                    "Coût journalier",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={
                      onEmployeeClick
                        ? () =>
                            onEmployeeClick(employee)
                        : undefined
                    }
                    className={`border-b border-slate-100 transition last:border-0 dark:border-slate-800 ${
                      onEmployeeClick
                        ? "cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          employee={employee}
                          size="small"
                        />

                        <div>
                          <p className="max-w-52 truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {employee.full_name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {employee.employee_number}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge
                        status={
                          employee.employment_status
                        }
                      />
                    </td>

                    <td className="max-w-52 truncate px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {employee.function_name ||
                        employee.job_name ||
                        "—"}
                    </td>

                    <td className="max-w-52 truncate px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {employee.department_name || "—"}
                    </td>

                    <td className="max-w-44 truncate px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {employee.site_name || "—"}
                    </td>

                    <td className="max-w-44 truncate px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {employee.contract_type_name || "—"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {formatDate(employee.arrival_date)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {formatCurrency(
                        employee.gross_hourly_rate,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(
                        employee.loaded_hourly_cost,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
                      {formatCurrency(
                        employee.loaded_daily_cost,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}