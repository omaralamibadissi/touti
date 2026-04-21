import React, { useCallback, useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
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
import HomeScreen from "./src/screens/HomeScreen";
import GameScreen from "./src/screens/GameScreen";
import SocialScreen from "./src/screens/SocialScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
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
import { COLORS } from "./src/theme";
import { useAuthStore } from "./src/store/authStore";

export type RootStackParamList = {
  SignIn: undefined;
  UsernameSetup: undefined;
  Home: undefined;
  Game: { mode?: "local" | "net" } | undefined;
  Social: undefined;
  Profile: undefined;
  Settings: undefined;
  TournamentHome: undefined;
  CreateTournament: undefined;
  JoinTournament: undefined;
  TournamentDetail: { id: string };
  ScoreSheets: undefined;
  ScoreTracker: { sheetId: string };
  PrivateGame: undefined;
  Rules: undefined;
  MatchHistory: undefined;
  QuickMatch: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

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
  const authState: "out" | "needUsername" | "in" =
    !user ? "out" : !user.username ? "needUsername" : "in";

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {!splashDone && <SplashScreenTransition onDone={() => setSplashDone(true)} />}
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bg },
            animation: "none",
          }}
        >
          {authState === "out" ? (
            <Stack.Screen name="SignIn" component={SignInScreen} />
          ) : authState === "needUsername" ? (
            <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Game" component={GameScreen} />
              <Stack.Screen name="Social" component={SocialScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
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
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
