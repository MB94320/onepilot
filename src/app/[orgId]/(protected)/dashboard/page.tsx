"use client";

import { use, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  FolderKanban, DollarSign, TrendingUp, Zap, Sliders, Target, ShieldCheck, Users, 
  ClipboardList, Download, FileText, Briefcase, ShoppingCart, CalendarClock, 
  BrainCircuit, AlertCircle, Award, BarChart3, Activity, CheckCircle, MapPin
} from "lucide-react";
import { 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, ReferenceLine 
} from "recharts";

const supabase = createClient();

const STATUT_LABELS: Record<string, string> = {
  'Brouillon': 'Brouillon', 'Envoyée': 'Envoyée', 'Validée': 'Validée', 
  'En cours': 'En cours', 'Livrée': 'Livrée', 'Facturée': 'Facturée', 'Annulée': 'Annulée'
};

const STAGE_LABELS: Record<string, string> = { 
  'découverte': 'Découverte', 'contact': 'Contact', 'qualification': 'Qualification', 
  'NoGo': 'No-Go', 'proposition': 'Proposition', 'négociation': 'Négociation', 'gagné': 'Gagné', 'perdu': 'Perdu', 'nouveau': 'Nouveau'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f43f5e', '#84cc16', '#64748b'];

// Dictionnaires de cache pour figer les couleurs sans aucun risque de doublon (Correction du bug "tout bleu")
const STAGE_COLORS_MAP: Record<string, string> = {};
let stageColorIndex = 0;
const getStageColor = (key: string) => {
  const k = key.trim().toLowerCase();
  if (!STAGE_COLORS_MAP[k]) {
    STAGE_COLORS_MAP[k] = CHART_COLORS[stageColorIndex % CHART_COLORS.length];
    stageColorIndex++;
  }
  return STAGE_COLORS_MAP[k];
};

const SOURCE_COLORS_MAP: Record<string, string> = {};
let sourceColorIndex = 3; // On démarre à un index différent (rouge/violet) pour visuellement différencier des statuts
const getSourceColor = (key: string) => {
  const k = key.trim().toLowerCase();
  if (!SOURCE_COLORS_MAP[k]) {
    SOURCE_COLORS_MAP[k] = CHART_COLORS[sourceColorIndex % CHART_COLORS.length];
    sourceColorIndex++;
  }
  return SOURCE_COLORS_MAP[k];
};

export default function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  
  const [activeTab, setActiveTab] = useState<"global" | "commercial" | "finance" | "operational" | "resources" | "quality" | "actions">("global");
  const [searchText, setSearchText] = useState("");
  
  const [filters, setFilters] = useState({
    client: 'Tous', oppNumber: 'Tous', orderNumber: 'Tous', statut: 'Tous', commercial: 'Tous'
  });

  const cacheOrgKey = slugOrId || "default-org";

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', cacheOrgKey],
    queryFn: async () => {
      if (!slugOrId) return null;
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await (supabase.from('organizations' as any).select('id').eq('slug', slugOrId).single() as any);
      return data?.id || null;
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['dash-clients', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('clients' as any).select('*').eq('organization_id', currentOrgId) as any);
      return data || [];
    }, enabled: !!currentOrgId
  });

  const { data: prospects = [] } = useQuery({
    queryKey: ['dash-prospects', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('prospects' as any).select('*').eq('organization_id', currentOrgId) as any);
      return data || [];
    }, enabled: !!currentOrgId
  });

  const { data: commandes = [] } = useQuery({
    queryKey: ['dash-commandes', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('commandes' as any).select('*').eq('organization_id', currentOrgId) as any);
      return data || [];
    }, enabled: !!currentOrgId
  });

  const { data: fichesTech = [] } = useQuery({
    queryKey: ['dash-ft', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('offres_fiche_technique' as any).select('*') as any);
      return data || [];
    }, enabled: !!currentOrgId
  });

  const { data: offres = [] } = useQuery({
    queryKey: ['dash-offres', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('offres' as any).select('*').eq('organization_id', currentOrgId) as any);
      return data || [];
    }, enabled: !!currentOrgId
  });

  const uniqueClientsOptions = useMemo(() => ["Tous", ...new Set(clients.map((c: any) => c.name).filter(Boolean))] as string[], [clients]);
  const uniqueOppOptions = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.opp_number ? `OPP-2026-${String(p.opp_number).padStart(4, '0')}` : '').filter(Boolean))] as string[], [prospects]);
  const uniqueOrderOptions = useMemo(() => ["Tous", ...new Set(commandes.map((c: any) => c.type_commande === 'CLIENT' ? c.numero_commande : '').filter(Boolean))] as string[], [commandes]);
  const uniqueCommercialOptions = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.commercial_id).filter(Boolean))] as string[], [prospects]);

  const businessDataset = useMemo(() => {
    const clientsMapped = clients.map((c: any) => ({ ...c }));
    
    const prospectsMapped = prospects.map((p: any) => {
      const client = clients.find((cl: any) => cl.id === p.client_id);
      const chrono = p.opp_number ? `OPP-2026-${String(p.opp_number).padStart(4, '0')}` : '—';
      return { ...p, clientName: client?.name || '—', clientCity: client?.city || client?.ville || 'Non défini', oppChrono: chrono };
    });

    const commandesMapped = commandes.map((cmd: any) => {
      const prospectObj = prospectsMapped.find((p: any) => p.id === cmd.prospect_id);
      const clientObj = clientsMapped.find((c: any) => c.id === cmd.client_id || c.id === prospectObj?.client_id);
      return {
        ...cmd,
        oppChrono: prospectObj?.oppChrono || '—',
        clientName: clientObj?.name || '—',
        titreOpp: prospectObj?.titre || '—'
      };
    });

    let fts = fichesTech.map((ft: any) => {
      const offreObj = offres.find((o: any) => o.id === ft.offre_id);
      const prospectObj = (prospectsMapped as any[]).find((p: any) => p.id === offreObj?.prospect_id);
      return {
        ...ft,
        ca: Number(ft.total_prix_vente_ca || 0) / 1000, 
        couts: (Number(ft.total_couts_ressources || 0) + Number(ft.total_couts_achats || 0)) / 1000, 
        marge: Number(ft.marge_brute_calculee_pourcent || 0),
        oppChrono: prospectObj?.oppChrono || '—',
        clientName: prospectObj?.clientName || '—'
      };
    });

    return { clientsMapped, prospectsMapped, commandesMapped, ftDataMerged: fts };
  }, [clients, prospects, commandes, fichesTech, offres]);

  const filteredData = useMemo(() => {
    const { prospectsMapped, commandesMapped, ftDataMerged } = businessDataset;

    const prs = prospectsMapped.filter((p: any) => {
      if (filters.client !== 'Tous' && p.clientName !== filters.client) return false;
      if (filters.oppNumber !== 'Tous' && p.oppChrono !== filters.oppNumber) return false;
      if (filters.commercial !== 'Tous' && p.commercial_id !== filters.commercial) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        if (!p.titre?.toLowerCase().includes(s) && !p.oppChrono.toLowerCase().includes(s) && !p.clientName.toLowerCase().includes(s)) return false;
      }
      return true;
    });

    const cmds = commandesMapped.filter((c: any) => {
      if (filters.client !== 'Tous' && c.clientName !== filters.client) return false;
      if (filters.oppNumber !== 'Tous' && c.oppChrono !== filters.oppNumber) return false;
      if (filters.orderNumber !== 'Tous' && c.numero_commande !== filters.orderNumber) return false;
      if (filters.statut !== 'Tous' && c.statut !== filters.statut) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        if (!c.numero_commande?.toLowerCase().includes(s) && !c.titre_commande?.toLowerCase().includes(s) && !c.clientName?.toLowerCase().includes(s)) return false;
      }
      return true;
    });

    const fts = ftDataMerged.filter((ft: any) => {
      if (filters.client !== 'Tous' && ft.clientName !== filters.client) return false;
      if (filters.oppNumber !== 'Tous' && ft.oppChrono !== filters.oppNumber) return false;
      return true;
    });

    return { prs, cmds, fts };
  }, [businessDataset, filters, searchText]);

  const commerceKpis = useMemo(() => {
    let totalPipe = 0, winCount = 0, lossCount = 0, caClient = 0, caFrn = 0;
    let activeClientOrders = 0, activeSupplierOrders = 0;

    filteredData.prs.forEach((p: any) => {
      if (!['gagné', 'perdu', 'NoGo'].includes(p.statut)) totalPipe += Number(p['ca_estime_k€'] || 0);
      if (p.statut === 'gagné') winCount++;
      if (p.statut === 'perdu' || p.statut === 'NoGo') lossCount++;
    });

    filteredData.cmds.forEach((c: any) => {
      if (c.statut !== 'Annulée') {
        if (c.type_commande === 'CLIENT') {
          caClient += Number(c.montant_total || 0) / 1000;
          if (c.statut !== 'Facturée') activeClientOrders++;
        } else {
          caFrn += Number(c.montant_total || 0) / 1000;
          if (c.statut !== 'Facturée') activeSupplierOrders++;
        }
      }
    });

    const crmConversion = (winCount + lossCount) > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;
    return { totalPipe, crmConversion, caClient, caFrn, activeOpps: filteredData.prs.length, activeClientOrders, activeSupplierOrders, totalCount: filteredData.prs.length + filteredData.cmds.length };
  }, [filteredData]);

  const financeKpis = useMemo(() => {
    let budgetCA = 0, budgetCouts = 0;
    filteredData.fts.forEach((ft: any) => { budgetCA += ft.ca; budgetCouts += ft.couts; });
    const margeGlobale = budgetCA > 0 ? ((budgetCA - budgetCouts) / budgetCA) * 100 : 0;
    return { budgetCA, budgetCouts, margeGlobale }; 
  }, [filteredData.fts]);

  const globalCharts = useMemo(() => {
    const conversionTimelineMap: Record<string, { opportunites: number; commandes: number }> = {};
    filteredData.prs.forEach((p: any) => {
      if (p.created_at) {
        const d = p.created_at.substring(0, 7);
        if (!conversionTimelineMap[d]) conversionTimelineMap[d] = { opportunites: 0, commandes: 0 };
        conversionTimelineMap[d].opportunites += Number(p['ca_estime_k€'] || 0);
      }
    });
    filteredData.cmds.forEach((c: any) => {
      if (c.date_commande && c.type_commande === 'CLIENT') {
        const d = c.date_commande.substring(0, 7);
        if (!conversionTimelineMap[d]) conversionTimelineMap[d] = { opportunites: 0, commandes: 0 };
        conversionTimelineMap[d].commandes += Number(c.montant_total || 0) / 1000;
      }
    });
    const conversionTimeline = Object.entries(conversionTimelineMap).map(([date, obj]) => ({
      date: date.split('-').reverse().join('/'), 
      'CA Prospecté': obj.opportunites, 
      'CA Commandé': obj.commandes
    })).sort((a,b) => a.date.localeCompare(b.date));

    const volMap: Record<string, { Ventes: number; Achats: number }> = {};
    filteredData.cmds.forEach((c: any) => {
      if (c.date_commande) {
        const d = c.date_commande.substring(0, 7);
        if (!volMap[d]) volMap[d] = { Ventes: 0, Achats: 0 };
        if (c.type_commande === 'CLIENT') volMap[d].Ventes += Number(c.montant_total || 0) / 1000;
        else volMap[d].Achats += Number(c.montant_total || 0) / 1000;
      }
    });
    const stackVolume = Object.entries(volMap).map(([date, obj]) => ({
      date: date.split('-').reverse().join('/'),
      'Facturation Client': obj.Ventes,
      'Engagement Frn': obj.Achats
    })).sort((a,b) => a.date.localeCompare(b.date));

    return { conversionTimeline, stackVolume };
  }, [filteredData]);

  const commerceCharts = useMemo(() => {
    const sMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => { const s = p.statut ? STAGE_LABELS[p.statut] || p.statut : 'Nouveau'; sMap[s] = (sMap[s] || 0) + 1; });
    const donutStatus = Object.entries(sMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    const srcMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => { const s = p.source || 'Inconnu'; srcMap[s] = (srcMap[s] || 0) + 1; });
    const donutSources = Object.entries(srcMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    const cMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => { const c = p.commercial_id || 'Non assigné'; cMap[c] = (cMap[c] || 0) + Number(p['ca_estime_k€'] || 0); });
    const barCommerciaux = Object.entries(cMap).map(([name, CA]) => ({ name, CA })).sort((a,b) => b.CA - a.CA);

    const accMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => {
      const cName = p.clientName || 'Inconnu';
      accMap[cName] = (accMap[cName] || 0) + Number(p['ca_estime_k€'] || 0);
    });
    const topComptes = Object.entries(accMap).map(([name, CA]) => ({ name, CA })).sort((a,b) => a.CA - b.CA).slice(-5);

    const locMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => {
      const loc = p.clientCity || 'Non défini';
      locMap[loc] = (locMap[loc] || 0) + Number(p['ca_estime_k€'] || 0);
    });
    const barGeographie = Object.entries(locMap).map(([name, CA]) => ({ name, CA })).sort((a,b) => a.CA - b.CA).slice(-5);

    const wlMap: Record<string, number> = {};
    filteredData.prs.forEach((p: any) => {
      const cName = p.clientName || 'Inconnu';
      if (p.statut === 'gagné') {
        wlMap[cName] = (wlMap[cName] || 0) + Number(p['ca_estime_k€'] || 0);
      } else if (p.statut === 'perdu' || p.statut === 'NoGo') {
        wlMap[cName] = (wlMap[cName] || 0) - Number(p['ca_estime_k€'] || 0);
      }
    });
    const winsLosses = Object.entries(wlMap).map(([name, CA]) => ({ name, CA })).sort((a,b) => b.CA - a.CA).slice(-8);

    const globalFinanceItem = {
      name: "BILAN GLOBAL",
      'CA Budgété (k€)': financeKpis.budgetCA,
      'Coûts (k€)': financeKpis.budgetCouts,
      'Marge %': financeKpis.margeGlobale
    };

    const oppsFinanceData = [
      globalFinanceItem,
      ...filteredData.fts.map((ft: any) => ({
        name: ft.oppChrono,
        'CA Budgété (k€)': ft.ca,
        'Coûts (k€)': ft.couts,
        'Marge %': ft.marge
      })).filter((d: any) => d.name !== '—')
    ].slice(0, 9);

    return { donutStatus, donutSources, barCommerciaux, topComptes, barGeographie, winsLosses, oppsFinanceData };
  }, [filteredData, financeKpis]);

  const strategicGlobalCard = useMemo(() => {
    const pipeValue = commerceKpis.totalPipe.toLocaleString();
    const listBloquants: string[] = [];
    const listActions: string[] = [];
    const listSynth: string[] = [];

    listSynth.push(`• Alignement du pipeline commercial CoDir consolidé à hauteur de ${pipeValue} k€ sur l'organisation.`);
    listSynth.push(`• La performance opérationnelle d'ingénierie d'affaires maintient un cap de rentabilité cible de ${financeKpis.margeGlobale.toFixed(1)} %.`);

    if (financeKpis.margeGlobale < 25) {
      listBloquants.push(`• Point Bloquant : Rentabilité globale sous le seuil d'alerte métier (${financeKpis.margeGlobale.toFixed(1)} %).`);
      listActions.push("• Action CoDir : Geler l'indexation de remises hors accord cadre grand compte.");
    } else {
      listBloquants.push("• Vigilance : Aucun blocage structurel détecté sur le volume de rentabilité actuel.");
      listActions.push("• Action : Consolider les fiches techniques d'avant-vente validées.");
    }

    if (commerceKpis.crmConversion < 50) {
      listBloquants.push(`• Goulot d'étranglement détecté sur la phase finale de négociation CRM (${commerceKpis.crmConversion.toFixed(1)} %).`);
      listActions.push("• Action : Déclencher des comités de relance systématiques sur les portefeuilles d'affaires stagnants.");
    } else {
      listSynth.push(`• Taux de transformation CRM optimal mesuré à ${commerceKpis.crmConversion.toFixed(1)} %.`);
    }

    if (listBloquants.length === 1) {
      listBloquants.push("• Risques logistiques et d'approvisionnement tiers considérés comme stables.");
    }
    if (listActions.length === 1) {
      listActions.push("• Planifier les revues d'analyse capacitaire pour le run du trimestre à venir.");
    }

    return { listBloquants, listActions, listSynth };
  }, [commerceKpis, financeKpis]);

  const cardsInsights = useMemo(() => {
    const alerts: string[] = [];
    const recommendations: string[] = [];
    const syntheses: string[] = [];

    const pipeValue = commerceKpis.totalPipe.toLocaleString();
    const convRate = commerceKpis.crmConversion.toFixed(1);

    if (commerceKpis.totalPipe > 200) {
      syntheses.push(`• La dynamique de prospection est robuste avec un pipeline qualifié de ${pipeValue} k€.`);
      syntheses.push(`• Les actions commerciales doivent se concentrer sur l'accélération du closing.`);
    } else {
      syntheses.push(`• Attention : Le volume du pipeline (${pipeValue} k€) est en deçà du seuil attendu.`);
      syntheses.push(`• Un effort intensif sur la chasse et la prospection est requis pour sécuriser M+3.`);
    }

    if (commerceKpis.crmConversion < 50) {
      alerts.push(`• Taux de signature critique (${convRate}%).`);
      alerts.push(`• Risque de perte élevé en phase de négociation finale.`);
      recommendations.push("• Engager des revues de soutenance croisées urgentes sur les dossiers chauds.");
      recommendations.push("• Auditer les motifs de refus des 3 dernières opportunités perdues.");
    } else {
      syntheses.push(`• La performance de closing (${convRate}%) valide la politique tarifaire et la qualité des offres.`);
      recommendations.push("• Maintenir les standards de qualification des offres en cours.");
    }

    if (financeKpis.margeGlobale < 25) {
      alerts.push(`• Alerte Rentabilité : La marge prévisionnelle moyenne globale est de ${financeKpis.margeGlobale.toFixed(1)}%.`);
      recommendations.push("• Geler immédiatement les remises commerciales non justifiées.");
    }

    if (alerts.length === 0) {
      alerts.push("• Aucun point de blocage critique détecté à ce jour.");
    }

    if (recommendations.length === 0 || recommendations.length === 1) {
      recommendations.push("• Sécuriser le Delivery des affaires récemment gagnées.");
    }

    return { alerts, recommendations, syntheses };
  }, [commerceKpis, financeKpis]);

  const formatTooltip = (value: any, name: any): [string, string] => {
    if (typeof value !== 'number') return [String(value), String(name)];
    if (String(name).includes('Marge') || String(name).includes('%')) return [`${value.toFixed(1)} %`, String(name)];
    if (String(name).includes('k€') || String(name).includes('Prospecté') || String(name).includes('Commandé') || String(name).includes('CA') || String(name).includes('Coûts')) return [`${value.toLocaleString('fr-FR')} k€`, String(name)];
    if (String(name).includes('Nb') || String(name).includes('Nombre') || String(name).includes('Volume')) return [String(value), String(name)];
    return [`${value.toLocaleString('fr-FR')} k€`, String(name)];
  };

  const exportDashboardPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const tableTopComptes = commerceCharts.topComptes.sort((a,b)=>b.CA-a.CA).map((c: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${c.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${c.CA.toLocaleString()} k€</td></tr>`).join('');
    const tableCommerciaux = commerceCharts.barCommerciaux.map((c: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${c.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${c.CA.toLocaleString()} k€</td></tr>`).join('');
    const tableOppsFinance = commerceCharts.oppsFinanceData.map((f: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1; ${f.name === 'BILAN GLOBAL' ? 'background:#e0f2fe; font-weight:bold;' : ''}">${f.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${f['CA Budgété (k€)'].toLocaleString()} k€</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${f['Coûts (k€)'].toLocaleString()} k€</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:${f['Marge %'] < 25 ? '#e11d48' : '#10b981'}">${f['Marge %'].toFixed(1)} %</td></tr>`).join('');
    const tableStatuts = commerceCharts.donutStatus.map((s: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${s.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${s.value}</td></tr>`).join('');
    const tableSources = commerceCharts.donutSources.map((s: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${s.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${s.value}</td></tr>`).join('');
    const tableGainsPertes = commerceCharts.winsLosses.map((w: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${w.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:${w.CA > 0 ? '#10b981' : '#e11d48'}">${w.CA > 0 ? '+' : ''}${w.CA.toLocaleString()} k€</td></tr>`).join('');
    const tableEvolution = globalCharts.conversionTimeline.map((t: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${t.date}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${t['CA Prospecté'].toLocaleString()} k€</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right;">${t['CA Commandé'].toLocaleString()} k€</td></tr>`).join('');
    const tableGeo = commerceCharts.barGeographie.map((g: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${g.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${g.CA.toLocaleString()} k€</td></tr>`).join('');

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ONEPILOT - Rapport Exécutif Analytique Global</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #334155; font-size: 11px; background: #ffffff; }
            .header { border-bottom: 4px solid #b91c1c; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
            .header span { font-size: 11px; color: #64748b; font-weight: 600; }
            .section-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-top: 25px; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-box { padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; background: #f8fafc; }
            .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 5px; font-family: monospace; }
            .alert-box { background: #fff1f2; border: 1px solid #fecdd3; padding: 10px; border-radius: 4px; color: #be123c; margin-bottom: 8px; font-size: 11px; }
            .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 4px; color: #15803d; margin-bottom: 8px; font-size: 11px; }
            .reco-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 4px; color: #1d4ed8; margin-bottom: 8px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; text-align: left; }
            th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; }
            .print-btn { position: fixed; bottom: 30px; right: 30px; background: #b91c1c; color: white; border: none; padding: 12px 24px; border-radius: 50px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 4px 6px rgba(185,28,28,0.3); }
            @media print { .print-btn { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>ONEPILOT</h1><span>Rapport Exécutif de Gouvernance</span></div>
            <div style="text-align:right;">Édité le : ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>

          <div class="section-title">1. Synthèse de Direction (Bilan Exécutif Global)</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:6px;">
              <h5 style="margin:0 0 8px 0; color:#475569; text-transform:uppercase; font-size:9px;">Bilan & Alignement</h5>
              ${strategicGlobalCard.listSynth.map(s => `<p style="margin:0 0 4px 0;">${s}</p>`).join('')}
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:6px;">
              <h5 style="margin:0 0 8px 0; color:#b91c1c; text-transform:uppercase; font-size:9px;">Points Décisifs & Bloquants</h5>
              ${strategicGlobalCard.listBloquants.map(b => `<p style="margin:0 0 4px 0; color:#be123c;">${b}</p>`).join('')}
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:6px;">
              <h5 style="margin:0 0 8px 0; color:#1d4ed8; text-transform:uppercase; font-size:9px;">Actions Managériales</h5>
              ${strategicGlobalCard.listActions.map(a => `<p style="margin:0 0 4px 0; color:#1d4ed8;">${a}</p>`).join('')}
            </div>
          </div>

          <div class="grid">
            <div class="kpi-box"><div class="kpi-label">CA Client Commandé</div><div class="kpi-val" style="color:#2563eb;">${commerceKpis.caClient.toLocaleString()} k€</div></div>
            <div class="kpi-box"><div class="kpi-label">Marge Prévisionnelle</div><div class="kpi-val" style="color:#10b981;">${financeKpis.margeGlobale.toFixed(1)} %</div></div>
            <div class="kpi-box"><div class="kpi-label">Taux Conversion CRM</div><div class="kpi-val" style="color:#8b5cf6;">${commerceKpis.crmConversion.toFixed(1)} %</div></div>
            <div class="kpi-box"><div class="kpi-label">Clients Actifs</div><div class="kpi-val" style="color:#64748b;">${clients.length}</div></div>
          </div>

          <div class="section-title">2. Restitution de l'ensemble des Graphiques (Commerce & CRM)</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Évolution Croisée Prospecté vs Commandé</h4>
              <table><tr><th>Période</th><th style="text-align:right;">CA Prospecté (k€)</th><th style="text-align:right;">CA Commandé (k€)</th></tr>${tableEvolution}</table>
            </div>
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Bilan Arbitrage Gains VS Pertes</h4>
              <table><tr><th>Client / Compte</th><th style="text-align:right;">Bilan Financier (k€)</th></tr>${tableGainsPertes}</table>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Top Comptes Facturés</h4>
              <table><tr><th>Client / Compte</th><th style="text-align:right;">CA Engagé (k€)</th></tr>${tableTopComptes}</table>
            </div>
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Pipeline par Commercial</h4>
              <table><tr><th>Commercial</th><th style="text-align:right;">CA Prospecté (k€)</th></tr>${tableCommerciaux}</table>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Répartition par Statut CRM</h4>
              <table><tr><th>Statut</th><th style="text-align:right;">Volume (Nb)</th></tr>${tableStatuts}</table>
            </div>
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Acquisition par Source</h4>
              <table><tr><th>Source</th><th style="text-align:right;">Volume (Nb)</th></tr>${tableSources}</table>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Répartition Géographique (k€)</h4>
              <table><tr><th>Ville / Région</th><th style="text-align:right;">CA (k€)</th></tr>${tableGeo}</table>
            </div>
          </div>

          <div class="section-title" style="page-break-before: always;">3. Rentabilité des Offres (Analyse Croisée CA, Coûts, Marge)</div>
          <table>
            <tr><th>Numéro de l'Offre / Agrégation</th><th style="text-align:right;">CA Budgété (k€)</th><th style="text-align:right;">Coûts Engagés (k€)</th><th style="text-align:right;">Marge Prévue (%)</th></tr>
            ${tableOppsFinance}
          </table>

          <button class="print-btn" onclick="window.print()">🖨️ Imprimer le Rapport</button>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER & BOUTON EXPORT PDF ROUGE */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">Tableau de bord Global</h1>
        <button onClick={exportDashboardPDF} className="flex items-center gap-1 bg-red-700 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-red-800 border border-red-800 transition-colors shadow-xs">
          <FileText size={11} /> Exporter Rapport PDF interactif
        </button>
      </div>

      {/* 7 TABS RESTAURÉES COMPLÈTEMENT */}
      <div className="flex gap-1 py-1 w-max border-b border-slate-200 dark:border-slate-800 mb-2">
        <button onClick={() => setActiveTab('global')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'global' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>1. Vue Globale</button>
        <button onClick={() => setActiveTab('commercial')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'commercial' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>2. Commerce</button>
        <button onClick={() => setActiveTab('finance')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'finance' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>3. Finance</button>
        <button onClick={() => setActiveTab('operational')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'operational' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>4. Opérationnelle</button>
        <button onClick={() => setActiveTab('resources')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'resources' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>5. Ressources</button>
        <button onClick={() => setActiveTab('quality')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'quality' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>6. Qualité</button>
        <button onClick={() => setActiveTab('actions')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'actions' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>7. Actions</button>
      </div>

      {/* FILTRES GÉNÉRAUX INTELLIGENTS MODIFIÉS ET SÉCURISÉS */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2 rounded space-y-3 shadow-xs">
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Recherche croisée active (Nom client, N° Opp, N° Cmd, Titre)..." className="w-full h-8 px-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none placeholder:text-slate-400" />
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.client} onChange={e => setFilters({...filters, client: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none">
            {uniqueClientsOptions.map(n => <option key={n} value={n}>{n === 'Tous' ? 'Entreprise' : n}</option>)}
          </select>
          <select value={filters.commercial} onChange={e => setFilters({...filters, commercial: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none">
            <option value="Tous">Commercial</option>
            {uniqueCommercialOptions.filter(c => c !== "Tous").map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.oppNumber} onChange={e => setFilters({...filters, oppNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none">
            {uniqueOppOptions.map(o => <option key={o} value={o}>{o === 'Tous' ? 'Toutes les Opportunités' : o}</option>)}
          </select>
          <select value={filters.orderNumber} onChange={e => setFilters({...filters, orderNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none">
            <option value="Tous">Commandes clients</option>
            {uniqueOrderOptions.filter(o => o !== "Tous" && o !== "").map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none">
            <option value="Tous">Tous les Statuts CRM</option>
            {Object.keys(STAGE_LABELS).map(st => <option key={st} value={st}>{STAGE_LABELS[st]}</option>)}
          </select>
        </div>
      </div>

      {/* ========================================= */}
      {/* VUE 1 : GLOBALE (CARD DE SYNTHÈSE + MACRO)*/}
      {/* ========================================= */}
      {activeTab === "global" && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5 text-[12px]"><BrainCircuit size={14} className="text-blue-500" /> Bilan Stratégique Exécutif CoDir</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Target size={12}/> Suivi Stratégique & Bilan</h4>
                <div className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  {strategicGlobalCard.listSynth.map((s: string, i: number) => <p key={i}>{s}</p>)}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={12}/> Éléments Bloquants & Décisifs</h4>
                <div className="space-y-1 text-rose-700 dark:text-rose-400 text-[11px] font-medium leading-relaxed">
                  {strategicGlobalCard.listBloquants.map((b: string, i: number) => <p key={i}>{b}</p>)}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Activity size={12}/> Actions & Recommandations</h4>
                <div className="space-y-1 text-blue-700 dark:text-blue-400 text-[11px] leading-relaxed">
                  {strategicGlobalCard.listActions.map((a: string, i: number) => <p key={i}>{a}</p>)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "CA Client Commandé", v: `${commerceKpis.caClient.toLocaleString()} k€`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Marge Nette Prévue", v: `${financeKpis.margeGlobale.toFixed(1)} %`, ic: <Award size={16} />, c: "text-emerald-600 bg-emerald-500/10" },
               { l: "Clients Actifs", v: clients.length.toString(), ic: <Users size={16} />, c: "text-slate-600 bg-slate-500/10" },
               { l: "Points de Vigilance", v: strategicGlobalCard.listBloquants.length.toString(), ic: <AlertCircle size={16} />, c: "text-rose-600 bg-rose-500/10" }
            ].map((w: any, i: number) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Transformation des opportunités (k€)</span>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={globalCharts.conversionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                    <Line type="monotone" dataKey="CA Prospecté" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="CA Commandé" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Macro-Volumes : Facturation Client vs Engagements Achats (k€)</span>
              </div>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={globalCharts.stackVolume} margin={{ left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: 'transparent'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                    <Bar dataKey="Facturation Client" stackId="a" fill="#3b82f6" barSize={20} />
                    <Bar dataKey="Engagement Frn" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* VUE 2 : COMMERCE (WIDGETS + CARDS + 6 GRAPHIQUES) */}
      {/* ========================================= */}
      {activeTab === "commercial" && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "Pipeline Brut (k€)", v: `${commerceKpis.totalPipe.toLocaleString()}`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Nb Opps Ouvertes", v: `${commerceKpis.activeOpps}`, ic: <Briefcase size={16} />, c: "text-indigo-600 bg-indigo-500/10" },
               { l: "Taux Signature", v: `${commerceKpis.crmConversion.toFixed(1)} %`, ic: <Target size={16} />, c: "text-emerald-600 bg-emerald-500/10" },
               { l: "Achats Fournisseurs (k€)", v: `${commerceKpis.caFrn.toLocaleString()}`, ic: <ShoppingCart size={16} />, c: "text-rose-600 bg-rose-500/10" }
            ].map((w: any, i: number) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-32">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><BrainCircuit size={12} className="text-blue-500" /> Bilan Opérationnel Commercial</span>
              </div>
              <div className="flex-1 overflow-y-auto mt-1.5 text-slate-600 dark:text-slate-400 text-[10px] font-normal leading-tight">
                {cardsInsights.syntheses.map((s: string, i: number) => <p key={i} className="mb-1">{s}</p>)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-32">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><Target size={12} className="text-purple-500" /> Recommandations Tactiques</span>
              </div>
              <div className="flex-1 overflow-y-auto mt-1.5 text-slate-600 dark:text-slate-400 text-[10px] font-normal leading-tight">
                {cardsInsights.recommendations.map((r: string, i: number) => <p key={i} className="mb-1">{r}</p>)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-32">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><AlertCircle size={12} className="text-rose-500" /> Alertes Flux & Retards</span>
              </div>
              <div className="flex-1 overflow-y-auto mt-1.5 text-slate-600 dark:text-slate-400 text-[10px] font-normal leading-tight">
                {cardsInsights.alerts.map((a: string, i: number) => <p key={i} className="mb-1 text-rose-600 dark:text-rose-400 font-medium">{a}</p>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Diverging Bar Chart (Gains/Pertes) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Bilan Arbitrage : Gains VS Pertes (k€)</span></div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commerceCharts.winsLosses} layout="vertical" margin={{ left: 5, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 8, fill: '#64748b'}} width={70} axisLine={true} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: 'transparent'}} />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Bar dataKey="CA" radius={4} barSize={12}>
                    {commerceCharts.winsLosses.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.CA > 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Top Comptes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Top 5 Comptes Facturés (k€)</span></div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commerceCharts.topComptes} layout="vertical" margin={{ left: 5, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" horizontal={true} vertical={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 8, fill: '#64748b'}} width={70} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="CA" fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 3. BarChart Vertical Commerciaux */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Volume Pipe par Commercial (k€)</span></div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commerceCharts.barCommerciaux} margin={{ left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="CA" fill="#8b5cf6" radius={[2, 2, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 4. Donut Statut (Couleurs Fixes) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Répartition par Statut CRM</span></div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={commerceCharts.donutStatus} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {commerceCharts.donutStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getStageColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 5. Donut Source (Couleurs Fixes garanties via getSourceColor) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Acquisition par Source</span></div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={commerceCharts.donutSources} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {commerceCharts.donutSources.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getSourceColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '8px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 6. Graphique Combiné CA/Coût/Marge */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Rentabilité des Offres (k€ VS Marge %)</span></div>
              <div className="flex-1 w-full min-h-0">
                {commerceCharts.oppsFinanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-[9px]">Aucune donnée financière associée</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={commerceCharts.oppsFinanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 8, fill: '#10b981'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: '#f8fafc'}} />
                      <Legend wrapperStyle={{fontSize: '9px'}} />
                      <Bar yAxisId="left" dataKey="CA Budgété (k€)" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={24} />
                      <Bar yAxisId="left" dataKey="Coûts (k€)" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={24} />
                      <Line yAxisId="right" type="monotone" dataKey="Marge %" stroke="#10b981" strokeWidth={3} dot={{r:6}} activeDot={{r:8}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* VUE 3 : FINANCE (MISE EN STAND BY)          */}
      {/* ========================================= */}
      {activeTab === "finance" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex items-center justify-center h-48 shadow-xs">
          <div className="text-center space-y-1">
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Module en attente de déploiement</p>
            <p className="text-[10px] text-slate-400 italic">La consolidation des données financières réelles sera activée lors de la phase "RUN & Projets".</p>
          </div>
        </div>
      )}

      {/* VUES RESTANTES EN ATTENTE NOMINALES */}
      {["operational", "resources", "quality", "actions"].includes(activeTab) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 flex items-center justify-center h-48 shadow-xs">
          <div className="text-center space-y-1">
            <p className="text-[12px] font-bold text-slate-600 uppercase tracking-wide">Module en attente de déploiement</p>
            <p className="text-[10px] text-slate-400 italic">Ces indicateurs seront synchronisés lors des prochaines étapes d'ingénierie.</p>
          </div>
        </div>
      )}

    </div>
  );
}