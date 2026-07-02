"use client";

import Link from "next/link";

export default function NoOrganizationPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Aucune organisation</h1>
          <p className="text-slate-600">
            Ton compte est connecté, mais aucune organisation active n’est disponible.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link
            href="/debug/auth"
            className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
          >
            Ouvrir Debug Auth
          </Link>

          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-900 hover:bg-slate-300"
          >
            Retour accueil
          </Link>
        </div>
      </div>
    </main>
  );
}