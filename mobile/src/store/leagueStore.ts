// Système de ligue : un groupe de joueurs qui jouent régulièrement ensemble.
// On peut créer une ligue (code à 6 caractères), inviter, rejoindre.
// Stocké en local via AsyncStorage. Pour la v1, les ligues ne sont pas
// synchronisées entre appareils (pas de serveur de ligues encore).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface LeagueMember {
  id: string;        // username ou id unique
  name: string;
  joinedAt: number;
  role: "admin" | "member";
}

export interface League {
  id: string;
  name: string;
  code: string;            // 6 chars, partagé pour rejoindre
  createdAt: number;
  createdBy: string;       // username du créateur
  members: LeagueMember[];
  tagline?: string;
  color?: string;          // couleur d'accent (hex)
}

interface LeagueState {
  hydrated: boolean;
  leagues: League[];        // ligues dont je suis membre
  activeLeagueId: string | null;  // ligue sélectionnée pour filtrer les tournois, etc.

  hydrate: () => Promise<void>;
  create: (input: {
    name: string;
    createdBy: string;
    tagline?: string;
    color?: string;
  }) => Promise<League>;
  join: (code: string, me: { id: string; name: string }) => Promise<League | null>;
  leave: (leagueId: string) => Promise<void>;
  addMember: (leagueId: string, member: Omit<LeagueMember, "joinedAt">) => Promise<void>;
  removeMember: (leagueId: string, memberId: string) => Promise<void>;
  setActive: (leagueId: string | null) => void;
  clear: () => Promise<void>;
}

const STORAGE_KEY = "touti.leagues.v1";
const ACTIVE_KEY = "touti.leagues.active.v1";

async function persist(leagues: League[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(leagues));
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const useLeagueStore = create<LeagueState>((set, get) => ({
  hydrated: false,
  leagues: [],
  activeLeagueId: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const leagues: League[] = raw ? JSON.parse(raw) : [];
      const activeId = await AsyncStorage.getItem(ACTIVE_KEY);
      set({
        leagues,
        activeLeagueId: activeId || null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  create: async ({ name, createdBy, tagline, color }) => {
    const league: League = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      code: randomCode(),
      createdAt: Date.now(),
      createdBy,
      members: [
        {
          id: createdBy,
          name: createdBy,
          joinedAt: Date.now(),
          role: "admin",
        },
      ],
      tagline: tagline?.trim(),
      color,
    };
    const next = [league, ...get().leagues];
    await persist(next);
    await AsyncStorage.setItem(ACTIVE_KEY, league.id);
    set({ leagues: next, activeLeagueId: league.id });
    return league;
  },

  // Rejoindre par code : version locale = on ajoute une "ligue fantôme"
  // si le code n'existe nulle part. À terme, ça consultera un serveur.
  join: async (code, me) => {
    const normalized = code.toUpperCase().trim();
    const existing = get().leagues.find((l) => l.code === normalized);
    if (existing) {
      // On est déjà membre ? On met juste en active
      if (existing.members.some((m) => m.id === me.id)) {
        await AsyncStorage.setItem(ACTIVE_KEY, existing.id);
        set({ activeLeagueId: existing.id });
        return existing;
      }
      // Ajouter comme membre
      const updated = {
        ...existing,
        members: [
          ...existing.members,
          { id: me.id, name: me.name, joinedAt: Date.now(), role: "member" as const },
        ],
      };
      const next = get().leagues.map((l) => (l.id === existing.id ? updated : l));
      await persist(next);
      await AsyncStorage.setItem(ACTIVE_KEY, updated.id);
      set({ leagues: next, activeLeagueId: updated.id });
      return updated;
    }
    // Code inconnu localement — créer un placeholder (v1)
    // Le vrai lookup serveur viendra plus tard.
    return null;
  },

  leave: async (leagueId) => {
    const next = get().leagues.filter((l) => l.id !== leagueId);
    await persist(next);
    const activeId = get().activeLeagueId;
    const newActive = activeId === leagueId ? next[0]?.id ?? null : activeId;
    if (newActive) await AsyncStorage.setItem(ACTIVE_KEY, newActive);
    else await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ leagues: next, activeLeagueId: newActive });
  },

  addMember: async (leagueId, member) => {
    const next = get().leagues.map((l) =>
      l.id === leagueId
        ? {
            ...l,
            members: [...l.members, { ...member, joinedAt: Date.now() }],
          }
        : l,
    );
    await persist(next);
    set({ leagues: next });
  },

  removeMember: async (leagueId, memberId) => {
    const next = get().leagues.map((l) =>
      l.id === leagueId ? { ...l, members: l.members.filter((m) => m.id !== memberId) } : l,
    );
    await persist(next);
    set({ leagues: next });
  },

  setActive: (leagueId) => {
    set({ activeLeagueId: leagueId });
    if (leagueId) AsyncStorage.setItem(ACTIVE_KEY, leagueId).catch(() => {});
    else AsyncStorage.removeItem(ACTIVE_KEY).catch(() => {});
  },

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(ACTIVE_KEY);
    set({ leagues: [], activeLeagueId: null });
  },
}));
