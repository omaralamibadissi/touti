// Store Zustand pour le chat de ligue.
// Messages cachés par leagueId, chargés à la demande (ouverture de l'écran).
// Pas de AsyncStorage — les messages sont toujours refetchés depuis le serveur.

import { create } from "zustand";
import {
  apiGetLeagueMessages, apiPostLeagueMessage,
  type LeagueMessageApi,
} from "../net/leagueChatApi";

export type LeagueMessage = LeagueMessageApi;

interface LeagueChatState {
  byLeague: Record<string, LeagueMessage[]>;
  loading: Record<string, boolean>;

  refresh: (leagueId: string) => Promise<void>;
  post: (leagueId: string, text: string) => Promise<LeagueMessage | null>;
  clear: () => void;
}

export const useLeagueChatStore = create<LeagueChatState>((set, get) => ({
  byLeague: {},
  loading: {},

  refresh: async (leagueId) => {
    set((s) => ({ loading: { ...s.loading, [leagueId]: true } }));
    try {
      const msgs = await apiGetLeagueMessages(leagueId, { limit: 100 });
      set((s) => ({
        byLeague: { ...s.byLeague, [leagueId]: msgs },
      }));
    } catch {}
    finally {
      set((s) => ({ loading: { ...s.loading, [leagueId]: false } }));
    }
  },

  post: async (leagueId, text) => {
    try {
      const msg = await apiPostLeagueMessage(leagueId, text);
      set((s) => {
        const existing = s.byLeague[leagueId] || [];
        // Si déjà présent (optimistic), on remplace
        const filtered = existing.filter((m) => m.id !== msg.id);
        return {
          byLeague: { ...s.byLeague, [leagueId]: [...filtered, msg] },
        };
      });
      return msg;
    } catch {
      return null;
    }
  },

  clear: () => set({ byLeague: {}, loading: {} }),
}));
