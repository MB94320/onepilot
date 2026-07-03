"use client";

import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  navigationSections,
  superAdminNavigation,
  type NavigationChapter,
} from "@/config/navigation";
import {
  getStoredLanguage,
  getTranslations,
  LANGUAGE_CHANGE_EVENT,
  type LanguageCode,
} from "@/config/translations";
import { useAuth } from "@/lib/AuthContext";

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
};

type OpenSections = Record<
  string,
  boolean
>;

type CurrentUserLike = {
  email?: string | null;
  role?: string | null;

  app_metadata?: {
    role?: string | null;
    is_super_admin?: boolean;
  };

  user_metadata?: {
    role?: string | null;
    is_super_admin?: boolean;
  };
};

const PLATFORM_OWNER_EMAILS = [
  "mohamed.benchekor@gmail.com",
];

function normalizeRole(
  role: unknown,
) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function isSuperAdminRole(
  role: unknown,
) {
  return [
    "super_admin",
    "superadmin",
    "platform_admin",
    "platform_owner",
    "owner_platform",
  ].includes(normalizeRole(role));
}

function canAccessPlatformAdministration(
  user: CurrentUserLike | null,
) {
  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    return true;
  }

  if (!user) {
    return false;
  }

  const normalizedEmail =
    user.email
      ?.trim()
      .toLowerCase();

  if (
    normalizedEmail &&
    PLATFORM_OWNER_EMAILS.includes(
      normalizedEmail,
    )
  ) {
    return true;
  }

  if (
    user.app_metadata
      ?.is_super_admin === true ||
    user.user_metadata
      ?.is_super_admin === true
  ) {
    return true;
  }

  return [
    user.role,
    user.app_metadata?.role,
    user.user_metadata?.role,
  ].some(isSuperAdminRole);
}

function resolveOrgId(
  value: unknown,
) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    Array.isArray(value) &&
    typeof value[0] === "string"
  ) {
    return value[0].trim();
  }

  return "";
}

function isChapterActive(
  pathname: string,
  fullHref: string,
  chapter: NavigationChapter,
) {
  if (chapter.exact) {
    return pathname === fullHref;
  }

  return (
    pathname === fullHref ||
    pathname.startsWith(
      `${fullHref}/`,
    )
  );
}

export default function Sidebar({
  isOpen,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const auth = useAuth();

  const user =
    (auth?.user ??
      null) as CurrentUserLike | null;

  const orgId = resolveOrgId(
    params?.orgId,
  );

  const [
    language,
    setLanguage,
  ] = useState<LanguageCode>("FR");

  const [search, setSearch] =
    useState("");

  const [
    openSections,
    setOpenSections,
  ] = useState<OpenSections>({
    pilotage: true,
    commerce: true,
    projects: true,
    hr: true,
    quality: false,
    finance: false,
    workspace: false,
  });

  useEffect(() => {
    setLanguage(
      getStoredLanguage(),
    );

    function handleLanguageChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<LanguageCode>;

      setLanguage(
        customEvent.detail ||
          getStoredLanguage(),
      );
    }

    window.addEventListener(
      LANGUAGE_CHANGE_EVENT,
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        LANGUAGE_CHANGE_EVENT,
        handleLanguageChange,
      );
    };
  }, []);

  const t =
    getTranslations(language);

  function getHref(path: string) {
    if (!orgId) {
      return "#";
    }

    return `/${encodeURIComponent(
      orgId,
    )}${path}`;
  }

  function getSectionLabel(
    sectionId: string,
    fallback: string,
  ) {
    return (
      t.sections[sectionId] ||
      fallback
    );
  }

  function getChapterLabel(
    chapterId: string,
    fallback: string,
  ) {
    return (
      t.chapters[chapterId] ||
      fallback
    );
  }

  const filteredSections =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return navigationSections;
      }

      return navigationSections
        .map((section) => {
          const translatedSection =
            getSectionLabel(
              section.id,
              section.label,
            );

          const sectionMatches =
            translatedSection
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const chapters =
            section.chapters.filter(
              (chapter) => {
                const translatedChapter =
                  getChapterLabel(
                    chapter.id,
                    chapter.label,
                  );

                const searchableText = [
                  translatedChapter,
                  chapter.label,
                  ...(chapter.keywords ??
                    []),
                ]
                  .join(" ")
                  .toLowerCase();

                return (
                  sectionMatches ||
                  searchableText.includes(
                    normalizedSearch,
                  )
                );
              },
            );

          return {
            ...section,
            chapters,
          };
        })
        .filter(
          (section) =>
            section.chapters.length >
            0,
        );
    }, [
      search,
      language,
    ]);

  useEffect(() => {
    if (!orgId) {
      return;
    }

    const activeSection =
      navigationSections.find(
        (section) =>
          section.chapters.some(
            (chapter) => {
              const href = `/${encodeURIComponent(
                orgId,
              )}${chapter.href}`;

              return isChapterActive(
                pathname,
                href,
                chapter,
              );
            },
          ),
      );

    if (activeSection) {
      setOpenSections(
        (currentSections) => ({
          ...currentSections,
          [activeSection.id]: true,
        }),
      );
    }
  }, [pathname, orgId]);

  function toggleSection(
    sectionId: string,
  ) {
    if (!isOpen) {
      onToggle();
      return;
    }

    setOpenSections(
      (currentSections) => ({
        ...currentSections,
        [sectionId]:
          !currentSections[
            sectionId
          ],
      }),
    );
  }

  const canSeeAdministration =
    canAccessPlatformAdministration(
      user,
    );

  const adminHref = getHref(
    superAdminNavigation.href,
  );

  const adminActive =
    orgId.length > 0 &&
    (pathname === adminHref ||
      pathname.startsWith(
        `${adminHref}/`,
      ));

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 lg:flex dark:border-slate-800 dark:bg-slate-950 ${
        isOpen
          ? "w-[284px]"
          : "w-[76px]"
      }`}
    >
      <div
        className={`flex h-[72px] shrink-0 items-center border-b border-slate-200 dark:border-slate-800 ${
          isOpen
            ? "justify-between px-4"
            : "justify-center px-2"
        }`}
      >
        <Link
          href={getHref(
            "/dashboard",
          )}
          onClick={(event) => {
            if (!orgId) {
              event.preventDefault();
            }
          }}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-violet-950/30">
            <img
              src="/logo.png"
              alt="OnePilot"
              className="h-7 w-7 object-contain"
            />
          </div>

          {isOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-[0.12em] text-slate-950 dark:text-white">
                ONEPILOT
              </p>

              <p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Unified lifecycle engine
              </p>
            </div>
          )}
        </Link>

        {isOpen && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              t.sidebar.collapse
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen ? (
        <div className="shrink-0 px-3 pb-2 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder={
                t.sidebar
                  .searchPlaceholder
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-800 dark:focus:bg-slate-950"
            />
          </div>

          {!orgId && (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="text-[10px] font-semibold leading-4 text-amber-800 dark:text-amber-300">
                {
                  t.sidebar
                    .organizationMissing
                }
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 justify-center py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={
              t.sidebar.expand
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-5">
        <div className="space-y-2">
          {filteredSections.map(
            (section) => {
              const SectionIcon =
                section.icon;

              const sectionLabel =
                getSectionLabel(
                  section.id,
                  section.label,
                );

              const isSectionOpen =
                Boolean(
                  openSections[
                    section.id
                  ],
                ) ||
                Boolean(search);

              const activeChapter =
                orgId
                  ? section.chapters.find(
                      (chapter) =>
                        isChapterActive(
                          pathname,
                          getHref(
                            chapter.href,
                          ),
                          chapter,
                        ),
                    )
                  : undefined;

              const accentClasses = {
                indigo:
                  "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300",
                violet:
                  "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300",
                emerald:
                  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
                amber:
                  "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300",
                rose:
                  "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300",
                cyan:
                  "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-300",
                slate:
                  "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              };

              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSection(
                        section.id,
                      )
                    }
                    title={
                      !isOpen
                        ? sectionLabel
                        : undefined
                    }
                    className={`flex w-full items-center rounded-xl transition ${
                      isOpen
                        ? "h-11 justify-between px-2.5"
                        : "h-11 justify-center"
                    } ${
                      activeChapter
                        ? "bg-slate-50 dark:bg-slate-900/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          accentClasses[
                            section.accent
                          ]
                        }`}
                      >
                        <SectionIcon className="h-4 w-4" />
                      </div>

                      {isOpen && (
                        <span className="truncate text-xs font-black text-slate-600 dark:text-slate-300">
                          {sectionLabel}
                        </span>
                      )}
                    </div>

                    {isOpen &&
                      (isSectionOpen ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      ))}
                  </button>

                  {isOpen &&
                    isSectionOpen && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-4 dark:border-slate-800">
                        {section.chapters.map(
                          (chapter) => {
                            const href =
                              getHref(
                                chapter.href,
                              );

                            const active =
                              orgId.length >
                                0 &&
                              isChapterActive(
                                pathname,
                                href,
                                chapter,
                              );

                            const ChapterIcon =
                              chapter.icon;

                            return (
                              <Link
                                key={
                                  chapter.id
                                }
                                href={href}
                                onClick={(
                                  event,
                                ) => {
                                  if (
                                    !orgId
                                  ) {
                                    event.preventDefault();
                                  }
                                }}
                                className={`flex min-h-9 items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] transition ${
                                  active
                                    ? "bg-gradient-to-r from-indigo-50 to-violet-50 font-black text-indigo-700 dark:from-indigo-950/40 dark:to-violet-950/30 dark:text-indigo-300"
                                    : "font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                                }`}
                              >
                                {ChapterIcon && (
                                  <ChapterIcon className="h-3.5 w-3.5 shrink-0" />
                                )}

                                <span className="truncate">
                                  {getChapterLabel(
                                    chapter.id,
                                    chapter.label,
                                  )}
                                </span>
                              </Link>
                            );
                          },
                        )}
                      </div>
                    )}
                </div>
              );
            },
          )}
        </div>

        {isOpen &&
          filteredSections.length ===
            0 && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t.sidebar.noModule}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="mt-2 text-[11px] font-bold text-indigo-600"
              >
                {
                  t.sidebar
                    .clearSearch
                }
              </button>
            </div>
          )}
      </nav>

      {canSeeAdministration && (
        <div className="shrink-0 border-t border-slate-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-3 dark:border-slate-800 dark:from-amber-950/20 dark:via-slate-950 dark:to-orange-950/20">
          <Link
            href={adminHref}
            className={`flex min-h-12 items-center rounded-xl border ${
              isOpen
                ? "justify-between px-3 py-2"
                : "justify-center"
            } ${
              adminActive
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-amber-200 bg-white/80 text-amber-800"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Shield className="h-4 w-4 shrink-0" />

              {isOpen && (
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-wide">
                    {
                      t.sidebar
                        .administration
                    }
                  </p>

                  <p className="truncate text-[9px] font-semibold opacity-70">
                    {
                      t.sidebar
                        .superAdminAccess
                    }
                  </p>
                </div>
              )}
            </div>

            {isOpen && (
              <SlidersHorizontal className="h-4 w-4 opacity-60" />
            )}
          </Link>
        </div>
      )}
    </aside>
  );
}