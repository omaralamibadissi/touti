import { fetchJson } from "./http";

export type ReportReason = "insulte" | "triche" | "spam" | "autre";
export type ReportContext = "chat" | "game" | "profile";

export interface ReportApi {
  id: string;
  reporterId: string;
  reportedUsername: string;
  reason: ReportReason;
  context: ReportContext | null;
  roomCode: string | null;
  createdAt: number;
  status: "open" | "reviewed" | "dismissed";
}

export async function apiReport(input: {
  reportedUsername: string;
  reason: ReportReason;
  context?: ReportContext;
  roomCode?: string;
  details?: string;
}): Promise<ReportApi> {
  return fetchJson("/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
