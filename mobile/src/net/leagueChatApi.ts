import { fetchJson } from "./http";

export interface LeagueMessageApi {
  id: string;
  leagueId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  createdAt: number;
}

export async function apiGetLeagueMessages(
  leagueId: string,
  options: { before?: number; limit?: number } = {},
): Promise<LeagueMessageApi[]> {
  const params = new URLSearchParams();
  if (options.before) params.set("before", String(options.before));
  if (options.limit) params.set("limit", String(options.limit));
  const q = params.toString();
  const suffix = q ? `?${q}` : "";
  return fetchJson(`/leagues/${encodeURIComponent(leagueId)}/messages${suffix}`);
}

export async function apiPostLeagueMessage(
  leagueId: string,
  text: string,
): Promise<LeagueMessageApi> {
  return fetchJson(`/leagues/${encodeURIComponent(leagueId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
