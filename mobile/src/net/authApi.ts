import { fetchJson } from "./http";

export interface AccountApi {
  id: string;
  username: string;
  email?: string;
  createdAt: number;
  displayName?: string;
  onboardingDone?: boolean;
  photo?: string; // data URL base64 JPEG
}

export interface AuthResponse {
  account: AccountApi;
  token: string;
}

export function apiSignUp(input: {
  username: string;
  password: string;
  email?: string;
}): Promise<AuthResponse> {
  return fetchJson("/auth/signup", { method: "POST", body: JSON.stringify(input) });
}

export function apiSignIn(input: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return fetchJson("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function apiMe(): Promise<{ account: AccountApi }> {
  return fetchJson("/auth/me");
}

export function apiChangePassword(oldPassword: string, newPassword: string): Promise<void> {
  return fetchJson("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export function apiDeleteAccount(): Promise<void> {
  return fetchJson("/auth/me", { method: "DELETE" });
}

export async function apiExportMe(): Promise<any> {
  return fetchJson("/auth/me/export");
}

export function apiOAuth(
  provider: "apple" | "google" | "facebook",
  token: string,
): Promise<AuthResponse & { created: boolean }> {
  return fetchJson(`/auth/oauth/${provider}`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// Signale au serveur que l'utilisateur est actif (heartbeat toutes les 60s).
export async function apiHeartbeat(): Promise<void> {
  await fetchJson("/auth/heartbeat", { method: "POST" });
}

// Enregistre (ou supprime avec null) le token Expo push de l'utilisateur
export async function apiSetPushToken(token: string | null): Promise<void> {
  await fetchJson("/auth/push-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// Marque l'onboarding comme fait côté serveur (cross-device).
export async function apiMarkOnboardingDone(): Promise<void> {
  await fetchJson("/auth/me/onboarding-done", { method: "POST" });
}

// Met à jour la photo de profil. null ou "" = supprimer.
export async function apiSetPhoto(photo: string | null): Promise<void> {
  await fetchJson("/auth/me/photo", {
    method: "POST",
    body: JSON.stringify({ photo }),
  });
}
