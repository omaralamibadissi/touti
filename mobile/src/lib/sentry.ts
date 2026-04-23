// Init Sentry côté mobile (crashes JS + perf basique).
// Tout l'init est gardé par la présence d'un DSN dans app.json → `extra.SENTRY_DSN`.
// Sans DSN, c'est un no-op total (zéro overhead, zéro appel réseau).
//
// Dans Expo Go : seuls les crashes JS sont capturés (pas le code natif).
// Dans un build EAS : crashes natifs + JS.

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn =
    (Constants.expoConfig?.extra as any)?.SENTRY_DSN ||
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    "";
  if (!dsn) {
    // Silencieux — pas de bruit en dev si pas configuré.
    return false;
  }
  try {
    Sentry.init({
      dsn,
      // 20 % des transactions échantillonnées : assez pour détecter les
      // lenteurs sans exploser le quota gratuit (5k events/mois).
      tracesSampleRate: 0.2,
      environment: __DEV__ ? "dev" : "prod",
      // Évite d'envoyer des PII par défaut.
      sendDefaultPii: false,
    });
    initialized = true;
    return true;
  } catch {
    return false;
  }
}

export { Sentry };
