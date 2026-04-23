// Service ligues backed par SQLite (persistance entre redéploiements).

import { db } from "../db";
import { logActivity } from "./leagueActivity";

export interface LeagueMember {
  name: string;
  joinedAt: number;
  role: "admin" | "member";
}

export interface League {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  createdBy: string;
  members: LeagueMember[];
  tagline?: string;
  color?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function normalizeCode(code: string): string {
  return (code || "").toUpperCase().trim();
}

// ─── Prepared statements ───────────────────────────────────────────

const insertLeague = db.prepare(`
  INSERT INTO leagues (id, name, code, created_at, created_by, tagline, color)
  VALUES (@id, @name, @code, @createdAt, @createdBy, @tagline, @color)
`);

const insertMember = db.prepare(`
  INSERT OR IGNORE INTO league_members (league_id, name, name_lower, joined_at, role)
  VALUES (@leagueId, @name, @nameLower, @joinedAt, @role)
`);

const selectLeagueById = db.prepare(`SELECT * FROM leagues WHERE id = ?`);
const selectLeagueByCode = db.prepare(`SELECT * FROM leagues WHERE code = ?`);
const selectMembers = db.prepare(`
  SELECT name, joined_at AS joinedAt, role FROM league_members
  WHERE league_id = ? ORDER BY joined_at ASC
`);

const deleteLeague = db.prepare(`DELETE FROM leagues WHERE id = ?`);
const deleteMember = db.prepare(`
  DELETE FROM league_members WHERE league_id = ? AND name_lower = ?
`);
const countMembers = db.prepare(`
  SELECT COUNT(*) as n FROM league_members WHERE league_id = ?
`);
const selectLeaguesByMember = db.prepare(`
  SELECT l.* FROM leagues l
  JOIN league_members m ON m.league_id = l.id
  WHERE m.name_lower = ?
  ORDER BY l.created_at DESC
`);

const checkMembership = db.prepare(`
  SELECT 1 FROM league_members
  WHERE league_id = ? AND name_lower = ?
  LIMIT 1
`);

// ─── Fonctions publiques ───────────────────────────────────────────

function hydrateLeague(row: any): League {
  const members = (selectMembers.all(row.id) as LeagueMember[]).map((m) => ({
    name: m.name,
    joinedAt: m.joinedAt,
    role: m.role,
  }));
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    createdBy: row.created_by,
    tagline: row.tagline || undefined,
    color: row.color || undefined,
    members,
  };
}

export function createLeague(input: {
  name: string;
  createdBy: string;
  tagline?: string;
  color?: string;
}): League {
  const name = (input.name || "").trim();
  if (name.length < 3) throw new Error("Nom trop court (3 min)");

  // Code unique — on retente si collision (très improbable)
  let code = randomCode();
  while (selectLeagueByCode.get(code)) code = randomCode();

  const id = randomId();
  const now = Date.now();

  const tx = db.transaction(() => {
    insertLeague.run({
      id,
      name,
      code,
      createdAt: now,
      createdBy: input.createdBy,
      tagline: input.tagline?.trim() || null,
      color: input.color || null,
    });
    insertMember.run({
      leagueId: id,
      name: input.createdBy,
      nameLower: input.createdBy.toLowerCase(),
      joinedAt: now,
      role: "admin",
    });
  });
  tx();

  return getLeague(id)!;
}

export function findByCode(code: string): League | null {
  const row = selectLeagueByCode.get(normalizeCode(code)) as any;
  return row ? hydrateLeague(row) : null;
}

export function getLeague(id: string): League | null {
  const row = selectLeagueById.get(id) as any;
  return row ? hydrateLeague(row) : null;
}

export function joinLeague(code: string, name: string): League {
  const league = findByCode(code);
  if (!league) throw new Error("Code inconnu");
  insertMember.run({
    leagueId: league.id,
    name,
    nameLower: name.toLowerCase(),
    joinedAt: Date.now(),
    role: "member",
  });
  logActivity(league.id, "member_joined", { actorName: name });
  return getLeague(league.id)!;
}

export function leaveLeague(id: string, name: string): void {
  deleteMember.run(id, name.toLowerCase());
  // Si plus aucun membre, on supprime la ligue (et son activité suivra via CASCADE)
  const { n } = countMembers.get(id) as { n: number };
  if (n === 0) deleteLeague.run(id);
  else logActivity(id, "member_left", { actorName: name });
}

export function listMyLeagues(name: string): League[] {
  const rows = selectLeaguesByMember.all(name.toLowerCase()) as any[];
  return rows.map(hydrateLeague);
}

export function isMember(leagueId: string, name: string): boolean {
  return !!checkMembership.get(leagueId, name.toLowerCase());
}

export function updateLeague(
  id: string,
  patch: Partial<Pick<League, "name" | "tagline" | "color">>,
  byName: string,
): League | null {
  requireAdmin(id, byName);
  const sets: string[] = [];
  const args: any = { id };
  if (patch.name !== undefined) {
    const n = (patch.name || "").trim();
    if (n.length < 3) throw new Error("Nom trop court (3 min)");
    sets.push("name = @name"); args.name = n;
  }
  if (patch.tagline !== undefined) { sets.push("tagline = @tagline"); args.tagline = patch.tagline || null; }
  if (patch.color !== undefined) { sets.push("color = @color"); args.color = patch.color || null; }
  if (sets.length === 0) return getLeague(id);
  db.prepare(`UPDATE leagues SET ${sets.join(", ")} WHERE id = @id`).run(args);
  return getLeague(id);
}

// Suppression complète d'une ligue — réservée à un admin.
// Cascade : supprime aussi membres, messages, activity, tournois liés (via FK).
export function deleteLeagueAsAdmin(id: string, byName: string): void {
  requireAdmin(id, byName);
  deleteLeague.run(id);
}

// Suppression système (interne — pas de check admin, appelé par leaveLeague quand 0 membres)
export function deleteLeagueById(id: string): void {
  deleteLeague.run(id);
}

// ─── Admin ligue : promote / demote / kick ─────────────────────────

const updateMemberRole = db.prepare(`
  UPDATE league_members SET role = ?
  WHERE league_id = ? AND name_lower = ?
`);

const countAdmins = db.prepare(`
  SELECT COUNT(*) AS n FROM league_members
  WHERE league_id = ? AND role = 'admin'
`);

const getMemberRole = db.prepare(`
  SELECT role FROM league_members
  WHERE league_id = ? AND name_lower = ?
  LIMIT 1
`);

function requireAdmin(leagueId: string, byName: string): void {
  const row = getMemberRole.get(leagueId, byName.toLowerCase()) as any;
  if (!row || row.role !== "admin") {
    throw new Error("Action réservée aux admins de la ligue");
  }
}

export function promoteMember(
  leagueId: string,
  targetName: string,
  byName: string,
): League {
  requireAdmin(leagueId, byName);
  const row = getMemberRole.get(leagueId, targetName.toLowerCase()) as any;
  if (!row) throw new Error("Membre introuvable");
  if (row.role === "admin") return getLeague(leagueId)!;
  updateMemberRole.run("admin", leagueId, targetName.toLowerCase());
  logActivity(leagueId, "member_promoted", { actorName: byName, targetName });
  return getLeague(leagueId)!;
}

export function demoteMember(
  leagueId: string,
  targetName: string,
  byName: string,
): League {
  requireAdmin(leagueId, byName);
  const row = getMemberRole.get(leagueId, targetName.toLowerCase()) as any;
  if (!row) throw new Error("Membre introuvable");
  if (row.role === "member") return getLeague(leagueId)!;
  // Empêche de retirer le dernier admin
  const { n } = countAdmins.get(leagueId) as { n: number };
  if (n <= 1) throw new Error("Impossible : il doit rester au moins un admin");
  updateMemberRole.run("member", leagueId, targetName.toLowerCase());
  logActivity(leagueId, "member_demoted", { actorName: byName, targetName });
  return getLeague(leagueId)!;
}

export function kickMember(
  leagueId: string,
  targetName: string,
  byName: string,
): League {
  requireAdmin(leagueId, byName);
  if (targetName.toLowerCase() === byName.toLowerCase()) {
    throw new Error("Tu ne peux pas t'exclure toi-même (utilise « Quitter »)");
  }
  const row = getMemberRole.get(leagueId, targetName.toLowerCase()) as any;
  if (!row) throw new Error("Membre introuvable");
  // Si c'est un admin, empêcher s'il est le dernier
  if (row.role === "admin") {
    const { n } = countAdmins.get(leagueId) as { n: number };
    if (n <= 1) throw new Error("Impossible : il doit rester au moins un admin");
  }
  deleteMember.run(leagueId, targetName.toLowerCase());
  logActivity(leagueId, "member_kicked", { actorName: byName, targetName });
  return getLeague(leagueId)!;
}
