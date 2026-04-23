import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, ZelligeBg } from "../components/Patterns";
import { Card, SuitGlyph } from "../components/Card";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Rules">;

export default function RulesScreen({ navigation }: Props) {
  const t = useT();
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
          <Text style={styles.eyebrow}>{t("rules.eyebrowPre")}</Text>
          <Text style={styles.title}>TOUTI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.hero}>
          <ArabesqueDivider width={200} color={COLORS.saffronSoft} />
          <Text style={styles.intro}>{t("rules.intro")}</Text>
          <ArabesqueDivider width={200} color={COLORS.saffronSoft} />
        </View>

        <Section emoji="🎯" title={t("rules.goalTitle")} sub={t("rules.goalSub")}>
          <Text style={styles.p}>{t("rules.goalP1")}</Text>
          <Text style={styles.p}>{t("rules.goalP2")}</Text>
          <Text style={styles.hint}>{t("rules.goalHint")}</Text>
        </Section>

        <Section emoji="🃏" title={t("rules.deckTitle")} sub={t("rules.deckSub")}>
          <Text style={styles.p}>{t("rules.deckP")}</Text>
          <View style={styles.suitsRow}>
            <SuitLabel suit="oros" label={t("rules.suitOros")} />
            <SuitLabel suit="copas" label={t("rules.suitCopas")} />
            <SuitLabel suit="espadas" label={t("rules.suitEspadas")} />
            <SuitLabel suit="bastos" label={t("rules.suitBastos")} />
          </View>
        </Section>

        <Section emoji="⭐" title={t("rules.valueTitle")} sub={t("rules.valueSub")}>
          <Text style={styles.p}>{t("rules.valueP")}</Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            <RankRow rank={1} name="As" points={11} />
            <RankRow rank={3} name="Triss" points={10} />
            <RankRow rank={12} name="Rey" points={4} />
            <RankRow rank={11} name="Caballo" points={3} />
            <RankRow rank={10} name="Sota" points={2} />
            <RankRow rank={7} name="7 · 6 · 5 · 4 · 2" points={0} multi />
          </View>
          <Text style={styles.hint}>{t("rules.valueHint")}</Text>
        </Section>

        <Section emoji="🤲" title={t("rules.distribTitle")} sub={t("rules.distribSub")}>
          <Text style={styles.p}>{t("rules.distribP1")}</Text>
          <Text style={styles.p}>{t("rules.distribP2")}</Text>
        </Section>

        <Section emoji="💬" title={t("rules.bidsTitle")} sub={t("rules.bidsSub")}>
          <Text style={styles.p}>{t("rules.bidsP")}</Text>
          <Rule title={t("rules.ruleBidTitle")} body={t("rules.ruleBidBody")} />
          <Rule title={t("rules.rulePassTitle")} body={t("rules.rulePassBody")} />
          <Rule title={t("rules.ruleSignalTitle")} body={t("rules.ruleSignalBody")} />
          <Text style={[styles.hint, { marginTop: 10 }]}>{t("rules.bidsExample")}</Text>
          <Rule title={t("rules.ruleAllPassTitle")} body={t("rules.ruleAllPassBody")} />
          <Rule title={t("rules.ruleWinnerTitle")} body={t("rules.ruleWinnerBody")} />
        </Section>

        <Section emoji="🎴" title={t("rules.playTitle")} sub={t("rules.playSub")}>
          <Text style={styles.p}>{t("rules.playP1")}</Text>
          <Text style={styles.p}>{t("rules.playP2")}</Text>
          <Rule title={t("rules.rule1Title")} body={t("rules.rule1Body")} />
          <Rule title={t("rules.rule2Title")} body={t("rules.rule2Body")} />
          <Rule title={t("rules.rule3Title")} body={t("rules.rule3Body")} />
          <Rule title={t("rules.rule4Title")} body={t("rules.rule4Body")} />
          <Rule title={t("rules.rule5Title")} body={t("rules.rule5Body")} />
          <Text style={[styles.hint, { marginTop: 10 }]}>{t("rules.playHint1")}</Text>
          <Text style={[styles.hint, { marginTop: 8 }]}>{t("rules.playHint2")}</Text>
        </Section>

        <Section emoji="👑" title={t("rules.ghnaTitle")} sub={t("rules.ghnaSub")}>
          <Text style={styles.p}>{t("rules.ghnaP")}</Text>
          <View style={styles.ghnaBlock}>
            <GhnaLine value={40} text={t("rules.ghnaLineTrump")} />
            <GhnaLine value={20} text={t("rules.ghnaLineOther")} />
          </View>
          <Rule title={t("rules.ruleCapTitle")} body={t("rules.ruleCapBody")} />
          <Rule title={t("rules.ruleWinnerGhnaTitle")} body={t("rules.ruleWinnerGhnaBody")} />
          <Rule title={t("rules.ruleTimingTitle")} body={t("rules.ruleTimingBody")} />
        </Section>

        <Section emoji="🏁" title={t("rules.endRoundTitle")} sub={t("rules.endRoundSub")}>
          <Text style={styles.p}>{t("rules.endRoundP")}</Text>
          <Rule title={t("rules.ruleMadeTitle")} body={t("rules.ruleMadeBody")} success />
          <Rule title={t("rules.ruleMissedTitle")} body={t("rules.ruleMissedBody")} danger />
          <Rule title={t("rules.rule9a3aTitle")} body={t("rules.rule9a3aBody")} />
        </Section>

        <Section emoji="🏆" title={t("rules.endGameTitle")} sub={t("rules.endGameSub")}>
          <Text style={styles.p}>{t("rules.endGameP")}</Text>
        </Section>

        <Section emoji="💡" title={t("rules.tipsTitle")} sub={t("rules.tipsSub")}>
          <Rule title={t("rules.tip1Title")} body={t("rules.tip1Body")} />
          <Rule title={t("rules.tip2Title")} body={t("rules.tip2Body")} />
          <Rule title={t("rules.tip3Title")} body={t("rules.tip3Body")} />
          <Rule title={t("rules.tip4Title")} body={t("rules.tip4Body")} />
          <Rule title={t("rules.tip5Title")} body={t("rules.tip5Body")} />
        </Section>

        <Section emoji="📖" title={t("rules.lexTitle")} sub={t("rules.lexSub")}>
          <Rule title={t("rules.lexChraTitle")} body={t("rules.lexChraBody")} />
          <Rule title={t("rules.lexMaleTitle")} body={t("rules.lexMaleBody")} />
          <Rule title={t("rules.lexTronfoTitle")} body={t("rules.lexTronfoBody")} />
          <Rule title={t("rules.lexToutiTitle")} body={t("rules.lexToutiBody")} />
          <Rule title={t("rules.lexTrissTitle")} body={t("rules.lexTrissBody")} />
          <Rule title={t("rules.lexFiguresTitle")} body={t("rules.lexFiguresBody")} />
          <Rule title={t("rules.lexGhnaTitle")} body={t("rules.lexGhnaBody")} />
          <Rule title={t("rules.lex9a3aTitle")} body={t("rules.lex9a3aBody")} />
        </Section>

        <View style={{ alignItems: "center", marginTop: 30 }}>
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
          <Text style={styles.outro}>{t("rules.outro")}</Text>
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function Section({
  emoji,
  title,
  sub,
  children,
}: {
  emoji: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{sub}</Text>
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Rule({
  title,
  body,
  success,
  danger,
}: {
  title: string;
  body: string;
  success?: boolean;
  danger?: boolean;
}) {
  const accent = success ? "#3FC26A" : danger ? "#E8553A" : COLORS.brass;
  return (
    <View style={[styles.rule, { borderLeftColor: accent }]}>
      <Text style={[styles.ruleTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.ruleBody}>{body}</Text>
    </View>
  );
}

function SuitLabel({ suit, label }: { suit: "oros" | "copas" | "espadas" | "bastos"; label: string }) {
  return (
    <View style={styles.suitLabel}>
      <View style={styles.suitDisc}>
        <SuitGlyph suit={suit} size={20} />
      </View>
      <Text style={styles.suitText}>{label}</Text>
    </View>
  );
}

function RankRow({
  rank,
  name,
  points,
  multi,
}: {
  rank: number;
  name: string;
  points: number;
  multi?: boolean;
}) {
  return (
    <View style={styles.rankRow}>
      <View style={styles.rankBadge}>
        {multi ? (
          <Text style={styles.rankText}>···</Text>
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>
      <Text style={styles.rankName}>{name}</Text>
      <View style={styles.pointsPill}>
        <Text style={styles.pointsText}>{points} pt{points > 1 ? "s" : ""}</Text>
      </View>
    </View>
  );
}

function GhnaLine({ value, text }: { value: number; text: string }) {
  return (
    <View style={styles.ghnaLine}>
      <View style={styles.ghnaBadge}>
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.ghnaValue}>+{value}</Text>
      </View>
      <Text style={styles.ghnaText}>{text}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <Text style={styles.highlight}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 32, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 2, letterSpacing: 4 },

  hero: { alignItems: "center", gap: 14, marginBottom: 24 },
  intro: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: "rgba(245,235,214,0.85)",
    textAlign: "center",
    lineHeight: 21,
    fontStyle: "italic",
  },

  section: {
    marginBottom: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 18,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionEmoji: { fontSize: 30 },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.55)",
    fontWeight: "700",
    fontStyle: "italic",
    marginTop: 2,
  },
  sectionBody: { padding: 18, paddingTop: 12 },

  p: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: COLORS.cream,
    lineHeight: 21,
    marginBottom: 10,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    lineHeight: 18,
    fontStyle: "italic",
    marginTop: 6,
  },

  bold: { fontFamily: FONT_UI_BOLD, fontWeight: "700", color: COLORS.cream },
  highlight: { fontFamily: FONT_UI_BOLD, fontWeight: "700", color: COLORS.saffronSoft },

  rule: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  ruleTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  ruleBody: { fontFamily: FONT_UI, fontSize: 13, color: "rgba(245,235,214,0.85)", lineHeight: 19, marginTop: 3 },

  suitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  suitLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: "47%",
  },
  suitDisc: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#FBF6EA",
    alignItems: "center",
    justifyContent: "center",
  },
  suitText: { fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700", color: COLORS.cream, flex: 1 },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.25)",
    borderRadius: 10,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.saffronSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  rankName: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  pointsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.brassDeep,
    borderRadius: 10,
  },
  pointsText: { fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "800", color: COLORS.cream },

  ghnaBlock: { gap: 8, marginVertical: 10 },
  ghnaLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  ghnaBadge: {
    width: 54, height: 34, borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ghnaValue: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "800", color: COLORS.terracottaDark },
  ghnaText: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },

  outro: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 1,
    marginVertical: 8,
    fontStyle: "italic",
  },
});
