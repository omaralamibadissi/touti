// Vue read-only du profil d'un autre joueur (un ami).
// Reuse les mêmes calculs (stats, niveau, parties récentes) que ProfileScreen
// mais filtré sur le nom passé en paramètre.

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg, StarBurst } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useMatchHistoryStore, type MatchEntry } from "../store/matchHistoryStore";
import { totalXp, levelProgress, rankLabel } from "../lib/leveling";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerProfile">;

export default function PlayerProfileScreen({ navigation, route }: Props) {
  const { name } = route.params;
  const initials = (name[0] ?? "?").toUpperCase();

  const allMatches = useMatchHistoryStore((s) => s.matches);

  // Parties impliquant ce joueur (humains uniquement, pas IRL)
  const playerMatches = useMemo(
    () => allMatches.filter((m: MatchEntry) =>
      m.type !== "irl" && m.playerNames?.includes(name)
    ),
    [allMatches, name],
  );

  const stats = useMemo(() => {
    const games = playerMatches.length;
    let wins = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const m of playerMatches) {
      const onA = m.playerNames[0] === name || m.playerNames[2] === name;
      const won = (m.winnerTeam === "A" && onA) || (m.winnerTeam === "B" && !onA);
      if (won) wins++;
      if (onA) {
        pointsFor += m.scoreA;
        pointsAgainst += m.scoreB;
      } else {
        pointsFor += m.scoreB;
        pointsAgainst += m.scoreA;
      }
    }
    const losses = games - wins;
    const ratio = games === 0 ? 0 : Math.round((wins / games) * 100);
    const xp = totalXp(playerMatches);
    const prog = levelProgress(xp);
    return {
      games,
      wins,
      losses,
      ratio,
      pointsFor,
      pointsAgainst,
      level: prog.level,
      xpIntoLevel: prog.xpIntoLevel,
      xpForNextLevel: prog.xpForNextLevel,
      progressRatio: prog.ratio,
      rank: rankLabel(prog.level),
    };
  }, [playerMatches, name]);

  // 3 dernières parties
  const recent = useMemo(() => playerMatches.slice(0, 3), [playerMatches]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.banner}>
          <LinearGradient colors={[COLORS.terracotta, COLORS.terracottaDark]} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} pointerEvents="none">
            <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={50} />
          </View>
          <View style={{ position: "absolute", top: -80, right: -60, opacity: 0.25 }} pointerEvents="none">
            <StarBurst size={280} color={COLORS.saffronSoft} strokeW={0.8} />
          </View>

          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
          </View>

          <View style={styles.idRow}>
            <View>
              <Avatar initials={initials} size={84} color={COLORS.teal} />
              <View style={styles.levelBadge}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.levelText}>{stats.level}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.handle}>@{name.toLowerCase().replace(/\s+/g, "_")}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.expertTag}>
                  <Text style={styles.expertText}>{stats.rank}</Text>
                </View>
              </View>
              <View style={styles.xpBarWrap}>
                <View style={styles.xpBarBg}>
                  <View style={[styles.xpBarFill, { width: `${Math.max(2, stats.progressRatio * 100)}%` }]} />
                </View>
                <Text style={styles.xpBarText}>
                  {stats.xpIntoLevel} / {stats.xpForNextLevel} XP → niv. {stats.level + 1}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock label="Parties" value={String(stats.games)} />
            <StatBlock label="Victoires" value={String(stats.wins)} highlight />
            <StatBlock label="Ratio" value={stats.games ? `${stats.ratio}%` : "—"} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatBlock label="Défaites" value={String(stats.losses)} />
            <StatBlock label="Points marqués" value={String(stats.pointsFor)} />
            <StatBlock label="Points encaissés" value={String(stats.pointsAgainst)} />
          </View>
        </View>

        {/* Parties récentes ensemble */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dernières parties</Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            {recent.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Aucune partie commune dans ton historique
                </Text>
              </View>
            ) : (
              recent.map((m) => {
                const onA = m.playerNames[0] === name || m.playerNames[2] === name;
                const won = (m.winnerTeam === "A" && onA) || (m.winnerTeam === "B" && !onA);
                return (
                  <View key={m.id} style={styles.gameRow}>
                    <View style={[styles.wonBar, { backgroundColor: won ? "#3FC26A" : "#E8553A" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gameTitle}>
                        {won ? "Victoire" : "Défaite"} · {new Date(m.finishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </Text>
                      <Text style={styles.gameSub}>
                        {m.playerNames.filter((n) => n !== name).join(" · ")}
                      </Text>
                    </View>
                    <Text style={[styles.gameScore, { color: won ? COLORS.saffronSoft : "rgba(245,235,214,0.7)" }]}>
                      {m.scoreA}-{m.scoreB}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.statValue, { color: highlight ? COLORS.saffronSoft : COLORS.cream }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: { height: 240, overflow: "hidden" },
  topBar: { position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row" },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },

  idRow: { flexDirection: "row", alignItems: "flex-end", gap: 14, padding: 20, paddingTop: 110 },
  levelBadge: {
    position: "absolute", bottom: -4, right: -4,
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.terracottaDark,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  levelText: {
    fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  name: {
    fontFamily: FONT_UI_BOLD, fontSize: 26, fontWeight: "800",
    color: COLORS.cream, letterSpacing: 0.3,
  },
  handle: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    letterSpacing: 1.5, marginTop: 4, fontStyle: "italic",
  },
  tagsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  expertTag: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COLORS.saffron, borderRadius: 4 },
  expertText: {
    fontSize: 9, fontWeight: "800", color: COLORS.terracottaDark,
    letterSpacing: 1, fontFamily: FONT_UI_BOLD,
  },

  xpBarWrap: { marginTop: 10, gap: 4 },
  xpBarBg: {
    height: 4, borderRadius: 2, width: 200,
    backgroundColor: "rgba(0,0,0,0.35)", overflow: "hidden",
  },
  xpBarFill: { height: 4, backgroundColor: COLORS.saffron, borderRadius: 2 },
  xpBarText: {
    fontFamily: FONT_UI, fontSize: 9,
    color: "rgba(245,235,214,0.65)", letterSpacing: 0.5,
  },

  statsCard: {
    marginHorizontal: 16, marginTop: 14,
    padding: 14, backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16, borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  statsGrid: { flexDirection: "row" },
  divider: { height: 0.5, backgroundColor: `${COLORS.brass}44`, marginVertical: 12 },
  statValue: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: "700", lineHeight: 24 },
  statLabel: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.75)", marginTop: 5, fontWeight: "600",
  },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },

  gameRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 10,
  },
  wonBar: { width: 8, height: 34, borderRadius: 4 },
  gameTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream, lineHeight: 14 },
  gameSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 3 },
  gameScore: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "700" },

  emptyBox: {
    padding: 18, backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10, alignItems: "center",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
  },
  emptyText: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.55)", fontStyle: "italic",
  },
});
