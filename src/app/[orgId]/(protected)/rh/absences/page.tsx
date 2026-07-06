"use client";

import {
  use,
  useMemo,
  useState,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Grid2X2,
  List,
  Plus,
  ShieldCheck,
  Users,
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

import HrAbsenceFilters, {
  type HrAbsenceFiltersValue,
} from "@/components/hr/HrAbsenceFilters";
import HrAbsenceRequestForm from "@/components/hr/HrAbsenceRequestForm";
import HrAbsenceRequestTable, {
  type HrAbsenceRequestRow,
} from "@/components/hr/HrAbsenceRequestTable";
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
};

type RawAbsenceBalance = {
  id: string;
  organization_id: string;
  employee_id: string;
  absence_type_id: string;

  period_start: string;
  period_end: string;

  annual_entitlement: number | null;
  opening_balance: number | null;
  carried_over_amount: number | null;
  accrued_amount: number | null;
  adjustment_amount: number | null;
  consumed_amount: number | null;
  pending_amount: number | null;
};

type EmployeeReference = {
  id: string;
  employee_number: string | null;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  photo_url?: string | null;
  site_name: string | null;
  department_name: string | null;
};

type AbsenceTypeReference = {
  id: string;
  code: string | null;
  name: string | null;
  color: string | null;
  unit: string | null;
};

type AbsenceBalance = RawAbsenceBalance & {
  employee_number: string | null;
  employee_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  site_name: string | null;
  department_name: string | null;

  absence_type_code: string | null;
  absence_type_name: string | null;
  absence_type_color: string | null;
  absence_type_unit: string | null;

  available_balance: number;
};

type AbsencePageData = {
  organization: Organization;
  settings: HrSettings | null;
  requests: HrAbsenceRequestRow[];
  balances: AbsenceBalance[];
};

type PageTab =
  | "requests"
  | "analytics"
  | "balances";

type DisplayMode =
  | "cards"
  | "table";

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

type ExportRow = {
  employee: string;
  employeeNumber: string;
  absenceType: string;
  site: string;
  department: string;
  startDate: string;
  endDate: string;
  requestedAmount: number;
  unit: string;
  calendarDays: number;
  holidayDays: number;
  nonWorkingDays: number;
  availableBalance: number;
  status: string;
  manager: string;
  calendar: string;
  workSchedule: string;
  archived: string;
};

const initialFilters: HrAbsenceFiltersValue = {
  search: "",
  status: "all",
  type: "all",
  site: "all",
  period: "all",
  archive: "active",
};

const chartColors = [
  "#4f46e5",
  "#0ea5e9",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#e11d48",
  "#0891b2",
  "#475569",
];

const statusLabels: Record<
  string,
  string
> = {
  draft: "Brouillon",
  submitted: "À valider",
  manager_approved:
    "Validée manager",
  approved: "Approuvée",
  rejected: "Refusée",
  cancelled: "Annulée",
};

const unitLabels: Record<
  string,
  {
    singular: string;
    plural: string;
  }
> = {
  day: {
    singular: "jour",
    plural: "jours",
  },

  days: {
    singular: "jour",
    plural: "jours",
  },

  half_day: {
    singular: "demi-journée",
    plural: "demi-journées",
  },

  hour: {
    singular: "heure",
    plural: "heures",
  },

  hours: {
    singular: "heure",
    plural: "heures",
  },
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function toNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const parsedValue = Number(
    value ?? 0,
  );

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : 0;
}

function formatNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(toNumber(value));
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function getStatusLabel(
  status: string,
) {
  return (
    statusLabels[status] ??
    status
  );
}

function getUnitLabel(
  unit: string | null,
  value: number,
) {
  const normalizedUnit =
    unit?.toLowerCase() ??
    "day";

  const labels =
    unitLabels[normalizedUnit] ??
    unitLabels.day;

  return value > 1
    ? labels.plural
    : labels.singular;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
  fullName: string | null,
) {
  const firstInitial =
    firstName
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "";

  const lastInitial =
    lastName
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "";

  if (
    firstInitial ||
    lastInitial
  ) {
    return `${firstInitial}${lastInitial}`;
  }

  return (
    fullName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("") || "?"
  );
}

function getBalanceClasses(
  value: number,
) {
  if (value < 0) {
    return "text-rose-600 dark:text-rose-300";
  }

  if (value <= 3) {
    return "text-amber-600 dark:text-amber-300";
  }

  return "text-emerald-700 dark:text-emerald-300";
}

function createDistribution(
  requests: HrAbsenceRequestRow[],
  getValue: (
    request: HrAbsenceRequestRow,
  ) => string | null | undefined,
  emptyLabel: string,
): DistributionItem[] {
  const totals =
    new Map<string, number>();

  requests.forEach((request) => {
    const rawValue =
      getValue(request);

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
    .sort(
      (first, second) =>
        second.value -
        first.value,
    );
}

function getPeriodBounds(
  period: string,
) {
  const now = new Date();

  if (
    period === "current_month"
  ) {
    return {
      start: new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ),

      end: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      ),
    };
  }

  if (
    period === "next_month"
  ) {
    return {
      start: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      ),

      end: new Date(
        now.getFullYear(),
        now.getMonth() + 2,
        0,
        23,
        59,
        59,
      ),
    };
  }

  if (
    period === "current_year"
  ) {
    return {
      start: new Date(
        now.getFullYear(),
        0,
        1,
      ),

      end: new Date(
        now.getFullYear(),
        11,
        31,
        23,
        59,
        59,
      ),
    };
  }

  return null;
}

function requestMatchesPeriod(
  request: HrAbsenceRequestRow,
  period: string,
) {
  if (period === "all") {
    return true;
  }

  const bounds =
    getPeriodBounds(period);

  if (!bounds) {
    return true;
  }

  const requestStart =
    new Date(
      `${request.start_date}T12:00:00`,
    );

  const requestEnd =
    new Date(
      `${request.end_date}T12:00:00`,
    );

  return (
    requestStart <= bounds.end &&
    requestEnd >= bounds.start
  );
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

async function loadAbsencePageData(
  slugOrId: string,
): Promise<AbsencePageData> {
  const organization =
    await resolveOrganization(
      slugOrId,
    );

  const [
    requestsResult,
    balancesResult,
    employeesResult,
    absenceTypesResult,
    settingsResult,
  ] = await Promise.all([
    (
      supabase.from(
        "hr_absence_request_overview" as never,
      ) as any
    )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .order("created_at", {
        ascending: false,
      }),

    (
      supabase.from(
        "hr_absence_balances" as never,
      ) as any
    )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .order("period_end", {
        ascending: false,
      }),

    (
      supabase.from(
        "hr_employee_overview" as never,
      ) as any
    )
      .select(
        `
          id,
          employee_number,
          full_name,
          first_name,
          last_name,
          photo_url,
          site_name,
          department_name
        `,
      )
      .eq(
        "organization_id",
        organization.id,
      ),

    (
      supabase.from(
        "hr_absence_types" as never,
      ) as any
    )
      .select(
        `
          id,
          code,
          name,
          color,
          unit
        `,
      )
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

  if (requestsResult.error) {
    throw new Error(
      `Impossible de charger les demandes d’absence : ${requestsResult.error.message}`,
    );
  }

  if (balancesResult.error) {
    throw new Error(
      `Impossible de charger les soldes d’absence : ${balancesResult.error.message}`,
    );
  }

  if (employeesResult.error) {
    throw new Error(
      `Impossible de charger les collaborateurs : ${employeesResult.error.message}`,
    );
  }

  if (absenceTypesResult.error) {
    throw new Error(
      `Impossible de charger les types d’absence : ${absenceTypesResult.error.message}`,
    );
  }

  if (settingsResult.error) {
    throw new Error(
      `Impossible de charger les paramètres RH : ${settingsResult.error.message}`,
    );
  }

  const employees =
    (
      employeesResult.data ??
      []
    ) as EmployeeReference[];

  const absenceTypes =
    (
      absenceTypesResult.data ??
      []
    ) as AbsenceTypeReference[];

  const employeesById =
    new Map(
      employees.map((employee) => [
        employee.id,
        employee,
      ]),
    );

  const absenceTypesById =
    new Map(
      absenceTypes.map(
        (absenceType) => [
          absenceType.id,
          absenceType,
        ],
      ),
    );

  const balances =
    (
      balancesResult.data ??
      []
    ).map(
      (
        rawBalance:
          RawAbsenceBalance,
      ): AbsenceBalance => {
        const employee =
          employeesById.get(
            rawBalance.employee_id,
          );

        const absenceType =
          absenceTypesById.get(
            rawBalance.absence_type_id,
          );

        const availableBalance =
          toNumber(
            rawBalance.opening_balance,
          ) +
          toNumber(
            rawBalance.carried_over_amount,
          ) +
          toNumber(
            rawBalance.accrued_amount,
          ) +
          toNumber(
            rawBalance.adjustment_amount,
          ) -
          toNumber(
            rawBalance.consumed_amount,
          ) -
          toNumber(
            rawBalance.pending_amount,
          );

        return {
          ...rawBalance,

          employee_number:
            employee?.employee_number ??
            null,

          employee_name:
            employee?.full_name ??
            null,

          first_name:
            employee?.first_name ??
            null,

          last_name:
            employee?.last_name ??
            null,

          photo_url:
            employee?.photo_url ??
            null,

          site_name:
            employee?.site_name ??
            null,

          department_name:
            employee?.department_name ??
            null,

          absence_type_code:
            absenceType?.code ??
            null,

          absence_type_name:
            absenceType?.name ??
            null,

          absence_type_color:
            absenceType?.color ??
            null,

          absence_type_unit:
            absenceType?.unit ??
            null,

          available_balance:
            availableBalance,
        };
      },
    );

  return {
    organization,

    settings:
      (
        settingsResult.data as
          | HrSettings
          | null
      ) ?? null,

    requests:
      (
        requestsResult.data ??
        []
      ) as HrAbsenceRequestRow[],

    balances,
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
  right,
  countText,
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  title: string;
  description: string;
  accent: Accent;
  right?: React.ReactNode;
  countText?: string;
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
    <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-xl p-2.5 ${styles[accent]}`}
          >
            <Icon
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              {title}
            </h2>

            {countText && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {countText}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {right}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <Icon className="mx-auto h-8 w-8 text-indigo-400" />

      <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ViewSwitch({
  mode,
  onChange,
}: {
  mode: DisplayMode;
  onChange: (
    mode: DisplayMode,
  ) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={() =>
          onChange("cards")
        }
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
          mode === "cards"
            ? "bg-indigo-600 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
        }`}
      >
        <Grid2X2 className="h-3.5 w-3.5" />
        Cartes
      </button>

      <button
        type="button"
        onClick={() =>
          onChange("table")
        }
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
          mode === "table"
            ? "bg-indigo-600 text-white"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
        }`}
      >
        <List className="h-3.5 w-3.5" />
        Tableau
      </button>
    </div>
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
                    "Demandes",
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
        <EmptyState
          title="Aucune donnée à analyser"
          description="Les graphiques apparaîtront dès que des demandes seront enregistrées."
          icon={BarChart3}
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
                  "Demandes",
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
        <EmptyState
          title="Aucune donnée à analyser"
          description="La répartition apparaîtra dès que des demandes seront enregistrées."
          icon={BarChart3}
        />
      )}
    </article>
  );
}

function BalanceAvatar({
  balance,
}: {
  balance: AbsenceBalance;
}) {
  const initials = getInitials(
    balance.first_name,
    balance.last_name,
    balance.employee_name,
  );

  if (balance.photo_url) {
    return (
      <img
        src={balance.photo_url}
        alt={
          balance.employee_name ??
          "Collaborateur"
        }
        className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-sm">
      {initials}
    </div>
  );
}

function BalanceCard({
  balance,
}: {
  balance: AbsenceBalance;
}) {
  const availableBalance =
    toNumber(
      balance.available_balance,
    );

  const unitLabel =
    getUnitLabel(
      balance.absence_type_unit,
      availableBalance,
    );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <BalanceAvatar
          balance={balance}
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {balance.employee_name ??
              "Collaborateur non renseigné"}
          </p>

          <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {balance.employee_number ??
              "Matricule non renseigné"}
          </p>

          <p className="mt-1 truncate text-[11px] text-slate-400">
            {balance.department_name ??
              "Service non renseigné"}
            {" · "}
            {balance.site_name ??
              "Site non renseigné"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
          style={
            balance.absence_type_color
              ? {
                  backgroundColor:
                    balance.absence_type_color,
                }
              : undefined
          }
        />

        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {balance.absence_type_name ??
              "Type non renseigné"}
          </p>

          <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
            {balance.absence_type_code ??
              "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Droit annuel
          </p>

          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
            {formatNumber(
              balance.annual_entitlement,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Disponible
          </p>

          <p
            className={`mt-1 text-sm font-black ${getBalanceClasses(
              availableBalance,
            )}`}
          >
            {formatNumber(
              availableBalance,
            )}
          </p>

          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-300">
            {unitLabel}
          </p>
        </div>

        <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-300">
            Consommé
          </p>

          <p className="mt-1 text-sm font-black text-rose-600 dark:text-rose-300">
            {formatNumber(
              balance.consumed_amount,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-300">
            En attente
          </p>

          <p className="mt-1 text-sm font-black text-amber-600 dark:text-amber-300">
            {formatNumber(
              balance.pending_amount,
            )}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Période du{" "}
        {formatDate(
          balance.period_start,
        )}{" "}
        au{" "}
        {formatDate(
          balance.period_end,
        )}
      </p>
    </article>
  );
}

function BalancesPanel({
  balances,
}: {
  balances: AbsenceBalance[];
}) {
  const [
    displayMode,
    setDisplayMode,
  ] =
    useState<DisplayMode>(
      "cards",
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={WalletCards}
        title="Soldes d’absence"
        description="Droits annuels, reports, ajustements, consommations, demandes en attente et solde disponible."
        accent="emerald"
        countText={`${balances.length} résultat${
          balances.length > 1
            ? "s"
            : ""
        } sur ${balances.length}`}
        right={
          <ViewSwitch
            mode={displayMode}
            onChange={
              setDisplayMode
            }
          />
        }
      />

      {balances.length === 0 ? (
        <EmptyState
          title="Aucun solde enregistré"
          description="Les soldes apparaîtront après l’enregistrement des premières demandes et la configuration des règles de droits."
          icon={WalletCards}
        />
      ) : displayMode ===
        "cards" ? (
        <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
          {balances.map(
            (balance) => (
              <BalanceCard
                key={balance.id}
                balance={balance}
              />
            ),
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-slate-50/80 dark:bg-slate-900/70">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Collaborateur
                </th>

                <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Type
                </th>

                <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Période
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Droit annuel
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Report
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Ajustement
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Consommé
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  En attente
                </th>

                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Disponible
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {balances.map(
                (balance) => {
                  const availableBalance =
                    toNumber(
                      balance.available_balance,
                    );

                  const unit =
                    getUnitLabel(
                      balance.absence_type_unit,
                      availableBalance,
                    );

                  return (
                    <tr
                      key={balance.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-[230px] items-center gap-2.5">
                          <BalanceAvatar
                            balance={
                              balance
                            }
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                              {balance.employee_name ??
                                "Collaborateur non renseigné"}
                            </p>

                            <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {balance.employee_number ??
                                "Matricule non renseigné"}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {balance.department_name ??
                                "Service non renseigné"}
                              {" · "}
                              {balance.site_name ??
                                "Site non renseigné"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
                            style={
                              balance.absence_type_color
                                ? {
                                    backgroundColor:
                                      balance.absence_type_color,
                                  }
                                : undefined
                            }
                          />

                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {balance.absence_type_name ??
                                "Non renseigné"}
                            </p>

                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                              {balance.absence_type_code ??
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {formatDate(
                          balance.period_start,
                        )}{" "}
                        —{" "}
                        {formatDate(
                          balance.period_end,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(
                          balance.annual_entitlement,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(
                          balance.carried_over_amount,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(
                          balance.adjustment_amount,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-bold text-rose-600 dark:text-rose-300">
                        {formatNumber(
                          balance.consumed_amount,
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-sm font-bold text-amber-600 dark:text-amber-300">
                        {formatNumber(
                          balance.pending_amount,
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p
                          className={`text-sm font-black ${getBalanceClasses(
                            availableBalance,
                          )}`}
                        >
                          {formatNumber(
                            availableBalance,
                          )}
                        </p>

                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {unit}
                        </p>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const exportColumns: ExportColumn<ExportRow>[] = [
  {
    key: "employee",
    label: "Collaborateur",
    value: (row) => row.employee,
  },
  {
    key: "employeeNumber",
    label: "Matricule",
    value: (row) =>
      row.employeeNumber,
  },
  {
    key: "absenceType",
    label: "Type d’absence",
    value: (row) =>
      row.absenceType,
  },
  {
    key: "site",
    label: "Site",
    value: (row) => row.site,
  },
  {
    key: "department",
    label: "Service",
    value: (row) =>
      row.department,
  },
  {
    key: "startDate",
    label: "Date de début",
    value: (row) =>
      row.startDate,
  },
  {
    key: "endDate",
    label: "Date de fin",
    value: (row) => row.endDate,
  },
  {
    key: "requestedAmount",
    label: "Quantité",
    value: (row) =>
      row.requestedAmount,
  },
  {
    key: "unit",
    label: "Unité",
    value: (row) => row.unit,
  },
  {
    key: "calendarDays",
    label: "Jours calendaires",
    value: (row) =>
      row.calendarDays,
  },
  {
    key: "holidayDays",
    label: "Jours fériés exclus",
    value: (row) =>
      row.holidayDays,
  },
  {
    key: "nonWorkingDays",
    label: "Jours non travaillés",
    value: (row) =>
      row.nonWorkingDays,
  },
  {
    key: "availableBalance",
    label: "Solde disponible",
    value: (row) =>
      row.availableBalance,
  },
  {
    key: "status",
    label: "Statut",
    value: (row) => row.status,
  },
  {
    key: "manager",
    label: "Manager",
    value: (row) => row.manager,
  },
  {
    key: "calendar",
    label: "Calendrier",
    value: (row) => row.calendar,
  },
  {
    key: "workSchedule",
    label: "Rythme de travail",
    value: (row) =>
      row.workSchedule,
  },
  {
    key: "archived",
    label: "Archivée",
    value: (row) => row.archived,
  },
];

export default function HrAbsencesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);

  const queryClient =
    useQueryClient();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<PageTab>(
      "requests",
    );

  const [
    filters,
    setFilters,
  ] =
    useState<HrAbsenceFiltersValue>(
      initialFilters,
    );

  const [
    isRequestFormOpen,
    setIsRequestFormOpen,
  ] = useState(false);

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<HrAbsenceRequestRow | null>(
      null,
    );

  const [
    actionError,
    setActionError,
  ] = useState<string | null>(
    null,
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "hr-absences",
      orgId,
    ],

    queryFn: () =>
      loadAbsencePageData(orgId),

    enabled: Boolean(orgId),
  });

  const filteredRequests =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const normalizedSearch =
        filters.search
          .trim()
          .toLowerCase();

      return data.requests.filter(
        (request) => {
          const searchableContent = [
            request.employee_name,
            request.first_name,
            request.last_name,
            request.employee_number,
            request.professional_email,
            request.absence_type_name,
            request.absence_type_code,
            request.site_name,
            request.department_name,
            request.manager_name,
            request.contract_type_name,
            request.work_schedule_name,
            request.holiday_calendar_name,
            request.reason,
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
            request.status ===
              filters.status;

          const matchesType =
            filters.type === "all" ||
            request.absence_type_name ===
              filters.type;

          const matchesSite =
            filters.site === "all" ||
            request.site_name ===
              filters.site;

          const matchesPeriod =
            requestMatchesPeriod(
              request,
              filters.period,
            );

          const matchesArchive =
            filters.archive === "all" ||
            (
              filters.archive ===
                "archived" &&
              request.is_archived
            ) ||
            (
              filters.archive ===
                "active" &&
              !request.is_archived
            );

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType &&
            matchesSite &&
            matchesPeriod &&
            matchesArchive
          );
        },
      );
    }, [
      data,
      filters,
    ]);

  const metrics = useMemo(() => {
    const activeRequests =
      filteredRequests.filter(
        (request) =>
          !request.is_archived,
      );

    const total =
      activeRequests.length;

    const pending =
      activeRequests.filter(
        (request) =>
          request.status ===
            "submitted" ||
          request.status ===
            "manager_approved",
      ).length;

    const approved =
      activeRequests.filter(
        (request) =>
          request.status ===
          "approved",
      ).length;

    const requestedAmount =
      activeRequests.reduce(
        (totalAmount, request) =>
          totalAmount +
          toNumber(
            request.requested_amount,
          ),
        0,
      );

    return {
      total,
      pending,
      approved,
      requestedAmount,
    };
  }, [filteredRequests]);

  const distributions =
    useMemo(() => {
      return {
        statuses:
          createDistribution(
            filteredRequests,

            (request) =>
              getStatusLabel(
                request.status,
              ),

            "Non renseigné",
          ),

        types:
          createDistribution(
            filteredRequests,

            (request) =>
              request.absence_type_name,

            "Type non renseigné",
          ),

        sites:
          createDistribution(
            filteredRequests,

            (request) =>
              request.site_name,

            "Site non renseigné",
          ),

        departments:
          createDistribution(
            filteredRequests,

            (request) =>
              request.department_name,

            "Service non renseigné",
          ),
      };
    }, [filteredRequests]);

  const exportRows =
    useMemo<ExportRow[]>(
      () =>
        filteredRequests.map(
          (request) => {
            const requestedAmount =
              toNumber(
                request.requested_amount,
              );

            return {
              employee:
                request.employee_name ??
                "",

              employeeNumber:
                request.employee_number ??
                "",

              absenceType:
                request.absence_type_name ??
                "",

              site:
                request.site_name ??
                "",

              department:
                request.department_name ??
                "",

              startDate:
                formatDate(
                  request.start_date,
                ),

              endDate:
                formatDate(
                  request.end_date,
                ),

              requestedAmount,

              unit:
                getUnitLabel(
                  request.absence_unit,
                  requestedAmount,
                ),

              calendarDays:
                toNumber(
                  request.calendar_days,
                ),

              holidayDays:
                toNumber(
                  request.holiday_days,
                ),

              nonWorkingDays:
                toNumber(
                  request.non_working_days,
                ),

              availableBalance:
                toNumber(
                  request.available_balance,
                ),

              status:
                getStatusLabel(
                  request.status,
                ),

              manager:
                request.manager_name ??
                "",

              calendar:
                request.holiday_calendar_name ??
                "",

              workSchedule:
                request.work_schedule_name ??
                "Base standard 7 h",

              archived:
                request.is_archived
                  ? "Oui"
                  : "Non",
            };
          },
        ),
      [filteredRequests],
    );

  async function refreshData() {
    await queryClient.invalidateQueries({
      queryKey: [
        "hr-absences",
        orgId,
      ],
    });

    await queryClient.refetchQueries({
      queryKey: [
        "hr-absences",
        orgId,
      ],
    });
  }

  function openCreateForm() {
    setSelectedRequest(null);
    setActionError(null);
    setIsRequestFormOpen(true);
  }

  function openEditForm(
    request: HrAbsenceRequestRow,
  ) {
    setSelectedRequest(request);
    setActionError(null);
    setIsRequestFormOpen(true);
  }

  function closeRequestForm() {
    setIsRequestFormOpen(false);
    setSelectedRequest(null);
  }

  async function handleRequestSaved() {
    await refreshData();
  }

  async function handleCancelRequest(
    request: HrAbsenceRequestRow,
  ) {
    const confirmed =
      window.confirm(
        `Annuler la demande de ${request.employee_name ?? "ce collaborateur"} ?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionError(null);

      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          userError.message,
        );
      }

      const {
        error: updateError,
      } = await (
        supabase.from(
          "hr_absence_requests" as never,
        ) as any
      )
        .update({
          status: "cancelled",

          cancelled_at:
            new Date().toISOString(),

          updated_by:
            userData.user?.id ??
            null,
        })
        .eq("id", request.id)
        .eq(
          "organization_id",
          request.organization_id,
        );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }

      await refreshData();
    } catch (actionException: unknown) {
      setActionError(
        actionException instanceof Error
          ? actionException.message
          : "La demande n’a pas pu être annulée.",
      );
    }
  }

  async function handleArchiveRequest(
    request: HrAbsenceRequestRow,
  ) {
    const confirmed =
      window.confirm(
        `Archiver la demande de ${request.employee_name ?? "ce collaborateur"} ?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionError(null);

      const {
        error: archiveError,
      } = await (
        supabase as any
      ).rpc(
        "set_hr_absence_request_archived",
        {
          target_request_id:
            request.id,

          archived: true,
        },
      );

      if (archiveError) {
        throw new Error(
          archiveError.message,
        );
      }

      await refreshData();
    } catch (actionException: unknown) {
      setActionError(
        actionException instanceof Error
          ? actionException.message
          : "La demande n’a pas pu être archivée.",
      );
    }
  }

  async function handleRestoreRequest(
    request: HrAbsenceRequestRow,
  ) {
    try {
      setActionError(null);

      const {
        error: restoreError,
      } = await (
        supabase as any
      ).rpc(
        "set_hr_absence_request_archived",
        {
          target_request_id:
            request.id,

          archived: false,
        },
      );

      if (restoreError) {
        throw new Error(
          restoreError.message,
        );
      }

      await refreshData();
    } catch (actionException: unknown) {
      setActionError(
        actionException instanceof Error
          ? actionException.message
          : "La demande n’a pas pu être réactivée.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Absences & congés"
          subtitle="Chargement des demandes, validations et soldes."
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
          title="Absences & congés"
          subtitle="Gestion des demandes et des validations d’absence."
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

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Absences & congés"
          subtitle={`Demandes, validations, calendriers et soldes d’absence de ${data.organization.name}.`}
          flush
          actions={
            <>
              <DataExportMenu
                data={exportRows}
                columns={exportColumns}
                fileName={`absences_conges_${data.organization.slug}`}
                sheetName="Absences"
              />

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouvelle demande
              </button>
            </>
          }
        />

        <PageTutorial
          title="Piloter les absences et les congés"
          description="Centraliser les demandes, fiabiliser les validations et calculer automatiquement les jours ouvrés selon les contrats, les rythmes de travail et les calendriers locaux. Les droits CP, RTT salarié et RTT employeur seront consolidés pour garantir un décompte annuel fiable."
          objectives={[
            "Centraliser les demandes d’absence de l’organisation.",
            "Calculer les jours décomptés selon le contrat, le rythme et le calendrier local.",
            "Identifier rapidement les validations en attente N+1 ou RH.",
            "Contrôler les droits acquis, consommés, réservés et restants.",
          ]}
          steps={[
            {
              title:
                "Définir le périmètre",

              description:
                "Utilise la recherche et les filtres pour isoler une période, un statut, un type d’absence ou un site.",
            },

            {
              title:
                "Consulter les indicateurs",

              description:
                "Les KPI sont recalculés automatiquement selon les filtres appliqués.",
            },

            {
              title:
                "Suivre les demandes",

              description:
                "Le tableau et les cartes présentent les collaborateurs, les périodes, les calendriers, les jours exclus et les soldes.",
            },

            {
              title:
                "Analyser les absences",

              description:
                "L’onglet Analyses répartit les demandes par statut, type, site et service.",
            },

            {
              title:
                "Contrôler les soldes",

              description:
                "L’onglet Soldes rapproche les droits, consommations, demandes en attente et disponibilités.",
            },
          ]}
          analyses={[
            {
              title:
                "Charge de validation",

              description:
                "Demandes soumises ou validées par le manager mais non finalisées.",
            },

            {
              title:
                "Calendriers locaux",

              description:
                "Exclusion des jours fériés selon le site, le pays ou le calendrier par défaut.",
            },

            {
              title:
                "Impact de capacité",

              description:
                "Décompte des jours réellement travaillés avec une base minimale de sept heures en semaine.",
            },

            {
              title:
                "Fiabilité des soldes",

              description:
                "Contrôle des droits CP, RTT salarié, RTT employeur, consommations et soldes restants.",
            },
          ]}
          recommendations={[
            "Associer un calendrier local à chaque site.",
            "Configurer un rythme de travail explicite pour les temps partiels.",
            "Traiter les demandes en attente avant leur date de début.",
            "Maintenir les règles de droits par contrat, type d’absence et année.",
          ]}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Demandes"
            value={metrics.total}
            description="Demandes actives correspondant au périmètre."
            icon={CalendarDays}
            accent="indigo"
          />

          <MetricCard
            label="À valider"
            value={metrics.pending}
            description="Demandes soumises ou validées par le manager."
            icon={CalendarClock}
            accent="emerald"
          />

          <MetricCard
            label="Approuvées"
            value={metrics.approved}
            description="Demandes dont le circuit de validation est terminé."
            icon={CheckCircle2}
            accent="amber"
          />

          <MetricCard
            label="Volume demandé"
            value={formatNumber(
              metrics.requestedAmount,
            )}
            description="Nombre de jours ou unités demandés sur le périmètre."
            icon={CalendarCheck2}
            accent="rose"
          />
        </section>

        {actionError && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {actionError}
              </p>
            </div>
          </section>
        )}

        <HrAbsenceFilters
          requests={data.requests}
          value={filters}
          onChange={setFilters}
          resultCount={
            filteredRequests.length
          }
        />

        <div className="flex justify-center">
          <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "requests",
                )
              }
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                activeTab ===
                "requests"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                  : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
              }`}
            >
              <CalendarCheck2 className="h-4 w-4" />
              Demandes
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
                  "balances",
                )
              }
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                activeTab ===
                "balances"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
              }`}
            >
              <WalletCards className="h-4 w-4" />
              Soldes
            </button>
          </div>
        </div>

        {activeTab ===
          "requests" && (
          <HrAbsenceRequestTable
            requests={
              filteredRequests
            }
            totalCount={
              data.requests.length
            }
            onEdit={openEditForm}
            onCancel={
              handleCancelRequest
            }
            onArchive={
              handleArchiveRequest
            }
            onRestore={
              handleRestoreRequest
            }
          />
        )}

        {activeTab ===
          "analytics" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <PieDistributionCard
              title="Répartition par statut"
              description="État d’avancement des circuits de validation."
              data={
                distributions.statuses
              }
              icon={ShieldCheck}
              accent="indigo"
            />

            <PieDistributionCard
              title="Répartition par type"
              description="Poids des différents motifs d’absence."
              data={
                distributions.types
              }
              icon={CalendarDays}
              accent="violet"
            />

            <BarDistributionCard
              title="Répartition par site"
              description="Demandes enregistrées dans chaque implantation."
              data={
                distributions.sites
              }
              icon={Users}
              accent="emerald"
            />

            <BarDistributionCard
              title="Répartition par service"
              description="Demandes rattachées aux différents services."
              data={
                distributions.departments
              }
              icon={BarChart3}
              accent="amber"
            />
          </div>
        )}

        {activeTab ===
          "balances" && (
          <BalancesPanel
            balances={
              data.balances
            }
          />
        )}

        {!data.settings && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>
                <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                  Paramètres RH absents
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Aucun enregistrement hr_settings n’a été trouvé pour cette organisation.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <HrAbsenceRequestForm
        organizationId={
          data.organization.id
        }
        isOpen={
          isRequestFormOpen
        }
        request={
          selectedRequest
        }
        onClose={
          closeRequestForm
        }
        onSaved={
          handleRequestSaved
        }
      />
    </>
  );
}