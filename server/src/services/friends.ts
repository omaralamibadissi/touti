// Service amis : demandes bidirectionnelles.
//
// Workflow :
//   Alice POST /friends/request avec { targetUsername: "Bob" }
//   → crée une friendship status=pending
//   → Bob voit la demande dans son "incoming"
//   Bob POST /friends/:id/accept
//   → status=accepted, les deux sont amis
//   OU Bob POST /friends/:id/reject
//   → status=rejected (ou supprimée)
//
// Si Bob n'existe pas, l'API renvoie 404 "Pseudo introuvable".

import { db } from "../db";
import { findByUsername, isOnline } from "./accounts";

export type FriendshipStatus = "pending" | "accepted" | "rejected";

export interface Friendship {
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

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Queries ─────────────────────────────────────────────────

const insertFriendship = db.prepare(`
  INSERT INTO friendships (id, requester_id, receiver_id, status, created_at)
  VALUES (?, ?, ?, 'pending', ?)
`);

const selectById = db.prepare(`SELECT * FROM friendships WHERE id = ?`);

const selectBetween = db.prepare(`
  SELECT * FROM friendships
  WHERE (requester_id = ? AND receiver_id = ?)
     OR (requester_id = ? AND receiver_id = ?)
`);

const selectMine = db.prepare(`
  SELECT * FROM friendships
  WHERE requester_id = ? OR receiver_id = ?
  ORDER BY created_at DESC
`);

const updateStatus = db.prepare(`
  UPDATE friendships SET status = ?, responded_at = ? WHERE id = ?
`);

const deleteOne = db.prepare(`DELETE FROM friendships WHERE id = ?`);

const getAccountById = db.prepare(`
  SELECT id, username FROM accounts WHERE id = ? AND deleted_at IS NULL
`);

// ─── Hydration ───────────────────────────────────────────────

function hydrate(row: any): Friendship {
  const req = getAccountById.get(row.requester_id) as any;
  const rec = getAccountById.get(row.receiver_id) as any;
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: req?.username || "(supprimé)",
    requesterOnline: req ? isOnline(row.requester_id) : false,
    receiverId: row.receiver_id,
    receiverName: rec?.username || "(supprimé)",
    receiverOnline: rec ? isOnline(row.receiver_id) : false,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at || undefined,
  };
}

// ─── API ─────────────────────────────────────────────────────

// Envoie une demande d'ami. Lève si cible inexistante ou déjà lié.
export function requestFriend(
  requesterId: string,
  targetUsername: string,
): Friendship {
  const target = findByUsername(targetUsername);
  if (!target) throw new Error("Pseudo introuvable");
  if (target.id === requesterId) throw new Error("Tu ne peux pas t'ajouter toi-même");

  const existing = selectBetween.get(requesterId, target.id, target.id, requesterId) as
    | any
    | undefined;
  if (existing) {
    if (existing.status === "accepted") throw new Error("Vous êtes déjà amis");
    if (existing.status === "pending") throw new Error("Une demande est déjà en cours");
    // Si rejected → on recrée une nouvelle demande
    deleteOne.run(existing.id);
  }

  const id = randomId();
  insertFriendship.run(id, requesterId, target.id, Date.now());
  return hydrate(selectById.get(id) as any);
}

export function acceptFriend(userId: string, friendshipId: string): Friendship {
  const row = selectById.get(friendshipId) as any;
  if (!row) throw new Error("Demande introuvable");
  if (row.receiver_id !== userId) throw new Error("Seul le destinataire peut accepter");
  if (row.status !== "pending") throw new Error("Demande déjà traitée");
  updateStatus.run("accepted", Date.now(), friendshipId);
  return hydrate(selectById.get(friendshipId) as any);
}

export function rejectFriend(userId: string, friendshipId: string): void {
  const row = selectById.get(friendshipId) as any;
  if (!row) throw new Error("Demande introuvable");
  if (row.receiver_id !== userId) throw new Error("Seul le destinataire peut refuser");
  if (row.status !== "pending") throw new Error("Demande déjà traitée");
  deleteOne.run(friendshipId);
}

export function unfriend(userId: string, friendshipId: string): void {
  const row = selectById.get(friendshipId) as any;
  if (!row) throw new Error("Introuvable");
  if (row.requester_id !== userId && row.receiver_id !== userId) {
    throw new Error("Pas autorisé");
  }
  deleteOne.run(friendshipId);
}

export function listMine(userId: string): {
  friends: Friendship[];
  incoming: Friendship[];
  outgoing: Friendship[];
} {
  const rows = selectMine.all(userId, userId) as any[];
  const all = rows.map(hydrate);
  return {
    friends: all.filter((f) => f.status === "accepted"),
    incoming: all.filter((f) => f.status === "pending" && f.receiverId === userId),
    outgoing: all.filter((f) => f.status === "pending" && f.requesterId === userId),
  };
}
