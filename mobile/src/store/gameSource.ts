// Source unifiée pour l'état d'une partie : en mode "local" le moteur
// tourne dans React (solo vs IA) ; en mode "net" on mirror l'état émis
// par le serveur Colyseus et on envoie les actions comme messages.
//
// GameScreen consomme cette source via `useGameSource(mode)` et s'en sert
// partout à la place de useState<GameState> + setState direct.
//
// En mode "net", les sièges sont REMAPPÉS pour que *mon* siège apparaisse
// toujours à la position locale 0 (bas de l'écran). Le serveur garde les
// sièges globaux ; le remap n'existe que côté rendu.

import { useEffect, useMemo, useState, useCallback } from "react";
import type {
  BidAction,
  Card,
  GameState,
  Seat,
  Suit,
} from "@touti/shared";
import { createGame } from "@touti/shared";
import { useNetGameStore } from "./netGameStore";

export type GameMode = "local" | "net";

export interface GameSource {
  state: GameState;               // état complet (avec hands[mySeat] = ma main) — jamais null, fallback placeholder
  mySeat: Seat;                   // 0 en local ; en net, toujours 0 APRÈS remap
  runLocalAi: boolean;            // true en local ; false en net (serveur gère)
  ready: boolean;                 // true quand le state a été reçu du serveur (ou toujours true en local)

  // Actions. En local, elles appliquent via setState. En net, elles envoient
  // un message au serveur — le state suivra par broadcast.
  setLocalState: (updater: (s: GameState) => GameState) => void;
  bid: (seat: Seat, action: BidAction) => void;
  chooseTrump: (seat: Seat, suit: Suit) => void;
  play: (seat: Seat, card: Card) => void;
  announceGhna: (seat: Seat, suit: Suit) => void;
  dismissGhna: () => void;
  nextTrick: () => void;
  nextRound: () => void;
  resetGame: () => void;

  // Méta réseau (null en local)
  netPlayers: { seat: Seat; name: string; isAi: boolean; connected: boolean }[] | null;
}

export function useGameSource(
  mode: GameMode,
  actionBridge?: {
    localBid?: (s: GameState, seat: Seat, a: BidAction) => GameState;
    localChooseTrump?: (s: GameState, seat: Seat, suit: Suit) => GameState;
    localPlay?: (s: GameState, seat: Seat, c: Card) => GameState;
    localAnnounceGhna?: (s: GameState, seat: Seat, suit: Suit) => GameState;
    localDismissGhna?: (s: GameState) => GameState;
    localNextTrick?: (s: GameState) => GameState;
    localEndRound?: (s: GameState) => GameState;
    localStartNextRound?: (s: GameState) => GameState;
  },
): GameSource {
  // ─── Mode LOCAL ──────────────────────────────────────────────
  const [localState, setLocal] = useState<GameState>(() => createGame());

  // ─── Mode NET — reads depuis le store ────────────────────────
  const publicState = useNetGameStore((s) => s.publicState);
  const myHand = useNetGameStore((s) => s.myHand);
  const mySeatServer = useNetGameStore((s) => s.mySeat);
  const netPlayers = useNetGameStore((s) => s.players);
  const netBid = useNetGameStore((s) => s.bid);
  const netChoose = useNetGameStore((s) => s.chooseTrump);
  const netPlay = useNetGameStore((s) => s.play);
  const netAnn = useNetGameStore((s) => s.announceGhna);
  const netDismiss = useNetGameStore((s) => s.dismissGhna);
  const netNextTrick = useNetGameStore((s) => s.nextTrick);
  const netNextRound = useNetGameStore((s) => s.nextRound);

  // ── Fabrique le state pour le net mode en remappant les sièges ──
  const netState = useMemo<GameState | null>(() => {
    if (mode !== "net") return null;
    if (!publicState || mySeatServer == null) return null;
    return remapPublicState(publicState, myHand, mySeatServer);
  }, [mode, publicState, myHand, mySeatServer]);

  // ── Joueurs remappés pour l'affichage (seat local) ──
  const remappedPlayers = useMemo(() => {
    if (mode !== "net" || mySeatServer == null) return null;
    return netPlayers.map((p) => ({
      seat: remapSeat(p.seat, mySeatServer),
      name: p.name,
      isAi: p.isAi,
      connected: p.connected,
    }));
  }, [mode, netPlayers, mySeatServer]);

  const setLocalState = useCallback(
    (updater: (s: GameState) => GameState) => {
      if (mode === "local") setLocal(updater);
    },
    [mode],
  );

  const bid = useCallback(
    (seat: Seat, action: BidAction) => {
      if (mode === "local") {
        setLocal((s) => actionBridge?.localBid?.(s, seat, action) ?? s);
      } else {
        netBid(action);
      }
    },
    [mode, netBid, actionBridge],
  );

  const chooseTrump = useCallback(
    (seat: Seat, suit: Suit) => {
      if (mode === "local") {
        setLocal((s) => actionBridge?.localChooseTrump?.(s, seat, suit) ?? s);
      } else {
        netChoose(suit);
      }
    },
    [mode, netChoose, actionBridge],
  );

  const play = useCallback(
    (seat: Seat, card: Card) => {
      if (mode === "local") {
        setLocal((s) => actionBridge?.localPlay?.(s, seat, card) ?? s);
      } else {
        netPlay(card);
      }
    },
    [mode, netPlay, actionBridge],
  );

  const announceGhna = useCallback(
    (seat: Seat, suit: Suit) => {
      if (mode === "local") {
        setLocal((s) => actionBridge?.localAnnounceGhna?.(s, seat, suit) ?? s);
      } else {
        netAnn(suit);
      }
    },
    [mode, netAnn, actionBridge],
  );

  const dismissGhna = useCallback(() => {
    if (mode === "local") {
      setLocal((s) => actionBridge?.localDismissGhna?.(s) ?? s);
    } else {
      netDismiss();
    }
  }, [mode, netDismiss, actionBridge]);

  const nextTrick = useCallback(() => {
    if (mode === "local") {
      setLocal((s) => actionBridge?.localNextTrick?.(s) ?? s);
    } else {
      netNextTrick();
    }
  }, [mode, netNextTrick, actionBridge]);

  const nextRound = useCallback(() => {
    if (mode === "local") {
      setLocal((s) => {
        const ended = actionBridge?.localEndRound?.(s) ?? s;
        return actionBridge?.localStartNextRound?.(ended) ?? ended;
      });
    } else {
      netNextRound();
    }
  }, [mode, netNextRound, actionBridge]);

  const resetGame = useCallback(() => {
    if (mode === "local") setLocal(createGame());
    // En net, pas de reset — le serveur gère
  }, [mode]);

  if (mode === "local") {
    return {
      state: localState,
      mySeat: 0,
      runLocalAi: true,
      ready: true,
      setLocalState,
      bid,
      chooseTrump,
      play,
      announceGhna,
      dismissGhna,
      nextTrick,
      nextRound,
      resetGame,
      netPlayers: null,
    };
  }

  // Fallback placeholder si on n'a pas encore reçu de state du serveur
  const displayState = netState ?? localState;

  return {
    state: displayState,
    mySeat: 0, // toujours 0 APRÈS remap
    runLocalAi: false,
    ready: netState != null,
    setLocalState,
    bid,
    chooseTrump,
    play,
    announceGhna,
    dismissGhna,
    nextTrick,
    nextRound,
    resetGame,
    netPlayers: remappedPlayers,
  };
}

// ─── Remap helpers ─────────────────────────────────────────────────

// Convertit un siège serveur en siège local où mySeat = 0.
// Exemple : mySeatServer=2, serverSeat=2 → 0 ; serverSeat=3 → 1 ; serverSeat=0 → 2 ; serverSeat=1 → 3.
function remapSeat(serverSeat: number, mySeatServer: number): Seat {
  return (((serverSeat - mySeatServer) + 4) % 4) as Seat;
}

// Clone l'état public émis par le serveur en remappant tous les sièges
// pour que mySeat=0 localement, et en injectant la main privée.
function remapPublicState(
  publicState: Omit<GameState, "hands">,
  myHand: Card[],
  mySeatServer: number,
): GameState {
  const rs = (s: number | null | undefined): Seat | null =>
    s == null ? null : remapSeat(s, mySeatServer);

  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  hands[0] = myHand; // mon siège = position locale 0

  // Bidding
  const bidding = publicState.bidding
    ? {
        ...publicState.bidding,
        currentSeat: rs(publicState.bidding.currentSeat) as Seat,
        highest: publicState.bidding.highest
          ? {
              seat: rs(publicState.bidding.highest.seat) as Seat,
              amount: publicState.bidding.highest.amount,
            }
          : null,
        passed: publicState.bidding.passed.map((s) => rs(s) as Seat),
        history: publicState.bidding.history.map((h) => ({
          seat: rs(h.seat) as Seat,
          action: h.action,
        })),
      }
    : null;

  // Trick (le moteur utilise `player: Seat` pour chaque TrickEntry)
  const trick = publicState.trick.map((e) => ({ player: rs(e.player) as Seat, card: e.card }));
  const lastTrick = publicState.lastTrick
    ? {
        entries: publicState.lastTrick.entries.map((e) => ({
          player: rs(e.player) as Seat,
          card: e.card,
        })),
        winner: rs(publicState.lastTrick.winner) as Seat,
      }
    : null;

  // Ghna
  const ghnaAnnounced = publicState.ghnaAnnounced.map((a) => ({
    seat: rs(a.seat) as Seat,
    suit: a.suit,
    value: a.value,
  }));
  const ghnaPending = publicState.ghnaPending
    ? {
        seat: rs(publicState.ghnaPending.seat) as Seat,
        options: publicState.ghnaPending.options,
      }
    : null;

  return {
    phase: publicState.phase,
    roundNumber: publicState.roundNumber,
    trickNumber: publicState.trickNumber,
    dealerSeat: rs(publicState.dealerSeat) as Seat,
    currentPlayer: rs(publicState.currentPlayer) as Seat,
    hands,
    trump: publicState.trump,
    bidding,
    bidWinner: rs(publicState.bidWinner),
    bidAmount: publicState.bidAmount,
    trick,
    lastTrick,
    tricksWon: { A: [], B: [] }, // non broadcasté — on n'en a pas besoin côté client
    roundPoints: publicState.roundPoints,
    ghnaAnnounced,
    ghnaPending,
    score: publicState.score,
    lastTrickWinner: rs(publicState.lastTrickWinner),
    message: publicState.message,
  };
}
