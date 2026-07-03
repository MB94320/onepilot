"use client";

import {
  AlertCircle,
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ReferenceItem = {
  id: string;
  name: string;
};

type ChargeProfile = ReferenceItem & {
  rate?: number | null;
  charge_rate?: number | null;
  employer_charge_rate?: number | null;
  default_rate?: number | null;
};

type EmployeeRecord = {
  id: string;
  organization_id: string;

  first_name: string;
  last_name: string;

  professional_email: string | null;
  professional_phone: string | null;

  arrival_date: string | null;
  departure_date: string | null;

  employment_status: string;

  site_id: string | null;
  department_id: string | null;
  job_id: string | null;
  function_id: string | null;
  manager_employee_id: string | null;
};

type ContractRecord = {
  id: string;

  contract_type_id: string | null;
  work_schedule_id: string | null;

  start_date: string | null;
  end_date: string | null;

  activity_rate: number | null;
  weekly_hours: number | null;
  daily_working_hours: number | null;

  compensation_mode: string | null;

  annual_gross_salary: number | null;

  employer_charge_profile_id: string | null;
  employer_charge_rate: number | null;

  external_daily_rate: number | null;
  external_hourly_rate: number | null;
  external_overhead_rate: number | null;
};

type FormState = {
  firstName: string;
  lastName: string;

  professionalEmail: string;
  professionalPhone: string;

  arrivalDate: string;
  departureDate: string;

  employmentStatus: string;

  siteId: string;
  departmentId: string;
  jobId: string;
  functionId: string;
  managerId: string;

  contractTypeId: string;
  workScheduleId: string;

  contractStartDate: string;
  contractEndDate: string;

  activityRate: string;
  weeklyHours: string;
  dailyWorkingHours: string;

  compensationMode: string;

  annualGrossSalary: string;

  employerChargeProfileId: string;
  employerChargeRate: string;

  externalDailyRate: string;
  externalHourlyRate: string;
  externalOverheadRate: string;
};

type ReferencesState = {
  sites: ReferenceItem[];
  departments: ReferenceItem[];
  jobs: ReferenceItem[];
  functions: ReferenceItem[];
  managers: ReferenceItem[];

  contractTypes: ReferenceItem[];
  workSchedules: ReferenceItem[];
  chargeProfiles: ChargeProfile[];
};

type HrEmployeeEditFormProps = {
  employeeId: string | null;
  organizationId: string;

  isOpen: boolean;

  onClose: () => void;
  onUpdated: () => Promise<void> | void;
};

const emptyForm: FormState = {
  firstName: "",
  lastName: "",

  professionalEmail: "",
  professionalPhone: "",

  arrivalDate: "",
  departureDate: "",

  employmentStatus: "active",

  siteId: "",
  departmentId: "",
  jobId: "",
  functionId: "",
  managerId: "",

  contractTypeId: "",
  workScheduleId: "",

  contractStartDate: "",
  contractEndDate: "",

  activityRate: "100",
  weeklyHours: "35",
  dailyWorkingHours: "7",

  compensationMode: "salary",

  annualGrossSalary: "",

  employerChargeProfileId: "",
  employerChargeRate: "0",

  externalDailyRate: "",
  externalHourlyRate: "",
  externalOverheadRate: "0",
};

const emptyReferences: ReferencesState = {
  sites: [],
  departments: [],
  jobs: [],
  functions: [],
  managers: [],

  contractTypes: [],
  workSchedules: [],
  chargeProfiles: [],
};

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const selectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

function toInputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toInputNumber(
  value: number | null | undefined,
  fallback = "",
) {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function optionalNumber(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(
    normalizedValue.replace(",", "."),
  );

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

function getChargeProfileRate(
  profile: ChargeProfile | undefined,
) {
  if (!profile) {
    return null;
  }

  const possibleRates = [
    profile.rate,
    profile.charge_rate,
    profile.employer_charge_rate,
    profile.default_rate,
  ];

  const validRate = possibleRates.find(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value),
  );

  return validRate ?? null;
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
      {children}

      {required && (
        <span className="ml-1 text-rose-500">*</span>
      )}
    </label>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  accent = "indigo",
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
  accent?: "indigo" | "violet" | "emerald";
}) {
  const accentClasses = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };

  return (
    <div className="mb-5 flex items-start gap-3">
      <div
        className={`rounded-xl p-2.5 ${accentClasses[accent]}`}
      >
        <Icon className="h-4 w-4" />
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
  );
}

export default function HrEmployeeEditForm({
  employeeId,
  organizationId,
  isOpen,
  onClose,
  onUpdated,
}: HrEmployeeEditFormProps) {
  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [references, setReferences] =
    useState<ReferencesState>(
      emptyReferences,
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof FormState>(
      field: K,
      value: FormState[K],
    ) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: value,
      }));
    },
    [],
  );

  const loadFormData = useCallback(async () => {
    if (!employeeId || !organizationId) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const [
        employeeResult,
        contractResult,
        sitesResult,
        departmentsResult,
        jobsResult,
        functionsResult,
        managersResult,
        contractTypesResult,
        workSchedulesResult,
        chargeProfilesResult,
      ] = await Promise.all([
        (
          supabase.from(
            "hr_employees" as never,
          ) as any
        )
          .select(
            `
              id,
              organization_id,
              first_name,
              last_name,
              professional_email,
              professional_phone,
              arrival_date,
              departure_date,
              employment_status,
              site_id,
              department_id,
              job_id,
              function_id,
              manager_employee_id
            `,
          )
          .eq("id", employeeId)
          .eq(
            "organization_id",
            organizationId,
          )
          .single(),

        (
          supabase.from(
            "hr_employee_contracts" as never,
          ) as any
        )
          .select(
            `
              id,
              contract_type_id,
              work_schedule_id,
              start_date,
              end_date,
              activity_rate,
              weekly_hours,
              daily_working_hours,
              compensation_mode,
              annual_gross_salary,
              employer_charge_profile_id,
              employer_charge_rate,
              external_daily_rate,
              external_hourly_rate,
              external_overhead_rate
            `,
          )
          .eq("employee_id", employeeId)
          .eq(
            "organization_id",
            organizationId,
          )
          .order("is_primary", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),

        (
          supabase.from(
            "hr_sites" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
          supabase.from(
            "hr_departments" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
          supabase.from(
            "hr_jobs" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
          supabase.from(
            "hr_functions" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
          supabase.from(
            "hr_employees" as never,
          ) as any
        )
          .select(
            "id, first_name, last_name",
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .neq("id", employeeId)
          .order("last_name"),

        (
          supabase.from(
            "hr_contract_types" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
          supabase.from(
            "hr_work_schedules" as never,
          ) as any
        )
          .select("id, name")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("is_active", true)
          .order("name"),

        (
            supabase.from(
                "hr_employer_charge_profiles" as never,
            ) as any
            )
            .select("*")
            .eq(
                "organization_id",
                organizationId,
            )
            .eq("is_active", true)
            .order("name"),
      ]);

      const allResults = [
        employeeResult,
        contractResult,
        sitesResult,
        departmentsResult,
        jobsResult,
        functionsResult,
        managersResult,
        contractTypesResult,
        workSchedulesResult,
        chargeProfilesResult,
      ];

      const firstError = allResults.find(
        (result) => result.error,
      )?.error;

      if (firstError) {
        throw firstError;
      }

      const employee =
        employeeResult.data as EmployeeRecord;

      const contract =
        contractResult.data as ContractRecord | null;

      if (!employee) {
        throw new Error(
          "La fiche collaborateur est introuvable.",
        );
      }

      setReferences({
        sites:
          (sitesResult.data ?? []) as ReferenceItem[],

        departments:
          (departmentsResult.data ??
            []) as ReferenceItem[],

        jobs:
          (jobsResult.data ?? []) as ReferenceItem[],

        functions:
          (functionsResult.data ??
            []) as ReferenceItem[],

        managers: (
          managersResult.data ?? []
        ).map(
          (manager: {
            id: string;
            first_name: string;
            last_name: string;
          }) => ({
            id: manager.id,
            name: `${manager.first_name} ${manager.last_name}`,
          }),
        ),

        contractTypes:
          (contractTypesResult.data ??
            []) as ReferenceItem[],

        workSchedules:
          (workSchedulesResult.data ??
            []) as ReferenceItem[],

        chargeProfiles:
          (chargeProfilesResult.data ??
            []) as ChargeProfile[],
      });

      setForm({
        firstName: employee.first_name ?? "",
        lastName: employee.last_name ?? "",

        professionalEmail:
          employee.professional_email ?? "",

        professionalPhone:
          employee.professional_phone ?? "",

        arrivalDate: toInputDate(
          employee.arrival_date,
        ),

        departureDate: toInputDate(
          employee.departure_date,
        ),

        employmentStatus:
          employee.employment_status ??
          "active",

        siteId: employee.site_id ?? "",

        departmentId:
          employee.department_id ?? "",

        jobId: employee.job_id ?? "",

        functionId:
          employee.function_id ?? "",

        managerId:
          employee.manager_employee_id ?? "",

        contractTypeId:
          contract?.contract_type_id ?? "",

        workScheduleId:
          contract?.work_schedule_id ?? "",

        contractStartDate: toInputDate(
          contract?.start_date ?? null,
        ),

        contractEndDate: toInputDate(
          contract?.end_date ?? null,
        ),

        activityRate: toInputNumber(
          contract?.activity_rate,
          "100",
        ),

        weeklyHours: toInputNumber(
          contract?.weekly_hours,
          "35",
        ),

        dailyWorkingHours: toInputNumber(
          contract?.daily_working_hours,
          "7",
        ),

        compensationMode:
          contract?.compensation_mode ??
          "salary",

        annualGrossSalary: toInputNumber(
          contract?.annual_gross_salary,
        ),

        employerChargeProfileId:
          contract?.employer_charge_profile_id ??
          "",

        employerChargeRate: toInputNumber(
          contract?.employer_charge_rate,
          "0",
        ),

        externalDailyRate: toInputNumber(
          contract?.external_daily_rate,
        ),

        externalHourlyRate: toInputNumber(
          contract?.external_hourly_rate,
        ),

        externalOverheadRate: toInputNumber(
          contract?.external_overhead_rate,
          "0",
        ),
      });
    } catch (error: unknown) {
      console.error(
        "Erreur de chargement de la fiche :",
        error,
      );

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
  }, [employeeId, organizationId]);

  useEffect(() => {
    if (isOpen && employeeId) {
      void loadFormData();
    }
  }, [
    employeeId,
    isOpen,
    loadFormData,
  ]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        isOpen &&
        !isSubmitting
      ) {
        onClose();
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
  }, [isOpen, isSubmitting, onClose]);

  function handleChargeProfileChange(
  profileId: string,
) {
  const profile =
    references.chargeProfiles.find(
      (item) => item.id === profileId,
    );

  const profileRate =
    getChargeProfileRate(profile);

  setForm((currentForm) => ({
    ...currentForm,

    employerChargeProfileId: profileId,

    employerChargeRate:
      profileRate !== null
        ? String(profileRate)
        : currentForm.employerChargeRate,
  }));
}

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!employeeId) {
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setErrorMessage(
        "Le prénom et le nom sont obligatoires.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const changes = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),

        professional_email:
          form.professionalEmail.trim() ||
          null,

        professional_phone:
          form.professionalPhone.trim() ||
          null,

        arrival_date:
          form.arrivalDate || null,

        departure_date:
          form.departureDate || null,

        employment_status:
          form.employmentStatus,

        site_id: form.siteId || null,

        department_id:
          form.departmentId || null,

        job_id: form.jobId || null,

        function_id:
          form.functionId || null,

        manager_id:
          form.managerId || null,

        contract_type_id:
          form.contractTypeId || null,

        work_schedule_id:
          form.workScheduleId || null,

        contract_start_date:
          form.contractStartDate || null,

        contract_end_date:
          form.contractEndDate || null,

        activity_rate: optionalNumber(
          form.activityRate,
        ),

        weekly_hours: optionalNumber(
          form.weeklyHours,
        ),

        daily_working_hours:
          optionalNumber(
            form.dailyWorkingHours,
          ),

        compensation_mode:
          form.compensationMode,

        annual_gross_salary:
          form.compensationMode === "salary"
            ? optionalNumber(
                form.annualGrossSalary,
              )
            : null,

        employer_charge_profile_id:
          form.compensationMode === "salary"
            ? form.employerChargeProfileId ||
              null
            : null,

        employer_charge_rate:
          form.compensationMode === "salary"
            ? optionalNumber(
                form.employerChargeRate,
              )
            : 0,

        external_daily_rate:
          form.compensationMode ===
          "daily_rate"
            ? optionalNumber(
                form.externalDailyRate,
              )
            : null,

        external_hourly_rate:
          form.compensationMode ===
          "hourly_rate"
            ? optionalNumber(
                form.externalHourlyRate,
              )
            : null,

        external_overhead_rate:
          form.compensationMode === "salary"
            ? 0
            : optionalNumber(
                form.externalOverheadRate,
              ),
      };

      const { error } = await (
        supabase.rpc as any
      )("update_hr_employee_with_contract", {
        target_employee_id: employeeId,
        changes,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "La fiche collaborateur a été mise à jour.",
      );

      await onUpdated();

      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch (error: unknown) {
      console.error(
        "Erreur de modification du collaborateur :",
        error,
      );

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
      setIsSubmitting(false);
    }
  }

  const isSalary =
    form.compensationMode === "salary";

  const isDailyRate =
    form.compensationMode === "daily_rate";

  const isHourlyRate =
    form.compensationMode === "hourly_rate";

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={
          isSubmitting ? undefined : onClose
        }
        className={`fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Modifier le collaborateur"
        className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Modification
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              Modifier la fiche collaborateur
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Les changements sont enregistrés dans
              l’organisation active.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Fermer le formulaire"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />

              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Chargement de la fiche...
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-7 overflow-y-auto p-6">
              {errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                    <p className="text-sm text-red-700 dark:text-red-300">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {successMessage}
                    </p>
                  </div>
                </div>
              )}

              <section>
                <SectionTitle
                  icon={UserRound}
                  title="Identité et coordonnées"
                  description="Informations principales visibles dans l’annuaire."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>
                      Prénom
                    </FieldLabel>

                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(event) =>
                        updateField(
                          "firstName",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel required>
                      Nom
                    </FieldLabel>

                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(event) =>
                        updateField(
                          "lastName",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Email professionnel
                    </FieldLabel>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="email"
                        value={
                          form.professionalEmail
                        }
                        onChange={(event) =>
                          updateField(
                            "professionalEmail",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={`${inputClassName} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>
                      Téléphone professionnel
                    </FieldLabel>

                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="tel"
                        value={
                          form.professionalPhone
                        }
                        onChange={(event) =>
                          updateField(
                            "professionalPhone",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={`${inputClassName} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>
                      Date d’arrivée
                    </FieldLabel>

                    <input
                      type="date"
                      value={form.arrivalDate}
                      onChange={(event) =>
                        updateField(
                          "arrivalDate",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Date de départ
                    </FieldLabel>

                    <input
                      type="date"
                      value={form.departureDate}
                      onChange={(event) =>
                        updateField(
                          "departureDate",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>
                      Statut RH
                    </FieldLabel>

                    <select
                      value={
                        form.employmentStatus
                      }
                      onChange={(event) =>
                        updateField(
                          "employmentStatus",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="draft">
                        Brouillon
                      </option>

                      <option value="preboarding">
                        Pré-intégration
                      </option>

                      <option value="probation">
                        Période d’essai
                      </option>

                      <option value="active">
                        Actif
                      </option>

                      <option value="suspended">
                        Suspendu
                      </option>

                      <option value="notice_period">
                        Préavis
                      </option>

                      <option value="departed">
                        Sorti
                      </option>

                      <option value="archived">
                        Archivé
                      </option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={Building2}
                  title="Organisation"
                  description="Rattachements utilisés dans les filtres et les analyses."
                  accent="violet"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Site</FieldLabel>

                    <select
                      value={form.siteId}
                      onChange={(event) =>
                        updateField(
                          "siteId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucun site
                      </option>

                      {references.sites.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>
                      Service
                    </FieldLabel>

                    <select
                      value={
                        form.departmentId
                      }
                      onChange={(event) =>
                        updateField(
                          "departmentId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucun service
                      </option>

                      {references.departments.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>
                      Métier
                    </FieldLabel>

                    <select
                      value={form.jobId}
                      onChange={(event) =>
                        updateField(
                          "jobId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucun métier
                      </option>

                      {references.jobs.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>
                      Fonction
                    </FieldLabel>

                    <select
                      value={form.functionId}
                      onChange={(event) =>
                        updateField(
                          "functionId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucune fonction
                      </option>

                      {references.functions.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>
                      Manager N+1
                    </FieldLabel>

                    <div className="relative">
                      <UsersRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={form.managerId}
                        onChange={(event) =>
                          updateField(
                            "managerId",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={`${selectClassName} pl-10`}
                      >
                        <option value="">
                          Aucun manager
                        </option>

                        {references.managers.map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.name}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={BriefcaseBusiness}
                  title="Contrat et temps de travail"
                  description="Paramètres utilisés pour la capacité et le calcul des coûts."
                  accent="violet"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>
                      Type de contrat
                    </FieldLabel>

                    <select
                      value={
                        form.contractTypeId
                      }
                      onChange={(event) =>
                        updateField(
                          "contractTypeId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucun contrat
                      </option>

                      {references.contractTypes.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>
                      Rythme de travail
                    </FieldLabel>

                    <select
                      value={
                        form.workScheduleId
                      }
                      onChange={(event) =>
                        updateField(
                          "workScheduleId",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="">
                        Aucun rythme
                      </option>

                      {references.workSchedules.map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>
                      Début du contrat
                    </FieldLabel>

                    <input
                      type="date"
                      value={
                        form.contractStartDate
                      }
                      onChange={(event) =>
                        updateField(
                          "contractStartDate",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Fin du contrat
                    </FieldLabel>

                    <input
                      type="date"
                      value={
                        form.contractEndDate
                      }
                      onChange={(event) =>
                        updateField(
                          "contractEndDate",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Taux d’activité (%)
                    </FieldLabel>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.activityRate}
                      onChange={(event) =>
                        updateField(
                          "activityRate",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Heures hebdomadaires
                    </FieldLabel>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.weeklyHours}
                      onChange={(event) =>
                        updateField(
                          "weeklyHours",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      Heures journalières
                    </FieldLabel>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.dailyWorkingHours
                      }
                      onChange={(event) =>
                        updateField(
                          "dailyWorkingHours",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionTitle
                  icon={BadgeEuro}
                  title="Rémunération et coûts"
                  description="Les coûts chargés seront recalculés par la base de données."
                  accent="emerald"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel>
                      Mode de rémunération
                    </FieldLabel>

                    <select
                      value={
                        form.compensationMode
                      }
                      onChange={(event) =>
                        updateField(
                          "compensationMode",
                          event.target.value,
                        )
                      }
                      disabled={isSubmitting}
                      className={selectClassName}
                    >
                      <option value="salary">
                        Salaire
                      </option>

                      <option value="daily_rate">
                        Freelance au TJM
                      </option>

                      <option value="hourly_rate">
                        Prestataire horaire
                      </option>
                    </select>
                  </div>

                  {isSalary && (
                    <>
                      <div>
                        <FieldLabel>
                          Salaire brut annuel (€)
                        </FieldLabel>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            form.annualGrossSalary
                          }
                          onChange={(event) =>
                            updateField(
                              "annualGrossSalary",
                              event.target.value,
                            )
                          }
                          disabled={isSubmitting}
                          className={inputClassName}
                        />
                      </div>

                      <div>
                        <FieldLabel>
                          Profil de charges
                        </FieldLabel>

                        <select
                          value={
                            form.employerChargeProfileId
                          }
                          onChange={(event) =>
                            handleChargeProfileChange(
                              event.target.value,
                            )
                          }
                          disabled={isSubmitting}
                          className={selectClassName}
                        >
                          <option value="">
                            Aucun profil
                          </option>

                          {references.chargeProfiles.map(
                            (item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.name}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div>
                        <FieldLabel>
                          Taux de charges (%)
                        </FieldLabel>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            form.employerChargeRate
                          }
                          onChange={(event) =>
                            updateField(
                              "employerChargeRate",
                              event.target.value,
                            )
                          }
                          disabled={isSubmitting}
                          className={inputClassName}
                        />
                      </div>
                    </>
                  )}

                  {isDailyRate && (
                    <div>
                      <FieldLabel>
                        TJM d’achat (€)
                      </FieldLabel>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.externalDailyRate
                        }
                        onChange={(event) =>
                          updateField(
                            "externalDailyRate",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                  )}

                  {isHourlyRate && (
                    <div>
                      <FieldLabel>
                        Taux horaire externe (€)
                      </FieldLabel>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.externalHourlyRate
                        }
                        onChange={(event) =>
                          updateField(
                            "externalHourlyRate",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                  )}

                  {!isSalary && (
                    <div>
                      <FieldLabel>
                        Frais indirects (%)
                      </FieldLabel>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.externalOverheadRate
                        }
                        onChange={(event) =>
                          updateField(
                            "externalOverheadRate",
                            event.target.value,
                          )
                        }
                        disabled={isSubmitting}
                        className={inputClassName}
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {isSubmitting
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}