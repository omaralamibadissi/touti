// Credentials OAuth — REMPLACE les valeurs ci-dessous par tes propres clés.
// Voir docs/auth-setup.md pour la marche à suivre provider par provider.

export const AUTH_CONFIG = {
  google: {
    // Client IDs OAuth 2.0 depuis Google Cloud Console.
    // Pour Expo Go : seul expoClientId (= Web client) est requis.
    // iOS et Android seront remplis plus tard quand on fera un build EAS.
    expoClientId: "738572756114-std9ao18rj5kercau9lhh8n13lpu99h7.apps.googleusercontent.com",
    iosClientId: "REPLACE_ME_GOOGLE_IOS_CLIENT_ID",
    androidClientId: "REPLACE_ME_GOOGLE_ANDROID_CLIENT_ID",
    webClientId: "738572756114-std9ao18rj5kercau9lhh8n13lpu99h7.apps.googleusercontent.com",
  },

  facebook: {
    // App ID Facebook depuis developers.facebook.com
    appId: "REPLACE_ME_FACEBOOK_APP_ID",
  },

  apple: {
    // Apple Sign-In n'a pas de client ID côté client mobile —
    // c'est géré par le SDK Apple. Tu dois juste activer la capability
    // "Sign in with Apple" sur ton bundle ID dans Apple Developer.
    bundleId: "com.omar.touti",
  },
} as const;

// Vérifie si un provider est configuré (pour griser les boutons sinon).
export function isConfigured(provider: "google" | "facebook" | "apple"): boolean {
  if (provider === "google") return !AUTH_CONFIG.google.expoClientId.startsWith("REPLACE_ME");
  if (provider === "facebook") return !AUTH_CONFIG.facebook.appId.startsWith("REPLACE_ME");
  if (provider === "apple") return true; // Apple se vérifie à l'exécution
  return false;
}
