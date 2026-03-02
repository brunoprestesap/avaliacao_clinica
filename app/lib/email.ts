/**
 * Envio de emails (recuperação de senha, desbloqueio de conta).
 * Configure RESEND_API_KEY no .env para produção. Sem chave, em desenvolvimento apenas loga o link.
 */

import type { AuthEmailSender } from "@/src/application/auth/ports";

const FROM_EMAIL =
  process.env.EMAIL_FROM ?? "noreply@example.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<void> {
  const subject = "Redefinição de senha";
  const body = `Você solicitou a redefinição de senha. Acesse o link abaixo (válido por 24 horas):\n\n${resetLink}\n\nSe não foi você, ignore este email.`;
  await sendEmail({ to, subject, body, resetLink });
}

export async function sendUnlockAccountEmail(
  to: string,
  unlockLink: string
): Promise<void> {
  const subject = "Desbloqueio de conta";
  const body = `Sua conta foi bloqueada após várias tentativas de login. Acesse o link abaixo para desbloquear (válido por 24 horas):\n\n${unlockLink}\n\nSe não foi você, altere sua senha após desbloquear.`;
  await sendEmail({ to, subject, body, unlockLink });
}

/** Adaptador para AuthService (camada de aplicação). */
export const authEmailSender: AuthEmailSender = {
  sendPasswordReset: sendPasswordResetEmail,
  sendUnlockAccount: sendUnlockAccountEmail,
};

async function sendEmail({
  to,
  subject,
  body,
  resetLink,
  unlockLink,
}: {
  to: string;
  subject: string;
  body: string;
  resetLink?: string;
  unlockLink?: string;
}): Promise<void> {
  const link = resetLink ?? unlockLink ?? "";
  if (RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Falha ao enviar email: ${err}`);
    }
    return;
  }
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[email]", subject, "→", to, "| link:", link);
  }
}
