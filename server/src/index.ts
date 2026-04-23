import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";
import * as leagues from "./services/leagues";
import * as matches from "./services/matches";
import * as tournaments from "./services/tournaments";
import * as accounts from "./services/accounts";
import * as friends from "./services/friends";
import * as scoreSheets from "./services/scoreSheets";
import * as bans from "./services/bans";
import * as reports from "./services/reports";
import * as roomAudit from "./services/roomAudit";
import * as leagueChat from "./services/leagueChat";
import * as leagueActivity from "./services/leagueActivity";
import * as directMessages from "./services/directMessages";
import { consume as rateConsume } from "./lib/rateLimit";
import { verifyApple, verifyGoogle, verifyFacebook, OAuthNotConfigured } from "./services/oauth";

// Augmente le type Request pour pouvoir y attacher l'utilisateur authentifié
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; username: string };
  }
}

// Middleware d'auth — lit l'en-tête Authorization: Bearer <token>
function readToken(req: Request): string | null {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const tok = readToken(req);
  if (tok) {
    const payload = accounts.verifyToken(tok);
    if (payload) req.user = { id: payload.sub, username: payload.username };
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const tok = readToken(req);
  if (!tok) { res.status(401).json({ error: "missing token" }); return; }
  const payload = accounts.verifyToken(tok);
  if (!payload) { res.status(401).json({ error: "invalid or expired token" }); return; }
  // Refuse les utilisateurs bannis pour toute action authentifiée
  const ban = bans.activeBan(payload.sub);
  if (ban) {
    res.status(403).json({
      error: "banned",
      reason: ban.reason,
      expiresAt: ban.expiresAt,
    });
    return;
  }
  req.user = { id: payload.sub, username: payload.username };
  next();
}

// Middleware admin : requiert le header x-admin-secret qui matche ADMIN_SECRET
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "admin disabled (set ADMIN_SECRET)" });
    return;
  }
  const provided = (req.headers["x-admin-secret"] as string | undefined) || "";
  if (provided !== secret) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

const port = Number(process.env.PORT || 2567);
const MONITOR_USER = process.env.MONITOR_USER || "admin";
const MONITOR_PASS = process.env.MONITOR_PASS || "";
const NODE_ENV = process.env.NODE_ENV || "development";

const app = express();
app.use(express.json({ limit: "16kb" })); // petit corps max anti-abus

// ─── Rate limiting léger sur le matchmaking ────────────────────────
// Fenêtre glissante en mémoire. Pas besoin de Redis pour notre volume.
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20;           // 20 req/min par IP sur matchmaking

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
  const now = Date.now();
  const arr = (rateLimits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    console.warn(`[rate-limit] IP ${ip} hit limit (${arr.length} in window)`);
    res.status(429).json({ error: "Too many requests. Wait a minute." });
    return;
  }
  arr.push(now);
  rateLimits.set(ip, arr);
  next();
}

// ─── Basic auth pour le dashboard monitor ──────────────────────────
function basicAuth(req: Request, res: Response, next: NextFunction) {
  // Pas de password configuré → on bloque en prod, on laisse passer en dev
  if (!MONITOR_PASS) {
    if (NODE_ENV === "production") {
      res.status(503).send("Monitor disabled (set MONITOR_PASS)");
      return;
    }
    return next();
  }
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="colyseus"');
    res.status(401).send("Authentication required");
    return;
  }
  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const [user, pass] = decoded.split(":");
  if (user !== MONITOR_USER || pass !== MONITOR_PASS) {
    res.status(403).send("Forbidden");
    return;
  }
  next();
}

// ─── Endpoints ──────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, env: NODE_ENV }));

// Cherche une room "hybride" (quick_code avec hybridOpenToPool=true) ouverte.
// Utilisée par le flow pool pour prioriser les parties mixtes amis+randoms.
app.get("/matchmaking/pool-candidates", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({ name: "touti_quick_code" });
    for (const r of rooms) {
      const meta = (r.metadata as any) || {};
      if (!meta.hybridOpenToPool) continue;
      if (meta.locked) continue;
      if ((r.clients ?? 0) >= 4) continue;
      return res.json({ hybrid: true, code: meta.code, roomId: r.roomId });
    }
    res.json({ hybrid: false });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "failed" });
  }
});

// Stats matchmaking — nb de joueurs actuellement en recherche + estimation d'attente.
// Utilisé par l'UI "partie rapide" pour afficher "X joueurs en recherche (~Ys)".
app.get("/stats/matchmaking", async (_req, res) => {
  try {
    // Toutes les rooms touti_quick (pool matchmaking aléatoire) non lockées
    const rooms = await matchMaker.query({ name: "touti_quick" });
    let searching = 0;
    for (const r of rooms) {
      const locked = !!(r.metadata as any)?.locked;
      if (locked) continue;
      searching += r.clients ?? 0;
    }
    // Estimation d'attente simple : dépend du nombre en recherche
    // 0-1 joueurs → ~60s, 2 → ~25s, 3 → ~8s (quasi-prêt), 4+ → 0s (devrait auto-lock)
    let avgWaitSec = 60;
    if (searching >= 4) avgWaitSec = 0;
    else if (searching === 3) avgWaitSec = 8;
    else if (searching === 2) avgWaitSec = 25;
    else if (searching === 1) avgWaitSec = 45;
    res.json({ searching, avgWaitSec });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "stats failed" });
  }
});

// ─── API Auth ──────────────────────────────────────────────────────

app.post("/auth/signup", async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: "username + password requis" });
      return;
    }
    const result = await accounts.signUp({ username, password, email });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "signup failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: "username + password requis" });
      return;
    }
    const result = await accounts.signIn({ username, password });
    res.json(result);
  } catch (e: any) {
    res.status(401).json({ error: e?.message ?? "login failed" });
  }
});

// Heartbeat : marque l'user comme actif. Appelé toutes les 60s par le client.
app.post("/auth/heartbeat", requireAuth, (req, res) => {
  accounts.markSeen(req.user!.id);
  res.json({ ok: true });
});

// Enregistre le token Expo push de l'utilisateur (null pour désinscrire).
app.post("/auth/push-token", requireAuth, (req, res) => {
  const token = req.body?.token;
  if (token !== null && (typeof token !== "string" || !token.startsWith("ExponentPushToken"))) {
    return res.status(400).json({ error: "Token invalide" });
  }
  accounts.setPushToken(req.user!.id, token);
  res.json({ ok: true });
});

app.get("/auth/me", requireAuth, (req, res) => {
  const me = accounts.getById(req.user!.id);
  if (!me) { res.status(404).json({ error: "not found" }); return; }
  res.json({ account: me });
});

// Marque l'onboarding comme terminé pour ce compte. Cross-device : une fois
// fait, un logout/login ou un login depuis un autre téléphone ne refera
// plus l'onboarding.
app.post("/auth/me/onboarding-done", requireAuth, (req, res) => {
  try {
    accounts.markOnboardingDone(req.user!.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "failed" });
  }
});

app.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    await accounts.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "change failed" });
  }
});

app.delete("/auth/me", requireAuth, (req, res) => {
  accounts.deleteAccount(req.user!.id);
  res.json({ ok: true });
});

// Export RGPD — retourne toutes les données personnelles de l'utilisateur en JSON
app.get("/auth/me/export", requireAuth, (req, res) => {
  const account = accounts.getById(req.user!.id);
  if (!account) { res.status(404).json({ error: "not found" }); return; }
  const myLeagues = leagues.listMyLeagues(req.user!.username);
  const myMatches = matches.listMatchesByPlayer(req.user!.username, 500);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="touti-export-${req.user!.username}.json"`,
  );
  res.json({
    exportedAt: new Date().toISOString(),
    account,
    leagues: myLeagues,
    matches: myMatches,
    note:
      "Ceci contient vos données personnelles stockées sur le serveur Touti. " +
      "Pour supprimer définitivement votre compte, utilisez DELETE /auth/me depuis l'app.",
  });
});

// ─── OAuth ───────────────────────────────────────────────────────

app.post("/auth/oauth/:provider", async (req, res) => {
  const provider = req.params.provider as "apple" | "google" | "facebook";
  const { token } = req.body || {};
  if (!token) { res.status(400).json({ error: "token required" }); return; }
  try {
    let profile;
    if (provider === "apple") profile = await verifyApple(token);
    else if (provider === "google") profile = await verifyGoogle(token);
    else if (provider === "facebook") profile = await verifyFacebook(token);
    else { res.status(400).json({ error: "unknown provider" }); return; }

    const result = await accounts.signInOrCreateFromOAuth(profile);
    res.json(result);
  } catch (e: any) {
    if (e instanceof OAuthNotConfigured) {
      res.status(501).json({
        error: `${provider} OAuth non configuré sur le serveur (besoin des env vars ${provider === "apple" ? "APPLE_CLIENT_ID" : provider === "google" ? "GOOGLE_CLIENT_ID" : "FACEBOOK_APP_ID + FACEBOOK_APP_SECRET"})`,
      });
      return;
    }
    res.status(401).json({ error: e?.message ?? "oauth failed" });
  }
});

// Matchmaking endpoints (Colyseus ajoute /matchmake/*) — on intercepte pour rate-limit
app.use("/matchmake", rateLimit);

// Monitor derrière auth
app.use("/colyseus", basicAuth, monitor());

// ─── API Ligues ────────────────────────────────────────────────────
// Endpoints REST simples (pas d'auth utilisateur pour l'instant, on fait
// confiance au pseudo envoyé. Ajouter JWT quand on aura un vrai auth serveur).

// POST /leagues → créer (auth requis, createdBy = user du JWT)
app.post("/leagues", requireAuth, (req, res) => {
  try {
    // Rate limit : max 5 créations de ligue / heure / user
    if (!rateConsume(`league:${req.user!.id}`, { capacity: 5, windowMs: 60 * 60 * 1000 })) {
      res.status(429).json({ error: "Trop de ligues créées récemment, réessaie plus tard" });
      return;
    }
    const { name, tagline, color } = req.body || {};
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const l = leagues.createLeague({
      name,
      createdBy: req.user!.username,
      tagline,
      color,
    });
    roomAudit.logCreation(req.user!.id, "league", l.code);
    res.json(l);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "create failed" });
  }
});

// POST /leagues/join → rejoindre par code (auth requis)
app.post("/leagues/join", requireAuth, (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) { res.status(400).json({ error: "code required" }); return; }
    const l = leagues.joinLeague(code, req.user!.username);
    res.json(l);
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "not found" });
  }
});

// GET /leagues/:id → détails
app.get("/leagues/:id", (req, res) => {
  const l = leagues.getLeague(req.params.id);
  if (!l) { res.status(404).json({ error: "not found" }); return; }
  res.json(l);
});

// GET /leagues?member=<name> → mes ligues. Auth requis ; un user ne peut
// lister que SES ligues (pas celles d'un autre user — anti-énumération).
app.get("/leagues", requireAuth, (req, res) => {
  const member = String(req.query.member || "");
  if (!member) { res.status(400).json({ error: "member param required" }); return; }
  if (member.toLowerCase() !== req.user!.username.toLowerCase()) {
    res.status(403).json({ error: "can only list own leagues" });
    return;
  }
  res.json(leagues.listMyLeagues(member));
});

// DELETE /leagues/:id/members/:name → quitter (auth requis, self only)
app.delete("/leagues/:id/members/:name", requireAuth, (req, res) => {
  if (req.params.name.toLowerCase() !== req.user!.username.toLowerCase()) {
    res.status(403).json({ error: "only self can leave" });
    return;
  }
  leagues.leaveLeague(req.params.id, req.params.name);
  res.json({ ok: true });
});

// ─── Chat ligue ────────────────────────────────────────────────

// GET /leagues/:id/messages — messages de la ligue (paginable)
app.get("/leagues/:id/messages", requireAuth, (req, res) => {
  try {
    const before = req.query.before ? Number(req.query.before) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const msgs = leagueChat.listMessages(req.params.id, req.user!.username, before, limit);
    res.json(msgs);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// GET /leagues/:id/activity — fil d'activité (membres + matchs + tournois)
app.get("/leagues/:id/activity", requireAuth, (req, res) => {
  try {
    const before = req.query.before ? Number(req.query.before) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 80;
    const events = leagueActivity.listActivity(req.params.id, req.user!.username, before, limit);
    res.json(events);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// POST /leagues/:id/messages — poste un message (rate limit anti-spam)
app.post("/leagues/:id/messages", requireAuth, (req, res) => {
  try {
    // Max 20 messages / minute / user — évite le flood
    if (!rateConsume(`leaguechat:${req.user!.id}`, { capacity: 20, windowMs: 60_000 })) {
      return res.status(429).json({ error: "Trop de messages, attends un peu" });
    }
    const text = (req.body?.text || "").toString();
    const msg = leagueChat.postMessage(
      req.params.id,
      req.user!.id,
      req.user!.username,
      text,
    );
    res.json(msg);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "post failed" });
  }
});

// Admin ligue : modifier les infos de la ligue
app.patch("/leagues/:id", requireAuth, (req, res) => {
  try {
    const patch = req.body || {};
    const l = leagues.updateLeague(req.params.id, patch, req.user!.username);
    if (!l) return res.status(404).json({ error: "Ligue introuvable" });
    res.json(l);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// Admin ligue : suppression totale
app.delete("/leagues/:id", requireAuth, (req, res) => {
  try {
    leagues.deleteLeagueAsAdmin(req.params.id, req.user!.username);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// Admin ligue : promote / demote / kick
app.post("/leagues/:id/members/:name/promote", requireAuth, (req, res) => {
  try {
    const l = leagues.promoteMember(req.params.id, req.params.name, req.user!.username);
    res.json(l);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

app.post("/leagues/:id/members/:name/demote", requireAuth, (req, res) => {
  try {
    const l = leagues.demoteMember(req.params.id, req.params.name, req.user!.username);
    res.json(l);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

app.post("/leagues/:id/members/:name/kick", requireAuth, (req, res) => {
  try {
    const l = leagues.kickMember(req.params.id, req.params.name, req.user!.username);
    res.json(l);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// ─── API Matchs ────────────────────────────────────────────────────

// POST /matches → enregistre un match fini (auth requis, user doit être dans players)
app.post("/matches", requireAuth, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.finishedAt || !b.type || !b.winnerTeam
        || typeof b.scoreA !== "number" || typeof b.scoreB !== "number"
        || typeof b.roundsPlayed !== "number"
        || !Array.isArray(b.players) || b.players.length !== 4) {
      res.status(400).json({ error: "invalid payload" });
      return;
    }
    // Le user doit être l'un des 4 joueurs pour enregistrer ce match
    const playerNames = (b.players as any[]).map((p) =>
      String(p?.name || "").toLowerCase(),
    );
    if (!playerNames.includes(req.user!.username.toLowerCase())) {
      res.status(403).json({ error: "you must be one of the 4 players" });
      return;
    }
    // Si déjà enregistré (un autre joueur a déjà posté), on renvoie l'existant
    if (b.id) {
      const existing = matches.getMatch(b.id);
      if (existing) { res.json(existing); return; }
    }
    const m = matches.recordMatch({
      id: b.id,
      finishedAt: b.finishedAt,
      type: b.type,
      winnerTeam: b.winnerTeam,
      scoreA: b.scoreA,
      scoreB: b.scoreB,
      roundsPlayed: b.roundsPlayed,
      leagueId: b.leagueId,
      tournamentId: b.tournamentId,
      players: b.players,
      details: b.details,
    });
    res.json(m);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "record failed" });
  }
});

// GET /matches?player=X&limit=50 → historique d'un joueur. Auth requis.
// L'historique d'un autre joueur est accessible (les profils des amis sont
// visibles), mais un user doit être authentifié pour lire.
app.get("/matches", requireAuth, (req, res) => {
  const player = String(req.query.player || "");
  const limit = Math.min(200, parseInt(String(req.query.limit || "50"), 10) || 50);
  if (!player) { res.status(400).json({ error: "player required" }); return; }
  res.json(matches.listMatchesByPlayer(player, limit));
});

// GET /matches/:id → détail
app.get("/matches/:id", (req, res) => {
  const m = matches.getMatch(req.params.id);
  if (!m) { res.status(404).json({ error: "not found" }); return; }
  res.json(m);
});

// GET /leaderboard/individual?scope=global|league|friends&leagueId=&friends=a,b,c
app.get("/leaderboard/individual", (req, res) => {
  const scope = String(req.query.scope || "global");
  try {
    if (scope === "league") {
      const leagueId = String(req.query.leagueId || "");
      if (!leagueId) { res.status(400).json({ error: "leagueId required" }); return; }
      res.json(matches.individualRanking({ scope: "league", leagueId }));
    } else if (scope === "friends") {
      const names = String(req.query.friends || "").split(",").filter(Boolean);
      res.json(matches.individualRanking({ scope: "friends", names }));
    } else {
      res.json(matches.individualRanking({ scope: "global" }));
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "ranking failed" });
  }
});

// ─── API Amis ──────────────────────────────────────────────────

// POST /friends/request — body: { targetUsername } — envoie une demande
app.post("/friends/request", requireAuth, (req, res) => {
  try {
    const { targetUsername } = req.body || {};
    if (!targetUsername) { res.status(400).json({ error: "targetUsername required" }); return; }
    const f = friends.requestFriend(req.user!.id, String(targetUsername));
    res.json(f);
  } catch (e: any) {
    // Cas spécial : pseudo introuvable → 404 avec message clair
    const msg = e?.message ?? "request failed";
    if (/introuvable|not found/i.test(msg)) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(400).json({ error: msg });
  }
});

app.post("/friends/:id/accept", requireAuth, (req, res) => {
  try {
    const f = friends.acceptFriend(req.user!.id, req.params.id);
    res.json(f);
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "accept failed" });
  }
});

app.post("/friends/:id/reject", requireAuth, (req, res) => {
  try {
    friends.rejectFriend(req.user!.id, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "reject failed" });
  }
});

app.delete("/friends/:id", requireAuth, (req, res) => {
  try {
    friends.unfriend(req.user!.id, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "unfriend failed" });
  }
});

// GET /friends — retourne { friends, incoming, outgoing }
app.get("/friends", requireAuth, (req, res) => {
  res.json(friends.listMine(req.user!.id));
});

// ─── Messagerie directe ────────────────────────────────────────

// Liste des conversations (dernier message + unread count par thread)
app.get("/dm/threads", requireAuth, (req, res) => {
  res.json(directMessages.listThreads(req.user!.id));
});

// Messages d'une conversation avec un autre user
app.get("/dm/:otherId/messages", requireAuth, (req, res) => {
  try {
    const before = req.query.before ? Number(req.query.before) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 80;
    res.json(directMessages.listMessages(req.user!.id, req.params.otherId, before, limit));
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "forbidden" });
  }
});

// Envoyer un message
app.post("/dm/:otherId/messages", requireAuth, (req, res) => {
  try {
    // Rate limit : 30 DM / min / user
    if (!rateConsume(`dm:${req.user!.id}`, { capacity: 30, windowMs: 60_000 })) {
      return res.status(429).json({ error: "Trop de messages, attends un peu" });
    }
    const text = (req.body?.text || "").toString();
    const msg = directMessages.sendMessage(req.user!.id, req.params.otherId, text);
    res.json(msg);
    // Push notif best-effort au destinataire (si token enregistré)
    (async () => {
      try {
        const receiverToken = accounts.getPushToken(req.params.otherId);
        if (!receiverToken) return;
        const { sendPushNotifications } = await import("./services/pushNotifications");
        await sendPushNotifications([{
          to: receiverToken,
          title: msg.senderName,
          body: msg.text,
          data: { kind: "dm", senderId: msg.senderId, senderName: msg.senderName },
          sound: "default",
        }]);
      } catch {}
    })();
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "send failed" });
  }
});

// Marque tous les messages d'une conversation comme lus
app.post("/dm/:otherId/read", requireAuth, (req, res) => {
  const n = directMessages.markThreadRead(req.user!.id, req.params.otherId);
  res.json({ markedAsRead: n });
});

// ─── Reports (modération) ───────────────────────────────────────

// POST /reports — signaler un joueur
app.post("/reports", requireAuth, (req, res) => {
  try {
    const b = req.body || {};
    const r = reports.createReport(req.user!.id, {
      reportedUsername: b.reportedUsername,
      reason: b.reason,
      context: b.context,
      roomCode: b.roomCode,
      details: b.details,
    });
    res.json(r);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "report failed" });
  }
});

// Admin : liste des reports + actions de ban
app.get("/admin/reports", requireAdmin, (_req, res) => {
  res.json(reports.listAll());
});

app.post("/admin/reports/:id/status", requireAdmin, (req, res) => {
  const status = req.body?.status;
  if (!["open", "reviewed", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "status invalide" });
  }
  reports.setStatus(req.params.id, status);
  res.json({ ok: true });
});

app.get("/admin/bans", requireAdmin, (_req, res) => {
  res.json(bans.listAll());
});

app.post("/admin/bans", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.accountId || !b.reason) {
      return res.status(400).json({ error: "accountId et reason requis" });
    }
    const ban = bans.banAccount(b.accountId, b.reason, {
      expiresAt: b.expiresAt,
      bannedBy: b.bannedBy ?? "admin",
    });
    res.json(ban);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "ban failed" });
  }
});

app.delete("/admin/bans/:id", requireAdmin, (req, res) => {
  bans.liftBan(req.params.id);
  res.json({ ok: true });
});

// ─── API Score sheets IRL ───────────────────────────────────────

// GET /score-sheets — mes feuilles
app.get("/score-sheets", requireAuth, (req, res) => {
  res.json(scoreSheets.listMine(req.user!.id));
});

// POST /score-sheets — crée une nouvelle feuille
app.post("/score-sheets", requireAuth, (req, res) => {
  try {
    const names = req.body?.names;
    if (!Array.isArray(names) || names.length !== 4) {
      return res.status(400).json({ error: "names doit être un tableau de 4 noms" });
    }
    res.json(scoreSheets.createSheet(req.user!.id, names as [string, string, string, string]));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "create failed" });
  }
});

// GET /score-sheets/:id — une feuille précise
app.get("/score-sheets/:id", requireAuth, (req, res) => {
  const s = scoreSheets.getOne(req.user!.id, req.params.id);
  if (!s) return res.status(404).json({ error: "introuvable" });
  res.json(s);
});

// PUT /score-sheets/:id — patch (names, dealerIdx, status, winner)
app.put("/score-sheets/:id", requireAuth, (req, res) => {
  try {
    res.json(scoreSheets.updateSheet(req.user!.id, req.params.id, req.body || {}));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "update failed" });
  }
});

// POST /score-sheets/:id/rounds — ajoute une manche
app.post("/score-sheets/:id/rounds", requireAuth, (req, res) => {
  try {
    const b = req.body || {};
    if (!b.round) return res.status(400).json({ error: "round requis" });
    res.json(scoreSheets.addRound(
      req.user!.id, req.params.id, b.round,
      b.winner ?? null,
      b.status ?? "in-progress",
    ));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "add round failed" });
  }
});

// POST /score-sheets/:id/reset — vide les manches et repart à zéro
app.post("/score-sheets/:id/reset", requireAuth, (req, res) => {
  try {
    res.json(scoreSheets.resetSheet(req.user!.id, req.params.id));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "reset failed" });
  }
});

// DELETE /score-sheets/:id — supprime
app.delete("/score-sheets/:id", requireAuth, (req, res) => {
  scoreSheets.removeSheet(req.user!.id, req.params.id);
  res.json({ ok: true });
});

// ─── API Tournois ───────────────────────────────────────────────

app.post("/tournaments", requireAuth, (req, res) => {
  try {
    // Rate limit : max 10 tournois / heure
    if (!rateConsume(`tournament:${req.user!.id}`, { capacity: 10, windowMs: 60 * 60 * 1000 })) {
      res.status(429).json({ error: "Trop de tournois créés récemment, réessaie plus tard" });
      return;
    }
    const b = req.body || {};
    const t = tournaments.createTournament({
      name: b.name,
      createdBy: req.user!.username,
      format: b.format,
      mode: b.mode,
      pairingMode: b.pairingMode,
      maxPlayers: b.maxPlayers,
      leagueId: b.leagueId,
      leagueName: b.leagueName,
      date: b.date,
      time: b.time,
      duration: b.duration,
      location: b.location,
      tagline: b.tagline,
    });
    roomAudit.logCreation(req.user!.id, "tournament", t.code);
    res.json(t);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "create failed" });
  }
});

app.post("/tournaments/join", requireAuth, (req, res) => {
  try {
    const { code, partnerName } = req.body || {};
    if (!code) { res.status(400).json({ error: "code required" }); return; }
    const t = tournaments.joinTournament(code, req.user!.username, partnerName);
    res.json(t);
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? "not found" });
  }
});

app.get("/tournaments", requireAuth, (req, res) => {
  res.json(tournaments.listMyTournaments(req.user!.username));
});

// Preview d'un tournoi par code (avant inscription). Auth requis pour
// empêcher le bruteforce de codes et l'énumération par des non-users.
app.get("/tournaments/by-code/:code", requireAuth, (req, res) => {
  const t = tournaments.getTournamentByCode(req.params.code.toUpperCase());
  if (!t) return res.status(404).json({ error: "Code invalide" });
  res.json(t);
});

app.get("/tournaments/:id", requireAuth, (req, res) => {
  const t = tournaments.getTournament(req.params.id);
  if (!t) { res.status(404).json({ error: "not found" }); return; }
  res.json(t);
});

app.post("/tournaments/:id/start", requireAuth, (req, res) => {
  try {
    const t = tournaments.startTournament(req.params.id, req.user!.username);
    res.json(t);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "start failed" });
  }
});

app.post("/tournaments/:id/matches/:matchId/result", requireAuth, (req, res) => {
  try {
    const { scoreA, scoreB } = req.body || {};
    if (typeof scoreA !== "number" || typeof scoreB !== "number") {
      res.status(400).json({ error: "scoreA + scoreB requis" });
      return;
    }
    // Seul l'admin (createdBy) du tournoi peut saisir un résultat manuel.
    // L'auto-record via GameRoom passe par `recordMatchResult` en direct (pas par cet endpoint).
    const t = tournaments.getTournament(req.params.id);
    if (!t) return res.status(404).json({ error: "Tournoi introuvable" });
    if (t.createdBy.toLowerCase() !== req.user!.username.toLowerCase()) {
      return res.status(403).json({ error: "Seul l'admin du tournoi peut saisir un résultat" });
    }
    const updated = tournaments.recordMatchResult(req.params.id, req.params.matchId, scoreA, scoreB);
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "record failed" });
  }
});

app.delete("/tournaments/:id", requireAuth, (req, res) => {
  try {
    tournaments.removeTournament(req.params.id, req.user!.username);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(403).json({ error: e?.message ?? "delete failed" });
  }
});

// GET /leaderboard/pairs?scope=...
app.get("/leaderboard/pairs", (req, res) => {
  const scope = String(req.query.scope || "global");
  try {
    if (scope === "league") {
      const leagueId = String(req.query.leagueId || "");
      if (!leagueId) { res.status(400).json({ error: "leagueId required" }); return; }
      res.json(matches.pairRanking({ scope: "league", leagueId }));
    } else if (scope === "friends") {
      const names = String(req.query.friends || "").split(",").filter(Boolean);
      res.json(matches.pairRanking({ scope: "friends", names }));
    } else {
      res.json(matches.pairRanking({ scope: "global" }));
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "ranking failed" });
  }
});

// ─── Serveur Colyseus ──────────────────────────────────────────────
const server = new Server({
  transport: new WebSocketTransport({ server: createServer(app) }),
});

// Room "touti_private" — parties par code d'invitation (amis + bots)
server.define("touti_private", GameRoom).filterBy(["code"]);

// Room "touti_quick" — matchmaking public : pool random, auto-start à 4 humains
server.define("touti_quick", GameRoom);

// Room "touti_quick_code" — partie rapide avec code partagé (amis invités),
// auto-start à 4 humains (pas de bot fill)
server.define("touti_quick_code", GameRoom).filterBy(["code"]);

// Alias court pour compat
server.define("touti", GameRoom);

// ─── Graceful shutdown ─────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`[touti-server] received ${signal}, shutting down gracefully`);
  try {
    await server.gracefullyShutdown();
  } catch (e) {
    console.error("[touti-server] shutdown error:", e);
  }
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Capture les erreurs non catchées pour éviter que le process meure
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

// ─── Start ─────────────────────────────────────────────────────────
server.listen(port).then(() => {
  console.log(`[touti-server] listening on :${port} (env=${NODE_ENV})`);
  console.log(`[touti-server] monitor: /colyseus ${MONITOR_PASS ? "(auth)" : "(DEV — no pass)"}`);
});
