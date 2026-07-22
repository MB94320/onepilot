"use client";

import { useId, useMemo } from "react";
import { GitBranch, Route } from "lucide-react";

import { HrInfo, HrStatusBadge } from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;

type Node = {
  id: string;
  code: string;
  name: string;
  duration: number;
  predecessors: string[];
  successors: string[];
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  float: number;
  critical: boolean;
  rank: number;
};

function durationDays(row: AnyRow) {
  if (Number(row.duration_days) > 0) return Number(row.duration_days);
  if (!row.start_date || !row.due_date) return 1;
  const start = new Date(`${row.start_date}T12:00:00`);
  const end = new Date(`${row.due_date}T12:00:00`);
  let total = 0;
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) if (![0, 6].includes(cursor.getDay())) total += 1;
  return Math.max(1, total);
}

function calculateNetwork(tasks: AnyRow[], dependencies: AnyRow[]) {
  const active = tasks.filter((task) => !task.archived_at && !["cancelled", "archived"].includes(String(task.status)));
  const ids = new Set(active.map((task) => String(task.id)));
  const predecessorMap = new Map<string, string[]>();
  const successorMap = new Map<string, string[]>();
  active.forEach((task) => { predecessorMap.set(String(task.id), []); successorMap.set(String(task.id), []); });
  dependencies.forEach((link) => {
    const predecessor = String(link.predecessor_task_id || link.predecessor_id || "");
    const successor = String(link.successor_task_id || link.successor_id || "");
    if (!ids.has(predecessor) || !ids.has(successor)) return;
    predecessorMap.get(successor)?.push(predecessor);
    successorMap.get(predecessor)?.push(successor);
  });
  const indegree = new Map(active.map((task) => [String(task.id), predecessorMap.get(String(task.id))?.length || 0]));
  const queue = active.map((task) => String(task.id)).filter((id) => indegree.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!; order.push(id);
    (successorMap.get(id) || []).forEach((successor) => { const next = (indegree.get(successor) || 0) - 1; indegree.set(successor, next); if (next === 0) queue.push(successor); });
  }
  active.map((task) => String(task.id)).filter((id) => !order.includes(id)).forEach((id) => order.push(id));
  const taskMap = new Map(active.map((task) => [String(task.id), task]));
  const nodes = new Map<string, Node>();
  order.forEach((id) => {
    const task = taskMap.get(id)!;
    const predecessors = predecessorMap.get(id) || [];
    const earliestStart = Math.max(0, ...predecessors.map((predecessor) => nodes.get(predecessor)?.earliestFinish || 0));
    const duration = durationDays(task);
    const rank = Math.max(0, ...predecessors.map((predecessor) => (nodes.get(predecessor)?.rank || 0) + 1));
    nodes.set(id, { id, code: String(task.code || task.wbs_code || "Tâche"), name: String(task.name || "Tâche"), duration, predecessors, successors: successorMap.get(id) || [], earliestStart, earliestFinish: earliestStart + duration, latestStart: 0, latestFinish: 0, float: 0, critical: false, rank });
  });
  const projectDuration = Math.max(0, ...[...nodes.values()].map((node) => node.earliestFinish));
  [...order].reverse().forEach((id) => {
    const node = nodes.get(id)!;
    const latestFinish = node.successors.length ? Math.min(...node.successors.map((successor) => nodes.get(successor)?.latestStart ?? projectDuration)) : projectDuration;
    node.latestFinish = latestFinish; node.latestStart = latestFinish - node.duration; node.float = Math.max(0, node.latestStart - node.earliestStart); node.critical = node.float === 0;
  });
  return { nodes: order.map((id) => nodes.get(id)!), projectDuration };
}

export default function ProjectPertBoard({ tasks, dependencies, onEditTask }: { tasks: AnyRow[]; dependencies: AnyRow[]; onEditTask?: (row: AnyRow) => void }) {
  const markerId = `pert-arrow-${useId().replace(/:/g, "")}`;
  const taskMap = useMemo(() => new Map(tasks.map((task) => [String(task.id), task])), [tasks]);
  const network = useMemo(() => calculateNetwork(tasks, dependencies), [dependencies, tasks]);
  const layout = useMemo(() => {
    const ranks = new Map<number, Node[]>();
    network.nodes.forEach((node) => ranks.set(node.rank, [...(ranks.get(node.rank) || []), node]));
    const maxRank = Math.max(0, ...network.nodes.map((node) => node.rank));
    const maxRows = Math.max(1, ...[...ranks.values()].map((rows) => rows.length));
    const width = Math.max(1200, 220 + (maxRank + 1) * 260);
    const height = Math.max(420, 120 + maxRows * 150);
    const positions = new Map<string, { x: number; y: number }>();
    ranks.forEach((nodes, rank) => nodes.forEach((node, index) => positions.set(node.id, { x: 90 + rank * 260, y: 75 + index * 150 + ((maxRows - nodes.length) * 75) }))); 
    return { width, height, positions };
  }, [network.nodes]);
  const critical = network.nodes.filter((node) => node.critical);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrInfo label="Durée calculée du projet" value={`${network.projectDuration} j ouvrés`} accent="indigo" />
        <HrInfo label="Tâches du réseau" value={network.nodes.length} accent="emerald" />
        <HrInfo label="Tâches critiques" value={critical.length} accent={critical.length ? "rose" : "emerald"} />
        <HrInfo label="Marge moyenne" value={`${network.nodes.length ? (network.nodes.reduce((sum, node) => sum + node.float, 0) / network.nodes.length).toFixed(1) : 0} j`} accent="amber" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-700 dark:to-indigo-900/25"><span className="rounded-xl bg-rose-100 p-2.5 text-rose-700 dark:bg-rose-900/45 dark:text-rose-200"><Route className="h-4 w-4" /></span><div><h3 className="text-sm font-bold text-slate-950 dark:text-white">Réseau PERT et chemin critique calculé</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Les liaisons roses composent la plus longue séquence sans marge qui pilote la date de fin.</p></div></div>
        <div className="max-h-[560px] overflow-auto bg-slate-50/45 p-4 dark:bg-slate-800/30">
          <svg width={layout.width} height={layout.height} role="img" aria-label="Diagramme PERT du projet">
            <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
            {network.nodes.flatMap((node) => node.successors.map((successorId) => { const from = layout.positions.get(node.id)!; const to = layout.positions.get(successorId)!; const target = network.nodes.find((item) => item.id === successorId); const isCritical = node.critical && target?.critical; const startX = from.x + 190; const startY = from.y + 48; const endX = to.x; const endY = to.y + 48; const midX = (startX + endX) / 2; return <path key={`${node.id}-${successorId}`} d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`} fill="none" stroke={isCritical ? "#e11d48" : "#64748b"} strokeWidth={isCritical ? 3 : 1.5} strokeDasharray={isCritical ? undefined : "5 4"} markerEnd={`url(#${markerId})`} style={{ color: isCritical ? "#e11d48" : "#64748b" }} />; }))}
            {network.nodes.map((node) => { const position = layout.positions.get(node.id)!; return <g key={node.id} transform={`translate(${position.x} ${position.y})`} onClick={() => onEditTask?.(taskMap.get(node.id)!)} className={onEditTask ? "cursor-pointer" : ""}><rect width="190" height="96" rx="18" fill={node.critical ? "#fff1f2" : "#ffffff"} stroke={node.critical ? "#fb7185" : "#cbd5e1"} strokeWidth={node.critical ? 2.5 : 1.5} /><line x1="0" y1="30" x2="190" y2="30" stroke={node.critical ? "#fecdd3" : "#e2e8f0"} /><line x1="63" y1="0" x2="63" y2="30" stroke={node.critical ? "#fecdd3" : "#e2e8f0"} /><line x1="127" y1="0" x2="127" y2="30" stroke={node.critical ? "#fecdd3" : "#e2e8f0"} /><text x="31" y="20" textAnchor="middle" fontSize="12" fontWeight="800" fill="#059669">{node.earliestStart}</text><text x="95" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#475569">{node.duration} j</text><text x="158" y="20" textAnchor="middle" fontSize="12" fontWeight="800" fill="#e11d48">{node.earliestFinish}</text><text x="95" y="53" textAnchor="middle" fontSize="12" fontWeight="900" fill="#0f172a">{node.code}</text><text x="95" y="71" textAnchor="middle" fontSize="10" fill="#475569">{node.name.length > 27 ? `${node.name.slice(0, 27)}…` : node.name}</text><text x="95" y="88" textAnchor="middle" fontSize="10" fontWeight="800" fill={node.critical ? "#be123c" : "#64748b"}>Marge {node.float} j · {node.critical ? "CRITIQUE" : "non critique"}</text></g>; })}
          </svg>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700/70">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600 dark:from-sky-900/25 dark:via-slate-700 dark:to-indigo-900/25"><GitBranch className="h-4 w-4 text-rose-600" /><div><h3 className="text-sm font-bold text-slate-950 dark:text-white">Séquence critique</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Ordre des tâches à sécuriser pour ne pas décaler la date de fin calculée.</p></div></div>
        <div className="flex flex-wrap items-center gap-2 p-5">{critical.map((node, index) => <span key={node.id} className="inline-flex items-center gap-2"><button type="button" onClick={() => onEditTask?.(taskMap.get(node.id)!)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/25 dark:text-rose-200">{node.code} · {node.duration} j</button>{index < critical.length - 1 && <span className="text-rose-400">→</span>}</span>)}{!critical.length && <HrStatusBadge status="completed" label="Aucun chemin critique calculable" />}</div>
      </section>
    </div>
  );
}
