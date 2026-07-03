"use client";

import { useEffect, useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const SIDEBAR_STORAGE_KEY =
  "onepilot.sidebar.expanded";

export default function AppShell({
  title: _title,
  subtitle: _subtitle,
  children,
}: AppShellProps) {
  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] = useState(true);

  const [isMounted, setIsMounted] =
    useState(false);

  useEffect(() => {
    const storedValue =
      window.localStorage.getItem(
        SIDEBAR_STORAGE_KEY,
      );

    if (storedValue === "false") {
      setIsSidebarOpen(false);
    }

    if (storedValue === "true") {
      setIsSidebarOpen(true);
    }

    setIsMounted(true);
  }, []);

  function toggleSidebar() {
    setIsSidebarOpen(
      (currentValue) => {
        const nextValue =
          !currentValue;

        window.localStorage.setItem(
          SIDEBAR_STORAGE_KEY,
          String(nextValue),
        );

        return nextValue;
      },
    );
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1020] dark:text-slate-100">
        <div className="flex min-h-screen">
          <div className="hidden w-[284px] shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950" />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="h-[64px] shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />

            <main className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1020] dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            toggleSidebar={
              toggleSidebar
            }
          />

          <main className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}