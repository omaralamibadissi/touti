// Feuilles de score IRL — synchronisées serveur par owner.
// Cache AsyncStorage pour affichage offline immédiat au démarrage.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  apiListSheets, apiCreateSheet, apiUpdateSheet,
  apiAddRound, apiResetSheet, apiDeleteSheet,
  type ScoreSheetApi, type ScoreRoundApi,
} from "../net/scoreSheetsApi";

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
  dealerIdx: number;
  status: "in-progress" | "finished";
  winner: Team | null;
}

interface ScoreSheetState {
  hydrated: boolean;
  sheets: ScoreSheet[];
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  create: (names: [string, string, string, string]) => Promise<ScoreSheet>;
  get: (id: string) => ScoreSheet | undefined;
  updateSheet: (id: string, patch: Partial<ScoreSheet>) => Promise<void>;
  addRound: (id: string, round: ScoreRound) => Promise<void>;
  reset: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

// Clé de cache local — scopée par username pour éviter toute fuite de
// feuilles de score IRL entre comptes sur un même téléphone partagé.
const STORAGE_KEY_PREFIX = "touti.scoreSheets.v3";
function storageKey(): string {
  // Lazy require pour éviter les cycles d'import au chargement du module
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuthStore } = require("./authStore");
    const u = useAuthStore.getState().user?.username;
    return u ? `${STORAGE_KEY_PREFIX}.${u}` : STORAGE_KEY_PREFIX;
  } catch {
    return STORAGE_KEY_PREFIX;
  }
}

function mapApi(s: ScoreSheetApi): ScoreSheet {
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    names: s.names,
    rounds: s.rounds.map(mapRound),
    dealerIdx: s.dealerIdx,
    status: s.status,
    winner: s.winner,
  };
}

function mapRound(r: ScoreRoundApi): ScoreRound {
  return {
    id: r.id,
    num: r.num,
    dealer: r.dealer,
    male: r.male,
    buyerTeam: r.buyerTeam,
    buyer: r.buyer,
    bid: r.bid,
    success: r.success,
    delta: r.delta,
  };
}

async function persist(sheets: ScoreSheet[]) {
  await AsyncStorage.setItem(storageKey(), JSON.stringify(sheets));
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
      const raw = await AsyncStorage.getItem(storageKey());
      const sheets: ScoreSheet[] = raw ? JSON.parse(raw) : [];
      set({ sheets, hydrated: true });
      get().refresh().catch(() => {});
    } catch {
      set({ hydrated: true });
    }
  },

  refresh: async () => {
    try {
      const remote = await apiListSheets();
      const mapped = remote.map(mapApi);
      await persist(mapped);
      set({ sheets: mapped });
    } catch {
      // Silencieux (offline OK, cache local reste valide)
    }
  },

  create: async (names) => {
    const remote = await apiCreateSheet(names);
    const sheet = mapApi(remote);
    const sheets = [sheet, ...get().sheets.filter((s) => s.id !== sheet.id)];
    await persist(sheets);
    set({ sheets });
    return sheet;
  },

  get: (id) => get().sheets.find((s) => s.id === id),

  updateSheet: async (id, patch) => {
    // Optimiste : on update le local immédiatement, puis on pousse au serveur
    const sheets = get().sheets.map((s) =>
      s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s,
    );
    await persist(sheets);
    set({ sheets });
    try {
      await apiUpdateSheet(id, {
        names: patch.names,
        dealerIdx: patch.dealerIdx,
        status: patch.status,
        winner: patch.winner,
      });
    } catch {}
  },

  addRound: async (id, round) => {
    // Calcule le nouvel état localement pour l'optimiste
    const existing = get().sheets.find((s) => s.id === id);
    if (!existing) return;
    const newRounds = [...existing.rounds, round];
    const newWinner = winnerOf(newRounds);
    const newStatus: ScoreSheet["status"] = newWinner ? "finished" : "in-progress";

    const sheets = get().sheets.map((s) =>
      s.id === id
        ? { ...s, rounds: newRounds, winner: newWinner, status: newStatus, updatedAt: Date.now() }
        : s,
    );
    await persist(sheets);
    set({ sheets });

    // Push au serveur (best-effort)
    try {
      await apiAddRound(id, round, newWinner, newStatus);
    } catch {}
  },

  reset: async (id) => {
    const sheets = get().sheets.map((s) =>
      s.id === id
        ? { ...s, rounds: [], dealerIdx: 0, winner: null, status: "in-progress" as const, updatedAt: Date.now() }
        : s,
    );
    await persist(sheets);
    set({ sheets });
    try { await apiResetSheet(id); } catch {}
  },

  remove: async (id) => {
    const sheets = get().sheets.filter((s) => s.id !== id);
    await persist(sheets);
    set({ sheets });
    try { await apiDeleteSheet(id); } catch {}
  },

  clear: async () => {
    // Nettoie à la fois l'ancienne clé non-scopée et celle du user courant.
    await AsyncStorage.removeItem(storageKey()).catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY_PREFIX).catch(() => {});
    set({ sheets: [] });
  },
}));

// Helpers exportés (utilisés par UI)
export function totalsOf(rounds: ScoreRound[]) {
  return totalOf(rounds);
}
