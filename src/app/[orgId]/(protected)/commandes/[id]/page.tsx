"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Save, DollarSign, Calendar, Target, CheckSquare, Info, Repeat, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

const supabase = createClient();
const STATUTS_COMMANDE = ['Brouillon', 'Envoyée', 'Validée', 'En cours', 'Livrée', 'Facturée', 'Annulée'];

const CRITERES_REVUE = [
  "Objet du contrat", "Compétences requises et moyens", "Méthode de travail", "Existence d’un plan qualité",
  "Documents de référence", "Transmission des exigences qualité applicables aux fournisseurs", "Fourniture des éléments techniques",
  "Configuration", "Risques", "Conditions de sous-traitance", "Communication client", "Montant de la prestation",
  "Évolution de la fourniture et plus value", "Conditions de règlement", "Conditions économiques", "Caution bancaire",
  "Retenue de garantie", "Niveau ou exigences de qualité requis", "Limite de la prestation", "Obligation de résultat",
  "Conditions de rejet", "Conditions de réception ou d’acceptation", "Exigences de garantie", "Adéquation délai/disponibilité",
  "Délai de réalisation", "Pénalités de retard", "Niveau de responsabilité", "Exigences en matière de police d’assurance",
  "Conditions générales d’achat"
];

export default function CommandeIndividuellePage({ params }: { params: Promise<{ orgId: string; id: string }> }) {
  const { orgId: slugOrId, id: commandeId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'kpis' | 'lignes' | 'revue' | 'tiers'>('kpis');

  const [form, setForm] = useState<any>({
    statut: "Brouillon", date_commande: "", date_livraison_prevue: "", titre_commande: "", numero_commande: "", commentaire: "", date_validation_ptf: ""
  });

  const [lignes, setLignes] = useState<any[]>([]);
  const [tiersForm, setTiersForm] = useState<any>({ id: "", name: "", contact: "", email: "", phone: "", city: "", country: "", address: "", zip: "", sector: "", service: "", notes: "", contact_role: "" });
  
  const [dateRevue, setDateRevue] = useState("");
  const [commGeneralRevue, setCommGeneralRevue] = useState("");
  const [critereVals, setCritereVals] = useState<Record<string, string>>({});
  const [critereComms, setCritereCommentaires] = useState<Record<string, string>>({});

  const { data: cmdData, refetch } = useQuery({
    queryKey: ['commande-detail', commandeId],
    queryFn: async () => {
      const { data: dCmd } = await (supabase.from('commandes' as any).select(`
        *,
        clients (*),
        fournisseurs (*),
        prospects (opp_number, titre)
      `).eq('id', commandeId).single() as any);
      if (!dCmd) return null;

      const { data: dLignes } = await (supabase.from('commande_lignes' as any).select('*').eq('commande_id', commandeId).order('created_at', { ascending: true }) as any);
      const { data: dRevue = null } = await (supabase.from('commande_revues' as any).select('*').eq('commande_id', commandeId).maybeSingle() as any);
      const { data: dRelated } = await (supabase.from('commandes' as any).select('id, type_commande, numero_commande').eq('prospect_id', dCmd.prospect_id).neq('id', commandeId) as any);
      
      // Récupération de la date PTF depuis l'offre liée à l'opportunité
      const { data: dOffre } = await (supabase.from('offres' as any).select('date_validation_client').eq('prospect_id', dCmd.prospect_id).maybeSingle() as any);

      return { ...dCmd, lignes: dLignes || [], revue: dRevue, relatedCmds: dRelated || [], offre_ptf_date: dOffre?.date_validation_client || null };
    }
  });

  const isClient = cmdData?.type_commande === 'CLIENT';
  const oppChrono = cmdData?.prospects?.opp_number ? `OPP-2026-${String(cmdData.prospects.opp_number).padStart(4, '0')}` : '—';
  
  const getColor = (v: string) => {
    if (v === 'Conforme') return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    if (v === 'Partiellement conforme') return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    if (v === 'Non conforme') return 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900';
    return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  useEffect(() => {
    if (cmdData) {
      setForm({
        statut: cmdData.statut || 'Brouillon',
        date_commande: cmdData.date_commande || "",
        date_livraison_prevue: cmdData.date_livraison_prevue || "",
        titre_commande: cmdData.titre_commande || "",
        numero_commande: cmdData.numero_commande || "",
        commentaire: cmdData.commentaire || "",
        date_validation_ptf: cmdData.offre_ptf_date || cmdData.date_validation_ptf || ""
      });
      setLignes(cmdData.lignes || []);

      const entity = cmdData.type_commande === 'CLIENT' ? cmdData.clients : cmdData.fournisseurs;
      if (entity) {
        setTiersForm({
          id: entity.id || "", name: entity.name || "", contact: entity.contact || "", email: entity.email || "", phone: entity.phone || "",
          city: entity.city || "", country: entity.country || "", address: entity.address || "", zip: entity.zip || "",
          sector: entity.sector || "", service: entity.service || "", notes: entity.notes || "", contact_role: entity.contact_role || ""
        });
      }

      const defaultVals: Record<string, string> = {};
      CRITERES_REVUE.forEach(c => { defaultVals[c] = "NA"; });
      
      if (cmdData.revue) {
        setDateRevue(cmdData.revue.date_revue || "");
        setCommGeneralRevue(cmdData.revue.commentaire_general || "");
        setCritereVals({ ...defaultVals, ...(cmdData.revue.critere_valeurs || {}) });
        setCritereCommentaires(cmdData.revue.critere_commentaires || {});
      } else {
        setCritereVals(defaultVals);
      }
    }
  }, [cmdData]);

  useEffect(() => {
    if (tiersForm.zip && tiersForm.zip.trim().length === 5) {
      fetch(`https://geo.api.gouv.fr/communes?codePostal=${tiersForm.zip}&fields=nom&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setTiersForm((prev: any) => ({ ...prev, city: data[0].nom, country: "France" }));
          }
        })
        .catch(err => console.error("Erreur géo-déduction:", err));
    }
  }, [tiersForm.zip]);

  const calculsFT = useMemo(() => {
    let total = 0;
    lignes.forEach(l => { total += Number(l.quantite || 0) * Number(l.montant_unitaire || 0); });
    return { total };
  }, [lignes]);

  const scoreRevue = useMemo(() => {
    let pointsGagnes = 0, pointsTotaux = 0;
    let allNA = true;
    
    CRITERES_REVUE.forEach(c => {
      const v = critereVals[c] || "NA";
      if (v !== "NA") allNA = false;
      
      if (v === "Conforme") { pointsGagnes += 2; pointsTotaux += 2; }
      else if (v === "Partiellement conforme") { pointsGagnes += 1; pointsTotaux += 2; }
      else if (v === "Non conforme") { pointsTotaux += 2; }
    });
    
    if (allNA) return { pourcent: 0, decision: "N/A" };
    
    const pourcent = pointsTotaux > 0 ? (pointsGagnes / pointsTotaux) * 100 : 0;
    let decision = "Non conforme";
    if (pourcent >= 85) decision = "Conforme";
    else if (pourcent >= 70) decision = "Partiellement conforme";
    return { pourcent, decision };
  }, [critereVals]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!confirm("Voulez-vous valider et enregistrer les modifications de cette commande ?")) return;

      let finalTiersId = tiersForm.id || null;

      if (tiersForm.name) {
        const tableStr = cmdData.type_commande === 'CLIENT' ? 'clients' : 'fournisseurs';
        const payload = {
          name: tiersForm.name, contact: tiersForm.contact, email: tiersForm.email, phone: tiersForm.phone,
          city: tiersForm.city, country: tiersForm.country, address: tiersForm.address, zip: tiersForm.zip,
          sector: tiersForm.sector, service: tiersForm.service, notes: tiersForm.notes, contact_role: tiersForm.contact_role
        };

        if (tiersForm.id) {
          await (supabase.from(tableStr as any).update(payload as any).eq('id', tiersForm.id) as any);
        } else {
          const { data: newTiers } = await (supabase.from(tableStr as any).insert([{ ...payload, organization_id: cmdData.organization_id }] as any).select().single() as any);
          if (newTiers) {
            finalTiersId = newTiers.id;
          }
        }
      }

      const updateField = cmdData.type_commande === 'CLIENT' ? 'client_id' : 'fournisseur_id';

      await (supabase.from('commandes' as any).update({
        statut: form.statut, date_commande: form.date_commande || null, date_livraison_prevue: form.date_livraison_prevue || null,
        titre_commande: form.titre_commande, numero_commande: form.numero_commande, commentaire: form.commentaire, 
        date_validation_ptf: form.date_validation_ptf || null, montant_total: calculsFT.total, [updateField]: finalTiersId
      } as any).eq('id', commandeId) as any);

      await (supabase.from('commande_lignes' as any).delete().eq('commande_id', commandeId) as any);
      if (lignes.length > 0) {
        const insertLignes = lignes.map(l => ({
          commande_id: commandeId, num_lot: l.num_lot, designation: l.designation,
          quantite: Number(l.quantite || 0), montant_unitaire: Number(l.montant_unitaire || 0),
          montant_total: Number(l.quantite || 0) * Number(l.montant_unitaire || 0), date_livraison: l.date_livraison || null
        }));
        await (supabase.from('commande_lignes' as any).insert(insertLignes) as any);
      }

      await (supabase.from('commande_revues' as any).delete().eq('commande_id', commandeId) as any);
      await (supabase.from('commande_revues' as any).insert([{
        commande_id: commandeId, date_revue: dateRevue || null, commentaire_general: commGeneralRevue, critere_valeurs: critereVals,
        critere_commentaires: critereComms, score_pourcent: scoreRevue.pourcent, statut_conformite: scoreRevue.decision
      } as any]) as any);

      alert("Sauvegarde validée.");
      qc.invalidateQueries({ queryKey: ['commandes-suivi', slugOrId] });
      qc.invalidateQueries({ queryKey: ['commande-detail', commandeId] });
      refetch();
    }
  });

  const generateRevuePDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    let rowsHtml = "";
    CRITERES_REVUE.forEach(c => {
      const v = critereVals[c] || "NA";
      const cStr = v === "Conforme" ? "color:#16a34a" : v === "Partiellement conforme" ? "color:#d97706" : v === "Non conforme" ? "color:#e11d48" : "color:#64748b";
      rowsHtml += `<tr><td style="padding:8px; border:1px solid #cbd5e1;">${c}</td><td style="padding:8px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; ${cStr}">${v}</td><td style="padding:8px; border:1px solid #cbd5e1;">${critereComms[c] || ''}</td></tr>`;
    });

    w.document.write(`
      <html><body style="font-family:sans-serif; padding:40px; color:#334155; font-size:12px;">
        <div style="display:flex; justify-content:space-between; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
          <div><h2 style="margin:0; color:#1e293b;">ONEPILOT</h2></div>
          <h2 style="margin:0; color:#3b82f6;">REVUE DE COMMANDE QUALITÉ</h2>
        </div>
        <h3 style="color:#0f172a; margin-top:20px;">Dossier : ${cmdData?.prospects?.titre || '—'} (${oppChrono})</h3>
        <p style="margin-bottom:5px;"><strong>N° Commande :</strong> ${form.numero_commande || '—'}</p>
        <p style="margin-bottom:15px;"><strong>Date de la Revue :</strong> ${dateRevue ? new Date(dateRevue).toLocaleDateString('fr-FR') : '—'}</p>

        <div style="background:#f8fafc; padding:15px; border-radius:5px; margin-bottom:20px; border:1px solid #e2e8f0;">
          <p style="margin:0; font-weight:bold; font-size:12px;">Commentaire Général d'Arbitrage :</p>
          <p style="margin-top:8px; font-style:italic; font-size:11px;">${commGeneralRevue || 'Aucun commentaire général renseigné.'}</p>
        </div>

        <div style="text-align:center; padding:20px; border:2px solid ${scoreRevue.decision === 'Conforme' ? '#16a34a' : scoreRevue.decision.includes('Partiellement') ? '#d97706' : scoreRevue.decision === 'N/A' ? '#64748b' : '#e11d48'}; border-radius:5px; margin-bottom:30px; background:${scoreRevue.decision === 'Conforme' ? '#f0fdf4' : scoreRevue.decision === 'N/A' ? '#f8fafc' : '#fff1f2'};">
          <h3 style="margin:0; color:${scoreRevue.decision === 'Conforme' ? '#16a34a' : scoreRevue.decision.includes('Partiellement') ? '#d97706' : scoreRevue.decision === 'N/A' ? '#64748b' : '#e11d48'}; font-size:24px;">STATUT : ${scoreRevue.decision}</h3>
          <p style="margin:5px 0 0 0; font-weight:bold;">Score de Conformité : ${scoreRevue.decision === 'N/A' ? 'N/A' : scoreRevue.pourcent.toFixed(0) + ' %'}</p>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; text-align:left; font-size:10px;">
          <tr style="background:#f8fafc;"><th style="padding:8px; border:1px solid #cbd5e1;">Point à Contrôler</th><th style="padding:8px; border:1px solid #cbd5e1; width:150px; text-align:center;">Conformité</th><th style="padding:8px; border:1px solid #cbd5e1;">Observations Techniques</th></tr>
          ${rowsHtml}
        </table>
      </body></html>
    `);
    w.document.close(); w.print();
  };

  const currentValColor = (v: string) => {
    if (v === 'Conforme') return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
    if (v === 'Partiellement conforme') return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
    if (v === 'Non conforme') return 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900';
    return 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  };

  const colorMargeCard = calculsFT.total === 0 ? 'text-slate-600 bg-slate-50 dark:bg-slate-800' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400';

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none relative">
      
      <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2 space-y-3">
        <div className="flex justify-between items-center h-8">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/${slugOrId}/commandes`)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 focus:outline-none"><ArrowLeft size={14}/></button>
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[12px]">{form.titre_commande || "Dossier Commande"}</span>
            <span className="font-mono text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{form.numero_commande}</span>
          </div>
          <div className="flex gap-2">
            {activeTab === 'revue' && (
              <button onClick={generateRevuePDF} className="h-6 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors">
                <FileText size={11} /> Générer la CL Revue de commande en PDF
              </button>
            )}
            <button onClick={() => saveMutation.mutate()} className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors"><Save size={12}/> Enregistrer la commande</button>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-1 py-1 w-max">
            <button onClick={() => setActiveTab('kpis')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'kpis' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>1. Synthèse Commande</button>
            <button onClick={() => setActiveTab('lignes')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'lignes' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>2. Suivi Détaillé (Lots)</button>
            <button onClick={() => setActiveTab('revue')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'revue' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>3. Revue de Commande</button>
            <button onClick={() => setActiveTab('tiers')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'tiers' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>4. Éditer la Fiche {isClient ? 'Client' : 'Fournisseur'}</button>
          </div> 
          
          <div className="flex gap-2 pb-1">
            {cmdData?.relatedCmds?.map((rc: any) => (
              <button key={rc.id} onClick={() => router.push(`/${slugOrId}/commandes/${rc.id}`)} className="h-6 px-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:bg-indigo-100 rounded text-[10px] font-bold flex items-center gap-1 transition-colors">
                <Repeat size={11} /> Switch {rc.type_commande === 'CLIENT' ? 'Client' : 'Fournisseur'}
              </button>
            ))}
          </div>
        </div>       
      </div>

      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "Montant Global", v: `${calculsFT.total.toLocaleString()} €`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" },
               { l: "Date Planifiée", v: form.date_livraison_prevue ? new Date(form.date_livraison_prevue).toLocaleDateString('fr-FR') : '—', ic: <Calendar size={16} />, c: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" },
               { l: "Lots validés", v: `${lignes.length} Lots`, ic: <Target size={16} />, c: colorMargeCard },
               { l: "Score Revue", v: scoreRevue.decision === 'N/A' ? 'N/A' : `${scoreRevue.decision} (${scoreRevue.pourcent.toFixed(0)}%)`, ic: <CheckSquare size={16} />, c: scoreRevue.decision === 'Conforme' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' : scoreRevue.decision === 'Partiellement conforme' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' : scoreRevue.decision === 'N/A' ? 'text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' }
            ].map((w, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md grid grid-cols-5 gap-3 shadow-xs">
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Statut</label><select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 font-semibold focus:outline-none">{STATUTS_COMMANDE.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">N° Commande</label><input type="text" value={form.numero_commande} onChange={e => setForm({...form, numero_commande: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">{isClient ? 'Date de Réception' : 'Date d\'Émission'}</label><input type="date" value={form.date_commande} onChange={e => setForm({...form, date_commande: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Livraison Prévue</label><input type="date" value={form.date_livraison_prevue} onChange={e => setForm({...form, date_livraison_prevue: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Validation PTF</label><input type="date" value={form.date_validation_ptf} disabled className="w-full h-7 px-2 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-400 dark:text-slate-500" /></div>
            
            <div className="col-span-5 mt-2">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Titre de la commande</label>
              <input type="text" value={form.titre_commande} onChange={e => setForm({...form, titre_commande: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200" />
            </div>
            <div className="col-span-5 mt-1">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Commentaires & Suivi Logistique</label>
              <textarea value={form.commentaire} onChange={e => setForm({...form, commentaire: e.target.value})} rows={3} placeholder="Saisir l'historique d'avancement, le suivi de livraison..." className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[10px] focus:outline-none text-slate-800 dark:text-slate-200" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lignes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md space-y-4 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-slate-200 text-[10px] uppercase">Lots constituants la commande</h4><button type="button" onClick={() => setLignes([...lignes, { num_lot: `Lot ${lignes.length+1}`, designation: "", quantite: 1, montant_unitaire: 0, date_livraison: "" }])} className="text-blue-600 hover:underline text-[9px]">+ Ajouter une ligne</button></div>
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr><th className="p-1 w-1/12">N° Lots</th><th className="p-1 w-3/12">Désignation lots</th><th className="p-1 w-1/12">Quantité</th><th className="p-1 w-2/12">Montant unitaire</th><th className="p-1 w-2/12">Date de livraison</th><th className="p-1 w-2/12">Montant total</th><th className="p-1 w-1/12"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px] text-slate-700 dark:text-slate-300">
                  {lignes.map((l, idx) => (
                    <tr key={idx}>
                      <td className="p-1"><input value={l.num_lot} onChange={e => { const n = [...lignes]; n[idx].num_lot = e.target.value; setLignes(n); }} className="w-full bg-transparent font-mono focus:outline-none text-slate-800 dark:text-slate-200" /></td>
                      <td className="p-1"><input value={l.designation} onChange={e => { const n = [...lignes]; n[idx].designation = e.target.value; setLignes(n); }} className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-200" /></td>
                      <td className="p-1"><input type="number" value={l.quantite || ''} onChange={e => { const n = [...lignes]; n[idx].quantite = Number(e.target.value); setLignes(n); }} className="w-full bg-transparent font-mono focus:outline-none text-slate-800 dark:text-slate-200" /></td>
                      <td className="p-1"><input type="number" value={l.montant_unitaire || ''} onChange={e => { const n = [...lignes]; n[idx].montant_unitaire = Number(e.target.value); setLignes(n); }} className="w-full bg-transparent font-mono focus:outline-none text-slate-800 dark:text-slate-200" /></td>
                      <td className="p-1"><input type="date" value={l.date_livraison || ''} onChange={e => { const n = [...lignes]; n[idx].date_livraison = e.target.value; setLignes(n); }} className="w-full bg-transparent font-mono focus:outline-none text-slate-800 dark:text-slate-200" /></td>
                      <td className="p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{(Number(l.quantite || 0) * Number(l.montant_unitaire || 0)).toLocaleString()} €</td>
                      <td className="p-1 text-center"><button type="button" onClick={() => setLignes(lignes.filter((_, i) => i !== idx))} className="text-red-500">✕</button></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={5} className="p-2 text-[9px] uppercase text-right text-slate-800 dark:text-slate-200">Montant total de la commande :</td>
                    <td colSpan={2} className="p-2 font-mono text-emerald-600 dark:text-emerald-400 text-[12px]">{calculsFT.total.toLocaleString()} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-3 items-end pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date de la revue</label>
              <input type="date" value={dateRevue} onChange={e => setDateRevue(e.target.value)} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" />
            </div>
            <div className="col-span-4">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Commentaire Général</label>
              <input type="text" value={commGeneralRevue} onChange={e => setCommGeneralRevue(e.target.value)} placeholder="Synthèse des arbitrages contractuels..." className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-[10px] text-slate-800 dark:text-slate-200" />
            </div>
            <div className={`col-span-1 border rounded h-8 flex flex-col justify-center items-center font-mono font-bold text-[11px] shadow-xs ${currentValColor(scoreRevue.decision)}`}>
              <span>{scoreRevue.decision === 'N/A' ? 'N/A' : `${scoreRevue.decision} (${scoreRevue.pourcent.toFixed(0)}%)`}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500 dark:text-slate-400">
                <tr><th className="p-2 w-2/5">Point à contrôler</th><th className="p-2 w-1/5 text-center">Conformité</th><th className="p-2 w-2/5">Justifications / Commentaires Écrits</th></tr>
              </thead>
              <tbody className="text-[10px] divide-y divide-slate-100 dark:divide-slate-800">
                {CRITERES_REVUE.map(c => {
                  const val = critereVals[c] || "NA";
                  
                  return (
                    <tr key={c} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2 text-slate-700 dark:text-slate-300 font-medium">{c}</td>
                      <td className="p-1 text-center">
                        <select 
                          value={val} 
                          onChange={e => setCritereVals({...critereVals, [c]: e.target.value})} 
                          className={`w-full max-w-[140px] h-7 px-1 mx-auto border rounded text-[10px] font-bold focus:outline-none transition-all ${currentValColor(val)}`}
                        >
                          <option value="NA">NA</option>
                          <option value="Conforme">Conforme</option>
                          <option value="Partiellement conforme">Partiellement conforme</option>
                          <option value="Non conforme">Non conforme</option>
                        </select>
                      </td>
                      <td className="p-1">
                        <input type="text" value={critereComms[c] || ""} onChange={e => setCritereCommentaires({...critereComms, [c]: e.target.value})} placeholder="Saisir l'observation..." className="w-full h-6 px-1.5 bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-950 rounded text-[9.5px] text-slate-800 dark:text-slate-200" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tiers' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs max-w-2xl">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-600"><Info size={16} /></div>
            <h3 className="text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200">Édition de la fiche {isClient ? 'Client' : 'Fournisseur'}</h3>
          </div>

          <div className="grid grid-cols-6 gap-3 text-[11px]">
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nom complet / Raison Sociale *</label>
              <input value={tiersForm.name || ""} onChange={e => setTiersForm({...tiersForm, name: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Secteur d'activité</label>
              <input value={tiersForm.sector || ""} onChange={e => setTiersForm({...tiersForm, sector: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-4">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Adresse (N° et rue)</label>
              <input value={tiersForm.address || ""} onChange={e => setTiersForm({...tiersForm, address: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Code Postal</label>
              <input value={tiersForm.zip || ""} onChange={e => setTiersForm({...tiersForm, zip: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Ville</label>
              <input value={tiersForm.city || ""} onChange={e => setTiersForm({...tiersForm, city: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Pays</label>
              <input value={tiersForm.country || ""} onChange={e => setTiersForm({...tiersForm, country: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Nom complet du contact</label>
              <input value={tiersForm.contact || ""} onChange={e => setTiersForm({...tiersForm, contact: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Service concerné</label>
              <input value={tiersForm.service || ""} onChange={e => setTiersForm({...tiersForm, service: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Rôle du contact</label>
              <input value={tiersForm.contact_role || ""} onChange={e => setTiersForm({...tiersForm, contact_role: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Adresse e-mail de contact</label>
              <input type="email" value={tiersForm.email || ""} onChange={e => setTiersForm({...tiersForm, email: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">N° Téléphone</label>
              <input type="tel" value={tiersForm.phone || ""} onChange={e => setTiersForm({...tiersForm, phone: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-700 dark:text-slate-300 focus:outline-none" />
            </div>
            <div className="col-span-6">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Commentaires / Notes de suivi</label>
              <textarea value={tiersForm.notes || ""} onChange={e => setTiersForm({...tiersForm, notes: e.target.value})} rows={2} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none resize-none text-[10px]" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <span className="text-[9px] italic text-slate-400">Cliquez sur "Enregistrer la commande" (en haut à droite) pour sauvegarder les modifications du tiers.</span>
          </div>
        </div>
      )}
    </div>
  );
}