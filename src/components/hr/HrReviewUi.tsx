"use client";

import { useState } from "react";

import {
  HrActionMenu,
  HrColumnFilterMenu,
  HrInfo,
  HrResetFilters,
  HrStatusBadge,
} from "@/components/hr/HrReferenceUi";

type AnyRow = Record<string, any>;

const labels = {
  view: "Voir l’entretien",
  edit: "Poursuivre l’entretien",
  archive: "Archiver l’entretien",
  restore: "Réactiver l’entretien",
};

const statusLabels: Record<string, string> = {
  in_progress: "En cours",
  sent_to_manager: "Envoyé au manager",
  manager_approved: "Validé manager",
  hr_provisional: "Validé RH (provisoire)",
  completed: "Terminé",
  employee_input: "En cours",
  manager_input: "Envoyé au manager",
  calibration: "Validé manager",
};

function fullName(row: AnyRow) { return row.full_name || row.employee_name || row.employee_number || "Ressource non renseignée"; }
function department(row: AnyRow) { return row.department_free_text || row.department_name || "Non renseigné"; }
function job(row: AnyRow) { return row.job_free_text || row.job_name || row.function_free_text || row.function_name || "Non renseigné"; }
function statusLabel(status: unknown) { return statusLabels[String(status || "")] || String(status || "Non renseigné"); }
function validationLevel(status: unknown) { return ["in_progress", "sent_to_manager", "manager_approved", "hr_provisional", "completed"].indexOf(String(status || "in_progress")); }
function dateLabel(value: unknown) {
  if (!value) return "Non renseignée";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
function reviewYear(row: AnyRow) { return row.review_year || String(row.period_start || "").slice(0, 4) || new Date().getFullYear(); }

function ReviewSummary({ row }: { row: AnyRow }) {
  const details = row.review_details || {};
  return <div className="mt-4 grid gap-2 lg:grid-cols-2"><HrInfo label="Bilan année écoulée" value={details?.previous_year?.objectives || "À compléter"} accent="sky" /><HrInfo label="Atteinte N-1" value={`${details?.previous_year?.achievement ?? 0} %`} accent="emerald" /><HrInfo label="Objectifs en cours" value={details?.current_year?.objectives || "À définir"} accent="indigo" /><HrInfo label="Formations à prévoir" value={Array.isArray(details?.training) && details.training.length ? details.training.join(" · ") : "À qualifier"} accent="amber" /></div>;
}

export function HrReviewCard({ row, onOpen, onArchive }: { row: AnyRow; onOpen: (row: AnyRow) => void; onArchive: (row: AnyRow) => void }) {
  const level = validationLevel(row.status);
  return <article role="button" tabIndex={0} onClick={() => onOpen(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(row); }} className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/25 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-600/60 dark:bg-slate-700/70 dark:hover:bg-indigo-900/20">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-black text-slate-950 dark:text-white">Entretien {reviewYear(row)} · {fullName(row)}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{department(row)} · {job(row)}</p></div><HrActionMenu labels={labels} onView={() => onOpen(row)} onEdit={() => onOpen(row)} onArchive={() => onArchive(row)} /></div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2"><HrInfo label="Manager" value={row.manager_name || "Non renseigné"} accent="sky" /><HrInfo label="Statut" value={<HrStatusBadge status={row.status} label={statusLabel(row.status)} />} /><HrInfo label="Date entretien" value={dateLabel(row.interview_date)} accent="indigo" /><HrInfo label="Objectifs" value={`${row.completed_objective_count || 0} / ${row.objective_count || 0} atteints`} accent="emerald" /><HrInfo label="Note globale" value={row.global_rating == null ? "À renseigner" : `${row.global_rating} / 5`} accent="amber" /><HrInfo label="Dernière mise à jour" value={dateLabel(row.updated_at)} /></div>
    <ReviewSummary row={row} />
    <div className="mt-3 grid gap-2 sm:grid-cols-3"><HrInfo label="Collaborateur" value={level >= 1 ? "Validé" : "À valider"} accent={level >= 1 ? "emerald" : "amber"} /><HrInfo label="Manager" value={level >= 2 ? "Validé" : "À valider"} accent={level >= 2 ? "emerald" : "amber"} /><HrInfo label="RH" value={level >= 3 ? "Validé provisoirement" : "À valider"} accent={level >= 3 ? "emerald" : "amber"} /></div>
  </article>;
}

export function HrReviewTable({ rows, onOpen, onArchive }: { rows: AnyRow[]; onOpen: (row: AnyRow) => void; onArchive: (row: AnyRow) => void }) {
  const columns = [
    { key: "year", label: "Année", value: (row: AnyRow) => String(reviewYear(row)) },
    { key: "employee", label: "Collaborateur", value: fullName },
    { key: "department", label: "Service", value: department },
    { key: "manager", label: "Manager", value: (row: AnyRow) => String(row.manager_name || "Non renseigné") },
    { key: "status", label: "Statut", value: (row: AnyRow) => statusLabel(row.status) },
    { key: "date", label: "Date entretien", value: (row: AnyRow) => dateLabel(row.interview_date) },
    { key: "objectives", label: "Objectifs atteints", value: (row: AnyRow) => `${row.completed_objective_count || 0} / ${row.objective_count || 0}` },
    { key: "rating", label: "Note", value: (row: AnyRow) => row.global_rating == null ? "À renseigner" : `${row.global_rating} / 5` },
    { key: "managerValidation", label: "Validation manager", value: (row: AnyRow) => validationLevel(row.status) >= 2 ? "Validé" : "À valider" },
    { key: "hrValidation", label: "Validation RH", value: (row: AnyRow) => validationLevel(row.status) >= 3 ? "Validé provisoirement" : "À valider" },
  ];
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const visibleRows = rows.filter((row) => columns.every((column) => !filters[column.key]?.length || filters[column.key].includes(column.value(row))));
  const hasFilters = Object.values(filters).some((values) => values.length > 0);

  return <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-600/70"><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[1740px] border-separate border-spacing-0 bg-white text-xs font-normal text-slate-700 dark:bg-slate-700/70 dark:text-slate-200"><thead className="sticky top-0 z-20 bg-sky-50 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-600 dark:text-slate-200"><tr>{columns.map((column, index) => <th key={column.key} className={`${index === 0 ? "sticky left-0 z-30 bg-sky-50 dark:bg-slate-600" : ""} px-4 py-3 text-left`}><HrColumnFilterMenu label={column.label} values={rows.map(column.value)} selected={filters[column.key] || []} onChange={(values) => setFilters((current) => ({ ...current, [column.key]: values }))} /></th>)}<th className="sticky right-0 z-30 bg-sky-50 px-4 py-3 text-right dark:bg-slate-600">Actions</th></tr></thead><tbody>{visibleRows.map((row) => {
    const level = validationLevel(row.status);
    return <tr key={row.id} onClick={() => onOpen(row)} className="cursor-pointer hover:bg-indigo-50/45 dark:hover:bg-indigo-900/20"><td className="sticky left-0 z-10 bg-white px-4 py-3 dark:bg-slate-700">{reviewYear(row)}</td><td className="px-4 py-3">{fullName(row)}</td><td className="px-4 py-3">{department(row)}</td><td className="px-4 py-3">{row.manager_name || "Non renseigné"}</td><td className="px-4 py-3"><HrStatusBadge status={row.status} label={statusLabel(row.status)} /></td><td className="px-4 py-3">{dateLabel(row.interview_date)}</td><td className="px-4 py-3">{row.completed_objective_count || 0} / {row.objective_count || 0}</td><td className="px-4 py-3">{row.global_rating == null ? "À renseigner" : `${row.global_rating} / 5`}</td><td className="px-4 py-3"><HrStatusBadge status={level >= 2 ? "completed" : "pending"} label={level >= 2 ? "Validé" : "À valider"} /></td><td className="px-4 py-3"><HrStatusBadge status={level >= 3 ? "completed" : "pending"} label={level >= 3 ? "Validé provisoirement" : "À valider"} /></td><td className="sticky right-0 z-10 bg-white px-4 py-3 text-right dark:bg-slate-700"><HrActionMenu labels={labels} onView={() => onOpen(row)} onEdit={() => onOpen(row)} onArchive={() => onArchive(row)} /></td></tr>;
  })}</tbody></table></div>{hasFilters && <div className="border-t border-slate-100 px-4 py-2"><HrResetFilters onReset={() => setFilters({})} /></div>}</div>;
}

