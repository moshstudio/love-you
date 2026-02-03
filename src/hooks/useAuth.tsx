"use client";

import { ReactNode, useMemo } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  email: string;
  username: string;
}

// Keeping the interface for reference, though we don't explicitly implement a provider for it
// interface AuthContextType { ... }

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const t = useTranslations("Login");

  const login = async (email: string, password: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // NextAuth generic error might be just "CredentialsSignin" or similar.
      if (result.error === "CredentialsSignin") {
        throw new Error(t("errorCredentials"));
      }
      // We can return a generic message.
      throw new Error("Log in failed: " + result.error);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
  ) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    // Auto login after register
    await login(email, password);
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  // Map NextAuth session user to our User interface
  // Map NextAuth session user to our User interface
  const user: User | null = useMemo(() => {
    return session?.user
      ? {
          id: session?.user?.id || "",
          email: session?.user?.email || "",
          username:
            (session?.user as { username?: string }).username ||
            session?.user?.name ||
            "",
        }
      : null;
  }, [session?.user]);

  return {
    user,
    token: null, // Tokens are now handled by NextAuth cookies
    loading: status === "loading",
    login,
    register,
    logout,
  };
}
