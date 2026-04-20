import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useGameStore } from "../store/gameStore";

export default function GameScreen() {
  const phase = useGameStore((s) => s.phase);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Partie en cours</Text>
      <Text style={styles.subtitle}>Phase : {phase}</Text>
      <Text style={styles.placeholder}>
        Le plateau de jeu, la main du joueur et les plis viendront ici.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#9ca3af" },
  placeholder: { color: "#6b7280", textAlign: "center", marginTop: 24 },
});
