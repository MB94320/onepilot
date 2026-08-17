"use client";

import { useMemo, useRef } from "react";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";

type AnyRow = Record<string, any>;
type AuditTheme = AnyRow & { questionCount: number; score: number | null };

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—"; }
function fill(score: number | null) { return score == null ? "#cbd5e1" : score >= 80 ? "#6ee7b7" : score >= 65 ? "#fcd34d" : "#fda4af"; }
function short(value: unknown, length = 21) { const text = String(value || "Thème"); return text.length > length ? `${text.slice(0, length)}…` : text; }

function ThemeText({ row, x, y, width = 170 }: { row?: AuditTheme; x: number; y: number; width?: number }) {
  if (!row) return null;
  return <g><text x={x} y={y - 8} textAnchor="middle" fontSize={width < 150 ? 11 : 12} fontWeight="800" fill="#0f172a">{short(row.name, width < 150 ? 16 : 21)}</text><text x={x} y={y + 15} textAnchor="middle" fontSize="13" fontWeight="900" fill="#0f172a">{row.score == null ? "N/A" : `${row.score} %`} · {row.questionCount} ctrl.</text></g>;
}

export default function ProjectAuditArrow({ themes, questions, audits, responses }: { themes: AnyRow[]; questions: AnyRow[]; audits: AnyRow[]; responses: AnyRow[] }) {
  const captureRef = useRef<HTMLElement | null>(null);
  const latest = audits[0];
  const rows: AuditTheme[] = useMemo(() => {
    const latestResponses = responses.filter((row) => String(row.audit_id) === String(latest?.id) && !row.archived_at);
    return themes.map((theme) => {
      const questionCount = questions.filter((question) => String(question.theme_id) === String(theme.id)).length;
      const applicable = latestResponses.filter((response) => String(response.theme_id) === String(theme.id) && response.answer !== "na");
      const score = applicable.length ? Math.round(applicable.reduce((sum, response) => sum + Number(response.score || 0), 0) / applicable.length) : null;
      return { ...theme, questionCount, score };
    });
  }, [latest?.id, questions, responses, themes]);
  const base = rows.slice(0, 4);
  const shaft = rows.slice(4, 14);
  const delivery = rows.slice(14, 18);

  return <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto dark:border-slate-600 dark:bg-slate-700/70">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3 dark:border-slate-600 dark:from-sky-900/20 dark:via-slate-700 dark:to-indigo-900/20"><div><h3 className="text-sm font-black text-slate-950 dark:text-white">Chaîne de conformité AVV et Delivery</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Chaque bloc constitue la flèche d’audit, de l’engagement avant-vente jusqu’à la maîtrise du Delivery.</p></div><ProjectVisualActions targetRef={captureRef} fileName="onepilot-audit-conformite" label="la chaîne de conformité" /></div>
    <div data-visual-scroll className="overflow-x-auto bg-slate-50/60 p-5 dark:bg-slate-800/30">
      <svg viewBox="0 0 1800 600" className="min-w-[1500px]" role="img" aria-label="Flèche des thèmes de conformité depuis l’AVV vers le Delivery">
        <defs><filter id="audit-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#334155" floodOpacity=".16" /></filter></defs>
        <g filter="url(#audit-shadow)">
          {base.map((row, index) => { const column = index % 2; const upper = index < 2; const x = 35 + column * 185; const y1 = upper ? 120 : 300; const y2 = upper ? 300 : 480; const points = `${x},${y1} ${x + 155},${y1} ${x + 185},${y2} ${x + 30},${y2}`; return <g key={row.id}><polygon points={points} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.6" /><ThemeText row={row} x={x + 95} y={(y1 + y2) / 2} width={150} /></g>; })}
          {shaft.map((row, index) => { const column = index % 5; const upper = index < 5; const x = 405 + column * 185; const y1 = upper ? 180 : 300; const y2 = upper ? 300 : 420; const points = `${x},${y1} ${x + 160},${y1} ${x + 185},${(y1 + y2) / 2} ${x + 160},${y2} ${x},${y2} ${x + 25},${(y1 + y2) / 2}`; return <g key={row.id}><polygon points={points} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.6" /><ThemeText row={row} x={x + 94} y={(y1 + y2) / 2} width={160} /></g>; })}
          {delivery.map((row, index) => { const x0 = 1330; const tip = 1760; const points = index === 0 ? `${x0},110 ${x0 + 205},190 ${x0 + 205},300 ${x0},300` : index === 1 ? `${x0 + 205},190 ${tip},300 ${x0 + 205},300` : index === 2 ? `${x0},300 ${x0 + 205},300 ${x0 + 205},410 ${x0},490` : `${x0 + 205},300 ${tip},300 ${x0 + 205},410`; const cx = index % 2 === 0 ? x0 + 105 : x0 + 260; const cy = index < 2 ? 244 : 356; return <g key={row.id}><polygon points={points} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.8" /><ThemeText row={row} x={cx} y={cy} width={index % 2 ? 130 : 160} /></g>; })}
        </g>
        <text x="200" y="548" textAnchor="middle" fontSize="23" fontWeight="900" fill="#0369a1">AVV · opportunité, réponse et engagement</text>
        <path d="M410 530 H1300" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" /><path d="M1290 518 L1310 530 L1290 542" fill="none" stroke="#818cf8" strokeWidth="4" />
        <text x="1545" y="548" textAnchor="middle" fontSize="23" fontWeight="900" fill="#4f46e5">DELIVERY · exécution, qualité et capitalisation</text>
      </svg>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[10px] font-black dark:border-slate-600"><span className="text-emerald-700">Emerald · conforme ≥ 80 %</span><span className="text-amber-700">Amber · partiellement conforme 65–79 %</span><span className="text-rose-700">Rose · non conforme &lt; 65 %</span><span className="text-slate-600">Gris · non applicable</span><span className="ml-auto text-slate-600">{latest ? `${latest.audit_number} · ${formatDate(latest.audit_date)} · ${Number(latest.overall_score || 0).toFixed(1)} %` : "Aucun audit réalisé"}</span></div>
  </section>;
}
