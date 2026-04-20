// Touti game engine — local 4-player (2v2) trick-taking logic
// Players: 0 = you (bottom), 1 = right, 2 = partner (top), 3 = left
// Teams: A = {0, 2} "Nous/7NA", B = {1, 3} "Eux/HOMA"
// Deck: Spanish 40 cards (no 8/9). Ranks in Touti order:
//   high→low:  1 (As) > 3 > 12 (Rey) > 11 (Caballo) > 10 (Sota) > 7 > 6 > 5 > 4 > 2
// Points per card (Touti scoring):
//   As = 11, 3 = 10, Rey = 4, Caballo = 3, Sota = 2, others = 0

const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const RANK_ORDER = { 1: 10, 3: 9, 12: 8, 11: 7, 10: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
const CARD_POINTS = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2, 7: 0, 6: 0, 5: 0, 4: 0, 2: 0 };

const PLAYERS = [
  { id: 0, pos: 'bottom', name: 'Sara',    sub: 'NTI',    initials: 'S', color: '#2E7A8C', team: 'A', human: true },
  { id: 1, pos: 'right',  name: 'Aicha',   sub: '3DOU',   initials: 'A', color: '#C8551D', team: 'B' },
  { id: 2, pos: 'top',    name: 'Karim',   sub: 'SA7BEK', initials: 'K', color: '#B8791C', team: 'A' },
  { id: 3, pos: 'left',   name: 'Youssef', sub: '3DOU',   initials: 'Y', color: '#8B4A7F', team: 'B' },
];

function shuffledDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ suit: s, rank: r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function dealNewGame() {
  const deck = shuffledDeck();
  const hands = [[], [], [], []];
  // Each player gets 10 cards (40/4). In Touti you can deal 3 then flip trump — we just flip bottom card.
  for (let i = 0; i < 40; i++) hands[i % 4].push(deck[i]);
  const trumpCard = hands[3][hands[3].length - 1]; // last card's suit is trump
  return {
    hands,
    trump: trumpCard.suit,
    trickNumber: 1,
    leader: 0,                   // who leads the next trick (player id)
    currentPlayer: 0,
    trick: [],                   // [{ player, card }]
    tricksWon: { A: [], B: [] }, // arrays of collected tricks
    score: { A: 0, B: 0 },
    roundPoints: { A: 0, B: 0 },
    phase: 'playing',            // playing | trick-end | round-end | game-end
    lastTrickWinner: null,
    message: null,
  };
}

function cardKey(c) { return c.suit + ':' + c.rank; }

// Determine legal moves. Touti enforces follow-suit + "obligation d'atout" (must trump if no suit).
// Simplified rule set used here:
// - If trick is empty → any card.
// - Else must follow lead suit if possible.
// - Else must play a trump if possible.
// - Else any card.
function legalMoves(state, playerId) {
  const hand = state.hands[playerId];
  if (state.trick.length === 0) return hand.slice();
  const leadSuit = state.trick[0].card.suit;
  const hasLead = hand.some(c => c.suit === leadSuit);
  if (hasLead) return hand.filter(c => c.suit === leadSuit);
  const hasTrump = hand.some(c => c.suit === state.trump);
  if (hasTrump) return hand.filter(c => c.suit === state.trump);
  return hand.slice();
}

function trickWinner(trick, trump) {
  const leadSuit = trick[0].card.suit;
  // Trump beats non-trump. Within trump or lead, highest RANK_ORDER wins.
  let winIdx = 0;
  for (let i = 1; i < trick.length; i++) {
    const a = trick[winIdx].card, b = trick[i].card;
    const aIsTrump = a.suit === trump, bIsTrump = b.suit === trump;
    if (bIsTrump && !aIsTrump) { winIdx = i; continue; }
    if (!bIsTrump && aIsTrump) continue;
    // same category (both trump or both non-trump)
    if (b.suit === (aIsTrump ? trump : leadSuit) && RANK_ORDER[b.rank] > RANK_ORDER[a.rank]) {
      winIdx = i;
    }
  }
  return trick[winIdx].player;
}

function playCard(state, playerId, card) {
  if (state.phase !== 'playing') return state;
  if (playerId !== state.currentPlayer) return state;
  const legal = legalMoves(state, playerId);
  if (!legal.some(c => cardKey(c) === cardKey(card))) return state;

  const newHand = state.hands[playerId].filter(c => cardKey(c) !== cardKey(card));
  const hands = state.hands.map((h, i) => i === playerId ? newHand : h);
  const trick = [...state.trick, { player: playerId, card }];

  if (trick.length < 4) {
    return {
      ...state,
      hands,
      trick,
      currentPlayer: (playerId + 1) % 4,
    };
  }

  // Trick complete — compute winner, accumulate points
  const winner = trickWinner(trick, state.trump);
  const team = PLAYERS[winner].team;
  const trickPts = trick.reduce((sum, t) => sum + CARD_POINTS[t.card.rank], 0);
  const tricksWon = {
    ...state.tricksWon,
    [team]: [...state.tricksWon[team], trick],
  };
  const roundPoints = {
    ...state.roundPoints,
    [team]: state.roundPoints[team] + trickPts,
  };

  const handsEmpty = hands.every(h => h.length === 0);
  return {
    ...state,
    hands,
    trick,
    tricksWon,
    roundPoints,
    lastTrickWinner: winner,
    phase: handsEmpty ? 'round-end' : 'trick-end',
    currentPlayer: winner,
    leader: winner,
    message: `${PLAYERS[winner].name} remporte la main · +${trickPts}`,
  };
}

function nextTrick(state) {
  if (state.phase !== 'trick-end') return state;
  return {
    ...state,
    trick: [],
    phase: 'playing',
    trickNumber: state.trickNumber + 1,
    message: null,
  };
}

function endRound(state) {
  if (state.phase !== 'round-end') return state;
  // Last trick bonus = +10 ("diez de últimas")
  const lastTeam = PLAYERS[state.lastTrickWinner].team;
  const rp = { ...state.roundPoints, [lastTeam]: state.roundPoints[lastTeam] + 10 };
  const score = { A: state.score.A + rp.A, B: state.score.B + rp.B };
  const winnerTeam = score.A >= 101 && score.A > score.B ? 'A'
                   : score.B >= 101 && score.B > score.A ? 'B' : null;
  return {
    ...state,
    score,
    phase: winnerTeam ? 'game-end' : 'playing',
    message: winnerTeam ? (winnerTeam === 'A' ? 'Équipe gagnante : Nous !' : 'Ils ont gagné cette partie.') : null,
  };
}

// Simple AI: pick a legal card
function aiPick(state, playerId) {
  const legal = legalMoves(state, playerId);
  if (legal.length === 0) return null;
  const leadSuit = state.trick[0]?.card.suit;
  const partner = (playerId + 2) % 4;
  const partnerWinning = state.trick.length > 0 && trickWinner(state.trick, state.trump) === partner;

  // If partner is winning, play low-value non-trump
  if (partnerWinning) {
    const low = [...legal].sort((a, b) => CARD_POINTS[a.rank] - CARD_POINTS[b.rank] || RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return low[0];
  }
  // If leading: play a medium card of non-trump
  if (state.trick.length === 0) {
    const nonTrump = legal.filter(c => c.suit !== state.trump);
    const pool = nonTrump.length ? nonTrump : legal;
    const sorted = [...pool].sort((a, b) => RANK_ORDER[b.rank] - RANK_ORDER[a.rank]);
    return sorted[Math.floor(sorted.length / 2)] || sorted[0];
  }
  // Otherwise: try to win with lowest winning card, else dump lowest
  const current = trickWinner(state.trick, state.trump);
  const currentCard = state.trick.find(t => t.player === current).card;
  const winners = legal.filter(c => {
    const test = trickWinner([...state.trick, { player: playerId, card: c }], state.trump);
    return test === playerId;
  });
  if (winners.length) {
    winners.sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    return winners[0];
  }
  legal.sort((a, b) => CARD_POINTS[a.rank] - CARD_POINTS[b.rank] || RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  return legal[0];
}

Object.assign(window, {
  PLAYERS, SUITS, RANKS, RANK_ORDER, CARD_POINTS,
  dealNewGame, legalMoves, trickWinner, playCard, nextTrick, endRound, aiPick, cardKey,
});
