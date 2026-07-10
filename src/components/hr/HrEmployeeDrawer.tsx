"use client";

import {
  type ComponentType,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import {
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  ContactRound,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  type HrDirectoryEmployee,
} from "@/components/hr/HrDirectory";

type DrawerTab =
  | "identity"
  | "contract"
  | "costs";

type HrEmployeeDrawerProps = {
  employee: HrDirectoryEmployee | null;
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;

  onEdit?: (
    employee: HrDirectoryEmployee,
  ) => void;

  onArchived?: () => void | Promise<void>;
};

type InfoItemProps = {
  label: string;
  value: ReactNode;
  description?: string;
};

function formatDate(
  value: string | null | undefined,
) {
  if (!value) {
    return "Non renseignée";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date(value));
}

function formatCurrency(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Non renseigné";
  }

  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatText(
  value:
    | string
    | null
    | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue &&
    normalizedValue.length > 0
    ? normalizedValue
    : "Non renseigné";
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


function getEmployeeSite(employee: HrDirectoryEmployee) {
  return employee.site_free_text || employee.site_name;
}

function getEmployeeDepartment(employee: HrDirectoryEmployee) {
  return employee.department_free_text || employee.department_name;
}

function getEmployeeJob(employee: HrDirectoryEmployee) {
  return employee.job_free_text || employee.job_name;
}

function getEmployeeFunction(employee: HrDirectoryEmployee) {
  return employee.function_free_text || employee.function_name;
}

function getStatusLabel(
  status: string,
) {
  const labels: Record<string, string> =
    {
      draft: "Brouillon",
      preboarding:
        "Pré-intégration",
      probation:
        "Période d’essai",
      active: "Actif",
      notice_period: "Préavis",
      suspended: "Suspendu",
      departed: "Sorti",
    };

  return labels[status] ?? status;
}

function getCompensationModeLabel(
  value:
    | string
    | null
    | undefined,
) {
  const labels: Record<string, string> =
    {
      salary: "Salarié",
      daily_rate: "Freelance au TJM",
      hourly_rate:
        "Prestataire horaire",
      fixed_fee: "Forfait",
    };

  return value
    ? labels[value] ?? value
    : "Non renseigné";
}

function InfoItem({
  label,
  value,
  description,
}: InfoItemProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </div>

      {description && (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

function DrawerSection({
  title,
  description,
  icon: Icon,
  children,
  accent = "indigo",
}: {
  title: string;
  description: string;
  icon: ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  children: ReactNode;
  accent?:
    | "indigo"
    | "emerald"
    | "violet"
    | "amber"
    | "cyan";
}) {
  const iconClasses = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
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

function DrawerTabs({
  activeTab,
  onChange,
}: {
  activeTab: DrawerTab;
  onChange: (
    tab: DrawerTab,
  ) => void;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() =>
              onChange("identity")
            }
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
            onClick={() =>
              onChange("contract")
            }
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
            onClick={() =>
              onChange("costs")
            }
            className={`inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
              activeTab === "costs"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            }`}
          >
            <BadgeEuro className="h-3.5 w-3.5" />
            Coûts
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
    | "violet"
    | "amber"
    | "cyan";
}) {
  const classes = {
    indigo:
      "border-indigo-100 bg-indigo-50/60 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-300",
    emerald:
      "border-emerald-100 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300",
    violet:
      "border-violet-100 bg-violet-50/60 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300",
    amber:
      "border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300",
    cyan:
      "border-cyan-100 bg-cyan-50/60 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-300",
  };

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${classes[accent]}`}
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

export default function HrEmployeeDrawer({
  employee,
  isOpen,
  onClose,
}: HrEmployeeDrawerProps) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<DrawerTab>(
      "identity",
    );

  const compensationMode =
    useMemo(
      () =>
        getCompensationModeLabel(
          employee?.compensation_mode,
        ),
      [employee],
    );

  if (
    !isOpen ||
    !employee
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label="Fermer la fiche collaborateur"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />

      <aside className="relative flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-4">
            {employee.photo_url ? (
              <img
                src={
                  employee.photo_url
                }
                alt={
                  employee.full_name
                }
                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-900"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-sm">
                {getInitials(employee)}
              </div>
            )}

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
                Fiche collaborateur
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {employee.full_name}
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Lecture seule de la fiche RH, du rattachement, du contrat, du rythme et des coûts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <DrawerTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Matricule"
                value={
                  employee.employee_number ||
                  "Non renseigné"
                }
                description="Identifiant RH de référence."
                accent="indigo"
              />

              <SummaryCard
                label="Statut"
                value={getStatusLabel(
                  employee.employment_status,
                )}
                description="État actuel de la fiche collaborateur."
                accent={
                  employee.is_active
                    ? "emerald"
                    : "amber"
                }
              />

              <SummaryCard
                label="Contrat"
                value={formatText(
                  employee.contract_type_name,
                )}
                description="Type de contrat actif ou principal."
                accent="violet"
              />

              <SummaryCard
                label="Coût jour"
                value={formatCurrency(
                  employee.loaded_daily_cost,
                )}
                description="Coût journalier chargé exploitable."
                accent="cyan"
              />
            </section>

            {activeTab ===
              "identity" && (
              <>
                <DrawerSection
                  title="Identité"
                  description="Informations principales visibles dans l’annuaire et les workflows RH."
                  icon={ContactRound}
                  accent="indigo"
                >
                  <InfoItem
                    label="Nom complet"
                    value={
                      employee.full_name
                    }
                  />

                  <InfoItem
                    label="Matricule"
                    value={
                      employee.employee_number ||
                      "Non renseigné"
                    }
                  />

                  <InfoItem
                    label="Prénom"
                    value={formatText(
                      employee.first_name,
                    )}
                  />

                  <InfoItem
                    label="Nom"
                    value={formatText(
                      employee.last_name,
                    )}
                  />
                </DrawerSection>

                <DrawerSection
                  title="Contact"
                  description="Coordonnées professionnelles disponibles pour les échanges et notifications."
                  icon={Users}
                  accent="emerald"
                >
                  <InfoItem
                    label="Email professionnel"
                    value={
                      employee.professional_email ? (
                        <a
                          href={`mailto:${employee.professional_email}`}
                          className="inline-flex items-center gap-2 text-indigo-700 hover:underline dark:text-indigo-300"
                        >
                          <Mail className="h-4 w-4" />
                          {
                            employee.professional_email
                          }
                        </a>
                      ) : (
                        "Non renseigné"
                      )
                    }
                  />

                  <InfoItem
                    label="Téléphone professionnel"
                    value={
                      employee.professional_phone ? (
                        <a
                          href={`tel:${employee.professional_phone}`}
                          className="inline-flex items-center gap-2 text-indigo-700 hover:underline dark:text-indigo-300"
                        >
                          <Phone className="h-4 w-4" />
                          {
                            employee.professional_phone
                          }
                        </a>
                      ) : (
                        "Non renseigné"
                      )
                    }
                  />
                </DrawerSection>

                <DrawerSection
                  title="Rattachement"
                  description="Positionnement de la ressource dans l’architecture RH."
                  icon={Building2}
                  accent="violet"
                >
                  <InfoItem
                    label="Site"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-rose-500" />
                        {formatText(
                          getEmployeeSite(employee),
                        )}
                      </span>
                    }
                  />

                  <InfoItem
                    label="Service"
                    value={formatText(
                      getEmployeeDepartment(employee),
                    )}
                  />

                  <InfoItem
                    label="Métier"
                    value={formatText(
                      getEmployeeJob(employee),
                    )}
                  />

                  <InfoItem
                    label="Fonction"
                    value={formatText(
                      getEmployeeFunction(employee),
                    )}
                  />

                  <InfoItem
                    label="Manager N+1"
                    value={formatText(
                      employee.manager_name,
                    )}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab ===
              "contract" && (
              <>
                <DrawerSection
                  title="Contrat"
                  description="Contrat, statut, date d’arrivée et rythme de référence."
                  icon={BriefcaseBusiness}
                  accent="amber"
                >
                  <InfoItem
                    label="Type de contrat"
                    value={formatText(
                      employee.contract_type_name,
                    )}
                  />

                  <InfoItem
                    label="Rythme de travail"
                    value={formatText(
                      employee.work_schedule_name,
                    )}
                  />

                  <InfoItem
                    label="Date d’arrivée"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-indigo-500" />
                        {formatDate(
                          employee.arrival_date,
                        )}
                      </span>
                    }
                  />

                  <InfoItem
                    label="Statut RH"
                    value={getStatusLabel(
                      employee.employment_status,
                    )}
                  />

                  <InfoItem
                    label="Fiche active"
                    value={
                      employee.is_active
                        ? "Oui"
                        : "Non"
                    }
                  />
                </DrawerSection>

                <DrawerSection
                  title="Temps de travail"
                  description="Base utilisée par les absences, la capacité et les coûts lorsqu’elle est disponible."
                  icon={Clock3}
                  accent="cyan"
                >
                  <InfoItem
                    label="Rythme"
                    value={formatText(
                      employee.work_schedule_name,
                    )}
                  />

                  <InfoItem
                    label="Taux horaire brut"
                    value={formatCurrency(
                      employee.gross_hourly_rate,
                    )}
                  />

                  <InfoItem
                    label="Taux horaire chargé"
                    value={formatCurrency(
                      employee.loaded_hourly_cost,
                    )}
                  />

                  <InfoItem
                    label="Coût journalier chargé"
                    value={formatCurrency(
                      employee.loaded_daily_cost,
                    )}
                  />
                </DrawerSection>
              </>
            )}

            {activeTab ===
              "costs" && (
              <>
                <DrawerSection
                  title="Rémunération et coûts"
                  description="Synthèse économique utilisée par les projets, le staffing et la finance."
                  icon={BadgeEuro}
                  accent="emerald"
                >
                  <InfoItem
                    label="Mode de rémunération"
                    value={compensationMode}
                  />

                  <InfoItem
                    label="Salaire brut annuel"
                    value={formatCurrency(
                      employee.annual_gross_salary,
                    )}
                  />

                  <InfoItem
                    label="TJM d’achat"
                    value={formatCurrency(
                      employee.external_daily_rate,
                    )}
                  />

                  <InfoItem
                    label="Taux horaire externe"
                    value={formatCurrency(
                      employee.external_hourly_rate,
                    )}
                  />

                  <InfoItem
                    label="Taux horaire brut"
                    value={formatCurrency(
                      employee.gross_hourly_rate,
                    )}
                  />

                  <InfoItem
                    label="Taux horaire chargé"
                    value={formatCurrency(
                      employee.loaded_hourly_cost,
                    )}
                  />

                  <InfoItem
                    label="Coût journalier chargé"
                    value={formatCurrency(
                      employee.loaded_daily_cost,
                    )}
                  />
                </DrawerSection>

                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />

                    <div>
                      <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                        Lecture seule
                      </p>

                      <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                        Cette fiche affiche les informations consolidées du collaborateur. Les modifications doivent passer par le menu trois points puis “Modifier la fiche”.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            Fiche consultable en lecture seule. Utilise le menu trois points de la carte ou du tableau pour modifier, archiver ou réactiver.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Fermer
          </button>
        </footer>
      </aside>
    </div>
  );
}