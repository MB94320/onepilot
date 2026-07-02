"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth(); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await login(email, password);

    if (authError) {
      setError("Identifiants de connexion introuvables ou incorrects.");
      setLoading(false);
    } else {
      // Redirection après succès vers ton organisation
      router.push("/demo/dashboard"); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 antialiased font-sans selection:bg-teal-500/20">
      
      {/* Trame de fond claire */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a04_1px,transparent_1px),linear-gradient(to_bottom,#0f172a04_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="w-full max-w-[380px] relative z-10">
        
        {/* Header avec logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 h-12 flex items-center justify-center">
            {!imgError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src="/logo.png" 
                alt="Onepilot Logo" 
                className="h-12 w-auto object-contain max-w-[180px]"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="text-xl font-black tracking-wider text-slate-950 flex items-center gap-2">
                <svg className="h-5 w-5 text-slate-950 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                <span>ONEPILOT</span>
              </div>
            )}
          </div>
          
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Accéder à la plateforme
          </h1>
          <p className="text-slate-400 text-[9.5px] font-bold mt-1.5 tracking-widest uppercase">
            UNIFIED LIFECYCLE ENGINE • <span className="text-teal-600">ONEPILOT</span>
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Adresse électronique
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-[12px] text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 transition-all" 
                  placeholder="mbsup213@gmail.com"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Mot de passe
                </label>
                <a href="#" className="text-[10px] text-slate-400 hover:text-slate-900 font-medium tracking-wide transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-[12px] text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5 transition-all" 
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-medium leading-relaxed">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-slate-950/10"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Vérification des droits...</span>
                </>
              ) : (
                <>
                  <span>Connexion</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-80" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer texte en bas */}
        <p className="text-center mt-6 text-[9px] text-slate-400 uppercase tracking-widest font-medium">
          Onepilot Core Engine v4.2 • Secured Instance
        </p>
      </div>
    </div>
  );
}