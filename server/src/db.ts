// Connexion SQLite + création du schéma au démarrage.
// En prod (Fly.io), le fichier est sur un volume monté à /data (persistant).
// En dev, il est dans ./data/touti.db (gitignored).

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./lib/logger";

const DB_PATH =
  process.env.DB_PATH ||
  (process.env.NODE_ENV === "production" ? "/data/touti.db" : "./data/touti.db");

// S'assure que le dossier parent existe
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Mode WAL pour de meilleures perfs en lecture+écriture concurrentes
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schéma ────────────────────────────────────────────────────────
// On versionne pour pouvoir migrer plus tard.
db.exec(`
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  tagline TEXT,
  color TEXT
);

CREATE INDEX IF NOT EXISTS idx_leagues_code ON leagues(code);

CREATE TABLE IF NOT EXISTS league_members (
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_lower TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  PRIMARY KEY (league_id, name_lower)
);

CREATE INDEX IF NOT EXISTS idx_league_members_name ON league_members(name_lower);

-- Historique partagé (global) — pour classements cross-device
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  finished_at INTEGER NOT NULL,
  type TEXT NOT NULL,               -- solo-ai | private | tournament | quick | irl
  winner_team TEXT NOT NULL,        -- A | B
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  rounds_played INTEGER NOT NULL,
  league_id TEXT,
  tournament_id TEXT,
  details_json TEXT                 -- sérialisation rounds + players
);

CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);

CREATE TABLE IF NOT EXISTS match_players (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,            -- 0..3
  name TEXT NOT NULL,
  name_lower TEXT NOT NULL,
  is_ai INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, seat)
);

CREATE INDEX IF NOT EXISTS idx_match_players_name ON match_players(name_lower);

-- Comptes utilisateurs
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,      -- exact (conservé pour affichage)
  username_lower TEXT NOT NULL UNIQUE,-- pour les recherches insensibles à la casse
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  display_name TEXT,
  deleted_at INTEGER                  -- soft-delete pour RGPD
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username_lower);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);

-- Liaisons OAuth (un compte peut avoir plusieurs providers liés)
CREATE TABLE IF NOT EXISTS account_providers (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,          -- apple | google | facebook
  provider_user_id TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_account_providers_account ON account_providers(account_id);

-- ─── Tournois ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  format TEXT NOT NULL,           -- online | irl
  mode TEXT NOT NULL,             -- classique | championnat
  pairing_mode TEXT NOT NULL,     -- random | chosen
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  max_players INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | full | started | finished
  started_at INTEGER,
  league_id TEXT,
  league_name TEXT,
  date TEXT, time TEXT, duration TEXT, location TEXT, tagline TEXT
);
CREATE INDEX IF NOT EXISTS idx_tournaments_code ON tournaments(code);
CREATE INDEX IF NOT EXISTS idx_tournaments_league ON tournaments(league_id);

CREATE TABLE IF NOT EXISTS tournament_players (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_lower TEXT NOT NULL,
  partner_name TEXT,              -- si pairing_mode = chosen
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (tournament_id, name_lower)
);

CREATE TABLE IF NOT EXISTS tournament_pairs (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  pair_id TEXT NOT NULL,          -- "pair-1", "pair-2", ...
  name_a TEXT NOT NULL,
  name_b TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  PRIMARY KEY (tournament_id, pair_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,         -- "m1-r1", ...
  round INTEGER NOT NULL,
  pair_a_id TEXT NOT NULL,
  pair_b_id TEXT NOT NULL,
  room_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | playing | finished
  winner_pair_id TEXT,
  score_a INTEGER,
  score_b INTEGER,
  started_at INTEGER,
  finished_at INTEGER,
  PRIMARY KEY (tournament_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_t_matches_code ON tournament_matches(room_code);
`);

// Version actuelle du schéma
const CURRENT_VERSION = 2;
const row = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as
  | { version: number }
  | undefined;
const currentDbVersion = row?.version ?? 0;
if (!row) {
  db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(CURRENT_VERSION);
}

// ─── Migrations ────────────────────────────────────────────────────

// v1 → v2 : les usernames deviennent case-sensitive.
// On retire la contrainte UNIQUE sur username_lower (les users "Omar" et "omar"
// sont désormais deux comptes distincts). Username garde sa propre unicité.
// On ajoute aussi la table friendships (demandes d'ami bidirectionnelles).
//
// Important : on doit exécuter cette migration AUSSI sur une DB fraîche
// (où `row` est undefined), sinon la table `accounts` reste bloquée avec
// la contrainte UNIQUE(username_lower) définie dans le CREATE TABLE plus
// haut. Les opérations CREATE/INSERT/DROP/RENAME sont idempotentes sur
// une table vide.
if (currentDbVersion < 2) {
  logger.info("[db] migrating v1 → v2 : case-sensitive usernames + friendships");
  db.exec(`
    BEGIN;
    -- Recrée accounts sans UNIQUE sur username_lower
    CREATE TABLE accounts_v2 (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,   -- case-sensitive
      username_lower TEXT NOT NULL,    -- pour recherche/warning similar-but-different
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      display_name TEXT,
      deleted_at INTEGER
    );
    INSERT INTO accounts_v2 (id, username, username_lower, email, password_hash, created_at, display_name, deleted_at)
    SELECT id, username, username_lower, email, password_hash, created_at, display_name, deleted_at FROM accounts;
    DROP TABLE accounts;
    ALTER TABLE accounts_v2 RENAME TO accounts;
    CREATE INDEX idx_accounts_username_lower ON accounts(username_lower);
    CREATE INDEX idx_accounts_email ON accounts(email);
    UPDATE schema_version SET version = 2;
    COMMIT;
  `);
}

// Friendships : demandes + acceptations
db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
    created_at INTEGER NOT NULL,
    responded_at INTEGER,
    UNIQUE (requester_id, receiver_id)
  );
  CREATE INDEX IF NOT EXISTS idx_friendships_req ON friendships(requester_id);
  CREATE INDEX IF NOT EXISTS idx_friendships_rec ON friendships(receiver_id);
`);

// Ajout de `last_seen_at` pour le statut en ligne (heartbeat client toutes les 60s)
// + `push_token` pour Expo push notifications
try {
  const cols = db.prepare(`PRAGMA table_info(accounts)`).all() as any[];
  const hasLastSeen = cols.some((c) => c.name === "last_seen_at");
  if (!hasLastSeen) {
    db.exec(`ALTER TABLE accounts ADD COLUMN last_seen_at INTEGER`);
    logger.info("[db] added accounts.last_seen_at");
  }
  const hasPushToken = cols.some((c) => c.name === "push_token");
  if (!hasPushToken) {
    db.exec(`ALTER TABLE accounts ADD COLUMN push_token TEXT`);
    logger.info("[db] added accounts.push_token");
  }
  // Onboarding terminé — stocké SERVEUR pour qu'un login depuis un autre
  // device (ou un logout/login) ne refasse pas l'onboarding.
  const hasOnboardingDone = cols.some((c) => c.name === "onboarding_done");
  if (!hasOnboardingDone) {
    db.exec(`ALTER TABLE accounts ADD COLUMN onboarding_done INTEGER DEFAULT 0`);
    logger.info("[db] added accounts.onboarding_done");
  }
  // Photo de profil — data URL base64 (JPEG compressée 200x200 ~20-40KB),
  // stockée directement en SQLite pour éviter un storage externe côté MVP.
  // Remplace la lettre initiale dans les Avatar.
  const hasPhoto = cols.some((c) => c.name === "photo");
  if (!hasPhoto) {
    db.exec(`ALTER TABLE accounts ADD COLUMN photo TEXT`);
    logger.info("[db] added accounts.photo");
  }
} catch (e: any) {
  logger.warn({ err: e?.message }, "[db] migration failed");
}

// ─── Messagerie directe (DM 1-to-1 entre amis) ───────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY,
    conversation_key TEXT NOT NULL,   -- "userA_id|userB_id" (trié alphabétiquement)
    sender_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_dm_conv_time
    ON direct_messages(conversation_key, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_dm_receiver_unread
    ON direct_messages(receiver_id, read_at);
`);

// ─── Fil d'activité ligue ─────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS league_activity (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    type TEXT NOT NULL,              -- member_joined|member_left|member_kicked|member_promoted|member_demoted|tournament_created|match_played
    actor_name TEXT,                 -- qui a déclenché (admin qui kick, joueur qui rejoint…)
    target_name TEXT,                -- sur qui (joueur kické, promu…)
    data_json TEXT,                  -- payload additionnel (scores, nom tournoi…)
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_league_activity_league_time
    ON league_activity(league_id, created_at DESC);
`);

// ─── Chat ligue ───────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS league_messages (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    author_id TEXT,                  -- NULL si auteur supprimé
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_league_messages_league_time
    ON league_messages(league_id, created_at DESC);
`);

// ─── Modération : reports + bans + audit de création de rooms ───
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reported_username TEXT NOT NULL,  -- nom saisi, pas nécessairement un compte
    reported_id TEXT,                 -- si on arrive à résoudre en account
    reason TEXT NOT NULL,             -- insulte | triche | spam | autre
    context TEXT,                     -- chat | game | profile
    room_code TEXT,
    details TEXT,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'  -- open | reviewed | dismissed
  );
  CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_username);
  CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

  CREATE TABLE IF NOT EXISTS bans (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    banned_by TEXT,                   -- admin identifier
    banned_at INTEGER NOT NULL,
    expires_at INTEGER,               -- NULL = perma
    lifted_at INTEGER                 -- NULL = actif
  );
  CREATE INDEX IF NOT EXISTS idx_bans_account ON bans(account_id);

  CREATE TABLE IF NOT EXISTS room_audit (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,               -- private | quick | league | tournament
    room_code TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_room_audit_account_time ON room_audit(account_id, created_at DESC);
`);

// ─── Score sheets IRL (pen-and-paper tracker sync cross-device) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS score_sheets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    names_json TEXT NOT NULL,       -- JSON ["n1","n2","n3","n4"]
    dealer_idx INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'in-progress', -- in-progress | finished
    winner TEXT                     -- A | B | null
  );
  CREATE INDEX IF NOT EXISTS idx_score_sheets_owner ON score_sheets(owner_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS score_rounds (
    id TEXT PRIMARY KEY,
    sheet_id TEXT NOT NULL REFERENCES score_sheets(id) ON DELETE CASCADE,
    num INTEGER NOT NULL,
    dealer TEXT NOT NULL,
    male TEXT NOT NULL,
    buyer_team TEXT NOT NULL,       -- A | B
    buyer TEXT NOT NULL,
    bid INTEGER NOT NULL,
    success INTEGER NOT NULL,       -- 0/1
    delta_a INTEGER NOT NULL,
    delta_b INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_score_rounds_sheet ON score_rounds(sheet_id, num);
`);

logger.info({ path: DB_PATH, schemaVersion: CURRENT_VERSION }, "[db] SQLite opened");
