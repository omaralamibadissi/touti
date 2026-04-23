import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
  Alert,
  PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Ellipse } from "react-native-svg";
import * as ScreenOrientation from "expo-screen-orientation";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { Avatar } from "../components/Avatar";
import { PhotoAvatar } from "../components/PhotoAvatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, SuitGlyph } from "../components/Card";
import {
  aiBid,
  aiChooseTrump,
  aiPick,
  announceGhna,
  BID_STEP,
  bid,
  cardKey,
  chooseTrump,
  createGame,
  dismissGhna,
  endRound,
  GameState,
  legalMoves,
  maybeCloseBidding,
  MAX_BID,
  MIN_BID,
  nextTrick,
  partnerOf,
  playCard,
  PLAYERS,
  Pos,
  Seat,
  startNextRound,
  teamOf,
  ALL_SUITS,
  Card as CardType,
  CARD_STRENGTH,
  Suit,
  SUIT_LABELS,
  sanitize,
} from "@touti/shared";
import { useMatchHistoryStore } from "../store/matchHistoryStore";
import { playSound, isSoundEnabled, setSoundEnabled, stopAllSounds } from "../sound/soundManager";
import { ChatLauncher, ChatBubble, QUICK_MESSAGES } from "../components/GameChat";
import { useGameSource, GameMode } from "../store/gameSource";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useNetGameStore } from "../store/netGameStore";
import { useAuthStore } from "../store/authStore";
import { apiReport, type ReportReason } from "../net/reportsApi";
import { Coachmark, type CoachmarkStep } from "../components/Coachmark";
import { useT, suitLabel, suitNameForGhna } from "../lib/i18n";

// Ordre d'affichage demandé : oros, copas, espadas, bastos.
// À l'intérieur d'une couleur : plus fort → plus faible (As, Triss, Rey, Caballo, Sota, 7, 6, 5, 4, 2).
const SUIT_ORDER: Suit[] = ["oros", "copas", "espadas", "bastos"];
function sortHand(cards: CardType[]): CardType[] {
  return [...cards].sort((a, b) => {
    const sd = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
    if (sd !== 0) return sd;
    return CARD_STRENGTH[b.rank] - CARD_STRENGTH[a.rank];
  });
}

const WOOD = {
  rimOuter: "#1a0e05",
  edgeDark: "#3b2511",
  surfaceTop: "#6b4126",
  surfaceBot: "#4a2a14",
  grain: "#2b1608",
} as const;

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export default function GameScreen({ route, navigation }: Props) {
  const t = useT();
  const mode: GameMode = (route.params?.mode as GameMode) ?? "local";
  // Si la route demande explicitement le tutoriel (replay depuis Settings),
  // on force les coachmarks pour cette session même si markCoachmarksDone()
  // a déjà été appelé précédemment.
  const forceTutorial = route.params?.tutorial === true;
  // Tutoriel = 1ère partie solo d'un nouveau compte OU replay forcé.
  // Active la distribution scriptée de l'engine + stop après 1 manche.
  // NB : on lit la valeur initiale via getState() pour ne pas re-hooker en
  // milieu de session (`isTutorialSession` est figé pour la partie en cours).
  const isTutorialSession =
    mode === "local" &&
    (forceTutorial || !useAuthStore.getState().coachmarksDone);
  const src = useGameSource(mode, {
    localBid: bid,
    localChooseTrump: chooseTrump,
    localPlay: playCard,
    localAnnounceGhna: announceGhna,
    localDismissGhna: dismissGhna,
    localNextTrick: nextTrick,
    localEndRound: endRound,
    localStartNextRound: startNextRound,
  }, isTutorialSession);
  const state = src.state;
  const setState = src.setLocalState;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shakeMap, setShakeMap] = useState<Record<string, number>>({});
  // `dealAnim` masque la main et gèle les handlers IA pendant l'animation
  // de distribution. En local on démarre l'anim au montage (round 1). En net,
  // on n'initialise PAS l'anim : le serveur peut nous dropper à n'importe
  // quelle phase (reconnexion, spectateur, join en cours de partie), et il
  // ne faut pas masquer la main par défaut — le hook qui gère `state.phase`
  // déclenchera `setDealAnim` uniquement quand on voit réellement démarrer
  // une manche côté serveur.
  const [dealAnim, setDealAnim] = useState<{ round: number } | null>(
    mode === "local" ? { round: 1 } : null,
  );
  const [bubbles, setBubbles] = useState<Record<Seat, { text: string; key: number } | null>>({
    0: null, 1: null, 2: null, 3: null,
  });
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  // Modal de choix affiché après le "farewell" du tuto : continuer la partie
  // ou quitter pour enchaîner sur le tuto des menus.
  const [showTutoEndChoice, setShowTutoEndChoice] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const isSpectator = useNetGameStore((s) => s.isSpectator);
  const { width: SW, height: SH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Coachmarks (1ère partie solo du compte) — tutoriel guidé événementiel,
  // déclenché au fur et à mesure que la manche se déroule.
  const coachmarksDone = useAuthStore((s) => s.coachmarksDone);
  const markCoachmarksDone = useAuthStore((s) => s.markCoachmarksDone);
  const trumpRef = useRef<View>(null);
  const scoreRef = useRef<View>(null);
  const handRef = useRef<View>(null);
  const pauseRef = useRef<View>(null);
  const lastTrickRef = useRef<View>(null);
  const scoreSheetRef = useRef<View>(null);
  const tutShownRef = useRef<Set<string>>(new Set());
  const [tutActiveId, setTutActiveId] = useState<string | null>(null);

  // Historique auto des manches (pour le panneau de suivi + replay)
  type TrickSnap = { entries: import("@touti/shared").TrickEntry[]; winner: Seat };
  type RoundSnap = {
    round: number;
    scoreA: number;
    scoreB: number;
    deltaA: number;
    deltaB: number;
    bidWinner: Seat | null;
    bidAmount: number | null;
    bidTeam: "A" | "B" | null;
    trump: string | null;
    tricks: TrickSnap[];          // tous les plis de la manche, dans l'ordre
  };
  const [roundHistory, setRoundHistory] = useState<RoundSnap[]>([]);
  const lastSnapRoundRef = useRef<number>(0);
  // Plis joués pendant la manche en cours (accumulés via lastTrick à chaque fin de pli)
  const [currentRoundTricks, setCurrentRoundTricks] = useState<TrickSnap[]>([]);
  const lastTrickSeenRef = useRef<TrickSnap | null>(null);

  // Accumule les plis au fur et à mesure qu'ils se terminent
  useEffect(() => {
    if (!state.lastTrick) return;
    const lt = state.lastTrick;
    // On ne push qu'une fois par pli unique
    const same =
      lastTrickSeenRef.current &&
      lastTrickSeenRef.current.winner === lt.winner &&
      lastTrickSeenRef.current.entries.length === lt.entries.length &&
      lastTrickSeenRef.current.entries.every(
        (e, i) => e.player === lt.entries[i].player &&
                  e.card.suit === lt.entries[i].card.suit &&
                  e.card.rank === lt.entries[i].card.rank,
      );
    if (same) return;
    const snap: TrickSnap = { entries: [...lt.entries], winner: lt.winner };
    lastTrickSeenRef.current = snap;
    setCurrentRoundTricks((prev) => [...prev, snap]);
  }, [state.lastTrick]);

  // Reset des plis quand une nouvelle manche démarre
  useEffect(() => {
    if (state.phase === "bidding" && state.trickNumber === 1) {
      setCurrentRoundTricks([]);
      lastTrickSeenRef.current = null;
    }
  }, [state.roundNumber, state.phase, state.trickNumber]);

  useEffect(() => {
    // Snapshot à la fin de chaque manche (quand message est settlé)
    if (state.phase !== "round-end" || state.message == null) return;
    if (lastSnapRoundRef.current === state.roundNumber) return;
    lastSnapRoundRef.current = state.roundNumber;

    // Inclut le DERNIER pli dans les tricks. Le dernier pli passe phase direct
    // à "round-end" (sans passer par trick-end) donc l'effet d'accumulation
    // n'a parfois pas encore committé son setState à ce moment.
    const finalTricks: TrickSnap[] = [...currentRoundTricks];
    const lt = state.lastTrick;
    if (lt) {
      const alreadyIn = finalTricks.some((t) =>
        t.winner === lt.winner &&
        t.entries.length === lt.entries.length &&
        t.entries.every((e, i) =>
          e.player === lt.entries[i].player &&
          e.card.suit === lt.entries[i].card.suit &&
          e.card.rank === lt.entries[i].card.rank,
        ),
      );
      if (!alreadyIn) {
        finalTricks.push({ entries: [...lt.entries], winner: lt.winner });
      }
    }

    setRoundHistory((prev) => {
      const prevTotalA = prev.length ? prev[prev.length - 1].scoreA : 0;
      const prevTotalB = prev.length ? prev[prev.length - 1].scoreB : 0;
      const bidTeam: "A" | "B" | null =
        state.bidWinner == null ? null : state.bidWinner % 2 === 0 ? "A" : "B";
      const snap: RoundSnap = {
        round: state.roundNumber,
        scoreA: state.score.A,
        scoreB: state.score.B,
        deltaA: state.score.A - prevTotalA,
        deltaB: state.score.B - prevTotalB,
        bidWinner: state.bidWinner,
        bidAmount: state.bidAmount,
        bidTeam,
        trump: state.trump ?? null,
        tricks: finalTricks,
      };
      return [...prev, snap];
    });
  }, [state.phase, state.message, state.roundNumber, currentRoundTricks, state.lastTrick]);

  // Trigger animation de distribution à chaque nouvelle manche
  useEffect(() => {
    if (state.phase === "bidding" && state.trickNumber === 1) {
      setDealAnim({ round: state.roundNumber });
    }
  }, [state.roundNumber, state.phase, state.trickNumber]);

  // Helper : affiche une bulle pour le siège X, disparaît après `ms` ms (3s par défaut)
  const showBubble = (seat: Seat, text: string, ms: number = 3000) => {
    const key = Date.now();
    setBubbles((b) => ({ ...b, [seat]: { text, key } }));
    setTimeout(() => {
      setBubbles((b) => (b[seat]?.key === key ? { ...b, [seat]: null } : b));
    }, ms);
  };

  // Bulles de dires pendant les enchères (et Ghna). Persistent jusqu'à la fin
  // des enchères : si le même joueur parle à nouveau, sa bulle est mise à jour
  // (70 → 90). Elles disparaissent quand la phase devient "playing".
  const [bidBubbles, setBidBubbles] = useState<Record<Seat, string | null>>({
    0: null, 1: null, 2: null, 3: null,
  });

  const bidHistoryLenRef = useRef(0);
  useEffect(() => {
    // Source : historique actif (phase=bidding) OU snapshot final (après fermeture)
    const history = state.bidding?.history ?? state.lastBidHistory ?? [];
    if (history.length <= bidHistoryLenRef.current) {
      bidHistoryLenRef.current = history.length;
      return;
    }
    for (let i = bidHistoryLenRef.current; i < history.length; i++) {
      const h = history[i];
      const label =
        h.action.kind === "bid" ? `${h.action.amount}`
        : h.action.kind === "pass" ? t("game.bidPass")
        : h.action.signal === "as" ? t("game.bidSignalAs")
        : t("game.bidSignalCount");
      setBidBubbles((b) => ({ ...b, [h.seat]: label }));
    }
    bidHistoryLenRef.current = history.length;
  }, [state.bidding?.history, state.lastBidHistory]);

  // Bulle pour annonce de Ghna — remplace celle d'enchère si déjà là
  const ghnaLenRef = useRef(0);
  useEffect(() => {
    const list = state.ghnaAnnounced ?? [];
    if (list.length <= ghnaLenRef.current) {
      ghnaLenRef.current = list.length;
      return;
    }
    for (let i = ghnaLenRef.current; i < list.length; i++) {
      const a = list[i];
      const suitName = suitNameForGhna(a.suit);
      const label = a.value === 20
        ? t("game.ghnaBubbleWithSuit", { value: a.value, suit: suitName })
        : t("game.ghnaBubble", { value: a.value });
      setBidBubbles((b) => ({ ...b, [a.seat]: label }));
    }
    ghnaLenRef.current = list.length;
  }, [state.ghnaAnnounced]);

  // Quand les enchères se terminent (phase passe de bidding/choosing-trump/ghna
  // à playing/trick-end/round-end/game-end), on laisse les dernières bulles
  // visibles 12s avant de les clear. Permet de bien voir le dernier dire de
  // chacun après la fermeture des enchères.
  const bidClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const isPostBidding =
      state.phase === "playing" ||
      state.phase === "trick-end" ||
      state.phase === "round-end" ||
      state.phase === "game-end";
    if (!isPostBidding) return;
    // Un timer déjà en cours → on le laisse tourner (pas de reset entre les
    // sous-phases de jeu qui s'enchaînent rapidement)
    if (bidClearTimerRef.current) return;
    bidClearTimerRef.current = setTimeout(() => {
      setBidBubbles({ 0: null, 1: null, 2: null, 3: null });
      bidClearTimerRef.current = null;
    }, 3_000);
  }, [state.phase]);

  // Reset refs quand une nouvelle manche démarre
  useEffect(() => {
    if (state.phase === "bidding" && state.trickNumber === 1) {
      bidHistoryLenRef.current = 0;
      ghnaLenRef.current = 0;
      setBidBubbles({ 0: null, 1: null, 2: null, 3: null });
      if (bidClearTimerRef.current) {
        clearTimeout(bidClearTimerRef.current);
        bidClearTimerRef.current = null;
      }
    }
  }, [state.roundNumber, state.phase, state.trickNumber]);

  // Chat entrant (net mode) → bulle sur le siège de l'émetteur (remappé)
  const netChatLog = useNetGameStore((s) => s.chatLog);
  const chatSeenRef = useRef(0);
  useEffect(() => {
    if (mode !== "net") return;
    // Afficher uniquement les nouveaux messages
    for (let i = chatSeenRef.current; i < netChatLog.length; i++) {
      const msg = netChatLog[i];
      const mySeatServer = useNetGameStore.getState().mySeat ?? 0;
      const localSeat = ((msg.seat - mySeatServer + 4) % 4) as Seat;
      if (localSeat !== 0) showBubble(localSeat, msg.text);
    }
    chatSeenRef.current = netChatLog.length;
  }, [netChatLog, mode]);

  // Sons sur événements clés
  useEffect(() => {
    if (state.phase === "bidding" && state.trickNumber === 1) playSound("deal");
  }, [state.roundNumber, state.phase]);
  useEffect(() => {
    if (state.phase === "trick-end") playSound("trickWin");
  }, [state.phase, state.trickNumber]);
  // Son léger à chaque NOUVELLE carte posée. On track trickNumber + length
  // pour dédupliquer entre manches (trick.length peut passer de 4 → 0 en fin
  // de pli puis remonter, ou l'objet trick peut être remplacé avec même
  // longueur après re-sync réseau sans qu'aucune vraie carte n'ait été posée).
  const lastCardKeyRef = useRef<string>("");
  useEffect(() => {
    const key = `${state.roundNumber}:${state.trickNumber}:${state.trick.length}`;
    if (state.trick.length > 0 && key !== lastCardKeyRef.current) {
      playSound("cardPlay");
    }
    lastCardKeyRef.current = key;
  }, [state.roundNumber, state.trickNumber, state.trick.length]);
  useEffect(() => {
    if (state.phase === "round-end" && state.message != null) playSound("roundEnd");
  }, [state.phase, state.message]);
  useEffect(() => {
    if (state.phase === "game-end") {
      playSound(state.score.A > state.score.B ? "gameWin" : "gameLose");
    }
  }, [state.phase]);

  // Nettoyage : coupe tous les sons au démontage du GameScreen (ex : deal
  // toujours en cours, trickWin qui sonne juste avant quit, etc.)
  useEffect(() => {
    return () => { stopAllSounds().catch(() => {}); };
  }, []);

  // Tutoriel événementiel : un seul tooltip à la fois, déclenché par les
  // transitions du jeu. Joue sur toute la 1ère manche (solo uniquement).
  // Les "steps" sont évalués en priorité descendante : le premier dont la
  // condition `when` est vraie ET qui n'a pas encore été vu devient actif.
  const tutSteps: {
    id: string;
    when: () => boolean;
    text: string;
    targetRef: React.RefObject<View | null> | null;
    placement?: "above" | "below" | "auto";
  }[] = [
    // Intro — bulle flottante, on ne met en valeur rien de particulier
    {
      id: "welcome",
      when: () => !dealAnim && state.phase === "bidding" && state.roundNumber === 1,
      text: t("tuto.welcome"),
      targetRef: null,
    },
    // Ta main
    {
      id: "your-hand",
      when: () => !dealAnim && state.phase === "bidding" && state.roundNumber === 1,
      text: t("tuto.yourHand"),
      targetRef: handRef,
      placement: "above",
    },
    // Score HUD
    {
      id: "score-hud",
      when: () => !dealAnim && state.phase === "bidding" && state.roundNumber === 1,
      text: t("tuto.scoreHud"),
      targetRef: scoreRef,
      placement: "below",
    },
    // Pille atout
    {
      id: "trump-pill",
      when: () => !dealAnim && state.phase === "bidding" && state.roundNumber === 1,
      text: t("tuto.trumpPill"),
      targetRef: trumpRef,
      placement: "below",
    },
    // Phase enchères (sans highlight)
    {
      id: "bid-intro",
      when: () => !dealAnim && state.phase === "bidding" && state.bidding != null,
      text: t("tuto.bidIntro"),
      targetRef: null,
    },
    // À toi de parler — highlight main (où sont les boutons bid)
    {
      id: "bid-your-turn",
      when: () =>
        !dealAnim &&
        state.phase === "bidding" &&
        state.bidding?.currentSeat === 0,
      text: t("tuto.bidYourTurn"),
      targetRef: handRef,
      placement: "above",
    },
    // Partenaire a acheté
    {
      id: "partner-bought",
      when: () =>
        state.phase === "choosing-trump" &&
        state.bidWinner === 2 &&
        state.roundNumber === 1,
      text: t("tuto.partnerBought"),
      targetRef: null,
    },
    // Atout choisi — highlight atout
    {
      id: "trump-set",
      when: () => state.phase === "playing" && state.trump != null && state.trickNumber === 1 && state.trick.length === 0,
      text: t("tuto.trumpSet"),
      targetRef: trumpRef,
      placement: "below",
    },
    // Tu ouvres le 1er pli — highlight la main
    {
      id: "play-intro",
      when: () =>
        state.phase === "playing" &&
        state.currentPlayer === 0 &&
        state.trickNumber === 1 &&
        state.roundNumber === 1,
      text: t("tuto.playIntro"),
      targetRef: handRef,
      placement: "above",
    },
    // Valeur des cartes — highlight main (on parle de TES cartes)
    {
      id: "cards-value",
      when: () =>
        state.phase === "trick-end" &&
        state.trickNumber === 1,
      text: t("tuto.cardsValue"),
      targetRef: handRef,
      placement: "above",
    },
    // Bouton dernier pli
    {
      id: "last-trick-btn",
      when: () =>
        state.phase === "playing" &&
        state.roundNumber === 1 &&
        state.trickNumber >= 2 &&
        state.lastTrick != null,
      text: t("tuto.lastTrickBtn"),
      targetRef: lastTrickRef,
      placement: "above",
    },
    // Ghna pending — highlight main quand l'overlay Ghna s'ouvre
    {
      id: "ghna-available",
      when: () =>
        state.ghnaPending != null &&
        state.ghnaPending.seat === 0 &&
        state.roundNumber === 1,
      text: t("tuto.ghnaAvailable"),
      targetRef: handRef,
      placement: "above",
    },
    // Info Ghna général (pendant le jeu) — bulle flottante
    {
      id: "ghna-info",
      when: () =>
        state.phase === "playing" &&
        state.trickNumber >= 3 &&
        state.trickNumber <= 5 &&
        state.roundNumber === 1,
      text: t("tuto.ghnaInfo"),
      targetRef: null,
    },
    // Fin de manche — highlight score
    {
      id: "round-done",
      when: () => state.phase === "round-end" && state.roundNumber === 1,
      text: t("tuto.roundDone"),
      targetRef: scoreRef,
      placement: "below",
    },
    // Tableau suivi — highlight bouton tableau
    {
      id: "score-sheet",
      when: () => state.phase === "round-end" && state.roundNumber === 1,
      text: t("tuto.scoreSheet"),
      targetRef: scoreSheetRef,
      placement: "above",
    },
    // Menu pause — highlight bouton pause
    {
      id: "pause-tools",
      when: () => state.phase === "round-end" && state.roundNumber === 1,
      text: t("tuto.pauseTools"),
      targetRef: pauseRef,
      placement: "below",
    },
    // Farewell — bulle flottante
    {
      id: "farewell",
      when: () => state.phase === "round-end" && state.roundNumber === 1,
      text: t("tuto.farewell"),
      targetRef: null,
    },
  ];

  // Sélectionne le prochain step à montrer dès que l'état le permet.
  // Le tuto-jeu ne fire QUE si la route demande explicitement `tutorial:true`
  // (depuis l'onboarding "Apprendre à jouer" ou le replay depuis Settings).
  // Jamais automatiquement sur une partie solo lambda.
  useEffect(() => {
    if (!forceTutorial) return;
    if (mode !== "local") return;
    if (tutActiveId) return; // déjà un tooltip visible
    const next = tutSteps.find(
      (s) => !tutShownRef.current.has(s.id) && s.when(),
    );
    if (!next) return;
    // petit délai pour laisser le layout se stabiliser après la transition
    const t = setTimeout(() => setTutActiveId(next.id), 350);
    return () => clearTimeout(t);
  }, [state, dealAnim, tutActiveId, mode, forceTutorial]);

  const tutActiveStep = tutActiveId
    ? tutSteps.find((s) => s.id === tutActiveId) ?? null
    : null;

  const dismissTutStep = () => {
    if (!tutActiveId) return;
    tutShownRef.current.add(tutActiveId);
    const wasLast = tutActiveId === "farewell";
    setTutActiveId(null);
    if (wasLast) {
      markCoachmarksDone().catch(() => {});
      // Le tuto de la manche est terminé : on propose à l'utilisateur de
      // continuer la partie ou de filer direct au tuto des menus.
      setShowTutoEndChoice(true);
    }
  };

  // Réactions IA random sur événements notables
  useEffect(() => {
    if (state.phase !== "trick-end" || state.lastTrickWinner == null) return;
    const winner = state.lastTrickWinner;
    if (winner === 0) return; // pas de bulle auto pour moi
    // 25% de chance qu'un bot commente (messages alignés sur la palette)
    if (Math.random() < 0.25) {
      const msgs = [
        `${t("gameChat.quickNice")} 👏`,
        "Yallah 🚀",
        `${t("gameChat.quickWow")} 🤯`,
        `${t("gameChat.quickLuck")} 🍀`,
        "😂",
      ];
      const text = msgs[Math.floor(Math.random() * msgs.length)];
      showBubble(winner, text);
    }
  }, [state.phase, state.lastTrickWinner]);

  // Enregistrement auto de la partie finie dans l'historique
  const addMatch = useMatchHistoryStore((s) => s.add);
  const [recordedGameId, setRecordedGameId] = useState<string | null>(null);
  useEffect(() => {
    if (state.phase !== "game-end") return;
    if (recordedGameId === state.roundNumber + "-" + state.score.A + state.score.B) return;
    const id = state.roundNumber + "-" + state.score.A + state.score.B;
    setRecordedGameId(id);
    // playerNames basé sur les vrais noms (en net) ou pseudo + IA (en local)
    // En net, on distingue "quick" (matchmaking random) vs "private" (code)
    const netKind = useNetGameStore.getState().roomKind;
    const matchType =
      mode === "net"
        ? (netKind === "quick" ? "quick" : "private")
        : "solo-ai";
    const names = [0, 1, 2, 3].map((s) => displayName(s as Seat).replace("", ""));
    addMatch({
      type: matchType,
      playerNames: names,
      isBotPerSeat: computeIsBotPerSeat(),
      winnerTeam: state.score.A > state.score.B ? "A" : "B",
      scoreA: state.score.A,
      scoreB: state.score.B,
      roundsPlayed: state.roundNumber,
      rounds: roundHistory.map((r) => ({
        round: r.round,
        scoreA: r.scoreA,
        scoreB: r.scoreB,
        deltaA: r.deltaA,
        deltaB: r.deltaB,
        bidWinner: r.bidWinner,
        bidAmount: r.bidAmount,
        bidTeam: r.bidTeam,
        trump: r.trump ?? undefined,
        tricks: r.tricks,
      })),
    });
  }, [state.phase, state.score.A, state.score.B, state.roundNumber, addMatch, recordedGameId, roundHistory]);

  // Déverrouille la rotation libre sur cet écran (portrait ou landscape).
  // Quand on quitte l'écran, on re-verrouille en portrait.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  // Fermeture automatique du bidding (local mode uniquement — serveur gère en net)
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase === "bidding") {
      const closed = maybeCloseBidding(state);
      if (closed !== state) setState(() => closed);
    }
  }, [state, src.runLocalAi]);

  // IA : enchères — attend que la distribution soit terminée et que le
  // joueur humain puisse voir ses cartes avant que les bots ne commencent.
  // Se met aussi en pause quand un tooltip tutoriel est affiché.
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "bidding") return;
    if (!state.bidding) return;
    if (state.bidding.currentSeat === 0) return;
    if (dealAnim) return;
    if (tutActiveId) return;
    const seat = state.bidding.currentSeat;
    const t = setTimeout(() => {
      setState((s) => (s.phase === "bidding" && s.bidding?.currentSeat === seat ? bid(s, seat, aiBid(s, seat)) : s));
    }, 650);
    return () => clearTimeout(t);
  }, [state, src.runLocalAi, dealAnim, tutActiveId]);

  // IA : choix de l'atout
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "choosing-trump") return;
    if (state.bidWinner === 0) return;
    if (tutActiveId) return;
    const seat = state.bidWinner;
    if (seat == null) return;
    const t = setTimeout(() => {
      setState((s) => (s.phase === "choosing-trump" && s.bidWinner === seat ? chooseTrump(s, seat, aiChooseTrump(s, seat)) : s));
    }, 700);
    return () => clearTimeout(t);
  }, [state.phase, state.bidWinner, src.runLocalAi, tutActiveId]);

  // IA : joue une carte
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "playing") return;
    if (state.currentPlayer === 0) return;
    if (tutActiveId) return;
    const seat = state.currentPlayer;
    const t = setTimeout(() => {
      setState((s) => {
        if (s.phase !== "playing" || s.currentPlayer !== seat) return s;
        const pick = aiPick(s, seat);
        return pick ? playCard(s, seat, pick) : s;
      });
    }, 650);
    return () => clearTimeout(t);
  }, [state, src.runLocalAi, tutActiveId]);

  // IA : annonce Ghna si dispo
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (!state.ghnaPending) return;
    if (state.ghnaPending.seat === 0) return;
    if (tutActiveId) return;
    const { seat, options } = state.ghnaPending;
    const t = setTimeout(() => {
      const pick = options[0];
      setState((s) => (s.ghnaPending && s.ghnaPending.seat === seat ? announceGhna(s, seat, pick.suit) : s));
    }, 800);
    return () => clearTimeout(t);
  }, [state.ghnaPending, src.runLocalAi, tutActiveId]);

  // Auto-advance fin de pli / manche
  // En local : on setState directement. En net : on send un message au serveur
  // via src.nextTrick / src.nextRound (le serveur broadcast le nouvel état).
  useEffect(() => {
    // Si une Ghna est en attente pour le joueur humain, on ne passe PAS au pli
    // suivant tant qu'il n'a pas décidé (annoncer ou passer).
    if (state.phase === "trick-end" && state.ghnaPending?.seat === 0) return;
    if (state.phase === "trick-end") {
      const t = setTimeout(() => src.nextTrick(), 1400);
      return () => clearTimeout(t);
    }
    if (state.phase === "round-end") {
      // En local : 1) applique endRound pour voir le message, 2) attend 2.6s, 3) startNextRound
      // En net : le serveur applique endRound automatiquement, on attend juste le message
      //         puis on envoie nextRound.
      if (state.message == null) {
        if (src.runLocalAi) setState(endRound);
        return; // net attend que le serveur broadcast le state avec message
      }
      const t = setTimeout(() => {
        if (src.runLocalAi) {
          setState((s) => (s.phase === "round-end" ? startNextRound(s) : s));
        } else {
          src.nextRound();
        }
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.message, state.ghnaPending, src.runLocalAi]);

  const myHand = useMemo(() => sortHand(state.hands[0]), [state.hands[0]]);
  const legal = useMemo(() => {
    if (state.phase !== "playing" || state.currentPlayer !== 0) return new Set<string>();
    return new Set(legalMoves(state, 0).map(cardKey));
  }, [state]);
  const myTurn = state.currentPlayer === 0 && state.phase === "playing";

  const handleTapCard = (idx: number) => {
    const card = myHand[idx];
    if (!card) return;
    const canPlay = myTurn && legal.has(cardKey(card));
    // Si la carte sélectionnée est rejouée et qu'elle est jouable → on la joue
    if (canPlay && selectedIdx === idx) {
      src.play(0, card);
      setSelectedIdx(null);
      return;
    }
    // Sinon on l'affiche en preview (surélevée), sans la jouer
    setSelectedIdx(selectedIdx === idx ? null : idx);
    // Si tap sur une carte illégale pendant mon tour, retour haptique
    if (state.phase === "playing" && myTurn && !legal.has(cardKey(card))) {
      playSound("tapIllegal");
    }
  };

  const resetGame = () => {
    src.resetGame();
    // Nettoie aussi l'état d'UI transitoire pour éviter qu'un vieux contenu
    // (bulles de chat/enchères de la partie précédente, carte sélectionnée,
    // shake map) reste visible pendant le début de la nouvelle partie.
    setSelectedIdx(null);
    setBubbles({ 0: null, 1: null, 2: null, 3: null });
    setShakeMap({});
    setShowLastTrick(false);
    setShowScoreSheet(false);
    setShowTutoEndChoice(false);
    setRoundHistory([]);
    setRecordedGameId(null);
  };

  // Nom à afficher pour un siège
  // - net : nom réel reçu du serveur (humains + Bots)
  // - local : siège 0 = pseudo de l'utilisateur, autres = "IA 1/2/3"
  const myUsername = useAuthStore((s) => s.user?.username);
  const displayName = (seat: Seat): string => {
    if (src.netPlayers) {
      const p = src.netPlayers.find((x) => x.seat === seat);
      if (p) return p.name + (p.isAi ? "" : "");
    }
    if (seat === 0 && myUsername) return myUsername;
    return PLAYERS[seat].name;
  };
  // Vrai flag bot par siège — source de vérité : p.isAi côté serveur,
  // PLAYERS[seat].human côté local. Utilisé pour enregistrer la partie
  // de façon fiable (indépendant du pseudo, qui peut collisionner).
  const isBotAt = (seat: Seat): boolean => {
    if (src.netPlayers) {
      const p = src.netPlayers.find((x) => x.seat === seat);
      if (p) return !!p.isAi;
      return false; // siège libre / déconnecté : pas un bot
    }
    return !PLAYERS[seat].human;
  };
  const computeIsBotPerSeat = (): boolean[] =>
    ([0, 1, 2, 3] as Seat[]).map((s) => isBotAt(s));
  // Initiales = première lettre du nom affiché
  const displayInitials = (seat: Seat): string => {
    const name = displayName(seat).replace("", "").trim();
    return (name[0] ?? "?").toUpperCase();
  };

  // Remplace les noms par défaut de l'engine ("Vous", "IA 1/2/3") par les
  // vrais pseudos dans les messages générés par le moteur de jeu.
  const rewriteMessage = (msg: string | null): string | null => {
    if (!msg) return msg;
    let out = msg;
    for (let s = 0 as Seat; s < 4; s = (s + 1) as Seat) {
      const defaultName = PLAYERS[s].name;
      const realName = displayName(s);
      if (defaultName && realName && defaultName !== realName) {
        out = out.split(defaultName).join(realName.replace("", ""));
      }
    }
    return out;
  };

  // Géométrie table — adaptative portrait/landscape
  const isLandscape = SW > SH;
  // Sur tablette (plus petite dim ≥ 600), on laisse la table grossir jusqu'à 560px
  // au lieu de plafonner à 360/400 comme sur téléphone.
  const isTabletSize = Math.min(SW, SH) >= 600;
  const tableCap = isTabletSize ? (isLandscape ? 560 : 520) : (isLandscape ? 400 : 360);
  const TOP_BAR_H = (isLandscape ? 48 : 150) + insets.top;
  const HAND_H = isLandscape ? 82 : 180;
  const availH = SH - TOP_BAR_H - HAND_H - insets.bottom;
  const diameter = Math.min(SW - 28, availH - 8, tableCap);
  const tableCenterX = SW / 2;
  const tableCenterY = TOP_BAR_H + availH / 2;
  const tableLeft = tableCenterX - diameter / 2;
  const tableRight = tableCenterX + diameter / 2;
  const tableTop = tableCenterY - diameter / 2;
  const tableBottom = tableCenterY + diameter / 2;

  // Pli groupé par position
  const playedByPos: Partial<Record<Pos, CardType>> = {};
  state.trick.forEach((t) => { playedByPos[PLAYERS[t.player].pos] = t.card; });

  const isActive = (seat: Seat) =>
    (state.phase === "playing" && state.currentPlayer === seat) ||
    (state.phase === "bidding" && state.bidding?.currentSeat === seat) ||
    (state.phase === "choosing-trump" && state.bidWinner === seat);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0f0804", "#1a0e05"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Barre haute — en landscape, atout et score étalés aux deux bords */}
      <View style={[styles.topBar, { top: (isLandscape ? 12 : 20) + insets.top, justifyContent: isLandscape ? "space-between" : "center" }]}>
        {isLandscape ? (
          <>
            {/* Atout à gauche */}
            <View style={[styles.landscapeSide, { left: 14 }]}>
              {state.trump ? (
                <View style={styles.trumpPill}>
                  <View style={styles.trumpDisc}>
                    <SuitGlyph suit={state.trump} size={18} />
                  </View>
                  <View>
                    <Text style={styles.trumpEyebrow}>{t("game.trumpLabel")}</Text>
                    <Text style={styles.trumpName}>
                      {suitLabel(state.trump)}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.trumpPill}>
                  <Text style={styles.trumpNone}>{t("game.trumpPending")}</Text>
                </View>
              )}
            </View>

            {/* Score tout à droite */}
            <View style={[styles.landscapeSide, { right: 18 }]}>
              <View style={styles.scorePill}>
                <ScoreSide label={t("game.scoreUs")} score={state.score.A} color={COLORS.brass} />
                <View style={styles.scoreSep} />
                <ScoreSide label={t("game.scoreThem")} score={state.score.B} color={COLORS.cream} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.topPills}>
            {state.trump ? (
              <View ref={trumpRef} collapsable={false} style={styles.trumpPill}>
                <View style={styles.trumpDisc}>
                  <SuitGlyph suit={state.trump} size={18} />
                </View>
                <View>
                  <Text style={styles.trumpEyebrow}>{t("game.trumpLabel")}</Text>
                  <Text style={styles.trumpName}>
                    {suitLabel(state.trump)}
                  </Text>
                </View>
              </View>
            ) : (
              <View ref={trumpRef} collapsable={false} style={styles.trumpPill}>
                <Text style={styles.trumpNone}>{t("game.trumpPending")}</Text>
              </View>
            )}
            <View ref={scoreRef} collapsable={false} style={styles.scorePill}>
              <ScoreSide label={t("game.scoreUs")} score={state.score.A} color={COLORS.brass} />
              <View style={styles.scoreSep} />
              <ScoreSide label={t("game.scoreThem")} score={state.score.B} color={COLORS.cream} />
            </View>
          </View>
        )}
      </View>

      {/* Info manche + mise
          En portrait : entre le topBar et la table (top: 128)
          En landscape : décalé en haut à droite sous le score, hors table */}
      {state.bidAmount != null && state.bidWinner != null && (
        <View
          style={[
            styles.roundInfo,
            isLandscape
              ? { top: 64 + insets.top, right: 14, left: undefined, alignItems: "flex-end" }
              : { top: 128 + insets.top },
          ]}
        >
          <Text style={styles.roundInfoText}>
            Manche {state.roundNumber} · Mise : {state.bidAmount} ({displayName(state.bidWinner)})
          </Text>
        </View>
      )}

      {/* Table bois */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: tableLeft,
          top: tableTop,
          width: diameter,
          height: diameter,
        }}
      >
        <WoodTable diameter={diameter} />

        {/* Pli au centre */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {(["top", "right", "bottom", "left"] as Pos[]).map((pos) => {
            const card = playedByPos[pos];
            if (!card) return null;
            const isWinning =
              state.phase === "trick-end" &&
              state.lastTrickWinner != null &&
              PLAYERS[state.lastTrickWinner].pos === pos;
            // Cartes jouées plus petites en landscape (table réduite)
            const CARD_W = isLandscape ? 44 : 62;
            const CARD_H = isLandscape ? 64 : 92;
            const centerOffset = diameter / 2;
            const offset = isLandscape ? 30 : 42;
            let positionStyle: any;
            if (pos === "top")
              positionStyle = { left: centerOffset - CARD_W / 2, top: centerOffset - CARD_H / 2 - offset, transform: [{ rotate: "6deg" }] };
            else if (pos === "bottom")
              positionStyle = { left: centerOffset - CARD_W / 2, top: centerOffset - CARD_H / 2 + offset, transform: [{ rotate: "-3deg" }] };
            else if (pos === "left")
              positionStyle = { left: centerOffset - CARD_H / 2 - offset + 10, top: centerOffset - CARD_W / 2, transform: [{ rotate: "-90deg" }] };
            else
              positionStyle = { left: centerOffset + offset - CARD_H / 2 + 20, top: centerOffset - CARD_W / 2, transform: [{ rotate: "90deg" }] };
            return (
              <View key={pos} style={[{ position: "absolute" }, positionStyle]}>
                <Card rank={card.rank} suit={card.suit} size={isLandscape ? "sm" : "md"} highlighted={isWinning} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Sièges — positionnés sur le diamètre de la table dans les deux orientations */}
      {/* Long-press en mode net = ouvre la modal de signalement */}
      {(() => {
        const isDisconnected = (seat: Seat): boolean => {
          if (!src.netPlayers) return false;
          const p = src.netPlayers.find((x) => x.seat === seat);
          if (!p || p.isAi) return false;
          return !p.connected;
        };
        return (
          <>
            <SeatBadge player={{ ...PLAYERS[2], name: displayName(2), initials: displayInitials(2) }} active={isActive(2)}
              style={{ top: isLandscape ? 2 : tableTop - 18, left: 0, right: 0, alignItems: "center" }}
              disconnected={isDisconnected(2)}
              onLongPress={mode === "net" ? () => setReportTarget(displayName(2)) : undefined} />
            <SeatBadge player={{ ...PLAYERS[0], name: displayName(0), initials: displayInitials(0) }} active={isActive(0)}
              style={{ top: tableBottom - 18, left: 0, right: 0, alignItems: "center" }}
              disconnected={isDisconnected(0)} />
            <SeatBadge player={{ ...PLAYERS[3], name: displayName(3), initials: displayInitials(3) }} active={isActive(3)}
              style={{
                top: tableCenterY - 18,
                left: Math.max(6, tableLeft - 110),
                alignItems: "flex-start",
              }}
              disconnected={isDisconnected(3)}
              onLongPress={mode === "net" ? () => setReportTarget(displayName(3)) : undefined} />
            <SeatBadge player={{ ...PLAYERS[1], name: displayName(1), initials: displayInitials(1) }} active={isActive(1)}
              style={{
                top: tableCenterY - 18,
                right: Math.max(6, SW - tableRight - 110),
                alignItems: "flex-end",
              }}
              disconnected={isDisconnected(1)}
              onLongPress={mode === "net" ? () => setReportTarget(displayName(1)) : undefined} />
          </>
        );
      })()}

      {/* Piles face-down chez les 3 autres joueurs (uniquement après la distribution) */}
      {!dealAnim && (
        <>
          <PlayerPile
            count={state.hands[2].length}
            style={{
              position: "absolute",
              top: isLandscape ? 32 : tableTop + 4,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          />
          <PlayerPile
            count={state.hands[3].length}
            rotate="90deg"
            style={{
              position: "absolute",
              top: tableCenterY + 24,
              left: Math.max(16, tableLeft - 70),
            }}
          />
          <PlayerPile
            count={state.hands[1].length}
            rotate="-90deg"
            style={{
              position: "absolute",
              top: tableCenterY + 24,
              right: Math.max(16, SW - tableRight - 70),
            }}
          />
        </>
      )}

      {/* Message — toast qui reste 5s puis fade-out */}
      <ToastMessage text={rewriteMessage(state.message)} isLandscape={isLandscape} HAND_H={HAND_H} />

      {/* (anciennement "À toi de jouer" — retiré : le pseudo du joueur courant
          s'affiche déjà en jaune/saffron via SeatBadge active) */}

      {/* Ma main — cachée pendant le deal, apparaît ensuite.
          Le spectateur n'a pas de main. */}
      {!isSpectator && (() => {
        // Taille adaptative : plus petite en landscape pour libérer l'espace
        const handSize = isLandscape ? "sm" : "md";
        const CARD_W = isLandscape ? 44 : 62;
        const MIN_STEP = isLandscape ? 24 : 34;
        const MAX_STEP = isLandscape ? 42 : 56;
        const padding = 14;
        const n = Math.max(1, myHand.length);
        const rawStep = (SW - padding * 2 - CARD_W) / Math.max(1, n - 1);
        const step = Math.max(MIN_STEP, Math.min(MAX_STEP, rawStep));
        const marginLeft = -(CARD_W - step); // négatif = chevauchement
        return (
          <View
            ref={handRef}
            collapsable={false}
            style={[styles.myHand, { bottom: 12 + insets.bottom, height: HAND_H - 16, opacity: dealAnim ? 0 : 1 }]}
            pointerEvents={dealAnim ? "none" : "auto"}
          >
            {myHand.map((card, i) => {
              const mid = (n - 1) / 2;
              const rot = (i - mid) * (isLandscape ? 2 : 3);
              const lift = Math.abs(i - mid) * (isLandscape ? 1.2 : 1.8);
              const isSel = selectedIdx === i;
              const isLegal = legal.has(cardKey(card));
              const isIllegalTap = state.phase === "playing" && myTurn && !isLegal;
              return (
                <HandCard
                  key={cardKey(card)}
                  card={card}
                  index={i}
                  total={n}
                  selected={isSel}
                  lift={lift}
                  rot={rot}
                  marginLeft={i === 0 ? 0 : marginLeft}
                  size={handSize}
                  shakeKey={shakeMap[cardKey(card)]}
                  onPress={() => {
                    if (isIllegalTap) {
                      setShakeMap({ ...shakeMap, [cardKey(card)]: Date.now() });
                      return;
                    }
                    handleTapCard(i);
                  }}
                />
              );
            })}
          </View>
        );
      })()}

      {/* Overlay : enchères humain — attend que la distribution soit finie
          (sinon la fenêtre apparaît avant que le joueur voie ses cartes).
          Pas de fenêtre en mode spectateur. */}
      {!isSpectator && state.phase === "bidding" && state.bidding?.currentSeat === 0 && !dealAnim && (() => {
        const b = state.bidding;
        const hist = b.history;
        const iBid = hist.some((h) => h.seat === 0 && h.action.kind === "bid");
        const hasSignaled = hist.some(
          (h) => h.seat === 0 && h.action.kind === "signal",
        );
        const usedAs = hist.some(
          (h) => h.seat === 0 && h.action.kind === "signal" && h.action.signal === "as",
        );
        const usedCompte = hist.some(
          (h) => h.seat === 0 && h.action.kind === "signal" && h.action.signal === "compte",
        );
        return (
          <BiddingOverlay
            bottomOffset={HAND_H + 10}
            highest={b.highest?.amount ?? null}
            canBid={!hasSignaled}
            canSignalAs={!iBid && !usedAs}
            canSignalCompte={!iBid && !usedCompte}
            onAction={(action) => src.bid(0, action)}
          />
        );
      })()}

      {/* Overlay : choix d'atout humain */}
      {!isSpectator && state.phase === "choosing-trump" && state.bidWinner === 0 && (
        <TrumpOverlay
          bottomOffset={HAND_H + 10}
          onChoose={(suit) => src.chooseTrump(0, suit)}
        />
      )}

      {/* Overlay : Ghna — seul le buyer (décideur) le voit. Son siège local
          est 0 (nous), donc le prompt apparaît quand ghnaPending.seat === 0. */}
      {!isSpectator && state.ghnaPending && state.ghnaPending.seat === 0 && (
        <GhnaOverlay
          bottomOffset={HAND_H + 10}
          options={state.ghnaPending.options}
          mySeat={0}
          partnerName={displayName(2 as Seat)}
          onChoose={(suit) => src.announceGhna(0, suit)}
          onSkip={() => src.dismissGhna()}
        />
      )}

      {/* Chat launcher (bouton flottant) — pas pour le spectateur */}
      {!isSpectator && (
        <ChatLauncher
          bottom={HAND_H + 6}
          onSend={(msg) => {
            const clean = sanitize(msg);
            showBubble(0, clean);
            if (mode === "net") useNetGameStore.getState().sendChat(clean);
          }}
        />
      )}

      {/* Badge "Mode spectateur" */}
      {isSpectator && (
        <View style={styles.spectatorBadge}>
          <Text style={styles.spectatorBadgeText}>◁ MODE SPECTATEUR</Text>
        </View>
      )}

      {/* Bouton pause — placé EN DESSOUS de la pille atout dans les deux modes */}
      <View ref={pauseRef} collapsable={false} style={[styles.pauseBtnWrap, { top: (isLandscape ? 70 : 130) + insets.top }]}>
        <Pressable
          onPress={() => setPaused(true)}
          style={styles.pauseBtn}
          hitSlop={10}
        >
          <Text style={styles.pauseBtnIcon}>☰</Text>
        </Pressable>
      </View>

      {/* Countdown de timeout (hors tournoi, quand un joueur a bug/traîne) */}
      {mode === "net" && <TurnCountdownBadge />}

      {/* Banner déco quand un joueur a perdu la connexion (pas forfait) */}
      {mode === "net" && (() => {
        const disconnected = (src.netPlayers ?? []).find(
          (p) => !p.isAi && !p.connected && p.seat !== 0,
        );
        if (!disconnected) return null;
        return (
          <View style={styles.disconnectedBanner}>
            <View style={styles.disconnectedBannerPill}>
              <Text style={styles.disconnectedBannerText}>
                ● {disconnected.name} s'est déconnecté — en attente
              </Text>
            </View>
          </View>
        );
      })()}

      {/* Bouton "pli précédent" — toujours visible dès l'entrée en partie.
          Affiche un message « aucun pli » quand il n'y en a pas encore (tout
          début de partie, ou nouvelle manche : se vide à chaque manche).
          En portrait, empilé SOUS le bouton de score. En landscape, à gauche. */}
      <Pressable
        ref={lastTrickRef}
        onPress={() => setShowLastTrick(true)}
        style={[
          styles.lastTrickBtn,
          isLandscape
            ? { bottom: HAND_H + 6, right: 64 }
            : { bottom: HAND_H + 6, right: 14 },
        ]}
      >
        <Text style={styles.lastTrickIcon}>◁</Text>
      </Pressable>

      {/* Overlay du pli précédent. `state.lastTrick` n'est considéré que si
          on a déjà joué au moins un pli DANS LA MANCHE COURANTE (trickNumber
          >= 2, ou encore en cours sur le 2e pli et plus). Sinon → empty state. */}
      {showLastTrick && (() => {
        const currentRoundTrick =
          state.trickNumber >= 2 && state.lastTrick ? state.lastTrick : null;
        return (
          <LastTrickOverlay
            trick={currentRoundTrick?.entries ?? null}
            winner={currentRoundTrick?.winner ?? null}
            onClose={() => setShowLastTrick(false)}
            getName={displayName}
          />
        );
      })()}

      {/* Bouton "tableau de suivi" — toujours visible dès l'entrée en partie.
          L'overlay affiche un état vide quand aucune manche n'est encore
          terminée. En portrait, empilé AU-DESSUS du bouton "pli précédent". */}
      <Pressable
        ref={scoreSheetRef}
        onPress={() => setShowScoreSheet(true)}
        style={[
          styles.scoreSheetBtn,
          isLandscape
            ? { bottom: HAND_H + 6 }
            : { bottom: HAND_H + 60, right: 14 },
        ]}
      >
        <Text style={styles.scoreSheetIcon}>≡</Text>
      </Pressable>

      {/* Overlay tableau de suivi */}
      {showScoreSheet && (
        <LiveScoreSheetOverlay
          rounds={roundHistory}
          currentRound={state.roundNumber}
          scoreA={state.score.A}
          scoreB={state.score.B}
          onClose={() => setShowScoreSheet(false)}
          getName={displayName}
        />
      )}

      {/* Modal signaler un joueur */}
      {reportTarget && (
        <ReportModal
          targetName={reportTarget}
          roomCode={useNetGameStore.getState().roomCode ?? undefined}
          onClose={() => setReportTarget(null)}
        />
      )}

      {/* Menu pause */}
      {paused && (
        <PauseMenu
          soundOn={soundOn}
          onToggleSound={() => {
            const next = !soundOn;
            setSoundOn(next);
            setSoundEnabled(next);
          }}
          onRules={() => { setPaused(false); navigation.navigate("Rules"); }}
          onClose={() => setPaused(false)}
          onQuit={() => {
            setPaused(false);
            // Coupe tous les sons (deal, trickWin, etc.) pour éviter qu'ils
            // continuent après la navigation vers Home.
            stopAllSounds().catch(() => {});
            // Enregistrement direct dans l'historique (abandon) — sinon la
            // navigation vers Home coupe avant que le useEffect "game-end"
            // ne capte la fin de partie.
            try {
              const names = [0, 1, 2, 3].map((s) => displayName(s as Seat).replace("", ""));
              const kind = useNetGameStore.getState().roomKind;
              addMatch({
                type: mode === "net" ? (kind === "quick" ? "quick" : "private") : "solo-ai",
                playerNames: names,
                isBotPerSeat: computeIsBotPerSeat(),
                winnerTeam: "B",     // l'adversaire gagne (je suis en équipe A, siège 0)
                scoreA: 0,
                scoreB: 600,
                roundsPlayed: state.roundNumber,
                rounds: roundHistory.map((r) => ({
                  round: r.round,
                  scoreA: r.scoreA,
                  scoreB: r.scoreB,
                  deltaA: r.deltaA,
                  deltaB: r.deltaB,
                  bidWinner: r.bidWinner,
                  bidAmount: r.bidAmount,
                  bidTeam: r.bidTeam,
                  trump: r.trump ?? undefined,
                  tricks: r.tricks,
                })),
              });
            } catch {}

            if (mode === "net") {
              // Envoie le forfait au serveur (pour tournois + autres joueurs)
              // puis déconnecte.
              try { useNetGameStore.getState().sendForfeit(); } catch {}
              setTimeout(() => {
                useNetGameStore.getState().disconnect().catch(() => {});
              }, 150);
            }
            navigation.navigate("MainTabs");
          }}
        />
      )}

      {/* Modal de fin du tuto : Continuer / Passer au tuto des menus */}
      {showTutoEndChoice && (
        <TutoEndChoiceModal
          onContinue={() => setShowTutoEndChoice(false)}
          onGoToMenuTuto={() => {
            setShowTutoEndChoice(false);
            stopAllSounds().catch(() => {});
            // Même logique que l'abandon : on enregistre la partie comme
            // défaite et on retourne aux MainTabs. Le flag pendingMenuTutorial
            // (posé au moment de l'onboarding "full") déclenche alors l'overlay
            // de tuto des menus une fois sur MainTabs.
            try {
              // Même formatage de nom que les 2 autres sites d'enregistrement
              // (pause quit + fin normale), pour que `playerNames` soit cohérent
              // en base quelle que soit la voie d'abandon.
              const names = [0, 1, 2, 3].map((s) => displayName(s as Seat).replace("", ""));
              addMatch({
                type: mode === "net" ? "private" : "solo-ai",
                playerNames: names,
                isBotPerSeat: computeIsBotPerSeat(),
                winnerTeam: "B",
                scoreA: 0,
                scoreB: 600,
                roundsPlayed: state.roundNumber,
                rounds: roundHistory.map((r) => ({
                  round: r.round,
                  scoreA: r.scoreA,
                  scoreB: r.scoreB,
                  deltaA: r.deltaA,
                  deltaB: r.deltaB,
                  bidWinner: r.bidWinner,
                  bidAmount: r.bidAmount,
                  bidTeam: r.bidTeam,
                  trump: r.trump ?? undefined,
                  tricks: r.tricks,
                })),
              });
            } catch {}
            if (mode === "net") {
              try { useNetGameStore.getState().sendForfeit(); } catch {}
              setTimeout(() => {
                useNetGameStore.getState().disconnect().catch(() => {});
              }, 150);
            }
            navigation.navigate("MainTabs", { screen: "Home" });
          }}
        />
      )}

      {/* Bulles au-dessus de chaque joueur : chat ou dire d'enchère/ghna */}
      {(() => {
        const textAt = (s: Seat) => bidBubbles[s] ?? bubbles[s]?.text ?? null;
        return (
          <>
            {textAt(2) && (
              <ChatBubble
                text={textAt(2) as string}
                anchor={{ top: tableTop + 12, left: SW / 2 - 80 }}
              />
            )}
            {textAt(0) && (
              <ChatBubble
                text={textAt(0) as string}
                anchor={{ top: tableBottom - 60, left: SW / 2 - 80 }}
              />
            )}
            {textAt(3) && (
              <ChatBubble
                text={textAt(3) as string}
                anchor={{ top: tableCenterY - 60, left: Math.max(16, tableLeft - 40) }}
              />
            )}
            {textAt(1) && (
              <ChatBubble
                text={textAt(1) as string}
                anchor={{ top: tableCenterY - 60, right: Math.max(16, SW - tableRight - 40) }}
              />
            )}
          </>
        );
      })()}

      {/* Animation distribution des cartes */}
      {dealAnim && (
        <DealingAnimation
          tableCenterX={tableCenterX}
          tableCenterY={tableCenterY}
          tableTop={tableTop}
          tableBottom={tableBottom}
          onDone={() => setDealAnim(null)}
        />
      )}

      {/* Overlay : fin de partie (plein écran, main devient sans importance) */}
      {state.phase === "game-end" && (
        <GameEndOverlay
          winningTeam={state.score.A > state.score.B ? "A" : "B"}
          scoreA={state.score.A}
          scoreB={state.score.B}
          mode={mode}
          tutorial={state.tutorial === true}
          onRestart={async () => {
            if (mode === "net") {
              // Net : on quitte la room et on retourne à l'accueil
              await useNetGameStore.getState().disconnect();
              navigation.navigate("MainTabs", { screen: "Home" });
            } else {
              resetGame();
            }
          }}
          onHome={async () => {
            if (mode === "net") {
              await useNetGameStore.getState().disconnect();
            }
            navigation.navigate("MainTabs", { screen: "Home" });
          }}
          onSeeDetail={async () => {
            // La dernière partie en tête de l'historique est celle qu'on vient de finir
            const last = useMatchHistoryStore.getState().matches[0];
            if (last) navigation.navigate("MatchDetail", { id: last.id });
          }}
        />
      )}

      {/* Historique d'enchères */}
      {state.phase === "bidding" && state.bidding && state.bidding.history.length > 0 && (
        <BidHistory history={state.bidding.history} getName={displayName} />
      )}

      {/* Tutoriel événementiel — seulement sur la 1ère partie solo.
          Un seul tooltip à la fois, déclenché par les transitions du jeu. */}
      <Coachmark
        visible={tutActiveStep != null}
        onDone={dismissTutStep}
        steps={
          tutActiveStep
            ? [
                {
                  targetRef: tutActiveStep.targetRef,
                  text: tutActiveStep.text,
                  placement: tutActiveStep.placement,
                  ctaLabel: tutActiveStep.id === "farewell" ? t("tuto.ctaPlay") : t("tuto.ctaGot"),
                },
              ]
            : []
        }
      />
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function HandCard({
  card,
  index,
  selected,
  lift,
  rot,
  marginLeft,
  size,
  shakeKey,
  onPress,
}: {
  card: CardType;
  index: number;
  total: number;
  selected: boolean;
  lift: number;
  rot: number;
  marginLeft: number;
  size: "sm" | "md";
  shakeKey: number | undefined;
  onPress: () => void;
}) {
  const shakeX = useState(() => new Animated.Value(0))[0];
  const lastShake = useRef<number | undefined>(shakeKey);
  useEffect(() => {
    if (shakeKey == null) return;
    // Évite de vibrer au mount / re-mount : on ne déclenche que sur changement
    // réel de la valeur
    if (shakeKey === lastShake.current) return;
    lastShake.current = shakeKey;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeKey, shakeX]);

  return (
    <Animated.View
      style={{
        marginLeft,
        zIndex: selected ? 30 : index,
        transform: [
          { translateY: selected ? -32 : lift },
          { rotate: `${rot}deg` },
          { translateX: shakeX },
        ],
      }}
    >
      <Pressable onPress={onPress}>
        <Card rank={card.rank} suit={card.suit} size={size} highlighted={selected} />
      </Pressable>
    </Animated.View>
  );
}

function LastTrickOverlay({
  trick,
  winner,
  onClose,
  getName,
}: {
  trick: import("@touti/shared").TrickEntry[] | null;
  winner: Seat | null;
  onClose: () => void;
  getName: (seat: Seat) => string;
}) {
  const t = useT();
  const nameOf = (s: Seat) => getName(s).replace("", "");
  const empty = !trick || trick.length === 0 || winner == null;
  return (
    <Pressable onPress={onClose} style={styles.lastTrickOverlay}>
      <View style={styles.lastTrickCard}>
        <Text style={styles.lastTrickEyebrow}>{t("game.lastTrickTitle")}</Text>
        {empty ? (
          <Text style={styles.lastTrickTitle}>{t("game.lastTrickEmpty")}</Text>
        ) : (
          <>
            <Text style={styles.lastTrickTitle}>
              {t("game.lastTrickWonBy", { name: nameOf(winner) })}
            </Text>
            <View style={styles.lastTrickCards}>
              {trick.map((entry, i) => {
                const isWinner = entry.player === winner;
                return (
                  <View key={i} style={styles.lastTrickItem}>
                    <Text style={[styles.lastTrickPlayer, isWinner && { color: COLORS.saffronSoft }]}>
                      {nameOf(entry.player)}
                      {isWinner && " ★"}
                    </Text>
                    <Card rank={entry.card.rank} suit={entry.card.suit} size="md" highlighted={isWinner} />
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.lastTrickClose}>{t("game.lastTrickClose")}</Text>
      </View>
    </Pressable>
  );
}

// Overlay qui montre la progression manche par manche, mise à jour auto
function LiveScoreSheetOverlay({
  rounds,
  currentRound,
  scoreA,
  scoreB,
  onClose,
  getName,
}: {
  rounds: Array<{
    round: number;
    scoreA: number;
    scoreB: number;
    deltaA: number;
    deltaB: number;
    bidWinner: Seat | null;
    bidAmount: number | null;
    bidTeam: "A" | "B" | null;
  }>;
  currentRound: number;
  scoreA: number;
  scoreB: number;
  onClose: () => void;
  getName: (seat: Seat) => string;
}) {
  const t = useT();
  return (
    <View style={styles.scoreSheetOverlay}>
      {/* Zone de tap-outside-to-close qui n'absorbe PAS les gestures du ScrollView */}
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={styles.scoreSheetCard}>
        <Text style={styles.scoreSheetEyebrow}>{t("game.scoreSheetTitle")}</Text>
        <Text style={styles.scoreSheetTitle}>{t("game.scoreSheetRound", { n: currentRound })}</Text>

        {/* Totaux des 2 équipes */}
        <View style={styles.scoreSheetTotals}>
          <View style={styles.scoreSheetTeam}>
            <Text style={styles.scoreSheetTeamLabel}>{t("game.scoreUs").toUpperCase()}</Text>
            <Text style={[styles.scoreSheetTeamValue, { color: COLORS.saffronSoft }]}>{scoreA}</Text>
          </View>
          <Text style={styles.scoreSheetVs}>·</Text>
          <View style={styles.scoreSheetTeam}>
            <Text style={styles.scoreSheetTeamLabel}>{t("game.scoreThem").toUpperCase()}</Text>
            <Text style={styles.scoreSheetTeamValue}>{scoreB}</Text>
          </View>
        </View>

        {/* Liste manche par manche */}
        <ScrollView
          style={{ maxHeight: 340, marginTop: 4 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <View style={styles.scoreSheetHeaderRow}>
            <Text style={[styles.scoreSheetHCol, { width: 32 }]}>#</Text>
            <Text style={[styles.scoreSheetHCol, { flex: 1 }]}>{t("game.bid")}</Text>
            <Text style={[styles.scoreSheetHCol, { width: 54, textAlign: "right" }]}>{t("game.scoreUs").toUpperCase()}</Text>
            <Text style={[styles.scoreSheetHCol, { width: 54, textAlign: "right" }]}>{t("game.scoreThem").toUpperCase()}</Text>
          </View>
          {rounds.length === 0 ? (
            <Text style={styles.scoreSheetEmpty}>
              {t("game.scoreSheetEmpty")}
            </Text>
          ) : (
            rounds.map((r) => {
              const success = r.bidTeam === "A" ? r.deltaA >= 0 : r.deltaB >= 0;
              return (
                <View key={r.round} style={styles.scoreSheetRow}>
                  <Text style={[styles.scoreSheetNum, { width: 32 }]}>{r.round}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scoreSheetBidder}>
                      {r.bidWinner != null ? getName(r.bidWinner) : "—"}
                      {r.bidAmount ? ` · ${r.bidAmount}` : ""}
                    </Text>
                    <Text
                      style={[
                        styles.scoreSheetBidStatus,
                        { color: success ? "#3FC26A" : "#E8553A" },
                      ]}
                    >
                      {success ? t("scoreSheets.success") : t("scoreSheets.failure")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreSheetDelta,
                      {
                        width: 54,
                        color: r.deltaA > 0 ? "#3FC26A" : r.deltaA < 0 ? "#E8553A" : "rgba(245,235,214,0.5)",
                      },
                    ]}
                  >
                    {r.deltaA > 0 ? "+" : ""}{r.deltaA}
                  </Text>
                  <Text
                    style={[
                      styles.scoreSheetDelta,
                      {
                        width: 54,
                        color: r.deltaB > 0 ? "#3FC26A" : r.deltaB < 0 ? "#E8553A" : "rgba(245,235,214,0.5)",
                      },
                    ]}
                  >
                    {r.deltaB > 0 ? "+" : ""}{r.deltaB}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <Pressable onPress={onClose} style={styles.scoreSheetCloseBtn}>
          <Text style={styles.scoreSheetCloseText}>{t("common.close")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PlayerPile({
  count,
  rotate,
  style,
}: {
  count: number;
  rotate?: string;
  style: any;
}) {
  if (count === 0) return null;
  // Petite pile de 3 cartes empilées pour signaler "cartes en main"
  const visible = Math.min(count, 3);
  return (
    <View pointerEvents="none" style={style}>
      <View
        style={{
          width: 44,
          height: 64,
          transform: rotate ? [{ rotate }] : undefined,
        }}
      >
        {Array.from({ length: visible }).map((_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: i * 2,
              top: i * 1.5,
            }}
          >
            <Card rank={1} suit="oros" size="sm" faceDown />
          </View>
        ))}
        {count > 3 && (
          <View style={pileStyles.countBadge}>
            <Text style={pileStyles.countText}>{count}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const pileStyles = StyleSheet.create({
  countBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.brassDeep,
    borderWidth: 1,
    borderColor: COLORS.cream,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: {
    color: COLORS.cream,
    fontSize: 10,
    fontWeight: "800",
    fontFamily: FONT_UI_BOLD,
  },
});

function DealingAnimation({
  tableCenterX,
  tableCenterY,
  tableTop,
  tableBottom,
  onDone,
}: {
  tableCenterX: number;
  tableCenterY: number;
  tableTop: number;
  tableBottom: number;
  onDone: () => void;
}) {
  const cards = useState(() =>
    Array.from({ length: 40 }).map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rot: new Animated.Value(0),
    })),
  )[0];

  useEffect(() => {
    // 40 cartes : 10 vers chaque siège (bottom, right, top, left)
    const targets = [
      { dx: 0, dy: tableBottom - tableCenterY - 40 },              // bottom
      { dx: (tableBottom - tableTop) / 2 - 30, dy: 0 },            // right
      { dx: 0, dy: -(tableCenterY - tableTop) + 40 },              // top
      { dx: -((tableBottom - tableTop) / 2 - 30), dy: 0 },         // left
    ];
    const anims = cards.map((c, i) => {
      const seatIdx = i % 4;
      const t = targets[seatIdx];
      return Animated.sequence([
        Animated.delay(i * 35),
        Animated.parallel([
          Animated.timing(c.opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(c.x, { toValue: t.dx, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(c.y, { toValue: t.dy, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(c.rot, { toValue: (Math.random() - 0.5) * 20, duration: 260, useNativeDriver: true }),
        ]),
        Animated.timing(c.opacity, { toValue: 0, duration: 180, delay: 120, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(anims).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [cards, onDone, tableBottom, tableCenterY, tableTop]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {cards.map((c, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            left: tableCenterX - 31,
            top: tableCenterY - 46,
            opacity: c.opacity,
            transform: [
              { translateX: c.x },
              { translateY: c.y },
              {
                rotate: c.rot.interpolate({
                  inputRange: [-180, 180],
                  outputRange: ["-180deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <Card rank={1} suit="oros" size="md" faceDown />
        </Animated.View>
      ))}
    </View>
  );
}


function WoodTable({ diameter }: { diameter: number }) {
  const r = diameter / 2;
  const innerR = r - 10;
  return (
    <View style={{ width: diameter, height: diameter }}>
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: r,
          backgroundColor: "#000",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.7,
          shadowRadius: 24,
          elevation: 14,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: r,
          backgroundColor: WOOD.rimOuter,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 10, top: 10,
          width: diameter - 20, height: diameter - 20,
          borderRadius: innerR,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: WOOD.edgeDark,
        }}
      >
        <LinearGradient
          colors={[WOOD.surfaceTop, WOOD.surfaceBot]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Svg width="100%" height="100%" viewBox={`0 0 ${innerR * 2} ${innerR * 2}`}>
          {Array.from({ length: 9 }).map((_, i) => {
            const y = (innerR * 2) * (i + 1) / 10;
            const rx = innerR * (1.2 + i * 0.05);
            const ry = innerR * (0.3 + i * 0.1);
            return (
              <Ellipse
                key={i}
                cx={innerR}
                cy={y}
                rx={rx}
                ry={ry}
                stroke={WOOD.grain}
                strokeWidth={0.4}
                fill="none"
                opacity={0.35}
              />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => {
            const cy = innerR * (0.3 + i * 0.25);
            const cx = innerR * (0.4 + (i % 2) * 0.7);
            return (
              <Ellipse
                key={`k-${i}`}
                cx={cx}
                cy={cy}
                rx={3}
                ry={1.2}
                fill={WOOD.grain}
                opacity={0.45}
              />
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function ScoreSide({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={styles.scoreSide}>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
    </View>
  );
}

function SeatBadge({
  player,
  active,
  style,
  onLongPress,
  disconnected,
}: {
  player: (typeof PLAYERS)[number];
  active: boolean;
  style: any;
  onLongPress?: () => void;
  disconnected?: boolean;
}) {
  const isPartner = player.id === 2;
  const badge = (
    <View
      style={[
        styles.seatBadge,
        {
          borderColor: disconnected
            ? "rgba(232,85,58,0.5)"
            : active
            ? COLORS.saffron
            : isPartner
            ? `${COLORS.brass}99`
            : `${COLORS.cream}33`,
          backgroundColor: active ? COLORS.brassDeep : "rgba(0,0,0,0.55)",
          opacity: disconnected ? 0.55 : 1,
        },
      ]}
    >
      <PhotoAvatar username={player.name} initials={player.initials} size={26} color={player.color} ring={false} />
      <Text style={[styles.seatName, active && { color: "#FDF6E3" }]}>{player.name}</Text>
      {disconnected && (
        <View style={styles.disconnectedDot} />
      )}
    </View>
  );
  return (
    <View pointerEvents="box-none" style={[{ position: "absolute", zIndex: 6 }, style]}>
      {onLongPress ? (
        <Pressable onLongPress={onLongPress} delayLongPress={500}>
          {badge}
        </Pressable>
      ) : (
        badge
      )}
    </View>
  );
}

function ToastMessage({ text, isLandscape, HAND_H }: { text: string | null; isLandscape: boolean; HAND_H: number }) {
  const [displayed, setDisplayed] = useState<string | null>(null);
  const opacity = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!text) return;
    // Nouveau message : on l'affiche, tient 5s, puis fade-out 700ms
    setDisplayed(text);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const fadeTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDisplayed(null);
      });
    }, 2500);
    return () => clearTimeout(fadeTimer);
  }, [text, opacity]);

  if (!displayed) return null;

  // Position :
  //   - portrait : au-dessus de la main (hors table)
  //   - landscape : en haut à droite SOUS "Manche X · Mise X" (qui est à top:64)
  const positionStyle = isLandscape
    ? { top: 86, right: 14, left: undefined as any, marginLeft: undefined as any, width: undefined as any, maxWidth: 260 }
    : { bottom: HAND_H + 18, top: undefined as any };

  return (
    <Animated.View
      style={[styles.toastWrap, positionStyle, { opacity }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[COLORS.saffron, COLORS.brassDeep]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.toastText}>{displayed}</Text>
    </Animated.View>
  );
}

function TurnIndicator({ bottom }: { bottom: number }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  return (
    <Animated.View style={[styles.turnWrap, { bottom, transform: [{ scale }] }]}>
      <LinearGradient
        colors={[COLORS.saffron, COLORS.brassDeep]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.turnDot} />
      <Text style={styles.turnText}>{useT()("game.yourTurn")}</Text>
    </Animated.View>
  );
}

function BiddingOverlay({
  bottomOffset,
  highest,
  canBid,
  canSignalAs,
  canSignalCompte,
  onAction,
}: {
  bottomOffset: number;
  highest: number | null;
  canBid: boolean;
  canSignalAs: boolean;
  canSignalCompte: boolean;
  onAction: (a: import("@touti/shared").BidAction) => void;
}) {
  const t = useT();
  const min = highest ? highest + BID_STEP : MIN_BID;
  const choices: number[] = [];
  for (let b = min; b <= Math.min(MAX_BID, (highest ?? MIN_BID - BID_STEP) + 60); b += BID_STEP) {
    choices.push(b);
  }

  // Déplaçable via le handle en haut pour que l'utilisateur voie les dires
  // des autres joueurs (bulles ou bidHistory) qui seraient masqués
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset(panOffsetRef.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        panOffsetRef.current = {
          x: panOffsetRef.current.x + g.dx,
          y: panOffsetRef.current.y + g.dy,
        };
        pan.flattenOffset();
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { bottom: bottomOffset },
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <View style={styles.overlayCard}>
        {/* Handle de drag */}
        <View {...panResponder.panHandlers} style={styles.dragHandle}>
          <View style={styles.dragHandleBar} />
        </View>
        <Text style={styles.overlayEyebrow}>{t("game.bidding").toUpperCase()}</Text>
        <Text style={styles.overlayTitle}>{t("game.yourBid")}</Text>
        <Text style={styles.overlaySub}>
          {highest ? `${highest} ${t("common.pointsShort")}` : "—"}
        </Text>

        <Text style={styles.overlaySection}>{t("game.bid")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {!canBid || choices.length === 0 ? null : (
            choices.map((c) => (
              <Pressable
                key={c}
                onPress={() => onAction({ kind: "bid", amount: c })}
                style={styles.bidChip}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.bidChipText}>{c}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Text style={styles.overlaySection}>{t("game.signal")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            disabled={!canSignalAs}
            onPress={() => onAction({ kind: "signal", signal: "as" })}
            style={[styles.ghostBtn, !canSignalAs && { opacity: 0.4 }]}
          >
            <Text style={styles.ghostBtnText}>{t("game.signalAs")}</Text>
          </Pressable>
          <Pressable
            disabled={!canSignalCompte}
            onPress={() => onAction({ kind: "signal", signal: "compte" })}
            style={[styles.ghostBtn, !canSignalCompte && { opacity: 0.4 }]}
          >
            <Text style={styles.ghostBtnText}>{t("game.signalCount")}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => onAction({ kind: "pass" })} style={styles.passBtn}>
          <Text style={styles.passBtnText}>{t("game.pass")}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function TrumpOverlay({ bottomOffset, onChoose }: { bottomOffset: number; onChoose: (suit: Suit) => void }) {
  const t = useT();
  return (
    <View style={[styles.overlay, { bottom: bottomOffset }]}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>{t("game.trumpLabel")}</Text>
        <Text style={styles.overlayTitle}>{t("game.chooseTrump")}</Text>
        <View style={styles.trumpChoices}>
          {ALL_SUITS.map((s) => (
            <Pressable key={s} onPress={() => onChoose(s)} style={styles.trumpChoice}>
              <SuitGlyph suit={s} size={36} />
              <Text style={styles.trumpChoiceLabel}>{t(`game.suit${s.charAt(0).toUpperCase() + s.slice(1)}`)}</Text>
              <Text style={styles.trumpChoiceSub}>{t(`game.suit${s.charAt(0).toUpperCase() + s.slice(1)}Dr`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function GhnaOverlay({
  bottomOffset,
  options,
  mySeat,
  partnerName,
  onChoose,
  onSkip,
}: {
  bottomOffset: number;
  options: { suit: Suit; value: 20 | 40; owner: Seat }[];
  mySeat: Seat;
  partnerName: string;
  onChoose: (suit: Suit) => void;
  onSkip: () => void;
}) {
  const t = useT();
  // Règle : c'est le buyer (toi, qui as gagné les enchères) qui décide
  // SEUL qui chante — toi ou ton partenaire. Les options sont groupées
  // pour rendre la décision claire.
  const mine = options.filter((o) => o.owner === mySeat);
  const partnerOpts = options.filter((o) => o.owner !== mySeat);
  const hasBoth = mine.length > 0 && partnerOpts.length > 0;
  return (
    <View style={[styles.overlay, { bottom: bottomOffset }]}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>{t("game.ghnaTitle")}</Text>
        <Text style={styles.overlayTitle}>{t("game.ghnaDecide")}</Text>
        <Text style={styles.overlaySub}>
          {hasBoth
            ? t("game.ghnaBoth")
            : mine.length > 0
              ? t("game.ghnaSelf")
              : t("game.ghnaPartner", { name: partnerName })}
        </Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          {mine.length > 0 && (
            <>
              {hasBoth && <Text style={styles.ghnaGroupLabel}>{t("game.ghnaSectionMe")}</Text>}
              {mine.map((o) => (
                <Pressable key={`self-${o.suit}`} onPress={() => onChoose(o.suit)} style={styles.ghnaChip}>
                  <LinearGradient
                    colors={[COLORS.saffron, COLORS.brassDeep]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <SuitGlyph suit={o.suit} size={22} />
                  <Text style={styles.ghnaChipText}>
                    {suitNameForGhna(o.suit)} · +{o.value}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
          {partnerOpts.length > 0 && (
            <>
              {hasBoth && (
                <Text style={[styles.ghnaGroupLabel, { marginTop: 4 }]}>
                  {partnerName.toUpperCase()}
                </Text>
              )}
              {partnerOpts.map((o) => (
                <Pressable key={`partner-${o.suit}`} onPress={() => onChoose(o.suit)} style={styles.ghnaChipPartner}>
                  <SuitGlyph suit={o.suit} size={22} />
                  <Text style={styles.ghnaChipText}>
                    {suitNameForGhna(o.suit)} · +{o.value}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
          <Pressable onPress={onSkip} style={styles.passBtn}>
            <Text style={styles.passBtnText}>{t("game.ghnaPass")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function GameEndOverlay({
  winningTeam,
  scoreA,
  scoreB,
  mode,
  tutorial,
  onRestart,
  onHome,
  onSeeDetail,
}: {
  winningTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  mode: GameMode;
  tutorial?: boolean;
  onRestart: () => void;
  onHome: () => void;
  onSeeDetail: () => void;
}) {
  const won = winningTeam === "A";
  const rematchStatus = useNetGameStore((s) => s.rematchStatus);
  const [iVoted, setIVoted] = useState(false);
  const mySeat = useNetGameStore((s) => s.mySeat);

  // Si j'ai déjà voté selon le serveur, maintenir le flag
  useEffect(() => {
    if (mySeat != null && rematchStatus?.voted.includes(mySeat)) setIVoted(true);
  }, [rematchStatus, mySeat]);

  const voteRematch = () => {
    if (iVoted) return;
    setIVoted(true);
    useNetGameStore.getState().sendRematchVote(true);
  };

  const t = useT();
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>
          {tutorial
            ? t("game.tutoRoundDoneEyebrow").toUpperCase()
            : won ? t("game.gameEndWon").toUpperCase() : t("game.gameEndLost").toUpperCase()}
        </Text>
        <Text style={[styles.overlayTitle, { fontSize: 28 }]}>
          {tutorial
            ? t("game.tutoRoundDoneTitle")
            : t("game.gameEndScore", { us: scoreA, them: scoreB })}
        </Text>
        {tutorial && (
          <Text style={[styles.overlaySub, { textAlign: "center", marginTop: 8, paddingHorizontal: 8 }]}>
            {t("game.tutoRoundDoneBody")}
          </Text>
        )}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2, color: COLORS.brass }}>{t("game.scoreUs").toUpperCase()}</Text>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.saffronSoft, fontWeight: "700" }}>{scoreA}</Text>
          </View>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.brass, alignSelf: "center" }}>·</Text>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2, color: "rgba(245,235,214,0.6)" }}>{t("game.scoreThem").toUpperCase()}</Text>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.cream, fontWeight: "700" }}>{scoreB}</Text>
          </View>
        </View>

        <View style={{ gap: 8, marginTop: 18, width: 260 }}>
          <Pressable onPress={onSeeDetail} style={[styles.endBtn]}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.endBtnText}>{t("game.gameEndDetail")}</Text>
          </Pressable>

          {/* Rematch : uniquement en net, tous les humains doivent voter oui */}
          {mode === "net" && (
            <Pressable
              onPress={voteRematch}
              disabled={iVoted}
              style={[
                styles.endBtn,
                styles.endBtnSecondary,
                iVoted && { opacity: 0.65 },
              ]}
            >
              <Text style={[styles.endBtnText, { color: COLORS.saffronSoft }]}>
                {iVoted
                  ? t("game.gameEndRematchWaiting", {
                      voted: rematchStatus?.voted.length ?? 0,
                      total: rematchStatus?.total ?? 0,
                    })
                  : `↻ ${t("game.gameEndRematch")}`}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={onRestart} style={[styles.endBtn, styles.endBtnSecondary]}>
            <Text style={[styles.endBtnText, { color: COLORS.cream }]}>
              {t("game.gameEndRestart")}
            </Text>
          </Pressable>
          <Pressable onPress={onHome} style={[styles.endBtn, styles.endBtnSecondary]}>
            <Text style={[styles.endBtnText, { color: COLORS.cream }]}>{t("game.gameEndHome")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BidHistory({
  history,
  getName,
}: {
  history: import("@touti/shared").BiddingState["history"];
  getName: (seat: Seat) => string;
}) {
  const tr = useT();
  const last = history.slice(-4);
  return (
    <View style={styles.bidHistWrap} pointerEvents="none">
      {last.map((h, i) => {
        const label =
          h.action.kind === "bid" ? `${h.action.amount}`
          : h.action.kind === "pass" ? tr("game.bidPass")
          : h.action.signal === "as" ? tr("game.bidSignalAs")
          : tr("game.bidSignalCount");
        return (
          <Text key={i} style={styles.bidHistText}>
            {getName(h.seat).replace("", "")} : {label}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0603" },

  topBar: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 10,
    zIndex: 10,
  },
  resetBtn: {
    position: "absolute",
    left: 14, top: 0,
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  resetText: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 18, fontWeight: "700" },
  topPills: { flexDirection: "row", alignItems: "center", gap: 8 },
  landscapeSide: {
    position: "absolute",
    top: 0,
    justifyContent: "center",
  },

  trumpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 5, paddingRight: 10, paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    minHeight: 38,
  },
  trumpDisc: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.saffronSoft,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.saffron,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  trumpEyebrow: { fontSize: 9, color: "rgba(245,235,214,0.7)", letterSpacing: 1.5, fontWeight: "700" },
  trumpName: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.cream, fontWeight: "700", fontStyle: "italic", marginTop: 1 },
  trumpNone: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    paddingHorizontal: 8,
  },

  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  scoreSide: { flexDirection: "row", alignItems: "center", gap: 6 },
  scoreLabel: { fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700" },
  scoreNum: { fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: "700", minWidth: 28, textAlign: "center" },
  scoreGoal: { fontFamily: FONT_UI_BOLD, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  scoreSep: { width: 1, height: 18, backgroundColor: "rgba(245,235,214,0.2)" },

  roundInfo: {
    position: "absolute",
    left: 0, right: 0,
    alignItems: "center",
    zIndex: 9,
    paddingHorizontal: 8,
  },
  roundInfoText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    color: COLORS.saffronSoft,
    letterSpacing: 1.5,
    fontWeight: "700",
  },

  seatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 5, paddingRight: 10, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  seatName: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12, fontWeight: "700",
    color: COLORS.cream,
    lineHeight: 13,
    letterSpacing: 0.3,
  },

  toastWrap: {
    position: "absolute",
    top: "55%",
    left: "50%",
    marginLeft: -100,
    width: 200,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
    overflow: "hidden",
    zIndex: 15,
    shadowColor: COLORS.saffron,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toastText: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  turnWrap: {
    position: "absolute",
    left: "50%",
    marginLeft: -90,
    width: 180,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18, paddingVertical: 7,
    borderRadius: 20,
    overflow: "hidden",
    zIndex: 9,
    shadowColor: COLORS.saffron,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  turnDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FDF6E3" },
  turnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13, color: "#FDF6E3", fontWeight: "700",
    letterSpacing: 0.5,
  },

  myHand: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    zIndex: 10,
  },

  lastTrickBtn: {
    position: "absolute",
    right: 64, // décalé à gauche du bouton "tableau de suivi" qui est à droite
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 95,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  lastTrickIcon: { fontSize: 22, color: COLORS.cream, fontWeight: "700", lineHeight: 24 },

  // Bouton & overlay tableau de suivi
  scoreSheetBtn: {
    position: "absolute",
    right: 14, // placé à droite (le bouton "dernier pli" passe à gauche)
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 0.5,
    borderColor: `${COLORS.saffron}77`,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 95,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  scoreSheetIcon: { fontSize: 22, color: COLORS.saffronSoft, fontWeight: "700", lineHeight: 24 },
  scoreSheetOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 210,
    padding: 20,
  },
  scoreSheetCard: {
    backgroundColor: "#140b06",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: 400,
    zIndex: 10, // au-dessus du backdrop Pressable pour ne pas lui céder les gestures
  },
  scoreSheetEyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 3,
    color: COLORS.brass, fontWeight: "700",
    textAlign: "center",
  },
  scoreSheetTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 18, fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 2,
    textAlign: "center",
  },
  scoreSheetTotals: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginVertical: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scoreSheetTeam: { alignItems: "center" },
  scoreSheetTeamLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: "rgba(245,235,214,0.6)",
    fontWeight: "700",
  },
  scoreSheetTeamValue: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28, fontWeight: "700",
    color: COLORS.cream,
    marginTop: 2,
  },
  scoreSheetVs: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18, color: COLORS.brass,
  },
  scoreSheetHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: `${COLORS.brass}44`,
  },
  scoreSheetHCol: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9, letterSpacing: 1.5,
    color: "rgba(245,235,214,0.6)",
    fontWeight: "700",
  },
  scoreSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(245,235,214,0.08)",
  },
  scoreSheetNum: {
    fontFamily: FONT_DISPLAY,
    fontSize: 15, fontWeight: "700",
    color: COLORS.saffronSoft,
  },
  scoreSheetBidder: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12, fontWeight: "700",
    color: COLORS.cream,
  },
  scoreSheetBidStatus: {
    fontFamily: FONT_UI,
    fontSize: 10, marginTop: 2,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontStyle: "italic",
  },
  scoreSheetDelta: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14, fontWeight: "700",
    textAlign: "right",
  },
  scoreSheetEmpty: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  scoreSheetCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  scoreSheetCloseText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
  },

  lastTrickOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 20,
  },
  lastTrickCard: {
    backgroundColor: "#140b06",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },
  lastTrickEyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
  },
  lastTrickTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 4,
    marginBottom: 14,
  },
  lastTrickCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  lastTrickItem: { alignItems: "center", gap: 6 },
  lastTrickPlayer: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    color: "rgba(245,235,214,0.7)",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  lastTrickClose: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.5)",
    marginTop: 16,
    fontStyle: "italic",
  },

  // Overlays
  overlay: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 100,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  overlayCard: {
    backgroundColor: "#140b06",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  overlayEyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
  },
  overlayTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  overlaySub: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    marginTop: 6,
  },
  overlaySection: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },

  bidChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
  bidChipText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },

  endBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  endBtnSecondary: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  endBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14, fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },

  ghostBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(245,235,214,0.08)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    alignItems: "center",
  },
  ghostBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },

  passBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(200,70,45,0.25)",
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.6)",
    alignItems: "center",
  },
  passBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: "#E8553A" },

  trumpChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  trumpChoice: {
    width: "48%",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 14,
    gap: 6,
  },
  trumpChoiceLabel: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  trumpChoiceSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.6)", fontStyle: "italic" },

  ghnaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  ghnaChipPartner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(46,122,140,0.25)", // teal pâle pour différencier
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  ghnaChipText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  ghnaGroupLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
    marginTop: 2,
  },

  bidHistWrap: {
    position: "absolute",
    top: 180,
    left: 20,
    zIndex: 8,
    gap: 2,
  },
  bidHistText: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    letterSpacing: 0.5,
  },

  pauseBtnWrap: {
    position: "absolute",
    left: 14,
    width: 38, height: 38,
    borderRadius: 19,
    zIndex: 95,
  },
  pauseBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}66`,
    alignItems: "center", justifyContent: "center",
  },

  dragHandle: {
    alignItems: "center",
    paddingTop: 4, paddingBottom: 8,
    marginBottom: 4,
  },
  dragHandleBar: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: "rgba(245,235,214,0.25)",
  },
  dragHandleHint: {
    fontFamily: FONT_UI, fontSize: 9,
    color: "rgba(245,235,214,0.35)",
    marginTop: 4, letterSpacing: 0.5,
  },

  disconnectedDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#E8553A",
    marginLeft: 4,
  },

  disconnectedBanner: {
    position: "absolute",
    top: 118, left: 0, right: 0,
    alignItems: "center",
    zIndex: 50,
    pointerEvents: "none",
  },
  disconnectedBannerPill: {
    flexDirection: "row",
    alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(200,70,45,0.85)",
    borderWidth: 0.5, borderColor: "rgba(232,85,58,0.6)",
  },
  disconnectedBannerText: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.3,
  },

  spectatorBadge: {
    position: "absolute",
    top: 14, right: 14,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    borderWidth: 0.5, borderColor: `${COLORS.brass}66`,
    zIndex: 95,
  },
  spectatorBadgeText: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 1.5,
    color: COLORS.saffronSoft, fontWeight: "800",
  },

  countdownWrap: {
    position: "absolute",
    top: 118, left: 0, right: 0,
    alignItems: "center",
    zIndex: 50,
    pointerEvents: "none",
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}66`,
  },
  countdownIcon: { fontSize: 14 },
  countdownText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.3,
  },
  countdownSecs: {
    fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: "800",
    color: COLORS.saffronSoft, marginLeft: 6,
  },
  pauseBtnIcon: {
    fontSize: 18,
    color: COLORS.cream,
    fontWeight: "700",
    lineHeight: 20,
  },

  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    padding: 24,
  },
  pauseCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: COLORS.tealDeep,
    borderRadius: 18,
    borderWidth: 0.5, borderColor: `${COLORS.brass}66`,
    padding: 16,
    gap: 4,
  },
  pauseTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800",
    color: COLORS.saffronSoft, textAlign: "center",
    letterSpacing: 2,
    marginBottom: 10,
  },
  pauseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12,
  },
  pauseItemIconWrap: {
    width: 36, height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  pauseItemIcon: {
    fontSize: 16,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    fontFamily: FONT_UI_BOLD,
    lineHeight: 18,
  },
  pauseItemLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.3,
    flex: 1,
  },
  pauseDivider: {
    height: 0.5,
    backgroundColor: `${COLORS.brass}33`,
    marginVertical: 6,
  },
  pauseQuitItem: {
    backgroundColor: "rgba(200,70,45,0.12)",
  },

  reportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
    padding: 24,
  },
  reportCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.tealDeep,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}66`,
    padding: 18,
    gap: 12,
  },
  reportTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800",
    color: COLORS.cream, textAlign: "center",
  },
  reportSub: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.65)", textAlign: "center",
  },
  reportReasonBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
  },
  reportReasonText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
  },
  reportCancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  reportCancelText: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.55)",
  },
});

function TurnCountdownBadge() {
  const tr = useT();
  const countdown = useNetGameStore((s) => s.turnCountdown);
  const mySeatServer = useNetGameStore((s) => s.mySeat);
  const players = useNetGameStore((s) => s.players);
  if (!countdown) return null;
  const { seat, secs } = countdown;
  const isMe = mySeatServer != null && seat === mySeatServer;
  const playerName = players.find((p) => p.seat === seat)?.name ?? tr("game.seatLabel", { n: seat + 1 });
  return (
    <View style={styles.countdownWrap}>
      <View style={[styles.countdownPill, isMe && { borderColor: "#E8553A", backgroundColor: "rgba(200,70,45,0.25)" }]}>
        <Text style={styles.countdownIcon}>⏱</Text>
        <Text style={styles.countdownText}>
          {isMe ? tr("game.playOrAbandon") : `${playerName} · ${secs}s`}
        </Text>
        {isMe && (
          <Text style={styles.countdownSecs}>{secs}s</Text>
        )}
      </View>
    </View>
  );
}

function PauseMenu({
  soundOn,
  onToggleSound,
  onRules,
  onClose,
  onQuit,
}: {
  soundOn: boolean;
  onToggleSound: () => void;
  onRules: () => void;
  onClose: () => void;
  onQuit: () => void;
}) {
  const t = useT();
  const confirmQuit = () => {
    Alert.alert(
      t("game.quitConfirmTitle"),
      t("game.quitConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("game.quitConfirmBtn"), style: "destructive", onPress: onQuit },
      ],
    );
  };

  return (
    <View style={styles.pauseOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.pauseCard}>
        <Text style={styles.pauseTitle}>{t("game.pauseTitle")}</Text>

        <Pressable onPress={onClose} style={styles.pauseItem}>
          <View style={styles.pauseItemIconWrap}>
            <Text style={styles.pauseItemIcon}>▶</Text>
          </View>
          <Text style={styles.pauseItemLabel}>{t("game.pauseResume")}</Text>
        </Pressable>

        <Pressable onPress={onToggleSound} style={styles.pauseItem}>
          <View style={styles.pauseItemIconWrap}>
            <Text style={styles.pauseItemIcon}>{soundOn ? "♪" : "⊘"}</Text>
          </View>
          <Text style={styles.pauseItemLabel}>{soundOn ? t("game.pauseSoundOn") : t("game.pauseSoundOff")}</Text>
        </Pressable>

        <Pressable onPress={onRules} style={styles.pauseItem}>
          <View style={styles.pauseItemIconWrap}>
            <Text style={styles.pauseItemIcon}>ⓘ</Text>
          </View>
          <Text style={styles.pauseItemLabel}>{t("game.pauseRules")}</Text>
        </Pressable>

        <View style={styles.pauseDivider} />

        <Pressable onPress={confirmQuit} style={[styles.pauseItem, styles.pauseQuitItem]}>
          <View style={[styles.pauseItemIconWrap, { borderColor: "rgba(232,85,58,0.6)" }]}>
            <Text style={[styles.pauseItemIcon, { color: "#E8553A" }]}>⏻</Text>
          </View>
          <Text style={[styles.pauseItemLabel, { color: "#E8553A" }]}>
            {t("game.pauseQuit")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Modal affiché une fois le tuto de la manche terminé. L'utilisateur choisit
// s'il continue la partie en cours ou passe directement au tuto des menus.
function TutoEndChoiceModal({
  onContinue,
  onGoToMenuTuto,
}: {
  onContinue: () => void;
  onGoToMenuTuto: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.pauseOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onContinue} />
      <View style={styles.pauseCard}>
        <Text style={styles.pauseTitle}>{t("game.tutoEndTitle")}</Text>
        <Text
          style={{
            color: COLORS.cream,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: FONT_UI,
            fontWeight: "500",
            textAlign: "center",
            marginBottom: 8,
            paddingHorizontal: 4,
          }}
        >
          {t("game.tutoEndBody")}
        </Text>

        <Pressable onPress={onContinue} style={styles.pauseItem}>
          <View style={styles.pauseItemIconWrap}>
            <Text style={styles.pauseItemIcon}>▶</Text>
          </View>
          <Text style={styles.pauseItemLabel}>{t("game.tutoEndContinue")}</Text>
        </Pressable>

        <Pressable onPress={onGoToMenuTuto} style={styles.pauseItem}>
          <View style={styles.pauseItemIconWrap}>
            <Text style={styles.pauseItemIcon}>☰</Text>
          </View>
          <Text style={styles.pauseItemLabel}>{t("game.tutoEndGoMenu")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReportModal({
  targetName,
  roomCode,
  onClose,
}: {
  targetName: string;
  roomCode?: string;
  onClose: () => void;
}) {
  const tr = useT();
  const [busy, setBusy] = useState(false);

  const submit = async (reason: ReportReason) => {
    if (busy) return;
    setBusy(true);
    try {
      await apiReport({
        reportedUsername: targetName,
        reason,
        context: "game",
        roomCode,
      });
      onClose();
      Alert.alert(tr("report.sentTitle"), tr("report.sentBody", { name: targetName }));
    } catch (e: any) {
      setBusy(false);
      Alert.alert(tr("common.error"), e?.message ?? tr("game.reportErrorBody"));
    }
  };

  return (
    <View style={styles.reportOverlay}>
      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>{tr("report.title", { name: targetName })}</Text>
        <Text style={styles.reportSub}>{tr("game.reportChoose")}</Text>
        <Pressable onPress={() => submit("insulte")} style={styles.reportReasonBtn} disabled={busy}>
          <Text style={styles.reportReasonText}>{tr("report.reasonInsultFull")}</Text>
        </Pressable>
        <Pressable onPress={() => submit("triche")} style={styles.reportReasonBtn} disabled={busy}>
          <Text style={styles.reportReasonText}>{tr("game.reportReasonCheat")}</Text>
        </Pressable>
        <Pressable onPress={() => submit("spam")} style={styles.reportReasonBtn} disabled={busy}>
          <Text style={styles.reportReasonText}>{tr("game.reportReasonSpam")}</Text>
        </Pressable>
        <Pressable onPress={() => submit("autre")} style={styles.reportReasonBtn} disabled={busy}>
          <Text style={styles.reportReasonText}>{tr("game.reportReasonOther")}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.reportCancelBtn} disabled={busy}>
          <Text style={styles.reportCancelText}>{tr("game.reportCancel")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
