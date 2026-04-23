// Envoi de notifications push via l'API Expo Push.
// Doc : https://docs.expo.dev/push-notifications/sending-notifications/
//
// Pour les token FCM/APNs natifs (build standalone), Expo push les relaie.
// Pour Expo Go, les tokens Expo fonctionnent directement.

import { db } from "../db";
import { logger } from "../lib/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;    // Android
}

// Envoie un batch de messages à Expo. Silencieux en cas d'échec (best-effort).
export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  const valid = messages.filter((m) => {
    const tokens = Array.isArray(m.to) ? m.to : [m.to];
    return tokens.every((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));
  });
  if (valid.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(valid),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status, body }, "[push] Expo API error");
    }
  } catch (e: any) {
    logger.warn({ err: e?.message }, "[push] send failed");
  }
}

// Retourne les push tokens des amis acceptés d'un account donné.
// Utilisé pour notifier ses amis quand il crée une partie.
const selectFriendsTokens = db.prepare(`
  SELECT a.push_token FROM friendships f
  JOIN accounts a
    ON (a.id = f.requester_id OR a.id = f.receiver_id)
    AND a.id != ?
    AND a.deleted_at IS NULL
    AND a.push_token IS NOT NULL
  WHERE f.status = 'accepted'
    AND (f.requester_id = ? OR f.receiver_id = ?)
`);

export function getFriendsPushTokens(accountId: string): string[] {
  const rows = selectFriendsTokens.all(accountId, accountId, accountId) as { push_token: string }[];
  return rows.map((r) => r.push_token).filter((t) => !!t);
}
