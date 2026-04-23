// Fil d'activité d'une ligue — événements historisés.

import { db } from "../db";
import { isMember } from "./leagues";

export type LeagueActivityType =
  | "member_joined"
  | "member_left"
  | "member_kicked"
  | "member_promoted"
  | "member_demoted"
  | "tournament_created"
  | "match_played";

export interface LeagueActivity {
  id: string;
  leagueId: string;
  type: LeagueActivityType;
  actorName: string | null;
  targetName: string | null;
  data: Record<string, any> | null;
  createdAt: number;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const insert = db.prepare(`
  INSERT INTO league_activity
    (id, league_id, type, actor_name, target_name, data_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const select = db.prepare(`
  SELECT * FROM league_activity
  WHERE league_id = ? AND created_at < ?
  ORDER BY created_at DESC
  LIMIT ?
`);

function hydrate(row: any): LeagueActivity {
  return {
    id: row.id,
    leagueId: row.league_id,
    type: row.type,
    actorName: row.actor_name,
    targetName: row.target_name,
    data: row.data_json ? JSON.parse(row.data_json) : null,
    createdAt: row.created_at,
  };
}

// Log un événement. Best-effort : on swallow les erreurs pour ne pas casser
// le flow si la DB est indisponible.
export function logActivity(
  leagueId: string,
  type: LeagueActivityType,
  input: { actorName?: string; targetName?: string; data?: Record<string, any> } = {},
): void {
  try {
    insert.run(
      randomId(),
      leagueId,
      type,
      input.actorName ?? null,
      input.targetName ?? null,
      input.data ? JSON.stringify(input.data) : null,
      Date.now(),
    );
  } catch (e: any) {
    console.warn("[leagueActivity] log failed:", e?.message);
  }
}

// Liste les événements (les plus récents d'abord). Membres uniquement.
export function listActivity(
  leagueId: string,
  authorName: string,
  before: number = Date.now() + 1,
  limit: number = 80,
): LeagueActivity[] {
  if (!isMember(leagueId, authorName)) {
    throw new Error("Tu n'es pas membre de cette ligue");
  }
  const rows = select.all(leagueId, before, Math.min(200, Math.max(1, limit))) as any[];
  return rows.map(hydrate);
}
