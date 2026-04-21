import { Room, Client } from "@colyseus/core";
import {
  aiBid,
  aiChooseTrump,
  aiPick,
  announceGhna,
  bid,
  chooseTrump,
  createGame,
  dismissGhna,
  GameState as EngineState,
  maybeCloseBidding,
  nextTrick,
  endRound,
  startNextRound,
  playCard,
  BidAction,
  Seat,
  Suit,
  Card,
} from "@touti/shared";
import { GameState, PlayerSchema } from "./schema/GameState";

/**
 * GameRoom — Colyseus room pour une partie de Touti (4 joueurs, 2 équipes).
 *
 * Modèle :
 *  - La schema Colyseus ne contient que la méta du lobby (joueurs, code).
 *  - L'état de jeu complet est tenu dans `engineState` (moteur `@touti/shared`).
 *  - À chaque mutation on broadcast `state` (vue publique sans les mains)
 *    et on envoie à chaque humain sa main via `client.send("hand", ...)`.
 *  - Les sièges vides sont remplis par des IA quand la partie démarre.
 */
export class GameRoom extends Room<GameState> {
  maxClients = 4;
  autoDispose = true;

  // Moteur de jeu — null tant que la partie n'a pas démarré
  private engineState: EngineState | null = null;

  // Mapping siège → identifiant du joueur : sessionId humain, "AI", ou null (vide)
  private seatOwners: (string | "AI" | null)[] = [null, null, null, null];

  onCreate(options: { code?: string } = {}) {
    this.setState(new GameState());
    const code = (options.code || "").toUpperCase().trim() || this.makeCode();
    this.state.roomCode = code;
    this.setMetadata({ code });
    this.setPrivate(true); // ne pas apparaître dans les listings publics

    this.onMessage("ready", (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.ready = !p.ready;
      this.maybeStart();
    });

    this.onMessage("start", (client) => {
      // Host peut démarrer même si sièges pas tous occupés (IA remplit)
      if (this.state.locked) return;
      if (!this.state.players.has(client.sessionId)) return;
      this.startGame();
    });

    this.onMessage("bid", (client, msg: { action: BidAction }) => {
      this.requireGame();
      const seat = this.seatOfClient(client);
      if (seat == null || !this.engineState) return;
      try {
        this.engineState = bid(this.engineState, seat, msg.action);
        this.engineState = maybeCloseBidding(this.engineState);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "bid failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("chooseTrump", (client, msg: { suit: Suit }) => {
      this.requireGame();
      const seat = this.seatOfClient(client);
      if (seat == null || !this.engineState) return;
      try {
        this.engineState = chooseTrump(this.engineState, seat, msg.suit);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "chooseTrump failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("play", (client, msg: { card: Card }) => {
      this.requireGame();
      const seat = this.seatOfClient(client);
      if (seat == null || !this.engineState) return;
      try {
        this.engineState = playCard(this.engineState, seat, msg.card);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "play failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("ghna.announce", (client, msg: { suit: Suit }) => {
      this.requireGame();
      const seat = this.seatOfClient(client);
      if (seat == null || !this.engineState) return;
      this.engineState = announceGhna(this.engineState, seat, msg.suit);
      this.afterMutation();
    });

    this.onMessage("ghna.dismiss", (client) => {
      this.requireGame();
      const seat = this.seatOfClient(client);
      if (seat == null || !this.engineState) return;
      this.engineState = dismissGhna(this.engineState);
      this.afterMutation();
    });

    this.onMessage("nextTrick", (client) => {
      this.requireGame();
      if (!this.engineState) return;
      // Anybody can advance from trick-end — safer than relying on a single player
      if (this.engineState.phase === "trick-end") {
        this.engineState = nextTrick(this.engineState);
        this.afterMutation();
      }
    });

    this.onMessage("nextRound", (client) => {
      this.requireGame();
      if (!this.engineState) return;
      // endRound est auto-appliqué dans afterMutation ; ici on avance juste
      if (this.engineState.phase === "round-end") {
        this.engineState = startNextRound(this.engineState);
        this.afterMutation();
      }
    });

    this.onMessage("chat", (client, msg: { text: string }) => {
      const from = this.state.players.get(client.sessionId);
      if (!from) return;
      this.broadcast("chat", {
        from: from.name,
        seat: from.seat,
        text: (msg?.text || "").slice(0, 200),
      });
    });
  }

  async onJoin(client: Client, options: { name?: string } = {}) {
    // Partie déjà commencée → on refuse (sauf si reconnexion, gérée par allowReconnection)
    if (this.state.locked) {
      throw new Error("Game already started");
    }

    const seat = this.nextFreeSeat();
    if (seat === null) throw new Error("Room is full");

    const p = new PlayerSchema();
    p.id = client.sessionId;
    p.name = (options?.name || `Player-${client.sessionId.slice(0, 4)}`).slice(0, 24);
    p.seat = seat;
    p.team = (seat % 2) as 0 | 1;
    p.connected = true;
    p.isAi = false;
    this.state.players.set(client.sessionId, p);
    this.seatOwners[seat] = client.sessionId;
  }

  onDispose() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false;

    if (consented || !this.state.locked) {
      // Hors partie OU déconnexion volontaire → on libère le siège
      this.seatOwners[p.seat] = null;
      this.state.players.delete(client.sessionId);
      return;
    }

    // En partie → on garde le siège jusqu'à 24h pour permettre la reconnexion
    // (iOS qui ferme la WS en arrière-plan, pause repas, changement de wifi…).
    // Pas d'infini pour éviter qu'un slot fantôme bloque la mémoire pour toujours.
    try {
      await this.allowReconnection(client, 24 * 60 * 60);
      p.connected = true;
      // Ré-envoie la main privée + dernier state
      if (this.engineState) {
        client.send("hand", { cards: this.engineState.hands[p.seat] });
        client.send("state", publicView(this.engineState));
      }
    } catch {
      // Timeout long dépassé → on garde quand même le siège (no-op).
      // Le joueur pourra toujours tenter de rejoindre par code plus tard.
    }
  }

  // ─── Mécanique de démarrage ───────────────────────────────────────

  private maybeStart() {
    if (this.state.locked) return;
    const playersArr = Array.from(this.state.players.values());
    if (playersArr.length === 4 && playersArr.every((p) => p.ready)) {
      this.startGame();
    }
  }

  private startGame() {
    if (this.state.locked) return;
    this.state.locked = true;
    this.state.phase = "in-game";

    // Remplit les sièges vides par des IA
    for (let s = 0; s < 4; s++) {
      if (this.seatOwners[s] == null) {
        this.seatOwners[s] = "AI";
        const aiPlayer = new PlayerSchema();
        aiPlayer.id = `ai-${s}`;
        aiPlayer.name = `Bot ${s}`;
        aiPlayer.seat = s as 0 | 1 | 2 | 3;
        aiPlayer.team = (s % 2) as 0 | 1;
        aiPlayer.connected = true;
        aiPlayer.isAi = true;
        this.state.players.set(aiPlayer.id, aiPlayer);
      }
    }

    this.engineState = createGame();
    console.log(`[GameRoom ${this.roomId}] startGame phase=${this.engineState.phase} mâle=${this.engineState.bidding?.currentSeat} seatOwners=${JSON.stringify(this.seatOwners)}`);
    this.afterMutation();
  }

  // ─── Post-mutation : broadcast + mains privées + tick IA ──────────

  private afterMutation() {
    if (!this.engineState) return;

    // Auto-apply maybeCloseBidding (no-op si pas en bidding)
    if (this.engineState.phase === "bidding") {
      this.engineState = maybeCloseBidding(this.engineState);
    }

    // Auto-apply endRound quand la manche finit (pour que le client voie le
    // message de fin de manche avant d'envoyer nextRound)
    if (this.engineState.phase === "round-end" && this.engineState.message == null) {
      this.engineState = endRound(this.engineState);
    }

    this.broadcast("state", publicView(this.engineState));

    // Envoie à chaque humain sa main privée
    for (let s = 0 as Seat; s < 4; s = (s + 1) as Seat) {
      const owner = this.seatOwners[s];
      if (!owner || owner === "AI") continue;
      const cli = this.clients.find((c) => c.sessionId === owner);
      if (cli) cli.send("hand", { cards: this.engineState.hands[s] });
    }

    this.scheduleAiTick();
  }

  // Planifie le prochain coup d'IA si le siège courant est une IA.
  private aiTimer: NodeJS.Timeout | null = null;
  private scheduleAiTick() {
    if (!this.engineState) { console.log("[sched] no engine"); return; }
    const s = this.engineState;

    if (s.phase === "game-end") { console.log("[sched] game-end"); return; }

    const seat = this.currentDecisionSeat();
    console.log(`[sched] phase=${s.phase} seat=${seat} owner=${seat != null ? this.seatOwners[seat] : "?"}`);
    if (seat == null) return;
    if (this.seatOwners[seat] !== "AI") return;

    // NOTE: setTimeout(…, N>0) ne fire PAS de manière fiable sur Fly.io
    // (VMs Firecracker qui pausent la horloge pendant idle). On utilise
    // setImmediate qui lui fonctionne. Conséquence : l'IA joue instantanément
    // sans simulation de réflexion. Le client peut ajouter un delay visuel.
    process.stderr.write(`[sched] scheduling aiTick (immediate) for seat ${seat}\n`);
    setImmediate(() => {
      try {
        this.aiTick();
      } catch (e) {
        process.stderr.write(`[aiTick] error: ${(e as Error)?.message}\n`);
      }
    });
  }

  // Retourne le siège qui doit décider quelque chose maintenant (ou null)
  private currentDecisionSeat(): Seat | null {
    if (!this.engineState) return null;
    const s = this.engineState;
    if (s.phase === "bidding" && s.bidding) return s.bidding.currentSeat;
    if (s.phase === "choosing-trump" && s.bidWinner != null) return s.bidWinner;
    if (s.phase === "playing") return s.currentPlayer;
    if (s.phase === "trick-end") return null; // avance via message
    if (s.phase === "round-end") return null;
    if (s.ghnaPending) return s.ghnaPending.seat;
    return null;
  }

  private aiTick() {
    if (!this.engineState) return;
    const s = this.engineState;
    console.log(`[aiTick] phase=${s.phase} currentSeat=${this.currentDecisionSeat()} seatOwners=${JSON.stringify(this.seatOwners)}`);

    // Ghna
    if (s.ghnaPending && this.seatOwners[s.ghnaPending.seat] === "AI") {
      // IA annonce si elle a des options, sinon dismiss
      const pick = s.ghnaPending.options[0];
      this.engineState = pick
        ? announceGhna(s, s.ghnaPending.seat, pick.suit)
        : dismissGhna(s);
      this.afterMutation();
      return;
    }

    if (s.phase === "bidding" && s.bidding) {
      const seat = s.bidding.currentSeat;
      if (this.seatOwners[seat] !== "AI") return;
      this.engineState = bid(s, seat, aiBid(s, seat));
      this.afterMutation();
      return;
    }

    if (s.phase === "choosing-trump" && s.bidWinner != null) {
      const seat = s.bidWinner;
      if (this.seatOwners[seat] !== "AI") return;
      this.engineState = chooseTrump(s, seat, aiChooseTrump(s, seat));
      this.afterMutation();
      return;
    }

    if (s.phase === "playing") {
      const seat = s.currentPlayer;
      if (this.seatOwners[seat] !== "AI") return;
      const pick = aiPick(s, seat);
      if (!pick) return;
      this.engineState = playCard(s, seat, pick);
      this.afterMutation();
      return;
    }

    // trick-end / round-end : le client avance via message (nextTrick/nextRound)
    // Mais si tous les joueurs sont IA, on avance automatiquement après 1s
    if (s.phase === "trick-end" && this.everyoneIsAi()) {
      this.engineState = nextTrick(s);
      this.afterMutation();
      return;
    }
    if (s.phase === "round-end" && this.everyoneIsAi()) {
      // endRound auto-appliqué par afterMutation ; avancer à la manche suivante
      this.engineState = startNextRound(s);
      this.afterMutation();
    }
  }

  private everyoneIsAi(): boolean {
    return this.seatOwners.every((o) => o === "AI");
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private seatOfClient(client: Client): Seat | null {
    const p = this.state.players.get(client.sessionId);
    return p ? (p.seat as Seat) : null;
  }

  private nextFreeSeat(): 0 | 1 | 2 | 3 | null {
    for (let s = 0; s < 4; s++) {
      if (this.seatOwners[s] == null) return s as 0 | 1 | 2 | 3;
    }
    return null;
  }

  private requireGame() {
    if (!this.engineState || !this.state.locked) {
      throw new Error("Game not started");
    }
  }

  // Code partie à 4 lettres (A-Z, sans I/O/0/1 pour éviter ambigüité)
  private makeCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }
}

/**
 * Vue publique du state moteur : tout sauf les mains privées.
 * Ce que tous les clients peuvent voir (broadcast).
 */
function publicView(s: EngineState) {
  return {
    phase: s.phase,
    roundNumber: s.roundNumber,
    trickNumber: s.trickNumber,
    dealerSeat: s.dealerSeat,
    currentPlayer: s.currentPlayer,
    trump: s.trump,
    bidding: s.bidding,
    bidWinner: s.bidWinner,
    bidAmount: s.bidAmount,
    trick: s.trick,
    lastTrick: s.lastTrick,
    handCounts: s.hands.map((h) => h.length) as [number, number, number, number],
    roundPoints: s.roundPoints,
    ghnaAnnounced: s.ghnaAnnounced,
    ghnaPending: s.ghnaPending,
    score: s.score,
    lastTrickWinner: s.lastTrickWinner,
    message: s.message,
  };
}
