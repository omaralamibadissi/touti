// Navigator à onglets swipeable pour le menu principal.
// Les 4 sections (Home / Social / Profile / Settings) sont empilées dans un
// Material Top Tabs qui permet de glisser latéralement entre elles. La
// tab bar par défaut est masquée et on rend UN SEUL BottomTabBar ici, en
// dehors du Tab.Navigator pour qu'il reste stable quand l'utilisateur swipe.

import React from "react";
import { View, StyleSheet } from "react-native";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationOptions,
} from "@react-navigation/material-top-tabs";
import HomeScreen from "../screens/HomeScreen";
import SocialScreen from "../screens/SocialScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { BottomTabBar } from "../components/BottomTabBar";

export type MainTabsParamList = {
  Home: undefined;
  Social: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createMaterialTopTabNavigator<MainTabsParamList>();

const screenOptions: MaterialTopTabNavigationOptions = {
  swipeEnabled: true,
  lazy: true,
  animationEnabled: true,
};

export default function MainTabsNavigator() {
  // BottomTabBar rendu via le slot `tabBar` du Tab.Navigator (en dehors de
  // la zone swipeable). Il lit l'onglet actif depuis le state de navigation
  // plutôt que useRoute() qui retournerait "MainTabs" (le parent stack).
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={screenOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
