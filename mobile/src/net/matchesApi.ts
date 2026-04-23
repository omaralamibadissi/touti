// Client REST vers le serveur matchs + classements.

import type { MatchEntry } from "../store/matchHistoryStore";
import { fetchJson } from "./http";

export interface ApiMatchPlayer { seat: number; name: string; isAi: boolean }
export interface ApiMatch {
  id: string;
  finishedAt: number;
  type: "solo-ai" | "private" | "quick" | "tournament" | "irl";
  winnerTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  roundsPlayed: number;
  leagueId?: string;
  tournamentId?: string;
  players: ApiMatchPlayer[];
  details?: any;
}

export async function apiRecordMatch(m: {
  id?: string;
  finishedAt: number;
  type: ApiMatch["type"];
  winnerTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  roundsPlayed: number;
  leagueId?: string;
  tournamentId?: string;
  players: ApiMatchPlayer[];
  details?: any;
}): Promise<ApiMatch> {
  return fetchJson("/matches", { method: "POST", body: JSON.stringify(m) });
}

export async function apiListMatchesByPlayer(name: string, limit = 50): Promise<ApiMatch[]> {
  return fetchJson(`/matches?player=${encodeURIComponent(name)}&limit=${limit}`);
}

export async function apiGetMatch(id: string): Promise<ApiMatch> {
  return fetchJson(`/matches/${encodeURIComponent(id)}`);
}

export interface ApiPlayerStat {
  name: string;
  games: number; wins: number; losses: number; ratio: number;
  pointsFor: number; pointsAgainst: number;
}
export interface ApiPairStat {
  names: [string, string];
  games: number; wins: number; losses: number; ratio: number;
  pointsFor: number; pointsAgainst: number;
}

export async function apiIndividualRanking(
  scope: "global" | "league" | "friends",
  opts?: { leagueId?: string; friends?: string[] },
): Promise<ApiPlayerStat[]> {
  const params = new URLSearchParams({ scope });
  if (scope === "league" && opts?.leagueId) params.set("leagueId", opts.leagueId);
  if (scope === "friends" && opts?.friends) params.set("friends", opts.friends.join(","));
  return fetchJson(`/leaderboard/individual?${params.toString()}`);
}

export async function apiPairRanking(
  scope: "global" | "league" | "friends",
  opts?: { leagueId?: string; friends?: string[] },
): Promise<ApiPairStat[]> {
  const params = new URLSearchParams({ scope });
  if (scope === "league" && opts?.leagueId) params.set("leagueId", opts.leagueId);
  if (scope === "friends" && opts?.friends) params.set("friends", opts.friends.join(","));
  return fetchJson(`/leaderboard/pairs?${params.toString()}`);
}

// Convertit un MatchEntry (format local) en payload serveur
export function toApiMatch(m: MatchEntry, leagueId?: string, tournamentId?: string): Parameters<typeof apiRecordMatch>[0] {
  return {
    id: m.id,
    finishedAt: m.finishedAt,
    type: m.type as ApiMatch["type"],
    winnerTeam: m.winnerTeam,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    roundsPlayed: m.roundsPlayed,
    leagueId,
    tournamentId,
    players: (m.playerNames || []).slice(0, 4).map((name, seat) => ({
      seat,
      name,
      // Source de vérité : flag fourni par le client au moment de
      // l'enregistrement. Fallback heuristique de nom uniquement pour les
      // anciennes entrées créées avant introduction du champ.
      isAi:
        m.isBotPerSeat && typeof m.isBotPerSeat[seat] === "boolean"
          ? !!m.isBotPerSeat[seat]
          : /^IA\s*\d+$/i.test(name) || /^Bot\s*\d+$/i.test(name),
    })),
    details: m.rounds ? { rounds: m.rounds } : undefined,
  };
}
