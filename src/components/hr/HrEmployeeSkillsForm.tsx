"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hrInputClassName, hrSelectClassName } from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;
const supabase = createClient();

export default function HrEmployeeSkillsForm({ organizationId, employees, catalog, assessments, onClose, onSaved }: { organizationId: string; employees: AnyRow[]; catalog: AnyRow[]; assessments: AnyRow[]; onClose: () => void; onSaved: () => void }) {
  const sortedCatalog = useMemo(() => catalog.slice().sort((a, b) => String(a.family || "").localeCompare(String(b.family || ""), "fr", { sensitivity: "base" }) || String(a.category || "").localeCompare(String(b.category || ""), "fr", { sensitivity: "base" }) || String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" })), [catalog]);
  const [employeeId, setEmployeeId] = useState(String(employees[0]?.id || ""));
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function currentLevel(skill: AnyRow) {
    if (levels[skill.id] != null) return levels[skill.id];
    const row = assessments.find((item) => String(item.employee_id) === employeeId && String(item.skill_id) === String(skill.id));
    return Number(row?.current_level ?? row?.level ?? 0);
  }

  async function save() {
    if (!employeeId) { setError("Sélectionnez une ressource."); return; }
    setSaving(true); setError("");
    for (const skill of sortedCatalog) {
      const level = currentLevel(skill);
      const existing = assessments.find((item) => String(item.employee_id) === employeeId && String(item.skill_id) === String(skill.id));
      const payload = { organization_id: organizationId, employee_id: employeeId, skill_id: skill.id, level, current_level: level, target_level: Number(existing?.target_level ?? level), assessment_date: new Date().toISOString().slice(0, 10), last_self_assessment_at: new Date().toISOString().slice(0, 10), assessor_type: "self", evidence: evidence[skill.id] || existing?.evidence || null, status: "active", archived_at: null, updated_at: new Date().toISOString() };
      const result = existing?.id ? await (supabase.from("hr_employee_skills" as never) as any).update(payload).eq("id", existing.id).eq("organization_id", organizationId) : await (supabase.from("hr_employee_skills" as never) as any).insert(payload);
      if (result.error) { setError(result.error.message); setSaving(false); return; }
    }
    setSaving(false); onSaved(); onClose();
  }

  return <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="h-full w-full max-w-[1500px] overflow-y-auto bg-slate-50 p-5 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950">Formulaire compétences</h2><p className="mt-1 text-sm text-slate-500">Évaluer une ressource sur le référentiel unique utilisé par les projets, le staffing et les plans de développement.</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"><X className="h-5 w-5" /></button></div><label className="mb-4 block max-w-xl"><span className="text-xs font-bold text-slate-600">Ressource</span><select value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setLevels({}); setEvidence({}); }} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Sélectionner</option>{employees.slice().sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "fr")).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number || employee.id}</option>)}</select></label><div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1350px] border-separate border-spacing-0 text-sm"><thead className="sticky top-0 z-40 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr>{["Chapitre", "Sous-chapitre", "Compétence", "Niveau réel", "Niveau attendu", "Écart", "Preuve ou commentaire"].map((label, index) => <th key={label} className={`${index === 0 ? "sticky left-0 z-50 bg-sky-50" : index === 1 ? "sticky left-[220px] z-50 bg-sky-50" : index === 2 ? "sticky left-[460px] z-50 bg-sky-50" : ""} whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left`}>{label}</th>)}</tr></thead><tbody>{sortedCatalog.map((skill) => { const existing = assessments.find((item) => String(item.employee_id) === employeeId && String(item.skill_id) === String(skill.id)); const level = currentLevel(skill); const target = Number(existing?.target_level ?? level); const gap = Math.max(0, target - level); return <tr key={skill.id} className="hover:bg-indigo-50/35"><td className="sticky left-0 z-20 w-[220px] border-b border-slate-100 bg-white px-3 py-2">{skill.family || "Non classé"}</td><td className="sticky left-[220px] z-20 w-[240px] border-b border-slate-100 bg-white px-3 py-2">{skill.category || "Non classé"}</td><td className="sticky left-[460px] z-20 w-[360px] border-b border-slate-100 bg-white px-3 py-2 font-bold text-slate-800">{skill.name}</td><td className="border-b border-slate-100 px-3 py-2"><select value={level} onChange={(event) => setLevels((current) => ({ ...current, [skill.id]: Number(event.target.value) }))} className={`${hrSelectClassName} w-24`}>{[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}</select></td><td className="border-b border-slate-100 px-3 py-2">{target}</td><td className={`border-b border-slate-100 px-3 py-2 font-black ${gap ? "text-rose-700" : "text-emerald-700"}`}>{gap}</td><td className="border-b border-slate-100 px-3 py-2"><input value={evidence[skill.id] ?? existing?.evidence ?? ""} onChange={(event) => setEvidence((current) => ({ ...current, [skill.id]: event.target.value }))} className={`${hrInputClassName} w-full min-w-72`} placeholder="Expérience, certification, projet ou preuve" /></td></tr>; })}</tbody></table></div>{error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 shadow-sm hover:bg-rose-50">Annuler</button><button type="button" disabled={saving || !employeeId} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button></div></aside></div>;
}
