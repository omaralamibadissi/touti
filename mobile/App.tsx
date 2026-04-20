import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./src/screens/HomeScreen";
import LobbyScreen from "./src/screens/LobbyScreen";
import GameScreen from "./src/screens/GameScreen";

export type RootStackParamList = {
  Home: undefined;
  Lobby: { name: string };
  Game: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#0b0f14" },
            headerTintColor: "#ffffff",
            contentStyle: { backgroundColor: "#0b0f14" },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Touti" }} />
          <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: "Salon" }} />
          <Stack.Screen name="Game" component={GameScreen} options={{ title: "Partie" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
