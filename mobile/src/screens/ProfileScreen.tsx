import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD, shade } from "../theme";
import { StarBurst, ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useAuthStore } from "../store/authStore";
import { useMatchHistoryStore, type MatchEntry } from "../store/matchHistoryStore";
import { totalXp, levelProgress, rankLabel } from "../lib/leveling";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const username = user?.username?.trim() || "Joueur";
  const initials = (username[0] ?? "?").toUpperCase();

  const history = useMatchHistoryStore((s) => s.matches) as MatchEntry[];

  // Calculs statistiques dérivés de l'historique (écarte les parties IRL du scoring)
  const stats = useMemo(() => {
    const appMatches = history.filter((m: MatchEntry) => m.type !== "irl");
    const games = appMatches.length;
    const wins = appMatches.filter((m: MatchEntry) => m.winnerTeam === "A").length;
    const losses = games - wins;
    const ratio = games === 0 ? 0 : Math.round((wins / games) * 100);

    let streak = 0;
    for (const m of appMatches) {
      if (m.winnerTeam === "A") streak++;
      else break;
    }

    const totalPoints = appMatches.reduce((acc: number, m: MatchEntry) => acc + m.scoreA, 0);
    const bazzat =
      totalPoints >= 1000
        ? (totalPoints / 1000).toFixed(1).replace(".", ",") + "k"
        : String(totalPoints);

    const xp = totalXp(appMatches);
    const prog = levelProgress(xp);
    const xpLabel =
      xp >= 1000 ? (xp / 1000).toFixed(1).replace(".", ",") + "k" : String(xp);

    return {
      games,
      wins,
      losses,
      ratio,
      streak,
      bazzat,
      xpLabel,
      xp,
      level: prog.level,
      xpIntoLevel: prog.xpIntoLevel,
      xpForNextLevel: prog.xpForNextLevel,
      progressRatio: prog.ratio,
      rank: rankLabel(prog.level),
    };
  }, [history]);

  const recent = useMemo<MatchEntry[]>(
    () => history.filter((m: MatchEntry) => m.type !== "irl").slice(0, 3),
    [history],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + 20 }}>
        {/* Bannière */}
        <View style={styles.banner}>
          <LinearGradient
            colors={[COLORS.terracotta, COLORS.terracottaDark]}
            style={StyleSheet.absoluteFill}
          />
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
              <Text style={styles.name}>{username}</Text>
              <Text style={styles.handle}>@{username.toLowerCase().replace(/\s+/g, "_")}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.expertTag}>
                  <Text style={styles.expertText}>{stats.rank}</Text>
                </View>
              </View>
              {/* Barre de progression vers le niveau suivant */}
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

        {/* Stats — descendu pour ne plus empiéter sur la bannière */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock label="Parties" value={String(stats.games)} />
            <StatBlock label="Victoires" value={String(stats.wins)} highlight />
            <StatBlock label="Ratio" value={stats.games ? `${stats.ratio}%` : "—"} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatBlock label="Série" value={String(stats.streak)} />
            <StatBlock label="Bazzat" value={stats.bazzat} />
            <StatBlock label="XP" value={stats.xpLabel} />
          </View>
        </View>

        {/* Trophées — palette basée sur stats réelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trophées</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {[
              { icon: "★", label: "Champion", unlocked: stats.wins >= 1, color: COLORS.saffron },
              { icon: "◆", label: "5 bazzat", unlocked: stats.wins >= 5, color: COLORS.terracotta },
              { icon: "✦", label: "Série 3", unlocked: stats.streak >= 3, color: "#8B4A7F" },
              { icon: "♦", label: "Niveau 5", unlocked: stats.level >= 5, color: COLORS.brass },
            ].map((a, i) => (
              <View
                key={i}
                style={[
                  styles.trophy,
                  {
                    backgroundColor: a.unlocked ? `${a.color}22` : "rgba(0,0,0,0.3)",
                    borderColor: `${a.color}66`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.trophyIconWrap,
                    { borderColor: a.color, opacity: a.unlocked ? 1 : 0.35, overflow: "hidden" },
                  ]}
                >
                  {a.unlocked && (
                    <LinearGradient
                      colors={[a.color, shade(a.color, -20)]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={styles.trophyIcon}>{a.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.trophyLabel,
                    { color: a.unlocked ? COLORS.cream : "rgba(245,235,214,0.35)" },
                  ]}
                >
                  {a.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Parties récentes — 3 dernières réelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parties récentes</Text>
            {history.length > 3 && (
              <Pressable onPress={() => navigation.navigate("MatchHistory")}>
                <Text style={styles.sectionCount}>Voir tout →</Text>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 6, marginTop: 4 }}>
            {recent.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Aucune partie jouée pour l'instant</Text>
              </View>
            ) : (
              recent.map((m) => {
                const won = m.winnerTeam === "A";
                const partnerName = m.playerNames[2] || "partenaire";
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
                    style={styles.gameRow}
                  >
                    <View style={[styles.wonBar, { backgroundColor: won ? "#3FC26A" : "#E8553A" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gameTitle}>
                        {won ? "Victoire" : "Défaite"} · avec {partnerName}
                      </Text>
                      <Text style={styles.gameSub}>
                        {formatRelativeDate(m.finishedAt)}
                        {m.type === "tournament" && m.tournamentName ? ` · ${m.tournamentName}` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.gameScore, { color: won ? COLORS.saffronSoft : "rgba(245,235,214,0.7)" }]}>
                      {m.scoreA}-{m.scoreB}
                    </Text>
                    <Text style={{ color: "rgba(245,235,214,0.4)", fontSize: 18, marginLeft: 6 }}>›</Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
      <BottomTabBar />
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

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: { height: 240, overflow: "hidden" },
  topBar: { position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },

  idRow: { flexDirection: "row", alignItems: "flex-end", gap: 14, padding: 20, paddingTop: 110 },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.terracottaDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  levelText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  name: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.cream,
    letterSpacing: 0.3,
  },
  handle: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    letterSpacing: 1.5,
    marginTop: 4,
    fontStyle: "italic",
  },
  tagsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  expertTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.saffron,
    borderRadius: 4,
  },
  expertText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 1,
    fontFamily: FONT_UI_BOLD,
  },
  xpBarWrap: { marginTop: 10, gap: 4 },
  xpBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    width: 200,
  },
  xpBarFill: {
    height: 4,
    backgroundColor: COLORS.saffron,
    borderRadius: 2,
  },
  xpBarText: {
    fontFamily: FONT_UI,
    fontSize: 9,
    color: "rgba(245,235,214,0.65)",
    letterSpacing: 0.5,
  },

  statsCard: {
    marginHorizontal: 16,
    marginTop: 14, // ← plus de chevauchement avec la bannière
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  statsGrid: { flexDirection: "row" },
  divider: { height: 0.5, backgroundColor: `${COLORS.brass}44`, marginVertical: 12 },
  statValue: { fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: "700", lineHeight: 26 },
  statLabel: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.75)",
    marginTop: 5,
    fontWeight: "600",
  },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sectionTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  sectionCount: { fontFamily: FONT_UI_BOLD, fontSize: 11, color: COLORS.brass, fontWeight: "700" },

  trophy: {
    width: 94,
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
  },
  trophyIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyIcon: { fontSize: 22, color: "#2B1810", fontWeight: "700" },
  trophyLabel: { fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700", marginTop: 6 },

  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 10,
  },
  wonBar: { width: 8, height: 34, borderRadius: 4 },
  gameTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.cream,
    lineHeight: 14,
  },
  gameSub: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    marginTop: 3,
  },
  gameScore: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "700" },

  emptyBox: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.1)",
  },
  emptyText: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
  },
});
