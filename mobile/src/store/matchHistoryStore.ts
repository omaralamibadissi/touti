import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { apiRecordMatch, toApiMatch } from "../net/matchesApi";

export type MatchType = "solo-ai" | "private" | "quick" | "tournament" | "irl";

// Un pli joué (4 cartes + gagnant)
export interface TrickDetail {
  entries: { player: number; card: { suit: string; rank: number } }[];
  winner: number;
}

// Snapshot d'une manche dans la partie (pour la vue détaillée + replay)
export interface RoundDetail {
  round: number;
  scoreA: number;            // total cumulé après cette manche
  scoreB: number;
  deltaA: number;            // points marqués pendant cette manche
  deltaB: number;
  bidWinner: number | null;  // siège (0..3) du gagnant des enchères
  bidAmount: number | null;
  bidTeam: "A" | "B" | null;
  trump?: string;            // suit choisi (oros/copas/espadas/bastos)
  tricks?: TrickDetail[];    // replay carte-par-carte (10 plis)
}

export interface MatchEntry {
  id: string;
  type: MatchType;
  finishedAt: number;           // timestamp ms
  playerNames: string[];        // 4 noms
  // Vrai flag bot par siège (longueur 4). Renseigné depuis la partie courante
  // (PLAYERS[seat].human pour les solos, p.isAi côté serveur pour les nets).
  // Optionnel uniquement pour back-compat avec d'anciennes entrées stockées
  // avant introduction du champ — ces anciennes entrées retombent sur une
  // heuristique de nom. Toutes les nouvelles entrées DOIVENT le fournir.
  isBotPerSeat?: boolean[];
  winnerTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  roundsPlayed: number;
  tournamentName?: string;      // si type = tournament
  rounds?: RoundDetail[];       // détail manche par manche (parties app uniquement)
}

interface MatchHistoryState {
  hydrated: boolean;
  matches: MatchEntry[];
  hydrate: () => Promise<void>;
  add: (match: Omit<MatchEntry, "id" | "finishedAt">) => Promise<MatchEntry>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const STORAGE_KEY = "touti.matchHistory.v1";

async function persist(matches: MatchEntry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

export const useMatchHistoryStore = create<MatchHistoryState>((set, get) => ({
  hydrated: false,
  matches: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const matches: MatchEntry[] = raw ? JSON.parse(raw) : [];
      set({ matches, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: async (m) => {
    const entry: MatchEntry = {
      ...m,
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      finishedAt: Date.now(),
    };
    // Cap à 200 parties en cache local. Les parties serveur restent
    // accessibles via l'API de profil, donc pas de perte réelle — juste
    // le cache offline qui est limité.
    const prev = get().matches;
    const merged = [entry, ...prev];
    if (merged.length > 200) {
      console.warn(`[matchHistory] cache local capé à 200, ${merged.length - 200} anciennes parties retirées du cache (toujours sur serveur)`);
    }
    const matches = merged.slice(0, 200);
    await persist(matches);
    set({ matches });

    // Best-effort : on push au serveur pour les parties app (pas IRL).
    // On n'attend pas la réponse — si hors-ligne, silencieux, c'est OK.
    if (entry.type !== "irl") {
      apiRecordMatch(toApiMatch(entry)).catch(() => {});
    }

    return entry;
  },

  remove: async (id) => {
    const matches = get().matches.filter((m) => m.id !== id);
    await persist(matches);
    set({ matches });
  },

  clear: async () => {
    await persist([]);
    set({ matches: [] });
  },
}));
