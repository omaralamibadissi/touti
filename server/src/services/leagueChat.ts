// Chat ligue — messages persistés, scoped par ligue, accessibles aux membres.

import { db } from "../db";
import { sanitize } from "@touti/shared";
import { isMember } from "./leagues";

export interface LeagueMessage {
  id: string;
  leagueId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  createdAt: number;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const insertMessage = db.prepare(`
  INSERT INTO league_messages (id, league_id, author_id, author_name, text, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectMessages = db.prepare(`
  SELECT * FROM league_messages
  WHERE league_id = ? AND created_at < ?
  ORDER BY created_at DESC
  LIMIT ?
`);

function hydrate(row: any): LeagueMessage {
  return {
    id: row.id,
    leagueId: row.league_id,
    authorId: row.author_id,
    authorName: row.author_name,
    text: row.text,
    createdAt: row.created_at,
  };
}

// Retourne les `limit` derniers messages avant `before`. Ordre chronologique ASC.
export function listMessages(
  leagueId: string,
  authorName: string,
  before: number = Date.now() + 1,
  limit: number = 50,
): LeagueMessage[] {
  if (!isMember(leagueId, authorName)) {
    throw new Error("Tu n'es pas membre de cette ligue");
  }
  const rows = selectMessages.all(leagueId, before, Math.min(200, Math.max(1, limit))) as any[];
  // On renvoie en ordre chronologique pour l'affichage
  return rows.map(hydrate).reverse();
}

export function postMessage(
  leagueId: string,
  authorId: string,
  authorName: string,
  rawText: string,
): LeagueMessage {
  if (!isMember(leagueId, authorName)) {
    throw new Error("Tu n'es pas membre de cette ligue");
  }
  const text = sanitize((rawText || "").trim().slice(0, 500));
  if (!text) throw new Error("Message vide");
  const id = randomId();
  const createdAt = Date.now();
  insertMessage.run(id, leagueId, authorId, authorName, text, createdAt);
  return {
    id, leagueId, authorId, authorName, text, createdAt,
  };
}
