"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FileText } from "lucide-react";

const supabase = createClient();
const STAGES = ['découverte', 'contact', 'qualification', 'NoGo', 'proposition', 'négociation', 'gagné', 'perdu'] as const;
const SOURCES = ['Référence', 'Contact Direct', 'Email outbound', 'Réseaux Sociaux', 'Événement / Salon', 'Partenaire', 'Autre'];

const STAGE_LABELS: Record<string, string> = { 
  'découverte': 'Découverte', 'contact': 'Contact', 'qualification': 'Qualification', 
  'NoGo': 'No-Go', 'proposition': 'Proposition', 'négociation': 'Négociation', 'gagné': 'Gagné', 'perdu': 'Perdu' 
};

interface ProspectFormProps {
  selectedProspect: any | null;
  clientsList: any[];
  currentOrgId: string | null;
  prospectsCount: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function ProspectForm({ selectedProspect, clientsList, currentOrgId, prospectsCount, onClose, onRefresh }: ProspectFormProps) {
  const qc = useQueryClient();
  
  const [techScore, setTechScore] = useState(3);
  const [priceScore, setPriceScore] = useState(3);
  const [humanScore, setHumanScore] = useState(3);
  const [timingScore, setTimingScore] = useState(3);

  const fInitialState = {
    title: '', client_id: '', commercial: '', status: 'découverte', source: '',
    amount: 0, probability: 20, target_date: '', notes: '', rex_comments: ''
  };

  const [f, setF] = useState(fInitialState);

  useEffect(() => {
    if (selectedProspect) {
      setF({
        title: selectedProspect.titre || '',
        client_id: selectedProspect.client_id || '',
        commercial: selectedProspect.commercial_id || '', 
        status: selectedProspect.statut || 'découverte',
        source: selectedProspect.source || '',
        amount: selectedProspect["ca_estime_k€"] || 0,
        probability: selectedProspect.probabilite_gain || 0,
        target_date: selectedProspect.date_cible || '',
        notes: selectedProspect.commentaire || '',
        rex_comments: selectedProspect.rex_commentaires || ''
      });
      
      setTechScore(selectedProspect.rex_tech_score ?? 3);
      setPriceScore(selectedProspect.rex_price_score ?? 3);
      setHumanScore(selectedProspect.rex_human_score ?? 3);
      setTimingScore(selectedProspect.rex_timing_score ?? 3);
    } else {
      setF(fInitialState);
      setTechScore(3); setPriceScore(3); setHumanScore(3); setTimingScore(3);
    }
  }, [selectedProspect]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const avgGlobalRex = Math.round((techScore + priceScore + humanScore + timingScore) / 4);
      const isPostMortemStage = ['gagné', 'perdu', 'NoGo'].includes(payload.status);

      const supabasePayload: any = {
        titre: payload.title,
        client_id: payload.client_id || null,
        commercial_id: payload.commercial || null, 
        statut: payload.status,
        source: payload.source || null,
        "ca_estime_k€": payload.amount ? Number(payload.amount) : 0,
        probabilite_gain: payload.probability ? Number(payload.probability) : 0,
        date_cible: payload.target_date || null,
        commentaire: payload.notes || null,
        rex_note_global: isPostMortemStage ? avgGlobalRex : null,
        rex_tech_score: isPostMortemStage ? techScore : null,
        rex_price_score: isPostMortemStage ? priceScore : null,
        rex_human_score: isPostMortemStage ? humanScore : null,
        rex_timing_score: isPostMortemStage ? timingScore : null,
        rex_commentaires: payload.rex_comments || null
      };

      if (selectedProspect?.id) {
        const { error } = await (supabase.from('prospects' as any).update(supabasePayload) as any).eq('id', selectedProspect.id);
        if (error) throw error;
      } else {
        const existingNumbers = prospectsCount.map(p => p.opp_number).sort((a, b) => a - b);
        let targetChrono = 1;
        for (let i = 0; i < existingNumbers.length; i++) {
          if (existingNumbers[i] === targetChrono) targetChrono++;
          else break;
        }

        supabasePayload.opp_number = targetChrono;
        supabasePayload.organization_id = currentOrgId;

        const { error } = await supabase.from('prospects' as any).insert([supabasePayload]);
        if (error) throw error;
      }
      
      qc.invalidateQueries({ queryKey: ['prospects', currentOrgId] });
      onRefresh();
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 flex flex-col space-y-4">
        
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-[11px] font-bold uppercase text-slate-800 dark:text-white">
            {selectedProspect ? `Modifier Prospect` : 'Créer un Nouveau Prospect'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Titre de l'opportunité *</label>
            <input value={f.title} onChange={e => setF({...f, title: e.target.value})} placeholder="Ex: Refonte Plateforme BI" className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nom Entreprise *</label>
            <select value={f.client_id} onChange={e => setF({...f, client_id: e.target.value})} className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none">
              <option value="">— Sélectionner —</option>
              {(clientsList as any[]).map((c: any) => <option key={c.id} value={c.id as string}>{c.name as string}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Commercial en charge</label>
            <input value={f.commercial} onChange={e => setF({...f, commercial: e.target.value})} placeholder="Ex: Thomas L." className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Étape CRM</label>
            <select value={f.status} onChange={e => setF({...f, status: e.target.value})} className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-semibold text-blue-600 focus:outline-none">
              {(STAGES as unknown as string[]).map((s: string) => <option key={s} value={s}>{STAGE_LABELS[s] as string}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Source d'acquisition</label>
            <select value={f.source} onChange={e => setF({...f, source: e.target.value})} className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none">
              <option value="">— Choisir —</option>
              {(SOURCES as string[]).map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Estimation CA (k€)</label>
            <input type="number" value={f.amount || ''} onChange={e => setF({...f, amount: Number(e.target.value)})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Probabilité de gain (%)</label>
            <input type="number" min={0} max={100} value={f.probability || ''} onChange={e => setF({...f, probability: Number(e.target.value)})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Date cible de closing</label>
            <input type="date" value={f.target_date} onChange={e => setF({...f, target_date: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-500 focus:outline-none" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Commentaires & Notes</label>
            <textarea value={f.notes} onChange={e => setF({...f, notes: e.target.value})} rows={2} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" placeholder="Contexte..." />
          </div>

          {/* ANALYSE DE RETOUR D'EXPÉRIENCE DÉCLENCHÉE POUR GAGNÉ, PERDU ET LE NOUVEAU NOGO */}
          {['gagné', 'perdu', 'NoGo'].includes(f.status) && (
            <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 p-2.5 rounded-md space-y-2">
              <span className="font-bold text-purple-700 dark:text-purple-400 uppercase text-[9px] block border-b pb-1">Analyse Post-Mortem & REX</span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-500 mb-0.5">Tech (/5)</label>
                  <input type="number" min={1} max={5} value={techScore} onChange={e => setTechScore(Number(e.target.value))} className="w-full h-6 bg-white dark:bg-slate-900 border rounded text-center text-slate-700 dark:text-slate-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 mb-0.5">Prix (/5)</label>
                  <input type="number" min={1} max={5} value={priceScore} onChange={e => setPriceScore(Number(e.target.value))} className="w-full h-6 bg-white dark:bg-slate-900 border rounded text-center text-slate-700 dark:text-slate-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 mb-0.5">Humain (/5)</label>
                  <input type="number" min={1} max={5} value={humanScore} onChange={e => setHumanScore(Number(e.target.value))} className="w-full h-6 bg-white dark:bg-slate-900 border rounded text-center text-slate-700 dark:text-slate-300 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 mb-0.5">Timing (/5)</label>
                  <input type="number" min={1} max={5} value={timingScore} onChange={e => setTimingScore(Number(e.target.value))} className="w-full h-6 bg-white dark:bg-slate-900 border rounded text-center text-slate-700 dark:text-slate-300 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 mb-0.5">Synthèse des forces et faiblesses du REX :</label>
                <textarea value={f.rex_comments} onChange={e => setF({...f, rex_comments: e.target.value})} rows={2} className="w-full p-1.5 bg-white dark:bg-slate-900 border rounded text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button onClick={onClose} className="px-3 h-7 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">Annuler</button>
          <button onClick={() => saveMutation.mutate(f)} disabled={!f.title || !f.client_id} className="px-4 h-7 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-40">
            Enregistrer
          </button>
        </div>

      </div>
    </div>
  );
}