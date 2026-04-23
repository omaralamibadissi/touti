// Service matchs + classements (SQLite agrégats).

import { db } from "../db";
import { logger } from "../lib/logger";

export type MatchType = "solo-ai" | "private" | "quick" | "tournament" | "irl";

export interface RecordedPlayer {
  seat: number;        // 0..3
  name: string;
  isAi: boolean;
}

export interface RecordedMatch {
  id: string;
  finishedAt: number;
  type: MatchType;
  winnerTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  roundsPlayed: number;
  leagueId?: string | null;
  tournamentId?: string | null;
  players: RecordedPlayer[];
  details?: any; // rounds snapshot, etc.
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Prepared statements ─────────────────────────────────────────

// INSERT OR IGNORE garantit l'idempotence : si deux clients POSTent le même
// match id simultanément, seul le premier insère, le second est no-op.
// On détecte ensuite via getMatch() si l'insertion a abouti pour cette
// exécution (changes > 0) ou non.
const insertMatch = db.prepare(`
  INSERT OR IGNORE INTO matches
    (id, finished_at, type, winner_team, score_a, score_b, rounds_played,
     league_id, tournament_id, details_json)
  VALUES
    (@id, @finishedAt, @type, @winnerTeam, @scoreA, @scoreB, @roundsPlayed,
     @leagueId, @tournamentId, @detailsJson)
`);

const insertPlayer = db.prepare(`
  INSERT INTO match_players (match_id, seat, name, name_lower, is_ai)
  VALUES (@matchId, @seat, @name, @nameLower, @isAi)
`);

const selectMatchById = db.prepare(`SELECT * FROM matches WHERE id = ?`);
const selectPlayersByMatch = db.prepare(`
  SELECT seat, name, is_ai AS isAi FROM match_players WHERE match_id = ? ORDER BY seat
`);

const selectMatchesByPlayer = db.prepare(`
  SELECT m.* FROM matches m
  JOIN match_players mp ON mp.match_id = m.id
  WHERE mp.name_lower = ?
  ORDER BY m.finished_at DESC
  LIMIT ?
`);

// ─── API publique ────────────────────────────────────────────────

export function recordMatch(
  input: Omit<RecordedMatch, "id"> & { id?: string },
): RecordedMatch {
  const id = input.id || randomId();
  let inserted = false;
  const tx = db.transaction(() => {
    const res = insertMatch.run({
      id,
      finishedAt: input.finishedAt,
      type: input.type,
      winnerTeam: input.winnerTeam,
      scoreA: input.scoreA,
      scoreB: input.scoreB,
      roundsPlayed: input.roundsPlayed,
      leagueId: input.leagueId || null,
      tournamentId: input.tournamentId || null,
      detailsJson: input.details ? JSON.stringify(input.details) : null,
    });
    inserted = res.changes > 0;
    if (!inserted) return; // déjà inséré (race concurrente) — on ne re-insère pas les players
    for (const p of input.players) {
      insertPlayer.run({
        matchId: id,
        seat: p.seat,
        name: p.name,
        nameLower: p.name.toLowerCase(),
        isAi: p.isAi ? 1 : 0,
      });
    }
  });
  tx();

  // Activité ligue : seulement si on vient d'insérer effectivement le match
  // (évite de re-logger une activité pour un POST dupliqué).
  if (inserted && input.leagueId && input.type !== "irl") {
    const anyAi = input.players.some((p) => p.isAi);
    if (!anyAi) {
      try {
        const { logActivity } = require("./leagueActivity");
        const names = input.players.map((p) => p.name);
        logActivity(input.leagueId, "match_played", {
          data: {
            matchId: id,
            players: names,
            winnerTeam: input.winnerTeam,
            scoreA: input.scoreA,
            scoreB: input.scoreB,
          },
        });
      } catch (e: any) {
        logger.warn({ matchId: id, err: e?.message }, "[matches] failed to log league activity");
      }
    }
  }

  return getMatch(id)!;
}

export function getMatch(id: string): RecordedMatch | null {
  const row = selectMatchById.get(id) as any;
  if (!row) return null;
  const players = (selectPlayersByMatch.all(id) as any[]).map((p) => ({
    seat: p.seat,
    name: p.name,
    isAi: !!p.isAi,
  }));
  return {
    id: row.id,
    finishedAt: row.finished_at,
    type: row.type,
    winnerTeam: row.winner_team,
    scoreA: row.score_a,
    scoreB: row.score_b,
    roundsPlayed: row.rounds_played,
    leagueId: row.league_id || undefined,
    tournamentId: row.tournament_id || undefined,
    details: row.details_json ? JSON.parse(row.details_json) : undefined,
    players,
  };
}

export function listMatchesByPlayer(name: string, limit = 50): RecordedMatch[] {
  const rows = selectMatchesByPlayer.all(name.toLowerCase(), limit) as any[];
  return rows.map((row) => {
    const players = (selectPlayersByMatch.all(row.id) as any[]).map((p) => ({
      seat: p.seat,
      name: p.name,
      isAi: !!p.isAi,
    }));
    return {
      id: row.id,
      finishedAt: row.finished_at,
      type: row.type,
      winnerTeam: row.winner_team,
      scoreA: row.score_a,
      scoreB: row.score_b,
      roundsPlayed: row.rounds_played,
      leagueId: row.league_id || undefined,
      tournamentId: row.tournament_id || undefined,
      details: row.details_json ? JSON.parse(row.details_json) : undefined,
      players,
    };
  });
}

// ─── Classements ─────────────────────────────────────────────────

export interface PlayerStat {
  name: string;
  games: number;
  wins: number;
  losses: number;
  ratio: number;
  pointsFor: number;       // total des scores marqués (brut)
  pointsAgainst: number;
  classementPoints: number; // 3 × victoires − 1 × défaites
}

export interface PairStat {
  names: [string, string];
  games: number;
  wins: number;
  losses: number;
  ratio: number;
  pointsFor: number;
  pointsAgainst: number;
  classementPoints: number;
}

// Les IA et les parties non 100% humaines n'entrent pas en compte pour le classement.
const SELECT_HUMAN_MATCHES_BASE = `
  SELECT m.*,
    (SELECT COUNT(*) FROM match_players WHERE match_id = m.id AND is_ai = 1) AS ai_count,
    (SELECT COUNT(*) FROM match_players WHERE match_id = m.id) AS total_players
  FROM matches m
  WHERE m.type != 'irl'
`;

type ScopeFilter =
  | { scope: "global" }
  | { scope: "league"; leagueId: string }
  | { scope: "friends"; names: string[] };

function matchesForScope(filter: ScopeFilter): any[] {
  let sql = SELECT_HUMAN_MATCHES_BASE;
  const params: any[] = [];
  if (filter.scope === "league") {
    sql += ` AND m.league_id = ?`;
    params.push(filter.leagueId);
  }
  // Rows with all 4 players human
  const rows = db.prepare(sql).all(...params) as any[];
  const fullHuman = rows.filter((r) => r.ai_count === 0 && r.total_players === 4);

  if (filter.scope === "friends") {
    const allowed = new Set(filter.names.map((n) => n.toLowerCase()));
    return fullHuman.filter((r) => {
      const players = selectPlayersByMatch.all(r.id) as any[];
      return players.every((p) => allowed.has(p.name.toLowerCase()));
    });
  }
  return fullHuman;
}

export function individualRanking(filter: ScopeFilter): PlayerStat[] {
  const matches = matchesForScope(filter);
  const byName = new Map<string, PlayerStat>();
  for (const m of matches) {
    const players = selectPlayersByMatch.all(m.id) as any[];
    for (const p of players) {
      const key = p.name.toLowerCase();
      const s = byName.get(key) ?? {
        name: p.name, games: 0, wins: 0, losses: 0, ratio: 0,
        pointsFor: 0, pointsAgainst: 0, classementPoints: 0,
      };
      s.games++;
      const onTeamA = p.seat % 2 === 0;
      const won = (m.winner_team === "A" && onTeamA) || (m.winner_team === "B" && !onTeamA);
      if (won) s.wins++; else s.losses++;
      if (onTeamA) { s.pointsFor += m.score_a; s.pointsAgainst += m.score_b; }
      else { s.pointsFor += m.score_b; s.pointsAgainst += m.score_a; }
      byName.set(key, s);
    }
  }
  const arr = Array.from(byName.values()).map((s) => ({
    ...s,
    ratio: s.games ? Math.round((s.wins / s.games) * 100) : 0,
    classementPoints: s.wins * 3 - s.losses,
  }));
  // Tri : classementPoints desc, puis pointsFor (cumul brut) desc, puis ratio
  arr.sort(
    (a, b) =>
      b.classementPoints - a.classementPoints ||
      b.pointsFor - a.pointsFor ||
      b.ratio - a.ratio,
  );
  return arr;
}

export function pairRanking(filter: ScopeFilter): PairStat[] {
  const matches = matchesForScope(filter);
  const byPair = new Map<string, PairStat>();
  const keyOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`).toLowerCase();
  for (const m of matches) {
    const players = selectPlayersByMatch.all(m.id) as any[];
    const nameBySeat: Record<number, string> = {};
    for (const p of players) nameBySeat[p.seat] = p.name;
    const pairA = [nameBySeat[0], nameBySeat[2]];
    const pairB = [nameBySeat[1], nameBySeat[3]];
    if (!pairA[0] || !pairA[1] || !pairB[0] || !pairB[1]) continue;

    const apply = (names: [string, string], won: boolean, forPts: number, againstPts: number) => {
      const k = keyOf(names[0], names[1]);
      const s = byPair.get(k) ?? {
        names, games: 0, wins: 0, losses: 0, ratio: 0,
        pointsFor: 0, pointsAgainst: 0, classementPoints: 0,
      };
      s.games++;
      if (won) s.wins++; else s.losses++;
      s.pointsFor += forPts;
      s.pointsAgainst += againstPts;
      byPair.set(k, s);
    };
    const aWon = m.winner_team === "A";
    apply([pairA[0], pairA[1]], aWon, m.score_a, m.score_b);
    apply([pairB[0], pairB[1]], !aWon, m.score_b, m.score_a);
  }
  const arr = Array.from(byPair.values()).map((s) => ({
    ...s,
    ratio: s.games ? Math.round((s.wins / s.games) * 100) : 0,
    classementPoints: s.wins * 3 - s.losses,
  }));
  arr.sort(
    (a, b) =>
      b.classementPoints - a.classementPoints ||
      b.pointsFor - a.pointsFor ||
      b.ratio - a.ratio,
  );
  return arr;
}
