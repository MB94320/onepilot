"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import ProjectPertBoard from "@/components/projects/ProjectPertBoard";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";

type AnyRow = Record<string, any>;

export default function ProjectPertGroup({ project, tasks, dependencies }: { project: AnyRow; tasks: AnyRow[]; dependencies: AnyRow[] }) {
  const [open, setOpen] = useState(false);
  const captureRef = useRef<HTMLElement | null>(null);
  return <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto fullscreen:bg-white">
    <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><GitBranch className="h-4 w-4" /></span>
        <span className="min-w-0"><strong className="block truncate text-sm font-black text-slate-950">{project.code} · {project.name}</strong><small className="mt-1 block text-xs text-slate-500">{tasks.length} tâche(s) · indicateurs, séquence critique, recommandation et réseau PERT.</small></span>
      </button>
      <div className="flex items-center gap-2"><ProjectVisualActions targetRef={captureRef} fileName={`onepilot-pert-${project.code}`} label={`le chemin critique ${project.code}`} /><button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? "Réduire le chemin critique" : "Afficher le chemin critique"} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700 shadow-sm hover:bg-indigo-50">{open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button></div>
    </div>
    {open && <div className="border-t border-slate-200 p-4"><ProjectPertBoard tasks={tasks} dependencies={dependencies} /></div>}
  </section>;
}
