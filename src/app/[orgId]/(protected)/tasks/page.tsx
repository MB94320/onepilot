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
};

export default function TasksPage() {
  const supabase = createClient();

  const {
    organization,
    isAuthenticated,
    isLoadingAuth,
  } = useAuth();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (isLoadingAuth) {
        return;
      }

      if (!isAuthenticated || !organization) {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      setIsLoadingTasks(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
            id,
            organization_id,
            project_id,
            created_by,
            title,
            details,
            status,
            created_at,
            updated_at
          `,
        )
        .eq("organization_id", organization.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        setErrorMessage(error.message);
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }

      setTasks((data ?? []) as TaskRow[]);
      setIsLoadingTasks(false);
    };

    void loadTasks();
  }, [
    organization,
    isAuthenticated,
    isLoadingAuth,
    supabase,
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
          Tâches
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Liste des tâches visibles pour l’organisation
          active.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Organisation active
            </dt>

            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {organization?.name ?? "Aucune"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Nombre de tâches
            </dt>

            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
              {tasks.length}
            </dd>
          </div>
        </dl>
      </section>

      {isLoadingTasks && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          Chargement des tâches...
        </section>
      )}

      {errorMessage && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Erreur : {errorMessage}
        </section>
      )}

      {!isLoadingTasks &&
        !errorMessage &&
        tasks.length === 0 && (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            Aucune tâche trouvée.
          </section>
        )}

      {!isLoadingTasks &&
        !errorMessage &&
        tasks.length > 0 && (
          <section className="grid gap-4">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                      {task.title}
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Projet : {task.project_id}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {task.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {task.details ?? "Aucun détail"}
                </p>
              </article>
            ))}
          </section>
        )}
    </div>
  );
}