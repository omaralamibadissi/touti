// Calculs de classements à partir de l'historique de parties.
// Convention du moteur : seats 0+2 = équipe A, 1+3 = équipe B.

import type { MatchEntry } from "../store/matchHistoryStore";
import type { League } from "../store/leagueStore";

export interface PlayerStat {
  name: string;
  games: number;
  wins: number;
  losses: number;
  ratio: number;          // 0..100
  pointsFor: number;      // total de points marqués dans ses parties
  pointsAgainst: number;
}

export interface PairStat {
  key: string;            // "A|B" tri alphabétique
  names: [string, string];
  games: number;
  wins: number;
  losses: number;
  ratio: number;
  pointsFor: number;
  pointsAgainst: number;
}

function isAppMatch(m: MatchEntry): boolean {
  return m.type !== "irl";
}

// Les IA ne comptent pas dans les classements (réservé aux humains réels)
function isAiName(name: string): boolean {
  return /^IA\s*\d+$/i.test(name) || /^Bot\s*\d+$/i.test(name);
}

// Une partie n'apporte de points au classement QUE si les 4 joueurs sont
// des humains réels (aucune IA dans la table).
function isAllHumanMatch(m: MatchEntry): boolean {
  if (!m.playerNames || m.playerNames.length < 4) return false;
  return m.playerNames.every((n) => n && !isAiName(n));
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// Classement individuel : agrégat de toutes les parties de l'app
export function computeIndividualRanking(matches: MatchEntry[]): PlayerStat[] {
  const byName = new Map<string, PlayerStat>();

  for (const m of matches) {
    if (!isAppMatch(m)) continue;
    // Strict : seules les parties 100% humaines comptent pour le classement
    if (!isAllHumanMatch(m)) continue;

    const teamAPlayers = [m.playerNames[0], m.playerNames[2]];
    const teamBPlayers = [m.playerNames[1], m.playerNames[3]];

    const teamAWon = m.winnerTeam === "A";

    for (const name of teamAPlayers) {
      const s = byName.get(name) ?? baseStat(name);
      s.games++;
      if (teamAWon) s.wins++; else s.losses++;
      s.pointsFor += m.scoreA;
      s.pointsAgainst += m.scoreB;
      byName.set(name, s);
    }
    for (const name of teamBPlayers) {
      const s = byName.get(name) ?? baseStat(name);
      s.games++;
      if (!teamAWon) s.wins++; else s.losses++;
      s.pointsFor += m.scoreB;
      s.pointsAgainst += m.scoreA;
      byName.set(name, s);
    }
  }

  const arr = Array.from(byName.values()).map((s) => ({
    ...s,
    ratio: s.games === 0 ? 0 : Math.round((s.wins / s.games) * 100),
  }));

  // Tri : wins desc, puis ratio desc, puis points desc
  arr.sort((a, b) => b.wins - a.wins || b.ratio - a.ratio || b.pointsFor - a.pointsFor);
  return arr;
}

// Classement par paire (qui joue avec qui, combien ils gagnent ensemble)
export function computePairRanking(matches: MatchEntry[]): PairStat[] {
  const byPair = new Map<string, PairStat>();

  for (const m of matches) {
    if (!isAppMatch(m)) continue;
    // Strict : 4 humains requis (pas de paire mi-humaine mi-IA)
    if (!isAllHumanMatch(m)) continue;

    const pairA: [string, string] = [m.playerNames[0], m.playerNames[2]];
    const pairB: [string, string] = [m.playerNames[1], m.playerNames[3]];

    const teamAWon = m.winnerTeam === "A";

    const keyA = pairKey(pairA[0], pairA[1]);
    const sA = byPair.get(keyA) ?? basePair(keyA, pairA);
    sA.games++;
    if (teamAWon) sA.wins++; else sA.losses++;
    sA.pointsFor += m.scoreA;
    sA.pointsAgainst += m.scoreB;
    byPair.set(keyA, sA);

    const keyB = pairKey(pairB[0], pairB[1]);
    const sB = byPair.get(keyB) ?? basePair(keyB, pairB);
    sB.games++;
    if (!teamAWon) sB.wins++; else sB.losses++;
    sB.pointsFor += m.scoreB;
    sB.pointsAgainst += m.scoreA;
    byPair.set(keyB, sB);
  }

  const arr = Array.from(byPair.values()).map((s) => ({
    ...s,
    ratio: s.games === 0 ? 0 : Math.round((s.wins / s.games) * 100),
  }));
  arr.sort((a, b) => b.wins - a.wins || b.ratio - a.ratio || b.pointsFor - a.pointsFor);
  return arr;
}

// Classement filtré à une ligue : la partie compte si TOUS les joueurs sont
// membres de la ligue (cohérent avec la règle "100% humains réels").
export function computeLeagueRanking(
  matches: MatchEntry[],
  league: League,
): { individual: PlayerStat[]; pairs: PairStat[] } {
  const memberNames = new Set(league.members.map((m) => m.name));
  const filtered = matches.filter((m) => {
    if (!isAllHumanMatch(m)) return false;
    return m.playerNames.every((n) => memberNames.has(n));
  });
  return {
    individual: computeIndividualRanking(filtered),
    pairs: computePairRanking(filtered),
  };
}

// Classement filtré aux amis : la partie compte si tous les joueurs sont
// soit toi, soit dans ta liste d'amis.
export function computeFriendsRanking(
  matches: MatchEntry[],
  friendNames: string[],
  myName: string,
): { individual: PlayerStat[]; pairs: PairStat[] } {
  const allowed = new Set([myName, ...friendNames]);
  const filtered = matches.filter((m) => {
    if (!isAllHumanMatch(m)) return false;
    return m.playerNames.every((n) => allowed.has(n));
  });
  return {
    individual: computeIndividualRanking(filtered),
    pairs: computePairRanking(filtered),
  };
}

// Helpers
function baseStat(name: string): PlayerStat {
  return { name, games: 0, wins: 0, losses: 0, ratio: 0, pointsFor: 0, pointsAgainst: 0 };
}
function basePair(key: string, names: [string, string]): PairStat {
  return { key, names, games: 0, wins: 0, losses: 0, ratio: 0, pointsFor: 0, pointsAgainst: 0 };
}
