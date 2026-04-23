import { Room, Client } from "@colyseus/core";
import { logger } from "../lib/logger";
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
import { isMember as isLeagueMember, getLeague } from "../services/leagues";
import { getTournamentByMatchCode, recordMatchResult } from "../services/tournaments";
import { sanitize } from "@touti/shared";
import { isBanned } from "../services/bans";
import { findByUsername } from "../services/accounts";
import { consume as rateConsume } from "../lib/rateLimit";

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

  // Mode de la room : "private" = code + host démarre manuellement,
  // "quick" = matchmaking public, auto-start dès qu'on a 4 clients
  private roomMode: "private" | "quick" = "private";

  // leagueId : si défini à la création, seuls les membres de la ligue peuvent rejoindre
  private leagueId: string | null = null;
  private leagueName: string | null = null;

  // Garde contre le double enregistrement du résultat de tournoi
  private tournamentResultRecorded = false;

  // Mode hybride : si true, la room s'ouvre au pool quand tous prêts
  private hybridOptIn = false;

  // Sessions des spectateurs (lecture seule, pas de siège, pas de hand privée)
  private spectators: Set<string> = new Set();

  // Votes "rejouer avec les mêmes" (game-end uniquement)
  private rematchVotes: Set<string> = new Set();

  // onAuth tourne avant onJoin. On peut refuser ici en throwant.
  async onAuth(_client: any, options: { name?: string; spectator?: boolean } = {}) {
    const name = options?.name?.trim() || "";

    // Check ban (si l'utilisateur a un compte)
    if (name) {
      const account = findByUsername(name);
      if (account && isBanned(account.id)) {
        throw new Error("Tu es banni — contact l'administrateur.");
      }
    }

    // Rate-limit : max 15 joins de room / 5min par username (protège contre le spam de création)
    if (name) {
      if (!rateConsume(`roomjoin:${name.toLowerCase()}`, { capacity: 15, windowMs: 5 * 60 * 1000 })) {
        throw new Error("Trop de parties rejointes récemment, réessaie dans quelques minutes.");
      }
    }

    if (this.leagueId) {
      if (!name || !isLeagueMember(this.leagueId, name)) {
        throw new Error(
          `Cette partie est réservée aux membres de la ligue "${this.leagueName || this.leagueId}".`,
        );
      }
    }
    return true;
  }

  onCreate(options: { code?: string; mode?: "private" | "quick"; leagueId?: string; hybridOpenToPool?: boolean } = {}) {
    this.setState(new GameState());
    // Le mode est inféré du nom de la room ou surchargé par options.mode
    const quickByName =
      this.roomName === "touti_quick" || this.roomName === "touti_quick_code";
    this.roomMode = options.mode === "quick" || quickByName ? "quick" : "private";
    const code = (options.code || "").toUpperCase().trim() || this.makeCode();
    this.state.roomCode = code;
    // leagueId : valide + cache le nom de la ligue pour les messages d'erreur
    if (options.leagueId) {
      const league = getLeague(options.leagueId);
      if (league) {
        this.leagueId = options.leagueId;
        this.leagueName = league.name;
      }
    }
    this.setMetadata({ code, mode: this.roomMode, leagueId: this.leagueId });

    // Mode "hybride" : la room s'ouvrira au pool matchmaking quand tous les
    // joueurs présents auront tapé "ready" (voir maybeOpenHybridToPool).
    this.hybridOptIn = !!options.hybridOpenToPool;
    // NB: on n'utilise PAS setPrivate(true) — Colyseus exclut les rooms privées
    // de joinOrCreate, du coup les invités ne retrouveraient jamais la room.

    // Intercepteur global : les spectateurs n'ont droit à aucune action.
    // Colyseus ne permet pas de hook toutes les onMessage en une fois ; on
    // re-check au début de chaque handler via `this.spectators.has(sessionId)`.
    const isSpectator = (sessionId: string) => this.spectators.has(sessionId);

    this.onMessage("ready", (client) => {
      if (isSpectator(client.sessionId)) return;
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      p.ready = !p.ready;
      this.maybeStart();
      this.maybeOpenHybridToPool();
    });

    this.onMessage("start", (client) => {
      if (isSpectator(client.sessionId)) return;
      // Host peut démarrer même si sièges pas tous occupés (IA remplit)
      if (this.state.locked) return;
      if (!this.state.players.has(client.sessionId)) return;
      this.startGame();
    });

    // Helper : valide que le client est bien le siège attendu pour agir
    // *maintenant*. Source de vérité : `currentDecisionSeat()` du moteur.
    // Rejette silencieusement les actions hors-tour (empêche spam d'un joueur
    // qui enverrait l'action d'un autre, même si le moteur les rejetterait).
    const actingSeat = (client: Client): Seat | null => {
      if (isSpectator(client.sessionId)) return null;
      if (!this.engineState) return null;
      const seat = this.seatOfClient(client);
      if (seat == null) return null;
      const expected = this.currentDecisionSeat();
      if (expected == null || seat !== expected) return null;
      return seat;
    };

    this.onMessage("bid", (client, msg: { action: BidAction }) => {
      this.requireGame();
      const seat = actingSeat(client);
      if (seat == null) return;
      try {
        this.engineState = bid(this.engineState!, seat, msg.action);
        this.engineState = maybeCloseBidding(this.engineState);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "bid failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("chooseTrump", (client, msg: { suit: Suit }) => {
      this.requireGame();
      const seat = actingSeat(client);
      if (seat == null) return;
      try {
        this.engineState = chooseTrump(this.engineState!, seat, msg.suit);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "chooseTrump failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("play", (client, msg: { card: Card }) => {
      this.requireGame();
      const seat = actingSeat(client);
      if (seat == null) return;
      try {
        this.engineState = playCard(this.engineState!, seat, msg.card);
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "play failed" });
        return;
      }
      this.afterMutation();
    });

    this.onMessage("ghna.announce", (client, msg: { suit: Suit }) => {
      try {
        this.requireGame();
        const seat = actingSeat(client);
        if (seat == null) return;
        this.engineState = announceGhna(this.engineState!, seat, msg.suit);
        this.afterMutation();
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "ghna failed" });
      }
    });

    this.onMessage("ghna.dismiss", (client) => {
      try {
        this.requireGame();
        const seat = actingSeat(client);
        if (seat == null) return;
        this.engineState = dismissGhna(this.engineState!);
        this.afterMutation();
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "ghna dismiss failed" });
      }
    });

    this.onMessage("nextTrick", (client) => {
      if (isSpectator(client.sessionId)) return;
      try {
        this.requireGame();
        if (!this.engineState) return;
        // Bloque l'avancée tant qu'une Ghna est en attente (le joueur doit
        // d'abord choisir Annoncer ou Passer)
        if (this.engineState.ghnaPending) return;
        if (this.engineState.phase === "trick-end") {
          this.engineState = nextTrick(this.engineState);
          this.afterMutation();
        }
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "nextTrick failed" });
      }
    });

    this.onMessage("nextRound", (client) => {
      if (isSpectator(client.sessionId)) return;
      try {
        this.requireGame();
        if (!this.engineState) return;
        if (this.engineState.phase === "round-end") {
          this.engineState = startNextRound(this.engineState);
          this.afterMutation();
        }
      } catch (e: any) {
        client.send("error", { reason: e?.message ?? "nextRound failed" });
      }
    });

    this.onMessage("reserveSeat", (client, msg: { seat: -1 | 0 | 1 | 2 | 3 }) => {
      if (isSpectator(client.sessionId)) return;
      // Seul l'host (premier joueur = siège 0) peut réserver un siège pour
      // le prochain invité. -1 = annule la réservation.
      const hostId = this.seatOwners[0];
      if (hostId !== client.sessionId) return;
      const seat = msg?.seat;
      if (seat == null) return;
      if (seat === -1) {
        this.state.reservedSeat = -1;
        return;
      }
      if (seat < 0 || seat > 3) return;
      // On ne peut pas réserver un siège déjà occupé
      if (this.seatOwners[seat] != null) return;
      this.state.reservedSeat = seat;
    });

    // Forfait volontaire — le joueur quitte la partie via le menu pause.
    // Ça finalise immédiatement la partie : 600-0 pour l'équipe adverse.
    this.onMessage("forfeit", (client) => {
      if (isSpectator(client.sessionId)) return;
      this.triggerForfeit(client.sessionId, "abandon");
    });

    // Vote "rejouer avec les mêmes" (disponible en phase game-end).
    // Tous les joueurs humains doivent voter → reset + relance de la partie.
    this.onMessage("rematchVote", (client, msg: { yes: boolean }) => {
      if (isSpectator(client.sessionId)) return;
      if (!this.engineState || this.engineState.phase !== "game-end") return;
      if (msg?.yes) {
        this.rematchVotes.add(client.sessionId);
      } else {
        this.rematchVotes.delete(client.sessionId);
      }
      this.broadcastRematchStatus();
      this.maybeTriggerRematch();
    });

    this.onMessage("chat", (client, msg: { text: string }) => {
      if (isSpectator(client.sessionId)) return;
      const from = this.state.players.get(client.sessionId);
      if (!from) return;
      const clean = sanitize((msg?.text || "").slice(0, 200));
      this.broadcast("chat", {
        from: from.name,
        seat: from.seat,
        text: clean,
      });
    });
  }

  async onJoin(client: Client, options: { name?: string; spectator?: boolean } = {}) {
    // Spectateur : pas de siège, reçoit uniquement les broadcasts publics
    if (options.spectator) {
      this.spectators.add(client.sessionId);
      // Envoie l'état actuel au spectateur
      if (this.engineState) {
        client.send("state", publicView(this.engineState));
      }
      return;
    }

    // Partie déjà commencée → on refuse (sauf si reconnexion, gérée par allowReconnection)
    if (this.state.locked) {
      throw new Error("Game already started");
    }

    // Priorité : siège réservé par l'host si disponible, sinon 1er libre
    let seat: 0 | 1 | 2 | 3 | null;
    if (
      this.state.reservedSeat !== -1 &&
      this.seatOwners[this.state.reservedSeat] == null
    ) {
      seat = this.state.reservedSeat;
      this.state.reservedSeat = -1; // une fois consommé, on reset
    } else {
      seat = this.nextFreeSeat();
    }
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

    // Notif push aux amis quand le créateur arrive (1er joueur d'une room privée)
    if (this.roomMode === "private" && this.state.players.size === 1 && !this.notifiedFriends) {
      this.notifiedFriends = true;
      this.notifyFriendsOfRoom(p.name, this.state.roomCode);
    }

    // En mode quick : dès qu'on a 4 joueurs, on lance la partie automatiquement
    if (this.roomMode === "quick" && this.state.players.size === 4) {
      this.startGame();
    }

    // Hybride : un nouveau joueur vient d'arriver (pas encore ready) →
    // referme la fenêtre "ouverte au pool" en attendant qu'il tape ready aussi
    this.maybeOpenHybridToPool();
  }

  private notifiedFriends = false;
  private async notifyFriendsOfRoom(creatorName: string, roomCode: string) {
    try {
      const account = findByUsername(creatorName);
      if (!account) return;
      const { getFriendsPushTokens, sendPushNotifications } = await import("../services/pushNotifications");
      const tokens = getFriendsPushTokens(account.id);
      if (tokens.length === 0) return;
      await sendPushNotifications([
        {
          to: tokens,
          title: `${creatorName} lance une partie Touti 🃏`,
          body: `Rejoins avec le code ${roomCode}`,
          data: { kind: "private", code: roomCode },
          sound: "default",
        },
      ]);
    } catch (e: any) {
      logger.warn({ room: this.roomId, err: e?.message }, "[GameRoom] notifyFriends failed");
    }
  }

  onDispose() {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
    this.clearTurnTimer();
  }

  async onLeave(client: Client, consented: boolean) {
    // Si c'est un spectateur, on le retire simplement (pas de slot à libérer)
    if (this.spectators.has(client.sessionId)) {
      this.spectators.delete(client.sessionId);
      return;
    }
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false;

    if (consented) {
      // Déconnexion volontaire (leave explicite) → libère toujours le siège
      this.seatOwners[p.seat] = null;
      this.state.players.delete(client.sessionId);
      return;
    }

    // Déconnexion non-consentie : on garde le slot pour permettre la reco
    // (iOS background WS closed, pause brève, changement de wifi…).
    //   - Lobby : 90s de grace
    //   - En partie : 5 min de grace
    const graceSecs = this.state.locked ? 5 * 60 : 90;
    try {
      await this.allowReconnection(client, graceSecs);
      p.connected = true;
      // Ré-envoie la main privée + dernier state si la partie est lancée
      if (this.engineState && this.state.locked) {
        client.send("hand", { cards: this.engineState.hands[p.seat] });
        client.send("state", publicView(this.engineState));
      }
    } catch {
      // Timeout dépassé → on libère. Re-check l'état car entre-temps la
      // partie peut avoir été finie par forfait d'un autre joueur ou le
      // joueur peut avoir été retiré par une autre voie.
      if (!this.state.players.has(client.sessionId)) return;
      if (this.engineState?.phase === "game-end") return;
      if (!this.state.locked) {
        // Lobby : on free le slot simplement
        this.seatOwners[p.seat] = null;
        this.state.players.delete(client.sessionId);
      } else {
        // En partie : on remplace par une IA pour que les autres puissent finir
        this.seatOwners[p.seat] = "AI";
        p.isAi = true;
        p.name = `IA ${p.seat + 1}`;
        p.connected = true;
        this.afterMutation();
      }
    }
  }

  // ─── Mécanique de démarrage ───────────────────────────────────────

  // ─── Timer de tour (hors tournoi uniquement) ──────────────────────
  //
  // Règles :
  //   - 20s de silence max sur un tour
  //   - puis 40s de décompte visible (broadcast `turnCountdown`)
  //   - si le joueur ne joue pas après 40s → forfait 600-0 (timeout)
  //
  // En tournoi : pas de timer (reconnexion infinie).

  private turnTimerSeat: Seat | null = null;
  private turnSilentTimer: NodeJS.Timeout | null = null;
  private turnCountdownTimer: NodeJS.Timeout | null = null;
  private turnCountdownInterval: NodeJS.Timeout | null = null;

  private clearTurnTimer() {
    if (this.turnSilentTimer) { clearTimeout(this.turnSilentTimer); this.turnSilentTimer = null; }
    if (this.turnCountdownTimer) { clearTimeout(this.turnCountdownTimer); this.turnCountdownTimer = null; }
    if (this.turnCountdownInterval) { clearInterval(this.turnCountdownInterval); this.turnCountdownInterval = null; }
    if (this.turnTimerSeat != null) {
      // Broadcast fin du countdown (secs=0 = clear UI)
      this.broadcast("turnCountdown", { seat: this.turnTimerSeat, secs: 0 });
      this.turnTimerSeat = null;
    }
  }

  private isTournamentMatch(): boolean {
    try {
      return getTournamentByMatchCode(this.state.roomCode) != null;
    } catch { return false; }
  }

  private scheduleTurnTimer() {
    this.clearTurnTimer();
    if (!this.engineState) return;
    if (this.engineState.phase === "game-end") return;
    if (this.isTournamentMatch()) return; // infini en tournoi
    const seat = this.currentDecisionSeat();
    if (seat == null) return;
    if (this.seatOwners[seat] === "AI") return;

    this.turnTimerSeat = seat;
    // 20s silencieux avant de commencer à afficher le décompte
    this.turnSilentTimer = setTimeout(() => {
      this.turnSilentTimer = null;
      // Décompte 40s visible
      let remaining = 40;
      const broadcast = () => {
        if (this.turnTimerSeat === seat) {
          this.broadcast("turnCountdown", { seat, secs: remaining });
        }
      };
      broadcast();
      this.turnCountdownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (this.turnCountdownInterval) {
            clearInterval(this.turnCountdownInterval);
            this.turnCountdownInterval = null;
          }
          return;
        }
        broadcast();
      }, 1000);
      this.turnCountdownTimer = setTimeout(() => {
        const sessionId = this.seatOwners[seat];
        if (sessionId && sessionId !== "AI") {
          this.triggerForfeit(sessionId, "timeout");
        }
      }, 40_000);
    }, 20_000);
  }

  // Forfait d'un joueur : on fixe le score à 600-0 pour l'équipe adverse et
  // on termine la partie. Le message d'état indique "abandon".
  private triggerForfeit(sessionId: string, reason: "abandon" | "timeout") {
    if (!this.engineState) return;
    if (this.engineState.phase === "game-end") return;
    const p = this.state.players.get(sessionId);
    if (!p) return;
    const forfeitTeam = p.seat % 2 === 0 ? "A" : "B";
    const winningTeam = forfeitTeam === "A" ? "B" : "A";
    this.engineState.phase = "game-end";
    this.engineState.score = { A: winningTeam === "A" ? 600 : 0, B: winningTeam === "B" ? 600 : 0 };
    this.engineState.message =
      reason === "timeout"
        ? `Timeout : ${p.name} ne répondait plus — abandon (${winningTeam === "A" ? "Nous" : "Eux"} gagnent 600 - 0)`
        : `Abandon de ${p.name} — ${winningTeam === "A" ? "Nous" : "Eux"} gagnent 600 - 0`;
    this.afterMutation();
  }

  // Broadcast l'état courant du rematch à tous les clients.
  private broadcastRematchStatus() {
    const humanSessions: string[] = [];
    for (const [sid, p] of this.state.players.entries()) {
      if (!p.isAi) humanSessions.push(sid);
    }
    const votedSeats: number[] = [];
    for (const sid of this.rematchVotes) {
      const p = this.state.players.get(sid);
      if (p) votedSeats.push(p.seat);
    }
    this.broadcast("rematchStatus", {
      voted: votedSeats,
      total: humanSessions.length,
    });
  }

  // Si tous les humains ont voté → reset et relance
  private maybeTriggerRematch() {
    const humanSessions: string[] = [];
    for (const [sid, p] of this.state.players.entries()) {
      if (!p.isAi) humanSessions.push(sid);
    }
    if (humanSessions.length === 0) return;
    const allVoted = humanSessions.every((sid) => this.rematchVotes.has(sid));
    if (!allVoted) return;

    // Reset : nouvelle partie avec les mêmes joueurs aux mêmes sièges.
    // NB : on NE reset PAS `tournamentResultRecorded` — en tournoi le résultat
    // de la 1ère partie est officiel, le rematch est du jeu pour le plaisir
    // et ne doit pas écraser ni dupliquer la ligne dans le tournoi.
    this.rematchVotes.clear();
    this.engineState = createGame();
    // Reset les flags "ready" pour éviter un double-start si quelqu'un tape à nouveau
    for (const p of this.state.players.values()) {
      p.ready = false;
    }
    // Le jeu continue — phase revient à bidding via createGame
    this.broadcast("rematchStatus", { voted: [], total: 0, started: true });
    this.afterMutation();
  }

  // Ouvre le salon hybride au pool matchmaking quand tous les joueurs
  // présents sont prêts et qu'il reste des places. Quand un pool player
  // rejoint ensuite, il est pas encore "ready" → on doit attendre qu'il
  // tape ready à son tour, et tous re-ready, avant de lancer la partie.
  private maybeOpenHybridToPool() {
    if (!this.hybridOptIn) return;
    if (this.state.locked) return;
    const players = Array.from(this.state.players.values());
    const allReady = players.length > 0 && players.every((p) => p.ready);
    const openNow = allReady && players.length < 4;
    // Met à jour la metadata seulement si le statut change
    const current = (this.metadata as any)?.hybridOpenToPool ?? false;
    if (current === openNow) return;
    this.setMetadata({
      code: this.state.roomCode,
      mode: this.roomMode,
      leagueId: this.leagueId,
      hybridOpenToPool: openNow,
    });
  }

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
    // Metadata pour le endpoint /stats/matchmaking (ne pas compter les rooms déjà lancées)
    this.setMetadata({
      code: this.state.roomCode,
      mode: this.roomMode,
      leagueId: this.leagueId,
      locked: true,
    });

    // Remplit les sièges vides par des IA
    for (let s = 0; s < 4; s++) {
      if (this.seatOwners[s] == null) {
        this.seatOwners[s] = "AI";
        const aiPlayer = new PlayerSchema();
        aiPlayer.id = `ai-${s}`;
        aiPlayer.name = `IA ${s + 1}`;
        aiPlayer.seat = s as 0 | 1 | 2 | 3;
        aiPlayer.team = (s % 2) as 0 | 1;
        aiPlayer.connected = true;
        aiPlayer.isAi = true;
        this.state.players.set(aiPlayer.id, aiPlayer);
      }
    }

    this.engineState = createGame();
    logger.info(
      {
        room: this.roomId,
        phase: this.engineState.phase,
        male: this.engineState.bidding?.currentSeat,
        seatOwners: this.seatOwners,
      },
      "[GameRoom] startGame",
    );
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

    // Auto-enregistrement : si la partie vient de finir et que la room est
    // rattachée à un tournoi (via le room code), on enregistre le résultat.
    // En cas d'échec (DB temporairement indispo), on laisse `tournamentResultRecorded`
    // à `false` pour que `afterMutation` retente au prochain tick, et on
    // broadcast un message d'erreur aux humains.
    if (this.engineState.phase === "game-end" && !this.tournamentResultRecorded) {
      try {
        const match = getTournamentByMatchCode(this.state.roomCode);
        if (match) {
          recordMatchResult(
            match.tournament.id,
            match.matchId,
            this.engineState.score.A,
            this.engineState.score.B,
          );
          this.tournamentResultRecorded = true;
          logger.info(
            { room: this.roomId, tournamentId: match.tournament.id, matchId: match.matchId },
            "[GameRoom] tournament match auto-recorded",
          );
        } else {
          // Pas de match tournoi attaché → rien à enregistrer, on marque comme traité.
          this.tournamentResultRecorded = true;
        }
      } catch (e: any) {
        logger.error(
          { room: this.roomId, err: e?.message },
          "[GameRoom] tournament auto-record failed (will retry)",
        );
        this.broadcast("error", {
          reason: "Impossible d'enregistrer le résultat du tournoi. Nouvelle tentative en cours.",
        });
        // Retry asynchrone dans 3s. Si ça re-fail, on log et on abandonne.
        setTimeout(() => {
          if (this.tournamentResultRecorded) return;
          try {
            const match = getTournamentByMatchCode(this.state.roomCode);
            if (!match) {
              this.tournamentResultRecorded = true;
              return;
            }
            recordMatchResult(
              match.tournament.id,
              match.matchId,
              this.engineState!.score.A,
              this.engineState!.score.B,
            );
            this.tournamentResultRecorded = true;
            logger.info({ room: this.roomId }, "[GameRoom] tournament match recorded on retry");
          } catch (e2: any) {
            logger.error(
              { room: this.roomId, err: e2?.message },
              "[GameRoom] tournament retry also failed",
            );
          }
        }, 3000);
      }
    }

    // Envoie à chaque humain sa main privée
    for (let s = 0 as Seat; s < 4; s = (s + 1) as Seat) {
      const owner = this.seatOwners[s];
      if (!owner || owner === "AI") continue;
      const cli = this.clients.find((c) => c.sessionId === owner);
      if (cli) cli.send("hand", { cards: this.engineState.hands[s] });
    }

    this.scheduleAiTick();
    // Reset + reschedule timer de tour (hors tournoi)
    this.scheduleTurnTimer();
  }

  // Planifie le prochain coup d'IA si le siège courant est une IA.
  private aiTimer: NodeJS.Timeout | null = null;
  private scheduleAiTick() {
    if (!this.engineState) { logger.debug({ room: this.roomId }, "[sched] no engine"); return; }
    const s = this.engineState;

    if (s.phase === "game-end") { logger.debug({ room: this.roomId }, "[sched] game-end"); return; }

    const seat = this.currentDecisionSeat();
    logger.debug(
      {
        room: this.roomId,
        phase: s.phase,
        seat,
        owner: seat != null ? this.seatOwners[seat] : null,
      },
      "[sched]",
    );
    if (seat == null) return;
    if (this.seatOwners[seat] !== "AI") return;

    // Délai de "réflexion" pour que l'IA ne joue pas instantanément
    //   - bidding / choosing-trump / ghna : ~700ms
    //   - playing (carte) : ~650ms
    //   - trick-end auto (cas 100% IA) : ~1400ms
    // NB : les WS actifs des joueurs gardent la VM Fly éveillée — setTimeout
    // fire correctement tant qu'il y a des clients connectés.
    const delay =
      s.phase === "playing" ? 650
      : s.phase === "trick-end" || s.phase === "round-end" ? 1400
      : 700;
    if (this.aiTimer) clearTimeout(this.aiTimer);
    this.aiTimer = setTimeout(() => {
      this.aiTimer = null;
      try {
        this.aiTick();
      } catch (e) {
        process.stderr.write(`[aiTick] error: ${(e as Error)?.message}\n`);
      }
    }, delay);
  }

  // Retourne le siège qui doit décider quelque chose maintenant (ou null).
  // `ghnaPending` est prioritaire sur tout le reste : tant qu'une Ghna est en
  // attente, c'est au porteur de la Ghna de décider (annoncer/passer). Même
  // si la phase passe à trick-end/round-end, la décision Ghna prime — ceci
  // évite que `ghnaPending` reste orphelin au changement de phase.
  private currentDecisionSeat(): Seat | null {
    if (!this.engineState) return null;
    const s = this.engineState;
    if (s.ghnaPending) return s.ghnaPending.seat;
    if (s.phase === "bidding" && s.bidding) return s.bidding.currentSeat;
    if (s.phase === "choosing-trump" && s.bidWinner != null) return s.bidWinner;
    if (s.phase === "playing") return s.currentPlayer;
    // trick-end / round-end / game-end : avance via message, pas de décideur
    return null;
  }

  private aiTick() {
    if (!this.engineState) return;
    const s = this.engineState;
    logger.debug(
      {
        room: this.roomId,
        phase: s.phase,
        currentSeat: this.currentDecisionSeat(),
        seatOwners: this.seatOwners,
      },
      "[aiTick]",
    );

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
    lastBidHistory: s.lastBidHistory,
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
