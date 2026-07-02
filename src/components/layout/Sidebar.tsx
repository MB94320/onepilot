"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight,
  LayoutDashboard, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  DollarSign, 
  Target, 
  Sliders,
  FolderLock
} from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
};

export default function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;
  const [mounted, setMounted] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    executif: true,
    commerce: true,
    ressources: true,
    operations: true,
    qualite: false,
    finance: false,
    processOutils: false,
    admin: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleSection = (section: string) => {
    if (!isOpen) return; // Désactivé si la sidebar est rétractée
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getHref = (path: string) => `/${orgId}${path}`;

  const menuStructure = [
    { id: "executif", title: "EXÉCUTIF", icon: LayoutDashboard, chapters: [{ name: "Tableau de bord", href: "/dashboard" }] },
    { id: "commerce", title: "COMMERCES", icon: Target, chapters: [
        { name: "Clients", href: "/clients" },
        { name: "Prospects", href: "/prospects" },
        { name: "Avant-Vente", href: "/avant-vente" },
        { name: "Commandes", href: "/commandes" }
    ]},
    { id: "ressources", title: "RESSOURCES", icon: Users, chapters: [
        { name: "Membres de l'équipe", href: "/rh/ressources" },
        { name: "Calendrier absences", href: "/rh/absences" },
        { name: "Plan de charge", href: "/rh/charge" },
        { name: "Pointages", href: "/rh/pointages" },
        { name: "Compétences", href: "/rh/competences" }
    ]},
    { id: "operations", title: "OPÉRATIONS", icon: Briefcase, chapters: [
        { name: "Projets", href: "/projects" },
        { name: "Timeline globale", href: "/projects/timeline" },
        { name: "Planification & Gantt", href: "/projects/gantt" }
    ]},
    { id: "qualite", title: "QUALITÉ", icon: ShieldCheck, chapters: [
        { name: "Risques", href: "/qualite/risques" },
        { name: "Livrables", href: "/qualite/livrables" },
        { name: "Non-conformité", href: "/qualite/non-conformite" },
        { name: "Performance", href: "/projects/performance" },
        { name: "Actions", href: "/projects/actions" },
        { name: "Audit", href: "/qualite/audit" }
    ]},
    { id: "finance", title: "FINANCE", icon: DollarSign, chapters: [
        { name: "Valorisation & Marges", href: "/finance/marges" },
        { name: "Facturation", href: "/finance/facturation" },
        { name: "Trésorerie", href: "/finance/tresorerie" }
    ]},
    { id: "processOutils", title: "PROCESS & OUTILS", icon: FolderLock, chapters: [
        { name: "Documents partagés", href: "/finance/documents" }
    ]}
  ];

  const adminActive = pathname.includes("/admin");

  return (
    <aside className={`flex h-screen shrink-0 flex-col border-r border-slate-100 bg-white text-slate-900 dark:border-slate-800/70 dark:bg-[#0b0f19] dark:text-slate-100 transition-all duration-200 ${isOpen ? "w-[240px]" : "w-[54px]"}`}>
      
      {/* EN-TÊTE : S'adapte si rétracté */}
      <div className="flex h-[52px] items-center gap-2.5 border-b border-slate-100 px-4 dark:border-slate-800 bg-slate-50/30 dark:bg-[#090d16]/20 overflow-hidden whitespace-nowrap">
        <div className="relative h-6 w-6 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
        </div>
        {isOpen && (
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[12px] tracking-[0.14em] text-slate-900 dark:text-white">ONEPILOT</span>
            <span className="text-[6.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.12em] mt-0.5 whitespace-nowrap">UNIFIED LIFECYCLE ENGINE</span>
          </div>
        )}
      </div>

      {/* ARBORESCENCE : Mode Icone seule ou Complet */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2 overflow-x-hidden">
        {menuStructure.map((section) => {
          const isSectionOpen = openSections[section.id];
          const SectionIcon = section.icon;
          return (
            <div key={section.id} className="space-y-1">
              <button onClick={() => toggleSection(section.id)} className={`flex w-full items-center rounded px-2 py-1 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-900/40 ${!isOpen ? "justify-center h-8" : "justify-between"}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <SectionIcon className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 opacity-80" strokeWidth={2} />
                  {isOpen && <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider select-none">{section.title}</span>}
                </div>
                {isOpen && (isSectionOpen ? <ChevronDown className="h-3 w-3 text-slate-400 opacity-50" /> : <ChevronRight className="h-3 w-3 text-slate-400 opacity-50" />)}
              </button>
              
              {isSectionOpen && isOpen && (
                <div className="pl-3 space-y-0.5 border-l border-slate-100 dark:border-slate-800/80 ml-3.5 mt-0.5 whitespace-nowrap">
                  {section.chapters.map((chap) => {
                    const fullHref = getHref(chap.href);
                    const isActive = pathname === fullHref;
                    return (
                      <Link key={fullHref} href={fullHref} className={`flex items-center rounded px-2 py-0.5 text-[11px] font-medium transition-all ${isActive ? "bg-slate-100 text-slate-900 dark:bg-slate-800" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400"}`}>
                        {chap.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BLOC ADMINISTRATION HIGHLIGHTÉ EN BAS (Cliquable directement) */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-amber-500/[0.03] dark:bg-amber-500/[0.02]">
        <Link href={getHref("/admin")} className={`flex w-full items-center rounded px-2 transition-all hover:bg-amber-500/[0.08] ${adminActive ? "bg-amber-500/10" : ""} ${!isOpen ? "justify-center h-8" : "justify-start h-8"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Sliders className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" strokeWidth={2} />
            {isOpen && <span className={`text-[11px] uppercase tracking-wider select-none ${adminActive ? "font-bold text-amber-700 dark:text-amber-400" : "font-medium text-amber-700/80 dark:text-amber-500/80"}`}>Administration</span>}
          </div>
        </Link>
      </div>

    </aside>
  );
}