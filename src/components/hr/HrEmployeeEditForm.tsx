"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardList,
  ContactRound,
  FileText,
  Home,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import HrCompensationFields, {
  type EmployerChargeProfile,
  type HrCompensationValue,
} from "@/components/hr/HrCompensationFields";
import HrWeeklyWorkPatternFields, {
  calculateWeeklyWorkPatternSummary,
  createDefaultWeeklyWorkPattern,
  createEmptyWeeklyWorkPattern,
  type WeeklyWorkPatternSummary,
  type WeeklyWorkPatternValue,
  type WorkDayKey,
} from "@/components/hr/HrWeeklyWorkPatternFields";
import {
  searchFrenchCitiesByPostalCode,
  type FranceAddressSuggestion,
} from "@/lib/geo/franceAddress";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type HrEmployeeEditFormProps = {
  employeeId: string | null;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
};

type FormTab =
  | "identity"
  | "contract"
  | "preview";

type ReferenceItem = {
  id: string;
  code: string;
  name: string;
};

type ContractType = ReferenceItem & {
  employment_category: string;
  employment_status: string;
  default_probation_months: number | null;
  default_notice_months: number | null;
};

type WorkSchedule = ReferenceItem & {
  schedule_type: string;
  weekly_hours: number | null;
  annual_working_days: number | null;
  monday_hours?: number | null;
  tuesday_hours?: number | null;
  wednesday_hours?: number | null;
  thursday_hours?: number | null;
  friday_hours?: number | null;
  saturday_hours?: number | null;
  sunday_hours?: number | null;
};

type EmployeeReference = {
  id: string;
  full_name: string;
  employee_number: string;
};

type ReferenceData = {
  sites: ReferenceItem[];
  departments: ReferenceItem[];
  jobs: ReferenceItem[];
  functions: ReferenceItem[];
  managers: EmployeeReference[];
  contractTypes: ContractType[];
  workSchedules: WorkSchedule[];
  chargeProfiles: EmployerChargeProfile[];
};

type EmployeeRecord = Record<string, any> & {
  id: string;
  organization_id: string;
};

type ContractRecord = Record<string, any> & {
  id: string;
  employee_id: string;
  organization_id: string;
};

type FormData = {
  title: string;
  firstName: string;
  lastName: string;
  preferredName: string;

  birthDate: string;
  birthCity: string;
  birthCountryCode: string;

  professionalEmail: string;
  personalEmail: string;
  professionalPhone: string;
  personalPhone: string;

  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  region: string;
  countryCode: string;

  siteId: string;
  departmentId: string;
  jobId: string;
  functionId: string;
  managerId: string;

  arrivalDate: string;
  experienceYears: string;
  employmentStatus: string;
  comments: string;

  contractTypeId: string;
  workScheduleId: string;
  contractStartDate: string;
  contractEndDate: string;
  contractEmploymentStatus: string;
  workingTimeType: string;
  activityRatePercent: string;

  probationStartDate: string;
  probationEndDate: string;
  probationDurationMonths: string;
  probationRenewable: boolean;
  noticeDurationMonths: string;

  contractStatus: string;
  contractComments: string;

  weeklyPattern: WeeklyWorkPatternValue;
  compensation: HrCompensationValue;

  leaveAcquisitionStartMonth: string;
  paidLeaveAnnualEntitlement: string;
  rttAnnualEntitlement: string;
  leaveProrataOnArrival: boolean;
  leaveProrataOnDeparture: boolean;
  leaveCarryoverAllowed: boolean;
  maximumLeaveCarryover: string;
};

const initialCompensation: HrCompensationValue = {
  compensationMode: "salary",
  employerChargeProfileId: "",
  employerChargeRatePercent: "42",
  annualGrossSalary: "",
  externalDailyRate: "",
  externalHourlyRate: "",
  externalOverheadRatePercent: "0",
  dailyWorkingHours: "7",
  weeklyHours: "35",
  annualWorkingDays: "218",
};

type CompensationModeValue =
  HrCompensationValue["compensationMode"];

function normalizeCompensationMode(
  value: unknown,
): CompensationModeValue {
  if (
    value === "salary" ||
    value === "daily_rate" ||
    value === "hourly_rate"
  ) {
    return value;
  }

  return "salary";
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const selectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const textareaClassName =
  "min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

function createInitialFormData(): FormData {
  return {
    title: "",
    firstName: "",
    lastName: "",
    preferredName: "",

    birthDate: "",
    birthCity: "",
    birthCountryCode: "FR",

    professionalEmail: "",
    personalEmail: "",
    professionalPhone: "",
    personalPhone: "",

    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    region: "",
    countryCode: "FR",

    siteId: "",
    departmentId: "",
    jobId: "",
    functionId: "",
    managerId: "",

    arrivalDate: "",
    experienceYears: "",
    employmentStatus: "active",
    comments: "",

    contractTypeId: "",
    workScheduleId: "",
    contractStartDate: "",
    contractEndDate: "",
    contractEmploymentStatus: "non_cadre",
    workingTimeType: "full_time",
    activityRatePercent: "100",

    probationStartDate: "",
    probationEndDate: "",
    probationDurationMonths: "",
    probationRenewable: false,
    noticeDurationMonths: "",

    contractStatus: "active",
    contractComments: "",

    weeklyPattern: createDefaultWeeklyWorkPattern(),

    compensation: {
      ...initialCompensation,
    },

    leaveAcquisitionStartMonth: "6",
    paidLeaveAnnualEntitlement: "25",
    rttAnnualEntitlement: "10",
    leaveProrataOnArrival: true,
    leaveProrataOnDeparture: true,
    leaveCarryoverAllowed: true,
    maximumLeaveCarryover: "",
  };
}

function emptyToNull(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : null;
}

function numberOrNull(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  if (normalizedValue.length === 0) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function toInputString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function toInputDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  return value.slice(0, 10);
}

function toPercentString(value: unknown, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  if (value <= 1) {
    return String(Math.round(value * 10000) / 100);
  }

  return String(value);
}

function toRateString(value: unknown, fallback: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  if (value <= 1) {
    return String(Math.round(value * 10000) / 100);
  }

  return String(value);
}

function cleanChargeProfiles(
  profiles: EmployerChargeProfile[],
) {
  const seen = new Set<string>();

  return profiles.filter((profile) => {
    const normalizedName = profile.name
      .trim()
      .toLowerCase();

    const normalizedCode = profile.code
      .trim()
      .toLowerCase();

    if (
      normalizedName === "saisie manuelle" ||
      normalizedCode === "manual" ||
      normalizedCode === "saisie_manuelle"
    ) {
      return false;
    }

    if (seen.has(profile.id)) {
      return false;
    }

    seen.add(profile.id);

    return true;
  });
}

function getWorkScheduleDayHours(
  workSchedule: WorkSchedule,
  day: WorkDayKey,
) {
  const fieldByDay: Record<WorkDayKey, keyof WorkSchedule> = {
    monday: "monday_hours",
    tuesday: "tuesday_hours",
    wednesday: "wednesday_hours",
    thursday: "thursday_hours",
    friday: "friday_hours",
    saturday: "saturday_hours",
    sunday: "sunday_hours",
  };

  const rawValue = workSchedule[fieldByDay[day]];

  return typeof rawValue === "number"
    ? rawValue
    : null;
}

function buildWeeklyPatternFromWorkSchedule(
  workSchedule: WorkSchedule,
  currentPattern: WeeklyWorkPatternValue,
): WeeklyWorkPatternValue {
  const days: WorkDayKey[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const hasExplicitDailyHours = days.some(
    (day) =>
      getWorkScheduleDayHours(workSchedule, day) !== null,
  );

  if (!hasExplicitDailyHours) {
    if (workSchedule.weekly_hours === 35) {
      return createDefaultWeeklyWorkPattern();
    }

    return currentPattern;
  }

  const nextDays = days.reduce(
    (accumulator, day) => {
      const totalHours =
        getWorkScheduleDayHours(workSchedule, day) ?? 0;

      const morningHours =
        totalHours > 0
          ? totalHours / 2
          : 0;

      const afternoonHours =
        totalHours > 0
          ? totalHours / 2
          : 0;

      accumulator[day] = {
        morningHours: String(morningHours),
        afternoonHours: String(afternoonHours),
      };

      return accumulator;
    },
    {} as WeeklyWorkPatternValue["days"],
  );

  return {
    days: nextDays,
  };
}

function buildWeeklyPatternFromContract(
  contract: ContractRecord | null,
): WeeklyWorkPatternValue {
  const rawPattern =
    contract?.weekly_pattern ??
    contract?.weekly_work_pattern ??
    null;

  if (
    rawPattern &&
    typeof rawPattern === "object" &&
    "days" in rawPattern
  ) {
    return rawPattern as WeeklyWorkPatternValue;
  }

  return createDefaultWeeklyWorkPattern();
}

function keepExistingColumnsOnly(
  record: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const finalPayload: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (key in record) {
      finalPayload[key] = value;
    }
  });

  if ("updated_at" in record) {
    finalPayload.updated_at = new Date().toISOString();
  }

  return finalPayload;
}

async function loadReferenceData(
  organizationId: string,
  employeeId: string,
): Promise<ReferenceData> {
  const [
    sitesResult,
    departmentsResult,
    jobsResult,
    functionsResult,
    managersResult,
    contractTypesResult,
    workSchedulesResult,
    chargeProfilesResult,
  ] = await Promise.all([
    (supabase.from("hr_sites" as never) as any)
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from("hr_departments" as never) as any)
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from("hr_jobs" as never) as any)
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from("hr_functions" as never) as any)
      .select("id, code, name")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from("hr_employee_overview" as never) as any)
      .select("id, full_name, employee_number")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .neq("id", employeeId)
      .order("full_name"),

    (supabase.from("hr_contract_types" as never) as any)
      .select(
        `
          id,
          code,
          name,
          employment_category,
          employment_status,
          default_probation_months,
          default_notice_months
        `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("display_order"),

    (supabase.from("hr_work_schedules" as never) as any)
      .select(
        `
          id,
          code,
          name,
          schedule_type,
          weekly_hours,
          annual_working_days,
          monday_hours,
          tuesday_hours,
          wednesday_hours,
          thursday_hours,
          friday_hours,
          saturday_hours,
          sunday_hours
        `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from("hr_employer_charge_profiles" as never) as any)
      .select(
        `
          id,
          code,
          name,
          charge_rate,
          is_default
        `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const firstError = [
    sitesResult.error,
    departmentsResult.error,
    jobsResult.error,
    functionsResult.error,
    managersResult.error,
    contractTypesResult.error,
    workSchedulesResult.error,
    chargeProfilesResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    sites: (sitesResult.data ?? []) as ReferenceItem[],
    departments: (departmentsResult.data ?? []) as ReferenceItem[],
    jobs: (jobsResult.data ?? []) as ReferenceItem[],
    functions: (functionsResult.data ?? []) as ReferenceItem[],
    managers: (managersResult.data ?? []) as EmployeeReference[],
    contractTypes: (contractTypesResult.data ?? []) as ContractType[],
    workSchedules: (workSchedulesResult.data ?? []) as WorkSchedule[],
    chargeProfiles: cleanChargeProfiles(
      (chargeProfilesResult.data ?? []) as EmployerChargeProfile[],
    ),
  };
}

async function loadEmployeeData(
  organizationId: string,
  employeeId: string,
) {
  const [employeeResult, contractResult] = await Promise.all([
    (supabase.from("hr_employees" as never) as any)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", employeeId)
      .single(),

    (supabase.from("hr_employee_contracts" as never) as any)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .order("is_primary", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  if (employeeResult.error) {
    throw new Error(employeeResult.error.message);
  }

  if (contractResult.error) {
    throw new Error(contractResult.error.message);
  }

  if (!employeeResult.data) {
    throw new Error("La fiche collaborateur est introuvable.");
  }

  return {
    employee: employeeResult.data as EmployeeRecord,
    contract: (contractResult.data ?? null) as ContractRecord | null,
  };
}

function buildFormDataFromRecords(
  employee: EmployeeRecord,
  contract: ContractRecord | null,
): FormData {
  const weeklyPattern = buildWeeklyPatternFromContract(contract);
  const weeklyPatternSummary =
    calculateWeeklyWorkPatternSummary(weeklyPattern);

  return {
    title: toInputString(employee.title),
    firstName: toInputString(employee.first_name),
    lastName: toInputString(employee.last_name),
    preferredName: toInputString(employee.preferred_name),

    birthDate: toInputDate(employee.birth_date),
    birthCity: toInputString(employee.birth_city),
    birthCountryCode:
      toInputString(employee.birth_country_code) || "FR",

    professionalEmail: toInputString(employee.professional_email),
    personalEmail: toInputString(employee.personal_email),
    professionalPhone: toInputString(employee.professional_phone),
    personalPhone: toInputString(employee.personal_phone),

    addressLine1:
      toInputString(employee.address_line_1) ||
      toInputString(employee.address_line1),
    addressLine2:
      toInputString(employee.address_line_2) ||
      toInputString(employee.address_line2),
    postalCode: toInputString(employee.postal_code),
    city: toInputString(employee.city),
    region: toInputString(employee.region),
    countryCode: toInputString(employee.country_code) || "FR",

    siteId: toInputString(employee.site_id),
    departmentId: toInputString(employee.department_id),
    jobId: toInputString(employee.job_id),
    functionId: toInputString(employee.function_id),
    managerId: toInputString(employee.manager_employee_id),

    arrivalDate: toInputDate(employee.arrival_date),
    experienceYears: toInputString(employee.experience_years),
    employmentStatus: toInputString(employee.employment_status) || "active",
    comments:
      toInputString(employee.comments) ||
      toInputString(employee.notes) ||
      toInputString(employee.internal_notes),

    contractTypeId: toInputString(contract?.contract_type_id),
    workScheduleId: toInputString(contract?.work_schedule_id),
    contractStartDate: toInputDate(contract?.start_date),
    contractEndDate: toInputDate(contract?.end_date),
    contractEmploymentStatus:
      toInputString(contract?.employment_status) ||
      toInputString(contract?.contract_employment_status) ||
      "non_cadre",
    workingTimeType:
      toInputString(contract?.working_time_type) ||
      toInputString(contract?.work_time_type) ||
      "full_time",
    activityRatePercent: toPercentString(contract?.activity_rate, "100"),

    probationStartDate: toInputDate(contract?.probation_start_date),
    probationEndDate: toInputDate(contract?.probation_end_date),
    probationDurationMonths: toInputString(contract?.probation_duration_months),
    probationRenewable: Boolean(contract?.probation_renewable),
    noticeDurationMonths: toInputString(contract?.notice_duration_months),

    contractStatus:
      toInputString(contract?.status) ||
      toInputString(contract?.contract_status) ||
      "active",
    contractComments:
      toInputString(contract?.comments) ||
      toInputString(contract?.contract_comments),

    weeklyPattern,

    compensation: {
      compensationMode: normalizeCompensationMode(
        contract?.compensation_mode,
      ),
      employerChargeProfileId: toInputString(
        contract?.employer_charge_profile_id,
      ),
      employerChargeRatePercent: toRateString(
        contract?.employer_charge_rate,
        "42",
      ),
      annualGrossSalary: toInputString(contract?.annual_gross_salary),
      externalDailyRate: toInputString(contract?.external_daily_rate),
      externalHourlyRate: toInputString(contract?.external_hourly_rate),
      externalOverheadRatePercent: toRateString(
        contract?.external_overhead_rate,
        "0",
      ),
      dailyWorkingHours:
        toInputString(contract?.daily_working_hours) ||
        String(weeklyPatternSummary.averageDailyHours || 7),
      weeklyHours:
        toInputString(contract?.weekly_hours) ||
        String(weeklyPatternSummary.weeklyHours || 35),
      annualWorkingDays: toInputString(contract?.annual_working_days) || "218",
    },

    leaveAcquisitionStartMonth:
      toInputString(contract?.leave_acquisition_start_month) || "6",
    paidLeaveAnnualEntitlement:
      toInputString(contract?.paid_leave_annual_entitlement) || "25",
    rttAnnualEntitlement:
      toInputString(contract?.rtt_annual_entitlement) || "10",
    leaveProrataOnArrival:
      contract?.leave_prorata_on_arrival !== false,
    leaveProrataOnDeparture:
      contract?.leave_prorata_on_departure !== false,
    leaveCarryoverAllowed:
      contract?.leave_carryover_allowed !== false,
    maximumLeaveCarryover:
      toInputString(contract?.maximum_leave_carryover),
  };
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
      {children}

      {required && (
        <span className="ml-1 text-rose-500">
          *
        </span>
      )}
    </label>
  );
}

function Field({
  label,
  required = false,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel required={required}>
        {label}
      </FieldLabel>

      {children}

      {description && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
  accent = "indigo",
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  children: ReactNode;
  accent?:
    | "indigo"
    | "violet"
    | "emerald"
    | "amber"
    | "cyan";
}) {
  const iconClasses = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    cyan:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
        <div
          className={`rounded-xl p-2.5 ${iconClasses[accent]}`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function FormTabs({
  activeTab,
  onChange,
}: {
  activeTab: FormTab;
  onChange: (tab: FormTab) => void;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => onChange("identity")}
            className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
              activeTab === "identity"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
            }`}
          >
            <ContactRound className="h-3.5 w-3.5" />
            Identité
          </button>

          <button
            type="button"
            onClick={() => onChange("contract")}
            className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
              activeTab === "contract"
                ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
            }`}
          >
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Contrat & temps
          </button>

          <button
            type="button"
            onClick={() => onChange("preview")}
            className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
              activeTab === "preview"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            }`}
          >
            <BadgeEuro className="h-3.5 w-3.5" />
            Aperçu
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  accent = "indigo",
}: {
  label: string;
  value: string;
  description: string;
  accent?:
    | "indigo"
    | "emerald"
    | "amber"
    | "violet"
    | "cyan";
}) {
  const styles = {
    indigo:
      "border-indigo-100 bg-indigo-50/60 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300",
    emerald:
      "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300",
    amber:
      "border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300",
    violet:
      "border-violet-100 bg-violet-50/60 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300",
    cyan:
      "border-cyan-100 bg-cyan-50/60 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300",
  };

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${styles[accent]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide opacity-80">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 opacity-80">
        {description}
      </p>
    </article>
  );
}

export default function HrEmployeeEditForm({
  employeeId,
  organizationId,
  isOpen,
  onClose,
  onUpdated,
}: HrEmployeeEditFormProps) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<FormTab>("identity");

  const [
    formData,
    setFormData,
  ] = useState<FormData>(() => createInitialFormData());

  const [
    references,
    setReferences,
  ] = useState<ReferenceData | null>(null);

  const [
    loadedEmployee,
    setLoadedEmployee,
  ] = useState<EmployeeRecord | null>(null);

  const [
    loadedContract,
    setLoadedContract,
  ] = useState<ContractRecord | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    addressSuggestions,
    setAddressSuggestions,
  ] = useState<FranceAddressSuggestion[]>([]);

  const [
    isAddressLoading,
    setIsAddressLoading,
  ] = useState(false);

  const selectedContractType = useMemo(
    () =>
      references?.contractTypes.find(
        (item) =>
          item.id === formData.contractTypeId,
      ) ?? null,
    [references, formData.contractTypeId],
  );

  const selectedWorkSchedule = useMemo(
    () =>
      references?.workSchedules.find(
        (item) =>
          item.id === formData.workScheduleId,
      ) ?? null,
    [references, formData.workScheduleId],
  );

  const weeklyPatternSummary = useMemo(
    () =>
      calculateWeeklyWorkPatternSummary(
        formData.weeklyPattern,
      ),
    [formData.weeklyPattern],
  );

  async function loadData() {
    if (!employeeId || !organizationId) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const [
        referenceData,
        employeeData,
      ] = await Promise.all([
        loadReferenceData(
          organizationId,
          employeeId,
        ),
        loadEmployeeData(
          organizationId,
          employeeId,
        ),
      ]);

      setReferences(referenceData);
      setLoadedEmployee(employeeData.employee);
      setLoadedContract(employeeData.contract);
      setFormData(
        buildFormDataFromRecords(
          employeeData.employee,
          employeeData.contract,
        ),
      );
      setAddressSuggestions([]);
      setActiveTab("identity");
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Impossible de charger la fiche collaborateur.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && employeeId) {
      void loadData();
    }
  }, [isOpen, employeeId, organizationId]);

  useEffect(() => {
    if (!selectedContractType || !loadedEmployee) {
      return;
    }

    setFormData((currentValue) => {
      let compensationMode: CompensationModeValue =
        currentValue.compensation.compensationMode;

      if (
        [
          "freelance",
          "subcontractor",
        ].includes(
          selectedContractType.employment_category,
        )
      ) {
        compensationMode = "daily_rate";
      } else if (
        [
          "employee",
          "intern",
          "apprentice",
        ].includes(
          selectedContractType.employment_category,
        )
      ) {
        compensationMode = "salary";
      }

      return {
        ...currentValue,

        contractEmploymentStatus:
          selectedContractType.employment_status ||
          currentValue.contractEmploymentStatus,

        probationDurationMonths:
          selectedContractType.default_probation_months !== null
            ? String(
                selectedContractType.default_probation_months,
              )
            : currentValue.probationDurationMonths,

        noticeDurationMonths:
          selectedContractType.default_notice_months !== null
            ? String(
                selectedContractType.default_notice_months,
              )
            : currentValue.noticeDurationMonths,

        compensation: {
          ...currentValue.compensation,
          compensationMode,
        },
      };
    });
  }, [selectedContractType?.id]);

  useEffect(() => {
    if (!selectedWorkSchedule) {
      return;
    }

    setFormData((currentValue) => {
      const nextWeeklyPattern =
        buildWeeklyPatternFromWorkSchedule(
          selectedWorkSchedule,
          currentValue.weeklyPattern,
        );

      const summary =
        calculateWeeklyWorkPatternSummary(
          nextWeeklyPattern,
        );

      const nextWeeklyHours =
        summary.weeklyHours > 0
          ? summary.weeklyHours
          : selectedWorkSchedule.weekly_hours;

      const nextDailyHours =
        summary.averageDailyHours > 0
          ? summary.averageDailyHours
          : Number(
              currentValue.compensation.dailyWorkingHours || 7,
            );

      const referenceWeeklyHours =
        selectedWorkSchedule.weekly_hours &&
        selectedWorkSchedule.weekly_hours > 0
          ? selectedWorkSchedule.weekly_hours
          : 35;

      const inferredActivityRate =
        nextWeeklyHours !== null &&
        nextWeeklyHours > 0
          ? Math.min(
              100,
              Math.round(
                (nextWeeklyHours / referenceWeeklyHours) * 100,
              ),
            )
          : Number(currentValue.activityRatePercent);

      return {
        ...currentValue,
        weeklyPattern: nextWeeklyPattern,
        workingTimeType:
          selectedWorkSchedule.schedule_type === "annual_days"
            ? "annual_days"
            : selectedWorkSchedule.schedule_type === "part_time"
              ? "part_time"
              : "full_time",
        activityRatePercent:
          String(inferredActivityRate),
        compensation: {
          ...currentValue.compensation,
          weeklyHours:
            nextWeeklyHours !== null
              ? String(nextWeeklyHours)
              : currentValue.compensation.weeklyHours,
          annualWorkingDays:
            selectedWorkSchedule.annual_working_days !== null
              ? String(
                  selectedWorkSchedule.annual_working_days,
                )
              : currentValue.compensation.annualWorkingDays,
          dailyWorkingHours:
            String(nextDailyHours),
        },
      };
    });
  }, [selectedWorkSchedule?.id]);

  useEffect(() => {
    const postalCode =
      formData.postalCode.trim();

    if (
      formData.countryCode !== "FR" ||
      !/^\d{5}$/.test(postalCode)
    ) {
      setAddressSuggestions([]);
      return;
    }

    let isCancelled = false;

    async function loadCities() {
      setIsAddressLoading(true);

      try {
        const suggestions =
          await searchFrenchCitiesByPostalCode(postalCode);

        if (isCancelled) {
          return;
        }

        setAddressSuggestions(suggestions);

        if (
          suggestions.length === 1 &&
          formData.city.trim().length === 0
        ) {
          const suggestion =
            suggestions[0];

          setFormData((currentValue) => ({
            ...currentValue,
            city: suggestion.city,
            region: suggestion.region,
            countryCode: suggestion.countryCode,
          }));
        }
      } finally {
        if (!isCancelled) {
          setIsAddressLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      isCancelled = true;
    };
  }, [
    formData.postalCode,
    formData.countryCode,
  ]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        isOpen &&
        !isSaving
      ) {
        handleClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen, isSaving]);

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function applyAddressSuggestion(
    suggestion: FranceAddressSuggestion,
  ) {
    setFormData((currentValue) => ({
      ...currentValue,
      postalCode: suggestion.postalCode,
      city: suggestion.city,
      region: suggestion.region,
      countryCode: suggestion.countryCode,
    }));
  }

  function handleWorkingTimeTypeChange(
    value: string,
  ) {
    const nextPattern =
      value === "part_time"
        ? createEmptyWeeklyWorkPattern()
        : createDefaultWeeklyWorkPattern();

    const summary =
      calculateWeeklyWorkPatternSummary(nextPattern);

    setFormData((currentValue) => ({
      ...currentValue,
      workingTimeType: value,
      weeklyPattern: nextPattern,
      activityRatePercent:
        value === "part_time"
          ? "0"
          : "100",
      compensation: {
        ...currentValue.compensation,
        weeklyHours:
          String(summary.weeklyHours),
        dailyWorkingHours:
          summary.averageDailyHours > 0
            ? String(summary.averageDailyHours)
            : currentValue.compensation.dailyWorkingHours,
      },
    }));
  }

  function handleWeeklyPatternChange(
    weeklyPattern: WeeklyWorkPatternValue,
    summary: WeeklyWorkPatternSummary,
  ) {
    const referenceWeeklyHours =
      selectedWorkSchedule?.weekly_hours &&
      selectedWorkSchedule.weekly_hours > 0
        ? selectedWorkSchedule.weekly_hours
        : 35;

    const activityRate =
      summary.weeklyHours > 0
        ? Math.min(
            100,
            Math.round(
              (summary.weeklyHours / referenceWeeklyHours) * 100,
            ),
          )
        : 0;

    setFormData((currentValue) => ({
      ...currentValue,
      weeklyPattern,
      activityRatePercent:
        String(activityRate),
      compensation: {
        ...currentValue.compensation,
        weeklyHours:
          String(summary.weeklyHours),
        dailyWorkingHours:
          summary.averageDailyHours > 0
            ? String(summary.averageDailyHours)
            : currentValue.compensation.dailyWorkingHours,
      },
    }));
  }

  function handleClose() {
    if (isSaving) {
      return;
    }

    setFormData(createInitialFormData());
    setReferences(null);
    setLoadedEmployee(null);
    setLoadedContract(null);
    setAddressSuggestions([]);
    setActiveTab("identity");
    setSuccessMessage("");
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (
      formData.firstName.trim().length === 0 ||
      formData.lastName.trim().length === 0
    ) {
      setActiveTab("identity");
      setErrorMessage("Le prénom et le nom sont obligatoires.");
      return;
    }

    if (!employeeId || !loadedEmployee) {
      setErrorMessage("La fiche collaborateur est introuvable.");
      return;
    }

    try {
      setIsSaving(true);

      const compensation =
        formData.compensation;

      const employeePayload =
        keepExistingColumnsOnly(
          loadedEmployee,
          {
            title: emptyToNull(formData.title),
            preferred_name:
              emptyToNull(formData.preferredName),

            first_name:
              formData.firstName.trim(),
            last_name:
              formData.lastName.trim(),

            birth_date:
              emptyToNull(formData.birthDate),
            birth_city:
              emptyToNull(formData.birthCity),
            birth_country_code:
              emptyToNull(formData.birthCountryCode) ?? "FR",

            professional_email:
              emptyToNull(formData.professionalEmail),
            personal_email:
              emptyToNull(formData.personalEmail),
            professional_phone:
              emptyToNull(formData.professionalPhone),
            personal_phone:
              emptyToNull(formData.personalPhone),

            address_line_1:
              emptyToNull(formData.addressLine1),
            address_line_2:
              emptyToNull(formData.addressLine2),
            address_line1:
              emptyToNull(formData.addressLine1),
            address_line2:
              emptyToNull(formData.addressLine2),

            postal_code:
              emptyToNull(formData.postalCode),
            city:
              emptyToNull(formData.city),
            region:
              emptyToNull(formData.region),
            country_code:
              emptyToNull(formData.countryCode) ?? "FR",

            site_id:
              emptyToNull(formData.siteId),
            department_id:
              emptyToNull(formData.departmentId),
            job_id:
              emptyToNull(formData.jobId),
            function_id:
              emptyToNull(formData.functionId),
            manager_employee_id:
              emptyToNull(formData.managerId),

            arrival_date:
              emptyToNull(formData.arrivalDate),
            experience_years:
              numberOrNull(formData.experienceYears) ?? 0,
            employment_status:
              formData.employmentStatus,
            comments:
              emptyToNull(formData.comments),
            notes:
              emptyToNull(formData.comments),
            internal_notes:
              emptyToNull(formData.comments),
          },
        );

      if (Object.keys(employeePayload).length > 0) {
        const { error } = await (
          supabase.from("hr_employees" as never) as any
        )
          .update(employeePayload)
          .eq("id", employeeId)
          .eq("organization_id", organizationId);

        if (error) {
          throw new Error(error.message);
        }
      }

      const changes = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),

        professional_email:
          formData.professionalEmail.trim() || null,

        professional_phone:
          formData.professionalPhone.trim() || null,

        arrival_date:
          emptyToNull(formData.arrivalDate),

        departure_date: null,

        employment_status:
          formData.employmentStatus,

        site_id:
          emptyToNull(formData.siteId),

        department_id:
          emptyToNull(formData.departmentId),

        job_id:
          emptyToNull(formData.jobId),

        function_id:
          emptyToNull(formData.functionId),

        manager_id:
          emptyToNull(formData.managerId),

        contract_type_id:
          emptyToNull(formData.contractTypeId),

        work_schedule_id:
          emptyToNull(formData.workScheduleId),

        contract_start_date:
          emptyToNull(formData.contractStartDate),

        contract_end_date:
          emptyToNull(formData.contractEndDate),

        activity_rate:
          (numberOrNull(formData.activityRatePercent) ?? 100) / 100,

        weekly_hours:
          weeklyPatternSummary.weeklyHours > 0
            ? weeklyPatternSummary.weeklyHours
            : numberOrNull(compensation.weeklyHours),

        daily_working_hours:
          weeklyPatternSummary.averageDailyHours > 0
            ? weeklyPatternSummary.averageDailyHours
            : numberOrNull(compensation.dailyWorkingHours),

        compensation_mode:
          compensation.compensationMode,

        annual_gross_salary:
          compensation.compensationMode === "salary"
            ? numberOrNull(compensation.annualGrossSalary)
            : null,

        employer_charge_profile_id:
          compensation.compensationMode === "salary"
            ? emptyToNull(compensation.employerChargeProfileId)
            : null,

        employer_charge_rate:
          compensation.compensationMode === "salary"
            ? (numberOrNull(compensation.employerChargeRatePercent) ?? 0) / 100
            : 0,

        external_daily_rate:
          compensation.compensationMode === "daily_rate"
            ? numberOrNull(compensation.externalDailyRate)
            : null,

        external_hourly_rate:
          compensation.compensationMode === "hourly_rate"
            ? numberOrNull(compensation.externalHourlyRate)
            : null,

        external_overhead_rate:
          compensation.compensationMode === "daily_rate" ||
          compensation.compensationMode === "hourly_rate"
            ? (numberOrNull(compensation.externalOverheadRatePercent) ?? 0) / 100
            : 0,
      };

      const { error: rpcError } = await (
        supabase.rpc as any
      )("update_hr_employee_with_contract", {
        target_employee_id: employeeId,
        changes,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (loadedContract) {
        const contractPayload =
          keepExistingColumnsOnly(
            loadedContract,
            {
              contract_type_id:
                emptyToNull(formData.contractTypeId),
              work_schedule_id:
                emptyToNull(formData.workScheduleId),

              start_date:
                emptyToNull(formData.contractStartDate),
              end_date:
                emptyToNull(formData.contractEndDate),

              employment_status:
                formData.contractEmploymentStatus,
              contract_employment_status:
                formData.contractEmploymentStatus,

              working_time_type:
                formData.workingTimeType,
              work_time_type:
                formData.workingTimeType,

              activity_rate:
                (numberOrNull(formData.activityRatePercent) ?? 100) / 100,

              weekly_hours:
                weeklyPatternSummary.weeklyHours > 0
                  ? weeklyPatternSummary.weeklyHours
                  : numberOrNull(compensation.weeklyHours),

              annual_working_days:
                numberOrNull(compensation.annualWorkingDays),

              daily_working_hours:
                weeklyPatternSummary.averageDailyHours > 0
                  ? weeklyPatternSummary.averageDailyHours
                  : numberOrNull(compensation.dailyWorkingHours),

              compensation_mode:
                compensation.compensationMode,

              annual_gross_salary:
                compensation.compensationMode === "salary"
                  ? numberOrNull(compensation.annualGrossSalary)
                  : null,

              employer_charge_profile_id:
                compensation.compensationMode === "salary"
                  ? emptyToNull(compensation.employerChargeProfileId)
                  : null,

              employer_charge_rate:
                compensation.compensationMode === "salary"
                  ? (numberOrNull(compensation.employerChargeRatePercent) ?? 0) / 100
                  : 0,

              external_daily_rate:
                compensation.compensationMode === "daily_rate"
                  ? numberOrNull(compensation.externalDailyRate)
                  : null,

              external_hourly_rate:
                compensation.compensationMode === "hourly_rate"
                  ? numberOrNull(compensation.externalHourlyRate)
                  : null,

              external_overhead_rate:
                compensation.compensationMode === "daily_rate" ||
                compensation.compensationMode === "hourly_rate"
                  ? (numberOrNull(compensation.externalOverheadRatePercent) ?? 0) / 100
                  : 0,

              probation_start_date:
                emptyToNull(formData.probationStartDate),
              probation_end_date:
                emptyToNull(formData.probationEndDate),
              probation_duration_months:
                numberOrNull(formData.probationDurationMonths),
              probation_renewable:
                formData.probationRenewable,
              notice_duration_months:
                numberOrNull(formData.noticeDurationMonths),

              status:
                formData.contractStatus,
              contract_status:
                formData.contractStatus,

              weekly_pattern:
                formData.weeklyPattern,
              weekly_work_pattern:
                formData.weeklyPattern,

              leave_acquisition_start_month:
                numberOrNull(formData.leaveAcquisitionStartMonth),
              paid_leave_annual_entitlement:
                numberOrNull(formData.paidLeaveAnnualEntitlement),
              rtt_annual_entitlement:
                numberOrNull(formData.rttAnnualEntitlement),
              leave_prorata_on_arrival:
                formData.leaveProrataOnArrival,
              leave_prorata_on_departure:
                formData.leaveProrataOnDeparture,
              leave_carryover_allowed:
                formData.leaveCarryoverAllowed,
              maximum_leave_carryover:
                numberOrNull(formData.maximumLeaveCarryover),

              comments:
                emptyToNull(
                  [
                    formData.contractComments,
                    `Rythme hebdomadaire détaillé : ${formatNumber(
                      weeklyPatternSummary.weeklyHours,
                    )} h / semaine ; ${weeklyPatternSummary.workedDays} jour(s) travaillé(s) ; moyenne ${formatNumber(
                      weeklyPatternSummary.averageDailyHours,
                    )} h / jour travaillé.`,
                    `Répartition : lundi ${formatNumber(
                      weeklyPatternSummary.mondayHours,
                    )} h, mardi ${formatNumber(
                      weeklyPatternSummary.tuesdayHours,
                    )} h, mercredi ${formatNumber(
                      weeklyPatternSummary.wednesdayHours,
                    )} h, jeudi ${formatNumber(
                      weeklyPatternSummary.thursdayHours,
                    )} h, vendredi ${formatNumber(
                      weeklyPatternSummary.fridayHours,
                    )} h, samedi ${formatNumber(
                      weeklyPatternSummary.saturdayHours,
                    )} h, dimanche ${formatNumber(
                      weeklyPatternSummary.sundayHours,
                    )} h.`,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                ),

              contract_comments:
                emptyToNull(formData.contractComments),
            },
          );

        if (Object.keys(contractPayload).length > 0) {
          const { error } = await (
            supabase.from("hr_employee_contracts" as never) as any
          )
            .update(contractPayload)
            .eq("id", loadedContract.id)
            .eq("organization_id", organizationId);

          if (error) {
            throw new Error(error.message);
          }
        }
      }

      setSuccessMessage(
        "La fiche collaborateur et son contrat ont été mis à jour.",
      );

      await onUpdated();

      window.setTimeout(() => {
        handleClose();
      }, 600);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "La fiche collaborateur n’a pas pu être mise à jour.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Fermer le formulaire"
        onClick={handleClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <aside className="relative flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <UserRound
                className="h-4 w-4"
                strokeWidth={1.9}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                Modification ressource
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                Modifier un membre
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Modification de la fiche collaborateur, du rattachement, du contrat, du temps de travail et du modèle de coût.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <FormTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex min-h-72 items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />

                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    Chargement de la fiche...
                  </p>
                </div>
              </div>
            ) : errorMessage && !loadedEmployee ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

                  <div>
                    <p className="text-sm font-black text-rose-700 dark:text-rose-300">
                      Impossible de charger le formulaire
                    </p>

                    <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {successMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {successMessage}
                      </p>
                    </div>
                  </div>
                )}

                {errorMessage && loadedEmployee && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "identity" && (
                  <>
                    <FormSection
                      title="Identité"
                      description="Informations principales utilisées dans l’annuaire, les contrats et les workflows RH."
                      icon={ContactRound}
                      accent="indigo"
                    >
                      <Field label="Civilité">
                        <select
                          value={formData.title}
                          onChange={(event) =>
                            updateField("title", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseignée</option>
                          <option value="Madame">Madame</option>
                          <option value="Monsieur">Monsieur</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </Field>

                      <Field label="Nom d’usage">
                        <input
                          value={formData.preferredName}
                          onChange={(event) =>
                            updateField("preferredName", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Prénom" required>
                        <input
                          value={formData.firstName}
                          onChange={(event) =>
                            updateField("firstName", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Nom" required>
                        <input
                          value={formData.lastName}
                          onChange={(event) =>
                            updateField("lastName", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Date de naissance">
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(event) =>
                            updateField("birthDate", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Ville de naissance">
                        <input
                          value={formData.birthCity}
                          onChange={(event) =>
                            updateField("birthCity", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>
                    </FormSection>

                    <FormSection
                      title="Adresse"
                      description="Adresse administrative de la ressource. En France, le code postal peut proposer automatiquement la ville et la région."
                      icon={Home}
                      accent="cyan"
                    >
                      <Field label="Adresse ligne 1">
                        <input
                          value={formData.addressLine1}
                          onChange={(event) =>
                            updateField("addressLine1", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Adresse ligne 2">
                        <input
                          value={formData.addressLine2}
                          onChange={(event) =>
                            updateField("addressLine2", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field
                        label="Code postal"
                        description="Saisis 5 chiffres pour rechercher automatiquement les communes françaises."
                      >
                        <div className="relative">
                          <input
                            inputMode="numeric"
                            autoComplete="postal-code"
                            value={formData.postalCode}
                            onChange={(event) =>
                              updateField("postalCode", event.target.value)
                            }
                            className={`${inputClassName} pr-10`}
                            placeholder="75008"
                          />

                          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                            {isAddressLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                            ) : (
                              <Search className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </Field>

                      <Field label="Ville">
                        <input
                          value={formData.city}
                          onChange={(event) =>
                            updateField("city", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      {addressSuggestions.length > 1 && (
                        <div className="sm:col-span-2">
                          <Field label="Commune proposée">
                            <select
                              value=""
                              onChange={(event) => {
                                const suggestion =
                                  addressSuggestions.find(
                                    (item) =>
                                      item.label === event.target.value,
                                  );

                                if (suggestion) {
                                  applyAddressSuggestion(suggestion);
                                }
                              }}
                              className={selectClassName}
                            >
                              <option value="">
                                Choisir une commune
                              </option>

                              {addressSuggestions.map((suggestion) => (
                                <option
                                  key={suggestion.label}
                                  value={suggestion.label}
                                >
                                  {suggestion.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      )}

                      <Field label="Région">
                        <input
                          value={formData.region}
                          onChange={(event) =>
                            updateField("region", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Pays">
                        <input
                          value={formData.countryCode}
                          onChange={(event) =>
                            updateField(
                              "countryCode",
                              event.target.value.toUpperCase(),
                            )
                          }
                          className={inputClassName}
                          placeholder="FR"
                        />
                      </Field>
                    </FormSection>

                    <FormSection
                      title="Contact"
                      description="Coordonnées professionnelles et personnelles nécessaires aux échanges et notifications."
                      icon={Users}
                      accent="emerald"
                    >
                      <Field label="Email professionnel">
                        <input
                          type="email"
                          autoComplete="email"
                          value={formData.professionalEmail}
                          onChange={(event) =>
                            updateField("professionalEmail", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Téléphone professionnel">
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={formData.professionalPhone}
                          onChange={(event) =>
                            updateField("professionalPhone", event.target.value)
                          }
                          className={inputClassName}
                          placeholder="+33 6 00 00 00 00"
                        />
                      </Field>

                      <Field label="Email personnel">
                        <input
                          type="email"
                          autoComplete="email"
                          value={formData.personalEmail}
                          onChange={(event) =>
                            updateField("personalEmail", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Téléphone personnel">
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={formData.personalPhone}
                          onChange={(event) =>
                            updateField("personalPhone", event.target.value)
                          }
                          className={inputClassName}
                          placeholder="+33 6 00 00 00 00"
                        />
                      </Field>
                    </FormSection>

                    <FormSection
                      title="Rattachement"
                      description="Site, service, métier, fonction et manager N+1 issus de l’architecture RH."
                      icon={Building2}
                      accent="violet"
                    >
                      <Field
                        label="Site"
                        description="Liste issue du référentiel Architecture RH."
                      >
                        <select
                          value={formData.siteId}
                          onChange={(event) =>
                            updateField("siteId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseigné</option>

                          {references?.sites.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label="Service"
                        description="Liste issue du référentiel Architecture RH."
                      >
                        <select
                          value={formData.departmentId}
                          onChange={(event) =>
                            updateField("departmentId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseigné</option>

                          {references?.departments.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label="Métier"
                        description="Liste issue du référentiel Architecture RH."
                      >
                        <select
                          value={formData.jobId}
                          onChange={(event) =>
                            updateField("jobId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseigné</option>

                          {references?.jobs.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label="Fonction"
                        description="Liste issue du référentiel Architecture RH."
                      >
                        <select
                          value={formData.functionId}
                          onChange={(event) =>
                            updateField("functionId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseignée</option>

                          {references?.functions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Manager N+1">
                        <select
                          value={formData.managerId}
                          onChange={(event) =>
                            updateField("managerId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Aucun manager</option>

                          {references?.managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.full_name} — {manager.employee_number}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Date d’arrivée">
                        <input
                          type="date"
                          value={formData.arrivalDate}
                          onChange={(event) => {
                            updateField("arrivalDate", event.target.value);

                            if (!formData.contractStartDate) {
                              updateField("contractStartDate", event.target.value);
                            }

                            if (!formData.probationStartDate) {
                              updateField("probationStartDate", event.target.value);
                            }
                          }}
                          className={inputClassName}
                        />
                      </Field>

                      <Field
                        label="Expérience"
                        description="Nombre d’années d’expérience professionnelle."
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.experienceYears}
                          onChange={(event) =>
                            updateField("experienceYears", event.target.value)
                          }
                          className={inputClassName}
                          placeholder="Ex. 5"
                        />
                      </Field>

                      <Field label="Statut collaborateur">
                        <select
                          value={formData.employmentStatus}
                          onChange={(event) =>
                            updateField("employmentStatus", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="draft">Brouillon</option>
                          <option value="preboarding">Pré-intégration</option>
                          <option value="probation">Période d’essai</option>
                          <option value="active">Actif</option>
                          <option value="notice_period">Préavis</option>
                          <option value="suspended">Suspendu</option>
                          <option value="departed">Sorti</option>
                          <option value="archived">Archivé</option>
                        </select>
                      </Field>
                    </FormSection>
                  </>
                )}

                {activeTab === "contract" && (
                  <>
                    <FormSection
                      title="Contrat"
                      description="Type de contrat, temps de travail, dates, période d’essai, préavis et statut contractuel."
                      icon={BriefcaseBusiness}
                      accent="amber"
                    >
                      <Field label="Type de contrat">
                        <select
                          value={formData.contractTypeId}
                          onChange={(event) =>
                            updateField("contractTypeId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Aucun contrat</option>

                          {references?.contractTypes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Rythme de référence">
                        <select
                          value={formData.workScheduleId}
                          onChange={(event) =>
                            updateField("workScheduleId", event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="">Non renseigné</option>

                          {references?.workSchedules
                            .filter((item) => item.schedule_type !== "annual_days")
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </Field>

                      <Field label="Début du contrat">
                        <input
                          type="date"
                          value={formData.contractStartDate}
                          onChange={(event) =>
                            updateField("contractStartDate", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Fin du contrat">
                        <input
                          type="date"
                          value={formData.contractEndDate}
                          onChange={(event) =>
                            updateField("contractEndDate", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Temps de travail">
                        <select
                          value={formData.workingTimeType}
                          onChange={(event) =>
                            handleWorkingTimeTypeChange(event.target.value)
                          }
                          className={selectClassName}
                        >
                          <option value="full_time">Temps plein</option>
                          <option value="part_time">Temps partiel</option>
                          <option value="annual_days">Forfait jours</option>
                          <option value="custom">Personnalisé</option>
                        </select>
                      </Field>

                      <Field label="Taux d’activité (%)">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.activityRatePercent}
                          onChange={(event) =>
                            updateField("activityRatePercent", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Début période d’essai">
                        <input
                          type="date"
                          value={formData.probationStartDate}
                          onChange={(event) =>
                            updateField("probationStartDate", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Fin période d’essai">
                        <input
                          type="date"
                          value={formData.probationEndDate}
                          onChange={(event) =>
                            updateField("probationEndDate", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Durée période d’essai">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.probationDurationMonths}
                          onChange={(event) =>
                            updateField(
                              "probationDurationMonths",
                              event.target.value,
                            )
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Durée préavis">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={formData.noticeDurationMonths}
                          onChange={(event) =>
                            updateField("noticeDurationMonths", event.target.value)
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.probationRenewable}
                            onChange={(event) =>
                              updateField("probationRenewable", event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />

                          La période d’essai peut être renouvelée
                        </label>
                      </div>
                    </FormSection>

                    <HrWeeklyWorkPatternFields
                      value={formData.weeklyPattern}
                      workingTimeType={formData.workingTimeType}
                      referenceLabel={
                        selectedWorkSchedule?.name ?? "rythme non renseigné"
                      }
                      referenceWeeklyHours={
                        selectedWorkSchedule?.weekly_hours ?? 35
                      }
                      onChange={handleWeeklyPatternChange}
                    />


                    <FormSection
                      title="Droits CP / RTT"
                      description="Droits annuels utilisés par les soldes d’absence, les congés, les RTT, la capacité et les exports."
                      icon={WalletCards}
                      accent="amber"
                    >
                      <Field
                        label="Début période d’acquisition"
                        description="Par défaut : 1er juin → 31 mai de l’année suivante."
                      >
                        <select
                          value={formData.leaveAcquisitionStartMonth}
                          onChange={(event) =>
                            updateField(
                              "leaveAcquisitionStartMonth",
                              event.target.value,
                            )
                          }
                          className={selectClassName}
                        >
                          <option value="1">Janvier</option>
                          <option value="6">Juin</option>
                        </select>
                      </Field>

                      <Field label="Congés payés annuels">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.paidLeaveAnnualEntitlement}
                          onChange={(event) =>
                            updateField(
                              "paidLeaveAnnualEntitlement",
                              event.target.value,
                            )
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field
                        label="RTT annuels"
                        description="Modifiable chaque année selon l’accord entreprise et le calendrier."
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.rttAnnualEntitlement}
                          onChange={(event) =>
                            updateField(
                              "rttAnnualEntitlement",
                              event.target.value,
                            )
                          }
                          className={inputClassName}
                        />
                      </Field>

                      <Field label="Report maximum autorisé">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.maximumLeaveCarryover}
                          onChange={(event) =>
                            updateField(
                              "maximumLeaveCarryover",
                              event.target.value,
                            )
                          }
                          placeholder="Illimité si vide"
                          className={inputClassName}
                        />
                      </Field>

                      <div className="grid gap-3 sm:col-span-2 md:grid-cols-3">
                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.leaveProrataOnArrival}
                            onChange={(event) =>
                              updateField(
                                "leaveProrataOnArrival",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          Prorata entrée
                        </label>

                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.leaveProrataOnDeparture}
                            onChange={(event) =>
                              updateField(
                                "leaveProrataOnDeparture",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          Prorata sortie
                        </label>

                        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={formData.leaveCarryoverAllowed}
                            onChange={(event) =>
                              updateField(
                                "leaveCarryoverAllowed",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          Report autorisé
                        </label>
                      </div>
                    </FormSection>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <BadgeEuro
                            className="h-4 w-4"
                            strokeWidth={1.9}
                          />
                        </div>

                        <div>
                          <h3 className="text-sm font-black text-slate-950 dark:text-white">
                            Rémunération et coût
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            Base utilisée par les projets, le staffing, la capacité et les analyses financières.
                          </p>
                        </div>
                      </div>

                      <div className="p-5">
                        <HrCompensationFields
                          value={formData.compensation}
                          activityRatePercent={formData.activityRatePercent}
                          chargeProfiles={references?.chargeProfiles ?? []}
                          onChange={(compensation) =>
                            updateField("compensation", compensation)
                          }
                        />
                      </div>
                    </section>
                  </>
                )}

                {activeTab === "preview" && (
                  <>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard
                        label="Collaborateur"
                        value={
                          [
                            formData.firstName,
                            formData.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") ||
                          "Non renseigné"
                        }
                        description="Identité principale de la fiche."
                        accent="indigo"
                      />

                      <SummaryCard
                        label="Contrat"
                        value={selectedContractType?.name ?? "Non renseigné"}
                        description="Type de contrat sélectionné."
                        accent="violet"
                      />

                      <SummaryCard
                        label="Heures hebdo"
                        value={`${formatNumber(weeklyPatternSummary.weeklyHours)} h`}
                        description="Total issu de la semaine de travail."
                        accent="emerald"
                      />

                      <SummaryCard
                        label="Taux activité"
                        value={`${formData.activityRatePercent || "0"} %`}
                        description="Prorata appliqué aux coûts salariés."
                        accent="cyan"
                      />
                    </section>

                    <FormSection
                      title="Commentaires"
                      description="Informations complémentaires conservées dans la fiche collaborateur et le contrat."
                      icon={FileText}
                      accent="indigo"
                    >
                      <div className="sm:col-span-2">
                        <Field label="Commentaires collaborateur">
                          <textarea
                            value={formData.comments}
                            onChange={(event) =>
                              updateField("comments", event.target.value)
                            }
                            className={textareaClassName}
                          />
                        </Field>
                      </div>

                      <div className="sm:col-span-2">
                        <Field label="Commentaires contrat">
                          <textarea
                            value={formData.contractComments}
                            onChange={(event) =>
                              updateField("contractComments", event.target.value)
                            }
                            className={textareaClassName}
                          />
                        </Field>
                      </div>
                    </FormSection>

                    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />

                        <div>
                          <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                            Points de vigilance
                          </p>

                          <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                            La semaine de travail pilote les heures hebdomadaires, la base journalière, les coûts et la future capacité. Les droits CP, RTT salarié et RTT employeur seront rattachés automatiquement avec les règles annuelles du modèle Absences.
                          </p>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Base actuelle :{" "}
              <span className="font-black text-indigo-700 dark:text-indigo-300">
                {formatNumber(weeklyPatternSummary.weeklyHours)} h / semaine
              </span>
              {" · "}
              <span className="font-black text-emerald-700 dark:text-emerald-300">
                {weeklyPatternSummary.workedDays} jour
                {weeklyPatternSummary.workedDays > 1 ? "s" : ""} travaillé
                {weeklyPatternSummary.workedDays > 1 ? "s" : ""}
              </span>
              {" · "}
              <span className="font-black text-cyan-700 dark:text-cyan-300">
                {formatNumber(weeklyPatternSummary.averageDailyHours)} h / jour
              </span>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={
                  isSaving ||
                  formData.firstName.trim().length === 0 ||
                  formData.lastName.trim().length === 0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-4 w-4" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}