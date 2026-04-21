// Wrappers OAuth. Chaque fonction retourne un identifiant stable (providerUserId)
// et éventuellement le nom et l'email. Si la config n'est pas remplie,
// la fonction lève une erreur qui sera catchée par l'UI.

import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import { Platform } from "react-native";
import { AUTH_CONFIG, isConfigured } from "./config";

WebBrowser.maybeCompleteAuthSession();

export interface ProviderProfile {
  providerUserId: string;
  name?: string;
  email?: string;
}

// ─── Apple ─────────────────────────────────────────────────────────

export async function signInApple(): Promise<ProviderProfile> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign-In n'est disponible que sur iOS.");
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error(
      "Apple Sign-In indisponible. Expo Go ne le supporte pas — utilise un dev build EAS.",
    );
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const name = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(" ")
        .trim() || undefined
    : undefined;
  return {
    providerUserId: credential.user,
    name,
    email: credential.email ?? undefined,
  };
}

// ─── Google ────────────────────────────────────────────────────────
// Le hook useGoogleAuth gère le flow OAuth. Utilisé côté composant
// via useAuthRequest de expo-auth-session.

function realOrUndef(v: string): string | undefined {
  return v.startsWith("REPLACE_ME") ? undefined : v;
}

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: realOrUndef(AUTH_CONFIG.google.expoClientId),
    iosClientId: realOrUndef(AUTH_CONFIG.google.iosClientId),
    androidClientId: realOrUndef(AUTH_CONFIG.google.androidClientId),
    webClientId: realOrUndef(AUTH_CONFIG.google.webClientId),
    scopes: ["profile", "email", "openid"],
  });
  return { request, response, promptAsync };
}

// Récupère le profil Google à partir de l'access token obtenu via OAuth.
export async function fetchGoogleProfile(accessToken: string): Promise<ProviderProfile> {
  const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google API ${res.status}`);
  const data = await res.json();
  return {
    providerUserId: data.id,
    name: data.name,
    email: data.email,
  };
}

// ─── Facebook ──────────────────────────────────────────────────────

export function useFacebookAuth() {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: AUTH_CONFIG.facebook.appId,
    scopes: ["public_profile", "email"],
  });
  return { request, response, promptAsync };
}

export async function fetchFacebookProfile(accessToken: string): Promise<ProviderProfile> {
  const res = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
  );
  if (!res.ok) throw new Error(`Facebook API ${res.status}`);
  const data = await res.json();
  return {
    providerUserId: data.id,
    name: data.name,
    email: data.email,
  };
}

// ─── Guards ────────────────────────────────────────────────────────

export function requireConfigured(provider: "google" | "facebook" | "apple"): void {
  if (!isConfigured(provider)) {
    throw new Error(
      `${provider} non configuré — remplis les credentials dans mobile/src/auth/config.ts.`,
    );
  }
}
