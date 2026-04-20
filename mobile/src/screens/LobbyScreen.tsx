import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useGameStore } from "../store/gameStore";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider } from "../components/Patterns";
import { BrassButton } from "../components/BrassButton";
import { Avatar } from "../components/Avatar";

type Props = NativeStackScreenProps<RootStackParamList, "Lobby">;

export default function LobbyScreen({ route, navigation }: Props) {
  const { name } = route.params;
  const { status, players, connect, sendReady, disconnect, errorMessage } = useGameStore();

  useEffect(() => {
    connect(name);
    return () => disconnect();
  }, [name, connect, disconnect]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#2B1810", "#0D0806"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>SALON · SALA</Text>
        <ArabesqueDivider width={200} color={COLORS.brass} />
        <Text style={styles.statusText}>
          {status === "connecting"
            ? "Connexion…"
            : status === "connected"
            ? `${players.length}/4 joueurs`
            : status === "error"
            ? `Erreur : ${errorMessage ?? ""}`
            : "En attente"}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {players.length === 0 && status === "connecting" && (
          <ActivityIndicator color={COLORS.brass} style={{ marginTop: 40 }} />
        )}
        {players.map((p) => (
          <View key={p.id} style={styles.row}>
            <Avatar initials={p.name[0]?.toUpperCase() ?? "?"} size={40} color={COLORS.teal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {p.name} {p.ready ? "·  prêt" : ""}
              </Text>
              <Text style={styles.meta}>
                Siège {p.seat} · Équipe {p.team + 1}
              </Text>
            </View>
            {p.ready && <View style={styles.readyDot} />}
          </View>
        ))}

        {/* Emplacements libres */}
        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
          <View key={`slot-${i}`} style={[styles.row, styles.slotEmpty]}>
            <View style={styles.slotAvatar} />
            <Text style={styles.slotText}>En attente d'un joueur…</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <BrassButton
          label="Je suis prêt"
          subLabel="ANA WJED"
          large
          onPress={() => sendReady()}
        />
        <BrassButton
          label="Aller au jeu (debug)"
          variant="ghost"
          onPress={() => navigation.replace("Game")}
          style={{ marginTop: 10 }}
        />
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
  statusText: {
    fontFamily: FONT_UI,
    color: "rgba(245,235,214,0.8)",
    fontSize: 13,
    letterSpacing: 1,
  },
  list: { padding: 16, paddingBottom: 140, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.3)",
  },
  slotEmpty: { opacity: 0.5 },
  slotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.brass,
  },
  slotText: {
    color: COLORS.cream,
    fontFamily: FONT_UI,
    fontStyle: "italic",
    opacity: 0.6,
  },
  name: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontWeight: "700", fontSize: 15 },
  meta: { color: "rgba(245,235,214,0.6)", fontSize: 11, marginTop: 2, letterSpacing: 1 },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.statusGreen,
    shadowColor: COLORS.statusGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "rgba(13,8,6,0.6)",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(212,160,76,0.3)",
  },
});
