"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Save, ShieldCheck } from "lucide-react";

import {
  HrMetricCard,
  HrSectionCard,
  HrStatusBadge,
  hrInputClassName,
  hrSaveButtonClassName,
  hrSelectClassName,
} from "@/components/hr/HrReferenceUi";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Answer = "yes" | "no" | "na" | "";
type ResponseDraft = { answer: Answer; comment: string; evidence_reference: string };

const supabase = createClient();

function decisionFor(score: number) {
  if (score >= 80) return "Conforme";
  if (score >= 65) return "Partiellement conforme";
  return "Non conforme";
}

function scoreTone(score: number) {
  if (score >= 80) return "completed";
  if (score >= 65) return "in_progress";
  return "blocked";
}

async function loadChecklist(organizationId: string, audit: AnyRow) {
  const [themes, questions, responses, previous] = await Promise.all([
    (supabase.from("project_audit_themes" as never) as any).select("*").eq("organization_id", organizationId).is("archived_at", null).order("display_order"),
    (supabase.from("project_audit_questions" as never) as any).select("*").eq("organization_id", organizationId).is("archived_at", null).order("question_order"),
    (supabase.from("project_audit_responses" as never) as any).select("*").eq("organization_id", organizationId).eq("audit_id", audit.id).is("archived_at", null),
    (supabase.from("project_audits" as never) as any).select("overall_score,audit_date,audit_number").eq("organization_id", organizationId).eq("project_id", audit.project_id).neq("id", audit.id).lt("audit_date", audit.audit_date).not("overall_score", "is", null).order("audit_date", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [themes, questions, responses, previous]) if (result.error) throw new Error(result.error.message);
  return { themes: themes.data || [], questions: questions.data || [], responses: responses.data || [], previous: previous.data || null };
}

export default function AuditChecklistPanel({ organizationId, audit, onSaved }: { organizationId: string; audit: AnyRow; onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["audit-checklist", organizationId, audit.id], queryFn: () => loadChecklist(organizationId, audit) });
  const [drafts, setDrafts] = useState<Record<string, ResponseDraft>>({});
  const [openThemes, setOpenThemes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!query.data) return;
    const next: Record<string, ResponseDraft> = {};
    const responseMap = new Map(query.data.responses.map((row: AnyRow) => [row.question_id, row]));
    query.data.questions.forEach((question: AnyRow) => {
      const response = responseMap.get(question.id) as AnyRow | undefined;
      next[question.id] = {
        answer: (response?.answer || question.default_answer || "") as Answer,
        comment: response?.comment || question.default_comment || "",
        evidence_reference: response?.evidence_reference || "",
      };
    });
    setDrafts(next);
  }, [query.data]);

  const applicable = useMemo(() => (query.data?.questions || []).filter((question: AnyRow) => drafts[question.id]?.answer !== "na"), [drafts, query.data?.questions]);
  const answered = (query.data?.questions || []).filter((question: AnyRow) => Boolean(drafts[question.id]?.answer)).length;
  const compliantWeight = applicable.reduce((sum: number, question: AnyRow) => sum + (drafts[question.id]?.answer === "yes" ? Number(question.weight || 1) : 0), 0);
  const applicableWeight = applicable.reduce((sum: number, question: AnyRow) => sum + Number(question.weight || 1), 0);
  const score = applicableWeight ? compliantWeight / applicableWeight * 100 : 0;
  const nonCompliant = (query.data?.questions || []).filter((question: AnyRow) => drafts[question.id]?.answer === "no").length;
  const completion = query.data?.questions.length ? answered / query.data.questions.length * 100 : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!query.data) return;
      const missing = query.data.questions.filter((question: AnyRow) => !drafts[question.id]?.answer);
      if (missing.length) throw new Error(`Répondez encore à ${missing.length} question(s), y compris par « Non applicable ».`);
      const payload = query.data.questions.map((question: AnyRow) => ({
        organization_id: organizationId,
        project_id: audit.project_id,
        audit_id: audit.id,
        theme_id: question.theme_id,
        question_id: question.id,
        answer: drafts[question.id].answer,
        score: drafts[question.id].answer === "yes" ? 100 : drafts[question.id].answer === "no" ? 0 : null,
        comment: drafts[question.id].comment || null,
        evidence_reference: drafts[question.id].evidence_reference || null,
        archived_at: null,
      }));
      const responseResult = await (supabase.from("project_audit_responses" as never) as any).upsert(payload, { onConflict: "organization_id,audit_id,question_id" });
      if (responseResult.error) throw new Error(responseResult.error.message);
      const auditResult = await (supabase.from("project_audits" as never) as any).update({
        overall_score: Number(score.toFixed(2)),
        previous_score: query.data.previous?.overall_score ?? audit.previous_score ?? null,
        decision: decisionFor(score),
        checklist_status: "completed",
        action_plan_required: nonCompliant > 0,
        status: nonCompliant > 0 ? "in_progress" : "completed",
        updated_at: new Date().toISOString(),
      }).eq("organization_id", organizationId).eq("id", audit.id);
      if (auditResult.error) throw new Error(auditResult.error.message);

      const themes = new Map(query.data.themes.map((theme: AnyRow) => [theme.id, theme.name]));
      for (const question of query.data.questions.filter((item: AnyRow) => drafts[item.id].answer === "no")) {
        const sourceReference = `${audit.audit_number}-${question.code}`;
        const existing = await (supabase.from("project_actions" as never) as any).select("id,status").eq("organization_id", organizationId).eq("source_entity_type", "audit_response").eq("source_reference", sourceReference).is("archived_at", null).maybeSingle();
        if (existing.error) throw new Error(existing.error.message);
        const actionPayload = {
          organization_id: organizationId,
          project_id: audit.project_id,
          action_type: "corrective",
          title: `Écart d’audit · ${question.code}`,
          description: `${themes.get(question.theme_id) || "Audit"} — ${question.question_text}`,
          status: existing.data?.status === "completed" ? "completed" : "open",
          priority: Number(question.weight || 1) >= 2 ? "high" : "medium",
          owner_name: audit.responsible_name || audit.auditor_name || "Chef de projet",
          opened_at: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
          origin_type: "audit",
          origin_id: audit.id,
          origin_reference: audit.audit_number,
          source_entity_type: "audit_response",
          source_entity_id: question.id,
          source_reference: sourceReference,
          recommendation: drafts[question.id].comment || "Définir la correction, le responsable, l’échéance et la preuve d’efficacité.",
          expected_result: "Exigence rendue conforme et preuve validée lors de la prochaine revue.",
        };
        if (existing.data?.id) {
          if (existing.data.status !== "completed") {
            const update = await (supabase.from("project_actions" as never) as any).update(actionPayload).eq("id", existing.data.id);
            if (update.error) throw new Error(update.error.message);
          }
        } else {
          const code = await (supabase.rpc("next_project_code" as never, { target_organization_id: organizationId, target_year: new Date().getFullYear(), code_prefix: "ACT" } as never) as any);
          if (code.error) throw new Error(code.error.message);
          const insert = await (supabase.from("project_actions" as never) as any).insert({ ...actionPayload, code: code.data });
          if (insert.error) throw new Error(insert.error.message);
        }
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["audit-checklist", organizationId, audit.id] }),
        queryClient.invalidateQueries({ queryKey: ["operational-module"] }),
      ]);
      onSaved?.();
    },
  });

  if (query.isLoading) return <p className="p-5 text-sm font-semibold text-slate-500">Chargement de la checklist d’audit…</p>;
  if (query.error || !query.data) return <p className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">Checklist indisponible : {query.error instanceof Error ? query.error.message : "erreur inconnue"}</p>;

  return <div className="space-y-5 border-t border-slate-200 p-5">
    <HrSectionCard icon={ClipboardCheck} title="Checklist d’audit" description="Le score, la décision et les actions sont calculés à partir des réponses pondérées. Les questions non applicables sont exclues du calcul.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrMetricCard icon={ClipboardCheck} label="Avancement" value={`${Math.round(completion)} %`} description={`${answered} réponse(s) sur ${query.data.questions.length}`} accent="indigo" />
        <HrMetricCard icon={ShieldCheck} label="Conformité" value={`${score.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`} description={decisionFor(score)} accent={score >= 80 ? "emerald" : score >= 65 ? "amber" : "rose"} />
        <HrMetricCard icon={AlertTriangle} label="Écarts" value={nonCompliant} description="Actions synchronisées avec le module Actions" accent="rose" />
        <HrMetricCard icon={CheckCircle2} label="Audit précédent" value={query.data.previous?.overall_score == null ? "—" : `${Number(query.data.previous.overall_score).toLocaleString("fr-FR")} %`} description={query.data.previous?.audit_number || "Aucun historique"} accent="sky" />
      </div>
    </HrSectionCard>

    <div className="space-y-3">
      {query.data.themes.map((theme: AnyRow) => {
        const questions = query.data.questions.filter((question: AnyRow) => question.theme_id === theme.id);
        if (!questions.length) return null;
        const themeAnswered = questions.filter((question: AnyRow) => drafts[question.id]?.answer).length;
        const isOpen = Boolean(openThemes[theme.id]);
        return <section key={theme.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button type="button" onClick={() => setOpenThemes((current) => ({ ...current, [theme.id]: !isOpen }))} className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-4 py-3 text-left">
            <div><p className="text-[10px] font-black uppercase tracking-wide text-indigo-600">Thème {theme.code}</p><h4 className="mt-1 text-sm font-bold text-slate-950">{theme.name}</h4></div>
            <div className="flex items-center gap-2"><HrStatusBadge status={themeAnswered === questions.length ? "completed" : themeAnswered ? "in_progress" : "planned"} label={`${themeAnswered}/${questions.length}`} /><span className="text-lg font-black text-indigo-600">{isOpen ? "−" : "+"}</span></div>
          </button>
          {isOpen && <div className="divide-y divide-slate-100">
            {questions.map((question: AnyRow) => <div key={question.id} className="grid gap-3 p-4 xl:grid-cols-[minmax(320px,1.5fr)_180px_minmax(220px,1fr)_minmax(180px,.8fr)]">
              <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{question.code} · poids {Number(question.weight || 1).toLocaleString("fr-FR")}</p><p className="mt-1 text-sm font-semibold leading-5 text-slate-800">{question.question_text}</p></div>
              <select value={drafts[question.id]?.answer || ""} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: { ...(current[question.id] || { comment: "", evidence_reference: "" }), answer: event.target.value as Answer } }))} className={`${hrSelectClassName} w-full`}>
                <option value="">À répondre</option><option value="yes">Conforme</option><option value="no">Non conforme</option><option value="na">Non applicable</option>
              </select>
              <input value={drafts[question.id]?.comment || ""} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: { ...(current[question.id] || { answer: "" }), comment: event.target.value, evidence_reference: current[question.id]?.evidence_reference || "" } }))} placeholder="Commentaire / action recommandée" className={`${hrInputClassName} w-full`} />
              <input value={drafts[question.id]?.evidence_reference || ""} onChange={(event) => setDrafts((current) => ({ ...current, [question.id]: { ...(current[question.id] || { answer: "", comment: "" }), evidence_reference: event.target.value } }))} placeholder="Preuve / document" className={`${hrInputClassName} w-full`} />
            </div>)}
          </div>}
        </section>;
      })}
    </div>
    {saveMutation.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{saveMutation.error instanceof Error ? saveMutation.error.message : "Enregistrement impossible."}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><div><p className="text-sm font-bold text-indigo-950">Décision proposée : {decisionFor(score)}</p><p className="mt-1 text-xs text-indigo-700">Toute réponse non conforme génère ou actualise une action traçable dans le module Actions.</p></div><button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className={hrSaveButtonClassName}><Save className="h-4 w-4" />{saveMutation.isPending ? "Enregistrement…" : "Valider l’audit et les actions"}</button></div>
  </div>;
}
