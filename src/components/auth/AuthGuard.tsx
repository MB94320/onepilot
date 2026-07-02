// src/components/auth/AuthGuard.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !pathname.includes("/login")) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoadingAuth, pathname, router]);

  // Si on est en train de charger l'auth, on affiche un écran d'attente neutre
  if (isLoadingAuth) return <div className="p-8">Authentification en cours...</div>;

  // Si on n'est pas connecté et qu'on n'est pas sur le login, on ne rend rien
  if (!isAuthenticated && !pathname.includes("/login")) return null;

  return <>{children}</>;
}