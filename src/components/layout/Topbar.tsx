"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { Moon, Sun, Bell, Search, Menu, User, Settings, CreditCard, LogOut, ChevronDown, Shield } from "lucide-react";

type TopbarProps = {
  toggleSidebar: () => void;
};

const FlagFR = () => (
  <svg className="h-2.5 w-3.5 rounded-sm shrink-0 shadow-sm object-cover" viewBox="0 0 3 2">
    <path fill="#EC1B24" d="M0 0h3v2H0z"/>
    <path fill="#fff" d="M0 0h2v2H0z"/>
    <path fill="#00266F" d="M0 0h1v2H0z"/>
  </svg>
);

const FlagEN = () => (
  <svg className="h-2.5 w-3.5 rounded-sm shrink-0 shadow-sm object-cover" viewBox="0 0 50 30">
    <clipPath id="s"><path d="M0 0v30h50V0z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0 0v30h50V0z" fill="#012169"/>
      <path d="M0 0l50 30M50 0L0 30" stroke="#fff" strokeWidth="6"/>
      <path d="M0 0l50 30M50 0L0 30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M25 0v30M0 15h50" stroke="#fff" strokeWidth="10"/>
      <path d="M25 0v30M0 15h50" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

const FlagES = () => (
  <svg className="h-2.5 w-3.5 rounded-sm shrink-0 shadow-sm object-cover" viewBox="0 0 3 2">
    <path fill="#C8102E" d="M0 0h3v2H0z"/>
    <path fill="#FFD100" d="M0 .5h3v1H0z"/>
  </svg>
);

export default function Topbar({ toggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const params = useParams();
  const orgId = (params?.orgId as string) || "DEMO";
  
  let contextUser: any = null;
  let contextLogout: () => Promise<void> = async () => {};

  try {
    const auth = useAuth();
    if (auth) {
      contextUser = auth.user;
      contextLogout = auth.logout;
    }
  } catch (e) {
    // Mode dégradé si chargé hors contexte
  }

  const currentUser = {
    initials: contextUser?.full_name ? contextUser.full_name.substring(0, 2).toUpperCase() : "MB",
    fullName: contextUser?.full_name || "M. Bernard",
    email: contextUser?.email || "contact@onepilot.com",
    role: contextUser?.role || "Super Admin"
  };
  
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [dateStr, setDateStr] = useState("");
  
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState({ code: "FR", flag: <FlagFR /> });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    const date = new Date();
    setDateStr(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date));
    
    const storedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = storedTheme === "dark" || (!storedTheme && systemPrefersDark);
    
    setTheme(isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return <header className="flex h-[52px] shrink-0 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-[#0b0f19]" />;
  }

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const getBreadcrumbs = () => {
    if (pathname.includes("/dashboard")) return "Exécutif > Tableau de bord";
    if (pathname.includes("/prospects")) return "Commerces > Prospects CRM";
    if (pathname.includes("/avant-vente")) return "Commerces > Avant-Vente";
    if (pathname.includes("/clients")) return "Commerces > Clients";
    if (pathname.includes("/commandes")) return "Commerces > Commandes";
    if (pathname.includes("/rh/ressources")) return "Ressources > Membres de l'équipe";
    if (pathname.includes("/rh/absences")) return "Ressources > Calendrier absences";
    if (pathname.includes("/rh/charge")) return "Ressources > Plan de charge";
    if (pathname.includes("/rh/pointages")) return "Ressources > Pointages";
    if (pathname.includes("/rh/competences")) return "Ressources > Compétences";
    if (pathname.includes("/projects/performance")) return "Qualité > Performance";
    if (pathname.includes("/projects/actions")) return "Qualité > Actions";
    if (pathname.includes("/projects")) return "Opérations > Suivi Projets";
    if (pathname.includes("/qualite")) return "Qualité > Suivi";
    if (pathname.includes("/finance/documents")) return "Process & Outils > Documents partagés";
    if (pathname.includes("/finance")) return "Finance > Analyse";
    if (pathname.includes("/settings")) return "Administration > Configuration";
    if (pathname.includes("/roles")) return "Administration > Rôles & Permissions";
    if (pathname.includes("/org")) return "Administration > Mon Entreprise";
    if (pathname.includes("/admin")) return "Administration > Centre de Commandement";
    return "ONEPILOT > Espace de travail";
  };

  const languages = [
    { code: "FR", flag: <FlagFR /> },
    { code: "EN", flag: <FlagEN /> },
    { code: "ES", flag: <FlagES /> },
  ];

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 dark:border-slate-800 dark:bg-[#0b0f19] z-30 transition-all">
      
      {/* Menu & Ariane */}
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-all focus:outline-none"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 tracking-wide uppercase">
          {getBreadcrumbs()}
        </span>
      </div>

      {/* Barre de recherche */}
      <div className="flex-1 max-w-xs mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Recherche globale..." 
            className="w-full pl-8 pr-3 py-1 text-[11px] placeholder:text-[10px] bg-slate-50/80 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800/80 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Actions Droite */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:block text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize tracking-wide">
          {dateStr}
        </span>

        {/* Menu Cloche */}
        <div className="relative flex items-center" ref={bellRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-1.5 text-slate-400 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white transition-all focus:outline-none"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute top-1 right-1 h-1 w-1 rounded-full bg-teal-500 animate-pulse" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded shadow-xl py-1 z-50 font-medium text-[11px]">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-semibold text-slate-900 dark:text-white">Centre de contrôle</span>
                <span className="text-[9px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-1 rounded font-bold">2 nouvelles</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">🚀 Système ONEPILOT activé</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Moteur de cycle unifié opérationnel.</p>
                </div>
                <div className="px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">📊 Supabase Connecté</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Instance de données synchronisée.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sélecteur de Langue */}
        <div className="relative flex items-center" ref={langRef}>
          <button 
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] font-medium bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-all focus:outline-none"
          >
            {currentLang.flag}
            <span className="text-slate-700 dark:text-slate-300 font-semibold tracking-wide text-[10px]">{currentLang.code}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          
          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-20 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded shadow-xl py-0.5 z-50">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setCurrentLang(l);
                    setLangOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1 text-[11px] font-semibold text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                >
                  {l.flag}
                  <span className="text-[10px]">{l.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Commutateur de Thème */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded bg-slate-50 border border-slate-200 dark:border-slate-800/80 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all focus:outline-none"
        >
          {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>

        {/* Bloc Profil - RECTANGLE NOIR COMPACT UNIQUE */}
        <div className="relative flex items-center" ref={profileRef}>
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center focus:outline-none"
          >
            <div className="h-7 px-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px] flex items-center justify-center rounded hover:opacity-90 transition-all tracking-wider font-sans whitespace-nowrap shadow-sm">
              {orgId.toUpperCase()} - {currentUser.initials}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded shadow-xl py-1 z-50 font-medium text-[11px]">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[9.5px] text-slate-400 truncate mt-0.5">
                  {currentUser.email}
                </p>
                <span className="inline-flex items-center gap-1 text-[8.5px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wide">
                  <Shield className="h-2.5 w-2.5" /> {currentUser.role}
                </span>
              </div>
              
              <Link href={`/${orgId}/admin?tab=security`} onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <User className="h-3.5 w-3.5 opacity-70" /> Mon Profil
              </Link>
              
              <Link href={`/${orgId}/admin?tab=billing`} onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <CreditCard className="h-3.5 w-3.5 opacity-70" /> Mon Abonnement
              </Link>
              
              <Link href={`/${orgId}/admin?tab=dashboard`} onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <Settings className="h-3.5 w-3.5 opacity-70" /> Administration
              </Link>
              
              <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-0.5">
                <button 
                  onClick={async () => {
                    setProfileOpen(false);
                    try {
                      await contextLogout();
                    } catch (err) {
                      // Protection contextuelle
                    }
                    window.location.href = "/login";
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 font-semibold"
                >
                  <LogOut className="h-3.5 w-3.5" /> Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}