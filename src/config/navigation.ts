import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  ContactRound,
  FileCheck2,
  FileClock,
  FileSearch,
  Files,
  FolderKanban,
  GraduationCap,
  HandCoins,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Network,
  PackageCheck,
  ReceiptText,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";

export type NavigationChapter = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  keywords?: string[];
  exact?: boolean;
};

export type NavigationSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent:
    | "indigo"
    | "violet"
    | "emerald"
    | "amber"
    | "rose"
    | "cyan"
    | "slate";
  chapters: NavigationChapter[];
};

export const navigationSections: NavigationSection[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    icon: LayoutDashboard,
    accent: "indigo",
    chapters: [
      {
        id: "dashboard",
        label: "Tableau de bord",
        href: "/dashboard",
        icon: ChartNoAxesCombined,
        exact: true,
        keywords: [
          "accueil",
          "kpi",
          "direction",
          "exécutif",
        ],
      },
      {
        id: "reports",
        label: "Rapports",
        href: "/pilotage/rapports",
        icon: BarChart3,
        exact: true,
        keywords: [
          "reporting",
          "analyse",
          "indicateurs",
        ],
      },
      {
        id: "objectives",
        label: "Objectifs",
        href: "/pilotage/objectifs",
        icon: Target,
        exact: true,
        keywords: [
          "okr",
          "performance",
          "cibles",
        ],
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: TrendingUp,
    accent: "violet",
    chapters: [
      {
        id: "clients",
        label: "Clients",
        href: "/clients",
        icon: Building2,
        exact: true,
        keywords: [
          "comptes",
          "contacts",
          "crm",
        ],
      },
      {
        id: "prospects",
        label: "Prospects",
        href: "/prospects",
        icon: ContactRound,
        exact: true,
        keywords: [
          "leads",
          "crm",
          "acquisition",
        ],
      },
      {
        id: "avant-vente",
        label: "Avant-vente",
        href: "/avant-vente",
        icon: FileSearch,
        exact: true,
        keywords: [
          "offres",
          "devis",
          "propositions",
        ],
      },
      {
        id: "commandes",
        label: "Commandes",
        href: "/commandes",
        icon: PackageCheck,
        exact: true,
        keywords: [
          "bons de commande",
          "ventes",
          "achats",
        ],
      },
      {
        id: "forecast",
        label: "Prévisions commerciales",
        href: "/commerce/previsions",
        icon: Activity,
        exact: true,
        keywords: [
          "forecast",
          "pipeline",
          "probabilité",
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Projets",
    icon: FolderKanban,
    accent: "cyan",
    chapters: [
      {
        id: "projects-list",
        label: "Portefeuille projets",
        href: "/projects",
        icon: BriefcaseBusiness,
        exact: true,
        keywords: [
          "portefeuille",
          "missions",
          "affaires",
        ],
      },
      {
        id: "timeline",
        label: "Timeline globale",
        href: "/projects/timeline",
        icon: Route,
        exact: true,
        keywords: [
          "planning",
          "jalons",
          "chronologie",
        ],
      },
      {
        id: "gantt",
        label: "Planification & Gantt",
        href: "/projects/gantt",
        icon: CalendarDays,
        exact: true,
        keywords: [
          "planning",
          "charge",
          "dates",
        ],
      },
      {
        id: "actions",
        label: "Actions",
        href: "/projects/actions",
        icon: ListChecks,
        exact: true,
        keywords: [
          "tâches",
          "suivi",
          "responsables",
        ],
      },
      {
        id: "performance",
        label: "Performance projets",
        href: "/projects/performance",
        icon: BarChart3,
        exact: true,
        keywords: [
          "rentabilité",
          "marge",
          "avancement",
        ],
      },
    ],
  },
  {
    id: "hr",
    label: "Ressources humaines",
    icon: Users,
    accent: "emerald",
    chapters: [
      {
        id: "hr-overview",
        label: "Vue d’ensemble RH",
        href: "/rh",
        icon: LayoutDashboard,
        exact: true,
        keywords: [
          "rh",
          "effectifs",
          "indicateurs",
          "mouvements",
          "alertes",
          "pilotage",
        ],
      },
      {
        id: "hr-architecture",
        label: "Architecture RH",
        href: "/rh/architecture",
        icon: Network,
        exact: true,
        keywords: [
          "organisation",
          "organigramme",
          "sites",
          "services",
          "départements",
          "métiers",
          "fonctions",
          "référentiels",
        ],
      },
      {
        id: "hr-resources",
        label: "Ressources",
        href: "/rh/ressources",
        icon: Users,
        exact: true,
        keywords: [
          "collaborateurs",
          "salariés",
          "freelances",
        ],
      },
      {
        id: "hr-absences",
        label: "Absences & congés",
        href: "/rh/absences",
        icon: CalendarCheck2,
        exact: true,
        keywords: [
          "congés",
          "maladie",
          "validation",
        ],
      },
      {
        id: "hr-workload",
        label: "Staffing & capacité",
        href: "/rh/charge",
        icon: Boxes,
        exact: true,
        keywords: [
          "plan de charge",
          "capacité",
          "affectations",
        ],
      },
      {
        id: "hr-time",
        label: "Temps & activités",
        href: "/rh/pointages",
        icon: FileClock,
        exact: true,
        keywords: [
          "temps",
          "pointages",
          "feuilles de temps",
        ],
      },
      {
        id: "hr-skills",
        label: "Compétences",
        href: "/rh/competences",
        icon: GraduationCap,
        exact: true,
        keywords: [
          "matrice",
          "formation",
          "talents",
        ],
      },
      {
        id: "hr-onboarding",
        label: "Onboarding",
        href: "/rh/onboarding",
        icon: UserPlus,
        exact: true,
        keywords: [
          "intégration",
          "arrivée",
          "parcours",
        ],
      },
      {
        id: "hr-interviews",
        label: "Entretiens & objectifs",
        href: "/rh/entretiens",
        icon: UserCheck,
        exact: true,
        keywords: [
          "évaluation",
          "objectifs",
          "carrière",
        ],
      },
    ],
  },
  {
    id: "quality",
    label: "Qualité & risques",
    icon: ShieldCheck,
    accent: "amber",
    chapters: [
      {
        id: "quality-overview",
        label: "Vue d’ensemble",
        href: "/qualite",
        icon: LayoutDashboard,
        exact: true,
        keywords: [
          "qualité",
          "pilotage",
          "indicateurs",
        ],
      },
      {
        id: "risks",
        label: "Risques",
        href: "/qualite/risques",
        icon: ShieldCheck,
        exact: true,
        keywords: [
          "menaces",
          "opportunités",
          "criticité",
        ],
      },
      {
        id: "deliverables",
        label: "Livrables",
        href: "/qualite/livrables",
        icon: FileCheck2,
        exact: true,
        keywords: [
          "validation",
          "conformité",
          "documents",
        ],
      },
      {
        id: "non-conformities",
        label: "Non-conformités",
        href: "/qualite/non-conformite",
        icon: ClipboardList,
        exact: true,
        keywords: [
          "écarts",
          "incidents",
          "réclamations",
        ],
      },
      {
        id: "audits",
        label: "Audits",
        href: "/qualite/audit",
        icon: ClipboardCheck,
        exact: true,
        keywords: [
          "contrôle",
          "audit",
          "preuves",
        ],
      },
      {
        id: "quality-documents",
        label: "Documents & procédures",
        href: "/qualite/documents",
        icon: BookOpenCheck,
        exact: true,
        keywords: [
          "procédures",
          "documentation",
          "version",
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: CircleDollarSign,
    accent: "rose",
    chapters: [
      {
        id: "finance-overview",
        label: "Vue financière",
        href: "/finance",
        icon: LayoutDashboard,
        exact: true,
        keywords: [
          "finance",
          "pilotage",
          "résultats",
        ],
      },
      {
        id: "margins",
        label: "Valorisation & marges",
        href: "/finance/marges",
        icon: Scale,
        exact: true,
        keywords: [
          "rentabilité",
          "coûts",
          "marge",
        ],
      },
      {
        id: "billing",
        label: "Facturation",
        href: "/finance/facturation",
        icon: ReceiptText,
        exact: true,
        keywords: [
          "factures",
          "clients",
          "fournisseurs",
        ],
      },
      {
        id: "treasury",
        label: "Trésorerie",
        href: "/finance/tresorerie",
        icon: Landmark,
        exact: true,
        keywords: [
          "cash",
          "banque",
          "prévisions",
        ],
      },
      {
        id: "collections",
        label: "Relances & recouvrement",
        href: "/finance/recouvrement",
        icon: HandCoins,
        exact: true,
        keywords: [
          "impayés",
          "relances",
          "échéances",
        ],
      },
      {
        id: "expenses",
        label: "Notes de frais",
        href: "/finance/notes-de-frais",
        icon: WalletCards,
        exact: true,
        keywords: [
          "dépenses",
          "remboursements",
          "justificatifs",
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "Documents & outils",
    icon: Files,
    accent: "slate",
    chapters: [
      {
        id: "shared-documents",
        label: "Documents partagés",
        href: "/finance/documents",
        icon: Files,
        exact: true,
        keywords: [
          "fichiers",
          "documents",
          "partage",
        ],
      },
      {
        id: "automation",
        label: "Automatisations",
        href: "/automatisations",
        icon: Sparkles,
        exact: true,
        keywords: [
          "workflow",
          "règles",
          "déclencheurs",
        ],
      },
    ],
  },
];

export const superAdminNavigation = {
  id: "administration",
  label: "Administration plateforme",
  href: "/admin",
};