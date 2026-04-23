import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD, SPACING, shade } from "../theme";
import { ZelligeBg, ArabesqueDivider, StarBurst } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useAuthStore } from "../store/authStore";
import { useMatchHistoryStore } from "../store/matchHistoryStore";
import { totalXp, levelProgress } from "../lib/leveling";
import { hapticTap } from "../lib/haptics";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const name = user?.username ?? "";
  const canPlay = name.length > 0;

  const matches = useMatchHistoryStore((s) => s.matches);
  const xp = totalXp(matches);
  const prog = levelProgress(xp);

  return (
    <View style={styles.root}>
      {/* Fond dégradé terracotta */}
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Motif zellige en filigrane */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>
      {/* Explosion d'étoiles décorative */}
      <View
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          marginLeft: -210,
          opacity: 0.1,
        }}
        pointerEvents="none"
      >
        <StarBurst size={420} color={COLORS.saffronSoft} strokeW={0.6} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header profil */}
        <View style={styles.header}>
          <Pressable style={styles.profile} onPress={() => { hapticTap(); navigation.navigate("Profile"); }}>
            <Avatar initials={name.trim()[0]?.toUpperCase() || "?"} size={40} color={COLORS.teal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{name.trim() ? name.trim() : t("common.anonymous")}</Text>
              <View style={styles.levelRow}>
                <Text style={styles.levelText}>{t("common.level").toUpperCase()} {prog.level}</Text>
                <View style={styles.levelBarBg}>
                  <View style={[styles.levelBarFill, { width: `${Math.max(2, prog.ratio * 100)}%` }]} />
                </View>
                <Text style={styles.levelXp}>{prog.xpIntoLevel}/{prog.xpForNextLevel}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Titre hero */}
        <View style={styles.hero}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          <Text style={styles.title}>{t("home.appTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
        </View>

        {/* Tiles de jeu */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.xl }}>
          <View style={styles.grid}>
            <ModeTile
              fr={t("home.solo")}
              sub={t("home.soloSub")}
              accent={COLORS.brass}
              icon="bolt"
              onPress={() => { hapticTap(); navigation.navigate("Game", { mode: "local" }); }}
            />
            <ModeTile
              fr={t("home.quickMatch")}
              sub={t("home.quickMatchSub")}
              accent={COLORS.brassDeep}
              icon="bolt"
              onPress={() => { hapticTap(); navigation.navigate("QuickMatch"); }}
            />
            <ModeTile
              fr={t("home.privateGame")}
              sub={t("home.privateGameSub")}
              accent={COLORS.teal}
              icon="people"
              onPress={() => { hapticTap(); navigation.navigate("PrivateGame"); }}
            />
            <ModeTile
              fr={t("home.tournaments")}
              sub={t("home.tournamentsSub")}
              accent="#8B4A7F"
              icon="trophy"
              onPress={() => { hapticTap(); navigation.navigate("TournamentHome"); }}
            />
            <ModeTile
              fr={t("home.leagues")}
              sub={t("home.leaguesSub")}
              accent="#2E7A8C"
              icon="people"
              onPress={() => { hapticTap(); navigation.navigate("Leagues"); }}
            />
            <ModeTile
              fr={t("home.scoreSheets")}
              sub={t("home.scoreSheetsSub")}
              accent={COLORS.terracotta}
              icon="notepad"
              onPress={() => { hapticTap(); navigation.navigate("ScoreSheets"); }}
            />
            <ModeTile
              fr={t("home.rules")}
              sub={t("home.rulesSub")}
              accent="#0F5A5E"
              icon="book"
              onPress={() => { hapticTap(); navigation.navigate("Rules"); }}
            />
            <ModeTile
              fr={t("home.history")}
              sub={t("home.historySub")}
              accent="#8B5A12"
              icon="history"
              onPress={() => { hapticTap(); navigation.navigate("MatchHistory"); }}
            />
            <ModeTile
              fr={t("home.leaderboard")}
              sub={t("home.leaderboardSub")}
              accent={COLORS.brassDeep}
              icon="trophy"
              onPress={() => { hapticTap(); navigation.navigate("Leaderboard"); }}
            />
          </View>
        </View>

        <View style={{ height: BOTTOM_TAB_HEIGHT + 20 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

type ModeIcon = "bolt" | "people" | "trophy" | "notepad" | "book" | "history";

// Icônes Lucide (MIT) — formes simples à un seul path concat pour chaque icône.
function ModeIconSvg({ icon }: { icon: ModeIcon }) {
  const stroke = COLORS.cream;
  const sw = 1.9;
  const common = { stroke, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      {icon === "bolt" && (
        <Path d="M13 2 3 14h7l-1 8 11-14h-8l1-6z" {...common} />
      )}
      {icon === "people" && (
        <>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...common} />
          <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" {...common} />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" {...common} />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...common} />
        </>
      )}
      {icon === "trophy" && (
        <>
          <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" {...common} />
          <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" {...common} />
          <Path d="M4 22h16" {...common} />
          <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" {...common} />
          <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" {...common} />
          <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" {...common} />
        </>
      )}
      {icon === "notepad" && (
        <>
          <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...common} />
          <Path d="M14 2v6h6" {...common} />
          <Path d="M8 13h8" {...common} />
          <Path d="M8 17h8" {...common} />
          <Path d="M8 9h2" {...common} />
        </>
      )}
      {icon === "book" && (
        <>
          <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...common} />
          <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...common} />
        </>
      )}
      {icon === "history" && (
        <>
          <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" {...common} />
          <Path d="M3 3v5h5" {...common} />
          <Path d="M12 7v5l4 2" {...common} />
        </>
      )}
    </Svg>
  );
}

function ModeTile({
  fr,
  sub,
  accent,
  icon,
  onPress,
}: {
  fr: string;
  sub?: string;
  accent: string;
  icon: ModeIcon;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.modeTile} onPress={onPress}>
      <LinearGradient
        colors={[accent, shade(accent, -25)]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ padding: 14, gap: 6 }}>
        <ModeIconSvg icon={icon} />
        <Text style={styles.modeFr}>{fr}</Text>
        {sub && <Text style={styles.modeSub}>{sub}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.terracottaDark },
  scroll: { paddingTop: 75, paddingBottom: 24 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  profile: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "700" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  levelText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.saffronSoft,
    fontWeight: "700",
  },
  levelBarBg: {
    height: 4,
    width: 90,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  levelBarFill: { height: 4, backgroundColor: COLORS.saffron, borderRadius: 2 },
  levelXp: {
    fontFamily: FONT_UI,
    fontSize: 9,
    color: "rgba(245,235,214,0.55)",
  },
  level: {
    color: "rgba(245,235,214,0.65)",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 3,
    fontWeight: "600",
  },
  badges: { flexDirection: "row", gap: 8 },

  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
  },
  coinGold: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  coinLetter: { color: COLORS.terracottaDark, fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: "700" },
  coinValue: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700" },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 14 },

  hero: { alignItems: "center", marginTop: 20, gap: 6 },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 72,
    color: COLORS.saffronSoft,
    letterSpacing: 4,
    fontWeight: "700",
    textShadowColor: "rgba(232,161,48,0.55)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    color: COLORS.cream,
    letterSpacing: 6,
    fontWeight: "700",
    fontStyle: "italic",
    opacity: 0.85,
    marginTop: 2,
  },

  inputBlock: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    gap: 8,
  },
  inputLabel: {
    fontSize: 10,
    color: COLORS.saffronSoft,
    letterSpacing: 3,
    fontWeight: "700",
    fontFamily: FONT_UI,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.cream,
    fontSize: 16,
    fontFamily: FONT_UI,
  },

  ctaWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.terracottaDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  ctaTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 22,
    color: COLORS.ink,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.8)",
    letterSpacing: 2,
    marginTop: 4,
    fontStyle: "italic",
    fontWeight: "700",
  },
  ctaIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(43,24,16,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.statusGreen,
  },
  onlineText: {
    fontSize: 11,
    color: "rgba(245,235,214,0.75)",
    letterSpacing: 0.8,
    fontWeight: "500",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionFr: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    color: COLORS.cream,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sectionDr: {
    fontFamily: FONT_UI,
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.55)",
    fontWeight: "700",
    fontStyle: "italic",
  },
  sectionCount: {
    fontSize: 11,
    color: COLORS.brass,
    fontWeight: "700",
    letterSpacing: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  modeTile: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
    minHeight: 110,
  },
  modeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.saffron,
    borderRadius: 6,
    zIndex: 2,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 1,
  },
  modeFr: {
    color: COLORS.cream,
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  modeSub: {
    color: "rgba(245,235,214,0.75)",
    fontFamily: FONT_UI,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  modeDr: {
    color: "rgba(245,235,214,0.65)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    fontStyle: "italic",
  },

  friendName: {
    fontSize: 9,
    color: COLORS.cream,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
