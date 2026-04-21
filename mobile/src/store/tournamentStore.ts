import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Format principal : en ligne ou IRL
export type TournamentFormat = "online" | "irl";
// Mode : classique (paires fixes) ou championnat (paires tournantes)
export type TournamentMode = "classique" | "championnat";
// Constitution des paires
export type PairingMode = "random" | "chosen";

export interface TournamentPlayer {
  id: string;
  name: string;
  partnerName?: string; // si pairingMode "chosen"
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
  maxPlayers: number;       // multiple de 4, pas de max
  players: TournamentPlayer[];

  // IRL uniquement
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;

  status: "open" | "full" | "started" | "finished";
}

interface TournamentState {
  hydrated: boolean;
  mine: Tournament[];
  hydrate: () => Promise<void>;
  create: (t: Omit<Tournament, "id" | "code" | "createdAt" | "status" | "players" | "createdBy"> & {
    adminName: string;
  }) => Promise<Tournament>;
  joinByCode: (code: string, playerName: string) => Promise<Tournament | null>;
  leave: (id: string, playerId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const STORAGE_KEY = "touti.tournaments.v2";

async function persist(mine: Tournament[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mine));
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  hydrated: false,
  mine: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const mine: Tournament[] = raw ? JSON.parse(raw) : [];
      set({ mine, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  create: async (input) => {
    const t: Tournament = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      code: randomCode(),
      createdAt: Date.now(),
      createdBy: input.adminName,
      status: "open",
      players: [{ id: "admin", name: input.adminName }],
      format: input.format,
      mode: input.mode,
      pairingMode: input.pairingMode,
      name: input.name,
      maxPlayers: input.maxPlayers,
      date: input.date,
      time: input.time,
      duration: input.duration,
      location: input.location,
      tagline: input.tagline,
    };
    const mine = [t, ...get().mine];
    await persist(mine);
    set({ mine });
    return t;
  },

  joinByCode: async (code, playerName) => {
    const code_ = code.toUpperCase().trim();
    const found = get().mine.find((t) => t.code === code_);
    if (!found) return null;
    if (found.players.some((p) => p.name === playerName)) return found;
    if (found.players.length >= found.maxPlayers) return found;
    const newPlayer: TournamentPlayer = { id: String(Date.now()), name: playerName };
    const updated: Tournament = {
      ...found,
      players: [...found.players, newPlayer],
      status: found.players.length + 1 >= found.maxPlayers ? "full" : "open",
    };
    const mine = get().mine.map((t) => (t.id === found.id ? updated : t));
    await persist(mine);
    set({ mine });
    return updated;
  },

  leave: async (id, playerId) => {
    const mine = get().mine.map((t) =>
      t.id === id ? { ...t, players: t.players.filter((p) => p.id !== playerId) } : t,
    );
    await persist(mine);
    set({ mine });
  },

  remove: async (id) => {
    const mine = get().mine.filter((t) => t.id !== id);
    await persist(mine);
    set({ mine });
  },
}));
