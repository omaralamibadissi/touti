import type { Card } from "./types";

// Messages client -> serveur
export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "ready" }
  | { type: "bid"; suit: string }
  | { type: "play"; card: Card }
  | { type: "chat"; text: string };

// Messages serveur -> client (hors state sync automatique de Colyseus)
export type ServerMessage =
  | { type: "error"; reason: string }
  | { type: "chat"; from: string; text: string }
  | { type: "hand"; cards: Card[] }; // main privée du joueur
