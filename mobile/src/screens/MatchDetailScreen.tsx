import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useMatchHistoryStore, type RoundDetail } from "../store/matchHistoryStore";

type Props = NativeStackScreenProps<RootStackParamList, "MatchDetail">;

export default function MatchDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const match = useMatchHistoryStore((s) => s.matches.find((m) => m.id === id));

  if (!match) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI }}>Partie introuvable</Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { marginTop: 20 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>
    );
  }

  const won = match.winnerTeam === "A";
  const teamAName = `${match.playerNames[0]} & ${match.playerNames[2]}`;
  const teamBName = `${match.playerNames[1]} & ${match.playerNames[3]}`;
  const date = new Date(match.finishedAt);
  const dateStr = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const rounds: RoundDetail[] = match.rounds || [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1a2840", "#0a1428", "#05060c"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.07 }]} pointerEvents="none">
        <ZelligeBg color="#1a2840" accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PARTIE · {labelType(match.type)}</Text>
          <Text style={styles.title}>{won ? "Victoire" : "Défaite"}</Text>
          <Text style={styles.date}>{dateStr} · {timeStr}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Totaux */}
        <View style={styles.totals}>
          <TeamBlock
            label="NOUS"
            names={teamAName}
            score={match.scoreA}
            accent={COLORS.brass}
            winner={won}
          />
          <Text style={styles.vs}>·</Text>
          <TeamBlock
            label="EUX"
            names={teamBName}
            score={match.scoreB}
            accent={COLORS.cream}
            winner={!won}
          />
        </View>

        {/* Méta */}
        <View style={styles.metaCard}>
          <MetaRow label="Manches jouées" value={String(match.roundsPlayed)} />
          {match.tournamentName && <MetaRow label="Tournoi" value={match.tournamentName} />}
        </View>

        {/* Détail manches */}
        <Text style={styles.sectionLabel}>DÉTAIL MANCHE PAR MANCHE</Text>
        {rounds.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Pas de détail enregistré pour cette partie. Le détail manche-par-manche n'est capturé que pour les nouvelles parties depuis la mise à jour.
            </Text>
          </View>
        ) : (
          <View style={styles.roundsList}>
            <View style={styles.roundsHeader}>
              <Text style={[styles.colHead, { width: 32 }]}>M.</Text>
              <Text style={[styles.colHead, { flex: 1 }]}>Mise</Text>
              <Text style={[styles.colHead, { width: 60, textAlign: "right" }]}>NOUS</Text>
              <Text style={[styles.colHead, { width: 60, textAlign: "right" }]}>EUX</Text>
            </View>
            {rounds.map((r) => {
              const success = r.bidTeam === "A" ? r.deltaA >= 0 : r.deltaB >= 0;
              const bidderName =
                r.bidWinner != null && match.playerNames[r.bidWinner]
                  ? match.playerNames[r.bidWinner]
                  : "—";
              return (
                <View key={r.round} style={styles.roundRow}>
                  <Text style={[styles.colNum, { width: 32 }]}>{r.round}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colBidder}>
                      {bidderName}
                      {r.bidAmount ? ` · ${r.bidAmount}` : ""}
                    </Text>
                    <Text
                      style={[
                        styles.colBidStatus,
                        { color: success ? "#3FC26A" : "#E8553A" },
                      ]}
                    >
                      {success ? "réussie" : "ratée"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.colDelta,
                      { width: 60, color: deltaColor(r.deltaA) },
                    ]}
                  >
                    {fmtDelta(r.deltaA)}
                  </Text>
                  <Text
                    style={[
                      styles.colDelta,
                      { width: 60, color: deltaColor(r.deltaB) },
                    ]}
                  >
                    {fmtDelta(r.deltaB)}
                  </Text>
                </View>
              );
            })}
            {/* Total */}
            <View style={[styles.roundRow, styles.totalRow]}>
              <Text style={[styles.colNum, { width: 32, color: COLORS.saffronSoft }]}>=</Text>
              <Text style={{ flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.cream, fontWeight: "700" }}>
                Total
              </Text>
              <Text style={[styles.colDelta, { width: 60, color: COLORS.saffronSoft, fontSize: 16 }]}>
                {match.scoreA}
              </Text>
              <Text style={[styles.colDelta, { width: 60, color: COLORS.saffronSoft, fontSize: 16 }]}>
                {match.scoreB}
              </Text>
            </View>
          </View>
        )}

        {/* Joueurs */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>JOUEURS</Text>
        <View style={styles.playersGrid}>
          {match.playerNames.map((n, i) => {
            const isTeamA = i % 2 === 0;
            return (
              <View key={i} style={[styles.playerChip, { borderColor: isTeamA ? `${COLORS.brass}66` : `${COLORS.cream}33` }]}>
                <Avatar initials={n[0]?.toUpperCase() ?? "?"} size={28} color={isTeamA ? COLORS.brass : COLORS.teal} ring={false} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{n}</Text>
                  <Text style={[styles.playerTeam, { color: isTeamA ? COLORS.saffronSoft : "rgba(245,235,214,0.6)" }]}>
                    {isTeamA ? "NOUS" : "EUX"} · siège {i}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function TeamBlock({
  label,
  names,
  score,
  accent,
  winner,
}: {
  label: string;
  names: string;
  score: number;
  accent: string;
  winner: boolean;
}) {
  return (
    <View style={[styles.teamBlock, winner && { borderColor: COLORS.saffron, borderWidth: 1 }]}>
      <Text style={[styles.teamLabel, { color: accent }]}>{label}</Text>
      <Text style={styles.teamScore}>{score}</Text>
      <Text style={styles.teamNames} numberOfLines={2}>{names}</Text>
      {winner && (
        <View style={styles.crown}>
          <Text style={styles.crownText}>🏆</Text>
        </View>
      )}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function fmtDelta(d: number): string {
  if (d > 0) return `+${d}`;
  return String(d);
}

function deltaColor(d: number): string {
  if (d > 0) return "#3FC26A";
  if (d < 0) return "#E8553A";
  return "rgba(245,235,214,0.5)";
}

function labelType(t: string): string {
  switch (t) {
    case "solo-ai": return "SOLO";
    case "private": return "PRIVÉE";
    case "tournament": return "TOURNOI";
    case "irl": return "IRL";
    default: return t.toUpperCase();
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 2 },
  date: { fontFamily: FONT_UI, fontSize: 12, color: "rgba(245,235,214,0.65)", marginTop: 4 },

  totals: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14, borderWidth: 0.5, borderColor: `${COLORS.brass}33`,
  },
  teamBlock: {
    flex: 1, padding: 12, alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    position: "relative",
  },
  teamLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2,
    fontWeight: "700",
  },
  teamScore: {
    fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: "700",
    color: COLORS.cream, marginTop: 4,
  },
  teamNames: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.65)", textAlign: "center", marginTop: 6,
  },
  crown: {
    position: "absolute", top: -10, right: -6,
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  crownText: { fontSize: 22 },
  vs: { fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.brass },

  metaCard: {
    marginTop: 10, padding: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  metaLabel: { fontFamily: FONT_UI, fontSize: 12, color: "rgba(245,235,214,0.6)" },
  metaValue: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.cream, fontWeight: "700" },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700",
    marginTop: 18, marginBottom: 8,
  },

  roundsList: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    borderWidth: 0.5, borderColor: `${COLORS.brass}33`,
    overflow: "hidden",
  },
  roundsHeader: {
    flexDirection: "row",
    paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: `${COLORS.brass}44`,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  colHead: {
    fontFamily: FONT_UI_BOLD, fontSize: 9, letterSpacing: 1.5,
    color: "rgba(245,235,214,0.6)", fontWeight: "700",
  },
  roundRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: "rgba(245,235,214,0.07)",
  },
  totalRow: {
    backgroundColor: "rgba(212,160,76,0.1)",
    borderTopWidth: 1, borderTopColor: `${COLORS.brass}66`,
    borderBottomWidth: 0,
  },
  colNum: {
    fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: "700",
    color: COLORS.saffronSoft,
  },
  colBidder: {
    fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700",
    color: COLORS.cream,
  },
  colBidStatus: {
    fontFamily: FONT_UI, fontSize: 10, marginTop: 2,
    fontWeight: "700", letterSpacing: 0.5, fontStyle: "italic",
  },
  colDelta: {
    fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: "700",
    textAlign: "right",
  },

  emptyBox: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    borderLeftWidth: 2, borderLeftColor: COLORS.saffron,
  },
  emptyText: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.65)", lineHeight: 18,
    fontStyle: "italic",
  },

  playersGrid: {
    gap: 8,
  },
  playerChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 10, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
  },
  playerName: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
  },
  playerTeam: {
    fontFamily: FONT_UI, fontSize: 9, letterSpacing: 1.5,
    fontWeight: "700", marginTop: 2,
  },
});
