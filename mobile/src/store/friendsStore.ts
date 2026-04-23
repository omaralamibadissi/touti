// Amis serveur-backed avec demandes bidirectionnelles.
// Cache local (AsyncStorage) pour affichage offline.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  apiListFriends, apiRequestFriend, apiAcceptFriend, apiRejectFriend, apiUnfriend,
  type FriendshipApi,
} from "../net/friendsApi";

export interface Friendship {
  id: string;
  requesterId: string;
  requesterName: string;
  receiverId: string;
  receiverName: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  respondedAt?: number;
}

// Compat : vue "ami simple" utilisée par les pickers (QuickMatch, etc.)
export interface Friend {
  id: string;        // friendship id
  name: string;      // pseudo de l'autre
  otherId: string;   // account id de l'autre (pour DM, profile lookups, etc.)
  addedAt: number;
  online?: boolean;
}

interface FriendsState {
  hydrated: boolean;
  myUsername: string;
  friends: Friend[];
  incoming: Friendship[];
  outgoing: Friendship[];
  error: string | null;

  setMyUsername: (u: string) => void;
  hydrate: (myUsername: string) => Promise<void>;
  refresh: () => Promise<void>;
  request: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  accept: (friendshipId: string) => Promise<void>;
  reject: (friendshipId: string) => Promise<void>;
  remove: (friendshipId: string) => Promise<void>;
  clearError: () => void;
  clear: () => Promise<void>;
}

const STORAGE_KEY = "touti.friends.v3";

async function persist(friends: Friend[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  hydrated: false,
  myUsername: "",
  friends: [],
  incoming: [],
  outgoing: [],
  error: null,

  setMyUsername: (u) => set({ myUsername: u }),

  hydrate: async (myUsername) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const friends: Friend[] = raw ? JSON.parse(raw) : [];
      set({ friends, myUsername, hydrated: true });
      get().refresh().catch(() => {});
    } catch {
      set({ hydrated: true, myUsername });
    }
  },

  refresh: async () => {
    try {
      const list = await apiListFriends();
      const myUsername = get().myUsername;
      const mapped: Friend[] = list.friends.map((f) => {
        const otherIsReceiver = f.requesterName === myUsername;
        const otherName = otherIsReceiver ? f.receiverName : f.requesterName;
        const otherId = otherIsReceiver ? f.receiverId : f.requesterId;
        const otherOnline = otherIsReceiver ? !!f.receiverOnline : !!f.requesterOnline;
        return {
          id: f.id,
          name: otherName,
          otherId,
          addedAt: f.respondedAt || f.createdAt,
          online: otherOnline,
        };
      });

      await persist(mapped);
      set({
        friends: mapped,
        incoming: list.incoming as Friendship[],
        outgoing: list.outgoing as Friendship[],
      });
    } catch {}
  },

  request: async (username) => {
    const trimmed = username.trim();
    const { t } = await import("../lib/i18n");
    if (trimmed.length < 3) {
      return { ok: false, error: t("friends.usernameTooShort") };
    }
    try {
      await apiRequestFriend(trimmed);
      await get().refresh();
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message ?? t("common.error");
      set({ error: msg });
      return { ok: false, error: msg };
    }
  },

  accept: async (id) => {
    try {
      await apiAcceptFriend(id);
      await get().refresh();
    } catch (e: any) {
      const { t } = await import("../lib/i18n");
      set({ error: e?.message ?? t("common.error") });
    }
  },

  reject: async (id) => {
    try {
      await apiRejectFriend(id);
      await get().refresh();
    } catch (e: any) {
      const { t } = await import("../lib/i18n");
      set({ error: e?.message ?? t("common.error") });
    }
  },

  remove: async (id) => {
    try {
      await apiUnfriend(id);
      await get().refresh();
    } catch (e: any) {
      const { t } = await import("../lib/i18n");
      set({ error: e?.message ?? t("common.error") });
    }
  },

  clearError: () => set({ error: null }),

  clear: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ friends: [], incoming: [], outgoing: [], error: null, myUsername: "" });
  },
}));
