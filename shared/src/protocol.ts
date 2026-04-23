import type { Card, Suit } from "./types";
import type { BidAction } from "./engine/touti";

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
//
// Note : les événements de jeu (trickWon, ghnaAnnounced, roundEnd) ne sont
// PAS envoyés comme messages custom — ils sont dérivés côté client à partir
// du state sync Colyseus (phase + lastTrickWinner + ghnaAnnouncements).

export type ServerMessage =
  | { type: "error"; reason: string }
  | { type: "chat"; from: string; text: string }
  | { type: "hand"; cards: Card[] };             // main privée du joueur (jamais dans le state partagé)
