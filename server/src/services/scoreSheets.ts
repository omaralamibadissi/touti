// Service feuilles de score IRL — synchronisées serveur, par owner.
//
// Chaque user possède ses feuilles. Les 4 noms saisis sont juste des étiquettes
// (pas forcément des comptes réels). Le winner est calculé côté client à chaque
// addRound (la logique reste dans le store mobile).

import { db } from "../db";

export type Team = "A" | "B";

export interface ScoreRound {
  id: string;
  num: number;
  dealer: string;
  male: string;
  buyerTeam: Team;
  buyer: string;
  bid: number;
  success: boolean;
  delta: { A: number; B: number };
}

export interface ScoreSheet {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  names: [string, string, string, string];
  rounds: ScoreRound[];
  dealerIdx: number;
  status: "in-progress" | "finished";
  winner: Team | null;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Queries ─────────────────────────────────────────────────

const insertSheet = db.prepare(`
  INSERT INTO score_sheets
    (id, owner_id, created_at, updated_at, names_json, dealer_idx, status, winner)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateSheetStmt = db.prepare(`
  UPDATE score_sheets
  SET updated_at = ?, names_json = ?, dealer_idx = ?, status = ?, winner = ?
  WHERE id = ? AND owner_id = ?
`);

const selectSheet = db.prepare(`SELECT * FROM score_sheets WHERE id = ? AND owner_id = ?`);
const selectMySheets = db.prepare(`
  SELECT * FROM score_sheets WHERE owner_id = ? ORDER BY updated_at DESC
`);
const deleteSheet = db.prepare(`DELETE FROM score_sheets WHERE id = ? AND owner_id = ?`);

const insertRound = db.prepare(`
  INSERT INTO score_rounds
    (id, sheet_id, num, dealer, male, buyer_team, buyer, bid, success, delta_a, delta_b)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectRounds = db.prepare(`
  SELECT * FROM score_rounds WHERE sheet_id = ? ORDER BY num ASC
`);

const deleteRounds = db.prepare(`DELETE FROM score_rounds WHERE sheet_id = ?`);

// ─── Helpers ─────────────────────────────────────────────────

function hydrateSheet(row: any): ScoreSheet {
  const rounds = (selectRounds.all(row.id) as any[]).map(hydrateRound);
  return {
    id: row.id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    names: JSON.parse(row.names_json),
    rounds,
    dealerIdx: row.dealer_idx,
    status: row.status,
    winner: row.winner ?? null,
  };
}

function hydrateRound(row: any): ScoreRound {
  return {
    id: row.id,
    num: row.num,
    dealer: row.dealer,
    male: row.male,
    buyerTeam: row.buyer_team,
    buyer: row.buyer,
    bid: row.bid,
    success: !!row.success,
    delta: { A: row.delta_a, B: row.delta_b },
  };
}

// ─── API ─────────────────────────────────────────────────────

export function listMine(ownerId: string): ScoreSheet[] {
  return (selectMySheets.all(ownerId) as any[]).map(hydrateSheet);
}

export function getOne(ownerId: string, id: string): ScoreSheet | null {
  const row = selectSheet.get(id, ownerId) as any;
  if (!row) return null;
  return hydrateSheet(row);
}

export function createSheet(
  ownerId: string,
  names: [string, string, string, string],
): ScoreSheet {
  const now = Date.now();
  const id = randomId();
  insertSheet.run(
    id, ownerId, now, now, JSON.stringify(names), 0, "in-progress", null,
  );
  return getOne(ownerId, id)!;
}

export function updateSheet(
  ownerId: string,
  id: string,
  patch: {
    names?: [string, string, string, string];
    dealerIdx?: number;
    status?: "in-progress" | "finished";
    winner?: Team | null;
  },
): ScoreSheet {
  const existing = getOne(ownerId, id);
  if (!existing) throw new Error("Sheet introuvable");
  const merged = { ...existing, ...patch };
  updateSheetStmt.run(
    Date.now(),
    JSON.stringify(merged.names),
    merged.dealerIdx,
    merged.status,
    merged.winner,
    id,
    ownerId,
  );
  return getOne(ownerId, id)!;
}

export function addRound(
  ownerId: string,
  sheetId: string,
  round: ScoreRound,
  newWinner: Team | null,
  newStatus: "in-progress" | "finished",
): ScoreSheet {
  const existing = getOne(ownerId, sheetId);
  if (!existing) throw new Error("Sheet introuvable");
  insertRound.run(
    round.id,
    sheetId,
    round.num,
    round.dealer,
    round.male,
    round.buyerTeam,
    round.buyer,
    round.bid,
    round.success ? 1 : 0,
    round.delta.A,
    round.delta.B,
  );
  updateSheetStmt.run(
    Date.now(),
    JSON.stringify(existing.names),
    existing.dealerIdx,
    newStatus,
    newWinner,
    sheetId,
    ownerId,
  );
  return getOne(ownerId, sheetId)!;
}

export function resetSheet(ownerId: string, id: string): ScoreSheet {
  const existing = getOne(ownerId, id);
  if (!existing) throw new Error("Sheet introuvable");
  deleteRounds.run(id);
  updateSheetStmt.run(
    Date.now(),
    JSON.stringify(existing.names),
    0,
    "in-progress",
    null,
    id,
    ownerId,
  );
  return getOne(ownerId, id)!;
}

export function removeSheet(ownerId: string, id: string): void {
  deleteSheet.run(id, ownerId);
}
