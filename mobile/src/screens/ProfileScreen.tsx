import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { StarBurst, ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useAuthStore } from "../store/authStore";
import { useMatchHistoryStore, type MatchEntry } from "../store/matchHistoryStore";
import { useTournamentStore } from "../store/tournamentStore";
import { totalXp, levelProgress, rankLabel } from "../lib/leveling";
import { useT } from "../lib/i18n";

// Tournois gagnés : tournois finis où la paire gagnante contient le joueur.
function countTournamentsWon(
  tournaments: { status: string; pairs?: { names: [string, string]; wins: number; points: number }[] }[],
  playerName: string,
): number {
  let n = 0;
  for (const t of tournaments) {
    if (t.status !== "finished" || !t.pairs || t.pairs.length === 0) continue;
    const winner = [...t.pairs].sort((a, b) => b.points - a.points || b.wins - a.wins)[0];
    if (winner.names.includes(playerName)) n++;
  }
  return n;
}

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const username = user?.username?.trim() || t("common.anonymous");
  const initials = (username[0] ?? "?").toUpperCase();

  const history = useMatchHistoryStore((s) => s.matches) as MatchEntry[];
  const tournaments = useTournamentStore((s) => s.mine);

  // Calculs statistiques dérivés de l'historique (écarte les parties IRL du scoring)
  const stats = useMemo(() => {
    const appMatches = history.filter((m: MatchEntry) => m.type !== "irl");
    const games = appMatches.length;
    const wins = appMatches.filter((m: MatchEntry) => m.winnerTeam === "A").length;
    const losses = games - wins;
    const ratio = games === 0 ? 0 : Math.round((wins / games) * 100);

    // Points gagnés = somme scoreA (mon camp) · Points perdus = somme scoreB (adversaires)
    const pointsFor = appMatches.reduce((acc, m) => acc + m.scoreA, 0);
    const pointsAgainst = appMatches.reduce((acc, m) => acc + m.scoreB, 0);

    const tournamentsWon = countTournamentsWon(tournaments, username);

    const xp = totalXp(appMatches);
    const prog = levelProgress(xp);

    return {
      games,
      wins,
      losses,
      ratio,
      pointsFor,
      pointsAgainst,
      tournamentsWon,
      level: prog.level,
      xpIntoLevel: prog.xpIntoLevel,
      xpForNextLevel: prog.xpForNextLevel,
      progressRatio: prog.ratio,
      rank: rankLabel(prog.level),
    };
  }, [history, tournaments, username]);

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
                  {t("profile.xpLine", { into: stats.xpIntoLevel, total: stats.xpForNextLevel, next: stats.level + 1 })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock label={t("common.games")} value={String(stats.games)} />
            <StatBlock label={t("common.victories")} value={String(stats.wins)} highlight />
            <StatBlock label={t("matchHistory.statsRatio")} value={stats.games ? `${stats.ratio}%` : "—"} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatBlock label={t("profile.pointsFor")} value={String(stats.pointsFor)} />
            <StatBlock label={t("profile.pointsAgainst")} value={String(stats.pointsAgainst)} />
            <StatBlock label={t("profile.tournamentsWon")} value={String(stats.tournamentsWon)} highlight />
          </View>
        </View>

        {/* Parties récentes — 3 dernières réelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("matchHistory.title")}</Text>
            {history.length > 3 && (
              <Pressable onPress={() => navigation.navigate("MatchHistory")}>
                <Text style={styles.sectionCount}>{t("common.next")} →</Text>
              </Pressable>
            )}
          </View>
          <View style={{ gap: 6, marginTop: 4 }}>
            {recent.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t("profile.noMatches")}</Text>
              </View>
            ) : (
              recent.map((m) => {
                const won = m.winnerTeam === "A";
                const partnerName = m.playerNames[2] || "—";
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => navigation.navigate("MatchDetail", { id: m.id })}
                    style={styles.gameRow}
                  >
                    <View style={[styles.wonBar, { backgroundColor: won ? "#3FC26A" : "#E8553A" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gameTitle}>
                        {won ? t("matchHistory.victory") : t("matchHistory.defeat")} · {partnerName}
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
  // Intl.RelativeTimeFormat avec la locale par défaut de l'appareil —
  // se traduit automatiquement sans toucher à chaque string.
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" });
    if (mins < 1) return rtf.format(0, "minute");
    if (mins < 60) return rtf.format(-mins, "minute");
    if (hours < 24) return rtf.format(-hours, "hour");
    if (days < 7) return rtf.format(-days, "day");
  } catch {}
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
