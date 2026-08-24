"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Briefcase, ShoppingCart } from "lucide-react";
import { hrCancelButtonClassName, hrSaveButtonClassName } from "@/components/hr/HrReferenceUi";

const supabase = createClient();

interface CommandeFormProps {
  currentOrgId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CommandeForm({ currentOrgId, onClose, onRefresh }: CommandeFormProps) {
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cmdType, setCmdType] = useState<'CLIENT' | 'FOURNISSEUR'>('CLIENT');
  
  const [selectedProspectId, setSelectedProspectId] = useState("");
  const [selectedFournisseurId, setSelectedFournisseurId] = useState("");
  const [numCommande, setNumCommande] = useState("");
  const [titreCommande, setTitreCommande] = useState("");
  const [dateCommande, setDateCommande] = useState("");

  const { data: prospectsGagnes = [] } = useQuery({
    queryKey: ['prospects-gagnes-cmd', currentOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('prospects' as any).select('id, titre, opp_number, client_id, clients(name)').eq('statut', 'gagné').eq('organization_id', currentOrgId) as any);
      return data || [];
    },
    enabled: !!currentOrgId
  });

  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['fournisseurs-list', currentOrgId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('fournisseurs' as any).select('id, name').eq('organization_id', currentOrgId) as any);
      return data || [];
    },
    enabled: !!currentOrgId && cmdType === 'FOURNISSEUR'
  });

  useEffect(() => {
    async function generateFrnRef() {
      if (cmdType === 'FOURNISSEUR' && selectedProspectId) {
        const opp = prospectsGagnes.find((p: any) => p.id === selectedProspectId);
        if (opp && opp.opp_number) {
          const baseRef = `CMD_FRN_OPP-2026-${String(opp.opp_number).padStart(4, '0')}`;
          const { data } = await (supabase.from('commandes' as any).select('numero_commande').like('numero_commande', `${baseRef}-%`) as any);
          
          let nextIndex = 1;
          if (data && data.length > 0) {
            const existingIndices = data.map((d: any) => parseInt(d.numero_commande.split('-').pop(), 10)).filter((n: number) => !isNaN(n));
            while (existingIndices.includes(nextIndex)) nextIndex++;
          }
          setNumCommande(`${baseRef}-${nextIndex}`);
        }
      } else if (cmdType === 'CLIENT') {
        setNumCommande("");
      }
    }
    generateFrnRef();
  }, [selectedProspectId, cmdType, prospectsGagnes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      let client_id = null;
      let fournisseur_id = null;

      const opp = prospectsGagnes.find((p: any) => p.id === selectedProspectId);
      if (!opp) throw new Error("Veuillez lier une opportunité gagnée.");
      
      if (cmdType === 'CLIENT') {
        client_id = opp.client_id;
      } else {
        fournisseur_id = selectedFournisseurId || null;
      }

      const { error } = await (supabase.from('commandes' as any).insert([{
        organization_id: currentOrgId,
        type_commande: cmdType,
        numero_commande: numCommande,
        prospect_id: selectedProspectId,
        client_id: client_id,
        fournisseur_id: fournisseur_id,
        statut: 'Brouillon',
        date_commande: dateCommande || null,
        titre_commande: titreCommande,
        montant_total: 0
      } as any]) as any);

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['commandes-suivi', currentOrgId] });
      onRefresh(); onClose();
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
          <h3 className="text-lg font-black text-slate-950">Créer une commande</h3>
          <p className="mt-1 text-xs text-slate-500">Rattachez la commande à l’opportunité gagnée pour alimenter Projets et Finance sans ressaisie.</p>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4 p-5 text-sm">
          <div className="flex gap-1 py-1">
            <button type="button" onClick={() => { setCmdType('CLIENT'); setSelectedProspectId(""); }} className={`flex flex-1 items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${cmdType === 'CLIENT' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}><Briefcase size={12} /> Cmd Client</button>
            <button type="button" onClick={() => { setCmdType('FOURNISSEUR'); setSelectedProspectId(""); }} className={`flex flex-1 items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-all ${cmdType === 'FOURNISSEUR' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}><ShoppingCart size={12} /> Cmd Fournisseur</button>
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 uppercase tracking-wide text-[9px] font-bold">Lier à une Opportunité Gagnée *</label>
            <select value={selectedProspectId} onChange={e => setSelectedProspectId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded focus:outline-none" required>
              <option value="">-- Sélectionner l'opportunité source --</option>
              {prospectsGagnes.map((p: any) => <option key={p.id} value={p.id}>OPP-2026-{String(p.opp_number).padStart(4, '0')} — {p.titre}</option>)}
            </select>
          </div>
          {cmdType === 'FOURNISSEUR' && (
            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-wide text-[9px] font-bold">Fournisseur Partenaire</label>
              <select value={selectedFournisseurId} onChange={e => setSelectedFournisseurId(e.target.value)} className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded focus:outline-none">
                <option value="">-- Sélectionner un fournisseur --</option>
                {fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-wide text-[9px] font-bold">N° Commande *</label>
              <input value={numCommande} onChange={e => setNumCommande(e.target.value)} placeholder={cmdType === 'CLIENT' ? "Saisi par le client" : "Auto-généré"} className="w-full h-8 px-2 font-mono bg-white border border-slate-200 rounded focus:outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 uppercase tracking-wide text-[9px] font-bold">{cmdType === 'CLIENT' ? 'Date réception' : 'Date d\'émission'} *</label>
              <input type="date" value={dateCommande} onChange={e => setDateCommande(e.target.value)} className="w-full h-8 px-2 font-mono bg-white border border-slate-200 rounded focus:outline-none" required />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-400 uppercase tracking-wide text-[9px] font-bold">Titre de la commande *</label>
            <input value={titreCommande} onChange={e => setTitreCommande(e.target.value)} placeholder="Ex: Prestation Audit, Achat Matériel..." className="w-full h-8 px-2 bg-white border border-slate-200 rounded focus:outline-none" required />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className={hrCancelButtonClassName} disabled={isSubmitting}>Annuler</button>
            <button type="submit" className={hrSaveButtonClassName} disabled={isSubmitting}>{isSubmitting ? "Création..." : "Enregistrer"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
