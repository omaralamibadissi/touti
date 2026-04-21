import type { Card, Suit } from "./types";
import type { BidAction, GhnaAnnouncement } from "./engine/touti";

// ─── Messages client → serveur ────────────────────────────────────

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "ready" }
  | { type: "bid"; action: BidAction }           // enchère (mise / pass / signal)
  | { type: "chooseTrump"; suit: Suit }          // après avoir gagné les enchères
  | { type: "play"; card: Card }                 // jouer une carte
  | { type: "ghna"; suit: Suit }                 // annoncer une ghna (Caballo+Rey)
  | { type: "chat"; text: string };

// ─── Messages serveur → client ────────────────────────────────────
// (hors state sync automatique de Colyseus)

export type ServerMessage =
  | { type: "error"; reason: string }
  | { type: "chat"; from: string; text: string }
  | { type: "hand"; cards: Card[] }              // main privée du joueur (jamais dans le state partagé)
  | { type: "trickWon"; winnerSeat: number; points: number }
  | { type: "ghnaAnnounced"; ann: GhnaAnnouncement }
  | { type: "roundEnd"; winningTeam: 0 | 1; bid: number; delta: [number, number] };
