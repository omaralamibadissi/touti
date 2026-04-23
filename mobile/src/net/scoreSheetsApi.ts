import { fetchJson } from "./http";

export type Team = "A" | "B";

export interface ScoreRoundApi {
  id: string;
  num: number;
  dealer: string;
  male: string;
  buyerTeam: Team;
  buyer: string;
  bid: number;
  success: boolean;
  delta: { A: number; B: number };
}

export interface ScoreSheetApi {
  id: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  names: [string, string, string, string];
  rounds: ScoreRoundApi[];
  dealerIdx: number;
  status: "in-progress" | "finished";
  winner: Team | null;
}

export async function apiListSheets(): Promise<ScoreSheetApi[]> {
  return fetchJson("/score-sheets");
}

export async function apiCreateSheet(
  names: [string, string, string, string],
): Promise<ScoreSheetApi> {
  return fetchJson("/score-sheets", {
    method: "POST",
    body: JSON.stringify({ names }),
  });
}

export async function apiGetSheet(id: string): Promise<ScoreSheetApi> {
  return fetchJson(`/score-sheets/${encodeURIComponent(id)}`);
}

export async function apiUpdateSheet(
  id: string,
  patch: {
    names?: [string, string, string, string];
    dealerIdx?: number;
    status?: "in-progress" | "finished";
    winner?: Team | null;
  },
): Promise<ScoreSheetApi> {
  return fetchJson(`/score-sheets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function apiAddRound(
  id: string,
  round: ScoreRoundApi,
  winner: Team | null,
  status: "in-progress" | "finished",
): Promise<ScoreSheetApi> {
  return fetchJson(`/score-sheets/${encodeURIComponent(id)}/rounds`, {
    method: "POST",
    body: JSON.stringify({ round, winner, status }),
  });
}

export async function apiResetSheet(id: string): Promise<ScoreSheetApi> {
  return fetchJson(`/score-sheets/${encodeURIComponent(id)}/reset`, {
    method: "POST",
  });
}

export async function apiDeleteSheet(id: string): Promise<void> {
  return fetchJson(`/score-sheets/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
