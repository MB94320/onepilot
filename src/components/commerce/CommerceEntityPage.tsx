"use client";

import { use, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, Building2, CalendarClock, CircleDollarSign, FileSearch, PackageCheck, Plus, Search, SlidersHorizontal, Target, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import ClientForm from "@/app/[orgId]/(protected)/clients/ClientForm";
import ProspectForm from "@/app/[orgId]/(protected)/prospects/ProspectForm";
import OffreForm from "@/app/[orgId]/(protected)/avant-vente/OffreForm";
import CommandeForm from "@/app/[orgId]/(protected)/commandes/CommandeForm";
import {
  HrActionMenu,
  HrChartCard,
  HrColumnFilterMenu,
  HrInfo,
  HrMetricCard,
  HrResetFilters,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSaveButtonClassName,
  hrSelectClassName,
  hrTableClassName,
  hrTableHeaderClassName,
} from "@/components/hr/HrReferenceUi";
import { ProjectAlertsPanel } from "@/components/projects/ProjectReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Mode = "clients" | "prospects" | "offers" | "orders";
type TabKey = "pilotage" | "analyses" | "alerts";
type Column = { key: string; label: string; value: (row: AnyRow) => ReactNode; exportValue?: (row: AnyRow) => unknown };

const supabase = createClient();
const money = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—";
const text = (value: ReactNode): string => typeof value === "string" || typeof value === "number" ? String(value) : "—";

const config: Record<Mode, { title: string; subtitle: string; singular: string; icon: typeof Building2 }> = {
  clients: { title: "Clients", subtitle: "Centraliser les comptes, contacts, secteurs et relations commerciales sans double saisie.", singular: "client", icon: Building2 },
  prospects: { title: "Prospects", subtitle: "Qualifier le pipeline, la probabilité, la valeur et les prochaines décisions commerciales.", singular: "opportunité", icon: Target },
  offers: { title: "Avant-vente", subtitle: "Piloter les offres, validations, charges, marges et transformations en projets.", singular: "offre", icon: FileSearch },
  orders: { title: "Commandes", subtitle: "Suivre les commandes clients et fournisseurs, leur livraison et leur continuité financière.", singular: "commande", icon: PackageCheck },
};

async function resolveOrganization(orgId: string) {
  const request = (supabase.from("organizations" as never) as any).select("id,name,slug");
  const result = /^[0-9a-f-]{36}$/i.test(orgId) ? await request.eq("id", orgId).maybeSingle() : await request.eq("slug", orgId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Organisation introuvable.");
  return result.data as AnyRow;
}

async function loadCommerce(orgId: string, mode: Mode) {
  const organization = await resolveOrganization(orgId);
  const table = (name: string) => (supabase.from(name as never) as any).select("*").eq("organization_id", organization.id);
  const clientsResult = await table("clients").order("name");
  if (clientsResult.error) throw new Error(clientsResult.error.message);
  const clients: AnyRow[] = clientsResult.data || [];
  const clientMap = new Map(clients.map((row) => [String(row.id), row]));

  if (mode === "clients") return { organization, clients, rows: clients.map((row) => ({ ...row, display_status: row.archived_at ? "Archivé" : "Actif", display_date: row.updated_at || row.created_at })) };

  const prospectsResult = await table("prospects").order("opp_number", { ascending: true });
  if (prospectsResult.error) throw new Error(prospectsResult.error.message);
  const prospects: AnyRow[] = (prospectsResult.data || []).map((row: AnyRow) => ({ ...row, client_name: clientMap.get(String(row.client_id))?.name || "Client à renseigner", display_status: row.statut || row.status || "Découverte", display_date: row.date_cible || row.target_date || row.expected_close_date, display_amount: Number(row.montant || row.amount || 0), display_owner: row.commercial || row.owner_name || "Non affecté" }));
  if (mode === "prospects") return { organization, clients, prospects, rows: prospects };

  if (mode === "offers") {
    const offersResult = await table("offres").order("created_at", { ascending: false });
    if (offersResult.error) throw new Error(offersResult.error.message);
    const offers: AnyRow[] = offersResult.data || [];
    const offerIds = offers.map((row) => row.id).filter(Boolean);
    const technicalResult = offerIds.length ? await (supabase.from("offres_fiche_technique" as never) as any).select("*").in("offre_id", offerIds) : { data: [], error: null };
    if (technicalResult.error) throw new Error(technicalResult.error.message);
    const prospectMap = new Map(prospects.map((row) => [String(row.id), row]));
    const technicalMap = new Map((technicalResult.data || []).map((row: AnyRow) => [String(row.offre_id), row]));
    const rows = offers.map((row) => { const prospect = prospectMap.get(String(row.prospect_id)) as AnyRow | undefined; const technical = technicalMap.get(String(row.id)) as AnyRow | undefined; return { ...row, prospect, technical, opp_number: prospect?.opp_number || row.opportunity_number || "À générer", title: prospect?.titre || row.title || "Offre sans désignation", client_name: prospect?.client_name || "Client à renseigner", display_status: row.statut_offre || "À faire", display_date: row.date_validation_previsionnelle || row.date_diffusion_previsionnelle || prospect?.display_date, display_amount: Number(technical?.total_prix_vente_ca || row.amount || 0), display_margin: Number(technical?.marge_brute_calculee_pourcent || row.margin_percent || 0), display_owner: prospect?.display_owner || row.owner_name || "Non affecté" }; });
    return { organization, clients, prospects, rows };
  }

  const [ordersResult, suppliersResult] = await Promise.all([table("commandes").order("created_at", { ascending: false }), table("fournisseurs").order("name")]);
  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (suppliersResult.error) throw new Error(suppliersResult.error.message);
  const supplierMap = new Map<string, AnyRow>((suppliersResult.data || []).map((row: AnyRow) => [String(row.id), row]));
  const prospectMap = new Map(prospects.map((row) => [String(row.id), row]));
  const rows = (ordersResult.data || []).map((row: AnyRow) => { const prospect = prospectMap.get(String(row.prospect_id)) as AnyRow | undefined; const isSupplier = String(row.type_commande || row.command_type || "CLIENT").toUpperCase() === "FOURNISSEUR"; return { ...row, opp_number: prospect?.opp_number || row.opp_number || "—", title: row.titre || row.title || prospect?.titre || "Commande sans désignation", entity_name: isSupplier ? supplierMap.get(String(row.fournisseur_id))?.name || "Fournisseur à renseigner" : clientMap.get(String(row.client_id || prospect?.client_id))?.name || prospect?.client_name || "Client à renseigner", display_status: row.statut || row.status || "Brouillon", display_date: row.date_commande || row.order_date || row.created_at, display_amount: Number(row.montant_total || row.amount || row.total_amount || 0), display_owner: row.responsable || row.owner_name || "Non affecté", order_type: isSupplier ? "Fournisseur" : "Client" }; });
  return { organization, clients, prospects, rows };
}

function statusTone(value: unknown) {
  const key = String(value || "").toLocaleLowerCase("fr");
  if (["gagné", "validé", "validée", "livré", "livrée", "facturé", "facturée", "actif"].some((item) => key.includes(item))) return "completed";
  if (["en cours", "négociation", "proposition", "diffusé", "attente", "envoyé"].some((item) => key.includes(item))) return "in_progress";
  if (["bloqué", "refus", "perdu", "no-go", "nogo"].some((item) => key.includes(item))) return "blocked";
  if (["annulé", "archivé"].some((item) => key.includes(item))) return "archived";
  return "planned";
}

export default function CommerceEntityPage({ params, mode }: { params: Promise<{ orgId: string }>; mode: Mode }) {
  const { orgId } = use(params);
  const router = useRouter();
  const page = config[mode];
  const query = useQuery({ queryKey: ["commerce-reference", mode, orgId], queryFn: () => loadCommerce(orgId, mode) });
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [end, setEnd] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const tableRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = query.data?.rows || [];

  const columns: Column[] = useMemo(() => mode === "clients" ? [
    { key: "name", label: "Client", value: (row) => row.name }, { key: "sector", label: "Secteur", value: (row) => row.sector || "—" }, { key: "city", label: "Ville", value: (row) => row.city || "—" }, { key: "contact", label: "Contact", value: (row) => row.contact || "—" }, { key: "email", label: "E-mail", value: (row) => row.email || "—" }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status={statusTone(row.display_status)} label={row.display_status} />, exportValue: (row) => row.display_status },
  ] : mode === "prospects" ? [
    { key: "number", label: "N° Opportunité", value: (row) => row.opp_number || "À générer" }, { key: "title", label: "Désignation", value: (row) => row.titre || "—" }, { key: "client", label: "Client", value: (row) => row.client_name }, { key: "owner", label: "Commercial", value: (row) => row.display_owner }, { key: "status", label: "Étape", value: (row) => <HrStatusBadge status={statusTone(row.display_status)} label={row.display_status} />, exportValue: (row) => row.display_status }, { key: "date", label: "Décision prévue", value: (row) => date(row.display_date) }, { key: "amount", label: "Montant", value: (row) => money(row.display_amount), exportValue: (row) => row.display_amount }, { key: "probability", label: "Probabilité", value: (row) => `${Number(row.probability || row.probabilite || 0)} %` },
  ] : mode === "offers" ? [
    { key: "number", label: "N° Opportunité", value: (row) => row.opp_number }, { key: "title", label: "Désignation", value: (row) => row.title }, { key: "client", label: "Client", value: (row) => row.client_name }, { key: "owner", label: "Responsable", value: (row) => row.display_owner }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status={statusTone(row.display_status)} label={row.display_status} />, exportValue: (row) => row.display_status }, { key: "date", label: "Validation prévue", value: (row) => date(row.display_date) }, { key: "amount", label: "Prix de vente", value: (row) => money(row.display_amount), exportValue: (row) => row.display_amount }, { key: "margin", label: "Marge prévue", value: (row) => `${Number(row.display_margin || 0).toFixed(1)} %` },
  ] : [
    { key: "number", label: "N° Commande", value: (row) => row.num_commande || row.order_number || "—" }, { key: "opportunity", label: "N° Opportunité", value: (row) => row.opp_number }, { key: "title", label: "Désignation", value: (row) => row.title }, { key: "entity", label: "Client / fournisseur", value: (row) => row.entity_name }, { key: "type", label: "Type", value: (row) => row.order_type }, { key: "status", label: "Statut", value: (row) => <HrStatusBadge status={statusTone(row.display_status)} label={row.display_status} />, exportValue: (row) => row.display_status }, { key: "date", label: "Date", value: (row) => date(row.display_date) }, { key: "amount", label: "Montant", value: (row) => money(row.display_amount), exportValue: (row) => row.display_amount },
  ], [mode]);

  const valueFor = (row: AnyRow, column: Column) => text(column.exportValue ? column.exportValue(row) as ReactNode : column.value(row));
  const statuses = [...new Set(rows.map((row) => String(row.display_status || "Non renseigné")))].sort((a, b) => a.localeCompare(b, "fr"));
  const owners = [...new Set(rows.map((row) => String(row.display_owner || "Non affecté")))].sort((a, b) => a.localeCompare(b, "fr"));
  const visibleRows = rows.filter((row) => {
    const haystack = columns.map((column) => valueFor(row, column)).join(" ").toLocaleLowerCase("fr");
    const rowDate = String(row.display_date || "").slice(0, 10);
    return (!search || haystack.includes(search.toLocaleLowerCase("fr"))) && (!status || row.display_status === status) && (!owner || row.display_owner === owner) && (!end || !rowDate || rowDate <= end) && columns.every((column) => !columnFilters[column.key]?.length || columnFilters[column.key].includes(valueFor(row, column)));
  });
  const filtersActive = Boolean(search || status || owner || end || Object.values(columnFilters).some((values) => values.length));
  const resetFilters = () => { setSearch(""); setStatus(""); setOwner(""); setEnd(""); setColumnFilters({}); };
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((column) => ({ key: column.key, label: column.label, value: (row) => String(column.exportValue ? column.exportValue(row) ?? "—" : valueFor(row, column)) }));
  const totalAmount = visibleRows.reduce((sum, row) => sum + Number(row.display_amount || 0), 0);
  const activeCount = visibleRows.filter((row) => !["completed", "archived", "blocked"].includes(statusTone(row.display_status))).length;
  const missingCount = visibleRows.filter((row) => !row.display_date || (mode !== "clients" && !row.display_owner)).length;
  const monthly = useMemo(() => { const map = new Map<string, { month: string; volume: number; amount: number }>(); visibleRows.forEach((row) => { const key = String(row.display_date || row.created_at || "").slice(0, 7); if (!key) return; const item = map.get(key) || { month: key, volume: 0, amount: 0 }; item.volume += 1; item.amount += Number(row.display_amount || 0); map.set(key, item); }); return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).map((item) => ({ ...item, label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(`${item.month}-01T12:00:00`)) })); }, [visibleRows]);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Chargement du module Commerce…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger {page.title.toLocaleLowerCase("fr")} : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;

  const openItem = (row: AnyRow) => {
    if (mode === "offers") router.push(`/${orgId}/avant-vente/${row.id}`);
    else if (mode === "orders") router.push(`/${orgId}/commandes/${row.id}`);
    else { setSelected(row); setFormOpen(true); }
  };
  const tabs: Array<{ key: TabKey; label: string; active: string }> = [{ key: "pilotage", label: "Pilotage", active: "bg-indigo-600 text-white" }, { key: "analyses", label: "Analyses", active: "bg-violet-600 text-white" }, { key: "alerts", label: "Alertes", active: "bg-emerald-600 text-white" }];
  const alerts = [
    { label: "Données incomplètes", count: missingCount, impact: "La lecture commerciale et la prévision deviennent moins fiables.", action: "Compléter responsable, échéance, valeur et rattachement client.", accent: "rose" as const },
    { label: "Éléments actifs", count: activeCount, impact: "Volume de travail nécessitant une prochaine action datée.", action: "Vérifier la priorité, le propriétaire et le prochain engagement.", accent: "amber" as const },
    { label: "Sans valeur", count: visibleRows.filter((row) => mode !== "clients" && !Number(row.display_amount || 0)).length, impact: "Prévision de chiffre d’affaires ou d’engagement incomplète.", action: "Renseigner le montant depuis l’offre ou la commande source.", accent: "sky" as const },
    { label: "Sans numéro", count: visibleRows.filter((row) => mode !== "clients" && !String(row.opp_number || row.num_commande || "").trim()).length, impact: "Rapprochement transverse Commerce–Projets fragilisé.", action: "Générer le chrono métier avant validation.", accent: "indigo" as const },
  ];
  const Icon = page.icon;

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title={page.title} subtitle={page.subtitle} actions={<><DataExportMenu data={visibleRows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={page.title} disabled={!visibleRows.length} /><button type="button" onClick={() => { setSelected(null); setFormOpen(true); }} className={hrSaveButtonClassName}><Plus className="h-4 w-4" />Nouveau {page.singular}</button></>} />
    <PageTutorial title="Guide de la page" description={`Piloter ${page.title.toLocaleLowerCase("fr")} depuis une source unique, traçable et réutilisable par les autres modules de ONEPILOT.\nQualifier les informations, analyser les tendances puis traiter les alertes sans ressaisir les données dans Projets, Finance ou Pilotage.`} objectives={["Centraliser les données commerciales réelles de l’organisation.", "Sécuriser les transitions entre relation client, opportunité, offre, commande et projet."]} steps={[{ title: "Qualifier", description: "Compléter les informations, rattachements, responsables et échéances." }, { title: "Analyser", description: "Comparer volumes, montants, statuts et tendances du périmètre." }, { title: "Agir", description: "Traiter les anomalies et ouvrir l’objet métier concerné." }]} analyses={[{ title: "Lecture décisionnelle", description: "Les KPI, cartes, tableaux, graphiques et exports suivent exactement les filtres actifs." }]} recommendations={["Éviter toute double saisie entre Commerce et Projets.", "Affecter un propriétaire et une prochaine date à chaque élément actif.", "Conserver des numéros uniques pour tous les rapprochements."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><HrMetricCard icon={Icon} label={`Nombre de ${page.title.toLocaleLowerCase("fr")}`} value={visibleRows.length} description="Éléments correspondant au périmètre actif." accent="indigo" /><HrMetricCard icon={Activity} label="Éléments actifs" value={activeCount} description="Objets nécessitant encore une action ou une décision." accent="emerald" /><HrMetricCard icon={CircleDollarSign} label="Valeur du périmètre" value={money(totalAmount)} description="Somme des montants commerciaux disponibles." accent="amber" /><HrMetricCard icon={CalendarClock} label="Données à compléter" value={missingCount} description="Responsables ou échéances encore non renseignés." accent="rose" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="La recherche et les filtres pilotent KPI, cartes, tableau, analyses, alertes et export."><div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder={`Rechercher dans ${page.title.toLocaleLowerCase("fr")}…`} /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select value={status} onChange={(event) => setStatus(event.target.value)} className={hrSelectClassName}><option value="">Tous les statuts</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><select value={owner} onChange={(event) => setOwner(event.target.value)} className={hrSelectClassName}><option value="">Tous les responsables</option>{owners.map((value) => <option key={value}>{value}</option>)}</select><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className={hrInputClassName} /><div className="flex items-center justify-end"><HrStatusBadge status="planned" label={`${visibleRows.length} résultat(s) sur ${rows.length}`} /></div></div>{filtersActive && <HrResetFilters onReset={resetFilters} />}</div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-4 text-sm font-bold transition ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>
    {tab === "pilotage" && <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-950">Pilotage de {page.title.toLocaleLowerCase("fr")}</h2><p className="mt-1 text-xs text-slate-500">Cartes et tableau partagent les mêmes données et actions.</p></div></div><div className="flex items-center gap-2"><ProjectVisualActions targetRef={tableRef} fileName={`onepilot_${mode}_pilotage`} label={`le pilotage ${page.title}`} /><div className="inline-flex rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setView("cards")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "cards" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Cartes</button><button type="button" onClick={() => setView("table")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-indigo-600 text-white" : "text-slate-500"}`}>Tableau</button></div></div></div>{view === "cards" ? <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{visibleRows.map((row) => <article key={row.id} onClick={() => openItem(row)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-indigo-700">{mode === "clients" ? row.name : row.opp_number || row.num_commande || "À générer"}</p><h3 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">{mode === "clients" ? row.sector || "Secteur à renseigner" : row.title || row.titre}</h3></div><div onClick={(event) => event.stopPropagation()}><HrActionMenu labels={{ view: `Voir le ${page.singular}`, edit: `Modifier le ${page.singular}`, archive: `Archiver le ${page.singular}`, restore: `Réactiver le ${page.singular}` }} onView={() => openItem(row)} onEdit={() => openItem(row)} /></div></div><div className="mt-3 flex flex-wrap gap-2"><HrStatusBadge status={statusTone(row.display_status)} label={row.display_status} />{row.client_name && <HrStatusBadge status="planned" label={row.client_name} />}</div><div className="mt-4 grid grid-cols-2 gap-2"><HrInfo label="Responsable" value={row.display_owner || row.contact || "Non affecté"} /><HrInfo label="Échéance" value={date(row.display_date)} /><HrInfo label="Montant" value={money(row.display_amount)} accent="emerald" /><HrInfo label="Mise à jour" value={date(row.updated_at || row.created_at)} /></div></article>)}</div> : <div data-visual-scroll className="max-h-[334px] overflow-auto"><table className={`${hrTableClassName} min-w-[1500px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((column, index) => <th key={column.key} className={index === 0 ? "sticky left-0 z-30 bg-sky-50 text-left" : "text-left"}><HrColumnFilterMenu label={column.label} values={rows.map((row) => valueFor(row, column))} selected={columnFilters[column.key] || []} onChange={(values) => setColumnFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="hover:bg-indigo-50/40">{columns.map((column, index) => <td key={column.key} className={index === 0 ? "sticky left-0 z-10 bg-white font-bold text-indigo-700" : "font-normal"}>{column.value(row)}</td>)}<td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: `Voir le ${page.singular}`, edit: `Modifier le ${page.singular}`, archive: `Archiver le ${page.singular}`, restore: `Réactiver le ${page.singular}` }} onView={() => openItem(row)} onEdit={() => openItem(row)} /></td></tr>)}</tbody></table></div>}</section>}
    {tab === "analyses" && <div className="space-y-5"><section className="grid gap-5 xl:grid-cols-2"><HrChartCard title={`Volumes mensuels — ${page.title}`} description="Nombre d’éléments positionnés sur chaque mois du périmètre." exportConfig={{ type: "bar", data: monthly, nameKey: "label", series: [{ key: "volume", label: "Volume", color: "#818cf8" }] }}><ResponsiveContainer width="100%" height={300}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} /><YAxis /><Tooltip /><Legend /><Bar dataKey="volume" name="Volume" fill="#818cf8" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard><HrChartCard title={`Valeur mensuelle — ${page.title}`} description="Montants commerciaux disponibles par mois de référence." exportConfig={{ type: "bar", data: monthly, nameKey: "label", series: [{ key: "amount", label: "Montant", color: "#6ee7b7" }], unit: " €" }}><ResponsiveContainer width="100%" height={300}><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} /><YAxis /><Tooltip formatter={(value) => money(value)} /><Legend /><Bar dataKey="amount" name="Montant" fill="#6ee7b7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard></section><HrSectionCard icon={BarChart3} title="Synthèse décisionnelle" description="Comparer le volume actif, la valeur, la complétude et la capacité de transformation."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Volume filtré" value={visibleRows.length} accent="indigo" /><HrInfo label="Actifs" value={activeCount} accent="emerald" /><HrInfo label="Valeur" value={money(totalAmount)} accent="amber" /><HrInfo label="À compléter" value={missingCount} accent="rose" /></div></HrSectionCard></div>}
    {tab === "alerts" && <ProjectAlertsPanel title="Alertes commerciales" description="Qualité des données, continuité du processus et actions attendues." items={alerts} />}
    {formOpen && mode === "clients" && <ClientForm modalMode={selected ? "edit" : "create"} clientData={selected || undefined} orgSlugOrId={orgId} onClose={() => { setFormOpen(false); setSelected(null); }} onSave={() => { setFormOpen(false); setSelected(null); void query.refetch(); }} />}
    {formOpen && mode === "prospects" && <ProspectForm selectedProspect={selected} clientsList={query.data.clients} currentOrgId={query.data.organization.id} prospectsCount={rows} onClose={() => { setFormOpen(false); setSelected(null); }} onRefresh={() => { setFormOpen(false); setSelected(null); void query.refetch(); }} />}
    {formOpen && mode === "offers" && <OffreForm currentOrgId={query.data.organization.id} onClose={() => setFormOpen(false)} onRefresh={() => { setFormOpen(false); void query.refetch(); }} />}
    {formOpen && mode === "orders" && <CommandeForm currentOrgId={query.data.organization.id} onClose={() => setFormOpen(false)} onRefresh={() => { setFormOpen(false); void query.refetch(); }} />}
  </div>;
}
