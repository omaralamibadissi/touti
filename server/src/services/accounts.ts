// Service auth : comptes utilisateurs + JWT.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET must be set in production"); })()
    : "dev-secret-please-change");

const JWT_EXPIRES_IN = "30d";

export interface Account {
  id: string;
  username: string;
  email?: string;
  createdAt: number;
  displayName?: string;
  onboardingDone: boolean;
  photo?: string; // data URL base64 (JPEG 200x200)
}

interface AccountRow {
  id: string;
  username: string;
  username_lower: string;
  email: string | null;
  password_hash: string;
  created_at: number;
  display_name: string | null;
  deleted_at: number | null;
  onboarding_done: number | null; // 0/1 en SQLite
  photo: string | null;
}

function rowToAccount(r: AccountRow): Account {
  return {
    id: r.id,
    username: r.username,
    email: r.email || undefined,
    createdAt: r.created_at,
    displayName: r.display_name || undefined,
    onboardingDone: !!r.onboarding_done,
    photo: r.photo || undefined,
  };
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ─── Prepared statements ────────────────────────────────────────

const insertAccount = db.prepare(`
  INSERT INTO accounts
    (id, username, username_lower, email, password_hash, created_at, display_name)
  VALUES
    (@id, @username, @usernameLower, @email, @passwordHash, @createdAt, @displayName)
`);

// Usernames case-sensitive : "Omar" ≠ "omar"
const selectByUsername = db.prepare(`
  SELECT * FROM accounts WHERE username = ? AND deleted_at IS NULL
`);

const selectById = db.prepare(`
  SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL
`);

const selectByEmail = db.prepare(`
  SELECT * FROM accounts WHERE email = ? AND deleted_at IS NULL
`);

const updatePassword = db.prepare(`
  UPDATE accounts SET password_hash = ? WHERE id = ?
`);

const softDelete = db.prepare(`
  UPDATE accounts SET deleted_at = ?, email = NULL, push_token = NULL,
    username = '[deleted-' || id || ']', username_lower = '[deleted-' || id || ']'
    WHERE id = ?
`);

// ─── API ─────────────────────────────────────────────────────────

export async function signUp(input: {
  username: string;
  password: string;
  email?: string;
}): Promise<{ account: Account; token: string }> {
  const username = input.username.trim();
  if (username.length < 3) throw new Error("Pseudo trop court (3 caractères minimum)");
  if (username.length > 24) throw new Error("Pseudo trop long (24 max)");
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) throw new Error("Caractères autorisés : lettres, chiffres, _ et -");
  if (input.password.length < 6) throw new Error("Mot de passe trop court (6 min)");
  const usernameLower = username.toLowerCase();

  // Interdire les pseudos qui ressemblent à des IA — on bloque tout pseudo
  // contenant la sous-chaîne "ia" ou "bot" suivie ou précédée de chiffres
  // ou séparateurs, pour éviter de pouvoir se faire passer pour un bot.
  const normalized = usernameLower.replace(/[_-]/g, "");
  if (
    /^ia\d*$/.test(normalized) ||
    /^bot\d*$/.test(normalized) ||
    /^ia[_-]?\d+$/i.test(username) ||
    /^bot[_-]?\d+$/i.test(username)
  ) {
    throw new Error("Ce pseudo est réservé aux IA");
  }

  // Unicité case-sensitive : "Omar" et "omar" peuvent coexister
  const existing = selectByUsername.get(username) as AccountRow | undefined;
  if (existing) throw new Error("Ce pseudo est déjà pris");

  if (input.email) {
    const emailTaken = selectByEmail.get(input.email.toLowerCase()) as AccountRow | undefined;
    if (emailTaken) throw new Error("Cet email est déjà utilisé");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = randomId();
  const now = Date.now();
  insertAccount.run({
    id,
    username,
    usernameLower,
    email: input.email?.toLowerCase() || null,
    passwordHash,
    createdAt: now,
    displayName: null,
  });
  const row = selectById.get(id) as AccountRow;
  return {
    account: rowToAccount(row),
    token: issueToken(row),
  };
}

export async function signIn(input: {
  username: string;
  password: string;
}): Promise<{ account: Account; token: string }> {
  // Case-sensitive : l'utilisateur doit taper exactement la même casse qu'à l'inscription
  const row = selectByUsername.get(input.username) as AccountRow | undefined;
  if (!row) throw new Error("Identifiants incorrects");
  const ok = await bcrypt.compare(input.password, row.password_hash);
  if (!ok) throw new Error("Identifiants incorrects");
  return {
    account: rowToAccount(row),
    token: issueToken(row),
  };
}

export function getById(id: string): Account | null {
  const row = selectById.get(id) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

export function findByUsername(username: string): Account | null {
  const row = selectByUsername.get(username) as AccountRow | undefined;
  return row ? rowToAccount(row) : null;
}

export async function changePassword(id: string, oldPwd: string, newPwd: string): Promise<void> {
  const row = selectById.get(id) as AccountRow | undefined;
  if (!row) throw new Error("Compte introuvable");
  const ok = await bcrypt.compare(oldPwd, row.password_hash);
  if (!ok) throw new Error("Ancien mot de passe incorrect");
  if (newPwd.length < 6) throw new Error("Nouveau mot de passe trop court");
  const hash = await bcrypt.hash(newPwd, 10);
  updatePassword.run(hash, id);
}

export function deleteAccount(id: string): void {
  softDelete.run(Date.now(), id);
}

// ─── Présence / statut en ligne ────────────────────────────────────

const updateLastSeen = db.prepare(`UPDATE accounts SET last_seen_at = ? WHERE id = ?`);

const selectLastSeen = db.prepare(`SELECT last_seen_at FROM accounts WHERE id = ?`);

// Un user est "online" s'il a pinggé dans les 2 dernières minutes.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function markSeen(accountId: string): void {
  updateLastSeen.run(Date.now(), accountId);
}

export function isOnline(accountId: string): boolean {
  const row = selectLastSeen.get(accountId) as { last_seen_at: number | null } | undefined;
  if (!row || !row.last_seen_at) return false;
  return Date.now() - row.last_seen_at < ONLINE_WINDOW_MS;
}

// ─── Push notifications ───────────────────────────────────────────

const setPushTokenStmt = db.prepare(`UPDATE accounts SET push_token = ? WHERE id = ?`);
const getPushTokenStmt = db.prepare(`SELECT push_token FROM accounts WHERE id = ?`);

export function setPushToken(accountId: string, token: string | null): void {
  setPushTokenStmt.run(token, accountId);
}

export function getPushToken(accountId: string): string | null {
  const row = getPushTokenStmt.get(accountId) as { push_token: string | null } | undefined;
  return row?.push_token ?? null;
}

// ─── Onboarding flag (serveur-side, cross-device) ────────────────

const setOnboardingDoneStmt = db.prepare(
  `UPDATE accounts SET onboarding_done = 1 WHERE id = ?`,
);

export function markOnboardingDone(accountId: string): void {
  setOnboardingDoneStmt.run(accountId);
}

const setPhotoStmt = db.prepare(`UPDATE accounts SET photo = ? WHERE id = ?`);

export function setPhoto(accountId: string, photo: string | null): void {
  setPhotoStmt.run(photo, accountId);
}

// ─── OAuth linking ──────────────────────────────────────────────

const selectAccountByProvider = db.prepare(`
  SELECT a.* FROM accounts a
  JOIN account_providers p ON p.account_id = a.id
  WHERE p.provider = ? AND p.provider_user_id = ? AND a.deleted_at IS NULL
`);

const linkProvider = db.prepare(`
  INSERT OR IGNORE INTO account_providers (account_id, provider, provider_user_id, linked_at)
  VALUES (?, ?, ?, ?)
`);

function uniqueUsername(base: string): string {
  const cleaned = (base || "user").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20) || "user";
  let candidate = cleaned;
  let i = 1;
  while (selectByUsername.get(candidate)) {
    i++;
    candidate = `${cleaned}${i}`;
    if (candidate.length > 24) candidate = `user${Date.now().toString(36).slice(-6)}`;
  }
  return candidate;
}

export async function signInOrCreateFromOAuth(profile: {
  provider: "apple" | "google" | "facebook";
  providerId: string;
  email?: string;
  name?: string;
}): Promise<{ account: Account; token: string; created: boolean }> {
  // 1) déjà lié ?
  const existing = selectAccountByProvider.get(profile.provider, profile.providerId) as
    | AccountRow
    | undefined;
  if (existing) {
    return { account: rowToAccount(existing), token: issueToken(existing), created: false };
  }

  // 2) email connu ? on lie à ce compte
  if (profile.email) {
    const byEmail = selectByEmail.get(profile.email.toLowerCase()) as AccountRow | undefined;
    if (byEmail) {
      linkProvider.run(byEmail.id, profile.provider, profile.providerId, Date.now());
      return { account: rowToAccount(byEmail), token: issueToken(byEmail), created: false };
    }
  }

  // 3) sinon on crée un nouveau compte (username auto + mdp random)
  const username = uniqueUsername(profile.name || profile.email?.split("@")[0] || "user");
  const id = randomId();
  const now = Date.now();
  const randomPwd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const passwordHash = await bcrypt.hash(randomPwd, 10);

  insertAccount.run({
    id,
    username,
    usernameLower: username.toLowerCase(),
    email: profile.email?.toLowerCase() || null,
    passwordHash,
    createdAt: now,
    displayName: profile.name || null,
  });
  linkProvider.run(id, profile.provider, profile.providerId, now);

  const row = selectById.get(id) as AccountRow;
  return { account: rowToAccount(row), token: issueToken(row), created: true };
}

function issueToken(row: AccountRow): string {
  return jwt.sign(
    { sub: row.id, username: row.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(token: string): { sub: string; username: string } | null {
  if (!token || typeof token !== "string" || token.length < 10) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.sub) return null;
    // Vérifie que le compte n'a pas été soft-deleted. Sinon un JWT émis
    // avant la suppression reste valide pendant 30 jours.
    const row = selectById.get(decoded.sub) as AccountRow | undefined;
    if (!row) return null;
    return { sub: row.id, username: row.username };
  } catch {
    return null;
  }
}
