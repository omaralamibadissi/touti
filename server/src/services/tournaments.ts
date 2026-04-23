// Service tournois — CRUD + génération bracket/round-robin + enregistrement
// des résultats avec avancée automatique du bracket.

import { db } from "../db";

export type TournamentFormat = "online" | "irl";
export type TournamentMode = "classique" | "championnat";
export type PairingMode = "random" | "chosen";
export type TournamentStatus = "open" | "full" | "started" | "finished";

export interface TournamentPlayer {
  name: string;
  partnerName?: string;
  joinedAt: number;
}

export interface TournamentPair {
  id: string;
  names: [string, string];
  wins: number;
  losses: number;
  points: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  pairAId: string;
  pairBId: string;
  roomCode: string;
  status: "pending" | "playing" | "finished";
  winnerPairId?: string;
  scoreA?: number;
  scoreB?: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Tournament {
  id: string;
  code: string;
  name: string;
  format: TournamentFormat;
  mode: TournamentMode;
  pairingMode: PairingMode;
  createdAt: number;
  createdBy: string;
  maxPlayers: number;
  status: TournamentStatus;
  startedAt?: number;
  leagueId?: string;
  leagueName?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;
  players: TournamentPlayer[];
  pairs: TournamentPair[];
  matches: TournamentMatch[];
}

// ─── Helpers ────────────────────────────────────────────────────

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Prepared statements ───────────────────────────────────────

const insertTournament = db.prepare(`
  INSERT INTO tournaments
    (id, code, name, format, mode, pairing_mode, created_at, created_by,
     max_players, status, league_id, league_name, date, time, duration, location, tagline)
  VALUES
    (@id, @code, @name, @format, @mode, @pairingMode, @createdAt, @createdBy,
     @maxPlayers, 'open', @leagueId, @leagueName, @date, @time, @duration, @location, @tagline)
`);

const selectTournamentById = db.prepare(`SELECT * FROM tournaments WHERE id = ?`);
const selectTournamentByCode = db.prepare(`SELECT * FROM tournaments WHERE code = ?`);
const selectMatchByCode = db.prepare(`
  SELECT * FROM tournament_matches WHERE room_code = ?
`);
const selectPlayers = db.prepare(`
  SELECT name, partner_name AS partnerName, joined_at AS joinedAt
  FROM tournament_players WHERE tournament_id = ? ORDER BY joined_at ASC
`);
const selectPairs = db.prepare(`
  SELECT pair_id AS id, name_a, name_b, wins, losses, points
  FROM tournament_pairs WHERE tournament_id = ?
`);
const selectMatches = db.prepare(`
  SELECT match_id AS id, round, pair_a_id AS pairAId, pair_b_id AS pairBId,
    room_code AS roomCode, status, winner_pair_id AS winnerPairId,
    score_a AS scoreA, score_b AS scoreB,
    started_at AS startedAt, finished_at AS finishedAt
  FROM tournament_matches WHERE tournament_id = ? ORDER BY round, match_id
`);

const insertPlayer = db.prepare(`
  INSERT OR IGNORE INTO tournament_players (tournament_id, name, name_lower, partner_name, joined_at)
  VALUES (?, ?, ?, ?, ?)
`);

const deleteTournament = db.prepare(`DELETE FROM tournaments WHERE id = ?`);

const insertPair = db.prepare(`
  INSERT OR REPLACE INTO tournament_pairs
    (tournament_id, pair_id, name_a, name_b, wins, losses, points)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMatch = db.prepare(`
  INSERT OR REPLACE INTO tournament_matches
    (tournament_id, match_id, round, pair_a_id, pair_b_id, room_code, status,
     winner_pair_id, score_a, score_b, started_at, finished_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateMatchResult = db.prepare(`
  UPDATE tournament_matches
  SET status = 'finished', winner_pair_id = ?, score_a = ?, score_b = ?, finished_at = ?
  WHERE tournament_id = ? AND match_id = ?
`);

const updatePairStats = db.prepare(`
  UPDATE tournament_pairs
  SET wins = wins + ?, losses = losses + ?, points = points + ?
  WHERE tournament_id = ? AND pair_id = ?
`);

const updateTournamentStatus = db.prepare(`
  UPDATE tournaments SET status = ?, started_at = COALESCE(started_at, ?) WHERE id = ?
`);

const selectMyTournaments = db.prepare(`
  SELECT DISTINCT t.* FROM tournaments t
  LEFT JOIN tournament_players p ON p.tournament_id = t.id
  WHERE t.created_by = ? OR p.name_lower = ?
  ORDER BY t.created_at DESC
`);

// ─── Hydration ─────────────────────────────────────────────────

function rowToTournament(row: any): Tournament {
  const id = row.id;
  const players = selectPlayers.all(id) as any[];
  const pairsRaw = selectPairs.all(id) as any[];
  const matches = selectMatches.all(id) as any[];
  return {
    id,
    code: row.code,
    name: row.name,
    format: row.format,
    mode: row.mode,
    pairingMode: row.pairing_mode,
    createdAt: row.created_at,
    createdBy: row.created_by,
    maxPlayers: row.max_players,
    status: row.status,
    startedAt: row.started_at || undefined,
    leagueId: row.league_id || undefined,
    leagueName: row.league_name || undefined,
    date: row.date || undefined,
    time: row.time || undefined,
    duration: row.duration || undefined,
    location: row.location || undefined,
    tagline: row.tagline || undefined,
    players: players.map((p) => ({
      name: p.name,
      partnerName: p.partnerName || undefined,
      joinedAt: p.joinedAt,
    })),
    pairs: pairsRaw.map((p) => ({
      id: p.id,
      names: [p.name_a, p.name_b] as [string, string],
      wins: p.wins,
      losses: p.losses,
      points: p.points,
    })),
    matches: matches.map((m) => ({
      ...m,
      winnerPairId: m.winnerPairId || undefined,
      scoreA: m.scoreA ?? undefined,
      scoreB: m.scoreB ?? undefined,
      startedAt: m.startedAt ?? undefined,
      finishedAt: m.finishedAt ?? undefined,
    })),
  };
}

// ─── API publique ──────────────────────────────────────────────

export function createTournament(input: {
  name: string;
  createdBy: string;
  format: TournamentFormat;
  mode: TournamentMode;
  pairingMode: PairingMode;
  maxPlayers: number;
  leagueId?: string;
  leagueName?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;
}): Tournament {
  if (!input.name || input.name.trim().length < 2) throw new Error("Nom trop court");
  if (input.maxPlayers < 4 || input.maxPlayers % 4 !== 0) throw new Error("maxPlayers doit être un multiple de 4");

  let code = randomCode();
  while (selectTournamentByCode.get(code)) code = randomCode();

  const id = randomId();
  const now = Date.now();

  const tx = db.transaction(() => {
    insertTournament.run({
      id,
      code,
      name: input.name.trim(),
      format: input.format,
      mode: input.mode,
      pairingMode: input.pairingMode,
      createdAt: now,
      createdBy: input.createdBy,
      maxPlayers: input.maxPlayers,
      leagueId: input.leagueId || null,
      leagueName: input.leagueName || null,
      date: input.date || null,
      time: input.time || null,
      duration: input.duration || null,
      location: input.location || null,
      tagline: input.tagline || null,
    });
    // Auto-inscrit le créateur
    insertPlayer.run(id, input.createdBy, input.createdBy.toLowerCase(), null, now);
  });
  tx();

  // Log dans le fil d'activité de la ligue si applicable
  if (input.leagueId) {
    try {
      // Import dynamique pour éviter les cycles — leagueActivity dépend de leagues
      const { logActivity } = require("./leagueActivity");
      logActivity(input.leagueId, "tournament_created", {
        actorName: input.createdBy,
        data: { tournamentId: id, name: input.name, mode: input.mode },
      });
    } catch {}
  }

  return getTournament(id)!;
}

export function getTournament(id: string): Tournament | null {
  const row = selectTournamentById.get(id) as any;
  return row ? rowToTournament(row) : null;
}

export function getTournamentByCode(code: string): Tournament | null {
  const row = selectTournamentByCode.get(code.toUpperCase().trim()) as any;
  return row ? rowToTournament(row) : null;
}

export function getTournamentByMatchCode(roomCode: string): {
  tournament: Tournament;
  matchId: string;
} | null {
  const row = selectMatchByCode.get(roomCode) as any;
  if (!row) return null;
  const t = getTournament(row.tournament_id);
  if (!t) return null;
  return { tournament: t, matchId: row.match_id };
}

export function joinTournament(
  code: string,
  name: string,
  partnerName?: string,
): Tournament {
  const t = getTournamentByCode(code);
  if (!t) throw new Error("Code tournoi inconnu");
  if (t.status !== "open" && t.status !== "full") throw new Error("Tournoi déjà démarré");
  if (t.players.length >= t.maxPlayers) throw new Error("Tournoi complet");
  if (t.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return t;

  insertPlayer.run(
    t.id,
    name,
    name.toLowerCase(),
    partnerName || null,
    Date.now(),
  );

  // Re-check full
  const updated = getTournament(t.id)!;
  if (updated.players.length >= updated.maxPlayers) {
    db.prepare("UPDATE tournaments SET status = 'full' WHERE id = ?").run(t.id);
    return getTournament(t.id)!;
  }
  return updated;
}

export function listMyTournaments(name: string): Tournament[] {
  const rows = selectMyTournaments.all(name, name.toLowerCase()) as any[];
  return rows.map(rowToTournament);
}

export function removeTournament(id: string, askedBy: string): void {
  const t = getTournament(id);
  if (!t) return;
  if (t.createdBy.toLowerCase() !== askedBy.toLowerCase()) {
    throw new Error("Seul l'admin peut supprimer ce tournoi");
  }
  deleteTournament.run(id);
}

// ─── Génération paires + matchs ───────────────────────────────

function buildPairs(t: Tournament): TournamentPair[] {
  if (t.pairingMode === "chosen") {
    const seen = new Set<string>();
    const out: TournamentPair[] = [];
    for (const p of t.players) {
      if (seen.has(p.name)) continue;
      const partner = p.partnerName
        ? t.players.find((q) => q.name === p.partnerName && !seen.has(q.name))
        : null;
      if (partner) {
        seen.add(p.name);
        seen.add(partner.name);
        out.push({
          id: `pair-${out.length + 1}`,
          names: [p.name, partner.name],
          wins: 0, losses: 0, points: 0,
        });
      }
    }
    // Non appariés → paires séquentielles
    const unpaired = t.players.filter((p) => !seen.has(p.name));
    for (let i = 0; i < unpaired.length; i += 2) {
      if (!unpaired[i + 1]) break;
      out.push({
        id: `pair-${out.length + 1}`,
        names: [unpaired[i].name, unpaired[i + 1].name],
        wins: 0, losses: 0, points: 0,
      });
    }
    return out;
  }
  const names = shuffle(t.players.map((p) => p.name));
  const pairs: TournamentPair[] = [];
  for (let i = 0; i < names.length; i += 2) {
    if (!names[i + 1]) break;
    pairs.push({
      id: `pair-${pairs.length + 1}`,
      names: [names[i], names[i + 1]],
      wins: 0, losses: 0, points: 0,
    });
  }
  return pairs;
}

function buildMatches(t: Tournament, pairs: TournamentPair[]): TournamentMatch[] {
  const out: TournamentMatch[] = [];
  if (t.mode === "championnat") {
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        out.push({
          id: `m${out.length + 1}`,
          round: 1,
          pairAId: pairs[i].id,
          pairBId: pairs[j].id,
          roomCode: randomCode(4),
          status: "pending",
        });
      }
    }
  } else {
    // Classique : round 1 = apparie 2 par 2 avec gestion des byes si le
    // nombre de paires n'est pas une puissance de 2.
    //   ex: 6 paires → P=8 → 2 byes + 2 matchs réels au round 1
    //   Les `byeCount` premières paires passent directement au round 2.
    const N = pairs.length;
    const P = Math.pow(2, Math.ceil(Math.log2(Math.max(2, N))));
    const byeCount = P - N;
    for (let i = 0; i < byeCount; i++) {
      out.push({
        id: `m${out.length + 1}-r1`,
        round: 1,
        pairAId: pairs[i].id,
        pairBId: "__BYE__",
        roomCode: "",
        status: "finished",
        winnerPairId: pairs[i].id,
        scoreA: 0,
        scoreB: 0,
      });
    }
    for (let i = byeCount; i < N; i += 2) {
      if (!pairs[i + 1]) break;
      out.push({
        id: `m${out.length + 1}-r1`,
        round: 1,
        pairAId: pairs[i].id,
        pairBId: pairs[i + 1].id,
        roomCode: randomCode(4),
        status: "pending",
      });
    }
  }
  return out;
}

export function startTournament(id: string, askedBy: string): Tournament {
  const t = getTournament(id);
  if (!t) throw new Error("Tournoi introuvable");
  if (t.createdBy.toLowerCase() !== askedBy.toLowerCase()) {
    throw new Error("Seul l'admin peut lancer le tournoi");
  }
  if (t.status === "started" || t.status === "finished") return t;
  if (t.players.length < t.maxPlayers) {
    throw new Error(`Il faut ${t.maxPlayers} joueurs pour lancer, ${t.players.length} inscrits`);
  }

  const pairs = buildPairs(t);
  if (pairs.length < 2) throw new Error("Pas assez de paires");
  const matches = buildMatches(t, pairs);

  const tx = db.transaction(() => {
    for (const p of pairs) {
      insertPair.run(id, p.id, p.names[0], p.names[1], 0, 0, 0);
    }
    for (const m of matches) {
      insertMatch.run(
        id, m.id, m.round, m.pairAId, m.pairBId, m.roomCode, m.status,
        m.winnerPairId ?? null,
        m.scoreA ?? null, m.scoreB ?? null,
        null,
        m.status === "finished" ? Date.now() : null,
      );
    }
    updateTournamentStatus.run("started", Date.now(), id);
  });
  tx();

  return getTournament(id)!;
}

export function recordMatchResult(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Tournament {
  const t = getTournament(tournamentId);
  if (!t) throw new Error("Tournoi introuvable");
  const m = t.matches.find((x) => x.id === matchId);
  if (!m) throw new Error("Match introuvable");
  if (m.status === "finished") return t; // idempotent

  const winnerPairId = scoreA > scoreB ? m.pairAId : m.pairBId;

  const tx = db.transaction(() => {
    updateMatchResult.run(winnerPairId, scoreA, scoreB, Date.now(), tournamentId, matchId);

    // Mise à jour des stats des 2 paires
    const winA = winnerPairId === m.pairAId;
    updatePairStats.run(
      winA ? 1 : 0,     // wins
      winA ? 0 : 1,     // losses
      scoreA,           // points
      tournamentId, m.pairAId,
    );
    updatePairStats.run(
      winA ? 0 : 1,
      winA ? 1 : 0,
      scoreB,
      tournamentId, m.pairBId,
    );

    // Mode classique : générer le round suivant si tous les matchs du round fini
    if (t.mode === "classique") {
      // Re-fetch matches pour avoir l'état à jour
      const all = selectMatches.all(tournamentId) as any[];
      const currentRoundMatches = all.filter((x) => x.round === m.round);
      // Marque le match actuel comme finished dans notre liste locale car selectMatches
      // retourne ce qui vient d'être update (on est dans la même transaction SQLite)
      const allRoundFinished = currentRoundMatches.every(
        (x) => x.status === "finished" || x.match_id === matchId,
      );
      if (allRoundFinished) {
        const winners = currentRoundMatches.map((x) =>
          x.match_id === matchId ? winnerPairId : x.winner_pair_id,
        ).filter(Boolean);
        if (winners.length >= 2) {
          const nextRound = m.round + 1;
          for (let i = 0; i < winners.length; i += 2) {
            if (!winners[i + 1]) break;
            const nextMatchId = `m${all.length + 1}-r${nextRound}`;
            insertMatch.run(
              tournamentId, nextMatchId, nextRound,
              winners[i]!, winners[i + 1]!,
              randomCode(4), "pending",
              null, null, null, null, null,
            );
          }
        }
      }
    }

    // Si tous les matchs sont finis → tournoi fini
    const all = selectMatches.all(tournamentId) as any[];
    const noMorePending = all.every(
      (x) => x.status === "finished" || x.match_id === matchId,
    );
    if (noMorePending) {
      updateTournamentStatus.run("finished", null, tournamentId);
    }
  });
  tx();

  return getTournament(tournamentId)!;
}
