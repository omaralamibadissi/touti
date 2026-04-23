// Messagerie directe 1-to-1 entre amis. Requiert une amitié acceptée
// dans les deux sens (vérifié avant post).

import { db } from "../db";
import { sanitize } from "@touti/shared";

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  createdAt: number;
  readAt: number | null;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Clé de conversation canonique (même peu importe qui parle à qui)
function conversationKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ─── Prepared statements ─────────────────────────────────────

const areFriends = db.prepare(`
  SELECT 1 FROM friendships
  WHERE status = 'accepted'
    AND ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
  LIMIT 1
`);

const insertMessage = db.prepare(`
  INSERT INTO direct_messages
    (id, conversation_key, sender_id, receiver_id, text, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const selectConversation = db.prepare(`
  SELECT dm.*, s.username AS sender_name, r.username AS receiver_name
  FROM direct_messages dm
  JOIN accounts s ON s.id = dm.sender_id
  JOIN accounts r ON r.id = dm.receiver_id
  WHERE dm.conversation_key = ? AND dm.created_at < ?
  ORDER BY dm.created_at DESC
  LIMIT ?
`);

const markRead = db.prepare(`
  UPDATE direct_messages SET read_at = ?
  WHERE conversation_key = ? AND receiver_id = ? AND read_at IS NULL
`);

const selectMyThreads = db.prepare(`
  WITH my_convs AS (
    SELECT DISTINCT conversation_key FROM direct_messages
    WHERE sender_id = ? OR receiver_id = ?
  ),
  last_msg AS (
    SELECT dm.*
    FROM direct_messages dm
    JOIN (
      SELECT conversation_key, MAX(created_at) AS max_t
      FROM direct_messages
      WHERE conversation_key IN (SELECT conversation_key FROM my_convs)
      GROUP BY conversation_key
    ) m ON m.conversation_key = dm.conversation_key AND m.max_t = dm.created_at
  )
  SELECT lm.*,
    s.username AS sender_name, r.username AS receiver_name,
    (SELECT COUNT(*) FROM direct_messages dm2
     WHERE dm2.conversation_key = lm.conversation_key
       AND dm2.receiver_id = ?
       AND dm2.read_at IS NULL) AS unread_count
  FROM last_msg lm
  JOIN accounts s ON s.id = lm.sender_id
  JOIN accounts r ON r.id = lm.receiver_id
  ORDER BY lm.created_at DESC
  LIMIT 50
`);

function hydrate(row: any): DirectMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    receiverId: row.receiver_id,
    receiverName: row.receiver_name,
    text: row.text,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

// ─── API ─────────────────────────────────────────────────────

function ensureFriends(a: string, b: string): void {
  if (a === b) throw new Error("Tu ne peux pas t'envoyer de message");
  const ok = areFriends.get(a, b, b, a);
  if (!ok) throw new Error("Vous devez être amis pour vous envoyer des messages");
}

export function sendMessage(
  senderId: string,
  receiverId: string,
  rawText: string,
): DirectMessage {
  ensureFriends(senderId, receiverId);
  const text = sanitize((rawText || "").trim().slice(0, 500));
  if (!text) throw new Error("Message vide");
  const id = randomId();
  const createdAt = Date.now();
  insertMessage.run(
    id,
    conversationKey(senderId, receiverId),
    senderId,
    receiverId,
    text,
    createdAt,
  );
  const row = db.prepare(`
    SELECT dm.*, s.username AS sender_name, r.username AS receiver_name
    FROM direct_messages dm
    JOIN accounts s ON s.id = dm.sender_id
    JOIN accounts r ON r.id = dm.receiver_id
    WHERE dm.id = ?
  `).get(id);
  return hydrate(row);
}

export function listMessages(
  userId: string,
  otherId: string,
  before: number = Date.now() + 1,
  limit: number = 80,
): DirectMessage[] {
  ensureFriends(userId, otherId);
  const rows = selectConversation.all(
    conversationKey(userId, otherId),
    before,
    Math.min(200, Math.max(1, limit)),
  ) as any[];
  // Chronologique ASC pour l'affichage
  return rows.map(hydrate).reverse();
}

export function markThreadRead(userId: string, otherId: string): number {
  const key = conversationKey(userId, otherId);
  const result = markRead.run(Date.now(), key, userId);
  return result.changes;
}

export interface DMThread {
  otherId: string;
  otherName: string;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export function listThreads(userId: string): DMThread[] {
  const rows = selectMyThreads.all(userId, userId, userId) as any[];
  return rows.map((row) => {
    const lastMessage = hydrate(row);
    const iAmSender = row.sender_id === userId;
    return {
      otherId: iAmSender ? row.receiver_id : row.sender_id,
      otherName: iAmSender ? row.receiver_name : row.sender_name,
      lastMessage,
      unreadCount: row.unread_count ?? 0,
    };
  });
}
