import { Client, Room } from "colyseus.js";
import Constants from "expo-constants";

const SERVER_URL: string =
  (Constants.expoConfig?.extra?.SERVER_URL as string | undefined) ?? "ws://localhost:2567";

let client: Client | null = null;

export function getClient(): Client {
  if (!client) client = new Client(SERVER_URL);
  return client;
}

export async function joinTouti(name: string): Promise<Room> {
  return getClient().joinOrCreate("touti", { name });
}
