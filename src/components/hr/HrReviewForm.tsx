"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Save, Send, ShieldCheck, Target, UserRound } from "lucide-react";

import {
  HrInfo,
  hrCancelButtonClassName,
  hrInputClassName,
  hrSaveButtonClassName,
  hrSelectClassName,
} from "@/components/hr/HrReferenceUi";
import { createClient } from "@/lib/supabase/client";

type AnyRow = Record<string, any>;
type Employee = AnyRow & { id: string };

const supabase = createClient();

const statusOptions = [
  { value: "in_progress", label: "En cours", description: "Saisie collaborateur et préparation de l’entretien." },
  { value: "sent_to_manager", label: "Envoyé au manager", description: "Auto-évaluation terminée et transmise au manager." },
  { value: "manager_approved", label: "Validé manager", description: "Évaluation et objectifs validés par le manager." },
  { value: "hr_provisional", label: "Validé RH (provisoire)", description: "Contrôle RH effectué avant clôture définitive." },
  { value: "completed", label: "Terminé", description: "Entretien signé et définitivement clôturé." },
] as const;

const fieldLabelClassName = "text-xs font-bold text-slate-600 dark:text-slate-300";
const textAreaClassName = `${hrInputClassName} min-h-24 w-full resize-y py-2`;

function employeeName(employee?: Employee | null) {
  return employee?.full_name || employee?.employee_number || "Ressource non renseignée";
}

function lines(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join("\n") : String(value || "");
}

function statusRank(status: string) {
  return ["in_progress", "sent_to_manager", "manager_approved", "hr_provisional", "completed"].indexOf(status);
}

export default function HrReviewForm({
  organizationId,
  employees,
  cycles,
  review,
  onClose,
  onSaved,
}: {
  organizationId: string;
  employees: Employee[];
  cycles: AnyRow[];
  review?: AnyRow | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const currentYear = new Date().getFullYear();
  const details = review?.review_details || {};
  const initialYear = Number(review?.review_year || String(review?.period_start || "").slice(0, 4) || currentYear);
  const [employeeId, setEmployeeId] = useState(String(review?.employee_id || employees[0]?.id || ""));
  const [reviewYear, setReviewYear] = useState(Number.isFinite(initialYear) ? initialYear : currentYear);
  const [interviewDate, setInterviewDate] = useState(String(review?.interview_date || ""));
  const [status, setStatus] = useState(String(review?.status || "in_progress"));
  const [objectiveCount, setObjectiveCount] = useState(Number(review?.objective_count || 0));
  const [completedObjectiveCount, setCompletedObjectiveCount] = useState(Number(review?.completed_objective_count || 0));
  const [globalRating, setGlobalRating] = useState(String(review?.global_rating ?? ""));
  const [previousObjectives, setPreviousObjectives] = useState(String(details?.previous_year?.objectives || ""));
  const [achievement, setAchievement] = useState(Number(details?.previous_year?.achievement || 0));
  const [highlights, setHighlights] = useState(String(details?.previous_year?.highlights || ""));
  const [currentObjectives, setCurrentObjectives] = useState(String(details?.current_year?.objectives || ""));
  const [priority, setPriority] = useState(String(details?.current_year?.priority || ""));
  const [training, setTraining] = useState(lines(details?.training));
  const [developmentPlan, setDevelopmentPlan] = useState(String(details?.development_plan || ""));
  const [employeeComment, setEmployeeComment] = useState(String(review?.employee_comment || ""));
  const [managerComment, setManagerComment] = useState(String(review?.manager_comment || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const employee = useMemo(() => employees.find((item) => item.id === employeeId), [employeeId, employees]);
  const manager = useMemo(() => employees.find((item) => item.id === (review?.manager_employee_id || employee?.manager_employee_id)), [employee, employees, review?.manager_employee_id]);
  const years = Array.from(new Set([currentYear - 2, currentYear - 1, currentYear, currentYear + 1, initialYear])).sort((a, b) => b - a);
  const rank = statusRank(status);

  async function resolveCycleId() {
    const existing = cycles.find((cycle) => Number(String(cycle.period_start || "").slice(0, 4)) === reviewYear && cycle.review_type === "annual");
    if (existing?.id) return String(existing.id);

    const cycleResult = await (supabase.from("hr_review_cycles" as never) as any)
      .select("id")
      .eq("organization_id", organizationId)
      .eq("name", `Campagne annuelle ${reviewYear}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cycleResult.error) throw cycleResult.error;
    if (cycleResult.data?.id) return String(cycleResult.data.id);

    const created = await (supabase.from("hr_review_cycles" as never) as any)
      .insert({
        organization_id: organizationId,
        name: `Campagne annuelle ${reviewYear}`,
        review_type: "annual",
        period_start: `${reviewYear}-01-01`,
        period_end: `${reviewYear}-12-31`,
        status: "open",
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    return String(created.data.id);
  }

  async function save() {
    if (!employeeId) { setError("Sélectionnez une ressource."); return; }
    if (completedObjectiveCount > objectiveCount) { setError("Le nombre d’objectifs atteints ne peut pas dépasser le nombre d’objectifs définis."); return; }
    if (globalRating && (Number(globalRating) < 0 || Number(globalRating) > 5)) { setError("La note globale doit être comprise entre 0 et 5."); return; }

    setSaving(true);
    setError("");
    try {
      const cycleId = await resolveCycleId();
      const existingResult = review?.id
        ? { data: { id: review.id }, error: null }
        : await (supabase.from("hr_review_items" as never) as any)
            .select("id")
            .eq("organization_id", organizationId)
            .eq("employee_id", employeeId)
            .eq("review_year", reviewYear)
            .is("archived_at", null)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
      if (existingResult.error) throw existingResult.error;

      const now = new Date().toISOString();
      const payload = {
        organization_id: organizationId,
        cycle_id: cycleId,
        employee_id: employeeId,
        manager_employee_id: employee?.manager_employee_id || review?.manager_employee_id || null,
        review_year: reviewYear,
        interview_date: interviewDate || null,
        status,
        objective_count: Math.max(0, objectiveCount),
        completed_objective_count: Math.max(0, completedObjectiveCount),
        global_rating: globalRating === "" ? null : Number(globalRating),
        employee_comment: employeeComment || null,
        manager_comment: managerComment || null,
        review_details: {
          previous_year: { objectives: previousObjectives, achievement, highlights },
          current_year: { objectives: currentObjectives, priority },
          training: training.split("\n").map((item) => item.trim()).filter(Boolean),
          employee_validation: rank >= 1,
          manager_validation: rank >= 2,
          hr_validation: rank >= 3,
          development_plan: developmentPlan,
        },
        employee_validated_at: rank >= 1 ? review?.employee_validated_at || now : null,
        sent_to_manager_at: rank >= 1 ? review?.sent_to_manager_at || now : null,
        manager_validated_at: rank >= 2 ? review?.manager_validated_at || now : null,
        hr_validated_at: rank >= 3 ? review?.hr_validated_at || now : null,
        completed_at: rank >= 4 ? review?.completed_at || now : null,
        archived_at: null,
        updated_at: now,
      };

      const saved = existingResult.data?.id
        ? await (supabase.from("hr_review_items" as never) as any).update(payload).eq("id", existingResult.data.id).eq("organization_id", organizationId)
        : await (supabase.from("hr_review_items" as never) as any).insert(payload);
      if (saved.error) throw saved.error;
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer l’entretien.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><Target className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-black text-slate-950">{review ? "Poursuivre l’entretien annuel" : "Nouvel entretien annuel"}</h2>
              <p className="mt-1 text-sm text-slate-500">Une seule fiche par ressource et par année. Chaque enregistrement conserve l’avancement pour une reprise ultérieure.</p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/50 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HrInfo label="Collaborateur" value={employeeName(employee)} accent="indigo" />
            <HrInfo label="Manager" value={employeeName(manager)} accent="sky" />
            <HrInfo label="Campagne" value={`Entretien annuel ${reviewYear}`} accent="amber" />
            <HrInfo label="Avancement" value={statusOptions.find((item) => item.value === status)?.label || status} accent={status === "completed" ? "emerald" : "amber"} />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><UserRound className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-black text-slate-950">Identification et workflow</h3></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label><span className={fieldLabelClassName}>Ressource</span><select value={employeeId} disabled={Boolean(review?.id)} onChange={(event) => setEmployeeId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full disabled:bg-slate-100`}>{employees.slice().sort((a, b) => employeeName(a).localeCompare(employeeName(b), "fr")).map((item) => <option key={item.id} value={item.id}>{employeeName(item)}</option>)}</select></label>
              <label><span className={fieldLabelClassName}>Année</span><select value={reviewYear} disabled={Boolean(review?.id)} onChange={(event) => setReviewYear(Number(event.target.value))} className={`${hrSelectClassName} mt-1 w-full disabled:bg-slate-100`}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
              <label><span className={fieldLabelClassName}>Date de l’entretien</span><input type="date" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>
              <label><span className={fieldLabelClassName}>Statut</span><select value={status} onChange={(event) => setStatus(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            <p className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">{statusOptions.find((item) => item.value === status)?.description}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><CalendarDays className="h-4 w-4 text-sky-600" /><h3 className="text-sm font-black text-slate-950">Bilan de l’année écoulée</h3></div>
            <div className="grid gap-4 xl:grid-cols-2">
              <label><span className={fieldLabelClassName}>Objectifs et résultats attendus</span><textarea value={previousObjectives} onChange={(event) => setPreviousObjectives(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Objectifs, indicateurs et résultats attendus de l’année écoulée." /></label>
              <label><span className={fieldLabelClassName}>Réussites, difficultés et enseignements</span><textarea value={highlights} onChange={(event) => setHighlights(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Réussites majeures, irritants, causes et enseignements." /></label>
              <label><span className={fieldLabelClassName}>Taux d’atteinte global (%)</span><input type="number" min="0" max="100" value={achievement} onChange={(event) => setAchievement(Number(event.target.value))} className={`${hrInputClassName} mt-1 w-full`} /></label>
              <label><span className={fieldLabelClassName}>Note globale (/5)</span><input type="number" min="0" max="5" step="0.1" value={globalRating} onChange={(event) => setGlobalRating(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-black text-slate-950">Objectifs et développement</h3></div>
            <div className="grid gap-4 xl:grid-cols-2">
              <label><span className={fieldLabelClassName}>Objectifs de l’année</span><textarea value={currentObjectives} onChange={(event) => setCurrentObjectives(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Objectifs SMART, indicateurs, cible, échéance et preuve attendue." /></label>
              <label><span className={fieldLabelClassName}>Priorités</span><textarea value={priority} onChange={(event) => setPriority(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Priorités opérationnelles, projet, qualité, compétences et contribution collective." /></label>
              <label><span className={fieldLabelClassName}>Formations souhaitées — une par ligne</span><textarea value={training} onChange={(event) => setTraining(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Formation métier\nCertification\nMentorat ou accompagnement" /></label>
              <label><span className={fieldLabelClassName}>Plan de développement</span><textarea value={developmentPlan} onChange={(event) => setDevelopmentPlan(event.target.value)} className={`${textAreaClassName} mt-1`} placeholder="Actions, responsable, échéance, résultat attendu et point de contrôle." /></label>
              <label><span className={fieldLabelClassName}>Nombre d’objectifs</span><input type="number" min="0" value={objectiveCount} onChange={(event) => setObjectiveCount(Number(event.target.value))} className={`${hrInputClassName} mt-1 w-full`} /></label>
              <label><span className={fieldLabelClassName}>Objectifs atteints</span><input type="number" min="0" max={objectiveCount} value={completedObjectiveCount} onChange={(event) => setCompletedObjectiveCount(Number(event.target.value))} className={`${hrInputClassName} mt-1 w-full`} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-black text-slate-950">Commentaires et validations</h3></div>
            <div className="grid gap-4 xl:grid-cols-2">
              <label><span className={fieldLabelClassName}>Commentaire collaborateur</span><textarea value={employeeComment} onChange={(event) => setEmployeeComment(event.target.value)} className={`${textAreaClassName} mt-1`} /></label>
              <label><span className={fieldLabelClassName}>Commentaire manager</span><textarea value={managerComment} onChange={(event) => setManagerComment(event.target.value)} className={`${textAreaClassName} mt-1`} /></label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <HrInfo label="Collaborateur" value={rank >= 1 ? "Validé" : "À valider"} accent={rank >= 1 ? "emerald" : "amber"} />
              <HrInfo label="Manager" value={rank >= 2 ? "Validé" : "À valider"} accent={rank >= 2 ? "emerald" : "amber"} />
              <HrInfo label="Ressources humaines" value={rank >= 3 ? "Validé provisoirement" : "À valider"} accent={rank >= 3 ? "emerald" : "amber"} />
            </div>
          </section>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
        </div>

        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className={hrCancelButtonClassName}>Annuler</button>
          <button type="button" onClick={() => void save()} disabled={saving || !employeeId} className={hrSaveButtonClassName}>{status === "sent_to_manager" ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? "Enregistrement…" : status === "sent_to_manager" ? "Enregistrer et envoyer" : "Enregistrer l’entretien"}</button>
        </footer>
      </section>
    </div>
  );
}

