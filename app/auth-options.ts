import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getAuthService } from "@/src/infrastructure/auth-container";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
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
        const authService = getAuthService();
        const result = await authService.validateUserCredentials({
          email: credentials.email,
          password: credentials.password,
        });
        if (result.success) {
          return { id: result.user.id, email: result.user.email };
        }
        if (result.reason === "account_locked" && result.message) {
          throw new Error(result.message);
        }
        return null;
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
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const authService = getAuthService();
        await authService.registerOrFindOAuthUser(profile.email as string);
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
        const authService = getAuthService();
        const dto = await authService.registerOrFindOAuthUser(profile.email as string);
        token.id = dto.id;
        token.email = dto.email;
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
