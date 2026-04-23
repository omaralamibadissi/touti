// Client REST vers le serveur tournois.

import { fetchJson } from "./http";

export interface TournamentPlayerApi {
  name: string;
  partnerName?: string;
  joinedAt: number;
}

export interface TournamentPairApi {
  id: string;
  names: [string, string];
  wins: number;
  losses: number;
  points: number;
}

export interface TournamentMatchApi {
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

export interface TournamentApi {
  id: string;
  code: string;
  name: string;
  format: "online" | "irl";
  mode: "classique" | "championnat";
  pairingMode: "random" | "chosen";
  createdAt: number;
  createdBy: string;
  maxPlayers: number;
  status: "open" | "full" | "started" | "finished";
  startedAt?: number;
  leagueId?: string;
  leagueName?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;
  players: TournamentPlayerApi[];
  pairs: TournamentPairApi[];
  matches: TournamentMatchApi[];
}

export function apiCreateTournament(input: {
  name: string;
  format: "online" | "irl";
  mode: "classique" | "championnat";
  pairingMode: "random" | "chosen";
  maxPlayers: number;
  leagueId?: string;
  leagueName?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;
}): Promise<TournamentApi> {
  return fetchJson("/tournaments", { method: "POST", body: JSON.stringify(input) });
}

export function apiJoinTournament(code: string, partnerName?: string): Promise<TournamentApi> {
  return fetchJson("/tournaments/join", {
    method: "POST",
    body: JSON.stringify({ code, partnerName }),
  });
}

export function apiListMyTournaments(): Promise<TournamentApi[]> {
  return fetchJson("/tournaments");
}

export function apiGetTournament(id: string): Promise<TournamentApi> {
  return fetchJson(`/tournaments/${id}`);
}

export function apiGetTournamentByCode(code: string): Promise<TournamentApi> {
  return fetchJson(`/tournaments/by-code/${encodeURIComponent(code.toUpperCase())}`);
}

export function apiStartTournament(id: string): Promise<TournamentApi> {
  return fetchJson(`/tournaments/${id}/start`, { method: "POST" });
}

export function apiRecordTournamentMatchResult(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<TournamentApi> {
  return fetchJson(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
    method: "POST",
    body: JSON.stringify({ scoreA, scoreB }),
  });
}

export function apiDeleteTournament(id: string): Promise<void> {
  return fetchJson(`/tournaments/${id}`, { method: "DELETE" });
}
