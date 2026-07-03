"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Command,
  CreditCard,
  Globe2,
  LogOut,
  Moon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useParams,
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  navigationSections,
  type NavigationChapter,
} from "@/config/navigation";
import {
  getTranslations,
  LANGUAGE_CHANGE_EVENT,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
} from "@/config/translations";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type TopbarProps = {
  toggleSidebar: () => void;
};

type ThemeMode =
  | "light"
  | "dark";

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type AuditNotification = {
  id: string;

  entity_type:
    | "employee"
    | "contract";

  action:
    | "created"
    | "updated"
    | "archived"
    | "reactivated"
    | "deleted";

  performed_at: string;
  performed_by_name: string | null;
};

type CurrentUserLike = {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;

  app_metadata?: {
    role?: string | null;
    subscription_plan?: string | null;
    plan?: string | null;
  };

  user_metadata?: {
    full_name?: string | null;
    role?: string | null;
    subscription_plan?: string | null;
    plan?: string | null;
  };
};

type SearchResult = {
  id: string;
  label: string;
  sectionLabel: string;
  href: string;

  icon?: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
};

const THEME_STORAGE_KEY =
  "onepilot.theme";

const supportedLanguages: {
  code: LanguageCode;
  label: string;
  locale: string;
}[] = [
  {
    code: "FR",
    label: "Français",
    locale: "fr-FR",
  },
  {
    code: "EN",
    label: "English",
    locale: "en-GB",
  },
  {
    code: "ES",
    label: "Español",
    locale: "es-ES",
  },
];

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getInitials(
  fullName: string,
) {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "OP";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
}

function normalizeRole(
  role: unknown,
) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function getRoleLabel(
  role: unknown,
  language: LanguageCode,
) {
  const normalizedRole =
    normalizeRole(role);

  const labels = {
    FR: {
      super_admin:
        "Super administrateur",
      superadmin:
        "Super administrateur",
      platform_admin:
        "Administrateur plateforme",
      owner: "Propriétaire",
      admin: "Administrateur",
      direction: "Direction",
      rh: "Ressources humaines",
      hr: "Ressources humaines",
      manager: "Manager",
      member: "Collaborateur",
    },

    EN: {
      super_admin:
        "Super administrator",
      superadmin:
        "Super administrator",
      platform_admin:
        "Platform administrator",
      owner: "Owner",
      admin: "Administrator",
      direction: "Executive",
      rh: "Human resources",
      hr: "Human resources",
      manager: "Manager",
      member: "Employee",
    },

    ES: {
      super_admin:
        "Superadministrador",
      superadmin:
        "Superadministrador",
      platform_admin:
        "Administrador de plataforma",
      owner: "Propietario",
      admin: "Administrador",
      direction: "Dirección",
      rh: "Recursos humanos",
      hr: "Recursos humanos",
      manager: "Responsable",
      member: "Colaborador",
    },
  };

  return (
    labels[language][
      normalizedRole as keyof typeof labels.FR
    ] ||
    String(role || "Utilisateur")
  );
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

function formatDate(
  language: LanguageCode,
) {
  const locale =
    supportedLanguages.find(
      (item) =>
        item.code === language,
    )?.locale ?? "fr-FR";

  return new Intl.DateTimeFormat(
    locale,
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(new Date());
}

function formatNotificationDate(
  value: string,
  language: LanguageCode,
) {
  const locale =
    supportedLanguages.find(
      (item) =>
        item.code === language,
    )?.locale ?? "fr-FR";

  return new Intl.DateTimeFormat(
    locale,
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

function FlagFR() {
  return (
    <svg
      className="h-3 w-[18px] shrink-0 rounded-sm shadow-sm"
      viewBox="0 0 3 2"
      aria-hidden="true"
    >
      <path
        fill="#EC1B24"
        d="M0 0h3v2H0z"
      />

      <path
        fill="#fff"
        d="M0 0h2v2H0z"
      />

      <path
        fill="#00266F"
        d="M0 0h1v2H0z"
      />
    </svg>
  );
}

function FlagEN() {
  return (
    <svg
      className="h-3 w-[18px] shrink-0 rounded-sm shadow-sm"
      viewBox="0 0 50 30"
      aria-hidden="true"
    >
      <clipPath id="onepilot-flag-en">
        <path d="M0 0v30h50V0z" />
      </clipPath>

      <g clipPath="url(#onepilot-flag-en)">
        <path
          d="M0 0v30h50V0z"
          fill="#012169"
        />

        <path
          d="M0 0l50 30M50 0L0 30"
          stroke="#fff"
          strokeWidth="6"
        />

        <path
          d="M0 0l50 30M50 0L0 30"
          stroke="#C8102E"
          strokeWidth="4"
        />

        <path
          d="M25 0v30M0 15h50"
          stroke="#fff"
          strokeWidth="10"
        />

        <path
          d="M25 0v30M0 15h50"
          stroke="#C8102E"
          strokeWidth="6"
        />
      </g>
    </svg>
  );
}

function FlagES() {
  return (
    <svg
      className="h-3 w-[18px] shrink-0 rounded-sm shadow-sm"
      viewBox="0 0 3 2"
      aria-hidden="true"
    >
      <path
        fill="#C8102E"
        d="M0 0h3v2H0z"
      />

      <path
        fill="#FFD100"
        d="M0 .5h3v1H0z"
      />
    </svg>
  );
}

function LanguageFlag({
  language,
}: {
  language: LanguageCode;
}) {
  if (language === "EN") {
    return <FlagEN />;
  }

  if (language === "ES") {
    return <FlagES />;
  }

  return <FlagFR />;
}

export default function Topbar({
  toggleSidebar: _toggleSidebar,
}: TopbarProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();

  const currentUser =
    (auth?.user ??
      null) as CurrentUserLike | null;

  const orgId = resolveOrgId(
    params?.orgId,
  );

  const [
    organization,
    setOrganization,
  ] = useState<Organization | null>(
    null,
  );

  const [
    language,
    setLanguage,
  ] = useState<LanguageCode>("FR");

  const [theme, setTheme] =
    useState<ThemeMode>("light");

  const [
    isMounted,
    setIsMounted,
  ] = useState(false);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    languageOpen,
    setLanguageOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [
    notifications,
    setNotifications,
  ] = useState<
    AuditNotification[]
  >([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  const searchRef =
    useRef<HTMLDivElement>(null);

  const languageRef =
    useRef<HTMLDivElement>(null);

  const profileRef =
    useRef<HTMLDivElement>(null);

  const notificationRef =
    useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const storedLanguage =
      window.localStorage.getItem(
        LANGUAGE_STORAGE_KEY,
      ) as LanguageCode | null;

    if (
      storedLanguage === "FR" ||
      storedLanguage === "EN" ||
      storedLanguage === "ES"
    ) {
      setLanguage(storedLanguage);

      document.documentElement.lang =
        storedLanguage.toLowerCase();
    }

    const storedTheme =
      window.localStorage.getItem(
        THEME_STORAGE_KEY,
      ) as ThemeMode | null;

    const systemPrefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

    const initialTheme =
      storedTheme === "dark" ||
      (!storedTheme &&
        systemPrefersDark)
        ? "dark"
        : "light";

    setTheme(initialTheme);

    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark",
    );

    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        searchRef.current &&
        !searchRef.current.contains(
          target,
        )
      ) {
        setSearchOpen(false);
      }

      if (
        languageRef.current &&
        !languageRef.current.contains(
          target,
        )
      ) {
        setLanguageOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          target,
        )
      ) {
        setProfileOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target,
        )
      ) {
        setNotificationsOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadOrganization() {
      if (!orgId) {
        setOrganization(null);
        return;
      }

      try {
        const query = (
          supabase.from(
            "organizations" as never,
          ) as any
        ).select("id, name, slug");

        const response = isUuid(orgId)
          ? await query
              .eq("id", orgId)
              .limit(1)
              .maybeSingle()
          : await query
              .eq("slug", orgId)
              .limit(1)
              .maybeSingle();

        if (!isActive) {
          return;
        }

        if (response.error) {
          console.error(
            "Impossible de charger l’organisation :",
            response.error,
          );

          setOrganization(null);
          return;
        }

        setOrganization(
          response.data as Organization | null,
        );
      } catch (error) {
        console.error(
          "Erreur de chargement de l’organisation :",
          error,
        );

        if (isActive) {
          setOrganization(null);
        }
      }
    }

    void loadOrganization();

    return () => {
      isActive = false;
    };
  }, [orgId]);

  useEffect(() => {
    let isActive = true;

    async function loadNotifications() {
      if (!organization?.id) {
        setNotifications([]);
        setUnreadNotificationCount(
          0,
        );

        return;
      }

      try {
        setNotificationsLoading(true);

        const { data, error } = await (
          supabase.from(
            "hr_employee_audit_history" as never,
          ) as any
        )
          .select(
            "id, entity_type, action, performed_at, performed_by_name",
          )
          .eq(
            "organization_id",
            organization.id,
          )
          .order("performed_at", {
            ascending: false,
          })
          .limit(8);

        if (!isActive) {
          return;
        }

        if (error) {
          console.error(
            "Impossible de charger les notifications :",
            error,
          );

          setNotifications([]);
          setUnreadNotificationCount(
            0,
          );

          return;
        }

        const loadedNotifications =
          (data ??
            []) as AuditNotification[];

        setNotifications(
          loadedNotifications,
        );

        const readStorageKey =
          `onepilot.notifications.readAt.${organization.id}`;

        const lastReadAt =
          window.localStorage.getItem(
            readStorageKey,
          );

        const unreadCount =
          loadedNotifications.filter(
            (notification) => {
              if (!lastReadAt) {
                return true;
              }

              return (
                new Date(
                  notification.performed_at,
                ).getTime() >
                new Date(
                  lastReadAt,
                ).getTime()
              );
            },
          ).length;

        setUnreadNotificationCount(
          unreadCount,
        );
      } catch (error) {
        console.error(
          "Erreur de chargement des notifications :",
          error,
        );

        if (isActive) {
          setNotifications([]);
          setUnreadNotificationCount(
            0,
          );
        }
      } finally {
        if (isActive) {
          setNotificationsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      isActive = false;
    };
  }, [organization?.id]);

  const activeNavigation =
    useMemo(() => {
      if (!orgId) {
        return null;
      }

      for (const section of navigationSections) {
        for (const chapter of section.chapters) {
          const href = getHref(
            chapter.href,
          );

          if (
            isChapterActive(
              pathname,
              href,
              chapter,
            )
          ) {
            return {
              sectionLabel:
                getSectionLabel(
                  section.id,
                  section.label,
                ),

              chapterLabel:
                getChapterLabel(
                  chapter.id,
                  chapter.label,
                ),
            };
          }
        }
      }

      if (
        pathname === getHref("/admin") ||
        pathname.startsWith(
          `${getHref("/admin")}/`,
        )
      ) {
        return {
          sectionLabel:
            t.topbar
              .platformAdministration,

          chapterLabel:
            t.topbar.workspace,
        };
      }

      return null;
    }, [
      pathname,
      orgId,
      language,
    ]);

  const searchResults =
    useMemo(() => {
      const normalizedSearch =
        searchValue
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return [];
      }

      const results: SearchResult[] =
        [];

      navigationSections.forEach(
        (section) => {
          const translatedSection =
            getSectionLabel(
              section.id,
              section.label,
            );

          section.chapters.forEach(
            (chapter) => {
              const translatedChapter =
                getChapterLabel(
                  chapter.id,
                  chapter.label,
                );

              const searchableText = [
                translatedSection,
                translatedChapter,
                section.label,
                chapter.label,
                ...(chapter.keywords ??
                  []),
              ]
                .join(" ")
                .toLowerCase();

              if (
                searchableText.includes(
                  normalizedSearch,
                )
              ) {
                results.push({
                  id: chapter.id,

                  label:
                    translatedChapter,

                  sectionLabel:
                    translatedSection,

                  href: getHref(
                    chapter.href,
                  ),

                  icon:
                    chapter.icon,
                });
              }
            },
          );
        },
      );

      return results.slice(0, 10);
    }, [
      searchValue,
      orgId,
      language,
    ]);

  const userFullName =
    currentUser?.full_name ||
    currentUser?.user_metadata
      ?.full_name ||
    currentUser?.email ||
    "Utilisateur OnePilot";

  const userEmail =
    currentUser?.email ||
    "Adresse non renseignée";

  const userRole =
    currentUser?.role ||
    currentUser?.app_metadata?.role ||
    currentUser?.user_metadata?.role ||
    t.topbar.user;

  const subscriptionPlan =
    currentUser?.app_metadata
      ?.subscription_plan ||
    currentUser?.app_metadata?.plan ||
    currentUser?.user_metadata
      ?.subscription_plan ||
    currentUser?.user_metadata?.plan ||
    t.topbar.configureSubscription;

  function handleThemeChange() {
    const nextTheme =
      theme === "light"
        ? "dark"
        : "light";

    setTheme(nextTheme);

    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark",
    );

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      nextTheme,
    );
  }

  function handleLanguageChange(
    nextLanguage: LanguageCode,
  ) {
    setLanguage(nextLanguage);
    setLanguageOpen(false);

    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      nextLanguage,
    );

    document.documentElement.lang =
      nextLanguage.toLowerCase();

    window.dispatchEvent(
      new CustomEvent(
        LANGUAGE_CHANGE_EVENT,
        {
          detail: nextLanguage,
        },
      ),
    );
  }

  function selectSearchResult(
    result: SearchResult,
  ) {
    if (
      !orgId ||
      result.href === "#"
    ) {
      return;
    }

    setSearchValue("");
    setSearchOpen(false);
    router.push(result.href);
  }

  function getNotificationDefinition(
    notification: AuditNotification,
  ) {
    const entityLabel =
      t.entities[
        notification.entity_type
      ];

    return {
      title: `${entityLabel} ${
        t.notificationActions[
          notification.action
        ]
      }`,

      description:
        t.notificationDescriptions[
          notification.action
        ],

      accent:
        notification.action ===
        "created"
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
          : notification.action ===
              "updated"
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            : notification.action ===
                "archived"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : notification.action ===
                  "reactivated"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    };
  }

  async function handleLogout() {
    setProfileOpen(false);

    try {
      await auth?.logout?.();
    } catch (error) {
      console.error(
        "Erreur de déconnexion :",
        error,
      );
    }

    router.replace("/login");
    router.refresh();
  }

  function openNotifications() {
    const nextOpen =
      !notificationsOpen;

    setNotificationsOpen(
      nextOpen,
    );

    setLanguageOpen(false);
    setProfileOpen(false);

    if (
      nextOpen &&
      organization?.id
    ) {
      window.localStorage.setItem(
        `onepilot.notifications.readAt.${organization.id}`,
        new Date().toISOString(),
      );

      setUnreadNotificationCount(
        0,
      );
    }
  }

  if (!isMounted) {
    return (
      <header className="h-[64px] shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
    );
  }

  return (
    <header className="relative z-30 flex h-[64px] shrink-0 items-center border-b border-slate-200 bg-white px-3 shadow-sm sm:px-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>
              {activeNavigation
                ?.sectionLabel ||
                "OnePilot"}
            </span>

            <span>/</span>

            <span className="truncate text-slate-700 dark:text-slate-300">
              {activeNavigation
                ?.chapterLabel ||
                t.topbar.workspace}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />

            <p className="max-w-[220px] truncate text-xs font-black text-slate-900 dark:text-white">
              {organization?.name ||
                orgId ||
                t.topbar.organization}
            </p>
          </div>
        </div>

        <div
          ref={searchRef}
          className="relative ml-0 min-w-0 flex-1 lg:ml-5"
        >
          <div className="relative mx-auto max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(
                  event.target.value,
                );

                setSearchOpen(true);
              }}
              onFocus={() =>
                setSearchOpen(true)
              }
              placeholder={
                t.topbar
                  .globalSearchPlaceholder
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 text-xs font-semibold text-slate-700 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-indigo-800 dark:focus:bg-slate-950 dark:focus:ring-indigo-950/50"
            />

            <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[9px] font-bold text-slate-400 md:flex dark:border-slate-700 dark:bg-slate-950">
              <Command className="h-2.5 w-2.5" />
              K
            </div>
          </div>

          {searchOpen &&
            searchValue.trim() && (
              <div className="absolute left-1/2 top-full mt-2 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-black text-slate-950 dark:text-white">
                      {
                        t.topbar
                          .globalSearch
                      }
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {
                        t.topbar
                          .availableModules
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchValue("");
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {searchResults.length >
                0 ? (
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {searchResults.map(
                      (result) => {
                        const ResultIcon =
                          result.icon ||
                          Search;

                        return (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() =>
                              selectSearchResult(
                                result,
                              )
                            }
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              <ResultIcon
                                className="h-4 w-4"
                                strokeWidth={
                                  1.9
                                }
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                                {result.label}
                              </p>

                              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {
                                  result.sectionLabel
                                }
                              </p>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />

                    <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {
                        t.topbar
                          .noResult
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {
                        t.topbar
                          .noResultDescription
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2 xl:flex dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />

          <span className="max-w-[220px] truncate text-[10px] font-bold capitalize text-slate-500 dark:text-slate-400">
            {formatDate(language)}
          </span>
        </div>

        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            onClick={openNotifications}
            aria-label={
              t.topbar.notifications
            }
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          >
            <Bell className="h-4 w-4" />

            {unreadNotificationCount >
              0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black text-white dark:border-slate-950">
                {Math.min(
                  unreadNotificationCount,
                  9,
                )}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 px-4 py-4 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Bell className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">
                      {
                        t.topbar
                          .notifications
                      }
                    </p>

                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {
                        t.topbar
                          .recentActivity
                      }
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNotificationsOpen(
                      false,
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {notificationsLoading ? (
                <div className="px-5 py-10 text-center">
                  <Sparkles className="mx-auto h-6 w-6 animate-pulse text-indigo-500" />

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {
                      t.topbar
                        .loadingNotifications
                    }
                  </p>
                </div>
              ) : notifications.length >
                0 ? (
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {notifications.map(
                    (notification) => {
                      const definition =
                        getNotificationDefinition(
                          notification,
                        );

                      return (
                        <Link
                          key={
                            notification.id
                          }
                          href={getHref(
                            "/rh/ressources",
                          )}
                          onClick={() =>
                            setNotificationsOpen(
                              false,
                            )
                          }
                          className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${definition.accent}`}
                          >
                            <Bell className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-black text-slate-900 dark:text-white">
                                {
                                  definition.title
                                }
                              </p>

                              <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                                {formatNotificationDate(
                                  notification.performed_at,
                                  language,
                                )}
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                              {
                                definition.description
                              }
                            </p>

                            <p className="mt-1 text-[9px] font-semibold text-slate-400">
                              {
                                t.topbar.user
                              }{" "}
                              :{" "}
                              {notification.performed_by_name ||
                                t.topbar.user}
                            </p>
                          </div>
                        </Link>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Check className="mx-auto h-6 w-6 text-emerald-500" />

                  <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {
                      t.topbar
                        .noNotification
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {
                      t.topbar
                        .noNotificationDescription
                    }
                  </p>
                </div>
              )}

              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                <Link
                  href={getHref(
                    "/automatisations",
                  )}
                  onClick={() =>
                    setNotificationsOpen(
                      false,
                    )
                  }
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-xs font-bold text-white transition hover:shadow-lg"
                >
                  <Sparkles className="h-4 w-4" />

                  {
                    t.topbar
                      .manageAutomations
                  }
                </Link>
              </div>
            </div>
          )}
        </div>

        <div
          ref={languageRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setLanguageOpen(
                (currentValue) =>
                  !currentValue,
              );

              setNotificationsOpen(
                false,
              );

              setProfileOpen(false);
            }}
            aria-label={
              t.topbar.language
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
          >
            <LanguageFlag
              language={language}
            />

            <span className="hidden sm:inline">
              {language}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {languageOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="px-2 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-indigo-500" />

                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    {
                      t.topbar.language
                    }
                  </p>
                </div>
              </div>

              {supportedLanguages.map(
                (item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() =>
                      handleLanguageChange(
                        item.code,
                      )
                    }
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                      language ===
                      item.code
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <LanguageFlag
                        language={
                          item.code
                        }
                      />

                      <div>
                        <p className="text-xs font-bold">
                          {item.label}
                        </p>

                        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-60">
                          {item.code}
                        </p>
                      </div>
                    </div>

                    {language ===
                      item.code && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleThemeChange}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        <div
          ref={profileRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setProfileOpen(
                (currentValue) =>
                  !currentValue,
              );

              setNotificationsOpen(
                false,
              );

              setLanguageOpen(false);
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-1.5 pr-2 transition hover:border-indigo-200 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:hover:border-indigo-900"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-[10px] font-black text-white">
              {getInitials(
                userFullName,
              )}
            </div>

            <div className="hidden max-w-[130px] text-left md:block">
              <p className="truncate text-[10px] font-black text-slate-900 dark:text-white">
                {userFullName}
              </p>

              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400">
                {getRoleLabel(
                  userRole,
                  language,
                )}
              </p>
            </div>

            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 p-4 dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-950 dark:to-violet-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                    {getInitials(
                      userFullName,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                      {userFullName}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900/60 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-indigo-600" />

                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {
                          t.topbar.profile
                        }
                      </p>
                    </div>

                    <p className="mt-1 truncate text-[10px] font-black text-slate-700 dark:text-slate-300">
                      {getRoleLabel(
                        userRole,
                        language,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-white/80 p-3 dark:border-violet-900/60 dark:bg-slate-950/70">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-violet-600" />

                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        {
                          t.topbar
                            .subscription
                        }
                      </p>
                    </div>

                    <p className="mt-1 truncate text-[10px] font-black text-slate-700 dark:text-slate-300">
                      {subscriptionPlan}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <Link
                  href={getHref(
                    "/admin?tab=security",
                  )}
                  onClick={() =>
                    setProfileOpen(false)
                  }
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                >
                  <User className="h-4 w-4" />
                  {t.topbar.myProfile}
                </Link>

                <Link
                  href={getHref(
                    "/admin?tab=billing",
                  )}
                  onClick={() =>
                    setProfileOpen(false)
                  }
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                >
                  <CreditCard className="h-4 w-4" />

                  <span className="flex-1">
                    {
                      t.topbar
                        .manageSubscription
                    }
                  </span>

                  <span className="rounded-full bg-violet-100 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    {t.topbar.edit}
                  </span>
                </Link>

                <Link
                  href={getHref(
                    "/admin",
                  )}
                  onClick={() =>
                    setProfileOpen(false)
                  }
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 transition hover:bg-amber-50 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-amber-950/30 dark:hover:text-amber-300"
                >
                  <Settings className="h-4 w-4" />
                  {
                    t.topbar
                      .platformAdministration
                  }
                </Link>

                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  {t.topbar.logout}
                </button>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <CircleUserRound className="h-3.5 w-3.5 text-slate-400" />

                  <p className="truncate text-[9px] font-semibold text-slate-400">
                    {organization?.name ||
                      t.topbar.organization}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}