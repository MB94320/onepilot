"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

type ProjectRow = {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type TaskRow = {
  id: string;
  organization_id: string;
  project_id: string;
  created_by: string;
  title: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

export default function ProjectDetailsPage() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const { organization, user, isAuthenticated, isLoadingAuth } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("todo");
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);

  const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const loadPage = async () => {
    if (isLoadingAuth) return;

    if (!isAuthenticated || !organization || !projectId) {
      setIsLoadingPage(false);
      return;
    }

    setIsLoadingPage(true);
    setErrorMessage(null);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, organization_id, created_by, name, description, status, created_at, updated_at"
      )
      .eq("id", projectId)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (projectError) {
      setErrorMessage(projectError.message);
      setProject(null);
      setTasks([]);
      setIsLoadingPage(false);
      return;
    }

    if (!projectData) {
      setErrorMessage("Projet introuvable.");
      setProject(null);
      setTasks([]);
      setIsLoadingPage(false);
      return;
    }

    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, project_id, created_by, title, details, status, created_at, updated_at"
      )
      .eq("project_id", projectId)
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (tasksError) {
      setErrorMessage(tasksError.message);
      setProject(projectData as ProjectRow);
      setTasks([]);
      setIsLoadingPage(false);
      return;
    }

    const nextTasks = (tasksData ?? []) as TaskRow[];

    setProject(projectData as ProjectRow);
    setTasks(nextTasks);
    setDraftStatuses(
      nextTasks.reduce<Record<string, string>>((acc, task) => {
        acc[task.id] = task.status;
        return acc;
      }, {})
    );
    setIsLoadingPage(false);
  };

  useEffect(() => {
    loadPage();
  }, [projectId, organization, isAuthenticated, isLoadingAuth]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !user || !projectId) {
      setTaskMessage("Impossible de créer la tâche sans utilisateur, projet ou organisation.");
      return;
    }

    if (!title.trim()) {
      setTaskMessage("Le titre de la tâche est obligatoire.");
      return;
    }

    setIsCreatingTask(true);
    setTaskMessage(null);

    const { error } = await supabase.from("tasks").insert({
      organization_id: organization.id,
      project_id: projectId,
      created_by: user.id,
      title: title.trim(),
      details: details.trim() || null,
      status,
    });

    if (error) {
      setTaskMessage(`Erreur : ${error.message}`);
      setIsCreatingTask(false);
      return;
    }

    setTitle("");
    setDetails("");
    setStatus("todo");
    setTaskMessage("Tâche créée avec succès.");
    setIsCreatingTask(false);
    await loadPage();
  };

  const handleDraftStatusChange = (taskId: string, nextStatus: string) => {
    setDraftStatuses((current) => ({
      ...current,
      [taskId]: nextStatus,
    }));
  };

  const handleSaveTaskStatus = async (taskId: string) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    const draftStatus = draftStatuses[taskId];

    if (!currentTask || !draftStatus) return;

    if (currentTask.status === draftStatus) {
      setTaskMessage("Aucun changement à enregistrer pour cette tâche.");
      return;
    }

    setUpdatingTaskId(taskId);
    setTaskMessage(null);

    const { error } = await supabase
      .from("tasks")
      .update({ status: draftStatus })
      .eq("id", taskId)
      .select();

    if (error) {
      setTaskMessage(`Erreur update tâche : ${error.message}`);
      setUpdatingTaskId(null);
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: draftStatus } : task
      )
    );

    setTaskMessage("Statut de la tâche mis à jour.");
    setUpdatingTaskId(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("Supprimer cette tâche ?");
    if (!confirmed) return;

    setDeletingTaskId(taskId);
    setTaskMessage(null);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      setTaskMessage(`Erreur suppression tâche : ${error.message}`);
      setDeletingTaskId(null);
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setDraftStatuses((current) => {
      const next = { ...current };
      delete next[taskId];
      return next;
    });
    setTaskMessage("Tâche supprimée.");
    setDeletingTaskId(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="bg-white rounded-2xl shadow p-6 flex-1 min-w-[280px]">
            <h1 className="text-2xl font-bold">Projet</h1>
            <p className="text-slate-600 mt-2">
              Vue détaillée du projet et de ses tâches liées.
            </p>
          </div>

          <Link
            href="/projects"
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-900 hover:bg-slate-300"
          >
            Retour Projects
          </Link>
        </div>

        {isLoadingPage && (
          <div className="bg-white rounded-2xl shadow p-6">
            Chargement du projet...
          </div>
        )}

        {errorMessage && (
          <div className="bg-white rounded-2xl shadow p-6 text-red-600">
            <strong>Erreur :</strong> {errorMessage}
          </div>
        )}

        {!isLoadingPage && project && (
          <>
            <section className="bg-white rounded-2xl shadow p-6 space-y-2">
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-slate-600">
                {project.description ?? "Aucune description"}
              </p>
              <p className="text-sm text-slate-500">
                <strong>Status :</strong> {project.status}
              </p>
              <p className="text-sm text-slate-500">
                <strong>Créé le :</strong> {project.created_at}
              </p>
              <p className="text-sm text-slate-500">
                <strong>Mis à jour le :</strong> {project.updated_at ?? "Non disponible"}
              </p>
            </section>

            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Créer une tâche</h2>
                <p className="text-slate-600 text-sm mt-1">
                  La tâche sera automatiquement rattachée à ce projet.
                </p>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid gap-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre de la tâche"
                    className="px-4 py-3 rounded-xl border border-slate-300"
                  />

                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Détails"
                    rows={4}
                    className="px-4 py-3 rounded-xl border border-slate-300"
                  />

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-4 py-3 rounded-xl border border-slate-300"
                  >
                    <option value="todo">todo</option>
                    <option value="in_progress">in_progress</option>
                    <option value="done">done</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {isCreatingTask ? "Création..." : "Créer la tâche"}
                </button>
              </form>

              {taskMessage && (
                <p className="text-sm text-slate-700">{taskMessage}</p>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Tâches du projet</h2>
                <p className="text-slate-600 text-sm mt-1">
                  Nombre de tâches : {tasks.length}
                </p>
              </div>

              <div className="grid gap-4">
                {tasks.length === 0 && (
                  <div className="border border-slate-200 rounded-xl p-4">
                    Aucune tâche pour ce projet.
                  </div>
                )}

                {tasks.map((task) => {
                  const draftStatus = draftStatuses[task.id] ?? task.status;
                  const hasChanges = draftStatus !== task.status;

                  return (
                    <article
                      key={task.id}
                      className="border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <p className="text-sm text-slate-500">
                            <strong>Status actuel :</strong> {task.status}
                          </p>
                          <p className="text-sm text-slate-700">
                            {task.details ?? "Aucun détail"}
                          </p>
                          <p className="text-xs text-slate-400">
                            Créée le : {task.created_at}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center">
                          <select
                            value={draftStatus}
                            onChange={(e) =>
                              handleDraftStatusChange(task.id, e.target.value)
                            }
                            disabled={updatingTaskId === task.id}
                            className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
                          >
                            <option value="todo">todo</option>
                            <option value="in_progress">in_progress</option>
                            <option value="done">done</option>
                          </select>

                          <button
                            onClick={() => handleSaveTaskStatus(task.id)}
                            disabled={updatingTaskId === task.id || !hasChanges}
                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingTaskId === task.id ? "Enregistrement..." : "Enregistrer"}
                          </button>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deletingTaskId === task.id}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingTaskId === task.id ? "Suppression..." : "Supprimer"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}