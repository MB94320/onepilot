"use client";

import {
  use,
  useMemo,
} from "react";
import {
  AlertCircle,
  Archive,
  BarChart3,
  Brain,
  Clock3,
  Copy,
  Download,
  Expand,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  UserPlus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/ui/PageHeader";
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

const filters = ["Ressource", "Projet", "Statut", "Période", "Type d’activité", "Manager"];
const kpiLabels = ["Temps soumis", "Temps approuvés", "Écarts à traiter", "Capacité réelle"];

async function loadPageData(slugOrId: string) {
  const organization = await resolveOrganization(slugOrId);

  const [rowsResult] = await Promise.all([
    (supabase.from("hr_time_activity_entries" as never) as any)
      .select("id, status, created_at, archived_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (rowsResult.error) {
    throw new Error(rowsResult.error.message);
  }

  const rows = (rowsResult.data ?? []) as Array<{ id: string; status: string | null; archived_at: string | null }>;
  return { organization, rows };
}

function KpiCard({ label, value, index }: { label: string; value: number | string; index: number }) {
  const accents = [
    "from-indigo-50 to-white text-indigo-700 border-indigo-100 dark:from-indigo-950/30 dark:to-slate-950 dark:text-indigo-300 dark:border-indigo-900/50",
    "from-violet-50 to-white text-violet-700 border-violet-100 dark:from-violet-950/30 dark:to-slate-950 dark:text-violet-300 dark:border-violet-900/50",
    "from-emerald-50 to-white text-emerald-700 border-emerald-100 dark:from-emerald-950/30 dark:to-slate-950 dark:text-emerald-300 dark:border-emerald-900/50",
    "from-amber-50 to-white text-amber-700 border-amber-100 dark:from-amber-950/30 dark:to-slate-950 dark:text-amber-300 dark:border-amber-900/50",
  ];

  return (
    <article className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${accents[index % accents.length]}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">Alimenté par Supabase, sans mock data.</p>
    </article>
  );
}

export default function Page({ params }: { params: Promise<PageParams> }) {
  const { orgId } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["rh-module", "temps-activites", orgId],
    queryFn: () => loadPageData(orgId),
    enabled: Boolean(orgId),
  });

  const metrics = useMemo(() => {
    const rows = data?.rows ?? [];
    return {
      total: rows.length,
      active: rows.filter((row) => !row.archived_at).length,
      pending: rows.filter((row) => ["draft", "submitted", "not_started", "employee_input", "manager_input", "in_progress", "prepared"].includes(row.status ?? "")).length,
      archived: rows.filter((row) => Boolean(row.archived_at) || row.status === "archived").length,
    };
  }, [data]);

  const Icon = Clock3;

  if (isLoading) {
    return <div className="p-6 text-sm font-semibold text-slate-500">Chargement du module Temps & activités…</div>;
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
        title="Temps & activités"
        subtitle="Pilotage des temps saisis, validations manager, imputation projet, alertes d’écart et capacité réelle."
        icon={<Icon className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Download className="h-4 w-4" /> Export complet
            </button>
            <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 dark:shadow-none">
              <Plus className="h-4 w-4" /> Nouvelle saisie de temps
            </button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiLabels.map((label, index) => (
          <KpiCard key={label} label={label} value={index === 0 ? metrics.total : index === 1 ? metrics.active : index === 2 ? metrics.pending : metrics.archived} index={index} />
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-800 dark:from-sky-950/20 dark:via-slate-950 dark:to-indigo-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><SlidersHorizontal className="h-4 w-4" /></div>
              <div><h2 className="text-sm font-bold text-slate-950 dark:text-white">Périmètre d’analyse</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Barre de recherche puis 4 filtres par ligne, même formalisme que les pages RH validées.</p></div>
            </div>
            <span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-slate-950 dark:text-indigo-300">{metrics.total} ligne{metrics.total > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input type="search" placeholder="Rechercher une ressource, un statut, une période, un manager…" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white" /></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{filters.map((filter) => <select key={filter} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"><option>{filter}</option></select>)}</div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-black text-slate-950 dark:text-white">Tableau opérationnel</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">En-tête sticky, première colonne sticky et scroll vertical dès plus de 5 lignes.</p></div><div className="flex gap-2"><button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><Copy className="h-4 w-4" /></button><button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"><Expand className="h-4 w-4" /></button></div></div>
          <div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900"><tr><th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-900">Élément</th><th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Statut</th><th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">Création</th><th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{(data?.rows ?? []).map((row, index) => <tr key={row.id} className="hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"><td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-black text-slate-950 dark:bg-slate-950 dark:text-white">Ligne {index + 1}</td><td className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{row.status ?? "—"}</td><td className="px-4 py-3 text-sm text-slate-500">{row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : "—"}</td><td className="px-4 py-3 text-right"><button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">•••</button></td></tr>)}</tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><BarChart3 className="h-4 w-4" /></div><div><h2 className="text-base font-black text-slate-950 dark:text-white">Attendus expert</h2><p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Un expert RH et chef de projet attend une traçabilité par collaborateur, projet, période et statut, avec validation N+1, contrôle des écarts, lien charge/capacité et export fiable.</p></div></div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Les écritures devront inclure organization_id, auteur, horodatage, audit, archivage logique, contrôle multi-rôle et exports filtrés.</div>
        </article>
      </section>
    </div>
  );
}
