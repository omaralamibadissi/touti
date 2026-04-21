import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type AuthProvider = "apple" | "google" | "facebook";

export interface AuthUser {
  provider: AuthProvider;
  providerUserId: string;
  username: string | null;   // null tant que le pseudo n'est pas choisi
  displayName?: string;      // nom retourné par le provider (facultatif)
  email?: string;
}

interface AuthState {
  hydrated: boolean;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  signInWithProfile: (
    provider: AuthProvider,
    profile: { providerUserId: string; name?: string; email?: string },
  ) => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = "touti.auth.v1";

async function persist(user: AuthUser | null) {
  if (user) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  user: null,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const user: AuthUser | null = raw ? JSON.parse(raw) : null;
      set({ user, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  // Appelé par SignInScreen après un login OAuth réussi. Le username reste
  // null si c'est un nouveau compte → l'UI redirige vers UsernameSetup.
  signInWithProfile: async (provider, profile) => {
    // Conservation du username existant s'il a déjà été choisi
    const existing = get().user;
    const keepUsername =
      existing?.provider === provider && existing?.providerUserId === profile.providerUserId
        ? existing.username
        : null;

    const user: AuthUser = {
      provider,
      providerUserId: profile.providerUserId,
      username: keepUsername,
      displayName: profile.name,
      email: profile.email,
    };
    await persist(user);
    set({ user });
  },

  setUsername: async (name) => {
    const current = get().user;
    if (!current) return;
    const user: AuthUser = { ...current, username: name.trim() };
    await persist(user);
    set({ user });
  },

  signOut: async () => {
    await persist(null);
    set({ user: null });
  },
}));
