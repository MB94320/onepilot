"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { hrCancelButtonClassName, hrSaveButtonClassName } from "@/components/hr/HrReferenceUi";

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
      const { data, error } = await (supabase.from('prospects' as any).select('id, titre, opp_number, date_cible').eq('organization_id', currentOrgId) as any);
      if (error) throw error;
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
    let createdManualProspectId: string | null = null;
    let createdOfferId: string | null = null;

    try {
      let finalProspectId = useExistingProspect ? selectedProspectId : null;

      // Si saisie libre, on génère un prospect d'ancrage
      if (!useExistingProspect) {
        let lastProspectError: any = null;
        for (let attempt = 0; attempt < Math.max(10, prospectsList.length + 2); attempt += 1) {
          const sequence = await (supabase.rpc("next_project_code" as never, {
            target_organization_id: currentOrgId,
            target_year: new Date().getFullYear(),
            code_prefix: "OPP",
          } as never) as any);
          if (sequence.error) throw sequence.error;
          const opportunityNumber = Number(String(sequence.data || "").match(/(\d+)$/)?.[1] || 0);
          if (!opportunityNumber) throw new Error("Impossible de générer le numéro d’opportunité.");
          const { data: newP, error: errP } = await supabase.from('prospects' as any).insert([{
            organization_id: currentOrgId,
            titre: manualTitle || "Offre sans prospect source",
            statut: 'qualification',
            opp_number: opportunityNumber,
            "ca_estime_k€": 0,
            probabilite_gain: 20
          } as any]).select('id').single() as any;
          if (!errP) {
            finalProspectId = newP.id;
            createdManualProspectId = newP.id;
            break;
          }
          lastProspectError = errP;
          if (errP.code !== "23505") throw errP;
        }
        if (!finalProspectId) throw lastProspectError || new Error("Impossible de réserver un numéro d’opportunité unique.");
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
      createdOfferId = offre.id;

      // Récupération du numéro d'opportunité pour formater les codes FT et CL
      const { data: pData, error: errProspect } = await (supabase.from('prospects' as any).select('opp_number').eq('organization_id', currentOrgId).eq('id', finalProspectId) as any).single();
      if (errProspect) throw errProspect;
      if (!pData?.opp_number) throw new Error("Le numéro de l’opportunité source est manquant.");
      const oppIdStr = String(pData.opp_number).padStart(4, '0');
      const opportunityYear = new Date().getFullYear();

      // 2. Création de la grille Go/NoGo associée
      const { error: errGoNoGo } = await supabase.from('offres_gonogo' as any).insert([{
        offre_id: offre.id,
        num_cl_gonogo: `CL_OPP-${opportunityYear}-${oppIdStr}`,
        decision_calculee: 'NoGo',
        score_global_pourcent: 0
      } as any]);
      if (errGoNoGo) throw errGoNoGo;

      // 3. Création de la fiche technique financière associée
      const { error: errTechnicalSheet } = await supabase.from('offres_fiche_technique' as any).insert([{
        offre_id: offre.id,
        num_ft: `FT_OPP-${opportunityYear}-${oppIdStr}`,
        lignes_analyse_couts: [],
        lignes_frais_annexes: [],
        lignes_prix_vente: []
      } as any]);
      if (errTechnicalSheet) throw errTechnicalSheet;

      // FORCE LA RE-VALIDATION DES CACHES AVANT DE FERMER
      await qc.invalidateQueries({ queryKey: ['offres', currentOrgId] });
      onRefresh(); 
      onClose();
    } catch (err: any) {
      if (createdOfferId) {
        await Promise.all([
          (supabase.from('offres_gonogo' as any).delete() as any).eq('offre_id', createdOfferId),
          (supabase.from('offres_fiche_technique' as any).delete() as any).eq('offre_id', createdOfferId),
        ]);
        await (supabase.from('offres' as any).delete() as any).eq('organization_id', currentOrgId).eq('id', createdOfferId);
      }
      if (createdManualProspectId) {
        await (supabase.from('prospects' as any).delete() as any).eq('organization_id', currentOrgId).eq('id', createdManualProspectId);
      }
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'offre : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-950">Initialiser un dossier d’offre</h3>
          <p className="mt-1 text-xs text-slate-500">L’offre reprend l’opportunité source et prépare automatiquement les dossiers Go/No-Go et fiche technique.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
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
            <button type="button" onClick={onClose} className={hrCancelButtonClassName} disabled={isSubmitting}>Annuler</button>
            <button type="submit" className={hrSaveButtonClassName} disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
