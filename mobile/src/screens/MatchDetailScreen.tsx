import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { PhotoAvatar } from "../components/PhotoAvatar";
import { Card as PlayingCard } from "../components/Card";
import { useMatchHistoryStore, type RoundDetail } from "../store/matchHistoryStore";
import type { Rank, Suit } from "@touti/shared";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "MatchDetail">;

export default function MatchDetailScreen({ navigation, route }: Props) {
  const t = useT();
  const { id } = route.params;
  const match = useMatchHistoryStore((s) => s.matches.find((m) => m.id === id));
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  if (!match) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI }}>{t("common.error")}</Text>
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
  const dateStr = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

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
          <Text style={styles.eyebrow}>{labelType(match.type, t)}</Text>
          <Text style={styles.title}>{won ? t("matchHistory.victory") : t("matchHistory.defeat")}</Text>
          <Text style={styles.date}>{dateStr} · {timeStr}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Totaux */}
        <View style={styles.totals}>
          <TeamBlock
            label={t("common.nous")}
            names={teamAName}
            score={match.scoreA}
            accent={COLORS.brass}
            winner={won}
          />
          <Text style={styles.vs}>·</Text>
          <TeamBlock
            label={t("common.eux")}
            names={teamBName}
            score={match.scoreB}
            accent={COLORS.cream}
            winner={!won}
          />
        </View>

        <View style={styles.metaCard}>
          <MetaRow label={t("matchHistory.detailRounds")} value={String(match.roundsPlayed)} />
          {match.tournamentName && <MetaRow label={t("tournaments.title")} value={match.tournamentName} />}
        </View>

        <Text style={styles.sectionLabel}>{t("matchHistory.detailRounds").toUpperCase()}</Text>
        {rounds.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t("matchHistory.noneBody")}</Text>
          </View>
        ) : (
          <View style={styles.roundsList}>
            <View style={styles.roundsHeader}>
              <Text style={[styles.colHead, { width: 32 }]}>#</Text>
              <Text style={[styles.colHead, { flex: 1 }]}>{t("game.bid")}</Text>
              <Text style={[styles.colHead, { width: 60, textAlign: "right" }]}>{t("common.nous")}</Text>
              <Text style={[styles.colHead, { width: 60, textAlign: "right" }]}>{t("common.eux")}</Text>
            </View>
            {rounds.map((r) => {
              const success = r.bidTeam === "A" ? r.deltaA >= 0 : r.deltaB >= 0;
              const bidderName =
                r.bidWinner != null && match.playerNames[r.bidWinner]
                  ? match.playerNames[r.bidWinner]
                  : "—";
              const hasTricks = r.tricks && r.tricks.length > 0;
              const isExpanded = expandedRound === r.round;
              return (
                <View key={r.round}>
                  <Pressable
                    onPress={() => hasTricks && setExpandedRound(isExpanded ? null : r.round)}
                    style={styles.roundRow}
                  >
                    <Text style={[styles.colNum, { width: 32 }]}>{r.round}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.colBidder}>
                        {bidderName}
                        {r.bidAmount ? ` · ${r.bidAmount}` : ""}
                        {hasTricks && (
                          <Text style={{ color: "rgba(245,235,214,0.5)", fontSize: 10 }}>
                            {"  "}{isExpanded ? "▾" : "▸"} {t("matchHistory.replay")}
                          </Text>
                        )}
                      </Text>
                      <Text
                        style={[
                          styles.colBidStatus,
                          { color: success ? "#3FC26A" : "#E8553A" },
                        ]}
                      >
                        {success ? t("scoreSheets.success") : t("scoreSheets.failure")}
                      </Text>
                    </View>
                    <Text style={[styles.colDelta, { width: 60, color: deltaColor(r.deltaA) }]}>
                      {fmtDelta(r.deltaA)}
                    </Text>
                    <Text style={[styles.colDelta, { width: 60, color: deltaColor(r.deltaB) }]}>
                      {fmtDelta(r.deltaB)}
                    </Text>
                  </Pressable>
                  {isExpanded && hasTricks && (
                    <TricksReplay tricks={r.tricks!} playerNames={match.playerNames} />
                  )}
                </View>
              );
            })}
            {/* Total */}
            <View style={[styles.roundRow, styles.totalRow]}>
              <Text style={[styles.colNum, { width: 32, color: COLORS.saffronSoft }]}>=</Text>
              <Text style={{ flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.cream, fontWeight: "700" }}>
                {t("matchHistory.statsTotal")}
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
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>{t("tournaments.players").toUpperCase()}</Text>
        <View style={styles.playersGrid}>
          {match.playerNames.map((n, i) => {
            const isTeamA = i % 2 === 0;
            return (
              <View key={i} style={[styles.playerChip, { borderColor: isTeamA ? `${COLORS.brass}66` : `${COLORS.cream}33` }]}>
                <PhotoAvatar username={n} size={28} color={isTeamA ? COLORS.brass : COLORS.teal} ring={false} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerName}>{n}</Text>
                  <Text style={[styles.playerTeam, { color: isTeamA ? COLORS.saffronSoft : "rgba(245,235,214,0.6)" }]}>
                    {isTeamA ? t("common.nous") : t("common.eux")}
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

function TricksReplay({
  tricks,
  playerNames,
}: {
  tricks: NonNullable<RoundDetail["tricks"]>;
  playerNames: string[];
}) {
  const t = useT();
  return (
    <View style={styles.tricksWrap}>
      {tricks.map((trick, i) => (
        <View key={i} style={styles.trickBox}>
          <View style={styles.trickHeader}>
            <Text style={styles.trickLabel}>{t("game.trickN", { n: i + 1 })}</Text>
            <Text style={styles.trickWinner}>
              ★ {playerNames[trick.winner] ?? t("game.seatShort", { n: trick.winner })}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6, paddingVertical: 4 }}>
              {trick.entries.map((e, k) => {
                const isWinner = e.player === trick.winner;
                return (
                  <View key={k} style={{ alignItems: "center", gap: 3 }}>
                    <Text style={[styles.trickPlayerName, isWinner && { color: COLORS.saffronSoft }]}>
                      {playerNames[e.player]?.slice(0, 8) ?? "—"}
                    </Text>
                    <PlayingCard
                      rank={e.card.rank as Rank}
                      suit={e.card.suit as Suit}
                      size="sm"
                      highlighted={isWinner}
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ))}
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

function labelType(type: string, t: (k: string) => string): string {
  switch (type) {
    case "solo-ai": return t("matchHistory.typeSolo").toUpperCase();
    case "private": return t("matchHistory.typePrivate").toUpperCase();
    case "quick": return t("matchHistory.typeQuick").toUpperCase();
    case "tournament": return t("matchHistory.typeTournament").toUpperCase();
    case "irl": return t("matchHistory.typeIrl").toUpperCase();
    default: return type.toUpperCase();
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

  tricksWrap: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(245,235,214,0.07)",
    gap: 8,
  },
  trickBox: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 8,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.08)",
  },
  trickHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  trickLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 1,
    color: COLORS.brass, fontWeight: "700",
  },
  trickWinner: {
    fontFamily: FONT_UI_BOLD, fontSize: 10,
    color: COLORS.saffronSoft, fontWeight: "700",
  },
  trickPlayerName: {
    fontFamily: FONT_UI, fontSize: 9,
    color: "rgba(245,235,214,0.65)",
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
