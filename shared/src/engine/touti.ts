// Moteur Touti complet (démo locale, 1 humain + 3 IA).
// Règles : docs/rules.md.
//
// Convention des sièges (anti-horaire dans le layout : bas → droite → haut → gauche) :
//   0 = toi (bas), 1 = droite, 2 = partenaire (haut), 3 = gauche
// Équipes : A = {0, 2} ("NOUS"), B = {1, 3} ("EUX")
// Progression anti-horaire : (seat + 1) % 4.
// Mâle = joueur à droite du distributeur = (dealer + 1) % 4.

import {
  ALL_RANKS,
  ALL_SUITS,
  CARD_POINTS,
  CARD_STRENGTH,
  Card,
  Rank,
  Suit,
  cardId,
} from "../types";

export type Seat = 0 | 1 | 2 | 3;
export type Pos = "bottom" | "right" | "top" | "left";
export type TeamKey = "A" | "B";
export type Phase =
  | "dealing"
  | "bidding"
  | "choosing-trump"
  | "playing"
  | "trick-end"
  | "round-end"
  | "game-end";

export interface PlayerDef {
  id: Seat;
  pos: Pos;
  name: string;
  sub: string;
  initials: string;
  color: string;
  team: TeamKey;
  human: boolean;
}

export const PLAYERS: readonly PlayerDef[] = [
  { id: 0, pos: "bottom", name: "Vous",  sub: "VOUS", initials: "V", color: "#2E7A8C", team: "A", human: true  },
  { id: 1, pos: "right",  name: "IA 1",  sub: "",     initials: "1", color: "#C8551D", team: "B", human: false },
  { id: 2, pos: "top",    name: "IA 2",  sub: "",     initials: "2", color: "#B8791C", team: "A", human: false },
  { id: 3, pos: "left",   name: "IA 3",  sub: "",     initials: "3", color: "#8B4A7F", team: "B", human: false },
] as const;

export function teamOf(seat: Seat): TeamKey {
  return PLAYERS[seat].team;
}

export function otherTeam(t: TeamKey): TeamKey {
  return t === "A" ? "B" : "A";
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

// ─── Enchères ──────────────────────────────────────────────────────

export const MIN_BID = 70;
export const MAX_BID = 230;
export const BID_STEP = 10;

export type BidAction =
  | { kind: "bid"; amount: number }
  | { kind: "pass" }
  | { kind: "signal"; signal: "as" | "compte" };

export interface BiddingState {
  currentSeat: Seat;
  highest: { seat: Seat; amount: number } | null;
  passed: Seat[];
  history: { seat: Seat; action: BidAction }[];
}

// ─── Ghna ─────────────────────────────────────────────────────────

export interface GhnaAnnouncement {
  seat: Seat;
  suit: Suit;
  value: 20 | 40;
}

// ─── État de partie ───────────────────────────────────────────────

export interface TrickEntry {
  player: Seat;
  card: Card;
}

export interface GameState {
  phase: Phase;
  roundNumber: number;
  trickNumber: number;                     // 1..10 dans la manche
  dealerSeat: Seat;
  currentPlayer: Seat;                     // siège dont c'est le tour
  // Tutoriel : si true, la partie utilise une distribution scriptée et
  // s'arrête à la fin de la 1ère manche (phase = "game-end" même si
  // personne n'a 600). Permet un tuto pédagogique sans scores cumulés.
  tutorial?: boolean;
  hands: [Card[], Card[], Card[], Card[]];
  trump: Suit | null;
  bidding: BiddingState | null;
  /** Snapshot figé de l'historique juste avant fermeture des enchères. Permet à
   * l'UI d'afficher le dernier dire de chaque joueur même après transition. */
  lastBidHistory: BiddingState["history"] | null;
  bidWinner: Seat | null;
  bidAmount: number | null;
  trick: TrickEntry[];
  lastTrick: { entries: TrickEntry[]; winner: Seat } | null;
  tricksWon: { A: TrickEntry[][]; B: TrickEntry[][] };
  roundPoints: { A: number; B: number };   // cartes capturées + ghna + 9a3a
  ghnaAnnounced: GhnaAnnouncement[];
  // Pending Ghna : le **buyer** (bidWinner) est toujours l'arbitre unique —
  // c'est lui et lui seul qui décide si on annonce une Ghna après un pli
  // gagné par son équipe. Les options listent les paires (Rey+Caballo)
  // disponibles chez lui ET chez son partenaire, chacune étiquetée avec
  // son `owner` réel. Si l'arbitre autorise une paire du partenaire, la
  // Ghna est créditée au partenaire dans `ghnaAnnounced`.
  ghnaPending: {
    seat: Seat; // toujours = bidWinner (le décideur)
    options: { suit: Suit; value: 20 | 40; owner: Seat }[];
  } | null;
  score: { A: number; B: number };         // score cumulé (objectif 600)
  lastTrickWinner: Seat | null;
  message: string | null;
}

// ─── Helpers cartes ────────────────────────────────────────────────

export function cardKey(c: Card): string {
  return `${c.suit}:${c.rank}`;
}

function shuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of ALL_SUITS) {
    for (const r of ALL_RANKS) deck.push({ suit: s, rank: r, id: cardId(s, r) });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Distribue 10 cartes par joueur, par paquets de 5, dans l'ordre anti-horaire
// en commençant par le mâle (siège à droite du distributeur).
function deal10Each(dealer: Seat): [Card[], Card[], Card[], Card[]] {
  const deck = shuffledDeck();
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  let cursor = ((dealer + 1) % 4) as Seat;
  let idx = 0;
  for (let round = 0; round < 2; round++) {
    for (let step = 0; step < 4; step++) {
      for (let i = 0; i < 5; i++) {
        hands[cursor].push(deck[idx++]);
      }
      cursor = ((cursor + 1) % 4) as Seat;
    }
  }
  return hands;
}

// Distribution scriptée pour le tutoriel. Construite pour garantir :
//   - Seat 2 (partenaire IA) : main forte → il va bider
//   - Seat 0 (joueur humain) : Caballo + Rey copas (Ghna 20) + Sota copas
//     + deux basses cartes d'autres couleurs (main pauvre, vrai rôle de
//     soutien — il ne peut pas porter la mise tout seul).
//   - Seats 1 & 3 (adversaires) : mains faibles → ils passent
// L'AI du partenaire va choisir l'atout qui maximise SA main (oros ici).
// Copas n'étant pas atout, le joueur annoncera Ghna 20 (Rey + Caballo copas).
function dealTutorial(): [Card[], Card[], Card[], Card[]] {
  const make = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: cardId(suit, rank) });
  // 10 cartes par joueur. Vérifié : 40 cartes distinctes, pas de doublon.
  const hands: [Card[], Card[], Card[], Card[]] = [
    // Seat 0 — joueur humain : Caballo + Rey + Sota de copas (Ghna!) + 7 fillers
    [
      make("copas", 12),  // Rey copas (4 pts) — Ghna pair
      make("copas", 11),  // Caballo copas (3 pts) — Ghna pair
      make("copas", 10),  // Sota copas (2 pts)
      make("oros", 5),    // 0
      make("oros", 6),    // 0
      make("oros", 7),    // 0
      make("espadas", 4), // 0
      make("espadas", 5), // 0
      make("bastos", 2),  // 0
      make("bastos", 4),  // 0
    ],
    // Seat 1 — adversaire faible, récupère As et Triss copas (hors équipe player)
    [
      make("copas", 1),   // As copas — on les donne à l'adversaire
      make("copas", 3),   // Triss copas
      make("oros", 2),
      make("oros", 10),   // Sota (2 pts)
      make("copas", 4),
      make("copas", 7),
      make("espadas", 1), // As espadas (11 pts — quand même)
      make("espadas", 6),
      make("bastos", 3),  // Triss bastos (10 pts)
      make("bastos", 6),
    ],
    // Seat 2 — partenaire IA : main forte oros → il bide, choisit oros
    [
      make("oros", 1),    // As oros (11)
      make("oros", 3),    // Triss oros (10)
      make("oros", 12),   // Rey oros (4)
      make("oros", 11),   // Caballo oros (3)
      make("oros", 4),
      make("espadas", 3), // Triss espadas (10)
      make("espadas", 10),// Sota espadas (2)
      make("bastos", 1),  // As bastos (11)
      make("copas", 2),
      make("copas", 6),
    ],
    // Seat 3 — adversaire faible
    [
      make("espadas", 2),
      make("espadas", 7),
      make("espadas", 12),// Rey espadas (4)
      make("espadas", 11),// Caballo espadas (3)
      make("bastos", 5),
      make("bastos", 7),
      make("bastos", 10), // Sota (2)
      make("bastos", 11), // Caballo bastos (3)
      make("bastos", 12), // Rey bastos (4)
      make("copas", 5),
    ],
  ];
  return hands;
}

// ─── Init / nouvelle manche ───────────────────────────────────────

export function createGame(options?: { tutorial?: boolean }): GameState {
  // Tutoriel : dealer = 3 pour que le mâle soit seat 0 (joueur humain)
  // → le joueur parle en premier aux enchères, ce qui rend le tuto clair.
  const dealerSeat: Seat = options?.tutorial ? 3 : 0;
  return startRound({
    phase: "dealing",
    roundNumber: 0,
    trickNumber: 1,
    dealerSeat,
    currentPlayer: 0,
    tutorial: options?.tutorial ?? false,
    hands: [[], [], [], []],
    trump: null,
    bidding: null,
    lastBidHistory: null,
    bidWinner: null,
    bidAmount: null,
    trick: [],
    lastTrick: null,
    tricksWon: { A: [], B: [] },
    roundPoints: { A: 0, B: 0 },
    ghnaAnnounced: [],
    ghnaPending: null,
    score: { A: 0, B: 0 },
    lastTrickWinner: null,
    message: null,
  });
}

function startRound(state: GameState): GameState {
  const hands = state.tutorial ? dealTutorial() : deal10Each(state.dealerSeat);
  const mâle = ((state.dealerSeat + 1) % 4) as Seat;
  return {
    ...state,
    phase: "bidding",
    roundNumber: state.roundNumber + 1,
    trickNumber: 1,
    hands,
    trump: null,
    bidding: {
      currentSeat: mâle,
      highest: null,
      passed: [],
      history: [],
    },
    lastBidHistory: null,
    bidWinner: null,
    bidAmount: null,
    trick: [],
    lastTrick: null,
    tricksWon: { A: [], B: [] },
    roundPoints: { A: 0, B: 0 },
    ghnaAnnounced: [],
    ghnaPending: null,
    lastTrickWinner: null,
    currentPlayer: mâle,
    message: null,
  };
}

// ─── Actions d'enchères ───────────────────────────────────────────

export function bid(state: GameState, seat: Seat, action: BidAction): GameState {
  if (state.phase !== "bidding") return state;
  if (!state.bidding) return state;
  if (state.bidding.currentSeat !== seat) return state;

  const b = state.bidding;
  const nextHistory = [...b.history, { seat, action }];

  // Validation
  if (action.kind === "bid") {
    // Interdit si tu as déjà signalé (signal = t'as plus le droit d'enchérir)
    const hasSignaled = b.history.some(
      (h) => h.seat === seat && h.action.kind === "signal",
    );
    if (hasSignaled) return state;
    // Interdit de surenchérir sur soi-même (cas où on revient à toi après 3 passes)
    if (b.highest && b.highest.seat === seat) return state;
    const min = b.highest ? b.highest.amount + BID_STEP : MIN_BID;
    if (
      action.amount < min ||
      action.amount > MAX_BID ||
      action.amount % BID_STEP !== 0
    ) return state;
    const nextBidding: BiddingState = {
      ...b,
      currentSeat: nextBidder(b, seat),
      highest: { seat, amount: action.amount },
      history: nextHistory,
    };
    return maybeCloseBidding({ ...state, bidding: nextBidding });
  }

  if (action.kind === "pass") {
    const passedNext = [...b.passed, seat];
    const nextBidding: BiddingState = {
      ...b,
      currentSeat: nextBidder({ ...b, passed: passedNext }, seat),
      passed: passedNext,
      history: nextHistory,
    };
    return maybeCloseBidding({ ...state, bidding: nextBidding });
  }

  if (action.kind === "signal") {
    // Interdit si le joueur a déjà misé lui-même
    const hasBid = b.history.some(
      (h) => h.seat === seat && h.action.kind === "bid",
    );
    if (hasBid) return state;
    // Interdit si le joueur a déjà fait CE type de signal
    const alreadySignaled = b.history.some(
      (h) => h.seat === seat && h.action.kind === "signal" && h.action.signal === action.signal,
    );
    if (alreadySignaled) return state;

    const nextBidding: BiddingState = {
      ...b,
      currentSeat: nextBidder(b, seat),
      history: nextHistory,
    };
    return maybeCloseBidding({ ...state, bidding: nextBidding });
  }

  return state;
}

// Un joueur est "hors course" s'il a passé OU s'il a signalé (après signal
// il ne peut plus faire de mise chiffrée, c'est équivalent à être sorti).
function isOut(history: { seat: Seat; action: BidAction }[], passed: Seat[], seat: Seat): boolean {
  if (passed.includes(seat)) return true;
  return history.some((h) => h.seat === seat && h.action.kind === "signal");
}

function nextBidder(b: BiddingState, from: Seat): Seat {
  let s = ((from + 1) % 4) as Seat;
  for (let i = 0; i < 4; i++) {
    if (!isOut(b.history, b.passed, s) && s !== from) return s;
    s = ((s + 1) % 4) as Seat;
  }
  return from;
}

function handleBidAfterPass(state: GameState): GameState {
  return { ...state, bidding: tryCloseBidding(state.bidding!) };
}

// Si les 4 ont passé : redistribue. Si seulement le highest reste : bidding terminé.
function tryCloseBidding(b: BiddingState): BiddingState {
  return b;
}

// Appelé depuis l'UI à chaque étape pour vérifier si l'enchère doit se clore.
export function maybeCloseBidding(state: GameState): GameState {
  if (state.phase !== "bidding" || !state.bidding) return state;
  const b = state.bidding;

  // Cas "aucun a misé chiffré" : personne n'a une enchère, et tous les 4
  // joueurs sont "hors course" (pass ou signal) → redistribution.
  // On compte les sièges qui ont fini : pass + signal comptent comme sortis.
  if (!b.highest) {
    const finishedSeats = new Set<Seat>();
    for (const h of b.history) {
      if (h.action.kind === "pass") finishedSeats.add(h.seat);
      if (h.action.kind === "signal") finishedSeats.add(h.seat);
    }
    if (finishedSeats.size === 4) {
      const nextDealer = ((state.dealerSeat + 1) % 4) as Seat;
      return {
        ...startRound({ ...state, dealerSeat: nextDealer }),
        message: "Personne n'a misé, nouveau distributeur.",
      };
    }
  }

  // Il y a une enchère → vérifie si le plus haut est le dernier encore en course.
  // Un joueur est "hors course" s'il a passé, OU s'il a signalé (après signal
  // il ne peut plus enchérir, donc il ne peut pas surmonter le highest).
  if (b.highest) {
    const othersOut = [0, 1, 2, 3].every((s) => {
      if (s === b.highest!.seat) return true;
      if (b.passed.includes(s as Seat)) return true;
      const signaled = b.history.some(
        (h) => h.seat === s && h.action.kind === "signal",
      );
      return signaled;
    });
    if (othersOut) {
      return {
        ...state,
        phase: "choosing-trump",
        bidWinner: b.highest.seat,
        bidAmount: b.highest.amount,
        currentPlayer: b.highest.seat,
        bidding: null,
        // Conserve l'historique final pour que l'UI puisse afficher les
        // bulles des derniers dires de chaque joueur.
        lastBidHistory: b.history,
        message: `${PLAYERS[b.highest.seat].name} mise ${b.highest.amount}.`,
      };
    }
  }

  return state;
}

export function chooseTrump(state: GameState, seat: Seat, suit: Suit): GameState {
  if (state.phase !== "choosing-trump") return state;
  if (state.bidWinner !== seat) return state;
  // Le premier à jouer est le Mâle
  const mâle = ((state.dealerSeat + 1) % 4) as Seat;
  return {
    ...state,
    phase: "playing",
    trump: suit,
    currentPlayer: mâle,
    message: null,
  };
}

// ─── Actions de pli ───────────────────────────────────────────────

// Coups légaux (règles Touti) :
// 1. Si tu as la couleur demandée :
//    a. Si personne n'a coupé avec l'atout → tu dois jouer une carte
//       PLUS HAUTE que la plus haute déjà posée (si tu en as une).
//    b. Si quelqu'un a déjà coupé (atout posé) OU que tu n'as rien de plus haut
//       → n'importe quelle carte de la couleur.
// 2. Sinon (pas la couleur) : obligation d'atout si possible.
// 3. Sinon : n'importe quoi.
export function legalMoves(state: GameState, seat: Seat): Card[] {
  const hand = state.hands[seat];
  if (state.trick.length === 0) return hand.slice();

  const leadSuit = state.trick[0].card.suit;
  const trump = state.trump;
  const leadCards = hand.filter((c) => c.suit === leadSuit);

  if (leadCards.length > 0) {
    // Quelqu'un a-t-il déjà coupé avec un atout (qui n'est pas la couleur demandée) ?
    const someoneTrumped =
      trump != null &&
      trump !== leadSuit &&
      state.trick.some((t) => t.card.suit === trump);

    if (someoneTrumped) {
      // Plus d'obligation de monter — l'atout bat déjà toutes les cartes de la couleur.
      return leadCards;
    }

    // Plus haute carte de la couleur demandée déjà posée
    const highestStrength = state.trick
      .filter((t) => t.card.suit === leadSuit)
      .reduce((m, t) => Math.max(m, CARD_STRENGTH[t.card.rank]), 0);

    const higher = leadCards.filter((c) => CARD_STRENGTH[c.rank] > highestStrength);
    if (higher.length > 0) return higher; // obligation de monter

    return leadCards; // rien de plus haut → n'importe quelle carte de la couleur
  }

  if (trump) {
    const trumpCards = hand.filter((c) => c.suit === trump);
    if (trumpCards.length > 0) {
      // Si un atout a déjà été posé, tu dois **surcouper** si tu as plus fort.
      const trumpsPlayed = state.trick.filter((t) => t.card.suit === trump);
      if (trumpsPlayed.length > 0) {
        const highestTrumpStrength = trumpsPlayed.reduce(
          (m, t) => Math.max(m, CARD_STRENGTH[t.card.rank]),
          0,
        );
        const higher = trumpCards.filter((c) => CARD_STRENGTH[c.rank] > highestTrumpStrength);
        if (higher.length > 0) return higher; // surcoupe obligatoire
      }
      return trumpCards;
    }
  }

  return hand.slice();
}

export function trickWinner(trick: TrickEntry[], trump: Suit): Seat {
  const leadSuit = trick[0].card.suit;
  let winIdx = 0;
  for (let i = 1; i < trick.length; i++) {
    const a = trick[winIdx].card;
    const b = trick[i].card;
    const aT = a.suit === trump;
    const bT = b.suit === trump;
    if (bT && !aT) { winIdx = i; continue; }
    if (!bT && aT) continue;
    const relevant = aT ? trump : leadSuit;
    if (b.suit === relevant && CARD_STRENGTH[b.rank] > CARD_STRENGTH[a.rank]) {
      winIdx = i;
    }
  }
  return trick[winIdx].player;
}

export function playCard(state: GameState, seat: Seat, card: Card): GameState {
  if (state.phase !== "playing") return state;
  if (seat !== state.currentPlayer) return state;
  const legal = legalMoves(state, seat);
  if (!legal.some((c) => cardKey(c) === cardKey(card))) return state;

  const newHand = state.hands[seat].filter((c) => cardKey(c) !== cardKey(card));
  const hands = state.hands.map((h, i) => (i === seat ? newHand : h)) as GameState["hands"];
  const trick = [...state.trick, { player: seat, card }];

  if (trick.length < 4) {
    return {
      ...state,
      hands,
      trick,
      currentPlayer: ((seat + 1) % 4) as Seat,
    };
  }

  // Pli complet
  const winner = trickWinner(trick, state.trump!);
  const team = teamOf(winner);
  const trickPts = trick.reduce((sum, t) => sum + CARD_POINTS[t.card.rank], 0);
  const tricksWon = {
    ...state.tricksWon,
    [team]: [...state.tricksWon[team], trick],
  };
  const roundPoints = {
    ...state.roundPoints,
    [team]: state.roundPoints[team] + trickPts,
  };
  const handsEmpty = hands.every((h) => h.length === 0);

  // Ghna disponible pour le vainqueur ou son partenaire ?
  const ghnaPending = findGhnaCandidates(state, hands, winner);

  return {
    ...state,
    hands,
    trick,
    tricksWon,
    roundPoints,
    lastTrickWinner: winner,
    phase: handsEmpty ? "round-end" : "trick-end",
    currentPlayer: winner,
    ghnaPending,
    // Pour le dernier pli on n'affiche pas de toast — endRound() écrira le
    // vrai résumé de la manche (succès / échec de la mise).
    message: handsEmpty ? null : `${PLAYERS[winner].name} remporte la main · +${trickPts}`,
  };
}

export function nextTrick(state: GameState): GameState {
  if (state.phase !== "trick-end") return state;
  // Sauvegarde le pli terminé dans lastTrick pour que le joueur puisse le
  // revoir après (bouton "pli précédent").
  const lastTrick =
    state.lastTrickWinner != null
      ? { entries: state.trick, winner: state.lastTrickWinner }
      : null;
  return {
    ...state,
    trick: [],
    lastTrick,
    phase: "playing",
    trickNumber: state.trickNumber + 1,
    ghnaPending: null,
    message: null,
  };
}

// ─── Ghna ─────────────────────────────────────────────────────────

// Retourne les ghnas potentielles à décider par le BUYER après un pli gagné
// par son équipe. Le décideur est toujours le buyer (bidWinner) — peu importe
// qui des deux coéquipiers a physiquement gagné le pli. Les options incluent
// les paires Rey+Caballo possédées par le buyer ET par son partenaire, avec
// leur `owner` respectif pour créditer la bonne personne à l'annonce.
function findGhnaCandidates(
  state: GameState,
  hands: GameState["hands"],
  trickWinner: Seat,
): GameState["ghnaPending"] {
  if (state.bidWinner == null || state.bidAmount == null || state.trump == null) return null;
  const trickTeam = teamOf(trickWinner);
  const bidderTeam = teamOf(state.bidWinner);
  if (trickTeam !== bidderTeam) return null;

  const bid = state.bidAmount;

  // Plafond TOTAL de points de Ghna que l'équipe adjudicataire peut annoncer
  // sur la manche, en fonction de sa mise :
  //   < 80 → 0 pt
  //   80-89 → 20 pts max (donc 1 Ghna 20, pas de 40)
  //   90-99 → 40 pts max (1 Ghna 40, OU 2 Ghna 20)
  //   100+  → 100 pts max (illimité en pratique : 3×20 + 1×40 = 100)
  let cap = 0;
  if (bid >= 100) cap = 100;
  else if (bid >= 90) cap = 40;
  else if (bid >= 80) cap = 20;

  if (cap === 0) return null;

  // Total de points déjà annoncés par l'équipe du bidder
  const teamAnnouncedPoints = state.ghnaAnnounced
    .filter((g) => teamOf(g.seat) === bidderTeam)
    .reduce((sum, g) => sum + g.value, 0);
  const remaining = cap - teamAnnouncedPoints;
  if (remaining <= 0) return null;

  const canAnnounce20 = remaining >= 20;
  const canAnnounce40 = remaining >= 40;

  const decider = state.bidWinner;
  const partner = partnerOf(decider);

  // On agrège toutes les paires dispo (buyer + partenaire) dans un seul set
  // d'options, tagguées avec leur `owner`. Le buyer choisit ensuite l'une
  // d'elles (ou passe).
  const options: { suit: Suit; value: 20 | 40; owner: Seat }[] = [];
  for (const owner of [decider, partner] as Seat[]) {
    const h = hands[owner];
    for (const suit of ALL_SUITS) {
      const hasCaballo = h.some((c) => c.suit === suit && c.rank === 11);
      const hasRey = h.some((c) => c.suit === suit && c.rank === 12);
      if (!hasCaballo || !hasRey) continue;
      // Déjà annoncée cette manche par ce joueur précis ?
      if (state.ghnaAnnounced.some((g) => g.seat === owner && g.suit === suit)) continue;
      const isTrump = suit === state.trump;
      if (isTrump && canAnnounce40) options.push({ suit, value: 40, owner });
      else if (!isTrump && canAnnounce20) options.push({ suit, value: 20, owner });
    }
  }

  if (options.length === 0) return null;
  return { seat: decider, options };
}

// Annonce une Ghna. `seat` doit être le décideur (buyer = bidWinner) —
// c'est lui qui valide, même si la paire appartient au partenaire. La
// Ghna est créditée au propriétaire réel de la paire (`option.owner`),
// ce qui permet de dédupliquer correctement et de garder une trace de
// qui a "chanté" quoi pour l'historique.
export function announceGhna(state: GameState, seat: Seat, suit: Suit): GameState {
  if (!state.ghnaPending) return state;
  if (state.ghnaPending.seat !== seat) return state; // seul le buyer décide
  // Note : si plusieurs options partagent la même suit (ne devrait pas
  // arriver car un suit ne peut être que dans une main), on prend la 1ère.
  const opt = state.ghnaPending.options.find((o) => o.suit === suit);
  if (!opt) return state;
  const owner = opt.owner;
  const team = teamOf(owner);
  const ann: GhnaAnnouncement = { seat: owner, suit, value: opt.value };
  return {
    ...state,
    ghnaAnnounced: [...state.ghnaAnnounced, ann],
    roundPoints: { ...state.roundPoints, [team]: state.roundPoints[team] + opt.value },
    ghnaPending: null,
    message: `${PLAYERS[owner].name} annonce Ghna · +${opt.value}`,
  };
}

export function dismissGhna(state: GameState): GameState {
  return { ...state, ghnaPending: null };
}

// ─── Fin de manche + scoring ──────────────────────────────────────

export function endRound(state: GameState): GameState {
  if (state.phase !== "round-end") return state;
  if (state.lastTrickWinner == null || state.bidWinner == null || state.bidAmount == null) {
    return state;
  }

  // Bonus 9a3a : +10 à l'équipe qui gagne le dernier pli
  const lastTeam = teamOf(state.lastTrickWinner);
  const rp = {
    A: state.roundPoints.A + (lastTeam === "A" ? 10 : 0),
    B: state.roundPoints.B + (lastTeam === "B" ? 10 : 0),
  };

  // Scoring : si l'équipe qui a misé atteint son objectif, elle marque sa mise.
  // Sinon c'est l'équipe adverse qui marque ces points.
  const bidderTeam = teamOf(state.bidWinner);
  const bidTarget = state.bidAmount;
  const bidderPoints = rp[bidderTeam];
  const success = bidderPoints >= bidTarget;
  const scoringTeam = success ? bidderTeam : otherTeam(bidderTeam);
  const delta = bidTarget;
  const newScore = {
    ...state.score,
    [scoringTeam]: state.score[scoringTeam] + delta,
  };

  // Tutoriel : la partie s'arrête à la fin de la 1ère manche quel que soit
  // le score. On passe en "game-end" et l'UI affichera un message "en vrai
  // première équipe à 600 gagne — là c'est juste le tuto".
  const gameOver =
    state.tutorial ||
    newScore.A >= 600 || newScore.B >= 600;
  const winningGame: TeamKey | null = gameOver
    ? (newScore.A > newScore.B ? "A" : "B")
    : null;

  return {
    ...state,
    roundPoints: rp,
    score: newScore,
    phase: gameOver ? "game-end" : "round-end",
    message: success
      ? `${bidderTeam === "A" ? "NOUS" : "EUX"} atteint ${bidTarget} (${bidderPoints}) · +${delta}`
      : `${bidderTeam === "A" ? "NOUS" : "EUX"} rate ${bidTarget} (${bidderPoints}) · +${delta} à l'adversaire`,
    lastTrickWinner: winningGame ? state.lastTrickWinner : state.lastTrickWinner,
  };
}

// Prépare la manche suivante (appelé après affichage des résultats).
export function startNextRound(state: GameState): GameState {
  if (state.phase !== "round-end") return state;
  const nextDealer = ((state.dealerSeat + 1) % 4) as Seat;
  return startRound({ ...state, dealerSeat: nextDealer });
}

// ─── IA ────────────────────────────────────────────────────────────

// Force approximative d'une main pour décider d'enchérir
function handStrength(hand: Card[]): number {
  // Points de haute (As=11 etc.) + bonus figures
  let pts = 0;
  for (const c of hand) {
    pts += CARD_POINTS[c.rank];
    if (c.rank === 1 || c.rank === 3) pts += 4;
    if (c.rank === 11 || c.rank === 12) pts += 2;
  }
  // Concentration dans une couleur
  const bySuit: Record<Suit, number> = { oros: 0, copas: 0, espadas: 0, bastos: 0 };
  for (const c of hand) bySuit[c.suit]++;
  const maxInSuit = Math.max(...ALL_SUITS.map((s) => bySuit[s]));
  pts += maxInSuit * 2;
  return pts;
}

export function aiBid(state: GameState, seat: Seat): BidAction {
  if (!state.bidding) return { kind: "pass" };
  const b = state.bidding;
  const strength = handStrength(state.hands[seat]);
  const currentMax = b.highest?.amount ?? MIN_BID - BID_STEP;
  const nextBid = Math.max(MIN_BID, currentMax + BID_STEP);

  // Seuils de force pour accepter de miser à ce palier
  const threshold = 55 + (nextBid - 70) * 0.8;

  // Si partenaire tient la plus haute, on passe.
  if (b.highest && partnerOf(seat) === b.highest.seat) return { kind: "pass" };

  if (strength >= threshold && nextBid <= MAX_BID) {
    return { kind: "bid", amount: nextBid };
  }
  return { kind: "pass" };
}

export function aiChooseTrump(state: GameState, seat: Seat): Suit {
  // Choisit la couleur où la main est la plus forte (par points + nombre)
  const hand = state.hands[seat];
  let best: Suit = "oros";
  let bestScore = -1;
  for (const s of ALL_SUITS) {
    const cards = hand.filter((c) => c.suit === s);
    const pts = cards.reduce((sum, c) => sum + CARD_POINTS[c.rank] + 2, 0);
    if (pts > bestScore) { bestScore = pts; best = s; }
  }
  return best;
}

export function aiPick(state: GameState, seat: Seat): Card | null {
  const legal = legalMoves(state, seat);
  if (legal.length === 0) return null;
  const partner = partnerOf(seat);
  const partnerWinning =
    state.trick.length > 0 && state.trump != null && trickWinner(state.trick, state.trump) === partner;

  if (partnerWinning) {
    const sorted = [...legal].sort(
      (a, b) => CARD_POINTS[a.rank] - CARD_POINTS[b.rank] || CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank],
    );
    return sorted[0];
  }
  if (state.trick.length === 0) {
    const nonTrump = legal.filter((c) => c.suit !== state.trump);
    const pool = nonTrump.length ? nonTrump : legal;
    const sorted = [...pool].sort((a, b) => CARD_STRENGTH[b.rank] - CARD_STRENGTH[a.rank]);
    return sorted[Math.floor(sorted.length / 2)] || sorted[0];
  }
  if (state.trump == null) return legal[0];
  const winners = legal.filter((c) => {
    const test = trickWinner([...state.trick, { player: seat, card: c }], state.trump!);
    return test === seat;
  });
  if (winners.length) {
    winners.sort((a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank]);
    return winners[0];
  }
  const sorted = [...legal].sort(
    (a, b) => CARD_POINTS[a.rank] - CARD_POINTS[b.rank] || CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank],
  );
  return sorted[0];
}

// Compat : ancien nom conservé pour ne pas casser l'UI existante.
export const dealNewGame = createGame;
