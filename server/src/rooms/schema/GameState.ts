import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class PlayerSchema extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") seat: 0 | 1 | 2 | 3 = 0;
  @type("number") team: 0 | 1 = 0;
  @type("boolean") connected = true;
  @type("boolean") ready = false;
  @type("number") handCount = 0;
}

export class CardSchema extends Schema {
  @type("string") suit = "";
  @type("number") rank = 0;
  @type("string") id = "";
}

export class TrickEntry extends Schema {
  @type("number") seat = 0;
  @type(CardSchema) card = new CardSchema();
}

export class GameState extends Schema {
  @type("string") phase: "waiting" | "dealing" | "bidding" | "playing" | "scoring" | "finished" = "waiting";
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("number") currentSeat = -1; // -1 = aucun
  @type("string") trumpSuit = "";
  @type([TrickEntry]) trick = new ArraySchema<TrickEntry>();
  @type(["number"]) scoreByTeam = new ArraySchema<number>(0, 0);
  @type("number") roundNumber = 0;
}
