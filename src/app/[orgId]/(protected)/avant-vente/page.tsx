"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Edit, Trash2, Building2, TrendingUp, DollarSign, 
  List, Award, ShieldAlert, FileText, Download, Target, 
  CheckSquare, BrainCircuit, X, MapPin, Globe
} from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip } from "recharts";
import * as XLSX from 'xlsx';
import OffreForm from "./OffreForm";
import Link from "next/link";

const supabase = createClient();

const STATUT_LABELS: Record<string, string> = {
  'A faire': 'À faire', 'En cours': 'En cours', 'Diffusé': 'Diffusé', 'Attente retour client': 'Attente retour',
  'Validation client': 'Validé Client', 'Refus client': 'Refusé Client', 'NoGo': 'No-Go'
};

const STATUT_COLORS: Record<string, string> = {
  'A faire': 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  'En cours': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  'Diffusé': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  'Attente retour client': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  'Validation client': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  'Refus client': 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
  'NoGo': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
};

const GNG_COLORS: Record<string, string> = {
  'GO': 'bg-emerald-100 text-emerald-700 font-bold',
  'NoGo': 'bg-rose-100 text-rose-700 font-bold',
  'A faire': 'bg-blue-50 text-blue-600 font-bold'
};

const GUIDE_ITEMS = [
  { cat: "Cadrage & Lancement", txt: "Identification de l'équipe de réponse et Planifier un point technique avec le client" },
  { cat: "Cadrage & Lancement", txt: "Réunion de compréhension du besoin avec les parties prenantes interne" },
  { cat: "Cadrage & Lancement", txt: "Réunion de qualification du besoin avec le client : Questions / Réponses" },
  { cat: "Ingénierie Métier", txt: "Périmètre de la prestation bien définie techniquement" },
  { cat: "Ingénierie Métier", txt: "Prise en compte des contraintes légales" },
  { cat: "Ingénierie Métier", txt: "Vérification du numéro d’opporuntité" },
  { cat: "Ingénierie Métier", txt: "Organisation du projet définie" },
  { cat: "Ingénierie Métier", txt: "Définition des livrables" },
  { cat: "Ingénierie Métier", txt: "Matrice de compétences / Radar des compétences définie et disponible" },
  { cat: "Ingénierie Métier", txt: "Ressources matérielles disponibles" },
  { cat: "Ingénierie Métier", txt: "Calendrier et jalons définis" },
  { cat: "Ingénierie Métier", txt: "Charge de travail / Capacité / Ressources définies" },
  { cat: "Risques & Conformité", txt: "Analyse des risques effectuée et plan d'action définie" },
  { cat: "Risques & Conformité", txt: "Matrice de conformité aux exigences créée et complétée" },
  { cat: "Risques & Conformité", txt: "Fiche Technique créée et partagée" },
  { cat: "Finances & Clôture", txt: "Vérification de l'hypothèse de calcul incluant la sous-traitance" },
  { cat: "Finances & Clôture", txt: "Vérification des instructions financières pour la marge" },
  { cat: "Finances & Clôture", txt: "Go NoGo réalisée, check-list renseigné / signé / archivé" },
  { cat: "Finances & Clôture", txt: "Proposition Techniques et Financière créée, relue et validé en interne" },
  { cat: "Finances & Clôture", txt: "Archivage du 'CdC', de la 'FT', du compte-rendu du 'GnG/BnB' et de la 'PTF'" }
];

export default function OffresPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  const qc = useQueryClient();
  
  const [view, setView] = useState<'list' | 'choropleth'>('list');
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const [filters, setFilters] = useState({
    oppNumber: 'Tous', client: 'Tous', commercial: 'Tous', statut: 'Tous', statutGng: 'Tous', margeRange: 'Tous', maxDatePrev: ''
  });
  
  const [mapFilters, setMapFilters] = useState({
    continent: 'Tous', country: 'Tous', city: 'Tous'
  });

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await (supabase.from('organizations' as any).select('id').or(`slug.eq.${slugOrId},id.eq.${slugOrId}`).maybeSingle() as any);
      if (data) return data.id;
      const { data: list } = await (supabase.from('organizations' as any).select('id').limit(1) as any);
      return list?.[0]?.id || null;
    }
  });

  const { data: offres = [], refetch } = useQuery({
    queryKey: ['offres-flat-pipeline', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      const { data: dataOffres } = await (supabase.from('offres' as any).select('*').eq('organization_id', currentOrgId) as any);
      if (!dataOffres || dataOffres.length === 0) return [];

      const { data: dataProspects } = await (supabase.from('prospects' as any).select('*') as any);
      const { data: dataClients } = await (supabase.from('clients' as any).select('*') as any);
      const { data: dataGng } = await (supabase.from('offres_gonogo' as any).select('*') as any);
      const { data: dataFt } = await (supabase.from('offres_fiche_technique' as any).select('*') as any);

      return dataOffres.map((o: any) => {
        const p: any = dataProspects?.find((pro: any) => pro.id === o.prospect_id) || null;
        const cl: any = p ? dataClients?.find((c: any) => c.id === p.client_id) : null;
        return {
          ...o,
          prospects: p ? {
            ...p,
            clients: cl ? { id: cl.id, name: cl.name, city: cl.city || cl.ville || 'Paris', country: cl.country || cl.pays || 'France', contact: cl.contact || '—' } : null
          } : null,
          offres_gonogo: dataGng?.filter((g: any) => g.offre_id === o.id) || [],
          offres_fiche_technique: dataFt?.filter((f: any) => f.offre_id === o.id) || []
        };
      });
    },
    enabled: !!currentOrgId
  });

  const openCreate = () => { setIsModalOpen(true); };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (supabase.from('offres' as any).delete() as any).eq('id', id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['offres', currentOrgId] }); refetch(); }
  });

  // EXPORT AVEC FORMATS DATE ET COLONNE VALIDATION PTF AJOUTÉE DANS LE BON ORDRE
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(offres.map((o: any) => {
      const ft = o.offres_fiche_technique?.[0];
      const gng = o.offres_gonogo?.[0];
      const oppChrono = o.prospects?.opp_number ? `OPP-2026-${String(o.prospects.opp_number).padStart(4, '0')}` : '—';
      const hasPassedGng = !!gng?.date_passage_gonogo;
      return {
        'N° Opportunité': oppChrono,
        'Titre': o.prospects?.titre || '—',
        'Nom Entreprise': o.prospects?.clients?.name || '—',
        'Contact Client': o.prospects?.clients?.contact || '—',
        'Commercial': o.prospects?.commercial_id || '—',
        'N° Fiche Technique': ft?.num_ft || '—',
        'CA k€': ft?.total_prix_vente_ca || 0,
        'Coûts k€': ((ft?.total_couts_ressources || 0) + (ft?.total_couts_achats || 0)),
        'Marge Brute %': ft?.marge_brute_calculee_pourcent || 0,
        'N° CL Go/NoGo': gng?.num_cl_gonogo || '—',
        'Date Passage Go/NoGo': hasPassedGng ? new Date(gng.date_passage_gonogo).toLocaleDateString('fr-FR') : '—',
        'Statut Go/NoGo': hasPassedGng ? (gng.decision_calculee || 'A faire') : 'A faire',
        'Date Diffusion Prévisionnelle': o.date_diffusion_previsionnelle ? new Date(o.date_diffusion_previsionnelle).toLocaleDateString('fr-FR') : '—',
        'Date de Diffusion': o.date_diffusion ? new Date(o.date_diffusion).toLocaleDateString('fr-FR') : '—',
        'Statut Offre': STATUT_LABELS[o.statut_offre] || o.statut_offre,
        'Validation PTF': o.date_validation_client ? new Date(o.date_validation_client).toLocaleDateString('fr-FR') : '—',
        'Commentaires': o.commentaire || '—'
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suivi Offres");
    XLSX.writeFile(wb, "Suivi_Global_Offres.xlsx");
  };

  const clientNames = useMemo(() => ["Tous", ...new Set(offres.map((o: any) => o.prospects?.clients?.name).filter(Boolean))], [offres]);
  const commercials = useMemo(() => ["Tous", ...new Set(offres.map((o: any) => o.prospects?.commercial_id).filter(Boolean))], [offres]);
  const oppNumbers = useMemo(() => ["Tous", ...new Set(offres.map((o: any) => o.prospects?.opp_number?.toString()).filter(Boolean))], [offres]);

  const filteredOffres = useMemo(() => {
    return offres.filter((o: any) => {
      const ft = o.offres_fiche_technique?.[0];
      const gng = o.offres_gonogo?.[0];
      const hasPassedGng = !!gng?.date_passage_gonogo;
      const currentGngStatus = hasPassedGng ? (gng.decision_calculee || 'A faire') : 'A faire';

      if (searchText && !`${o.prospects?.titre} ${o.prospects?.clients?.name} ${o.prospects?.opp_number} ${o.commentaire}`.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filters.client !== 'Tous' && o.prospects?.clients?.name !== filters.client) return false;
      if (filters.commercial !== 'Tous' && o.prospects?.commercial_id !== filters.commercial) return false;
      if (filters.statut !== 'Tous' && o.statut_offre !== filters.statut) return false;
      if (filters.statutGng !== 'Tous' && currentGngStatus !== filters.statutGng) return false;
      if (filters.oppNumber !== 'Tous' && o.prospects?.opp_number?.toString() !== filters.oppNumber) return false;
      if (filters.maxDatePrev && o.date_diffusion_previsionnelle && new Date(o.date_diffusion_previsionnelle) > new Date(filters.maxDatePrev)) return false;

      if (filters.margeRange !== 'Tous') {
        const m = ft?.marge_brute_calculee_pourcent || 0;
        if (filters.margeRange === 'inf20' && m >= 20) return false;
        if (filters.margeRange === '20-30' && (m < 20 || m > 30)) return false;
        if (filters.margeRange === 'sup30' && m <= 30) return false;
      }
      return true;
    });
  }, [offres, searchText, filters]);

  const stats = useMemo(() => {
    let caTotal = 0, coutsTotal = 0, totalGo = 0, totalNoGo = 0;
    filteredOffres.forEach((o: any) => {
      const ft = o.offres_fiche_technique?.[0];
      const gng = o.offres_gonogo?.[0];
      caTotal += Number(ft?.total_prix_vente_ca || 0);
      coutsTotal += Number(ft?.total_couts_ressources || 0) + Number(ft?.total_couts_achats || 0);
      
      if (gng?.date_passage_gonogo) {
        if (gng.decision_calculee === 'GO') totalGo++;
        else totalNoGo++;
      }
    });
    return { caTotal, coutsTotal, margeGlobale: caTotal > 0 ? ((caTotal - coutsTotal) / caTotal) * 100 : 0, ratioGoNoGo: (totalGo + totalNoGo) > 0 ? (totalGo / (totalGo + totalNoGo)) * 100 : 0 };
  }, [filteredOffres]);

  const mapChartData = useMemo(() => {
    const clientsMap: Record<string, { ca: number; city: string; country: string; continent: string; x: number; y: number }> = {};
    
    // Positionnement des pays sur la carte vectorielle SVG simple
    const getCoordinates = (pays: string) => {
      switch(pays.toLowerCase()) {
        case 'france': return {x: 48, y: 35};
        case 'allemagne': return {x: 52, y: 32};
        case 'espagne': return {x: 45, y: 40};
        case 'royaume-uni': return {x: 46, y: 30};
        case 'suisse': return {x: 50, y: 35};
        case 'belgique': return {x: 49, y: 32};
        case 'etats-unis': return {x: 25, y: 40};
        case 'canada': return {x: 25, y: 30};
        case 'maroc': return {x: 46, y: 45};
        default: return {x: 50 + Math.random()*10, y: 30 + Math.random()*10};
      }
    };

    filteredOffres.forEach((o: any) => {
      const clientName = o.prospects?.clients?.name;
      if (!clientName) return;
      const ca = Number(o.offres_fiche_technique?.[0]?.total_prix_vente_ca || 0);
      const pays = o.prospects?.clients?.country || 'France';
      const continent = ['France', 'Allemagne', 'Suisse', 'Belgique', 'Espagne', 'Italie', 'Royaume-Uni'].includes(pays) ? 'Europe' : 'Autre';
      
      if (clientsMap[clientName]) {
        clientsMap[clientName].ca += ca;
      } else {
        const coords = getCoordinates(pays);
        clientsMap[clientName] = {
          ca, city: o.prospects?.clients?.city || 'Paris', country: pays, continent,
          x: coords.x, y: coords.y
        };
      }
    });

    return Object.entries(clientsMap)
      .map(([name, data]) => ({ name, city: data.city, country: data.country, continent: data.continent, x: data.x, y: data.y, CA: data.ca }))
      .filter((d: any) => {
        if (mapFilters.continent !== 'Tous' && d.continent !== mapFilters.continent) return false;
        if (mapFilters.country !== 'Tous' && d.country !== mapFilters.country) return false;
        if (mapFilters.city !== 'Tous' && d.city !== mapFilters.city) return false;
        return true;
      });
  }, [filteredOffres, mapFilters]);

  const mapCountries = useMemo(() => ["Tous", ...new Set(offres.map((o: any) => o.prospects?.clients?.country).filter(Boolean))], [offres]);
  const mapCities = useMemo(() => ["Tous", ...new Set(offres.map((o: any) => o.prospects?.clients?.city).filter(Boolean))], [offres]);

  const alertsList = useMemo(() => {
    const list: any[] = [];
    const aujourdhui = new Date(); aujourdhui.setHours(0,0,0,0);
    filteredOffres.forEach((o: any) => {
      const ft = o.offres_fiche_technique?.[0];
      const oppChrono = o.prospects?.opp_number ? `OPP-2026-${String(o.prospects.opp_number).padStart(4, '0')}` : 'MANUELLE';
      if (o.date_diffusion_previsionnelle && !['Validation client', 'Refus client', 'NoGo', 'Diffusé'].includes(o.statut_offre) && new Date(o.date_diffusion_previsionnelle) < aujourdhui) {
        list.push({ text: `🚨 Retard sur ${oppChrono} : Date prévisionnelle dépassée sans diffusion PTF.`, color: 'text-rose-700 dark:text-rose-400' });
      }
      if (ft && ft.marge_brute_calculee_pourcent > 0 && ft.marge_brute_calculee_pourcent < 20 && o.statut_offre !== 'NoGo') {
        list.push({ text: `🔥 Marge critique sur ${oppChrono} : Rentabilité basse estimée à ${ft.marge_brute_calculee_pourcent}%.`, color: 'text-amber-700 dark:text-amber-400' });
      }
    });
    return list.length === 0 ? [{ text: "💡 Flux de production d'offres nominal. Aucun retard détecté.", color: 'text-slate-600 dark:text-slate-400' }] : list;
  }, [filteredOffres]);

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Suivi des Offres</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-1 bg-red-700 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-red-800 transition-colors border border-red-800"><FileText size={11} /> Guide réalisation d'une offre</button>
          <button onClick={exportToExcel} className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-emerald-700"><Download size={11} /> Exporter</button>
          <button onClick={openCreate} className="h-6 px-2.5 bg-blue-600 text-white font-medium rounded text-[10px] hover:bg-blue-700 transition-colors">
            <Plus size={12} className="inline mr-1" />
            Nouvelle offre
          </button>
        </div>
      </div>

      {/* DRAWER DU GUIDE PRÉPARATION */}
      {isGuideOpen && (
        <div className="fixed inset-0 bg-slate-900/20 z-50 flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80 h-full p-4 flex flex-col space-y-3 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2"><span className="font-bold uppercase text-slate-800 dark:text-slate-200 text-[10px] flex items-center gap-1"><FileText size={12} className="text-red-700" /> Guide de Préparation</span><button onClick={() => setIsGuideOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button></div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {["Cadrage & Lancement", "Ingénierie Métier", "Risques & Conformité", "Finances & Clôture"].map((cat: string) => (
                <div key={cat} className="space-y-1.5">
                  <h4 className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 p-1 rounded">{cat}</h4>
                  {GUIDE_ITEMS.filter((i: any) => i.cat === cat).map((item: any, idx: number) => (
                    <label key={idx} className="flex items-start gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" className="mt-0.5 rounded border-slate-300 w-3 h-3 text-blue-600 shrink-0" /><span className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">{item.txt}</span></label>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={() => window.print()} className="w-full h-7 bg-red-700 hover:bg-red-800 text-white rounded text-[10px] font-medium">🖨️ Imprimer la version PDF</button>
          </div>
        </div>
      )}

      {/* KPI WIDGETS IDENTIQUES PROSPECTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[ { l: "Volume Offres", v: `${stats.caTotal.toFixed(1)} k€`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
           { l: "Coûts Engagés", v: `${stats.coutsTotal.toFixed(1)} k€`, ic: <TrendingUp size={16} />, c: "text-rose-600 bg-rose-500/10" },
           { l: "Marge Moyenne", v: `${stats.margeGlobale.toFixed(1)} %`, ic: <Award size={16} />, c: "text-emerald-600 bg-emerald-500/10" },
           { l: "Conversion GO", v: `${stats.ratioGoNoGo.toFixed(0)} %`, ic: <CheckSquare size={16} />, c: "text-purple-600 bg-purple-500/10" }
        ].map((w, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
            <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
            <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
          </div>
        ))}
      </div>

      {/* FILTRES ALIGNÉS */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2 rounded space-y-3">
        <div className="flex gap-2 items-center w-full">
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher par titre, entreprise, opportunité ou commentaire..." className="flex-1 h-8 px-2 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-700 dark:text-slate-300" />
          <div className="flex p-0.5 bg-slate-200/60 dark:bg-slate-800 border border-slate-200 rounded shrink-0">
            <button onClick={() => setView('list')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${view === 'list' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}><List size={11} /> Mode Tableau</button>
            <button onClick={() => setView('choropleth')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${view === 'choropleth' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}><MapPin size={11} /> Carte Choroplèthe</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.oppNumber} onChange={e => setFilters({...filters, oppNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">N° Opportunité</option>{(oppNumbers as string[]).map((n: string) => <option key={n} value={n}>{n}</option>)}</select>
          <select value={filters.client} onChange={e => setFilters({...filters, client: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Entreprise</option>{(clientNames as string[]).map((c: string) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.commercial} onChange={e => setFilters({...filters, commercial: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Commercial</option>{(commercials as string[]).map((c: string) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.statutGng} onChange={e => setFilters({...filters, statutGng: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Statut Go/NoGo</option><option value="A faire">À faire</option><option value="GO">GO</option><option value="NoGo">No-Go</option></select>
          <select value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Statut Offre</option>{Object.entries(STATUT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      </div>

      {/* CARDS PREDICTIVES PRESERVEES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-40">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><BrainCircuit size={12} className="text-blue-500" /> Analyse Prédictive & Synthèse d'Offres</span>
          </div>
          <div className="flex-1 overflow-y-auto mt-1.5 space-y-1.5 pr-0.5 text-slate-600 dark:text-slate-400 text-[10px] font-normal">
            {alertsList.map((alertItem: any, idx: number) => (
              <div key={idx} className="p-1 border border-dashed rounded bg-slate-50 dark:bg-slate-950 flex items-start gap-2">
                <p className={`leading-tight ${alertItem.color}`}>{alertItem.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-40">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><Target size={12} className="text-blue-500" /> Focus Performance Opérationnelle</span>
          </div>
          <div className="text-[10px] font-normal text-slate-600 dark:text-slate-400 flex-1 flex flex-col justify-start mt-2 gap-2">
            <div className="flex justify-between items-center bg-blue-500/5 p-1.5 rounded border border-blue-500/10">
              <span>📈 Rentabilité / Marge moyenne :</span>
              <span className="font-bold font-mono text-slate-800 dark:text-white">{stats.margeGlobale.toFixed(1)} %</span>
            </div>
            <div className="flex justify-between items-center bg-emerald-500/5 p-1.5 rounded border border-emerald-500/10">
              <span>💼 Chiffre d'affaires global engagé :</span>
              <span className="font-bold font-mono text-slate-800 dark:text-white">{stats.caTotal.toLocaleString()} k€</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLEAU AVEC TOUTES LES DONNÉES RESTAURÉES ET ORDONNÉES */}
      {view === 'list' ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-x-auto max-w-full relative">
          <table className="w-full text-left border-collapse min-w-[1950px]">
            <thead className="bg-slate-200/60 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] uppercase font-semibold">
              <tr>
                <th className="p-2 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[95px] text-slate-800 dark:text-white font-bold">N° Opp</th>
                <th className="p-2 sticky left-[95px] bg-slate-100 dark:bg-slate-800 z-20 min-w-[150px] text-slate-800 dark:text-white font-bold">Titre</th>
                <th className="p-2 whitespace-nowrap font-bold">Nom Entreprise</th>
                <th className="p-2 whitespace-nowrap font-bold">Contact Client</th>
                <th className="p-2 whitespace-nowrap font-bold">Commercial</th>
                <th className="p-2 min-w-[120px] whitespace-nowrap font-bold">N° FT</th>
                <th className="p-2 whitespace-nowrap font-bold">CA k€</th>
                <th className="p-2 whitespace-nowrap font-bold">Coûts k€</th>
                <th className="p-2 whitespace-nowrap font-bold">Marge brute %</th>
                
                {/* COLONNES REORDONNEES AVANT PTF */}
                <th className="p-2 min-w-[120px] whitespace-nowrap font-bold">N° CL Go/NoGo</th>
                <th className="p-2 max-w-[110px] leading-tight font-bold">Date passage<br/>gonogo</th>
                <th className="p-2 whitespace-nowrap font-bold">Statut Go/NoGo</th>
                
                <th className="p-2 max-w-[110px] leading-tight font-bold">Date diffusion<br/>prévisionnelle PTF</th>
                <th className="p-2 max-w-[110px] leading-tight font-bold">Date de<br/>diffusion PTF</th>
                <th className="p-2 whitespace-nowrap font-bold">Statut offre</th>
                <th className="p-2 max-w-[110px] leading-tight font-bold">Validation<br/>PTF</th>
                <th className="p-2 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200">Commentaire</th>
                <th className="p-2 whitespace-nowrap font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
              {filteredOffres.map((o: any) => {
                const ft = o.offres_fiche_technique?.[0] || {};
                const gng = o.offres_gonogo?.[0] || {};
                const oppChrono = o.prospects?.opp_number ? `OPP-2026-${String(o.prospects.opp_number).padStart(4, '0')}` : '—';
                const coutsTotal = ((ft.total_couts_ressources || 0) + (ft.total_couts_achats || 0));
                
                // GESTION INTELLIGENTE DU STATUT GO/NOGO SI AUCUNE DATE DE PASSAGE N'EST SAISIE
                const hasPassedGng = !!gng?.date_passage_gonogo;
                const gngStat = hasPassedGng ? (gng.decision_calculee || 'A faire') : 'A faire';

                return (
                  <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="p-2 font-mono font-bold text-blue-600 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 z-10 whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                      <Link href={`/${slugOrId}/avant-vente/${o.id}`} className="hover:underline">{oppChrono}</Link>
                    </td>
                    <td className="p-2 max-w-[150px] truncate sticky left-[95px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 z-10 font-normal text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                      <Link href={`/${slugOrId}/avant-vente/${o.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{o.prospects?.titre || '—'}</Link>
                    </td>
                    <td className="p-2 font-normal truncate max-w-[110px] text-slate-600 dark:text-slate-400">{o.prospects?.clients?.name || '—'}</td>
                    <td className="p-2 font-normal truncate max-w-[120px] text-slate-600 dark:text-slate-400">{o.prospects?.clients?.contact || '—'}</td>
                    <td className="p-2 font-normal truncate max-w-[110px] text-slate-600 dark:text-slate-400">{o.prospects?.commercial_id || '—'}</td>
                    <td className="p-2 font-mono text-slate-400 font-normal">{ft.num_ft || '—'}</td>
                    <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{(ft.total_prix_vente_ca || 0).toLocaleString()} k€</td>
                    <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{(coutsTotal || 0).toLocaleString()} k€</td>
                    <td className="p-2 font-mono font-bold text-slate-700 dark:text-slate-300">{ft.marge_brute_calculee_pourcent || 0} %</td>
                    
                    <td className="p-2 font-mono text-slate-400 font-normal">{gng.num_cl_gonogo || '—'}</td>
                    <td className="p-2 font-mono text-slate-400 font-normal">{hasPassedGng ? new Date(gng.date_passage_gonogo).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] ${GNG_COLORS[gngStat]}`}>
                        {gngStat}
                      </span>
                    </td>

                    <td className="p-2 font-mono text-slate-400 font-normal">{o.date_diffusion_previsionnelle ? new Date(o.date_diffusion_previsionnelle).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-2 font-mono text-slate-400 font-normal">{o.date_diffusion ? new Date(o.date_diffusion).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUT_COLORS[o.statut_offre]}`}>
                        {STATUT_LABELS[o.statut_offre] || o.statut_offre}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-slate-400 font-normal">{o.date_validation_client ? new Date(o.date_validation_client).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-2 font-normal truncate max-w-[140px] text-slate-800 dark:text-slate-200">{o.commentaire || '—'}</td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center items-center">
                        <Link href={`/${slugOrId}/avant-vente/${o.id}`} className="focus:outline-none">
                          <Edit size={11} style={{ color: '#3b82f6' }} />
                        </Link>
                        <button onClick={() => { if (confirm('Supprimer cette offre ?')) deleteMutation.mutate(o.id); }} className="text-red-500 hover:text-red-600 transition-colors focus:outline-none">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* VRAIE CARTE GÉOGRAPHIQUE MONDIALE AVEC FILTRES CASCADE */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-[460px] w-full relative flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2"><Globe size={15} className="text-blue-600" /> Cartographie Mondiale du CA par Compte</span>
            <div className="flex gap-2">
               <select value={mapFilters.continent} onChange={e => setMapFilters({...mapFilters, continent: e.target.value, country: 'Tous', city: 'Tous'})} className="h-6 px-1.5 text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"><option value="Tous">Continent</option><option value="Europe">Europe</option><option value="Autre">Autre</option></select>
               <select value={mapFilters.country} onChange={e => setMapFilters({...mapFilters, country: e.target.value, city: 'Tous'})} className="h-6 px-1.5 text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"><option value="Tous">Pays</option>{(mapCountries as string[]).map((c: string) => c !== "Tous" && <option key={c} value={c}>{c}</option>)}</select>
               <select value={mapFilters.city} onChange={e => setMapFilters({...mapFilters, city: e.target.value})} className="h-6 px-1.5 text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"><option value="Tous">Ville</option>{(mapCities as string[]).map((v: string) => v !== "Tous" && <option key={v} value={v}>{v}</option>)}</select>
            </div>
          </div>
          
          <div className="flex-1 w-full pt-2 relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 rounded-lg">
            <div className="absolute inset-0 transition-transform duration-150" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 25, right: 35, bottom: 25, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                  <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
                  <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
                  <ZAxis type="number" dataKey="CA" range={[100, 1000]} name="Volume" />
                  <Tooltip cursor={false} content={(props: any) => {
                    if (props.active && props.payload?.length) {
                      const data = props.payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded shadow text-[10px]">
                          <p className="font-bold text-blue-600">🏢 Client : {data.name}</p>
                          <p className="text-slate-500 font-medium mt-0.5">📍 Localisation : {data.city} ({data.country})</p>
                          <p className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">CA Total Réalisé : {data.CA.toLocaleString()} k€</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Scatter name="CA" data={mapChartData} fill="#2563eb" fillOpacity={0.8} stroke="#1d4ed8" strokeWidth={1} shape="circle" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && <OffreForm currentOrgId={currentOrgId || null} onClose={() => setIsModalOpen(false)} onRefresh={refetch} />}
    </div>
  );
}