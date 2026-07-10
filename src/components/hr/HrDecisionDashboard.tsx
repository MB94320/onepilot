"use client";

import {
  type ComponentType,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Gauge,
  Lightbulb,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getEmployeeDepartment,
  getEmployeeFunction,
  getEmployeeJob,
  getEmployeeSite,
  type HrDirectoryEmployee,
} from "@/components/hr/HrDirectory";

type HrDecisionDashboardProps = {
  employees: HrDirectoryEmployee[];
  totalEmployees: number;
};

type ChartItem = {
  name: string;
  value: number;
};

type InsightCardProps = {
  title: string;
  description: string;
  level: "info" | "warning" | "success";
};

const chartColors = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#f97316",
  "#f43f5e",
  "#64748b",
];

function percentage(
  completeItems: number,
  totalItems: number,
) {
  if (totalItems === 0) {
    return 0;
  }

  return Math.round(
    (completeItems / totalItems) * 100,
  );
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    preboarding: "Pré-intégration",
    probation: "Période d’essai",
    active: "Actif",
    suspended: "Suspendu",
    notice_period: "Préavis",
    departed: "Sorti",
    archived: "Archivé",
  };

  return labels[status] ?? status;
}

function groupByValue(
  employees: HrDirectoryEmployee[],
  selector: (
    employee: HrDirectoryEmployee,
  ) => string | null | undefined,
  fallbackLabel: string,
): ChartItem[] {
  const values = new Map<string, number>();

  employees.forEach((employee) => {
    const rawValue = selector(employee)?.trim();
    const label = rawValue || fallbackLabel;

    values.set(
      label,
      (values.get(label) ?? 0) + 1,
    );
  });

  return Array.from(values.entries())
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort(
      (firstItem, secondItem) =>
        secondItem.value - firstItem.value,
    );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getDecisionMetrics(
  employees: HrDirectoryEmployee[],
) {
  const employeesWithoutStructure =
    employees.filter(
      (employee) =>
        !getEmployeeSite(employee) ||
        !getEmployeeDepartment(employee) ||
        (!getEmployeeJob(employee) &&
          !getEmployeeFunction(employee)),
    ).length;

  const employeesWithoutManager =
    employees.filter(
      (employee) =>
        !employee.manager_name,
    ).length;

  const employeesWithoutCost =
    employees.filter(
      (employee) =>
        employee.loaded_hourly_cost === null ||
        employee.loaded_hourly_cost ===
          undefined,
    ).length;

  const loadedCosts = employees
    .map(
      (employee) =>
        employee.loaded_hourly_cost,
    )
    .filter(
      (value): value is number =>
        typeof value === "number",
    );

  const averageLoadedHourlyCost =
    loadedCosts.length > 0
      ? loadedCosts.reduce(
          (total, value) => total + value,
          0,
        ) / loadedCosts.length
      : 0;

  const structureComplete =
    employees.filter(
      (employee) =>
        Boolean(getEmployeeSite(employee)) &&
        Boolean(getEmployeeDepartment(employee)) &&
        Boolean(
          getEmployeeJob(employee) ||
            getEmployeeFunction(employee),
        ),
    ).length;

  const managementComplete =
    employees.filter(
      (employee) =>
        Boolean(employee.manager_name),
    ).length;

  const costComplete =
    employees.filter(
      (employee) =>
        typeof employee.loaded_hourly_cost ===
        "number",
    ).length;

  const contractComplete =
    employees.filter(
      (employee) =>
        Boolean(employee.contract_type_name),
    ).length;

  const contactComplete =
    employees.filter(
      (employee) =>
        Boolean(
          employee.professional_email,
        ) &&
        Boolean(
          employee.professional_phone,
        ),
    ).length;

  const radarData = [
    {
      subject: "Structure",
      value: percentage(
        structureComplete,
        employees.length,
      ),
    },
    {
      subject: "Management",
      value: percentage(
        managementComplete,
        employees.length,
      ),
    },
    {
      subject: "Coûts",
      value: percentage(
        costComplete,
        employees.length,
      ),
    },
    {
      subject: "Contrats",
      value: percentage(
        contractComplete,
        employees.length,
      ),
    },
    {
      subject: "Contacts",
      value: percentage(
        contactComplete,
        employees.length,
      ),
    },
  ];

  const qualityScore =
    radarData.reduce(
      (total, item) =>
        total + item.value,
      0,
    ) / radarData.length;

  const alerts: InsightCardProps[] = [];

  if (employeesWithoutStructure > 0) {
    alerts.push({
      title: "Rattachements incomplets",
      description: `${employeesWithoutStructure} collaborateur(s) sans structure organisationnelle complète.`,
      level: "warning",
    });
  }

  if (employeesWithoutManager > 0) {
    alerts.push({
      title: "Managers non renseignés",
      description: `${employeesWithoutManager} collaborateur(s) sans manager N+1.`,
      level: "info",
    });
  }

  if (employeesWithoutCost > 0) {
    alerts.push({
      title: "Coûts incomplets",
      description: `${employeesWithoutCost} collaborateur(s) sans taux horaire chargé exploitable.`,
      level: "warning",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      title: "Données RH complètes",
      description:
        "Les principaux champs nécessaires au pilotage sont renseignés.",
      level: "success",
    });
  }

  return {
    radarData,
    qualityScore,
    alerts,
    averageLoadedHourlyCost,
  };
}

function InsightCard({
  title,
  description,
  level,
}: InsightCardProps) {
  const styles = {
    info: {
      container:
        "border-sky-100 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20",
      icon:
        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      badge:
        "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      label: "À suivre",
      Icon: CircleAlert,
    },

    warning: {
      container:
        "border-amber-100 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      label: "Risque",
      Icon: AlertTriangle,
    },

    success: {
      container:
        "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      badge:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      label: "OK",
      Icon: CheckCircle2,
    },
  };

  const selectedStyle = styles[level];
  const Icon = selectedStyle.Icon;

  return (
    <article
      className={`rounded-xl border px-3.5 py-3 ${selectedStyle.container}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-lg p-1.5 ${selectedStyle.icon}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-black text-slate-950 dark:text-white">
              {title}
            </h4>

            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${selectedStyle.badge}`}
            >
              {selectedStyle.label}
            </span>
          </div>

          <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function DecisionPanel({
  icon: Icon,
  title,
  description,
  accent,
  children,
}: {
  icon: ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
  accent:
    | "emerald"
    | "amber"
    | "violet";
  children: ReactNode;
}) {
  const accents = {
    emerald: {
      header:
        "from-emerald-50/80 via-white to-white dark:from-emerald-950/20 dark:via-slate-950 dark:to-slate-950",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      border:
        "border-emerald-100 dark:border-emerald-900/50",
    },

    amber: {
      header:
        "from-amber-50/80 via-white to-white dark:from-amber-950/20 dark:via-slate-950 dark:to-slate-950",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      border:
        "border-amber-100 dark:border-amber-900/50",
    },

    violet: {
      header:
        "from-violet-50/80 via-white to-white dark:from-violet-950/20 dark:via-slate-950 dark:to-slate-950",
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
      border:
        "border-violet-100 dark:border-violet-900/50",
    },
  };

  const selectedAccent = accents[accent];

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-950 ${selectedAccent.border}`}
    >
      <div
        className={`border-b border-slate-100 bg-gradient-to-r px-5 py-4 dark:border-slate-800 ${selectedAccent.header}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`rounded-xl p-2.5 ${selectedAccent.icon}`}
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
      </div>

      <div className="space-y-3 p-4">
        {children}
      </div>
    </section>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/50 px-5 py-4 dark:border-slate-800 dark:from-indigo-950/20 dark:via-slate-950 dark:to-violet-950/20">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div className="h-80 p-4">
        {children}
      </div>
    </article>
  );
}

export function HrDecisionInsightPanels({
  employees,
}: {
  employees: HrDirectoryEmployee[];
}) {
  const {
    qualityScore,
    alerts,
    averageLoadedHourlyCost,
  } = getDecisionMetrics(employees);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <DecisionPanel
        icon={Gauge}
        title="Synthèse"
        description="Lecture rapide de la qualité et du coût"
        accent="emerald"
      >
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            Coût horaire moyen
          </p>

          <p className="mt-1.5 text-xl font-black text-indigo-700 dark:text-indigo-300">
            {formatCurrency(
              averageLoadedHourlyCost,
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            Qualité globale
          </p>

          <p className="mt-1.5 text-xl font-black text-emerald-700 dark:text-emerald-300">
            {Math.round(qualityScore)} %
          </p>
        </div>
      </DecisionPanel>

      <DecisionPanel
        icon={AlertTriangle}
        title="Alertes"
        description="Points nécessitant une vérification ou une action."
        accent="amber"
      >
        {alerts.map((alert) => (
          <InsightCard
            key={alert.title}
            {...alert}
          />
        ))}
      </DecisionPanel>

      <DecisionPanel
        icon={Lightbulb}
        title="Recommandations"
        description="Actions suggérées pour améliorer le pilotage."
        accent="violet"
      >
        <InsightCard
          title="Améliorer les données les plus faibles"
          description="Le radar identifie immédiatement les dimensions nécessitant une campagne de complétion."
          level={
            qualityScore >= 80
              ? "success"
              : "info"
          }
        />

        {averageLoadedHourlyCost > 0 && (
          <InsightCard
            title="Comparer coût et facturation"
            description={`Le coût horaire moyen est de ${formatCurrency(
              averageLoadedHourlyCost,
            )}. Il devra être comparé aux taux de vente des projets.`}
            level="success"
          />
        )}
      </DecisionPanel>
    </div>
  );
}

export default function HrDecisionDashboard({
  employees,
  totalEmployees,
}: HrDecisionDashboardProps) {
  const statusData = groupByValue(
    employees,
    (employee) =>
      getStatusLabel(employee.employment_status),
    "Non renseigné",
  );

  const contractData = groupByValue(
    employees,
    (employee) =>
      employee.contract_type_name,
    "Sans contrat",
  ).slice(0, 8);

  const departmentData = groupByValue(
    employees,
    (employee) =>
      getEmployeeDepartment(employee),
    "Sans service",
  ).slice(0, 8);

  const { radarData } =
    getDecisionMetrics(employees);

  const filteredRatio =
    totalEmployees > 0
      ? Math.round(
          (employees.length /
            totalEmployees) *
            100,
        )
      : 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-indigo-900/60 dark:from-indigo-950/20 dark:via-slate-950 dark:to-violet-950/20">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              Analyse décisionnelle
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Les résultats suivent le périmètre filtré.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">
          <Users className="h-4 w-4" />

          {employees.length} collaborateur
          {employees.length > 1 ? "s" : ""} —{" "}
          {filteredRatio}% de l’effectif
        </div>
      </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard
            title="Répartition par statut"
            description="Composition du cycle de vie des collaborateurs."
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                >
                  {statusData.map(
                    (item, index) => (
                      <Cell
                        key={item.name}
                        fill={
                          chartColors[
                            index %
                              chartColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>

                <Tooltip />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Répartition par contrat"
            description="Volumes par mode de collaboration."
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={contractData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                />

                <YAxis allowDecimals={false} />
                <Tooltip />

                <Bar
                  dataKey="value"
                  name="Collaborateurs"
                  radius={[8, 8, 0, 0]}
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Effectif par service"
            description="Concentrations organisationnelles."
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={departmentData}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  radius={[0, 8, 8, 0]}
                  fill="#06b6d4"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Qualité des données RH"
            description="Complétude des informations nécessaires au pilotage."
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <RadarChart data={radarData}>
                <PolarGrid />

                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11 }}
                />

                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />

                <Radar
                  name="Complétude"
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#8b5cf6"
                  fillOpacity={0.35}
                />

                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
    </section>
  );
}