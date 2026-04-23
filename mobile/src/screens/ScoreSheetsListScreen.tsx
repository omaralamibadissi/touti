import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useScoreSheetStore, totalsOf } from "../store/scoreSheetStore";
import { useT, i18n } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "ScoreSheets">;

export default function ScoreSheetsListScreen({ navigation }: Props) {
  const t = useT();
  const sheets = useScoreSheetStore((s) => s.sheets);
  const hydrate = useScoreSheetStore((s) => s.hydrate);
  const create = useScoreSheetStore((s) => s.create);
  const remove = useScoreSheetStore((s) => s.remove);

  const [creating, setCreating] = useState(false);
  const [names, setNames] = useState<string[]>([t("scoreSheets.playerN", { n: 1 }), t("scoreSheets.playerN", { n: 2 }), t("scoreSheets.playerN", { n: 3 }), t("scoreSheets.playerN", { n: 4 })]);

  useEffect(() => { hydrate(); }, [hydrate]);

  const onCreate = async () => {
    const tuple: [string, string, string, string] = [
      names[0]?.trim() || t("scoreSheets.playerN", { n: 1 }),
      names[1]?.trim() || t("scoreSheets.playerN", { n: 2 }),
      names[2]?.trim() || t("scoreSheets.playerN", { n: 3 }),
      names[3]?.trim() || t("scoreSheets.playerN", { n: 4 }),
    ];
    try {
      const s = await create(tuple);
      setCreating(false);
      navigation.navigate("ScoreTracker", { sheetId: s.id });
    } catch (e: any) {
      Alert.alert(
        t("scoreSheets.createFailTitle"),
        t("scoreSheets.createFailBody"),
      );
    }
  };

  const inProgress = sheets.filter((s) => s.status === "in-progress");
  const finished = sheets.filter((s) => s.status === "finished");

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
          <Text style={styles.eyebrow}>{t("scoreSheets.eyebrow")}</Text>
          <Text style={styles.title}>{t("scoreSheets.sheetsTitle")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        {creating ? (
          <View style={styles.createCard}>
            <Text style={styles.cardLabel}>{t("scoreSheets.newGameLabel")}</Text>
            <Text style={styles.cardHint}>{t("scoreSheets.newGameHint")}</Text>
            <View style={{ gap: 8, marginTop: 14 }}>
              {names.map((n, i) => (
                <View key={i} style={styles.nameRow}>
                  <Text
                    style={[
                      styles.teamBadge,
                      {
                        backgroundColor: i % 2 === 0 ? COLORS.saffron : "rgba(245,235,214,0.25)",
                        color: i % 2 === 0 ? COLORS.terracottaDark : COLORS.cream,
                      },
                    ]}
                  >
                    {i % 2 === 0 ? t("scoreSheets.teamUs") : t("scoreSheets.teamThem")}
                  </Text>
                  <TextInput
                    value={n}
                    onChangeText={(txt) => {
                      const next = [...names];
                      next[i] = txt;
                      setNames(next);
                    }}
                    placeholder={t("scoreSheets.playerN", { n: i + 1 })}
                    placeholderTextColor="rgba(245,235,214,0.4)"
                    style={styles.nameInput}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => setCreating(false)} style={[styles.btn, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                <Text style={[styles.btnText, { color: COLORS.cream }]}>{t("scoreSheets.cancel")}</Text>
              </Pressable>
              <Pressable onPress={onCreate} style={styles.btn}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.btnText}>{t("scoreSheets.createAction")}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setCreating(true)} style={styles.createBtn}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.createBtnText}>{t("scoreSheets.newGame")}</Text>
          </Pressable>
        )}

        {inProgress.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionLabel}>{t("scoreSheets.inProgressSection", { count: inProgress.length })}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {inProgress.map((s) => (
                <SheetRow
                  key={s.id}
                  sheet={s}
                  onOpen={() => navigation.navigate("ScoreTracker", { sheetId: s.id })}
                  onDelete={() => confirmDelete(s.id, remove, t)}
                />
              ))}
            </View>
          </View>
        )}

        {finished.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionLabel}>{t("scoreSheets.finishedSection", { count: finished.length })}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {finished.map((s) => (
                <SheetRow
                  key={s.id}
                  sheet={s}
                  onOpen={() => navigation.navigate("ScoreTracker", { sheetId: s.id })}
                  onDelete={() => confirmDelete(s.id, remove, t)}
                />
              ))}
            </View>
          </View>
        )}

        {sheets.length === 0 && !creating && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✎</Text>
            <Text style={styles.emptyTitle}>{t("scoreSheets.emptyTitle")}</Text>
            <Text style={styles.emptySub}>{t("scoreSheets.emptyBody")}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function confirmDelete(id: string, remove: (id: string) => Promise<void>, t: (k: string, p?: any) => string) {
  Alert.alert(
    t("scoreSheets.deleteSheetTitle"),
    t("scoreSheets.deleteSheetBody"),
    [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => remove(id) },
    ],
  );
}

function SheetRow({
  sheet,
  onOpen,
  onDelete,
}: {
  sheet: import("../store/scoreSheetStore").ScoreSheet;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const tr = useT();
  const { A, B } = totalsOf(sheet.rounds);
  const dateLabel = formatDate(sheet.createdAt);
  const teamsLabel = `${sheet.names[0]} · ${sheet.names[2]}  vs  ${sheet.names[1]} · ${sheet.names[3]}`;
  const roundsKey = sheet.rounds.length > 1 ? "scoreSheets.rounds_plural" : "scoreSheets.rounds";
  return (
    <Pressable onPress={onOpen} onLongPress={onDelete} style={styles.sheetRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sheetTeams} numberOfLines={1}>{teamsLabel}</Text>
        <Text style={styles.sheetMeta}>
          {dateLabel} · {tr(roundsKey, { count: sheet.rounds.length })}
          {sheet.status === "finished" && sheet.winner && ` · ${sheet.winner === "A" ? tr("scoreSheets.weWin") : tr("scoreSheets.theyWin")}`}
        </Text>
      </View>
      <View style={styles.sheetScoreBox}>
        <Text style={[styles.sheetScore, { color: COLORS.saffronSoft }]}>{A}</Text>
        <Text style={styles.sheetDash}>—</Text>
        <Text style={[styles.sheetScore, { color: COLORS.cream }]}>{B}</Text>
      </View>
    </Pressable>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const loc = i18n.locale.startsWith("en") ? "en-US" : i18n.locale.startsWith("ar") ? "ar-MA" : "fr-FR";
  return d.toLocaleDateString(loc, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  createBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  createBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },

  createCard: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  cardLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
  },
  cardHint: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.6)",
    marginTop: 4,
    fontStyle: "italic",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  teamBadge: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
    width: 50,
    textAlign: "center",
  },
  nameInput: {
    flex: 1,
    color: COLORS.cream,
    fontFamily: FONT_UI,
    fontSize: 14,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(245,235,214,0.2)",
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  btnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 12,
  },
  sheetTeams: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },
  sheetMeta: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.55)", marginTop: 4 },
  sheetScoreBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  sheetScore: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: "700" },
  sheetDash: { fontFamily: FONT_DISPLAY, fontSize: 14, color: "rgba(245,235,214,0.35)", fontWeight: "500" },

  empty: { alignItems: "center", marginTop: 50, padding: 20, gap: 10 },
  emptyEmoji: { fontSize: 36, color: COLORS.saffronSoft, fontFamily: FONT_DISPLAY },
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
