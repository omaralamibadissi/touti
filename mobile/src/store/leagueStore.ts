// Store ligues — on sync avec le serveur REST (POST/GET sur /leagues).
// Cache local via AsyncStorage pour un affichage offline des dernières
// données connues. Les mutations vont TOUJOURS au serveur en premier ;
// en cas d'échec réseau, on propage l'erreur.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  apiCreateLeague,
  apiJoinLeague,
  apiLeaveLeague,
  apiListMyLeagues,
  apiGetLeague,
  apiPromoteMember,
  apiDemoteMember,
  apiKickMember,
  apiUpdateLeague,
  apiDeleteLeague,
  type LeagueApi,
} from "../net/leaguesApi";

export interface LeagueMember {
  id: string;
  name: string;
  joinedAt: number;
  role: "admin" | "member";
}

export interface League {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  createdBy: string;
  members: LeagueMember[];
  tagline?: string;
  color?: string;
  photo?: string; // data URL base64 JPEG
}

interface LeagueState {
  hydrated: boolean;
  leagues: League[];
  activeLeagueId: string | null;

  hydrate: (myName?: string) => Promise<void>;
  refresh: (myName: string) => Promise<void>;
  create: (input: {
    name: string;
    createdBy: string;
    tagline?: string;
    color?: string;
  }) => Promise<League>;
  join: (code: string, me: { id: string; name: string }) => Promise<League | null>;
  leave: (leagueId: string, myName: string) => Promise<void>;
  refreshOne: (leagueId: string) => Promise<void>;
  setActive: (leagueId: string | null) => void;
  promote: (leagueId: string, targetName: string) => Promise<void>;
  demote: (leagueId: string, targetName: string) => Promise<void>;
  kick: (leagueId: string, targetName: string) => Promise<void>;
  update: (leagueId: string, patch: { name?: string; tagline?: string; color?: string; photo?: string | null }) => Promise<void>;
  remove: (leagueId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const STORAGE_KEY = "touti.leagues.v2";
const ACTIVE_KEY = "touti.leagues.active.v2";

function mapApi(l: LeagueApi): League {
  return {
    id: l.id,
    name: l.name,
    code: l.code,
    createdAt: l.createdAt,
    createdBy: l.createdBy,
    tagline: l.tagline,
    color: l.color,
    photo: l.photo,
    members: l.members.map((m) => ({
      id: m.name,
      name: m.name,
      joinedAt: m.joinedAt,
      role: m.role,
    })),
  };
}

async function persist(leagues: League[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leagues));
}

export const useLeagueStore = create<LeagueState>((set, get) => ({
  hydrated: false,
  leagues: [],
  activeLeagueId: null,

  // Charge depuis le cache local + essaie de refresh via serveur si name connu
  hydrate: async (myName) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const leagues: League[] = raw ? JSON.parse(raw) : [];
      const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
      set({ leagues, activeLeagueId: activeId || null, hydrated: true });
      // Best-effort refresh serveur
      if (myName) {
        try {
          const remote = await apiListMyLeagues(myName);
          const mapped = remote.map(mapApi);
          await persist(mapped);
          set({ leagues: mapped });
        } catch {}
      }
    } catch {
      set({ hydrated: true });
    }
  },

  refresh: async (myName) => {
    try {
      const remote = await apiListMyLeagues(myName);
      const mapped = remote.map(mapApi);
      await persist(mapped);
      set({ leagues: mapped });
    } catch {}
  },

  refreshOne: async (leagueId) => {
    try {
      const remote = await apiGetLeague(leagueId);
      const mapped = mapApi(remote);
      const next = get().leagues.some((l) => l.id === leagueId)
        ? get().leagues.map((l) => (l.id === leagueId ? mapped : l))
        : [mapped, ...get().leagues];
      await persist(next);
      set({ leagues: next });
    } catch {}
  },

  create: async ({ name, createdBy, tagline, color }) => {
    const remote = await apiCreateLeague({ name, createdBy, tagline, color });
    const league = mapApi(remote);
    const next = [league, ...get().leagues];
    await persist(next);
    await AsyncStorage.setItem(ACTIVE_KEY, league.id);
    set({ leagues: next, activeLeagueId: league.id });
    return league;
  },

  join: async (code, me) => {
    const normalized = code.toUpperCase().trim();
    try {
      const remote = await apiJoinLeague(normalized, me.name);
      const league = mapApi(remote);
      const exists = get().leagues.some((l) => l.id === league.id);
      const next = exists
        ? get().leagues.map((l) => (l.id === league.id ? league : l))
        : [league, ...get().leagues];
      await persist(next);
      await AsyncStorage.setItem(ACTIVE_KEY, league.id);
      set({ leagues: next, activeLeagueId: league.id });
      return league;
    } catch {
      return null;
    }
  },

  leave: async (leagueId, myName) => {
    try {
      await apiLeaveLeague(leagueId, myName);
    } catch {}
    const next = get().leagues.filter((l) => l.id !== leagueId);
    await persist(next);
    const activeId = get().activeLeagueId;
    const newActive = activeId === leagueId ? next[0]?.id ?? null : activeId;
    if (newActive) await AsyncStorage.setItem(ACTIVE_KEY, newActive);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ leagues: next, activeLeagueId: newActive });
  },

  setActive: (leagueId) => {
    set({ activeLeagueId: leagueId });
    if (leagueId) AsyncStorage.setItem(ACTIVE_KEY, leagueId).catch(() => {});
    else AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
  },

  promote: async (leagueId, targetName) => {
    const remote = await apiPromoteMember(leagueId, targetName);
    const updated = mapApi(remote);
    const next = get().leagues.map((l) => (l.id === leagueId ? updated : l));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ leagues: next });
  },

  demote: async (leagueId, targetName) => {
    const remote = await apiDemoteMember(leagueId, targetName);
    const updated = mapApi(remote);
    const next = get().leagues.map((l) => (l.id === leagueId ? updated : l));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ leagues: next });
  },

  kick: async (leagueId, targetName) => {
    const remote = await apiKickMember(leagueId, targetName);
    const updated = mapApi(remote);
    const next = get().leagues.map((l) => (l.id === leagueId ? updated : l));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ leagues: next });
  },

  update: async (leagueId, patch) => {
    const remote = await apiUpdateLeague(leagueId, patch);
    const updated = mapApi(remote);
    const next = get().leagues.map((l) => (l.id === leagueId ? updated : l));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ leagues: next });
  },

  remove: async (leagueId) => {
    await apiDeleteLeague(leagueId);
    const next = get().leagues.filter((l) => l.id !== leagueId);
    const activeId = get().activeLeagueId;
    const newActive = activeId === leagueId ? next[0]?.id ?? null : activeId;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (newActive) await AsyncStorage.setItem(ACTIVE_KEY, newActive);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ leagues: next, activeLeagueId: newActive });
  },

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ leagues: [], activeLeagueId: null });
  },
}));
