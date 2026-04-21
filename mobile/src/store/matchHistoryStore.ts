import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type MatchType = "solo-ai" | "private" | "tournament" | "irl";

export interface MatchEntry {
  id: string;
  type: MatchType;
  finishedAt: number;           // timestamp ms
  playerNames: string[];        // 4 noms
  winnerTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  roundsPlayed: number;
  tournamentName?: string;      // si type = tournament
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
    const matches = [entry, ...get().matches].slice(0, 200); // cap à 200
    await persist(matches);
    set({ matches });
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
