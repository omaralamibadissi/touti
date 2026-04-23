// Store Zustand qui tient l'état côté client d'une partie réseau Colyseus.
// Le moteur tourne côté serveur ; ce store n'est qu'un miroir des messages
// `state` (vue publique) + `hand` (main privée) reçus de la room.
//
// Persistance : le token de reconnexion est écrit en AsyncStorage pour
// survivre au kill de l'app. Au reload, on tente `client.reconnect(token)`
// avant tout, ce qui reattache la MEME session (pas de slot fantôme).

import { create } from "zustand";
import type { Room } from "colyseus.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BidAction,
  Card,
  GameState as EngineState,
  Seat,
  Suit,
} from "@touti/shared";
import { joinPrivateRoom, joinQuickRoom, joinQuickCodeRoom, joinPrivateRoomAsSpectator, reconnect } from "../net/client";
import { t } from "../lib/i18n";

// Vue publique broadcastée par le serveur = moteur sans les mains,
// mais avec le nombre de cartes de chaque siège pour afficher les piles.
export type PublicGameState = Omit<EngineState, "hands"> & {
  handCounts: [number, number, number, number];
};

// Clé AsyncStorage pour persister le token
const RECONNECT_KEY = "touti.reconnect.v1";

interface PersistedReconnect {
  token: string;
  roomCode: string;
  ts: number;
}

async function savePersisted(token: string, roomCode: string) {
  try {
    const payload: PersistedReconnect = { token, roomCode, ts: Date.now() };
    await AsyncStorage.setItem(RECONNECT_KEY, JSON.stringify(payload));
  } catch {}
}

async function clearPersisted() {
  try { await AsyncStorage.removeItem(RECONNECT_KEY); } catch {}
}

async function loadPersisted(): Promise<PersistedReconnect | null> {
  try {
    const raw = await AsyncStorage.getItem(RECONNECT_KEY);
    if (!raw) return null;
    const obj: PersistedReconnect = JSON.parse(raw);
    // Expire après 10 minutes (allowReconnection côté serveur = 5 min, marge safe)
    if (Date.now() - obj.ts > 10 * 60 * 1000) {
      await clearPersisted();
      return null;
    }
    return obj;
  } catch { return null; }
}

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
  room: Room | null;
  connected: boolean;
  connecting: boolean;
  roomCode: string | null;
  reconnectToken: string | null;
  error: string | null;

  players: NetPlayer[];
  locked: boolean;
  mySeat: Seat | null;
  reservedSeat: Seat | null;  // siège réservé par l'host pour le prochain invité

  publicState: PublicGameState | null;
  myHand: Card[];

  chatLog: { from: string; seat: number; text: string; ts: number }[];
  turnCountdown: { seat: number; secs: number } | null;
  roomKind: "private" | "quick" | "quick-code" | null;

  connectPrivate: (code: string, name: string) => Promise<void>;
  connectQuickMatch: (name: string) => Promise<void>;
  connectQuickCode: (code: string, name: string, leagueId?: string, hybridOpenToPool?: boolean) => Promise<void>;
  connectSpectator: (code: string, name: string) => Promise<void>;
  isSpectator: boolean;
  tryReconnect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  toggleReady: () => void;
  startGame: () => void;
  reserveSeat: (seat: Seat | null) => void;

  bid: (action: BidAction) => void;
  chooseTrump: (suit: Suit) => void;
  play: (card: Card) => void;
  announceGhna: (suit: Suit) => void;
  dismissGhna: () => void;
  nextTrick: () => void;
  nextRound: () => void;
  sendChat: (text: string) => void;
  sendForfeit: () => void;
  sendRematchVote: (yes: boolean) => void;
  rematchStatus: { voted: number[]; total: number; started?: boolean } | null;

  clearError: () => void;
}

export const useNetGameStore = create<NetGameState>((set, get) => ({
  room: null,
  connected: false,
  connecting: false,
  roomCode: null,
  reconnectToken: null,
  error: null,

  players: [],
  locked: false,
  mySeat: null,
  reservedSeat: null,

  publicState: null,
  myHand: [],

  chatLog: [],
  turnCountdown: null,
  rematchStatus: null,
  roomKind: null,
  isSpectator: false,

  connectPrivate: async (code, name) => {
    const prev = get().room;
    if (prev) {
      try { await prev.leave(true); } catch {}
    }
    set({ error: null, connecting: true, connected: false });
    try {
      const room = await Promise.race([
        joinPrivateRoom({ code, name }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t("quickMatch.serverSlow"))), 8000),
        ),
      ]);
      wireRoom(room, set, get);
      set({ room, connected: true, connecting: false, roomCode: code.toUpperCase(), roomKind: "private" });
    } catch (e: any) {
      await clearPersisted();
      set({
        error: e?.message ?? t("quickMatch.cantJoin"),
        connected: false,
        connecting: false,
        room: null,
        roomCode: null,
        players: [],
        locked: false,
        mySeat: null,
        reconnectToken: null,
      });
    }
  },

  connectQuickMatch: async (name) => {
    const prev = get().room;
    if (prev) {
      try { await prev.leave(true); } catch {}
    }
    set({ error: null, connecting: true, connected: false });
    try {
      const room = await Promise.race([
        joinQuickRoom({ name }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t("quickMatch.serverSlow"))), 8000),
        ),
      ]);
      wireRoom(room, set, get);
      // Le code est reçu via onStateChange
      set({ room, connected: true, connecting: false, roomKind: "quick" });
    } catch (e: any) {
      await clearPersisted();
      set({
        error: e?.message ?? t("quickMatch.cantJoinQuick"),
        connected: false,
        connecting: false,
        room: null,
        roomCode: null,
        players: [],
        locked: false,
        mySeat: null,
        reconnectToken: null,
      });
    }
  },

  connectQuickCode: async (code, name, leagueId, hybridOpenToPool) => {
    const prev = get().room;
    if (prev) { try { await prev.leave(true); } catch {} }
    set({ error: null, connecting: true, connected: false });
    try {
      const room = await Promise.race([
        joinQuickCodeRoom({ code, name, leagueId, hybridOpenToPool }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t("quickMatch.serverSlow"))), 8000),
        ),
      ]);
      wireRoom(room, set, get);
      set({ room, connected: true, connecting: false, roomCode: code.toUpperCase(), roomKind: "quick-code" });
    } catch (e: any) {
      await clearPersisted();
      set({
        error: e?.message ?? t("quickMatch.cantCreateQuick"),
        connected: false, connecting: false,
        room: null, roomCode: null, players: [], locked: false, mySeat: null,
        reconnectToken: null,
      });
    }
  },

  connectSpectator: async (code, name) => {
    const prev = get().room;
    if (prev) { try { await prev.leave(true); } catch {} }
    set({ error: null, connecting: true, connected: false });
    try {
      const room = await Promise.race([
        joinPrivateRoomAsSpectator({ code, name }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(t("quickMatch.serverSlow"))), 8000),
        ),
      ]);
      wireRoom(room, set, get);
      set({
        room, connected: true, connecting: false,
        roomCode: code.toUpperCase(),
        roomKind: "private",
        isSpectator: true,
      });
    } catch (e: any) {
      set({
        error: e?.message ?? t("quickMatch.cantJoinSpectator"),
        connected: false, connecting: false,
        room: null, roomCode: null,
        isSpectator: false,
      });
    }
  },

  // Reconnecte à la session précédente (token persisté). Retourne true si réussi.
  tryReconnect: async () => {
    // Si déjà connecté, rien à faire
    if (get().connected && get().room) return true;
    const persisted = await loadPersisted();
    if (!persisted) return false;
    set({ connecting: true, error: null });
    try {
      const room = await Promise.race([
        reconnect(persisted.token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 6000),
        ),
      ]);
      wireRoom(room, set, get);
      set({
        room,
        connected: true,
        connecting: false,
        roomCode: persisted.roomCode,
      });
      return true;
    } catch {
      // Token invalide/expiré → on nettoie le token mais on garde le code
      // pour que l'utilisateur puisse retenter manuellement via "Reconnecter"
      await clearPersisted();
      set({
        connecting: false,
        reconnectToken: null,
        // roomCode conservé pour permettre un retry manuel
      });
      return false;
    }
  },

  disconnect: async () => {
    const prev = get().room;
    // Clear state IMMÉDIATEMENT pour débloquer l'UI — le leave() peut
    // hanger sur une WS morte et on ne veut pas que l'utilisateur attende.
    set({
      room: null,
      connected: false,
      connecting: false,
      roomCode: null,
      reconnectToken: null,
      players: [],
      locked: false,
      mySeat: null,
      publicState: null,
      myHand: [],
      chatLog: [],
      turnCountdown: null,
      rematchStatus: null,
      roomKind: null,
      isSpectator: false,
      error: null,
    });
    clearPersisted().catch(() => {});
    // Leave en fire-and-forget, timeout 1s pour pas hanger
    if (prev) {
      Promise.race([
        (prev.leave(true) as unknown as Promise<void>),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]).catch(() => {});
    }
  },

  toggleReady: () => get().room?.send("ready"),
  startGame: () => get().room?.send("start"),
  reserveSeat: (seat) =>
    get().room?.send("reserveSeat", { seat: seat == null ? -1 : seat }),

  bid: (action) => get().room?.send("bid", { action }),
  chooseTrump: (suit) => get().room?.send("chooseTrump", { suit }),
  play: (card) => get().room?.send("play", { card }),
  announceGhna: (suit) => get().room?.send("ghna.announce", { suit }),
  dismissGhna: () => get().room?.send("ghna.dismiss"),
  nextTrick: () => get().room?.send("nextTrick"),
  nextRound: () => get().room?.send("nextRound"),
  sendChat: (text) => get().room?.send("chat", { text }),
  sendForfeit: () => get().room?.send("forfeit"),
  sendRematchVote: (yes) => get().room?.send("rematchVote", { yes }),

  clearError: () => set({ error: null }),
}));

// ─── Callbacks Colyseus ────────────────────────────────────────────

function wireRoom(
  room: Room,
  set: (partial: Partial<NetGameState>) => void,
  get: () => NetGameState,
) {
  // Persist le reconnect token dès qu'on est connecté pour survivre au kill
  const token = (room as any).reconnectionToken as string | undefined;
  if (token) {
    set({ reconnectToken: token });
    // Sauvegarde async (on a besoin du roomCode — on le récupère via state change)
    // On sauvegarde ici avec un placeholder si roomCode pas encore connu
    const code = get().roomCode || "";
    if (code) savePersisted(token, code);
  }

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

    const me = playersArr.find((p) => p.id === room.sessionId);
    set({
      players: playersArr,
      locked: state.locked,
      mySeat: me ? me.seat : null,
      roomCode: state.roomCode || null,
      reservedSeat: state.reservedSeat === -1 ? null : (state.reservedSeat as Seat),
    });

    // Ré-sauvegarde le token avec le bon roomCode dès qu'on l'a
    const tok = (room as any).reconnectionToken as string | undefined;
    if (tok && state.roomCode) savePersisted(tok, state.roomCode);
  });

  room.onMessage("state", (payload: PublicGameState) => {
    set({ publicState: payload });
  });

  room.onMessage("hand", (payload: { cards: Card[] }) => {
    set({ myHand: payload.cards || [] });
  });

  room.onMessage("error", (payload: { reason: string }) => {
    set({ error: payload.reason });
  });

  room.onMessage("chat", (payload: { from: string; seat: number; text: string }) => {
    const existing = get().chatLog;
    set({
      chatLog: [
        ...existing.slice(-49),
        { from: payload.from, seat: payload.seat, text: payload.text, ts: Date.now() },
      ],
    });
  });

  // Décompte de timeout : serveur nous prévient quand le joueur actuel n'a pas
  // joué depuis 20s. secs = nb de secondes restantes (0 = clear UI).
  room.onMessage("turnCountdown", (payload: { seat: number; secs: number }) => {
    set({ turnCountdown: payload.secs > 0 ? payload : null });
  });

  // Rematch : voted = sièges qui ont déjà dit oui, total = nb d'humains à convaincre
  room.onMessage("rematchStatus", (payload: { voted: number[]; total: number; started?: boolean }) => {
    set({ rematchStatus: payload });
  });

  room.onLeave((code) => {
    set({ connected: false });
    // code 1000 = normal close (leave volontaire). Pas de retry.
    // Autres codes = déconnexion réseau → on tente auto-reconnect avec backoff.
    if (code !== 1000) {
      scheduleAutoReconnect();
    }
  });

  room.onError((code, message) => {
    set({ error: t("quickMatch.roomError", { code, message: message ?? "" }).trim() });
  });
}

// ─── Auto-reconnect avec backoff ────────────────────────────────────
// Quand la WS drop (perte réseau), on retente toutes les 2s pendant ~1min.
// Ça couvre les sorties d'app, changement de Wifi/4G, etc.

let autoReconnectTimer: NodeJS.Timeout | null = null;
let autoReconnectAttempts = 0;
const MAX_ATTEMPTS = 15; // ~30s de retries (backoff léger)

function scheduleAutoReconnect() {
  if (autoReconnectTimer) return; // déjà planifié
  autoReconnectAttempts = 0;

  const attempt = async () => {
    autoReconnectTimer = null;
    autoReconnectAttempts++;
    const s = useNetGameStore.getState();
    if (s.connected) return; // déjà reconnecté
    if (autoReconnectAttempts > MAX_ATTEMPTS) {
      // Abandon silencieux — l'utilisateur peut taper Reconnecter manuellement
      return;
    }
    const ok = await useNetGameStore.getState().tryReconnect();
    if (!ok && !useNetGameStore.getState().connected) {
      // backoff : 2s, 2s, 3s, 3s, 4s, 4s, 5s, 5s ...
      const delay = Math.min(2000 + Math.floor(autoReconnectAttempts / 2) * 1000, 5000);
      autoReconnectTimer = setTimeout(attempt, delay);
    }
  };

  autoReconnectTimer = setTimeout(attempt, 1500);
}
