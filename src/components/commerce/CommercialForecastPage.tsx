"use client";

import { use, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, CalendarClock, CircleDollarSign, Search, SlidersHorizontal, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HrActionMenu, HrChartCard, HrColumnFilterMenu, HrMetricCard, HrResetFilters, HrSectionCard, HrStatusBadge, hrInputClassName, hrSelectClassName, hrTableClassName, hrTableHeaderClassName } from "@/components/hr/HrReferenceUi";
import { ProjectAlertsPanel } from "@/components/projects/ProjectReferenceUi";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Params = { orgId: string };
type TabKey = "pilotage" | "analyses" | "alerts";

const supabase = createClient();
const money = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—";
const month = (value: string) => new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(`${value.slice(0, 7)}-01T12:00:00`));

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

function probability(row: AnyRow) {
  const explicit = Number(row.probability_percent ?? row.probabilite ?? row.probability);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(100, explicit);
  const status = String(row.status || "").toLocaleLowerCase("fr");
  if (status.includes("valid") || status.includes("gagn")) return 100;
  if (status.includes("refus") || status.includes("perdu") || status.includes("nogo")) return 0;
  if (status.includes("diffus") || status.includes("retour")) return 60;
  if (status.includes("cours")) return 35;
  return 15;
}

async function loadForecast(orgId: string) {
  const organization = await resolveOrganization(orgId);
  const table = (name: string) => (supabase.from(name as never) as any).select("*").eq("organization_id", organization.id);
  const [offers, prospects, clients] = await Promise.all([table("offres"), table("prospects"), table("clients")]);
  for (const result of [offers, prospects, clients]) if (result.error) throw new Error(result.error.message);
  const offerIds = (offers.data || []).map((row: AnyRow) => row.id).filter(Boolean);
  const technical = offerIds.length
    ? await (supabase.from("offres_fiche_technique" as never) as any).select("*").in("offre_id", offerIds)
    : { data: [], error: null };
  if (technical.error) throw new Error(technical.error.message);
  const prospectMap = new Map((prospects.data || []).map((row: AnyRow) => [String(row.id), row]));
  const clientMap = new Map((clients.data || []).map((row: AnyRow) => [String(row.id), row]));
  const technicalMap = new Map((technical.data || []).map((row: AnyRow) => [String(row.offre_id), row]));
  const rows = (offers.data || []).map((offer: AnyRow) => {
    const prospect = prospectMap.get(String(offer.prospect_id)) as AnyRow | undefined;
    const client = clientMap.get(String(prospect?.client_id)) as AnyRow | undefined;
    const sheet = technicalMap.get(String(offer.id)) as AnyRow | undefined;
    const amount = Number(sheet?.total_prix_vente_ca ?? offer.amount ?? offer.montant ?? prospect?.estimated_amount ?? 0);
    const margin = Number(sheet?.marge_brute_calculee_pourcent ?? offer.margin_percent ?? 0);
    const status = String(offer.statut_offre || prospect?.status || "A faire");
    const expectedDate = offer.date_validation_previsionnelle || offer.date_diffusion_previsionnelle || prospect?.expected_close_date || offer.updated_at;
    const chance = probability({ probability_percent: offer.probability_percent ?? prospect?.probability_percent, status });
    const rawNumber = prospect?.opp_number || prospect?.opportunity_number || offer.opportunity_number;
    const opportunity = String(rawNumber || "").startsWith("OPP-") ? String(rawNumber) : rawNumber ? `OPP-${new Date(expectedDate || Date.now()).getFullYear()}-${String(rawNumber).padStart(4, "0")}` : "À générer";
    return { ...offer, prospect, client, sheet, opportunity, title: prospect?.titre || offer.title || "Opportunité sans désignation", client_name: client?.name || "Client à renseigner", status, expected_date: expectedDate, amount, margin, probability: chance, weighted_amount: amount * chance / 100 };
  }).sort((a: AnyRow, b: AnyRow) => String(a.opportunity).localeCompare(String(b.opportunity), "fr", { numeric: true }));
  return { organization, rows };
}

export default function CommercialForecastPage({ params }: { params: Promise<Params> }) {
  const { orgId } = use(params);
  const router = useRouter();
  const query = useQuery({ queryKey: ["commercial-forecast", orgId], queryFn: () => loadForecast(orgId) });
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const chartRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = (query.data?.rows || []) as AnyRow[];
  const columns = [
    { key: "opportunity", label: "N° Opportunité", value: (row: AnyRow) => row.opportunity },
    { key: "title", label: "Désignation", value: (row: AnyRow) => row.title },
    { key: "client", label: "Client", value: (row: AnyRow) => row.client_name },
    { key: "status", label: "Statut", value: (row: AnyRow) => row.status },
    { key: "probability", label: "Probabilité", value: (row: AnyRow) => `${row.probability} %` },
  ];
  const visibleRows = rows.filter((row: AnyRow) => {
    const haystack = `${row.opportunity} ${row.title} ${row.client_name} ${row.status}`.toLocaleLowerCase("fr");
    const expected = String(row.expected_date || "").slice(0, 10);
    return (!search || haystack.includes(search.toLocaleLowerCase("fr"))) && (!status || row.status === status) && (!start || !expected || expected >= start) && (!end || !expected || expected <= end) && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(String(column.value(row))));
  });
  const filtersActive = Boolean(search || status || start || end || Object.values(columnFilters).some((values) => values.length));
  const reset = () => { setSearch(""); setStatus(""); setStart(""); setEnd(""); setColumnFilters({}); };
  const statuses: string[] = [...new Set<string>(rows.map((row: AnyRow) => String(row.status)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const total = visibleRows.reduce((sum: number, row: AnyRow) => sum + row.amount, 0);
  const weighted = visibleRows.reduce((sum: number, row: AnyRow) => sum + row.weighted_amount, 0);
  const avgMargin = visibleRows.length ? visibleRows.reduce((sum: number, row: AnyRow) => sum + row.margin, 0) / visibleRows.length : 0;
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; gross: number; weighted: number }>();
    visibleRows.forEach((row: AnyRow) => { const key = String(row.expected_date || "").slice(0, 7); if (!key) return; const item = map.get(key) || { month: key, gross: 0, weighted: 0 }; item.gross += row.amount; item.weighted += row.weighted_amount; map.set(key, item); });
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({ ...item, label: month(item.month) }));
  }, [visibleRows]);
  const exportColumns: ExportColumn<AnyRow>[] = [
    { key: "opportunity", label: "N° Opportunité", value: (row) => row.opportunity }, { key: "title", label: "Désignation", value: (row) => row.title }, { key: "client", label: "Client", value: (row) => row.client_name }, { key: "status", label: "Statut", value: (row) => row.status }, { key: "date", label: "Date prévisionnelle", value: (row) => row.expected_date }, { key: "amount", label: "Montant", value: (row) => row.amount }, { key: "probability", label: "Probabilité (%)", value: (row) => row.probability }, { key: "weighted", label: "Prévision pondérée", value: (row) => row.weighted_amount }, { key: "margin", label: "Marge prévisionnelle (%)", value: (row) => row.margin },
  ];
  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Chargement des prévisions commerciales…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger les prévisions : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const alerts = [
    { label: "Opportunités sans montant", count: visibleRows.filter((row: AnyRow) => !row.amount).length, impact: "Prévision de chiffre d’affaires incomplète.", action: "Compléter la fiche technique et le prix de vente.", accent: "rose" as const },
    { label: "Échéances non renseignées", count: visibleRows.filter((row: AnyRow) => !row.expected_date).length, impact: "Projection mensuelle peu fiable.", action: "Renseigner la date prévisionnelle de décision client.", accent: "amber" as const },
    { label: "Marge sous 20 %", count: visibleRows.filter((row: AnyRow) => row.margin > 0 && row.margin < 20).length, impact: "Rentabilité commerciale insuffisante.", action: "Revoir prix, charge, achats et hypothèses avant engagement.", accent: "rose" as const },
    { label: "Numéros à générer", count: visibleRows.filter((row: AnyRow) => row.opportunity === "À générer").length, impact: "Continuité Commerce–Projets non garantie.", action: "Générer le chrono OPP-AAAA-0001 avant transformation en projet.", accent: "sky" as const },
  ];
  const tabs: Array<{ key: TabKey; label: string; color: string }> = [{ key: "pilotage", label: "Pilotage", color: "bg-indigo-600 text-white" }, { key: "analyses", label: "Analyses", color: "bg-violet-600 text-white" }, { key: "alerts", label: "Alertes", color: "bg-emerald-600 text-white" }];
  return <div className="onepilot-business-page space-y-6">
    <PageHeader title="Prévisions commerciales" subtitle="Projeter le chiffre d’affaires, la marge et les décisions clients depuis les opportunités et offres réelles." actions={<DataExportMenu data={visibleRows} columns={exportColumns} fileName="onepilot_previsions_commerciales" sheetName="Prévisions" disabled={!visibleRows.length} />} />
    <PageTutorial title="Guide de la page" description={"Consolider automatiquement le pipeline Commerce pour obtenir une prévision brute et pondérée, sans ressaisie entre Prospects, Avant-vente, Commandes et Projets.\nQualifier montants, probabilités, dates, marges et qualité des données avant les revues commerciales et arbitrages de capacité."} objectives={["Fiabiliser le chiffre d’affaires prévisionnel.", "Anticiper charge, marge et transformation des opportunités gagnées en projets."]} steps={[{ title: "Qualifier", description: "Compléter offre, montant, marge, date et statut." }, { title: "Analyser", description: "Comparer prévision brute, pondérée et trajectoire mensuelle." }, { title: "Arbitrer", description: "Traiter les opportunités incomplètes, peu rentables ou sans échéance." }]} analyses={[{ title: "Lecture décisionnelle", description: "Le montant pondéré applique la probabilité commerciale à la valeur estimée." }]} recommendations={["Tracer toute modification de probabilité.", "Aligner le forecast avec la capacité disponible.", "Transformer une offre gagnée en projet sans double saisie."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Target} label="Opportunités" value={visibleRows.length} description="Offres présentes dans le périmètre commercial." accent="indigo" /><HrMetricCard icon={CircleDollarSign} label="Prévision brute" value={money(total)} description="Somme des montants avant pondération." accent="emerald" /><HrMetricCard icon={TrendingUp} label="Prévision pondérée" value={money(weighted)} description="Montants multipliés par la probabilité de gain." accent="amber" /><HrMetricCard icon={Activity} label="Marge moyenne" value={`${avgMargin.toFixed(1)} %`} description="Marge prévisionnelle moyenne des offres filtrées." accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="Recherchez puis filtrez le statut et la période prévisionnelle."><div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder="Rechercher un numéro, une désignation ou un client…" /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={status} onChange={(event) => setStatus(event.target.value)} className={hrSelectClassName}><option value="">Tous les statuts</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><input type="date" value={start} onChange={(event) => setStart(event.target.value)} className={hrInputClassName} /><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className={hrInputClassName} /><div className="flex items-center justify-end"><HrStatusBadge status="planned" label={`${visibleRows.length} résultat(s) sur ${rows.length}`} /></div></div>{filtersActive && <HrResetFilters onReset={reset} />}</div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-4 text-sm font-bold ${tab === item.key ? item.color : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>
    {tab === "pilotage" && <HrSectionCard icon={CalendarClock} title="Pipeline prévisionnel" description="Cartes et tableau reprennent les mêmes données issues de Commerce." right={<div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div>}>
      {view === "cards" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleRows.map((row: AnyRow) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-indigo-700">{row.opportunity}</p><h3 className="mt-1 text-sm font-black text-slate-950">{row.title}</h3><p className="mt-1 text-xs text-slate-500">{row.client_name}</p></div><HrActionMenu labels={{ view: "Voir l’offre", edit: "Modifier l’offre", archive: "Archiver l’offre", restore: "Réactiver l’offre" }} onView={() => router.push(`/${orgId}/avant-vente/${row.id}`)} onEdit={() => router.push(`/${orgId}/avant-vente/${row.id}`)} /></div><div className="mt-4 flex flex-wrap gap-2"><HrStatusBadge status={row.status} label={row.status} /><HrStatusBadge status={row.probability >= 70 ? "completed" : row.probability >= 35 ? "in_progress" : "planned"} label={`${row.probability} %`} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Info label="Montant" value={money(row.amount)} /><Info label="Pondéré" value={money(row.weighted_amount)} /><Info label="Marge" value={`${row.margin.toFixed(1)} %`} /><Info label="Décision" value={date(row.expected_date)} /></div></article>)}</div> : <div className="max-h-[334px] overflow-auto rounded-2xl border border-slate-200"><table className={`${hrTableClassName} min-w-[1450px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={index === 0 ? "sticky left-0 z-30 bg-sky-50 text-left" : "text-left"}><HrColumnFilterMenu label={column.label} values={rows.map((row: AnyRow) => String(column.value(row)))} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th>Date prévue</th><th>Montant</th><th>Pondéré</th><th>Marge</th><th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{visibleRows.map((row: AnyRow) => <tr key={row.id}><td className="sticky left-0 z-10 bg-white font-bold text-indigo-700">{row.opportunity}</td><td>{row.title}</td><td>{row.client_name}</td><td><HrStatusBadge status={row.status} label={row.status} /></td><td>{row.probability} %</td><td>{date(row.expected_date)}</td><td>{money(row.amount)}</td><td className="font-bold text-emerald-700">{money(row.weighted_amount)}</td><td>{row.margin.toFixed(1)} %</td><td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: "Voir l’offre", edit: "Modifier l’offre", archive: "Archiver l’offre", restore: "Réactiver l’offre" }} onView={() => router.push(`/${orgId}/avant-vente/${row.id}`)} onEdit={() => router.push(`/${orgId}/avant-vente/${row.id}`)} /></td></tr>)}</tbody></table></div>}
    </HrSectionCard>}
    {tab === "analyses" && <section ref={chartRef}><HrChartCard title="Prévision commerciale mensuelle" description="Montants bruts et pondérés par mois de décision client." exportConfig={{ type: "bar", data: monthly, nameKey: "label", series: [{ key: "gross", label: "Prévision brute", color: "#818cf8" }, { key: "weighted", label: "Prévision pondérée", color: "#6ee7b7" }], unit: " €" }}><ResponsiveContainer width="100%" height={340}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} /><YAxis /><Tooltip formatter={(value) => money(value)} /><Legend /><Bar dataKey="gross" name="Prévision brute" fill="#818cf8" radius={[6, 6, 0, 0]} /><Bar dataKey="weighted" name="Prévision pondérée" fill="#6ee7b7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard></section>}
    {tab === "alerts" && <ProjectAlertsPanel title="Alertes commerciales" description="Qualité du forecast, rentabilité et continuité Commerce–Projets." items={alerts} />}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-2"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-700">{value}</p></div>; }
