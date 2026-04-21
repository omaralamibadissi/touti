import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [vib, setVib] = useState(false);
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    // Pas besoin de navigation.reset — App.tsx bascule automatiquement
    // vers SignIn dès que user devient null.
    await signOut();
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + 20 }}>
        <View style={{ height: 60 }} />

        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>RÉGLAGES</Text>
            <Text style={styles.title}>Paramètres</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Group title="Le jeu">
            <Row label="Langue" value="Français" />
            <Row label="Dos des cartes" value="Zellige" swatchColor={COLORS.terracottaDark} />
            <Row label="Couleur de table" value="Bois" swatchColor="#6b4126" />
            <Row label="Vitesse du jeu" value="Normale" last />
          </Group>

          <Group title="Son & Vibrations">
            <Row label="Effets sonores" toggle toggled={sfx} onToggle={() => setSfx((v) => !v)} />
            <Row label="Musique" toggle toggled={music} onToggle={() => setMusic((v) => !v)} />
            <Row label="Vibrations" toggle toggled={vib} onToggle={() => setVib((v) => !v)} last />
          </Group>

          <Group title="Compte">
            <Row label="Notifications" chevron />
            <Row label="Confidentialité" chevron />
            <Row label="Aide" chevron />
            <Row label="Déconnexion" chevron danger last onPress={handleSignOut} />
          </Group>

          <View style={styles.footer}>
            <Text style={styles.version}>TOUTI v0.1.0</Text>
            <Text style={styles.tagline}>Fait avec ♥ au Maroc</Text>
          </View>
        </View>
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  toggle,
  toggled,
  onToggle,
  chevron,
  swatchColor,
  danger,
  last,
  onPress,
}: {
  label: string;
  value?: string;
  toggle?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
  chevron?: boolean;
  swatchColor?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={toggle ? onToggle : onPress}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <Text style={[styles.rowLabel, danger && { color: "#E8553A" }]}>{label}</Text>
      <View style={styles.rowRight}>
        {swatchColor && <View style={[styles.swatch, { backgroundColor: swatchColor }]} />}
        {value !== undefined && !toggle && <Text style={styles.rowValue}>{value}</Text>}
        {toggle && (
          <View
            style={[
              styles.toggle,
              {
                backgroundColor: toggled ? COLORS.brassDeep : "rgba(255,255,255,0.12)",
              },
            ]}
          >
            {toggled && (
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[styles.toggleKnob, { left: toggled ? 20 : 2 }]} />
          </View>
        )}
        {chevron && (
          <Svg width={8} height={14} viewBox="0 0 8 14">
            <Path d="M1 1l6 6-6 6" stroke="rgba(245,235,214,0.35)" strokeWidth={2} fill="none" strokeLinecap="round" />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontFamily: FONT_UI_BOLD, fontWeight: "700" },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 4,
    color: COLORS.brass,
    fontWeight: "700",
  },
  title: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  groupTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brass,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  groupCard: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: "rgba(245,235,214,0.08)" },
  rowLabel: {
    fontFamily: FONT_UI,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.cream,
    flex: 1,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.brass, fontWeight: "600" },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: COLORS.brass,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  toggleKnob: {
    position: "absolute",
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FDF6E3",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },

  footer: { alignItems: "center", marginTop: 24 },
  version: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 4,
    color: "rgba(245,235,214,0.4)",
    fontWeight: "700",
  },
  tagline: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.4)",
    marginTop: 6,
    fontStyle: "italic",
  },
});
