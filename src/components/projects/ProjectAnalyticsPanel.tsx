"use client";

import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  GitBranch,
  ListChecks,
  ShieldAlert,
  Target,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  HrChartCard,
  HrMetricCard,
  HrSectionCard,
} from "@/components/hr/HrReferenceUi";

export type ProjectAnalyticsMode =
  | "portfolio"
  | "timeline"
  | "gantt"
  | "actions"
  | "performance";

type AnyRow = Record<string, unknown>;
type ChartRow = Record<string, string | number>;

export type ProjectAnalyticsData = {
  projects?: AnyRow[];
  tasks?: AnyRow[];
  actions?: AnyRow[];
  health?: AnyRow[];
  deliverables?: AnyRow[];
  risks?: AnyRow[];
  nonconformities?: AnyRow[];
  financials?: AnyRow[];
  satisfaction?: AnyRow[];
  assignments?: AnyRow[];
  employees?: AnyRow[];
  milestones?: AnyRow[];
};

type ProjectAnalyticsPanelProps = {
  mode: ProjectAnalyticsMode;
  data: ProjectAnalyticsData;
};

const colors = {
  indigo: "#818cf8",
  emerald: "#6ee7b7",
  amber: "#fcd34d",
  rose: "#fda4af",
  sky: "#7dd3fc",
  slate: "#94a3b8",
};

const palette = [
  colors.indigo,
  colors.emerald,
  colors.amber,
  colors.rose,
  colors.sky,
  colors.slate,
];

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
});

function numberValue(row: AnyRow, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function optionalNumber(row: AnyRow, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] === null || row[key] === undefined || row[key] === "") continue;
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function textValue(row: AnyRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function dateValue(row: AnyRow, ...keys: string[]) {
  const value = textValue(row, ...keys);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return monthFormatter.format(new Date(year, month - 1, 1)).replace(".", "");
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    planned: "Ouvert",
    open: "Ouvert",
    active: "En cours",
    in_progress: "En cours",
    on_hold: "En attente",
    blocked: "Bloqué",
    completed: "Clos",
    closed: "Clos",
    cancelled: "Annulé",
    low: "Faible",
    medium: "Moyenne",
    high: "Haute",
    critical: "Critique",
    compliant: "Conforme",
    partially_compliant: "Partiellement conforme",
    non_compliant: "Non conforme",
    todo: "Ouverte",
    pending: "En attente",
    review: "En revue",
    done: "Clôturée",
    archived: "Archivée",
    project: "Projet",
    risk: "Risque",
    nonconformity: "Non-conformité",
    non_conformity: "Non-conformité",
    audit: "Audit",
    quality: "Qualité",
    customer: "Client",
    finance: "Finance",
    management: "Management",
    generic: "Générique",
  };
  return labels[value.toLowerCase()] || value || "Non renseigné";
}

function projectName(row: AnyRow) {
  return (
    textValue(
      row,
      "code",
      "project_code",
      "project_number",
      "name",
      "project_name",
      "title",
    ) || "Projet"
  );
}

function groupCount(rows: AnyRow[], keys: string[], fallback = "Non renseigné") {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = textValue(row, ...keys) || fallback;
    grouped.set(label, (grouped.get(label) || 0) + 1);
  });
  return [...grouped.entries()]
    .map(([name, value]) => ({ name: statusLabel(name), value }))
    .sort((a, b) => b.value - a.value);
}

function sum(rows: AnyRow[], ...keys: string[]) {
  return rows.reduce((total, row) => total + numberValue(row, ...keys), 0);
}

function average(rows: AnyRow[], ...keys: string[]) {
  const values = rows
    .map((row) => optionalNumber(row, ...keys))
    .filter((value): value is number => value !== null);
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function businessDaysBetween(start: Date, end: Date) {
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  cursor.setHours(12, 0, 0, 0);
  const limit = new Date(end);
  limit.setHours(12, 0, 0, 0);
  while (cursor < limit) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function projectLookup(projects: AnyRow[]) {
  return new Map(
    projects.map((project) => [
      textValue(project, "id"),
      {
        name: projectName(project),
        client:
          textValue(project, "client_name", "customer_name", "account_name") ||
          "Client non renseigné",
        sector:
          textValue(project, "sector_name", "business_sector", "industry") ||
          "Secteur non renseigné",
      },
    ]),
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-xs font-semibold text-slate-500 dark:border-slate-600 dark:bg-slate-700/45 dark:text-slate-300">
      {label}
    </div>
  );
}

function DonutChart({ data }: { data: ChartRow[] }) {
  if (!data.length) return <EmptyChart label="Aucune donnée disponible sur le périmètre." />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={72}
          outerRadius={112}
          paddingAngle={3}
        >
          {data.map((row, index) => (
            <Cell key={`${row.name}-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ChartGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 xl:grid-cols-2">{children}</div>;
}

function AnalysisSection({
  count,
  description,
  children,
}: {
  count: number;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <HrSectionCard
      icon={BarChart3}
      title="Analyse décisionnelle"
      description={description}
      right={
        <span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-sm dark:border-indigo-800/70 dark:bg-slate-600/70 dark:text-indigo-200">
          {count} élément{count > 1 ? "s" : ""} analysé{count > 1 ? "s" : ""}
        </span>
      }
    >
      {children}
    </HrSectionCard>
  );
}

function PortfolioAnalytics({ data }: { data: ProjectAnalyticsData }) {
  const projects = data.projects || [];
  const health = data.health || [];
  const status = groupCount(projects, ["status"]);
  const budgets = projects.slice(0, 14).map((project) => {
    const ordered = numberValue(
      project,
      "ordered_budget",
      "budget_ordered",
      "budget_amount",
      "contract_value",
    );
    const consumed = numberValue(
      project,
      "consumed_budget",
      "actual_cost",
      "cost_to_date",
    );
    return {
      name: projectName(project),
      ordered,
      consumed,
      remaining: Math.max(0, ordered - consumed),
    };
  });
  const healthRows = health.length ? health : projects;
  const healthData = [
    ["Délais", ["schedule_score", "schedule_health"]],
    ["Coûts", ["cost_score", "cost_health"]],
    ["Périmètre", ["scope_score", "scope_health"]],
    ["Qualité", ["quality_score", "quality_health"]],
    ["Ressources", ["resource_score", "resource_health"]],
    ["Risques", ["risk_score", "risk_health"]],
  ].map(([name, keys]) => ({
    name: String(name),
    score: Math.round(average(healthRows, ...(keys as string[]))),
  }));

  return (
    <AnalysisSection
      count={projects.length}
      description="Vue consolidée des statuts, engagements financiers et dimensions de santé du portefeuille."
    >
      <ChartGrid>
        <HrChartCard
          title="Répartition des projets par statut"
          description="Lecture immédiate du volume de projets ouverts, en cours, clos, bloqués ou annulés."
          exportConfig={{
            type: "bar",
            data: status,
            nameKey: "name",
            series: [{ key: "value", label: "Projets", color: colors.indigo }],
          }}
        >
          <DonutChart data={status} />
        </HrChartCard>
        <HrChartCard
          title="Budget commandé, consommé et restant"
          description="Comparaison par projet des engagements contractuels, coûts consommés et reste disponible."
          exportConfig={{
            type: "bar",
            data: budgets,
            nameKey: "name",
            series: [
              { key: "ordered", label: "Commandé", color: colors.indigo },
              { key: "consumed", label: "Consommé", color: colors.rose },
              { key: "remaining", label: "Restant", color: colors.emerald },
            ],
            unit: " €",
          }}
        >
          {budgets.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ordered" name="Commandé" fill={colors.indigo} />
                <Bar dataKey="consumed" name="Consommé" fill={colors.rose} />
                <Bar dataKey="remaining" name="Restant" fill={colors.emerald} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucun budget projet disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Radar de santé du portefeuille"
          description="Scores moyens délais, coûts, périmètre, qualité, ressources et maîtrise des risques."
          exportConfig={{
            type: "radar",
            data: healthData,
            nameKey: "name",
            series: [{ key: "score", label: "Santé", color: colors.emerald }],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={healthData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <Radar
                name="Santé"
                dataKey="score"
                stroke={colors.emerald}
                fill={colors.emerald}
                fillOpacity={0.24}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </HrChartCard>
      </ChartGrid>
    </AnalysisSection>
  );
}

function ActionsAnalytics({ data }: { data: ProjectAnalyticsData }) {
  const actions = data.actions || [];
  const lookup = projectLookup(data.projects || []);
  const status = groupCount(actions, ["status"]);
  const priorities = groupCount(actions, ["priority"]);
  const effectiveness = groupCount(actions, ["effectiveness_status", "effectiveness", "efficiency_status"]);
  const origins = groupCount(actions, ["origin_type", "origin", "source_module", "source_type"]);
  const enriched = actions.map((action) => {
    const project = lookup.get(textValue(action, "project_id"));
    return {
      ...action,
      resolved_project: project?.name || textValue(action, "project_name") || "Sans projet",
      resolved_client: project?.client || textValue(action, "client_name") || "Client non renseigné",
      resolved_sector: project?.sector || textValue(action, "sector_name") || "Secteur non renseigné",
    };
  });
  const projects = groupCount(enriched, ["resolved_project"]);
  const clients = groupCount(enriched, ["resolved_client"]);
  const sectors = groupCount(enriched, ["resolved_sector"]);
  const monthlyMap = new Map<string, { created: number; closed: number; late: number }>();
  actions.forEach((action) => {
    const created = dateValue(action, "opened_at", "created_at");
    const closed = dateValue(action, "actual_completion_date", "closed_at");
    if (created) { const key = monthKey(created); const current = monthlyMap.get(key) || { created: 0, closed: 0, late: 0 }; current.created += 1; monthlyMap.set(key, current); }
    if (closed) { const key = monthKey(closed); const current = monthlyMap.get(key) || { created: 0, closed: 0, late: 0 }; current.closed += 1; monthlyMap.set(key, current); }
  });
  const monthly = [...monthlyMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => ({ name: monthLabel(key), ...value }));

  const donut = (title: string, description: string, rows: ChartRow[]) => (
    <HrChartCard
      title={title}
      description={description}
      exportConfig={{
        type: "bar",
        data: rows,
        nameKey: "name",
        series: [{ key: "value", label: "Actions", color: colors.indigo }],
      }}
    >
      <DonutChart data={rows} />
    </HrChartCard>
  );
  const bars = (
    title: string,
    description: string,
    rows: ChartRow[],
    vertical = true,
  ) => (
    <HrChartCard
      title={title}
      description={description}
      exportConfig={{
        type: "bar",
        data: rows,
        nameKey: "name",
        series: [{ key: "value", label: "Actions", color: colors.sky }],
      }}
    >
      {rows.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout={vertical ? "vertical" : "horizontal"}>
            <CartesianGrid strokeDasharray="3 3" />
            {vertical ? (
              <>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={115} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
              </>
            )}
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Actions" fill={colors.sky} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart label="Aucune action disponible sur le périmètre." />
      )}
    </HrChartCard>
  );

  return (
    <AnalysisSection
      count={actions.length}
      description="Analyse transverse des actions par statut, priorité, efficacité, origine et rattachement commercial."
    >
      <ChartGrid>
        {donut("Répartition par statut", "Équilibre des actions ouvertes, en cours, closes, en attente ou bloquées.", status)}
        {donut("Répartition par priorité", "Volume d’actions selon leur niveau de priorité opérationnelle.", priorities)}
        {donut("Répartition par efficacité", "Conformité et efficacité vérifiée des actions réalisées.", effectiveness)}
        {donut("Répartition par origine", "Actions issues des risques, non-conformités, audits, projets ou autres modules.", origins)}
        {bars("Volume par projet", "Concentration des actions par projet pour identifier les zones de dérive.", projects, false)}
        {bars("Volume par client", "Exposition des clients au volume d’actions correctives ou préventives.", clients)}
        {bars("Volume par secteur d’activité", "Comparaison des volumes d’actions selon les secteurs servis.", sectors)}
        <HrChartCard title="Créations et clôtures par mois" description="Évolution mensuelle du flux entrant et du débit de clôture pour détecter une croissance du stock." exportConfig={{ type: "line", data: monthly, nameKey: "name", series: [{ key: "created", label: "Créées", color: colors.indigo }, { key: "closed", label: "Clôturées", color: colors.emerald }] }}>
          {monthly.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="created" name="Créées" stroke={colors.indigo} strokeWidth={3} /><Line type="monotone" dataKey="closed" name="Clôturées" stroke={colors.emerald} strokeWidth={3} /></LineChart></ResponsiveContainer> : <EmptyChart label="Aucun historique d’action disponible." />}
        </HrChartCard>
      </ChartGrid>
    </AnalysisSection>
  );
}

function monthlyFinancialData(financials: AnyRow[]) {
  const grouped = new Map<
    string,
    { planned: number; earned: number; actual: number; production: number; invoiced: number }
  >();
  financials.forEach((row) => {
    const date = dateValue(row, "period_date", "month", "snapshot_date", "date");
    if (!date) return;
    const key = monthKey(date);
    const current = grouped.get(key) || {
      planned: 0,
      earned: 0,
      actual: 0,
      production: 0,
      invoiced: 0,
    };
    current.planned += numberValue(row, "planned_value", "pv", "budgeted_cost");
    current.earned += numberValue(row, "earned_value", "ev", "value_earned");
    current.actual += numberValue(row, "actual_cost", "ac", "cost_amount");
    current.production += numberValue(row, "production_amount", "revenue_recognized", "production");
    current.invoiced += numberValue(row, "invoiced_amount", "billing_amount", "revenue");
    grouped.set(key, current);
  });
  let planned = 0;
  let earned = 0;
  let actual = 0;
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      planned += value.planned;
      earned += value.earned;
      actual += value.actual;
      return {
        name: monthLabel(key),
        VP: Math.round(planned),
        VA: Math.round(earned),
        CR: Math.round(actual),
        costs: Math.round(value.actual),
        production: Math.round(value.production),
        invoiced: Math.round(value.invoiced),
        margin:
          value.production > 0
            ? Math.round(((value.production - value.actual) / value.production) * 1000) / 10
            : 0,
      };
    });
}

function deliveryPerformance(deliverables: AnyRow[]) {
  const grouped = new Map<
    string,
    { due: number; delivered: number; onTime: number; firstTimeGood: number; delay: number }
  >();
  deliverables.forEach((row) => {
    const due = dateValue(row, "replanned_date", "forecast_date", "due_date", "planned_date");
    if (!due) return;
    const actual = dateValue(row, "actual_delivery_date", "delivered_at", "completed_at");
    const key = monthKey(due);
    const current = grouped.get(key) || {
      due: 0,
      delivered: 0,
      onTime: 0,
      firstTimeGood: 0,
      delay: 0,
    };
    current.due += 1;
    if (actual) {
      current.delivered += 1;
      if (actual <= due) current.onTime += 1;
      current.delay += businessDaysBetween(due, actual);
      const good =
        row.first_time_right === true ||
        row.first_pass_ok === true ||
        ["accepted", "approved", "compliant"].includes(
          textValue(row, "quality_status", "acceptance_status").toLowerCase(),
        );
      if (good) current.firstTimeGood += 1;
    }
    grouped.set(key, current);
  });
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      name: monthLabel(key),
      deliverables: value.due,
      OTD: value.due ? Math.round((value.onTime / value.due) * 1000) / 10 : 0,
      OQD: value.delivered
        ? Math.round((value.firstTimeGood / value.delivered) * 1000) / 10
        : 0,
      DoD: value.delay,
    }));
}

function assignmentPerformance(assignments: AnyRow[]) {
  const grouped = new Map<
    string,
    { planned: number; actual: number; capacity: number; potential: number; productive: number; absence: number }
  >();
  assignments.forEach((row) => {
    const date = dateValue(row, "period_start", "month", "start_date", "assignment_date");
    if (!date) return;
    const key = monthKey(date);
    const current = grouped.get(key) || {
      planned: 0,
      actual: 0,
      capacity: 0,
      potential: 0,
      productive: 0,
      absence: 0,
    };
    current.planned += numberValue(row, "planned_hours", "allocated_hours", "forecast_hours");
    current.actual += numberValue(row, "actual_hours", "worked_hours", "realized_hours");
    current.capacity += numberValue(row, "capacity_hours", "available_hours");
    current.potential += numberValue(row, "potential_capacity_hours", "max_capacity_hours", "capacity_hours");
    current.productive += numberValue(row, "productive_hours", "billable_hours", "production_hours");
    current.absence += numberValue(row, "absence_hours", "leave_hours");
    grouped.set(key, current);
  });
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const workable = Math.max(0, value.capacity - value.absence);
      return {
        name: monthLabel(key),
        planned: Math.round(value.planned * 10) / 10,
        actual: Math.round(value.actual * 10) / 10,
        capacity: Math.round(value.capacity * 10) / 10,
        potential: Math.round(value.potential * 10) / 10,
        TACE: workable ? Math.round((value.productive / workable) * 1000) / 10 : 0,
      };
    });
}

function satisfactionData(rows: AnyRow[]) {
  const dimensions = [
    ["Écoute client", ["customer_listening_score", "listening_score"]],
    ["Planification", ["planning_score", "project_planning_score"]],
    ["Compétences", ["technical_skills_score", "skills_score"]],
    ["Indicateurs", ["monitoring_score", "kpi_score"]],
    ["Risques", ["risk_management_score", "risks_score"]],
  ] as const;
  const radar = dimensions.map(([name, keys]) => ({
    name,
    score: Math.round(average(rows, ...keys) * 10) / 10,
  }));
  const monthly = new Map<string, number[]>();
  rows.forEach((row) => {
    const date = dateValue(row, "survey_date", "period_date", "month", "created_at");
    if (!date) return;
    const values = dimensions
      .map(([, keys]) => optionalNumber(row, ...keys))
      .filter((value): value is number => value !== null);
    const global = optionalNumber(row, "overall_score", "global_score", "score");
    const score = global ?? (values.length ? values.reduce((total, value) => total + value, 0) / values.length : null);
    if (score === null) return;
    const key = monthKey(date);
    monthly.set(key, [...(monthly.get(key) || []), score]);
  });
  return {
    radar,
    monthly: [...monthly.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => ({
        name: monthLabel(key),
        score: Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10,
      })),
  };
}

function riskMatrix(rows: AnyRow[]) {
  const grouped = new Map<string, ChartRow>();
  rows.forEach((row) => {
    const probability = Math.min(4, Math.max(1, numberValue(row, "probability", "probability_score") || 1));
    const impact = Math.min(4, Math.max(1, numberValue(row, "impact", "impact_score") || 1));
    const key = `${probability}-${impact}`;
    const current = grouped.get(key);
    grouped.set(key, {
      name: `P${probability} × I${impact}`,
      probability,
      impact,
      count: Number(current?.count || 0) + 1,
    });
  });
  return [...grouped.values()];
}

function PerformanceAnalytics({ data }: { data: ProjectAnalyticsData }) {
  const financial = monthlyFinancialData(data.financials || []);
  const deliveries = deliveryPerformance(data.deliverables || []);
  const load = assignmentPerformance(data.assignments || []);
  const risks = riskMatrix(data.risks || []);
  const satisfaction = satisfactionData(data.satisfaction || []);
  const latest = financial[financial.length - 1];
  const cpi = latest && latest.CR > 0 ? latest.VA / latest.CR : 0;
  const spi = latest && latest.VP > 0 ? latest.VA / latest.VP : 0;

  return (
    <AnalysisSection
      count={(data.projects || []).length}
      description="Pilotage intégré valeur acquise, livrables, risques, capacité, rentabilité, satisfaction et performance ESN."
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HrMetricCard
          icon={CircleDollarSign}
          label="Écart de coûts"
          value={`${Math.round((latest?.VA || 0) - (latest?.CR || 0)).toLocaleString("fr-FR")} €`}
          description="EV = valeur acquise (VA) − coûts réels (CR). Une valeur négative signale un dépassement."
          accent={(latest?.VA || 0) >= (latest?.CR || 0) ? "emerald" : "rose"}
        />
        <HrMetricCard
          icon={Gauge}
          label="IPC / CPI"
          value={cpi ? cpi.toFixed(2) : "—"}
          description="IPC = VA ÷ CR. Supérieur à 1 : coût maîtrisé ; inférieur à 1 : dérive de coût."
          accent={cpi >= 1 ? "emerald" : cpi ? "rose" : "slate"}
        />
        <HrMetricCard
          icon={CalendarClock}
          label="IPD / SPI"
          value={spi ? spi.toFixed(2) : "—"}
          description="IPD = VA ÷ VP. Supérieur à 1 : avance ; inférieur à 1 : retard sur le plan de référence."
          accent={spi >= 1 ? "emerald" : spi ? "amber" : "slate"}
        />
        <HrMetricCard
          icon={Activity}
          label="TACE moyen"
          value={load.length ? `${Math.round(load.reduce((total, row) => total + row.TACE, 0) / load.length)} %` : "—"}
          description="Heures productives ÷ capacité travaillable, congés et absences exclus."
          accent="indigo"
        />
      </div>
      <ChartGrid>
        <HrChartCard
          title="Courbe en S — VP, VA et CR"
          description="Valeur planifiée, valeur acquise et coûts réels cumulés pour détecter précocement les dérives."
          exportConfig={{
            type: "line",
            data: financial,
            nameKey: "name",
            series: [
              { key: "VP", label: "VP", color: colors.indigo },
              { key: "VA", label: "VA", color: colors.emerald },
              { key: "CR", label: "CR", color: colors.rose },
            ],
            unit: " €",
          }}
        >
          {financial.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financial}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="VP" stroke={colors.indigo} strokeWidth={3} />
                <Line type="monotone" dataKey="VA" stroke={colors.emerald} strokeWidth={3} />
                <Line type="monotone" dataKey="CR" stroke={colors.rose} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune donnée de valeur acquise disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Livrables mensuels, OTD et OQD"
          description="Volume attendu, ponctualité de livraison et qualité au premier passage par mois."
          exportConfig={{
            type: "bar",
            data: deliveries,
            nameKey: "name",
            series: [
              { key: "deliverables", label: "Livrables", color: colors.indigo },
              { key: "OTD", label: "OTD (%)", color: colors.emerald },
              { key: "OQD", label: "OQD (%)", color: colors.sky },
            ],
          }}
        >
          {deliveries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={deliveries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="count" allowDecimals={false} />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="count" dataKey="deliverables" name="Livrables" fill={colors.indigo} />
                <Line yAxisId="percent" type="monotone" dataKey="OTD" name="OTD (%)" stroke={colors.emerald} strokeWidth={3} />
                <Line yAxisId="percent" type="monotone" dataKey="OQD" name="OQD (%)" stroke={colors.sky} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucun livrable daté disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Profondeur de retard — DoD"
          description="Nombre cumulé de jours ouvrés de retard par rapport à la dernière date planifiée."
          exportConfig={{
            type: "bar",
            data: deliveries,
            nameKey: "name",
            series: [{ key: "DoD", label: "DoD (jours)", color: colors.rose }],
            unit: " j",
          }}
        >
          {deliveries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deliveries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="DoD" name="DoD (jours)" fill={colors.rose} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune mesure de retard disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Matrice des risques 4 × 4"
          description="Positionnement selon probabilité (1 à 4) et impact chiffre d’affaires (1 à 4)."
          exportConfig={{
            type: "bar",
            data: risks,
            nameKey: "name",
            series: [{ key: "count", label: "Risques", color: colors.rose }],
          }}
        >
          {risks.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="probability" name="Probabilité" domain={[1, 4]} ticks={[1, 2, 3, 4]} />
                <YAxis type="number" dataKey="impact" name="Impact" domain={[1, 4]} ticks={[1, 2, 3, 4]} />
                <ZAxis type="number" dataKey="count" range={[100, 900]} name="Risques" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Legend />
                <Scatter name="Risques" data={risks} fill={colors.rose} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucun risque évalué sur la matrice 4 × 4." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Plan de charge et capacité"
          description="Charge prévisionnelle et réelle comparée aux capacités actuelle et potentielle."
          exportConfig={{
            type: "bar",
            data: load,
            nameKey: "name",
            series: [
              { key: "planned", label: "Charge prévisionnelle", color: colors.indigo },
              { key: "actual", label: "Charge réelle", color: colors.emerald },
              { key: "capacity", label: "Capacité actuelle", color: colors.amber },
              { key: "potential", label: "Capacité potentielle", color: colors.sky },
            ],
            unit: " h",
          }}
        >
          {load.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={load}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" name="Charge prévisionnelle" fill={colors.indigo} />
                <Bar dataKey="actual" name="Charge réelle" fill={colors.emerald} />
                <Line type="monotone" dataKey="capacity" name="Capacité actuelle" stroke={colors.amber} strokeWidth={3} />
                <Line type="monotone" dataKey="potential" name="Capacité potentielle" stroke={colors.sky} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune donnée de charge ou capacité disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Coûts, production et marge"
          description="Coûts et production mensuels en euros, complétés par le taux de marge réalisé."
          exportConfig={{
            type: "bar",
            data: financial,
            nameKey: "name",
            series: [
              { key: "costs", label: "Coûts", color: colors.rose },
              { key: "production", label: "Production", color: colors.emerald },
              { key: "margin", label: "Marge (%)", color: colors.indigo },
            ],
          }}
        >
          {financial.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financial}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="amount" />
                <YAxis yAxisId="margin" orientation="right" unit=" %" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="amount" dataKey="costs" name="Coûts" fill={colors.rose} />
                <Bar yAxisId="amount" dataKey="production" name="Production" fill={colors.emerald} />
                <Line yAxisId="margin" type="monotone" dataKey="margin" name="Marge (%)" stroke={colors.indigo} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune donnée financière mensuelle disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Satisfaction client par dimension"
          description="Écoute client, planification, compétences, indicateurs de suivi et gestion des risques sur 5."
          exportConfig={{
            type: "radar",
            data: satisfaction.radar,
            nameKey: "name",
            series: [{ key: "score", label: "Satisfaction", color: colors.sky }],
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={satisfaction.radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <Radar name="Satisfaction" dataKey="score" stroke={colors.sky} fill={colors.sky} fillOpacity={0.25} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </HrChartCard>
        <HrChartCard
          title="Satisfaction client mensuelle"
          description="Évolution de la note globale moyenne de satisfaction client, sur une échelle de 0 à 5."
          exportConfig={{
            type: "line",
            data: satisfaction.monthly,
            nameKey: "name",
            series: [{ key: "score", label: "Satisfaction", color: colors.indigo }],
          }}
        >
          {satisfaction.monthly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfaction.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" name="Satisfaction" stroke={colors.indigo} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune enquête de satisfaction datée disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="TACE mensuel"
          description="Taux d’activité congés exclus : production rapportée à la capacité réellement travaillable."
          exportConfig={{
            type: "line",
            data: load,
            nameKey: "name",
            series: [{ key: "TACE", label: "TACE", color: colors.amber }],
            unit: " %",
          }}
        >
          {load.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={load}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit=" %" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="TACE" name="TACE" stroke={colors.amber} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune donnée de capacité productive disponible." />
          )}
        </HrChartCard>
      </ChartGrid>
    </AnalysisSection>
  );
}

function PlanningAnalytics({ mode, data }: { mode: "timeline" | "gantt"; data: ProjectAnalyticsData }) {
  const tasks = mode === "timeline" ? [...(data.tasks || []), ...(data.milestones || [])] : data.tasks || [];
  const now = new Date();
  const milestones = tasks.filter((task) => {
    const type = textValue(task, "task_type", "type", "kind").toLowerCase();
    return type === "milestone" || task.is_milestone === true || numberValue(task, "duration_days") === 0;
  });
  const dated = tasks.filter((task) => dateValue(task, "due_date", "end_date", "forecast_date"));
  const grouped = new Map<string, { milestones: number; late: number; planned: number; actual: number }>();
  dated.forEach((task) => {
    const due = dateValue(task, "due_date", "end_date", "forecast_date");
    if (!due) return;
    const key = monthKey(due);
    const current = grouped.get(key) || { milestones: 0, late: 0, planned: 0, actual: 0 };
    if (milestones.includes(task)) current.milestones += 1;
    const closed = ["done", "completed", "closed", "cancelled"].includes(textValue(task, "status").toLowerCase());
    if (!closed && due < now) current.late += 1;
    current.planned += numberValue(task, "planned_hours", "forecast_hours", "work_hours");
    current.actual += numberValue(task, "actual_hours", "worked_hours", "consumed_hours");
    grouped.set(key, current);
  });
  const monthly = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({ name: monthLabel(key), ...value }));
  const projectNames = projectLookup(data.projects || []);
  const critical = tasks.filter((task) => {
    const float = optionalNumber(task, "total_float_days", "free_float_days", "slack_days");
    return task.is_critical === true || task.critical_path === true || float === 0;
  });
  const criticalByProject = new Map<string, number>();
  critical.forEach((task) => {
    const projectId = textValue(task, "project_id");
    const name = projectNames.get(projectId)?.name || textValue(task, "project_name") || "Sans projet";
    criticalByProject.set(name, (criticalByProject.get(name) || 0) + 1);
  });
  const criticalRows = [...criticalByProject.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
  const projectStatus = groupCount(data.projects || [], ["status"]);
  const startsEndsMap = new Map<string, { starts: number; ends: number }>();
  (data.projects || []).forEach((project) => {
    const start = dateValue(project, "start_date");
    const end = dateValue(project, "end_date", "forecast_end_date");
    if (start) { const key = monthKey(start); const current = startsEndsMap.get(key) || { starts: 0, ends: 0 }; current.starts += 1; startsEndsMap.set(key, current); }
    if (end) { const key = monthKey(end); const current = startsEndsMap.get(key) || { starts: 0, ends: 0 }; current.ends += 1; startsEndsMap.set(key, current); }
  });
  const startsEnds = [...startsEndsMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => ({ name: monthLabel(key), ...value }));

  return (
    <AnalysisSection
      count={tasks.length}
      description={
        mode === "gantt"
          ? "Analyse de la planification, des jalons, retards, charges et tâches du chemin critique."
          : "Vision temporelle consolidée des jalons, retards, charges et échéances critiques du portefeuille."
      }
    >
      <ChartGrid>
        <HrChartCard
          title="Jalons par mois"
          description="Volume mensuel des jalons contractuels, décisionnels et opérationnels planifiés."
          exportConfig={{
            type: "bar",
            data: monthly,
            nameKey: "name",
            series: [{ key: "milestones", label: "Jalons", color: colors.indigo }],
          }}
        >
          {monthly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="milestones" name="Jalons" fill={colors.indigo} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucun jalon daté disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Échéances en retard"
          description="Tâches et jalons non clos dont l’échéance est dépassée, regroupés par mois."
          exportConfig={{
            type: "bar",
            data: monthly,
            nameKey: "name",
            series: [{ key: "late", label: "Retards", color: colors.rose }],
          }}
        >
          {monthly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="late" name="Retards" fill={colors.rose} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune échéance projet disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Charge planifiée et réalisée"
          description="Comparaison mensuelle de la charge de référence avec les heures réellement consommées."
          exportConfig={{
            type: "bar",
            data: monthly,
            nameKey: "name",
            series: [
              { key: "planned", label: "Planifiée", color: colors.sky },
              { key: "actual", label: "Réalisée", color: colors.emerald },
            ],
            unit: " h",
          }}
        >
          {monthly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" name="Planifiée" fill={colors.sky} />
                <Bar dataKey="actual" name="Réalisée" fill={colors.emerald} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune charge de tâche disponible." />
          )}
        </HrChartCard>
        <HrChartCard
          title="Tâches du chemin critique"
          description="Volume de tâches sans marge totale par projet, à sécuriser en priorité dans le planning."
          exportConfig={{
            type: "bar",
            data: criticalRows,
            nameKey: "name",
            series: [{ key: "value", label: "Tâches critiques", color: colors.amber }],
          }}
        >
          {criticalRows.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalRows} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Tâches critiques" fill={colors.amber} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Aucune tâche identifiée sur le chemin critique." />
          )}
        </HrChartCard>
        {mode === "timeline" && <HrChartCard title="Répartition des projets par statut" description="Équilibre temporel entre projets ouverts, en cours, bloqués, clos et annulés." exportConfig={{ type: "bar", data: projectStatus, nameKey: "name", series: [{ key: "value", label: "Projets", color: colors.indigo }] }}><DonutChart data={projectStatus} /></HrChartCard>}
        {mode === "timeline" && <HrChartCard title="Démarrages et clôtures par mois" description="Concentration des lancements et fins de projet pour anticiper les périodes d’arbitrage." exportConfig={{ type: "bar", data: startsEnds, nameKey: "name", series: [{ key: "starts", label: "Démarrages", color: colors.sky }, { key: "ends", label: "Clôtures prévues", color: colors.emerald }] }}>{startsEnds.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={startsEnds}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="starts" name="Démarrages" fill={colors.sky} /><Bar dataKey="ends" name="Clôtures prévues" fill={colors.emerald} /></BarChart></ResponsiveContainer> : <EmptyChart label="Aucune date projet disponible." />}</HrChartCard>}
      </ChartGrid>
    </AnalysisSection>
  );
}

export default function ProjectAnalyticsPanel({ mode, data }: ProjectAnalyticsPanelProps) {
  const normalized = useMemo<ProjectAnalyticsData>(
    () => ({
      projects: data.projects || [],
      tasks: data.tasks || [],
      actions: data.actions || [],
      health: data.health || [],
      deliverables: data.deliverables || [],
      risks: data.risks || [],
      nonconformities: data.nonconformities || [],
      financials: data.financials || [],
      satisfaction: data.satisfaction || [],
      assignments: data.assignments || [],
      employees: data.employees || [],
      milestones: data.milestones || [],
    }),
    [data],
  );

  if (mode === "portfolio") return <div className="space-y-5"><PortfolioAnalytics data={normalized} /><PerformanceAnalytics data={normalized} /></div>;
  if (mode === "actions") return <ActionsAnalytics data={normalized} />;
  if (mode === "performance") return <PerformanceAnalytics data={normalized} />;
  return <PlanningAnalytics mode={mode} data={normalized} />;
}
