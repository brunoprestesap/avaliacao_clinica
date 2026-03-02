import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import { sendUnlockAccountEmail } from "@/app/lib/email";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const LOCK_DURATION_HOURS = 24;
const MAX_FAILED_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY_HOURS = 24;

type UserRowAuth = {
  id: string;
  email: string;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
};

function getBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (u) return u.startsWith("http") ? u : `https://${u}`;
  return "http://localhost:3000";
}

export const authOptions: NextAuthOptions = {
  // Garante consistência entre /signin e /callback, evitando "State cookie was missing"
  // quando a detecção automática de HTTPS diverge entre requests (proxy/headers).
  useSecureCookies: (process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        const supabase = getSupabase();
        const { data: userRow, error: fetchError } = await supabase
          .from("users")
          .select("id, email, password_hash, failed_login_attempts, locked_until")
          .eq("email", email)
          .maybeSingle();

        if (fetchError || !userRow) return null;
        const row = userRow as UserRowAuth;

        const lockedUntil = row.locked_until
          ? new Date(row.locked_until)
          : null;
        if (lockedUntil && lockedUntil > new Date()) {
          throw new Error(
            "Conta bloqueada. Verifique seu email para o link de desbloqueio."
          );
        }

        const passwordHash = row.password_hash;
        if (!passwordHash) return null; // usuário só Google

        const valid = await compare(password, passwordHash);
        if (!valid) {
          const attempts = (row.failed_login_attempts ?? 0) + 1;
          const updates: Record<string, unknown> = {
            failed_login_attempts: attempts,
            updated_at: new Date().toISOString(),
          };
          if (attempts >= MAX_FAILED_ATTEMPTS) {
            const lockedUntilDate = new Date();
            lockedUntilDate.setHours(lockedUntilDate.getHours() + LOCK_DURATION_HOURS);
            updates.locked_until = lockedUntilDate.toISOString();
            await (supabase as any).from("users").update(updates).eq("id", row.id);

            const rawToken = randomBytes(32).toString("hex");
            const token_hash = await hash(rawToken, BCRYPT_ROUNDS);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
            const { data: unlockRow } = await (supabase as any)
              .from("account_unlock_tokens")
              .insert({
                token_hash,
                user_id: row.id,
                expires_at: expiresAt.toISOString(),
              })
              .select("id")
              .single();
            if (unlockRow && typeof unlockRow === "object" && "id" in unlockRow) {
              const unlockLink = `${getBaseUrl()}/auth/desbloquear-conta?id=${(unlockRow as { id: string }).id}&token=${rawToken}`;
              await sendUnlockAccountEmail(row.email, unlockLink);
            }
          } else {
            await (supabase as any).from("users").update(updates).eq("id", row.id);
          }
          return null;
        }

        await (supabase as any)
          .from("users")
          .update({
            failed_login_attempts: 0,
            locked_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        return {
          id: row.id,
          email: row.email,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SEVEN_DAYS_SECONDS,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const supabase = getSupabase();
        const email = (profile.email as string).trim().toLowerCase();
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (!existing) {
          await supabase.from("users").insert({
            email,
            password_hash: null,
            email_verified: new Date().toISOString(),
          } as any);
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id && user?.email) {
        token.id = user.id;
        token.email = user.email;
        return token;
      }
      if (account?.provider === "google" && profile?.email) {
        const supabase = getSupabase();
        const email = (profile.email as string).trim().toLowerCase();
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, email")
          .eq("email", email)
          .single();
        if (dbUser && typeof dbUser === "object" && "id" in dbUser && "email" in dbUser) {
          const u = dbUser as { id: string; email: string };
          token.id = u.id;
          token.email = u.email;
        }
      }
      return token;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
