"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

const supabase = createClient();

interface OffreFormProps {
  currentOrgId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function OffreForm({ currentOrgId, onClose, onRefresh }: OffreFormProps) {
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useExistingProspect, setUseExistingProspect] = useState(true);
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [datePrev, setDatePrev] = useState("");

  const { data: prospectsList = [] } = useQuery({
    queryKey: ['prospects-avv', currentOrgId],
    queryFn: async () => {
      const { data } = await (supabase.from('prospects' as any).select('id, titre, opp_number, date_cible') as any);
      return data || [];
    },
    enabled: !!currentOrgId
  });

  // Héritage automatique de la date cible de closing du Prospect
  useEffect(() => {
    if (useExistingProspect && selectedProspectId) {
      const match = prospectsList.find((p: any) => p.id === selectedProspectId);
      if (match?.date_cible) {
        setDatePrev(match.date_cible);
      }
    }
  }, [selectedProspectId, useExistingProspect, prospectsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgId || isSubmitting) return;
    setIsSubmitting(true); // VERROUILLAGE DE SÉCURITÉ DE LA SOUMISSION

    try {
      let finalProspectId = useExistingProspect ? selectedProspectId : null;

      // Si saisie libre, on génère un prospect d'ancrage
      if (!useExistingProspect) {
        const { data: newP, error: errP } = await supabase.from('prospects' as any).insert([{
          organization_id: currentOrgId,
          titre: manualTitle || "Offre Sans Prospect Source",
          statut: 'qualification',
          "ca_estime_k€": 0,
          probabilite_gain: 20
        } as any]).select().single() as any;
        
        if (errP) throw errP;
        finalProspectId = newP.id;
      }

      if (!finalProspectId) {
        alert("Veuillez sélectionner un dossier prospect ou saisir un sujet.");
        setIsSubmitting(false);
        return;
      }

      // 1. Insertion de la ligne d'offre principale
      const { data: offre, error: errOffre } = await supabase.from('offres' as any).insert([{
        organization_id: currentOrgId,
        prospect_id: finalProspectId,
        statut_offre: 'A faire',
        date_diffusion_previsionnelle: datePrev || null
      } as any]).select().single() as any;

      if (errOffre) throw errOffre;

      // Récupération du numéro d'opportunité pour formater les codes FT et CL
      const { data: pData } = await (supabase.from('prospects' as any).select('opp_number').eq('id', finalProspectId) as any).single();
      const oppIdStr = pData?.opp_number ? String(pData.opp_number).padStart(4, '0') : 'MANUAL';

      // 2. Création de la grille Go/NoGo associée
      await supabase.from('offres_gonogo' as any).insert([{
        offre_id: offre.id,
        num_cl_gonogo: `CL_OPP-2026-${oppIdStr}`,
        decision_calculee: 'NoGo',
        score_global_pourcent: 0
      } as any]);

      // 3. Création de la fiche technique financière associée
      await supabase.from('offres_fiche_technique' as any).insert([{
        offre_id: offre.id,
        num_ft: `FT_OPP-2026-${oppIdStr}`,
        lignes_analyse_couts: [],
        lignes_frais_annexes: [],
        lignes_prix_vente: []
      } as any]);

      // FORCE LA RE-VALIDATION DES CACHES AVANT DE FERMER
      await qc.invalidateQueries({ queryKey: ['offres', currentOrgId] });
      onRefresh(); 
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'offre : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 text-[11px]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-lg p-4 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b pb-1.5">
          <h3 className="font-bold uppercase tracking-tight text-slate-800 dark:text-slate-200 text-[11px]">Initialiser un Dossier d'Offre</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 dark:bg-slate-950 dark:border-slate-800">
            <button type="button" onClick={() => setUseExistingProspect(true)} className={`flex-1 py-1 text-center rounded-sm font-medium ${useExistingProspect ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-400'}`}>Lier un Prospect</button>
            <button type="button" onClick={() => setUseExistingProspect(false)} className={`flex-1 py-1 text-center rounded-sm font-medium ${!useExistingProspect ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-400'}`}>Saisie Libre / Directe</button>
          </div>

          {useExistingProspect ? (
            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-wide text-[8px] font-bold">Sélectionner le dossier Prospect source</label>
              <select value={selectedProspectId} onChange={e => setSelectedProspectId(e.target.value)} className="w-full h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none dark:text-slate-300" required={useExistingProspect}>
                <option value="">-- Choisir un dossier actif --</option>
                {prospectsList.map((p: any) => (
                  <option key={p.id} value={p.id}>OPP-2026-{String(p.opp_number).padStart(4, '0')} — {p.titre}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-wide text-[8px] font-bold">Intitulé / Sujet de l'offre</label>
              <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="ex: Prestation Audit Data Platform" className="w-full h-8 px-2 border dark:bg-slate-950 dark:border-slate-800 rounded focus:outline-none dark:text-slate-300" required={!useExistingProspect} />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-slate-400 uppercase tracking-wide text-[8px] font-bold">Date de diffusion prévisionnelle (Héritée)</label>
            <input type="date" value={datePrev} onChange={e => setDatePrev(e.target.value)} className="w-full h-8 px-2 border dark:bg-slate-950 dark:border-slate-800 rounded focus:outline-none dark:text-slate-400" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
            <button type="button" onClick={onClose} className="h-7 px-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-medium hover:bg-slate-200" disabled={isSubmitting}>Annuler</button>
            <button type="submit" className="h-7 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-40" disabled={isSubmitting}>
              {isSubmitting ? "Initialisation..." : "Valider & Ouvrir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}