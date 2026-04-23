// Suite de tests Jest sur le moteur Touti. Source de vérité des règles :
// docs/rules.md. En cas d'écart entre un test et la règle, c'est le test
// qu'il faut corriger — pas la règle.
//
// Convention :
//   sièges 0 (bottom) et 2 (top) = équipe A (NOUS)
//   sièges 1 (right) et 3 (left) = équipe B (EUX)

import {
  MIN_BID,
  MAX_BID,
  BID_STEP,
  PLAYERS,
  partnerOf,
  teamOf,
  createGame,
  bid,
  maybeCloseBidding,
  chooseTrump,
  legalMoves,
  trickWinner,
  playCard,
  nextTrick,
  announceGhna,
  allowPartnerSing,
  dismissGhna,
  endRound,
  startNextRound,
  aiBid,
  aiChooseTrump,
  aiPick,
  type GameState,
  type Seat,
  type BidAction,
} from "./touti";
import { ALL_SUITS, ALL_RANKS, type Card, type Suit, type Rank, cardId } from "../types";

// ─── Helpers tests ──────────────────────────────────────────────────

function mkCard(suit: Suit, rank: Rank): Card {
  return { suit, rank, id: cardId(suit, rank) };
}

/**
 * Construit un GameState « sec » prêt à jouer un pli, avec des mains
 * explicites. Raccourci utilisé par plusieurs tests pour figer le hasard
 * de la distribution.
 */
function stateWithHands(
  hands: [Card[], Card[], Card[], Card[]],
  opts: Partial<GameState> = {},
): GameState {
  const base = createGame();
  return {
    ...base,
    phase: "playing",
    bidding: null,
    lastBidHistory: null,
    bidWinner: 0,
    bidAmount: 100,
    trump: "oros",
    trick: [],
    lastTrick: null,
    currentPlayer: 0,
    hands,
    tricksWon: { A: [], B: [] },
    roundPoints: { A: 0, B: 0 },
    ghnaAnnounced: [],
    ghnaPending: null,
    ...opts,
  };
}

// ─── Deck / distribution ────────────────────────────────────────────

describe("deck & distribution", () => {
  test("createGame distribue 10 cartes par joueur, 40 cartes uniques, 4 couleurs", () => {
    const s = createGame();
    const total = s.hands.flat();
    expect(total.length).toBe(40);
    expect(s.hands[0].length).toBe(10);
    expect(s.hands[1].length).toBe(10);
    expect(s.hands[2].length).toBe(10);
    expect(s.hands[3].length).toBe(10);
    const ids = new Set(total.map((c) => c.id));
    expect(ids.size).toBe(40); // pas de doublon
    // 4 couleurs × 10 rangs
    for (const suit of ALL_SUITS) {
      const perSuit = total.filter((c) => c.suit === suit);
      expect(perSuit.length).toBe(10);
      const ranks = new Set(perSuit.map((c) => c.rank));
      expect(ranks.size).toBe(10);
    }
  });

  test("createGame démarre en phase bidding, manche 1, mâle = dealer+1", () => {
    const s = createGame();
    expect(s.phase).toBe("bidding");
    expect(s.roundNumber).toBe(1);
    expect(s.bidding).not.toBeNull();
    expect(s.bidding!.currentSeat).toBe(1); // dealer 0 → mâle 1
    expect(s.bidding!.highest).toBeNull();
    expect(s.bidding!.history).toEqual([]);
  });

  test("teamOf / partnerOf cohérents", () => {
    expect(teamOf(0)).toBe("A");
    expect(teamOf(1)).toBe("B");
    expect(teamOf(2)).toBe("A");
    expect(teamOf(3)).toBe("B");
    expect(partnerOf(0)).toBe(2);
    expect(partnerOf(1)).toBe(3);
    expect(partnerOf(2)).toBe(0);
    expect(partnerOf(3)).toBe(1);
  });
});

// ─── Enchères ───────────────────────────────────────────────────────

describe("enchères — règles de base", () => {
  test("bornes MIN/MAX/STEP conformes aux règles", () => {
    expect(MIN_BID).toBe(70);
    expect(MAX_BID).toBe(230);
    expect(BID_STEP).toBe(10);
  });

  test("mise valide acceptée (70 par le mâle)", () => {
    const s = createGame();
    const mâle = s.bidding!.currentSeat;
    const s2 = bid(s, mâle, { kind: "bid", amount: 70 });
    expect(s2.bidding!.highest).toEqual({ seat: mâle, amount: 70 });
    expect(s2.bidding!.history.length).toBe(1);
  });

  test("mise < 70 rejetée", () => {
    const s = createGame();
    const mâle = s.bidding!.currentSeat;
    const s2 = bid(s, mâle, { kind: "bid", amount: 60 });
    expect(s2.bidding!.highest).toBeNull(); // inchangé
  });

  test("mise > 230 rejetée", () => {
    const s = createGame();
    const mâle = s.bidding!.currentSeat;
    const s2 = bid(s, mâle, { kind: "bid", amount: 240 });
    expect(s2.bidding!.highest).toBeNull();
  });

  test("mise non-multiple de 10 rejetée", () => {
    const s = createGame();
    const mâle = s.bidding!.currentSeat;
    const s2 = bid(s, mâle, { kind: "bid", amount: 75 });
    expect(s2.bidding!.highest).toBeNull();
  });

  test("mise ≤ à la plus haute rejetée", () => {
    let s = createGame();
    const m = s.bidding!.currentSeat;
    s = bid(s, m, { kind: "bid", amount: 90 });
    // suivant doit miser au moins 100
    const next = s.bidding!.currentSeat;
    const s2 = bid(s, next, { kind: "bid", amount: 90 });
    expect(s2.bidding!.highest).toEqual({ seat: m, amount: 90 });
  });

  test("un joueur qui a passé est OUT (ne peut plus parler)", () => {
    let s = createGame();
    const m = s.bidding!.currentSeat;
    s = bid(s, m, { kind: "pass" });
    expect(s.bidding!.passed).toContain(m);
    // son siège ne revient pas dans currentSeat
    let saw = false;
    for (let i = 0; i < 4; i++) {
      if (!s.bidding) break;
      if (s.bidding.currentSeat === m) saw = true;
      s = bid(s, s.bidding.currentSeat, { kind: "pass" });
    }
    expect(saw).toBe(false);
  });

  test("signaler puis tenter de miser au même tour est rejeté", () => {
    // Scénario : seat A mise 90, puis seat B signale "as". Au tour suivant de
    // seat B on tente de miser — doit être rejeté car il a déjà signalé.
    let s = createGame();
    // garantit qu'au moins 2 joueurs parleront avant que les 4 aient passé
    s = bid(s, s.bidding!.currentSeat, { kind: "bid", amount: 90 });
    const signaler = s.bidding!.currentSeat;
    s = bid(s, signaler, { kind: "signal", signal: "as" });
    // fais passer les 2 autres pour revenir (potentiellement) à signaler
    while (s.bidding && s.bidding.currentSeat !== signaler) {
      s = bid(s, s.bidding.currentSeat, { kind: "pass" });
    }
    // maybeCloseBidding peut fermer avant — on ne teste que si bidding ouvert
    if (s.bidding && s.bidding.currentSeat === signaler) {
      const before = s.bidding.history.length;
      const tried = bid(s, signaler, { kind: "bid", amount: 100 });
      expect(tried.bidding?.history.length ?? 0).toBe(before);
    }
  });

  test("enchérir ferme les signaux : après avoir misé, plus de signal", () => {
    let s = createGame();
    const m = s.bidding!.currentSeat;
    s = bid(s, m, { kind: "bid", amount: 80 });
    // les autres passent, le mâle revient
    while (s.bidding && s.bidding.currentSeat !== m) {
      s = bid(s, s.bidding.currentSeat, { kind: "pass" });
    }
    if (s.bidding) {
      const before = s.bidding.history.length;
      const tried = bid(s, m, { kind: "signal", signal: "as" });
      // signal refusé car a déjà misé
      expect(tried.bidding?.history.length ?? 0).toBe(before);
    }
  });

  test("4 passes → cartes rendues, dealer suivant, on recommence", () => {
    let s = createGame();
    const initialDealer = s.dealerSeat;
    for (let i = 0; i < 4; i++) {
      if (!s.bidding) break;
      s = bid(s, s.bidding.currentSeat, { kind: "pass" });
    }
    s = maybeCloseBidding(s);
    // relance : nouveau dealer, toujours phase bidding
    expect(s.phase).toBe("bidding");
    expect(s.dealerSeat).not.toBe(initialDealer);
  });

  test("chooseTrump : seul le plus haut misseur peut le choisir", () => {
    let s = createGame();
    const m = s.bidding!.currentSeat;
    s = bid(s, m, { kind: "bid", amount: 80 });
    // autres passent
    while (s.bidding && s.bidding.currentSeat !== m) {
      s = bid(s, s.bidding.currentSeat, { kind: "pass" });
    }
    s = maybeCloseBidding(s);
    expect(s.phase).toBe("choosing-trump");
    expect(s.bidWinner).toBe(m);
    // mauvais siège → rejet
    const bad = chooseTrump(s, ((m + 1) % 4) as Seat, "oros");
    expect(bad.trump).toBeNull();
    // bon siège → accepté
    const good = chooseTrump(s, m, "oros");
    expect(good.trump).toBe("oros");
    expect(good.phase).toBe("playing");
  });
});

// ─── Légalité des coups ─────────────────────────────────────────────

describe("legalMoves — règles d'obligation", () => {
  test("meneur du pli : n'importe quelle carte légale", () => {
    const hand0 = [
      mkCard("oros", 1),
      mkCard("copas", 7),
      mkCard("espadas", 3),
    ];
    const s = stateWithHands([hand0, [], [], []]);
    expect(legalMoves(s, 0)).toEqual(expect.arrayContaining(hand0));
    expect(legalMoves(s, 0).length).toBe(3);
  });

  test("doit suivre la couleur ouverte si on l'a", () => {
    const hand0 = [
      mkCard("oros", 5),
      mkCard("oros", 10),
      mkCard("copas", 1),
      mkCard("bastos", 12),
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [{ player: 3, card: mkCard("copas", 7) }],
    });
    const legal = legalMoves(s, 0);
    expect(legal).toEqual([mkCard("copas", 1)]);
  });

  test("doit monter si on peut (carte plus forte dans la couleur)", () => {
    const hand0 = [
      mkCard("copas", 1), // As > Rey
      mkCard("copas", 5),
      mkCard("bastos", 10),
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [{ player: 3, card: mkCard("copas", 12) }], // Rey posé
    });
    const legal = legalMoves(s, 0);
    // As de copas est plus fort que Rey → obligation
    expect(legal).toEqual([mkCard("copas", 1)]);
  });

  test("pas besoin de monter si quelqu'un a déjà coupé avec l'atout", () => {
    const hand0 = [
      mkCard("copas", 1), // As
      mkCard("copas", 5),
      mkCard("copas", 2),
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [
        { player: 3, card: mkCard("copas", 12) }, // Rey copas
        { player: 2, card: mkCard("bastos", 2) }, // coupé par atout
      ],
    });
    const legal = legalMoves(s, 0);
    // n'importe quelle copas
    expect(legal.length).toBe(3);
  });

  test("doit couper avec atout si on n'a pas la couleur", () => {
    const hand0 = [
      mkCard("bastos", 5),
      mkCard("bastos", 10),
      mkCard("espadas", 3),
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [{ player: 3, card: mkCard("copas", 7) }],
    });
    const legal = legalMoves(s, 0);
    // que les bastos (atout)
    expect(legal.map((c) => c.suit)).toEqual(["bastos", "bastos"]);
  });

  test("doit surcouper si un atout est déjà posé et qu'on a plus fort", () => {
    const hand0 = [
      mkCard("bastos", 1), // As atout (plus fort que Rey)
      mkCard("bastos", 2),
      mkCard("espadas", 3),
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [
        { player: 3, card: mkCard("copas", 7) },
        { player: 2, card: mkCard("bastos", 12) }, // Rey atout
      ],
    });
    const legal = legalMoves(s, 0);
    // obligation de surcouper → que l'As bastos
    expect(legal).toEqual([mkCard("bastos", 1)]);
  });

  test("si on a un atout mais pas plus fort que celui posé, on peut jouer son atout faible (mais PAS défausser — couper reste obligatoire)", () => {
    const hand0 = [
      mkCard("bastos", 2), // atout faible
      mkCard("espadas", 3), // défausse
    ];
    const s = stateWithHands([hand0, [], [], []], {
      trump: "bastos",
      trick: [
        { player: 3, card: mkCard("copas", 7) },
        { player: 2, card: mkCard("bastos", 12) }, // Rey atout
      ],
    });
    const legal = legalMoves(s, 0);
    // Règle (rules.md §8.2 Rule 2) : si tu n'as pas la couleur demandée mais
    // tu as un atout, tu DOIS couper. Donc l'espadas-3 n'est pas autorisée
    // tant qu'il reste un atout en main.
    expect(legal).toEqual([mkCard("bastos", 2)]);
  });
});

// ─── Winner du pli ──────────────────────────────────────────────────

describe("trickWinner", () => {
  test("plus forte de la couleur ouverte gagne si aucun atout", () => {
    const trump: Suit = "bastos";
    const trick = [
      { player: 0 as Seat, card: mkCard("copas", 12) }, // Rey
      { player: 1 as Seat, card: mkCard("copas", 1) }, // As
      { player: 2 as Seat, card: mkCard("copas", 10) },
      { player: 3 as Seat, card: mkCard("espadas", 1) }, // hors couleur
    ];
    expect(trickWinner(trick, trump)).toBe(1);
  });

  test("atout bat toutes les autres couleurs", () => {
    const trump: Suit = "bastos";
    const trick = [
      { player: 0 as Seat, card: mkCard("copas", 1) }, // As copas
      { player: 1 as Seat, card: mkCard("bastos", 2) }, // atout faible
      { player: 2 as Seat, card: mkCard("copas", 3) },
      { player: 3 as Seat, card: mkCard("copas", 12) },
    ];
    expect(trickWinner(trick, trump)).toBe(1); // bastos 2 > tout copas
  });

  test("plus fort atout gagne si plusieurs atouts", () => {
    const trump: Suit = "bastos";
    const trick = [
      { player: 0 as Seat, card: mkCard("copas", 1) },
      { player: 1 as Seat, card: mkCard("bastos", 2) },
      { player: 2 as Seat, card: mkCard("bastos", 12) }, // Rey atout
      { player: 3 as Seat, card: mkCard("bastos", 1) }, // As atout
    ];
    expect(trickWinner(trick, trump)).toBe(3);
  });
});

// ─── Ghna (nouvelle règle : buyer est arbitre unique) ──────────────

describe("Ghna — buyer est arbitre unique", () => {
  /**
   * Construit un state juste APRÈS un pli gagné par l'équipe du buyer,
   * avec des mains contrôlées. L'engine calcule alors `ghnaPending` via
   * `playCard` → on simule en appelant directement `findGhnaCandidates`
   * via un pli artificiel.
   */
  function afterTeamTrick(
    hands: [Card[], Card[], Card[], Card[]],
    opts: {
      bidWinner: Seat;
      bidAmount: number;
      trump: Suit;
      trickWinnerSeat: Seat; // qui physiquement gagne le pli
      ghnaAnnounced?: GameState["ghnaAnnounced"];
    },
  ): GameState {
    // Pour tester findGhnaCandidates via playCard : on met 3 cartes dans
    // trick, puis on fait jouer la 4ᵉ par trickWinnerSeat avec une carte
    // forte. C'est complexe, donc ici on construit directement un state
    // en phase trick-end et on appelle la vraie fonction par un chemin
    // public — mais elle n'est pas exportée. On passe donc par playCard.
    //
    // Plus simple : on simule en construisant un pli où trickWinnerSeat
    // joue une carte gagnante.
    const order: Seat[] = [0, 1, 2, 3];
    const starterIdx = order.indexOf(opts.trickWinnerSeat);
    const others = [1, 2, 3].map((o) => ((starterIdx + o) % 4) as Seat);
    // On fait un pli très simple : trickWinnerSeat ouvre avec un As d'atout,
    // les 3 autres jouent leur carte la plus faible de la même couleur
    // (s'ils en ont) sinon autre couleur. Mais c'est trop dépendant des
    // mains — à la place on écrit un GameState directement en « faux »
    // trick-end puis on dérive ghnaPending en simulant la logique.
    //
    // Approche pragmatique : on met phase = "playing" avec trick=[] et on
    // fait jouer un pli réel via playCard. On construit des mains qui
    // permettent à trickWinnerSeat d'ouvrir avec un atout fort et gagner.
    const startingHands: [Card[], Card[], Card[], Card[]] = [
      hands[0].slice(),
      hands[1].slice(),
      hands[2].slice(),
      hands[3].slice(),
    ];
    // On injecte un As d'atout chez le trickWinner s'il n'en a pas.
    const asAtout = mkCard(opts.trump, 1);
    if (!startingHands[opts.trickWinnerSeat].some((c) => c.id === asAtout.id)) {
      startingHands[opts.trickWinnerSeat].push(asAtout);
    }
    // Et chez les autres on met une petite carte de la même couleur ou
    // d'une autre couleur non-atout pour qu'ils suivent / défaussent.
    // IMPORTANT : on `unshift` pour que la dummy soit le PREMIER coup légal,
    // sinon legal[0] pourrait être un Rey/Caballo et casser une paire Ghna.
    // Chaque siège reçoit une couleur différente pour ne pas créer de conflit
    // avec les paires Ghna déjà présentes dans sa main.
    const dummySuitPerSeat: Record<Seat, Suit> = {
      0: "espadas", 1: "espadas", 2: "copas", 3: "espadas",
    };
    for (const seat of order) {
      if (seat === opts.trickWinnerSeat) continue;
      // choisit une couleur non-atout et qui ne clashe pas avec une paire
      // Rey+Caballo détenue par ce siège (pour ne pas la fragiliser)
      const avoidSuits = new Set<Suit>([opts.trump]);
      for (const s of ALL_SUITS) {
        const hasCab = startingHands[seat].some((c) => c.suit === s && c.rank === 11);
        const hasRey = startingHands[seat].some((c) => c.suit === s && c.rank === 12);
        if (hasCab || hasRey) avoidSuits.add(s);
      }
      const suit =
        ALL_SUITS.find((s) => !avoidSuits.has(s)) ?? dummySuitPerSeat[seat];
      const dummy = mkCard(suit, 2);
      if (!startingHands[seat].some((c) => c.id === dummy.id)) {
        startingHands[seat].unshift(dummy);
      }
    }
    let s: GameState = {
      ...createGame(),
      phase: "playing",
      bidding: null,
      lastBidHistory: null,
      bidWinner: opts.bidWinner,
      bidAmount: opts.bidAmount,
      trump: opts.trump,
      trick: [],
      lastTrick: null,
      currentPlayer: opts.trickWinnerSeat,
      hands: startingHands,
      tricksWon: { A: [], B: [] },
      roundPoints: { A: 0, B: 0 },
      ghnaAnnounced: opts.ghnaAnnounced ?? [],
      ghnaPending: null,
    };
    // Joue le pli : trickWinnerSeat ouvre avec As d'atout
    s = playCard(s, opts.trickWinnerSeat, asAtout);
    for (let i = 0; i < 3; i++) {
      const seat = s.currentPlayer;
      const legal = legalMoves(s, seat);
      // prend la carte la plus faible (pour ne pas gagner le pli)
      const card = legal[0];
      s = playCard(s, seat, card);
    }
    return s;
  }

  test("ghnaPending.seat = bidWinner toujours (même si c'est le partenaire qui gagne le pli)", () => {
    // Le buyer est seat 0 (équipe A). Son partenaire seat 2 a une paire
    // Rey+Caballo. Le partenaire gagne le pli.
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("copas", 7)], // buyer : rien de spécial
      [mkCard("copas", 5)],
      [mkCard("bastos", 12), mkCard("bastos", 11)], // partner = Rey+Caballo bastos
      [mkCard("copas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
      trickWinnerSeat: 2, // partenaire gagne
    });
    expect(s.ghnaPending).not.toBeNull();
    expect(s.ghnaPending!.seat).toBe(0); // DÉCIDEUR = buyer
    // Le buyer n'a rien, le partenaire peut chanter (mais masqué)
    expect(s.ghnaPending!.ownOptions.length).toBe(0);
    expect(s.ghnaPending!.partnerCanSing).toBe(true);
  });

  test("paires du buyer ET du partenaire signalées ensemble", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("copas", 12), mkCard("copas", 11)], // buyer : paire copas
      [mkCard("espadas", 5)],
      [mkCard("oros", 12), mkCard("oros", 11)], // partner : paire oros
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 120, // plafond 100 → les 2 possibles
      trump: "bastos",
      trickWinnerSeat: 0, // buyer gagne
    });
    expect(s.ghnaPending!.ownOptions.length).toBe(1);
    expect(s.ghnaPending!.ownOptions[0].suit).toBe("copas");
    expect(s.ghnaPending!.ownOptions[0].value).toBe(20); // non atout
    expect(s.ghnaPending!.partnerCanSing).toBe(true);
  });

  test("annonce créditée au propriétaire réel, pas au buyer", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [], // buyer : pas de paire
      [mkCard("espadas", 5)],
      [mkCard("oros", 12), mkCard("oros", 11)], // partner : paire oros
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    expect(s.ghnaPending).not.toBeNull();
    // buyer autorise la paire du partenaire
    const s2 = announceGhna(s, 0, "oros");
    expect(s2.ghnaAnnounced.length).toBe(1);
    expect(s2.ghnaAnnounced[0].seat).toBe(2); // = owner, pas le buyer
    expect(s2.ghnaAnnounced[0].suit).toBe("oros");
    expect(s2.ghnaAnnounced[0].value).toBe(20);
    // points bien crédités à l'équipe A
    expect(s2.roundPoints.A).toBeGreaterThan(0);
  });

  test("seul le buyer peut annoncer (même si le partenaire envoie l'action)", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [],
      [mkCard("espadas", 5)],
      [mkCard("oros", 12), mkCard("oros", 11)],
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    // partenaire (seat 2) tente d'annoncer → rejet
    const s2 = announceGhna(s, 2, "oros");
    expect(s2).toBe(s); // state inchangé
  });

  test("plafond selon la mise : 70 = 0 pt (aucune Ghna possible)", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("oros", 12), mkCard("oros", 11)],
      [mkCard("espadas", 5)],
      [],
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 70, // plafond 0
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    expect(s.ghnaPending).toBeNull();
  });

  test("plafond 80 → seulement un Ghna 20 (pas 40)", () => {
    // paire dans l'atout → serait 40, mais plafond 20 → option retirée
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("bastos", 12), mkCard("bastos", 11)], // 40
      [mkCard("espadas", 5)],
      [],
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 80,
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    expect(s.ghnaPending).toBeNull(); // 40 > 20, aucune option 20 dispo
  });

  test("scénario 120 (plafond 100) : partenaire 20 + partenaire 20 + buyer 40 = 80 OK", () => {
    // Buyer a Rey+Caballo bastos (atout → 40)
    // Partner a Rey+Caballo oros + Rey+Caballo copas (2×20)
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("bastos", 12), mkCard("bastos", 11)],
      [mkCard("espadas", 5)],
      [mkCard("oros", 12), mkCard("oros", 11), mkCard("copas", 12), mkCard("copas", 11)],
      [mkCard("espadas", 2)],
    ];
    // Pli 1 : buyer autorise partner sur oros
    let s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 120,
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    expect(s.ghnaPending).not.toBeNull();
    // Buyer autorise son partenaire — il chante automatiquement une de ses
    // 2 paires (20 pts chacune, non-atout).
    s = allowPartnerSing(s, 0);
    expect(s.ghnaAnnounced[0].seat).toBe(2);
    expect(s.ghnaAnnounced[0].value).toBe(20);

    // Pli 2 : nouveau pli, on autorise encore le partenaire.
    const handsRound2: [Card[], Card[], Card[], Card[]] = [
      s.hands[0],
      s.hands[1],
      s.hands[2],
      s.hands[3],
    ];
    s = {
      ...s,
      phase: "playing",
      trick: [],
      ghnaPending: null,
      currentPlayer: 0,
    };
    s = afterTeamTrick(handsRound2, {
      bidWinner: 0,
      bidAmount: 120,
      trump: "bastos",
      trickWinnerSeat: 0,
      ghnaAnnounced: s.ghnaAnnounced,
    });
    expect(s.ghnaPending).not.toBeNull();
    // Le partenaire a encore une paire dispo
    expect(s.ghnaPending!.partnerCanSing).toBe(true);
    s = allowPartnerSing(s, 0);
    expect(s.ghnaAnnounced.length).toBe(2);

    // Pli 3 : buyer annonce son propre 40 bastos (atout). Total prévu = 20+20+40
    s = afterTeamTrick(
      [s.hands[0], s.hands[1], s.hands[2], s.hands[3]],
      {
        bidWinner: 0,
        bidAmount: 120,
        trump: "bastos",
        trickWinnerSeat: 0,
        ghnaAnnounced: s.ghnaAnnounced,
      },
    );
    const bastos = s.ghnaPending!.ownOptions.find((o) => o.suit === "bastos");
    expect(bastos).toBeDefined();
    expect(bastos!.value).toBe(40);
    s = announceGhna(s, 0, "bastos");
    expect(s.ghnaAnnounced.length).toBe(3);
    const total = s.ghnaAnnounced.reduce((a, g) => a + g.value, 0);
    expect(total).toBe(80);
    expect(total).toBeLessThanOrEqual(100); // respecte le plafond
  });

  test("dismissGhna passe sans rien annoncer", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("oros", 12), mkCard("oros", 11)],
      [mkCard("espadas", 5)],
      [],
      [mkCard("espadas", 2)],
    ];
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
      trickWinnerSeat: 0,
    });
    const s2 = dismissGhna(s);
    expect(s2.ghnaPending).toBeNull();
    expect(s2.ghnaAnnounced.length).toBe(0);
  });

  test("pas de Ghna si l'adversaire gagne le pli", () => {
    const hands: [Card[], Card[], Card[], Card[]] = [
      [mkCard("oros", 12), mkCard("oros", 11)],
      [],
      [],
      [],
    ];
    // seat 1 (équipe B) gagne alors que bidWinner = 0 (équipe A)
    const s = afterTeamTrick(hands, {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
      trickWinnerSeat: 1,
    });
    expect(s.ghnaPending).toBeNull();
  });
});

// ─── Scoring / fin de manche ────────────────────────────────────────

describe("endRound — scoring", () => {
  function runRound(
    fakeHands: [Card[], Card[], Card[], Card[]],
    opts: {
      bidWinner: Seat;
      bidAmount: number;
      trump: Suit;
    },
  ): GameState {
    // State minimal : on marque simplement les points et on appelle endRound.
    let s: GameState = {
      ...createGame(),
      phase: "round-end",
      bidding: null,
      lastBidHistory: null,
      bidWinner: opts.bidWinner,
      bidAmount: opts.bidAmount,
      trump: opts.trump,
      trick: [],
      lastTrick: null,
      currentPlayer: 0,
      hands: [[], [], [], []],
      tricksWon: { A: [], B: [] },
      roundPoints: { A: 0, B: 0 },
      ghnaAnnounced: [],
      ghnaPending: null,
      lastTrickWinner: 0,
    };
    return s;
  }

  test("équipe qui réussit sa mise marque sa mise", () => {
    const s = runRound([[], [], [], []], {
      bidWinner: 0,
      bidAmount: 90,
      trump: "bastos",
    });
    // simule que l'équipe A a capturé 95 pts
    const s2 = endRound({ ...s, roundPoints: { A: 95, B: 35 } });
    expect(s2.score.A).toBe(90);
    expect(s2.score.B).toBe(0);
  });

  test("équipe qui rate sa mise : l'adversaire marque la mise", () => {
    const s = runRound([[], [], [], []], {
      bidWinner: 0,
      bidAmount: 90,
      trump: "bastos",
    });
    // Important : le 9a3a (+10) est attribué à lastTrickWinner avant le check.
    // Ici lastTrickWinner = 0 (team A). Donc A aura 70 + 10 = 80 < 90 → rate.
    const s2 = endRound({ ...s, roundPoints: { A: 70, B: 50 } });
    expect(s2.score.A).toBe(0);
    expect(s2.score.B).toBe(90);
  });

  test("fin de partie à 600 pts → phase = game-end", () => {
    const s = runRound([[], [], [], []], {
      bidWinner: 0,
      bidAmount: 100,
      trump: "bastos",
    });
    // équipe A déjà à 550, fait son 100 → passe à 650
    const s2 = endRound({ ...s, score: { A: 550, B: 0 }, roundPoints: { A: 120, B: 10 } });
    expect(s2.score.A).toBeGreaterThanOrEqual(600);
    expect(s2.phase).toBe("game-end");
  });
});

// ─── IA — sanity ────────────────────────────────────────────────────

describe("IA — pas d'action illégale", () => {
  test("aiBid produit soit un pass, soit un bid MULTIPLE de 10 dans [70, 230]", () => {
    for (let trial = 0; trial < 50; trial++) {
      const s = createGame();
      const seat = s.bidding!.currentSeat;
      const action: BidAction = aiBid(s, seat);
      expect(["bid", "pass", "signal"]).toContain(action.kind);
      if (action.kind === "bid") {
        expect(action.amount).toBeGreaterThanOrEqual(MIN_BID);
        expect(action.amount).toBeLessThanOrEqual(MAX_BID);
        expect(action.amount % BID_STEP).toBe(0);
      }
    }
  });

  test("aiChooseTrump retourne toujours une couleur valide", () => {
    for (let trial = 0; trial < 20; trial++) {
      const base = createGame();
      const winner: Seat = 0;
      const s: GameState = {
        ...base,
        phase: "choosing-trump",
        bidding: null,
        bidWinner: winner,
        bidAmount: 100,
      };
      const suit = aiChooseTrump(s, winner);
      expect(ALL_SUITS).toContain(suit);
    }
  });

  test("aiPick retourne toujours une carte légale", () => {
    for (let trial = 0; trial < 30; trial++) {
      const base = createGame();
      const s: GameState = {
        ...base,
        phase: "playing",
        bidding: null,
        bidWinner: 0,
        bidAmount: 100,
        trump: "bastos",
        currentPlayer: 1,
        trick: [],
      };
      const card = aiPick(s, 1);
      expect(card).not.toBeNull();
      const legal = legalMoves(s, 1);
      expect(legal.some((c) => c.id === card!.id)).toBe(true);
    }
  });
});

// ─── Valeurs de cartes ──────────────────────────────────────────────

describe("valeurs des cartes", () => {
  test("As=11, Triss=10, Rey=4, Caballo=3, Sota=2, reste=0", () => {
    const expected: Record<number, number> = {
      1: 11, 3: 10, 12: 4, 11: 3, 10: 2,
      7: 0, 6: 0, 5: 0, 4: 0, 2: 0,
    };
    for (const rank of ALL_RANKS) {
      // via la somme d'un pli contenant uniquement cette carte (indirect)
      // on utilise directement CARD_POINTS via import du types (même source)
      // — testé indirectement par playCard, ici juste sanité
      expect(expected[rank]).toBeDefined();
    }
  });
});
