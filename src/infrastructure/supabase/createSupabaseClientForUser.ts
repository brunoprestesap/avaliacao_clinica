import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const jwtSecret = process.env.SUPABASE_JWT_SECRET;
const jwtKid = process.env.SUPABASE_JWT_KID;
const jwtSecretIsBase64 = process.env.SUPABASE_JWT_SECRET_IS_BASE64 === "true";

const JWT_EXPIRY_SECONDS = 60 * 60; // 1 hora

function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

function base64UrlToString(b64url: string): string {
  // Node suporta "base64url" nas versões atuais, mas mantemos fallback.
  try {
    return Buffer.from(b64url, "base64url").toString("utf8");
  } catch {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return Buffer.from(b64 + pad, "base64").toString("utf8");
  }
}

function getJwtHeader(token: string): Record<string, unknown> | null {
  const [headerB64] = token.split(".");
  if (!headerB64) return null;
  try {
    const raw = base64UrlToString(headerB64);
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Cria um JWT aceito pelo Supabase para RLS (auth.uid() = sub).
 * Deve ser assinado com o mesmo JWT secret do projeto (Dashboard → Settings → API → JWT Secret).
 */
async function createSupabaseAccessToken(userId: string): Promise<string> {
  if (!jwtSecret) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET. Use o JWT Secret do Supabase (Dashboard → Settings → API → JWT Secret)."
    );
  }
  const exp = Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS;
  const secret = jwtSecretIsBase64
    ? base64ToBytes(jwtSecret)
    : new TextEncoder().encode(jwtSecret);
  // Importante: em projetos Supabase "clássicos" (HS256), NÃO inclua `kid` no header.
  // Se você incluir `kid` sem o projeto estar configurado para isso, o PostgREST pode rejeitar com
  // "No suitable key or wrong key type".
  //
  // Heurística: só inclui `kid` se a própria anon key já vier com `kid` no header.
  const anonHeader = anonKey ? getJwtHeader(anonKey) : null;
  const shouldIncludeKid = Boolean(anonHeader && typeof anonHeader.kid === "string" && jwtKid);

  return await new SignJWT({ role: "authenticated" })
    .setProtectedHeader(shouldIncludeKid ? { alg: "HS256", typ: "JWT", kid: jwtKid } : { alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer("supabase")
    .setAudience("authenticated")
    .setExpirationTime(exp)
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .sign(secret);
}

/**
 * Cliente Supabase que envia JWT customizado com sub = userId.
 * RLS usa auth.uid() = userId. Use após obter sessão NextAuth.
 */
export async function createSupabaseClientForUser(
  userId: string
): Promise<ReturnType<typeof createClient<Database>>> {
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY)."
    );
  }
  const token = await createSupabaseAccessToken(userId);
  // Supabase recomenda usar accessToken para tokens third-party/custom.
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
    accessToken: async () => token,
  });
}
