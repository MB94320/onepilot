"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FileText } from "lucide-react";
import { hrCancelButtonClassName, hrSaveButtonClassName } from "@/components/hr/HrReferenceUi";

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
        if (!currentOrgId) throw new Error("Organisation introuvable.");
        supabasePayload.organization_id = currentOrgId;
        let inserted = false;
        let lastError: any = null;
        for (let attempt = 0; attempt < Math.max(10, prospectsCount.length + 2); attempt += 1) {
          const sequence = await (supabase.rpc("next_project_code" as never, {
            target_organization_id: currentOrgId,
            target_year: new Date().getFullYear(),
            code_prefix: "OPP",
          } as never) as any);
          if (sequence.error) throw sequence.error;
          const sequenceNumber = Number(String(sequence.data || "").match(/(\d+)$/)?.[1] || 0);
          if (!sequenceNumber) throw new Error("Impossible de générer le numéro d’opportunité.");
          supabasePayload.opp_number = sequenceNumber;
          const { error } = await supabase.from('prospects' as any).insert([supabasePayload]);
          if (!error) { inserted = true; break; }
          lastError = error;
          if (error.code !== "23505") throw error;
        }
        if (!inserted) throw lastError || new Error("Impossible de réserver un numéro d’opportunité unique.");
      }
      
      qc.invalidateQueries({ queryKey: ['prospects', currentOrgId] });
      onRefresh();
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-950">
            {selectedProspect ? "Modifier l’opportunité" : "Créer une nouvelle opportunité"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">Qualifiez la valeur, l’échéance, le responsable et la prochaine décision commerciale.</p>
        </header>

        <div className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-2">
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

        <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
          <button onClick={onClose} className={hrCancelButtonClassName}>Annuler</button>
          <button onClick={() => saveMutation.mutate(f)} disabled={!f.title || !f.client_id} className={hrSaveButtonClassName}>
            Enregistrer
          </button>
        </footer>

      </section>
    </div>
  );
}
