"use client";

import { useState } from "react";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { HrActionMenu, HrSectionCard, HrStatusBadge, hrInputClassName, hrSelectClassName } from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;
const supabase = createClient();

export default function ProjectAccessPanel({ organizationId, projectId, employees, grants, onSaved }: { organizationId: string; projectId: string; employees: AnyRow[]; grants: AnyRow[]; onSaved: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [level, setLevel] = useState("view");
  const [scopes, setScopes] = useState<string[]>(["cockpit", "planning", "team", "quality", "finance"]);
  const [error, setError] = useState("");
  const employeeMap = new Map(employees.map((row) => [String(row.id), row]));
  const scopeLabels: Record<string, string> = { cockpit: "Cockpit", planning: "Planning & WBS", team: "Équipe & compétences", quality: "Qualité", finance: "Finance & performance" };

  async function addGrant() {
    if (!employeeId && !externalEmail.trim()) { setError("Sélectionnez une ressource ou renseignez une adresse e-mail."); return; }
    const email = externalEmail.trim().toLowerCase();
    const payload = { organization_id: organizationId, project_id: projectId, employee_id: employeeId || null, external_name: externalName || null, external_email: email || null, access_level: level, scopes, archived_at: null, updated_at: new Date().toISOString() };
    const existing = grants.find((row) => employeeId ? String(row.employee_id) === employeeId : email && String(row.external_email || "").toLowerCase() === email);
    const result = existing ? await (supabase.from("project_access_grants" as never) as any).update(payload).eq("organization_id", organizationId).eq("id", existing.id) : await (supabase.from("project_access_grants" as never) as any).insert(payload);
    if (result.error) { setError(result.error.message); return; }
    setEmployeeId(""); setExternalName(""); setExternalEmail(""); setError(""); onSaved();
  }

  async function revoke(row: AnyRow) {
    const result = await (supabase.from("project_access_grants" as never) as any).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("id", row.id);
    if (result.error) setError(result.error.message); else onSaved();
  }

  return <div className="space-y-5"><HrSectionCard icon={ShieldCheck} title="Droits d’accès et travail partagé" description="Donner un accès ciblé au projet sans ouvrir toute l’organisation ; la lecture et la modification restent indépendantes par périmètre."><div className="grid gap-4 lg:grid-cols-4"><label><span className="text-xs font-bold text-slate-600">Ressource ONEPILOT</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="">Accès externe ou module RH absent</option>{employees.slice().sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "fr")).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name || employee.employee_number}</option>)}</select></label><label><span className="text-xs font-bold text-slate-600">Nom externe</span><input value={externalName} onChange={(event) => setExternalName(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} placeholder="Nom et prénom" /></label><label><span className="text-xs font-bold text-slate-600">E-mail externe</span><input type="email" value={externalEmail} onChange={(event) => setExternalEmail(event.target.value)} className={`${hrInputClassName} mt-1 w-full`} placeholder="nom@entreprise.fr" /></label><label><span className="text-xs font-bold text-slate-600">Niveau d’accès</span><select value={level} onChange={(event) => setLevel(event.target.value)} className={`${hrSelectClassName} mt-1 w-full`}><option value="view">Lecture</option><option value="edit">Modification</option><option value="admin">Administration du projet</option></select></label></div><div className="mt-4 flex flex-wrap gap-2">{Object.entries(scopeLabels).map(([scope, label]) => <label key={scope} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${scopes.includes(scope) ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}><input type="checkbox" checked={scopes.includes(scope)} onChange={() => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope])} className="mr-2" />{label}</label>)}</div>{error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<div className="mt-4 flex justify-end"><button type="button" onClick={() => void addGrant()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"><Plus className="h-4 w-4" />Ajouter l’accès</button></div></HrSectionCard><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-4 py-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><KeyRound className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-slate-950">Utilisateurs autorisés</h3><p className="mt-1 text-xs text-slate-500">Accès actifs, niveau de droit et sous-pages autorisées.</p></div></div><div className="max-h-[334px] overflow-auto"><table className="w-full min-w-[1100px]"><thead className="sticky top-0 z-20"><tr><th className="sticky left-0 z-30 bg-sky-50 text-left">Utilisateur</th><th>E-mail</th><th>Droit</th><th>Périmètre</th><th>Origine</th><th className="sticky right-0 z-30 bg-sky-50 text-right">Actions</th></tr></thead><tbody>{grants.filter((row) => !row.archived_at).map((row) => { const employee = employeeMap.get(String(row.employee_id)); return <tr key={row.id}><td className="sticky left-0 z-10 bg-white font-bold text-indigo-700">{employee?.full_name || row.external_name || "Utilisateur invité"}</td><td>{employee?.professional_email || employee?.email || row.external_email || "—"}</td><td><HrStatusBadge status={row.access_level === "admin" ? "completed" : row.access_level === "edit" ? "in_progress" : "planned"} label={row.access_level === "admin" ? "Administration" : row.access_level === "edit" ? "Modification" : "Lecture"} /></td><td>{(row.scopes || []).map((scope: string) => scopeLabels[scope] || scope).join(", ")}</td><td>{row.employee_id ? "Ressource interne" : "Accès autonome"}</td><td className="sticky right-0 bg-white text-right"><HrActionMenu labels={{ view: "Voir l’accès", edit: "Modifier l’accès", archive: "Révoquer l’accès", restore: "Réactiver l’accès" }} onArchive={() => revoke(row)} /></td></tr>; })}</tbody></table></div></section></div>;
}
