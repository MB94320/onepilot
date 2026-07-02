"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Save, DollarSign, Calendar, TrendingUp, Award, CheckSquare, FileText
} from "lucide-react";
import { useRouter } from "next/navigation";

const supabase = createClient();
const STATUTS_OFFRE = ['NoGo', 'A faire', 'En cours', 'Attente retour client', 'Validation client', 'Refus client'];

const STATUT_LABELS: Record<string, string> = {
  'A faire': 'À faire', 'En cours': 'En cours', 'Attente retour client': 'Attente retour',
  'Validation client': 'Validé Client', 'Refus client': 'Refusé Client', 'NoGo': 'No-Go'
};

export default function OffreIndividuellePage({ params }: { params: Promise<{ orgId: string; id: string }> }) {
  const { orgId: slugOrId, id: offreId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'kpis' | 'ft' | 'gonogo'>('kpis');

  const [statutOffre, setStatutOffre] = useState("A faire");
  const [datePrev, setDatePrev] = useState("");
  const [dateDiff, setDateDiff] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [noteOffre, setNoteOffre] = useState("");

  const [gngForm, setGngForm] = useState<any>({
    num_cl_gonogo: "", client_nom_service: "", intitule_travaux: "", localisation_travaux: "",
    interlocuteur_technique: "", interlocuteur_achat: "", commentaires_opportunite: "", date_passage_gonogo: "",
    critere_interet_strategique: "NA", critere_importance_projet: "NA", critere_volume_annuel: "NA",
    critere_existence_budget: "NA", critere_societes_concurrentes: "NA", critere_projets_similaires: "NA",
    critere_export_controle: "NA", score_ca_conforme: "NA", score_marge_conforme: "NA", score_risque_maitrise: "NA",
    score_competences_internes: "NA", score_charge_capacite: "NA", score_alignement_technique: "NA", score_coherence_delais: "NA",
    comm_interet_strategique: "", comm_importance_projet: "", comm_volume_annuel: "", comm_existence_budget: "",
    comm_societes_concurrentes: "", comm_projets_similaires: "", comm_export_controle: "", comm_ca_conforme: "",
    comm_marge_conforme: "", comm_risque_maitrise: "", comm_competences_internes: "", comm_charge_capacite: "",
    comm_alignement_technique: "", comm_coherence_delais: "",
    // Variables complémentaires pour couvrir l'intégralité des 27 critères
    critere_mode_engagement: "NA", critere_nearshore_offshore: "NA", critere_duree_travaux: "NA",
    info_nb_ressources: "NA", info_potentiel_st: "NA", info_couts_avv: "NA", info_pourcent_risques: "NA",
    info_liste_penalites: "NA", info_limites_responsabilite: "NA", info_ref_projet: "NA", info_num_ptf: "NA",
    info_conformite_besoin: "NA", info_relecture_offre: "NA",
    comm_mode_engagement: "", comm_nearshore_offshore: "", comm_duree_travaux: "", comm_nb_ressources: "",
    comm_potentiel_st: "", comm_couts_avv: "", comm_pourcent_risques: "", comm_liste_penalites: "",
    comm_limites_responsabilite: "", comm_ref_projet: "", comm_num_ptf: "", comm_conformite_besoin: "",
    comm_relecture_offre: ""
  });

  const [lignesCouts, setLignesCouts] = useState<any[]>([]);
  const [lignesAchats, setLignesAchats] = useState<any[]>([]);
  const [lignesVentes, setLignesVentes] = useState<any[]>([]);

  const { data: offreData, refetch } = useQuery({
    queryKey: ['offre-detail-secure', offreId],
    queryFn: async () => {
      const { data: dOffre } = await (supabase.from('offres' as any).select('*').eq('id', offreId).single() as any);
      if (!dOffre) return null;

      const { data: dProspect } = await (supabase.from('prospects' as any).select('id, titre, opp_number, commercial_id, client_id').eq('id', dOffre.prospect_id).single() as any);
      const { data: dClient } = await (supabase.from('clients' as any).select('name').eq('id', dProspect?.client_id).single() as any);
      const { data: dGng } = await (supabase.from('offres_gonogo' as any).select('*').eq('offre_id', offreId) as any);
      const { data: dFoot } = await (supabase.from('offres_fiche_technique' as any).select('*').eq('offre_id', offreId) as any);

      return {
        ...dOffre,
        prospects: dProspect ? { ...dProspect, clients: dClient } : null,
        offres_gonogo: dGng || [],
        offres_fiche_technique: dFoot || []
      };
    }
  });

  useEffect(() => {
    if (offreData) {
      setStatutOffre(offreData.statut_offre || 'A faire');
      setDatePrev(offreData.date_diffusion_previsionnelle || "");
      setDateDiff(offreData.date_diffusion || "");
      setDateVal(offreData.date_validation_client || "");
      setNoteOffre(offreData.commentaire || "");

      if (offreData.offres_gonogo?.[0]) setGngForm(offreData.offres_gonogo[0]);
      
      const ft = offreData.offres_fiche_technique?.[0];
      if (ft) {
        setLignesCouts(ft.lignes_analyse_couts || []);
        setLignesAchats(ft.lignes_frais_annexes || []);
        setLignesVentes(ft.lignes_prix_vente || []);
      }
    }
  }, [offreData]);

  const calculsFT = useMemo(() => {
    let totalJours = 0, coutsRessources = 0;
    lignesCouts.forEach(l => { totalJours += Number(l.temps || 0); coutsRessources += Number(l.temps || 0) * Number(l.taux || 0); });
    let coutsAchats = 0; lignesAchats.forEach(l => { coutsAchats += Number(l.qte || 0) * Number(l.pu || 0); });
    let caTotal = 0; lignesVentes.forEach(l => { caTotal += Number(l.temps || 0) * Number(l.pu || 0); });
    const coutsGlobal = coutsRessources + coutsAchats;
    const margePourcent = caTotal > 0 ? ((caTotal - coutsGlobal) / caTotal) * 100 : 0;
    return { totalJours, coutsRessources, coutsAchats, caTotal, coutsGlobal, margePourcent };
  }, [lignesCouts, lignesAchats, lignesVentes]);

  // CORRECTION 1 : CALCUL DU GO/NOGO EXHAUSTIF SUR LES 27 CRITÈRES (SEUIL 80%)
  const scoreGoNoGo = useMemo(() => {
    let pointsGagnes = 0, pointsTotaux = 0;
    const criteres = [
      { val: gngForm.critere_interet_strategique, poids: 3 }, { val: gngForm.critere_importance_projet, poids: 1 },
      { val: gngForm.critere_volume_annuel, poids: 1 }, { val: gngForm.critere_existence_budget, poids: 1 },
      { val: gngForm.critere_societes_concurrentes, poids: 1 }, { val: gngForm.critere_projets_similaires, poids: 1 },
      { val: gngForm.critere_export_controle, poids: 1 }, { val: gngForm.score_alignement_technique, poids: 2 },
      { val: gngForm.score_coherence_delais, poids: 2 }, { val: gngForm.score_competences_internes, poids: 2 },
      { val: gngForm.score_charge_capacite, poids: 2 }, { val: gngForm.critere_mode_engagement, poids: 1 },
      { val: gngForm.critere_nearshore_offshore, poids: 1 }, { val: gngForm.critere_duree_travaux, poids: 1 },
      { val: gngForm.score_ca_conforme, poids: 3 }, { val: gngForm.score_marge_conforme, poids: 3 },
      { val: gngForm.score_risque_maitrise, poids: 3 }, { val: gngForm.info_nb_ressources, poids: 2 },
      { val: gngForm.info_potentiel_st, poids: 2 }, { val: gngForm.info_couts_avv, poids: 2 },
      { val: gngForm.info_pourcent_risques, poids: 2 }, { val: gngForm.info_liste_penalites, poids: 2 },
      { val: gngForm.info_limites_responsabilite, poids: 2 }, { val: gngForm.info_ref_projet, poids: 1 },
      { val: gngForm.info_num_ptf, poids: 1 }, { val: gngForm.info_conformite_besoin, poids: 2 },
      { val: gngForm.info_relecture_offre, poids: 2 }
    ];
    criteres.forEach(c => {
      if (c.val === 'OK') { pointsGagnes += (2 * c.poids); pointsTotaux += (2 * c.poids); }
      if (c.val === 'NOK') { pointsTotaux += (2 * c.poids); }
    });
    const pourcent = pointsTotaux > 0 ? (pointsGagnes / pointsTotaux) * 100 : 0;
    return { pourcent, decision: pourcent >= 80 ? 'GO' : 'NoGo' };
  }, [gngForm]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!confirm("Voulez-vous valider et enregistrer les modifications de l'offre ?")) return;

      await (supabase.from('offres' as any).update({
        statut_offre: statutOffre,
        date_diffusion_previsionnelle: datePrev || null,
        date_diffusion: dateDiff || null,
        date_validation_client: dateVal || null,
        commentaire: noteOffre || null
      } as any).eq('id', offreId) as any);

      if (offreData?.prospect_id) {
        let prospectStatus = 'qualification';
        if (statutOffre === 'Validation client') prospectStatus = 'gagné';
        else if (statutOffre === 'Refus client') prospectStatus = 'perdu';
        else if (statutOffre === 'NoGo') prospectStatus = 'NoGo';
        await (supabase.from('prospects' as any).update({ statut: prospectStatus } as any).eq('id', offreData.prospect_id) as any);
      }

      await (supabase.from('offres_gonogo' as any).update({
        ...gngForm,
        score_global_pourcent: scoreGoNoGo.pourcent,
        decision_calculee: scoreGoNoGo.decision
      } as any).eq('offre_id', offreId) as any);

      await (supabase.from('offres_fiche_technique' as any).update({
        total_jours_charge: calculsFT.totalJours,
        total_couts_ressources: calculsFT.coutsRessources,
        total_couts_achats: calculsFT.coutsAchats,
        total_prix_vente_ca: calculsFT.caTotal,
        marge_brute_calculee_pourcent: calculsFT.margePourcent,
        lignes_analyse_couts: lignesCouts,
        lignes_frais_annexes: lignesAchats,
        lignes_prix_vente: lignesVentes
      } as any).eq('offre_id', offreId) as any);

      alert("Sauvegarde validée.");
      qc.invalidateQueries({ queryKey: ['offres-flat-pipeline', slugOrId] });
      refetch();
    }
  });

  const oppChrono = offreData?.prospects?.opp_number ? `OPP-2026-${String(offreData.prospects.opp_number).padStart(4, '0')}` : '—';
  const colorMargeCard = calculsFT.margePourcent < 20 ? 'text-rose-600 bg-rose-500/10 border-rose-200' : calculsFT.margePourcent > 30 ? 'text-emerald-600 bg-emerald-500/10 border-emerald-200' : 'text-amber-600 bg-amber-500/10 border-amber-200';

  // CORRECTION 2 : PDF FICHE TECHNIQUE PROFESSIONNEL EXPLOITABLE
  const generateFT_PDF = () => {
    let coutsHtml = lignesCouts.map(l => `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.lot}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.des}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.type}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.temps} J</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.taux} €</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(Number(l.temps)*Number(l.taux)).toLocaleString()} €</td></tr>`).join('');
    let achatsHtml = lignesAchats.map(l => `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.des}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.qte}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.pu} €</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(Number(l.qte)*Number(l.pu)).toLocaleString()} €</td></tr>`).join('');
    let ventesHtml = lignesVentes.map(l => `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.lot}</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.temps} J</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${l.pu} €</td><td style="padding:8px; border-bottom:1px solid #e2e8f0;">${(Number(l.temps)*Number(l.pu)).toLocaleString()} €</td></tr>`).join('');

    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Fiche Technique Financière - ${oppChrono}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 40px; color: #334155; font-size: 12px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #0f172a; }
            .header h2 { margin: 0; font-size: 16px; color: #3b82f6; text-transform: uppercase; }
            .info { margin-bottom: 30px; font-size: 14px; }
            .widgets { display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 30px; text-align: center; }
            .widget-val { font-size: 18px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: left; }
            th { padding: 8px; border: 1px solid #cbd5e1; background: #f1f5f9; text-transform: uppercase; font-size: 10px; }
            .total-row td { font-weight: bold; background: #f8fafc; padding: 8px; border: 1px solid #cbd5e1; }
            .section-title { font-size: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>ONEPILOT</h1><span style="font-size:10px;">Plateforme d'Ingénierie Commerciale</span></div>
            <h2>Fiche Technique Financière</h2>
          </div>
          <div class="info">
            <p style="margin-bottom: 5px;"><strong>Dossier :</strong> ${offreData?.prospects?.titre || '—'} (${oppChrono})</p>
            <p style="margin-bottom: 5px;"><strong>Client :</strong> ${offreData?.prospects?.clients?.name || '—'}</p>
          </div>
          
          <div class="widgets">
            <div><strong>CA Global :</strong><br/><div class="widget-val" style="color:#16a34a;">${calculsFT.caTotal.toLocaleString()} €</div></div>
            <div><strong>Coût de Revient :</strong><br/><div class="widget-val" style="color:#e11d48;">${calculsFT.coutsGlobal.toLocaleString()} €</div></div>
            <div><strong>Marge Brute :</strong><br/><div class="widget-val" style="color:#0f172a;">${calculsFT.margePourcent.toFixed(1)} %</div></div>
          </div>

          <div class="section-title">1. Coûts Ressources</div>
          <table>
            <tr><th>N° Lot</th><th>Désignation</th><th>Métier</th><th>Temps (J)</th><th>Taux (€/j)</th><th>Coût Lot</th></tr>
            ${coutsHtml}
            <tr class="total-row"><td colspan="5">TOTAL COÛTS RESSOURCES</td><td style="color:#e11d48;">${calculsFT.coutsRessources.toLocaleString()} €</td></tr>
          </table>

          <div class="section-title">2. Frais Annexes & Achats</div>
          <table>
            <tr><th>Désignation</th><th>Quantité</th><th>P.U (€)</th><th>Coût Achat</th></tr>
            ${achatsHtml}
            <tr class="total-row"><td colspan="3">TOTAL FRAIS</td><td style="color:#e11d48;">${calculsFT.coutsAchats.toLocaleString()} €</td></tr>
          </table>

          <div class="section-title">3. Prix de Vente Facturable (CA)</div>
          <table>
            <tr><th>N° Lot Facturé</th><th>Temps (J)</th><th>P.U Vente (€)</th><th>Prix Vente Total</th></tr>
            ${ventesHtml}
            <tr class="total-row"><td colspan="3">CA TOTAL</td><td style="color:#16a34a;">${calculsFT.caTotal.toLocaleString()} €</td></tr>
          </table>

          <div class="footer">
            N° FT : ${offreData?.offres_fiche_technique?.[0]?.num_ft || '—'} | Titre : ${offreData?.prospects?.titre || '—'} | Entreprise : ${offreData?.prospects?.clients?.name || '—'} | Généré le ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </body>
      </html>
    `);
    w.document.close(); w.print();
  };

  // MODIFICATION 3 : GENERATION PDF GNG EXPLOITABLE 100% AVEC LES 27 CRITERES
  const generateGNG_PDF = () => {
    const listCriteres = [
      { t: "I. Informations Client & Opportunités" },
      { key: 'critere_interet_strategique', txt: 'Intérêt stratégique global de l’offre', p: 3 },
      { key: 'critere_importance_projet', txt: 'Importance du projet pour le client', p: 1 },
      { key: 'critere_volume_annuel', txt: 'Volume d’affaires potentiel annuel', p: 1 },
      { key: 'critere_existence_budget', txt: 'Existence du budget chez le client', p: 1 },
      { key: 'critere_societes_concurrentes', txt: 'Cartographie des concurrents', p: 1 },
      { key: 'critere_projets_similaires', txt: 'Identification des projets similaires', p: 1 },
      { key: 'critere_export_controle', txt: 'Vérification réglementaire (Habilitations)', p: 1 },
      { t: "II. Ingénierie Opérationnelle & Disponibilité" },
      { key: 'score_alignement_technique', txt: 'Alignement technique de la solution', p: 2 },
      { key: 'score_coherence_delais', txt: 'Cohérence des délais exigés', p: 2 },
      { key: 'score_competences_internes', txt: 'Disponibilité de la matrice de compétences', p: 2 },
      { key: 'score_charge_capacite', txt: 'Adéquation charge / Capacité des équipes', p: 2 },
      { key: 'critere_mode_engagement', txt: 'Mode d’engagement contractuel', p: 1 },
      { key: 'critere_nearshore_offshore', txt: 'Possibilité de Nearshore / Offshore', p: 1 },
      { key: 'critere_duree_travaux', txt: 'Durée prévisionnelle des travaux', p: 1 },
      { t: "III. Analyse Financière & Validation de l'Offre" },
      { key: 'score_ca_conforme', txt: 'Adéquation du Chiffre d’Affaires attendu', p: 3 },
      { key: 'score_marge_conforme', txt: 'Respect du taux de Marge brute minimum', p: 3 },
      { key: 'score_risque_maitrise', txt: 'Maîtrise des risques et pénalités', p: 3 },
      { key: 'info_nb_ressources', txt: 'Nombre de ressources estimées pour le run', p: 2 },
      { key: 'info_potentiel_st', txt: 'Potentiel recours à la sous-traitance', p: 2 },
      { key: 'info_couts_avv', txt: 'Coûts engagés (y compris Avant-vente)', p: 2 },
      { key: 'info_pourcent_risques', txt: '% Risques estimés par rapport aux coûts', p: 2 },
      { key: 'info_liste_penalites', txt: 'Analyse de la liste des pénalités projet', p: 2 },
      { key: 'info_limites_responsabilite', txt: 'Limites de responsabilité identifiées', p: 2 },
      { key: 'info_ref_projet', txt: 'Références projets incluses dans la PTF', p: 1 },
      { key: 'info_num_ptf', txt: 'Génération du numéro de la PTF', p: 1 },
      { key: 'info_conformite_besoin', txt: 'Conformité de l\'offre vs besoin', p: 2 },
      { key: 'info_relecture_offre', txt: 'Relecture et validation interne de l\'offre', p: 2 }
    ];

    let tableHtml = "";
    listCriteres.forEach(c => {
      if (c.t) {
        tableHtml += `<tr style="background:#f1f5f9; font-weight:bold;"><td colspan="4" style="padding:8px; border:1px solid #cbd5e1; color:#3b82f6;">${c.t}</td></tr>`;
      } else {
        const val = gngForm[c.key as string] || 'NA';
        const commKey = `comm_${(c.key as string).replace('critere_','').replace('score_','').replace('info_','')}`;
        const comm = gngForm[commKey] || '';
        tableHtml += `<tr><td style="padding:8px; border:1px solid #cbd5e1;">${c.txt}</td><td style="padding:8px; border:1px solid #cbd5e1; text-align:center;">Poids ${c.p}</td><td style="padding:8px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:${val === 'OK' ? '#16a34a' : val === 'NOK' ? '#e11d48' : '#64748b'}">${val}</td><td style="padding:8px; border:1px solid #cbd5e1;">${comm}</td></tr>`;
      }
    });

    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Grille Go/NoGo - ${oppChrono}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 40px; color: #334155; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 20px; color: #0f172a; }
            .header h2 { margin: 0; font-size: 16px; color: #3b82f6; text-transform: uppercase; }
            .info { margin-bottom: 25px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; text-align: left; }
            th { background: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 9px; padding: 8px; border: 1px solid #cbd5e1; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 9px; text-align: center; color: #94a3b8; }
            .score-box { text-align: center; padding: 20px; border: 2px solid ${scoreGoNoGo.decision === 'GO' ? '#16a34a' : '#e11d48'}; border-radius: 5px; margin-bottom: 30px; background: ${scoreGoNoGo.decision === 'GO' ? '#f0fdf4' : '#fff1f2'}; }
            .score-box h3 { margin: 0; color: ${scoreGoNoGo.decision === 'GO' ? '#16a34a' : '#e11d48'}; font-size: 24px; }
            .context-box { background: #f8fafc; padding: 15px; border-radius: 5px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>ONEPILOT</h1><span style="font-size:10px; color:#64748b;"></span></div>
            <h2>CHECK-LIST GO / NO-GO</h2>
          </div>
          
          <div class="info">
            <p style="margin-bottom: 5px;"><strong>Dossier :</strong> ${offreData?.prospects?.titre || '—'} (${oppChrono})</p>
            <p style="margin-bottom: 5px;"><strong>Client :</strong> ${offreData?.prospects?.clients?.name || '—'}</p>
            <p style="margin-bottom: 5px;"><strong>N° CL :</strong> ${gngForm.num_cl_gonogo || '—'}</p>
            <p style="margin-bottom: 5px;"><strong>Date de Passage :</strong> ${gngForm.date_passage_gonogo || '—'}</p>
          </div>

          <div class="context-box">
            <p style="margin:0; font-weight:bold; font-size:12px;">Synthèse Contextuelle d'Arbitrage :</p>
            <p style="margin-top:8px; font-style:italic; font-size:11px;">${gngForm.commentaires_opportunite || 'Aucune synthèse saisie.'}</p>
          </div>

          <div class="score-box">
            <h3>ARBITRAGE FINAL : ${scoreGoNoGo.decision}</h3>
            <p style="margin:8px 0 0 0; font-weight:bold; font-size:14px;">Score de Conformité : ${scoreGoNoGo.pourcent.toFixed(0)} %</p>
          </div>

          <table>
            <tr><th>Critère Stratégique d'Analyse</th><th style="text-align:center; width:60px;">Pondération</th><th style="text-align:center; width:80px;">Évaluation</th><th>Justifications / Commentaires Écrits</th></tr>
            ${tableHtml}
          </table>
        </body>
      </html>
    `);
    w.document.close(); w.print();
  };

  return (
    <div className="space-y-4 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none relative">
      
      {/* SECTION HEADER STICKY (MODIFICATION 4 : Abaissement du Z-index de 40 à 10 pour le menu Profil) */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex justify-between items-center h-8 pt-1">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 focus:outline-none"><ArrowLeft size={14}/></button>
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[12px]">{offreData?.prospects?.titre || "Dossier Offre"}</span>
            <span className="font-mono text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{oppChrono}</span>
          </div>
          <div className="flex gap-2">
            {activeTab === 'ft' && <button onClick={generateFT_PDF} className="h-6 bg-red-700 hover:bg-red-800 text-white px-2.5 rounded text-[10px] font-medium border border-red-800 transition-colors"><FileText size={11} className="inline mr-1"/> Générer la FT en PDF</button>}
            {activeTab === 'gonogo' && <button onClick={generateGNG_PDF} className="h-6 bg-red-700 hover:bg-red-800 text-white px-2.5 rounded text-[10px] font-medium border border-red-800 transition-colors"><FileText size={11} className="inline mr-1"/> Générer la CL Go/NoGo en PDF</button>}
            <button onClick={() => saveMutation.mutate()} className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-colors"><Save size={12}/> Enregistrer l'Ingénierie</button>
          </div>
        </div>

        {/* MODIFICATION 3 : Encadré bg-slate-100, bordures et padding supprimés autour des boutons de tabs */}
        <div className="flex gap-1 py-1 w-max">
          <button onClick={() => setActiveTab('kpis')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'kpis' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>1. Synthèse Générale</button>
          <button onClick={() => setActiveTab('ft')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'ft' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>2. Fiche Technique Financière</button>
          <button onClick={() => setActiveTab('gonogo')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all ${activeTab === 'gonogo' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 shadow-sm font-semibold" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>3. Grille Évaluation Go/NoGo</button>
        </div>        
      </div>

      {/* COMPOSANT 1 : SYNTHESE GENERALE */}
      {activeTab === 'kpis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "Chiffre d’Affaires", v: `${calculsFT.caTotal.toLocaleString()} €`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Coût de Revient", v: `${calculsFT.coutsGlobal.toLocaleString()} €`, ic: <TrendingUp size={16} />, c: "text-rose-600 bg-rose-500/10" },
               { l: "Marge brute %", v: `${calculsFT.margePourcent.toFixed(1)} %`, ic: <span className="font-bold leading-none text-[16px]">%</span>, c: colorMargeCard },
               { l: "Arbitrage Go/NoGo", v: `${scoreGoNoGo.decision} (${scoreGoNoGo.pourcent.toFixed(0)}%)`, ic: <CheckSquare size={16} />, c: scoreGoNoGo.decision === 'GO' ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10' }
            ].map((w, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md grid grid-cols-5 gap-3">
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Statut de la Réponse Offre</label><select value={statutOffre} onChange={e => setStatutOffre(e.target.value)} className="w-full h-7 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 font-semibold focus:outline-none">{STATUTS_OFFRE.map(s => <option key={s} value={s}>{STATUT_LABELS[s] || s}</option>)}</select></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date de passage gonogo</label><input type="date" value={gngForm.date_passage_gonogo || ""} onChange={e => setGngForm({...gngForm, date_passage_gonogo: e.target.value})} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date Cible PTF</label><input type="date" value={datePrev} onChange={e => setDatePrev(e.target.value)} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date Diffusion Réelle PTF</label><input type="date" value={dateDiff} onChange={e => setDateDiff(e.target.value)} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" /></div>
            <div><label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date Validation Client</label><input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" /></div>
            
            <div className="col-span-5 mt-2">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Commentaires Globaux & Revues Internes</label>
              <textarea value={noteOffre} onChange={e => setNoteOffre(e.target.value)} rows={4} placeholder="Saisir le compte-rendu des réunions ou l'historique d'avancement..." className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[10px] focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* COMPOSANT 2 : FICHE TECHNIQUE FINANCIÈRE */}
      {activeTab === 'ft' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "Chiffre d’Affaires", v: `${calculsFT.caTotal.toLocaleString()} €`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Coût de Revient", v: `${calculsFT.coutsGlobal.toLocaleString()} €`, ic: <TrendingUp size={16} />, c: "text-rose-600 bg-rose-500/10" },
               { l: "Marge brute %", v: `${calculsFT.margePourcent.toFixed(1)} %`, ic: <span className="font-bold leading-none text-[16px]">%</span>, c: colorMargeCard },
               { l: "Arbitrage", v: `${scoreGoNoGo.decision} (${scoreGoNoGo.pourcent.toFixed(0)}%)`, ic: <CheckSquare size={16} />, c: scoreGoNoGo.decision === 'GO' ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10' }
            ].map((w, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-slate-200 text-[9.5px] uppercase tracking-wide">1ère partie : Analyse des Coûts Ressources</h4><button type="button" onClick={() => setLignesCouts([...lignesCouts, { lot: `Lot ${lignesCouts.length+1}`, des: "", type: "", temps: 0, taux: 0 }])} className="text-blue-600 hover:underline text-[9px]">+ Ajouter un lot</button></div>
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr><th className="p-1 w-1/12">N° Lot</th><th className="p-1 w-3/12">Désignation</th><th className="p-1 w-2/12">Métier</th><th className="p-1 w-1/12">Temps (J)</th><th className="p-1 w-2/12">Taux (€/j)</th><th className="p-1 w-2/12">Coût Lot</th><th className="p-1 w-1/12"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                  {lignesCouts.map((l, idx) => (
                    <tr key={idx}>
                      <td className="p-1"><input value={l.lot} onChange={e => { const n = [...lignesCouts]; n[idx].lot = e.target.value; setLignesCouts(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1"><input value={l.des} onChange={e => { const n = [...lignesCouts]; n[idx].des = e.target.value; setLignesCouts(n); }} className="w-full bg-transparent focus:outline-none" /></td>
                      <td className="p-1"><input value={l.type} onChange={e => { const n = [...lignesCouts]; n[idx].type = e.target.value; setLignesCouts(n); }} className="w-full bg-transparent focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.temps || ''} onChange={e => { const n = [...lignesCouts]; n[idx].temps = Number(e.target.value); setLignesCouts(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.taux || ''} onChange={e => { const n = [...lignesCouts]; n[idx].taux = Number(e.target.value); setLignesCouts(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{(Number(l.temps || 0) * Number(l.taux || 0)).toLocaleString()} €</td>
                      <td className="p-1 text-center"><button type="button" onClick={() => setLignesCouts(lignesCouts.filter((_, i) => i !== idx))} className="text-red-500">✕</button></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="p-1 text-[9px] uppercase">Sous-total Charges :</td>
                    <td className="p-1 font-mono">{calculsFT.totalJours} J</td>
                    <td></td>
                    <td colSpan={2} className="p-1 font-mono text-blue-600">{calculsFT.coutsRessources.toLocaleString()} €</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-slate-200 text-[9.5px] uppercase tracking-wide">2ème partie : Frais Annexes & Achats</h4><button type="button" onClick={() => setLignesAchats([...lignesAchats, { des: "", qte: 1, pu: 0 }])} className="text-blue-600 hover:underline text-[9px]">+ Ajouter un achat</button></div>
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr><th className="p-1 w-5/12">Désignation</th><th className="p-1 w-2/12">Quantité</th><th className="p-1 w-2/12">P.U (€)</th><th className="p-1 w-2/12">Coût Achat</th><th className="p-1 w-1/12"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                  {lignesAchats.map((l, idx) => (
                    <tr key={idx}>
                      <td className="p-1"><input value={l.des} onChange={e => { const n = [...lignesAchats]; n[idx].des = e.target.value; setLignesAchats(n); }} className="w-full bg-transparent focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.qte || ''} onChange={e => { const n = [...lignesAchats]; n[idx].qte = Number(e.target.value); setLignesAchats(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.pu || ''} onChange={e => { const n = [...lignesAchats]; n[idx].pu = Number(e.target.value); setLignesAchats(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{(Number(l.qte || 0) * Number(l.pu || 0)).toLocaleString()} €</td>
                      <td className="p-1 text-center"><button type="button" onClick={() => setLignesAchats(lignesAchats.filter((_, i) => i !== idx))} className="text-red-500">✕</button></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="p-1 text-[9px] uppercase">Sous-total Frais :</td>
                    <td colSpan={4} className="p-1 font-mono text-blue-600">{calculsFT.coutsAchats.toLocaleString()} €</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 dark:text-slate-200 text-[9.5px] uppercase tracking-wide">3ème partie : Prix de Vente Facturable (CA)</h4><button type="button" onClick={() => setLignesVentes([...lignesVentes, { lot: `Lot ${lignesVentes.length+1}`, temps: 0, pu: 0 }])} className="text-blue-600 hover:underline text-[9px]">+ Ajouter une facturation</button></div>
              <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr><th className="p-1 w-3/12">N° Lot Facturé</th><th className="p-1 w-3/12">Temps (J)</th><th className="p-1 w-3/12">P.U Vente (€)</th><th className="p-1 w-2/12">Prix Total</th><th className="p-1 w-1/12"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                  {lignesVentes.map((l, idx) => (
                    <tr key={idx}>
                      <td className="p-1"><input value={l.lot} onChange={e => { const n = [...lignesVentes]; n[idx].lot = e.target.value; setLignesVentes(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.temps || ''} onChange={e => { const n = [...lignesVentes]; n[idx].temps = Number(e.target.value); setLignesVentes(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1"><input type="number" value={l.pu || ''} onChange={e => { const n = [...lignesVentes]; n[idx].pu = Number(e.target.value); setLignesVentes(n); }} className="w-full bg-transparent font-mono focus:outline-none" /></td>
                      <td className="p-1 font-mono font-bold text-slate-700 dark:text-slate-300">{(Number(l.temps || 0) * Number(l.pu || 0)).toLocaleString()} €</td>
                      <td className="p-1 text-center"><button type="button" onClick={() => setLignesVentes(lignesVentes.filter((_, i) => i !== idx))} className="text-red-500">✕</button></td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                    <td colSpan={3} className="p-1 text-[9px] uppercase">Chiffre d'Affaires total :</td>
                    <td colSpan={4} className="p-1 font-mono text-emerald-600">{calculsFT.caTotal.toLocaleString()} €</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSANT 3 : GRILLE D'ÉVALUATION GO/NOGO */}
      {activeTab === 'gonogo' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "Chiffre d’Affaires", v: `${calculsFT.caTotal.toLocaleString()} €`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Coût de Revient", v: `${calculsFT.coutsGlobal.toLocaleString()} €`, ic: <TrendingUp size={16} />, c: "text-rose-600 bg-rose-500/10" },
               { l: "Marge brute %", v: `${calculsFT.margePourcent.toFixed(1)} %`, ic: <PercentIcon size={16} />, c: colorMargeCard },
               { l: "Arbitrage Go/NoGo", v: `${scoreGoNoGo.decision} (${scoreGoNoGo.pourcent.toFixed(0)}%)`, ic: <CheckSquare size={16} />, c: scoreGoNoGo.decision === 'GO' ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10' }
            ].map((w, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-3 items-end pb-3">
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Date de Passage</label>
              <input type="date" value={gngForm.date_passage_gonogo || ""} onChange={e => setGngForm({...gngForm, date_passage_gonogo: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" />
            </div>
            <div className="col-span-1">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">N° CL Go/NoGo</label>
              <input type="text" value={gngForm.num_cl_gonogo || ""} onChange={e => setGngForm({...gngForm, num_cl_gonogo: e.target.value})} placeholder="Ex: CL-001" className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono" />
            </div>
            <div className="col-span-3">
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Synthèse Contextuelle d'Arbitrage</label>
              <textarea value={gngForm.commentaires_opportunite || ""} onChange={e => setGngForm({...gngForm, commentaires_opportunite: e.target.value})} placeholder="Saisir les conclusions de la revue de comité..." rows={1} className="w-full p-2 h-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[10px] focus:outline-none" />
            </div>
            <div className={`col-span-1 border rounded h-8 flex flex-col justify-center items-center shadow-xs ${scoreGoNoGo.decision === 'GO' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20'}`}>
              <span className="text-[12px] font-bold font-mono">{scoreGoNoGo.decision} ({scoreGoNoGo.pourcent.toFixed(0)}%)</span>
            </div>
          </div>

          <div className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-500">
                <tr><th className="p-1.5 w-2/5">Critère Stratégique d'Analyse</th><th className="p-1.5 w-1/5 text-center">Évaluation</th><th className="p-1.5 w-2/5">Justifications / Commentaires Écrits</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[10px]">
                
                <tr className="bg-slate-100 dark:bg-slate-800/50 font-bold text-[9px]"><td colSpan={3} className="p-1.5 uppercase text-blue-600 dark:text-blue-400">I. Informations Client & Opportunités</td></tr>
                {[
                  { key: 'critere_interet_strategique', txt: '🔑 Intérêt stratégique global de l’offre', p: 'Poids 3', commKey: 'comm_interet_strategique' },
                  { key: 'critere_importance_projet', txt: 'Importance du projet pour le client', p: 'Poids 1', commKey: 'comm_importance_projet' },
                  { key: 'critere_volume_annuel', txt: 'Volume d’affaires potentiel annuel', p: 'Poids 1', commKey: 'comm_volume_annuel' },
                  { key: 'critere_existence_budget', txt: 'Existence du budget chez le client', p: 'Poids 1', commKey: 'comm_existence_budget' },
                  { key: 'critere_societes_concurrentes', txt: 'Cartographie des concurrents', p: 'Poids 1', commKey: 'comm_societes_concurrentes' },
                  { key: 'critere_projets_similaires', txt: 'Identification des projets similaires', p: 'Poids 1', commKey: 'comm_projets_similaires' },
                  { key: 'critere_export_controle', txt: 'Vérification réglementaire (Habilitations)', p: 'Poids 1', commKey: 'comm_export_controle' }
                ].map(c => (
                  <tr key={c.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-1.5 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="cursor-help" title={`Ce critère a une pondération de ${c.p.replace('Poids ', '')}`}>{c.txt}</span>
                        <span className="text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded shrink-0">{c.p}</span>
                      </div>
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex justify-center gap-1">
                        {[
                          { l: 'OK', c: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                          { l: 'NOK', c: 'bg-rose-100 text-rose-700 border-rose-300' },
                          { l: 'NA', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' }
                        ].map(v => (
                          <button key={v.l} type="button" onClick={() => setGngForm({...gngForm, [c.key]: v.l})} className={`px-2 py-0.5 rounded text-[8.5px] font-bold border transition-all ${gngForm[c.key] === v.l ? v.c : 'bg-white dark:bg-slate-900 text-slate-400 border-transparent opacity-60 hover:opacity-100'}`}>{v.l}</button>
                        ))}
                      </div>
                    </td>
                    <td className="p-1">
                      <input type="text" value={gngForm[c.commKey] || ""} onChange={e => setGngForm({...gngForm, [c.commKey]: e.target.value})} placeholder="Saisir la justification..." className="w-full h-6 px-1.5 bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-950 rounded text-[9.5px] text-slate-800 dark:text-slate-200" />
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-100 dark:bg-slate-800/50 font-bold text-[9px]"><td colSpan={3} className="p-1.5 uppercase text-purple-600 dark:text-purple-400">II. Ingénierie Opérationnelle & Disponibilité</td></tr>
                {[
                  { key: 'score_alignement_technique', txt: '🔑 Alignement technique de la solution', p: 'Poids 2', commKey: 'comm_alignement_technique' },
                  { key: 'score_coherence_delais', txt: '🔑 Cohérence des délais exigés', p: 'Poids 2', commKey: 'comm_coherence_delais' },
                  { key: 'score_competences_internes', txt: 'Disponibilité de la matrice de compétences', p: 'Poids 2', commKey: 'comm_competences_internes' },
                  { key: 'score_charge_capacite', txt: 'Adéquation charge / Capacité des équipes', p: 'Poids 2', commKey: 'comm_charge_capacite' },
                  { key: 'critere_mode_engagement', txt: 'Mode d’engagement contractuel', p: 'Poids 1', commKey: 'comm_mode_engagement' },
                  { key: 'critere_nearshore_offshore', txt: 'Possibilité de Nearshore / Offshore', p: 'Poids 1', commKey: 'comm_nearshore_offshore' },
                  { key: 'critere_duree_travaux', txt: 'Durée prévisionnelle des travaux', p: 'Poids 1', commKey: 'comm_duree_travaux' }
                ].map(c => (
                  <tr key={c.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-1.5 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="cursor-help" title={`Ce critère a une pondération de ${c.p.replace('Poids ', '')}`}>{c.txt}</span>
                        <span className="text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded shrink-0">{c.p}</span>
                      </div>
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex justify-center gap-1">
                        {[
                          { l: 'OK', c: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                          { l: 'NOK', c: 'bg-rose-100 text-rose-700 border-rose-300' },
                          { l: 'NA', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' }
                        ].map(v => (
                          <button key={v.l} type="button" onClick={() => setGngForm({...gngForm, [c.key]: v.l})} className={`px-2 py-0.5 rounded text-[8.5px] font-bold border transition-all ${gngForm[c.key] === v.l ? v.c : 'bg-white dark:bg-slate-900 text-slate-400 border-transparent opacity-60 hover:opacity-100'}`}>{v.l}</button>
                        ))}
                      </div>
                    </td>
                    <td className="p-1">
                      <input type="text" value={gngForm[c.commKey] || ""} onChange={e => setGngForm({...gngForm, [c.commKey]: e.target.value})} placeholder="Saisir la justification..." className="w-full h-6 px-1.5 bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-950 rounded text-[9.5px] text-slate-800 dark:text-slate-200" />
                    </td>
                  </tr>
                ))}

                <tr className="bg-slate-100 dark:bg-slate-800/50 font-bold text-[9px]"><td colSpan={3} className="p-1.5 uppercase text-emerald-600 dark:text-emerald-400">III. Analyse Financière & Validation de l'Offre</td></tr>
                {[
                  { key: 'score_ca_conforme', txt: '🔑 Adéquation du Chiffre d’Affaires attendu', p: 'Poids 3', commKey: 'comm_ca_conforme' },
                  { key: 'score_marge_conforme', txt: '🔑 Respect du taux de Marge brute minimum', p: 'Poids 3', commKey: 'comm_marge_conforme' },
                  { key: 'score_risque_maitrise', txt: '🔑 Maîtrise des risques et pénalités', p: 'Poids 3', commKey: 'comm_risque_maitrise' },
                  { key: 'info_nb_ressources', txt: 'Nombre de ressources estimées pour le run', p: 'Poids 2', commKey: 'comm_nb_ressources' },
                  { key: 'info_potentiel_st', txt: 'Potentiel recours à la sous-traitance', p: 'Poids 2', commKey: 'comm_potentiel_st' },
                  { key: 'info_couts_avv', txt: 'Coûts engagés (y compris Avant-vente)', p: 'Poids 2', commKey: 'comm_couts_avv' },
                  { key: 'info_pourcent_risques', txt: '% Risques estimés par rapport aux coûts', p: 'Poids 2', commKey: 'comm_pourcent_risques' },
                  { key: 'info_liste_penalites', txt: 'Analyse de la liste des pénalités projet', p: 'Poids 2', commKey: 'comm_liste_penalites' },
                  { key: 'info_limites_responsabilite', txt: 'Limites de responsabilité identifiées', p: 'Poids 2', commKey: 'comm_limites_responsabilite' },
                  { key: 'info_ref_projet', txt: 'Références projets incluses dans la PTF', p: 'Poids 1', commKey: 'comm_ref_projet' },
                  { key: 'info_num_ptf', txt: 'Génération du numéro de la PTF', p: 'Poids 1', commKey: 'comm_num_ptf' },
                  { key: 'info_conformite_besoin', txt: 'Conformité de l\'offre vs besoin', p: 'Poids 2', commKey: 'comm_conformite_besoin' },
                  { key: 'info_relecture_offre', txt: 'Relecture et validation interne de l\'offre', p: 'Poids 2', commKey: 'comm_relecture_offre' }
                ].map(c => (
                  <tr key={c.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-1.5 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="cursor-help" title={`Ce critère a une pondération de ${c.p.replace('Poids ', '')}`}>{c.txt}</span>
                        <span className="text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded shrink-0">{c.p}</span>
                      </div>
                    </td>
                    <td className="p-1.5 text-center">
                      <div className="flex justify-center gap-1">
                        {[
                          { l: 'OK', c: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
                          { l: 'NOK', c: 'bg-rose-100 text-rose-700 border-rose-300' },
                          { l: 'NA', c: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700' }
                        ].map(v => (
                          <button key={v.l} type="button" onClick={() => setGngForm({...gngForm, [c.key]: v.l})} className={`px-2 py-0.5 rounded text-[8.5px] font-bold border transition-all ${gngForm[c.key] === v.l ? v.c : 'bg-white dark:bg-slate-900 text-slate-400 border-transparent opacity-60 hover:opacity-100'}`}>{v.l}</button>
                        ))}
                      </div>
                    </td>
                    <td className="p-1">
                      <input type="text" value={gngForm[c.commKey] || ""} onChange={e => setGngForm({...gngForm, [c.commKey]: e.target.value})} placeholder="Saisir la justification..." className="w-full h-6 px-1.5 bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-950 rounded text-[9.5px] text-slate-800 dark:text-slate-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PercentIcon({ size }: { size: number }) {
  return <span style={{ fontSize: size }} className="font-bold leading-none">%</span>;
}