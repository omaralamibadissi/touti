import { fetchJson } from "./http";

export type FriendshipStatus = "pending" | "accepted" | "rejected";

export interface FriendshipApi {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterOnline?: boolean;
  receiverId: string;
  receiverName: string;
  receiverOnline?: boolean;
  status: FriendshipStatus;
  createdAt: number;
  respondedAt?: number;
}

export interface FriendsListApi {
  friends: FriendshipApi[];
  incoming: FriendshipApi[];
  outgoing: FriendshipApi[];
}

export async function apiRequestFriend(targetUsername: string): Promise<FriendshipApi> {
  return fetchJson("/friends/request", {
    method: "POST",
    body: JSON.stringify({ targetUsername }),
  });
}

export async function apiAcceptFriend(id: string): Promise<FriendshipApi> {
  return fetchJson(`/friends/${encodeURIComponent(id)}/accept`, { method: "POST" });
}

export async function apiRejectFriend(id: string): Promise<void> {
  return fetchJson(`/friends/${encodeURIComponent(id)}/reject`, { method: "POST" });
}

export async function apiUnfriend(id: string): Promise<void> {
  return fetchJson(`/friends/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function apiListFriends(): Promise<FriendsListApi> {
  return fetchJson("/friends");
}
