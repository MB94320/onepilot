"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Edit, Trash2, Building2, TrendingUp, Users, DollarSign, 
  Kanban, List, Award, ShieldAlert, MessageSquare, Download, Zap, Target, BarChart3, FileText
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import * as XLSX from 'xlsx';
import ProspectForm from "./ProspectForm";

const supabase = createClient();
const STAGES = ['découverte', 'contact', 'qualification', 'NoGo', 'proposition', 'négociation', 'gagné', 'perdu'] as const;

const STAGE_LABELS: Record<string, string> = { 
  'découverte': 'Découverte', 'contact': 'Contact', 'qualification': 'Qualification', 
  'NoGo': 'No-Go', 'proposition': 'Proposition', 'négociation': 'Négociation', 'gagné': 'Gagné', 'perdu': 'Perdu' 
};

const STAGE_COLORS: Record<string, string> = { 
  'découverte': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', 
  'contact': 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400', 
  'qualification': 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400', 
  'NoGo': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  'proposition': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400', 
  'négociation': 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400', 
  'gagné': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400', 
  'perdu': 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
};

export default function ProspectsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  const qc = useQueryClient();
  
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [timeFocus, setTimeFocus] = useState<'weekly' | 'monthly' | 'quarterly' | 'annually'>('weekly');

  const [filters, setFilters] = useState({
    oppNumber: 'Tous', client: 'Tous', commercial: 'Tous', stage: 'Tous', source: 'Tous', probability: 'Tous', maxClosingDate: '', amountRange: 'Tous'
  });

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', slugOrId],
    queryFn: async () => {
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await supabase.from('organizations').select('id').eq('slug', slugOrId).single();
      return data?.id || null;
    }
  });

  const { data: prospects = [], refetch } = useQuery({
    queryKey: ['prospects', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      const { data: rawProspects } = await (supabase.from('prospects' as any).select('*, clients(name)').eq('organization_id', currentOrgId).order('opp_number', { ascending: true }) as any);
      if (!rawProspects) return [];

      const { data: rawOffres } = await (supabase.from('offres' as any).select('prospect_id, statut_offre') as any);

      return rawProspects.map((p: any) => {
        const matchingOffre = rawOffres?.find((o: any) => o.prospect_id === p.id);
        let finalStatus = p.statut;

        if (matchingOffre) {
          if (matchingOffre.statut_offre === 'Validation client') finalStatus = 'gagné';
          else if (matchingOffre.statut_offre === 'Refus client') finalStatus = 'perdu';
          else if (matchingOffre.statut_offre === 'NoGo') finalStatus = 'NoGo';
        }

        return { ...p, statut: finalStatus };
      });
    },
    enabled: !!currentOrgId
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ['clients', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data } = await supabase.from('clients').select('id, name').eq('organization_id', currentOrgId);
      return data || [];
    },
    enabled: !!currentOrgId
  });

  // FILTRAGE INTELLIGENT POUR UNICITÉ DES ENTREPRISES SANS DOUBLONS DANS LES RECHERCHES
  const uniqueClientsForDropdown = useMemo(() => {
    const uniqueMap = new Map();
    clientsList.forEach((c: any) => {
      if (c.name && !uniqueMap.has(c.name)) {
        uniqueMap.set(c.name, c);
      }
    });
    return Array.from(uniqueMap.values());
  }, [clientsList]);

  const openCreate = () => { setSelectedProspect(null); setIsModalOpen(true); };
  const openEdit = (p: any) => { setSelectedProspect(p); setIsModalOpen(true); };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (supabase.from('prospects' as any).delete() as any).eq('id', id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects', currentOrgId] }); refetch(); }
  });

  const handleGenerateProject = async (prospect: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await (supabase.from('prospects' as any).update({ is_projet_genere: true }).eq('id', prospect.id) as any);
    if (!error) { qc.invalidateQueries({ queryKey: ['prospects', currentOrgId] }); refetch(); }
  };

  // EXPORT EXCEL METIERS COMPLETE AVEC L'INTEGRALITÉ DES CHAMPS EXIGÉS (MODIFICATION : FORMAT DATE FR)
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(prospects.map((p: any) => ({
      'N° Opp': p.opp_number ? `OPP-2026-${String(p.opp_number).padStart(4, '0')}` : '—',
      'Opportunité / Sujet': p.titre, 
      'Nom Entreprise': p.clients?.name || '—', 
      'Commercial': p.commercial_id || '—',
      'Étape CRM': STAGE_LABELS[p.statut] || p.statut, 
      'Sources': p.source || '—',
      'Estimation (k€)': p["ca_estime_k€"] || 0, 
      'Proba': p.probabilite_gain ? `${p.probabilite_gain}%` : '0%', 
      'Date Cible': p.date_cible ? new Date(p.date_cible).toLocaleDateString('fr-FR') : '—',
      'Comm & Notes': p.commentaire || '—'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prospects");
    XLSX.writeFile(wb, "Suivi_Prospects.xlsx");
  };

  const clientNames = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.client_id).filter(Boolean))], [prospects]);
  const commercials = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.commercial_id).filter(Boolean))], [prospects]);
  const sourcesList = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.source).filter(Boolean))], [prospects]);
  const probabilities = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.probabilite_gain).filter(Boolean))], [prospects]);
  const oppNumbers = useMemo(() => ["Tous", ...new Set(prospects.map((p: any) => p.opp_number?.toString()).filter(Boolean))], [prospects]);

  const filteredProspects = useMemo(() => {
    return prospects.filter((p: any) => {
      if (searchText && !`${p.titre} ${p.commercial_id} ${p.clients?.name}`.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filters.client !== 'Tous' && p.client_id !== filters.client) return false;
      if (filters.commercial !== 'Tous' && p.commercial_id !== filters.commercial) return false;
      if (filters.stage !== 'Tous' && p.statut !== filters.stage) return false;
      if (filters.source !== 'Tous' && p.source !== filters.source) return false;
      if (filters.probability !== 'Tous' && p.probabilite_gain?.toString() !== filters.probability) return false;
      if (filters.oppNumber !== 'Tous' && p.opp_number?.toString() !== filters.oppNumber) return false;
      if (filters.maxClosingDate && p.date_cible && new Date(p.date_cible) > new Date(filters.maxClosingDate)) return false;

      if (filters.amountRange !== 'Tous') {
        const amt = p["ca_estime_k€"] || 0;
        if (filters.amountRange === '0-10k' && amt > 10) return false;
        if (filters.amountRange === '10k-50k' && (amt <= 10 || amt > 50)) return false;
        if (filters.amountRange === '50k+' && amt <= 50) return false;
      }
      return true;
    });
  }, [prospects, searchText, filters]);

  const stats = useMemo(() => {
    let pipelineTotal = 0, pipelineWeighted = 0, countWon = 0, countLost = 0, rexSum = 0, rexCount = 0;
    filteredProspects.forEach((p: any) => {
      const amt = p["ca_estime_k€"] || 0;
      pipelineTotal += amt;
      pipelineWeighted += (amt * (p.probabilite_gain || 0)) / 100;
      if (p.statut === 'gagné') countWon++;
      if (p.statut === 'perdu' || p.statut === 'NoGo') countLost++;
      
      if (['gagné', 'perdu', 'NoGo'].includes(p.statut)) {
        const detailRex = (p.rex_tech_score || 0) + (p.rex_price_score || 0) + (p.rex_human_score || 0) + (p.rex_timing_score || 0);
        if (detailRex > 0) { rexSum += (detailRex / 4); rexCount++; }
      }
    });
    return { total: pipelineTotal, weighted: pipelineWeighted, won: countWon, lost: countLost, rexGlobal: rexCount > 0 ? (rexSum / rexCount).toFixed(1) : "0.0" };
  }, [filteredProspects]);

  const chartData = useMemo(() => {
    const wonDeals = filteredProspects.filter((p: any) => p.statut === 'gagné');
    const commMap: Record<string, number> = {};
    wonDeals.forEach((p: any) => { commMap[p.commercial_id || 'Non assigné'] = (commMap[p.commercial_id || 'Non assigné'] || 0) + (p["ca_estime_k€"] || 0); });
    return Object.entries(commMap).map(([name, val]) => ({ name, CA: val }));
  }, [filteredProspects]);

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Suivi Prospects</h1>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1 bg-red-700 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-red-800 border border-red-800"><FileText size={11} /> Exporter PDF</button>
          <button onClick={exportToExcel} className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-emerald-700"><Download size={11} /> Exporter</button>
          <button onClick={openCreate} className="h-6 px-2.5 bg-blue-600 text-white font-medium rounded text-[10px] hover:bg-blue-700">+ Nouveau prospect</button>
        </div>
      </div>

      {/* KPI WIDGETS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[ { l: "Pipe Total", v: `${stats.total.toFixed(1)} k€`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
           { l: "Pipe Pondéré", v: `${stats.weighted.toFixed(1)} k€`, ic: <TrendingUp size={16} />, c: "text-indigo-600 bg-indigo-500/10" },
           { l: "Gagnés", v: `${stats.won}`, ic: <Award size={16} />, c: "text-emerald-600 bg-emerald-500/10" },
           { l: "Perdus / NoGo", v: `${stats.lost}`, ic: <ShieldAlert size={16} />, c: "text-rose-600 bg-rose-500/10" },
           { l: "Indicateur REX", v: `${stats.rexGlobal}`, ic: <MessageSquare size={16} />, c: "text-purple-600 bg-purple-500/10" }
        ].map((w, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
            <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
            <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold mt-0.5 leading-none font-mono">{w.v}</p></div>
          </div>
        ))}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2 rounded space-y-3">
        <div className="flex gap-2 items-center w-full">
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Rechercher..." className="flex-1 h-8 px-2 text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          <div className="flex p-0.5 bg-slate-200/60 dark:bg-slate-800 border border-slate-200 rounded shrink-0">
            <button onClick={() => setView('kanban')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${view === 'kanban' ? 'bg-white dark:bg-slate-900 text-blue-600' : 'text-slate-500'}`}><Kanban size={11} /> Mode KANBAN</button>
            <button onClick={() => setView('list')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${view === 'list' ? 'bg-white dark:bg-slate-900 text-blue-600' : 'text-slate-500'}`}><List size={11} /> Mode Tableau</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.oppNumber} onChange={e => setFilters({...filters, oppNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">N° Opportunité</option>{(oppNumbers as string[]).map((n: string) => n !== "Tous" && <option key={n} value={n}>OPP-2026-{n.padStart(4, '0')}</option>)}</select>
          <select value={filters.client} onChange={e => setFilters({...filters, client: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Entreprise</option>{(clientNames as string[]).map((id: string) => id !== "Tous" && <option key={id} value={id}>{(uniqueClientsForDropdown as any[]).find((c: any) => c.id === id)?.name || id}</option>)}</select>
          <select value={filters.commercial} onChange={e => setFilters({...filters, commercial: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Commercial</option>{(commercials as string[]).map((c: string) => c !== "Tous" && <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.stage} onChange={e => setFilters({...filters, stage: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Étape</option>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select>
          <select value={filters.source} onChange={e => setFilters({...filters, source: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Source</option>{(sourcesList as string[]).map((s: string) => s !== "Tous" && <option key={s} value={s}>{s}</option>)}</select>
          <select value={filters.probability} onChange={e => setFilters({...filters, probability: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Probabilité</option>{(probabilities as string[]).map((p: string) => p !== "Tous" && <option key={p} value={p}>{p}%</option>)}</select>
          <select value={filters.amountRange} onChange={e => setFilters({...filters, amountRange: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"><option value="Tous">Estimation</option><option value="0-10k">0 - 10k€</option><option value="10k-50k">10k - 50k€</option><option value="50k+">50k€ +</option></select>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Closing avant le :</span>
            <input type="date" value={filters.maxClosingDate} onChange={e => setFilters({...filters, maxClosingDate: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600" />
          </div>
        </div>
      </div>

      {/* BLOCS PERFORMANCE */}
      <div className="flex flex-col md:flex-row gap-2 w-full">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs w-full md:w-1/2 h-28">
          <div className="flex justify-between items-center border-b pb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><Target size={12} className="text-rose-500"/> Objectifs & Focus Tactiques (Commerce)</span>
            <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-950 p-0.5 rounded text-[8px] font-mono font-bold">
              {[ ['weekly','W'], ['monthly','M'], ['quarterly','Q'], ['annually','Y'] ].map(([k,l]) => (
                <button key={k} onClick={() => setTimeFocus(k as any)} className={`px-1 rounded-sm ${timeFocus === k ? 'bg-white text-blue-600 shadow-3xs' : 'text-slate-400'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 flex-1 flex flex-col justify-center gap-1 pt-1">
            {(() => {
              const aujourdhui = new Date(); aujourdhui.setHours(0,0,0,0);
              const enRetard = prospects.filter((p: any) => p.date_cible && !['gagné', 'perdu', 'NoGo'].includes(p.statut) && new Date(p.date_cible) < aujourdhui).length;
              const dealsChauds = prospects.filter((p: any) => !['gagné', 'perdu', 'NoGo'].includes(p.statut) && Number(p.probabilite_gain || 0) >= 50).length;
              const totalEnCours = prospects.filter((p: any) => !['gagné', 'perdu', 'NoGo'].includes(p.statut)).length;

              if (timeFocus === 'weekly') {
                return (
                  <>
                    <div className="flex justify-between items-center bg-rose-500/5 p-1 rounded border border-rose-500/10 text-rose-700 dark:text-rose-400">
                      <span>⚠️ Prospects en retard de closing :</span><span className="font-bold font-mono text-[11px]">{enRetard}</span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-500/5 p-1 rounded border border-blue-500/10 text-blue-700 dark:text-blue-400">
                      <span>🔥 Opportunités chaudes à relancer (Proba ≥ 50%) :</span><span className="font-bold font-mono text-[11px]">{dealsChauds}</span>
                    </div>
                  </>
                );
              }
              if (timeFocus === 'monthly') return <div>📊 <span className="font-semibold text-slate-700 dark:text-slate-200">Pipe Actif :</span> Vous gérez {totalEnCours} dossiers ce mois-ci.</div>;
              if (timeFocus === 'quarterly') return <div>📈 <span className="font-semibold text-slate-700 dark:text-slate-200">Cadrage Trimestre :</span> Sécuriser les {dealsChauds} opportunités fortes.</div>;
              return <div>🎯 Suivi unifié des performances et de l'Indicateur REX moyen.</div>;
            })()}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs w-full md:w-1/2 h-28">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-1 mb-1"><span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><BarChart3 size={12} className="text-blue-500" /> Signatures par commercial (Cumul k€)</span></div>
          <div className="h-14 w-full">{chartData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 italic text-[9px]">Aucune signature enregistrée.</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{fontSize: 8, fill: '#64748b'}} width={65} tickLine={false} /><Tooltip contentStyle={{fontSize: 8}} /><Bar dataKey="CA" fill="#3b82f6" radius={[0, 2, 2, 0]} barSize={8} /></BarChart></ResponsiveContainer>}</div>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="flex gap-2 min-w-[1100px]">
            {STAGES.map(stage => {
              const list = prospects.filter((p: any) => p.statut === stage);
              return (
                <div key={stage} className="w-1/8 min-w-[140px] bg-slate-50 dark:bg-slate-900/20 border border-slate-200 rounded-md p-1.5 flex flex-col">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${STAGE_COLORS[stage]}`}>{STAGE_LABELS[stage]}</span><span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1 rounded">{list.length}</span></div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[320px] pr-0.5">
                    {list.length === 0 ? <div className="text-center text-slate-300 py-6 border border-dashed rounded italic text-[9px]">Aucun élément</div> : list.map((p: any) => (
                      <div key={p.id} onClick={() => openEdit(p)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-2 hover:shadow-xs transition-all cursor-pointer group space-y-1">
                        <div className="flex items-start justify-between gap-1"><span className="font-mono text-[9px] text-blue-600 dark:text-blue-400 font-bold block bg-slate-100 px-1 rounded">{p.opp_number ? `OPP-2026-${String(p.opp_number).padStart(4, '0')}` : 'OPP-GEN'}</span>{p.statut === 'gagné' && <button onClick={(e) => !p.is_projet_genere && handleGenerateProject(p, e)} disabled={p.is_projet_genere} className={`px-1 rounded text-[8px] font-mono uppercase font-bold flex items-center gap-0.5 ${p.is_projet_genere ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Zap size={8} /> {p.is_projet_genere ? 'Fait' : 'Générer'}</button>}</div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-blue-600 mt-1">{p.titre}</div>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400"><Building2 size={10} /><span className="truncate">{p.clients?.name || '—'}</span></div>
                        <div className="flex justify-between items-center pt-1 border-t mt-1"><span className="font-bold text-slate-700 font-mono">{(p["ca_estime_k€"] || 0).toLocaleString()} k€</span><span className="text-[9px] text-slate-400 font-mono font-semibold">{p.probabilite_gain || 0}%</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABLE VIEW (MODIFICATION : FORMAT DATE FR) */}
      {view === 'list' && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto bg-white dark:bg-slate-900/40 max-w-full">
          <table className="text-left border-collapse min-w-[1550px] w-full">
            <thead className="bg-slate-200/60 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[9px] uppercase font-semibold">
              <tr>
                {['N° Opp', 'Opportunité / Sujet', 'Nom Entreprise', 'Commercial', 'Étape CRM', 'Sources', 'Estimation', 'Proba', 'Date Cible', 'Comm & Notes', 'Actions'].map(h => (
                  <th key={h} className="p-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
              {filteredProspects.length === 0 ? <tr><td colSpan={11} className="p-6 text-center text-slate-400 italic">Aucun prospect.</td></tr> : filteredProspects.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[110px]">
                    <span onClick={() => openEdit(p)} className="cursor-pointer hover:underline">
                      {p.opp_number ? `OPP-2026-${String(p.opp_number).padStart(4, '0')}` : '—'}
                    </span>
                  </td>
                  <td className="p-2 max-w-[160px] truncate font-normal">{p.titre}</td>
                  <td className="p-2 font-bold truncate text-slate-800 dark:text-white">
                    <div className="flex items-center gap-1"><Building2 size={10} className="text-slate-400 shrink-0" />{p.clients?.name || '—'}</div>
                  </td>
                  <td className="p-2 truncate font-normal">{p.commercial_id || '—'}</td>
                  <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${STAGE_COLORS[p.statut]}`}>{STAGE_LABELS[p.statut]}</span></td>
                  <td className="p-2 truncate font-normal">{p.source || '—'}</td>
                  <td className="p-2 font-mono font-bold text-slate-800 dark:text-white">{(p["ca_estime_k€"] || 0).toLocaleString()} k€</td>
                  <td className="p-2 font-mono font-bold text-slate-800 dark:text-white">{p.probabilite_gain || 0}%</td>
                  {/* MODIFICATION : DATE FORMATÉE EN JJ/MM/AAAA */}
                  <td className="p-2 font-mono text-slate-400 font-normal">{p.date_cible ? new Date(p.date_cible).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="p-2 max-w-[180px] truncate text-slate-400 font-normal">{p.commentaire || '—'}</td>
                  <td className="p-2">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-600 transition-colors"><Edit size={11} /></button>
                      <button onClick={() => { if (confirm('Supprimer ce prospect ?')) deleteMutation.mutate(p.id); }} className="text-red-500 hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <ProspectForm 
          selectedProspect={selectedProspect}
          clientsList={uniqueClientsForDropdown as any[]}
          currentOrgId={currentOrgId || null}
          prospectsCount={prospects}
          onClose={() => setIsModalOpen(false)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}