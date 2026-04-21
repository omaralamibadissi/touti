import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// Format principal : en ligne ou IRL
export type TournamentFormat = "online" | "irl";
// Mode : classique (paires fixes) ou championnat (paires tournantes)
export type TournamentMode = "classique" | "championnat";
// Constitution des paires
export type PairingMode = "random" | "chosen";

export interface TournamentPlayer {
  id: string;
  name: string;
  partnerName?: string; // si pairingMode "chosen"
}

export interface TournamentPair {
  id: string;          // paire stable (ex: "p1")
  names: [string, string];
  wins: number;
  losses: number;
  points: number;      // pour championnat : cumul des scores
}

export interface TournamentMatch {
  id: string;          // ex: "m1-r1"
  round: number;       // round number (1-based)
  pairAId: string;
  pairBId: string;
  roomCode: string;    // code auto-gen pour que les 4 joueurs rejoignent la même room touti_quick_code
  status: "pending" | "playing" | "finished";
  winnerPairId?: string;
  scoreA?: number;     // score pair A
  scoreB?: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Tournament {
  id: string;
  code: string;
  format: TournamentFormat;
  mode: TournamentMode;
  pairingMode: PairingMode;
  name: string;
  createdAt: number;
  createdBy: string;
  maxPlayers: number;       // multiple de 4, pas de max
  players: TournamentPlayer[];

  // Ligue-restricted : si leagueId renseigné, seuls les membres de la ligue
  // peuvent rejoindre (filtrage client-side v1)
  leagueId?: string;
  leagueName?: string;

  // IRL uniquement
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  tagline?: string;

  status: "open" | "full" | "started" | "finished";

  // Runtime tournoi
  pairs?: TournamentPair[];
  matches?: TournamentMatch[];
  startedAt?: number;
}

interface TournamentState {
  hydrated: boolean;
  mine: Tournament[];
  hydrate: () => Promise<void>;
  create: (t: Omit<Tournament, "id" | "code" | "createdAt" | "status" | "players" | "createdBy"> & {
    adminName: string;
  }) => Promise<Tournament>;
  joinByCode: (code: string, playerName: string) => Promise<Tournament | null>;
  leave: (id: string, playerId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  // Démarre le tournoi : génère les paires et la liste des matchs
  start: (id: string) => Promise<Tournament | null>;
  // Enregistre le résultat d'un match + met à jour les wins/points
  recordResult: (
    tournamentId: string,
    matchId: string,
    scoreA: number,
    scoreB: number,
  ) => Promise<void>;
}

const STORAGE_KEY = "touti.tournaments.v2";

async function persist(mine: Tournament[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mine));
}

function randomCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Constitue les paires à partir des joueurs inscrits
function buildPairs(t: Tournament): TournamentPair[] {
  if (t.pairingMode === "chosen") {
    // Mode "chosen" : chaque joueur a un partnerName ; on groupe par paires
    const grouped: TournamentPair[] = [];
    const seen = new Set<string>();
    for (const p of t.players) {
      if (seen.has(p.name)) continue;
      const partner = p.partnerName
        ? t.players.find((q) => q.name === p.partnerName && !seen.has(q.name))
        : null;
      if (partner) {
        seen.add(p.name);
        seen.add(partner.name);
        grouped.push({
          id: `pair-${grouped.length + 1}`,
          names: [p.name, partner.name],
          wins: 0, losses: 0, points: 0,
        });
      }
    }
    // Joueurs non appariés : on les apparie entre eux séquentiellement
    const unpaired = t.players.filter((p) => !seen.has(p.name));
    for (let i = 0; i < unpaired.length; i += 2) {
      if (!unpaired[i + 1]) break;
      grouped.push({
        id: `pair-${grouped.length + 1}`,
        names: [unpaired[i].name, unpaired[i + 1].name],
        wins: 0, losses: 0, points: 0,
      });
    }
    return grouped;
  }
  // Mode "random" : on mélange les noms et on fait des paires 2 par 2
  const names = shuffle(t.players.map((p) => p.name));
  const pairs: TournamentPair[] = [];
  for (let i = 0; i < names.length; i += 2) {
    if (!names[i + 1]) break;
    pairs.push({
      id: `pair-${pairs.length + 1}`,
      names: [names[i], names[i + 1]],
      wins: 0, losses: 0, points: 0,
    });
  }
  return pairs;
}

// Génère les matchs selon le mode du tournoi
function buildMatches(t: Tournament, pairs: TournamentPair[]): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  if (t.mode === "championnat") {
    // Round-robin : chaque paire affronte chaque autre paire une fois
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        matches.push({
          id: `m${matches.length + 1}`,
          round: 1,
          pairAId: pairs[i].id,
          pairBId: pairs[j].id,
          roomCode: randomCode(4),
          status: "pending",
        });
      }
    }
  } else {
    // Classique : élimination directe (bracket)
    // Round 1 : paires[0] vs paires[1], paires[2] vs paires[3], etc.
    // Les rounds suivants seront générés au fur et à mesure des résultats.
    for (let i = 0; i < pairs.length; i += 2) {
      if (!pairs[i + 1]) break;
      matches.push({
        id: `m${matches.length + 1}-r1`,
        round: 1,
        pairAId: pairs[i].id,
        pairBId: pairs[i + 1].id,
        roomCode: randomCode(4),
        status: "pending",
      });
    }
  }
  return matches;
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  hydrated: false,
  mine: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const mine: Tournament[] = raw ? JSON.parse(raw) : [];
      set({ mine, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  create: async (input) => {
    const t: Tournament = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      code: randomCode(),
      createdAt: Date.now(),
      createdBy: input.adminName,
      status: "open",
      players: [{ id: "admin", name: input.adminName }],
      format: input.format,
      mode: input.mode,
      pairingMode: input.pairingMode,
      name: input.name,
      maxPlayers: input.maxPlayers,
      date: input.date,
      time: input.time,
      duration: input.duration,
      location: input.location,
      tagline: input.tagline,
    };
    const mine = [t, ...get().mine];
    await persist(mine);
    set({ mine });
    return t;
  },

  joinByCode: async (code, playerName) => {
    const code_ = code.toUpperCase().trim();
    const found = get().mine.find((t) => t.code === code_);
    if (!found) return null;
    if (found.players.some((p) => p.name === playerName)) return found;
    if (found.players.length >= found.maxPlayers) return found;
    const newPlayer: TournamentPlayer = { id: String(Date.now()), name: playerName };
    const updated: Tournament = {
      ...found,
      players: [...found.players, newPlayer],
      status: found.players.length + 1 >= found.maxPlayers ? "full" : "open",
    };
    const mine = get().mine.map((t) => (t.id === found.id ? updated : t));
    await persist(mine);
    set({ mine });
    return updated;
  },

  leave: async (id, playerId) => {
    const mine = get().mine.map((t) =>
      t.id === id ? { ...t, players: t.players.filter((p) => p.id !== playerId) } : t,
    );
    await persist(mine);
    set({ mine });
  },

  remove: async (id) => {
    const mine = get().mine.filter((t) => t.id !== id);
    await persist(mine);
    set({ mine });
  },

  start: async (id) => {
    const t = get().mine.find((x) => x.id === id);
    if (!t) return null;
    if (t.status === "started" || t.status === "finished") return t;
    const pairs = buildPairs(t);
    if (pairs.length < 2) return t; // besoin d'au moins 2 paires
    const matches = buildMatches(t, pairs);
    const updated: Tournament = {
      ...t,
      status: "started",
      pairs,
      matches,
      startedAt: Date.now(),
    };
    const mine = get().mine.map((x) => (x.id === id ? updated : x));
    await persist(mine);
    set({ mine });
    return updated;
  },

  recordResult: async (tournamentId, matchId, scoreA, scoreB) => {
    const t = get().mine.find((x) => x.id === tournamentId);
    if (!t || !t.matches || !t.pairs) return;
    const winnerPairId =
      scoreA > scoreB
        ? t.matches.find((m) => m.id === matchId)?.pairAId
        : t.matches.find((m) => m.id === matchId)?.pairBId;
    if (!winnerPairId) return;
    const matches = t.matches.map((m) =>
      m.id === matchId
        ? {
            ...m,
            status: "finished" as const,
            scoreA,
            scoreB,
            winnerPairId,
            finishedAt: Date.now(),
          }
        : m,
    );
    // Mise à jour des stats des paires
    const match = t.matches.find((m) => m.id === matchId);
    if (!match) return;
    const pairs = t.pairs.map((p) => {
      if (p.id === match.pairAId) {
        return {
          ...p,
          wins: p.wins + (winnerPairId === p.id ? 1 : 0),
          losses: p.losses + (winnerPairId === p.id ? 0 : 1),
          points: p.points + scoreA,
        };
      }
      if (p.id === match.pairBId) {
        return {
          ...p,
          wins: p.wins + (winnerPairId === p.id ? 1 : 0),
          losses: p.losses + (winnerPairId === p.id ? 0 : 1),
          points: p.points + scoreB,
        };
      }
      return p;
    });

    // Mode classique : générer le match du round suivant si on a un couple de winners
    let newMatches = matches;
    if (t.mode === "classique") {
      const currentRound = match.round;
      const roundMatches = matches.filter((m) => m.round === currentRound);
      const allRoundFinished = roundMatches.every((m) => m.status === "finished");
      if (allRoundFinished) {
        const winners = roundMatches.map((m) => m.winnerPairId!).filter(Boolean);
        // Si plusieurs winners, faire le round suivant en les appariant 2 par 2
        if (winners.length >= 2) {
          const nextRound = currentRound + 1;
          for (let i = 0; i < winners.length; i += 2) {
            if (!winners[i + 1]) break;
            newMatches = [
              ...newMatches,
              {
                id: `m${newMatches.length + 1}-r${nextRound}`,
                round: nextRound,
                pairAId: winners[i],
                pairBId: winners[i + 1],
                roomCode: randomCode(4),
                status: "pending",
              },
            ];
          }
        }
      }
    }

    const allFinished = newMatches.every((m) => m.status === "finished");
    const updated: Tournament = {
      ...t,
      matches: newMatches,
      pairs,
      status: allFinished ? "finished" : t.status,
    };
    const mine = get().mine.map((x) => (x.id === tournamentId ? updated : x));
    await persist(mine);
    set({ mine });
  },
}));
