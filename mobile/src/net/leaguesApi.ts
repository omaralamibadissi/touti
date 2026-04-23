// Client REST vers le serveur des ligues.

import { fetchJson } from "./http";

export interface LeagueMemberApi {
  name: string;
  joinedAt: number;
  role: "admin" | "member";
}

export interface LeagueApi {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  createdBy: string;
  members: LeagueMemberApi[];
  tagline?: string;
  color?: string;
}

export async function apiCreateLeague(input: {
  name: string;
  createdBy: string;
  tagline?: string;
  color?: string;
}): Promise<LeagueApi> {
  return fetchJson("/leagues", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function apiJoinLeague(code: string, name: string): Promise<LeagueApi> {
  return fetchJson("/leagues/join", {
    method: "POST",
    body: JSON.stringify({ code, name }),
  });
}

export async function apiGetLeague(id: string): Promise<LeagueApi> {
  return fetchJson(`/leagues/${encodeURIComponent(id)}`);
}

export async function apiListMyLeagues(name: string): Promise<LeagueApi[]> {
  return fetchJson(`/leagues?member=${encodeURIComponent(name)}`);
}

export async function apiLeaveLeague(id: string, name: string): Promise<void> {
  await fetchJson(`/leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export async function apiPromoteMember(id: string, name: string): Promise<LeagueApi> {
  return fetchJson(
    `/leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(name)}/promote`,
    { method: "POST" },
  );
}

export async function apiDemoteMember(id: string, name: string): Promise<LeagueApi> {
  return fetchJson(
    `/leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(name)}/demote`,
    { method: "POST" },
  );
}

export async function apiKickMember(id: string, name: string): Promise<LeagueApi> {
  return fetchJson(
    `/leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(name)}/kick`,
    { method: "POST" },
  );
}

export async function apiUpdateLeague(
  id: string,
  patch: { name?: string; tagline?: string; color?: string },
): Promise<LeagueApi> {
  return fetchJson(`/leagues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function apiDeleteLeague(id: string): Promise<void> {
  await fetchJson(`/leagues/${encodeURIComponent(id)}`, { method: "DELETE" });
}
