import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_UI_BOLD } from "../theme";
import type { NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import type { MaterialTopTabBarProps } from "@react-navigation/material-top-tabs";

type TabKey = "Home" | "Social" | "Profile" | "Settings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "Home", label: "Accueil" },
  { key: "Social", label: "Social" },
  { key: "Profile", label: "Profil" },
  { key: "Settings", label: "Réglages" },
];

// Icônes Lucide (MIT) — rendu propre via multi-paths.
function TabIcon({ tab, color }: { tab: TabKey; color: string }) {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {tab === "Home" && (
        <>
          <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...common} />
          <Path d="M9 22V12h6v10" {...common} />
        </>
      )}
      {tab === "Social" && (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...common} />
          <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" {...common} />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" {...common} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...common} />
        </>
      )}
      {tab === "Profile" && (
        <>
          <Path d="M20 21a8 8 0 0 0-16 0" {...common} />
          <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" {...common} />
        </>
      )}
      {tab === "Settings" && (
        <>
          <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" {...common} />
          <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" {...common} />
        </>
      )}
    </Svg>
  );
}

// Peut être utilisé de 2 manières :
//  - sans props : lit l'onglet actif via useNavigationState (fallback)
//  - avec props Material Top Tab : le state passé par le Tab.Navigator est
//    mis à jour instantanément au tap (avant que le swipe ne se termine),
//    donc le logo / dot change immédiatement
export function BottomTabBar(props: Partial<MaterialTopTabBarProps> = {}) {
  const fallbackNav = useNavigation<NavigationProp<RootStackParamList>>();
  const navigation = (props.navigation as any) ?? fallbackNav;

  const fallbackActive = useNavigationState((state) => {
    const current = state?.routes?.[state.index];
    if (!current) return "Home" as TabKey;
    const inner = (current.state as any)?.routes?.[(current.state as any).index];
    const name = inner?.name ?? current.name;
    return name as TabKey;
  });
  // Si on est dans le slot `tabBar` du Material Top Tabs, props.state est
  // mis à jour avant le swipe → l'onglet actif se met à jour tout de suite.
  const active: TabKey = props.state
    ? (props.state.routes[props.state.index]?.name as TabKey)
    : fallbackActive;

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["rgba(10,5,3,0.92)", "rgba(10,5,3,1)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBorder} />
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <Pressable
              key={t.key}
              style={styles.tab}
              onPress={() => {
                if (!on) navigation.navigate(t.key as any);
              }}
            >
              <TabIcon tab={t.key} color={on ? COLORS.saffron : "rgba(245,235,214,0.55)"} />
              <Text style={[styles.label, on && { color: COLORS.saffron }]}>{t.label}</Text>
              {on && <View style={styles.activeDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const BOTTOM_TAB_HEIGHT = 70;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_TAB_HEIGHT,
    overflow: "hidden",
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: `${COLORS.brass}66`,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 0.3,
    color: "rgba(245,235,214,0.55)",
    fontWeight: "700",
  },
  activeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.saffron,
    marginTop: 1,
  },
});
