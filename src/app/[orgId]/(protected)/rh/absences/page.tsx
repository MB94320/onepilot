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
  Archive,
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Copy,
  Expand,
  Grid2X2,
  Eye,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Users,
  WalletCards,
  X,
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
  manager_id: string | null;
  manager_name: string | null;
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
  | "approvals"
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


function isTrackedAbsenceBalanceType(
  absenceTypeCode: string | null,
  absenceTypeName: string | null,
) {
  const normalizedCode = (absenceTypeCode ?? "")
    .trim()
    .toUpperCase();

  const normalizedName = (absenceTypeName ?? "")
    .trim()
    .toLowerCase();

  return (
    normalizedCode === "CP" ||
    normalizedCode === "RTT_EMPLOYEUR" ||
    normalizedCode === "RTT_EMPLOYE" ||
    normalizedName === "congés payés" ||
    normalizedName === "rtt employeur" ||
    normalizedName === "rtt employé"
  );
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
          department_name,
          manager_id,
          manager_name
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
    )
    .filter((balance: AbsenceBalance) =>
      isTrackedAbsenceBalanceType(
        balance.absence_type_code,
        balance.absence_type_name,
      ),
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
      ).map((rawRequest: HrAbsenceRequestRow) => {
        const mutableRequest = rawRequest as any;
        const employee = employeesById.get(rawRequest.employee_id);
        const managerId =
          mutableRequest.manager_employee_id ??
          mutableRequest.manager_id ??
          employee?.manager_id ??
          null;

        const manager = managerId
          ? employeesById.get(managerId)
          : null;

        return {
          ...rawRequest,
          manager_name:
            rawRequest.manager_name ??
            manager?.full_name ??
            employee?.manager_name ??
            null,
        } as HrAbsenceRequestRow;
      }),

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


function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildDistributionSvg(
  title: string,
  data: DistributionItem[],
) {
  const width = 960;
  const rowHeight = 42;
  const height = Math.max(280, 110 + data.length * rowHeight);
  const maxValue = Math.max(
    1,
    ...data.map((item) => item.value),
  );

  const rows = data
    .slice(0, 16)
    .map((item, index) => {
      const y = 86 + index * rowHeight;
      const barWidth = Math.max(8, (item.value / maxValue) * 520);

      return `
        <text x="52" y="${y + 16}" font-size="14" font-family="Arial" fill="#334155">${escapeSvgText(item.name)}</text>
        <rect x="300" y="${y}" width="${barWidth}" height="22" rx="7" fill="${chartColors[index % chartColors.length]}" />
        <text x="${315 + barWidth}" y="${y + 16}" font-size="13" font-family="Arial" font-weight="700" fill="#0F172A">${item.value}</text>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      <text x="48" y="42" font-size="22" font-family="Arial" font-weight="800" fill="#0F172A">${escapeSvgText(title)}</text>
      <text x="48" y="64" font-size="12" font-family="Arial" fill="#64748B">Export SVG depuis OnePilot · Absences & congés</text>
      ${rows}
    </svg>
  `.trim();
}

async function svgToPngBlob(svg: string) {
  return new Promise<Blob | null>((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    const image = new Image();
    const svgBlob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width || 960;
      canvas.height = image.height || 520;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
        return;
      }

      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        resolve(blob);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

async function copyDistributionSvg(
  title: string,
  data: DistributionItem[],
) {
  const svg = buildDistributionSvg(
    title,
    data,
  );

  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      navigator.clipboard?.write
    ) {
      const pngBlob = await svgToPngBlob(svg);

      if (pngBlob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": pngBlob,
            "image/svg+xml": new Blob([svg], {
              type: "image/svg+xml",
            }),
            "text/plain": new Blob([svg], {
              type: "text/plain",
            }),
          }),
        ]);

        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svg], {
            type: "image/svg+xml",
          }),
          "text/plain": new Blob([svg], {
            type: "text/plain",
          }),
        }),
      ]);

      return;
    }
  } catch {
    // Fallback texte.
  }

  await navigator.clipboard.writeText(svg);
}

function ChartFullScreenModal({
  title,
  description,
  isOpen,
  onClose,
  children,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-5 py-4 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-950 dark:to-sky-950/20">
          <div>
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              {title}
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="h-[70vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartActions({
  title,
  data,
  onExpand,
}: {
  title: string;
  data: DistributionItem[];
  onExpand: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void copyDistributionSvg(title, data)}
        title="Copier le graphique en SVG"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300"
      >
        <Copy className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onExpand}
        title="Agrandir le graphique"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300"
      >
        <Expand className="h-4 w-4" />
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
  const [isExpanded, setIsExpanded] =
    useState(false);

  const chart = (
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
  );

  const legend = (
    <div className="space-y-2">
      {data
        .slice(0, 12)
        .map(
          (item, index) => (
            <div
              key={item.name}
              title={`${item.name} · ${item.value} demande(s)`}
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
  );

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <PanelHeader
          title={title}
          description={description}
          icon={icon}
          accent={accent}
          right={
            data.length > 0 ? (
              <ChartActions
                title={title}
                data={data}
                onExpand={() => setIsExpanded(true)}
              />
            ) : null
          }
        />

        {data.length > 0 ? (
          <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div className="h-[280px]">
              {chart}
            </div>

            {legend}
          </div>
        ) : (
          <EmptyState
            title="Aucune donnée à analyser"
            description="Les graphiques apparaîtront dès que des demandes seront enregistrées."
            icon={BarChart3}
          />
        )}
      </article>

      <ChartFullScreenModal
        title={title}
        description={description}
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
      >
        <div className="grid h-full gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="h-full min-h-[420px]">
            {chart}
          </div>

          <div className="max-h-[68vh] overflow-auto pr-1">
            {legend}
          </div>
        </div>
      </ChartFullScreenModal>
    </>
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
  const [isExpanded, setIsExpanded] =
    useState(false);

  const visibleData =
    data.slice(0, 8);

  const chart = (
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
  );

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <PanelHeader
          title={title}
          description={description}
          icon={icon}
          accent={accent}
          right={
            visibleData.length > 0 ? (
              <ChartActions
                title={title}
                data={visibleData}
                onExpand={() => setIsExpanded(true)}
              />
            ) : null
          }
        />

        {visibleData.length > 0 ? (
          <div className="h-[340px] p-5">
            {chart}
          </div>
        ) : (
          <EmptyState
            title="Aucune donnée à analyser"
            description="La répartition apparaîtra dès que des demandes seront enregistrées."
            icon={BarChart3}
          />
        )}
      </article>

      <ChartFullScreenModal
        title={title}
        description={description}
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
      >
        {chart}
      </ChartFullScreenModal>
    </>
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

type BalanceEmployeeGroup = {
  employeeId: string;
  employeeName: string | null;
  employeeNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  siteName: string | null;
  departmentName: string | null;
  balances: AbsenceBalance[];
};

function getBalanceByCode(
  group: BalanceEmployeeGroup,
  code: string,
) {
  return (
    group.balances.find(
      (balance) => balance.absence_type_code === code,
    ) ?? null
  );
}

function getBalanceAvailable(balance: AbsenceBalance | null) {
  if (!balance) {
    return 0;
  }

  return (
    toNumber(balance.opening_balance) +
    toNumber(balance.carried_over_amount) +
    toNumber(balance.accrued_amount) +
    toNumber(balance.adjustment_amount) -
    toNumber(balance.consumed_amount) -
    toNumber(balance.pending_amount)
  );
}

function BalanceMetricCell({
  label,
  balance,
  accent,
}: {
  label: string;
  balance: AbsenceBalance | null;
  accent: "indigo" | "violet" | "emerald";
}) {
  const styles = {
    indigo:
      "border-indigo-100 bg-indigo-50/60 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300",
    violet:
      "border-violet-100 bg-violet-50/60 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300",
    emerald:
      "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300",
  };

  const available = getBalanceAvailable(balance);

  return (
    <div className={`rounded-xl border p-3 ${styles[accent]}`}>
      <p className="text-[10px] font-black uppercase tracking-wide opacity-80">
        {label}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="font-black uppercase opacity-70">Droit</p>
          <p className="mt-1 text-sm font-black">{formatNumber(balance?.annual_entitlement ?? 0)}</p>
        </div>

        <div>
          <p className="font-black uppercase opacity-70">Solde</p>
          <p className="mt-1 text-sm font-black">{formatNumber(available)}</p>
        </div>

        <div>
          <p className="font-black uppercase opacity-70">Consommé</p>
          <p className="mt-1 text-sm font-black">{formatNumber(balance?.consumed_amount ?? 0)}</p>
        </div>

        <div>
          <p className="font-black uppercase opacity-70">En cours</p>
          <p className="mt-1 text-sm font-black">{formatNumber(balance?.pending_amount ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}

function BalanceGroupCard({
  group,
}: {
  group: BalanceEmployeeGroup;
}) {
  const avatarBalance =
    group.balances[0] ??
    ({
      employee_name: group.employeeName,
      first_name: group.firstName,
      last_name: group.lastName,
      photo_url: group.photoUrl,
    } as AbsenceBalance);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <BalanceAvatar balance={avatarBalance} />

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {group.employeeName ?? "Collaborateur non renseigné"}
          </p>

          <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {group.employeeNumber ?? "Matricule non renseigné"}
          </p>

          <p className="mt-1 truncate text-[11px] text-slate-400">
            {group.departmentName ?? "Service non renseigné"}
            {" · "}
            {group.siteName ?? "Site non renseigné"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <BalanceMetricCell
          label="Congés payés"
          balance={getBalanceByCode(group, "CP")}
          accent="indigo"
        />

        <BalanceMetricCell
          label="RTT employé"
          balance={getBalanceByCode(group, "RTT_EMPLOYE")}
          accent="violet"
        />

        <BalanceMetricCell
          label="RTT employeur"
          balance={getBalanceByCode(group, "RTT_EMPLOYEUR")}
          accent="emerald"
        />
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Période 01/06/2026 — 31/05/2027
      </p>
    </article>
  );
}

function createBalanceGroups(balances: AbsenceBalance[]) {
  const groups = new Map<string, BalanceEmployeeGroup>();

  balances.forEach((balance) => {
    const key = balance.employee_id;

    if (!groups.has(key)) {
      groups.set(key, {
        employeeId: balance.employee_id,
        employeeName: balance.employee_name,
        employeeNumber: balance.employee_number,
        firstName: balance.first_name,
        lastName: balance.last_name,
        photoUrl: balance.photo_url,
        siteName: balance.site_name,
        departmentName: balance.department_name,
        balances: [],
      });
    }

    groups.get(key)?.balances.push(balance);
  });

  return Array.from(groups.values()).sort((first, second) =>
    (first.employeeName ?? "").localeCompare(second.employeeName ?? "", "fr"),
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

  const balanceGroups = createBalanceGroups(balances);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={WalletCards}
        title="Soldes d’absence"
        description="Vue consolidée par collaborateur : CP, RTT employé et RTT employeur, avec droits, consommé, en cours et solde restant."
        accent="amber"
        countText={`${balanceGroups.length} collaborateur${
          balanceGroups.length > 1
            ? "s"
            : ""
        }`}
        right={
          <ViewSwitch
            mode={displayMode}
            onChange={
              setDisplayMode
            }
          />
        }
      />

      {balanceGroups.length === 0 ? (
        <EmptyState
          title="Aucun solde enregistré"
          description="Les soldes apparaîtront après la configuration des compteurs CP, RTT employé et RTT employeur."
          icon={WalletCards}
        />
      ) : displayMode ===
        "cards" ? (
        <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
          {balanceGroups.map(
            (group) => (
              <BalanceGroupCard
                key={group.employeeId}
                group={group}
              />
            ),
          )}
        </div>
      ) : (
        <div className="max-h-[430px] overflow-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Collaborateur</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">CP droit</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">CP consommé</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">CP en cours</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">CP solde</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">RTT employé droit</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">RTT employé solde</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">RTT employeur droit</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">RTT employeur solde</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {balanceGroups.map((group) => {
                const cp = getBalanceByCode(group, "CP");
                const rttEmployee = getBalanceByCode(group, "RTT_EMPLOYE");
                const rttEmployer = getBalanceByCode(group, "RTT_EMPLOYEUR");
                const avatarBalance = group.balances[0];

                return (
                  <tr key={group.employeeId} className="transition hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                    <td className="px-4 py-3">
                      <div className="flex min-w-[230px] items-center gap-2.5">
                        {avatarBalance ? <BalanceAvatar balance={avatarBalance} /> : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">{group.employeeName ?? "Collaborateur non renseigné"}</p>
                          <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{group.employeeNumber ?? "Matricule non renseigné"}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">{group.departmentName ?? "Service non renseigné"} · {group.siteName ?? "Site non renseigné"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">{formatNumber(cp?.annual_entitlement ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-rose-600 dark:text-rose-300">{formatNumber(cp?.consumed_amount ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-amber-600 dark:text-amber-300">{formatNumber(cp?.pending_amount ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-indigo-700 dark:text-indigo-300">{formatNumber(getBalanceAvailable(cp))}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">{formatNumber(rttEmployee?.annual_entitlement ?? 0)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-violet-700 dark:text-violet-300">{formatNumber(getBalanceAvailable(rttEmployee))}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-slate-700 dark:text-slate-300">{formatNumber(rttEmployer?.annual_entitlement ?? 0)}</td>
                    <td className="px-4 py-3 text-right text-sm font-black text-emerald-700 dark:text-emerald-300">{formatNumber(getBalanceAvailable(rttEmployer))}</td>
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



function getRequestManagerName(request: HrAbsenceRequestRow) {
  const rawRequest = request as any;

  return (
    request.manager_name ??
    rawRequest.manager_full_name ??
    rawRequest.manager_employee_name ??
    rawRequest.manager_display_name ??
    rawRequest.n1_manager_name ??
    rawRequest.manager?.full_name ??
    ""
  );
}

function ValidationActionMenu({
  request,
  onEdit,
  onArchive,
  compact = false,
}: {
  request: HrAbsenceRequestRow;
  onEdit: (request: HrAbsenceRequestRow) => void;
  onArchive: (request: HrAbsenceRequestRow) => void;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function showDetails() {
    setIsOpen(false);
    window.alert(
      [
        `Collaborateur : ${request.employee_name ?? "—"}`,
        `Matricule : ${request.employee_number ?? "—"}`,
        `Manager : ${getRequestManagerName(request) || "—"}`,
        `Type : ${request.absence_type_name ?? "—"}`,
        `Période : ${formatDate(request.start_date)} → ${formatDate(request.end_date)}`,
        `Décompte : ${formatNumber(request.requested_amount)} ${getUnitLabel(
          request.absence_unit,
          toNumber(request.requested_amount),
        )}`,
        `Statut : ${getStatusLabel(request.status)}`,
        `Service : ${request.department_name ?? "—"}`,
        `Site : ${request.site_name ?? "—"}`,
      ].join("\n"),
    );
  }

  function editRequest() {
    setIsOpen(false);
    onEdit(request);
  }

  function archiveRequest() {
    setIsOpen(false);
    onArchive(request);
  }

  return (
    <div className="relative inline-flex justify-end">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Ouvrir le menu d’actions"
        className={`${
          compact ? "h-9 w-9" : "h-9 w-9"
        } inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={showDetails}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/30"
          >
            <Eye className="h-3.5 w-3.5" />
            Voir la demande
          </button>

          <button
            type="button"
            onClick={editRequest}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier la demande
          </button>

          <button
            type="button"
            onClick={archiveRequest}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Archive className="h-3.5 w-3.5" />
            Archiver la demande
          </button>
        </div>
      )}
    </div>
  );
}

function ApprovalQueueTable({
  requests,
  onManagerApprove,
  onHrApprove,
  onReject,
  onEdit,
  onArchive,
}: {
  requests: HrAbsenceRequestRow[];
  onManagerApprove: (request: HrAbsenceRequestRow) => void;
  onHrApprove: (request: HrAbsenceRequestRow) => void;
  onReject: (request: HrAbsenceRequestRow) => void;
  onEdit: (request: HrAbsenceRequestRow) => void;
  onArchive: (request: HrAbsenceRequestRow) => void;
}) {
  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full min-w-[1380px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Collaborateur</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Type</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Période</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Décompte</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Étape</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Manager</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Service / site</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Validation</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((request) => {
            const isManagerStep = request.status === "submitted";

            return (
              <tr
                key={request.id}
                className="border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/20"
              >
                <td className="px-4 py-3">
                  <p title={request.employee_name ?? "Collaborateur"} className="max-w-56 truncate text-sm font-black text-slate-950 dark:text-white">
                    {request.employee_name ?? "Collaborateur non renseigné"}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">{request.employee_number ?? "—"}</p>
                </td>

                <td className="px-4 py-3">
                  <p title={request.absence_type_name ?? "Type"} className="max-w-52 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {request.absence_type_name ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{request.absence_type_code ?? "—"}</p>
                </td>

                <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(request.start_date)} → {formatDate(request.end_date)}
                </td>

                <td className="px-4 py-3 text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {formatNumber(request.requested_amount)} {getUnitLabel(request.absence_unit, toNumber(request.requested_amount))}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                    isManagerStep
                      ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                  }`}>
                    {isManagerStep ? "Validation N+1" : "Approbation RH"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <p title={getRequestManagerName(request) || "Manager non renseigné"} className="max-w-52 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {getRequestManagerName(request) || "Manager non renseigné"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p title={[request.department_name, request.site_name].filter(Boolean).join(" · ")} className="max-w-60 truncate text-sm text-slate-600 dark:text-slate-400">
                    {request.department_name ?? "Service non renseigné"} · {request.site_name ?? "Site non renseigné"}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onReject(request)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300">
                      <X className="h-3.5 w-3.5" />
                      Refuser
                    </button>
                    {isManagerStep ? (
                      <button type="button" onClick={() => onManagerApprove(request)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-md shadow-violet-100 transition hover:bg-violet-700 dark:shadow-none">
                        <Send className="h-3.5 w-3.5" />
                        N+1
                      </button>
                    ) : (
                      <button type="button" onClick={() => onHrApprove(request)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700 dark:shadow-none">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        RH
                      </button>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <ValidationActionMenu
                      request={request}
                      onEdit={onEdit}
                      onArchive={onArchive}
                      compact
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalQueuePanel({
  requests,
  totalCount,
  onManagerApprove,
  onHrApprove,
  onReject,
  onEdit,
  onArchive,
}: {
  requests: HrAbsenceRequestRow[];
  totalCount: number;
  onManagerApprove: (request: HrAbsenceRequestRow) => void;
  onHrApprove: (request: HrAbsenceRequestRow) => void;
  onReject: (request: HrAbsenceRequestRow) => void;
  onEdit: (request: HrAbsenceRequestRow) => void;
  onArchive: (request: HrAbsenceRequestRow) => void;
}) {
  const [displayMode, setDisplayMode] =
    useState<DisplayMode>("cards");

  const managerRequests =
    requests.filter(
      (request) =>
        request.status === "submitted" &&
        !request.is_archived,
    );

  const hrRequests =
    requests.filter(
      (request) =>
        request.status === "manager_approved" &&
        !request.is_archived,
    );

  const visibleRequests = [
    ...managerRequests,
    ...hrRequests,
  ];

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={ShieldCheck}
        title="Circuit de validation"
        description="Vue manager / RH : validation N+1 obligatoire, approbation RH facultative après N+1, refus tracés et archivage contrôlé."
        accent="violet"
        countText={`${visibleRequests.length} validation${
          visibleRequests.length > 1 ? "s" : ""
        } à traiter sur ${totalCount} demande${
          totalCount > 1 ? "s" : ""
        }`}
        right={
          visibleRequests.length > 0 ? (
            <ViewSwitch
              mode={displayMode}
              onChange={setDisplayMode}
            />
          ) : null
        }
      />

      {visibleRequests.length === 0 ? (
        <EmptyState
          title="Aucune validation en attente"
          description="Les demandes soumises apparaissent en validation N+1. Après validation N+1, elles apparaissent en approbation RH facultative."
          icon={ShieldCheck}
        />
      ) : displayMode === "table" ? (
        <ApprovalQueueTable
          requests={visibleRequests}
          onManagerApprove={onManagerApprove}
          onHrApprove={onHrApprove}
          onReject={onReject}
          onEdit={onEdit}
          onArchive={onArchive}
        />
      ) : (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {visibleRequests.map((request) => {
            const isManagerStep =
              request.status === "submitted";

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      title={request.employee_name ?? "Collaborateur"}
                      className="truncate text-sm font-black text-slate-950 dark:text-white"
                    >
                      {request.employee_name ?? "Collaborateur non renseigné"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {request.employee_number ?? "Matricule non renseigné"}
                    </p>

                    <p
                      title={[
                        request.department_name,
                        request.site_name,
                        getRequestManagerName(request),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      className="mt-1 truncate text-[11px] text-slate-400"
                    >
                      {request.department_name ?? "Service non renseigné"}
                      {" · "}
                      {request.site_name ?? "Site non renseigné"}
                      {" · Manager : "}
                      {getRequestManagerName(request) || "non renseigné"}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-start gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                        isManagerStep
                          ? "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                      }`}
                    >
                      {isManagerStep ? "Validation N+1" : "Approbation RH"}
                    </span>

                    <ValidationActionMenu
                      request={request}
                      onEdit={onEdit}
                      onArchive={onArchive}
                      compact
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Type
                    </p>

                    <p
                      title={request.absence_type_name ?? "Type non renseigné"}
                      className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-slate-200"
                    >
                      {request.absence_type_name ?? "Type non renseigné"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Période
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {formatDate(request.start_date)} → {formatDate(request.end_date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Décompte
                    </p>

                    <p className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-300">
                      {formatNumber(request.requested_amount)}{" "}
                      {getUnitLabel(
                        request.absence_unit,
                        toNumber(request.requested_amount),
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Statut
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {getStatusLabel(request.status)}
                    </p>
                  </div>
                </div>

                {request.reason && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-300">
                      Motif
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
                      {request.reason}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onReject(request)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-950 dark:text-rose-300"
                  >
                    <X className="h-3.5 w-3.5" />
                    Refuser
                  </button>

                  {isManagerStep ? (
                    <button
                      type="button"
                      onClick={() => onManagerApprove(request)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-md shadow-violet-100 transition hover:-translate-y-0.5 hover:bg-violet-700 dark:shadow-none"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Valider N+1
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onHrApprove(request)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-md shadow-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-700 dark:shadow-none"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approuver RH
                    </button>
                  )}
                </div>

              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


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
            getRequestManagerName(request),
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

    const pendingManager =
      activeRequests.filter(
        (request) =>
          request.status ===
          "submitted",
      ).length;

    const pendingHr =
      activeRequests.filter(
        (request) =>
          request.status ===
          "manager_approved",
      ).length;

    const pending =
      pendingManager + pendingHr;

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
      pendingManager,
      pendingHr,
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
                getRequestManagerName(request),

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


  async function handleWorkflowAction(
    request: HrAbsenceRequestRow,
    action: "manager_approve" | "hr_approve" | "reject",
  ) {
    const actionLabels = {
      manager_approve: "valider par le manager",
      hr_approve: "approuver par les RH",
      reject: "refuser",
    };

    const comment =
      action === "reject"
        ? window.prompt(
            `Motif du refus pour ${request.employee_name ?? "ce collaborateur"} :`,
          )
        : window.prompt(
            `Commentaire optionnel pour ${actionLabels[action]} la demande de ${request.employee_name ?? "ce collaborateur"} :`,
          );

    if (action === "reject" && !comment?.trim()) {
      setActionError(
        "Un commentaire est obligatoire pour refuser une demande.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Confirmer l’action : ${actionLabels[action]} cette demande ?`,
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

      const functionName =
        action === "manager_approve"
          ? "approve_hr_absence_request_manager"
          : action === "hr_approve"
            ? "approve_hr_absence_request_hr"
            : "reject_hr_absence_request";

      const {
        error: workflowError,
      } = await (
        supabase as any
      ).rpc(
        functionName,
        {
          target_request_id:
            request.id,

          actor_user_id:
            userData.user?.id ?? null,

          actor_employee_id:
            null,

          action_comment:
            comment?.trim() || null,
        },
      );

      if (workflowError) {
        throw new Error(
          workflowError.message,
        );
      }

      await refreshData();
    } catch (actionException: unknown) {
      setActionError(
        actionException instanceof Error
          ? actionException.message
          : "L’action de validation n’a pas pu être exécutée.",
      );
    }
  }

  function handleManagerApproveRequest(
    request: HrAbsenceRequestRow,
  ) {
    void handleWorkflowAction(
      request,
      "manager_approve",
    );
  }

  function handleHrApproveRequest(
    request: HrAbsenceRequestRow,
  ) {
    void handleWorkflowAction(
      request,
      "hr_approve",
    );
  }

  function handleRejectRequest(
    request: HrAbsenceRequestRow,
  ) {
    void handleWorkflowAction(
      request,
      "reject",
    );
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
                  "approvals",
                )
              }
              className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                activeTab ===
                "approvals"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Validations
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
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
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
                  ? "bg-amber-600 text-white shadow-md shadow-amber-100 dark:shadow-none"
                  : "text-slate-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
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
          "approvals" && (
          <ApprovalQueuePanel
            requests={
              filteredRequests
            }
            totalCount={
              data.requests.length
            }
            onManagerApprove={
              handleManagerApproveRequest
            }
            onHrApprove={
              handleHrApproveRequest
            }
            onReject={
              handleRejectRequest
            }
            onEdit={openEditForm}
            onArchive={handleArchiveRequest}
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