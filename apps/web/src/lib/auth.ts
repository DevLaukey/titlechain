"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { authApi, AuthData } from "./api";

interface AuthUser {
  id: string;
  email: string;
  role: string;
  kycStatus: string;
  walletAddress?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: "BUYER" | "SELLER";
  }) => Promise<void>;
  logout: () => void;
  connectWallet: (
    walletAddress: string,
    message: string,
    signature: string
  ) => Promise<void>;
}

import React from "react";

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveAuth = useCallback((data: AuthData) => {
    localStorage.setItem("tc_token", data.token);
    // Also set a cookie so Next.js middleware can read it for server-side route protection
    document.cookie = `tc_token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tc_token");
    // Clear the cookie as well
    document.cookie = "tc_token=; path=/; max-age=0; SameSite=Lax";
    setToken(null);
    setUser(null);
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("tc_token");
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    setToken(storedToken);
    authApi
      .me()
      .then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      if (!res.success || !res.data) throw new Error(res.error ?? "Login failed");
      saveAuth(res.data);
    },
    [saveAuth]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role?: "BUYER" | "SELLER";
    }) => {
      const res = await authApi.register(payload);
      if (!res.success || !res.data)
        throw new Error(res.error ?? "Registration failed");
      saveAuth(res.data);
    },
    [saveAuth]
  );

  const connectWallet = useCallback(
    async (walletAddress: string, message: string, signature: string) => {
      const res = await authApi.walletLogin({ walletAddress, message, signature });
      if (!res.success || !res.data)
        throw new Error(res.error ?? "Wallet authentication failed");
      saveAuth(res.data);
    },
    [saveAuth]
  );

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        connectWallet,
      },
    },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
