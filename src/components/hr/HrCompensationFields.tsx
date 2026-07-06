"use client";

import {
  type ReactNode,
} from "react";
import {
  BadgeEuro,
  BriefcaseBusiness,
  Calculator,
  Clock3,
  Euro,
  Landmark,
  Percent,
  Timer,
  TrendingUp,
} from "lucide-react";

export type CompensationMode =
  | "salary"
  | "daily_rate"
  | "hourly_rate";

export type EmployerChargeProfile = {
  id: string;
  code: string;
  name: string;
  charge_rate: number;
  is_default: boolean;
};

export type HrCompensationValue = {
  compensationMode: CompensationMode;
  employerChargeProfileId: string;
  employerChargeRatePercent: string;
  annualGrossSalary: string;
  externalDailyRate: string;
  externalHourlyRate: string;
  externalOverheadRatePercent: string;
  dailyWorkingHours: string;
  weeklyHours: string;
  annualWorkingDays: string;
};

type HrCompensationFieldsProps = {
  value: HrCompensationValue;
  chargeProfiles: EmployerChargeProfile[];
  activityRatePercent?: string;

  onChange: (
    value: HrCompensationValue,
  ) => void;
};

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

const selectClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950 dark:disabled:bg-slate-900";

function parseNumber(
  value: string | undefined,
  fallback = 0,
) {
  const normalizedValue = String(
    value ?? "",
  )
    .trim()
    .replace(",", ".");

  if (
    normalizedValue.length === 0
  ) {
    return fallback;
  }

  const parsedValue = Number(
    normalizedValue,
  );

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : fallback;
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatNumber(
  value: number,
  maximumFractionDigits = 2,
) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    },
  ).format(value);
}

function deduplicateChargeProfiles(
  chargeProfiles: EmployerChargeProfile[],
) {
  const seen = new Set<string>();

  return chargeProfiles.filter(
    (profile) => {
      if (!profile.id) {
        return false;
      }

      if (seen.has(profile.id)) {
        return false;
      }

      seen.add(profile.id);

      return true;
    },
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </label>

      {children}

      {description && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

function ModeButton({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-indigo-200 bg-indigo-50 shadow-sm ring-2 ring-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/30 dark:ring-indigo-950"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-xl p-2.5 ${
            active
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
          }`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div>
          <p
            className={`text-sm font-black ${
              active
                ? "text-indigo-900 dark:text-indigo-200"
                : "text-slate-950 dark:text-white"
            }`}
          >
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function CalculationCard({
  label,
  value,
  description,
  formula,
  icon: Icon,
  accent = "indigo",
}: {
  label: string;
  value: string;
  description: string;
  formula: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  accent?:
    | "indigo"
    | "emerald"
    | "amber"
    | "violet"
    | "cyan"
    | "rose";
}) {
  const styles = {
    indigo: {
      panel:
        "border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-950/20",
      icon:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
      value:
        "text-indigo-700 dark:text-indigo-300",
    },

    emerald: {
      panel:
        "border-emerald-100 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      icon:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      value:
        "text-emerald-700 dark:text-emerald-300",
    },

    amber: {
      panel:
        "border-amber-100 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
      icon:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      value:
        "text-amber-700 dark:text-amber-300",
    },

    violet: {
      panel:
        "border-violet-100 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20",
      icon:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
      value:
        "text-violet-700 dark:text-violet-300",
    },

    cyan: {
      panel:
        "border-cyan-100 bg-cyan-50/60 dark:border-cyan-900/50 dark:bg-cyan-950/20",
      icon:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
      value:
        "text-cyan-700 dark:text-cyan-300",
    },

    rose: {
      panel:
        "border-rose-100 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20",
      icon:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      value:
        "text-rose-700 dark:text-rose-300",
    },
  };

  const selectedStyle =
    styles[accent];

  return (
    <article
      title={formula}
      className={`rounded-2xl border p-4 shadow-sm ${selectedStyle.panel}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`rounded-xl p-2.5 ${selectedStyle.icon}`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>
      </div>

      <p className="mt-4 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${selectedStyle.value}`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      <p className="mt-2 text-[10px] font-semibold text-slate-400">
        Survol : formule de calcul
      </p>
    </article>
  );
}

export default function HrCompensationFields({
  value,
  chargeProfiles,
  activityRatePercent,
  onChange,
}: HrCompensationFieldsProps) {
  const availableChargeProfiles =
    deduplicateChargeProfiles(
      chargeProfiles,
    );

  const annualGrossSalary =
    parseNumber(
      value.annualGrossSalary,
    );

  const activityRate =
    Math.min(
      1,
      Math.max(
        parseNumber(
          activityRatePercent,
          100,
        ) / 100,
        0,
      ),
    );

  const externalDailyRate =
    parseNumber(
      value.externalDailyRate,
    );

  const externalHourlyRate =
    parseNumber(
      value.externalHourlyRate,
    );

  const employerChargeRate =
    parseNumber(
      value.employerChargeRatePercent,
    ) / 100;

  const externalOverheadRate =
    parseNumber(
      value.externalOverheadRatePercent,
    ) / 100;

  const dailyWorkingHours =
    Math.max(
      parseNumber(
        value.dailyWorkingHours,
        7,
      ),
      0.01,
    );

  const weeklyHours =
    Math.max(
      parseNumber(
        value.weeklyHours,
        35,
      ),
      0.01,
    );

  const annualWorkingDays =
    Math.max(
      parseNumber(
        value.annualWorkingDays,
        218,
      ),
      0.01,
    );

  const annualWorkingHours =
    weeklyHours * 52;

  const proratedAnnualGrossSalary =
    annualGrossSalary * activityRate;

  const monthlyGrossSalary =
    proratedAnnualGrossSalary / 12;

  const salaryAnnualLoadedCost =
    proratedAnnualGrossSalary *
    (1 + employerChargeRate);

  const salaryMonthlyLoadedCost =
    salaryAnnualLoadedCost / 12;

  const salaryGrossHourlyRate =
    annualWorkingHours > 0
      ? proratedAnnualGrossSalary /
        annualWorkingHours
      : 0;

  const salaryGrossDailyCost =
    annualWorkingDays > 0
      ? proratedAnnualGrossSalary /
        annualWorkingDays
      : 0;

  const salaryLoadedHourlyCost =
    annualWorkingHours > 0
      ? salaryAnnualLoadedCost /
        annualWorkingHours
      : 0;

  const salaryLoadedDailyCost =
    annualWorkingDays > 0
      ? salaryAnnualLoadedCost /
        annualWorkingDays
      : 0;

  const freelanceHourlyRate =
    externalDailyRate /
    dailyWorkingHours;

  const freelanceLoadedDailyCost =
    externalDailyRate *
    (1 + externalOverheadRate);

  const freelanceLoadedHourlyCost =
    freelanceLoadedDailyCost /
    dailyWorkingHours;

  const hourlyDailyRate =
    externalHourlyRate *
    dailyWorkingHours;

  const hourlyLoadedRate =
    externalHourlyRate *
    (1 + externalOverheadRate);

  const hourlyLoadedDailyCost =
    hourlyLoadedRate *
    dailyWorkingHours;

  function updateField<
    K extends keyof HrCompensationValue,
  >(
    field: K,
    fieldValue:
      HrCompensationValue[K],
  ) {
    onChange({
      ...value,
      [field]: fieldValue,
    });
  }

  function handleModeChange(
    compensationMode: CompensationMode,
  ) {
    onChange({
      ...value,
      compensationMode,
    });
  }

  function handleChargeProfileChange(
    profileId: string,
  ) {
    const selectedProfile =
      availableChargeProfiles.find(
        (profile) =>
          profile.id === profileId,
      );

    onChange({
      ...value,

      employerChargeProfileId:
        profileId,

      employerChargeRatePercent:
        selectedProfile
          ? String(
              Number(
                selectedProfile.charge_rate,
              ) * 100,
            )
          : value.employerChargeRatePercent,
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <ModeButton
          active={
            value.compensationMode ===
            "salary"
          }
          title="Salarié"
          description="Salaire de référence, prorata éventuel, charges et coûts."
          icon={Landmark}
          onClick={() =>
            handleModeChange("salary")
          }
        />

        <ModeButton
          active={
            value.compensationMode ===
            "daily_rate"
          }
          title="Freelance au TJM"
          description="Tarif journalier, frais indirects et coût horaire."
          icon={BriefcaseBusiness}
          onClick={() =>
            handleModeChange(
              "daily_rate",
            )
          }
        />

        <ModeButton
          active={
            value.compensationMode ===
            "hourly_rate"
          }
          title="Prestataire horaire"
          description="Tarif horaire, base jour et coût complet."
          icon={Timer}
          onClick={() =>
            handleModeChange(
              "hourly_rate",
            )
          }
        />
      </section>

      {value.compensationMode ===
        "salary" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <BadgeEuro
                className="h-4 w-4"
                strokeWidth={1.9}
              />
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-950 dark:text-white">
                Base salariale
              </h4>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Les calculs alimentent la capacité, le staffing, les coûts projet et les analyses financières.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="Salaire brut annuel de référence"
              description="Base annuelle avant prorata éventuel du temps de travail."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.annualGrossSalary
                }
                onChange={(event) =>
                  updateField(
                    "annualGrossSalary",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 42000"
              />
            </Field>

            <Field
              label="Profil de charges"
              description="Sélectionne un profil ou conserve le taux manuel."
            >
              <select
                value={
                  value.employerChargeProfileId
                }
                onChange={(event) =>
                  handleChargeProfileChange(
                    event.target.value,
                  )
                }
                className={
                  selectClassName
                }
              >
                <option value="">
                  Saisie manuelle
                </option>

                {availableChargeProfiles.map(
                  (profile) => (
                    <option
                      key={profile.id}
                      value={profile.id}
                    >
                      {profile.name}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field
              label="Taux de charges employeur (%)"
              description="Taux utilisé pour calculer le coût chargé."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.employerChargeRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "employerChargeRatePercent",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 42"
              />
            </Field>

            <Field
              label="Heures hebdomadaires"
              description="Base calculée depuis la semaine de travail ou saisie manuellement."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.weeklyHours
                }
                onChange={(event) =>
                  updateField(
                    "weeklyHours",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
              />
            </Field>

            <Field
              label="Jours travaillés annuels"
              description="Base annuelle utilisée pour les coûts journaliers."
            >
              <select
                value={
                  value.annualWorkingDays
                }
                onChange={(event) =>
                  updateField(
                    "annualWorkingDays",
                    event.target.value,
                  )
                }
                className={
                  selectClassName
                }
              >
                <option value="218">
                  Forfait jours — 218 jours
                </option>

                <option value="216">
                  Forfait jours — 216 jours
                </option>

                <option value="220">
                  Base standard — 220 jours
                </option>

                <option value="228">
                  Base haute — 228 jours
                </option>

                <option value="251">
                  Base ouvrée théorique — 251 jours
                </option>
              </select>
            </Field>

            <Field
              label="Heures par jour"
              description="Base quotidienne moyenne utilisée pour les coûts et les absences."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.dailyWorkingHours
                }
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
              />
            </Field>
          </div>
        </section>
      )}

      {value.compensationMode ===
        "daily_rate" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="TJM d’achat"
              description="Tarif journalier contractuel de la ressource."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.externalDailyRate
                }
                onChange={(event) =>
                  updateField(
                    "externalDailyRate",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 600"
              />
            </Field>

            <Field
              label="Heures par jour"
              description="Base de conversion du TJM en taux horaire."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.dailyWorkingHours
                }
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
              />
            </Field>

            <Field
              label="Frais indirects (%)"
              description="Frais de portage, gestion ou marge d’achat."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.externalOverheadRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "externalOverheadRatePercent",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 5"
              />
            </Field>
          </div>
        </section>
      )}

      {value.compensationMode ===
        "hourly_rate" && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="Taux horaire d’achat"
              description="Tarif horaire contractuel de la ressource."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.externalHourlyRate
                }
                onChange={(event) =>
                  updateField(
                    "externalHourlyRate",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 85"
              />
            </Field>

            <Field
              label="Heures par jour"
              description="Base de conversion du taux horaire en coût journalier."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.dailyWorkingHours
                }
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
              />
            </Field>

            <Field
              label="Frais indirects (%)"
              description="Frais de portage, gestion ou marge d’achat."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  value.externalOverheadRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "externalOverheadRatePercent",
                    event.target.value,
                  )
                }
                className={
                  inputClassName
                }
                placeholder="Ex. 5"
              />
            </Field>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Calculator
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <div>
            <h4 className="text-sm font-black text-slate-950 dark:text-white">
              Aperçu automatique
            </h4>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Survole une carte pour voir la formule utilisée.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {value.compensationMode ===
            "salary" && (
            <>
              <CalculationCard
                label="Brut annuel réel"
                value={formatCurrency(
                  proratedAnnualGrossSalary,
                )}
                description="Salaire annuel après prorata du temps de travail."
                formula={`Brut annuel de référence (${formatCurrency(
                  annualGrossSalary,
                )}) × taux d’activité (${formatNumber(
                  activityRate * 100,
                )} %)`}
                icon={Euro}
                accent="indigo"
              />

              <CalculationCard
                label="Brut mensuel réel"
                value={formatCurrency(
                  monthlyGrossSalary,
                )}
                description="Salaire mensuel réellement estimé."
                formula={`Brut annuel réel (${formatCurrency(
                  proratedAnnualGrossSalary,
                )}) ÷ 12`}
                icon={Euro}
                accent="cyan"
              />

              <CalculationCard
                label="Coût mensuel chargé"
                value={formatCurrency(
                  salaryMonthlyLoadedCost,
                )}
                description="Coût mensuel avec charges employeur."
                formula={`Brut mensuel réel (${formatCurrency(
                  monthlyGrossSalary,
                )}) × (1 + taux de charges ${formatNumber(
                  employerChargeRate * 100,
                )} %)`}
                icon={TrendingUp}
                accent="violet"
              />

              <CalculationCard
                label="Taux horaire brut"
                value={formatCurrency(
                  salaryGrossHourlyRate,
                )}
                description={`${formatNumber(
                  annualWorkingHours,
                )} h annuelles estimées.`}
                formula={`Brut annuel réel (${formatCurrency(
                  proratedAnnualGrossSalary,
                )}) ÷ heures annuelles (${formatNumber(
                  annualWorkingHours,
                )})`}
                icon={Clock3}
                accent="cyan"
              />

              <CalculationCard
                label="Taux horaire chargé"
                value={formatCurrency(
                  salaryLoadedHourlyCost,
                )}
                description="Coût horaire complet pour projet et capacité."
                formula={`Coût annuel chargé (${formatCurrency(
                  salaryAnnualLoadedCost,
                )}) ÷ heures annuelles (${formatNumber(
                  annualWorkingHours,
                )})`}
                icon={BadgeEuro}
                accent="emerald"
              />

              <CalculationCard
                label="Coût journalier brut"
                value={formatCurrency(
                  salaryGrossDailyCost,
                )}
                description="Coût journalier avant charges."
                formula={`Brut annuel réel (${formatCurrency(
                  proratedAnnualGrossSalary,
                )}) ÷ jours annuels (${formatNumber(
                  annualWorkingDays,
                )})`}
                icon={BriefcaseBusiness}
                accent="amber"
              />

              <CalculationCard
                label="Coût journalier chargé"
                value={formatCurrency(
                  salaryLoadedDailyCost,
                )}
                description="Coût journalier complet."
                formula={`Coût annuel chargé (${formatCurrency(
                  salaryAnnualLoadedCost,
                )}) ÷ jours annuels (${formatNumber(
                  annualWorkingDays,
                )})`}
                icon={BriefcaseBusiness}
                accent="emerald"
              />

              <CalculationCard
                label="Taux d’activité"
                value={`${formatNumber(
                  activityRate * 100,
                )} %`}
                description="Prorata utilisé pour le salaire réel."
                formula="Taux calculé depuis la semaine de travail ou renseigné dans le contrat."
                icon={Percent}
                accent="rose"
              />
            </>
          )}

          {value.compensationMode ===
            "daily_rate" && (
            <>
              <CalculationCard
                label="TJM d’achat"
                value={formatCurrency(
                  externalDailyRate,
                )}
                description="Tarif journalier contractuel."
                formula="Valeur saisie dans le champ TJM d’achat."
                icon={Euro}
                accent="indigo"
              />

              <CalculationCard
                label="Taux horaire achat"
                value={formatCurrency(
                  freelanceHourlyRate,
                )}
                description={`${formatNumber(
                  dailyWorkingHours,
                )} h par jour.`}
                formula={`TJM (${formatCurrency(
                  externalDailyRate,
                )}) ÷ heures par jour (${formatNumber(
                  dailyWorkingHours,
                )})`}
                icon={Clock3}
                accent="cyan"
              />

              <CalculationCard
                label="Coût journalier chargé"
                value={formatCurrency(
                  freelanceLoadedDailyCost,
                )}
                description="TJM avec frais indirects."
                formula={`TJM (${formatCurrency(
                  externalDailyRate,
                )}) × (1 + frais indirects ${formatNumber(
                  externalOverheadRate * 100,
                )} %)`}
                icon={BadgeEuro}
                accent="emerald"
              />

              <CalculationCard
                label="Coût horaire chargé"
                value={formatCurrency(
                  freelanceLoadedHourlyCost,
                )}
                description="Base horaire pour staffing et marge projet."
                formula={`Coût journalier chargé (${formatCurrency(
                  freelanceLoadedDailyCost,
                )}) ÷ heures par jour (${formatNumber(
                  dailyWorkingHours,
                )})`}
                icon={Calculator}
                accent="violet"
              />
            </>
          )}

          {value.compensationMode ===
            "hourly_rate" && (
            <>
              <CalculationCard
                label="Taux horaire achat"
                value={formatCurrency(
                  externalHourlyRate,
                )}
                description="Tarif horaire contractuel."
                formula="Valeur saisie dans le champ taux horaire d’achat."
                icon={Euro}
                accent="indigo"
              />

              <CalculationCard
                label="Coût horaire chargé"
                value={formatCurrency(
                  hourlyLoadedRate,
                )}
                description="Taux horaire avec frais indirects."
                formula={`Taux horaire (${formatCurrency(
                  externalHourlyRate,
                )}) × (1 + frais indirects ${formatNumber(
                  externalOverheadRate * 100,
                )} %)`}
                icon={BadgeEuro}
                accent="emerald"
              />

              <CalculationCard
                label="Base journalière"
                value={formatCurrency(
                  hourlyDailyRate,
                )}
                description="Coût journalier avant frais."
                formula={`Taux horaire (${formatCurrency(
                  externalHourlyRate,
                )}) × heures par jour (${formatNumber(
                  dailyWorkingHours,
                )})`}
                icon={Clock3}
                accent="cyan"
              />

              <CalculationCard
                label="Coût journalier chargé"
                value={formatCurrency(
                  hourlyLoadedDailyCost,
                )}
                description="Coût journalier complet."
                formula={`Coût horaire chargé (${formatCurrency(
                  hourlyLoadedRate,
                )}) × heures par jour (${formatNumber(
                  dailyWorkingHours,
                )})`}
                icon={Calculator}
                accent="violet"
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}