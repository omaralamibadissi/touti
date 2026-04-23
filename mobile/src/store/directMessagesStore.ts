// Messagerie directe — 1-to-1 entre amis. Messages cachés par otherId.
// Pas de AsyncStorage : toujours refetch depuis serveur.

import { create } from "zustand";
import {
  apiListThreads, apiListDMMessages, apiSendDM, apiMarkDMRead,
  type DirectMessageApi, type DMThreadApi,
} from "../net/directMessagesApi";

export type DirectMessage = DirectMessageApi;
export type DMThread = DMThreadApi;

interface DirectMessagesState {
  threads: DMThread[];
  messagesByOther: Record<string, DirectMessage[]>;
  loadingThreads: boolean;
  loadingConv: Record<string, boolean>;

  refreshThreads: () => Promise<void>;
  refreshConv: (otherId: string) => Promise<void>;
  send: (otherId: string, text: string) => Promise<DirectMessage | null>;
  markRead: (otherId: string) => Promise<void>;
  clear: () => void;
}

export const useDirectMessagesStore = create<DirectMessagesState>((set, get) => ({
  threads: [],
  messagesByOther: {},
  loadingThreads: false,
  loadingConv: {},

  refreshThreads: async () => {
    set({ loadingThreads: true });
    try {
      const threads = await apiListThreads();
      set({ threads });
    } catch {}
    finally { set({ loadingThreads: false }); }
  },

  refreshConv: async (otherId) => {
    set((s) => ({ loadingConv: { ...s.loadingConv, [otherId]: true } }));
    try {
      const msgs = await apiListDMMessages(otherId, { limit: 100 });
      set((s) => ({ messagesByOther: { ...s.messagesByOther, [otherId]: msgs } }));
    } catch {}
    finally {
      set((s) => ({ loadingConv: { ...s.loadingConv, [otherId]: false } }));
    }
  },

  send: async (otherId, text) => {
    try {
      const msg = await apiSendDM(otherId, text);
      set((s) => {
        const existing = s.messagesByOther[otherId] || [];
        return {
          messagesByOther: {
            ...s.messagesByOther,
            [otherId]: [...existing.filter((m) => m.id !== msg.id), msg],
          },
        };
      });
      return msg;
    } catch {
      return null;
    }
  },

  markRead: async (otherId) => {
    try {
      await apiMarkDMRead(otherId);
      // Refresh threads pour MAJ le unread count
      await get().refreshThreads();
    } catch {}
  },

  clear: () => set({ threads: [], messagesByOther: {}, loadingThreads: false, loadingConv: {} }),
}));
