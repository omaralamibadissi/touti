// Bans — actions admin + lookup pour le middleware d'auth et GameRoom.onAuth.
//
// Un ban est "actif" si :
//   - lifted_at IS NULL, ET
//   - expires_at IS NULL (perma) OU expires_at > now

import { db } from "../db";

export interface Ban {
  id: string;
  accountId: string;
  reason: string;
  bannedBy: string | null;
  bannedAt: number;
  expiresAt: number | null;
  liftedAt: number | null;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const insertBan = db.prepare(`
  INSERT INTO bans (id, account_id, reason, banned_by, banned_at, expires_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const liftBanStmt = db.prepare(`UPDATE bans SET lifted_at = ? WHERE id = ?`);

const selectActiveForAccount = db.prepare(`
  SELECT * FROM bans
  WHERE account_id = ?
    AND lifted_at IS NULL
    AND (expires_at IS NULL OR expires_at > ?)
  ORDER BY banned_at DESC
  LIMIT 1
`);

const selectAll = db.prepare(`
  SELECT b.*, a.username
  FROM bans b
  JOIN accounts a ON a.id = b.account_id
  ORDER BY b.banned_at DESC
  LIMIT 200
`);

function hydrate(row: any): Ban {
  return {
    id: row.id,
    accountId: row.account_id,
    reason: row.reason,
    bannedBy: row.banned_by,
    bannedAt: row.banned_at,
    expiresAt: row.expires_at,
    liftedAt: row.lifted_at,
  };
}

// Retourne le ban actif s'il y en a un, sinon null.
export function activeBan(accountId: string): Ban | null {
  const row = selectActiveForAccount.get(accountId, Date.now()) as any;
  return row ? hydrate(row) : null;
}

export function isBanned(accountId: string): boolean {
  return activeBan(accountId) !== null;
}

export function banAccount(
  accountId: string,
  reason: string,
  options: { expiresAt?: number; bannedBy?: string } = {},
): Ban {
  const id = randomId();
  insertBan.run(
    id,
    accountId,
    reason,
    options.bannedBy ?? "admin",
    Date.now(),
    options.expiresAt ?? null,
  );
  return hydrate(
    (db.prepare(`SELECT * FROM bans WHERE id = ?`).get(id) as any),
  );
}

export function liftBan(banId: string): void {
  liftBanStmt.run(Date.now(), banId);
}

export function listAll(): (Ban & { username: string })[] {
  return (selectAll.all() as any[]).map((r) => ({ ...hydrate(r), username: r.username }));
}
