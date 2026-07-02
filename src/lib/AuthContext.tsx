"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
};

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  type: string;
  owner_user_id: string | null;
};

type OrganizationMembership = {
  organization_id: string;
  user_id: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  rawUser: User | null;
  organization: Organization | null;
  memberships: OrganizationMembership[];
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string) => Promise<{ error: string | null }>;
  loginAsDemo: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function buildAuthUser(rawUser: User, profile: ProfileRow | null): AuthUser {
  return {
    id: rawUser.id,
    email: profile?.email ?? rawUser.email ?? "",
    full_name:
      profile?.full_name ??
      rawUser.user_metadata?.full_name ??
      rawUser.email?.split("@")[0] ??
      "Utilisateur",
    role: profile?.role ?? "user",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadAuthState = async () => {
    setIsLoadingAuth(true);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setRawUser(null);
      setUser(null);
      setOrganization(null);
      setMemberships([]);
      setIsLoadingAuth(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", currentUser.id)
      .single();

    const { data: membershipRows } = await supabase
      .from("organization_members")
      .select("organization_id, user_id, role")
      .eq("user_id", currentUser.id);

    const safeMemberships = (membershipRows ?? []) as OrganizationMembership[];

    let activeOrganization: Organization | null = null;

    if (safeMemberships.length > 0) {
      const firstOrganizationId = safeMemberships[0].organization_id;

      const { data: orgRow } = await supabase
        .from("organizations")
        .select("id, name, slug, type, owner_user_id")
        .eq("id", firstOrganizationId)
        .single();

      activeOrganization = (orgRow as Organization | null) ?? null;
    }

    setRawUser(currentUser);
    setUser(buildAuthUser(currentUser, (profile as ProfileRow | null) ?? null));
    setMemberships(safeMemberships);
    setOrganization(activeOrganization);
    setIsLoadingAuth(false);
  };

  const refreshUser = async () => {
    await loadAuthState();
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!currentUser) {
        setRawUser(null);
        setUser(null);
        setOrganization(null);
        setMemberships([]);
        setIsLoadingAuth(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", currentUser.id)
        .single();

      const { data: membershipRows } = await supabase
        .from("organization_members")
        .select("organization_id, user_id, role")
        .eq("user_id", currentUser.id);

      const safeMemberships = (membershipRows ?? []) as OrganizationMembership[];

      let activeOrganization: Organization | null = null;

      if (safeMemberships.length > 0) {
        const firstOrganizationId = safeMemberships[0].organization_id;

        const { data: orgRow } = await supabase
          .from("organizations")
          .select("id, name, slug, type, owner_user_id")
          .eq("id", firstOrganizationId)
          .single();

        activeOrganization = (orgRow as Organization | null) ?? null;
      }

      if (!isMounted) return;

      setRawUser(currentUser);
      setUser(buildAuthUser(currentUser, (profile as ProfileRow | null) ?? null));
      setMemberships(safeMemberships);
      setOrganization(activeOrganization);
      setIsLoadingAuth(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!isMounted) return;
      await loadAuthState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      rawUser,
      organization,
      memberships,
      isAuthenticated: !!rawUser,
      isLoadingAuth,

      login: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: error?.message ?? null };
      },

      signup: async (email, password) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        return { error: error?.message ?? null };
      },

      loginAsDemo: async () => {
        const demoEmail = "demo@onepilot.local";
        const demoPassword = "Demo123456!";

        const { error } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        return { error: error?.message ?? null };
      },

      logout: async () => {
        await supabase.auth.signOut({ scope: "local" });
        setRawUser(null);
        setUser(null);
        setOrganization(null);
        setMemberships([]);
        // Redirection forcée vers la page de login
        window.location.href = "/login";
      },

      refreshUser,
    }),
    [user, rawUser, organization, memberships, isLoadingAuth, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}