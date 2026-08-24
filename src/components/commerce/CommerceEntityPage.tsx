"use client";

import { use, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Activity, BarChart3, Building2, CalendarClock, CircleDollarSign, FileSearch, Kanban, List, MapPinned, PackageCheck, Plus, Search, SlidersHorizontal, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import ClientForm from "@/app/[orgId]/(protected)/clients/ClientForm";
import ProspectForm from "@/app/[orgId]/(protected)/prospects/ProspectForm";
import OffreForm from "@/app/[orgId]/(protected)/avant-vente/OffreForm";
import CommandeForm from "@/app/[orgId]/(protected)/commandes/CommandeForm";
import { HrActionMenu, HrChartCard, HrColumnFilterMenu, HrInfo, HrMetricCard, HrResetFilters, HrSectionCard, HrStatusBadge, hrInputClassName, hrSaveButtonClassName, hrSelectClassName, hrTableClassName, hrTableHeaderClassName } from "@/components/hr/HrReferenceUi";
import { ProjectAlertsPanel } from "@/components/projects/ProjectReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import DataExportMenu, { type ExportColumn } from "@/components/ui/DataExportMenu";
import PageHeader from "@/components/ui/PageHeader";
import PageTutorial from "@/components/ui/PageTutorial";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Mode = "clients" | "prospects" | "offers" | "orders";
type TabKey = "pilotage" | "analyses" | "alerts";
type View = "cards" | "table" | "kanban";
type Column = { key: string; label: string; value: (row: AnyRow) => ReactNode; raw: (row: AnyRow) => unknown; width?: string };

const supabase = createClient();
const money = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value: unknown) => value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—";
const plain = (value: unknown) => String(value ?? "").trim();

const config: Record<Mode, { title: string; subtitle: string; singular: string; icon: typeof Building2 }> = {
  clients: { title: "Clients", subtitle: "Centraliser comptes, contacts, secteurs et relation commerciale dans un référentiel partagé.", singular: "client", icon: Building2 },
  prospects: { title: "Prospects & opportunités", subtitle: "Qualifier le kanban commercial, la probabilité, la valeur, la prochaine action et la décision commerciale.", singular: "opportunité", icon: Target },
  offers: { title: "Avant-vente", subtitle: "Piloter offres, Go/No-Go, charge, coûts, marge, conformité et transformation en projet.", singular: "offre", icon: FileSearch },
  orders: { title: "Commandes", subtitle: "Suivre engagements clients et fournisseurs, livraison, facturation et continuité financière.", singular: "commande", icon: PackageCheck },
};

const stageOrder: Record<Mode, string[]> = {
  clients: ["Actif", "Archivé"],
  prospects: ["Découverte", "Contact", "Qualification", "Proposition", "Négociation", "Gagné", "Perdu", "No-Go"],
  offers: ["À faire", "En cours", "Diffusé", "Attente retour client", "Validation client", "Refus client", "No-Go"],
  orders: ["Brouillon", "Envoyée", "Validée", "En cours", "Livrée", "Facturée", "Annulée"],
};

const statusTranslation: Record<string, string> = {
  active: "Actif", archived: "Archivé", discovery: "Découverte", contact: "Contact", qualification: "Qualification", proposal: "Proposition", negotiation: "Négociation", won: "Gagné", lost: "Perdu", delivered: "Livré", planned: "Planifié", late: "En retard", draft: "Brouillon", submitted: "Envoyée", approved: "Validée", completed: "Clôturé", closed: "Clôturé", blocked: "Bloqué", cancelled: "Annulée", in_progress: "En cours",
};

function translatedStatus(value: unknown) {
  const raw = plain(value) || "Ouvert";
  return statusTranslation[raw.toLowerCase()] || raw.replaceAll("_", " ");
}

function statusTone(value: unknown) {
  const key = translatedStatus(value).toLocaleLowerCase("fr");
  if (key === "go" || ["gagné", "validé", "validée", "livré", "livrée", "facturé", "facturée", "actif", "clôturé"].some((item) => key.includes(item))) return "completed";
  if (["en cours", "négociation", "proposition", "diffusé", "attente", "envoyé"].some((item) => key.includes(item))) return "in_progress";
  if (["bloqué", "refus", "perdu", "no-go", "nogo", "retard"].some((item) => key.includes(item))) return "blocked";
  if (["annulé", "archivé"].some((item) => key.includes(item))) return "archived";
  return "planned";
}

function opportunityNumber(value: unknown, createdAt?: unknown) {
  const raw = plain(value);
  if (/^OPP-\d{4}-\d{4}$/i.test(raw)) return raw.toUpperCase();
  const year = String(createdAt || "").slice(0, 4).match(/^\d{4}$/)?.[0] || String(new Date().getFullYear());
  const digits = raw.match(/\d+/g)?.at(-1);
  return digits ? `OPP-${year}-${String(Number(digits)).padStart(4, "0")}` : "À générer";
}

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
  const [clientsResult, projectsResult] = await Promise.all([
    table("clients").order("name"),
    table("project_projects").order("code", { ascending: true }),
  ]);
  if (clientsResult.error) throw new Error(clientsResult.error.message);
  const clients: AnyRow[] = clientsResult.data || [];
  const projects: AnyRow[] = projectsResult.error ? [] : (projectsResult.data || []).filter((row: AnyRow) => !row.archived_at);
  const clientMap = new Map(clients.map((row) => [String(row.id), row]));
  const projectsByClient = new Map<string, AnyRow[]>();
  projects.forEach((project) => { const key = plain(project.client_name).toLocaleLowerCase("fr"); if (!key) return; projectsByClient.set(key, [...(projectsByClient.get(key) || []), project]); });
  if (mode === "clients") return { organization, clients, projects, rows: clients.map((row) => { const linkedProjects = projectsByClient.get(plain(row.name).toLocaleLowerCase("fr")) || []; return { ...row, linkedProjects, project_count: linkedProjects.length, project_value: linkedProjects.reduce((sum, project) => sum + Number(project.ordered_budget || project.sold_amount || 0), 0), display_status: row.archived_at ? "Archivé" : "Actif", display_date: row.updated_at || row.created_at, display_owner: row.contact || "Contact à renseigner" }; }) };

  const prospectsResult = await table("prospects").order("opp_number", { ascending: true });
  if (prospectsResult.error) throw new Error(prospectsResult.error.message);
  const projectByOpportunity = new Map<string, AnyRow>();
  projects.forEach((project) => { const key = opportunityNumber(project.opportunity_number || project.source_reference, project.created_at); if (key !== "À générer") projectByOpportunity.set(key, project); });
  const prospects: AnyRow[] = (prospectsResult.data || []).map((row: AnyRow) => {
    const oppNumber = opportunityNumber(row.opp_number || row.opportunity_number, row.created_at);
    const linkedProject = projects.find((project) => String(project.opportunity_id || project.source_id || "") === String(row.id)) || projectByOpportunity.get(oppNumber);
    return ({
    ...row,
    linkedProject,
    project_code: linkedProject?.code,
    project_status: linkedProject?.status,
    opp_number: oppNumber,
    client_name: clientMap.get(String(row.client_id))?.name || "Client à renseigner",
    client_city: clientMap.get(String(row.client_id))?.city,
    client_country: clientMap.get(String(row.client_id))?.country,
    client_region: clientMap.get(String(row.client_id))?.region,
    display_status: translatedStatus(row.statut || row.status || "Découverte"),
    display_date: row.date_cible || row.target_date || row.expected_close_date,
    display_amount: row["ca_estime_k€"] != null ? Number(row["ca_estime_k€"] || 0) * 1000 : Number(row.montant || row.amount || 0),
    display_probability: Number(row.probabilite_gain || row.probability || row.probabilite || 0),
    display_owner: row.commercial_id || row.commercial || row.owner_name || "Non affecté",
    next_action: row.next_action || row.prochaine_action || (linkedProject ? "Suivre le projet transformé" : "À planifier"),
  }); });
  const knownProspectOpportunities = new Set(prospects.map((row) => row.opp_number));
  const projectHistoryRows = projects.filter((project) => { const key = opportunityNumber(project.opportunity_number || project.source_reference, project.created_at); return key !== "À générer" && !knownProspectOpportunities.has(key); }).map((project) => ({ id: `project-${project.id}`, source_project_only: true, linkedProject: project, project_code: project.code, project_status: project.status, opp_number: opportunityNumber(project.opportunity_number || project.source_reference, project.created_at), titre: project.name, title: project.name, client_name: project.client_name || "Client projet", display_status: "Gagné", display_date: project.start_date || project.created_at, display_amount: Number(project.ordered_budget || project.sold_amount || project.budget_amount || 0), display_probability: 100, display_owner: project.project_manager_name || "Chef de projet", next_action: "Suivre dans le portefeuille projets" }));
  const correlatedProspects = [...prospects, ...projectHistoryRows];
  if (mode === "prospects") return { organization, clients, projects, prospects: correlatedProspects, rows: correlatedProspects };

  if (mode === "offers") {
    const offersResult = await table("offres").order("created_at", { ascending: false });
    if (offersResult.error) throw new Error(offersResult.error.message);
    const offers: AnyRow[] = offersResult.data || [];
    const offerIds = offers.map((row) => row.id).filter(Boolean);
    const [technicalResult, goNoGoResult] = offerIds.length ? await Promise.all([
      (supabase.from("offres_fiche_technique" as never) as any).select("*").in("offre_id", offerIds),
      (supabase.from("offres_gonogo" as never) as any).select("*").in("offre_id", offerIds),
    ]) : [{ data: [], error: null }, { data: [], error: null }];
    if (technicalResult.error) throw new Error(technicalResult.error.message);
    if (goNoGoResult.error) throw new Error(goNoGoResult.error.message);
    const prospectMap = new Map(prospects.map((row) => [String(row.id), row]));
    const technicalMap = new Map((technicalResult.data || []).map((row: AnyRow) => [String(row.offre_id), row]));
    const goNoGoMap = new Map((goNoGoResult.data || []).map((row: AnyRow) => [String(row.offre_id), row]));
    const rows = offers.map((row) => {
      const prospect = prospectMap.get(String(row.prospect_id)) as AnyRow | undefined;
      const technical = technicalMap.get(String(row.id)) as AnyRow | undefined;
      const goNoGo = goNoGoMap.get(String(row.id)) as AnyRow | undefined;
      const oppNumber = opportunityNumber(prospect?.opp_number || row.opportunity_number, row.created_at);
      const linkedProject = prospect?.linkedProject || projectByOpportunity.get(oppNumber);
      return { ...row, prospect, technical, goNoGo, linkedProject, project_code: linkedProject?.code, project_status: linkedProject?.status, opp_number: oppNumber, title: prospect?.titre || row.title || "Offre sans désignation", client_name: prospect?.client_name || linkedProject?.client_name || "Client à renseigner", client_city: prospect?.client_city, client_country: prospect?.client_country, client_region: prospect?.client_region, display_status: translatedStatus(row.statut_offre || "À faire"), display_date: row.date_validation_previsionnelle || row.date_diffusion_previsionnelle || prospect?.display_date, display_amount: Number(technical?.total_prix_vente_ca || row.amount || linkedProject?.ordered_budget || 0), display_cost: Number(technical?.total_couts_ressources || 0) + Number(technical?.total_couts_achats || 0), display_margin: Number(technical?.marge_brute_calculee_pourcent || row.margin_percent || linkedProject?.target_margin_rate || 0), display_gonogo: goNoGo?.date_passage_gonogo ? translatedStatus(goNoGo.decision_calculee || "À faire") : linkedProject ? "GO" : "À faire", display_owner: prospect?.display_owner || linkedProject?.project_manager_name || row.owner_name || "Non affecté" };
    });
    return { organization, clients, projects, prospects, rows };
  }

  const [ordersResult, suppliersResult] = await Promise.all([table("commandes").order("created_at", { ascending: false }), table("fournisseurs").order("name")]);
  if (ordersResult.error) throw new Error(ordersResult.error.message);
  if (suppliersResult.error) throw new Error(suppliersResult.error.message);
  const supplierMap = new Map<string, AnyRow>((suppliersResult.data || []).map((row: AnyRow) => [String(row.id), row]));
  const prospectMap = new Map(prospects.map((row) => [String(row.id), row]));
  const rows = (ordersResult.data || []).map((row: AnyRow) => {
    const prospect = prospectMap.get(String(row.prospect_id)) as AnyRow | undefined;
    const isSupplier = String(row.type_commande || row.command_type || "CLIENT").toUpperCase() === "FOURNISSEUR";
    const oppNumber = opportunityNumber(prospect?.opp_number || row.opp_number, row.created_at);
    const linkedProject = prospect?.linkedProject || projectByOpportunity.get(oppNumber);
    return { ...row, linkedProject, project_code: linkedProject?.code, project_status: linkedProject?.status, opp_number: oppNumber, title: row.titre || row.title || prospect?.titre || linkedProject?.name || "Commande sans désignation", entity_name: isSupplier ? supplierMap.get(String(row.fournisseur_id))?.name || "Fournisseur à renseigner" : clientMap.get(String(row.client_id || prospect?.client_id))?.name || prospect?.client_name || linkedProject?.client_name || "Client à renseigner", display_status: translatedStatus(row.statut || row.status || "Brouillon"), display_date: row.date_commande || row.order_date || row.created_at, display_amount: Number(row.montant_total || row.amount || row.total_amount || linkedProject?.ordered_budget || 0), display_owner: row.responsable || row.owner_name || linkedProject?.project_manager_name || "Non affecté", order_type: isSupplier ? "Fournisseur" : "Client" };
  });
  return { organization, clients, projects, prospects, rows };
}

export default function CommerceEntityPage({ params, mode }: { params: Promise<{ orgId: string }>; mode: Mode }) {
  const { orgId } = use(params);
  const router = useRouter();
  const page = config[mode];
  const query = useQuery({ queryKey: ["commerce-decisionnel", mode, orgId], queryFn: () => loadCommerce(orgId, mode) });
  const [tab, setTab] = useState<TabKey>("pilotage");
  const [view, setView] = useState<View>(mode === "prospects" ? "kanban" : "cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [client, setClient] = useState("");
  const [end, setEnd] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const tableRef = useRef<HTMLElement | null>(null);
  const rows: AnyRow[] = query.data?.rows || [];

  const columns: Column[] = useMemo(() => {
    if (mode === "clients") return [column("name", "Client", (row) => row.name, (row) => row.name, "min-w-56"), column("sector", "Secteur", (row) => row.sector || "—", (row) => row.sector || "—"), column("country", "Pays", (row) => row.country || "—", (row) => row.country || "—"), column("city", "Ville", (row) => row.city || "—", (row) => row.city || "—"), column("contact", "Contact", (row) => row.contact || "—", (row) => row.contact || "—"), column("projects", "Projets liés", (row) => row.project_count || 0, (row) => row.project_count || 0), column("projectValue", "Valeur projets", (row) => money(row.project_value), (row) => row.project_value), column("email", "E-mail", (row) => row.email || "—", (row) => row.email || "—", "min-w-56"), statusColumn()];
    if (mode === "prospects") return [column("number", "N° Opportunité", (row) => row.opp_number, (row) => row.opp_number, "min-w-44"), column("title", "Désignation", (row) => row.titre || "—", (row) => row.titre || "—", "min-w-64"), column("client", "Client", (row) => row.client_name, (row) => row.client_name), column("owner", "Commercial", (row) => row.display_owner, (row) => row.display_owner), statusColumn("Étape"), column("project", "Projet transformé", (row) => row.project_code ? <button type="button" onClick={() => router.push(`/${orgId}/projects/${row.linkedProject?.id}`)} className="font-bold text-indigo-700 hover:underline">{row.project_code}</button> : "—", (row) => row.project_code || "—"), column("date", "Décision prévue", (row) => date(row.display_date), (row) => date(row.display_date)), column("amount", "CA estimé", (row) => money(row.display_amount), (row) => row.display_amount), column("probability", "Probabilité", (row) => `${row.display_probability} %`, (row) => `${row.display_probability} %`), column("weighted", "CA pondéré", (row) => money(row.display_amount * row.display_probability / 100), (row) => row.display_amount * row.display_probability / 100), column("action", "Prochaine action", (row) => row.next_action, (row) => row.next_action, "min-w-56")];
    if (mode === "offers") return [column("number", "N° Opportunité", (row) => row.opp_number, (row) => row.opp_number, "min-w-44"), column("title", "Désignation", (row) => row.title, (row) => row.title, "min-w-64"), column("client", "Client", (row) => row.client_name, (row) => row.client_name), column("owner", "Responsable", (row) => row.display_owner, (row) => row.display_owner), column("gonogo", "Go/No-Go", (row) => <HrStatusBadge status={statusTone(row.display_gonogo)} label={row.display_gonogo} />, (row) => row.display_gonogo), column("dossier", "Dossier AVV", (row) => <div className="flex flex-wrap gap-1"><button type="button" onClick={() => router.push(`/${orgId}/avant-vente/${row.id}?onglet=gonogo`)} className="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">Go/No-Go</button><button type="button" onClick={() => router.push(`/${orgId}/avant-vente/${row.id}?onglet=ft`)} className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">Fiche technique</button></div>, () => "Go/No-Go · Fiche technique", "min-w-56"), column("project", "Projet transformé", (row) => row.project_code ? <button type="button" onClick={() => router.push(`/${orgId}/projects/${row.linkedProject?.id}`)} className="font-bold text-indigo-700 hover:underline">{row.project_code}</button> : "—", (row) => row.project_code || "—"), statusColumn(), column("date", "Validation prévue", (row) => date(row.display_date), (row) => date(row.display_date)), column("amount", "Prix de vente", (row) => money(row.display_amount), (row) => row.display_amount), column("cost", "Coûts prévus", (row) => money(row.display_cost), (row) => row.display_cost), column("margin", "Marge prévue", (row) => `${row.display_margin.toFixed(1)} %`, (row) => `${row.display_margin.toFixed(1)} %`)];
    return [column("number", "N° Commande", (row) => row.num_commande || row.numero_commande || row.order_number || "—", (row) => row.num_commande || row.numero_commande || row.order_number || "—", "min-w-44"), column("opportunity", "N° Opportunité", (row) => row.opp_number, (row) => row.opp_number, "min-w-44"), column("title", "Désignation", (row) => row.title, (row) => row.title, "min-w-64"), column("entity", "Client / fournisseur", (row) => row.entity_name, (row) => row.entity_name), column("type", "Type", (row) => row.order_type, (row) => row.order_type), column("dossier", "Dossier commande", (row) => <div className="flex flex-wrap gap-1"><button type="button" onClick={() => router.push(`/${orgId}/commandes/${row.id}?onglet=revue`)} className="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">Revue</button><button type="button" onClick={() => router.push(`/${orgId}/commandes/${row.id}?onglet=kpis`)} className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">Synthèse</button></div>, () => "Revue · Synthèse", "min-w-48"), column("project", "Projet lié", (row) => row.project_code || "—", (row) => row.project_code || "—"), statusColumn(), column("date", "Date", (row) => date(row.display_date), (row) => date(row.display_date)), column("amount", "Montant", (row) => money(row.display_amount), (row) => row.display_amount)];
  }, [mode, orgId, router]);

  const valueFor = (row: AnyRow, item: Column) => plain(item.raw(row)) || "—";
  const statuses = [...new Set(rows.map((row) => translatedStatus(row.display_status)))].sort((a, b) => a.localeCompare(b, "fr"));
  const owners = [...new Set(rows.map((row) => plain(row.display_owner)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const clientOptions = [...new Set(rows.map((row) => plain(row.client_name || row.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const visibleRows = rows.filter((row) => {
    const haystack = columns.map((item) => valueFor(row, item)).join(" ").toLocaleLowerCase("fr");
    const rowDate = plain(row.display_date).slice(0, 10);
    return (!search || haystack.includes(search.toLocaleLowerCase("fr"))) && (!status || translatedStatus(row.display_status) === status) && (!owner || row.display_owner === owner) && (!client || (row.client_name || row.name) === client) && (!end || !rowDate || rowDate <= end) && columns.every((item) => !columnFilters[item.key]?.length || columnFilters[item.key].includes(valueFor(row, item)));
  });
  const filtersActive = Boolean(search || status || owner || client || end || Object.values(columnFilters).some((values) => values.length));
  const resetFilters = () => { setSearch(""); setStatus(""); setOwner(""); setClient(""); setEnd(""); setColumnFilters({}); };
  const exportColumns: ExportColumn<AnyRow>[] = columns.map((item) => ({ key: item.key, label: item.label, value: (row) => valueFor(row, item) }));
  const totalAmount = visibleRows.reduce((sum, row) => sum + Number(row.display_amount || 0), 0);
  const weightedAmount = visibleRows.reduce((sum, row) => sum + Number(row.display_amount || 0) * Number(row.display_probability || 100) / 100, 0);
  const activeCount = visibleRows.filter((row) => !["completed", "archived", "blocked"].includes(statusTone(row.display_status))).length;
  const missingCount = visibleRows.filter((row) => mode !== "clients" && (!row.display_date || !row.display_owner || !Number(row.display_amount || 0))).length;
  const wonCount = visibleRows.filter((row) => ["gagné", "validation client", "validée", "livrée", "facturée"].includes(translatedStatus(row.display_status).toLowerCase())).length;
  const goCount = visibleRows.filter((row) => plain(row.display_gonogo).toUpperCase() === "GO").length;
  const averageMargin = visibleRows.length ? visibleRows.reduce((sum, row) => sum + Number(row.display_margin || 0), 0) / visibleRows.length : 0;
  const monthly = useMemo(() => aggregateBy(visibleRows, (row) => { const key = plain(row.display_date || row.created_at).slice(0, 7); return key ? { key, label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(`${key}-01T12:00:00`)) } : null; }), [visibleRows]);
  const statusSeries = useMemo(() => aggregateBy(visibleRows, (row) => ({ key: translatedStatus(row.display_status), label: translatedStatus(row.display_status) })), [visibleRows]);
  const geographySeries = useMemo(() => aggregateBy(visibleRows, (row) => ({ key: plain(row.country || "Non renseigné"), label: plain(row.country || "Non renseigné") })), [visibleRows]);

  if (query.isLoading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">Chargement du module Commerce…</div>;
  if (query.error || !query.data) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">Impossible de charger {page.title.toLocaleLowerCase("fr")} : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</div>;
  const openItem = (row: AnyRow) => { if (row.source_project_only && row.linkedProject?.id) router.push(`/${orgId}/projects/${row.linkedProject.id}`); else if (mode === "offers") router.push(`/${orgId}/avant-vente/${row.id}`); else if (mode === "orders") router.push(`/${orgId}/commandes/${row.id}`); else { setSelected(row); setFormOpen(true); } };
  const alerts = [
    { label: "Données incomplètes", count: missingCount, impact: "La prévision commerciale et la transformation deviennent moins fiables.", action: "Compléter responsable, échéance, valeur, prochaine action et rattachement client.", accent: "rose" as const },
    { label: "Éléments actifs", count: activeCount, impact: "Volume de travail nécessitant une prochaine action datée.", action: "Vérifier la priorité, le propriétaire et le prochain engagement.", accent: "amber" as const },
    { label: mode === "offers" ? "Go/No-Go à passer" : "Sans valeur", count: mode === "offers" ? visibleRows.filter((row) => row.display_gonogo === "À faire").length : visibleRows.filter((row) => mode !== "clients" && !Number(row.display_amount || 0)).length, impact: mode === "offers" ? "L’engagement ne doit pas être pris sans décision documentée." : "La valeur du pipeline ou de l’engagement est incomplète.", action: mode === "offers" ? "Compléter la check-list, les risques et la décision Go/No-Go." : "Renseigner la valeur depuis l’opportunité ou l’offre source.", accent: "sky" as const },
    { label: "Chronos à sécuriser", count: visibleRows.filter((row) => mode !== "clients" && String(row.opp_number || row.num_commande || "").includes("À générer")).length, impact: "Le rapprochement Commerce–Projets–Finance est fragilisé.", action: "Générer le numéro métier avant validation.", accent: "indigo" as const },
  ];
  const Icon = page.icon;

  return <div className="onepilot-business-page space-y-6">
    <PageHeader title={page.title} subtitle={page.subtitle} actions={<><DataExportMenu data={visibleRows} columns={exportColumns} fileName={`onepilot_${mode}`} sheetName={page.title} disabled={!visibleRows.length} /><button type="button" onClick={() => { setSelected(null); setFormOpen(true); }} className={hrSaveButtonClassName}><Plus className="h-4 w-4" />Nouveau {page.singular}</button></>} />
    <PageTutorial title="Guide de la page" description={`${page.subtitle}\nLes données saisies ici alimentent le kanban, l’avant-vente, les projets, le pilotage et la finance sans ressaisie.`} objectives={["Disposer d’une source commerciale unique, fiable et partageable.", "Sécuriser chaque passage de jalon jusqu’à la commande et au projet."]} steps={[{ title: "Qualifier", description: "Compléter client, responsable, échéance, valeur, probabilité et prochaine action." }, { title: "Décider", description: "Analyser capacité, risques, conformité, rentabilité et décision Go/No-Go." }, { title: "Transformer", description: "Transmettre automatiquement les données validées à Commandes, Projets et Finance." }]} analyses={[{ title: "Lecture décisionnelle", description: "Les KPI, cartes, tableaux, kanban, graphiques, alertes et exports suivent le même périmètre filtré." }]} recommendations={["Ne jamais recréer un client ou une opportunité déjà existante.", "Justifier tout changement majeur de valeur, probabilité, marge ou date.", "Conserver une prochaine action datée sur chaque élément actif."]} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><HrMetricCard icon={Icon} label="Volume filtré" value={visibleRows.length} description="Éléments du périmètre courant." accent="indigo" /><HrMetricCard icon={Activity} label="Actifs" value={activeCount} description="Objets encore à piloter." accent="emerald" /><HrMetricCard icon={CircleDollarSign} label={mode === "prospects" ? "CA pondéré" : "Valeur"} value={money(mode === "prospects" ? weightedAmount : totalAmount)} description="Valeur cohérente avec les filtres." accent="amber" /><HrMetricCard icon={TrendingUp} label={mode === "offers" ? "Marge moyenne" : "Transformés"} value={mode === "offers" ? `${averageMargin.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : wonCount} description={mode === "offers" ? "Marge issue de la fiche technique." : "Éléments gagnés, validés ou livrés."} accent="sky" /><HrMetricCard icon={Target} label={mode === "offers" ? "Décisions GO" : "À compléter"} value={mode === "offers" ? goCount : missingCount} description={mode === "offers" ? "Offres autorisées à poursuivre." : "Données nécessaires manquantes."} accent="rose" /><HrMetricCard icon={CalendarClock} label="Échéances" value={visibleRows.filter((row) => row.display_date).length} description="Éléments correctement datés." accent="indigo" /></section>
    <HrSectionCard icon={SlidersHorizontal} title="Périmètre d’analyse" description="La recherche et les filtres pilotent KPI, cartes, tableau, kanban, analyses, alertes et export."><div className="space-y-4"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-10`} placeholder={`Rechercher dans ${page.title.toLocaleLowerCase("fr")}…`} /></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select value={status} onChange={(event) => setStatus(event.target.value)} className={hrSelectClassName}><option value="">Tous les statuts</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><select value={owner} onChange={(event) => setOwner(event.target.value)} className={hrSelectClassName}><option value="">Tous les responsables</option>{owners.map((value) => <option key={value}>{value}</option>)}</select><select value={client} onChange={(event) => setClient(event.target.value)} className={hrSelectClassName}><option value="">Tous les clients</option>{clientOptions.map((value) => <option key={value}>{value}</option>)}</select><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className={hrInputClassName} /><div className="flex items-center justify-end"><HrStatusBadge status="planned" label={`${visibleRows.length} résultat(s) sur ${rows.length}`} /></div></div>{filtersActive && <HrResetFilters onReset={resetFilters} />}</div></HrSectionCard>
    <div className="flex justify-center"><div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">{([{ key: "pilotage", label: "Pilotage", active: "bg-indigo-600 text-white" }, { key: "analyses", label: "Analyses", active: "bg-violet-600 text-white" }, { key: "alerts", label: "Alertes", active: "bg-emerald-600 text-white" }] as const).map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`h-10 rounded-xl px-5 text-sm font-bold transition ${tab === item.key ? item.active : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div></div>

    {tab === "pilotage" && <section ref={tableRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-black text-slate-950">Pilotage de {page.title.toLocaleLowerCase("fr")}</h2><p className="mt-1 text-xs text-slate-500">Cartes, tableau et kanban partagent les mêmes données, filtres et actions.</p></div></div><div className="flex flex-wrap items-center gap-2"><DataExportMenu data={visibleRows} columns={exportColumns} fileName={`onepilot_${mode}_pilotage`} sheetName={page.title} disabled={!visibleRows.length} /><ProjectVisualActions targetRef={tableRef} fileName={`onepilot_${mode}_pilotage`} label={`le pilotage ${page.title}`} /><ViewButton active={view === "cards"} onClick={() => setView("cards")} icon={Building2}>Cartes</ViewButton><ViewButton active={view === "table"} onClick={() => setView("table")} icon={List}>Tableau</ViewButton>{["prospects", "offers"].includes(mode) && <ViewButton active={view === "kanban"} onClick={() => setView("kanban")} icon={Kanban}>Kanban</ViewButton>}</div></header>{view === "cards" && <CommerceCards rows={visibleRows} mode={mode} onOpen={openItem} onSection={(row, section) => { if (mode === "offers") router.push(`/${orgId}/avant-vente/${row.id}?onglet=${section}`); if (mode === "orders") router.push(`/${orgId}/commandes/${row.id}?onglet=${section}`); }} />}{view === "table" && <CommerceTable rows={visibleRows} allRows={rows} columns={columns} filters={columnFilters} onFilters={setColumnFilters} mode={mode} onOpen={openItem} />}{view === "kanban" && <CommerceKanban rows={visibleRows} mode={mode} onOpen={openItem} />}</section>}
    {tab === "analyses" && <div className="space-y-6"><section className="grid gap-5 xl:grid-cols-2"><CommerceBar title={`Volumes mensuels — ${page.title}`} description="Nombre d’éléments positionnés sur chaque mois du périmètre." data={monthly} dataKey="volume" label="Volume" color="#818cf8" /><CommerceBar title={`Valeur mensuelle — ${page.title}`} description="Montants commerciaux disponibles par mois de référence." data={monthly} dataKey="amount" label="Montant" color="#6ee7b7" unit=" €" /><CommerceBar title="Répartition par statut" description="Volume selon l’étape réelle du processus commercial." data={statusSeries} dataKey="volume" label="Volume" color="#7dd3fc" /><CommerceBar title="Valeur par statut" description="Concentration de la valeur et points de passage à sécuriser." data={statusSeries} dataKey="amount" label="Montant" color="#fbbf24" unit=" €" />{mode === "clients" && <CommerceBar title="Cartographie commerciale" description="Répartition du portefeuille client par pays renseigné." data={geographySeries} dataKey="volume" label="Clients" color="#38bdf8" />}{mode === "offers" && <CommerceBar title="Marge par offre" description="Marge prévisionnelle issue du prix de vente et des coûts de la fiche technique." data={visibleRows.map((row) => ({ label: row.opp_number, value: row.display_margin }))} dataKey="value" label="Marge" color="#34d399" unit=" %" />}</section><HrSectionCard icon={BarChart3} title="Synthèse décisionnelle" description="Comprendre la transformation, la valeur, la rentabilité et les actions attendues."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><HrInfo label="Volume" value={visibleRows.length} accent="indigo" /><HrInfo label="Actifs" value={activeCount} accent="emerald" /><HrInfo label="Valeur" value={money(totalAmount)} accent="amber" /><HrInfo label="CA pondéré" value={money(weightedAmount)} accent="sky" /><HrInfo label="À compléter" value={missingCount} accent="rose" /></div><p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs leading-5 text-indigo-950">{decisionText(mode, { missingCount, averageMargin, goCount, activeCount })}</p></HrSectionCard></div>}
    {tab === "analyses" && mode === "offers" && <FranceCommercialMap rows={visibleRows} />}
    {tab === "alerts" && <ProjectAlertsPanel title="Alertes commerciales" description="Qualité des données, continuité du processus et actions attendues." items={alerts} />}
    {formOpen && mode === "clients" && <ClientForm modalMode={selected ? "edit" : "create"} clientData={selected || undefined} orgSlugOrId={orgId} onClose={() => { setFormOpen(false); setSelected(null); }} onSave={() => { setFormOpen(false); setSelected(null); void query.refetch(); }} />}
    {formOpen && mode === "prospects" && <ProspectForm selectedProspect={selected} clientsList={query.data.clients} currentOrgId={query.data.organization.id} prospectsCount={rows} onClose={() => { setFormOpen(false); setSelected(null); }} onRefresh={() => { setFormOpen(false); setSelected(null); void query.refetch(); }} />}
    {formOpen && mode === "offers" && <OffreForm currentOrgId={query.data.organization.id} onClose={() => setFormOpen(false)} onRefresh={() => { setFormOpen(false); void query.refetch(); }} />}
    {formOpen && mode === "orders" && <CommandeForm currentOrgId={query.data.organization.id} onClose={() => setFormOpen(false)} onRefresh={() => { setFormOpen(false); void query.refetch(); }} />}
  </div>;
}

function column(key: string, label: string, value: Column["value"], raw: Column["raw"], width?: string): Column { return { key, label, value, raw, width }; }
function statusColumn(label = "Statut"): Column { return column("status", label, (row) => <HrStatusBadge status={statusTone(row.display_status)} label={translatedStatus(row.display_status)} />, (row) => translatedStatus(row.display_status)); }
function ViewButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Building2; children: ReactNode }) { return <button type="button" onClick={onClick} className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold ${active ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600"}`}><Icon className="h-3.5 w-3.5" />{children}</button>; }

function CommerceCards({ rows, mode, onOpen, onSection }: { rows: AnyRow[]; mode: Mode; onOpen: (row: AnyRow) => void; onSection: (row: AnyRow, section: string) => void }) {
  return <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.id} onClick={() => onOpen(row)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-black text-indigo-700">{mode === "clients" ? row.name : row.opp_number || row.num_commande || "À générer"}</p><h3 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">{mode === "clients" ? row.sector || "Secteur à renseigner" : row.title || row.titre}</h3></div><div onClick={(event) => event.stopPropagation()}><HrActionMenu labels={{ view: "Voir", edit: "Modifier", archive: "Archiver", restore: "Réactiver" }} onView={() => onOpen(row)} onEdit={() => onOpen(row)} /></div></div><div className="mt-3 flex flex-wrap gap-2"><HrStatusBadge status={statusTone(row.display_status)} label={translatedStatus(row.display_status)} />{row.display_gonogo && <HrStatusBadge status={statusTone(row.display_gonogo)} label={`Go/No-Go : ${row.display_gonogo}`} />}</div>{mode === "offers" && <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => onSection(row, "gonogo")} className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700">Check-list Go/No-Go</button><button type="button" onClick={() => onSection(row, "ft")} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">Fiche technique</button></div>}{mode === "orders" && <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => onSection(row, "revue")} className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700">Revue de commande</button><button type="button" onClick={() => onSection(row, "kpis")} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">Synthèse commande</button></div>}<div className="mt-4 grid grid-cols-2 gap-2"><HrInfo label="Client / contact" value={row.client_name || row.contact || "À renseigner"} /><HrInfo label="Responsable" value={row.display_owner || "Non affecté"} /><HrInfo label="Échéance" value={date(row.display_date)} accent="amber" /><HrInfo label="Valeur" value={money(row.display_amount)} accent="emerald" /></div></article>)}{!rows.length && <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500">Aucun élément dans ce périmètre.</p>}</div>;
}

function CommerceTable({ rows, allRows, columns, filters, onFilters, mode, onOpen }: { rows: AnyRow[]; allRows: AnyRow[]; columns: Column[]; filters: Record<string, string[]>; onFilters: (value: Record<string, string[]>) => void; mode: Mode; onOpen: (row: AnyRow) => void }) {
  return <div data-visual-scroll className="max-h-[520px] overflow-auto"><table className={`${hrTableClassName} min-w-[1650px]`}><thead className={hrTableHeaderClassName}><tr>{columns.map((item, index) => <th key={item.key} className={`${index === 0 ? "sticky left-0 z-30 bg-sky-50" : ""} text-left ${item.width || "min-w-36"}`}><HrColumnFilterMenu label={item.label} values={allRows.map((row) => plain(item.raw(row)) || "—")} selected={filters[item.key] || []} onChange={(values) => onFilters({ ...filters, [item.key]: values })} /></th>)}<th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="hover:bg-indigo-50/40">{columns.map((item, index) => <td key={item.key} className={`${index === 0 ? "sticky left-0 z-10 bg-white font-semibold text-slate-900" : "font-normal"} ${item.width || ""}`}>{item.value(row)}</td>)}<td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: `Voir ${mode === "prospects" ? "l’opportunité" : "la fiche"}`, edit: "Modifier", archive: "Archiver", restore: "Réactiver" }} onView={() => onOpen(row)} onEdit={() => onOpen(row)} /></td></tr>)}</tbody></table></div>;
}

function CommerceKanban({ rows, mode, onOpen }: { rows: AnyRow[]; mode: Mode; onOpen: (row: AnyRow) => void }) {
  const stages = [...stageOrder[mode], ...rows.map((row) => translatedStatus(row.display_status)).filter((value) => !stageOrder[mode].includes(value))];
  return <div data-visual-diagram className="overflow-x-auto bg-slate-50/60 p-5"><div className="grid min-w-max auto-cols-[290px] grid-flow-col gap-4">{[...new Set(stages)].map((stage) => { const items = rows.filter((row) => translatedStatus(row.display_status).toLocaleLowerCase("fr") === stage.toLocaleLowerCase("fr")); const amount = items.reduce((sum, row) => sum + Number(row.display_amount || 0), 0); return <section key={stage} className="w-[290px] rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-3"><div className="flex items-center justify-between gap-2"><HrStatusBadge status={statusTone(stage)} label={stage} /><strong className="text-xs text-slate-700">{items.length}</strong></div><p className="mt-2 text-xs font-black text-slate-950">{money(amount)}</p></header><div className="space-y-3 p-3">{items.map((row) => <button type="button" key={row.id} onClick={() => onOpen(row)} className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:shadow"><span className="text-[10px] font-black text-indigo-700">{row.opp_number}</span><strong className="mt-1 line-clamp-2 block text-xs text-slate-950">{row.title || row.titre}</strong><span className="mt-2 block text-[10px] font-semibold text-slate-500">{row.client_name} · {money(row.display_amount)}</span><span className="mt-1 block text-[10px] text-slate-500">{date(row.display_date)} · {row.display_owner}</span></button>)}{!items.length && <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Aucun élément</p>}</div></section>; })}</div></div>;
}

function CommerceBar({ title, description, data, dataKey, label, color, unit = "" }: { title: string; description: string; data: AnyRow[]; dataKey: string; label: string; color: string; unit?: string }) {
  return <HrChartCard title={title} description={description} exportConfig={{ type: "bar", data, nameKey: "label", series: [{ key: dataKey, label, color }], unit }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={data.length > 8 ? 1 : 0} tick={{ fontSize: 10 }} /><YAxis /><Tooltip formatter={(value) => unit.includes("€") ? money(value) : `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${unit}`} /><Legend /><Bar dataKey={dataKey} name={label} fill={color} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></HrChartCard>;
}

const franceRegionTiles = [
  { name: "Hauts-de-France", short: "HDF", x: 310, y: 45 }, { name: "Normandie", short: "NOR", x: 220, y: 95 },
  { name: "Île-de-France", short: "IDF", x: 310, y: 115 }, { name: "Grand Est", short: "GES", x: 400, y: 95 },
  { name: "Bretagne", short: "BRE", x: 130, y: 145 }, { name: "Pays de la Loire", short: "PDL", x: 220, y: 165 },
  { name: "Centre-Val de Loire", short: "CVL", x: 310, y: 185 }, { name: "Bourgogne-Franche-Comté", short: "BFC", x: 400, y: 165 },
  { name: "Nouvelle-Aquitaine", short: "NAQ", x: 220, y: 255 }, { name: "Auvergne-Rhône-Alpes", short: "ARA", x: 400, y: 255 },
  { name: "Occitanie", short: "OCC", x: 310, y: 325 }, { name: "Provence-Alpes-Côte d’Azur", short: "PAC", x: 490, y: 325 },
  { name: "Corse", short: "COR", x: 535, y: 395 },
] as const;

function inferFrenchRegion(row: AnyRow) {
  const explicit = plain(row.client_region || row.region).toLocaleLowerCase("fr");
  const city = plain(row.client_city || row.city).toLocaleLowerCase("fr");
  const match = franceRegionTiles.find((item) => explicit.includes(item.name.toLocaleLowerCase("fr")));
  if (match) return match.name;
  if (/paris|versailles|boulogne|saint-denis|créteil/.test(city)) return "Île-de-France";
  if (/lille|amiens|arras|roubaix/.test(city)) return "Hauts-de-France";
  if (/rouen|caen|le havre/.test(city)) return "Normandie";
  if (/strasbourg|metz|nancy|reims/.test(city)) return "Grand Est";
  if (/rennes|brest|lorient/.test(city)) return "Bretagne";
  if (/nantes|angers|le mans/.test(city)) return "Pays de la Loire";
  if (/orléans|tours|bourges/.test(city)) return "Centre-Val de Loire";
  if (/dijon|besançon/.test(city)) return "Bourgogne-Franche-Comté";
  if (/bordeaux|limoges|poitiers|pau/.test(city)) return "Nouvelle-Aquitaine";
  if (/lyon|grenoble|clermont|annecy/.test(city)) return "Auvergne-Rhône-Alpes";
  if (/toulouse|montpellier|nîmes|perpignan/.test(city)) return "Occitanie";
  if (/marseille|nice|toulon|avignon/.test(city)) return "Provence-Alpes-Côte d’Azur";
  if (/ajaccio|bastia/.test(city)) return "Corse";
  return "Non localisé";
}

function FranceCommercialMap({ rows }: { rows: AnyRow[] }) {
  const values = new Map<string, { volume: number; amount: number }>();
  rows.forEach((row) => { const region = inferFrenchRegion(row); const item = values.get(region) || { volume: 0, amount: 0 }; item.volume += 1; item.amount += Number(row.display_amount || 0); values.set(region, item); });
  const max = Math.max(1, ...franceRegionTiles.map((tile) => values.get(tile.name)?.amount || 0));
  const series = franceRegionTiles.map((tile) => ({ label: tile.name, offres: values.get(tile.name)?.volume || 0, montant: values.get(tile.name)?.amount || 0 }));
  const hex = (x: number, y: number) => `${x - 38},${y} ${x - 19},${y - 33} ${x + 19},${y - 33} ${x + 38},${y} ${x + 19},${y + 33} ${x - 19},${y + 33}`;
  const fill = (amount: number) => amount <= 0 ? "#f1f5f9" : amount / max > .66 ? "#4f46e5" : amount / max > .33 ? "#818cf8" : "#c7d2fe";
  return <HrChartCard title="Carte choroplèthe des opportunités AVV" description="Concentration régionale du prix de vente des offres ; survolez une région pour lire volume et valeur." exportConfig={{ type: "bar", data: series, nameKey: "label", series: [{ key: "offres", label: "Offres", color: "#818cf8" }, { key: "montant", label: "Valeur", color: "#34d399" }], unit: " €" }}><div className="flex h-full min-h-0 items-center gap-4"><svg data-visual-svg viewBox="70 0 520 440" className="h-full min-h-[300px] flex-1" role="img" aria-label="Carte choroplèthe commerciale de la France">{franceRegionTiles.map((tile) => { const value = values.get(tile.name) || { volume: 0, amount: 0 }; const dark = value.amount / max > .33; return <g key={tile.name}><title>{`${tile.name} : ${value.volume} offre(s), ${money(value.amount)}`}</title><polygon points={hex(tile.x, tile.y)} fill={fill(value.amount)} stroke="#ffffff" strokeWidth="4" /><text x={tile.x} y={tile.y - 3} textAnchor="middle" className={`text-[12px] font-black ${dark ? "fill-white" : "fill-slate-700"}`}>{tile.short}</text><text x={tile.x} y={tile.y + 15} textAnchor="middle" className={`text-[10px] font-bold ${dark ? "fill-indigo-50" : "fill-slate-500"}`}>{value.volume} · {Math.round(value.amount / 1000)} k€</text></g>; })}</svg><div className="hidden w-56 shrink-0 space-y-2 lg:block"><div className="flex items-center gap-2 text-xs font-bold text-slate-700"><MapPinned className="h-4 w-4 text-indigo-600" />Lecture territoriale</div><p className="text-xs leading-5 text-slate-500">Plus la teinte est soutenue, plus la valeur AVV est concentrée dans la région. Les offres sans localisation restent signalées dans la qualité des données.</p><HrInfo label="Non localisées" value={values.get("Non localisé")?.volume || 0} accent="amber" /></div></div></HrChartCard>;
}

function aggregateBy(rows: AnyRow[], keyOf: (row: AnyRow) => { key: string; label: string } | null) {
  const map = new Map<string, AnyRow>();
  rows.forEach((row) => { const key = keyOf(row); if (!key) return; const item = map.get(key.key) || { key: key.key, label: key.label, volume: 0, amount: 0 }; item.volume += 1; item.amount += Number(row.display_amount || 0); map.set(key.key, item); });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, "fr", { numeric: true }));
}

function decisionText(mode: Mode, data: { missingCount: number; averageMargin: number; goCount: number; activeCount: number }) {
  if (data.missingCount) return `${data.missingCount} élément(s) ne permettent pas encore une décision fiable. Compléter la valeur, l’échéance, le responsable et la prochaine action avant la revue.`;
  if (mode === "offers" && data.averageMargin < 20) return "La marge moyenne est inférieure à 20 %. Revoir la charge, les achats, les hypothèses et le prix avant toute validation Go/No-Go.";
  if (mode === "offers" && !data.goCount && data.activeCount) return "Aucune décision GO n’est tracée sur le périmètre actif. Passer les check-lists avant engagement client.";
  return "Le périmètre est exploitable. Conserver la traçabilité des décisions et surveiller toute variation de probabilité, de date, de coût ou de marge.";
}
