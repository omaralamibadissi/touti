// Signalements — crée une entrée dans `reports`. Admin peut lister.

import { db } from "../db";
import { findByUsername } from "./accounts";

export type ReportReason = "insulte" | "triche" | "spam" | "autre";
export type ReportContext = "chat" | "game" | "profile";

export interface Report {
  id: string;
  reporterId: string;
  reportedUsername: string;
  reportedId: string | null;
  reason: ReportReason;
  context: ReportContext | null;
  roomCode: string | null;
  details: string | null;
  createdAt: number;
  status: "open" | "reviewed" | "dismissed";
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const insertReport = db.prepare(`
  INSERT INTO reports
    (id, reporter_id, reported_username, reported_id, reason, context, room_code, details, created_at, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
`);

const countByReported = db.prepare(`
  SELECT COUNT(*) AS n FROM reports WHERE reported_username = ? AND status = 'open'
`);

const selectAll = db.prepare(`
  SELECT * FROM reports ORDER BY created_at DESC LIMIT 200
`);

const updateStatus = db.prepare(`
  UPDATE reports SET status = ? WHERE id = ?
`);

function hydrate(row: any): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedUsername: row.reported_username,
    reportedId: row.reported_id,
    reason: row.reason,
    context: row.context,
    roomCode: row.room_code,
    details: row.details,
    createdAt: row.created_at,
    status: row.status,
  };
}

export function createReport(
  reporterId: string,
  input: {
    reportedUsername: string;
    reason: ReportReason;
    context?: ReportContext;
    roomCode?: string;
    details?: string;
  },
): Report {
  if (!input.reportedUsername?.trim()) throw new Error("Pseudo signalé manquant");
  if (!["insulte", "triche", "spam", "autre"].includes(input.reason)) {
    throw new Error("Raison invalide");
  }
  // On essaie de résoudre le username vers un compte (best effort)
  const target = findByUsername(input.reportedUsername.trim());
  if (target && target.id === reporterId) {
    throw new Error("Tu ne peux pas te signaler toi-même");
  }
  const id = randomId();
  insertReport.run(
    id,
    reporterId,
    input.reportedUsername.trim(),
    target?.id ?? null,
    input.reason,
    input.context ?? null,
    input.roomCode ?? null,
    input.details ?? null,
    Date.now(),
  );
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id);
  return hydrate(row);
}

export function countOpenFor(username: string): number {
  const r = countByReported.get(username) as { n: number };
  return r?.n ?? 0;
}

export function listAll(): Report[] {
  return (selectAll.all() as any[]).map(hydrate);
}

export function setStatus(id: string, status: "open" | "reviewed" | "dismissed"): void {
  updateStatus.run(status, id);
}
