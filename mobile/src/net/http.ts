// Fetch helper centralisé — injecte le JWT dans l'en-tête Authorization
// quand un token est disponible. Les API modules (matches, leagues, auth)
// passent tous par ici.

const DEFAULT_URL = "https://kbirkbir-server.fly.dev";
export const API_BASE = (process.env.EXPO_PUBLIC_SERVER_URL || DEFAULT_URL).replace(/^ws/, "http");

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function fetchJson(path: string, init?: RequestInit): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let err = `http ${res.status}`;
    try { const b = await res.json(); err = b?.error ?? err; } catch {}
    const e = new Error(err) as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
