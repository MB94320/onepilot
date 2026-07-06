"use client";

import {
  use,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgeEuro,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Expand,
  FileWarning,
  Grid2X2,
  HelpCircle,
  Layers3,
  List,
  Loader2,
  MapPin,
  Network,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  default_weekly_hours: number | null;
  default_daily_hours: number | null;
  default_annual_working_days: number | null;
  default_currency: string | null;
};

type ClientRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type ProjectRecord = {
  id: string;
  organization_id: string;
  client_id: string | null;
  code: string;
  name: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  project_manager_employee_id: string | null;
  billing_model: string;
  budget_amount: number | null;
  sold_amount: number | null;
  target_margin_rate: number | null;
};

type ProjectOverview = {
  organization_id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  project_status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  project_manager_employee_id: string | null;
  staffing_need_count: number;
  assignment_count: number;
  requested_hours: number;
  assigned_hours: number;
  remaining_to_staff_hours: number;
  staffing_coverage_rate: number;
};

type EmployeeOverview = {
  organization_id: string;
  employee_id: string;
  full_name: string;
  employee_number: string;
  employment_status: string;
  is_active: boolean;
  site_name: string | null;
  department_name: string | null;
  job_name: string | null;
  function_name: string | null;
  manager_name: string | null;
  assigned_hours: number;
  assigned_project_count: number;
  assignment_count: number;
  average_allocation_percent: number;
  loaded_hourly_cost: number;
  loaded_daily_cost: number;
};

type EmployeeContract = {
  id: string;
  organization_id: string;
  employee_id: string;
  status?: string | null;
  is_primary?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  weekly_hours?: number | null;
  weekly_working_hours?: number | null;
  weekly_contract_hours?: number | null;
  base_weekly_hours?: number | null;
  daily_working_hours?: number | null;
  activity_rate?: number | null;
  activity_rate_percent?: number | null;
};

type AbsenceOverview = {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name: string | null;
  status: string | null;
  approved_at: string | null;
  absence_type_code: string | null;
  absence_type_name: string | null;
  absence_category: string | null;
  absence_unit: string | null;
  reduces_capacity: boolean | null;
  start_date: string | null;
  end_date: string | null;
  start_period: string | null;
  end_period: string | null;
  working_days: number | null;
  holiday_days: number | null;
  non_working_days: number | null;
  requested_amount: number | null;
  manager_name?: string | null;
  department_name?: string | null;
  site_name?: string | null;
};

type StaffingAssignment = {
  id: string;
  project_id: string;
  employee_id: string;
  assignment_status: string;
  start_date: string;
  end_date: string;
  allocation_percent: number;
  planned_hours: number;
  planned_hourly_cost: number | null;
  planned_daily_cost: number | null;
  planned_daily_rate: number | null;
  billable: boolean;
  margin_rate: number | null;
};

type StaffingNeed = {
  id: string;
  project_id: string;
  code: string;
  title: string;
  staffing_status: string;
  priority: string;
  start_date: string;
  end_date: string;
  requested_hours: number;
  target_daily_rate: number | null;
  maximum_daily_cost: number | null;
  target_margin_rate: number | null;
};

type TimeEntry = {
  project_id: string;
  employee_id: string;
  entry_date: string;
  hours: number;
  status: string;
};

type SkillMatch = {
  organization_id: string;
  staffing_need_id: string;
  project_id: string;
  staffing_need_title: string;
  start_date: string;
  end_date: string;
  requested_hours: number;
  employee_id: string;
  full_name: string;
  employee_number: string;
  job_name: string | null;
  function_name: string | null;
  department_name: string | null;
  required_skill_count: number;
  matched_skill_count: number;
  skill_match_rate: number;
  loaded_daily_cost: number | null;
  loaded_hourly_cost: number | null;
};

type StaffingData = {
  organization: Organization;
  settings: HrSettings | null;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  projectOverview: ProjectOverview[];
  employeeOverview: EmployeeOverview[];
  contracts: EmployeeContract[];
  absences: AbsenceOverview[];
  assignments: StaffingAssignment[];
  needs: StaffingNeed[];
  timeEntries: TimeEntry[];
  skillMatches: SkillMatch[];
};

type StaffingTab =
  | "overview"
  | "employees"
  | "projects"
  | "skills"
  | "alerts";

type DirectoryView =
  | "cards"
  | "table";

type PeriodValue =
  | "4"
  | "8"
  | "12"
  | "26"
  | "52";

type WorkloadGranularity =
  | "day"
  | "week"
  | "month"
  | "year";

type WorkloadDisplayUnit =
  | "hours"
  | "fte";

type ScopeFilters = {
  search: string;
  clientId: string;
  projectId: string;
  employeeId: string;
  projectStatus: string;
  site: string;
  department: string;
  periodWeeks: PeriodValue;
  granularity: WorkloadGranularity;
};

type Accent =
  | "sky"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "violet";

type WorkloadPoint = {
  periodKey: string;
  label: string;
  subLabel: string;
  axisLabel: string;
  isCurrentPeriod: boolean;
  workingDays: number;
  grossCapacityHours: number;
  absenceHours: number;
  capacityHours: number;
  plannedHours: number;
  actualHours: number;
  workloadPeakHours: number;
  varianceHours: number;
  remainingCapacityHours: number;
  overloadHours: number;
  overloadRange: [number, number] | null;
  absenceBreakdown: string;
  plannedTaceRate: number;
  actualTaceRate: number;
  utilizationRate: number;
};

type ExportRow = {
  type: string;
  name: string;
  code: string;
  status: string;
  client: string;
  project: string;
  site: string;
  department: string;
  job: string;
  plannedHours: string;
  actualHours: string;
  remainingHours: string;
  capacityOrCoverage: string;
  loadedHourlyCost: string;
  loadedDailyCost: string;
  marginOrMatch: string;
};

const initialFilters: ScopeFilters = {
  search: "",
  clientId: "all",
  projectId: "all",
  employeeId: "all",
  projectStatus: "all",
  site: "all",
  department: "all",
  periodWeeks: "12",
  granularity: "week",
};

const selectClassName =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:focus:border-indigo-600 dark:focus:ring-indigo-950";

const eligibleEmployeeStatuses = new Set([
  "preboarding",
  "probation",
  "active",
  "notice_period",
]);

const excludedEmployeeStatuses = new Set([
  "draft",
  "suspended",
  "departed",
  "archived",
]);

const absenceStatusesUsedForCapacity = new Set([
  "submitted",
  "approved",
  "validated",
  "manager_approved",
  "hr_approved",
]);


const exportColumns: ExportColumn<ExportRow>[] = [
  {
    key: "type",
    label: "Type",
    value: (row) => row.type,
  },
  {
    key: "name",
    label: "Nom",
    value: (row) => row.name,
  },
  {
    key: "code",
    label: "Code / Matricule",
    value: (row) => row.code,
  },
  {
    key: "status",
    label: "Statut",
    value: (row) => row.status,
  },
  {
    key: "client",
    label: "Client",
    value: (row) => row.client,
  },
  {
    key: "project",
    label: "Projet",
    value: (row) => row.project,
  },
  {
    key: "site",
    label: "Site",
    value: (row) => row.site,
  },
  {
    key: "department",
    label: "Service",
    value: (row) => row.department,
  },
  {
    key: "job",
    label: "Métier / fonction",
    value: (row) => row.job,
  },
  {
    key: "plannedHours",
    label: "Charge prévisionnelle",
    value: (row) => row.plannedHours,
  },
  {
    key: "actualHours",
    label: "Réel validé",
    value: (row) => row.actualHours,
  },
  {
    key: "remainingHours",
    label: "Reste",
    value: (row) => row.remainingHours,
  },
  {
    key: "capacityOrCoverage",
    label: "Capacité / couverture",
    value: (row) => row.capacityOrCoverage,
  },
  {
    key: "loadedHourlyCost",
    label: "Coût horaire chargé",
    value: (row) => row.loadedHourlyCost,
  },
  {
    key: "loadedDailyCost",
    label: "Coût journalier chargé",
    value: (row) => row.loadedDailyCost,
  },
  {
    key: "marginOrMatch",
    label: "Marge / matching",
    value: (row) => row.marginOrMatch,
  },
];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value * 100)} %`;
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const diff = nextDate.getDate() - day + (day === 0 ? -6 : 1);

  nextDate.setDate(diff);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfMonth(date: Date) {
  const nextDate = new Date(date);
  nextDate.setDate(1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfYear(date: Date) {
  const nextDate = new Date(date);
  nextDate.setMonth(0, 1);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function addYears(date: Date, years: number) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + years);
  return nextDate;
}

function endOfMonth(date: Date) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + 1, 0);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfYear(date: Date) {
  const nextDate = new Date(date);
  nextDate.setMonth(11, 31);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getYearLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
  }).format(date);
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day);
  easter.setHours(0, 0, 0, 0);
  return easter;
}

function getFrenchPublicHolidayKeys(year: number) {
  const easter = getEasterDate(year);
  return new Set(
    [
      new Date(year, 0, 1),
      addDays(easter, 1),
      new Date(year, 4, 1),
      new Date(year, 4, 8),
      addDays(easter, 39),
      addDays(easter, 50),
      new Date(year, 6, 14),
      new Date(year, 7, 15),
      new Date(year, 10, 1),
      new Date(year, 10, 11),
      new Date(year, 11, 25),
    ].map((holiday) => holiday.toISOString().slice(0, 10)),
  );
}

function isFrenchPublicHoliday(date: Date) {
  return getFrenchPublicHolidayKeys(date.getFullYear()).has(
    date.toISOString().slice(0, 10),
  );
}

function isCapacityWorkingDay(date: Date) {
  return !isWeekend(date) && !isFrenchPublicHoliday(date);
}

function getCapacityWorkingDaysInRange(startDate: Date, endDate: Date) {
  let count = 0;
  let cursor = new Date(startDate);

  while (cursor.getTime() <= endDate.getTime()) {
    if (isCapacityWorkingDay(cursor)) {
      count += 1;
    }

    cursor = addDays(cursor, 1);
  }

  return count;
}

function isVisibleWorkday(date: Date) {
  return !isWeekend(date);
}

function getPeriodToken(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalized.includes("morning") ||
    normalized.includes("matin") ||
    normalized === "am" ||
    normalized === "first_half" ||
    normalized === "first-half"
  ) {
    return "morning";
  }

  if (
    normalized.includes("afternoon") ||
    normalized.includes("apres") ||
    normalized === "pm" ||
    normalized === "second_half" ||
    normalized === "second-half"
  ) {
    return "afternoon";
  }

  if (
    normalized.includes("full") ||
    normalized.includes("journee") ||
    normalized.includes("day") ||
    normalized === "all_day"
  ) {
    return "full";
  }

  return "full";
}

function getAbsenceDayFraction(absence: AbsenceOverview, date: Date) {
  if (!isCapacityWorkingDay(date)) {
    return 0;
  }

  if (!absence.start_date || !absence.end_date) {
    return 0;
  }

  const startDate = toDate(absence.start_date);
  const endDate = toDate(absence.end_date);
  const isStartDay = date.getTime() === startDate.getTime();
  const isEndDay = date.getTime() === endDate.getTime();
  const startPeriod = getPeriodToken(absence.start_period);
  const endPeriod = getPeriodToken(absence.end_period);

  if (isStartDay && isEndDay) {
    if (startPeriod === "morning" && endPeriod === "morning") {
      return 0.5;
    }

    if (startPeriod === "afternoon" && endPeriod === "afternoon") {
      return 0.5;
    }

    return 1;
  }

  if (isStartDay) {
    return startPeriod === "afternoon" ? 0.5 : 1;
  }

  if (isEndDay) {
    return endPeriod === "morning" ? 0.5 : 1;
  }

  return 1;
}

function getAbsenceTypeLabel(absence: AbsenceOverview) {
  const raw =
    absence.absence_type_name ||
    absence.absence_type_code ||
    absence.absence_category ||
    "Absence";

  return raw
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWeekdays(startDate: Date, endDate: Date) {
  return getCapacityWorkingDaysInRange(startDate, endDate);
}

function toDate(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekKey(date: Date) {
  const year = date.getFullYear();
  const firstDay = new Date(year, 0, 1);
  const pastDays = Math.floor(
    (date.getTime() - firstDay.getTime()) / 86400000,
  );
  const weekNumber = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);

  return `${year}-S${String(weekNumber).padStart(2, "0")}`;
}

function getWeekLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getWeekNumberLabel(date: Date) {
  return getWeekKey(date).split("-")[1] ?? "";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getYearKey(date: Date) {
  return String(date.getFullYear());
}

function getDayLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getOverlapDays(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  const start = Math.max(firstStart.getTime(), secondStart.getTime());
  const end = Math.min(firstEnd.getTime(), secondEnd.getTime());

  if (end < start) {
    return 0;
  }

  return Math.floor((end - start) / 86400000) + 1;
}

function getOverlapRange(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  const start = new Date(Math.max(firstStart.getTime(), secondStart.getTime()));
  const end = new Date(Math.min(firstEnd.getTime(), secondEnd.getTime()));

  if (end.getTime() < start.getTime()) {
    return null;
  }

  return { start, end };
}

function getUniqueValues(
  employees: EmployeeOverview[],
  field: "site_name" | "department_name",
) {
  return Array.from(
    new Set(
      employees
        .map((employee) => employee[field])
        .filter((value): value is string => Boolean(value?.trim())),
    ),
  ).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue, "fr", {
      sensitivity: "base",
    }),
  );
}

function getAccentClasses(accent: Accent) {
  const classes = {
    sky: {
      panel:
        "border-sky-100 from-sky-50/85 via-white to-cyan-50/65 dark:border-sky-900/50 dark:from-sky-950/30 dark:via-slate-950 dark:to-cyan-950/20",
      icon:
        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      value:
        "text-sky-700 dark:text-sky-300",
      badge:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    },
    indigo: {
      panel:
        "border-indigo-100 from-indigo-50/85 via-white to-violet-50/65 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20",
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      value:
        "text-indigo-700 dark:text-indigo-300",
      badge:
        "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",
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
    },
  };

  return classes[accent];
}

function getContractWeeklyHours(
  employeeId: string,
  contracts: EmployeeContract[],
  fallbackWeeklyHours: number,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contract = contracts
    .filter((item) => item.employee_id === employeeId)
    .filter((item) => {
      const startDate = item.start_date ? toDate(item.start_date) : null;
      const endDate = item.end_date ? toDate(item.end_date) : null;
      const startsBeforeToday = !startDate || startDate.getTime() <= today.getTime();
      const endsAfterToday = !endDate || endDate.getTime() >= today.getTime();
      const statusOk = !item.status || ["active", "signed", "current", "confirmed"].includes(item.status);
      return startsBeforeToday && endsAfterToday && statusOk;
    })
    .sort((first, second) => Number(Boolean(second.is_primary)) - Number(Boolean(first.is_primary)))[0];

  if (!contract) {
    return fallbackWeeklyHours;
  }

  const weeklyHours =
    contract.weekly_hours ??
    contract.weekly_working_hours ??
    contract.weekly_contract_hours ??
    contract.base_weekly_hours;

  if (typeof weeklyHours === "number" && Number.isFinite(weeklyHours) && weeklyHours > 0) {
    return weeklyHours;
  }

  if (typeof contract.daily_working_hours === "number" && contract.daily_working_hours > 0) {
    return contract.daily_working_hours * 5;
  }

  const activityRate = contract.activity_rate_percent ?? contract.activity_rate;

  if (typeof activityRate === "number" && Number.isFinite(activityRate) && activityRate > 0) {
    return fallbackWeeklyHours * (activityRate > 1 ? activityRate / 100 : activityRate);
  }

  return fallbackWeeklyHours;
}

function isEligibleEmployee(employee: EmployeeOverview) {
  if (!employee.is_active) {
    return false;
  }

  if (excludedEmployeeStatuses.has(employee.employment_status)) {
    return false;
  }

  return eligibleEmployeeStatuses.has(employee.employment_status);
}

function isTeleworkAbsence(absence: AbsenceOverview) {
  const text = [
    absence.absence_type_code,
    absence.absence_type_name,
    absence.absence_category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("teletravail") ||
    text.includes("télétravail") ||
    text.includes("remote") ||
    text.includes("home office")
  );
}

function shouldReduceCapacity(absence: AbsenceOverview) {
  if (!absence.employee_id || !absence.start_date || !absence.end_date) {
    return false;
  }

  if (!absenceStatusesUsedForCapacity.has(absence.status ?? "")) {
    return false;
  }

  if (isTeleworkAbsence(absence)) {
    return false;
  }

  return absence.reduces_capacity !== false;
}

function getPeriodDefinitions(
  granularity: WorkloadGranularity,
  periodWeeks: PeriodValue,
  offset: number,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (granularity === "day") {
    const centerDay = addDays(today, offset);
    const startWindow = addDays(centerDay, -7);
    const endWindow = addDays(centerDay, 7);
    const periods: Array<{
      key: string;
      start: Date;
      end: Date;
      label: string;
      subLabel: string;
      axisLabel: string;
      isCurrentPeriod: boolean;
    }> = [];
    let cursor = new Date(startWindow);

    while (cursor.getTime() <= endWindow.getTime()) {
      if (isVisibleWorkday(cursor)) {
        const weekdayLabel = new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
        }).format(cursor);
        const holiday = isFrenchPublicHoliday(cursor);
        periods.push({
          key: cursor.toISOString().slice(0, 10),
          start: new Date(cursor),
          end: new Date(cursor),
          label: getDayLabel(cursor),
          subLabel: holiday ? "Férié" : weekdayLabel,
          axisLabel: `${getDayLabel(cursor)}|${holiday ? "Férié" : weekdayLabel}`,
          isCurrentPeriod: cursor.getTime() === today.getTime(),
        });
      }
      cursor = addDays(cursor, 1);
    }

    return periods;
  }

  if (granularity === "month") {
    const currentMonth = addMonths(startOfMonth(today), offset);
    const firstMonth = addMonths(currentMonth, -3);

    return Array.from({ length: 7 }).map((_, index) => {
      const start = addMonths(firstMonth, index);
      const end = endOfMonth(start);
      return {
        key: getMonthKey(start),
        start,
        end,
        label: getMonthLabel(start),
        subLabel: "",
        axisLabel: getMonthLabel(start),
        isCurrentPeriod: start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth(),
      };
    });
  }

  if (granularity === "year") {
    const currentYear = addYears(startOfYear(today), offset);
    const firstYear = addYears(currentYear, -1);

    return Array.from({ length: 3 }).map((_, index) => {
      const start = addYears(firstYear, index);
      const end = endOfYear(start);
      return {
        key: getYearKey(start),
        start,
        end,
        label: getYearLabel(start),
        subLabel: "",
        axisLabel: getYearLabel(start),
        isCurrentPeriod: start.getFullYear() === today.getFullYear(),
      };
    });
  }

  const weekCount = Number(periodWeeks);
  const todayWeek = startOfWeek(today);
  const weeksBefore = Math.floor(weekCount / 2);
  const firstWeek = addDays(todayWeek, (offset - weeksBefore) * 7);

  return Array.from({ length: weekCount }).map((_, index) => {
    const start = addDays(firstWeek, index * 7);
    const end = addDays(start, 6);
    const label = getWeekLabel(start);
    const subLabel = getWeekNumberLabel(start);
    return {
      key: getWeekKey(start),
      start,
      end,
      label,
      subLabel,
      axisLabel: `${label}|${subLabel}`,
      isCurrentPeriod: start.getTime() === todayWeek.getTime(),
    };
  });
}

function getPlannedHoursForPeriod(
  assignments: StaffingAssignment[],
  periodStart: Date,
  periodEnd: Date,
) {
  return assignments.reduce((total, assignment) => {
    const assignmentStart = toDate(assignment.start_date);
    const assignmentEnd = toDate(assignment.end_date);
    const assignmentWorkingDays = Math.max(
      getCapacityWorkingDaysInRange(assignmentStart, assignmentEnd),
      1,
    );
    const overlap = getOverlapRange(periodStart, periodEnd, assignmentStart, assignmentEnd);

    if (!overlap) {
      return total;
    }

    const overlapWorkingDays = getCapacityWorkingDaysInRange(overlap.start, overlap.end);

    if (overlapWorkingDays <= 0) {
      return total;
    }

    return total + Number(assignment.planned_hours ?? 0) * (overlapWorkingDays / assignmentWorkingDays);
  }, 0);
}

function getActualHoursForPeriod(
  entries: TimeEntry[],
  periodStart: Date,
  periodEnd: Date,
) {
  return entries.reduce((total, entry) => {
    const entryDate = toDate(entry.entry_date);
    if (entryDate.getTime() < periodStart.getTime() || entryDate.getTime() > periodEnd.getTime()) {
      return total;
    }
    return total + Number(entry.hours ?? 0);
  }, 0);
}

function getGrossCapacityForPeriod({
  employees,
  weeklyHoursByEmployeeId,
  periodStart,
  periodEnd,
}: {
  employees: EmployeeOverview[];
  weeklyHoursByEmployeeId: Map<string, number>;
  periodStart: Date;
  periodEnd: Date;
}) {
  const workingDays = getCapacityWorkingDaysInRange(periodStart, periodEnd);
  return employees.reduce((total, employee) => {
    const weeklyHours = weeklyHoursByEmployeeId.get(employee.employee_id) ?? 35;
    return total + (weeklyHours / 5) * workingDays;
  }, 0);
}

function getAbsenceDetailsForPeriod({
  absences,
  periodStart,
  periodEnd,
  weeklyHoursByEmployeeId,
}: {
  absences: AbsenceOverview[];
  periodStart: Date;
  periodEnd: Date;
  weeklyHoursByEmployeeId: Map<string, number>;
}) {
  const breakdown = new Map<string, number>();
  let totalHours = 0;

  absences.forEach((absence) => {
    if (!shouldReduceCapacity(absence)) {
      return;
    }

    const overlap = getOverlapRange(
      periodStart,
      periodEnd,
      toDate(absence.start_date as string),
      toDate(absence.end_date as string),
    );

    if (!overlap) {
      return;
    }

    const weeklyHours = weeklyHoursByEmployeeId.get(absence.employee_id) ?? 35;
    const dailyHours = weeklyHours / 5;
    const label = getAbsenceTypeLabel(absence);
    let cursor = new Date(overlap.start);

    while (cursor.getTime() <= overlap.end.getTime()) {
      const fraction = getAbsenceDayFraction(absence, cursor);

      if (fraction > 0) {
        const hours = dailyHours * fraction;
        totalHours += hours;
        breakdown.set(label, (breakdown.get(label) ?? 0) + hours);
      }

      cursor = addDays(cursor, 1);
    }
  });

  const breakdownText = Array.from(breakdown.entries())
    .sort((first, second) => second[1] - first[1])
    .map(([label, hours]) => `${label} ${formatNumber(hours)} h`)
    .join(" · ");

  return {
    totalHours,
    breakdownText,
  };
}

function getFteDivisor(point: WorkloadPoint) {
  return Math.max(point.workingDays, 1) * 7;
}

function convertWorkloadValue(
  value: number,
  point: WorkloadPoint,
  displayUnit: WorkloadDisplayUnit,
) {
  return displayUnit === "hours" ? value : value / getFteDivisor(point);
}

function formatWorkloadValue(value: number, displayUnit: WorkloadDisplayUnit) {
  return displayUnit === "hours" ? `${formatNumber(value)} h` : `${formatNumber(value)} ETP`;
}

function buildFteTicks(
  data: Array<{
    capacityHours: number;
    plannedHours: number;
    actualHours: number;
    overloadRange: [number, number] | number[] | null;
  }>,
) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [
      point.capacityHours,
      point.plannedHours,
      point.actualHours,
      point.overloadRange?.[1] ?? 0,
    ]),
  );
  const step = maxValue <= 3 ? 0.5 : 1;
  const upperBound = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= upperBound + 0.0001; value += step) {
    ticks.push(Number(value.toFixed(1)));
  }

  return ticks;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
  formula,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  accent: Accent;
  formula?: string;
}) {
  const classes = getAccentClasses(accent);

  return (
    <article
      title={`${label} — ${description}${formula ? `\n${formula}` : ""}`}
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
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {label}
            </p>

            <p
              className={`shrink-0 whitespace-nowrap text-right text-lg font-black leading-none tracking-tight sm:text-xl xl:text-2xl ${classes.value}`}
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
  rightSlot?: ReactNode;
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
  filters,
  onChange,
  clients,
  projects,
  employees,
  resultCount,
  totalCount,
}: {
  filters: ScopeFilters;
  onChange: (filters: ScopeFilters) => void;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  employees: EmployeeOverview[];
  resultCount: number;
  totalCount: number;
}) {
  const sites = getUniqueValues(employees, "site_name");
  const departments = getUniqueValues(employees, "department_name");

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.clientId !== "all" ||
    filters.projectId !== "all" ||
    filters.employeeId !== "all" ||
    filters.projectStatus !== "all" ||
    filters.site !== "all" ||
    filters.department !== "all" ||
    filters.periodWeeks !== "12" ||
    filters.granularity !== "week";

  function updateFilter<K extends keyof ScopeFilters>(
    field: K,
    value: ScopeFilters[K],
  ) {
    onChange({
      ...filters,
      [field]: value,
    });
  }

  function resetFilters() {
    onChange(initialFilters);
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
                Les filtres pilotent les KPI, le plan de charge, les recommandations, les alertes et les exports.
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
            value={filters.search}
            onChange={(event) =>
              updateFilter("search", event.target.value)
            }
            placeholder="Rechercher un client, projet, ressource, métier, service, site, besoin ou compétence..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-600 dark:focus:bg-slate-950 dark:focus:ring-indigo-950"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={filters.clientId}
            onChange={(event) =>
              updateFilter("clientId", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les clients
            </option>

            {clients.map((client) => (
              <option
                key={client.id}
                value={client.id}
              >
                {client.name}
              </option>
            ))}
          </select>

          <select
            value={filters.projectId}
            onChange={(event) =>
              updateFilter("projectId", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les projets
            </option>

            {projects.map((project) => (
              <option
                key={project.id}
                value={project.id}
              >
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={filters.employeeId}
            onChange={(event) =>
              updateFilter("employeeId", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">
              Toutes les ressources
            </option>

            {employees.map((employee) => (
              <option
                key={employee.employee_id}
                value={employee.employee_id}
              >
                {employee.full_name}
              </option>
            ))}
          </select>

          <select
            value={filters.projectStatus}
            onChange={(event) =>
              updateFilter("projectStatus", event.target.value)
            }
            className={selectClassName}
          >
            <option value="all">
              Tous les statuts
            </option>
            <option value="draft">
              Brouillon
            </option>
            <option value="planned">
              Planifié
            </option>
            <option value="active">
              Actif
            </option>
            <option value="on_hold">
              Suspendu
            </option>
            <option value="completed">
              Terminé
            </option>
            <option value="archived">
              Archivé
            </option>
          </select>

          <select
            value={filters.site}
            onChange={(event) =>
              updateFilter("site", event.target.value)
            }
            className={selectClassName}
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
            value={filters.department}
            onChange={(event) =>
              updateFilter("department", event.target.value)
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
            value={filters.periodWeeks}
            onChange={(event) =>
              updateFilter("periodWeeks", event.target.value as PeriodValue)
            }
            className={selectClassName}
          >
            <option value="4">
              4 semaines
            </option>
            <option value="8">
              8 semaines
            </option>
            <option value="12">
              12 semaines
            </option>
            <option value="26">
              26 semaines
            </option>
            <option value="52">
              12 mois
            </option>
          </select>

          <select
            value={filters.granularity}
            onChange={(event) =>
              updateFilter(
                "granularity",
                event.target.value as WorkloadGranularity,
              )
            }
            className={selectClassName}
          >
            <option value="day">
              Vue jour
            </option>
            <option value="week">
              Vue semaine
            </option>
            <option value="month">
              Vue mois
            </option>
            <option value="year">
              Vue année
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

function WorkloadAxisTick({
  x,
  y,
  payload,
}: any) {
  const value = String(payload?.value ?? "");
  const [label, subLabel] = value.split("|");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="middle"
        className="fill-slate-500 text-[11px] font-semibold dark:fill-slate-400"
      >
        {label}
      </text>

      {subLabel && (
        <text
          x={0}
          y={0}
          dy={26}
          textAnchor="middle"
          className="fill-slate-400 text-[10px] font-bold dark:fill-slate-500"
        >
          {subLabel}
        </text>
      )}
    </g>
  );
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWorkloadSvg(data: WorkloadPoint[]) {
  const width = 1200;
  const height = 520;
  const left = 72;
  const right = 40;
  const top = 70;
  const bottom = 82;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) => [
      point.plannedHours,
      point.actualHours,
      point.capacityHours,
      point.workloadPeakHours,
    ]),
  );
  const groupWidth = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(10, Math.min(28, groupWidth / 4));

  const bars = data
    .map((point, index) => {
      const xCenter = left + groupWidth * index + groupWidth / 2;
      const plannedHeight = (point.plannedHours / maxValue) * chartHeight;
      const actualHeight = (point.actualHours / maxValue) * chartHeight;
      const capacityY = top + chartHeight - (point.capacityHours / maxValue) * chartHeight;
      const peakY = top + chartHeight - (point.workloadPeakHours / maxValue) * chartHeight;
      const overloadRect = point.overloadHours > 0
        ? `<rect x="${xCenter - groupWidth / 2 + 6}" y="${peakY}" width="${Math.max(groupWidth - 12, 4)}" height="${Math.max(capacityY - peakY, 0)}" rx="6" fill="#F43F5E" opacity="0.22" />`
        : "";

      return `
        ${overloadRect}
        <rect x="${xCenter - barWidth - 4}" y="${top + chartHeight - plannedHeight}" width="${barWidth}" height="${plannedHeight}" rx="5" fill="#6366F1" />
        <rect x="${xCenter + 4}" y="${top + chartHeight - actualHeight}" width="${barWidth}" height="${actualHeight}" rx="5" fill="#0EA5E9" />
        <circle cx="${xCenter}" cy="${capacityY}" r="4" fill="#10B981" />
        <text x="${xCenter}" y="${height - 50}" text-anchor="middle" font-size="10" font-family="Arial" fill="#475569">${escapeSvgText(point.label)}</text>
        ${point.subLabel ? `<text x="${xCenter}" y="${height - 34}" text-anchor="middle" font-size="9" font-family="Arial" font-weight="700" fill="#94A3B8">${escapeSvgText(point.subLabel)}</text>` : ""}
      `;
    })
    .join("");

  const linePoints = data
    .map((point, index) => {
      const xCenter = left + groupWidth * index + groupWidth / 2;
      const y = top + chartHeight - (point.capacityHours / maxValue) * chartHeight;
      return `${xCenter},${y}`;
    })
    .join(" ");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#FFFFFF" />
      <text x="${left}" y="34" font-size="22" font-family="Arial" font-weight="800" fill="#0F172A">Plan de charge</text>
      <text x="${left}" y="56" font-size="12" font-family="Arial" fill="#64748B">Prévisionnel, réel validé, capacité nette et surcharge.</text>
      <line x1="${left}" y1="${top + chartHeight}" x2="${width - right}" y2="${top + chartHeight}" stroke="#CBD5E1" />
      <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#CBD5E1" />
      ${bars}
      <polyline points="${linePoints}" fill="none" stroke="#10B981" stroke-width="4" />
    </svg>
  `.trim();
}

async function copyWorkloadSvg(data: WorkloadPoint[]) {
  const svg = buildWorkloadSvg(data);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/svg+xml": new Blob([svg], { type: "image/svg+xml" }),
          "text/plain": new Blob([svg], { type: "text/plain" }),
        }),
      ]);
      return;
    }
  } catch {
    // Fallback texte.
  }
  await navigator.clipboard.writeText(svg);
}

function WorkloadTooltip({
  active,
  payload,
  label,
  displayUnit,
}: any & { displayUnit: WorkloadDisplayUnit }) {
  if (!active || !payload?.length) {
    return null;
  }

  const sourcePoint = payload[0]?.payload as WorkloadPoint | undefined;
  const planned = payload.find((item: any) => item.dataKey === "plannedHours")?.value ?? 0;
  const actual = payload.find((item: any) => item.dataKey === "actualHours")?.value ?? 0;
  const capacity = payload.find((item: any) => item.dataKey === "capacityHours")?.value ?? 0;
  const overload = sourcePoint?.overloadRange
    ? convertWorkloadValue(sourcePoint.overloadHours, sourcePoint, displayUnit)
    : 0;
  const absence = sourcePoint
    ? convertWorkloadValue(sourcePoint.absenceHours, sourcePoint, displayUnit)
    : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <p className="font-black text-slate-950 dark:text-white">
        {String(label).replace("|", " · ")}
      </p>

      <div className="mt-2 space-y-1.5">
        <p className="text-indigo-700 dark:text-indigo-300">
          Charge prév. : {formatWorkloadValue(planned, displayUnit)}
        </p>

        <p className="text-sky-700 dark:text-sky-300">
          Charge réelle : {formatWorkloadValue(actual, displayUnit)}
        </p>

        <p className="text-emerald-700 dark:text-emerald-300">
          Capacité réelle : {formatWorkloadValue(capacity, displayUnit)}
        </p>

        <p className="text-rose-700 dark:text-rose-300">
          Surcharge : {formatWorkloadValue(overload, displayUnit)}
        </p>

        {sourcePoint && sourcePoint.absenceHours > 0 && (
          <p className="text-amber-700 dark:text-amber-300">
            Absences : {formatWorkloadValue(absence, displayUnit)}
            {sourcePoint.absenceBreakdown ? ` · ${sourcePoint.absenceBreakdown}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function WorkloadChartPanel({
  data,
  periodOffset,
  granularity,
  displayUnit,
  onDisplayUnitChange,
  onPreviousPeriod,
  onNextPeriod,
  onReset,
}: {
  data: WorkloadPoint[];
  periodOffset: number;
  granularity: WorkloadGranularity;
  displayUnit: WorkloadDisplayUnit;
  onDisplayUnitChange: (unit: WorkloadDisplayUnit) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onReset: () => void;
}) {
  const currentPoint = data.find((point) => point.isCurrentPeriod);

  const chartData = data.map((point) => ({
    ...point,
    grossCapacityHours: convertWorkloadValue(point.grossCapacityHours, point, displayUnit),
    absenceHours: convertWorkloadValue(point.absenceHours, point, displayUnit),
    capacityHours: convertWorkloadValue(point.capacityHours, point, displayUnit),
    plannedHours: convertWorkloadValue(point.plannedHours, point, displayUnit),
    actualHours: convertWorkloadValue(point.actualHours, point, displayUnit),
    workloadPeakHours: convertWorkloadValue(point.workloadPeakHours, point, displayUnit),
    overloadHours: convertWorkloadValue(point.overloadHours, point, displayUnit),
    overloadRange: point.overloadRange
      ? [
          convertWorkloadValue(point.overloadRange[0], point, displayUnit),
          convertWorkloadValue(point.overloadRange[1], point, displayUnit),
        ]
      : null,
  }));

  const periodLabel =
    granularity === "day"
      ? "jour"
      : granularity === "week"
        ? "semaine"
        : granularity === "month"
          ? "mois"
          : "année";

  return (
    <section
      id="staffing-workload-chart"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <PanelHeader
        icon={BarChart3}
        title="Plan de charge"
        description="Charge prévisionnelle lissée, réel validé, capacité brute, absences, capacité nette et surcharge en bande."
        accent="sky"
        rightSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => onDisplayUnitChange("hours")}
                className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-black transition ${
                  displayUnit === "hours"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                }`}
              >
                h
              </button>

              <button
                type="button"
                onClick={() => onDisplayUnitChange("fte")}
                className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-black transition ${
                  displayUnit === "fte"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                }`}
              >
                ETP
              </button>
            </div>

            <button
              type="button"
              onClick={() => void copyWorkloadSvg(data)}
              title="Copier le plan de charge en SVG"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300"
            >
              <Copy className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => document.getElementById("staffing-workload-chart")?.requestFullscreen?.()}
              title="Agrandir le plan de charge"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300"
            >
              <Expand className="h-4 w-4" />
            </button>

            <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm md:inline-flex dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
              <HelpCircle className="h-3.5 w-3.5" />
              Vue {periodLabel}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={onPreviousPeriod}
                title={`Reculer d’un(e) ${periodLabel}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onReset}
                title="Recentrer sur aujourd’hui"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  periodOffset === 0
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onNextPeriod}
                title={`Avancer d’un(e) ${periodLabel}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      <div className="h-[420px] p-5">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              bottom: 34,
              left: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="axisLabel"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={48}
              tick={<WorkloadAxisTick />}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              ticks={displayUnit === "fte" ? buildFteTicks(chartData) : undefined}
              tickFormatter={(value) =>
                displayUnit === "hours"
                  ? `${value} h`
                  : `${formatNumber(Number(value))} ETP`
              }
            />

            <Tooltip content={<WorkloadTooltip displayUnit={displayUnit} />} />
            <Legend />

            <Bar
              dataKey="plannedHours"
              name="Prévisionnel"
              fill="#6366F1"
              radius={[8, 8, 0, 0]}
            />

            <Bar
              dataKey="actualHours"
              name="Réel validé"
              fill="#0EA5E9"
              radius={[8, 8, 0, 0]}
            />

            <Line
              type="monotone"
              dataKey="capacityHours"
              name="Capacité nette"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 3 }}
            />

            <Area
              type="monotone"
              dataKey="overloadRange"
              name="Surcharge"
              fill="#F43F5E"
              fillOpacity={0.22}
              stroke="#F43F5E"
              strokeWidth={1.5}
              connectNulls={false}
            />

            {currentPoint && (
              <ReferenceLine
                x={currentPoint.axisLabel}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{
                  value:
                    granularity === "day"
                      ? "Aujourd’hui"
                      : granularity === "week"
                        ? "Semaine courante"
                        : granularity === "month"
                          ? "Mois courant"
                          : "Année courante",
                  position: "insideTop",
                  fill: "#B45309",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ProjectStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    draft:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    planned:
      "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    active:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    on_hold:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    completed:
      "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900",
    archived:
      "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
        styles[status] ??
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function EmployeeCards({
  employees,
}: {
  employees: EmployeeOverview[];
}) {
  if (employees.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <Search className="mx-auto h-8 w-8 text-indigo-400" />
        <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
          Aucune ressource trouvée
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Modifie ou réinitialise les filtres du périmètre d’analyse.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 p-5 xl:grid-cols-2 2xl:grid-cols-3">
      {employees.map((employee) => {
        const allocation = Number(employee.average_allocation_percent ?? 0);

        return (
          <article
            key={employee.employee_id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-slate-950 dark:text-white">
                  {employee.full_name}
                </p>
                <p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {employee.employee_number || "Matricule non renseigné"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                  allocation > 1
                    ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
                    : allocation > 0.85
                      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                }`}
              >
                {formatPercent(allocation)}
              </span>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <BriefcaseBusiness className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="truncate">
                  {employee.function_name || employee.job_name || "Fonction non renseignée"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <Network className="h-4 w-4 shrink-0 text-sky-500" />
                <span className="truncate">
                  {employee.department_name || "Service non renseigné"}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                <span className="truncate">
                  {employee.site_name || "Site non renseigné"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Charge
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formatNumber(employee.assigned_hours)} h
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Projets
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {employee.assigned_project_count}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Coût horaire chargé
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(employee.loaded_hourly_cost)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Coût journalier chargé
                </p>
                <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(employee.loaded_daily_cost)}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function EmployeeTable({
  employees,
}: {
  employees: EmployeeOverview[];
}) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full min-w-[1280px] border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Ressource
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Métier
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Service
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Site
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Projets
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Charge
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Allocation moyenne
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Coût horaire chargé
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Coût journalier chargé
            </th>
          </tr>
        </thead>

        <tbody>
          {employees.map((employee) => (
            <tr
              key={employee.employee_id}
              className="border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/20"
            >
              <td className="px-4 py-3">
                <p className="max-w-56 truncate text-sm font-black text-slate-950 dark:text-white">
                  {employee.full_name}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {employee.employee_number}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="max-w-44 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {employee.function_name || employee.job_name || "—"}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                  {employee.department_name ?? "—"}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="max-w-44 truncate text-sm text-slate-600 dark:text-slate-400">
                  {employee.site_name ?? "—"}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {employee.assigned_project_count}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatNumber(employee.assigned_hours)} h
                </p>
              </td>

              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                    employee.average_allocation_percent > 1
                      ? "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
                      : employee.average_allocation_percent > 0.85
                        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                  }`}
                >
                  {formatPercent(employee.average_allocation_percent)}
                </span>
              </td>

              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(employee.loaded_hourly_cost)}
                </p>
              </td>

              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(employee.loaded_daily_cost)}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {employees.length === 0 && (
        <div className="px-6 py-14 text-center">
          <Search className="mx-auto h-8 w-8 text-indigo-400" />
          <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
            Aucune ressource trouvée
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Modifie ou réinitialise les filtres du périmètre d’analyse.
          </p>
        </div>
      )}
    </div>
  );
}

function EmployeePanel({
  employees,
}: {
  employees: EmployeeOverview[];
}) {
  const [view, setView] =
    useState<DirectoryView>("cards");

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={Users}
        title="Ressources et capacité"
        description="Lecture RH / manager : charge affectée, site, service, fonction, coût chargé et risque de surcharge."
        accent="indigo"
        rightSlot={
          <ViewSwitch
            view={view}
            onChange={setView}
          />
        }
      />

      {view === "cards" ? (
        <EmployeeCards employees={employees} />
      ) : (
        <EmployeeTable employees={employees} />
      )}
    </section>
  );
}

function ProjectTable({
  projects,
}: {
  projects: ProjectOverview[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={BriefcaseBusiness}
        title="Projets et couverture staffing"
        description="Lecture directeur projet / DAF : besoin, affecté, reste à staffer et taux de couverture."
        accent="emerald"
      />

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[1120px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Projet
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Besoins
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Charge demandée
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Charge affectée
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Reste à staffer
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                Couverture
              </th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project) => (
              <tr
                key={project.project_id}
                className="border-b border-slate-100 transition last:border-0 hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-indigo-950/20"
              >
                <td className="px-4 py-3">
                  <p className="max-w-72 truncate text-sm font-black text-slate-950 dark:text-white">
                    {project.project_name}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {project.project_code}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.project_status} />
                </td>

                <td className="px-4 py-3">
                  <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {project.staffing_need_count}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {formatNumber(project.requested_hours)} h
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {formatNumber(project.assigned_hours)} h
                  </p>
                </td>

                <td className="px-4 py-3">
                  <p className="text-sm font-black text-rose-700 dark:text-rose-300">
                    {formatNumber(project.remaining_to_staff_hours)} h
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                      project.staffing_coverage_rate >= 1
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                        : project.staffing_coverage_rate >= 0.75
                          ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                          : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
                    }`}
                  >
                    {formatPercent(project.staffing_coverage_rate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="px-6 py-14 text-center">
            <Search className="mx-auto h-8 w-8 text-indigo-400" />
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
              Aucun projet trouvé
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Modifie ou réinitialise les filtres du périmètre d’analyse.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SkillMatchPanel({
  matches,
}: {
  matches: SkillMatch[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={Sparkles}
        title="Recommandations compétences / prix / charge"
        description="Proposition de profils selon matching compétences, disponibilité, coût chargé et besoin projet."
        accent="amber"
      />

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {matches.slice(0, 12).map((match) => (
          <article
            key={`${match.staffing_need_id}-${match.employee_id}`}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  {match.full_name}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {match.employee_number} · {match.function_name || match.job_name || "Fonction non renseignée"}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${
                  match.skill_match_rate >= 0.9
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900"
                    : match.skill_match_rate >= 0.6
                      ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                      : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900"
                }`}
              >
                {formatPercent(match.skill_match_rate)}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Besoin
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                {match.staffing_need_title}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Skills
                </p>
                <p className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-300">
                  {match.matched_skill_count}/{match.required_skill_count}
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Charge
                </p>
                <p className="mt-1 text-sm font-black text-violet-700 dark:text-violet-300">
                  {formatNumber(match.requested_hours)} h
                </p>
              </div>

              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Coût jour chargé
                </p>
                <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(match.loaded_daily_cost)}
                </p>
              </div>
            </div>
          </article>
        ))}

        {matches.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center lg:col-span-2 dark:border-slate-700">
            <Sparkles className="mx-auto h-8 w-8 text-indigo-400" />
            <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
              Aucune recommandation disponible
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajoute des besoins de staffing et des compétences validées pour activer les recommandations.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function AlertQualityPanel({
  utilizationRate,
  plannedTaceRate,
  actualTaceRate,
  remainingToStaffHours,
  overloadHours,
  varianceHours,
  absenceHours,
  eligibleEmployeeCount,
  totalEmployeeCount,
  skillMatches,
}: {
  utilizationRate: number;
  plannedTaceRate: number;
  actualTaceRate: number;
  remainingToStaffHours: number;
  overloadHours: number;
  varianceHours: number;
  absenceHours: number;
  eligibleEmployeeCount: number;
  totalEmployeeCount: number;
  skillMatches: SkillMatch[];
}) {
  const weakSkillMatches = skillMatches.filter(
    (match) => match.skill_match_rate < 0.6,
  );

  const excludedEmployeeCount = Math.max(totalEmployeeCount - eligibleEmployeeCount, 0);

  const alertCount =
    Number(overloadHours > 0) +
    Number(remainingToStaffHours > 0) +
    Number(Math.abs(varianceHours) > 0) +
    Number(absenceHours > 0) +
    Number(plannedTaceRate > 1 || actualTaceRate > 1) +
    Number(excludedEmployeeCount > 0) +
    weakSkillMatches.length;

  const widgets = [
    {
      id: "overload",
      title: "Surcharge capacité",
      value: `${formatNumber(overloadHours)} h`,
      description:
        overloadHours > 0
          ? "Pic de charge supérieur à la capacité nette. Arbitrage nécessaire : décaler, renforcer ou réduire le périmètre."
          : "Aucune surcharge détectée dans le périmètre.",
      icon: Zap,
      accent: overloadHours > 0 ? "rose" : "emerald",
    },
    {
      id: "remaining",
      title: "Reste à staffer",
      value: `${formatNumber(remainingToStaffHours)} h`,
      description:
        remainingToStaffHours > 0
          ? "Besoin projet non couvert : identifier les ressources éligibles, disponibles et compétentes."
          : "Besoins projet couverts dans le périmètre.",
      icon: Target,
      accent: remainingToStaffHours > 0 ? "amber" : "emerald",
    },
    {
      id: "tace-planned",
      title: "TACE prévisionnel",
      value: formatPercent(plannedTaceRate),
      description:
        "Charge prévisionnelle rapportée à la capacité nette après jours fériés et absences.",
      icon: TrendingUp,
      accent: plannedTaceRate > 1 ? "rose" : plannedTaceRate > 0.85 ? "amber" : "indigo",
    },
    {
      id: "tace-actual",
      title: "TACE réel",
      value: formatPercent(actualTaceRate),
      description:
        "Temps pointés et validés rapportés à la capacité nette réelle du périmètre.",
      icon: CheckCircle2,
      accent: actualTaceRate > 1 ? "rose" : actualTaceRate > 0.85 ? "amber" : "emerald",
    },
    {
      id: "absence",
      title: "Absences capacité",
      value: `${formatNumber(absenceHours)} h`,
      description:
        absenceHours > 0
          ? "Congés, RTT, formation, maladie ou autres absences réduisant la disponibilité projet."
          : "Aucune absence réduisant la capacité dans le périmètre.",
      icon: CalendarDays,
      accent: absenceHours > 0 ? "amber" : "emerald",
    },
    {
      id: "variance",
      title: "Écart prévu / réel",
      value: `${formatNumber(varianceHours)} h`,
      description:
        varianceHours !== 0
          ? "Écart entre charge planifiée et temps réellement validé : à rapprocher des pointages et du planning projet."
          : "Aucun écart prévu/réel significatif.",
      icon: BarChart3,
      accent: Math.abs(varianceHours) > 0 ? "indigo" : "emerald",
    },
    {
      id: "skills",
      title: "Matching compétences",
      value: weakSkillMatches.length,
      description:
        weakSkillMatches.length > 0
          ? "Des recommandations de staffing ont une adéquation compétences faible : vérifier le besoin ou le profil."
          : "Matching compétences cohérent sur les recommandations.",
      icon: Sparkles,
      accent: weakSkillMatches.length > 0 ? "amber" : "emerald",
    },
    {
      id: "excluded",
      title: "Ressources exclues",
      value: excludedEmployeeCount,
      description:
        "Collaborateurs brouillon, suspendus, sortis ou archivés exclus du calcul de capacité.",
      icon: Users,
      accent: excludedEmployeeCount > 0 ? "amber" : "emerald",
    },
  ] as const;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <PanelHeader
        icon={FileWarning}
        title="Alertes qualité"
        description="Synthèse, alertes et recommandations sur la capacité, la charge, les compétences et les arbitrages."
        accent="rose"
      />

      <div className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/60 p-4 dark:border-sky-900/50 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <ShieldCheck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  Synthèse
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Capacité utile : {eligibleEmployeeCount} ressource(s) éligible(s) sur {totalEmployeeCount}. Occupation prévue {formatPercent(utilizationRate)}, TACE réel {formatPercent(actualTaceRate)}, reste à staffer {formatNumber(remainingToStaffHours)} h.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/80 via-white to-pink-50/60 p-4 dark:border-rose-900/50 dark:from-rose-950/20 dark:via-slate-950 dark:to-pink-950/20">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <AlertCircle className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  Alertes
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {alertCount > 0
                    ? `${alertCount} point(s) à traiter : surcharge, TACE, absences, reste à staffer, compétences ou ressources exclues.`
                    : "Aucune alerte bloquante détectée dans le périmètre."}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/60 p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-slate-950 dark:to-teal-950/20">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  Recommandations
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Prioriser les pics rouges, valider les absences bloquantes, vérifier les profils compétents disponibles et documenter chaque arbitrage projet / RH.
                </p>
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {widgets.map((widget) => {
            const Icon = widget.icon;

            return (
              <MetricCard
                key={widget.id}
                label={widget.title}
                value={widget.value}
                description={widget.description}
                icon={Icon}
                accent={widget.accent}
              />
            );
          })}
        </div>
      </div>
    </section>
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

async function loadStaffingData(
  slugOrId: string,
): Promise<StaffingData> {
  const organization = await resolveOrganization(slugOrId);

  const [
    settingsResult,
    clientsResult,
    projectsResult,
    projectOverviewResult,
    employeeOverviewResult,
    contractsResult,
    absencesResult,
    assignmentsResult,
    needsResult,
    timeEntriesResult,
    skillMatchesResult,
  ] = await Promise.all([
    (
      supabase.from("hr_settings" as never) as any
    )
      .select(
        "default_weekly_hours, default_daily_hours, default_annual_working_days, default_currency",
      )
      .eq("organization_id", organization.id)
      .maybeSingle(),

    (
      supabase.from("project_clients" as never) as any
    )
      .select("id, code, name, status")
      .eq("organization_id", organization.id)
      .order("name"),

    (
      supabase.from("project_projects" as never) as any
    )
      .select(
        "id, organization_id, client_id, code, name, status, priority, start_date, end_date, project_manager_employee_id, billing_model, budget_amount, sold_amount, target_margin_rate",
      )
      .eq("organization_id", organization.id)
      .order("name"),

    (
      supabase.from("project_staffing_project_overview" as never) as any
    )
      .select("*")
      .eq("organization_id", organization.id)
      .order("project_name"),

    (
      supabase.from("project_staffing_employee_overview" as never) as any
    )
      .select("*")
      .eq("organization_id", organization.id)
      .order("full_name"),

    (
      supabase.from("hr_employee_contracts" as never) as any
    )
      .select("*")
      .eq("organization_id", organization.id),

    (
      supabase.from("hr_absence_request_overview" as never) as any
    )
      .select(
        "id, organization_id, employee_id, employee_name, status, approved_at, absence_type_code, absence_type_name, absence_category, absence_unit, reduces_capacity, start_date, end_date, start_period, end_period, working_days, holiday_days, non_working_days, requested_amount, manager_name, department_name, site_name",
      )
      .eq("organization_id", organization.id),

    (
      supabase.from("project_staffing_assignments" as never) as any
    )
      .select(
        "id, project_id, employee_id, assignment_status, start_date, end_date, allocation_percent, planned_hours, planned_hourly_cost, planned_daily_cost, planned_daily_rate, billable, margin_rate",
      )
      .eq("organization_id", organization.id),

    (
      supabase.from("project_staffing_needs" as never) as any
    )
      .select(
        "id, project_id, code, title, staffing_status, priority, start_date, end_date, requested_hours, target_daily_rate, maximum_daily_cost, target_margin_rate",
      )
      .eq("organization_id", organization.id),

    (
      supabase.from("project_time_entries" as never) as any
    )
      .select("project_id, employee_id, entry_date, hours, status")
      .eq("organization_id", organization.id)
      .in("status", ["manager_approved", "hr_approved"]),

    (
      supabase.from("project_staffing_skill_match_overview" as never) as any
    )
      .select("*")
      .eq("organization_id", organization.id)
      .order("skill_match_rate", {
        ascending: false,
      }),
  ]);

  const firstError = [
    settingsResult.error,
    clientsResult.error,
    projectsResult.error,
    projectOverviewResult.error,
    employeeOverviewResult.error,
    contractsResult.error,
    absencesResult.error,
    assignmentsResult.error,
    needsResult.error,
    timeEntriesResult.error,
    skillMatchesResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    organization,
    settings: (settingsResult.data ?? null) as HrSettings | null,
    clients: (clientsResult.data ?? []) as ClientRecord[],
    projects: (projectsResult.data ?? []) as ProjectRecord[],
    projectOverview: (projectOverviewResult.data ?? []) as ProjectOverview[],
    employeeOverview: (employeeOverviewResult.data ?? []) as EmployeeOverview[],
    contracts: (contractsResult.data ?? []) as EmployeeContract[],
    absences: (absencesResult.data ?? []) as AbsenceOverview[],
    assignments: (assignmentsResult.data ?? []) as StaffingAssignment[],
    needs: (needsResult.data ?? []) as StaffingNeed[],
    timeEntries: (timeEntriesResult.data ?? []) as TimeEntry[],
    skillMatches: (skillMatchesResult.data ?? []) as SkillMatch[],
  };
}

export default function StaffingCapacityPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);

  const [filters, setFilters] =
    useState<ScopeFilters>(initialFilters);

  const [activeTab, setActiveTab] =
    useState<StaffingTab>("overview");

  const [projectView, setProjectView] =
    useState<DirectoryView>("table");

  const [periodOffset, setPeriodOffset] =
    useState(0);

  const [displayUnit, setDisplayUnit] =
    useState<WorkloadDisplayUnit>("hours");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["staffing-capacity", orgId],
    queryFn: () => loadStaffingData(orgId),
    enabled: Boolean(orgId),
  });

  const fallbackWeeklyHours =
    data?.settings?.default_weekly_hours ?? 35;

  const weeklyHoursByEmployeeId = useMemo(() => {
    const map = new Map<string, number>();

    if (!data) {
      return map;
    }

    data.employeeOverview.forEach((employee) => {
      map.set(
        employee.employee_id,
        getContractWeeklyHours(
          employee.employee_id,
          data.contracts,
          fallbackWeeklyHours,
        ),
      );
    });

    return map;
  }, [data, fallbackWeeklyHours]);

  const filteredProjects = useMemo(() => {
    if (!data) {
      return [];
    }

    const search = filters.search.trim().toLowerCase();

    return data.projects.filter((project) => {
      const client =
        data.clients.find((item) => item.id === project.client_id) ?? null;

      const matchesClient =
        filters.clientId === "all" ||
        project.client_id === filters.clientId;

      const matchesProject =
        filters.projectId === "all" ||
        project.id === filters.projectId;

      const matchesStatus =
        filters.projectStatus === "all" ||
        project.status === filters.projectStatus;

      const matchesSearch =
        search.length === 0 ||
        [
          project.name,
          project.code,
          project.status,
          project.priority,
          client?.name,
          client?.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);

      return (
        matchesClient &&
        matchesProject &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [data, filters]);

  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects],
  );

  const filteredAssignments = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.assignments.filter((assignment) => {
      const matchesProject = filteredProjectIds.has(assignment.project_id);

      const matchesEmployee =
        filters.employeeId === "all" ||
        assignment.employee_id === filters.employeeId;

      return (
        matchesProject &&
        matchesEmployee &&
        ["planned", "confirmed", "active"].includes(
          assignment.assignment_status,
        )
      );
    });
  }, [data, filteredProjectIds, filters.employeeId]);

  const filteredEmployeeIds = useMemo(() => {
    if (filters.employeeId !== "all") {
      return new Set([filters.employeeId]);
    }

    return new Set(
      data?.employeeOverview
        .filter(isEligibleEmployee)
        .map((employee) => employee.employee_id) ?? [],
    );
  }, [data, filters.employeeId]);

  const filteredEmployees = useMemo(() => {
    if (!data) {
      return [];
    }

    const search = filters.search.trim().toLowerCase();

    return data.employeeOverview.filter((employee) => {
      const matchesEmployee =
        filters.employeeId === "all" ||
        employee.employee_id === filters.employeeId;

      const matchesEligibleEmployee =
        filteredEmployeeIds.has(employee.employee_id) && isEligibleEmployee(employee);

      const matchesSite =
        filters.site === "all" ||
        employee.site_name === filters.site;

      const matchesDepartment =
        filters.department === "all" ||
        employee.department_name === filters.department;

      const matchesSearch =
        search.length === 0 ||
        [
          employee.full_name,
          employee.employee_number,
          employee.site_name,
          employee.department_name,
          employee.job_name,
          employee.function_name,
          employee.manager_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);

      return (
        matchesEmployee &&
        matchesEligibleEmployee &&
        matchesSite &&
        matchesDepartment &&
        matchesSearch
      );
    });
  }, [data, filters, filteredEmployeeIds]);

  const filteredEmployeeIdSet = useMemo(
    () => new Set(filteredEmployees.map((employee) => employee.employee_id)),
    [filteredEmployees],
  );

  const filteredProjectOverview = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.projectOverview.filter((project) =>
      filteredProjectIds.has(project.project_id),
    );
  }, [data, filteredProjectIds]);

  const filteredSkillMatches = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.skillMatches.filter((match) => {
      const matchesProject =
        filteredProjectIds.has(match.project_id);

      const matchesEmployee =
        filters.employeeId === "all" ||
        match.employee_id === filters.employeeId;

      return matchesProject && matchesEmployee;
    });
  }, [data, filteredProjectIds, filters.employeeId]);

  const filteredTimeEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.timeEntries.filter((entry) => {
      const matchesProject =
        filteredProjectIds.has(entry.project_id);

      const matchesEmployee =
        filters.employeeId === "all"
          ? filteredEmployeeIdSet.has(entry.employee_id)
          : entry.employee_id === filters.employeeId;

      return matchesProject && matchesEmployee;
    });
  }, [
    data,
    filteredProjectIds,
    filteredEmployeeIdSet,
    filters.employeeId,
  ]);

  const filteredAbsences = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.absences.filter((absence) => {
      if (!absence.employee_id) {
        return false;
      }

      return filteredEmployeeIdSet.has(absence.employee_id);
    });
  }, [data, filteredEmployeeIdSet]);

  const workloadData = useMemo<WorkloadPoint[]>(() => {
    if (!data) {
      return [];
    }

    const periods = getPeriodDefinitions(
      filters.granularity,
      filters.periodWeeks,
      periodOffset,
    );

    return periods.map((period) => {
      const workingDays = getCapacityWorkingDaysInRange(
        period.start,
        period.end,
      );

      const grossCapacityHours = getGrossCapacityForPeriod({
        employees: filteredEmployees,
        weeklyHoursByEmployeeId,
        periodStart: period.start,
        periodEnd: period.end,
      });

      const absenceDetails = getAbsenceDetailsForPeriod({
        absences: filteredAbsences,
        periodStart: period.start,
        periodEnd: period.end,
        weeklyHoursByEmployeeId,
      });
      const absenceHours = absenceDetails.totalHours;

      const capacityHours = Math.max(grossCapacityHours - absenceHours, 0);

      const plannedHours = getPlannedHoursForPeriod(
        filteredAssignments,
        period.start,
        period.end,
      );

      const actualHours = getActualHoursForPeriod(
        filteredTimeEntries,
        period.start,
        period.end,
      );

      const workloadPeakHours = Math.max(plannedHours, actualHours);
      const overloadHours = Math.max(workloadPeakHours - capacityHours, 0);
      const overloadRange =
        overloadHours > 0
          ? ([capacityHours, workloadPeakHours] as [number, number])
          : null;
      const remainingCapacityHours = Math.max(capacityHours - workloadPeakHours, 0);
      const utilizationRate = capacityHours > 0 ? plannedHours / capacityHours : 0;
      const plannedTaceRate = capacityHours > 0 ? plannedHours / capacityHours : 0;
      const actualTaceRate = capacityHours > 0 ? actualHours / capacityHours : 0;

      return {
        periodKey: period.key,
        label: period.label,
        subLabel: period.subLabel,
        axisLabel: period.axisLabel,
        isCurrentPeriod: period.isCurrentPeriod,
        workingDays,
        grossCapacityHours: Math.round(grossCapacityHours * 10) / 10,
        absenceHours: Math.round(absenceHours * 10) / 10,
        capacityHours: Math.round(capacityHours * 10) / 10,
        plannedHours: Math.round(plannedHours * 10) / 10,
        actualHours: Math.round(actualHours * 10) / 10,
        workloadPeakHours: Math.round(workloadPeakHours * 10) / 10,
        varianceHours: Math.round((plannedHours - actualHours) * 10) / 10,
        remainingCapacityHours: Math.round(remainingCapacityHours * 10) / 10,
        overloadHours: Math.round(overloadHours * 10) / 10,
        overloadRange,
        absenceBreakdown: absenceDetails.breakdownText,
        plannedTaceRate,
        actualTaceRate,
        utilizationRate,
      };
    });
  }, [
    data,
    filters.granularity,
    filters.periodWeeks,
    periodOffset,
    filteredAssignments,
    filteredEmployees,
    filteredAbsences,
    filteredTimeEntries,
    weeklyHoursByEmployeeId,
  ]);

  const totals = useMemo(() => {
    const capacityHours = workloadData.reduce(
      (total, point) => total + point.capacityHours,
      0,
    );

    const absenceHours = workloadData.reduce(
      (total, point) => total + point.absenceHours,
      0,
    );

    const plannedHours = workloadData.reduce(
      (total, point) => total + point.plannedHours,
      0,
    );

    const actualHours = workloadData.reduce(
      (total, point) => total + point.actualHours,
      0,
    );

    const overloadHours = workloadData.reduce(
      (total, point) => total + point.overloadHours,
      0,
    );

    const requestedHours = filteredProjectOverview.reduce(
      (total, project) => total + Number(project.requested_hours ?? 0),
      0,
    );

    const assignedHours = filteredProjectOverview.reduce(
      (total, project) => total + Number(project.assigned_hours ?? 0),
      0,
    );

    const remainingToStaffHours = filteredProjectOverview.reduce(
      (total, project) =>
        total + Number(project.remaining_to_staff_hours ?? 0),
      0,
    );

    const staffingCoverageRate =
      requestedHours > 0 ? assignedHours / requestedHours : 0;

    const utilizationRate =
      capacityHours > 0 ? plannedHours / capacityHours : 0;

    const plannedTaceRate =
      capacityHours > 0 ? plannedHours / capacityHours : 0;

    const actualTaceRate =
      capacityHours > 0 ? actualHours / capacityHours : 0;

    return {
      capacityHours,
      absenceHours,
      plannedHours,
      actualHours,
      varianceHours: plannedHours - actualHours,
      overloadHours,
      requestedHours,
      assignedHours,
      remainingToStaffHours,
      staffingCoverageRate,
      utilizationRate,
      plannedTaceRate,
      actualTaceRate,
    };
  }, [workloadData, filteredProjectOverview]);

  const exportRows = useMemo<ExportRow[]>(() => {
    if (!data) {
      return [];
    }

    const projectRows = filteredProjectOverview.map((project) => {
      const rawProject =
        data.projects.find((item) => item.id === project.project_id) ?? null;

      const client =
        data.clients.find((item) => item.id === rawProject?.client_id) ?? null;

      return {
        type: "Projet",
        name: project.project_name,
        code: project.project_code,
        status: project.project_status,
        client: client?.name ?? "—",
        project: project.project_name,
        site: "—",
        department: "—",
        job: "—",
        plannedHours: `${formatNumber(project.assigned_hours)} h`,
        actualHours: "—",
        remainingHours: `${formatNumber(project.remaining_to_staff_hours)} h`,
        capacityOrCoverage: formatPercent(project.staffing_coverage_rate),
        loadedHourlyCost: "—",
        loadedDailyCost: "—",
        marginOrMatch: "—",
      };
    });

    const employeeRows = filteredEmployees.map((employee) => ({
      type: "Ressource",
      name: employee.full_name,
      code: employee.employee_number,
      status: employee.employment_status,
      client: "—",
      project: `${employee.assigned_project_count} projet(s)`,
      site: employee.site_name ?? "—",
      department: employee.department_name ?? "—",
      job: employee.function_name || employee.job_name || "—",
      plannedHours: `${formatNumber(employee.assigned_hours)} h`,
      actualHours: "—",
      remainingHours: "—",
      capacityOrCoverage: formatPercent(employee.average_allocation_percent),
      loadedHourlyCost: formatCurrency(employee.loaded_hourly_cost),
      loadedDailyCost: formatCurrency(employee.loaded_daily_cost),
      marginOrMatch: "—",
    }));

    const skillRows = filteredSkillMatches.map((match) => ({
      type: "Recommandation",
      name: match.full_name,
      code: match.employee_number,
      status: "matching",
      client: "—",
      project: match.staffing_need_title,
      site: "—",
      department: match.department_name ?? "—",
      job: match.function_name || match.job_name || "—",
      plannedHours: `${formatNumber(match.requested_hours)} h`,
      actualHours: "—",
      remainingHours: "—",
      capacityOrCoverage: `${match.matched_skill_count}/${match.required_skill_count}`,
      loadedHourlyCost: formatCurrency(match.loaded_hourly_cost),
      loadedDailyCost: formatCurrency(match.loaded_daily_cost),
      marginOrMatch: formatPercent(match.skill_match_rate),
    }));

    return [...projectRows, ...employeeRows, ...skillRows];
  }, [
    data,
    filteredProjectOverview,
    filteredEmployees,
    filteredSkillMatches,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staffing & capacité"
          subtitle="Chargement du plan de charge, des ressources, des projets et des recommandations."
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

        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
              Chargement du staffing...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Staffing & capacité"
          subtitle="Plan de charge, capacité, compétences et arbitrages."
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staffing & capacité"
        subtitle={`Plan de charge, disponibilité, compétences, coûts, prix et arbitrages de ${data.organization.name}.`}
        flush
        actions={
          <DataExportMenu
            data={exportRows}
            columns={exportColumns}
            fileName={`staffing_capacite_${data.organization.slug}`}
            sheetName="Staffing capacité"
          />
        }
      />

      <PageTutorial
        title="Piloter la capacité, la charge et les arbitrages"
        description="Cette page relie les ressources RH, les projets, les besoins de staffing, les compétences, les coûts et la performance. Elle sert à décider qui affecter, quand, sur quel projet et avec quel impact marge / capacité."
        objectives={[
          "Visualiser le plan de charge par semaine avec charge prévisionnelle, réel validé et capacité disponible.",
          "Identifier les surcharges, sous-charges, besoins non staffés et arbitrages prioritaires.",
          "Comparer les ressources selon site, service, métier, disponibilité, compétences et coût chargé.",
          "Donner au directeur projet, RH, commercial et DAF une vision commune avant décision.",
          "Conserver les écarts prévu/réel pour argumenter les décalages clients et les pics de charge subis.",
        ]}
        steps={[
          {
            title: "Définir le périmètre",
            description:
              "Filtre par client, projet, ressource, statut, site, service et horizon de charge.",
          },
          {
            title: "Analyser le plan de charge",
            description:
              "Les barres indigo représentent le prévisionnel, les barres bleues le réel validé, et la courbe verte la capacité.",
          },
          {
            title: "Naviguer dans le temps",
            description:
              "Les flèches déplacent la fenêtre d’analyse d’une semaine ; le bouton central recentre sur aujourd’hui.",
          },
          {
            title: "Lire les tableaux",
            description:
              "L’onglet Collaborateurs donne la lecture RH/manager ; l’onglet Projets donne la lecture directeur projet/DAF.",
          },
          {
            title: "Exploiter les recommandations",
            description:
              "L’onglet Compétences combine matching compétences, besoin projet et coût chargé.",
          },
        ]}
        analyses={[
          {
            title: "Plan de charge",
            description:
              "Charge prévisionnelle et réel validé comparés à la capacité théorique du périmètre.",
          },
          {
            title: "Couverture staffing",
            description:
              "Heures affectées divisées par heures demandées sur les besoins projet.",
          },
          {
            title: "Écart prévu / réel",
            description:
              "Différence entre ce qui était planifié et les temps réellement validés.",
          },
          {
            title: "Matching compétences",
            description:
              "Comparaison entre compétences requises par le besoin et compétences validées du collaborateur.",
          },
        ]}
        recommendations={[
          "Arbitrer en priorité les projets critiques avec reste à staffer élevé.",
          "Surveiller les ressources au-dessus de 100 % d’allocation moyenne.",
          "Utiliser les sous-charges pour renforcer les projets actifs avant de recruter.",
          "Croiser compétence, disponibilité et coût chargé avant d’affecter un profil.",
          "Conserver les justifications de staffing pour les audits ISO 9001 et la traçabilité des décisions.",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Capacité"
          value={`${formatNumber(totals.capacityHours)} h`}
          description="Capacité théorique du périmètre sur l’horizon sélectionné."
          icon={UsersRound}
          accent="indigo"
          formula="Nombre de ressources actives du périmètre × heures hebdomadaires par défaut × nombre de semaines."
        />

        <MetricCard
          label="Charge prév."
          value={`${formatNumber(totals.plannedHours)} h`}
          description="Charge projet prévisionnelle issue des affectations."
          icon={BarChart3}
          accent="emerald"
          formula="Somme des heures planifiées des affectations, réparties sur les semaines de chevauchement."
        />

        <MetricCard
          label="Réel validé"
          value={`${formatNumber(totals.actualHours)} h`}
          description="Temps réellement validé par les managers ou RH."
          icon={CheckCircle2}
          accent="amber"
          formula="Somme des temps projet au statut validé manager ou RH."
        />

        <MetricCard
          label="Reste à staffer"
          value={`${formatNumber(totals.remainingToStaffHours)} h`}
          description="Besoin projet non encore couvert par des affectations."
          icon={Target}
          accent="rose"
          formula="Heures demandées par les besoins projet - heures affectées."
        />
      </section>

      <ScopePanel
        filters={filters}
        onChange={setFilters}
        clients={data.clients}
        projects={data.projects}
        employees={data.employeeOverview}
        resultCount={filteredProjectOverview.length + filteredEmployees.length}
        totalCount={data.projectOverview.length + data.employeeOverview.length}
      />

      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <TabButton
            label="Vue d’ensemble"
            icon={Layers3}
            isActive={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            activeClassName="bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
            hoverClassName="hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          />

          <TabButton
            label="Collaborateurs"
            icon={Users}
            isActive={activeTab === "employees"}
            onClick={() => setActiveTab("employees")}
            activeClassName="bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
            hoverClassName="text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
          />

          <TabButton
            label="Projets"
            icon={BriefcaseBusiness}
            isActive={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
            activeClassName="bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
            hoverClassName="hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
          />

          <TabButton
            label="Compétences"
            icon={Sparkles}
            isActive={activeTab === "skills"}
            onClick={() => setActiveTab("skills")}
            activeClassName="bg-amber-600 text-white shadow-md shadow-amber-100 dark:shadow-none"
            hoverClassName="hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
          />

          <TabButton
            label="Alertes"
            icon={FileWarning}
            isActive={activeTab === "alerts"}
            onClick={() => setActiveTab("alerts")}
            activeClassName="bg-rose-600 text-white shadow-md shadow-rose-100 dark:shadow-none"
            hoverClassName="hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
          />
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <WorkloadChartPanel
            data={workloadData}
            periodOffset={periodOffset}
            granularity={filters.granularity}
            displayUnit={displayUnit}
            onDisplayUnitChange={setDisplayUnit}
            onPreviousPeriod={() => setPeriodOffset((current) => current - 1)}
            onNextPeriod={() => setPeriodOffset((current) => current + 1)}
            onReset={() => setPeriodOffset(0)}
          />

          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Couverture"
              value={formatPercent(totals.staffingCoverageRate)}
              description="Niveau de couverture des besoins projet."
              icon={CheckCircle2}
              accent="sky"
              formula="Heures affectées / heures demandées."
            />

            <MetricCard
              label="Occupation"
              value={formatPercent(totals.utilizationRate)}
              description="Taux d’utilisation global du périmètre sélectionné."
              icon={TrendingUp}
              accent="indigo"
              formula="Charge prévisionnelle / capacité théorique."
            />

            <MetricCard
              label="Surcharge"
              value={`${formatNumber(totals.overloadHours)} h`}
              description="Charge au-dessus de la capacité disponible."
              icon={Zap}
              accent={totals.overloadHours > 0 ? "rose" : "emerald"}
              formula="Somme hebdomadaire de max(charge prévisionnelle - capacité, 0)."
            />

            <MetricCard
              label="Écart prév./réel"
              value={`${formatNumber(totals.varianceHours)} h`}
              description="Différence entre charge prévisionnelle et réel validé."
              icon={BarChart3}
              accent="amber"
              formula="Charge prévisionnelle - temps réels validés."
            />
          </section>
        </div>
      )}

      {activeTab === "employees" && (
        <EmployeePanel employees={filteredEmployees} />
      )}

      {activeTab === "projects" && (
        <div className="space-y-5">
          <section className="flex justify-end">
            <ViewSwitch
              view={projectView}
              onChange={setProjectView}
            />
          </section>

          {projectView === "table" ? (
            <ProjectTable projects={filteredProjectOverview} />
          ) : (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjectOverview.map((project) => (
                <article
                  key={project.project_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {project.project_name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {project.project_code}
                      </p>
                    </div>

                    <ProjectStatusBadge status={project.project_status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Demandé
                      </p>
                      <p className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-300">
                        {formatNumber(project.requested_hours)} h
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Affecté
                      </p>
                      <p className="mt-1 text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {formatNumber(project.assigned_hours)} h
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Reste
                      </p>
                      <p className="mt-1 text-sm font-black text-rose-700 dark:text-rose-300">
                        {formatNumber(project.remaining_to_staff_hours)} h
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Couverture
                      </p>
                      <p className="mt-1 text-sm font-black text-violet-700 dark:text-violet-300">
                        {formatPercent(project.staffing_coverage_rate)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      )}

      {activeTab === "skills" && (
        <SkillMatchPanel matches={filteredSkillMatches} />
      )}

      {activeTab === "alerts" && (
        <AlertQualityPanel
          utilizationRate={totals.utilizationRate}
          plannedTaceRate={totals.plannedTaceRate}
          actualTaceRate={totals.actualTaceRate}
          remainingToStaffHours={totals.remainingToStaffHours}
          overloadHours={totals.overloadHours}
          varianceHours={totals.varianceHours}
          absenceHours={totals.absenceHours}
          eligibleEmployeeCount={filteredEmployees.length}
          totalEmployeeCount={data.employeeOverview.length}
          skillMatches={filteredSkillMatches}
        />
      )}
    </div>
  );
}