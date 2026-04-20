import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useGameStore } from "../store/gameStore";

type Props = NativeStackScreenProps<RootStackParamList, "Lobby">;

export default function LobbyScreen({ route, navigation }: Props) {
  const { name } = route.params;
  const { status, players, connect, sendReady, disconnect } = useGameStore();

  useEffect(() => {
    connect(name);
    return () => disconnect();
  }, [name, connect, disconnect]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Salon</Text>
      <Text style={styles.status}>Statut : {status}</Text>

      <View style={styles.list}>
        {players.length === 0 && status === "connecting" && <ActivityIndicator color="#ffffff" />}
        {players.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.name}>
              {p.name} {p.ready ? "✅" : "…"}
            </Text>
            <Text style={styles.seat}>Siège {p.seat} · Équipe {p.team + 1}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        onPress={() => sendReady()}
        disabled={status !== "connected"}
      >
        <Text style={styles.buttonText}>Je suis prêt</Text>
      </Pressable>

      <Pressable onPress={() => navigation.replace("Game")}>
        <Text style={styles.link}>Aller à l'écran de jeu (debug)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  title: { color: "#ffffff", fontSize: 28, fontWeight: "700" },
  status: { color: "#9ca3af" },
  list: { gap: 8, marginVertical: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 12,
  },
  name: { color: "#ffffff", fontWeight: "600" },
  seat: { color: "#9ca3af" },
  button: { backgroundColor: "#16a34a", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700" },
  link: { color: "#60a5fa", textAlign: "center", marginTop: 24 },
});
