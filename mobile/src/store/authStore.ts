// Auth serveur-backed : inscription + connexion via /auth/*, JWT persisté
// dans expo-secure-store (keystore iOS / Android KeyChain).

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { apiSignUp, apiSignIn, apiMe, apiDeleteAccount, apiOAuth, apiMarkOnboardingDone, type AccountApi } from "../net/authApi";
import { setAuthToken } from "../net/http";

export type AuthProvider = "apple" | "google" | "facebook" | "password";

export interface AuthUser {
  provider: AuthProvider;
  providerUserId: string;
  username: string | null;
  displayName?: string;
  email?: string;
  photo?: string; // data URL base64 (JPEG 200x200)
}

interface AuthState {
  hydrated: boolean;
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  busy: boolean;
  onboardingDone: boolean;
  coachmarksDone: boolean;
  // Action à jouer une fois l'onboarding terminé et la nav en état "in".
  // Consommée par un effect dans App.tsx puis remise à null.
  //  - "play"    : lance une partie solo en mode tutoriel (1 manche)
  //  - "home"    : reste sur MainTabs (pas de nav, mais utilisé pour consommer le flag)
  //  - "menu"    : lance le tuto menu direct (sans partie préalable)
  postOnboardingAction: "play" | "home" | "menu" | null;
  // Le menu-tutorial est en attente de démarrage (à activer quand la nav
  // atteint MainTabs). Mis par OnboardingScreen ou après la partie tutoriel.
  pendingMenuTutorial: boolean;
  // Le menu-tutorial est actuellement actif (overlay affiché).
  menuTutorialActive: boolean;

  hydrate: () => Promise<void>;
  signUp: (input: { username: string; password: string; email?: string }) => Promise<void>;
  signIn: (input: { username: string; password: string }) => Promise<void>;
  // Compat : ancien flow OAuth — on le conserve stubbed pour éviter les régressions
  signInWithProfile: (provider: AuthProvider, profile: { providerUserId: string; name?: string; email?: string }) => Promise<void>;
  signInWithOAuth: (provider: "apple" | "google" | "facebook", token: string) => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  markOnboardingDone: () => Promise<void>;
  markCoachmarksDone: () => Promise<void>;
  updatePhoto: (photo: string | null) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setPostOnboardingAction: (a: "play" | "home" | "menu" | null) => void;
  setPendingMenuTutorial: (v: boolean) => void;
  setMenuTutorialActive: (v: boolean) => void;
}

const TOKEN_KEY = "touti.auth.token.v1";
const USER_KEY = "touti.auth.user.v1";
const ONBOARDING_KEY = "touti.onboarding.done.v1";
const COACHMARKS_KEY = "touti.coachmarks.done.v1";

async function storeToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    setAuthToken(token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
  }
}

async function storeUser(user: AuthUser | null) {
  if (user) {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } else {
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  }
}

function accountToAuthUser(account: AccountApi): AuthUser {
  return {
    provider: "password",
    providerUserId: account.id,
    username: account.username,
    displayName: account.displayName,
    email: account.email,
    photo: account.photo,
  };
}

// Vide toutes les données liées à l'utilisateur (caches + état réseau).
// Imports dynamiques pour éviter les cycles d'import au chargement du module.
async function clearAllUserData() {
  try {
    const [
      { useFriendsStore },
      { useMatchHistoryStore },
      { useTournamentStore },
      { useLeagueStore },
      { useNetGameStore },
      { useScoreSheetStore },
      { useLeagueChatStore },
      { useDirectMessagesStore },
    ] = await Promise.all([
      import("./friendsStore"),
      import("./matchHistoryStore"),
      import("./tournamentStore"),
      import("./leagueStore"),
      import("./netGameStore"),
      import("./scoreSheetStore"),
      import("./leagueChatStore"),
      import("./directMessagesStore"),
    ]);
    await Promise.allSettled([
      useNetGameStore.getState().disconnect(),
      useFriendsStore.getState().clear(),
      useMatchHistoryStore.getState().clear(),
      useTournamentStore.getState().clear(),
      useLeagueStore.getState().clear(),
      useScoreSheetStore.getState().clear(),
      useLeagueChatStore.getState().clear(),
      useDirectMessagesStore.getState().clear(),
      // Désinscrit aussi le push token serveur (best effort, avant que le JWT disparaisse)
      (async () => {
        try {
          const { unregisterPushNotifications } = await import("../lib/pushNotifications");
          await unregisterPushNotifications();
        } catch {}
      })(),
    ]);
  } catch (e) {
    console.warn("[authStore] clearAllUserData failed", e);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  user: null,
  token: null,
  error: null,
  busy: false,
  onboardingDone: false,
  coachmarksDone: false,
  postOnboardingAction: null,
  pendingMenuTutorial: false,
  menuTutorialActive: false,

  hydrate: async () => {
    try {
      const [token, userRaw, obRaw, cmRaw] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(COACHMARKS_KEY),
      ]);
      const user: AuthUser | null = userRaw ? JSON.parse(userRaw) : null;
      if (token) setAuthToken(token);
      set({
        token,
        user,
        hydrated: true,
        onboardingDone: obRaw === "1",
        coachmarksDone: cmRaw === "1",
      });
      // Validation silencieuse du token : si invalide côté serveur, on déconnecte.
      // Au passage, on rapatrie `onboardingDone` depuis le serveur — c'est LA
      // source de vérité (cross-device) ; le cache AsyncStorage n'est utilisé
      // qu'en optimistic read le temps que le serveur réponde.
      if (token) {
        try {
          const { account } = await apiMe();
          const refreshed = accountToAuthUser(account);
          await storeUser(refreshed);
          const serverOb = !!account.onboardingDone;
          if (serverOb) {
            await AsyncStorage.setItem(ONBOARDING_KEY, "1").catch(() => {});
          }
          set({ user: refreshed, onboardingDone: serverOb });
        } catch (e: any) {
          if (e?.status === 401 || e?.status === 404) {
            // Token invalide ou compte supprimé → signOut silencieux complet
            console.warn("[authStore] token invalid, signing out");
            await clearAllUserData();
            await storeToken(null);
            await storeUser(null);
            set({ user: null, token: null });
          }
        }
      }
    } catch {
      set({ hydrated: true });
    }
  },

  signUp: async (input) => {
    set({ busy: true, error: null });
    try {
      const { account, token } = await apiSignUp(input);
      const user = accountToAuthUser(account);
      await storeToken(token);
      await storeUser(user);
      // Nouveau compte : onboarding NON fait.
      await AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
      set({ user, token, busy: false, onboardingDone: !!account.onboardingDone });
    } catch (e: any) {
      set({ error: e?.message ?? "Inscription impossible", busy: false });
      throw e;
    }
  },

  signIn: async (input) => {
    set({ busy: true, error: null });
    try {
      const { account, token } = await apiSignIn(input);
      const user = accountToAuthUser(account);
      await storeToken(token);
      await storeUser(user);
      // onboardingDone vient du SERVEUR (cross-device). Si l'utilisateur
      // a déjà fait l'onboarding sur n'importe quel appareil, on skip.
      const serverOb = !!account.onboardingDone;
      if (serverOb) await AsyncStorage.setItem(ONBOARDING_KEY, "1").catch(() => {});
      else await AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
      set({ user, token, busy: false, onboardingDone: serverOb });
    } catch (e: any) {
      const { t } = await import("../lib/i18n");
      set({ error: e?.message ?? t("auth.connectionFailed"), busy: false });
      throw e;
    }
  },

  signInWithProfile: async (provider, profile) => {
    // Compat : ancien signature. Ne devrait plus être appelé.
    set({ error: "[Deprecated] Use signInWithOAuth instead." });
  },

  // Nouveau : reçoit le token OAuth du provider, envoie au serveur pour vérif
  signInWithOAuth: async (provider: "apple" | "google" | "facebook", token: string) => {
    set({ busy: true, error: null });
    try {
      const { account, token: jwt } = await apiOAuth(provider, token);
      const user = accountToAuthUser(account);
      user.provider = provider;
      await storeToken(jwt);
      await storeUser(user);
      const serverOb = !!account.onboardingDone;
      if (serverOb) await AsyncStorage.setItem(ONBOARDING_KEY, "1").catch(() => {});
      else await AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
      set({ user, token: jwt, busy: false, onboardingDone: serverOb });
    } catch (e: any) {
      set({ error: e?.message ?? "OAuth failed", busy: false });
      throw e;
    }
  },

  setUsername: async (_name) => {
    // Le username est figé à la signup (serveur-side). No-op maintenant.
    return;
  },

  deleteAccount: async () => {
    // Quitter toute room Colyseus en cours avant de tuer le compte côté serveur
    try {
      const { useNetGameStore } = await import("./netGameStore");
      await useNetGameStore.getState().disconnect();
    } catch {}
    // Si le serveur refuse la suppression, on ne veut PAS déconnecter le
    // client localement (sinon compte orphelin actif serveur + impossible
    // de récupérer sa session). On remonte l'erreur à l'écran appelant.
    await apiDeleteAccount();
    await clearAllUserData();
    await storeToken(null);
    await storeUser(null);
    await AsyncStorage.multiRemove([ONBOARDING_KEY, COACHMARKS_KEY]).catch(() => {});
    // Reset COMPLET des flags d'onboarding et de tutoriel. Sinon un flag
    // (ex. pendingMenuTutorial) survit et pollue la session du prochain user.
    set({
      user: null,
      token: null,
      onboardingDone: false,
      coachmarksDone: false,
      postOnboardingAction: null,
      pendingMenuTutorial: false,
      menuTutorialActive: false,
    });
  },

  signOut: async () => {
    await clearAllUserData();
    await storeToken(null);
    await storeUser(null);
    await AsyncStorage.multiRemove([ONBOARDING_KEY, COACHMARKS_KEY]).catch(() => {});
    set({
      user: null,
      token: null,
      onboardingDone: false,
      coachmarksDone: false,
      postOnboardingAction: null,
      pendingMenuTutorial: false,
      menuTutorialActive: false,
    });
  },

  clearError: () => set({ error: null }),

  markOnboardingDone: async () => {
    // Source de vérité : serveur (cross-device). Si l'API échoue (offline),
    // on marque tout de même en local — quand le user sera online, soit le
    // prochain hydrate() rapatrie le vrai flag serveur, soit l'utilisateur
    // re-finit l'onboarding et on re-push au serveur.
    try {
      await apiMarkOnboardingDone();
    } catch (e) {
      console.warn("[authStore] markOnboardingDone: push serveur échoué, fallback local", e);
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    set({ onboardingDone: true });
  },

  markCoachmarksDone: async () => {
    await AsyncStorage.setItem(COACHMARKS_KEY, "1");
    set({ coachmarksDone: true });
  },

  updatePhoto: async (photo: string | null) => {
    const current = get().user;
    if (!current) return;
    // Optimiste : on applique localement, on synchronise serveur en best-effort.
    const updated: AuthUser = { ...current, photo: photo ?? undefined };
    await storeUser(updated);
    set({ user: updated });
    try {
      const { apiSetPhoto } = await import("../net/authApi");
      await apiSetPhoto(photo);
    } catch (e) {
      console.warn("[authStore] updatePhoto: push serveur échoué", e);
    }
  },

  resetOnboarding: async () => {
    await AsyncStorage.multiRemove([ONBOARDING_KEY, COACHMARKS_KEY]);
    set({ onboardingDone: false, coachmarksDone: false });
  },

  setPostOnboardingAction: (a) => set({ postOnboardingAction: a }),
  setPendingMenuTutorial: (v) => set({ pendingMenuTutorial: v }),
  setMenuTutorialActive: (v) => set({ menuTutorialActive: v }),
}));
