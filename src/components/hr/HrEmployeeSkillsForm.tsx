"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Layers3, Save, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HrColumnFilterMenu, HrInfo, hrCancelButtonClassName, hrInputClassName, hrResetButtonClassName, hrSaveButtonClassName, hrSelectClassName } from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;
const supabase = createClient();
const levels = [0, 1, 2, 3, 4];
const levelNames = ["Non évalué", "Sensibilisé", "Autonome encadré", "Confirmé", "Expert"];
const levelClasses = ["bg-slate-100 text-slate-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700"];

function alpha(value: unknown) { return String(value || "Non classé"); }
function unique(values: string[]) { return [...new Set(values)].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })); }
function expected(skill: AnyRow, level: number) {
  const source = skill.level_expectations || skill.level_evidence || {};
  return source[String(level)] || source[`level_${level}`] || source[`niveau_${level}`] || [
    "Aucune pratique démontrée ; découverte du domaine.",
    "Comprend le vocabulaire, les objectifs et applique avec accompagnement.",
    "Réalise les activités courantes avec contrôle ponctuel.",
    "Maîtrise les cas complexes, sécurise la qualité et accompagne l’équipe.",
    "Fait référence, définit les standards et transmet l’expertise.",
  ][level];
}

export default function HrEmployeeSkillsForm({ organizationId, employees, catalog, assessments, initialEmployeeId, onClose, onSaved }: { organizationId: string; employees: AnyRow[]; catalog: AnyRow[]; assessments: AnyRow[]; initialEmployeeId?: string; onClose: () => void; onSaved: () => void }) {
  const sortedCatalog = useMemo(() => catalog.filter((item) => item.is_active !== false).slice().sort((a, b) => alpha(a.family).localeCompare(alpha(b.family), "fr") || alpha(a.category).localeCompare(alpha(b.category), "fr") || alpha(a.name).localeCompare(alpha(b.name), "fr")), [catalog]);
  const chapters = useMemo(() => unique(sortedCatalog.map((skill) => alpha(skill.family))), [sortedCatalog]);
  const [employeeId, setEmployeeId] = useState(String(initialEmployeeId || employees[0]?.id || ""));
  const [chapter, setChapter] = useState(chapters[0] || "");
  const subchapters = useMemo(() => unique(sortedCatalog.filter((skill) => alpha(skill.family) === chapter).map((skill) => alpha(skill.category))), [sortedCatalog, chapter]);
  const [subchapter, setSubchapter] = useState(subchapters[0] || "");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [skillFilters, setSkillFilters] = useState<Record<string, string[]>>({});
  const [editedInitialLevels, setEditedInitialLevels] = useState<Record<string, number>>({});
  const [editedLevels, setEditedLevels] = useState<Record<string, number>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setSubchapter(subchapters[0] || ""); }, [chapter, subchapters]);
  const employeeRows = useMemo(() => assessments.filter((row) => String(row.employee_id) === employeeId), [assessments, employeeId]);
  const rowFor = (skillId: string) => employeeRows.find((row) => String(row.skill_id) === String(skillId));
  const initialLevel = (skill: AnyRow) => {
    const existing = rowFor(skill.id);
    return Number(existing?.initial_level ?? existing?.current_level ?? existing?.level ?? editedInitialLevels[skill.id] ?? 0);
  };
  const currentLevel = (skill: AnyRow) => {
    const existing = rowFor(skill.id);
    return editedLevels[skill.id] ?? Number(existing?.current_level ?? existing?.level ?? initialLevel(skill));
  };
  const scope = useMemo(() => sortedCatalog.filter((skill) => alpha(skill.family) === chapter && alpha(skill.category) === subchapter), [sortedCatalog, chapter, subchapter]);
  const filtered = scope.filter((skill) => (!search.trim() || `${skill.name} ${skill.description || ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    && (levelFilter === "all" || currentLevel(skill) === Number(levelFilter))
    && (!skillFilters.skill?.length || skillFilters.skill.includes(String(skill.name || "—")))
    && (!skillFilters.initial?.length || skillFilters.initial.includes(String(initialLevel(skill))))
    && (!skillFilters.current?.length || skillFilters.current.includes(String(currentLevel(skill)))));
  const completedChapters = chapters.filter((name) => sortedCatalog.filter((skill) => alpha(skill.family) === name).every((skill) => employeeRows.some((row) => String(row.skill_id) === String(skill.id)))).length;
  const allSubchapters = unique(sortedCatalog.map((skill) => `${alpha(skill.family)}|||${alpha(skill.category)}`));
  const completedSubchapters = allSubchapters.filter((key) => { const [family, category] = key.split("|||"); return sortedCatalog.filter((skill) => alpha(skill.family) === family && alpha(skill.category) === category).every((skill) => employeeRows.some((row) => String(row.skill_id) === String(skill.id))); }).length;
  const assessed = sortedCatalog.filter((skill) => employeeRows.some((row) => String(row.skill_id) === String(skill.id))).length;
  const progress = sortedCatalog.length ? Math.round(assessed / sortedCatalog.length * 100) : 0;
  const hasFilters = Boolean(search.trim() || levelFilter !== "all" || Object.values(skillFilters).some((values) => values.length));

  async function save() {
    if (!employeeId) { setError("Sélectionnez une ressource."); return; }
    setSaving(true); setError("");
    for (const skill of scope) {
      const existing = rowFor(skill.id);
      const level = currentLevel(skill);
      const payload = { organization_id: organizationId, employee_id: employeeId, skill_id: skill.id, level, current_level: level, initial_level: existing?.initial_level ?? existing?.current_level ?? existing?.level ?? level, assessment_date: new Date().toISOString().slice(0, 10), last_self_assessment_at: new Date().toISOString().slice(0, 10), assessor_type: "self", evidence: evidence[skill.id] ?? existing?.evidence ?? null, status: "active", archived_at: null, updated_at: new Date().toISOString() };
      const result = existing?.id ? await (supabase.from("hr_employee_skills" as never) as any).update(payload).eq("id", existing.id).eq("organization_id", organizationId) : await (supabase.from("hr_employee_skills" as never) as any).insert(payload);
      if (result.error) { setError(result.error.message); setSaving(false); return; }
    }
    setSaving(false); onSaved();
  }

  return <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/35" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="h-full w-full max-w-[1580px] overflow-y-auto bg-slate-50 p-5 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-start justify-between gap-4"><div className="flex gap-3"><span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><BookOpen className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-950 dark:text-white">Formulaire compétences</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Évaluez progressivement la ressource par chapitre et sous-chapitre. Toute compétence non renseignée conserve le niveau 0.</p></div></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"><X className="h-5 w-5" /></button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><HrInfo label="Chapitres réalisés" value={`${completedChapters} / ${chapters.length}`} accent="indigo" /><HrInfo label="Sous-chapitres réalisés" value={`${completedSubchapters} / ${allSubchapters.length}`} accent="emerald" /><HrInfo label="Compétences évaluées" value={`${assessed} / ${sortedCatalog.length}`} accent="amber" /><HrInfo label="Avancement" value={`${progress} %`} accent={progress === 100 ? "emerald" : "rose"} /></div>
    <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 dark:border-slate-700 dark:bg-slate-800"><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ressource</span><select value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setEditedInitialLevels({}); setEditedLevels({}); setEvidence({}); }} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Sélectionner</option>{employees.slice().sort((a, b) => alpha(a.full_name).localeCompare(alpha(b.full_name), "fr")).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number || employee.id}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Chapitre</span><select value={chapter} onChange={(event) => setChapter(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{chapters.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sous-chapitre</span><select value={subchapter} onChange={(event) => setSubchapter(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}>{subchapters.map((value) => <option key={value}>{value}</option>)}</select></label></div>
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 dark:border-slate-700 dark:from-sky-900/20 dark:via-slate-800 dark:to-indigo-900/20"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><Layers3 className="h-4 w-4" /></span><div><h3 className="text-sm font-bold text-slate-950 dark:text-white">{chapter} · {subchapter}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Repères explicites de chaque niveau, niveau initial historisé et niveau actuel.</p></div></div><span className="rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700">{filtered.length} compétence(s)</span></div>
      <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-indigo-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${hrInputClassName} w-full pl-9`} placeholder="Rechercher une compétence" /></label><select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className={hrSelectClassName}><option value="all">Tous les niveaux actuels</option>{levels.map((value) => <option key={value} value={value}>Niveau {value} · {levelNames[value]}</option>)}</select></div>{hasFilters && <div className="flex justify-end px-4 pb-3"><button type="button" onClick={() => { setSearch(""); setLevelFilter("all"); setSkillFilters({}); }} className={hrResetButtonClassName}><X className="h-4 w-4" />Réinitialiser les filtres</button></div>}
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1540px] border-separate border-spacing-0">
          <thead className="sticky top-0 z-40">
            <tr>
              <th className="sticky left-0 z-50 w-[170px] min-w-[170px] max-w-[170px] bg-sky-50 text-left">Chapitre</th>
              <th className="sticky left-[170px] z-50 w-[210px] min-w-[210px] max-w-[210px] bg-sky-50 text-left">Sous-chapitre</th>
              <th className="sticky left-[380px] z-50 w-[280px] min-w-[280px] max-w-[280px] bg-sky-50 text-left shadow-[8px_0_12px_-12px_rgba(15,23,42,.8)]"><HrColumnFilterMenu label="Compétence" values={scope.map((skill) => String(skill.name || "—"))} selected={skillFilters.skill || []} onChange={(values) => setSkillFilters((current) => ({ ...current, skill: values }))} /></th>
              <th className="min-w-[500px] text-left">Attendus des niveaux 0 à 4</th>
              <th className="min-w-[120px] text-left"><HrColumnFilterMenu label="Niveau initial" values={scope.map((skill) => String(initialLevel(skill)))} selected={skillFilters.initial || []} onChange={(values) => setSkillFilters((current) => ({ ...current, initial: values }))} /></th>
              <th className="min-w-[120px] text-left"><HrColumnFilterMenu label="Niveau actuel" values={scope.map((skill) => String(currentLevel(skill)))} selected={skillFilters.current || []} onChange={(values) => setSkillFilters((current) => ({ ...current, current: values }))} /></th>
              <th className="min-w-[100px] text-left">Évolution</th>
              <th className="min-w-[300px] text-left">Preuve ou commentaire</th>
            </tr>
          </thead>
          <tbody>{filtered.map((skill) => {
            const existing = rowFor(skill.id);
            const initial = initialLevel(skill);
            const current = currentLevel(skill);
            const evolution = current - initial;
            return <tr key={skill.id}>
              <td className="sticky left-0 z-20 w-[170px] min-w-[170px] max-w-[170px] truncate bg-white dark:bg-slate-800" title={alpha(skill.family)}>{alpha(skill.family)}</td>
              <td className="sticky left-[170px] z-20 w-[210px] min-w-[210px] max-w-[210px] truncate bg-white dark:bg-slate-800" title={alpha(skill.category)}>{alpha(skill.category)}</td>
              <td className="sticky left-[380px] z-20 w-[280px] min-w-[280px] max-w-[280px] truncate bg-white font-semibold text-slate-800 shadow-[8px_0_12px_-12px_rgba(15,23,42,.8)] dark:bg-slate-800 dark:text-slate-100" title={skill.name}>{skill.name}</td>
              <td className="min-w-[500px]"><div className="grid gap-1">{levels.map((value) => <div key={value} className="flex items-start gap-2 text-[11px]"><span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 font-black ${levelClasses[value]}`}>{value}</span><span className="leading-4 text-slate-600 dark:text-slate-300">{expected(skill, value)}</span></div>)}</div></td>
              <td>{existing ? <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-black ${levelClasses[initial]}`}>{initial}</span> : <select value={initial} onChange={(event) => { const value = Number(event.target.value); setEditedInitialLevels((values) => ({ ...values, [skill.id]: value })); setEditedLevels((values) => ({ ...values, [skill.id]: value })); }} className={`${hrSelectClassName} w-20 ${levelClasses[initial]}`}>{levels.map((value) => <option key={value} value={value}>{value}</option>)}</select>}</td>
              <td>{existing ? <select value={current} onChange={(event) => setEditedLevels((values) => ({ ...values, [skill.id]: Number(event.target.value) }))} className={`${hrSelectClassName} w-20 ${levelClasses[current]}`}>{levels.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 font-black ${levelClasses[current]}`} title="Au premier enregistrement, le niveau actuel reprend le niveau initial.">{current}</span>}</td>
              <td><span className={`rounded-full px-2.5 py-1 font-black ${evolution > 0 ? "bg-emerald-100 text-emerald-700" : evolution < 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{evolution > 0 ? `+${evolution}` : evolution}</span></td>
              <td><input value={evidence[skill.id] ?? existing?.evidence ?? ""} onChange={(event) => setEvidence((values) => ({ ...values, [skill.id]: event.target.value }))} className={`${hrInputClassName} min-w-72`} placeholder="Expérience, certification, projet ou preuve" /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>{!filtered.length && <div className="p-8 text-center text-sm text-slate-500">Aucune compétence dans ce périmètre.</div>}</section>
    {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className={hrCancelButtonClassName}>Annuler</button><button type="button" disabled={saving || !employeeId || !scope.length} onClick={() => void save()} className={hrSaveButtonClassName}><Save className="h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer ce sous-chapitre"}</button></div></aside></div>;
}
