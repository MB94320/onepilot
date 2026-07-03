export type LanguageCode =
  | "FR"
  | "EN"
  | "ES";

export const LANGUAGE_STORAGE_KEY =
  "onepilot.language";

export const LANGUAGE_CHANGE_EVENT =
  "onepilot-language-change";

type TranslationDictionary = {
  sidebar: {
    searchPlaceholder: string;
    noModule: string;
    clearSearch: string;
    organizationMissing: string;
    administration: string;
    superAdminAccess: string;
    collapse: string;
    expand: string;
  };

  topbar: {
    workspace: string;
    organization: string;
    globalSearchPlaceholder: string;
    globalSearch: string;
    availableModules: string;
    noResult: string;
    noResultDescription: string;
    language: string;
    notifications: string;
    recentActivity: string;
    loadingNotifications: string;
    noNotification: string;
    noNotificationDescription: string;
    manageAutomations: string;
    profile: string;
    subscription: string;
    configureSubscription: string;
    edit: string;
    myProfile: string;
    manageSubscription: string;
    platformAdministration: string;
    logout: string;
    user: string;
  };

  notificationActions: {
    created: string;
    updated: string;
    archived: string;
    reactivated: string;
    deleted: string;
  };

  notificationDescriptions: {
    created: string;
    updated: string;
    archived: string;
    reactivated: string;
    deleted: string;
  };

  entities: {
    employee: string;
    contract: string;
  };

  sections: Record<string, string>;
  chapters: Record<string, string>;
};

const translations: Record<
  LanguageCode,
  TranslationDictionary
> = {
  FR: {
    sidebar: {
      searchPlaceholder:
        "Rechercher un module...",
      noModule: "Aucun module trouvé",
      clearSearch:
        "Effacer la recherche",
      organizationMissing:
        "Organisation non détectée. Les liens sont temporairement désactivés.",
      administration:
        "Administration plateforme",
      superAdminAccess:
        "Accès super administrateur",
      collapse:
        "Réduire la barre latérale",
      expand:
        "Déployer la barre latérale",
    },

    topbar: {
      workspace: "Espace de travail",
      organization: "Organisation",
      globalSearchPlaceholder:
        "Rechercher un module, une page ou une fonction...",
      globalSearch:
        "Recherche globale",
      availableModules:
        "Modules et chapitres disponibles",
      noResult: "Aucun résultat",
      noResultDescription:
        "Essaie un autre module, chapitre ou mot-clé.",
      language: "Langue",
      notifications:
        "Centre de notifications",
      recentActivity:
        "Activité récente de la plateforme",
      loadingNotifications:
        "Chargement des notifications...",
      noNotification:
        "Aucune notification",
      noNotificationDescription:
        "Les prochaines activités importantes apparaîtront ici.",
      manageAutomations:
        "Gérer les automatisations",
      profile: "Rôle",
      subscription: "Abonnement",
      configureSubscription:
        "Abonnement à configurer",
      edit: "Modifier",
      myProfile: "Mon profil",
      manageSubscription:
        "Gérer mon abonnement",
      platformAdministration:
        "Administration plateforme",
      logout: "Déconnexion",
      user: "Utilisateur",
    },

    notificationActions: {
      created: "créé",
      updated: "modifié",
      archived: "archivé",
      reactivated: "réactivé",
      deleted: "supprimé",
    },

    notificationDescriptions: {
      created:
        "Une nouvelle donnée a été enregistrée.",
      updated:
        "Des informations ont été mises à jour.",
      archived:
        "Une donnée a été désactivée en conservant son historique.",
      reactivated:
        "Une donnée archivée a été réactivée.",
      deleted:
        "Une donnée a été supprimée.",
    },

    entities: {
      employee: "Collaborateur",
      contract: "Contrat",
    },

    sections: {
      pilotage: "Pilotage",
      commerce: "Commerce",
      projects: "Projets",
      hr: "Ressources humaines",
      quality: "Qualité & risques",
      finance: "Finance",
      workspace: "Documents & outils",
    },

    chapters: {
      dashboard: "Tableau de bord",
      reports: "Rapports",
      objectives: "Objectifs",

      clients: "Clients",
      prospects: "Prospects",
      "avant-vente": "Avant-vente",
      commandes: "Commandes",
      forecast:
        "Prévisions commerciales",

      "projects-list":
        "Portefeuille projets",
      timeline: "Timeline globale",
      gantt:
        "Planification & Gantt",
      actions: "Actions",
      performance:
        "Performance projets",

      "hr-architecture":
        "Architecture RH",
      "hr-resources": "Ressources",
      "hr-absences":
        "Absences & congés",
      "hr-workload":
        "Staffing & capacité",
      "hr-time":
        "Temps & activités",
      "hr-skills": "Compétences",
      "hr-onboarding": "Onboarding",
      "hr-interviews":
        "Entretiens & objectifs",

      "quality-overview":
        "Vue d’ensemble",
      risks: "Risques",
      deliverables: "Livrables",
      "non-conformities":
        "Non-conformités",
      audits: "Audits",
      "quality-documents":
        "Documents & procédures",

      "finance-overview":
        "Vue financière",
      margins:
        "Valorisation & marges",
      billing: "Facturation",
      treasury: "Trésorerie",
      collections:
        "Relances & recouvrement",
      expenses: "Notes de frais",

      "shared-documents":
        "Documents partagés",
      automation: "Automatisations",
    },
  },

  EN: {
    sidebar: {
      searchPlaceholder:
        "Search for a module...",
      noModule: "No module found",
      clearSearch: "Clear search",
      organizationMissing:
        "No organization detected. Links are temporarily disabled.",
      administration:
        "Platform administration",
      superAdminAccess:
        "Super administrator access",
      collapse: "Collapse sidebar",
      expand: "Expand sidebar",
    },

    topbar: {
      workspace: "Workspace",
      organization: "Organization",
      globalSearchPlaceholder:
        "Search for a module, page or feature...",
      globalSearch: "Global search",
      availableModules:
        "Available modules and sections",
      noResult: "No result",
      noResultDescription:
        "Try another module, section or keyword.",
      language: "Language",
      notifications:
        "Notification center",
      recentActivity:
        "Recent platform activity",
      loadingNotifications:
        "Loading notifications...",
      noNotification:
        "No notifications",
      noNotificationDescription:
        "Future important activities will appear here.",
      manageAutomations:
        "Manage automations",
      profile: "Role",
      subscription: "Subscription",
      configureSubscription:
        "Subscription not configured",
      edit: "Edit",
      myProfile: "My profile",
      manageSubscription:
        "Manage my subscription",
      platformAdministration:
        "Platform administration",
      logout: "Log out",
      user: "User",
    },

    notificationActions: {
      created: "created",
      updated: "updated",
      archived: "archived",
      reactivated: "reactivated",
      deleted: "deleted",
    },

    notificationDescriptions: {
      created:
        "A new record has been created.",
      updated:
        "Information has been updated.",
      archived:
        "A record has been disabled while preserving its history.",
      reactivated:
        "An archived record has been reactivated.",
      deleted:
        "A record has been deleted.",
    },

    entities: {
      employee: "Employee",
      contract: "Contract",
    },

    sections: {
      pilotage: "Management",
      commerce: "Sales",
      projects: "Projects",
      hr: "Human resources",
      quality: "Quality & risks",
      finance: "Finance",
      workspace: "Documents & tools",
    },

    chapters: {
      dashboard: "Dashboard",
      reports: "Reports",
      objectives: "Objectives",

      clients: "Customers",
      prospects: "Prospects",
      "avant-vente": "Pre-sales",
      commandes: "Orders",
      forecast: "Sales forecast",

      "projects-list":
        "Project portfolio",
      timeline: "Global timeline",
      gantt: "Planning & Gantt",
      actions: "Actions",
      performance:
        "Project performance",

      "hr-architecture":
        "HR architecture",
      "hr-resources": "Resources",
      "hr-absences":
        "Leave & absences",
      "hr-workload":
        "Staffing & capacity",
      "hr-time":
        "Time & activities",
      "hr-skills": "Skills",
      "hr-onboarding": "Onboarding",
      "hr-interviews":
        "Reviews & objectives",

      "quality-overview":
        "Overview",
      risks: "Risks",
      deliverables: "Deliverables",
      "non-conformities":
        "Non-conformities",
      audits: "Audits",
      "quality-documents":
        "Documents & procedures",

      "finance-overview":
        "Financial overview",
      margins: "Valuation & margins",
      billing: "Billing",
      treasury: "Cash management",
      collections:
        "Collections & reminders",
      expenses: "Expenses",

      "shared-documents":
        "Shared documents",
      automation: "Automations",
    },
  },

  ES: {
    sidebar: {
      searchPlaceholder:
        "Buscar un módulo...",
      noModule:
        "No se ha encontrado ningún módulo",
      clearSearch: "Borrar búsqueda",
      organizationMissing:
        "No se ha detectado ninguna organización. Los enlaces están temporalmente desactivados.",
      administration:
        "Administración de la plataforma",
      superAdminAccess:
        "Acceso de superadministrador",
      collapse:
        "Contraer la barra lateral",
      expand:
        "Desplegar la barra lateral",
    },

    topbar: {
      workspace: "Espacio de trabajo",
      organization: "Organización",
      globalSearchPlaceholder:
        "Buscar un módulo, página o función...",
      globalSearch: "Búsqueda global",
      availableModules:
        "Módulos y secciones disponibles",
      noResult: "Sin resultados",
      noResultDescription:
        "Prueba con otro módulo, sección o palabra clave.",
      language: "Idioma",
      notifications:
        "Centro de notificaciones",
      recentActivity:
        "Actividad reciente de la plataforma",
      loadingNotifications:
        "Cargando notificaciones...",
      noNotification:
        "No hay notificaciones",
      noNotificationDescription:
        "Las próximas actividades importantes aparecerán aquí.",
      manageAutomations:
        "Gestionar automatizaciones",
      profile: "Rol",
      subscription: "Suscripción",
      configureSubscription:
        "Suscripción sin configurar",
      edit: "Modificar",
      myProfile: "Mi perfil",
      manageSubscription:
        "Gestionar mi suscripción",
      platformAdministration:
        "Administración de la plataforma",
      logout: "Cerrar sesión",
      user: "Usuario",
    },

    notificationActions: {
      created: "creado",
      updated: "modificado",
      archived: "archivado",
      reactivated: "reactivado",
      deleted: "eliminado",
    },

    notificationDescriptions: {
      created:
        "Se ha creado un nuevo registro.",
      updated:
        "La información ha sido actualizada.",
      archived:
        "Un registro ha sido desactivado conservando su historial.",
      reactivated:
        "Un registro archivado ha sido reactivado.",
      deleted:
        "Se ha eliminado un registro.",
    },

    entities: {
      employee: "Colaborador",
      contract: "Contrato",
    },

    sections: {
      pilotage: "Dirección",
      commerce: "Comercial",
      projects: "Proyectos",
      hr: "Recursos humanos",
      quality: "Calidad y riesgos",
      finance: "Finanzas",
      workspace:
        "Documentos y herramientas",
    },

    chapters: {
      dashboard: "Panel de control",
      reports: "Informes",
      objectives: "Objetivos",

      clients: "Clientes",
      prospects: "Prospectos",
      "avant-vente": "Preventa",
      commandes: "Pedidos",
      forecast:
        "Previsiones comerciales",

      "projects-list":
        "Cartera de proyectos",
      timeline: "Cronología global",
      gantt:
        "Planificación y Gantt",
      actions: "Acciones",
      performance:
        "Rendimiento de proyectos",

      "hr-architecture":
        "Arquitectura de RR. HH.",
      "hr-resources": "Recursos",
      "hr-absences":
        "Ausencias y permisos",
      "hr-workload":
        "Dotación y capacidad",
      "hr-time":
        "Tiempo y actividades",
      "hr-skills": "Competencias",
      "hr-onboarding":
        "Incorporación",
      "hr-interviews":
        "Evaluaciones y objetivos",

      "quality-overview":
        "Vista general",
      risks: "Riesgos",
      deliverables: "Entregables",
      "non-conformities":
        "No conformidades",
      audits: "Auditorías",
      "quality-documents":
        "Documentos y procedimientos",

      "finance-overview":
        "Vista financiera",
      margins:
        "Valoración y márgenes",
      billing: "Facturación",
      treasury: "Tesorería",
      collections:
        "Cobros y recordatorios",
      expenses: "Gastos",

      "shared-documents":
        "Documentos compartidos",
      automation: "Automatizaciones",
    },
  },
};

export function getTranslations(
  language: LanguageCode,
) {
  return translations[language];
}

export function getStoredLanguage():
  LanguageCode {
  if (typeof window === "undefined") {
    return "FR";
  }

  const storedValue =
    window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    );

  if (
    storedValue === "EN" ||
    storedValue === "ES"
  ) {
    return storedValue;
  }

  return "FR";
}