"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";
import { clearAuthToken, getAuthToken, setAuthToken } from "./auth-token";
import type { DiscoverLayout, PublicUser } from "@trustlayer/shared";

export interface AuthUser extends PublicUser {
  birthDate?: string | null;
  addressLine?: string | null;
  discoverLayout?: DiscoverLayout;
  personalityProfile: {
    questionnaireComplete: boolean;
  } | null;
}

interface MeResponse {
  user: AuthUser | null;
}

interface AuthState {
  loading: boolean;
  signedIn: boolean;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (token: string) => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<MeResponse>("/auth/me");
      setUser(res.user);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(
    async (token: string) => {
      setAuthToken(token);
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    clearAuthToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      signedIn: !!user,
      user,
      refresh,
      signOut,
      setSession,
    }),
    [loading, user, refresh, signOut, setSession],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
