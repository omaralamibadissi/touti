import { fetchJson } from "./http";

export interface DirectMessageApi {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  createdAt: number;
  readAt: number | null;
}

export interface DMThreadApi {
  otherId: string;
  otherName: string;
  lastMessage: DirectMessageApi;
  unreadCount: number;
}

export async function apiListThreads(): Promise<DMThreadApi[]> {
  return fetchJson("/dm/threads");
}

export async function apiListDMMessages(
  otherId: string,
  options: { before?: number; limit?: number } = {},
): Promise<DirectMessageApi[]> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", String(options.before));
  if (options.limit) params.set("limit", String(options.limit));
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  return fetchJson(`/dm/${encodeURIComponent(otherId)}/messages${suffix}`);
}

export async function apiSendDM(otherId: string, text: string): Promise<DirectMessageApi> {
  return fetchJson(`/dm/${encodeURIComponent(otherId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function apiMarkDMRead(otherId: string): Promise<void> {
  await fetchJson(`/dm/${encodeURIComponent(otherId)}/read`, { method: "POST" });
}
