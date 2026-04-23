import { fetchJson } from "./http";

export interface MatchmakingStats {
  searching: number;
  avgWaitSec: number;
}

export async function apiMatchmakingStats(): Promise<MatchmakingStats> {
  return fetchJson("/stats/matchmaking");
}

export interface HybridCandidate {
  hybrid: boolean;
  code?: string;
  roomId?: string;
}

// Cherche une room hybride (amis + randoms) ouverte au pool matchmaking
export async function apiHybridCandidate(): Promise<HybridCandidate> {
  return fetchJson("/matchmaking/pool-candidates");
}
