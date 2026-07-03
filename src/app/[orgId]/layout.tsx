"use client";

import { useState } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(true);

  function toggleSidebar() {
    setSidebarOpen(
      (currentValue) =>
        !currentValue,
    );
  }

  return (
    <AuthGuard>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            toggleSidebar={
              toggleSidebar
            }
          />

          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-4 sm:p-5 lg:p-6 dark:bg-[#090d16]">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}