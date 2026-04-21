// Store Zustand qui tient l'état côté client d'une partie réseau Colyseus.
// Le moteur tourne côté serveur ; ce store n'est qu'un miroir des messages
// `state` (vue publique) + `hand` (main privée) reçus de la room.

import { create } from "zustand";
import type { Room } from "colyseus.js";
import type {
  BidAction,
  Card,
  GameState as EngineState,
  Seat,
  Suit,
} from "@touti/shared";
import { joinPrivateRoom, reconnect } from "../net/client";

// Vue publique broadcastée par le serveur = moteur sans les mains
export type PublicGameState = Omit<EngineState, "hands">;

// Joueur tel que vu dans la schema Colyseus
export interface NetPlayer {
  id: string;
  name: string;
  seat: Seat;
  team: 0 | 1;
  connected: boolean;
  ready: boolean;
  isAi: boolean;
}

interface NetGameState {
  // ─── Connexion ──────────────────────────────────────────────
  room: Room | null;
  connected: boolean;
  roomCode: string | null;
  reconnectToken: string | null;
  error: string | null;

  // ─── Lobby ──────────────────────────────────────────────────
  players: NetPlayer[];
  locked: boolean;           // true = partie démarrée
  mySeat: Seat | null;

  // ─── Jeu ────────────────────────────────────────────────────
  publicState: PublicGameState | null;
  myHand: Card[];

  // ─── Événements ponctuels ───────────────────────────────────
  chatLog: { from: string; seat: number; text: string; ts: number }[];
  lastTrickWon: { winnerSeat: number; points: number } | null;
  lastRoundEnd: { winningTeam: 0 | 1; bid: number; delta: [number, number] } | null;

  // ─── Actions ────────────────────────────────────────────────
  connectPrivate: (code: string, name: string) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleReady: () => void;
  startGame: () => void;

  bid: (action: BidAction) => void;
  chooseTrump: (suit: Suit) => void;
  play: (card: Card) => void;
  announceGhna: (suit: Suit) => void;
  dismissGhna: () => void;
  nextTrick: () => void;
  nextRound: () => void;
  sendChat: (text: string) => void;

  clearError: () => void;
}

export const useNetGameStore = create<NetGameState>((set, get) => ({
  room: null,
  connected: false,
  roomCode: null,
  reconnectToken: null,
  error: null,

  players: [],
  locked: false,
  mySeat: null,

  publicState: null,
  myHand: [],

  chatLog: [],
  lastTrickWon: null,
  lastRoundEnd: null,

  connectPrivate: async (code, name) => {
    // Nettoie une room précédente si besoin
    const prev = get().room;
    if (prev) {
      try { await prev.leave(); } catch {}
    }
    set({ error: null });
    try {
      const room = await joinPrivateRoom({ code, name });
      wireRoom(room, set, get);
      set({ room, connected: true, roomCode: code.toUpperCase() });
    } catch (e: any) {
      set({ error: e?.message ?? "Impossible de rejoindre la partie", connected: false });
    }
  },

  disconnect: async () => {
    const room = get().room;
    if (room) {
      try { await room.leave(true); } catch {}
    }
    set({
      room: null,
      connected: false,
      roomCode: null,
      reconnectToken: null,
      players: [],
      locked: false,
      mySeat: null,
      publicState: null,
      myHand: [],
      chatLog: [],
      lastTrickWon: null,
      lastRoundEnd: null,
    });
  },

  toggleReady: () => get().room?.send("ready"),
  startGame: () => get().room?.send("start"),

  bid: (action) => get().room?.send("bid", { action }),
  chooseTrump: (suit) => get().room?.send("chooseTrump", { suit }),
  play: (card) => get().room?.send("play", { card }),
  announceGhna: (suit) => get().room?.send("ghna.announce", { suit }),
  dismissGhna: () => get().room?.send("ghna.dismiss"),
  nextTrick: () => get().room?.send("nextTrick"),
  nextRound: () => get().room?.send("nextRound"),
  sendChat: (text) => get().room?.send("chat", { text }),

  clearError: () => set({ error: null }),
}));

// ─── Callbacks Colyseus ────────────────────────────────────────────

function wireRoom(
  room: Room,
  set: (partial: Partial<NetGameState>) => void,
  get: () => NetGameState,
) {
  // État du lobby (schema) — sync automatique, on le lit à chaque changement
  room.onStateChange((state: any) => {
    const playersArr: NetPlayer[] = [];
    state.players.forEach((p: any) => {
      playersArr.push({
        id: p.id,
        name: p.name,
        seat: p.seat as Seat,
        team: p.team as 0 | 1,
        connected: p.connected,
        ready: p.ready,
        isAi: p.isAi,
      });
    });
    playersArr.sort((a, b) => a.seat - b.seat);

    // Mon siège = celui du joueur dont sessionId == ma sessionId
    const me = playersArr.find((p) => p.id === room.sessionId);
    set({
      players: playersArr,
      locked: state.locked,
      mySeat: me ? me.seat : null,
      roomCode: state.roomCode || null,
    });
  });

  // État du moteur de jeu (message "state")
  room.onMessage("state", (payload: PublicGameState) => {
    set({ publicState: payload });
  });

  // Main privée
  room.onMessage("hand", (payload: { cards: Card[] }) => {
    set({ myHand: payload.cards || [] });
  });

  // Erreurs métier (ex: enchère invalide)
  room.onMessage("error", (payload: { reason: string }) => {
    set({ error: payload.reason });
  });

  // Chat
  room.onMessage("chat", (payload: { from: string; seat: number; text: string }) => {
    const existing = get().chatLog;
    set({
      chatLog: [
        ...existing.slice(-49),
        { from: payload.from, seat: payload.seat, text: payload.text, ts: Date.now() },
      ],
    });
  });

  // Token de reconnexion (Colyseus l'émet via une propriété, pas un event — on la lit ici)
  try {
    set({ reconnectToken: (room as any).reconnectionToken || null });
  } catch {}

  // Déconnexion
  room.onLeave(() => {
    set({ connected: false });
  });

  room.onError((code, message) => {
    set({ error: `Erreur room ${code}: ${message ?? ""}`.trim() });
  });
}

// ─── Helper de reconnexion (à appeler sur foreground app) ──────────
export async function tryReconnect(): Promise<boolean> {
  const state = useNetGameStore.getState();
  if (!state.reconnectToken) return false;
  try {
    const room = await reconnect(state.reconnectToken);
    wireRoom(room, useNetGameStore.setState, useNetGameStore.getState);
    useNetGameStore.setState({ room, connected: true });
    return true;
  } catch {
    useNetGameStore.setState({ reconnectToken: null, connected: false });
    return false;
  }
}
