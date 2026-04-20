import { Room, Client } from "@colyseus/core";
import { GameState, PlayerSchema } from "./schema/GameState";

/**
 * GameRoom — placeholder multijoueur pour une partie de Touti.
 * La logique de jeu (distribution, plis, atout, scoring) sera ajoutée
 * incrémentalement. Pour l'instant : join/leave + broadcast chat + phase.
 */
export class GameRoom extends Room<GameState> {
  maxClients = 4;

  onCreate() {
    this.setState(new GameState());
    this.state.phase = "waiting";

    this.onMessage("chat", (client, message: { text: string }) => {
      this.broadcast("chat", { from: client.sessionId, text: message?.text ?? "" });
    });

    this.onMessage("ready", (client) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.ready = true;
      this.maybeStart();
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    const p = new PlayerSchema();
    p.id = client.sessionId;
    p.name = options?.name?.trim() || `Player-${client.sessionId.slice(0, 4)}`;
    p.seat = this.nextFreeSeat();
    p.team = (p.seat % 2) as 0 | 1;
    p.connected = true;
    this.state.players.set(client.sessionId, p);
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false;
    if (consented) {
      this.state.players.delete(client.sessionId);
      return;
    }
    try {
      await this.allowReconnection(client, 30);
      p.connected = true;
    } catch {
      this.state.players.delete(client.sessionId);
    }
  }

  onDispose() {
    // cleanup
  }

  private nextFreeSeat(): 0 | 1 | 2 | 3 {
    const taken = new Set<number>();
    this.state.players.forEach((p) => taken.add(p.seat));
    for (let s = 0 as number; s < 4; s++) {
      if (!taken.has(s)) return s as 0 | 1 | 2 | 3;
    }
    return 0;
  }

  private maybeStart() {
    if (this.state.players.size < 4) return;
    let allReady = true;
    this.state.players.forEach((p) => { if (!p.ready) allReady = false; });
    if (allReady) {
      this.state.phase = "dealing";
      // TODO: distribuer les cartes, passer en "bidding" ou "playing"
    }
  }
}
