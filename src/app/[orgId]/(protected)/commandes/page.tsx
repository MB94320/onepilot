"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Edit, Trash2, Building2, TrendingUp, DollarSign, 
  Download, CalendarClock, ShoppingCart, Briefcase, BrainCircuit, Target
} from "lucide-react";
import * as XLSX from 'xlsx';
import CommandeForm from "./CommandeForm";
import Link from "next/link";

const supabase = createClient();

const STATUT_LABELS: Record<string, string> = {
  'Brouillon': 'Brouillon', 'Envoyée': 'Envoyée', 'Validée': 'Validée', 
  'En cours': 'En cours de livraison', 'Livrée': 'Livrée', 'Facturée': 'Facturée', 'Annulée': 'Annulée'
};

const STATUT_COLORS: Record<string, string> = {
  'Brouillon': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Envoyée': 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  'Validée': 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  'En cours': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  'Livrée': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  'Facturée': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  'Annulée': 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
};

export default function CommandesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  const px = use(params);
  const qc = useQueryClient();
  
  const [viewMode, setViewMode] = useState<'CLIENT' | 'FOURNISSEUR'>('CLIENT');
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    oppNumber: 'Tous', entityName: 'Tous', orderNumber: 'Tous', statut: 'Tous'
  });

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await (supabase.from('organizations' as any).select('id').eq('slug', slugOrId).single() as any);
      return data?.id || null;
    }
  });

  const { data: commandes = [], refetch } = useQuery({
    queryKey: ['commandes-suivi', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      const { data: dataCmd } = await (supabase.from('commandes' as any).select('*').eq('organization_id', currentOrgId) as any);
      const { data: dataClients } = await (supabase.from('clients' as any).select('id, name').eq('organization_id', currentOrgId) as any);
      const { data: dataFournisseurs } = await (supabase.from('fournisseurs' as any).select('id, name').eq('organization_id', currentOrgId) as any);
      const { data: dataProspects } = await (supabase.from('prospects' as any).select('id, titre, opp_number').eq('organization_id', currentOrgId) as any);
      const { data: dataOffres } = await (supabase.from('offres' as any).select('prospect_id, date_validation_client').eq('organization_id', currentOrgId) as any);

      return (dataCmd || []).map((cmd: any) => {
        const prospectLié = dataProspects?.find((p: any) => p.id === cmd.prospect_id) || null;
        const offreLiée = dataOffres?.find((o: any) => o.prospect_id === cmd.prospect_id) || null;
        const clientLié = dataClients?.find((c: any) => c.id === cmd.client_id) || null;
        const fournisseurLié = dataFournisseurs?.find((f: any) => f.id === cmd.fournisseur_id) || null;

        const rawDate = cmd.date_validation_ptf || offreLiée?.date_validation_client || null;

        return {
          ...cmd,
          prospectData: prospectLié,
          datePTF: rawDate ? new Date(rawDate).toLocaleDateString('fr-FR') : null,
          entityName: cmd.type_commande === 'CLIENT' ? (clientLié?.name || '—') : (fournisseurLié?.name || '—')
        };
      });
    },
    enabled: !!currentOrgId
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (supabase.from('commandes' as any).delete().eq('id', id) as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commandes-suivi', currentOrgId] }); refetch(); }
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string, text: string }) => {
      return supabase.from('commandes' as any).update({ commentaire: text }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commandes-suivi', currentOrgId] }); refetch(); }
  });

  const filteredCommandes = useMemo(() => {
    return commandes.filter((c: any) => {
      if (c.type_commande !== viewMode) return false;

      const oppChrono = c.prospectData?.opp_number ? `OPP-2026-${String(c.prospectData.opp_number).padStart(4, '0')}` : '—';

      if (searchText && !`${c.numero_commande} ${c.entityName} ${oppChrono} ${c.titre_commande} ${c.commentaire}`.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filters.entityName !== 'Tous' && c.entityName !== filters.entityName) return false;
      if (filters.statut !== 'Tous' && c.statut !== filters.statut) return false;
      if (filters.oppNumber !== 'Tous' && oppChrono !== filters.oppNumber) return false;
      if (filters.orderNumber !== 'Tous' && c.numero_commande !== filters.orderNumber) return false;

      return true;
    });
  }, [commandes, searchText, filters, viewMode]);

  const exportToExcel = () => {
    const dataToExport = filteredCommandes.map((c: any) => {
      const oppChrono = c.prospectData?.opp_number ? `OPP-2026-${String(c.prospectData.opp_number).padStart(4, '0')}` : '—';
      
      if (viewMode === 'CLIENT') {
        return {
          'N° Opportunité': oppChrono,
          'Titre Opportunité': c.prospectData?.titre || '—',
          'Nom Entreprise': c.entityName || '—',
          'Date Validation PTF': c.datePTF || '—',
          'N° Commande': c.numero_commande || '—',
          'Titre Commande': c.titre_commande || '—',
          'Date Réception': c.date_commande || '—',
          'Montant Global (k€)': c.montant_total || 0,
          'Statut': STATUT_LABELS[c.statut] || c.statut,
          'Commentaire': c.commentaire || ''
        };
      } else {
        return {
          'N° Opportunité': oppChrono,
          'Titre Opportunité': c.prospectData?.titre || '—',
          'Fournisseur': c.entityName || '—',
          'Date Validation PTF': c.datePTF || '—',
          'N° Commande Fournisseur': c.numero_commande || '—',
          'Titre Commande': c.titre_commande || '—',
          'Date d\'Émission': c.date_commande || '—',
          'Montant Achat (k€)': c.montant_total || 0,
          'Statut': STATUT_LABELS[c.statut] || c.statut,
          'Commentaire': c.commentaire || ''
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Commandes ${viewMode}`);
    XLSX.writeFile(wb, `Export_Commandes_${viewMode}.xlsx`);
  };

  const filterEntities = useMemo(() => ["Tous", ...new Set(commandes.filter((c: any) => c.type_commande === viewMode).map((c: any) => c.entityName).filter(Boolean))] as any[], [commandes, viewMode]);
  const filterOppNumbers = useMemo(() => ["Tous", ...new Set(commandes.filter((c: any) => c.type_commande === viewMode).map((c: any) => c.prospectData?.opp_number ? `OPP-2026-${String(c.prospectData.opp_number).padStart(4, '0')}` : '').filter(Boolean))] as any[], [commandes, viewMode]);
  const filterOrderNumbers = useMemo(() => ["Tous", ...new Set(commandes.filter((c: any) => c.type_commande === viewMode).map((c: any) => c.numero_commande).filter(Boolean))] as any[], [commandes, viewMode]);

  const stats = useMemo(() => {
    const scopeData = commandes.filter((c: any) => c.type_commande === viewMode);
    const nbAttente = scopeData.filter((c: any) => ['Envoyée', 'En cours', 'Validée'].includes(c.statut)).length;
    const montantTotal = scopeData.reduce((acc: number, curr: any) => acc + Number(curr.montant_total || 0), 0);
    
    let totalJours = 0, countJours = 0;
    scopeData.forEach((c: any) => {
      if (c.date_commande && c.datePTF) {
        const d1 = new Date(c.datePTF.split('/').reverse().join('-'));
        const d2 = new Date(c.date_commande);
        if (d2 >= d1) {
          const diffTime = Math.abs(d2.getTime() - d1.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          totalJours += diffDays;
          countJours++;
        }
      }
    });
    const delaiMoyen = countJours > 0 ? (totalJours / countJours).toFixed(1) : '0';

    return { total: scopeData.length, nbAttente, montantTotal, delaiMoyen };
  }, [commandes, viewMode]);

  const alertsList = useMemo(() => {
    const list: any[] = [];
    const scopeData = commandes.filter((c: any) => c.type_commande === viewMode);
    
    scopeData.forEach((c: any) => {
      if (viewMode === 'CLIENT' && c.statut === 'Brouillon') {
        list.push({ text: `⚠️ Commande client ${c.numero_commande || 'en attente'} non validée.`, color: 'text-amber-600 dark:text-amber-400' });
      } else if (viewMode === 'FOURNISSEUR' && c.statut === 'En cours') {
        list.push({ text: `🔄 Suivi nécessaire sur la livraison FRN ${c.numero_commande}.`, color: 'text-blue-600 dark:text-blue-400' });
      }
    });
    
    return list.length === 0 ? [{ text: "💡 Aucun point de blocage détecté sur les commandes.", color: 'text-slate-600 dark:text-slate-400' }] : list;
  }, [commandes, viewMode]);

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Gestion des Commandes</h1>
        <div className="flex gap-2">
          <button onClick={exportToExcel} className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 h-6 rounded text-[10px] font-medium hover:bg-emerald-700 transition-colors"><Download size={11} /> Exporter Excel</button>
          <button onClick={() => setIsModalOpen(true)} className="h-6 px-2.5 bg-blue-600 text-white font-medium rounded text-[10px] hover:bg-blue-700 transition-colors flex items-center gap-1">
            <Plus size={12} /> Nouvelle commande
          </button>
        </div>
      </div>

      {/* KPI WIDGETS RESTAURÉS AVEC COMPATIBILITÉ DARK MODE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[ { l: viewMode === 'CLIENT' ? "Nb Commandes Clientes" : "Nb Commandes Fournisseurs", v: `${stats.total}`, ic: <Briefcase size={16} />, c: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
           { l: "En Attente / En Cours", v: `${stats.nbAttente}`, ic: <CalendarClock size={16} />, c: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" },
           { l: "Montant Engagé", v: `${stats.montantTotal.toLocaleString()} €`, ic: <DollarSign size={16} />, c: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" },
           { l: "Délai moyen d'engagement", v: `${stats.delaiMoyen} J`, ic: <TrendingUp size={16} />, c: "text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400" }
        ].map((w, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
            <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
            <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
          </div>
        ))}
      </div>

      {/* FILTRES & RECHERCHES AVEC DARK MODE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded space-y-3 shadow-xs">
        <div className="flex gap-2 items-center w-full">
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={`Rechercher dans les commandes...`} className="flex-1 h-8 px-2 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-700 dark:text-slate-300" />
          <div className="flex p-0.5 bg-slate-200/60 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shrink-0">
            <button onClick={() => { setViewMode('CLIENT'); setFilters({oppNumber:'Tous', entityName:'Tous', orderNumber:'Tous', statut:'Tous'}); }} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${viewMode === 'CLIENT' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-semibold' : 'text-slate-500'}`}><Briefcase size={11} /> Commandes Clients</button>
            <button onClick={() => { setViewMode('FOURNISSEUR'); setFilters({oppNumber:'Tous', entityName:'Tous', orderNumber:'Tous', statut:'Tous'}); }} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-all ${viewMode === 'FOURNISSEUR' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs font-semibold' : 'text-slate-500'}`}><ShoppingCart size={11} /> Achats Fournisseurs</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filters.oppNumber} onChange={e => setFilters({...filters, oppNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none"><option value="Tous">N° Opportunité</option>{filterOppNumbers.map((n: any) => <option key={n} value={n}>{n}</option>)}</select>
          <select value={filters.entityName} onChange={e => setFilters({...filters, entityName: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none"><option value="Tous">{viewMode === 'CLIENT' ? 'Entreprise' : 'Fournisseur'}</option>{filterEntities.map((c: any) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.orderNumber} onChange={e => setFilters({...filters, orderNumber: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none"><option value="Tous">N° Commande</option>{filterOrderNumbers.map((c: any) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})} className="h-6 px-1.5 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400 focus:outline-none"><option value="Tous">Statut</option>{Object.entries(STATUT_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
      </div>

      {/* CARDS PRÉDICTIVES RESTAURÉES COMPLÈTES AVEC DARK MODE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-32">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><BrainCircuit size={12} className="text-blue-500" /> Analyse Prédictive & Logistique</span>
          </div>
          <div className="flex-1 overflow-y-auto mt-1.5 space-y-1.5 pr-0.5 text-slate-600 dark:text-slate-400 text-[10px] font-normal">
            {alertsList.map((alertItem: any, idx: number) => (
              <div key={idx} className="p-1 border border-dashed rounded bg-slate-50 dark:bg-slate-950/40 flex items-start gap-2">
                <p className={`leading-tight ${alertItem.color}`}>{alertItem.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md flex flex-col justify-between shadow-xs h-32">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1 text-[10px]"><Target size={12} className="text-purple-500" /> Focus Volumes d'Achats & Ventes</span>
          </div>
          <div className="text-[10px] font-normal text-slate-600 dark:text-slate-400 flex-1 flex flex-col justify-start mt-2 gap-2">
            <div className="flex justify-between items-center bg-blue-500/5 dark:bg-blue-950/20 p-1.5 rounded border border-blue-500/10 dark:border-blue-800/30">
              <span>💼 Volume Total ({viewMode === 'CLIENT' ? 'Vente' : 'Achat'}) :</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{stats.montantTotal.toLocaleString()} €</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABLEAU PRINCIPAL DE SUIVI */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-x-auto max-w-full relative shadow-xs">
        <table className="w-full text-left border-collapse min-w-[1550px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">
            <tr>
              <th className="p-2 sticky left-0 bg-slate-50 dark:bg-slate-800 z-20 min-w-[95px] border-r border-slate-100 dark:border-slate-700">N° Opp</th>
              <th className="p-2 sticky left-[95px] bg-slate-50 dark:bg-slate-800 z-20 min-w-[150px] border-r border-slate-100 dark:border-slate-700">Titre Opportunité</th>
              <th className="p-2 whitespace-nowrap"> {viewMode === 'CLIENT' ? 'Nom Entreprise' : 'Fournisseur'}</th>
              <th className="p-2 max-w-[110px] leading-tight font-bold">Validation PTF</th>
              <th className="p-2 whitespace-nowrap">N° Commande</th>
              <th className="p-2 whitespace-nowrap">Titre Commande</th>
              <th className="p-2 max-w-[110px] leading-tight font-bold">{viewMode === 'CLIENT' ? 'Réception Cmd' : 'Émission Bon'}</th>
              <th className="p-2 whitespace-nowrap">Montant global</th>
              <th className="p-2 whitespace-nowrap">Statut</th>
              <th className="p-2 whitespace-nowrap min-w-[150px]">Commentaires</th>
              <th className="p-2 whitespace-nowrap text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
            {filteredCommandes.map((c: any) => {
              const oppChrono = c.prospectData?.opp_number ? `OPP-2026-${String(c.prospectData.opp_number).padStart(4, '0')}` : '—';
              return (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 z-10 whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                    <Link href={`/${px.orgId}/commandes/${c.id}`} className="hover:underline">{oppChrono}</Link>
                  </td>
                  <td className="p-2 max-w-[150px] truncate sticky left-[95px] bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 z-10 font-normal border-r border-slate-100 dark:border-slate-800">
                    {c.prospectData?.titre || '—'}
                  </td>
                  <td className="p-2 font-bold truncate max-w-[150px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5"><Building2 size={10} className="text-slate-400 shrink-0" /> {c.entityName || '—'}</td>
                  <td className="p-2 font-mono text-slate-400">{c.datePTF || '—'}</td>
                  <td className="p-2 font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    <Link href={`/${px.orgId}/commandes/${c.id}`}>{c.numero_commande || '—'}</Link>
                  </td>
                  <td className="p-2 font-normal truncate max-w-[150px]">{c.titre_commande || '—'}</td>
                  <td className="p-2 font-mono text-slate-400">{c.date_commande ? new Date(c.date_commande).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{(Number(c.montant_total) || 0).toLocaleString()} €</td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUT_COLORS[c.statut] || 'bg-slate-100'}`}>
                      {STATUT_LABELS[c.statut] || c.statut}
                    </span>
                  </td>
                  <td className="p-2">
                    <input 
                      type="text" 
                      defaultValue={c.commentaire || ''} 
                      placeholder="Ajouter une note..."
                      onBlur={(e) => updateCommentMutation.mutate({ id: c.id, text: e.target.value })}
                      className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 rounded px-1 py-0.5 focus:outline-none transition-colors text-slate-800 dark:text-slate-200"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex gap-2 justify-center items-center">
                      <Link href={`/${px.orgId}/commandes/${c.id}`} className="focus:outline-none">
                        <Edit size={11} className="text-blue-500 hover:text-blue-600" />
                      </Link>
                      <button onClick={() => { if (confirm('Supprimer cette commande ?')) deleteMutation.mutate(c.id); }} className="text-red-500 hover:text-red-600 transition-colors focus:outline-none">
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

      {isModalOpen && <CommandeForm currentOrgId={currentOrgId || null} onClose={() => setIsModalOpen(false)} onRefresh={refetch} />}
    </div>
  );
}