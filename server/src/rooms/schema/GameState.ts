import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") seat: 0 | 1 | 2 | 3 = 0;
  @type("number") team: 0 | 1 = 0;
  @type("boolean") connected = true;
  @type("boolean") ready = false;
  @type("boolean") isAi = false;
}

/**
 * Schema Colyseus = méta du lobby uniquement (qui est assis où, phase globale).
 * L'état de jeu détaillé (cartes, plis, enchères) est broadcasté via
 * messages "state" et "hand" — plus simple que de filtrer la main par joueur.
 */
export class GameState extends Schema {
  @type("string") phase: "lobby" | "in-game" | "finished" = "lobby";
  @type("string") roomCode = "";
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("boolean") locked = false;          // true = partie démarrée, plus de join
  @type("number") reservedSeat: -1 | 0 | 1 | 2 | 3 = -1;
  // Siège réservé par l'host pour le prochain joueur invité.
  // -1 = pas de réservation ; le prochain joueur prend le 1er siège libre.
}
