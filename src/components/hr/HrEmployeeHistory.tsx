"use client";

import {
  Archive,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FilePlus2,
  History,
  Loader2,
  PencilLine,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type AuditAction =
  | "created"
  | "updated"
  | "archived"
  | "reactivated"
  | "deleted";

type AuditEntityType =
  | "employee"
  | "contract";

type AuditLog = {
  id: string;

  organization_id: string;
  employee_id: string | null;

  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditAction;

  changed_fields: string[] | null;

  old_values: Record<
    string,
    unknown
  > | null;

  new_values: Record<
    string,
    unknown
  > | null;

  performed_by: string | null;
  performed_at: string;

  performed_by_name: string | null;
};

type HrEmployeeHistoryProps = {
  employeeId: string;
  organizationId: string;
  refreshKey?: number;
};

type ChangeItem = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

const fieldLabels: Record<string, string> = {
  first_name: "Prénom",
  last_name: "Nom",

  professional_email:
    "Email professionnel",

  professional_phone:
    "Téléphone professionnel",

  personal_email: "Email personnel",
  personal_phone: "Téléphone personnel",

  arrival_date: "Date d’arrivée",
  departure_date: "Date de départ",

  employment_status: "Statut RH",
  is_active: "Fiche active",

  site_id: "Site",
  department_id: "Service",
  job_id: "Métier",
  function_id: "Fonction",

  manager_employee_id:
    "Manager N+1",

  contract_type_id:
    "Type de contrat",

  work_schedule_id:
    "Rythme de travail",

  start_date: "Début du contrat",
  end_date: "Fin du contrat",

  activity_rate:
    "Taux d’activité",

  weekly_hours:
    "Heures hebdomadaires",

  daily_working_hours:
    "Heures journalières",

  annual_working_days:
    "Jours travaillés annuels",

  compensation_mode:
    "Mode de rémunération",

  annual_gross_salary:
    "Salaire brut annuel",

  employer_charge_profile_id:
    "Profil de charges",

  employer_charge_rate:
    "Taux de charges",

  external_daily_rate:
    "TJM d’achat",

  external_hourly_rate:
    "Taux horaire externe",

  external_overhead_rate:
    "Frais indirects",

  gross_hourly_rate:
    "Taux horaire brut",

  loaded_hourly_cost:
    "Taux horaire chargé",

  loaded_daily_cost:
    "Coût journalier chargé",

  status: "Statut du contrat",
};

const ignoredFields = new Set([
  "id",
  "organization_id",
  "employee_id",

  "created_at",
  "created_by",

  "updated_at",
  "updated_by",

  "metadata",
]);

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function formatDateValue(value: string) {
  const datePattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(`${value}T12:00:00`),
  );
}

function getStatusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    preboarding: "Pré-intégration",
    probation: "Période d’essai",
    active: "Actif",
    suspended: "Suspendu",
    notice_period: "Préavis",
    departed: "Sorti",
    archived: "Archivé",

    salary: "Salaire",
    daily_rate: "TJM",
    hourly_rate: "Taux horaire",
    fixed_fee: "Forfait",
  };

  return labels[value] ?? value;
}

function formatValue(
  value: unknown,
  field: string,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Non renseigné";
  }

  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }

  if (typeof value === "number") {
    if (
      field.includes("salary") ||
      field.includes("cost") ||
      field.includes("rate")
    ) {
      return new Intl.NumberFormat(
        "fr-FR",
        {
          maximumFractionDigits: 2,
        },
      ).format(value);
    }

    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  const textValue = String(value);

  return getStatusLabel(
    formatDateValue(textValue),
  );
}

function getChangeItems(
  auditLog: AuditLog,
) {
  const changedFields =
    auditLog.changed_fields ?? [];

  return changedFields
    .filter(
      (field) =>
        !ignoredFields.has(field),
    )
    .map((field): ChangeItem => ({
      field,

      label:
        fieldLabels[field] ??
        field
          .replaceAll("_", " ")
          .replace(
            /^\w/,
            (letter) =>
              letter.toUpperCase(),
          ),

      oldValue: formatValue(
        auditLog.old_values?.[field],
        field,
      ),

      newValue: formatValue(
        auditLog.new_values?.[field],
        field,
      ),
    }));
}

function getActionDefinition(
  action: AuditAction,
) {
  const definitions = {
    created: {
      label: "Création",
      description:
        "La fiche a été créée.",
      icon: FilePlus2,

      badge:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",

      iconStyle:
        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    },

    updated: {
      label: "Modification",
      description:
        "Des informations ont été modifiées.",
      icon: PencilLine,

      badge:
        "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",

      iconStyle:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    },

    archived: {
      label: "Archivage",
      description:
        "La fiche ou le contrat a été archivé.",
      icon: Archive,

      badge:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",

      iconStyle:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },

    reactivated: {
      label: "Réactivation",
      description:
        "La fiche ou le contrat a été réactivé.",
      icon: RefreshCcw,

      badge:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",

      iconStyle:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    },

    deleted: {
      label: "Suppression",
      description:
        "Une donnée a été supprimée.",
      icon: Trash2,

      badge:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",

      iconStyle:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    },
  };

  return definitions[action];
}

function HistoryItem({
  auditLog,
  isLast,
}: {
  auditLog: AuditLog;
  isLast: boolean;
}) {
  const definition =
    getActionDefinition(
      auditLog.action,
    );

  const Icon = definition.icon;

  const changeItems =
    getChangeItems(auditLog);

  const entityLabel =
    auditLog.entity_type === "contract"
      ? "Contrat"
      : "Collaborateur";

  return (
    <article className="relative flex gap-4">
      {!isLast && (
        <div className="absolute bottom-[-24px] left-5 top-10 w-px bg-slate-200 dark:bg-slate-800" />
      )}

      <div
        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${definition.iconStyle}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${definition.badge}`}
              >
                {definition.label}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                {auditLog.entity_type ===
                "contract" ? (
                  <BriefcaseBusiness className="h-3 w-3" />
                ) : (
                  <UserRound className="h-3 w-3" />
                )}

                {entityLabel}
              </span>
            </div>

            <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
              {definition.description}
            </p>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <CalendarClock className="h-3.5 w-3.5" />

              {formatDateTime(
                auditLog.performed_at,
              )}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Par{" "}
              {auditLog.performed_by_name ||
                "Utilisateur inconnu"}
            </p>
          </div>
        </div>

        {changeItems.length > 0 && (
          <div className="mt-4 space-y-2">
            {changeItems
              .slice(0, 8)
              .map((change) => (
                <div
                  key={change.field}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {change.label}
                  </p>

                  {auditLog.action ===
                  "created" ? (
                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {change.newValue}
                    </p>
                  ) : auditLog.action ===
                    "deleted" ? (
                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {change.oldValue}
                    </p>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        {change.oldValue}
                      </div>

                      <span className="text-center text-xs font-bold text-indigo-500">
                        →
                      </span>

                      <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                        {change.newValue}
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {changeItems.length > 8 && (
              <p className="text-xs text-slate-400">
                + {changeItems.length - 8} autre
                {changeItems.length - 8 > 1
                  ? "s"
                  : ""}{" "}
                modification
                {changeItems.length - 8 > 1
                  ? "s"
                  : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function HrEmployeeHistory({
  employeeId,
  organizationId,
  refreshKey = 0,
}: HrEmployeeHistoryProps) {
  const [history, setHistory] =
    useState<AuditLog[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const { data, error } = await (
          supabase.from(
            "hr_employee_audit_history" as never,
          ) as any
        )
          .select("*")
          .eq(
            "organization_id",
            organizationId,
          )
          .eq("employee_id", employeeId)
          .order("performed_at", {
            ascending: false,
          })
          .limit(50);

        if (error) {
          throw error;
        }

        if (isMounted) {
          setHistory(
            (data ?? []) as AuditLog[],
          );
        }
      } catch (error: unknown) {
        console.error(
          "Erreur de chargement de l’historique RH :",
          error,
        );

        if (!isMounted) {
          return;
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "Impossible de charger l’historique du collaborateur.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [
    employeeId,
    organizationId,
    refreshKey,
  ]);

  return (
    <section>
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          <History className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">
            Historique des modifications
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Chronologie des actions réalisées sur la
            fiche et le contrat.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-violet-600" />

            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chargement de l’historique...
            </p>
          </div>
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

            <p className="text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <CheckCircle2 className="mx-auto h-6 w-6 text-slate-400" />

          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            Aucun historique disponible
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Les prochaines modifications seront
            enregistrées automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map(
            (auditLog, index) => (
              <HistoryItem
                key={auditLog.id}
                auditLog={auditLog}
                isLast={
                  index === history.length - 1
                }
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}