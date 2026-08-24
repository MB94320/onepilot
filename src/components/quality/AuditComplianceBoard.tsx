"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GitBranch } from "lucide-react";

import { HrChartCard, HrSectionCard } from "@/components/hr/HrReferenceUi";
import ProjectVisualActions from "@/components/projects/ProjectVisualActions";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
const supabase = createClient();

async function loadAuditCompliance(organizationId: string) {
  const [themes, questions, audits, responses] = await Promise.all([
    (supabase.from("project_audit_themes" as never) as any).select("*").eq("organization_id", organizationId).is("archived_at", null).order("display_order"),
    (supabase.from("project_audit_questions" as never) as any).select("id,theme_id,weight").eq("organization_id", organizationId).is("archived_at", null),
    (supabase.from("project_audits" as never) as any).select("id,audit_type,audit_date,overall_score").eq("organization_id", organizationId).is("archived_at", null),
    (supabase.from("project_audit_responses" as never) as any).select("audit_id,theme_id,question_id,answer,score").eq("organization_id", organizationId).is("archived_at", null),
  ]);
  for (const result of [themes, questions, audits, responses]) if (result.error) throw new Error(result.error.message);
  return { themes: themes.data || [], questions: questions.data || [], audits: audits.data || [], responses: responses.data || [] };
}

function scoreColor(score: number) {
  if (score >= 80) return { block: "bg-emerald-100 text-emerald-900 border-emerald-200", fill: "#34d399" };
  if (score >= 65) return { block: "bg-amber-100 text-amber-900 border-amber-200", fill: "#fbbf24" };
  if (score > 0) return { block: "bg-rose-100 text-rose-900 border-rose-200", fill: "#fb7185" };
  return { block: "bg-slate-100 text-slate-600 border-slate-200", fill: "#cbd5e1" };
}

export default function AuditComplianceBoard({ organizationId }: { organizationId: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const query = useQuery({ queryKey: ["audit-compliance-board", organizationId], queryFn: () => loadAuditCompliance(organizationId) });
  const computed = useMemo(() => {
    if (!query.data) return { avv: [], delivery: [], scoreByTheme: new Map<string, number>() };
    const avvCodes = new Set(["AVV-OPP", "AVV-REP", "AVV-CTR", "AVV-PRO"]);
    const deliveryCodes = new Set("ABCDEFGHIJKLMNOPQR".split(""));
    const weightByQuestion = new Map<string, number>(query.data.questions.map((question: AnyRow): [string, number] => [String(question.id), Number(question.weight || 1)]));
    const auditScope = new Map(query.data.audits.map((audit: AnyRow) => [audit.id, audit.audit_type === "avv" ? "avv" : "delivery"]));
    const build = (scope: "avv" | "delivery") => query.data!.themes.filter((theme: AnyRow) =>
      (theme.audit_scope || "delivery") === scope && (scope === "avv" ? avvCodes : deliveryCodes).has(String(theme.code)),
    ).map((theme: AnyRow) => {
      const items = query.data!.responses.filter((response: AnyRow) => response.theme_id === theme.id && auditScope.get(response.audit_id) === scope && response.answer !== "na");
      const totalWeight = items.reduce((sum: number, response: AnyRow) => sum + (weightByQuestion.get(String(response.question_id)) || 1), 0);
      const compliantWeight = items.reduce((sum: number, response: AnyRow) => sum + (response.answer === "yes" ? (weightByQuestion.get(String(response.question_id)) || 1) : 0), 0);
      const score = totalWeight ? compliantWeight / totalWeight * 100 : 0;
      return { theme: theme.name, code: theme.code, score: Number(score.toFixed(1)), count: items.length };
    });
    const avv = build("avv"); const delivery = build("delivery");
    const scoreByTheme = new Map<string, number>();
    [...avv, ...delivery].forEach((row: AnyRow) => scoreByTheme.set(row.code, row.score));
    return { avv, delivery, scoreByTheme };
  }, [query.data]);

  if (query.isLoading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Chargement de la chaîne de conformité…</p>;
  if (query.error || !query.data) return null;

  const score = (...codes: string[]) => {
    const scores = codes.map((code) => computed.scoreByTheme.get(code)).filter((value): value is number => value != null && value > 0);
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  };

  const arrowScores = Object.fromEntries([
    "AVV-OPP", "AVV-REP", "AVV-CTR", "AVV-PRO",
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R",
  ].map((code) => [code, score(code)]));

  return <div className="space-y-5">
    <section ref={ref} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm fullscreen:overflow-auto"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><GitBranch className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950">Chaîne de conformité AVV et Delivery</h3><p className="mt-1 text-xs text-slate-500">Une flèche continue : qualification et engagement AVV à gauche, maîtrise opérationnelle et acceptation Delivery jusqu’à la pointe.</p></div></div><ProjectVisualActions targetRef={ref} fileName="onepilot_chaine_conformite" label="la chaîne de conformité" /></header><div data-visual-diagram className="bg-white p-4 sm:p-5"><AuditArrowDiagram scores={arrowScores} /><div className="mt-4 flex flex-wrap justify-center gap-3 text-[10px] font-bold"><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Conforme ≥ 80 %</span><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Partiellement conforme 65–79 %</span><span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">Non conforme &lt; 65 %</span><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Non évalué</span></div></div></section>
    <div className="grid gap-5 xl:grid-cols-2"><ComplianceChart title="Conformité des quatre revues AVV" description="Revue d’Opportunité, Pilotage de la Réponse, Revue de Contrat et Revue de Proposition exclusivement." data={computed.avv} /><ComplianceChart title="Conformité Delivery — exigences à PMP" description="Référentiel opérationnel complet, de la Gestion des exigences au Plan de Management Projet." data={computed.delivery} /></div>
  </div>;
}

type ArrowScores = Record<string, number>;

function AuditArrowDiagram({ scores }: { scores: ArrowScores }) {
  const blocks = [
    { key: "AVV-OPP", label: "Revue d’Opportunité", points: "35,110 175,110 215,250 70,250", x: 122, y: 170, width: 120 },
    { key: "AVV-CTR", label: "Revue de Contrat", points: "70,250 215,250 175,390 35,390", x: 122, y: 310, width: 110 },
    { key: "AVV-REP", label: "Pilotage de la Réponse", points: "175,110 315,110 355,250 215,250", x: 265, y: 170, width: 120 },
    { key: "AVV-PRO", label: "Revue de Proposition", points: "215,250 355,250 315,390 175,390", x: 265, y: 310, width: 120 },
    { key: "A", label: "Gestion des exigences", points: "355,140 465,140 490,250 380,250", x: 422, y: 190, width: 84 },
    { key: "B", label: "Risques et opportunités", points: "380,250 490,250 465,360 355,360", x: 422, y: 305, width: 88 },
    { key: "C", label: "Planification", points: "465,140 575,140 600,250 490,250", x: 532, y: 190, width: 86 },
    { key: "D", label: "Pilotage performance", points: "490,250 600,250 575,360 465,360", x: 532, y: 305, width: 90 },
    { key: "E", label: "Réunions et communication", points: "575,140 685,140 710,250 600,250", x: 642, y: 190, width: 88 },
    { key: "F", label: "Vérification et validation", points: "600,250 710,250 685,360 575,360", x: 642, y: 305, width: 90 },
    { key: "G", label: "Capitalisation", points: "685,140 795,140 820,250 710,250", x: 752, y: 190, width: 88 },
    { key: "H", label: "Gestion de configuration", points: "710,250 820,250 795,360 685,360", x: 752, y: 305, width: 92 },
    { key: "I", label: "Gestion documentaire", points: "795,140 905,140 930,250 820,250", x: 862, y: 190, width: 88 },
    { key: "J", label: "Sécurité des personnes", points: "820,250 930,250 905,360 795,360", x: 862, y: 305, width: 92 },
    { key: "K", label: "Sécurité des données", points: "905,140 1015,140 1040,250 930,250", x: 972, y: 190, width: 88 },
    { key: "L", label: "Gestion des ressources", points: "930,250 1040,250 1015,360 905,360", x: 972, y: 305, width: 94 },
    { key: "M", label: "Sous-traitance", points: "1015,75 1200,150 1200,200 1040,200", x: 1112, y: 145, width: 90 },
    { key: "N", label: "X-Shore", points: "1040,200 1200,200 1200,250 1040,250", x: 1120, y: 223, width: 90 },
    { key: "O", label: "Transnational", points: "1040,250 1200,250 1200,300 1040,300", x: 1120, y: 273, width: 110 },
    { key: "P", label: "Non-conformités", points: "1040,300 1200,300 1200,350 1015,425", x: 1110, y: 342, width: 110 },
    { key: "Q", label: "Insatisfactions", points: "1200,150 1465,250 1200,250", x: 1292, y: 207, width: 130 },
    { key: "R", label: "Plan de Management Projet", points: "1200,250 1465,250 1200,350", x: 1292, y: 292, width: 140 },
  ];
  return <svg data-visual-svg role="img" aria-label="Chaîne de conformité AVV et Delivery" viewBox="0 0 1500 500" className="h-auto w-full" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="45" width="340" height="405" rx="20" fill="#f0f9ff" fillOpacity=".46" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="9 8" />
    <rect x="365" y="45" width="1110" height="405" rx="20" fill="#eef2ff" fillOpacity=".32" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="9 8" />
    <text x="185" y="82" textAnchor="middle" fill="#0369a1" fontSize="18" fontWeight="800" letterSpacing="3">AVV</text>
    <text x="920" y="82" textAnchor="middle" fill="#4338ca" fontSize="18" fontWeight="800" letterSpacing="3">DELIVERY</text>
    {blocks.map((block) => <SvgAuditBlock key={block.key} points={block.points} label={block.label} score={scores[block.key] || 0} x={block.x} y={block.y} width={block.width} />)}
    <line x1="35" y1="250" x2="1465" y2="250" stroke="#0369a1" strokeWidth="1.5" opacity=".55" />
    <text x="185" y="477" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Qualification · engagement · décision Go/No-Go</text>
    <text x="920" y="477" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="700">Planification · exécution · maîtrise · acceptation · capitalisation</text>
  </svg>;
}

function SvgAuditBlock({ points, label, score, x, y, width }: { points: string; label: string; score: number; x: number; y: number; width: number }) {
  const words = label.split(" "); const lines: string[] = []; let line = "";
  words.forEach((word) => { const candidate = line ? `${line} ${word}` : word; if (candidate.length > Math.max(8, Math.floor(width / 7)) && line) { lines.push(line); line = word; } else line = candidate; });
  if (line) lines.push(line);
  const tone = scoreColor(score);
  return <g><title>{label} : {score ? `${Math.round(score)} %` : "non évalué"}</title><polygon points={points} fill={tone.fill} stroke="#0284c7" strokeWidth="1.25" /><text x={x} y={y - ((lines.length - 1) * 8)} textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="750">{lines.slice(0, 3).map((value, index) => <tspan key={value + index} x={x} dy={index ? 16 : 0}>{value}</tspan>)}<tspan x={x} dy="18" fontSize="13" fontWeight="850">{score ? `${Math.round(score)} %` : "—"}</tspan></text></g>;
}

function ComplianceChart({ title, description, data }: { title: string; description: string; data: AnyRow[] }) {
  return <HrChartCard title={title} description={description} exportConfig={{ type: "bar", data, nameKey: "theme", series: [{ key: "score", label: "Conformité", color: "#818cf8" }], unit: "%" }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 30, right: 25 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="theme" width={150} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`} /><Bar dataKey="score" name="Conformité" fill="#818cf8" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></HrChartCard>;
}
