"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleAlert,
  Clock3,
  ContactRound,
  FileQuestion,
  Gauge,
  LayoutDashboard,
  MapPin,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";
import type { HrDirectoryEmployee } from "@/components/hr/HrDirectory";
import HrDirectoryFilters, {
  type HrDirectoryFiltersValue,
} from "@/components/hr/HrDirectoryFilters";

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
};

type HrEmployeeOverview = {
  id: string;

  employee_number: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;

  professional_email: string | null;
  professional_phone: string | null;

  arrival_date: string | null;
  employment_status: string | null;
  is_active: boolean | null;

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

type HrOverviewData = {
  organization: Organization;
  settings: HrSettings | null;
  employees: HrEmployeeOverview[];
};

type PageTab =
  | "overview"
  | "analytics"
  | "quality";


type Accent =
  | "indigo"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "cyan";

type DistributionItem = {
  name: string;
  value: number;
};

type QualityAlert = {
  id: string;
  label: string;
  description: string;
  count: number;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
};

const initialFilters: HrDirectoryFiltersValue = {
  search: "",
  status: "all",
  site: "all",
  department: "all",
  contract: "all",
};

const chartColors = [
  "#4f46e5",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0891b2",
  "#475569",
  "#65a30d",
];

const statusLabels: Record<string, string> = {
  active: "Actif",
  probation: "Période d’essai",
  preboarding: "Pré-intégration",
  notice_period: "Préavis",
  departed: "Sorti",
  inactive: "Inactif",
  archived: "Archivé",
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}


function getEmployeeSite(employee: HrEmployeeOverview) {
  return employee.site_free_text || employee.site_name;
}

function getEmployeeDepartment(employee: HrEmployeeOverview) {
  return employee.department_free_text || employee.department_name;
}

function getEmployeeJob(employee: HrEmployeeOverview) {
  return employee.job_free_text || employee.job_name;
}

function getEmployeeFunction(employee: HrEmployeeOverview) {
  return employee.function_free_text || employee.function_name;
}

function isBlank(
  value: string | null | undefined,
) {
  return (
    !value ||
    value.trim().length === 0
  );
}

function hasCompensation(
  employee: HrEmployeeOverview,
) {
  return Boolean(
    employee.compensation_mode ||
      (
        employee.annual_gross_salary !==
          null &&
        employee.annual_gross_salary !==
          undefined
      ) ||
      (
        employee.external_daily_rate !==
          null &&
        employee.external_daily_rate !==
          undefined
      ) ||
      (
        employee.external_hourly_rate !==
          null &&
        employee.external_hourly_rate !==
          undefined
      ) ||
      (
        employee.gross_hourly_rate !==
          null &&
        employee.gross_hourly_rate !==
          undefined
      ) ||
      (
        employee.loaded_hourly_cost !==
          null &&
        employee.loaded_hourly_cost !==
          undefined
      ) ||
      (
        employee.loaded_daily_cost !==
          null &&
        employee.loaded_daily_cost !==
          undefined
      ),
  );
}

function getStatusLabel(
  status: string | null,
) {
  if (!status) {
    return "Non renseigné";
  }

  return (
    statusLabels[status] ??
    status
  );
}

function formatPercentage(
  value: number,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    },
  ).format(value);
}



function createDistribution(
  employees: HrEmployeeOverview[],
  getValue: (
    employee: HrEmployeeOverview,
  ) => string | null | undefined,
  emptyLabel: string,
): DistributionItem[] {
  const totals =
    new Map<string, number>();

  employees.forEach((employee) => {
    const rawValue =
      getValue(employee);

    const label =
      rawValue &&
      rawValue.trim().length > 0
        ? rawValue.trim()
        : emptyLabel;

    totals.set(
      label,
      (totals.get(label) ?? 0) +
        1,
    );
  });

  return Array.from(
    totals.entries(),
  )
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((first, second) => {
      if (
        first.name === emptyLabel
      ) {
        return 1;
      }

      if (
        second.name === emptyLabel
      ) {
        return -1;
      }

      return (
        second.value -
        first.value
      );
    });
}

async function resolveOrganization(
  slugOrId: string,
): Promise<Organization> {
  const query = (
    supabase.from(
      "organizations" as never,
    ) as any
  ).select("id, name, slug");

  const { data, error } =
    isUuid(slugOrId)
      ? await query
          .eq("id", slugOrId)
          .limit(1)
          .maybeSingle()
      : await query
          .eq("slug", slugOrId)
          .limit(1)
          .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible d’identifier l’organisation : ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error(
      "L’organisation demandée est introuvable.",
    );
  }

  return data as Organization;
}

async function loadHrOverviewData(
  slugOrId: string,
): Promise<HrOverviewData> {
  const organization =
    await resolveOrganization(
      slugOrId,
    );

  const [
    employeesResult,
    employeeFreeFieldsResult,
    settingsResult,
  ] = await Promise.all([
    (
      supabase.from(
        "hr_employee_overview" as never,
      ) as any
    )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .order("last_name", {
        ascending: true,
      })
      .order("first_name", {
        ascending: true,
      }),

    (
      supabase.from(
        "hr_employees" as never,
      ) as any
    )
      .select("id, site_free_text, department_free_text, job_free_text, function_free_text")
      .eq(
        "organization_id",
        organization.id,
      ),

    (
      supabase.from(
        "hr_settings" as never,
      ) as any
    )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .maybeSingle(),
  ]);

  if (employeesResult.error) {
    throw new Error(
      `Impossible de charger les données RH : ${employeesResult.error.message}`,
    );
  }

  if (employeeFreeFieldsResult.error) {
    throw new Error(
      `Impossible de charger les rattachements libres : ${employeeFreeFieldsResult.error.message}`,
    );
  }

  if (settingsResult.error) {
    throw new Error(
      `Impossible de charger les paramètres RH : ${settingsResult.error.message}`,
    );
  }

  return {
    organization,

    settings:
      (
        settingsResult.data as
          | HrSettings
          | null
      ) ?? null,

    employees:
      ((employeesResult.data ?? []) as HrEmployeeOverview[]).map((employee) => {
        const freeFields = ((employeeFreeFieldsResult.data ?? []) as any[]).find(
          (item) => item.id === employee.id,
        );

        return {
          ...employee,
          ...(freeFields ?? {}),
        };
      }),
  };
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

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
}) {
  const styles: Record<
    Accent,
    {
      panel: string;
      icon: string;
      value: string;
    }
  > = {
    indigo: {
      panel:
        "border-indigo-100 from-indigo-50/85 via-white to-violet-50/65 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20",

      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

      value:
        "text-indigo-700 dark:text-indigo-300",
    },

    emerald: {
      panel:
        "border-emerald-100 from-emerald-50/85 via-white to-teal-50/65 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20",

      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

      value:
        "text-emerald-700 dark:text-emerald-300",
    },

    violet: {
      panel:
        "border-violet-100 from-violet-50/85 via-white to-fuchsia-50/65 dark:border-violet-900/50 dark:from-violet-950/30 dark:via-slate-950 dark:to-fuchsia-950/20",

      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

      value:
        "text-violet-700 dark:text-violet-300",
    },

    amber: {
      panel:
        "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20",

      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

      value:
        "text-amber-700 dark:text-amber-300",
    },

    rose: {
      panel:
        "border-rose-100 from-rose-50/85 via-white to-pink-50/65 dark:border-rose-900/50 dark:from-rose-950/30 dark:via-slate-950 dark:to-pink-950/20",

      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",

      value:
        "text-rose-700 dark:text-rose-300",
    },

    cyan: {
      panel:
        "border-cyan-100 from-cyan-50/85 via-white to-sky-50/65 dark:border-cyan-900/50 dark:from-cyan-950/30 dark:via-slate-950 dark:to-sky-950/20",

      icon:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",

      value:
        "text-cyan-700 dark:text-cyan-300",
    },
  };

  const selectedStyle =
    styles[accent];

  return (
    <article
      className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedStyle.panel}`}
    >
      <div className="flex h-full items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedStyle.icon}`}
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
              className={`shrink-0 text-2xl font-black leading-none ${selectedStyle.value}`}
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
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  title: string;
  description: string;
  accent: Accent;
}) {
  const styles: Record<
    Accent,
    string
  > = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

    rose:
      "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",

    cyan:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  };

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
      <div
        className={`rounded-xl p-2.5 ${styles[accent]}`}
      >
        <Icon
          className="h-4 w-4"
          strokeWidth={1.9}
        />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-black text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyChart({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-10 text-center">
      <div>
        <BarChart3 className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />

        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
          Aucune donnée disponible
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

function SettingsValue({
  label,
  value,
  suffix,
}: {
  label: string;

  value:
    | string
    | number
    | null
    | undefined;

  suffix?: string;
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    String(value).trim().length >
      0;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <dt className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </dt>

      <dd className="text-right text-sm font-black text-slate-900 dark:text-white">
        {hasValue
          ? `${value}${suffix ? ` ${suffix}` : ""}`
          : "Non renseigné"}
      </dd>
    </div>
  );
}

function QualityIssueCard({
  alert,
}: {
  alert: QualityAlert;
}) {
  const styles: Record<
    Accent,
    {
      icon: string;
      count: string;
    }
  > = {
    indigo: {
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

      count:
        "text-indigo-700 dark:text-indigo-300",
    },

    emerald: {
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

      count:
        "text-emerald-700 dark:text-emerald-300",
    },

    violet: {
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

      count:
        "text-violet-700 dark:text-violet-300",
    },

    amber: {
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

      count:
        "text-amber-700 dark:text-amber-300",
    },

    rose: {
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",

      count:
        "text-rose-700 dark:text-rose-300",
    },

    cyan: {
      icon:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",

      count:
        "text-cyan-700 dark:text-cyan-300",
    },
  };

  const selectedStyle =
    styles[alert.accent];

  const Icon = alert.icon;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-h-[175px] flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedStyle.icon}`}
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <p
            className={`text-3xl font-black leading-none ${selectedStyle.count}`}
          >
            {alert.count}
          </p>
        </div>

        <h3 className="mt-5 text-sm font-black text-slate-950 dark:text-white">
          {alert.label}
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {alert.description}
        </p>
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  description,
  value,
  icon: Icon,
  accent,
  progress,
}: {
  title: string;
  description: string;
  value: number | string;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
  progress?: number;
}) {
  const styles: Record<
    Accent,
    {
      icon: string;
      value: string;
      progress: string;
      progressBackground: string;
    }
  > = {
    indigo: {
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

      value:
        "text-indigo-700 dark:text-indigo-300",

      progress:
        "bg-gradient-to-r from-indigo-500 to-violet-500",

      progressBackground:
        "bg-indigo-100 dark:bg-indigo-950",
    },

    emerald: {
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

      value:
        "text-emerald-700 dark:text-emerald-300",

      progress:
        "bg-gradient-to-r from-emerald-500 to-teal-500",

      progressBackground:
        "bg-emerald-100 dark:bg-emerald-950",
    },

    violet: {
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

      value:
        "text-violet-700 dark:text-violet-300",

      progress:
        "bg-gradient-to-r from-violet-500 to-fuchsia-500",

      progressBackground:
        "bg-violet-100 dark:bg-violet-950",
    },

    amber: {
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

      value:
        "text-amber-700 dark:text-amber-300",

      progress:
        "bg-gradient-to-r from-amber-500 to-orange-500",

      progressBackground:
        "bg-amber-100 dark:bg-amber-950",
    },

    rose: {
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",

      value:
        "text-rose-700 dark:text-rose-300",

      progress:
        "bg-gradient-to-r from-rose-500 to-pink-500",

      progressBackground:
        "bg-rose-100 dark:bg-rose-950",
    },

    cyan: {
      icon:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",

      value:
        "text-cyan-700 dark:text-cyan-300",

      progress:
        "bg-gradient-to-r from-cyan-500 to-sky-500",

      progressBackground:
        "bg-cyan-100 dark:bg-cyan-950",
    },
  };

  const selectedStyle =
    styles[accent];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedStyle.icon}`}
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <p
            className={`text-3xl font-black leading-none ${selectedStyle.value}`}
          >
            {value}
          </p>
        </div>

        <h3 className="mt-5 text-sm font-black text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        {progress !== undefined && (
          <div
            className={`mt-4 h-2.5 overflow-hidden rounded-full ${selectedStyle.progressBackground}`}
          >
            <div
              className={`h-full rounded-full transition-all ${selectedStyle.progress}`}
              style={{
                width: `${Math.min(
                  Math.max(
                    progress,
                    0,
                  ),
                  100,
                )}%`,
              }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function PieDistributionCard({
  title,
  description,
  data,
  icon,
  accent,
}: {
  title: string;
  description: string;
  data: DistributionItem[];

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        title={title}
        description={description}
        icon={icon}
        accent={accent}
      />

      {data.length > 0 ? (
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <div className="h-[280px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={96}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {data.map(
                    (item, index) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>

                <Tooltip
                  formatter={(value) => [
                    Number(value),
                    "Collaborateurs",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {data
              .slice(0, 7)
              .map(
                (item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            chartColors[
                              index %
                                chartColors.length
                            ],
                        }}
                      />

                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {item.name}
                      </span>
                    </div>

                    <span className="shrink-0 text-xs font-black text-slate-950 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ),
              )}
          </div>
        </div>
      ) : (
        <EmptyChart
          label={description}
        />
      )}
    </article>
  );
}

function BarDistributionCard({
  title,
  description,
  data,
  icon,
  accent,
}: {
  title: string;
  description: string;
  data: DistributionItem[];

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
}) {
  const visibleData =
    data.slice(0, 8);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        title={title}
        description={description}
        icon={icon}
        accent={accent}
      />

      {visibleData.length > 0 ? (
        <div className="h-[340px] p-5">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={visibleData}
              layout="vertical"
              margin={{
                top: 4,
                right: 16,
                bottom: 4,
                left: 12,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#e2e8f0"
              />

              <XAxis
                type="number"
                allowDecimals={false}
                tick={{
                  fontSize: 11,
                }}
              />

              <YAxis
                type="category"
                dataKey="name"
                width={125}
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip
                formatter={(value) => [
                  Number(value),
                  "Collaborateurs",
                ]}
              />

              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                fill="#4f46e5"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart
          label={description}
        />
      )}
    </article>
  );
}

export default function HrOverviewPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);
  const router = useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<PageTab>(
      "overview",
    );

  const [filters, setFilters] =
  useState<HrDirectoryFiltersValue>(
    initialFilters,
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "hr-overview",
      orgId,
    ],

    queryFn: () =>
      loadHrOverviewData(orgId),

    enabled: Boolean(orgId),
  });

  

  const filteredEmployees =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const normalizedSearch =
        filters.search
          .trim()
          .toLowerCase();

      return data.employees.filter(
        (employee) => {
          const searchableContent = [
            employee.full_name,
            employee.employee_number,
            employee.professional_email,
            employee.professional_phone,
            getEmployeeSite(employee),
            getEmployeeDepartment(employee),
            getEmployeeJob(employee),
            getEmployeeFunction(employee),
            employee.manager_name,
            employee.contract_type_name,
            employee.work_schedule_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            normalizedSearch.length ===
              0 ||
            searchableContent.includes(
              normalizedSearch,
            );

          const matchesStatus =
            filters.status === "all" ||
            employee.employment_status ===
              filters.status;

          const matchesSite =
            filters.site === "all" ||
            getEmployeeSite(employee) ===
              filters.site;

          const matchesDepartment =
            filters.department ===
              "all" ||
            getEmployeeDepartment(employee) ===
              filters.department;

          const matchesContract =
            filters.contract ===
              "all" ||
            employee.contract_type_name ===
              filters.contract;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesSite &&
            matchesDepartment &&
            matchesContract
          );
        },
      );
    }, [
      data,
      filters,
    ]);

  const metrics = useMemo(() => {
    const employees =
      filteredEmployees;

    const totalEmployees =
      employees.length;

    const activeEmployees =
      employees.filter(
        (employee) =>
          employee.is_active !==
            false &&
          [
            "active",
            "probation",
            "preboarding",
          ].includes(
            employee.employment_status ??
              "",
          ),
      ).length;

    const probationEmployees =
      employees.filter(
        (employee) =>
          employee.employment_status ===
          "probation",
      ).length;

    const departures =
      employees.filter(
        (employee) =>
          employee.employment_status ===
            "notice_period" ||
          employee.employment_status ===
            "departed",
      ).length;

    const missingAttachment =
      employees.filter(
        (employee) =>
          isBlank(
            getEmployeeSite(employee),
          ) ||
          isBlank(
            getEmployeeDepartment(employee),
          ),
      ).length;

    const missingContract =
      employees.filter(
        (employee) =>
          isBlank(
            employee.contract_type_name,
          ),
      ).length;

    const missingCost =
      employees.filter(
        (employee) =>
          !hasCompensation(employee),
      ).length;

    const missingManager =
      employees.filter(
        (employee) =>
          isBlank(
            employee.manager_name,
          ),
      ).length;

    const missingContact =
      employees.filter(
        (employee) =>
          isBlank(
            employee.professional_email,
          ) ||
          isBlank(
            employee.professional_phone,
          ),
      ).length;

    const missingWorkSchedule =
      employees.filter(
        (employee) =>
          isBlank(
            employee.work_schedule_name,
          ),
      ).length;

    const requiredFieldsPerEmployee =
      8;

    const completedFields =
      employees.reduce(
        (total, employee) =>
          total +
          [
            !isBlank(
              employee.first_name,
            ) &&
              !isBlank(
                employee.last_name,
              ),

            !isBlank(
              employee.professional_email,
            ),

            !isBlank(
              employee.professional_phone,
            ),

            !isBlank(
              getEmployeeSite(employee),
            ),

            !isBlank(
              getEmployeeDepartment(employee),
            ),

            !isBlank(
              employee.contract_type_name,
            ),

            !isBlank(
              employee.work_schedule_name,
            ),

            hasCompensation(
              employee,
            ),
          ].filter(Boolean)
            .length,
        0,
      );

    const completionRate =
      totalEmployees > 0
        ? (
            completedFields /
            (
              totalEmployees *
              requiredFieldsPerEmployee
            )
          ) *
          100
        : 0;

    return {
      totalEmployees,
      activeEmployees,
      probationEmployees,
      departures,

      missingAttachment,
      missingContract,
      missingCost,
      missingManager,
      missingContact,
      missingWorkSchedule,

      completionRate,

      totalAlerts:
        missingAttachment +
        missingContract +
        missingCost +
        missingManager +
        missingContact +
        missingWorkSchedule,
    };
  }, [filteredEmployees]);

  const distributions =
    useMemo(() => {
      return {
        statuses:
          createDistribution(
            filteredEmployees,

            (employee) =>
              getStatusLabel(
                employee.employment_status,
              ),

            "Non renseigné",
          ),

        sites:
          createDistribution(
            filteredEmployees,

            (employee) =>
              getEmployeeSite(employee),

            "Site non renseigné",
          ),

        departments:
          createDistribution(
            filteredEmployees,

            (employee) =>
              getEmployeeDepartment(employee),

            "Service non renseigné",
          ),

        contracts:
          createDistribution(
            filteredEmployees,

            (employee) =>
              employee.contract_type_name,

            "Contrat non renseigné",
          ),
      };
    }, [filteredEmployees]);

  const qualityAlerts =
    useMemo<QualityAlert[]>(
      () => [
        {
          id: "attachment",

          label:
            "Rattachement manquant",

          description:
            "Collaborateurs sans site ou sans service de rattachement.",

          count:
            metrics.missingAttachment,

          icon: Network,
          accent: "indigo",
        },

        {
          id: "contract",

          label:
            "Contrat manquant",

          description:
            "Collaborateurs sans type de contrat renseigné.",

          count:
            metrics.missingContract,

          icon: FileQuestion,
          accent: "violet",
        },

        {
          id: "cost",

          label:
            "Coût manquant",

          description:
            "Collaborateurs sans rémunération ni coût exploitable.",

          count:
            metrics.missingCost,

          icon: WalletCards,
          accent: "amber",
        },

        {
          id: "manager",

          label:
            "Manager manquant",

          description:
            "Collaborateurs sans responsable hiérarchique identifié.",

          count:
            metrics.missingManager,

          icon: UserCheck,
          accent: "rose",
        },

        {
          id: "contact",

          label:
            "Coordonnées manquantes",

          description:
            "Collaborateurs sans email ou téléphone professionnel.",

          count:
            metrics.missingContact,

          icon: ContactRound,
          accent: "cyan",
        },

        {
          id: "work-schedule",

          label:
            "Rythme de travail manquant",

          description:
            "Collaborateurs sans rythme horaire ou forfait de travail.",

          count:
            metrics.missingWorkSchedule,

          icon: Clock3,
          accent: "emerald",
        },
      ],
      [metrics],
    );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vue d’ensemble RH"
          subtitle="Chargement des indicateurs et de la qualité des données RH."
          flush
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
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
          title="Vue d’ensemble RH"
          subtitle="Pilotage des effectifs et de la qualité des données RH."
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

  const settings =
    data.settings;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d’ensemble RH"
        subtitle={`Effectifs, structure, capacité et qualité des données RH de ${data.organization.name}.`}
        flush
        actions={
          <>            
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${encodeURIComponent(orgId)}/rh/ressources`,
                )
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
            >
              <Users className="h-3.5 w-3.5" />
              Voir les ressources
            </button>
          </>
        }
      />

      <PageTutorial
        title="Piloter les ressources humaines"
        description="Cette page consolide les effectifs, les statuts, les rattachements, les contrats, la capacité de travail et les principales anomalies de qualité des données."
        objectives={[
          "Disposer d’une lecture immédiate des effectifs et des mouvements.",
          "Identifier les périodes d’essai et les départs à anticiper.",
          "Analyser la répartition des collaborateurs dans l’organisation.",
          "Repérer les informations manquantes qui limitent les processus RH, projets et finance.",
        ]}
        steps={[
          {
            title:
              "Définir le périmètre",

            description:
              "Utilise la recherche et les filtres pour cibler les collaborateurs à analyser.",
          },

          {
            title:
              "Consulter les indicateurs",

            description:
              "Les KPI sont recalculés automatiquement selon le périmètre affiché.",
          },

          {
            title:
              "Analyser les répartitions",

            description:
              "L’onglet Analyses présente les statuts, sites, services et types de contrat.",
          },

          {
            title:
              "Contrôler la qualité",

            description:
              "L’onglet Qualité des données identifie les dossiers incomplets et les actions prioritaires.",
          },

          {
            title:
              "Vérifier la capacité",

            description:
              "La vue d’ensemble reprend les paramètres réellement enregistrés dans hr_settings.",
          },
        ]}
        analyses={[
          {
            title:
              "Structure des effectifs",

            description:
              "Répartition par statut, contrat, service et site.",
          },

          {
            title:
              "Qualité des données",

            description:
              "Complétude des rattachements, coordonnées, contrats, managers, rythmes de travail et coûts.",
          },

          {
            title:
              "Capacité théorique",

            description:
              "Paramètres de temps de travail utilisés par le staffing et les coûts.",
          },
        ]}
        recommendations={[
          "Corriger en priorité les coûts, contrats et rattachements manquants.",
          "Conserver un manager identifié pour chaque collaborateur actif.",
          "Compléter les rythmes de travail avant les analyses de capacité.",
          "Maintenir les paramètres hr_settings cohérents avec les règles de l’organisation.",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Effectif total"
          value={
            metrics.totalEmployees
          }
          description="Collaborateurs correspondant au périmètre affiché."
          icon={Users}
          accent="indigo"
        />

        <MetricCard
          label="Collaborateurs actifs"
          value={
            metrics.activeEmployees
          }
          description="Actifs, pré-intégrations et périodes d’essai."
          icon={UserCheck}
          accent="emerald"
        />

        <MetricCard
          label="Périodes d’essai"
          value={
            metrics.probationEmployees
          }
          description="Suivis et échéances à anticiper."
          icon={CalendarClock}
          accent="amber"
        />

        <MetricCard
          label="Départs"
          value={
            metrics.departures
          }
          description="Préavis et collaborateurs sortis."
          icon={UserX}
          accent="rose"
        />
      </section>

      {data.employees.length > 0 ? (
        <>
          <HrDirectoryFilters
            employees={
              data.employees as HrDirectoryEmployee[]
            }
            value={filters}
            onChange={setFilters}
            resultCount={filteredEmployees.length}
          />

          <div className="flex justify-center">
            <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "overview",
                  )
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                  activeTab ===
                  "overview"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                    : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Vue d’ensemble
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "analytics",
                  )
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                  activeTab ===
                  "analytics"
                    ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                    : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Analyses
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    "quality",
                  )
                }
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                  activeTab ===
                  "quality"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Qualité des données
              </button>
            </div>
          </div>

          {activeTab ===
            "overview" && (
            <div className="space-y-5">
              <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelHeader
                    icon={Gauge}
                    title="Paramètres de capacité"
                    description="Bases réellement enregistrées dans hr_settings pour le staffing, les temps et les coûts."
                    accent="indigo"
                  />

                  {settings ? (
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                      <MetricCard
                        label="Durée hebdomadaire"
                        value={
                          settings.default_weekly_hours !==
                            null
                            ? `${Number(
                                settings.default_weekly_hours,
                              )} h`
                            : "—"
                        }
                        description="Temps de travail hebdomadaire de référence."
                        icon={Clock3}
                        accent="indigo"
                      />

                      <MetricCard
                        label="Jours par semaine"
                        value={
                          settings.default_working_days_per_week ??
                          "—"
                        }
                        description="Nombre de jours travaillés chaque semaine."
                        icon={CalendarClock}
                        accent="emerald"
                      />

                      <MetricCard
                        label="Base annuelle"
                        value={
                          settings.default_annual_working_days !==
                            null
                            ? `${settings.default_annual_working_days} j`
                            : "—"
                        }
                        description="Nombre annuel de jours travaillés."
                        icon={BadgeCheck}
                        accent="violet"
                      />

                      <MetricCard
                        label="Durée journalière"
                        value={
                          settings.default_daily_hours !==
                            null
                            ? `${Number(
                                settings.default_daily_hours,
                              )} h`
                            : "—"
                        }
                        description="Temps journalier utilisé dans les calculs."
                        icon={Clock3}
                        accent="amber"
                      />
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                        <div className="flex items-start gap-3">
                          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

                          <div>
                            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                              Paramètres RH absents
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                              Aucun enregistrement hr_settings n’a été trouvé pour cette organisation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PanelHeader
                    icon={Building2}
                    title="Paramètres régionaux"
                    description="Configuration générale appliquée à l’organisation."
                    accent="violet"
                  />

                  {settings ? (
                    <dl className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
                      <SettingsValue
                        label="Pays"
                        value={
                          settings.default_country_code
                        }
                      />

                      <SettingsValue
                        label="Devise"
                        value={
                          settings.default_currency
                        }
                      />

                      <SettingsValue
                        label="Langue"
                        value={
                          settings.default_locale
                        }
                      />

                      <SettingsValue
                        label="Fuseau horaire"
                        value={
                          settings.default_timezone
                        }
                      />
                    </dl>
                  ) : (
                    <div className="px-5 py-10 text-center">
                      <Settings2 className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-700" />

                      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        Aucun paramètre régional
                      </p>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Les paramètres régionaux ne sont pas encore configurés.
                      </p>
                    </div>
                  )}
                </article>
              </section>

              <section className="grid gap-5 lg:grid-cols-3">
                <SummaryCard
                  title="Complétude"
                  description="Identité, coordonnées, rattachement, contrat, rythme de travail et coûts."
                  value={`${formatPercentage(
                    metrics.completionRate,
                  )} %`}
                  icon={BadgeCheck}
                  accent="emerald"
                  progress={
                    metrics.completionRate
                  }
                />

                <SummaryCard
                  title="Alertes détectées"
                  description="Une même fiche peut contenir plusieurs informations manquantes."
                  value={
                    metrics.totalAlerts
                  }
                  icon={CircleAlert}
                  accent="amber"
                />

                <SummaryCard
                  title="Périmètre analysé"
                  description={`Sur un total de ${data.employees.length} collaborateur(s) enregistré(s).`}
                  value={
                    filteredEmployees.length
                  }
                  icon={
                    BriefcaseBusiness
                  }
                  accent="indigo"
                />
              </section>
            </div>
          )}

          {activeTab ===
            "analytics" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <PieDistributionCard
                title="Répartition par statut"
                description="Situation administrative et opérationnelle des collaborateurs."
                data={
                  distributions.statuses
                }
                icon={UserCheck}
                accent="indigo"
              />

              <PieDistributionCard
                title="Répartition par contrat"
                description="Poids des différents types de contrats dans l’effectif."
                data={
                  distributions.contracts
                }
                icon={
                  BriefcaseBusiness
                }
                accent="violet"
              />

              <BarDistributionCard
                title="Répartition par site"
                description="Effectifs présents dans chaque implantation de l’organisation."
                data={
                  distributions.sites
                }
                icon={MapPin}
                accent="emerald"
              />

              <BarDistributionCard
                title="Répartition par service"
                description="Effectifs rattachés aux différents services et départements."
                data={
                  distributions.departments
                }
                icon={Building2}
                accent="amber"
              />
            </div>
          )}

          {activeTab ===
            "quality" && (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <PanelHeader
                  icon={CircleAlert}
                  title="Actions recommandées"
                  description="Ordre de traitement conseillé pour fiabiliser les données RH."
                  accent="amber"
                />

                <div className="grid gap-4 p-5 lg:grid-cols-3">
                  <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      Priorité haute
                    </p>

                    <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                      Coûts et contrats
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Ces informations conditionnent les calculs de coûts, de marges et de capacité.
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Priorité moyenne
                    </p>

                    <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                      Rattachements et managers
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Ils sécurisent les workflows de validation et les futures affectations projet.
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                      Suivi continu
                    </p>

                    <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                      Coordonnées et rythmes
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      Ces données sont indispensables aux notifications, au staffing et aux calculs de disponibilité.
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {qualityAlerts.map(
                  (alert) => (
                    <QualityIssueCard
                      key={
                        alert.id
                      }
                      alert={
                        alert
                      }
                    />
                  ),
                )}
              </section>

              <section className="grid gap-5 lg:grid-cols-3">
                <SummaryCard
                  title="Niveau de complétude"
                  description="Taux calculé selon le périmètre et les filtres actuellement appliqués."
                  value={`${formatPercentage(
                    metrics.completionRate,
                  )} %`}
                  icon={BadgeCheck}
                  accent="emerald"
                  progress={
                    metrics.completionRate
                  }
                />

                <SummaryCard
                  title="Alertes détectées"
                  description="Nombre cumulé d’informations manquantes sur les fiches affichées."
                  value={
                    metrics.totalAlerts
                  }
                  icon={CircleAlert}
                  accent="amber"
                />

                <SummaryCard
                  title="Périmètre analysé"
                  description={`Population filtrée sur ${data.employees.length} collaborateur(s) enregistré(s).`}
                  value={
                    filteredEmployees.length
                  }
                  icon={Users}
                  accent="indigo"
                />
              </section>
            </div>
          )}
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-16 text-center dark:border-indigo-900 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
          <Users className="mx-auto h-8 w-8 text-indigo-500" />

          <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
            Aucun collaborateur enregistré
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
            Les indicateurs et les analyses RH apparaîtront après la création des premières fiches collaborateurs.
          </p>
        </section>
      )}
    </div>
  );
}