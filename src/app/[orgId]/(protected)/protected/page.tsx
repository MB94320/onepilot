"use client";

import { useAuth } from "@/lib/AuthContext";

export default function ProtectedPage() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Page protégée</h1>
          <p className="text-slate-600">
            Cette page est accessible uniquement si un utilisateur est connecté.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p>
            <strong>Nom :</strong> {user?.full_name}
          </p>
          <p>
            <strong>Email :</strong> {user?.email}
          </p>
          <p>
            <strong>Rôle :</strong> {user?.role}
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </main>
  );
}