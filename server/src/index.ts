import express from "express";
import { createServer } from "http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/colyseus", monitor());

const server = new Server({
  transport: new WebSocketTransport({ server: createServer(app) }),
});

// Room "touti_private" — parties par code d'invitation (amis)
// Colyseus matche joinOrCreate avec options identiques via filterBy
server.define("touti_private", GameRoom).filterBy(["code"]);

// Alias court pour compat (version précédente de l'API)
server.define("touti", GameRoom);

server.listen(port).then(() => {
  // eslint-disable-next-line no-console
  console.log(`[touti-server] listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`[touti-server] colyseus monitor: http://localhost:${port}/colyseus`);
});
