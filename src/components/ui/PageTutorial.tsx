"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Target,
  X,
} from "lucide-react";

export type TutorialStep = {
  title: string;
  description: string;
};

export type TutorialInsight = {
  title: string;
  description: string;
};

type PageTutorialProps = {
  title: string;
  description: string;

  objectives?: string[];
  steps?: TutorialStep[];
  analyses?: TutorialInsight[];
  recommendations?: string[];

  defaultOpen?: boolean;
};

type Accent =
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "sky";

function InformationBlock({
  title,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
  children: React.ReactNode;
  accent: Accent;
}) {
  const classes: Record<
    Accent,
    {
      container: string;
      icon: string;
      title: string;
    }
  > = {
    indigo: {
      container:
        "border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white dark:border-indigo-900/50 dark:from-indigo-800/25 dark:to-slate-700/85",
      icon:
        "bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50 dark:bg-indigo-900/45 dark:text-indigo-300 dark:ring-indigo-950/40",
      title:
        "text-indigo-900 dark:text-indigo-200",
    },

    emerald: {
      container:
        "border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white dark:border-emerald-900/50 dark:from-emerald-800/25 dark:to-slate-700/85",
      icon:
        "bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-950/40",
      title:
        "text-emerald-900 dark:text-emerald-200",
    },

    amber: {
      container:
        "border-amber-100 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/50 dark:from-amber-800/25 dark:to-slate-700/85",
      icon:
        "bg-amber-100 text-amber-700 ring-4 ring-amber-50 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-950/40",
      title:
        "text-amber-900 dark:text-amber-200",
    },

    rose: {
      container:
        "border-rose-100 bg-gradient-to-br from-rose-50/80 to-white dark:border-rose-900/50 dark:from-rose-800/25 dark:to-slate-700/85",
      icon:
        "bg-rose-100 text-rose-700 ring-4 ring-rose-50 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-950/40",
      title:
        "text-rose-900 dark:text-rose-200",
    },

    sky: {
      container:
        "border-sky-100 bg-gradient-to-br from-sky-50/80 to-white dark:border-sky-900/50 dark:from-sky-800/25 dark:to-slate-700/85",
      icon:
        "bg-sky-100 text-sky-700 ring-4 ring-sky-50 dark:bg-sky-900/40 dark:text-sky-300 dark:ring-sky-950/40",
      title:
        "text-sky-900 dark:text-sky-200",
    },
  };

  const selectedClasses = classes[accent];

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${selectedClasses.container}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`rounded-xl p-2.5 ${selectedClasses.icon}`}
        >
          <Icon
            className="h-4 w-4"
            strokeWidth={1.9}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-bold ${selectedClasses.title}`}
          >
            {title}
          </h3>

          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function PageTutorial({
  title,
  description,
  objectives = [],
  steps = [],
  analyses = [],
  recommendations = [],
  defaultOpen = false,
}: PageTutorialProps) {
  const [isOpen, setIsOpen] =
    useState(defaultOpen);

  const [isDismissed, setIsDismissed] =
    useState(false);

  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => setIsDismissed(false)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-700/70 dark:text-indigo-300 dark:hover:bg-indigo-700/35"
      >
        <HelpCircle className="h-4 w-4" />
        Afficher le tutoriel
      </button>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600/70 dark:bg-slate-600/65">
      <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-indigo-50/60 px-5 py-4 dark:border-slate-600/55 dark:from-sky-900/20 dark:via-slate-700/85 dark:to-indigo-900/20">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/10" />

        <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-700/10" />

        <div className="relative flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              setIsOpen((currentValue) => !currentValue)
            }
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-2.5 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <BookOpen
                className="h-5 w-5"
                strokeWidth={1.9}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-300">
                Guide de la page
              </p>

              <h2 className="mt-1 text-base font-bold text-slate-950 dark:text-slate-100">
                {title}
              </h2>

              <p className="mt-1 max-w-4xl whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            </div>

            <div className="ml-auto mt-1 shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm dark:border-slate-600/60 dark:bg-slate-700/70 dark:text-slate-300">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Masquer le tutoriel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-4 bg-sky-50/35 p-5 dark:bg-slate-600/65 xl:grid-cols-2">
          {objectives.length > 0 && (
            <InformationBlock
              title="Objectifs de la page"
              icon={Target}
              accent="indigo"
            >
              <ul className="space-y-2.5">
                {objectives.map((objective) => (
                  <li
                    key={objective}
                    className="flex items-start gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </InformationBlock>
          )}

          {steps.length > 0 && (
            <InformationBlock
              title="Comment utiliser la page"
              icon={ListChecks}
              accent="emerald"
            >
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={`${step.title}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[11px] font-bold text-white shadow-sm">
                      {index + 1}
                    </span>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {step.title}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </InformationBlock>
          )}

          {analyses.length > 0 && (
            <InformationBlock
              title="Analyses possibles"
              icon={BarChart3}
              accent="amber"
            >
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div
                    key={analysis.title}
                    className="rounded-xl border border-sky-100 bg-white p-3 shadow-sm dark:border-sky-800/40 dark:bg-slate-700/70"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {analysis.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {analysis.description}
                    </p>
                  </div>
                ))}
              </div>
            </InformationBlock>
          )}

          {recommendations.length > 0 && (
            <InformationBlock
              title="Bonnes pratiques"
              icon={Lightbulb}
              accent="rose"
            >
              <ul className="space-y-2.5">
                {recommendations.map(
                  (recommendation) => (
                    <li
                      key={recommendation}
                      className="flex items-start gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300"
                    >
                      <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
                      <span>{recommendation}</span>
                    </li>
                  ),
                )}
              </ul>
            </InformationBlock>
          )}
        </div>
      )}
    </section>
  );
}