import { initSentry } from "./src/lib/sentry";
// Init Sentry le plus tôt possible — avant même React, pour capturer les
// éventuelles erreurs d'import/boot.
initSentry();

import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Linking, AppState } from "react-native";
import { parseDeepLink, type ParsedDeepLink } from "./src/lib/deepLink";
import { apiHeartbeat } from "./src/net/authApi";
import { registerForPushNotifications } from "./src/lib/pushNotifications";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  useFonts as useCormorantFonts,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";

import SplashScreenTransition from "./src/screens/SplashScreenTransition";
import SignInScreen from "./src/screens/SignInScreen";
import UsernameSetupScreen from "./src/screens/UsernameSetupScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GameScreen from "./src/screens/GameScreen";
import MainTabsNavigator from "./src/navigation/MainTabsNavigator";
import TournamentHomeScreen from "./src/screens/TournamentHomeScreen";
import CreateTournamentScreen from "./src/screens/CreateTournamentScreen";
import JoinTournamentScreen from "./src/screens/JoinTournamentScreen";
import TournamentDetailScreen from "./src/screens/TournamentDetailScreen";
import ScoreSheetsListScreen from "./src/screens/ScoreSheetsListScreen";
import ScoreTrackerScreen from "./src/screens/ScoreTrackerScreen";
import PrivateGameScreen from "./src/screens/PrivateGameScreen";
import RulesScreen from "./src/screens/RulesScreen";
import MatchHistoryScreen from "./src/screens/MatchHistoryScreen";
import QuickMatchScreen from "./src/screens/QuickMatchScreen";
import LeaguesScreen from "./src/screens/LeaguesScreen";
import LeagueDetailScreen from "./src/screens/LeagueDetailScreen";
import LeagueChatScreen from "./src/screens/LeagueChatScreen";
import LeagueActivityScreen from "./src/screens/LeagueActivityScreen";
import LeagueSettingsScreen from "./src/screens/LeagueSettingsScreen";
import DirectMessageScreen from "./src/screens/DirectMessageScreen";
import LeaderboardScreen from "./src/screens/LeaderboardScreen";
import PlayerProfileScreen from "./src/screens/PlayerProfileScreen";
import MatchDetailScreen from "./src/screens/MatchDetailScreen";
import TermsScreen from "./src/screens/TermsScreen";
import { MenuTutorialOverlay } from "./src/components/MenuTutorialOverlay";
import { playMenuMusic, stopMenuMusic } from "./src/sound/soundManager";
import { useLocaleStore } from "./src/lib/i18n";
import { COLORS } from "./src/theme";
import { useAuthStore } from "./src/store/authStore";
import { useNetGameStore } from "./src/store/netGameStore";
import { useLeagueStore } from "./src/store/leagueStore";
import { useMatchHistoryStore } from "./src/store/matchHistoryStore";
import { useTournamentStore } from "./src/store/tournamentStore";
import { useFriendsStore } from "./src/store/friendsStore";
import { useScoreSheetStore } from "./src/store/scoreSheetStore";

export type RootStackParamList = {
  SignIn: undefined;
  UsernameSetup: undefined;
  Onboarding: undefined;
  // Menu principal : navigator à onglets swipeable (Home/Social/Profile/Settings).
  // On garde aussi les 4 noms directs pour que navigation.navigate("Home") etc.
  // depuis n'importe quel écran fonctionne (bubble-up vers le tab navigator).
  // Pour cibler un onglet précis depuis le root stack, utiliser la forme
  // nested : `navigate("MainTabs", { screen: "Social" })`.
  MainTabs: { screen?: "Home" | "Social" | "Profile" | "Settings" } | undefined;
  Home: undefined;
  Game: { mode?: "local" | "net"; tutorial?: boolean } | undefined;
  Social: undefined;
  Profile: undefined;
  Settings: undefined;
  TournamentHome: { code?: string } | undefined;
  CreateTournament: { leagueId?: string } | undefined;
  JoinTournament: { code?: string } | undefined;
  TournamentDetail: { id: string };
  ScoreSheets: undefined;
  ScoreTracker: { sheetId: string };
  PrivateGame: { code?: string } | undefined;
  Rules: undefined;
  MatchHistory: undefined;
  QuickMatch: { code?: string; leagueId?: string } | undefined;
  Leagues: { code?: string } | undefined;
  LeagueDetail: { id: string };
  LeagueChat: { id: string };
  LeagueActivity: { id: string };
  LeagueSettings: { id: string };
  DirectMessage: { otherId: string; otherName: string };
  Leaderboard: { scope?: "league" | "friends" | "global"; sub?: "indiv" | "pairs" } | undefined;
  PlayerProfile: { name: string; friendshipId?: string };
  MatchDetail: { id: string };
  Terms: { section?: "terms" | "privacy" } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Route un deep link parsé vers l'écran approprié. Appelée quand l'user
// est connecté ET la nav est prête.
function routeDeepLink(link: ParsedDeepLink) {
  if (!navigationRef.isReady()) return;
  switch (link.kind) {
    case "private":
      navigationRef.navigate("PrivateGame", { code: link.code });
      break;
    case "quick":
      navigationRef.navigate("QuickMatch", { code: link.code });
      break;
    case "league":
      navigationRef.navigate("Leagues", { code: link.code });
      break;
    case "tournament":
      navigationRef.navigate("JoinTournament", { code: link.code });
      break;
  }
}

// Empêche le splash natif de se cacher automatiquement — on le ferme
// explicitement quand fonts + auth sont prêts.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Verrouille l'app en portrait par défaut. GameScreen débloque la rotation.
ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.terracottaDark,
    card: COLORS.terracottaDark,
    text: COLORS.cream,
    primary: COLORS.brass,
    border: "transparent",
  },
};

export default function App() {
  const [interReady] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [cormorantReady] = useCormorantFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const onboardingDone = useAuthStore((s) => s.onboardingDone);
  const postOnboardingAction = useAuthStore((s) => s.postOnboardingAction);
  const setPostOnboardingAction = useAuthStore((s) => s.setPostOnboardingAction);
  const pendingMenuTutorial = useAuthStore((s) => s.pendingMenuTutorial);
  const setPendingMenuTutorial = useAuthStore((s) => s.setPendingMenuTutorial);
  const setMenuTutorialActive = useAuthStore((s) => s.setMenuTutorialActive);
  const [splashDone, setSplashDone] = useState(false);
  // Deep link en attente — on ne peut pas router tant que l'user n'est pas loggé
  const pendingLinkRef = useRef<ParsedDeepLink | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  // Deep link handler : `touti://<kind>/<CODE>` — route vers l'écran qui gère
  // ce type de code. Si l'user n'est pas encore loggé, on met en attente et on
  // route une fois loggé.
  useEffect(() => {
    const tryRoute = (url: string | null) => {
      if (!url) return;
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      const loggedIn = !!useAuthStore.getState().user?.username;
      if (loggedIn && navigationRef.isReady()) {
        routeDeepLink(parsed);
      } else {
        pendingLinkRef.current = parsed;
      }
    };
    Linking.getInitialURL().then(tryRoute).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => tryRoute(url));
    return () => sub.remove();
  }, []);

  // Une fois l'utilisateur loggé ET onboardé, on flush le deep link en
  // attente. On attend aussi `onboardingDone` pour que l'utilisateur ne soit
  // pas déplacé de l'Onboarding vers une partie/ligue avant d'avoir choisi
  // son parcours. Retry nav-ready (~1.2s max) si la nav n'est pas prête.
  useEffect(() => {
    if (!user?.username || !onboardingDone) return;
    const pending = pendingLinkRef.current;
    if (!pending) return;
    pendingLinkRef.current = null;
    let attempts = 0;
    const tryFlush = () => {
      if (!navigationRef.isReady()) {
        if (attempts++ < 10) setTimeout(tryFlush, 120);
        return;
      }
      routeDeepLink(pending);
    };
    setTimeout(tryFlush, 300);
  }, [user?.username, onboardingDone]);

  // Heartbeat : signale au serveur que l'user est actif (pour statut en ligne).
  // Ping immédiat au login + toutes les 60s tant que l'app est en foreground.
  useEffect(() => {
    if (!user?.username) return;
    const ping = () => { apiHeartbeat().catch(() => {}); };
    ping();
    const timer = setInterval(ping, 60_000);
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") ping();
    });
    return () => {
      clearInterval(timer);
      appStateSub.remove();
    };
  }, [user?.username]);

  // Push notifications : register au login + listener tap → deep link
  useEffect(() => {
    if (!user?.username) return;
    registerForPushNotifications().catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      // DM → ouvre la conversation
      if (data?.kind === "dm" && data?.senderId && data?.senderName) {
        if (navigationRef.isReady()) {
          navigationRef.navigate("DirectMessage", {
            otherId: data.senderId,
            otherName: data.senderName,
          });
        }
        return;
      }
      // Autres : deep link classique (partie, ligue, tournoi)
      if (!data?.kind || !data?.code) return;
      const parsed: ParsedDeepLink = { kind: data.kind, code: data.code };
      if (navigationRef.isReady()) routeDeepLink(parsed);
      else pendingLinkRef.current = parsed;
    });
    return () => sub.remove();
  }, [user?.username]);

  // Refresh périodique des amis pour voir les dots online évoluer (toutes les 90s)
  useEffect(() => {
    if (!user?.username) return;
    const timer = setInterval(() => {
      useFriendsStore.getState().refresh().catch(() => {});
    }, 90_000);
    return () => clearInterval(timer);
  }, [user?.username]);

  // Hydrate les stores locaux une fois au démarrage (y compris la langue)
  useEffect(() => {
    useLocaleStore.getState().hydrate().catch(() => {});
    useNetGameStore.getState().tryReconnect().catch(() => {});
    useMatchHistoryStore.getState().hydrate().catch(() => {});
  }, []);

  // Musique de menu : jouée sur tous les écrans SAUF Game.
  // Écoute les changements de route : si on arrive sur Game, on pause.
  // Sinon (Home/Social/Profile/Settings/Leagues/etc.), on lance.
  useEffect(() => {
    if (!user?.username) return;
    const apply = () => {
      if (!navigationRef.isReady()) return;
      const r = navigationRef.getCurrentRoute();
      if (!r) return;
      if (r.name === "Game") {
        stopMenuMusic().catch(() => {});
      } else {
        playMenuMusic().catch(() => {});
      }
    };
    apply();
    const unsub = navigationRef.addListener("state", apply);
    return () => {
      if (typeof unsub === "function") unsub();
      stopMenuMusic().catch(() => {});
    };
  }, [user?.username]);

  // Post-onboarding : une fois que le stack est en état "in" et qu'on a
  // une action pendante (lancée depuis OnboardingScreen.finish), on navigue.
  // Retries si la nav n'est pas encore prête (le stack venait juste de swap).
  //
  // Cas « Onboarding » : le screen Onboarding existe dans les stacks
  // `needOnboarding` ET `in`, donc React Navigation peut le GARDER focusé
  // après la transition d'auth-state. On FORCE donc un reset du stack vers
  // MainTabs/Home pour sortir explicitement d'Onboarding, peu importe
  // l'action choisie.
  useEffect(() => {
    if (!postOnboardingAction) return;
    if (!user?.username || !onboardingDone) return;
    const action = postOnboardingAction;

    let attempts = 0;
    const tryNavigate = () => {
      if (!navigationRef.isReady()) {
        if (attempts++ < 10) {
          setTimeout(tryNavigate, 120);
        }
        return;
      }
      setPostOnboardingAction(null);
      // Reset systématique vers MainTabs pour ne pas rester bloqué sur
      // l'écran Onboarding. Puis, pour "play", on push Game par-dessus.
      navigationRef.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      if (action === "play") {
        navigationRef.navigate("Game", { mode: "local", tutorial: true });
      }
      // "home" et "menu" : s'arrêtent sur MainTabs/Home.
      // Le menu-tutorial se déclenche via l'effect dédié (pendingMenuTutorial).
    };
    setTimeout(tryNavigate, 150);
  }, [postOnboardingAction, user?.username, onboardingDone, setPostOnboardingAction]);

  // Menu tutorial : quand `pendingMenuTutorial === true` et qu'on est sur
  // MainTabs (donc pas pendant la partie tuto ni sur l'onboarding lui-même),
  // on déclenche l'overlay. Couvre 2 flows :
  //   - "full"  : onboarding → MainTabs → Game (tuto) → retour MainTabs → overlay
  //   - "menu"  : onboarding → MainTabs → overlay direct
  //   - replay depuis Settings : Onboarding (alreadyDone) → Game|back → MainTabs → overlay
  // On attend que `postOnboardingAction` soit consommé (navigation potentielle
  // vers Game finie) avant de regarder la route courante.
  useEffect(() => {
    if (!pendingMenuTutorial) return;
    if (!user?.username || !onboardingDone) return;
    if (postOnboardingAction) return; // la nav post-onboarding n'est pas finie

    const tryShow = (): boolean => {
      if (!navigationRef.isReady()) return false;
      const r = navigationRef.getCurrentRoute();
      if (!r) return false;
      // Pas pendant le jeu ou sur l'écran d'onboarding lui-même
      if (r.name === "Game" || r.name === "Onboarding") return false;
      setPendingMenuTutorial(false);
      setMenuTutorialActive(true);
      return true;
    };

    // Essai immédiat ; sinon on écoute les changements de nav
    if (tryShow()) return;
    const unsub = navigationRef.addListener("state", () => {
      tryShow();
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [
    pendingMenuTutorial,
    user?.username,
    onboardingDone,
    postOnboardingAction,
    setPendingMenuTutorial,
    setMenuTutorialActive,
  ]);

  // Au login, hydrate les stores serveur pour pointer sur le bon compte.
  // Au logout, authStore.signOut() s'occupe de tout vider via clearAllUserData.
  useEffect(() => {
    if (user?.username) {
      useLeagueStore.getState().hydrate(user.username).catch(() => {});
      useTournamentStore.getState().hydrate().catch(() => {});
      useFriendsStore.getState().hydrate(user.username).catch(() => {});
      useScoreSheetStore.getState().hydrate().catch(() => {});
    }
  }, [user?.username]);

  const ready = interReady && cormorantReady && hydrated;

  // Une fois prêt, on cache le splash natif (le logo animé laisse place à l'app)
  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    // Le splash natif tient l'écran pendant ce temps — on ne rend rien côté JS.
    return null;
  }

  // Routing réactif à l'état d'auth :
  //  - pas connecté → SignIn est le SEUL écran
  //  - connecté mais pas de pseudo → UsernameSetup est le SEUL écran
  //  - connecté + pseudo → tous les écrans du jeu disponibles
  // React Navigation gère automatiquement la transition quand on change
  // la liste d'écrans.
  const authState: "out" | "needUsername" | "needOnboarding" | "in" =
    !user
      ? "out"
      : !user.username
      ? "needUsername"
      : !onboardingDone
      ? "needOnboarding"
      : "in";

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {!splashDone && <SplashScreenTransition onDone={() => setSplashDone(true)} />}
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bg },
            animation: "none",
            // Par défaut : pas de swipe-back. On réactive uniquement sur les
            // sections du menu principal (Home / Social / Profile / Settings).
            gestureEnabled: false,
          }}
        >
          {authState === "out" ? (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="Terms" component={TermsScreen} />
            </>
          ) : authState === "needUsername" ? (
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
          ) : authState === "needOnboarding" ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <>
              {/* Menu principal : 4 sections dans un Material Top Tabs avec swipe */}
              <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
              {/* Onboarding : accessible via navigation depuis Settings */}
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              {/* GameScreen : swipe désactivé (hérité du default) — sortie via menu pause */}
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="TournamentHome" component={TournamentHomeScreen} />
              <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
              <Stack.Screen name="JoinTournament" component={JoinTournamentScreen} />
              <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
              <Stack.Screen name="ScoreSheets" component={ScoreSheetsListScreen} />
              <Stack.Screen name="ScoreTracker" component={ScoreTrackerScreen} />
              <Stack.Screen name="PrivateGame" component={PrivateGameScreen} />
              <Stack.Screen name="Rules" component={RulesScreen} />
              <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
              <Stack.Screen name="QuickMatch" component={QuickMatchScreen} />
              <Stack.Screen name="Leagues" component={LeaguesScreen} />
              <Stack.Screen name="LeagueDetail" component={LeagueDetailScreen} />
              <Stack.Screen name="LeagueChat" component={LeagueChatScreen} />
              <Stack.Screen name="LeagueActivity" component={LeagueActivityScreen} />
              <Stack.Screen name="LeagueSettings" component={LeagueSettingsScreen} />
              <Stack.Screen name="DirectMessage" component={DirectMessageScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
              <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
              <Stack.Screen name="Terms" component={TermsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {/* Overlay global — reste au-dessus de toutes les routes (zIndex 9999) */}
      <MenuTutorialOverlay />
      </View>
    </SafeAreaProvider>
  );
}
