import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_DISPLAY, FONT_UI_BOLD, TABLE_COLORS } from "../theme";
import { useGameStore } from "../store/gameStore";
import { ArabesqueDivider } from "../components/Patterns";

/**
 * GameScreen — placeholder conforme à l'esthétique Claude Design.
 * Le vrai plateau de jeu (cartes, plis, main du joueur) viendra dans une feature
 * dédiée. Pour l'instant on affiche juste la phase et le score.
 */
export default function GameScreen() {
  const phase = useGameStore((s) => s.phase);
  const table = TABLE_COLORS.midnight;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[table.base, table.dark]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>MANCHE 1/10</Text>
        <ArabesqueDivider width={200} color={table.accent} />
        <Text style={styles.phase}>{phase}</Text>
      </View>

      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bientôt</Text>
          <Text style={styles.cardBody}>
            Le plateau, ta main, les plis joués — portés depuis le design Claude.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingTop: 80, gap: 10 },
  eyebrow: {
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "600",
  },
  phase: {
    fontFamily: FONT_UI_BOLD,
    color: COLORS.cream,
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.45)",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    maxWidth: 320,
  },
  cardTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    color: COLORS.saffronSoft,
    letterSpacing: 4,
    fontWeight: "700",
  },
  cardBody: {
    fontFamily: FONT_UI_BOLD,
    color: "rgba(245,235,214,0.8)",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 14,
  },
});
