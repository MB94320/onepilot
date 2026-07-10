"use client";

import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  BarChart3,
  BookOpen,
  Copy,
  Download,
  Expand,
  ListChecks,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";

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

type ModuleRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  archived_at?: string | null;
  employee_id?: string | null;
  manager_employee_id?: string | null;
  [key: string]: unknown;
};

type EnrichedModuleRow = ModuleRow & {
  employee_name?: string | null;
  employee_number?: string | null;
  manager_name?: string | null;
  site_name?: string | null;
  department_name?: string | null;
  description?: string | null;
  name?: string | null;
  title?: string | null;
};

type DisplayMode = "cards" | "table";

const filterLabels = ["Ressource", "Cycle", "Manager", "Statut", "Type", "Période", "Site", "Service"];
const kpiLabels = ["Entretiens suivis", "À compléter", "Terminés", "Archivés"];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function resolveOrganization(slugOrId: string): Promise<Organization> {
  const query = (supabase.from("organizations" as never) as any).select("id, name, slug");
  const { data, error } = isUuid(slugOrId)
    ? await query.eq("id", slugOrId).limit(1).maybeSingle()
    : await query.eq("slug", slugOrId).limit(1).maybeSingle();

  if (error) {
    throw new Error(`Impossible d’identifier l’organisation : ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("L’organisation demandée est introuvable.");
  }

  return data as Organization;
}

async function loadPageData(slugOrId: string): Promise<{ organization: Organization; rows: EnrichedModuleRow[] }> {
  const organization = await resolveOrganization(slugOrId);

  const [rowsResult, employeesResult] = await Promise.all([
    (supabase.from("hr_review_items" as never) as any)
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(250),
    (supabase.from("hr_employee_overview" as never) as any)
      .select("id, full_name, employee_number, site_name, department_name, manager_name")
      .eq("organization_id", organization.id)
      .limit(500),
  ]);

  if (rowsResult.error) {
    throw new Error(rowsResult.error.message);
  }

  if (employeesResult.error) {
    throw new Error(employeesResult.error.message);
  }

  const employeesById = new Map<string, any>(
    ((employeesResult.data ?? []) as any[]).map((employee) => [employee.id, employee]),
  );

  const rows: EnrichedModuleRow[] = ((rowsResult.data ?? []) as ModuleRow[]).map((row) => {
    const employee = row.employee_id ? employeesById.get(String(row.employee_id)) : null;
    const manager = row.manager_employee_id ? employeesById.get(String(row.manager_employee_id)) : null;

    return {
      ...row,
      employee_name: employee?.full_name ?? null,
      employee_number: employee?.employee_number ?? null,
      manager_name: manager?.full_name ?? employee?.manager_name ?? null,
      site_name: employee?.site_name ?? null,
      department_name: employee?.department_name ?? null,
    };
  });

  return { organization, rows };
}

function getStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    submitted: "Soumis",
    prepared: "Préparé",
    in_progress: "En cours",
    manager_approved: "Validé manager",
    approved: "Approuvé",
    active: "Actif",
    to_develop: "À développer",
    validated: "Validé",
    completed: "Terminé",
    closed: "Clôturé",
    rejected: "Refusé",
    archived: "Archivé",
    delayed: "En retard",
    not_started: "Non démarré",
    employee_input: "Saisie collaborateur",
    manager_input: "Saisie manager",
    calibration: "Calibration",
  };

  return labels[status ?? ""] ?? status ?? "—";
}

function formatDate(value: unknown) {
  return typeof value === "string" && value.length > 0
    ? new Date(value).toLocaleDateString("fr-FR")
    : "—";
}

function isPendingStatus(status: string | null | undefined) {
  return ["draft", "submitted", "not_started", "employee_input", "manager_input", "in_progress", "prepared"].includes(status ?? "");
}

function KpiCard({ label, value, index }: { label: string; value: number | string; index: number }) {
  const accents = [
    "from-indigo-50 to-white text-indigo-700 border-indigo-100 dark:from-indigo-950/30 dark:to-slate-950 dark:text-indigo-300 dark:border-indigo-900/50",
    "from-emerald-50 to-white text-emerald-700 border-emerald-100 dark:from-emerald-950/30 dark:to-slate-950 dark:text-emerald-300 dark:border-emerald-900/50",
    "from-amber-50 to-white text-amber-700 border-amber-100 dark:from-amber-950/30 dark:to-slate-950 dark:text-amber-300 dark:border-amber-900/50",
    "from-rose-50 to-white text-rose-700 border-rose-100 dark:from-rose-950/30 dark:to-slate-950 dark:text-rose-300 dark:border-rose-900/50",
  ];

  return (
    <article className={`h-[118px] rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${accents[index % accents.length]}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">Données Supabase réelles, filtrées par organisation.</p>
    </article>
  );
}

export default function Page({ params }: { params: Promise<PageParams> }) {
  const { orgId } = use(params);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("cards");
  const [activeTab, setActiveTab] = useState("pilotage");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["rh-module", "entretiens-objectifs", orgId],
    queryFn: () => loadPageData(orgId),
    enabled: Boolean(orgId),
  });

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (data?.rows ?? []).filter((row) => {
      const status = String(row.status ?? "");
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const haystack = [
        row.employee_name,
        row.employee_number,
        row.manager_name,
        row.site_name,
        row.department_name,
        row.status,
        row.description,
        row.name,
        row.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && (normalizedSearch.length === 0 || haystack.includes(normalizedSearch));
    });
  }, [data?.rows, search, statusFilter]);

  const metrics = useMemo(() => {
    const rows = filteredRows;
    return {
      total: rows.length,
      active: rows.filter((row) => !row.archived_at && row.status !== "archived").length,
      pending: rows.filter((row) => isPendingStatus(row.status)).length,
      archived: rows.filter((row) => Boolean(row.archived_at) || row.status === "archived").length,
    };
  }, [filteredRows]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    (data?.rows ?? []).forEach((row) => {
      if (row.status) {
        values.add(String(row.status));
      }
    });

    return Array.from(values).sort();
  }, [data?.rows]);

  if (isLoading) {
    return <div className="p-6 text-sm font-semibold text-slate-500">Chargement du module Entretiens & objectifs…</div>;
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-bold">{error instanceof Error ? error.message : "Erreur de chargement"}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entretiens & objectifs"
        subtitle="Campagnes d’entretiens, objectifs individuels, feedback, validations, plans de progrès et calibration."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900">
              <BookOpen className="h-3.5 w-3.5" /> Guide de la page
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Download className="h-3.5 w-3.5" /> Export complet
            </button>
            <button type="button" className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:-translate-y-0.5 hover:shadow-lg dark:shadow-none">
              <Plus className="h-3.5 w-3.5" /> Nouvel entretien
            </button>
          </div>
        }
      />

      <PageTutorial
        title="Piloter les entretiens et objectifs"
        description="Organiser les campagnes, suivre les étapes collaborateur/manager, consolider les objectifs et préparer les décisions RH."
        objectives={[
          "Partager le même formalisme RH : KPI, filtres, onglets, cartes/tableaux, export et actions.",
          "Garantir le multi-tenant, l’audit, l’archivage logique et les permissions multi-rôles.",
          "Préparer les intégrations avec Absences, Ressources, Staffing, Finance, Projets et Notifications.",
        ]}
        steps={[
          { title: "Définir le périmètre", description: "Utilise la recherche et les filtres pour cibler les collaborateurs, statuts et périodes." },
          { title: "Analyser les KPI", description: "Les widgets suivent le périmètre filtré et restent homogènes avec les pages validées." },
          { title: "Basculer cartes/tableau", description: "Le toggle conserve la même logique que les pages Absences et Ressources." },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiLabels.map((label, index) => (
          <KpiCard key={label} label={label} value={index === 0 ? metrics.total : index === 1 ? metrics.pending : index === 2 ? metrics.active : metrics.archived} index={index} />
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><SlidersHorizontal className="h-4 w-4" /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recherche puis 4 filtres par ligne, identique au formalisme RH validé.</p>
              </div>
            </div>
            <span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">{filteredRows.length} résultat{filteredRows.length > 1 ? "s" : ""} / {(data?.rows ?? []).length}</span>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Rechercher une ressource, un manager, un site, un service ou un statut…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <option value="all">Tous les statuts</option>
              {statusOptions.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
            </select>
            {filterLabels.filter((filter) => filter !== "Statut").map((filter) => (
              <select key={filter} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <option>{filter}</option>
              </select>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap gap-2">
          {["pilotage", "analyses", "alertes", "recommandations", "archive"].map((tab, index) => {
            const activeClasses = [
              "bg-indigo-600 text-white shadow-sm",
              "bg-violet-600 text-white shadow-sm",
              "bg-emerald-600 text-white shadow-sm",
              "bg-amber-500 text-white shadow-sm",
              "bg-rose-600 text-white shadow-sm",
            ];
            const isActive = activeTab === tab;
            return (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition ${isActive ? activeClasses[index] : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"}`}>
                {tab}
              </button>
            );
          })}
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
          <button type="button" onClick={() => setDisplayMode("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${displayMode === "cards" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300" : "text-slate-500"}`}>Cartes</button>
          <button type="button" onClick={() => setDisplayMode("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${displayMode === "table" ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-950 dark:text-indigo-300" : "text-slate-500"}`}>Tableau</button>
        </div>
      </section>

      {displayMode === "cards" ? (
        <section className="grid gap-4 xl:grid-cols-3">
          {filteredRows.map((row, index) => (
            <article key={row.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
              <button type="button" className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">•••</button>
              <div className="pr-8">
                <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Ligne {index + 1}</p>
                <h3 className="mt-1 text-sm font-black text-slate-950 dark:text-white">{String(row.employee_name ?? row.name ?? row.title ?? `Élément ${index + 1}`)}</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{String(row.department_name ?? "Service non renseigné")} · {String(row.site_name ?? "Site non renseigné")}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><p className="font-black uppercase">Statut</p><p className="mt-1 font-bold">{getStatusLabel(row.status)}</p></div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><p className="font-black uppercase">Création</p><p className="mt-1 font-bold">{formatDate(row.created_at)}</p></div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-white">Tableau opérationnel</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">En-tête sticky, première colonne sticky et scroll vertical dès plus de 5 lignes.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><Copy className="h-4 w-4" /></button>
              <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><Expand className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900">Collaborateur</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Service</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Site</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Statut</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Création</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-black text-slate-950 dark:bg-slate-950 dark:text-white">{String(row.employee_name ?? row.name ?? row.title ?? `Ligne ${index + 1}`)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{String(row.department_name ?? "—")}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{String(row.site_name ?? "—")}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{getStatusLabel(row.status)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3 text-right"><button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">•••</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><BarChart3 className="h-4 w-4" /></div>
            <div><h2 className="text-base font-black text-slate-950 dark:text-white">Synthèse métier</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Un expert RH attend des campagnes suivies, des objectifs mesurables, des relances automatiques, une calibration managériale et un historique exploitable.</p></div>
          </div>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3"><ListChecks className="mt-0.5 h-5 w-5" /><p>À finaliser dans les prochaines passes : formulaires métier, droits multi-rôles fins, exports PDF/Excel détaillés, notifications et audit complet.</p></div>
        </article>
      </section>
    </div>
  );
}
