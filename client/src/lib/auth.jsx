"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearAuth, getStoredAuth, storeAuth } from "@/services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    const maybe = stored?.token
      ? api
          .get("/auth/me")
          .then((payload) => ({ token: stored.token, user: payload?.user || stored.user }))
      : Promise.resolve(null);
    maybe
      .then((next) => {
        if (next) setAuth(next);
      })
      .catch(() => {
        clearAuth();
        setAuth(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email, password) => {
      const payload = await api.post("/auth/login", { email, password });
      const next = { token: payload.token, user: payload.user };
      storeAuth(next);
      setAuth(next);
      return payload.user;
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
    router.replace("/login");
  }, [router]);

  const updateUser = useCallback((user) => {
    setAuth((prev) => {
      const next = prev ? { ...prev, user } : prev;
      storeAuth(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ auth, user: auth?.user || null, token: auth?.token || null, loading, login, logout, updateUser }),
    [auth, loading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}