"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hrCancelButtonClassName, hrInputClassName, hrSaveButtonClassName, hrSelectClassName } from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;
const supabase = createClient();

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" }));
}

export default function ProjectSkillRequirementsForm({ organizationId, projectId, library, initialRows, onClose, onSaved }: { organizationId: string; projectId: string; library: AnyRow[]; initialRows: AnyRow[]; onClose: () => void; onSaved: () => void }) {
  const sortedLibrary = useMemo(() => library.slice().sort((a, b) => String(a.family || "").localeCompare(String(b.family || ""), "fr", { sensitivity: "base" }) || String(a.category || "").localeCompare(String(b.category || ""), "fr", { sensitivity: "base" }) || String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" })), [library]);
  const initial = (row?: AnyRow) => {
    const selected = sortedLibrary.find((skill) => String(skill.id) === String(row?.skill_id)) || sortedLibrary.find((skill) => skill.name === row?.skill_name);
    return { ...row, chapter: selected?.family || row?.skill_chapter || String(row?.skill_family || "").split("/")[0]?.trim() || sortedLibrary[0]?.family || "", subchapter: selected?.category || row?.skill_subchapter || String(row?.skill_family || "").split("/")[1]?.trim() || "", skill_id: selected?.id || row?.skill_id || "", skill_name: selected?.name || row?.skill_name || "", required_level: Number(row?.required_level ?? 2), minimum_people: Number(row?.minimum_people ?? 1), importance: row?.importance || "required", planned_hours: Number(row?.planned_hours ?? 0), justification: row?.justification || "" };
  };
  const [rows, setRows] = useState<AnyRow[]>(initialRows.length ? initialRows.map(initial) : [initial()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const chapters = unique(sortedLibrary.map((skill) => String(skill.family || "")));
  const update = (index: number, patch: AnyRow) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));

  async function save() {
    const validRows = rows.filter((row) => row.skill_id && row.skill_name);
    if (!validRows.length) { setError("Sélectionnez au moins une compétence du référentiel."); return; }
    setSaving(true); setError("");
    for (const row of validRows) {
      const selected = sortedLibrary.find((skill) => String(skill.id) === String(row.skill_id));
      if (!selected) continue;
      const payload = { organization_id: organizationId, project_id: projectId, skill_id: selected.id, skill_code: selected.code, skill_name: selected.name, skill_family: `${selected.family} / ${selected.category}`, skill_chapter: selected.family, skill_subchapter: selected.category, required_level: Number(row.required_level), minimum_people: Number(row.minimum_people), importance: row.importance, planned_hours: Number(row.planned_hours), justification: row.justification || null, updated_at: new Date().toISOString() };
      const request = row.id ? (supabase.from("project_skill_requirements" as never) as any).update(payload).eq("id", row.id).eq("organization_id", organizationId) : (supabase.from("project_skill_requirements" as never) as any).insert(payload);
      const result = await request;
      if (result.error) { setError(result.error.message); setSaving(false); return; }
    }
    const retainedIds = new Set(validRows.map((row) => String(row.id || "")).filter(Boolean));
    const removedIds = initialRows.map((row) => String(row.id || "")).filter((id) => id && !retainedIds.has(id));
    if (removedIds.length) {
      const archived = await (supabase.from("project_skill_requirements" as never) as any).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", organizationId).in("id", removedIds);
      if (archived.error) { setError(archived.error.message); setSaving(false); return; }
    }
    setSaving(false); onSaved(); onClose();
  }

  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside className="h-full w-full max-w-[1500px] overflow-y-auto bg-slate-50 p-5 shadow-2xl dark:bg-slate-800">
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-950 dark:text-white">Besoins en compétences du projet</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Référentiel unique RH/Projets : chapitre, sous-chapitre et compétence sont liés en cascade.</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-700">
        <table className="w-full min-w-[1900px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-40 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{["Chapitre", "Sous-chapitre", "Compétence", "Niveau requis", "Effectif", "Importance", "Charge", "Justification", "Actions"].map((label, index) => <th key={label} className={`whitespace-nowrap border-b border-slate-200 px-3 py-3 text-left ${index === 0 ? "sticky left-0 z-50 w-[220px] bg-sky-50 dark:bg-slate-600" : index === 1 ? "sticky left-[220px] z-50 w-[240px] bg-sky-50 dark:bg-slate-600" : index === 2 ? "sticky left-[460px] z-50 w-[360px] bg-sky-50 dark:bg-slate-600" : ""}`}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => {
            const subchapters = unique(sortedLibrary.filter((skill) => skill.family === row.chapter).map((skill) => String(skill.category || "")));
            const skills = sortedLibrary.filter((skill) => skill.family === row.chapter && skill.category === row.subchapter);
            return <tr key={row.id || index} className="hover:bg-indigo-50/35 dark:hover:bg-indigo-900/20">
              <td className="sticky left-0 z-30 w-[220px] border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700"><select value={row.chapter} onChange={(event) => { const chapter = event.target.value; const subchapter = unique(sortedLibrary.filter((skill) => skill.family === chapter).map((skill) => String(skill.category || "")))[0] || ""; update(index, { chapter, subchapter, skill_id: "", skill_name: "" }); }} className={`${hrSelectClassName} w-full`}><option value="">Sélectionner</option>{chapters.map((chapter) => <option key={chapter} value={chapter}>{chapter}</option>)}</select></td>
              <td className="sticky left-[220px] z-30 w-[240px] border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700"><select value={row.subchapter} onChange={(event) => update(index, { subchapter: event.target.value, skill_id: "", skill_name: "" })} className={`${hrSelectClassName} w-full`}><option value="">Sélectionner</option>{subchapters.map((subchapter) => <option key={subchapter} value={subchapter}>{subchapter}</option>)}</select></td>
              <td className="sticky left-[460px] z-30 w-[360px] border-b border-slate-100 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-700"><select value={row.skill_id} onChange={(event) => { const selected = sortedLibrary.find((skill) => String(skill.id) === event.target.value); update(index, { skill_id: selected?.id || "", skill_name: selected?.name || "", skill_code: selected?.code || "" }); }} className={`${hrSelectClassName} w-full`}><option value="">Sélectionner une compétence</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></td>
              <td className="border-b border-slate-100 px-3 py-2"><select value={row.required_level} onChange={(event) => update(index, { required_level: Number(event.target.value) })} className={`${hrSelectClassName} w-28`}>{[0, 1, 2, 3, 4].map((level) => <option key={level} value={level}>{level}</option>)}</select></td>
              <td className="border-b border-slate-100 px-3 py-2"><input type="number" min="1" value={row.minimum_people} onChange={(event) => update(index, { minimum_people: Number(event.target.value) })} className={`${hrInputClassName} w-24`} /></td>
              <td className="border-b border-slate-100 px-3 py-2"><select value={row.importance} onChange={(event) => update(index, { importance: event.target.value })} className={`${hrSelectClassName} w-40`}><option value="critical">Critique</option><option value="required">Requise</option><option value="useful">Utile</option></select></td>
              <td className="border-b border-slate-100 px-3 py-2"><input type="number" min="0" value={row.planned_hours} onChange={(event) => update(index, { planned_hours: Number(event.target.value) })} className={`${hrInputClassName} w-28`} /></td>
              <td className="min-w-80 border-b border-slate-100 px-3 py-2"><input value={row.justification} onChange={(event) => update(index, { justification: event.target.value })} className={`${hrInputClassName} w-full`} placeholder="Pourquoi cette compétence est-elle nécessaire ?" /></td>
              <td className="border-b border-slate-100 px-3 py-2"><button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" title="Retirer la ligne"><Trash2 className="h-4 w-4" /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <button type="button" onClick={() => setRows((current) => [...current, initial()])} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><Plus className="h-4 w-4" />Ajouter une compétence</button>
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className={hrCancelButtonClassName}>Annuler</button><button type="button" disabled={saving} onClick={() => void save()} className={hrSaveButtonClassName}><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
    </aside>
  </div>;
}
