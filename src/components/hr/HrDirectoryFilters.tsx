"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import type { HrDirectoryEmployee } from "@/components/hr/HrDirectory";

export type HrDirectoryFiltersValue = {
  search: string;
  status: string;
  site: string;
  department: string;
  contract: string;
};

type HrDirectoryFiltersProps = {
  employees: HrDirectoryEmployee[];
  value: HrDirectoryFiltersValue;
  onChange: (value: HrDirectoryFiltersValue) => void;
  resultCount: number;
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

function getEmployeeSite(employee: HrDirectoryEmployee) {
  return employee.site_free_text || employee.site_name;
}

function getEmployeeDepartment(employee: HrDirectoryEmployee) {
  return employee.department_free_text || employee.department_name;
}

function uniqueValues(
  employees: HrDirectoryEmployee[],
  resolver: (employee: HrDirectoryEmployee) => string | null | undefined,
) {
  return Array.from(
    new Set(
      employees
        .map((employee) => resolver(employee))
        .filter(
          (value): value is string =>
            Boolean(value?.trim()),
        ),
    ),
  ).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue, "fr", {
      sensitivity: "base",
    }),
  );
}

export default function HrDirectoryFilters({
  employees,
  value,
  onChange,
  resultCount,
}: HrDirectoryFiltersProps) {
  const sites = uniqueValues(employees, getEmployeeSite);

  const departments = uniqueValues(
    employees,
    getEmployeeDepartment,
  );

  const contractTypes = uniqueValues(
    employees,
    (employee) => employee.contract_type_name,
  );

  const hasActiveFilters =
    value.search.trim().length > 0 ||
    value.status !== "all" ||
    value.site !== "all" ||
    value.department !== "all" ||
    value.contract !== "all";

  function updateFilter<K extends keyof HrDirectoryFiltersValue>(
    field: K,
    fieldValue: HrDirectoryFiltersValue[K],
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
      site: "all",
      department: "all",
      contract: "all",
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
                Les filtres pilotent les KPI, les analyses,
                les graphiques et les exports.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
            {resultCount} résultat
            {resultCount > 1 ? "s" : ""} sur{" "}
            {employees.length}
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
              updateFilter("search", event.target.value)
            }
            placeholder="Rechercher un nom, matricule, métier, email, service..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={value.status}
            onChange={(event) =>
              updateFilter("status", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="preboarding">
              Pré-intégration
            </option>
            <option value="probation">
              Période d’essai
            </option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="notice_period">Préavis</option>
            <option value="departed">Sorti</option>
            <option value="archived">Archivé</option>
          </select>

          <select
            value={value.site}
            onChange={(event) =>
              updateFilter("site", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">Tous les sites</option>

            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>

          <select
            value={value.department}
            onChange={(event) =>
              updateFilter(
                "department",
                event.target.value,
              )
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les services
            </option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>

          <select
            value={value.contract}
            onChange={(event) =>
              updateFilter(
                "contract",
                event.target.value,
              )
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les contrats
            </option>

            {contractTypes.map((contractType) => (
              <option
                key={contractType}
                value={contractType}
              >
                {contractType}
              </option>
            ))}
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