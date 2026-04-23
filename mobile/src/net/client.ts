// Client Colyseus singleton — une seule instance partagée entre écrans.
// URL configurable via EXPO_PUBLIC_SERVER_URL (dev local) ou défaut = prod Fly.io.

import { Client, Room } from "colyseus.js";

const DEFAULT_URL = "wss://kbirkbir-server.fly.dev";
const url = process.env.EXPO_PUBLIC_SERVER_URL || DEFAULT_URL;

export const colyClient = new Client(url);

export type PrivateRoomOpts = { code: string; name: string };

/** Crée ou rejoint une partie privée par code (4 lettres). */
export async function joinPrivateRoom(opts: PrivateRoomOpts): Promise<Room> {
  return colyClient.joinOrCreate("touti_private", {
    code: opts.code.toUpperCase(),
    name: opts.name,
  });
}

/** Rejoint une partie privée comme spectateur (lecture seule, sans siège). */
export async function joinPrivateRoomAsSpectator(opts: PrivateRoomOpts): Promise<Room> {
  return colyClient.joinOrCreate("touti_private", {
    code: opts.code.toUpperCase(),
    name: opts.name,
    spectator: true,
  });
}

/** Matchmaking public : rejoint la première room quick dispo, ou en crée une. */
export async function joinQuickRoom(opts: { name: string }): Promise<Room> {
  return colyClient.joinOrCreate("touti_quick", { name: opts.name });
}

/** Partie rapide avec code d'invitation : amis rejoignent via code, auto-start à 4 humains. */
export async function joinQuickCodeRoom(opts: {
  code: string;
  name: string;
  leagueId?: string;
  hybridOpenToPool?: boolean;
}): Promise<Room> {
  return colyClient.joinOrCreate("touti_quick_code", {
    code: opts.code.toUpperCase(),
    name: opts.name,
    leagueId: opts.leagueId,
    hybridOpenToPool: opts.hybridOpenToPool,
  });
}

/** Reconnecte à une room après coupure (token obtenu via room.reconnectionToken). */
export async function reconnect(token: string): Promise<Room> {
  return colyClient.reconnect(token);
}
