// Audit léger : enregistre les créations de rooms/ligues/tournois.

import { db } from "../db";

export type AuditKind = "private" | "quick" | "league" | "tournament";

const insert = db.prepare(`
  INSERT INTO room_audit (id, account_id, kind, room_code, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const countRecent = db.prepare(`
  SELECT COUNT(*) AS n FROM room_audit
  WHERE account_id = ? AND kind = ? AND created_at > ?
`);

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function logCreation(
  accountId: string,
  kind: AuditKind,
  roomCode: string | null,
): void {
  insert.run(randomId(), accountId, kind, roomCode, Date.now());
}

export function countInLastMs(
  accountId: string,
  kind: AuditKind,
  windowMs: number,
): number {
  const r = countRecent.get(accountId, kind, Date.now() - windowMs) as { n: number };
  return r?.n ?? 0;
}
