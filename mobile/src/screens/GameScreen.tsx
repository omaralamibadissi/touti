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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Ellipse } from "react-native-svg";
import * as ScreenOrientation from "expo-screen-orientation";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { Avatar } from "../components/Avatar";
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
} from "@touti/shared";
import { useMatchHistoryStore } from "../store/matchHistoryStore";
import { playSound } from "../sound/soundManager";
import { ChatLauncher, ChatBubble, QUICK_MESSAGES } from "../components/GameChat";
import { useGameSource, GameMode } from "../store/gameSource";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useNetGameStore } from "../store/netGameStore";
import { useAuthStore } from "../store/authStore";

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
  const mode: GameMode = (route.params?.mode as GameMode) ?? "local";
  const src = useGameSource(mode, {
    localBid: bid,
    localChooseTrump: chooseTrump,
    localPlay: playCard,
    localAnnounceGhna: announceGhna,
    localDismissGhna: dismissGhna,
    localNextTrick: nextTrick,
    localEndRound: endRound,
    localStartNextRound: startNextRound,
  });
  const state = src.state;
  const setState = src.setLocalState;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [shakeMap, setShakeMap] = useState<Record<string, number>>({});
  const [dealAnim, setDealAnim] = useState<{ round: number } | null>({ round: 1 });
  const [bubbles, setBubbles] = useState<Record<Seat, { text: string; key: number } | null>>({
    0: null, 1: null, 2: null, 3: null,
  });
  const [showLastTrick, setShowLastTrick] = useState(false);
  const [showScoreSheet, setShowScoreSheet] = useState(false);
  const { width: SW, height: SH } = useWindowDimensions();

  // Historique auto des manches (pour le panneau de suivi)
  type RoundSnap = {
    round: number;
    scoreA: number;
    scoreB: number;
    deltaA: number;
    deltaB: number;
    bidWinner: Seat | null;
    bidAmount: number | null;
    bidTeam: "A" | "B" | null;
  };
  const [roundHistory, setRoundHistory] = useState<RoundSnap[]>([]);
  const lastSnapRoundRef = useRef<number>(0);
  useEffect(() => {
    // Snapshot à la fin de chaque manche (quand message est settlé)
    if (state.phase !== "round-end" || state.message == null) return;
    if (lastSnapRoundRef.current === state.roundNumber) return;
    lastSnapRoundRef.current = state.roundNumber;
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
      };
      return [...prev, snap];
    });
  }, [state.phase, state.message, state.roundNumber]);

  // Trigger animation de distribution à chaque nouvelle manche
  useEffect(() => {
    if (state.phase === "bidding" && state.trickNumber === 1) {
      setDealAnim({ round: state.roundNumber });
    }
  }, [state.roundNumber, state.phase, state.trickNumber]);

  // Helper : affiche une bulle pour le siège X, disparaît après 3s
  const showBubble = (seat: Seat, text: string) => {
    const key = Date.now();
    setBubbles((b) => ({ ...b, [seat]: { text, key } }));
    setTimeout(() => {
      setBubbles((b) => (b[seat]?.key === key ? { ...b, [seat]: null } : b));
    }, 3000);
  };

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
  // Son léger à chaque carte posée
  const [lastTrickLen, setLastTrickLen] = useState(0);
  useEffect(() => {
    if (state.trick.length > lastTrickLen) playSound("cardPlay");
    setLastTrickLen(state.trick.length);
  }, [state.trick.length]);
  useEffect(() => {
    if (state.phase === "round-end" && state.message != null) playSound("roundEnd");
  }, [state.phase, state.message]);
  useEffect(() => {
    if (state.phase === "game-end") {
      playSound(state.score.A > state.score.B ? "gameWin" : "gameLose");
    }
  }, [state.phase]);

  // Réactions IA random sur événements notables
  useEffect(() => {
    if (state.phase !== "trick-end" || state.lastTrickWinner == null) return;
    const winner = state.lastTrickWinner;
    if (winner === 0) return; // pas de bulle auto pour moi
    // 25% de chance qu'un bot commente (messages alignés sur la palette)
    if (Math.random() < 0.25) {
      const msgs = ["Bien joué 👏", "Yallah 🚀", "Wow 🤯", "Chance 🍀", "😂"];
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
    const matchType = mode === "net" ? "private" : "solo-ai";
    const names = [0, 1, 2, 3].map((s) => displayName(s as Seat).replace(" 🤖", ""));
    addMatch({
      type: matchType,
      playerNames: names,
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
      })),
    });
  }, [state.phase, state.score.A, state.score.B, state.roundNumber, addMatch, recordedGameId]);

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

  // IA : enchères
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "bidding") return;
    if (!state.bidding) return;
    if (state.bidding.currentSeat === 0) return;
    const seat = state.bidding.currentSeat;
    const t = setTimeout(() => {
      setState((s) => (s.phase === "bidding" && s.bidding?.currentSeat === seat ? bid(s, seat, aiBid(s, seat)) : s));
    }, 650);
    return () => clearTimeout(t);
  }, [state, src.runLocalAi]);

  // IA : choix de l'atout
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "choosing-trump") return;
    if (state.bidWinner === 0) return;
    const seat = state.bidWinner;
    if (seat == null) return;
    const t = setTimeout(() => {
      setState((s) => (s.phase === "choosing-trump" && s.bidWinner === seat ? chooseTrump(s, seat, aiChooseTrump(s, seat)) : s));
    }, 700);
    return () => clearTimeout(t);
  }, [state.phase, state.bidWinner, src.runLocalAi]);

  // IA : joue une carte
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (state.phase !== "playing") return;
    if (state.currentPlayer === 0) return;
    const seat = state.currentPlayer;
    const t = setTimeout(() => {
      setState((s) => {
        if (s.phase !== "playing" || s.currentPlayer !== seat) return s;
        const pick = aiPick(s, seat);
        return pick ? playCard(s, seat, pick) : s;
      });
    }, 650);
    return () => clearTimeout(t);
  }, [state, src.runLocalAi]);

  // IA : annonce Ghna si dispo
  useEffect(() => {
    if (!src.runLocalAi) return;
    if (!state.ghnaPending) return;
    if (state.ghnaPending.seat === 0) return;
    const { seat, options } = state.ghnaPending;
    const t = setTimeout(() => {
      const pick = options[0];
      setState((s) => (s.ghnaPending && s.ghnaPending.seat === seat ? announceGhna(s, seat, pick.suit) : s));
    }, 800);
    return () => clearTimeout(t);
  }, [state.ghnaPending, src.runLocalAi]);

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

  const resetGame = () => { src.resetGame(); setSelectedIdx(null); };

  // Nom à afficher pour un siège
  // - net : nom réel reçu du serveur (humains + Bots)
  // - local : siège 0 = pseudo de l'utilisateur, autres = "IA 1/2/3"
  const myUsername = useAuthStore((s) => s.user?.username);
  const displayName = (seat: Seat): string => {
    if (src.netPlayers) {
      const p = src.netPlayers.find((x) => x.seat === seat);
      if (p) return p.name + (p.isAi ? " 🤖" : "");
    }
    if (seat === 0 && myUsername) return myUsername;
    return PLAYERS[seat].name;
  };
  // Initiales = première lettre du nom affiché
  const displayInitials = (seat: Seat): string => {
    const name = displayName(seat).replace(" 🤖", "").trim();
    return (name[0] ?? "?").toUpperCase();
  };

  // Géométrie table — adaptative portrait/landscape
  const isLandscape = SW > SH;
  const TOP_BAR_H = isLandscape ? 48 : 150;
  const HAND_H = isLandscape ? 82 : 180;
  const availH = SH - TOP_BAR_H - HAND_H;
  const diameter = Math.min(SW - 28, availH - 8, isLandscape ? 400 : 360);
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
      <View style={[styles.topBar, { top: isLandscape ? 12 : 72, justifyContent: isLandscape ? "space-between" : "center" }]}>
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
                    <Text style={styles.trumpEyebrow}>ATOUT · TOUTI</Text>
                    <Text style={styles.trumpName}>
                      {SUIT_LABELS[state.trump].dr} ({SUIT_LABELS[state.trump].fr})
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.trumpPill}>
                  <Text style={styles.trumpNone}>ATOUT — ENCHÈRES</Text>
                </View>
              )}
            </View>

            {/* Score tout à droite */}
            <View style={[styles.landscapeSide, { right: 18 }]}>
              <View style={styles.scorePill}>
                <ScoreSide label="Nous" score={state.score.A} color={COLORS.brass} />
                <View style={styles.scoreSep} />
                <ScoreSide label="Eux" score={state.score.B} color={COLORS.cream} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.topPills}>
            {state.trump ? (
              <View style={styles.trumpPill}>
                <View style={styles.trumpDisc}>
                  <SuitGlyph suit={state.trump} size={18} />
                </View>
                <View>
                  <Text style={styles.trumpEyebrow}>ATOUT · TOUTI</Text>
                  <Text style={styles.trumpName}>
                    {SUIT_LABELS[state.trump].dr} ({SUIT_LABELS[state.trump].fr})
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.trumpPill}>
                <Text style={styles.trumpNone}>ATOUT — ENCHÈRES</Text>
              </View>
            )}
            <View style={styles.scorePill}>
              <ScoreSide label="Nous" score={state.score.A} color={COLORS.brass} />
              <View style={styles.scoreSep} />
              <ScoreSide label="Eux" score={state.score.B} color={COLORS.cream} />
            </View>
          </View>
        )}
      </View>

      {/* Info manche + mise */}
      {state.bidAmount != null && state.bidWinner != null && (
        <View style={styles.roundInfo}>
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
      <SeatBadge player={{ ...PLAYERS[2], name: displayName(2), initials: displayInitials(2) }} active={isActive(2)}
        style={{ top: isLandscape ? 2 : tableTop - 18, left: 0, right: 0, alignItems: "center" }} />
      <SeatBadge player={{ ...PLAYERS[0], name: displayName(0), initials: displayInitials(0) }} active={isActive(0)}
        style={{ top: tableBottom - 18, left: 0, right: 0, alignItems: "center" }} />
      <SeatBadge player={{ ...PLAYERS[3], name: displayName(3), initials: displayInitials(3) }} active={isActive(3)}
        style={{
          top: tableCenterY - 18,
          left: Math.max(6, tableLeft - 110),
          alignItems: "flex-start",
        }} />
      <SeatBadge player={{ ...PLAYERS[1], name: displayName(1), initials: displayInitials(1) }} active={isActive(1)}
        style={{
          top: tableCenterY - 18,
          right: Math.max(6, SW - tableRight - 110),
          alignItems: "flex-end",
        }} />

      {/* Piles face-down chez les 3 autres joueurs (uniquement après la distribution) */}
      {!dealAnim && (
        <>
          <PlayerPile
            count={state.hands[2].length}
            style={{
              position: "absolute",
              top: isLandscape ? 38 : tableTop + 30,
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
      <ToastMessage text={state.message} />

      {/* Indicateur "à toi de jouer" */}
      {myTurn && <TurnIndicator bottom={HAND_H + 20} />}

      {/* Ma main — cachée pendant le deal, apparaît ensuite */}
      {(() => {
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
          <View style={[styles.myHand, { bottom: 12, height: HAND_H - 16, opacity: dealAnim ? 0 : 1 }]}
            pointerEvents={dealAnim ? "none" : "auto"}>
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

      {/* Overlay : enchères humain (n'empiète pas sur la main) */}
      {state.phase === "bidding" && state.bidding?.currentSeat === 0 && (() => {
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
      {state.phase === "choosing-trump" && state.bidWinner === 0 && (
        <TrumpOverlay
          bottomOffset={HAND_H + 10}
          onChoose={(suit) => src.chooseTrump(0, suit)}
        />
      )}

      {/* Overlay : Ghna humain */}
      {state.ghnaPending && state.ghnaPending.seat === 0 && (
        <GhnaOverlay
          bottomOffset={HAND_H + 10}
          options={state.ghnaPending.options}
          onChoose={(suit) => src.announceGhna(0, suit)}
          onSkip={() => src.dismissGhna()}
        />
      )}

      {/* Chat launcher (bouton flottant) */}
      <ChatLauncher
        bottom={HAND_H + 6}
        onSend={(msg) => {
          showBubble(0, msg);
          if (mode === "net") useNetGameStore.getState().sendChat(msg);
        }}
      />

      {/* Bouton "pli précédent" — visible seulement si un pli a déjà été joué */}
      {state.lastTrick && (
        <Pressable
          onPress={() => setShowLastTrick(true)}
          style={[styles.lastTrickBtn, { bottom: HAND_H + 6 }]}
        >
          <Text style={styles.lastTrickIcon}>👁</Text>
        </Pressable>
      )}

      {/* Overlay du pli précédent */}
      {showLastTrick && state.lastTrick && (
        <LastTrickOverlay
          trick={state.lastTrick.entries}
          winner={state.lastTrick.winner}
          onClose={() => setShowLastTrick(false)}
        />
      )}

      {/* Bouton "tableau de suivi" — toujours visible après la 1re manche */}
      {roundHistory.length > 0 && (
        <Pressable
          onPress={() => setShowScoreSheet(true)}
          style={[styles.scoreSheetBtn, { bottom: HAND_H + 6 }]}
        >
          <Text style={styles.scoreSheetIcon}>📊</Text>
        </Pressable>
      )}

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

      {/* Bulles de message au-dessus de chaque joueur */}
      {bubbles[2] && (
        <ChatBubble
          text={bubbles[2].text}
          anchor={{ top: tableTop + 12, left: SW / 2 - 80 }}
        />
      )}
      {bubbles[0] && (
        <ChatBubble
          text={bubbles[0].text}
          anchor={{ top: tableBottom - 60, left: SW / 2 - 80 }}
        />
      )}
      {bubbles[3] && (
        <ChatBubble
          text={bubbles[3].text}
          anchor={{ top: tableCenterY - 60, left: Math.max(16, tableLeft - 40) }}
        />
      )}
      {bubbles[1] && (
        <ChatBubble
          text={bubbles[1].text}
          anchor={{ top: tableCenterY - 60, right: Math.max(16, SW - tableRight - 40) }}
        />
      )}

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
          onRestart={async () => {
            if (mode === "net") {
              // Net : on quitte la room et on retourne à l'accueil
              await useNetGameStore.getState().disconnect();
              navigation.navigate("Home");
            } else {
              resetGame();
            }
          }}
          onHome={async () => {
            if (mode === "net") {
              await useNetGameStore.getState().disconnect();
            }
            navigation.navigate("Home");
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
        <BidHistory history={state.bidding.history} />
      )}
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
}: {
  trick: import("@touti/shared").TrickEntry[];
  winner: Seat;
  onClose: () => void;
}) {
  return (
    <Pressable onPress={onClose} style={styles.lastTrickOverlay}>
      <View style={styles.lastTrickCard}>
        <Text style={styles.lastTrickEyebrow}>DERNIER PLI</Text>
        <Text style={styles.lastTrickTitle}>
          Remporté par {PLAYERS[winner].name}
        </Text>

        <View style={styles.lastTrickCards}>
          {trick.map((t, i) => {
            const isWinner = t.player === winner;
            return (
              <View key={i} style={styles.lastTrickItem}>
                <Text style={[styles.lastTrickPlayer, isWinner && { color: COLORS.saffronSoft }]}>
                  {PLAYERS[t.player].name}
                  {isWinner && " 🏆"}
                </Text>
                <Card rank={t.card.rank} suit={t.card.suit} size="md" highlighted={isWinner} />
              </View>
            );
          })}
        </View>

        <Text style={styles.lastTrickClose}>Tape n'importe où pour fermer</Text>
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
  return (
    <Pressable onPress={onClose} style={styles.scoreSheetOverlay}>
      <Pressable onPress={(e) => e.stopPropagation()} style={styles.scoreSheetCard}>
        <Text style={styles.scoreSheetEyebrow}>TABLEAU DE SUIVI</Text>
        <Text style={styles.scoreSheetTitle}>Manche {currentRound}</Text>

        {/* Totaux des 2 équipes */}
        <View style={styles.scoreSheetTotals}>
          <View style={styles.scoreSheetTeam}>
            <Text style={styles.scoreSheetTeamLabel}>NOUS</Text>
            <Text style={[styles.scoreSheetTeamValue, { color: COLORS.saffronSoft }]}>{scoreA}</Text>
          </View>
          <Text style={styles.scoreSheetVs}>·</Text>
          <View style={styles.scoreSheetTeam}>
            <Text style={styles.scoreSheetTeamLabel}>EUX</Text>
            <Text style={styles.scoreSheetTeamValue}>{scoreB}</Text>
          </View>
        </View>

        {/* Liste manche par manche */}
        <ScrollView style={{ maxHeight: 340, marginTop: 4 }} contentContainerStyle={{ paddingBottom: 8 }}>
          <View style={styles.scoreSheetHeaderRow}>
            <Text style={[styles.scoreSheetHCol, { width: 32 }]}>M.</Text>
            <Text style={[styles.scoreSheetHCol, { flex: 1 }]}>Mise</Text>
            <Text style={[styles.scoreSheetHCol, { width: 54, textAlign: "right" }]}>NOUS</Text>
            <Text style={[styles.scoreSheetHCol, { width: 54, textAlign: "right" }]}>EUX</Text>
          </View>
          {rounds.length === 0 ? (
            <Text style={styles.scoreSheetEmpty}>
              Le tableau se remplira après la 1ère manche.
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
                      {success ? "réussie" : "ratée"}
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
          <Text style={styles.scoreSheetCloseText}>Fermer</Text>
        </Pressable>
      </Pressable>
    </Pressable>
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
}: {
  player: (typeof PLAYERS)[number];
  active: boolean;
  style: any;
}) {
  const isPartner = player.id === 2;
  return (
    <View pointerEvents="box-none" style={[{ position: "absolute", zIndex: 6 }, style]}>
      <View
        style={[
          styles.seatBadge,
          {
            borderColor: active
              ? COLORS.saffron
              : isPartner
              ? `${COLORS.brass}99`
              : `${COLORS.cream}33`,
            backgroundColor: active ? COLORS.brassDeep : "rgba(0,0,0,0.55)",
          },
        ]}
      >
        <Avatar initials={player.initials} size={26} color={player.color} ring={false} />
        <Text style={[styles.seatName, active && { color: "#FDF6E3" }]}>{player.name}</Text>
      </View>
    </View>
  );
}

function ToastMessage({ text }: { text: string | null }) {
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
        duration: 700,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setDisplayed(null);
      });
    }, 5000);
    return () => clearTimeout(fadeTimer);
  }, [text, opacity]);

  if (!displayed) return null;

  return (
    <Animated.View style={[styles.toastWrap, { opacity }]} pointerEvents="none">
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
      <Text style={styles.turnText}>À toi de jouer</Text>
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
  const min = highest ? highest + BID_STEP : MIN_BID;
  const choices: number[] = [];
  for (let b = min; b <= Math.min(MAX_BID, (highest ?? MIN_BID - BID_STEP) + 60); b += BID_STEP) {
    choices.push(b);
  }
  return (
    <View style={[styles.overlay, { bottom: bottomOffset }]}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>ENCHÈRES · CHRA</Text>
        <Text style={styles.overlayTitle}>À toi de parler</Text>
        <Text style={styles.overlaySub}>
          {highest ? `Plus haute mise : ${highest}` : "Aucune mise pour l'instant"}
        </Text>

        <Text style={styles.overlaySection}>Miser {!canBid && "(signal déjà fait)"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {!canBid ? (
            <Text style={styles.overlaySub}>Tu as signalé : plus d'enchère possible.</Text>
          ) : choices.length === 0 ? (
            <Text style={styles.overlaySub}>Plafond atteint</Text>
          ) : (
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

        <Text style={styles.overlaySection}>Signal au partenaire</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            disabled={!canSignalAs}
            onPress={() => onAction({ kind: "signal", signal: "as" })}
            style={[styles.ghostBtn, !canSignalAs && { opacity: 0.4 }]}
          >
            <Text style={styles.ghostBtnText}>Un As</Text>
          </Pressable>
          <Pressable
            disabled={!canSignalCompte}
            onPress={() => onAction({ kind: "signal", signal: "compte" })}
            style={[styles.ghostBtn, !canSignalCompte && { opacity: 0.4 }]}
          >
            <Text style={styles.ghostBtnText}>Un Compte</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => onAction({ kind: "pass" })} style={styles.passBtn}>
          <Text style={styles.passBtnText}>Passer</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TrumpOverlay({ bottomOffset, onChoose }: { bottomOffset: number; onChoose: (suit: Suit) => void }) {
  return (
    <View style={[styles.overlay, { bottom: bottomOffset }]}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>ATOUT · TRONFO</Text>
        <Text style={styles.overlayTitle}>Choisis la couleur d'atout</Text>
        <View style={styles.trumpChoices}>
          {ALL_SUITS.map((s) => (
            <Pressable key={s} onPress={() => onChoose(s)} style={styles.trumpChoice}>
              <SuitGlyph suit={s} size={36} />
              <Text style={styles.trumpChoiceLabel}>{SUIT_LABELS[s].fr}</Text>
              <Text style={styles.trumpChoiceSub}>{SUIT_LABELS[s].dr}</Text>
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
  onChoose,
  onSkip,
}: {
  bottomOffset: number;
  options: { suit: Suit; value: 20 | 40 }[];
  onChoose: (suit: Suit) => void;
  onSkip: () => void;
}) {
  return (
    <View style={[styles.overlay, { bottom: bottomOffset }]}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>GHNA</Text>
        <Text style={styles.overlayTitle}>Annoncer une Ghna</Text>
        <Text style={styles.overlaySub}>Caballo + Rey de la même couleur</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          {options.map((o) => (
            <Pressable key={o.suit} onPress={() => onChoose(o.suit)} style={styles.ghnaChip}>
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <SuitGlyph suit={o.suit} size={22} />
              <Text style={styles.ghnaChipText}>
                {SUIT_LABELS[o.suit].fr} · +{o.value}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={onSkip} style={styles.passBtn}>
            <Text style={styles.passBtnText}>Ne pas annoncer</Text>
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
  onRestart,
  onHome,
  onSeeDetail,
}: {
  winningTeam: "A" | "B";
  scoreA: number;
  scoreB: number;
  mode: GameMode;
  onRestart: () => void;
  onHome: () => void;
  onSeeDetail: () => void;
}) {
  const won = winningTeam === "A";
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayEyebrow}>FIN DE PARTIE</Text>
        <Text style={[styles.overlayTitle, { fontSize: 28 }]}>
          {won ? "NOUS avons gagné !" : "EUX ont gagné."}
        </Text>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 8 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2, color: COLORS.brass }}>NOUS</Text>
            <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.saffronSoft, fontWeight: "700" }}>{scoreA}</Text>
          </View>
          <Text style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.brass, alignSelf: "center" }}>·</Text>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2, color: "rgba(245,235,214,0.6)" }}>EUX</Text>
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
            <Text style={styles.endBtnText}>Voir le détail</Text>
          </Pressable>
          <Pressable onPress={onRestart} style={[styles.endBtn, styles.endBtnSecondary]}>
            <Text style={[styles.endBtnText, { color: COLORS.cream }]}>
              {mode === "net" ? "Retour au lobby" : "Nouvelle partie"}
            </Text>
          </Pressable>
          <Pressable onPress={onHome} style={[styles.endBtn, styles.endBtnSecondary]}>
            <Text style={[styles.endBtnText, { color: COLORS.cream }]}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BidHistory({ history }: { history: import("@touti/shared").BiddingState["history"] }) {
  const last = history.slice(-4);
  return (
    <View style={styles.bidHistWrap} pointerEvents="none">
      {last.map((h, i) => {
        const label =
          h.action.kind === "bid" ? `${h.action.amount}`
          : h.action.kind === "pass" ? "passe"
          : h.action.signal === "as" ? "un As"
          : "un Compte";
        return (
          <Text key={i} style={styles.bidHistText}>
            {PLAYERS[h.seat].name} : {label}
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
    top: 128, left: 0, right: 0,
    alignItems: "center",
    zIndex: 9,
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
    right: 14,
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
  lastTrickIcon: { fontSize: 20 },

  // Bouton & overlay tableau de suivi
  scoreSheetBtn: {
    position: "absolute",
    right: 64, // décalé à gauche du bouton "dernier pli"
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
  scoreSheetIcon: { fontSize: 18 },
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
  ghnaChipText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.terracottaDark,
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
});
