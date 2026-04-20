import { create } from "zustand";
import type { Room } from "colyseus.js";
import { joinTouti } from "../net/client";

type Status = "idle" | "connecting" | "connected" | "error";

interface PlayerView {
  id: string;
  name: string;
  seat: number;
  team: number;
  ready: boolean;
  connected: boolean;
}

interface GameStoreState {
  status: Status;
  errorMessage: string | null;
  phase: string;
  players: PlayerView[];
  room: Room | null;

  connect: (name: string) => Promise<void>;
  disconnect: () => void;
  sendReady: () => void;
  sendChat: (text: string) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  status: "idle",
  errorMessage: null,
  phase: "waiting",
  players: [],
  room: null,

  connect: async (name: string) => {
    if (get().room) return;
    set({ status: "connecting", errorMessage: null });
    try {
      const room = await joinTouti(name);

      room.onStateChange((state: any) => {
        const players: PlayerView[] = [];
        state.players?.forEach((p: any) => {
          players.push({
            id: p.id,
            name: p.name,
            seat: p.seat,
            team: p.team,
            ready: p.ready,
            connected: p.connected,
          });
        });
        players.sort((a, b) => a.seat - b.seat);
        set({ phase: state.phase ?? "waiting", players });
      });

      room.onLeave(() => {
        set({ status: "idle", room: null, players: [] });
      });

      set({ room, status: "connected" });
    } catch (err) {
      set({ status: "error", errorMessage: err instanceof Error ? err.message : String(err) });
    }
  },

  disconnect: () => {
    const { room } = get();
    room?.leave();
    set({ room: null, status: "idle", players: [] });
  },

  sendReady: () => get().room?.send("ready"),
  sendChat: (text: string) => get().room?.send("chat", { text }),
}));
