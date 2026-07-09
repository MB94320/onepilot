"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock3,
  Edit3,
  FileCheck2,
  Grid2X2,
  List,
  MoreHorizontal,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

export type HrAbsenceRequestRow = {
  id: string;
  organization_id: string;

  employee_id: string;
  employee_number: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_name: string | null;
  photo_url: string | null;
  professional_email: string | null;

  site_id: string | null;
  site_name: string | null;
  site_country_code: string | null;

  department_id: string | null;
  department_name: string | null;

  manager_employee_id: string | null;
  manager_name: string | null;

  contract_type_id: string | null;
  contract_type_name: string | null;

  work_schedule_id: string | null;
  work_schedule_name: string | null;

  holiday_calendar_id: string | null;
  holiday_calendar_name: string | null;
  holiday_country_code: string | null;
  holiday_region_code: string | null;

  absence_type_id: string;
  absence_type_code: string | null;
  absence_type_name: string | null;
  absence_category: string | null;
  absence_unit: string | null;
  absence_color: string | null;

  reduces_capacity: boolean | null;
  requires_manager_approval: boolean | null;
  requires_hr_review: boolean | null;
  hr_review_is_blocking: boolean | null;
  requires_document: boolean | null;
  is_paid: boolean | null;

  balance_id: string | null;

  start_date: string;
  end_date: string;
  start_period: string;
  end_period: string;

  calendar_days: number | null;
  working_days: number | null;
  holiday_days: number | null;
  non_working_days: number | null;
  requested_amount: number;

  calculation_details:
    | Record<string, unknown>
    | null;

  reason: string | null;
  employee_comment: string | null;
  manager_comment: string | null;
  hr_comment: string | null;

  document_url: string | null;
  document_name: string | null;

  status: string;

  submitted_at: string | null;
  manager_reviewed_at: string | null;
  manager_reviewed_by: string | null;
  hr_reviewed_at: string | null;
  hr_reviewed_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;

  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;

  balance_period_start: string | null;
  balance_period_end: string | null;

  annual_entitlement: number | null;
  opening_balance: number | null;
  carried_over_amount: number | null;
  accrued_amount: number | null;
  adjustment_amount: number | null;
  consumed_amount: number | null;
  pending_amount: number | null;
  available_balance: number | null;
};

type DisplayMode =
  | "cards"
  | "table";

type HrAbsenceRequestTableProps = {
  requests: HrAbsenceRequestRow[];
  totalCount?: number;

  onEdit: (
    request: HrAbsenceRequestRow,
  ) => void;

  onCancel: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onArchive: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onRestore: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;
};

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

const periodLabels: Record<
  string,
  string
> = {
  full_day: "Journée entière",
  morning: "Matin",
  afternoon: "Après-midi",
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

function getStatusLabel(
  status: string,
) {
  return (
    statusLabels[status] ??
    status
  );
}

function getPeriodLabel(
  period: string,
) {
  return (
    periodLabels[period] ??
    period
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

function getStatusBadgeClasses(
  status: string,
) {
  const classes: Record<
    string,
    string
  > = {
    draft:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",

    submitted:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",

    manager_approved:
      "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",

    approved:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",

    rejected:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",

    cancelled:
      "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
  };

  return (
    classes[status] ??
    classes.draft
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

function EmployeeAvatar({
  request,
  compact = false,
}: {
  request: HrAbsenceRequestRow;
  compact?: boolean;
}) {
  const initials = getInitials(
    request.first_name,
    request.last_name,
    request.employee_name,
  );

  const sizeClassName =
    compact
      ? "h-9 w-9 text-[11px]"
      : "h-10 w-10 text-xs";

  if (request.photo_url) {
    return (
      <img
        src={request.photo_url}
        alt={
          request.employee_name ??
          "Collaborateur"
        }
        className={`${sizeClassName} shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClassName} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

function RequestActions({
  request,
  onEdit,
  onCancel,
  onArchive,
  onRestore,
}: {
  request: HrAbsenceRequestRow;

  onEdit: (
    request: HrAbsenceRequestRow,
  ) => void;

  onCancel: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onArchive: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onRestore: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;
}) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const canEdit =
    !request.is_archived &&
    [
      "draft",
      "submitted",
      "rejected",
    ].includes(request.status);

  const canCancel =
    !request.is_archived &&
    ![
      "cancelled",
      "rejected",
    ].includes(request.status);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  async function executeAction(
    action: () =>
      Promise<void> | void,
  ) {
    try {
      setIsProcessing(true);
      setIsOpen(false);

      await action();
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div
      ref={menuRef}
      className="relative inline-flex"
    >
      <button
        type="button"
        aria-label="Modifier, annuler, archiver ou réactiver la demande"
        title="Modifier, annuler, archiver ou réactiver"
        disabled={isProcessing}
        onClick={() =>
          setIsOpen(
            (current) => !current,
          )
        }
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
      >
        {isProcessing ? (
          <RotateCcw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MoreHorizontal className="h-3.5 w-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
          {request.is_archived ? (
            <button
              type="button"
              onClick={() =>
                void executeAction(
                  () =>
                    onRestore(
                      request,
                    ),
                )
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              <ArchiveRestore className="h-4 w-4" />
              Réactiver la demande
            </button>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onEdit(request);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                >
                  <Edit3 className="h-4 w-4" />
                  Modifier la demande
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() =>
                    void executeAction(
                      () =>
                        onCancel(
                          request,
                        ),
                    )
                  }
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  <XCircle className="h-4 w-4" />
                  Annuler la demande
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={() =>
                  void executeAction(
                    () =>
                      onArchive(
                        request,
                      ),
                  )
                }
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <Archive className="h-4 w-4" />
                Archiver la demande
              </button>
            </>
          )}
        </div>
      )}
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

function RequestCard({
  request,
  onEdit,
  onCancel,
  onArchive,
  onRestore,
}: {
  request: HrAbsenceRequestRow;

  onEdit: (
    request: HrAbsenceRequestRow,
  ) => void;

  onCancel: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onArchive: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;

  onRestore: (
    request: HrAbsenceRequestRow,
  ) => Promise<void> | void;
}) {
  const requestedAmount =
    toNumber(
      request.requested_amount,
    );

  const availableBalance =
    toNumber(
      request.available_balance,
    );

  const unitLabel =
    getUnitLabel(
      request.absence_unit,
      requestedAmount,
    );

  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 ${
        request.is_archived
          ? "opacity-75"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <EmployeeAvatar
            request={request}
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {request.employee_name ??
                "Collaborateur non renseigné"}
            </p>

            <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {request.employee_number ??
                "Matricule non renseigné"}
            </p>

            <p className="mt-1 truncate text-[11px] text-slate-400">
              {request.department_name ??
                "Service non renseigné"}
              {" · "}
              {request.site_name ??
                "Site non renseigné"}
            </p>
          </div>
        </div>

        <RequestActions
          request={request}
          onEdit={onEdit}
          onCancel={onCancel}
          onArchive={onArchive}
          onRestore={onRestore}
        />
      </div>

      <div className="mt-4 flex items-start gap-2.5">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500"
          style={
            request.absence_color
              ? {
                  backgroundColor:
                    request.absence_color,
                }
              : undefined
          }
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
            {request.absence_type_name ??
              "Type non renseigné"}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            {request.absence_type_code ??
              "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Période
          </p>

          <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            {formatDate(
              request.start_date,
            )}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            au{" "}
            {formatDate(
              request.end_date,
            )}
          </p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
            Décompte
          </p>

          <p className="mt-1 text-sm font-black text-indigo-700 dark:text-indigo-300">
            {formatNumber(
              requestedAmount,
            )}{" "}
            {unitLabel}
          </p>

          <p className="mt-0.5 text-[11px] text-indigo-500 dark:text-indigo-300">
            {formatNumber(
              request.holiday_days,
            )}{" "}
            férié
            {toNumber(
              request.holiday_days,
            ) > 1
              ? "s"
              : ""}{" "}
            exclu
            {toNumber(
              request.holiday_days,
            ) > 1
              ? "s"
              : ""}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            Calendrier
          </p>

          <p className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
            {request.holiday_calendar_name ??
              "Calendrier par défaut"}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {request.work_schedule_name ??
              "Base standard 7 h"}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
          <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            Solde restant
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
            {getUnitLabel(
              request.absence_unit,
              availableBalance,
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${getStatusBadgeClasses(
            request.status,
          )}`}
        >
          {getStatusLabel(
            request.status,
          )}
        </span>

        {request.document_url ? (
          <a
            href={
              request.document_url
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            Justificatif
          </a>
        ) : (
          <span className="text-xs font-semibold text-slate-400">
            Aucun justificatif
          </span>
        )}
      </div>
    </article>
  );
}

function RequestTable({
  requests,
  onEdit,
  onCancel,
  onArchive,
  onRestore,
}: HrAbsenceRequestTableProps) {
  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full min-w-[1420px] border-collapse">
        <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur dark:bg-slate-900/95">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="sticky left-0 z-30 bg-slate-50/95 px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[1px_0_0_0_rgba(148,163,184,0.25)] dark:bg-slate-900/95">
              Collaborateur
            </th>

            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Absence
            </th>

            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Période
            </th>

            <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
              Décompte
            </th>

            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Calendrier
            </th>

            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Rattachement
            </th>

            <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
              Solde
            </th>

            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
              Statut
            </th>

            <th className="px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
              Justif.
            </th>

            <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {requests.map(
            (request) => {
              const requestedAmount =
                toNumber(
                  request.requested_amount,
                );

              const availableBalance =
                toNumber(
                  request.available_balance,
                );

              const unitLabel =
                getUnitLabel(
                  request.absence_unit,
                  requestedAmount,
                );

              const periodDescription =
                request.start_period ===
                request.end_period
                  ? getPeriodLabel(
                      request.start_period,
                    )
                  : `${getPeriodLabel(
                      request.start_period,
                    )} → ${getPeriodLabel(
                      request.end_period,
                    )}`;

              return (
                <tr
                  key={request.id}
                  className={`group transition ${
                    request.is_archived
                      ? "bg-slate-50/70 opacity-75 dark:bg-slate-900/40"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgba(148,163,184,0.18)] dark:bg-slate-950">
                    <div className="flex min-w-[230px] items-center gap-2.5">
                      <EmployeeAvatar
                        request={
                          request
                        }
                        compact
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                            {request.employee_name ??
                              "Collaborateur non renseigné"}
                          </p>

                          {request.is_archived && (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                              Archivée
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {request.employee_number ??
                            "Matricule non renseigné"}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {request.professional_email ??
                            "Email non renseigné"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex min-w-[170px] items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500"
                        style={
                          request.absence_color
                            ? {
                                backgroundColor:
                                  request.absence_color,
                              }
                            : undefined
                        }
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                          {request.absence_type_name ??
                            "Type non renseigné"}
                        </p>

                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {request.absence_type_code ??
                            "—"}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {request.contract_type_name ??
                            "Contrat non renseigné"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="min-w-[170px]">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatDate(
                          request.start_date,
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        au{" "}
                        {formatDate(
                          request.end_date,
                        )}
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                        {periodDescription}
                      </p>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right">
                    <div className="min-w-[115px]">
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {formatNumber(
                          requestedAmount,
                        )}{" "}
                        {unitLabel}
                      </p>

                      <div className="mt-1.5 space-y-0.5 text-[10px] font-semibold text-slate-400">
                        <p>
                          {formatNumber(
                            request.calendar_days,
                          )}{" "}
                          calendaires
                        </p>

                        <p className="text-amber-600 dark:text-amber-300">
                          {formatNumber(
                            request.holiday_days,
                          )}{" "}
                          férié
                          {toNumber(
                            request.holiday_days,
                          ) > 1
                            ? "s"
                            : ""}{" "}
                          exclu
                          {toNumber(
                            request.holiday_days,
                          ) > 1
                            ? "s"
                            : ""}
                        </p>

                        <p>
                          {formatNumber(
                            request.non_working_days,
                          )}{" "}
                          non travaillé
                          {toNumber(
                            request.non_working_days,
                          ) > 1
                            ? "s"
                            : ""}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="min-w-[175px]">
                      <div className="flex items-center gap-2">
                        <CalendarOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />

                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {request.holiday_calendar_name ??
                            "Calendrier par défaut"}
                        </p>
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {request.holiday_country_code ??
                          request.site_country_code ??
                          "Pays non renseigné"}
                        {request.holiday_region_code
                          ? ` · ${request.holiday_region_code}`
                          : ""}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />

                        <span className="truncate">
                          {request.work_schedule_name ??
                            "Base standard 7 h"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="min-w-[170px]">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {request.department_name ??
                          "Service non renseigné"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {request.site_name ??
                          "Site non renseigné"}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        Manager :{" "}
                        {request.manager_name ??
                          "non renseigné"}
                      </p>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-right">
                    <div className="min-w-[110px]">
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
                        {getUnitLabel(
                          request.absence_unit,
                          availableBalance,
                        )}
                      </p>

                      <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-400">
                        <p>
                          Droit :{" "}
                          {formatNumber(
                            request.annual_entitlement,
                          )}
                        </p>

                        <p>
                          En attente :{" "}
                          {formatNumber(
                            request.pending_amount,
                          )}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="min-w-[135px]">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${getStatusBadgeClasses(
                          request.status,
                        )}`}
                      >
                        {getStatusLabel(
                          request.status,
                        )}
                      </span>

                      {request.status ===
                        "approved" && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Terminé
                        </div>
                      )}

                      {request.status ===
                        "cancelled" && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Sans solde
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    {request.document_url ? (
                      <a
                        href={
                          request.document_url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                        title={
                          request.document_name ??
                          "Consulter le justificatif"
                        }
                      >
                        <FileCheck2 className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Aucun
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <RequestActions
                      request={request}
                      onEdit={onEdit}
                      onCancel={
                        onCancel
                      }
                      onArchive={
                        onArchive
                      }
                      onRestore={
                        onRestore
                      }
                    />
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function HrAbsenceRequestTable({
  requests,
  totalCount,
  onEdit,
  onCancel,
  onArchive,
  onRestore,
}: HrAbsenceRequestTableProps) {
  const [
    displayMode,
    setDisplayMode,
  ] =
    useState<DisplayMode>(
      "cards",
    );

  const effectiveTotalCount =
    totalCount ?? requests.length;

  const sortedRequests =
    useMemo(
      () => requests,
      [requests],
    );

  return (
    <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <CalendarDays
                className="h-4 w-4"
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Demandes d’absence
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {requests.length} résultat
                {requests.length > 1
                  ? "s"
                  : ""}{" "}
                sur {effectiveTotalCount}
              </p>
            </div>
          </div>

          <ViewSwitch
            mode={displayMode}
            onChange={setDisplayMode}
          />
        </div>
      </div>

      {sortedRequests.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Search className="mx-auto h-8 w-8 text-indigo-400" />

          <h3 className="mt-4 text-base font-black text-slate-950 dark:text-white">
            Aucune demande trouvée
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Modifie ou réinitialise les filtres pour afficher d’autres demandes d’absence.
          </p>
        </div>
      ) : displayMode ===
        "cards" ? (
        <div className="grid gap-4 p-5 md:grid-cols-2 2xl:grid-cols-3">
          {sortedRequests.map(
            (request) => (
              <RequestCard
                key={request.id}
                request={request}
                onEdit={onEdit}
                onCancel={
                  onCancel
                }
                onArchive={
                  onArchive
                }
                onRestore={
                  onRestore
                }
              />
            ),
          )}
        </div>
      ) : (
        <RequestTable
          requests={
            sortedRequests
          }
          totalCount={
            effectiveTotalCount
          }
          onEdit={onEdit}
          onCancel={
            onCancel
          }
          onArchive={
            onArchive
          }
          onRestore={
            onRestore
          }
        />
      )}
    </section>
  );
}