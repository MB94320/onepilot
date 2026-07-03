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
  BarChart3,
  CalendarClock,
  ContactRound,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import HrDecisionDashboard from "@/components/hr/HrDecisionDashboard";
import HrDirectory, {
  type HrDirectoryEmployee,
} from "@/components/hr/HrDirectory";
import HrDirectoryFilters, {
  type HrDirectoryFiltersValue,
} from "@/components/hr/HrDirectoryFilters";
import HrEmployeeDrawer from "@/components/hr/HrEmployeeDrawer";
import HrEmployeeEditForm from "@/components/hr/HrEmployeeEditForm";
import HrMemberForm from "@/components/hr/HrMemberForm";
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

type MembersData = {
  organization: Organization;
  employees: HrDirectoryEmployee[];
};

type PageTab =
  | "directory"
  | "analytics";

const initialFilters: HrDirectoryFiltersValue = {
  search: "",
  status: "all",
  site: "all",
  department: "all",
  contract: "all",
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatExportDate(
  value: string | null,
) {
  if (!value) {
    return "";
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

function formatExportNumber(
  value: number | null | undefined,
) {
  return value ?? null;
}

function getCompensationModeLabel(
  value: string | null | undefined,
) {
  const labels: Record<
    string,
    string
  > = {
    salary: "Salaire",
    daily_rate: "TJM",
    hourly_rate: "Taux horaire",
    fixed_fee: "Forfait",
  };

  return value
    ? labels[value] ?? value
    : "";
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

async function loadMembersData(
  slugOrId: string,
): Promise<MembersData> {
  const organization =
    await resolveOrganization(
      slugOrId,
    );

  const { data, error } = await (
    supabase.from(
      "hr_employee_overview" as never,
    ) as any
  )
    .select("*")
    .eq(
      "organization_id",
      organization.id,
    )
    .order("last_name", {
      ascending: true,
    })
    .order("first_name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Impossible de charger les membres : ${error.message}`,
    );
  }

  return {
    organization,

    employees:
      (data ??
        []) as HrDirectoryEmployee[],
  };
}

const employeeExportColumns: ExportColumn<HrDirectoryEmployee>[] =
  [
    {
      key: "employee_number",
      label: "Matricule",

      value: (employee) =>
        employee.employee_number,
    },

    {
      key: "last_name",
      label: "Nom",

      value: (employee) =>
        employee.last_name,
    },

    {
      key: "first_name",
      label: "Prénom",

      value: (employee) =>
        employee.first_name,
    },

    {
      key: "full_name",
      label: "Nom complet",

      value: (employee) =>
        employee.full_name,
    },

    {
      key: "employment_status",
      label: "Statut",

      value: (employee) =>
        employee.employment_status,
    },

    {
      key: "professional_email",
      label: "Email professionnel",

      value: (employee) =>
        employee.professional_email,
    },

    {
      key: "professional_phone",
      label:
        "Téléphone professionnel",

      value: (employee) =>
        employee.professional_phone,
    },

    {
      key: "site_name",
      label: "Site",

      value: (employee) =>
        employee.site_name,
    },

    {
      key: "department_name",
      label: "Service",

      value: (employee) =>
        employee.department_name,
    },

    {
      key: "job_name",
      label: "Métier",

      value: (employee) =>
        employee.job_name,
    },

    {
      key: "function_name",
      label: "Fonction",

      value: (employee) =>
        employee.function_name,
    },

    {
      key: "manager_name",
      label: "Manager N+1",

      value: (employee) =>
        employee.manager_name,
    },

    {
      key: "contract_type_name",
      label: "Type de contrat",

      value: (employee) =>
        employee.contract_type_name,
    },

    {
      key: "work_schedule_name",
      label: "Rythme de travail",

      value: (employee) =>
        employee.work_schedule_name,
    },

    {
      key: "arrival_date",
      label: "Date d’arrivée",

      value: (employee) =>
        formatExportDate(
          employee.arrival_date,
        ),
    },

    {
      key: "compensation_mode",
      label: "Mode de rémunération",

      value: (employee) =>
        getCompensationModeLabel(
          employee.compensation_mode,
        ),
    },

    {
      key: "annual_gross_salary",
      label:
        "Salaire brut annuel (€)",

      value: (employee) =>
        formatExportNumber(
          employee.annual_gross_salary,
        ),
    },

    {
      key: "external_daily_rate",
      label: "TJM d’achat (€)",

      value: (employee) =>
        formatExportNumber(
          employee.external_daily_rate,
        ),
    },

    {
      key: "external_hourly_rate",
      label:
        "Taux horaire externe (€)",

      value: (employee) =>
        formatExportNumber(
          employee.external_hourly_rate,
        ),
    },

    {
      key: "gross_hourly_rate",
      label: "Taux horaire brut (€)",

      value: (employee) =>
        formatExportNumber(
          employee.gross_hourly_rate,
        ),
    },

    {
      key: "loaded_hourly_cost",
      label:
        "Taux horaire chargé (€)",

      value: (employee) =>
        formatExportNumber(
          employee.loaded_hourly_cost,
        ),
    },

    {
      key: "loaded_daily_cost",
      label:
        "Coût journalier chargé (€)",

      value: (employee) =>
        formatExportNumber(
          employee.loaded_daily_cost,
        ),
    },
  ];

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  description: string;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent:
    | "indigo"
    | "emerald"
    | "amber"
    | "rose";
}) {
  const accentClasses = {
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
  };

  const classes =
    accentClasses[accent];

  return (
    <article
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
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {label}
            </p>

            <p
              className={`shrink-0 text-2xl font-black leading-none ${classes.value}`}
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

export default function HrResourcesPage({
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
      "directory",
    );

  const [
    filters,
    setFilters,
  ] =
    useState<HrDirectoryFiltersValue>(
      initialFilters,
    );

  const [
    isMemberFormOpen,
    setIsMemberFormOpen,
  ] = useState(false);

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] =
    useState<HrDirectoryEmployee | null>(
      null,
    );

  const [
    editingEmployeeId,
    setEditingEmployeeId,
  ] = useState<string | null>(
    null,
  );

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "hr-members",
      orgId,
    ],

    queryFn: () =>
      loadMembersData(orgId),

    enabled: Boolean(orgId),
  });

  async function refreshMembers() {
    await queryClient.invalidateQueries({
      queryKey: [
        "hr-members",
        orgId,
      ],
    });

    await queryClient.refetchQueries({
      queryKey: [
        "hr-members",
        orgId,
      ],
    });
  }

  async function handleMemberCreated() {
    await refreshMembers();

    await queryClient.invalidateQueries({
      queryKey: [
        "hr-member-form-references",
        data?.organization.id,
      ],
    });

    setIsMemberFormOpen(false);
  }

  async function handleEmployeeArchived() {
    setSelectedEmployee(null);
    await refreshMembers();
  }

  async function handleEmployeeUpdated() {
    await refreshMembers();

    await queryClient.invalidateQueries({
      queryKey: [
        "hr-member-form-references",
        data?.organization.id,
      ],
    });
  }

  function handleEmployeeClick(
    employee: HrDirectoryEmployee,
  ) {
    setSelectedEmployee(employee);
  }

  function handleEmployeeEdit(
    employee: HrDirectoryEmployee,
  ) {
    setSelectedEmployee(null);
    setEditingEmployeeId(
      employee.id,
    );
  }

  function closeEditForm() {
    setEditingEmployeeId(null);
  }

  const filteredEmployees =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const normalizedSearch =
        filters.search
          .trim()
          .toLowerCase();

      return data.employees.filter(
        (employee) => {
          const searchableContent = [
            employee.full_name,
            employee.employee_number,
            employee.professional_email,
            employee.professional_phone,
            employee.site_name,
            employee.department_name,
            employee.job_name,
            employee.function_name,
            employee.manager_name,
            employee.contract_type_name,
            employee.work_schedule_name,
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
            filters.status ===
              "all" ||
            employee.employment_status ===
              filters.status;

          const matchesSite =
            filters.site === "all" ||
            employee.site_name ===
              filters.site;

          const matchesDepartment =
            filters.department ===
              "all" ||
            employee.department_name ===
              filters.department;

          const matchesContract =
            filters.contract ===
              "all" ||
            employee.contract_type_name ===
              filters.contract;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesSite &&
            matchesDepartment &&
            matchesContract
          );
        },
      );
    }, [
      data,
      filters,
    ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Membres de l’équipe"
          subtitle="Chargement des collaborateurs de l’organisation."
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
          title="Membres de l’équipe"
          subtitle="Gestion des collaborateurs et des rattachements RH."
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

  const activeEmployees =
    filteredEmployees.filter(
      (employee) =>
        employee.is_active &&
        [
          "active",
          "probation",
          "preboarding",
        ].includes(
          employee.employment_status,
        ),
    ).length;

  const probationEmployees =
    filteredEmployees.filter(
      (employee) =>
        employee.employment_status ===
        "probation",
    ).length;

  const departures =
    filteredEmployees.filter(
      (employee) =>
        employee.employment_status ===
          "notice_period" ||
        employee.employment_status ===
          "departed",
    ).length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Membres de l’équipe"
          subtitle={`Annuaire, contrats, coûts et pilotage des collaborateurs de ${data.organization.name}.`}
          flush
          actions={
            <>
              <DataExportMenu
                data={filteredEmployees}
                columns={
                  employeeExportColumns
                }
                fileName={`annuaire_rh_${data.organization.slug}`}
                sheetName="Annuaire RH"
              />

              <button
                type="button"
                onClick={() =>
                  setIsMemberFormOpen(
                    true,
                  )
                }
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Ajouter un membre
              </button>
            </>
          }
        />

        <PageTutorial
          title="Gérer et piloter les membres de l’équipe"
          description="Cette page centralise les fiches collaborateurs, les rattachements organisationnels, les contrats, l’activité, les coûts et l’historique des modifications."
          objectives={[
            "Centraliser les salariés, freelances, alternants et prestataires.",
            "Garantir la cohérence entre la fiche, le contrat et l’architecture RH.",
            "Calculer les coûts réellement utilisables par les projets et la finance.",
            "Conserver une traçabilité complète des modifications et archivages.",
          ]}
          steps={[
            {
              title:
                "Définir le périmètre",

              description:
                "Utilise la recherche et les filtres pour isoler un site, un service, un statut ou un type de contrat.",
            },

            {
              title:
                "Consulter les indicateurs",

              description:
                "Les KPI sont recalculés automatiquement selon le périmètre filtré.",
            },

            {
              title:
                "Ouvrir une fiche",

              description:
                "Clique sur un collaborateur pour consulter ses coordonnées, son rattachement, son contrat et ses coûts.",
            },

            {
              title:
                "Modifier ou archiver",

              description:
                "Les changements sont enregistrés dans l’historique d’audit et propagés aux analyses.",
            },

            {
              title:
                "Analyser les résultats",

              description:
                "L’onglet Analyses présente la qualité des données, les alertes, les répartitions et les recommandations.",
            },
          ]}
          analyses={[
            {
              title:
                "Structure de l’effectif",

              description:
                "Répartition par statut, contrat, service, site et manager.",
            },

            {
              title:
                "Qualité des données",

              description:
                "Complétude des rattachements, coordonnées, contrats et coûts.",
            },

            {
              title:
                "Coûts et valorisation",

              description:
                "Salaires, taux horaires, TJM et coûts journaliers chargés.",
            },

            {
              title:
                "Traçabilité",

              description:
                "Historique des créations, modifications, archivages et réactivations.",
            },
          ]}
          recommendations={[
            "Créer les référentiels dans Architecture RH avant d’ajouter massivement des collaborateurs.",
            "Compléter les contrats et rythmes de travail avant les analyses de capacité.",
            "Contrôler les coûts avant toute affectation projet ou estimation de marge.",
            "Archiver les collaborateurs sortis plutôt que supprimer leur historique.",
          ]}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Effectif total"
            value={
              filteredEmployees.length
            }
            description="Collaborateurs correspondant au périmètre filtré."
            icon={Users}
            accent="indigo"
          />

          <MetricCard
            label="Collaborateurs actifs"
            value={activeEmployees}
            description="Actifs, pré-intégrations et périodes d’essai."
            icon={UserCheck}
            accent="emerald"
          />

          <MetricCard
            label="Périodes d’essai"
            value={
              probationEmployees
            }
            description="Suivis et échéances à anticiper."
            icon={CalendarClock}
            accent="amber"
          />

          <MetricCard
            label="Départs"
            value={departures}
            description="Préavis et collaborateurs sortis."
            icon={UserX}
            accent="rose"
          />
        </section>

        {data.employees.length >
        0 ? (
          <>
            <HrDirectoryFilters
              employees={
                data.employees
              }
              value={filters}
              onChange={setFilters}
              resultCount={
                filteredEmployees.length
              }
            />

            <div className="flex justify-center">
              <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "directory",
                    )
                  }
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
                    activeTab ===
                    "directory"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                      : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                  }`}
                >
                  <ContactRound className="h-4 w-4" />
                  Annuaire
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
                      ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                      : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Analyses
                </button>
              </div>
            </div>

            {activeTab ===
            "directory" ? (
              <HrDirectory
                employees={
                  filteredEmployees
                }
                onEmployeeClick={
                  handleEmployeeClick
                }
              />
            ) : (
              <HrDecisionDashboard
                employees={
                  filteredEmployees
                }
                totalEmployees={
                  data.employees.length
                }
              />
            )}
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-16 text-center dark:border-indigo-900 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
            <Users className="mx-auto h-8 w-8 text-indigo-500" />

            <h2 className="mt-4 text-lg font-bold text-slate-950 dark:text-white">
              Aucun membre enregistré
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              Ajoute la première fiche
              collaborateur pour
              constituer l’annuaire de
              cette organisation.
            </p>

            <button
              type="button"
              onClick={() =>
                setIsMemberFormOpen(
                  true,
                )
              }
              className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Ajouter le premier membre
            </button>
          </section>
        )}
      </div>

      <HrMemberForm
        organizationId={
          data.organization.id
        }
        isOpen={
          isMemberFormOpen
        }
        onClose={() =>
          setIsMemberFormOpen(false)
        }
        onCreated={
          handleMemberCreated
        }
      />

      <HrEmployeeDrawer
        employee={
          selectedEmployee
        }
        organizationId={
          data.organization.id
        }
        isOpen={
          selectedEmployee !== null
        }
        onClose={() =>
          setSelectedEmployee(null)
        }
        onEdit={
          handleEmployeeEdit
        }
        onArchived={
          handleEmployeeArchived
        }
      />

      <HrEmployeeEditForm
        employeeId={
          editingEmployeeId
        }
        organizationId={
          data.organization.id
        }
        isOpen={
          editingEmployeeId !== null
        }
        onClose={closeEditForm}
        onUpdated={
          handleEmployeeUpdated
        }
      />
    </>
  );
}