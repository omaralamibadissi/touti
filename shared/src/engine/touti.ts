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
  // Pending Ghna : le **buyer** (bidWinner) est l'arbitre unique. Il voit
  // SES propres paires (Rey+Caballo) avec détail (suit/value), et s'il y
  // a lieu un bouton générique "autoriser le partenaire à chanter" SANS
  // révéler ce que le partenaire a en main (couleur ni valeur). Tant que
  // le partenaire n'a pas refusé une fois, le bouton reste proposé à
  // chaque pli gagné par l'équipe. Refuser = il n'a pas de Compte →
  // `ghnaPartnerRefused=true` pour la suite de la manche.
  ghnaPending: {
    seat: Seat; // toujours = bidWinner (le décideur)
    ownOptions: { suit: Suit; value: 20 | 40 }[];
    partnerCanSing: boolean;
  } | null;
  // Une fois le partenaire refusé (ou avoué "pas de Compte"), on ne
  // repropose plus l'option "autoriser partenaire" pour le reste de la
  // manche. Reset à chaque nouvelle manche.
  ghnaPartnerRefused: boolean;
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
    ghnaPartnerRefused: false,
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
    ghnaPartnerRefused: false,
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

  // Paires encore en main (Rey + Caballo même couleur), non déjà annoncées.
  // Un Compte "cassé" = Rey ou Caballo a été joué → plus dans la main → pair
  // disparaît → option retirée (géré naturellement par les `some()` sur la
  // main courante).
  const pairsOf = (owner: Seat): { suit: Suit; value: 20 | 40 }[] => {
    const h = hands[owner];
    const out: { suit: Suit; value: 20 | 40 }[] = [];
    for (const suit of ALL_SUITS) {
      const hasCaballo = h.some((c) => c.suit === suit && c.rank === 11);
      const hasRey = h.some((c) => c.suit === suit && c.rank === 12);
      if (!hasCaballo || !hasRey) continue;
      if (state.ghnaAnnounced.some((g) => g.seat === owner && g.suit === suit)) continue;
      const isTrump = suit === state.trump;
      if (isTrump && canAnnounce40) out.push({ suit, value: 40 });
      else if (!isTrump && canAnnounce20) out.push({ suit, value: 20 });
    }
    return out;
  };

  const ownOptions = pairsOf(decider);
  const partnerHasPair = pairsOf(partner).length > 0;
  const partnerCanSing = partnerHasPair && !state.ghnaPartnerRefused;

  // Si rien à proposer au buyer, rien à ouvrir.
  if (ownOptions.length === 0 && !partnerCanSing) return null;

  // Shortcut : buyer n'a rien + partenaire peut chanter → on saute le
  // prompt et on annonce directement la meilleure Ghna du partenaire.
  // Cette branche est gérée par l'appelant (playCard) — ici on renvoie
  // quand même la pending "virtuelle" pour que le front soit informé.
  return { seat: decider, ownOptions, partnerCanSing };
}

// Annonce une Ghna appartenant au buyer (le décideur) lui-même.
// Crédite la paire sur son propre nom.
export function announceGhna(state: GameState, seat: Seat, suit: Suit): GameState {
  if (!state.ghnaPending) return state;
  if (state.ghnaPending.seat !== seat) return state; // seul le buyer décide
  const opt = state.ghnaPending.ownOptions.find((o) => o.suit === suit);
  if (!opt) return state;
  const team = teamOf(seat);
  const ann: GhnaAnnouncement = { seat, suit, value: opt.value };
  return {
    ...state,
    ghnaAnnounced: [...state.ghnaAnnounced, ann],
    roundPoints: { ...state.roundPoints, [team]: state.roundPoints[team] + opt.value },
    ghnaPending: null,
    message: `${PLAYERS[seat].name} annonce Ghna · +${opt.value}`,
  };
}

export function dismissGhna(state: GameState): GameState {
  return { ...state, ghnaPending: null };
}

// Le buyer autorise son partenaire à chanter. Au lieu d'annoncer tout de
// suite pour lui, on transfère la fenêtre au partenaire avec SES options
// visibles (c'est sa main, il peut la voir en détail) — il choisit alors
// la couleur à chanter via announceGhna, ou passe via dismissGhna.
// Si le partenaire n'a en réalité aucune paire (cas théorique broken),
// on set ghnaPartnerRefused = true et on ferme.
export function allowPartnerSing(state: GameState, seat: Seat): GameState {
  if (!state.ghnaPending) return state;
  if (state.ghnaPending.seat !== seat) return state;
  if (!state.ghnaPending.partnerCanSing) return state;

  const partner = partnerOf(seat);
  const bid = state.bidAmount ?? 0;
  let cap = 0;
  if (bid >= 100) cap = 100;
  else if (bid >= 90) cap = 40;
  else if (bid >= 80) cap = 20;
  const teamAnnouncedPoints = state.ghnaAnnounced
    .filter((g) => teamOf(g.seat) === teamOf(partner))
    .reduce((sum, g) => sum + g.value, 0);
  const remaining = cap - teamAnnouncedPoints;
  const canAnnounce20 = remaining >= 20;
  const canAnnounce40 = remaining >= 40;

  const h = state.hands[partner];
  const partnerOptions: { suit: Suit; value: 20 | 40 }[] = [];
  for (const suit of ALL_SUITS) {
    const hasCaballo = h.some((c) => c.suit === suit && c.rank === 11);
    const hasRey = h.some((c) => c.suit === suit && c.rank === 12);
    if (!hasCaballo || !hasRey) continue;
    if (state.ghnaAnnounced.some((g) => g.seat === partner && g.suit === suit)) continue;
    const isTrump = suit === state.trump;
    if (isTrump && canAnnounce40) partnerOptions.push({ suit, value: 40 });
    else if (!isTrump && canAnnounce20) partnerOptions.push({ suit, value: 20 });
  }

  // Partenaire n'a finalement rien — refuse. Mémorisé pour ne plus proposer.
  if (partnerOptions.length === 0) {
    return {
      ...state,
      ghnaPending: null,
      ghnaPartnerRefused: true,
    };
  }

  // Transfert : le partenaire devient le décideur. Ses options sont
  // visibles (c'est sa main, il les connaît). partnerCanSing=false car
  // lui ne peut pas "reauto­riser" le buyer.
  return {
    ...state,
    ghnaPending: {
      seat: partner,
      ownOptions: partnerOptions,
      partnerCanSing: false,
    },
  };
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

// Niveau de difficulté de l'IA. Ordonné par force croissante.
//   easy   : joue aléatoirement les coups légaux, mise rarement
//   medium : heuristiques de base (niveau par défaut, "moyen")
//   hard   : compte les cartes déjà jouées, optimise les enchères et
//            la stratégie de chaque pli. Quasi injouable pour un débutant.
export type AiLevel = "easy" | "medium" | "hard";

// ─── Helpers de comptage de cartes (pour l'IA hard) ─────────────────

// Toutes les cartes du paquet (40 cartes) sous forme de clés "suit:rank".
const ALL_CARD_KEYS: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) s.add(`${suit}:${rank}`);
  }
  return s;
})();

// Liste les cartes déjà jouées dans cette manche (plis terminés + pli en cours).
function playedCards(state: GameState): Set<string> {
  const played = new Set<string>();
  for (const trick of state.tricksWon.A) {
    for (const e of trick) played.add(`${e.card.suit}:${e.card.rank}`);
  }
  for (const trick of state.tricksWon.B) {
    for (const e of trick) played.add(`${e.card.suit}:${e.card.rank}`);
  }
  for (const e of state.trick) played.add(`${e.card.suit}:${e.card.rank}`);
  return played;
}

// Cartes qui peuvent encore être en main d'un autre joueur (= total moins
// celles qu'on tient soi-même et celles déjà tombées sur la table).
function unseenCards(state: GameState, mySeat: Seat): Card[] {
  const played = playedCards(state);
  const own = new Set(state.hands[mySeat].map((c) => `${c.suit}:${c.rank}`));
  const out: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      const k = `${suit}:${rank}`;
      if (played.has(k) || own.has(k)) continue;
      out.push({ suit, rank, id: cardId(suit, rank) });
    }
  }
  return out;
}

// Ma carte est-elle "certaine" de gagner un pli où je suis meneur ?
// Vrai si aucune carte supérieure n'est encore en main d'un autre joueur,
// ni dans les atouts (sauf si moi-même je joue un atout).
function isSureWinner(card: Card, state: GameState, mySeat: Seat): boolean {
  const unseen = unseenCards(state, mySeat);
  const trump = state.trump;
  if (trump != null && card.suit === trump) {
    return !unseen.some(
      (c) => c.suit === trump && CARD_STRENGTH[c.rank] > CARD_STRENGTH[card.rank],
    );
  }
  const higherInSuit = unseen.some(
    (c) => c.suit === card.suit && CARD_STRENGTH[c.rank] > CARD_STRENGTH[card.rank],
  );
  if (higherInSuit) return false;
  const trumpsOutside = trump != null && unseen.some((c) => c.suit === trump);
  if (trumpsOutside) return false;
  return true;
}

// Ensemble des voids connus par siège : quand un joueur ne suit pas la
// couleur menée (coupe ou défausse), il est révélé void dans cette couleur.
// Retourne Record<Seat, Set<Suit>>.
function knownVoids(state: GameState): Record<Seat, Set<Suit>> {
  const voids: Record<Seat, Set<Suit>> = {
    0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(),
  };
  const scanTrick = (entries: TrickEntry[]) => {
    if (entries.length === 0) return;
    const ledSuit = entries[0].card.suit;
    for (let i = 1; i < entries.length; i++) {
      const e = entries[i];
      if (e.card.suit !== ledSuit) {
        // ne suit pas la couleur ouverte → révélé void dans ledSuit
        voids[e.player].add(ledSuit);
      }
    }
  };
  for (const t of state.tricksWon.A) scanTrick(t);
  for (const t of state.tricksWon.B) scanTrick(t);
  scanTrick(state.trick);
  return voids;
}

// Estime combien d'atouts sont encore en main par siège adverse.
// Version simple : nombre d'atouts non joués et non chez moi, réparti
// entre les 3 autres joueurs en excluant ceux connus void en atout.
function trumpsRemainingPerSeat(state: GameState, mySeat: Seat): Record<Seat, number> {
  const result: Record<Seat, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  if (state.trump == null) return result;
  const unseen = unseenCards(state, mySeat).filter((c) => c.suit === state.trump);
  const voids = knownVoids(state);
  // Joueurs candidats à posséder de l'atout = pas moi, pas révélé void atout
  const candidates: Seat[] = [];
  for (const s of [0, 1, 2, 3] as Seat[]) {
    if (s === mySeat) continue;
    if (voids[s].has(state.trump)) continue;
    candidates.push(s);
  }
  if (candidates.length === 0) return result;
  // Distribution uniforme approximative (fallback sans distributions exactes)
  const share = Math.floor(unseen.length / candidates.length);
  const rem = unseen.length - share * candidates.length;
  candidates.forEach((s, i) => {
    result[s] = share + (i < rem ? 1 : 0);
  });
  return result;
}

// Partenaire a-t-il émis ce signal ?
function hasPartnerSignaled(
  state: GameState,
  mySeat: Seat,
  type: "as" | "compte",
): boolean {
  if (!state.bidding) return false;
  const partner = partnerOf(mySeat);
  return state.bidding.history.some(
    (h) => h.seat === partner && h.action.kind === "signal" && h.action.signal === type,
  );
}

// Ce type de signal a-t-il déjà été utilisé par qqn (il n'en reste qu'un
// utilisable par phase, first-come wins) ?
function signalTypeUsed(state: GameState, type: "as" | "compte"): boolean {
  if (!state.bidding) return false;
  return state.bidding.history.some(
    (h) => h.action.kind === "signal" && h.action.signal === type,
  );
}

// Est-ce que j'ai déjà misé dans cette phase ? (si oui, plus de signal)
function seatHasBid(state: GameState, seat: Seat): boolean {
  if (!state.bidding) return false;
  return state.bidding.history.some(
    (h) => h.seat === seat && h.action.kind === "bid",
  );
}

// Ai-je déjà signalé ce type moi-même ?
function seatHasSignaled(state: GameState, seat: Seat, type: "as" | "compte"): boolean {
  if (!state.bidding) return false;
  return state.bidding.history.some(
    (h) => h.seat === seat && h.action.kind === "signal" && h.action.signal === type,
  );
}

// Nombre d'As dans la main
function countAces(hand: Card[]): number {
  return hand.filter((c) => c.rank === 1).length;
}

// Nombre de figures (cartes qui rapportent des points) dans la main
function countFigures(hand: Card[]): number {
  return hand.filter((c) => CARD_POINTS[c.rank] > 0).length;
}

// Singleton = je n'ai qu'UNE SEULE carte dans cette couleur.
function isSingleton(hand: Card[], suit: Suit): boolean {
  return hand.filter((c) => c.suit === suit).length === 1;
}

// Y-a-t-il une paire Rey+Caballo dans la même couleur dans ma main ?
// Retourne la couleur trouvée ou null.
function ghnaPairSuit(hand: Card[]): Suit | null {
  for (const suit of ALL_SUITS) {
    const hasCaballo = hand.some((c) => c.suit === suit && c.rank === 11);
    const hasRey = hand.some((c) => c.suit === suit && c.rank === 12);
    if (hasCaballo && hasRey) return suit;
  }
  return null;
}

// Couleurs dans lesquelles MON partenaire a mené un pli gagné par notre
// équipe. Heuristique : un leader qui a choisi cette couleur était fort
// dedans, donc relead = 3ᵉ main support pour lui.
function suitsPartnerLedAndTeamWon(state: GameState, mySeat: Seat): Set<Suit> {
  const out = new Set<Suit>();
  const partner = partnerOf(mySeat);
  const myTeam = teamOf(mySeat);
  const wonTricks = myTeam === "A" ? state.tricksWon.A : state.tricksWon.B;
  for (const entries of wonTricks) {
    if (entries.length === 0) continue;
    const leader = entries[0];
    if (leader.player === partner) out.add(leader.card.suit);
  }
  return out;
}

// Nombre de plis restants (total 10 par manche).
function tricksLeft(state: GameState): number {
  const played = state.tricksWon.A.length + state.tricksWon.B.length;
  return Math.max(0, 10 - played - (state.trick.length === 4 ? 0 : 0));
}

// Est-ce le dernier pli de la manche (celui de la 9a3a, +10 bonus) ?
function isLastTrick(state: GameState): boolean {
  return tricksLeft(state) === 1;
}

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

export function aiBid(state: GameState, seat: Seat, level: AiLevel = "medium"): BidAction {
  if (!state.bidding) return { kind: "pass" };
  const b = state.bidding;
  const hand = state.hands[seat];
  const strength = handStrength(hand);
  const currentMax = b.highest?.amount ?? MIN_BID - BID_STEP;
  const nextBid = Math.max(MIN_BID, currentMax + BID_STEP);

  // Tutoriel : le partenaire (seat 2) DOIT monter jusqu'à au moins 90
  if (state.tutorial && seat === 2 && nextBid <= 90) {
    return { kind: "bid", amount: Math.max(nextBid, MIN_BID) };
  }

  // ─── Si partenaire tient la plus haute, on ne surbidde pas. Mais on
  //     peut SIGNALER pour lui donner l'info qu'il a du support. ──────
  const partnerLeads = !!b.highest && partnerOf(seat) === b.highest.seat;

  // Easy : n'enchérit presque jamais, ne signale pas
  if (level === "easy") {
    const threshold = 85 + (nextBid - 70) * 0.8;
    if (!partnerLeads && strength >= threshold && nextBid <= MAX_BID) {
      return { kind: "bid", amount: nextBid };
    }
    return { kind: "pass" };
  }

  // ─── Signal helpers (medium et hard) ────────────────────────────────
  const aces = countAces(hand);
  const figures = countFigures(hand);
  const canSignalAs = aces >= 1 && !signalTypeUsed(state, "as") && !seatHasBid(state, seat) && !seatHasSignaled(state, seat, "as");
  const canSignalCompte = figures >= 3 && !signalTypeUsed(state, "compte") && !seatHasBid(state, seat) && !seatHasSignaled(state, seat, "compte");

  // Si partenaire a déjà signalé "un Compte" → j'ajoute ~25 pts à mon
  // estimation. Si "un As" → ~15 pts. Opp signal → pas de bonus (on
  // sait juste que l'équipe adverse est solide).
  const partnerAsBonus = hasPartnerSignaled(state, seat, "as") ? 15 : 0;
  const partnerCompteBonus = hasPartnerSignaled(state, seat, "compte") ? 25 : 0;
  const supportBonus = partnerAsBonus + partnerCompteBonus;

  // ─── Branche HARD ────────────────────────────────────────────────────
  if (level === "hard") {
    // Score estimé : points + figures bonus + concentration - pénalités
    let score = 0;
    const bySuit: Record<Suit, { count: number; highs: number }> = {
      oros: { count: 0, highs: 0 },
      copas: { count: 0, highs: 0 },
      espadas: { count: 0, highs: 0 },
      bastos: { count: 0, highs: 0 },
    };
    for (const c of hand) {
      score += CARD_POINTS[c.rank];
      if (c.rank === 1) { score += 5; bySuit[c.suit].highs += 2; }
      if (c.rank === 3) { score += 4; bySuit[c.suit].highs += 2; }
      if (c.rank === 11 || c.rank === 12) { score += 3; bySuit[c.suit].highs += 1; }
      bySuit[c.suit].count++;
    }
    const bestConcentration = ALL_SUITS
      .map((s) => bySuit[s].count * 5 + bySuit[s].highs * 3)
      .reduce((a, b) => Math.max(a, b), 0);
    score += bestConcentration;
    score += supportBonus;

    // Pénalités : As singleton (risque de se faire couper sans follow-up)
    for (const suit of ALL_SUITS) {
      const hasAce = hand.some((c) => c.suit === suit && c.rank === 1);
      if (hasAce && isSingleton(hand, suit)) score -= 5;
    }
    // Bonus : voids (potentiel de coupe) si j'ai ≥3 atouts en main
    const voidsInHand = ALL_SUITS.filter((s) => bySuit[s].count === 0).length;
    const bestSuitCount = ALL_SUITS
      .map((s) => bySuit[s].count)
      .reduce((a, b) => Math.max(a, b), 0);
    if (bestSuitCount >= 3) score += voidsInHand * 8;

    // Boost Ghna 40 : si j'ai Rey+Caballo dans une couleur ET que ma main
    // suggère que je vais choisir cette couleur atout → je vise 90+ pour
    // débloquer le cap 40 (30 pts Ghna bonus potentiels en plus).
    const ghnaSuit = ghnaPairSuit(hand);
    if (ghnaSuit && bySuit[ghnaSuit].count + bySuit[ghnaSuit].highs >= 4) {
      score += 20; // booste l'ambition de bid
    }

    const targetBid = Math.min(MAX_BID, Math.max(MIN_BID, Math.floor(score * 0.65 / 10) * 10));

    // 1) Partenaire mène : ne surbidde pas MAIS peut confirmer avec signal
    if (partnerLeads) {
      if (canSignalCompte && figures >= 3) return { kind: "signal", signal: "compte" };
      if (canSignalAs && aces >= 1) return { kind: "signal", signal: "as" };
      return { kind: "pass" };
    }
    // 2) Je peux bidder à ce palier
    if (nextBid <= targetBid && nextBid <= MAX_BID) {
      return { kind: "bid", amount: nextBid };
    }
    // 3) Pas assez pour bidder, mais je peux signaler pour aider partenaire
    //    IF un adversaire a misé (partenaire pourrait sur-bidder avec info)
    //    OU si personne n'a encore misé (boost préventif)
    const oppLeads = !!b.highest && teamOf(b.highest.seat) !== teamOf(seat);
    if (oppLeads || !b.highest) {
      if (canSignalCompte) return { kind: "signal", signal: "compte" };
      if (canSignalAs) return { kind: "signal", signal: "as" };
    }
    return { kind: "pass" };
  }

  // ─── Branche MEDIUM (défaut) ─────────────────────────────────────────
  const threshold = 55 + (nextBid - 70) * 0.8;
  const effectiveStrength = strength + supportBonus;

  if (partnerLeads) {
    // Partenaire mène : signal si pertinent, sinon pass
    if (canSignalCompte && figures >= 3) return { kind: "signal", signal: "compte" };
    if (canSignalAs && aces >= 2) return { kind: "signal", signal: "as" }; // Un As peu signalé en medium
    return { kind: "pass" };
  }
  if (effectiveStrength >= threshold && nextBid <= MAX_BID) {
    return { kind: "bid", amount: nextBid };
  }
  // Pas assez pour bidder : signaler aide le partenaire
  if (canSignalCompte && figures >= 3) return { kind: "signal", signal: "compte" };
  if (canSignalAs && aces >= 1 && !hasPartnerSignaled(state, seat, "compte")) {
    return { kind: "signal", signal: "as" };
  }
  return { kind: "pass" };
}

export function aiChooseTrump(state: GameState, seat: Seat, level: AiLevel = "medium"): Suit {
  const hand = state.hands[seat];

  // Easy/Medium : "couleur la plus forte" historique (count + points + 2)
  if (level !== "hard") {
    let best: Suit = "oros";
    let bestScore = -1;
    for (const s of ALL_SUITS) {
      const cards = hand.filter((c) => c.suit === s);
      const pts = cards.reduce((sum, c) => sum + CARD_POINTS[c.rank] + 2, 0);
      if (pts > bestScore) { bestScore = pts; best = s; }
    }
    return best;
  }

  // Hard : favorise la LONGUEUR (un trump court = perdu). Formule :
  //   count × 8   (longueur = contrôle)
  //   + points × 1 (cartes qui rapportent)
  //   + hasGhnaPair × 15 (Ghna 40 = bonus énorme)
  // Rejette les couleurs ≤ 2 cartes même si full honors.
  let best: Suit = "oros";
  let bestScore = -Infinity;
  for (const s of ALL_SUITS) {
    const cards = hand.filter((c) => c.suit === s);
    if (cards.length <= 2) continue; // trop court = mauvais atout
    const count = cards.length;
    const points = cards.reduce((a, c) => a + CARD_POINTS[c.rank], 0);
    const hasGhna =
      cards.some((c) => c.rank === 11) && cards.some((c) => c.rank === 12);
    const score = count * 8 + points + (hasGhna ? 15 : 0);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  // Fallback si toutes les couleurs sont ≤ 2 cartes (impossible avec 10
  // cartes en main mais safety) : fallback sur best de medium.
  if (bestScore === -Infinity) {
    for (const s of ALL_SUITS) {
      const cards = hand.filter((c) => c.suit === s);
      const pts = cards.reduce((sum, c) => sum + CARD_POINTS[c.rank] + 2, 0);
      if (pts > bestScore) { bestScore = pts; best = s; }
    }
  }
  return best;
}

export function aiPick(state: GameState, seat: Seat, level: AiLevel = "medium"): Card | null {
  const legal = legalMoves(state, seat);
  if (legal.length === 0) return null;

  // Easy : joue une carte légale au hasard (très facile à battre)
  if (level === "easy") {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  if (level === "hard") return aiPickHard(state, seat, legal);

  // Medium (défaut)
  return aiPickMedium(state, seat, legal);
}

function aiPickMedium(state: GameState, seat: Seat, legal: Card[]): Card {
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

// IA hard : compte les cartes jouées, tracker voids + atouts restants par
// siège, stratégies de position (2e main basse / 3e main haute / 4e parfait),
// drawing trumps quand buyer long, économie atout, endgame perfect-play.
function aiPickHard(state: GameState, seat: Seat, legal: Card[]): Card {
  const partner = partnerOf(seat);
  const trump = state.trump;
  const isLastToPlay = state.trick.length === 3;
  const position = state.trick.length; // 0 = meneur, 1 = 2e main, 2 = 3e, 3 = 4e
  const partnerWinning =
    trump != null && state.trick.length > 0 && trickWinner(state.trick, trump) === partner;
  const iAmBuyer = state.bidWinner != null && teamOf(state.bidWinner) === teamOf(seat);
  const myHand = state.hands[seat];
  const myTrumps = trump != null ? myHand.filter((c) => c.suit === trump).length : 0;
  const voids = knownVoids(state);
  const trumpsPerSeat = trumpsRemainingPerSeat(state, seat);
  const oppTrumpsTotal =
    trump != null
      ? trumpsPerSeat[(seat + 1) % 4 as Seat] + trumpsPerSeat[(seat + 3) % 4 as Seat]
      : 0;

  const sortByPointsThenForce = (cards: Card[]) =>
    [...cards].sort(
      (a, b) => CARD_POINTS[a.rank] - CARD_POINTS[b.rank] || CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank],
    );

  // ─── POSITION 0 : je mène le pli ─────────────────────────────
  if (position === 0) {
    // (A) C'EST LE DERNIER PLI (9a3a = +10 bonus) : jouer ABSOLUMENT le
    //     meilleur sure winner disponible, peu importe sa valeur. Si aucun
    //     sure winner, jouer la plus haute carte pour max chances.
    if (isLastTrick(state)) {
      const sureWinners = legal.filter((c) => isSureWinner(c, state, seat));
      if (sureWinners.length) {
        return [...sureWinners].sort(
          (a, b) =>
            (CARD_POINTS[b.rank] + CARD_STRENGTH[b.rank]) -
            (CARD_POINTS[a.rank] + CARD_STRENGTH[a.rank]),
        )[0];
      }
      // Pas de sure winner — joue la plus forte en force (meilleure chance)
      return [...legal].sort(
        (a, b) => CARD_STRENGTH[b.rank] - CARD_STRENGTH[a.rank],
      )[0];
    }

    // (B) Drawing trumps : je suis buyer, ≥4 atouts, adversaires en ont
    //     encore. Sort mon plus fort atout SI c'est un sure winner.
    if (iAmBuyer && trump != null && myTrumps >= 4 && oppTrumpsTotal > 0) {
      const myTrumpCards = legal
        .filter((c) => c.suit === trump)
        .sort((a, b) => CARD_STRENGTH[b.rank] - CARD_STRENGTH[a.rank]);
      const bestTrump = myTrumpCards[0];
      if (bestTrump && isSureWinner(bestTrump, state, seat)) return bestTrump;
    }

    // (C) Défense (je ne suis PAS buyer) : ne lead JAMAIS mon atout, ça
    //     aide l'adversaire buyer à drainer. Force-le à ouvrir atout.
    //     Priorité : couleur où j'ai les PLUS PETITES cartes (safe lead).
    if (!iAmBuyer) {
      const nonTrumpLegal = legal.filter((c) => c.suit !== trump);
      if (nonTrumpLegal.length) {
        // Défense : lead basse non-atout, éviter couleurs où adversaires
        // buyer side sont void (ils coupent direct)
        const opp1 = ((seat + 1) % 4) as Seat;
        const opp2 = ((seat + 3) % 4) as Seat;
        const safe = nonTrumpLegal.filter(
          (c) => !(voids[opp1].has(c.suit) && voids[opp2].has(c.suit)),
        );
        const pool = safe.length ? safe : nonTrumpLegal;
        // Priorité : relead couleur où partenaire a joué leader
        const partnerSuits = suitsPartnerLedAndTeamWon(state, seat);
        const reLead = pool.find((c) => partnerSuits.has(c.suit));
        if (reLead) {
          // Dans partner suit, sors une grosse (As/Triss si présente)
          const inSuit = pool.filter((c) => c.suit === reLead.suit);
          inSuit.sort((a, b) => CARD_STRENGTH[b.rank] - CARD_STRENGTH[a.rank]);
          return inSuit[0];
        }
        // Sinon : basse safe
        const lowSafe = [...pool].sort(
          (a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank],
        );
        return lowSafe[0];
      }
      // Forcé de jouer atout (singleton atout ou main 100% atout)
      return sortByPointsThenForce(legal)[0];
    }

    // (D) Sure winner non-atout : préférer la plus forte en points.
    //     MAIS si j'ai plusieurs sure winners et ce N'EST PAS trick 10,
    //     je garde le plus haut-valeur pour la 9a3a → je sors le plus
    //     BAS qui soit encore un sure winner.
    const sureWinners = legal
      .filter((c) => isSureWinner(c, state, seat))
      .sort((a, b) =>
        (CARD_POINTS[b.rank] + CARD_STRENGTH[b.rank]) -
        (CARD_POINTS[a.rank] + CARD_STRENGTH[a.rank]),
      );
    if (sureWinners.length >= 2) {
      // Garde le plus haut, sort le 2e (suffisamment fort pour gagner,
      // mais on économise l'atout majeur / As pour trick 10).
      return sureWinners[1];
    }
    if (sureWinners.length === 1) return sureWinners[0];

    // (E) Endgame (≤3 cartes en main) : jouer la plus haute valeur.
    if (myHand.length <= 3) {
      return [...legal].sort(
        (a, b) =>
          (CARD_POINTS[b.rank] + CARD_STRENGTH[b.rank]) -
          (CARD_POINTS[a.rank] + CARD_STRENGTH[a.rank]),
      )[0];
    }

    // (F) Relead partenaire : retourner à une couleur où partenaire a
    //     déjà mené avec succès (= il est fort).
    const partnerSuits = suitsPartnerLedAndTeamWon(state, seat);
    const reLeadCards = legal.filter(
      (c) => c.suit !== trump && partnerSuits.has(c.suit),
    );
    if (reLeadCards.length) {
      // Dans cette couleur : sort une moyenne (pour pas cramer notre As)
      const sorted = [...reLeadCards].sort(
        (a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank],
      );
      return sorted[0]; // basse pour laisser partner gagner avec son fort
    }

    // (G) Lead basse non-atout, évite couleurs où les 2 opp sont void
    const nonTrumpLow = legal
      .filter((c) => c.suit !== trump && CARD_POINTS[c.rank] === 0)
      .filter((c) => {
        const opp1 = ((seat + 1) % 4) as Seat;
        const opp2 = ((seat + 3) % 4) as Seat;
        const bothOppVoid = voids[opp1].has(c.suit) && voids[opp2].has(c.suit);
        return !bothOppVoid;
      })
      .sort((a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank]);
    if (nonTrumpLow.length) return nonTrumpLow[0];

    // (H) Fallback : la moins précieuse
    return sortByPointsThenForce(legal)[0];
  }

  // ─── POSITION 1 : 2e main — règle "2e main basse" ────────────
  if (position === 1) {
    if (partnerWinning) {
      // partenaire leader ? rare ici (2e main = juste après meneur), donc
      // partnerWinning improbable sauf si meneur = partenaire
      return sortByPointsThenForce(legal)[0];
    }
    // Adversaire (RHO) vient de mener. Règle 2e main basse : SAUF si je
    // peux gagner à peu de frais, je joue la plus petite.
    if (trump == null) return sortByPointsThenForce(legal)[0];
    const winners = legal.filter((c) => {
      const test = trickWinner([...state.trick, { player: seat, card: c }], trump);
      return test === seat;
    });
    const trickPointsSoFar = state.trick.reduce((a, e) => a + CARD_POINTS[e.card.rank], 0);
    // Je ne gagne QUE si le pli vaut déjà 10+ pts ET mon winner mini est pas une grosse
    if (winners.length && trickPointsSoFar >= 10) {
      winners.sort((a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank]);
      return winners[0];
    }
    // Sinon dump la plus basse
    return sortByPointsThenForce(legal)[0];
  }

  // ─── POSITION 2 : 3e main — règle "3e main haute" ────────────
  if (position === 2) {
    if (partnerWinning) {
      // Partenaire mène et est toujours gagnant (2e main n'a pas passé) →
      // je dump haut sauf si 4e adversaire peut encore passer.
      // Heuristique : si 4e adversaire est connu void de la couleur ouverte
      // ET void d'atout → partenaire est garanti gagnant, je balance As/Triss.
      const ledSuit = state.trick[0].card.suit;
      const opp4 = ((seat + 1) % 4) as Seat;
      const opp4CantWin =
        voids[opp4].has(ledSuit) && (trump == null || voids[opp4].has(trump));
      if (opp4CantWin) {
        return [...legal].sort((a, b) => CARD_POINTS[b.rank] - CARD_POINTS[a.rank])[0];
      }
      // Sinon dump prudent (basse)
      return sortByPointsThenForce(legal)[0];
    }
    // Adversaire mène en ce moment. 3e main haute : je pousse une carte
    // forte si je peux gagner (et que je crains pas le 4e).
    if (trump == null) return sortByPointsThenForce(legal)[0];
    const winners = legal.filter((c) => {
      const test = trickWinner([...state.trick, { player: seat, card: c }], trump);
      return test === seat;
    });
    if (winners.length) {
      // Le 4e adversaire peut-il sur-couper ? Check trumpsRemaining + voids
      const opp4 = ((seat + 1) % 4) as Seat;
      const ledSuit = state.trick[0].card.suit;
      const canOpp4BeatTrump = trumpsPerSeat[opp4] > 0 && !voids[opp4].has(trump);
      const canOpp4FollowHigher = !voids[opp4].has(ledSuit);
      // Si opp4 n'a plus d'atout ET pas la couleur en plus haut → je peux
      // envoyer une grosse winner sans crainte
      if (!canOpp4BeatTrump && !canOpp4FollowHigher) {
        // Sur-coupe high-value pour sécuriser le pli
        const byValue = [...winners].sort(
          (a, b) =>
            (CARD_POINTS[b.rank] + CARD_STRENGTH[b.rank]) -
            (CARD_POINTS[a.rank] + CARD_STRENGTH[a.rank]),
        );
        return byValue[0];
      }
      // Sinon gagne avec le minimum nécessaire
      winners.sort((a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank]);
      return winners[0];
    }
    return sortByPointsThenForce(legal)[0];
  }

  // ─── POSITION 3 : 4e main — info parfaite sur le pli ─────────
  // Je vois tout : ledSuit, les 3 cartes jouées, qui gagne actuellement
  if (partnerWinning) {
    // Partenaire gagne, 4e = moi → personne ne peut plus battre → dump
    // la plus grosse (As/Triss pour maximiser les points récoltés)
    return [...legal].sort((a, b) => CARD_POINTS[b.rank] - CARD_POINTS[a.rank])[0];
  }
  // Adversaire gagne actuellement : je gagne avec le minimum ou j'abandonne
  if (trump == null) return sortByPointsThenForce(legal)[0];
  const winners = legal.filter((c) => {
    const test = trickWinner([...state.trick, { player: seat, card: c }], trump);
    return test === seat;
  });
  if (winners.length) {
    winners.sort((a, b) => CARD_STRENGTH[a.rank] - CARD_STRENGTH[b.rank]);
    const trickPoints = state.trick.reduce((a, e) => a + CARD_POINTS[e.card.rank], 0);
    // Si pli faible (≤4 pts) ET j'ai des non-winners dispos → économie atout
    if (trickPoints <= 4) {
      const nonWinner = sortByPointsThenForce(legal).find((c) => !winners.includes(c));
      if (nonWinner) return nonWinner;
    }
    return winners[0];
  }
  // Je ne gagne pas : lâche la plus basse en points+force (évite de donner
  // un As/Triss à l'adversaire qui va gagner)
  return sortByPointsThenForce(legal)[0];
}

// Compat : ancien nom conservé pour ne pas casser l'UI existante.
export const dealNewGame = createGame;
