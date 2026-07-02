"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

type ProjectStatus = "draft" | "active" | "archived";

type ProjectRow = {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at?: string | null;
};

type ProjectDraft = {
  name: string;
  description: string;
  status: ProjectStatus;
};

const STATUS_OPTIONS: ProjectStatus[] = ["draft", "active", "archived"];

function formatDate(value?: string | null) {
  if (!value) return "Non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClasses(status: ProjectStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }

  if (status === "archived") {
    return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
}

export default function ProjectsPage() {
  const supabase = useMemo(() => createClient(), []);
  const { organization, user, isAuthenticated, isLoadingAuth } = useAuth();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<ProjectStatus>("draft");
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProjectDraft | null>(null);
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadProjects = async () => {
    if (isLoadingAuth) return;

    if (!isAuthenticated || !organization) {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }

    setIsLoadingProjects(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, organization_id, created_by, name, description, status, created_at, updated_at"
      )
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }

    setProjects((data ?? []) as ProjectRow[]);
    setIsLoadingProjects(false);
  };

  useEffect(() => {
    loadProjects();
  }, [organization, isAuthenticated, isLoadingAuth]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === "all" ? true : project.status === statusFilter;

      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : project.name.toLowerCase().includes(normalizedSearch) ||
            (project.description ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [projects, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((project) => project.status === "active").length;
    const draft = projects.filter((project) => project.status === "draft").length;
    const archived = projects.filter(
      (project) => project.status === "archived"
    ).length;

    return { total, active, draft, archived };
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !user) {
      setCreateMessage(
        "Impossible de créer un projet sans utilisateur ou organisation active."
      );
      return;
    }

    if (!name.trim()) {
      setCreateMessage("Le nom du projet est obligatoire.");
      return;
    }

    setIsCreating(true);
    setCreateMessage(null);
    setActionMessage(null);

    const { error } = await supabase.from("projects").insert({
      organization_id: organization.id,
      created_by: user.id,
      name: name.trim(),
      description: description.trim() || null,
      status: createStatus,
    });

    if (error) {
      setCreateMessage(`Erreur : ${error.message}`);
      setIsCreating(false);
      return;
    }

    setName("");
    setDescription("");
    setCreateStatus("draft");
    setCreateMessage("Projet créé avec succès.");
    setIsCreating(false);
    await loadProjects();
  };

  const startEdit = (project: ProjectRow) => {
    setEditingProjectId(project.id);
    setEditDraft({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
    });
    setActionMessage(null);
  };

  const cancelEdit = () => {
    setEditingProjectId(null);
    setEditDraft(null);
  };

  const handleSaveProject = async (projectId: string) => {
    if (!editDraft) return;

    if (!editDraft.name.trim()) {
      setActionMessage("Le nom du projet est obligatoire.");
      return;
    }

    setSavingProjectId(projectId);
    setActionMessage(null);

    const { error } = await supabase
      .from("projects")
      .update({
        name: editDraft.name.trim(),
        description: editDraft.description.trim() || null,
        status: editDraft.status,
      })
      .eq("id", projectId)
      .select();

    if (error) {
      setActionMessage(`Erreur update : ${error.message}`);
      setSavingProjectId(null);
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              name: editDraft.name.trim(),
              description: editDraft.description.trim() || null,
              status: editDraft.status,
            }
          : project
      )
    );

    setActionMessage("Projet mis à jour.");
    setSavingProjectId(null);
    cancelEdit();
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm(
      "Supprimer ce projet ? Cette action est définitive."
    );
    if (!confirmed) return;

    setDeletingProjectId(projectId);
    setActionMessage(null);

    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) {
      setActionMessage(`Erreur delete : ${error.message}`);
      setDeletingProjectId(null);
      return;
    }

    setProjects((current) => current.filter((project) => project.id !== projectId));
    setActionMessage("Projet supprimé.");
    setDeletingProjectId(null);

    if (editingProjectId === projectId) {
      cancelEdit();
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 shadow-2xl">
            <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.6fr_0.9fr] lg:px-8">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
                  Workspace projets
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Une interface projets plus propre, plus rapide, plus prête pour la suite.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Tu peux créer, filtrer, modifier et ouvrir tes projets depuis une vue
                    centrale pensée pour accueillir ensuite les tâches, assignations,
                    priorités et futures automatisations.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Organisation active
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {organization?.name ?? "Aucune"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Projets visibles
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">{projects.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                    Active
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stats.active}</p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
                    Draft
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stats.draft}</p>
                </div>

                <div className="rounded-2xl border border-slate-400/20 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                    Archived
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stats.archived}</p>
                </div>

                <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                    Total
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stats.total}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
            <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Créer un projet</h2>
                <p className="text-sm text-slate-400">
                  Prépare la base pour les prochaines vues détail, tâches et workflows.
                </p>
              </div>

              <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Nom du projet
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex. Refonte espace client"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Objectif, périmètre, notes d'équipe, contexte..."
                    rows={5}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Statut initial
                  </label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as ProjectStatus)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Création..." : "Créer le projet"}
                </button>
              </form>

              {createMessage && (
                <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
                  {createMessage}
                </div>
              )}
            </aside>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-white">Pilotage des projets</h2>
                  <p className="text-sm text-slate-400">
                    Recherche, filtres, édition et accès direct à la page projet.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      Recherche
                    </label>
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nom ou description..."
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                      Filtre statut
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "all" | ProjectStatus)
                      }
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="all">all</option>
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="archived">archived</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                  {filteredProjects.length} projet(s) affiché(s)
                </div>

                {statusFilter !== "all" && (
                  <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                    Filtre actif : {statusFilter}
                  </div>
                )}

                {searchTerm.trim().length > 0 && (
                  <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
                    Recherche : {searchTerm}
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {actionMessage && (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {actionMessage}
                </div>
              )}

              {isLoadingProjects && (
                <div className="mt-5 grid gap-4">
                  <div className="h-36 animate-pulse rounded-3xl bg-slate-800" />
                  <div className="h-36 animate-pulse rounded-3xl bg-slate-800" />
                  <div className="h-36 animate-pulse rounded-3xl bg-slate-800" />
                </div>
              )}

              {!isLoadingProjects && filteredProjects.length === 0 && (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 px-6 py-10 text-center">
                  <p className="text-base font-medium text-white">
                    Aucun projet ne correspond à ta recherche.
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Essaie un autre mot-clé ou retire le filtre de statut.
                  </p>
                </div>
              )}

              {!isLoadingProjects && filteredProjects.length > 0 && (
                <div className="mt-5 grid gap-4">
                  {filteredProjects.map((project) => {
                    const isEditing = editingProjectId === project.id;
                    const isSaving = savingProjectId === project.id;
                    const isDeleting = deletingProjectId === project.id;

                    return (
                      <article
                        key={project.id}
                        className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-lg"
                      >
                        <div className="flex flex-col gap-5 p-5">
                          {!isEditing ? (
                            <>
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0 flex-1 space-y-3">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-semibold text-white">
                                      {project.name}
                                    </h3>
                                    <span
                                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                        project.status
                                      )}`}
                                    >
                                      {project.status}
                                    </span>
                                  </div>

                                  <p className="max-w-3xl text-sm leading-6 text-slate-300">
                                    {project.description ?? "Aucune description pour ce projet."}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/projects/${project.id}`}
                                    className="rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                                  >
                                    Ouvrir
                                  </Link>

                                  <button
                                    onClick={() => startEdit(project)}
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800"
                                  >
                                    Modifier
                                  </button>

                                  <button
                                    onClick={() => handleDeleteProject(project.id)}
                                    disabled={isDeleting}
                                    className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isDeleting ? "Suppression..." : "Supprimer"}
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    Créé le
                                  </p>
                                  <p className="mt-2 text-sm text-slate-200">
                                    {formatDate(project.created_at)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    Mis à jour
                                  </p>
                                  <p className="mt-2 text-sm text-slate-200">
                                    {formatDate(project.updated_at)}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    Organisation
                                  </p>
                                  <p className="mt-2 truncate text-sm text-slate-200">
                                    {project.organization_id}
                                  </p>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    Créé par
                                  </p>
                                  <p className="mt-2 truncate text-sm text-slate-200">
                                    {project.created_by}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="grid gap-4">
                              <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-200">
                                    Nom du projet
                                  </label>
                                  <input
                                    value={editDraft?.name ?? ""}
                                    onChange={(e) =>
                                      setEditDraft((current) =>
                                        current
                                          ? { ...current, name: e.target.value }
                                          : current
                                      )
                                    }
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-200">
                                    Statut
                                  </label>
                                  <select
                                    value={editDraft?.status ?? "draft"}
                                    onChange={(e) =>
                                      setEditDraft((current) =>
                                        current
                                          ? {
                                              ...current,
                                              status: e.target.value as ProjectStatus,
                                            }
                                          : current
                                      )
                                    }
                                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                  >
                                    {STATUS_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-200">
                                  Description
                                </label>
                                <textarea
                                  value={editDraft?.description ?? ""}
                                  onChange={(e) =>
                                    setEditDraft((current) =>
                                      current
                                        ? { ...current, description: e.target.value }
                                        : current
                                    )
                                  }
                                  rows={5}
                                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveProject(project.id)}
                                  disabled={isSaving}
                                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                                </button>

                                <button
                                  onClick={cancelEdit}
                                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-slate-600 hover:bg-slate-800"
                                >
                                  Annuler
                                </button>

                                <Link
                                  href={`/projects/${project.id}`}
                                  className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 transition hover:bg-sky-500/20"
                                >
                                  Ouvrir la page projet
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}