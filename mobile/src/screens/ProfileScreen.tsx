import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD, shade } from "../theme";
import { StarBurst, ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
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
              <Avatar initials="S" size={84} color={COLORS.teal} />
              <View style={styles.levelBadge}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.levelText}>14</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Sara A.</Text>
              <Text style={styles.handle}>@sara_touti</Text>
              <View style={styles.tagsRow}>
                <View style={styles.expertTag}>
                  <Text style={styles.expertText}>EXPERT</Text>
                </View>
                <Text style={styles.location}>CASABLANCA, MA</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock label="Parties" value="284" />
            <StatBlock label="Victoires" value="192" highlight />
            <StatBlock label="Ratio" value="67%" />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatBlock label="Série" value="7" />
            <StatBlock label="Bazzat" value="2,1k" />
            <StatBlock label="XP" value="14,9k" />
          </View>
        </View>

        {/* Trophées */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trophées</Text>
            <Text style={styles.sectionCount}>+8</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {[
              { icon: "★", label: "Champion", unlocked: true, color: COLORS.saffron },
              { icon: "◆", label: "7 bazzat", unlocked: true, color: COLORS.terracotta },
              { icon: "✦", label: "Série 10", unlocked: false, color: "rgba(245,235,214,0.2)" },
              { icon: "♦", label: "Niveau 20", unlocked: false, color: "rgba(245,235,214,0.2)" },
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

        {/* Parties récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parties récentes</Text>
          </View>
          <View style={{ gap: 6, marginTop: 4 }}>
            {[
              { won: true, score: "604-512", partner: "Karim", ts: "il y a 2h" },
              { won: true, score: "620-584", partner: "Khalid", ts: "il y a 5h" },
              { won: false, score: "498-602", partner: "Layla", ts: "hier" },
            ].map((g, i) => (
              <View key={i} style={styles.gameRow}>
                <View style={[styles.wonBar, { backgroundColor: g.won ? "#3FC26A" : "#E8553A" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameTitle}>
                    {g.won ? "Victoire" : "Défaite"} · avec {g.partner}
                  </Text>
                  <Text style={styles.gameSub}>{g.ts}</Text>
                </View>
                <Text style={[styles.gameScore, { color: g.won ? COLORS.saffronSoft : "rgba(245,235,214,0.7)" }]}>
                  {g.score}
                </Text>
              </View>
            ))}
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
  location: {
    fontSize: 10,
    color: "rgba(245,235,214,0.6)",
    letterSpacing: 1,
    fontFamily: FONT_UI,
  },

  statsCard: {
    marginHorizontal: 16,
    marginTop: -24,
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
});
