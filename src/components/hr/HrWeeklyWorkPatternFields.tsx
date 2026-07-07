"use client";

import {
  CalendarDays,
  Clock3,
  Info,
  RotateCcw,
  Timer,
} from "lucide-react";

export type WorkDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type WorkDayPattern = {
  morningHours: string;
  afternoonHours: string;
};

export type WeeklyWorkPatternValue = {
  days: Record<
    WorkDayKey,
    WorkDayPattern
  >;
};

export type WeeklyWorkPatternSummary = {
  weeklyHours: number;
  workedDays: number;
  averageDailyHours: number;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
};

type HrWeeklyWorkPatternFieldsProps = {
  value: WeeklyWorkPatternValue;
  workingTimeType: string;
  referenceLabel?: string;
  referenceWeeklyHours?: number | null;

  onChange: (
    value: WeeklyWorkPatternValue,
    summary: WeeklyWorkPatternSummary,
  ) => void;
};

const dayDefinitions: Array<{
  key: WorkDayKey;
  label: string;
}> = [
  {
    key: "monday",
    label: "Lundi",
  },
  {
    key: "tuesday",
    label: "Mardi",
  },
  {
    key: "wednesday",
    label: "Mercredi",
  },
  {
    key: "thursday",
    label: "Jeudi",
  },
  {
    key: "friday",
    label: "Vendredi",
  },
  {
    key: "saturday",
    label: "Samedi",
  },
  {
    key: "sunday",
    label: "Dimanche",
  },
];

const fullTimePattern: Record<
  WorkDayKey,
  WorkDayPattern
> = {
  monday: {
    morningHours: "3.5",
    afternoonHours: "3.5",
  },
  tuesday: {
    morningHours: "3.5",
    afternoonHours: "3.5",
  },
  wednesday: {
    morningHours: "3.5",
    afternoonHours: "3.5",
  },
  thursday: {
    morningHours: "3.5",
    afternoonHours: "3.5",
  },
  friday: {
    morningHours: "3.5",
    afternoonHours: "3.5",
  },
  saturday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  sunday: {
    morningHours: "0",
    afternoonHours: "0",
  },
};

const emptyPattern: Record<
  WorkDayKey,
  WorkDayPattern
> = {
  monday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  tuesday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  wednesday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  thursday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  friday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  saturday: {
    morningHours: "0",
    afternoonHours: "0",
  },
  sunday: {
    morningHours: "0",
    afternoonHours: "0",
  },
};

function parseHours(value: string) {
  const normalizedValue = value
    .trim()
    .replace(",", ".");

  if (
    normalizedValue.length === 0
  ) {
    return 0;
  }

  const parsedValue = Number(
    normalizedValue,
  );

  return Number.isFinite(
    parsedValue,
  )
    ? Math.max(parsedValue, 0)
    : 0;
}

function formatHours(value: number) {
  return new Intl.NumberFormat(
    "fr-FR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function clonePattern(
  pattern: Record<
    WorkDayKey,
    WorkDayPattern
  >,
) {
  return {
    monday: {
      ...pattern.monday,
    },
    tuesday: {
      ...pattern.tuesday,
    },
    wednesday: {
      ...pattern.wednesday,
    },
    thursday: {
      ...pattern.thursday,
    },
    friday: {
      ...pattern.friday,
    },
    saturday: {
      ...pattern.saturday,
    },
    sunday: {
      ...pattern.sunday,
    },
  };
}

export function createDefaultWeeklyWorkPattern(): WeeklyWorkPatternValue {
  return {
    days: clonePattern(
      fullTimePattern,
    ),
  };
}

export function createEmptyWeeklyWorkPattern(): WeeklyWorkPatternValue {
  return {
    days: clonePattern(
      emptyPattern,
    ),
  };
}

export function calculateWeeklyWorkPatternSummary(
  value: WeeklyWorkPatternValue,
): WeeklyWorkPatternSummary {
  const dayHours = {
    mondayHours:
      parseHours(
        value.days.monday
          .morningHours,
      ) +
      parseHours(
        value.days.monday
          .afternoonHours,
      ),

    tuesdayHours:
      parseHours(
        value.days.tuesday
          .morningHours,
      ) +
      parseHours(
        value.days.tuesday
          .afternoonHours,
      ),

    wednesdayHours:
      parseHours(
        value.days.wednesday
          .morningHours,
      ) +
      parseHours(
        value.days.wednesday
          .afternoonHours,
      ),

    thursdayHours:
      parseHours(
        value.days.thursday
          .morningHours,
      ) +
      parseHours(
        value.days.thursday
          .afternoonHours,
      ),

    fridayHours:
      parseHours(
        value.days.friday
          .morningHours,
      ) +
      parseHours(
        value.days.friday
          .afternoonHours,
      ),

    saturdayHours:
      parseHours(
        value.days.saturday
          .morningHours,
      ) +
      parseHours(
        value.days.saturday
          .afternoonHours,
      ),

    sundayHours:
      parseHours(
        value.days.sunday
          .morningHours,
      ) +
      parseHours(
        value.days.sunday
          .afternoonHours,
      ),
  };

  const weeklyHours =
    dayHours.mondayHours +
    dayHours.tuesdayHours +
    dayHours.wednesdayHours +
    dayHours.thursdayHours +
    dayHours.fridayHours +
    dayHours.saturdayHours +
    dayHours.sundayHours;

  const workedDays =
    Object.values(dayHours).filter(
      (hours) => hours > 0,
    ).length;

  const averageDailyHours =
    workedDays > 0
      ? weeklyHours / workedDays
      : 0;

  return {
    weeklyHours,
    workedDays,
    averageDailyHours,
    ...dayHours,
  };
}

function createFullTimePatternFromWeeklyHours(
  weeklyHours: number,
) {
  const dailyHours =
    weeklyHours > 0
      ? weeklyHours / 5
      : 7;

  const halfDay =
    dailyHours / 2;

  return {
    monday: {
      morningHours: String(halfDay),
      afternoonHours: String(halfDay),
    },
    tuesday: {
      morningHours: String(halfDay),
      afternoonHours: String(halfDay),
    },
    wednesday: {
      morningHours: String(halfDay),
      afternoonHours: String(halfDay),
    },
    thursday: {
      morningHours: String(halfDay),
      afternoonHours: String(halfDay),
    },
    friday: {
      morningHours: String(halfDay),
      afternoonHours: String(halfDay),
    },
    saturday: {
      morningHours: "0",
      afternoonHours: "0",
    },
    sunday: {
      morningHours: "0",
      afternoonHours: "0",
    },
  };
}

export default function HrWeeklyWorkPatternFields({
  value,
  workingTimeType,
  referenceLabel,
  referenceWeeklyHours,
  onChange,
}: HrWeeklyWorkPatternFieldsProps) {
  const summary =
    calculateWeeklyWorkPatternSummary(
      value,
    );

  const referenceHours =
    referenceWeeklyHours &&
    referenceWeeklyHours > 0
      ? referenceWeeklyHours
      : 35;

  const activityRate =
    referenceHours > 0
      ? Math.round(
          (summary.weeklyHours /
            referenceHours) *
            100,
        )
      : 0;

  function emitChange(
    nextValue: WeeklyWorkPatternValue,
  ) {
    onChange(
      nextValue,
      calculateWeeklyWorkPatternSummary(
        nextValue,
      ),
    );
  }

  function handleDayChange(
    dayKey: WorkDayKey,
    field:
      | "morningHours"
      | "afternoonHours",
    fieldValue: string,
  ) {
    const nextValue: WeeklyWorkPatternValue =
      {
        days: {
          ...value.days,

          [dayKey]: {
            ...value.days[dayKey],
            [field]: fieldValue,
          },
        },
      };

    emitChange(nextValue);
  }

  function resetToReference() {
    const nextValue = {
      days:
        workingTimeType ===
        "part_time"
          ? clonePattern(
              emptyPattern,
            )
          : createFullTimePatternFromWeeklyHours(
              referenceHours,
            ),
    };

    emitChange(nextValue);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white px-5 py-4 dark:border-slate-800 dark:from-slate-900/70 dark:via-slate-950 dark:to-slate-950">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
            <CalendarDays
              className="h-4 w-4"
              strokeWidth={1.9}
            />
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950 dark:text-white">
              Semaine de travail
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Renseigne les heures réellement travaillées par jour. Cette base alimente les coûts, les absences et la capacité.
            </p>

            <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              Référence :{" "}
              {referenceLabel ??
                "rythme non renseigné"}{" "}
              · {formatHours(
                referenceHours,
              )} h / semaine
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetToReference}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <article className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              Type
            </p>

            <p className="mt-2 text-lg font-black text-indigo-700 dark:text-indigo-300">
              {workingTimeType ===
              "part_time"
                ? "Temps partiel"
                : workingTimeType ===
                    "annual_days"
                  ? "Forfait jours"
                  : workingTimeType ===
                      "custom"
                    ? "Personnalisé"
                    : "Temps plein"}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Heures hebdo
            </p>

            <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">
              {formatHours(
                summary.weeklyHours,
              )}{" "}
              h
            </p>
          </article>

          <article className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-900/50 dark:bg-cyan-950/20">
            <p className="text-[10px] font-black uppercase tracking-wide text-cyan-600 dark:text-cyan-300">
              Jours travaillés
            </p>

            <p className="mt-2 text-lg font-black text-cyan-700 dark:text-cyan-300">
              {summary.workedDays}
            </p>
          </article>

          <article className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">
              Taux indicatif
            </p>

            <p className="mt-2 text-lg font-black text-violet-700 dark:text-violet-300">
              {activityRate} %
            </p>
          </article>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50/80 dark:bg-slate-900/70">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Jour
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Matin
                </th>

                <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Après-midi
                </th>

                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayDefinitions.map(
                (day) => {
                  const pattern =
                    value.days[day.key];

                  const morningHours =
                    parseHours(
                      pattern.morningHours,
                    );

                  const afternoonHours =
                    parseHours(
                      pattern.afternoonHours,
                    );

                  const totalHours =
                    morningHours +
                    afternoonHours;

                  return (
                    <tr
                      key={day.key}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {day.label}
                        </p>

                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          {totalHours > 0
                            ? "Travaillé"
                            : "Non travaillé"}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={
                            pattern.morningHours
                          }
                          onChange={(event) =>
                            handleDayChange(
                              day.key,
                              "morningHours",
                              event.target.value,
                            )
                          }
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-right text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={
                            pattern.afternoonHours
                          }
                          onChange={(event) =>
                            handleDayChange(
                              day.key,
                              "afternoonHours",
                              event.target.value,
                            )
                          }
                          className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-right text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-600 dark:focus:ring-indigo-950"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p
                          className={`text-sm font-black ${
                            totalHours > 0
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-slate-400"
                          }`}
                        >
                          {formatHours(
                            totalHours,
                          )}{" "}
                          h
                        </p>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>

        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />

            <div>
              <p className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                Utilisation opérationnelle
              </p>

              <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                Cette grille définit la disponibilité réelle de la ressource. Elle sera utilisée pour les absences, la capacité, le staffing, les charges projet et les contrôles RH.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}