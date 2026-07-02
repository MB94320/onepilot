"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

type TaskRow = {
  id: string;
  organization_id: string;
  project_id: string;
  created_by: string;
  title: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  projects?: {
    id: string;
    name: string;
  }[] | null;
};

export default function TasksPage() {
  const supabase = createClient();
  const { organization, isAuthenticated, isLoadingAuth } = useAuth();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (isLoadingAuth) return;

      if (!isAuthenticated || !organization) {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      setIsLoadingTasks(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          organization_id,
          project_id,
          created_by,
          title,
          details,
          status,
          created_at,
          updated_at,
          projects:project_id (
            id,
            name
          )
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      setTasks((data ?? []) as TaskRow[]);
      setIsLoadingTasks(false);
    };

    loadTasks();
  }, [organization, isAuthenticated, isLoadingAuth]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-600 mt-2">
            Liste des tâches visibles pour l’organisation active.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 space-y-3">
          <p>
            <strong>Organisation active :</strong> {organization?.name ?? "Aucune"}
          </p>
          <p>
            <strong>Nombre de tâches :</strong> {tasks.length}
          </p>

          {isLoadingTasks && <p>Chargement des tâches...</p>}

          {errorMessage && (
            <p className="text-red-600">
              <strong>Erreur :</strong> {errorMessage}
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {!isLoadingTasks && !errorMessage && tasks.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              Aucune tâche trouvée.
            </div>
          )}

          {tasks.map((task) => (
            <article key={task.id} className="bg-white rounded-2xl shadow p-6 space-y-2">
              <h2 className="text-lg font-semibold">{task.title}</h2>
              <p className="text-sm text-slate-500">
                <strong>Status :</strong> {task.status}
              </p>
              <p className="text-sm text-slate-500">
                <strong>Projet :</strong> {task.projects?.[0]?.name ?? "Projet inconnu"}
              </p>
              <p className="text-sm text-slate-500">
                <strong>ID projet :</strong> {task.project_id}
              </p>
              <p className="text-sm text-slate-700">
                {task.details ?? "Aucun détail"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}