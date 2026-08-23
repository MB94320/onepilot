"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import ProjectPertBoard from "@/components/projects/ProjectPertBoard";

type AnyRow = Record<string, any>;

export default function ProjectPertGroup({ project, tasks, dependencies }: { project: AnyRow; tasks: AnyRow[]; dependencies: AnyRow[] }) {
  const [open, setOpen] = useState(false);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 text-left"><span className="flex items-center gap-3"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700"><GitBranch className="h-4 w-4" /></span><span><strong className="block text-sm font-black text-slate-950">{project.code} · {project.name}</strong><small className="mt-1 block text-xs text-slate-500">{tasks.length} tâche(s) · ouvrir pour afficher les indicateurs, la séquence, l’analyse et le réseau PERT.</small></span></span>{open ? <ChevronUp className="h-5 w-5 text-indigo-700" /> : <ChevronDown className="h-5 w-5 text-indigo-700" />}</button>{open && <div className="border-t border-slate-200 p-4"><ProjectPertBoard tasks={tasks} dependencies={dependencies} /></div>}</section>;
}
