import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Regex to match protected routes with optional locale prefix (en/zh)
      // Matches: /albums, /en/albums, /zh/albums, /share, /api/albums, etc.
      const isProtected =
        /^\/(?:(zh|en)\/)?(albums|share|api\/albums)(\/.*)?$/.test(pathname);

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // Redirect to albums if user is logged in and visits login/register page
        // Matches: /login, /en/login, /register, etc.
        const isAuthPage = /^\/(?:(zh|en)\/)?(login|register)(\/.*)?$/.test(
          pathname,
        );
        if (isAuthPage) {
          return Response.redirect(new URL("/albums", nextUrl));
        }
      }
      return true;
    },
    // We will adding the session/jwt callbacks in auth.ts to keep this file clean/edge-safe if needed
  },
  providers: [], // Providers defined in auth.ts
} satisfies NextAuthConfig;
