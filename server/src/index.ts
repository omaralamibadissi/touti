import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";

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

// Matchmaking endpoints (Colyseus ajoute /matchmake/*) — on intercepte pour rate-limit
app.use("/matchmake", rateLimit);

// Monitor derrière auth
app.use("/colyseus", basicAuth, monitor());

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
