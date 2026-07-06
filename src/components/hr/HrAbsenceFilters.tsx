"use client";

import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

export type HrAbsenceFilterRequest = {
  id: string;
  employee_name: string | null;
  employee_number: string | null;
  professional_email: string | null;
  absence_type_name: string | null;
  absence_type_code: string | null;
  site_name: string | null;
  department_name: string | null;
  manager_name: string | null;
  status: string;
  start_date: string;
  end_date: string;
  is_archived: boolean;
};

export type HrAbsenceFiltersValue = {
  search: string;
  status: string;
  type: string;
  site: string;
  period: string;
  archive: string;
};

type HrAbsenceFiltersProps = {
  requests: HrAbsenceFilterRequest[];
  value: HrAbsenceFiltersValue;
  onChange: (
    value: HrAbsenceFiltersValue,
  ) => void;
  resultCount: number;
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

function uniqueValues(
  requests: HrAbsenceFilterRequest[],
  field:
    | "absence_type_name"
    | "site_name",
) {
  return Array.from(
    new Set(
      requests
        .map(
          (request) =>
            request[field],
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(
              value?.trim(),
            ),
        ),
    ),
  ).sort(
    (
      firstValue,
      secondValue,
    ) =>
      firstValue.localeCompare(
        secondValue,
        "fr",
        {
          sensitivity: "base",
        },
      ),
  );
}

export default function HrAbsenceFilters({
  requests,
  value,
  onChange,
  resultCount,
}: HrAbsenceFiltersProps) {
  const absenceTypes =
    uniqueValues(
      requests,
      "absence_type_name",
    );

  const sites =
    uniqueValues(
      requests,
      "site_name",
    );

  const hasActiveFilters =
    value.search.trim().length >
      0 ||
    value.status !== "all" ||
    value.type !== "all" ||
    value.site !== "all" ||
    value.period !== "all" ||
    value.archive !== "active";

  function updateFilter<
    K extends keyof HrAbsenceFiltersValue,
  >(
    field: K,
    fieldValue:
      HrAbsenceFiltersValue[K],
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  function resetFilters() {
    onChange({
      search: "",
      status: "all",
      type: "all",
      site: "all",
      period: "all",
      archive: "active",
    });
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
                Les filtres pilotent les KPI, les analyses, les graphiques et les exports.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
            {resultCount} résultat
            {resultCount > 1
              ? "s"
              : ""}{" "}
            sur {requests.length}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />

          <input
            type="search"
            value={value.search}
            onChange={(event) =>
              updateFilter(
                "search",
                event.target.value,
              )
            }
            placeholder="Rechercher un collaborateur, un matricule, un type d’absence, un site ou un manager..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={value.status}
            onChange={(event) =>
              updateFilter(
                "status",
                event.target.value,
              )
            }
            className={
              selectClassName
            }
          >
            <option value="all">
              Tous les statuts
            </option>

            <option value="draft">
              Brouillon
            </option>

            <option value="submitted">
              À valider
            </option>

            <option value="manager_approved">
              Validée manager
            </option>

            <option value="approved">
              Approuvée
            </option>

            <option value="rejected">
              Refusée
            </option>

            <option value="cancelled">
              Annulée
            </option>
          </select>

          <select
            value={value.type}
            onChange={(event) =>
              updateFilter(
                "type",
                event.target.value,
              )
            }
            className={
              selectClassName
            }
          >
            <option value="all">
              Tous les types
            </option>

            {absenceTypes.map(
              (absenceType) => (
                <option
                  key={absenceType}
                  value={absenceType}
                >
                  {absenceType}
                </option>
              ),
            )}
          </select>

          <select
            value={value.site}
            onChange={(event) =>
              updateFilter(
                "site",
                event.target.value,
              )
            }
            className={
              selectClassName
            }
          >
            <option value="all">
              Tous les sites
            </option>

            {sites.map((site) => (
              <option
                key={site}
                value={site}
              >
                {site}
              </option>
            ))}
          </select>

          <select
            value={value.period}
            onChange={(event) =>
              updateFilter(
                "period",
                event.target.value,
              )
            }
            className={
              selectClassName
            }
          >
            <option value="all">
              Toutes les périodes
            </option>

            <option value="current_month">
              Mois en cours
            </option>

            <option value="next_month">
              Mois prochain
            </option>

            <option value="current_year">
              Année en cours
            </option>
          </select>

          <select
            value={value.archive}
            onChange={(event) =>
              updateFilter(
                "archive",
                event.target.value,
              )
            }
            className={
              selectClassName
            }
          >
            <option value="active">
              Demandes actives
            </option>

            <option value="archived">
              Demandes archivées
            </option>

            <option value="all">
              Actives et archivées
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