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
  const base = rows.slice(0, 4);
  const shaft = rows.slice(4, 14);
  const delivery = rows.slice(14, 18);

  return <section ref={captureRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/70 px-4 py-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><ClipboardCheck className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950">Chaîne de conformité AVV et Delivery</h3><p className="mt-1 text-xs text-slate-500">Les blocs constituent une chaîne continue, de la revue avant-vente jusqu’à l’exécution, la qualité et la capitalisation.</p></div></div><ProjectVisualActions targetRef={captureRef} fileName="onepilot-audit-conformite" label="la chaîne de conformité" /></div>
    <div data-visual-scroll className="overflow-hidden bg-slate-50/60 p-4">
      <svg viewBox="0 0 1600 500" className="block h-auto w-full" role="img" aria-label="Flèche des thèmes de conformité depuis l’AVV vers le Delivery">
        <defs><filter id="audit-shadow" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#334155" floodOpacity=".14" /></filter></defs>
        <rect x="8" y="38" width="350" height="420" rx="18" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="9 8" />
        <rect x="1190" y="38" width="400" height="420" rx="18" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="9 8" />
        <rect x="96" y="48" width="174" height="34" rx="17" fill="#e0f2fe" /><text x="183" y="70" textAnchor="middle" fontSize="15" fontWeight="900" fill="#0369a1">AVV</text>
        <rect x="1303" y="48" width="174" height="34" rx="17" fill="#e0e7ff" /><text x="1390" y="70" textAnchor="middle" fontSize="15" fontWeight="900" fill="#4338ca">DELIVERY</text>
        <g filter="url(#audit-shadow)">
          {base.map((row, index) => { const upper = index < 2; const column = index % 2; const x = 20 + column * 170; const y1 = upper ? 80 : 255; const y2 = upper ? 255 : 430; return <g key={row.id}><polygon points={`${x},${y1} ${x + 142},${y1} ${x + 170},255 ${x + 28},${y2}`} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.5" /><ThemeText row={row} x={x + 86} y={(y1 + y2) / 2} /></g>; })}
          {shaft.map((row, index) => { const upper = index < 5; const column = index % 5; const x = 360 + column * 170; const y1 = upper ? 135 : 255; const y2 = upper ? 255 : 375; return <g key={row.id}><polygon points={`${x},${y1} ${x + 145},${y1} ${x + 170},255 ${x + 145},${y2} ${x},${y2} ${x + 25},255`} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.5" /><ThemeText row={row} x={x + 85} y={(y1 + y2) / 2} compact /></g>; })}
          {delivery.map((row, index) => { const x = 1210; const tip = 1580; const points = index === 0 ? `${x},70 ${x + 180},145 ${x + 180},255 ${x},255` : index === 1 ? `${x + 180},145 ${tip},255 ${x + 180},255` : index === 2 ? `${x},255 ${x + 180},255 ${x + 180},365 ${x},440` : `${x + 180},255 ${tip},255 ${x + 180},365`; const cx = index % 2 === 0 ? x + 90 : x + 245; const cy = index < 2 ? 210 : 310; return <g key={row.id}><polygon points={points} fill={fill(row.score)} stroke="#0284c7" strokeWidth="1.7" /><ThemeText row={row} x={cx} y={cy} compact={index % 2 === 1} /></g>; })}
        </g>
      </svg>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-5 border-t border-slate-100 px-5 py-3 text-center text-[10px] font-black"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" />Conforme ≥ 80 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-300" />Partiellement conforme 65–79 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-300" />Non conforme &lt; 65 %</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" />Non applicable</span><span className="text-slate-600">{latest ? `${latest.audit_number} · ${formatDate(latest.audit_date)} · ${Number(latest.overall_score || 0).toFixed(1)} %` : "Aucun audit réalisé"}</span></div>
  </section>;
}
