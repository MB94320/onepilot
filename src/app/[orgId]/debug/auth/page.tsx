"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function DebugAuthPage() {
  const {
    user,
    rawUser,
    organization,
    memberships,
    isAuthenticated,
    isLoadingAuth,
    login,
    signup,
    loginAsDemo,
    logout,
  } = useAuth();

  const [email, setEmail] = useState("demo@onepilot.local");
  const [password, setPassword] = useState("Demo123456!");
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const result = await login(email, password);
    setMessage(result.error ? `Erreur: ${result.error}` : "Connexion réussie");
  };

  const handleSignup = async () => {
    const result = await signup(email, password);
    setMessage(
      result.error
        ? `Erreur: ${result.error}`
        : "Inscription envoyée ou utilisateur créé"
    );
  };

  const handleDemo = async () => {
    const result = await loginAsDemo();
    setMessage(result.error ? `Erreur: ${result.error}` : "Connexion démo réussie");
  };

  const handleLogout = async () => {
    await logout();
    setMessage("Déconnexion effectuée");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Debug Auth</h1>
          <p className="text-slate-600">
            Vérification du provider Supabase Auth.
          </p>
        </div>

        <div className="grid gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="px-4 py-3 rounded-xl border border-slate-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="px-4 py-3 rounded-xl border border-slate-300"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleLogin}
            className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
          >
            Login
          </button>

          <button
            onClick={handleSignup}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
          >
            Signup
          </button>

          <button
            onClick={handleDemo}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Login demo
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-900 hover:bg-slate-300"
          >
            Logout
          </button>
        </div>

        {message && (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        <div className="space-y-2 text-sm">
          <p>
            <strong>isLoadingAuth :</strong> {String(isLoadingAuth)}
          </p>
          <p>
            <strong>isAuthenticated :</strong> {String(isAuthenticated)}
          </p>
          <p>
            <strong>User ID :</strong> {user?.id ?? "Aucun utilisateur"}
          </p>
          <p>
            <strong>Nom :</strong> {user?.full_name ?? "Aucun utilisateur"}
          </p>
          <p>
            <strong>Email :</strong> {user?.email ?? "Aucun email"}
          </p>
          <p>
            <strong>Rôle :</strong> {user?.role ?? "Aucun rôle"}
          </p>
          <p>
            <strong>Raw user email :</strong> {rawUser?.email ?? "Aucun raw user"}
          </p>
                    <p>
            <strong>Organisation active :</strong> {organization?.name ?? "Aucune"}
          </p>
          <p>
            <strong>Slug organisation :</strong> {organization?.slug ?? "Aucun"}
          </p>
          <p>
            <strong>Type organisation :</strong> {organization?.type ?? "Aucun"}
          </p>
          <p>
            <strong>Nombre d’adhésions :</strong> {memberships.length}
          </p>
        </div>
      </div>
    </main>
  );
}