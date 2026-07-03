"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Loader2,
  UserRound,
  X,
} from "lucide-react";

import HrCompensationFields, {
  EmployerChargeProfile,
  HrCompensationValue,
} from "@/components/hr/HrCompensationFields";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type HrMemberFormProps = {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
};

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

  compensation: HrCompensationValue;
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

const initialFormData: FormData = {
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
  experienceYears: "0",
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

  compensation: initialCompensation,
};

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const textareaClassName =
  "min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

function emptyToNull(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : null;
}

function numberOrNull(value: string) {
  const normalizedValue = value
    .trim()
    .replace(",", ".");

  if (normalizedValue.length === 0) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
}

async function loadReferenceData(
  organizationId: string,
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
          annual_working_days
        `,
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name"),

    (supabase.from(
      "hr_employer_charge_profiles" as never,
    ) as any)
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
    departments:
      (departmentsResult.data ?? []) as ReferenceItem[],
    jobs: (jobsResult.data ?? []) as ReferenceItem[],
    functions:
      (functionsResult.data ?? []) as ReferenceItem[],
    managers:
      (managersResult.data ?? []) as EmployeeReference[],
    contractTypes:
      (contractTypesResult.data ?? []) as ContractType[],
    workSchedules:
      (workSchedulesResult.data ?? []) as WorkSchedule[],
    chargeProfiles:
      (chargeProfilesResult.data ??
        []) as EmployerChargeProfile[],
  };
}

function Field({
  label,
  required,
  fullWidth,
  description,
  children,
}: {
  label: string;
  required?: boolean;
  fullWidth?: boolean;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        fullWidth ? "block sm:col-span-2" : "block"
      }
    >
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </span>
      )}
    </label>
  );
}

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-900">
          <Icon
            className="h-4 w-4 text-slate-600 dark:text-slate-300"
            strokeWidth={1.8}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
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

export default function HrMemberForm({
  organizationId,
  isOpen,
  onClose,
  onCreated,
}: HrMemberFormProps) {
  const [formData, setFormData] =
    useState<FormData>(initialFormData);

  const [successMessage, setSuccessMessage] =
    useState("");

  const {
    data: references,
    isLoading: referencesLoading,
    error: referencesError,
  } = useQuery({
    queryKey: [
      "hr-member-form-references",
      organizationId,
    ],
    queryFn: () => loadReferenceData(organizationId),
    enabled: isOpen && Boolean(organizationId),
  });

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

  useEffect(() => {
    if (!references) {
      return;
    }

    const defaultProfile =
      references.chargeProfiles.find(
        (profile) => profile.is_default,
      );

    if (!defaultProfile) {
      return;
    }

    setFormData((currentValue) => {
      if (
        currentValue.compensation
          .employerChargeProfileId
      ) {
        return currentValue;
      }

      return {
        ...currentValue,
        compensation: {
          ...currentValue.compensation,
          employerChargeProfileId:
            defaultProfile.id,
          employerChargeRatePercent: String(
            Number(defaultProfile.charge_rate) * 100,
          ),
        },
      };
    });
  }, [references]);

  useEffect(() => {
    if (!selectedContractType) {
      return;
    }

    let compensationMode:
      | "salary"
      | "daily_rate"
      | "hourly_rate" =
      formData.compensation.compensationMode;

    if (
      ["freelance", "subcontractor"].includes(
        selectedContractType.employment_category,
      )
    ) {
      compensationMode = "daily_rate";
    } else if (
      ["employee", "intern", "apprentice"].includes(
        selectedContractType.employment_category,
      )
    ) {
      compensationMode = "salary";
    }

    setFormData((currentValue) => ({
      ...currentValue,

      contractEmploymentStatus:
        selectedContractType.employment_status ||
        currentValue.contractEmploymentStatus,

      probationDurationMonths:
        selectedContractType.default_probation_months !==
        null
          ? String(
              selectedContractType.default_probation_months,
            )
          : "",

      noticeDurationMonths:
        selectedContractType.default_notice_months !== null
          ? String(
              selectedContractType.default_notice_months,
            )
          : "",

      compensation: {
        ...currentValue.compensation,
        compensationMode,
      },
    }));
  }, [selectedContractType]);

  useEffect(() => {
    if (!selectedWorkSchedule) {
      return;
    }

    setFormData((currentValue) => ({
      ...currentValue,

      workingTimeType:
        selectedWorkSchedule.schedule_type ===
        "annual_days"
          ? "annual_days"
          : selectedWorkSchedule.schedule_type ===
              "part_time"
            ? "part_time"
            : "full_time",

      compensation: {
        ...currentValue.compensation,

        weeklyHours:
          selectedWorkSchedule.weekly_hours !== null
            ? String(
                selectedWorkSchedule.weekly_hours,
              )
            : "",

        annualWorkingDays:
          selectedWorkSchedule.annual_working_days !==
          null
            ? String(
                selectedWorkSchedule.annual_working_days,
              )
            : "",
      },
    }));
  }, [selectedWorkSchedule]);

  const createMemberMutation = useMutation({
    mutationFn: async () => {
      const compensation = formData.compensation;

      const { data, error } = await (
        supabase.rpc(
          "create_hr_employee_with_contract" as never,
          {
            target_organization_id: organizationId,

            employee_first_name:
              formData.firstName.trim(),

            employee_last_name:
              formData.lastName.trim(),

            employee_title:
              emptyToNull(formData.title),

            employee_preferred_name:
              emptyToNull(formData.preferredName),

            employee_birth_date:
              emptyToNull(formData.birthDate),

            employee_birth_city:
              emptyToNull(formData.birthCity),

            employee_birth_country_code:
              emptyToNull(
                formData.birthCountryCode,
              ) ?? "FR",

            employee_professional_email:
              emptyToNull(
                formData.professionalEmail,
              ),

            employee_personal_email:
              emptyToNull(formData.personalEmail),

            employee_professional_phone:
              emptyToNull(
                formData.professionalPhone,
              ),

            employee_personal_phone:
              emptyToNull(formData.personalPhone),

            employee_address_line_1:
              emptyToNull(formData.addressLine1),

            employee_address_line_2:
              emptyToNull(formData.addressLine2),

            employee_postal_code:
              emptyToNull(formData.postalCode),

            employee_city:
              emptyToNull(formData.city),

            employee_region:
              emptyToNull(formData.region),

            employee_country_code:
              emptyToNull(formData.countryCode) ??
              "FR",

            employee_site_id:
              emptyToNull(formData.siteId),

            employee_department_id:
              emptyToNull(formData.departmentId),

            employee_job_id:
              emptyToNull(formData.jobId),

            employee_function_id:
              emptyToNull(formData.functionId),

            employee_manager_id:
              emptyToNull(formData.managerId),

            employee_arrival_date:
              emptyToNull(formData.arrivalDate),

            employee_experience_years:
              numberOrNull(
                formData.experienceYears,
              ) ?? 0,

            employee_employment_status:
              formData.employmentStatus,

            employee_comments:
              emptyToNull(formData.comments),

            contract_type_id_value:
              emptyToNull(formData.contractTypeId),

            work_schedule_id_value:
              emptyToNull(formData.workScheduleId),

            contract_start_date:
              emptyToNull(
                formData.contractStartDate,
              ),

            contract_end_date:
              emptyToNull(formData.contractEndDate),

            contract_employment_status:
              formData.contractEmploymentStatus,

            contract_working_time_type:
              formData.workingTimeType,

            contract_activity_rate:
              (
                numberOrNull(
                  formData.activityRatePercent,
                ) ?? 100
              ) / 100,

            contract_weekly_hours:
              numberOrNull(
                compensation.weeklyHours,
              ),

            contract_annual_working_days:
              numberOrNull(
                compensation.annualWorkingDays,
              ),

            contract_daily_working_hours:
              numberOrNull(
                compensation.dailyWorkingHours,
              ),

            contract_compensation_mode:
              compensation.compensationMode,

            contract_annual_gross_salary:
              compensation.compensationMode ===
              "salary"
                ? numberOrNull(
                    compensation.annualGrossSalary,
                  )
                : null,

            contract_employer_charge_profile_id:
              compensation.compensationMode ===
              "salary"
                ? emptyToNull(
                    compensation.employerChargeProfileId,
                  )
                : null,

            contract_employer_charge_rate:
              compensation.compensationMode ===
              "salary"
                ? (
                    numberOrNull(
                      compensation.employerChargeRatePercent,
                    ) ?? 0
                  ) / 100
                : 0,

            contract_external_daily_rate:
              compensation.compensationMode ===
              "daily_rate"
                ? numberOrNull(
                    compensation.externalDailyRate,
                  )
                : null,

            contract_external_hourly_rate:
              compensation.compensationMode ===
              "hourly_rate"
                ? numberOrNull(
                    compensation.externalHourlyRate,
                  )
                : null,

            contract_external_overhead_rate:
              compensation.compensationMode ===
                "daily_rate" ||
              compensation.compensationMode ===
                "hourly_rate"
                ? (
                    numberOrNull(
                      compensation.externalOverheadRatePercent,
                    ) ?? 0
                  ) / 100
                : 0,

            contract_probation_start_date:
              emptyToNull(
                formData.probationStartDate,
              ),

            contract_probation_end_date:
              emptyToNull(
                formData.probationEndDate,
              ),

            contract_probation_duration_months:
              numberOrNull(
                formData.probationDurationMonths,
              ),

            contract_probation_renewable:
              formData.probationRenewable,

            contract_notice_duration_months:
              numberOrNull(
                formData.noticeDurationMonths,
              ),

            contract_status:
              formData.contractStatus,

            contract_comments:
              emptyToNull(
                formData.contractComments,
              ),
          } as never,
        ) as any
      );

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },

    onSuccess: async () => {
      setSuccessMessage(
        "Le collaborateur et son contrat ont été créés.",
      );

      setFormData(initialFormData);

      await onCreated();
    },
  });

  function updateField<K extends keyof FormData>(
    field: K,
    value: FormData[K],
  ) {
    setFormData((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSuccessMessage("");

    if (
      formData.firstName.trim().length === 0 ||
      formData.lastName.trim().length === 0
    ) {
      return;
    }

    createMemberMutation.mutate();
  }

  function handleClose() {
    if (createMemberMutation.isPending) {
      return;
    }

    setFormData(initialFormData);
    setSuccessMessage("");
    createMemberMutation.reset();
    onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Ajouter un membre
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Création de la fiche collaborateur, du
              contrat et de son modèle de coût.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={createMemberMutation.isPending}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Fermer le formulaire"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {referencesLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-500" />

              <p className="mt-3 text-sm text-slate-500">
                Chargement des référentiels RH...
              </p>
            </div>
          </div>
        ) : referencesError ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Impossible de charger le formulaire
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {referencesError instanceof Error
                      ? referencesError.message
                      : "Une erreur inconnue est survenue."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="max-h-[calc(100vh-190px)] space-y-5 overflow-y-auto p-6">
              {successMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      {successMessage}
                    </p>
                  </div>
                </div>
              )}

              {createMemberMutation.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <p className="text-sm text-red-700 dark:text-red-300">
                      {createMemberMutation.error instanceof
                      Error
                        ? createMemberMutation.error.message
                        : "La création a échoué."}
                    </p>
                  </div>
                </div>
              )}

              <FormSection
                title="Identité"
                description="Informations civiles et coordonnées du collaborateur."
                icon={UserRound}
              >
                <Field label="Civilité">
                  <select
                    value={formData.title}
                    onChange={(event) =>
                      updateField(
                        "title",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseignée
                    </option>
                    <option value="Madame">
                      Madame
                    </option>
                    <option value="Monsieur">
                      Monsieur
                    </option>
                    <option value="Autre">
                      Autre
                    </option>
                  </select>
                </Field>

                <Field label="Nom d’usage">
                  <input
                    value={formData.preferredName}
                    onChange={(event) =>
                      updateField(
                        "preferredName",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Prénom" required>
                  <input
                    required
                    value={formData.firstName}
                    onChange={(event) =>
                      updateField(
                        "firstName",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Nom" required>
                  <input
                    required
                    value={formData.lastName}
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Date de naissance">
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(event) =>
                      updateField(
                        "birthDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Ville de naissance">
                  <input
                    value={formData.birthCity}
                    onChange={(event) =>
                      updateField(
                        "birthCity",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Email professionnel">
                  <input
                    type="email"
                    value={
                      formData.professionalEmail
                    }
                    onChange={(event) =>
                      updateField(
                        "professionalEmail",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Téléphone professionnel">
                  <input
                    value={
                      formData.professionalPhone
                    }
                    onChange={(event) =>
                      updateField(
                        "professionalPhone",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Email personnel">
                  <input
                    type="email"
                    value={formData.personalEmail}
                    onChange={(event) =>
                      updateField(
                        "personalEmail",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Téléphone personnel">
                  <input
                    value={formData.personalPhone}
                    onChange={(event) =>
                      updateField(
                        "personalPhone",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>
              </FormSection>

              <FormSection
                title="Rattachement professionnel"
                description="Site, service, métier, fonction et responsable hiérarchique."
                icon={BriefcaseBusiness}
              >
                <Field label="Site">
                  <select
                    value={formData.siteId}
                    onChange={(event) =>
                      updateField(
                        "siteId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseigné
                    </option>

                    {references?.sites.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Département / Service">
                  <select
                    value={formData.departmentId}
                    onChange={(event) =>
                      updateField(
                        "departmentId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseigné
                    </option>

                    {references?.departments.map(
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
                </Field>

                <Field label="Métier">
                  <select
                    value={formData.jobId}
                    onChange={(event) =>
                      updateField(
                        "jobId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseigné
                    </option>

                    {references?.jobs.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Fonction">
                  <select
                    value={formData.functionId}
                    onChange={(event) =>
                      updateField(
                        "functionId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseignée
                    </option>

                    {references?.functions.map(
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
                </Field>

                <Field label="Manager N+1">
                  <select
                    value={formData.managerId}
                    onChange={(event) =>
                      updateField(
                        "managerId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Aucun manager
                    </option>

                    {references?.managers.map(
                      (manager) => (
                        <option
                          key={manager.id}
                          value={manager.id}
                        >
                          {manager.full_name} —{" "}
                          {manager.employee_number}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Date d’arrivée">
                  <input
                    type="date"
                    value={formData.arrivalDate}
                    onChange={(event) => {
                      updateField(
                        "arrivalDate",
                        event.target.value,
                      );

                      if (
                        !formData.contractStartDate
                      ) {
                        updateField(
                          "contractStartDate",
                          event.target.value,
                        );
                      }

                      if (
                        !formData.probationStartDate
                      ) {
                        updateField(
                          "probationStartDate",
                          event.target.value,
                        );
                      }
                    }}
                    className={inputClassName}
                  />
                </Field>

                <Field label="Années d’expérience">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.experienceYears}
                    onChange={(event) =>
                      updateField(
                        "experienceYears",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Statut du membre">
                  <select
                    value={formData.employmentStatus}
                    onChange={(event) =>
                      updateField(
                        "employmentStatus",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
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
                  </select>
                </Field>
              </FormSection>

              <FormSection
                title="Contrat et temps de travail"
                description="Conditions contractuelles et capacité de la ressource."
                icon={CalendarDays}
              >
                <Field label="Type de contrat">
                  <select
                    value={formData.contractTypeId}
                    onChange={(event) =>
                      updateField(
                        "contractTypeId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Aucun contrat
                    </option>

                    {references?.contractTypes.map(
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
                </Field>

                <Field label="Rythme de travail">
                  <select
                    value={formData.workScheduleId}
                    onChange={(event) =>
                      updateField(
                        "workScheduleId",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="">
                      Non renseigné
                    </option>

                    {references?.workSchedules.map(
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
                </Field>

                <Field label="Début du contrat">
                  <input
                    type="date"
                    value={formData.contractStartDate}
                    onChange={(event) =>
                      updateField(
                        "contractStartDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Fin du contrat">
                  <input
                    type="date"
                    value={formData.contractEndDate}
                    onChange={(event) =>
                      updateField(
                        "contractEndDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Temps de travail">
                  <select
                    value={formData.workingTimeType}
                    onChange={(event) =>
                      updateField(
                        "workingTimeType",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  >
                    <option value="full_time">
                      Temps plein
                    </option>
                    <option value="part_time">
                      Temps partiel
                    </option>
                    <option value="annual_days">
                      Forfait jours
                    </option>
                    <option value="custom">
                      Personnalisé
                    </option>
                  </select>
                </Field>

                <Field label="Taux d’activité (%)">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={
                      formData.activityRatePercent
                    }
                    onChange={(event) =>
                      updateField(
                        "activityRatePercent",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>
              </FormSection>

              <HrCompensationFields
                value={formData.compensation}
                chargeProfiles={
                  references?.chargeProfiles ?? []
                }
                onChange={(compensation) =>
                  updateField(
                    "compensation",
                    compensation,
                  )
                }
              />

              <FormSection
                title="Période d’essai"
                description="Paramètres utilisés pour planifier les futurs entretiens de suivi."
                icon={CalendarDays}
              >
                <Field label="Début de période d’essai">
                  <input
                    type="date"
                    value={
                      formData.probationStartDate
                    }
                    onChange={(event) =>
                      updateField(
                        "probationStartDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Fin de période d’essai">
                  <input
                    type="date"
                    value={formData.probationEndDate}
                    onChange={(event) =>
                      updateField(
                        "probationEndDate",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Durée en mois">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      formData.probationDurationMonths
                    }
                    onChange={(event) =>
                      updateField(
                        "probationDurationMonths",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Durée de préavis en mois">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      formData.noticeDurationMonths
                    }
                    onChange={(event) =>
                      updateField(
                        "noticeDurationMonths",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 sm:col-span-2 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      formData.probationRenewable
                    }
                    onChange={(event) =>
                      updateField(
                        "probationRenewable",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />

                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    La période d’essai peut être
                    renouvelée
                  </span>
                </label>
              </FormSection>

              <FormSection
                title="Adresse et commentaires"
                description="Coordonnées personnelles et informations complémentaires."
                icon={BriefcaseBusiness}
              >
                <Field label="Adresse" fullWidth>
                  <input
                    value={formData.addressLine1}
                    onChange={(event) =>
                      updateField(
                        "addressLine1",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Complément d’adresse" fullWidth>
                  <input
                    value={formData.addressLine2}
                    onChange={(event) =>
                      updateField(
                        "addressLine2",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Code postal">
                  <input
                    value={formData.postalCode}
                    onChange={(event) =>
                      updateField(
                        "postalCode",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field label="Ville">
                  <input
                    value={formData.city}
                    onChange={(event) =>
                      updateField(
                        "city",
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </Field>

                <Field
                  label="Commentaires sur le membre"
                  fullWidth
                >
                  <textarea
                    value={formData.comments}
                    onChange={(event) =>
                      updateField(
                        "comments",
                        event.target.value,
                      )
                    }
                    className={textareaClassName}
                  />
                </Field>

                <Field
                  label="Commentaires sur le contrat"
                  fullWidth
                >
                  <textarea
                    value={formData.contractComments}
                    onChange={(event) =>
                      updateField(
                        "contractComments",
                        event.target.value,
                      )
                    }
                    className={textareaClassName}
                  />
                </Field>
              </FormSection>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={handleClose}
                disabled={
                  createMemberMutation.isPending
                }
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={
                  createMemberMutation.isPending ||
                  formData.firstName.trim().length ===
                    0 ||
                  formData.lastName.trim().length ===
                    0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {createMemberMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <UserRound className="h-4 w-4" />
                    Créer le membre
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}