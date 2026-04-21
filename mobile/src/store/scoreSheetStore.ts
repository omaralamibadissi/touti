import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

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
  createdAt: number;
  updatedAt: number;
  names: [string, string, string, string];
  rounds: ScoreRound[];
  dealerIdx: number;     // mémorise qui distribue la manche suivante
  status: "in-progress" | "finished";
  winner: Team | null;
}

interface ScoreSheetState {
  hydrated: boolean;
  sheets: ScoreSheet[];
  hydrate: () => Promise<void>;
  create: (names: [string, string, string, string]) => Promise<ScoreSheet>;
  get: (id: string) => ScoreSheet | undefined;
  updateSheet: (id: string, patch: Partial<ScoreSheet>) => Promise<void>;
  addRound: (id: string, round: ScoreRound) => Promise<void>;
  reset: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = "touti.scoreSheets.v1";

async function persist(sheets: ScoreSheet[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
}

function totalOf(rounds: ScoreRound[]): { A: number; B: number } {
  return rounds.reduce(
    (acc, r) => ({ A: acc.A + r.delta.A, B: acc.B + r.delta.B }),
    { A: 0, B: 0 },
  );
}

function winnerOf(rounds: ScoreRound[]): Team | null {
  const { A, B } = totalOf(rounds);
  if (A >= 600) return "A";
  if (B >= 600) return "B";
  return null;
}

export const useScoreSheetStore = create<ScoreSheetState>((set, get) => ({
  hydrated: false,
  sheets: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const sheets: ScoreSheet[] = raw ? JSON.parse(raw) : [];
      set({ sheets, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  create: async (names) => {
    const sheet: ScoreSheet = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      names,
      rounds: [],
      dealerIdx: 0,
      status: "in-progress",
      winner: null,
    };
    const sheets = [sheet, ...get().sheets];
    await persist(sheets);
    set({ sheets });
    return sheet;
  },

  get: (id) => get().sheets.find((s) => s.id === id),

  updateSheet: async (id, patch) => {
    const sheets = get().sheets.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
    );
    await persist(sheets);
    set({ sheets });
  },

  addRound: async (id, round) => {
    const sheets = get().sheets.map((s) => {
      if (s.id !== id) return s;
      const rounds = [...s.rounds, round];
      const winner = winnerOf(rounds);
      return {
        ...s,
        rounds,
        updatedAt: Date.now(),
        winner,
        status: (winner ? "finished" : "in-progress") as ScoreSheet["status"],
      };
    });
    await persist(sheets);
    set({ sheets });
  },

  reset: async (id) => {
    const sheets = get().sheets.map((s) =>
      s.id === id
        ? { ...s, rounds: [], dealerIdx: 0, winner: null, status: "in-progress" as const, updatedAt: Date.now() }
        : s,
    );
    await persist(sheets);
    set({ sheets });
  },

  remove: async (id) => {
    const sheets = get().sheets.filter((s) => s.id !== id);
    await persist(sheets);
    set({ sheets });
  },
}));

// Helpers exportés
export function totalsOf(rounds: ScoreRound[]) {
  return totalOf(rounds);
}
