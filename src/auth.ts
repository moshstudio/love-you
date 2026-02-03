import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth";

// Extend types locally for now or move to d.ts
interface CustomUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string;
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // Access Cloudflare bindings
          const { env } = await getCloudflareContext({ async: true });
          const db = getDb(env.DB);

          // Find user
          const userList = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (userList.length === 0) return null;

          const user = userList[0];

          // Check password
          // verifyPassword uses bcryptjs which is compatible with Workers
          const passwordsMatch = await verifyPassword(
            password,
            user.passwordHash as string,
          );

          if (passwordsMatch) {
            // Return user object expected by NextAuth
            return {
              id: user.id,
              name: user.username, // mapping username to name for standard NextAuth User
              email: user.email,
              username: user.username, // Custom property
            };
          }
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as CustomUser).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // Extend session user type if needed or use module augmentation
        (session.user as CustomUser).username = token.username as string;
      }
      return session;
    },
    ...authConfig.callbacks,
  },
  session: {
    strategy: "jwt",
  },
});
