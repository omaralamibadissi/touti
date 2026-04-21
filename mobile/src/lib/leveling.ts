// Système de niveaux & XP. Centralisé ici pour que ProfileScreen,
// Leaderboard et d'éventuels écrans futurs utilisent la même source.
//
// Règles :
//   - Victoire en partie : +100 XP
//   - Défaite en partie   : +30 XP (lot de consolation)
//   - Par manche jouée   : +5 XP
//   - Bonus tournoi gagné : +250 XP
//
// Progression des niveaux (triangulaire) :
//   xpToReachLevel(n) = 100 * n * (n-1) / 2
//   L1=0, L2=100, L3=300, L4=600, L5=1000, L10=4500, L20=19000, L50=122500

import type { MatchEntry } from "../store/matchHistoryStore";

export const XP = {
  WIN: 100,
  LOSS: 30,
  ROUND: 5,
  TOURNAMENT_WIN_BONUS: 250,
} as const;

export function xpFromMatch(m: MatchEntry): number {
  const won = m.winnerTeam === "A";
  let xp = won ? XP.WIN : XP.LOSS;
  xp += m.roundsPlayed * XP.ROUND;
  if (won && m.type === "tournament") xp += XP.TOURNAMENT_WIN_BONUS;
  return xp;
}

export function totalXp(matches: MatchEntry[]): number {
  return matches.filter((m) => m.type !== "irl").reduce((acc, m) => acc + xpFromMatch(m), 0);
}

// Total XP nécessaire pour ATTEINDRE le niveau n (depuis niveau 1)
export function xpToReachLevel(n: number): number {
  if (n <= 1) return 0;
  return (100 * n * (n - 1)) / 2;
}

// Niveau courant à partir du total d'XP
export function levelFromXp(xp: number): number {
  let n = 1;
  while (xpToReachLevel(n + 1) <= xp) n++;
  return n;
}

// Infos de progression vers le niveau suivant
export function levelProgress(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  ratio: number; // 0..1
} {
  const level = levelFromXp(xp);
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = ceil - floor;
  const into = xp - floor;
  return {
    level,
    xpIntoLevel: into,
    xpForNextLevel: span,
    ratio: span === 0 ? 0 : into / span,
  };
}

// Rang textuel selon le niveau
export function rankLabel(level: number): string {
  if (level >= 30) return "LÉGENDE";
  if (level >= 20) return "MAÎTRE";
  if (level >= 10) return "EXPERT";
  if (level >= 5) return "AMATEUR";
  return "DÉBUTANT";
}
