import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useMatchHistoryStore, MatchEntry, MatchType } from "../store/matchHistoryStore";

type Props = NativeStackScreenProps<RootStackParamList, "MatchHistory">;

export default function MatchHistoryScreen({ navigation }: Props) {
  const matches = useMatchHistoryStore((s) => s.matches);
  const hydrate = useMatchHistoryStore((s) => s.hydrate);
  const clear = useMatchHistoryStore((s) => s.clear);

  useEffect(() => { hydrate(); }, [hydrate]);

  const totalPlayed = matches.length;
  const won = matches.filter((m) => m.winnerTeam === "A").length; // suppose l'utilisateur est toujours en équipe A
  const ratio = totalPlayed > 0 ? Math.round((won / totalPlayed) * 100) : 0;

  const onClear = () => {
    if (matches.length === 0) return;
    Alert.alert(
      "Effacer tout l'historique ?",
      "Cette action supprime toutes les parties enregistrées.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Tout effacer", style: "destructive", onPress: clear },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>HISTORIQUE</Text>
          <Text style={styles.title}>Mes parties</Text>
        </View>
        {matches.length > 0 && (
          <Pressable style={styles.iconBtn} onPress={onClear}>
            <Text style={styles.iconBtnText}>🗑</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBlock label="Parties" value={String(totalPlayed)} />
          <StatBlock label="Victoires" value={String(won)} highlight />
          <StatBlock label="Ratio" value={`${ratio}%`} />
        </View>

        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune partie jouée</Text>
            <Text style={styles.emptySub}>
              Les parties finies s'afficheront ici (Partie rapide, Tournoi, IRL…).
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8, marginTop: 16 }}>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: highlight ? COLORS.saffronSoft : COLORS.cream }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MatchRow({ match }: { match: MatchEntry }) {
  const won = match.winnerTeam === "A";
  const dateLabel = formatDate(match.finishedAt);
  const typeLabel = typeName(match.type);
  return (
    <View style={styles.matchRow}>
      <View style={[styles.sideBar, { backgroundColor: won ? "#3FC26A" : "#E8553A" }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={styles.matchType}>{typeLabel}</Text>
          {match.tournamentName && <Text style={styles.tournamentTag}>· {match.tournamentName}</Text>}
        </View>
        <Text style={styles.matchPlayers} numberOfLines={1}>
          {match.playerNames[0]} · {match.playerNames[2]} vs {match.playerNames[1]} · {match.playerNames[3]}
        </Text>
        <Text style={styles.matchMeta}>
          {won ? "Victoire" : "Défaite"} · {dateLabel} · {match.roundsPlayed} manche{match.roundsPlayed > 1 ? "s" : ""}
        </Text>
      </View>
      <View style={styles.scoreBox}>
        <Text style={[styles.scoreNum, { color: COLORS.saffronSoft }]}>{match.scoreA}</Text>
        <Text style={styles.scoreDash}>—</Text>
        <Text style={[styles.scoreNum, { color: COLORS.cream }]}>{match.scoreB}</Text>
      </View>
    </View>
  );
}

function typeName(t: MatchType): string {
  if (t === "solo-ai") return "Partie rapide · IA";
  if (t === "private") return "Partie privée";
  if (t === "tournament") return "Tournoi";
  if (t === "irl") return "IRL (compteur)";
  return t;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 16, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 10 },
  statBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 14,
  },
  statValue: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: "700", lineHeight: 30 },
  statLabel: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2, color: "rgba(245,235,214,0.6)", fontWeight: "700", marginTop: 6 },

  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 12,
  },
  sideBar: { width: 4, height: 42, borderRadius: 2 },
  matchType: { fontFamily: FONT_UI_BOLD, fontSize: 11, color: COLORS.brass, letterSpacing: 1.5, fontWeight: "700" },
  tournamentTag: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.55)", fontStyle: "italic" },
  matchPlayers: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700", marginTop: 2 },
  matchMeta: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 3 },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreNum: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700" },
  scoreDash: { fontFamily: FONT_DISPLAY, fontSize: 12, color: "rgba(245,235,214,0.35)", fontWeight: "500" },

  empty: { alignItems: "center", padding: 40 },
  emptyTitle: { fontFamily: FONT_UI_BOLD, fontSize: 15, color: COLORS.cream, fontWeight: "700" },
  emptySub: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.55)",
    marginTop: 6,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 17,
  },
});
