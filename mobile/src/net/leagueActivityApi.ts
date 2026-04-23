import { fetchJson } from "./http";

export type LeagueActivityType =
  | "member_joined"
  | "member_left"
  | "member_kicked"
  | "member_promoted"
  | "member_demoted"
  | "tournament_created"
  | "match_played";

export interface LeagueActivityApi {
  id: string;
  leagueId: string;
  type: LeagueActivityType;
  actorName: string | null;
  targetName: string | null;
  data: Record<string, any> | null;
  createdAt: number;
}

export async function apiGetLeagueActivity(
  leagueId: string,
  options: { before?: number; limit?: number } = {},
): Promise<LeagueActivityApi[]> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", String(options.before));
  if (options.limit) params.set("limit", String(options.limit));
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  return fetchJson(`/leagues/${encodeURIComponent(leagueId)}/activity${suffix}`);
}
