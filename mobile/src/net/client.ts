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

/** Reconnecte à une room après coupure (token obtenu via room.reconnectionToken). */
export async function reconnect(token: string): Promise<Room> {
  return colyClient.reconnect(token);
}
