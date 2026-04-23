import React, { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, ZelligeBg } from "../components/Patterns";
import { useTournamentStore } from "../store/tournamentStore";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "TournamentHome">;

export default function TournamentHomeScreen({ navigation }: Props) {
  const tr = useT();
  const insets = useSafeAreaInsets();
  const mine = useTournamentStore((s) => s.mine);
  const hydrate = useTournamentStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.hero}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          <Text style={styles.title}>{tr("tournaments.title")}</Text>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
        </View>

        <View style={styles.actions}>
          <BigAction
            label={tr("tournaments.create")}
            sub={tr("tournaments.createSub")}
            onPress={() => navigation.navigate("CreateTournament")}
            primary
          />
          <BigAction
            label={tr("tournaments.join")}
            sub={tr("tournaments.joinSub")}
            onPress={() => navigation.navigate("JoinTournament")}
          />
        </View>

        <View style={styles.myList}>
          <Text style={styles.sectionLabel}>{tr("tournaments.mine")}</Text>
          {mine.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>♕</Text>
              <Text style={styles.emptyTitle}>{tr("tournaments.mineEmpty")}</Text>
              <Text style={styles.emptySub}>{tr("tournaments.mineEmptyBody")}</Text>
            </View>
          ) : (
            mine.map((row) => (
              <Pressable
                key={row.id}
                style={styles.tRow}
                onPress={() => navigation.navigate("TournamentDetail", { id: row.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.tName}>{row.name}</Text>
                  <Text style={styles.tMeta}>
                    {labelFormat(row.format)} · {labelMode(row.mode)} · {row.players.length}/{row.maxPlayers} {tr("tournaments.playersShort")} · {tr("tournaments.codeShort")} {row.code}
                  </Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function labelFormat(f: string): string {
  const { t } = require("../lib/i18n") as typeof import("../lib/i18n");
  if (f === "online") return t("tournaments.formatOnline");
  if (f === "irl") return t("tournaments.formatIrl");
  return f;
}

function labelMode(m: string): string {
  const { t } = require("../lib/i18n") as typeof import("../lib/i18n");
  if (m === "classique") return t("tournaments.tileClassic");
  if (m === "championnat") return t("tournaments.tileChampionship");
  return m;
}

function BigAction({
  label,
  sub,
  onPress,
  primary,
}: {
  label: string;
  sub: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}>
      {primary ? (
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
      )}
      <View>
        <Text style={[styles.actionLabel, { color: primary ? COLORS.terracottaDark : COLORS.cream }]}>{label}</Text>
        <Text style={[styles.actionSub, { color: primary ? "rgba(43,24,16,0.75)" : "rgba(245,235,214,0.6)" }]}>{sub}</Text>
      </View>
      <Text style={[styles.actionArrow, { color: primary ? COLORS.terracottaDark : COLORS.cream }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: { flexDirection: "row", paddingTop: 60, paddingHorizontal: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },

  hero: { alignItems: "center", marginTop: 10, gap: 8 },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 48,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 1,
  },

  actions: { paddingHorizontal: 20, marginTop: 32, gap: 12 },
  action: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  actionLabel: { fontFamily: FONT_UI_BOLD, fontSize: 17, fontWeight: "800", flex: 1 },
  actionSub: { fontFamily: FONT_UI, fontSize: 11, letterSpacing: 1, fontWeight: "600", marginTop: 4, fontStyle: "italic" },
  actionArrow: { fontSize: 28, fontWeight: "300", marginLeft: 16 },

  myList: { paddingHorizontal: 20, marginTop: 32, gap: 8 },
  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
    marginBottom: 6,
  },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 12,
  },
  tName: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  tMeta: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.6)", marginTop: 3 },
  chev: { fontSize: 22, color: "rgba(245,235,214,0.5)" },

  emptyBox: {
    alignItems: "center",
    padding: 28, marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.1)",
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 36,
    color: COLORS.saffronSoft,
    fontFamily: FONT_DISPLAY,
  },
  emptyTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700",
    color: COLORS.cream, textAlign: "center",
  },
  emptySub: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.6)",
    textAlign: "center", lineHeight: 18,
  },
});
