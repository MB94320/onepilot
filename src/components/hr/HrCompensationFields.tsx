"use client";

import { Calculator, CircleDollarSign } from "lucide-react";

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
  onChange: (value: HrCompensationValue) => void;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

function parseNumber(value: string, fallback = 0) {
  const parsedValue = Number(value.replace(",", "."));

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </span>
      )}
    </label>
  );
}

function CalculationCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1.5 text-base font-bold text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function HrCompensationFields({
  value,
  chargeProfiles,
  onChange,
}: HrCompensationFieldsProps) {
  const annualGrossSalary = parseNumber(
    value.annualGrossSalary,
  );

  const externalDailyRate = parseNumber(
    value.externalDailyRate,
  );

  const externalHourlyRate = parseNumber(
    value.externalHourlyRate,
  );

  const employerChargeRate =
    parseNumber(value.employerChargeRatePercent) / 100;

  const externalOverheadRate =
    parseNumber(value.externalOverheadRatePercent) / 100;

  const dailyWorkingHours = Math.max(
    parseNumber(value.dailyWorkingHours, 7),
    0.01,
  );

  const weeklyHours = Math.max(
    parseNumber(value.weeklyHours, 35),
    0.01,
  );

  const annualWorkingDays = Math.max(
    parseNumber(value.annualWorkingDays, 218),
    0.01,
  );

  const annualWorkingHours = weeklyHours * 52;

  const salaryAnnualLoadedCost =
    annualGrossSalary * (1 + employerChargeRate);

  const salaryGrossHourlyRate =
    annualWorkingHours > 0
      ? annualGrossSalary / annualWorkingHours
      : 0;

  const salaryLoadedHourlyCost =
    annualWorkingHours > 0
      ? salaryAnnualLoadedCost / annualWorkingHours
      : 0;

  const salaryLoadedDailyCost =
    annualWorkingDays > 0
      ? salaryAnnualLoadedCost / annualWorkingDays
      : 0;

  const freelanceHourlyRate =
    externalDailyRate / dailyWorkingHours;

  const freelanceLoadedDailyCost =
    externalDailyRate * (1 + externalOverheadRate);

  const freelanceLoadedHourlyCost =
    freelanceLoadedDailyCost / dailyWorkingHours;

  const hourlyDailyRate =
    externalHourlyRate * dailyWorkingHours;

  const hourlyLoadedRate =
    externalHourlyRate * (1 + externalOverheadRate);

  const hourlyLoadedDailyCost =
    hourlyLoadedRate * dailyWorkingHours;

  function updateField<K extends keyof HrCompensationValue>(
    field: K,
    fieldValue: HrCompensationValue[K],
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
      annualGrossSalary:
        compensationMode === "salary"
          ? value.annualGrossSalary
          : "",
      externalDailyRate:
        compensationMode === "daily_rate"
          ? value.externalDailyRate
          : "",
      externalHourlyRate:
        compensationMode === "hourly_rate"
          ? value.externalHourlyRate
          : "",
    });
  }

  function handleChargeProfileChange(
    profileId: string,
  ) {
    const selectedProfile = chargeProfiles.find(
      (profile) => profile.id === profileId,
    );

    onChange({
      ...value,
      employerChargeProfileId: profileId,
      employerChargeRatePercent: selectedProfile
        ? String(
            Number(selectedProfile.charge_rate) * 100,
          )
        : value.employerChargeRatePercent,
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-900">
          <CircleDollarSign
            className="h-4 w-4 text-slate-600 dark:text-slate-300"
            strokeWidth={1.8}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
            Rémunération et coût de la ressource
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Le mode de calcul s’adapte aux salariés,
            freelances et prestataires.
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mode de rémunération
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                handleModeChange("salary")
              }
              className={`rounded-lg border px-4 py-3 text-left transition ${
                value.compensationMode === "salary"
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                Salarié
              </span>

              <span className="mt-1 block text-xs opacity-75">
                Salaire brut annuel et charges employeur.
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleModeChange("daily_rate")
              }
              className={`rounded-lg border px-4 py-3 text-left transition ${
                value.compensationMode === "daily_rate"
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                Freelance au TJM
              </span>

              <span className="mt-1 block text-xs opacity-75">
                Tarif journalier d’achat de la ressource.
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleModeChange("hourly_rate")
              }
              className={`rounded-lg border px-4 py-3 text-left transition ${
                value.compensationMode === "hourly_rate"
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
              }`}
            >
              <span className="block text-sm font-semibold">
                Prestataire horaire
              </span>

              <span className="mt-1 block text-xs opacity-75">
                Tarif d’achat défini par heure.
              </span>
            </button>
          </div>
        </div>

        {value.compensationMode === "salary" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salaire brut annuel (€)">
              <input
                type="number"
                min="0"
                step="100"
                value={value.annualGrossSalary}
                onChange={(event) =>
                  updateField(
                    "annualGrossSalary",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field
              label="Profil de charges employeur"
              description="Hypothèse de pilotage modifiable manuellement."
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
                className={inputClassName}
              >
                <option value="">
                  Saisie manuelle
                </option>

                {chargeProfiles.map((profile) => (
                  <option
                    key={profile.id}
                    value={profile.id}
                  >
                    {profile.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Charges employeur (%)">
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={
                  value.employerChargeRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "employerChargeRatePercent",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Heures hebdomadaires">
              <input
                type="number"
                min="0.1"
                max="80"
                step="0.5"
                value={value.weeklyHours}
                onChange={(event) =>
                  updateField(
                    "weeklyHours",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Jours travaillés par an">
              <input
                type="number"
                min="1"
                max="366"
                step="1"
                value={value.annualWorkingDays}
                onChange={(event) =>
                  updateField(
                    "annualWorkingDays",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Heures travaillées par jour">
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.25"
                value={value.dailyWorkingHours}
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>
          </div>
        )}

        {value.compensationMode === "daily_rate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="TJM d’achat (€)"
              description="Coût journalier facturé par le freelance ou le sous-traitant."
            >
              <input
                type="number"
                min="0"
                step="10"
                value={value.externalDailyRate}
                onChange={(event) =>
                  updateField(
                    "externalDailyRate",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Heures travaillées par jour">
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.25"
                value={value.dailyWorkingHours}
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field
              label="Frais externes complémentaires (%)"
              description="Frais administratifs, plateforme, gestion ou assurance."
            >
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={
                  value.externalOverheadRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "externalOverheadRatePercent",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>
          </div>
        )}

        {value.compensationMode === "hourly_rate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Taux horaire d’achat (€)">
              <input
                type="number"
                min="0"
                step="1"
                value={value.externalHourlyRate}
                onChange={(event) =>
                  updateField(
                    "externalHourlyRate",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Heures travaillées par jour">
              <input
                type="number"
                min="0.1"
                max="24"
                step="0.25"
                value={value.dailyWorkingHours}
                onChange={(event) =>
                  updateField(
                    "dailyWorkingHours",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>

            <Field label="Frais externes complémentaires (%)">
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={
                  value.externalOverheadRatePercent
                }
                onChange={(event) =>
                  updateField(
                    "externalOverheadRatePercent",
                    event.target.value,
                  )
                }
                className={inputClassName}
              />
            </Field>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <Calculator
              className="h-4 w-4 text-slate-500"
              strokeWidth={1.8}
            />

            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Aperçu automatique
            </h4>
          </div>

          {value.compensationMode === "salary" && (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <CalculationCard
                label="Brut mensuel"
                value={formatCurrency(
                  annualGrossSalary / 12,
                )}
                description="Salaire annuel divisé par douze."
              />

              <CalculationCard
                label="Taux horaire brut"
                value={formatCurrency(
                  salaryGrossHourlyRate,
                )}
                description="Salaire brut rapporté aux heures annuelles."
              />

              <CalculationCard
                label="Taux horaire chargé"
                value={formatCurrency(
                  salaryLoadedHourlyCost,
                )}
                description="Coût employeur rapporté aux heures annuelles."
              />

              <CalculationCard
                label="Coût journalier chargé"
                value={formatCurrency(
                  salaryLoadedDailyCost,
                )}
                description="Coût employeur rapporté aux jours annuels."
              />
            </div>
          )}

          {value.compensationMode === "daily_rate" && (
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <CalculationCard
                label="TJM d’achat"
                value={formatCurrency(
                  externalDailyRate,
                )}
                description="Tarif journalier contractuel."
              />

              <CalculationCard
                label="Taux horaire"
                value={formatCurrency(
                  freelanceHourlyRate,
                )}
                description="TJM divisé par la durée journalière."
              />

              <CalculationCard
                label="TJM chargé"
                value={formatCurrency(
                  freelanceLoadedDailyCost,
                )}
                description="TJM incluant les frais externes."
              />

              <CalculationCard
                label="Taux horaire chargé"
                value={formatCurrency(
                  freelanceLoadedHourlyCost,
                )}
                description="TJM chargé divisé par la durée journalière."
              />
            </div>
          )}

          {value.compensationMode === "hourly_rate" && (
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <CalculationCard
                label="Taux horaire"
                value={formatCurrency(
                  externalHourlyRate,
                )}
                description="Tarif horaire contractuel."
              />

              <CalculationCard
                label="Taux horaire chargé"
                value={formatCurrency(
                  hourlyLoadedRate,
                )}
                description="Tarif horaire incluant les frais externes."
              />

              <CalculationCard
                label="Coût journalier chargé"
                value={formatCurrency(
                  hourlyLoadedDailyCost,
                )}
                description="Taux chargé multiplié par la durée journalière."
              />

              <CalculationCard
                label="Équivalent journalier"
                value={formatCurrency(
                  hourlyDailyRate,
                )}
                description="Taux horaire multiplié par la durée journalière."
              />
            </div>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Ces montants servent au pilotage économique de
          ONEPILOT. Ils ne remplacent pas un logiciel de paie
          ou un calcul réglementaire de cotisations.
        </p>
      </div>
    </section>
  );
}