// Liste d'amis simple, persistée localement.
// Pour la v1 : un ami = juste un pseudo (pas de profil distant).
// À terme : sera connecté à un service de présence côté serveur.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface Friend {
  id: string;
  name: string;
  addedAt: number;
}

interface FriendsState {
  hydrated: boolean;
  friends: Friend[];
  hydrate: () => Promise<void>;
  add: (name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const STORAGE_KEY = "touti.friends.v1";

async function persist(friends: Friend[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  hydrated: false,
  friends: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const friends: Friend[] = raw ? JSON.parse(raw) : [];
      set({ friends, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: async (name) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    if (get().friends.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [
      ...get().friends,
      { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name: trimmed, addedAt: Date.now() },
    ];
    await persist(next);
    set({ friends: next });
  },

  remove: async (id) => {
    const next = get().friends.filter((f) => f.id !== id);
    await persist(next);
    set({ friends: next });
  },

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ friends: [] });
  },
}));
