"use client";

import { useRouter } from "next/navigation";
import {
  use,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileSignature,
  Layers3,
  MapPin,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  UserCheck,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

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
  id: string;
  organization_id: string;

  default_country_code: string;
  default_currency: string;
  default_locale: string;
  default_timezone: string;

  default_weekly_hours: number;
  default_working_days_per_week: number;
  default_annual_working_days: number;
  default_daily_hours: number;

  absence_manager_approval_required: boolean;
  absence_hr_approval_optional: boolean;

  project_time_manager_approval_required: boolean;
  project_time_hr_approval_required: boolean;

  probation_review_automation_enabled: boolean;
  annual_review_automation_enabled: boolean;
  professional_review_automation_enabled: boolean;
};

type ReferenceItem = {
  id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

type ArchitectureData = {
  organization: Organization;
  settings: HrSettings | null;

  sites: ReferenceItem[];
  departments: ReferenceItem[];
  jobFamilies: ReferenceItem[];
  jobs: ReferenceItem[];
  functions: ReferenceItem[];
  contractTypes: ReferenceItem[];
  workSchedules: ReferenceItem[];
  absenceTypes: ReferenceItem[];
  holidayCalendars: ReferenceItem[];
};

type ArchitectureTab =
  | "overview"
  | "references"
  | "workflows";

type Accent =
  | "indigo"
  | "emerald"
  | "violet"
  | "amber";

type ReferenceCategory = {
  id: string;
  title: string;
  description: string;
  items: ReferenceItem[];

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
};

type ExportRow = {
  category: string;
  code: string;
  name: string;
  status: string;
};

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  actor: string;
  enabled: boolean;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  description: string;

  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  accent: Accent;
}) {
  const styles = {
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

    violet: {
      panel:
        "border-violet-100 from-violet-50/85 via-white to-fuchsia-50/65 dark:border-violet-900/50 dark:from-violet-950/30 dark:via-slate-950 dark:to-fuchsia-950/20",

      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

      value:
        "text-violet-700 dark:text-violet-300",
    },

    amber: {
      panel:
        "border-amber-100 from-amber-50/85 via-white to-orange-50/65 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-slate-950 dark:to-orange-950/20",

      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

      value:
        "text-amber-700 dark:text-amber-300",
    },
  };

  const selectedStyle =
    styles[accent];

  return (
    <article
      className={`min-h-[106px] rounded-2xl border bg-gradient-to-r px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedStyle.panel}`}
    >
      <div className="flex h-full items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedStyle.icon}`}
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
              className={`shrink-0 text-2xl font-black leading-none ${selectedStyle.value}`}
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
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;

  title: string;
  description: string;
  accent: Accent;
}) {
  const styles = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };

  return (
    <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
      <div
        className={`rounded-xl p-2.5 ${styles[accent]}`}
      >
        <Icon
          className="h-4 w-4"
          strokeWidth={1.9}
        />
      </div>

      <div>
        <h2 className="text-sm font-black text-slate-950 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function ReferenceCard({
  title,
  description,
  items,
  icon: Icon,
  accent,
}: ReferenceCategory) {
  const activeItems = items.filter(
    (item) =>
      item.is_active !== false,
  );

  const visibleItems =
    activeItems.slice(0, 6);

  const styles = {
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-4 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
        <div
          className={`rounded-xl p-2.5 ${styles[accent]}`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {item.name}
                </p>

                <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.code}
                </p>
              </div>

              <span className="inline-flex shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
                Actif
              </span>
            </div>
          ))
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Aucun élément configuré
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {activeItems.length} élément
          {activeItems.length > 1
            ? "s"
            : ""}{" "}
          actif
          {activeItems.length > 1
            ? "s"
            : ""}
        </p>
      </div>
    </article>
  );
}

function WorkflowDiagram({
  title,
  description,
  steps,
  accent,
}: {
  title: string;
  description: string;
  steps: WorkflowStep[];
  accent: Accent;
}) {
  const activeSteps = steps.filter(
    (step) => step.enabled,
  ).length;

  const accentStyles = {
    indigo: {
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",

      line:
        "bg-indigo-200 dark:bg-indigo-900",

      badge:
        "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900",
    },

    emerald: {
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

      line:
        "bg-emerald-200 dark:bg-emerald-900",

      badge:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    },

    violet: {
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

      line:
        "bg-violet-200 dark:bg-violet-900",

      badge:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
    },

    amber: {
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",

      line:
        "bg-amber-200 dark:bg-amber-900",

      badge:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    },
  };

  const selectedStyle =
    accentStyles[accent];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
        <div>
          <h3 className="text-sm font-black text-slate-950 dark:text-white">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${selectedStyle.badge}`}
        >
          {activeSteps} étape
          {activeSteps > 1
            ? "s"
            : ""}{" "}
          active
          {activeSteps > 1
            ? "s"
            : ""}
        </span>
      </div>

      <div className="overflow-x-auto p-5">
        <div className="flex min-w-[760px] items-stretch">
          {steps.map(
            (step, index) => {
              const StepIcon =
                step.icon;

              return (
                <div
                  key={step.id}
                  className="flex min-w-0 flex-1 items-center"
                >
                  <div
                    className={`h-full min-h-[170px] min-w-0 flex-1 rounded-2xl border p-4 transition ${
                      step.enabled
                        ? "border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
                        : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          step.enabled
                            ? selectedStyle.icon
                            : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        <StepIcon className="h-4 w-4" />
                      </div>

                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        Étape {index + 1}
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-black text-slate-950 dark:text-white">
                      {step.title}
                    </p>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Acteur : {step.actor}
                    </p>

                    <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {step.description}
                    </p>

                    <div className="mt-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${
                          step.enabled
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900"
                            : "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
                        }`}
                      >
                        {step.enabled
                          ? "Activée"
                          : "Désactivée"}
                      </span>
                    </div>
                  </div>

                  {index <
                    steps.length - 1 && (
                    <div className="flex w-10 shrink-0 items-center justify-center">
                      <div
                        className={`h-0.5 flex-1 ${selectedStyle.line}`}
                      />

                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      </div>
    </article>
  );
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

async function fetchReferenceItems(
  tableName: string,
  organizationId: string,
): Promise<ReferenceItem[]> {
  const { data, error } = await (
    supabase.from(
      tableName as never,
    ) as any
  )
    .select(
      "id, code, name, is_active",
    )
    .eq(
      "organization_id",
      organizationId,
    )
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Impossible de charger ${tableName} : ${error.message}`,
    );
  }

  return (
    data ?? []
  ) as ReferenceItem[];
}

async function loadArchitectureData(
  slugOrId: string,
): Promise<ArchitectureData> {
  const organization =
    await resolveOrganization(
      slugOrId,
    );

  const [
    settingsResult,
    sites,
    departments,
    jobFamilies,
    jobs,
    functions,
    contractTypes,
    workSchedules,
    absenceTypes,
    holidayCalendars,
  ] = await Promise.all([
    (
      supabase.from(
        "hr_settings" as never,
      ) as any
    )
      .select("*")
      .eq(
        "organization_id",
        organization.id,
      )
      .maybeSingle(),

    fetchReferenceItems(
      "hr_sites",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_departments",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_job_families",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_jobs",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_functions",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_contract_types",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_work_schedules",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_absence_types",
      organization.id,
    ),

    fetchReferenceItems(
      "hr_holiday_calendars",
      organization.id,
    ),
  ]);

  if (settingsResult.error) {
    throw new Error(
      `Impossible de charger les paramètres RH : ${settingsResult.error.message}`,
    );
  }

  return {
    organization,

    settings:
      (settingsResult.data as HrSettings | null) ??
      null,

    sites,
    departments,
    jobFamilies,
    jobs,
    functions,
    contractTypes,
    workSchedules,
    absenceTypes,
    holidayCalendars,
  };
}

const exportColumns: ExportColumn<ExportRow>[] =
  [
    {
      key: "category",
      label: "Catégorie",
      value: (row) =>
        row.category,
    },

    {
      key: "code",
      label: "Code",
      value: (row) => row.code,
    },

    {
      key: "name",
      label: "Nom",
      value: (row) => row.name,
    },

    {
      key: "status",
      label: "Statut",
      value: (row) => row.status,
    },
  ];

export default function HrArchitecturePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { orgId } = use(params);
  const router = useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ArchitectureTab>(
      "overview",
    );

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "hr-architecture",
      orgId,
    ],

    queryFn: () =>
      loadArchitectureData(orgId),

    enabled: Boolean(orgId),
  });

  const referenceCategories =
    useMemo<ReferenceCategory[]>(
      () => {
        if (!data) {
          return [];
        }

        return [
          {
            id: "sites",
            title: "Sites",
            description:
              "Sièges, agences et implantations.",
            items: data.sites,
            icon: MapPin,
            accent: "indigo",
          },

          {
            id: "departments",
            title: "Départements",
            description:
              "Services et unités de l’organisation.",
            items:
              data.departments,
            icon: Network,
            accent: "emerald",
          },

          {
            id: "job-families",
            title:
              "Familles de métiers",
            description:
              "Classification générale des métiers.",
            items:
              data.jobFamilies,
            icon: UsersRound,
            accent: "violet",
          },

          {
            id: "jobs",
            title: "Métiers",
            description:
              "Métiers opérationnels disponibles.",
            items: data.jobs,
            icon: Users,
            accent: "amber",
          },

          {
            id: "functions",
            title: "Fonctions",
            description:
              "Fonctions et responsabilités.",
            items: data.functions,
            icon: Building2,
            accent: "indigo",
          },

          {
            id: "contract-types",
            title:
              "Types de contrat",
            description:
              "Contrats salariés et externes.",
            items:
              data.contractTypes,
            icon: FileSignature,
            accent: "violet",
          },

          {
            id: "work-schedules",
            title:
              "Rythmes de travail",
            description:
              "Horaires et forfaits jours.",
            items:
              data.workSchedules,
            icon: Clock3,
            accent: "emerald",
          },

          {
            id: "absence-types",
            title:
              "Types d’absence",
            description:
              "Congés, RTT et indisponibilités.",
            items:
              data.absenceTypes,
            icon: CalendarDays,
            accent: "amber",
          },

          {
            id: "holiday-calendars",
            title: "Calendriers",
            description:
              "Calendriers et jours fériés.",
            items:
              data.holidayCalendars,
            icon: CalendarDays,
            accent: "indigo",
          },
        ];
      },
      [data],
    );

  const filteredCategories =
    useMemo(() => {
      const search =
        searchValue
          .trim()
          .toLowerCase();

      if (!search) {
        return referenceCategories;
      }

      return referenceCategories
        .map((category) => ({
          ...category,

          items:
            category.items.filter(
              (item) =>
                [
                  category.title,
                  category.description,
                  item.name,
                  item.code,
                ]
                  .join(" ")
                  .toLowerCase()
                  .includes(search),
            ),
        }))
        .filter(
          (category) =>
            category.items.length > 0,
        );
    }, [
      referenceCategories,
      searchValue,
    ]);

  const exportRows =
    useMemo<ExportRow[]>(
      () =>
        referenceCategories.flatMap(
          (category) =>
            category.items.map(
              (item) => ({
                category:
                  category.title,

                code: item.code,

                name: item.name,

                status:
                  item.is_active ===
                  false
                    ? "Inactif"
                    : "Actif",
              }),
            ),
        ),
      [referenceCategories],
    );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Architecture RH"
          subtitle="Chargement des référentiels de l’organisation."
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
          title="Architecture RH"
          subtitle="Configuration structurelle du domaine Ressources humaines."
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

  const settings = data.settings;

  const activeReferenceCount =
    exportRows.filter(
      (row) =>
        row.status === "Actif",
    ).length;

  const absenceWorkflow: WorkflowStep[] =
    [
      {
        id: "absence-request",
        title: "Demande",
        description:
          "Le collaborateur saisit ses dates et son type d’absence.",
        actor: "Collaborateur",
        enabled: true,
        icon: CalendarCheck2,
      },

      {
        id: "absence-manager",
        title: "Validation manager",
        description:
          "Le responsable contrôle la disponibilité et l’impact opérationnel.",
        actor: "Manager N+1",

        enabled:
          settings?.absence_manager_approval_required ??
          false,

        icon: UserCheck,
      },

      {
        id: "absence-hr",
        title: "Contrôle RH",
        description:
          "Les RH vérifient les règles, les soldes et les justificatifs.",
        actor: "Ressources humaines",

        enabled:
          settings?.absence_hr_approval_optional ??
          false,

        icon: ShieldCheck,
      },

      {
        id: "absence-calendar",
        title: "Mise à jour",
        description:
          "L’absence validée alimente les calendriers et la capacité.",
        actor: "OnePilot",
        enabled: true,
        icon: CalendarDays,
      },
    ];

  const timeWorkflow: WorkflowStep[] =
    [
      {
        id: "time-entry",
        title: "Saisie des temps",
        description:
          "Le collaborateur renseigne les heures réalisées par projet.",
        actor: "Collaborateur",
        enabled: true,
        icon: Clock3,
      },

      {
        id: "time-manager",
        title: "Validation manager",
        description:
          "Le manager vérifie la cohérence entre temps, charge et projet.",
        actor: "Manager N+1",

        enabled:
          settings?.project_time_manager_approval_required ??
          false,

        icon: UserCheck,
      },

      {
        id: "time-hr",
        title: "Contrôle RH",
        description:
          "Les RH contrôlent les règles de temps et les éventuelles anomalies.",
        actor: "Ressources humaines",

        enabled:
          settings?.project_time_hr_approval_required ??
          false,

        icon: ShieldCheck,
      },

      {
        id: "time-finance",
        title: "Valorisation",
        description:
          "Les temps validés alimentent les coûts, marges et facturations.",
        actor: "Finance / Projets",
        enabled: true,
        icon: FileCheck2,
      },
    ];

  const reviewWorkflow: WorkflowStep[] =
    [
      {
        id: "probation",
        title: "Période d’essai",
        description:
          "Planification et rappel de l’entretien de fin de période d’essai.",
        actor: "RH / Manager",

        enabled:
          settings?.probation_review_automation_enabled ??
          false,

        icon: UserCheck,
      },

      {
        id: "annual-review",
        title: "Entretien annuel",
        description:
          "Création automatique de la campagne et des échéances annuelles.",
        actor: "RH / Manager",

        enabled:
          settings?.annual_review_automation_enabled ??
          false,

        icon: CalendarCheck2,
      },

      {
        id: "professional-review",
        title: "Entretien professionnel",
        description:
          "Suivi périodique des compétences et perspectives d’évolution.",
        actor: "RH / Collaborateur",

        enabled:
          settings?.professional_review_automation_enabled ??
          false,

        icon: UsersRound,
      },

      {
        id: "action-plan",
        title: "Plan d’action",
        description:
          "Les décisions alimentent les objectifs, formations et compétences.",
        actor: "OnePilot",
        enabled: true,
        icon: Workflow,
      },
    ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Architecture RH"
        subtitle={`Référentiels, capacités et processus structurants de ${data.organization.name}.`}
        flush
        actions={
          <>
            <DataExportMenu
              data={exportRows}
              columns={exportColumns}
              fileName={`architecture_rh_${data.organization.slug}`}
              sheetName="Architecture RH"
            />

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/${encodeURIComponent(orgId)}/rh/ressources`,
                )
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none"
            >
              <Users className="h-3.5 w-3.5" />

              Voir les ressources
            </button>
          </>
        }
      />

      <PageTutorial
        title="Configurer et contrôler le socle RH"
        description="Cette page rassemble les référentiels réellement enregistrés dans Supabase, les paramètres de capacité de l’organisation et les circuits de validation utilisés par les autres modules RH."
        objectives={[
          "Structurer les sites, départements, métiers, fonctions et contrats.",
          "Définir les bases horaires et régionales utilisées dans les calculs RH.",
          "Contrôler les référentiels proposés dans les fiches collaborateurs.",
          "Visualiser les étapes actives ou désactivées des processus RH.",
        ]}
        steps={[
          {
            title: "Contrôler les indicateurs",
            description:
              "Vérifie les volumes de sites, structures, métiers et référentiels actifs chargés depuis Supabase.",
          },
          {
            title: "Vérifier les paramètres",
            description:
              "Consulte les capacités hebdomadaires, journalières, annuelles et les paramètres régionaux de l’organisation.",
          },
          {
            title: "Rechercher un référentiel",
            description:
              "Utilise l’onglet Référentiels pour retrouver un site, un service, un métier, une fonction ou un type de contrat.",
          },
          {
            title: "Analyser les processus",
            description:
              "L’onglet Workflows présente les circuits d’absence, de temps et d’entretien selon les paramètres réellement activés.",
          },
          {
            title: "Exporter les données",
            description:
              "Le menu Exporter permet de télécharger l’ensemble des référentiels au format Excel ou CSV.",
          },
        ]}
        analyses={[
          {
            title: "Complétude structurelle",
            description:
              "Contrôle que les référentiels nécessaires aux fiches collaborateurs et aux contrats sont disponibles.",
          },
          {
            title: "Capacité théorique",
            description:
              "Vérifie les valeurs utilisées par le staffing, les temps, les coûts et les projections de disponibilité.",
          },
          {
            title: "Niveau d’automatisation",
            description:
              "Identifie les validations et suivis activés, désactivés ou encore manuels.",
          },
        ]}
        recommendations={[
          "Stabiliser les référentiels avant un import massif de collaborateurs.",
          "Éviter les doublons de départements, métiers, fonctions et types de contrat.",
          "Vérifier les horaires et calendriers avant d’activer le staffing et les temps.",
          "N’activer que les validations réellement nécessaires au fonctionnement de l’organisation.",
        ]}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sites"
          value={data.sites.length}
          description="Implantations réellement enregistrées dans Supabase."
          icon={MapPin}
          accent="indigo"
        />

        <MetricCard
          label="Structures"
          value={
            data.departments.length
          }
          description="Départements et services disponibles pour les collaborateurs."
          icon={Network}
          accent="emerald"
        />

        <MetricCard
          label="Métiers"
          value={
            data.jobFamilies.length +
            data.jobs.length
          }
          description="Familles et métiers opérationnels configurés."
          icon={UsersRound}
          accent="violet"
        />

        <MetricCard
          label="Référentiels actifs"
          value={activeReferenceCount}
          description="Éléments actifs réellement disponibles dans les modules RH."
          icon={Settings2}
          accent="amber"
        />
      </section>

      <div className="flex justify-center">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() =>
              setActiveTab("overview")
            }
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none"
                : "text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
            }`}
          >
            <Layers3 className="h-4 w-4" />
            Vue d’ensemble
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "references",
              )
            }
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
              activeTab === "references"
                ? "bg-violet-600 text-white shadow-md shadow-violet-100 dark:shadow-none"
                : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Référentiels
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "workflows",
              )
            }
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition ${
              activeTab === "workflows"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-100 dark:shadow-none"
                : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
            }`}
          >
            <Workflow className="h-4 w-4" />
            Workflows
          </button>
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          {!settings && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />

                <p className="text-sm font-bold text-amber-800">
                  Aucun paramétrage `hr_settings` n’a été trouvé pour cette organisation.
                </p>
              </div>
            </section>
          )}

          {settings && (
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <PanelHeader
                  icon={Clock3}
                  title="Paramètres de capacité"
                  description="Bases utilisées par le staffing, les temps et les coûts."
                  accent="indigo"
                />

                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <MetricCard
                    label="Durée hebdomadaire"
                    value={`${Number(
                      settings.default_weekly_hours,
                    )} h`}
                    description="Temps de travail hebdomadaire de référence."
                    icon={Clock3}
                    accent="indigo"
                  />

                  <MetricCard
                    label="Jours par semaine"
                    value={Number(
                      settings.default_working_days_per_week,
                    )}
                    description="Nombre de jours travaillés chaque semaine."
                    icon={CalendarDays}
                    accent="emerald"
                  />

                  <MetricCard
                    label="Base annuelle"
                    value={`${settings.default_annual_working_days} j`}
                    description="Nombre annuel de jours travaillés."
                    icon={CalendarCheck2}
                    accent="violet"
                  />

                  <MetricCard
                    label="Durée journalière"
                    value={`${Number(
                      settings.default_daily_hours,
                    )} h`}
                    description="Temps journalier utilisé dans les calculs."
                    icon={Clock3}
                    accent="amber"
                  />
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <PanelHeader
                  icon={Building2}
                  title="Paramètres régionaux"
                  description="Configuration appliquée à l’organisation."
                  accent="violet"
                />

                <dl className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Pays
                    </dt>

                    <dd className="text-sm font-black text-slate-900 dark:text-white">
                      {
                        settings.default_country_code
                      }
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Devise
                    </dt>

                    <dd className="text-sm font-black text-slate-900 dark:text-white">
                      {
                        settings.default_currency
                      }
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Langue
                    </dt>

                    <dd className="text-sm font-black text-slate-900 dark:text-white">
                      {
                        settings.default_locale
                      }
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 py-4">
                    <dt className="text-sm text-slate-500 dark:text-slate-400">
                      Fuseau horaire
                    </dt>

                    <dd className="text-right text-sm font-black text-slate-900 dark:text-white">
                      {
                        settings.default_timezone
                      }
                    </dd>
                  </div>
                </dl>
              </article>
            </section>
          )}
        </div>
      )}

      {activeTab ===
        "references" && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={searchValue}
                  onChange={(event) =>
                    setSearchValue(
                      event.target.value,
                    )
                  }
                  placeholder="Rechercher un site, un service, un métier ou un contrat..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-800 dark:focus:bg-slate-950"
                />
              </div>

              <p className="text-xs font-bold text-slate-500">
                {filteredCategories.reduce(
                  (total, category) =>
                    total +
                    category.items.length,
                  0,
                )}{" "}
                résultat(s)
              </p>
            </div>
          </section>

          {filteredCategories.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((category) => (
                <ReferenceCard
                  key={category.id}
                  {...category}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-950">
              <Search className="mx-auto h-7 w-7 text-indigo-400" />

              <h2 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">
                Aucun référentiel trouvé
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Modifie la recherche pour afficher d’autres résultats.
              </p>
            </section>
          )}
        </div>
      )}

      {activeTab ===
        "workflows" && (
        <div className="space-y-5">
          {settings ? (
            <>
              <WorkflowDiagram
                title="Processus de demande d’absence"
                description="Circuit réellement appliqué aux absences et congés."
                steps={absenceWorkflow}
                accent="emerald"
              />

              <WorkflowDiagram
                title="Processus de validation des temps"
                description="Circuit entre saisie, validation et valorisation projet."
                steps={timeWorkflow}
                accent="indigo"
              />

              <WorkflowDiagram
                title="Processus des entretiens RH"
                description="Automatisations des campagnes et plans d’action."
                steps={reviewWorkflow}
                accent="violet"
              />
            </>
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-800">
                Les paramètres RH doivent être créés avant de visualiser les workflows.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}