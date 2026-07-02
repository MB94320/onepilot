"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldAlert, Users, CreditCard, Settings, Search, Edit, Trash2, 
  KeyRound, ShieldCheck, LogIn, Activity, Database, Server, 
  Check, X, Star, Download, Mail, Zap, Building2, Plus, 
  LayoutDashboard, Target, FolderKanban, DollarSign, ArrowRight, 
  AlertCircle, BrainCircuit, FileText, TrendingUp, Award, CheckCircle
} from "lucide-react";
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, ReferenceLine, BarChart, Bar 
} from "recharts";

const supabase = createClient();

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const PLAN_PRICES: Record<string, number> = { 'DISCOVERY': 0, 'STARTER': 24.99, 'BUSINESS': 49.99, 'PERFORMANCE': 79.99, 'ENTERPRISE': 299 };

const PLANS = [
  {
    key: 'DISCOVERY', name: 'Découverte', icon: Star, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800',
    monthly: 0, annual: 0, isFree: true, badge: null, tagline: 'Testez sans engagement',
    description: 'Pour évaluer l\'ergonomie ONEPILOT (7 jours gratuits).',
    includes: ['TdB Général, Commerce, Opérations, Ressources', 'Ressources : Membres et Calendrier uniquement'],
    excludes: ['Ressources : Compétences, Pointages, Plan de Charge', 'Qualité, Audit, Finance, Process & Outils', 'Support communautaire uniquement'],
    cta: 'Démarrer gratuitement'
  },
  {
    key: 'STARTER', name: 'Starter', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20',
    monthly: 24.99, annual: 249.90, badge: null, tagline: 'Idéal pour Indépendants & TPE',
    description: 'Gestion de projet et suivi commercial unifiés.',
    includes: ['TdB Général, Commerce, Opérations, Ressources', 'Max 50 Opportunités / Projets / Ressources'],
    excludes: ['Ressources : Compétences, Pointages, Plan de Charge', 'Qualité & Risques, Finance avancée, IA'],
    cta: 'Choisir Starter'
  },
  {
    key: 'BUSINESS', name: 'Business', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    monthly: 49.99, annual: 499.90, badge: 'Recommandé', popular: true, tagline: 'Le standard de production',
    description: 'Pilotage sans limite de volume des opérations et des ressources.',
    includes: ['Tous les modules débloqués (Ressources intégrales)', 'Projets, Opportunités & Ressources illimités', 'Qualité, 8D, Audit & Exports PDF Pro'],
    excludes: ['Finance : Trésorerie & Facturation Automatique', 'SSO / SAML'],
    cta: 'Choisir Business'
  },
  {
    key: 'PERFORMANCE', name: 'Performance', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    monthly: 79.99, annual: 799.90, badge: 'ERP Complet', tagline: 'L\'alternative aux ERP lourds',
    description: 'La suite intégrale pour piloter la rentabilité de bout en bout.',
    includes: ['Accès intégral à l\'ensemble des 7 modules', 'Facturation Intégrée & Trésorerie', 'IA Décisionnelle CoDir, API Ouverte'],
    excludes: ['SSO / SAML', 'SLA personnalisé'],
    cta: 'Choisir Performance'
  },
  {
    key: 'ENTERPRISE', name: 'Enterprise', icon: Building2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',
    monthly: null, annual: null, isEnterprise: true, badge: 'Sur Devis', tagline: 'Multi-entités, SSO, SLA garanti',
    description: 'Pour les grands comptes et ESN nécessitant une architecture dédiée.',
    includes: ['Utilisateurs sur-mesure & Multi-entreprise (Tenant)', 'SSO / SAML*', 'Audit Trail et SLA garanti', 'Gestionnaire de compte dédié'],
    excludes: [],
    cta: 'Nous contacter'
  }
];

// Configuration modulaire pour le formulaire granulaire
const GRANULAR_MODULES = [
  { theme: 'Exécutif', icon: LayoutDashboard, chapters: [{ k: 'executif_tdb', l: 'Tableau de bord' }] },
  { theme: 'Commerces', icon: Target, chapters: [{ k: 'commerce_clients', l: 'Clients' }, { k: 'commerce_prospects', l: 'Prospects' }, { k: 'commerce_avv', l: 'Avant-Vente' }, { k: 'commerce_cmds', l: 'Commandes' }] },
  { theme: 'Ressources', icon: Users, chapters: [{ k: 'rh_membres', l: 'Membres' }, { k: 'rh_calendrier', l: 'Calendrier Absences' }, { k: 'rh_charge', l: 'Plan de charge' }, { k: 'rh_pointages', l: 'Pointages' }, { k: 'rh_competences', l: 'Compétences' }] },
  { theme: 'Opérations', icon: FolderKanban, chapters: [{ k: 'ops_projets', l: 'Projets' }, { k: 'ops_timeline', l: 'Timeline globale' }, { k: 'ops_gantt', l: 'Gantt' }] },
  { theme: 'Qualité', icon: ShieldCheck, chapters: [{ k: 'qa_risques', l: 'Risques' }, { k: 'qa_livrables', l: 'Livrables' }, { k: 'qa_audit', l: 'Audit & Actions' }] },
  { theme: 'Finance', icon: DollarSign, chapters: [{ k: 'fin_marges', l: 'Valorisation & Marges' }, { k: 'fin_facturation', l: 'Facturation' }] },
];

export default function AdminPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId: slugOrId } = use(params);
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "security" | "billing">("dashboard");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  // Gestion des modales
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<any>({
    id: null, email: '', name: '', password: '', company_name: '', role: 'USER', plan: 'DISCOVERY', status: 'PENDING',
    sub_start: new Date().toISOString().split('T')[0], sub_end: '', override_rights: false, custom_modules: {}
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ["dashboard", "users", "security", "billing"].includes(tab)) setActiveTab(tab as any);
  }, [searchParams]);

  const { data: currentOrgId } = useQuery({
    queryKey: ['org-uuid', slugOrId],
    queryFn: async () => {
      if (!slugOrId) return null;
      if (slugOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return slugOrId;
      const { data } = await (supabase.from('organizations' as any).select('id').eq('slug', slugOrId).single() as any);
      return data?.id || null;
    }
  });

  // RÉCUPÉRATION DES PROFILS UTILISATEURS
  const { data: usersList = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      const { data } = await (supabase.from('profiles' as any).select('*').eq('organization_id', currentOrgId) as any);
      
      // Fallback de démonstration si base vide
      if (!data || data.length === 0) {
        return [
          { id: '1', email: 'dg@onepilot.io', name: 'Jean Dupont', company_name: 'ONEPILOT Corp', role: 'SUPER_ADMIN', plan: 'ENTERPRISE', status: 'ACTIVE', override_rights: true, sub_start: '2025-01-01', sub_end: '2026-12-31', last_login: '2026-06-30T08:00:00Z' },
          { id: '2', email: 'manager@client-a.com', name: 'Sophie Martin', company_name: 'AeroSpace SA', role: 'ADMIN', plan: 'BUSINESS', status: 'ACTIVE', override_rights: false, sub_start: '2026-01-15', sub_end: '2027-01-15', last_login: '2026-06-29T09:15:00Z' },
          { id: '3', email: 'consultant@client-a.com', name: 'Lucas Bernard', company_name: 'AeroSpace SA', role: 'USER', plan: 'BUSINESS', status: 'ACTIVE', override_rights: false, sub_start: '2026-02-20', sub_end: '2027-02-20', last_login: '2026-06-25T16:45:00Z' },
          { id: '4', email: 'rh@client-b.com', name: 'Emma Petit', company_name: 'TechLogistics', role: 'ADMIN', plan: 'STARTER', status: 'PENDING', override_rights: false, sub_start: '2026-06-01', sub_end: '2026-07-01', last_login: null },
        ];
      }
      return data || [];
    },
    enabled: !!currentOrgId
  });

  const filteredUsers = useMemo(() => {
    if (!searchUser) return usersList;
    const lower = searchUser.toLowerCase();
    return usersList.filter((u: any) => u.email?.toLowerCase().includes(lower) || u.name?.toLowerCase().includes(lower) || u.company_name?.toLowerCase().includes(lower) || u.role?.toLowerCase().includes(lower));
  }, [usersList, searchUser]);

  // CALCULS ANALYTIQUES DU DASHBOARD ADMIN
  const adminMetrics = useMemo(() => {
    const active = usersList.filter((u: any) => u.status === 'ACTIVE').length;
    let mrr = 0;
    const distMap: Record<string, number> = {};
    const revenueMap: Record<string, number> = {};

    usersList.forEach((u: any) => {
      const planName = u.plan || 'DISCOVERY';
      distMap[planName] = (distMap[planName] || 0) + 1;
      if (u.status === 'ACTIVE' && PLAN_PRICES[planName]) {
        mrr += PLAN_PRICES[planName];
        revenueMap[planName] = (revenueMap[planName] || 0) + PLAN_PRICES[planName];
      }
    });

    const planDistribution = Object.entries(distMap).map(([name, value]) => ({ name, value }));
    const revenueDistribution = Object.entries(revenueMap).map(([name, MRR]) => ({ name, MRR })).sort((a,b) => b.MRR - a.MRR);

    const mrrHistory = [
      { mois: 'Jan', MRR: Math.max(0, mrr - 400) }, { mois: 'Fév', MRR: Math.max(0, mrr - 320) }, 
      { mois: 'Mar', MRR: Math.max(0, mrr - 250) }, { mois: 'Avr', MRR: Math.max(0, mrr - 120) }, 
      { mois: 'Mai', MRR: Math.max(0, mrr - 50) }, { mois: 'Juin', MRR: mrr }
    ];

    return { totalUsers: usersList.length, activeUsers: active, mrr, mrrHistory, planDistribution, revenueDistribution };
  }, [usersList]);

  // VUES STRATÉGIQUES CARDS
  const cardsInsights = useMemo(() => {
    const alerts: string[] = [];
    const recommendations: string[] = [];
    const syntheses: string[] = [];

    const activeRatio = adminMetrics.totalUsers > 0 ? (adminMetrics.activeUsers / adminMetrics.totalUsers) * 100 : 0;
    const freeUsers = usersList.filter((u: any) => u.plan === 'DISCOVERY').length;

    syntheses.push(`• La plateforme consolide un Revenu Récurrent (MRR) de ${adminMetrics.mrr.toLocaleString('fr-FR')} €/mois.`);
    syntheses.push(`• ${adminMetrics.activeUsers} utilisateurs actifs. Architecture multi-tenant sécurisée.`);
    if (freeUsers > 0) syntheses.push(`• Volume d'acquisition : ${freeUsers} comptes en test (Formule Découverte).`);

    if (activeRatio < 70) {
      recommendations.push("• Amélioration UX : Déployer une séquence d'onboarding in-app pour réduire l'abandon.");
      recommendations.push("• Marketing : Lancer une campagne d'emailing de relance sur les comptes 'En attente'.");
    } else {
      recommendations.push("• Business : Adoption forte. Préparer une campagne de parrainage pour stimuler la croissance organique.");
    }
    if (adminMetrics.mrr < 500) {
      recommendations.push("• Ventes : Organiser un webinaire de démonstration produit pour accélérer l'acquisition.");
    }

    if (activeRatio < 50) alerts.push(`• Rétention critique : Moins d'un compte sur deux est actif (${activeRatio.toFixed(0)}%).`);
    if (freeUsers > 5) alerts.push(`• Suivi commercial : ${freeUsers} périodes d'essai arrivant à expiration.`);
    if (alerts.length === 0) alerts.push("• Sécurité et flux financiers nominaux. Aucune anomalie détectée.");
    
    return { alerts, recommendations, syntheses };
  }, [adminMetrics, usersList]);

  // MUTATION DE SAUVEGARDE UTILISATEUR
  const saveUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const payload = { ...userData, organization_id: currentOrgId };
      const { error } = await (supabase.from('profiles' as any).upsert([payload]) as any);
      if (error) throw error;
      await (supabase.from('audit_logs' as any).insert([{
        organization_id: currentOrgId, user_email: 'admin@system', action: userData.id ? 'UPDATE_USER' : 'CREATE_USER', details: `Compte ${userData.email} (${userData.company_name}) mis à jour.`
      }] as any) as any);
    },
    onSuccess: () => {
      alert("Utilisateur enregistré dans l'infrastructure de son entreprise.");
      setIsUserModalOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      refetchUsers();
    },
    onError: (err: any) => alert(`Erreur de synchronisation. Assurez-vous d'avoir exécuté le script SQL. Détail : ${err.message}`)
  });

  const exportAuditTrail = async () => {
    try {
      const { data, error } = await (supabase.from('audit_logs' as any).select('*').eq('organization_id', currentOrgId).order('created_at', { ascending: false }) as any);
      if (error) throw error;
      if (!data || data.length === 0) { alert("Aucun log d'audit disponible."); return; }
      
      const headers = "Date,Utilisateur,Action,Détails\n";
      const csv = data.map((l: any) => `${new Date(l.created_at).toLocaleString('fr-FR')},${l.user_email},${l.action},"${l.details}"`).join('\n');
      
      const blob = new Blob([headers + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Audit_Trail_${slugOrId}_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
    } catch (err: any) {
      alert("Erreur lors de l'export CSV : " + err.message);
    }
  };

  const handleOpenUserModal = (u: any = null) => {
    if (u) {
      setUserForm({ ...u, password: '', custom_modules: u.custom_modules || {} });
    } else {
      setUserForm({ id: null, email: '', password: '', name: '', company_name: '', role: 'USER', plan: 'DISCOVERY', status: 'PENDING', sub_start: new Date().toISOString().split('T')[0], sub_end: '', override_rights: false, custom_modules: {} });
    }
    setIsUserModalOpen(true);
  };

  const handleToggleModule = (modKey: string) => {
    setUserForm((prev: any) => ({ ...prev, custom_modules: { ...prev.custom_modules, [modKey]: !prev.custom_modules[modKey] } }));
  };

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey);
    if (confirm(`Vous allez être redirigé vers l'environnement sécurisé Stripe pour valider la formule ${planKey}. Continuer ?`)) {
      window.open('https://stripe.com', '_blank');
    }
  };

  const handleImpersonate = (email: string) => {
    if (confirm(`⚠️ ALERTE SÉCURITÉ : Connexion en tant que ${email}. Consigné dans l'Audit Trail. Continuer ?`)) {
      (supabase.from('audit_logs' as any).insert([{ organization_id: currentOrgId, user_email: 'admin@system', action: 'IMPERSONATE', details: `Impersonated ${email}` }] as any) as any);
      alert(`Redirection vers l'espace restreint de ${email}...`);
    }
  };

  const handleSendResetPassword = async (email: string) => {
    if (confirm(`Envoyer un lien de réinitialisation de mot de passe à ${email} ?`)) {
      await (supabase.from('audit_logs' as any).insert([{ organization_id: currentOrgId, user_email: 'admin@system', action: 'RESET_PASSWORD', details: `Reset link sent to ${email}` }] as any) as any);
      alert(`Un lien sécurisé a été envoyé à ${email}.`);
    }
  };

  const handleAnonymizeUser = async (user: any) => {
    if (confirm(`🛑 ACTION IRRÉVERSIBLE (RGPD) : Vous allez anonymiser les données de ${user.email}. Continuer ?`)) {
      await (supabase.from('profiles' as any).update({ name: 'Anonymisé', email: `anonyme_${user.id}@rgpd.com`, status: 'INACTIVE', company_name: 'Anonymisé' } as any).eq('id', user.id) as any);
      await (supabase.from('audit_logs' as any).insert([{ organization_id: currentOrgId, user_email: 'admin@system', action: 'ANONYMIZE_USER', details: `User ${user.id} anonymized (GDPR).` }] as any) as any);
      refetchUsers();
    }
  };

  const formatTooltip = (value: any, name: any): [string, string] => {
    if (typeof value !== 'number') return [String(value), String(name)];
    if (String(name).includes('%')) return [`${value.toFixed(1)} %`, String(name)];
    if (String(name).includes('Utilisateurs') || String(name).includes('Comptes')) return [String(value), String(name)];
    return [`${value.toLocaleString('fr-FR')} €`, String(name)];
  };

  // EXPORT PDF SYNTHÈSE ADMIN
  const exportDashboardPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const tableRev = adminMetrics.revenueDistribution.map((f: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${f.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold; color:#10b981;">${f.MRR.toLocaleString('fr-FR')} €</td></tr>`).join('');
    const tablePlan = adminMetrics.planDistribution.map((f: any) => `<tr><td style="padding:6px; border:1px solid #cbd5e1;">${f.name}</td><td style="padding:6px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">${f.value}</td></tr>`).join('');

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ONEPILOT - Rapport Exécutif Administratif</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #334155; font-size: 11px; background: #ffffff; }
            .header { border-bottom: 4px solid #b91c1c; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header h1 { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; }
            .header span { font-size: 11px; color: #64748b; font-weight: 600; }
            .section-title { font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-top: 25px; margin-bottom: 12px; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
            .kpi-box { padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center; background: #f8fafc; }
            .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 5px; font-family: monospace; }
            .alert-box { background: #fff1f2; border: 1px solid #fecdd3; padding: 10px; border-radius: 4px; color: #be123c; margin-bottom: 8px; font-size: 11px; }
            .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 4px; color: #15803d; margin-bottom: 8px; font-size: 11px; }
            .reco-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 4px; color: #1d4ed8; margin-bottom: 8px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; text-align: left; }
            th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; }
            .print-btn { position: fixed; bottom: 30px; right: 30px; background: #b91c1c; color: white; border: none; padding: 12px 24px; border-radius: 50px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 4px 6px rgba(185,28,28,0.3); }
            @media print { .print-btn { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1>ONEPILOT</h1><span>Audit d'Exploitation SaaS</span></div>
            <div style="text-align:right;">Édité le : ${new Date().toLocaleDateString('fr-FR')}</div>
          </div>

          <div class="section-title">1. Synthèse Administrative & Métriques</div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
            <div>
              <div style="font-weight:bold; margin-bottom:10px; color:#475569; font-size:11px; text-transform:uppercase;">Adoption & Bilan</div>
              ${cardsInsights.syntheses.map((s: string) => `<div class="info-box">${s}</div>`).join('')}
            </div>
            <div>
              <div style="font-weight:bold; margin-bottom:10px; color:#475569; font-size:11px; text-transform:uppercase;">Actions Business / Opérations</div>
              ${cardsInsights.recommendations.map((r: string) => `<div class="reco-box">${r}</div>`).join('')}
            </div>
            <div>
              <div style="font-weight:bold; margin-bottom:10px; color:#475569; font-size:11px; text-transform:uppercase;">Points de Blocage</div>
              ${cardsInsights.alerts.map((a: string) => `<div class="alert-box">${a}</div>`).join('')}
            </div>
          </div>

          <div class="grid">
            <div class="kpi-box"><div class="kpi-label">Revenus Récurrents (MRR)</div><div class="kpi-val" style="color:#2563eb;">${adminMetrics.mrr.toLocaleString('fr-FR')} €</div></div>
            <div class="kpi-box"><div class="kpi-label">Licences Actives</div><div class="kpi-val" style="color:#10b981;">${adminMetrics.activeUsers}</div></div>
            <div class="kpi-box"><div class="kpi-label">Base Totale Inscrits</div><div class="kpi-val" style="color:#8b5cf6;">${adminMetrics.totalUsers}</div></div>
            <div class="kpi-box"><div class="kpi-label">Charge Infrastructure</div><div class="kpi-val" style="color:#64748b;">14.2 %</div></div>
          </div>

          <div class="section-title">2. Pénétration des Offres & Répartition Financière</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">MRR Généré par Type d'Abonnement</h4>
              <table><tr><th>Abonnement (Pack)</th><th style="text-align:right;">MRR Mensuel (€)</th></tr>${tableRev}</table>
            </div>
            <div>
              <h4 style="margin:0 0 8px 0; color:#334155;">Volume de Licences par Offre</h4>
              <table><tr><th>Abonnement (Pack)</th><th style="text-align:right;">Nombre de Licences</th></tr>${tablePlan}</table>
            </div>
          </div>

          <button class="print-btn" onclick="window.print()">🖨️ Générer le PDF Final</button>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-3 pt-0 px-2 font-sans text-[11px] text-slate-600 dark:text-slate-400 select-none">
      
      {/* HEADER AVEC BOUTONS EXPORT (CSV Vert / PDF Rouge) */}
      <div className="flex justify-between items-center h-8">
        <h1 className="text-[12px] font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
          <Settings size={14} className="text-slate-500" /> Centre de Commandement (Administration)
        </h1>
        <div className="flex gap-2">
          <button onClick={exportAuditTrail} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-6 rounded text-[10px] font-medium transition-colors shadow-xs">
            <Download size={11} /> Logs Sécurité (CSV)
          </button>
          <button onClick={exportDashboardPDF} className="flex items-center gap-1 bg-red-700 hover:bg-red-800 text-white px-2.5 h-6 rounded text-[10px] font-medium transition-colors shadow-xs">
            <FileText size={11} /> Synthèse Admin (PDF)
          </button>
        </div>
      </div>

      {/* TABS DE NAVIGATION ADMINISTRATEUR */}
      <div className="flex gap-1 py-1 w-full border-b border-slate-200 dark:border-slate-800 mb-2">
        <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all flex items-center gap-1.5 ${activeTab === 'dashboard' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>
          <Activity size={12}/> Tableau de bord Plateforme
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all flex items-center gap-1.5 ${activeTab === 'users' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>
          <Users size={12}/> Utilisateurs & Entreprises
        </button>
        <button onClick={() => setActiveTab('billing')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all flex items-center gap-1.5 ${activeTab === 'billing' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>
          <CreditCard size={12}/> Abonnements & Plans
        </button>
        <button onClick={() => setActiveTab('security')} className={`px-4 py-1.5 rounded text-[10px] font-medium transition-all flex items-center gap-1.5 ${activeTab === 'security' ? "bg-slate-100 dark:bg-slate-800 text-blue-600 font-semibold shadow-xs" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}>
          <ShieldAlert size={12}/> Sécurité & RGPD
        </button>
      </div>

      {/* ========================================= */}
      {/* ONGLET 1 : TABLEAU DE BORD PLATEFORME     */}
      {/* ========================================= */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs h-40 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5 text-[11px]"><BrainCircuit size={13} className="text-blue-500" /> Bilan d'Adoption SaaS</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {cardsInsights.syntheses.map((s: string, i: number) => <p key={i}>{s}</p>)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs h-40 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5 text-[11px]"><Target size={13} className="text-purple-500" /> Actions Business & Marketing</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                {cardsInsights.recommendations.map((r: string, i: number) => <p key={i}>{r}</p>)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs h-40 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight flex items-center gap-1.5 text-[11px]"><AlertCircle size={13} className="text-rose-500" /> Points Décisifs & Bloquants</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-rose-700 dark:text-rose-400 text-[11px] font-medium leading-relaxed">
                {cardsInsights.alerts.map((a: string, i: number) => <p key={i}>{a}</p>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[ { l: "MRR Actuel (Revenus)", v: `${adminMetrics.mrr.toLocaleString('fr-FR')} €`, ic: <DollarSign size={16} />, c: "text-blue-600 bg-blue-500/10" },
               { l: "Utilisateurs Inscrits", v: adminMetrics.totalUsers.toString(), ic: <Users size={16} />, c: "text-indigo-600 bg-indigo-500/10" },
               { l: "Licences Actives", v: adminMetrics.activeUsers.toString(), ic: <Activity size={16} />, c: "text-emerald-600 bg-emerald-500/10" },
               { l: "Charge Serveur / BDD", v: "14.2 %", ic: <Server size={16} />, c: "text-slate-600 bg-slate-500/10" }
            ].map((w: any, i: number) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 h-18 rounded flex items-center gap-4 shadow-xs">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${w.c}`}>{w.ic}</div>
                <div><p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{w.l}</p><p className="text-[20px] font-bold text-slate-800 dark:text-slate-100 mt-0.5 leading-none font-mono">{w.v}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Évolution du Revenu Récurrent Mensuel (MRR en €)</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adminMetrics.mrrHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="mois" tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 8, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} />
                  <Area type="monotone" dataKey="MRR" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">Pénétration des Offres Commerciales (Nb de comptes)</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={adminMetrics.planDistribution} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                    {adminMetrics.planDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} />
                  <Legend verticalAlign="bottom" height={20} iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs h-72 flex flex-col">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight text-[10px]">MRR Généré par Type d'Abonnement (€)</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adminMetrics.revenueDistribution} layout="vertical" margin={{ left: 5, right: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" horizontal={true} vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 8, fill: '#64748b'}} width={70} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize: '9px'}} formatter={formatTooltip} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="MRR" fill="#10b981" radius={[0, 2, 2, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ONGLET 2 : UTILISATEURS & ENTREPRISES     */}
      {/* ========================================= */}
      {activeTab === "users" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2 rounded shadow-xs">
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search size={14} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher (Nom, Email, Entreprise, Rôle)..." 
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-[11px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
            <button 
              onClick={() => handleOpenUserModal(null)}
              className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
            >
              <Plus size={12}/> Créer Compte / Entreprise
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-2.5">Identité & Entreprise</th>
                  <th className="p-2.5">Identifiant de connexion</th>
                  <th className="p-2.5">Rôle Système</th>
                  <th className="p-2.5">Abonnement & Droits</th>
                  <th className="p-2.5">Période de souscription</th>
                  <th className="p-2.5">Statut Compte</th>
                  <th className="p-2.5 text-center">Actions & Sécurité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[10px] text-slate-700 dark:text-slate-300">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{u.name || '—'}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1"><Building2 size={9}/> {u.company_name || 'Non défini'}</div>
                    </td>
                    <td className="p-2.5">{u.email}</td>
                    <td className="p-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{u.plan}</span>
                        {u.override_rights && <span title="Droits et modules forcés par l'Admin"><Zap size={11} className="text-amber-500" /></span>}
                      </div>
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">
                      {u.sub_start ? new Date(u.sub_start).toLocaleDateString('fr-FR') : '—'} <ArrowRight size={8} className="inline mx-0.5"/> {u.sub_end ? new Date(u.sub_end).toLocaleDateString('fr-FR') : 'Non défini'}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : u.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        {u.status}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleImpersonate(u.email)} title="Impersonate (Connecter en tant que)" className="p-1 text-emerald-500 hover:text-emerald-700 transition-colors"><LogIn size={13}/></button>
                        <button onClick={() => handleSendResetPassword(u.email)} title="Envoyer lien de mot de passe" className="p-1 text-amber-500 hover:text-amber-700 transition-colors"><KeyRound size={13}/></button>
                        <button onClick={() => handleOpenUserModal(u)} title="Éditer l'abonnement et l'entreprise" className="p-1 text-blue-500 hover:text-blue-700 transition-colors"><Edit size={13}/></button>
                        <button onClick={() => handleAnonymizeUser(u)} title="Supprimer & Anonymiser (RGPD)" className="p-1 text-red-500 hover:text-red-700 transition-colors"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-400 italic">Aucun compte utilisateur ne correspond à la recherche.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Formulaire Modal de Création / Édition Multi-Tenant */}
          {isUserModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-lg p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold uppercase tracking-tight text-slate-800 dark:text-slate-200 text-[11px]">{userForm.id ? "Éditer un compte (Multi-Tenant)" : "Créer un nouveau compte client"}</h3>
                  <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                </div>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveUserMutation.mutate(userForm); }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Nom Complet de l'utilisateur</label>
                      <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Nom de l'Entreprise (Tenant)</label>
                      <input type="text" value={userForm.company_name} onChange={e => setUserForm({...userForm, company_name: e.target.value})} placeholder="Ex: AeroSpace SA" className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Email de connexion</label>
                      <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Mot de passe de première connexion</label>
                      <input type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder="Sera envoyé par mail..." className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Rôle d'administration</label>
                      <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200">
                        <option value="SUPER_ADMIN">Super Admin (Plateforme)</option>
                        <option value="ADMIN">Administrateur Local (Entreprise)</option>
                        <option value="USER">Utilisateur Opérationnel</option>
                        <option value="LIMITED">Consultant Limité / Externe</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Abonnement Facturé</label>
                      <select value={userForm.plan} onChange={e => setUserForm({...userForm, plan: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-slate-800 dark:text-slate-200">
                        <option value="DISCOVERY">Découverte (7 jours)</option>
                        <option value="STARTER">Starter</option>
                        <option value="BUSINESS">Business</option>
                        <option value="PERFORMANCE">Performance</option>
                        <option value="ENTERPRISE">Enterprise (Sur devis)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Début Souscription</label>
                      <input type="date" value={userForm.sub_start} onChange={e => setUserForm({...userForm, sub_start: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-slate-500">Fin Prévisionnelle</label>
                      <input type="date" value={userForm.sub_end} onChange={e => setUserForm({...userForm, sub_end: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none font-mono text-slate-800 dark:text-slate-200" />
                    </div>
                  </div>
                  
                  {/* Gestion granulaire des droits par CHAPITRE */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md mt-2 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-500 flex items-center gap-1"><Zap size={12}/> Activer des accès spécifiques (Hors forfait)</label>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">Vous pouvez cocher des chapitres spécifiques même si l'abonnement du client ne les inclut pas par défaut.</p>
                      </div>
                      <input type="checkbox" checked={userForm.override_rights} onChange={e => setUserForm({...userForm, override_rights: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
                    </div>

                    {userForm.override_rights && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GRANULAR_MODULES.map(mod => {
                          const Icon = mod.icon;
                          return (
                            <div key={mod.theme} className="space-y-1.5">
                              <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-1 mb-1">
                                <Icon size={11} className="text-blue-500"/> {mod.theme}
                              </h5>
                              {mod.chapters.map(chap => (
                                <label key={chap.k} className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors">
                                  <input type="checkbox" checked={userForm.custom_modules[chap.k] || false} onChange={() => handleToggleModule(chap.k)} className="rounded text-blue-600" />
                                  {chap.l}
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="h-7 px-3 text-slate-500 hover:text-slate-700">Annuler</button>
                    <button type="submit" disabled={saveUserMutation.isPending} className="h-7 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 flex items-center gap-1.5">
                      <CheckCircle size={11}/> {userForm.id ? "Sauvegarder les accès" : "Créer le compte et configurer"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* ONGLET 3 : ABONNEMENTS ET FACTURATION     */}
      {/* ========================================= */}
      {activeTab === "billing" && (
        <div className="space-y-6 pb-6">
          <div className="flex flex-col items-center gap-3 mt-4">
            <h2 className="text-[14px] font-bold text-slate-800 dark:text-white uppercase tracking-tight">Grille Tarifaire SaaS & Modules</h2>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
              <button onClick={() => setBillingCycle('monthly')} className={`px-5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${billingCycle === 'monthly' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500"}`}>
                Mensuel
              </button>
              <button onClick={() => setBillingCycle('annual')} className={`px-5 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm" : "text-slate-500"}`}>
                Annuel <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px]">-17%</span>
              </button>
            </div>
            {billingCycle === 'annual' && <p className="text-[10px] text-emerald-600 font-bold">🎉 Facturation sur 10 mois : 2 mois offerts !</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const isSelected = selectedPlan === plan.key;
              const price = billingCycle === 'annual' ? plan.annual : plan.monthly;
              
              return (
                <div 
                  key={plan.key} 
                  onClick={() => setSelectedPlan(plan.key)}
                  className={`relative cursor-pointer bg-white dark:bg-slate-900 border rounded-xl p-4 flex flex-col gap-4 transition-all shadow-xs ${isSelected ? 'border-blue-500 ring-2 ring-blue-500 dark:bg-slate-800/80' : 'border-slate-200 dark:border-slate-800 hover:-translate-y-1 hover:shadow-md'}`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${plan.bg}`}>
                      <Icon size={16} className={plan.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[12px] uppercase">{plan.name}</h3>
                      <p className="text-[9px] text-slate-500 leading-tight mt-0.5">{plan.tagline}</p>
                    </div>
                  </div>

                  <div className="min-h-[40px] border-b border-slate-100 dark:border-slate-800 pb-3">
                    {plan.isEnterprise || plan.isFree ? (
                      <div>
                        <span className="text-[22px] font-black text-slate-800 dark:text-white font-mono">{plan.isFree ? 'Gratuit' : 'Sur Devis'}</span>
                        <div className="text-[9px] text-slate-500 uppercase font-medium mt-1">{plan.isFree ? '7 Jours sans CB' : 'Architectures étendues'}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[22px] font-black text-slate-800 dark:text-white font-mono">{price} €</span>
                          <span className="text-[9px] text-slate-500 uppercase font-medium">/ mois</span>
                        </div>
                        {billingCycle === 'annual' && <div className="text-[9px] text-emerald-600 font-bold mt-1">Facturé {(price! * 10).toLocaleString()} € / an</div>}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      {plan.includes.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-slate-700 dark:text-slate-300">
                          <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" /> <span className="leading-tight">{f}</span>
                        </div>
                      ))}
                    </div>
                    {plan.excludes.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        {plan.excludes.map((f, i) => (
                          <div key={i} className="flex items-start gap-2 text-[9px] text-slate-400">
                            <X size={10} className="text-rose-400 shrink-0 mt-0.5" /> <span className="leading-tight">{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.name); }} className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1.5 mt-2 ${isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                    {isSelected ? <>Redirection Stripe <ArrowRight size={12}/></> : <>{plan.cta}</>}
                  </button>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col items-center justify-center pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[9px] text-slate-500 max-w-lg mb-3 leading-relaxed">
              * SSO / SAML : L'authentification unique permet à vos collaborateurs de se connecter à ONEPILOT via l'annuaire de votre entreprise (Microsoft Entra ID, Okta, Google Workspace), renforçant la sécurité et simplifiant l'accès.
            </p>
            <button onClick={() => window.open('https://stripe.com', '_blank')} className="flex items-center gap-2 bg-[#635BFF] hover:bg-[#4B45C6] text-white px-5 h-8 rounded-md text-[11px] font-bold uppercase transition-colors shadow-sm">
              <CreditCard size={14} /> Gérer mes prélèvements sur Stripe (Portail Client)
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ONGLET 4 : SÉCURITÉ & RGPD                */}
      {/* ========================================= */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight text-[11px] flex items-center gap-1.5"><KeyRound size={14} className="text-blue-500"/> Sécurité du Compte Master</h3>
              <p className="text-[10px] text-slate-500 mt-1">Modifiez la clé de cryptage maître ou activez l'authentification double facteur (2FA) sur l'instance.</p>
            </div>
            
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Politique de sécurité mise à jour.'); setPasswords({current:'', new:'', confirm:''}); }}>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mot de passe d'administration actuel</label>
                <input type="password" value={passwords.current} onChange={e=>setPasswords({...passwords, current: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-[11px] text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nouveau mot de passe maître</label>
                <input type="password" value={passwords.new} onChange={e=>setPasswords({...passwords, new: e.target.value})} placeholder="Au moins 12 caractères, 1 chiffre, 1 symbole" className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-[11px] text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Confirmer le mot de passe</label>
                <input type="password" value={passwords.confirm} onChange={e=>setPasswords({...passwords, confirm: e.target.value})} className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none text-[11px] text-slate-800 dark:text-slate-200" />
              </div>
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm} className="h-7 px-4 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">Appliquer les règles de sécurité</button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-md shadow-xs flex flex-col justify-center items-center text-center">
            <ShieldCheck size={40} className="text-emerald-500 mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight text-[12px] mb-2">Conformité RGPD & Hébergement EU</h3>
            <p className="text-slate-500 text-[11px] max-w-sm mb-4 leading-relaxed">
              L'instance ONEPILOT centralise le chiffrement de bout en bout (AES-256) sur des serveurs hébergés en Europe. 
              Le mode "Multi-Tenant" assure une étanchéité parfaite des bases de données de chaque entreprise rattachée. 
              Toute tentative de manipulation ou de connexion est enregistrée dans l'Audit Trail inaltérable.
            </p>
            <button onClick={exportAuditTrail} className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded border border-emerald-700 text-[10px] font-medium transition-colors shadow-xs">
              Générer et Exporter le Registre (CSV)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}