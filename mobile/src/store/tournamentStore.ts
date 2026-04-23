// Store tournois — sync avec le serveur REST.
// Cache local (AsyncStorage) pour affichage offline.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  apiCreateTournament, apiJoinTournament, apiListMyTournaments,
  apiGetTournament, apiStartTournament, apiRecordTournamentMatchResult,
  apiDeleteTournament, type TournamentApi,
} from "../net/tournamentsApi";

export type TournamentFormat = "online" | "irl";
export type TournamentMode = "classique" | "championnat";
export type PairingMode = "random" | "chosen";

export interface TournamentPlayer {
  id: string;
  name: string;
  partnerName?: string;
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
  format: TournamentFormat;
  mode: TournamentMode;
  pairingMode: PairingMode;
  name: string;
  createdAt: number;
  createdBy: string;
  maxPlayers: number;
  players: TournamentPlayer[];
  leagueId?: string;
  leagueName?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;
  status: "open" | "full" | "started" | "finished";
  pairs?: TournamentPair[];
  matches?: TournamentMatch[];
  startedAt?: number;
}

function mapApi(t: TournamentApi): Tournament {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    format: t.format,
    mode: t.mode,
    pairingMode: t.pairingMode,
    createdAt: t.createdAt,
    createdBy: t.createdBy,
    maxPlayers: t.maxPlayers,
    leagueId: t.leagueId,
    leagueName: t.leagueName,
    date: t.date,
    time: t.time,
    duration: t.duration,
    location: t.location,
    tagline: t.tagline,
    status: t.status,
    startedAt: t.startedAt,
    players: t.players.map((p) => ({
      id: p.name,
      name: p.name,
      partnerName: p.partnerName,
    })),
    pairs: t.pairs,
    matches: t.matches,
  };
}

interface TournamentState {
  hydrated: boolean;
  mine: Tournament[];
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshOne: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  create: (t: {
    adminName: string;
    name: string;
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
  }) => Promise<Tournament>;
  joinByCode: (code: string, playerName: string, partnerName?: string) => Promise<Tournament | null>;
  leave: (id: string, playerId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  start: (id: string) => Promise<Tournament | null>;
  recordResult: (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => Promise<void>;
}

const STORAGE_KEY = "touti.tournaments.v3";

async function persist(mine: Tournament[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mine));
}

// Promesse en cours pour hydrate() — garde anti-double-appel : si deux
// écrans montent en même temps et appellent hydrate() concurremment, on
// retourne la même promesse pour éviter une race sur AsyncStorage.
let hydratePromise: Promise<void> | null = null;

export const useTournamentStore = create<TournamentState>((set, get) => ({
  hydrated: false,
  mine: [],

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;
    if (get().hydrated) return;
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const mine: Tournament[] = raw ? JSON.parse(raw) : [];
        set({ mine, hydrated: true });
        try {
          const remote = await apiListMyTournaments();
          const mapped = remote.map(mapApi);
          await persist(mapped);
          set({ mine: mapped });
        } catch {}
      } catch {
        set({ hydrated: true });
      } finally {
        hydratePromise = null;
      }
    })();
    return hydratePromise;
  },

  refresh: async () => {
    try {
      const remote = await apiListMyTournaments();
      const mapped = remote.map(mapApi);
      await persist(mapped);
      set({ mine: mapped });
    } catch {}
  },

  refreshOne: async (id) => {
    try {
      const remote = await apiGetTournament(id);
      const mapped = mapApi(remote);
      const exists = get().mine.some((t) => t.id === id);
      const next = exists
        ? get().mine.map((t) => (t.id === id ? mapped : t))
        : [mapped, ...get().mine];
      await persist(next);
      set({ mine: next });
    } catch {}
  },

  create: async (input) => {
    const remote = await apiCreateTournament(input);
    const t = mapApi(remote);
    const next = [t, ...get().mine];
    await persist(next);
    set({ mine: next });
    return t;
  },

  joinByCode: async (code, _playerName, partnerName) => {
    try {
      const remote = await apiJoinTournament(code, partnerName);
      const t = mapApi(remote);
      const exists = get().mine.some((x) => x.id === t.id);
      const next = exists
        ? get().mine.map((x) => (x.id === t.id ? t : x))
        : [t, ...get().mine];
      await persist(next);
      set({ mine: next });
      return t;
    } catch {
      return null;
    }
  },

  leave: async (_id, _playerId) => {
    // Pas d'endpoint leave côté serveur pour l'instant.
    // À implémenter si besoin.
  },

  remove: async (id) => {
    try { await apiDeleteTournament(id); } catch {}
    const next = get().mine.filter((t) => t.id !== id);
    await persist(next);
    set({ mine: next });
  },

  start: async (id) => {
    try {
      const remote = await apiStartTournament(id);
      const t = mapApi(remote);
      const next = get().mine.map((x) => (x.id === id ? t : x));
      await persist(next);
      set({ mine: next });
      return t;
    } catch {
      return null;
    }
  },

  recordResult: async (tournamentId, matchId, scoreA, scoreB) => {
    try {
      const remote = await apiRecordTournamentMatchResult(tournamentId, matchId, scoreA, scoreB);
      const t = mapApi(remote);
      const next = get().mine.map((x) => (x.id === tournamentId ? t : x));
      await persist(next);
      set({ mine: next });
    } catch {}
  },

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ mine: [] });
  },
}));
