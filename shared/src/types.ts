// Types partagés entre le client mobile et le serveur Colyseus.
// Source de vérité des règles : docs/rules.md

// ─── Cartes ────────────────────────────────────────────────────────

// Codes internes (paquet espagnol). Les noms en darija sont exposés via SUIT_LABELS.
export type Suit = "oros" | "copas" | "espadas" | "bastos";

// Rangs présents dans un paquet espagnol de 40 cartes (pas de 8, 9).
// 1=As, 3=Triss, 10=Sota(Valet), 11=Caballo(Cavalier), 12=Rey(Roi).
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export const ALL_RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export const ALL_SUITS: readonly Suit[] = ["oros", "copas", "espadas", "bastos"] as const;

// Noms FR + darija arabizi pour affichage.
export const SUIT_LABELS: Record<Suit, { fr: string; dr: string }> = {
  oros:    { fr: "Pièces d'or", dr: "Dheb" },
  copas:   { fr: "Coupes",      dr: "Koubbas" },
  espadas: { fr: "Épées",       dr: "Chbada" },
  bastos:  { fr: "Bâtons",      dr: "Lekhel" },
};

// Points rapportés par une carte capturée dans un pli.
export const CARD_POINTS: Record<Rank, number> = {
  1: 11,  // As
  3: 10,  // Triss
  12: 4,  // Rey
  11: 3,  // Caballo
  10: 2,  // Sota
  7: 0,
  6: 0,
  5: 0,
  4: 0,
  2: 0,
};

// Ordre de force (plus grand = plus fort). À égalité de couleur,
// c'est ce rang qui décide qui prend le pli.
export const CARD_STRENGTH: Record<Rank, number> = {
  1: 10,   // As (plus fort)
  3: 9,    // Triss
  12: 8,   // Rey
  11: 7,   // Caballo
  10: 6,   // Sota
  7: 5,
  6: 4,
  5: 3,
  4: 2,
  2: 1,
};

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // ex : "oros-1", "bastos-12"
}

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}

// ─── Joueur (vue publique pour Colyseus) ──────────────────────────

// Note: les types Seat, Team, BidAction, TrickEntry, GhnaAnnouncement, etc.
// sont définis dans ./engine/touti.ts (le moteur de jeu) et re-exportés
// par l'index. Ce fichier ne contient que les primitives cartes +
// vues publiques pour le transport réseau.

export interface PlayerPublic {
  id: string;
  name: string;
  seat: 0 | 1 | 2 | 3;
  team: 0 | 1;
  connected: boolean;
  handCount: number; // on n'expose pas la main aux autres
  ready: boolean;
}
