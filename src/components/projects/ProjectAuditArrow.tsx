"use client";

import { useMemo, useRef } from "react";
import { ClipboardCheck } from "lucide-react";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";

type AnyRow = Record<string, any>;
type AuditTheme = AnyRow & { questionCount: number; score: number | null };

function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`)) : "—"; }
function fill(score: number | null) { return score == null ? "#cbd5e1" : score >= 80 ? "#6ee7b7" : score >= 65 ? "#fcd34d" : "#fda4af"; }
function short(value: unknown, length = 18) { const text = String(value || "Thème"); return text.length > length ? `${text.slice(0, length)}…` : text; }

function ThemeText({ row, x, y, compact = false }: { row?: AuditTheme; x: number; y: number; compact?: boolean }) {
  if (!row) return null;
  return <g><text x={x} y={y - 7} textAnchor="middle" fontSize={compact ? 9 : 11} fontWeight="800" fill="#0f172a">{short(row.name, compact ? 13 : 18)}</text><text x={x} y={y + 13} textAnchor="middle" fontSize={compact ? 10 : 12} fontWeight="900" fill="#0f172a">{row.score == null ? "N/A" : `${row.score} %`}</text></g>;
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
  const upper = rows.filter((_, index) => index % 2 === 0).slice(0, 9);
  const lower = rows.filter((_, index) => index % 2 === 1).slice(0, 9);

  return <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><ClipboardCheck className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950">Chaîne de conformité AVV et Delivery</h3><p className="mt-1 text-xs text-slate-500">Les blocs constituent une chaîne continue, de la revue avant-vente jusqu’à l’exécution, la qualité et la capitalisation.</p></div></div><ProjectVisualActions targetRef={captureRef} fileName="onepilot-audit-conformite" label="la chaîne de conformité" /></div>
    <div data-visual-scroll className="overflow-hidden bg-slate-50/60 px-4 py-5">
      <svg data-visual-svg viewBox="0 0 1600 430" className="block h-auto w-full" role="img" aria-label="Chaîne continue des thèmes de conformité depuis l’AVV vers le Delivery">
        <defs><filter id="audit-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#334155" floodOpacity=".16" /></filter></defs>
        <rect x="22" y="28" width="340" height="365" rx="22" fill="#f0f9ff" fillOpacity=".72" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="9 8" />
        <rect x="370" y="28" width="1208" height="365" rx="22" fill="#eef2ff" fillOpacity=".55" stroke="#6366f1" strokeWidth="2" strokeDasharray="9 8" />
        <rect x="108" y="42" width="168" height="34" rx="17" fill="#0284c7" /><text x="192" y="64" textAnchor="middle" fontSize="15" fontWeight="900" fill="white">AVV</text>
        <rect x="890" y="42" width="190" height="34" rx="17" fill="#4f46e5" /><text x="985" y="64" textAnchor="middle" fontSize="15" fontWeight="900" fill="white">DELIVERY</text>
        <g filter="url(#audit-shadow)">
          <polygon points="40,102 1280,102 1560,215 1280,328 40,328" fill="white" stroke="#0369a1" strokeWidth="5" strokeLinejoin="round" />
          {upper.slice(0, 8).map((row, index) => { const x = 40 + index * 155; return <g key={row.id}><polygon points={`${x},102 ${x + 135},102 ${x + 155},215 ${x + 20},215`} fill={fill(row.score)} stroke="white" strokeWidth="3" /><ThemeText row={row} x={x + 82} y={160} compact /></g>; })}
          {lower.slice(0, 8).map((row, index) => { const x = 40 + index * 155; return <g key={row.id}><polygon points={`${x + 20},215 ${x + 155},215 ${x + 135},328 ${x},328`} fill={fill(row.score)} stroke="white" strokeWidth="3" /><ThemeText row={row} x={x + 82} y={272} compact /></g>; })}
          {upper[8] && <g><polygon points="1280,102 1560,215 1280,215" fill={fill(upper[8].score)} stroke="white" strokeWidth="3" /><ThemeText row={upper[8]} x={1370} y={166} compact /></g>}
          {lower[8] && <g><polygon points="1280,215 1560,215 1280,328" fill={fill(lower[8].score)} stroke="white" strokeWidth="3" /><ThemeText row={lower[8]} x={1370} y={268} compact /></g>}
          <line x1="40" y1="215" x2="1560" y2="215" stroke="white" strokeWidth="3" />
        </g>
        <text x="192" y="418" textAnchor="middle" fontSize="13" fontWeight="900" fill="#0369a1">Avant-vente · engagement et faisabilité</text>
        <text x="980" y="418" textAnchor="middle" fontSize="13" fontWeight="900" fill="#4338ca">Delivery · exécution, maîtrise, validation et capitalisation</text>
      </svg>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-5 border-t border-slate-100 px-5 py-3 text-center text-[10px] font-black"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />Conforme ≥ 80 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-300" />Partiellement conforme 65–79 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" />Non conforme &lt; 65 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" />Non applicable</span><span className="text-slate-600">{latest ? `${latest.audit_number} · ${formatDate(latest.audit_date)} · ${Number(latest.overall_score || 0).toFixed(1)} %` : "Aucun audit réalisé"}</span></div>
  </section>;
}
