"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CalendarOff,
  Check,
  Clock3,
  FileText,
  Loader2,
  Send,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import type { HrAbsenceRequestRow } from "@/components/hr/HrAbsenceRequestTable";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type EmployeeReference = {
  id: string;
  employee_number: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  manager_id: string | null;
  manager_name: string | null;
  site_name: string | null;
  department_name: string | null;
  contract_type_name: string | null;
  work_schedule_name: string | null;
};

type AbsenceTypeReference = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  color: string | null;

  requires_document: boolean | null;
  requires_manager_approval: boolean | null;
  requires_hr_review: boolean | null;
  hr_review_is_blocking: boolean | null;

  is_paid: boolean | null;
  reduces_capacity: boolean | null;
  is_active: boolean | null;
};

type CalculationPreview = {
  calendar_days: number;
  working_days: number;
  holiday_days: number;
  non_working_days: number;
  requested_amount: number;

  holiday_calendar_id: string | null;
  work_schedule_id: string | null;
  contract_type_id: string | null;

  calculation_details:
    | Record<string, unknown>
    | null;
};

type BalancePreview = {
  id: string;

  period_start: string;
  period_end: string;

  annual_entitlement: number;
  opening_balance: number;
  carried_over_amount: number;
  accrued_amount: number;
  adjustment_amount: number;
  consumed_amount: number;
  pending_amount: number;

  available_balance: number;
};

type FormState = {
  employeeId: string;
  absenceTypeId: string;

  startDate: string;
  endDate: string;

  startPeriod: string;
  endPeriod: string;

  reason: string;
  employeeComment: string;
};

type SubmitMode =
  | "draft"
  | "submitted";

type HrAbsenceRequestFormProps = {
  organizationId: string;
  isOpen: boolean;

  request?: HrAbsenceRequestRow | null;

  onClose: () => void;

  onSaved: () =>
    | Promise<void>
    | void;
};

const emptyForm: FormState = {
  employeeId: "",
  absenceTypeId: "",

  startDate: "",
  endDate: "",

  startPeriod: "full_day",
  endPeriod: "full_day",

  reason: "",
  employeeComment: "",
};

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const selectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const textareaClassName =
  "min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

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

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
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
    return "—";
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
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

function getEmployeeName(
  employee: EmployeeReference,
) {
  if (
    employee.full_name?.trim()
  ) {
    return employee.full_name.trim();
  }

  return [
    employee.first_name,
    employee.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getInitials(
  employee: EmployeeReference,
) {
  const firstInitial =
    employee.first_name
      ?.trim()
      .charAt(0)
      .toUpperCase() ?? "";

  const lastInitial =
    employee.last_name
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
    getEmployeeName(employee)
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

function parseCalculationRow(
  row: any,
): CalculationPreview {
  return {
    calendar_days: toNumber(
      row?.calendar_days,
    ),

    working_days: toNumber(
      row?.working_days,
    ),

    holiday_days: toNumber(
      row?.holiday_days,
    ),

    non_working_days:
      toNumber(
        row?.non_working_days,
      ),

    requested_amount:
      toNumber(
        row?.requested_amount,
      ),

    holiday_calendar_id:
      row?.holiday_calendar_id ??
      null,

    work_schedule_id:
      row?.work_schedule_id ??
      null,

    contract_type_id:
      row?.contract_type_id ??
      null,

    calculation_details:
      row?.calculation_details &&
      typeof row.calculation_details ===
        "object"
        ? row.calculation_details
        : null,
  };
}

function parseCompositeCalculation(
  value: unknown,
): CalculationPreview | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !normalized.startsWith("(") ||
    !normalized.endsWith(")")
  ) {
    return null;
  }

  const innerValue =
    normalized.slice(1, -1);

  const values: string[] = [];

  let currentValue = "";
  let insideQuotes = false;
  let escaped = false;

  for (
    let index = 0;
    index < innerValue.length;
    index += 1
  ) {
    const character =
      innerValue[index];

    if (escaped) {
      currentValue += character;
      escaped = false;
      continue;
    }

    if (
      character === "\\"
    ) {
      escaped = true;
      currentValue += character;
      continue;
    }

    if (
      character === '"'
    ) {
      insideQuotes =
        !insideQuotes;

      currentValue += character;
      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      values.push(
        currentValue,
      );

      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);

  if (values.length < 9) {
    return null;
  }

  let calculationDetails:
    | Record<string, unknown>
    | null = null;

  const rawDetails =
  values[8]
    ?.trim()
    .replace(
      /^"([\s\S]*)"$/,
      "$1",
    )
    .replace(/""/g, '"');

  if (rawDetails) {
    try {
      calculationDetails =
        JSON.parse(rawDetails);
    } catch {
      calculationDetails =
        null;
    }
  }

  return {
    calendar_days: toNumber(
      values[0],
    ),

    working_days: toNumber(
      values[1],
    ),

    holiday_days: toNumber(
      values[2],
    ),

    non_working_days:
      toNumber(values[3]),

    requested_amount:
      toNumber(values[4]),

    holiday_calendar_id:
      values[5] || null,

    work_schedule_id:
      values[6] || null,

    contract_type_id:
      values[7] || null,

    calculation_details:
      calculationDetails,
  };
}

function getRequestFormState(
  request:
    | HrAbsenceRequestRow
    | null
    | undefined,
): FormState {
  if (!request) {
    return emptyForm;
  }

  return {
    employeeId:
      request.employee_id,

    absenceTypeId:
      request.absence_type_id,

    startDate:
      request.start_date,

    endDate:
      request.end_date,

    startPeriod:
      request.start_period,

    endPeriod:
      request.end_period,

    reason:
      request.reason ?? "",

    employeeComment:
      request.employee_comment ??
      "",
  };
}

export default function HrAbsenceRequestForm({
  organizationId,
  isOpen,
  request = null,
  onClose,
  onSaved,
}: HrAbsenceRequestFormProps) {
  const isEditing =
    Boolean(request?.id);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm,
  );

  const [
    employees,
    setEmployees,
  ] = useState<
    EmployeeReference[]
  >([]);

  const [
    absenceTypes,
    setAbsenceTypes,
  ] = useState<
    AbsenceTypeReference[]
  >([]);

  const [
    calculation,
    setCalculation,
  ] =
    useState<CalculationPreview | null>(
      null,
    );

  const [
    balance,
    setBalance,
  ] =
    useState<BalancePreview | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null,
  );

  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (employee) =>
            employee.id ===
            form.employeeId,
        ) ?? null,
      [
        employees,
        form.employeeId,
      ],
    );

  const selectedAbsenceType =
    useMemo(
      () =>
        absenceTypes.find(
          (absenceType) =>
            absenceType.id ===
            form.absenceTypeId,
        ) ?? null,
      [
        absenceTypes,
        form.absenceTypeId,
      ],
    );

  const remainingAfterRequest =
    useMemo(() => {
      if (
        !balance ||
        !calculation
      ) {
        return null;
      }

      const currentAvailable =
        toNumber(
          balance.available_balance,
        );

      /*
       * Lors d'une modification, le montant de la demande actuelle
       * est déjà potentiellement comptabilisé dans le solde.
       * On le réintègre avant d'appliquer le nouveau calcul.
       */
      const originalReservedAmount =
        request &&
        [
          "submitted",
          "manager_approved",
          "approved",
        ].includes(request.status)
          ? toNumber(
              request.requested_amount,
            )
          : 0;

      return (
        currentAvailable +
        originalReservedAmount -
        calculation.requested_amount
      );
    }, [
      balance,
      calculation,
      request,
    ]);

  const updateField = useCallback(
    <
      Key extends keyof FormState,
    >(
      field: Key,
      value: FormState[Key],
    ) => {
      setForm(
        (currentForm) => ({
          ...currentForm,
          [field]: value,
        }),
      );
    },
    [],
  );

  const loadReferences =
    useCallback(async () => {
      if (!organizationId) {
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const [
          employeesResult,
          absenceTypesResult,
        ] = await Promise.all([
          (
            supabase.from(
              "hr_employee_overview" as never,
            ) as any
          )
            .select(
              `
                id,
                employee_number,
                first_name,
                last_name,
                full_name,
                manager_id,
                manager_name,
                site_name,
                department_name,
                contract_type_name,
                work_schedule_name
              `,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .eq(
              "is_active",
              true,
            )
            .order(
              "last_name",
              {
                ascending: true,
              },
            )
            .order(
              "first_name",
              {
                ascending: true,
              },
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
                unit,
                color,
                requires_document,
                requires_manager_approval,
                requires_hr_review,
                hr_review_is_blocking,
                is_paid,
                reduces_capacity,
                is_active
              `,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .eq(
              "is_active",
              true,
            )
            .order(
              "name",
              {
                ascending: true,
              },
            ),
        ]);

        if (
          employeesResult.error
        ) {
          throw new Error(
            employeesResult.error
              .message,
          );
        }

        if (
          absenceTypesResult.error
        ) {
          throw new Error(
            absenceTypesResult.error
              .message,
          );
        }

        setEmployees(
          (
            employeesResult.data ??
            []
          ) as EmployeeReference[],
        );

        setAbsenceTypes(
          (
            absenceTypesResult.data ??
            []
          ) as AbsenceTypeReference[],
        );
      } catch (error: unknown) {
        console.error(
          "Erreur de chargement du formulaire d’absence :",
          error,
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de charger les références du formulaire.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [organizationId]);

  const loadBalance =
    useCallback(async () => {
      if (
        !form.employeeId ||
        !form.absenceTypeId ||
        !form.startDate
      ) {
        setBalance(null);
        return;
      }

      const year =
        new Date(
          `${form.startDate}T12:00:00`,
        ).getFullYear();

      if (
        !Number.isFinite(year)
      ) {
        setBalance(null);
        return;
      }

      const periodStart =
        `${year}-01-01`;

      const periodEnd =
        `${year}-12-31`;

      const {
        data,
        error,
      } = await (
        supabase.from(
          "hr_absence_balances" as never,
        ) as any
      )
        .select(
          `
            id,
            period_start,
            period_end,
            annual_entitlement,
            opening_balance,
            carried_over_amount,
            accrued_amount,
            adjustment_amount,
            consumed_amount,
            pending_amount
          `,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .eq(
          "employee_id",
          form.employeeId,
        )
        .eq(
          "absence_type_id",
          form.absenceTypeId,
        )
        .eq(
          "period_start",
          periodStart,
        )
        .eq(
          "period_end",
          periodEnd,
        )
        .maybeSingle();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      if (!data) {
        setBalance(null);
        return;
      }

      const availableBalance =
        toNumber(
          data.opening_balance,
        ) +
        toNumber(
          data.carried_over_amount,
        ) +
        toNumber(
          data.accrued_amount,
        ) +
        toNumber(
          data.adjustment_amount,
        ) -
        toNumber(
          data.consumed_amount,
        ) -
        toNumber(
          data.pending_amount,
        );

      setBalance({
        id: data.id,

        period_start:
          data.period_start,

        period_end:
          data.period_end,

        annual_entitlement:
          toNumber(
            data.annual_entitlement,
          ),

        opening_balance:
          toNumber(
            data.opening_balance,
          ),

        carried_over_amount:
          toNumber(
            data.carried_over_amount,
          ),

        accrued_amount:
          toNumber(
            data.accrued_amount,
          ),

        adjustment_amount:
          toNumber(
            data.adjustment_amount,
          ),

        consumed_amount:
          toNumber(
            data.consumed_amount,
          ),

        pending_amount:
          toNumber(
            data.pending_amount,
          ),

        available_balance:
          availableBalance,
      });
    }, [
      form.employeeId,
      form.absenceTypeId,
      form.startDate,
      organizationId,
    ]);

  const calculateRequest =
    useCallback(async () => {
      if (
        !form.employeeId ||
        !form.startDate ||
        !form.endDate
      ) {
        setCalculation(null);
        return;
      }

      try {
        setIsCalculating(true);
        setErrorMessage(null);

        const {
          data,
          error,
        } = await (
          supabase as any
        ).rpc(
          "calculate_hr_absence_amount",
          {
            target_employee_id:
              form.employeeId,

            target_start_date:
              form.startDate,

            target_end_date:
              form.endDate,

            target_start_period:
              form.startPeriod,

            target_end_period:
              form.endPeriod,
          },
        );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        let calculated:
          | CalculationPreview
          | null = null;

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          calculated =
            parseCalculationRow(
              data[0],
            );
        } else if (
          data &&
          typeof data ===
            "object" &&
          !Array.isArray(data)
        ) {
          calculated =
            parseCalculationRow(
              data,
            );
        } else {
          calculated =
            parseCompositeCalculation(
              data,
            );
        }

        if (!calculated) {
          throw new Error(
            "Le calcul automatique n’a retourné aucun résultat exploitable.",
          );
        }

        setCalculation(
          calculated,
        );

        await loadBalance();
      } catch (error: unknown) {
        console.error(
          "Erreur de calcul de l’absence :",
          error,
        );

        setCalculation(null);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de calculer les jours d’absence.",
        );
      } finally {
        setIsCalculating(false);
      }
    }, [
      form.employeeId,
      form.startDate,
      form.endDate,
      form.startPeriod,
      form.endPeriod,
      loadBalance,
    ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(
      getRequestFormState(
        request,
      ),
    );

    setCalculation(
      request
        ? {
            calendar_days:
              toNumber(
                request.calendar_days,
              ),

            working_days:
              toNumber(
                request.working_days,
              ),

            holiday_days:
              toNumber(
                request.holiday_days,
              ),

            non_working_days:
              toNumber(
                request.non_working_days,
              ),

            requested_amount:
              toNumber(
                request.requested_amount,
              ),

            holiday_calendar_id:
              request.holiday_calendar_id,

            work_schedule_id:
              request.work_schedule_id,

            contract_type_id:
              request.contract_type_id,

            calculation_details:
              request.calculation_details,
          }
        : null,
    );

    setBalance(
      request?.balance_id
        ? {
            id:
              request.balance_id,

            period_start:
              request.balance_period_start ??
              "",

            period_end:
              request.balance_period_end ??
              "",

            annual_entitlement:
              toNumber(
                request.annual_entitlement,
              ),

            opening_balance:
              toNumber(
                request.opening_balance,
              ),

            carried_over_amount:
              toNumber(
                request.carried_over_amount,
              ),

            accrued_amount:
              toNumber(
                request.accrued_amount,
              ),

            adjustment_amount:
              toNumber(
                request.adjustment_amount,
              ),

            consumed_amount:
              toNumber(
                request.consumed_amount,
              ),

            pending_amount:
              toNumber(
                request.pending_amount,
              ),

            available_balance:
              toNumber(
                request.available_balance,
              ),
          }
        : null,
    );

    setErrorMessage(null);
    setSuccessMessage(null);

    void loadReferences();
  }, [
    isOpen,
    request,
    loadReferences,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (
      !form.employeeId ||
      !form.startDate ||
      !form.endDate
    ) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        void calculateRequest();
      }, 350);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    isOpen,
    form.employeeId,
    form.startDate,
    form.endDate,
    form.startPeriod,
    form.endPeriod,
    calculateRequest,
  ]);

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent,
    ) {
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
  }, [
    isOpen,
    isSubmitting,
    onClose,
  ]);

  async function submitRequest(
    mode: SubmitMode,
  ) {
    if (
      !form.employeeId ||
      !form.absenceTypeId ||
      !form.startDate ||
      !form.endDate
    ) {
      setErrorMessage(
        "Le collaborateur, le type d’absence et les dates sont obligatoires.",
      );

      return;
    }

    const startDate =
      new Date(
        `${form.startDate}T12:00:00`,
      );

    const endDate =
      new Date(
        `${form.endDate}T12:00:00`,
      );

    if (endDate < startDate) {
      setErrorMessage(
        "La date de fin ne peut pas précéder la date de début.",
      );

      return;
    }

    if (
      !calculation ||
      calculation.requested_amount <=
        0
    ) {
      setErrorMessage(
        "La période ne contient aucun jour travaillé décomptable.",
      );

      return;
    }

    if (
      form.startDate ===
        form.endDate &&
      form.startPeriod ===
        "afternoon" &&
      form.endPeriod ===
        "morning"
    ) {
      setErrorMessage(
        "La période de fin ne peut pas précéder la période de début.",
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

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

      const userId =
        userData.user?.id ??
        null;

      const payload = {
        organization_id:
          organizationId,

        employee_id:
          form.employeeId,

        absence_type_id:
          form.absenceTypeId,

        balance_id: null,
        
        manager_employee_id:
          selectedEmployee?.manager_id ??
          null,

        start_date:
          form.startDate,

        end_date:
          form.endDate,

        start_period:
          form.startPeriod,

        end_period:
          form.endPeriod,

        /*
         * Le trigger Supabase recalcule cette valeur.
         * Elle est transmise pour satisfaire la colonne obligatoire.
         */
        requested_amount:
          calculation.requested_amount,

        reason:
          form.reason.trim() ||
          null,

        employee_comment:
          form.employeeComment.trim() ||
          null,

        status: mode,

        submitted_at:
          mode === "submitted"
            ? new Date().toISOString()
            : null,

        updated_by: userId,
      };

      if (
        request?.id
      ) {
        const {
          error: updateError,
        } = await (
          supabase.from(
            "hr_absence_requests" as never,
          ) as any
        )
          .update(payload)
          .eq(
            "id",
            request.id,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }
      } else {
        const {
          error: insertError,
        } = await (
          supabase.from(
            "hr_absence_requests" as never,
          ) as any
        ).insert({
          ...payload,
          created_by: userId,
        });

        if (insertError) {
          throw new Error(
            insertError.message,
          );
        }
      }

      setSuccessMessage(
        request?.id
          ? mode === "submitted"
            ? "La demande a été modifiée et envoyée à validation."
            : "Le brouillon a été mis à jour."
          : mode === "submitted"
            ? "La demande a été envoyée à validation."
            : "La demande a été enregistrée en brouillon.",
      );

      await onSaved();

      window.setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: unknown) {
      console.error(
        "Erreur d’enregistrement de la demande d’absence :",
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "La demande d’absence n’a pas pu être enregistrée.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    void submitRequest(
      "submitted",
    );
  }

  if (!isOpen) {
    return null;
  }

  const requestedAmount =
    calculation?.requested_amount ??
    0;

  const unitLabel =
    getUnitLabel(
      selectedAbsenceType?.unit ??
        request?.absence_unit ??
        "day",
      requestedAmount,
    );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Fermer le formulaire"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <aside className="relative flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <CalendarDays
                className="h-4 w-4"
                strokeWidth={1.9}
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                {isEditing
                  ? "Modification"
                  : "Nouvelle demande"}
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {isEditing
                  ? "Modifier l’absence ou le congé"
                  : "Ajouter une absence ou un congé"}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Les jours travaillés et les jours fériés sont calculés automatiquement par Supabase.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

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
                    Chargement du formulaire...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

                      <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                )}

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

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                    <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <UserRound
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Collaborateur et motif
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Sélectionne le collaborateur et le type d’absence.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>
                        Collaborateur
                      </FieldLabel>

                      <select
                        value={
                          form.employeeId
                        }
                        onChange={(event) =>
                          updateField(
                            "employeeId",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          selectClassName
                        }
                      >
                        <option value="">
                          Sélectionner un collaborateur
                        </option>

                        {employees.map(
                          (employee) => (
                            <option
                              key={
                                employee.id
                              }
                              value={
                                employee.id
                              }
                            >
                              {getEmployeeName(
                                employee,
                              )}

                              {employee.employee_number
                                ? ` — ${employee.employee_number}`
                                : ""}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <FieldLabel required>
                        Type d’absence
                      </FieldLabel>

                      <select
                        value={
                          form.absenceTypeId
                        }
                        onChange={(event) =>
                          updateField(
                            "absenceTypeId",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          selectClassName
                        }
                      >
                        <option value="">
                          Sélectionner un type
                        </option>

                        {absenceTypes.map(
                          (absenceType) => (
                            <option
                              key={
                                absenceType.id
                              }
                              value={
                                absenceType.id
                              }
                            >
                              {absenceType.name} —{" "}
                              {absenceType.code}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {selectedEmployee && (
                      <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-black text-white">
                            {getInitials(
                              selectedEmployee,
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                              {getEmployeeName(
                                selectedEmployee,
                              )}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {selectedEmployee.department_name ??
                                "Service non renseigné"}
                              {" · "}
                              {selectedEmployee.site_name ??
                                "Site non renseigné"}
                            </p>

                            <p className="mt-1 truncate text-[11px] text-slate-400">
                              Manager :{" "}
                              {selectedEmployee.manager_name ??
                                "non renseigné"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAbsenceType && (
                      <div className="sm:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                          Règles du type sélectionné
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                          Unité :{" "}
                          {getUnitLabel(
                            selectedAbsenceType.unit,
                            1,
                          )}
                          {" · "}
                          Validation manager :{" "}
                          {selectedAbsenceType.requires_manager_approval
                            ? "requise"
                            : "non requise"}
                          {" · "}
                          Revue RH :{" "}
                          {selectedAbsenceType.requires_hr_review
                            ? selectedAbsenceType.hr_review_is_blocking
                              ? "requise et bloquante"
                              : "requise non bloquante"
                            : "non requise"}
                          {" · "}
                          Justificatif :{" "}
                          {selectedAbsenceType.requires_document
                            ? "requis"
                            : "facultatif"}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                    <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <Clock3
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Période demandée
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Les week-ends, jours non travaillés et jours fériés sont exclus automatiquement.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel required>
                        Date de début
                      </FieldLabel>

                      <input
                        type="date"
                        value={
                          form.startDate
                        }
                        onChange={(event) =>
                          updateField(
                            "startDate",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          inputClassName
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel required>
                        Date de fin
                      </FieldLabel>

                      <input
                        type="date"
                        min={
                          form.startDate ||
                          undefined
                        }
                        value={
                          form.endDate
                        }
                        onChange={(event) =>
                          updateField(
                            "endDate",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          inputClassName
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel>
                        Début de période
                      </FieldLabel>

                      <select
                        value={
                          form.startPeriod
                        }
                        onChange={(event) =>
                          updateField(
                            "startPeriod",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          selectClassName
                        }
                      >
                        <option value="full_day">
                          Journée entière
                        </option>

                        <option value="morning">
                          Matin
                        </option>

                        <option value="afternoon">
                          Après-midi
                        </option>
                      </select>
                    </div>

                    <div>
                      <FieldLabel>
                        Fin de période
                      </FieldLabel>

                      <select
                        value={
                          form.endPeriod
                        }
                        onChange={(event) =>
                          updateField(
                            "endPeriod",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        className={
                          selectClassName
                        }
                      >
                        <option value="full_day">
                          Journée entière
                        </option>

                        <option value="morning">
                          Matin
                        </option>

                        <option value="afternoon">
                          Après-midi
                        </option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                    <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <CalendarOff
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Calcul automatique
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Décompte calculé selon le contrat, le rythme de travail et le calendrier du pays ou du site.
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    {isCalculating ? (
                      <div className="flex min-h-32 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                      </div>
                    ) : calculation ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                          <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                            Jours calendaires
                          </p>

                          <p className="mt-2 text-2xl font-black text-indigo-700 dark:text-indigo-300">
                            {formatNumber(
                              calculation.calendar_days,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                            Jours décomptés
                          </p>

                          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                            {formatNumber(
                              calculation.requested_amount,
                            )}
                          </p>

                          <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {unitLabel}
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                          <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-300">
                            Jours fériés exclus
                          </p>

                          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">
                            {formatNumber(
                              calculation.holiday_days,
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Jours non travaillés
                          </p>

                          <p className="mt-2 text-2xl font-black text-slate-700 dark:text-slate-300">
                            {formatNumber(
                              calculation.non_working_days,
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Sélectionne un collaborateur et une période pour lancer le calcul.
                      </p>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                    <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <WalletCards
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Solde du collaborateur
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Droits, consommation et solde prévisionnel après la demande.
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    {balance ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Droit annuel
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                            {formatNumber(
                              balance.annual_entitlement,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Consommé
                          </p>

                          <p className="mt-1 text-lg font-black text-rose-600 dark:text-rose-300">
                            {formatNumber(
                              balance.consumed_amount,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            En attente
                          </p>

                          <p className="mt-1 text-lg font-black text-amber-600 dark:text-amber-300">
                            {formatNumber(
                              balance.pending_amount,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Restant après demande
                          </p>

                          <p
                            className={`mt-1 text-lg font-black ${
                              remainingAfterRequest !==
                                null &&
                              remainingAfterRequest <
                                0
                                ? "text-rose-600 dark:text-rose-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {remainingAfterRequest !==
                            null
                              ? formatNumber(
                                  remainingAfterRequest,
                                )
                              : "—"}
                          </p>
                        </div>

                        <p className="sm:col-span-2 xl:col-span-4 text-[11px] text-slate-400">
                          Période du{" "}
                          {formatDate(
                            balance.period_start,
                          )}{" "}
                          au{" "}
                          {formatDate(
                            balance.period_end,
                          )}.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900">
                        <BadgeCheck className="mx-auto h-6 w-6 text-slate-400" />

                        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                          Aucun solde initialisé
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Le solde sera créé automatiquement lors de l’enregistrement si une règle de droit existe.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
                    <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                      <FileText
                        className="h-4 w-4"
                        strokeWidth={1.9}
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-950 dark:text-white">
                        Informations complémentaires
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Ajoute le motif et les informations utiles au valideur.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <FieldLabel>
                        Motif
                      </FieldLabel>

                      <input
                        value={
                          form.reason
                        }
                        onChange={(event) =>
                          updateField(
                            "reason",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        placeholder="Exemple : congés annuels, rendez-vous médical..."
                        className={
                          inputClassName
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel>
                        Commentaire
                      </FieldLabel>

                      <textarea
                        value={
                          form.employeeComment
                        }
                        onChange={(event) =>
                          updateField(
                            "employeeComment",
                            event.target.value,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
                        placeholder="Informations complémentaires destinées au manager ou aux RH..."
                        className={
                          textareaClassName
                        }
                      />
                    </div>

                    {selectedAbsenceType?.requires_document && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          Ce type d’absence exige un justificatif. La gestion des pièces jointes sera ajoutée dans le prochain lot.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={() =>
                void submitRequest(
                  "draft",
                )
              }
              disabled={
                isSubmitting ||
                isLoading ||
                isCalculating
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}

              {isEditing
                ? "Mettre à jour le brouillon"
                : "Enregistrer en brouillon"}
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoading ||
                isCalculating
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              {isSubmitting
                ? "Enregistrement..."
                : isEditing
                  ? "Mettre à jour et envoyer"
                  : "Envoyer à validation"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}