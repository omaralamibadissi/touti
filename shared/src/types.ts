// Types partagés entre le client mobile et le serveur Colyseus.
// À adapter selon les règles finales du jeu (Touti : jeu marocain, paquet
// espagnol 40 cartes, plis, atout, scoring d'équipe).

export type Suit = "oros" | "copas" | "espadas" | "bastos";

export interface Card {
  suit: Suit;
  rank: number; // 1..12 (pas de 8, 9, 10 dans un paquet espagnol 40 — à filtrer côté deck)
  id: string;   // identifiant stable (ex: "oros-7")
}

export interface PlayerPublic {
  id: string;
  name: string;
  seat: 0 | 1 | 2 | 3;
  team: 0 | 1;
  connected: boolean;
  handCount: number; // on n'expose pas la main aux autres joueurs
}

export type GamePhase =
  | "waiting"   // en attente de joueurs
  | "dealing"   // distribution
  | "bidding"   // annonce d'atout (à préciser selon règles touti)
  | "playing"   // tour de jeu
  | "scoring"   // fin de pli / fin de manche
  | "finished"; // partie terminée

export interface GameStatePublic {
  phase: GamePhase;
  players: PlayerPublic[];
  currentSeat: 0 | 1 | 2 | 3 | null;
  trumpSuit: Suit | null;
  trick: { seat: number; card: Card }[];
  scoreByTeam: [number, number];
  roundNumber: number;
}
