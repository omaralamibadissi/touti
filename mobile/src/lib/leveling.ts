// Système de niveaux & XP. Centralisé ici pour que ProfileScreen,
// Leaderboard et d'éventuels écrans futurs utilisent la même source.
//
// Règles :
//   - Victoire en partie privée / solo  : +100 XP
//   - Défaite en partie privée / solo   : +30 XP (lot de consolation)
//   - Victoire en partie rapide          : +15 XP (faible — encouragé pour la pratique mais ne fait pas level-up rapide)
//   - Défaite en partie rapide           : +5 XP
//   - Par manche jouée                   : +5 XP (ou +1 en quick)
//   - Bonus tournoi gagné                : +250 XP
//   - Partie contenant AU MOINS UN BOT   : 0 XP (toujours, quel que soit le type)
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
  // Parties rapides (matchmaking random) : XP très réduit pour éviter le farming
  QUICK_WIN: 15,
  QUICK_LOSS: 5,
  QUICK_ROUND: 1,
} as const;

// Détecte si une partie contient un bot. Utilise le vrai flag par siège
// (`isBotPerSeat`) qui est renseigné au moment d'enregistrer la partie —
// source de vérité : `PLAYERS[seat].human` côté engine local et `p.isAi`
// côté serveur Colyseus. Fallback sur un pattern de nom uniquement pour
// les anciennes entrées sauvegardées avant l'ajout du champ (back-compat).
export function matchHasBots(m: MatchEntry): boolean {
  if (m.isBotPerSeat && m.isBotPerSeat.length > 0) {
    return m.isBotPerSeat.some(Boolean);
  }
  // Fallback legacy : heuristique sur les noms (ancien comportement).
  return m.playerNames.some((n) => /^IA\s*\d$/i.test(n.trim()));
}

// Retourne l'équipe de l'utilisateur dans le match, ou null si pas joueur.
// Les sièges 0 et 2 sont en équipe A, les sièges 1 et 3 en équipe B.
export function matchUserTeam(
  m: MatchEntry,
  username: string | null | undefined,
): "A" | "B" | null {
  if (!username) return null;
  const target = username.toLowerCase();
  const idx = m.playerNames.findIndex((n) => n && n.toLowerCase() === target);
  if (idx < 0) return null;
  return idx % 2 === 0 ? "A" : "B";
}

// Vrai si l'utilisateur a gagné ce match. Source de vérité unique utilisée
// par MatchHistoryScreen, PlayerProfileScreen, ProfileScreen, etc.
export function matchUserWon(
  m: MatchEntry,
  username: string | null | undefined,
): boolean {
  const team = matchUserTeam(m, username);
  if (team == null) return false;
  return m.winnerTeam === team;
}

export function xpFromMatch(m: MatchEntry): number {
  // Partie avec au moins un bot : 0 XP, toujours. Empêche le farming solo
  // et ne récompense pas une partie rapide dont un humain a abandonné
  // (remplacé par AI côté serveur).
  if (matchHasBots(m)) return 0;
  const won = m.winnerTeam === "A";
  if (m.type === "quick") {
    return (won ? XP.QUICK_WIN : XP.QUICK_LOSS) + m.roundsPlayed * XP.QUICK_ROUND;
  }
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

// Retourne la CLÉ i18n du rang (pas le texte). Les composants doivent
// appliquer t(rankKey(level)) pour afficher la traduction en langue active.
export function rankKey(level: number): string {
  if (level >= 30) return "ranks.legend";
  if (level >= 20) return "ranks.master";
  if (level >= 10) return "ranks.expert";
  if (level >= 5) return "ranks.amateur";
  return "ranks.beginner";
}

// Rang textuel (langue active) — wrapper qui applique t() sur la clé.
export function rankLabel(level: number): string {
  const { t } = require("./i18n") as typeof import("./i18n");
  return t(rankKey(level));
}
