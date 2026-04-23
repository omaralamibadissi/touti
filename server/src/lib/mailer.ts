// Envoi d'emails transactionnels via Resend.
// Activé uniquement si `RESEND_API_KEY` et `ADMIN_EMAIL` sont set.
// Sans ces env vars, tout appel à `sendAdminEmail` est un no-op silencieux.

import { Resend } from "resend";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
// Expéditeur par défaut. Avec Resend gratuit, on peut utiliser
// `onboarding@resend.dev` sans vérifier de domaine.
const FROM = process.env.MAIL_FROM || "Touti Admin <onboarding@resend.dev>";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!resend) {
  logger.info("[mailer] RESEND_API_KEY absent → emails désactivés");
} else if (!ADMIN_EMAIL) {
  logger.warn("[mailer] ADMIN_EMAIL absent → aucune destination, emails désactivés");
} else {
  logger.info({ to: ADMIN_EMAIL, from: FROM }, "[mailer] initialisé");
}

// Envoie un email à l'admin (toi). Best-effort : log + retourne silencieusement
// en cas d'erreur, ne bloque jamais le flux qui appelle.
export async function sendAdminEmail(opts: {
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!resend || !ADMIN_EMAIL) return;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      logger.warn({ err: error }, "[mailer] resend rejected send");
    } else {
      logger.info({ id: data?.id, subject: opts.subject }, "[mailer] email sent");
    }
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[mailer] send failed");
  }
}

// Helpers spécialisés pour ne pas dupliquer le formatage HTML partout
export async function notifyNewReport(report: {
  id: string;
  reporterId: string;
  reportedUsername: string;
  reason: string;
  context: string | null;
  roomCode: string | null;
  details: string | null;
  createdAt: number;
}): Promise<void> {
  const when = new Date(report.createdAt).toISOString();
  const subject = `[Touti] Nouveau signalement · ${report.reportedUsername} (${report.reason})`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; color: #222; line-height: 1.5;">
      <h2 style="margin: 0 0 8px;">Nouveau signalement</h2>
      <p style="margin: 0 0 16px; color: #666;">Reçu le ${when}</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 6px 8px; color: #888;">Pseudo signalé</td><td style="padding: 6px 8px;"><b>${escapeHtml(report.reportedUsername)}</b></td></tr>
        <tr><td style="padding: 6px 8px; color: #888;">Raison</td><td style="padding: 6px 8px;">${escapeHtml(report.reason)}</td></tr>
        <tr><td style="padding: 6px 8px; color: #888;">Contexte</td><td style="padding: 6px 8px;">${escapeHtml(report.context ?? "—")}</td></tr>
        <tr><td style="padding: 6px 8px; color: #888;">Room</td><td style="padding: 6px 8px;">${escapeHtml(report.roomCode ?? "—")}</td></tr>
        <tr><td style="padding: 6px 8px; color: #888;">Reporter ID</td><td style="padding: 6px 8px;"><code>${escapeHtml(report.reporterId)}</code></td></tr>
        <tr><td style="padding: 6px 8px; color: #888;">Report ID</td><td style="padding: 6px 8px;"><code>${escapeHtml(report.id)}</code></td></tr>
      </table>
      ${report.details ? `<div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px;"><b>Détails :</b><br>${escapeHtml(report.details)}</div>` : ""}
    </div>
  `;
  const text =
    `Nouveau signalement reçu le ${when}\n\n` +
    `Pseudo signalé : ${report.reportedUsername}\n` +
    `Raison : ${report.reason}\n` +
    `Contexte : ${report.context ?? "—"}\n` +
    `Room : ${report.roomCode ?? "—"}\n` +
    `Reporter ID : ${report.reporterId}\n` +
    `Report ID : ${report.id}\n` +
    (report.details ? `\nDétails :\n${report.details}\n` : "");
  await sendAdminEmail({ subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
