"use client";

import {
  Archive,
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { HrDirectoryEmployee } from "@/components/hr/HrDirectory";
import HrEmployeeHistory from "@/components/hr/HrEmployeeHistory";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type DrawerTab = "information" | "history";

type HrEmployeeDrawerProps = {
  employee: HrDirectoryEmployee | null;
  organizationId: string;

  isOpen: boolean;
  historyRefreshKey?: number;

  onClose: () => void;

  onEdit?: (
    employee: HrDirectoryEmployee,
  ) => void;

  onArchived?: () => Promise<void> | void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(
  value: number | null | undefined,
  maximumFractionDigits = 2,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Non renseigné";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function getInitials(
  employee: HrDirectoryEmployee,
) {
  const firstInitial =
    employee.first_name
      ?.trim()
      .charAt(0) ?? "";

  const lastInitial =
    employee.last_name
      ?.trim()
      .charAt(0) ?? "";

  return (
    `${firstInitial}${lastInitial}`.toUpperCase() ||
    "NA"
  );
}

function getStatusDefinition(
  status: string,
) {
  const definitions: Record<
    string,
    {
      label: string;
      classes: string;
    }
  > = {
    draft: {
      label: "Brouillon",
      classes:
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    },

    preboarding: {
      label: "Pré-intégration",
      classes:
        "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    },

    probation: {
      label: "Période d’essai",
      classes:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
    },

    active: {
      label: "Actif",
      classes:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    },

    suspended: {
      label: "Suspendu",
      classes:
        "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900",
    },

    notice_period: {
      label: "Préavis",
      classes:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900",
    },

    departed: {
      label: "Sorti",
      classes:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    },

    archived: {
      label: "Archivé",
      classes:
        "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
    },
  };

  return (
    definitions[status] ?? {
      label: status,
      classes:
        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    }
  );
}

function getCompensationModeLabel(
  value: string | null | undefined,
) {
  const labels: Record<string, string> = {
    salary: "Salaire",
    daily_rate: "TJM",
    hourly_rate: "Taux horaire",
    fixed_fee: "Forfait",
  };

  return value
    ? labels[value] ?? value
    : "Non renseigné";
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm dark:bg-slate-950 dark:text-indigo-300">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function CostCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent:
    | "indigo"
    | "violet"
    | "emerald"
    | "amber";
}) {
  const styles = {
    indigo:
      "border-indigo-100 from-indigo-50 to-white text-indigo-700 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:to-slate-950 dark:text-indigo-300",

    violet:
      "border-violet-100 from-violet-50 to-white text-violet-700 dark:border-violet-900/60 dark:from-violet-950/30 dark:to-slate-950 dark:text-violet-300",

    emerald:
      "border-emerald-100 from-emerald-50 to-white text-emerald-700 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-950 dark:text-emerald-300",

    amber:
      "border-amber-100 from-amber-50 to-white text-amber-700 dark:border-amber-900/60 dark:from-amber-950/30 dark:to-slate-950 dark:text-amber-300",
  };

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${styles[accent]}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>
    </div>
  );
}

export default function HrEmployeeDrawer({
  employee,
  organizationId,
  isOpen,
  historyRefreshKey = 0,
  onClose,
  onEdit,
  onArchived,
}: HrEmployeeDrawerProps) {
  const [activeTab, setActiveTab] =
    useState<DrawerTab>("information");

  const [
    isConfirmingArchive,
    setIsConfirmingArchive,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("information");
      setIsConfirmingArchive(false);
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

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

  if (!employee) {
    return null;
  }

  const statusDefinition =
    getStatusDefinition(
      employee.employment_status,
    );

  const isArchived =
    employee.employment_status ===
      "archived" ||
    !employee.is_active;

  async function handleArchiveChange() {
    if (!employee) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { error } = await (
        supabase.rpc as any
      )("set_hr_employee_archived", {
        target_employee_id: employee.id,
        archived: !isArchived,
      });

      if (error) {
        throw error;
      }

      await onArchived?.();

      setIsConfirmingArchive(false);
      onClose();
    } catch (error: unknown) {
      console.error(
        "Erreur lors de l’archivage du collaborateur :",
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
          "L’opération n’a pas pu être effectuée.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={
          isSubmitting
            ? undefined
            : onClose
        }
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche de ${employee.full_name}`}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Fiche collaborateur
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consultation et gestion du cycle de vie RH.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
            aria-label="Fermer la fiche"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/70 p-6 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-xl font-black text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(employee)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  {employee.full_name}
                </h2>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusDefinition.classes}`}
                >
                  {statusDefinition.label}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                {employee.function_name ||
                  employee.job_name ||
                  "Fonction non renseignée"}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Matricule :{" "}
                {employee.employee_number}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() =>
                setActiveTab("information")
              }
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
                activeTab === "information"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-indigo-700 dark:hover:bg-slate-950 dark:hover:text-indigo-300"
              }`}
            >
              <FileText className="h-4 w-4" />
              Informations
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("history")
              }
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
                activeTab === "history"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-violet-700 dark:hover:bg-slate-950 dark:hover:text-violet-300"
              }`}
            >
              <History className="h-4 w-4" />
              Historique
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "information" ? (
            <div className="space-y-7 p-6">
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    Coordonnées et organisation
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    icon={Mail}
                    label="Email professionnel"
                    value={
                      employee.professional_email ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={Phone}
                    label="Téléphone professionnel"
                    value={
                      employee.professional_phone ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={MapPin}
                    label="Site"
                    value={
                      employee.site_name ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={Building2}
                    label="Service"
                    value={
                      employee.department_name ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={BriefcaseBusiness}
                    label="Métier / fonction"
                    value={
                      employee.function_name ||
                      employee.job_name ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={UsersRound}
                    label="Manager N+1"
                    value={
                      employee.manager_name ||
                      "Non renseigné"
                    }
                  />
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" />

                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    Contrat et activité
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow
                    icon={BriefcaseBusiness}
                    label="Type de contrat"
                    value={
                      employee.contract_type_name ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={Clock3}
                    label="Rythme de travail"
                    value={
                      employee.work_schedule_name ||
                      "Non renseigné"
                    }
                  />

                  <DetailRow
                    icon={CalendarDays}
                    label="Date d’arrivée"
                    value={formatDate(
                      employee.arrival_date,
                    )}
                  />

                  <DetailRow
                    icon={BadgeEuro}
                    label="Mode de rémunération"
                    value={getCompensationModeLabel(
                      employee.compensation_mode,
                    )}
                  />
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BadgeEuro className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />

                  <h3 className="text-base font-black text-slate-950 dark:text-white">
                    Coûts de la ressource
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CostCard
                    label="Salaire brut annuel"
                    value={formatCurrency(
                      employee.annual_gross_salary,
                      0,
                    )}
                    accent="indigo"
                  />

                  <CostCard
                    label="TJM d’achat"
                    value={formatCurrency(
                      employee.external_daily_rate,
                    )}
                    accent="violet"
                  />

                  <CostCard
                    label="Taux horaire externe"
                    value={formatCurrency(
                      employee.external_hourly_rate,
                    )}
                    accent="amber"
                  />

                  <CostCard
                    label="Taux horaire brut"
                    value={formatCurrency(
                      employee.gross_hourly_rate,
                    )}
                    accent="indigo"
                  />

                  <CostCard
                    label="Taux horaire chargé"
                    value={formatCurrency(
                      employee.loaded_hourly_cost,
                    )}
                    accent="emerald"
                  />

                  <CostCard
                    label="Coût journalier chargé"
                    value={formatCurrency(
                      employee.loaded_daily_cost,
                    )}
                    accent="violet"
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                      Conservation de l’historique
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      L’archivage désactive la fiche
                      et son contrat actif sans
                      supprimer les données
                      historiques.
                    </p>
                  </div>
                </div>
              </section>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                    <p className="text-sm text-red-700 dark:text-red-300">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {isConfirmingArchive && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

                    <div>
                      <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        {isArchived
                          ? "Réactiver ce collaborateur ?"
                          : "Archiver ce collaborateur ?"}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
                        {isArchived
                          ? "La fiche et son dernier contrat principal redeviendront actifs."
                          : "La fiche et le contrat actif seront désactivés, mais l’historique sera conservé."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={
                            handleArchiveChange
                          }
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isArchived
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-amber-600 hover:bg-amber-700"
                          }`}
                        >
                          {isArchived ? (
                            <RotateCcw className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}

                          {isSubmitting
                            ? "Traitement..."
                            : isArchived
                              ? "Confirmer la réactivation"
                              : "Confirmer l’archivage"}
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() =>
                            setIsConfirmingArchive(
                              false,
                            )
                          }
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <HrEmployeeHistory
                employeeId={employee.id}
                organizationId={organizationId}
                refreshKey={
                  historyRefreshKey
                }
              />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {activeTab === "information" && (
              <>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(employee)
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Modifier
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    setIsConfirmingArchive(
                      true,
                    )
                  }
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isArchived
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                  }`}
                >
                  {isArchived ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}

                  {isArchived
                    ? "Réactiver"
                    : "Archiver"}
                </button>
              </>
            )}

            {activeTab === "history" && (
              <button
                type="button"
                onClick={() =>
                  setActiveTab("information")
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <FileText className="h-4 w-4" />
                Revenir aux informations
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}