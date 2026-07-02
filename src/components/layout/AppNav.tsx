"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/tasks", label: "Tasks" },
  { href: "/debug/auth", label: "Debug Auth" },
  { href: "/access-denied", label: "Access Denied" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, loginAsDemo } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/access-denied");
  };

  const handleLogin = async () => {
    const result = await loginAsDemo();

    if (!result.error) {
      router.replace("/dashboard");
    }
  };

  return (
    <nav className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          {links.map((link) => {
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-600">
            {isAuthenticated ? `Connecté : ${user?.full_name}` : "Non connecté"}
          </span>

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Login demo
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}