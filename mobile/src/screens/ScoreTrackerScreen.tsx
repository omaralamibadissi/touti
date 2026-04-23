import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useScoreSheetStore, ScoreRound, Team, totalsOf } from "../store/scoreSheetStore";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "ScoreTracker">;

type BidRange = 70 | 80 | 90 | 100 | 110 | 120 | 130 | 140 | 150 | 160 | 170 | 180 | 190 | 200 | 210 | 220 | 230;

// Sièges anti-horaires : 0 = A (NOUS), 1 = B (EUX), 2 = A, 3 = B
const TEAM_BY_IDX: Team[] = ["A", "B", "A", "B"];

export default function ScoreTrackerScreen({ route, navigation }: Props) {
  const t = useT();
  const { sheetId } = route.params;
  const sheet = useScoreSheetStore((s) => s.sheets.find((x) => x.id === sheetId));
  const hydrate = useScoreSheetStore((s) => s.hydrate);
  const updateSheet = useScoreSheetStore((s) => s.updateSheet);
  const addRound = useScoreSheetStore((s) => s.addRound);
  const resetSheet = useScoreSheetStore((s) => s.reset);

  useEffect(() => { hydrate(); }, [hydrate]);

  const [editingNames, setEditingNames] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buyerIdx, setBuyerIdx] = useState(0);
  const [bid, setBid] = useState<BidRange>(70);
  const [success, setSuccess] = useState(true);

  if (!sheet) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: COLORS.cream }}>Fiche introuvable</Text>
      </View>
    );
  }

  const { A: totalA, B: totalB } = totalsOf(sheet.rounds);
  const gameOver = sheet.status === "finished";
  const winA = sheet.winner === "A";

  const dealerIdx = sheet.dealerIdx;
  const maleIdx = (dealerIdx + 1) % 4;

  const updateName = (i: number, v: string) => {
    const next = [...sheet.names] as [string, string, string, string];
    next[i] = v;
    updateSheet(sheet.id, { names: next });
  };

  const saveRound = async () => {
    if (gameOver) return;
    const buyerTeam = TEAM_BY_IDX[buyerIdx];
    const scoringTeam: Team = success ? buyerTeam : (buyerTeam === "A" ? "B" : "A");
    const delta = {
      A: scoringTeam === "A" ? bid : 0,
      B: scoringTeam === "B" ? bid : 0,
    };
    const r: ScoreRound = {
      id: String(Date.now()),
      num: sheet.rounds.length + 1,
      dealer: sheet.names[dealerIdx],
      male: sheet.names[maleIdx],
      buyerTeam,
      buyer: sheet.names[buyerIdx],
      bid,
      success,
      delta,
    };
    await addRound(sheet.id, r);
    await updateSheet(sheet.id, { dealerIdx: (dealerIdx + 1) % 4 });
    setAdding(false);
    setSuccess(true);
  };

  const onReset = () => {
    Alert.alert(
      t("scoreSheets.resetTitle"),
      t("scoreSheets.resetBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("scoreSheets.resetAction"), style: "destructive", onPress: () => resetSheet(sheet.id) },
      ],
    );
  };

  const bidChoices: BidRange[] = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230];

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
          <Text style={styles.eyebrow}>{t("scoreSheets.trackerEyebrow")}</Text>
          <Text style={styles.title}>{t("scoreSheets.title")}</Text>
        </View>
        {sheet.rounds.length > 0 && (
          <Pressable style={styles.iconBtn} onPress={onReset}>
            <Text style={styles.iconBtnText}>↻</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={styles.totalsRow}>
          <TeamTotal label={t("scoreSheets.us")} total={totalA} winner={sheet.winner === "A"} color={COLORS.saffronSoft} />
          <TeamTotal label={t("scoreSheets.them")} total={totalB} winner={sheet.winner === "B"} color={COLORS.cream} />
        </View>
        {gameOver && sheet.winner && (
          <Text style={styles.winner}>
            {winA ? t("scoreSheets.weWinWith", { total: totalA }) : t("scoreSheets.theyWinWith", { total: totalB })}
          </Text>
        )}

        <View style={styles.namesCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.cardLabel}>{t("scoreSheets.playersLabel")}</Text>
            <Pressable onPress={() => setEditingNames(!editingNames)}>
              <Text style={styles.editLink}>{editingNames ? t("scoreSheets.validate") : t("scoreSheets.edit")}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8, marginTop: 10 }}>
            {sheet.names.map((n, i) => (
              <View key={i} style={styles.nameRow}>
                <Text style={[styles.teamBadge, { backgroundColor: TEAM_BY_IDX[i] === "A" ? COLORS.saffron : "rgba(245,235,214,0.25)" }]}>
                  {TEAM_BY_IDX[i] === "A" ? t("scoreSheets.teamUs") : t("scoreSheets.teamThem")}
                </Text>
                {editingNames ? (
                  <TextInput
                    value={n}
                    onChangeText={(txt) => updateName(i, txt)}
                    style={styles.nameInput}
                    placeholder={t("scoreSheets.playerN", { n: i + 1 })}
                    placeholderTextColor="rgba(245,235,214,0.4)"
                  />
                ) : (
                  <Text style={styles.nameDisplay}>{n}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {sheet.rounds.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionLabel}>{t("scoreSheets.roundsLabel")}</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {sheet.rounds.map((r) => (
                <RoundRow key={r.id} r={r} />
              ))}
            </View>
          </View>
        )}

        {gameOver ? (
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverTitle}>{t("scoreSheets.gameOverTitle")}</Text>
            <Text style={styles.gameOverSub}>
              {winA ? t("scoreSheets.weWinOver", { total: totalA }) : t("scoreSheets.theyWinOver", { total: totalB })}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16, width: "100%" }}>
              <Pressable onPress={() => navigation.goBack()} style={[styles.formBtn, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                <Text style={[styles.formBtnText, { color: COLORS.cream }]}>{t("scoreSheets.back")}</Text>
              </Pressable>
              <Pressable onPress={onReset} style={styles.formBtn}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.formBtnText}>{t("scoreSheets.replayReset")}</Text>
              </Pressable>
            </View>
          </View>
        ) : adding ? (
          <View style={styles.addCard}>
            <Text style={styles.cardLabel}>{t("scoreSheets.newRound")}</Text>

            <Text style={styles.autoInfo}>{t("scoreSheets.dealerLabel")} · <Text style={styles.autoInfoBold}>{sheet.names[dealerIdx]}</Text></Text>
            <Text style={styles.autoInfo}>{t("scoreSheets.maleLabel")} · <Text style={styles.autoInfoBold}>{sheet.names[maleIdx]}</Text></Text>
            <Pressable
              onPress={() => updateSheet(sheet.id, { dealerIdx: (dealerIdx + 1) % 4 })}
              style={[styles.rotateBtn]}
            >
              <Text style={styles.rotateBtnText}>{t("scoreSheets.changeDealer")}</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>{t("scoreSheets.whoBought")}</Text>
            <View style={styles.fourGrid}>
              {sheet.names.map((n, i) => (
                <Pressable
                  key={i}
                  onPress={() => setBuyerIdx(i)}
                  style={[styles.playerChip, buyerIdx === i && styles.playerChipActive]}
                >
                  <Text style={[styles.playerChipText, buyerIdx === i && styles.playerChipTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t("scoreSheets.bidLabel")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {bidChoices.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setBid(b)}
                  style={[styles.bidChip, bid === b && styles.bidChipActive]}
                >
                  <Text style={[styles.bidChipText, bid === b && styles.bidChipTextActive]}>{b}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t("scoreSheets.resultLabel")}</Text>
            <View style={styles.resultRow}>
              <Pressable
                onPress={() => setSuccess(true)}
                style={[styles.resultBtn, success && { backgroundColor: "rgba(63,194,106,0.25)", borderColor: "#3FC26A" }]}
              >
                <Text style={[styles.resultText, success && { color: "#3FC26A" }]}>{t("scoreSheets.resultOk")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setSuccess(false)}
                style={[styles.resultBtn, !success && { backgroundColor: "rgba(232,85,58,0.25)", borderColor: "#E8553A" }]}
              >
                <Text style={[styles.resultText, !success && { color: "#E8553A" }]}>{t("scoreSheets.resultKo")}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => setAdding(false)} style={[styles.formBtn, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
                <Text style={[styles.formBtnText, { color: COLORS.cream }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable onPress={saveRound} style={styles.formBtn}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.formBtnText}>{t("scoreSheets.saveRound")}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} style={styles.addMainBtn}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.addMainBtnText}>{t("scoreSheets.addRound")}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function TeamTotal({ label, total, winner, color }: { label: string; total: number; winner: boolean; color: string }) {
  return (
    <View style={[styles.teamTotal, winner && { borderColor: COLORS.saffron }]}>
      <Text style={[styles.teamTotalLabel, { color }]}>{label}</Text>
      <Text style={[styles.teamTotalNum, { color }]}>{total}</Text>
      <Text style={styles.teamTotalGoal}>/600</Text>
    </View>
  );
}

function RoundRow({ r }: { r: ScoreRound }) {
  const tr = useT();
  return (
    <View style={styles.roundRow}>
      <Text style={styles.roundNum}>{r.num}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.roundMain}>
          <Text style={{ color: r.buyerTeam === "A" ? COLORS.saffronSoft : COLORS.cream, fontWeight: "800" }}>
            {r.buyerTeam === "A" ? tr("scoreSheets.roundUsBuyer") : tr("scoreSheets.roundThemBuyer")}
          </Text>
          {" · "}{tr("scoreSheets.roundMain", { buyer: r.buyer, bid: r.bid })}
        </Text>
        <Text style={styles.roundSub}>
          {r.success ? tr("scoreSheets.roundSubOk", { dealer: r.dealer, male: r.male }) : tr("scoreSheets.roundSubKo", { dealer: r.dealer, male: r.male })}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.deltaA, { color: r.delta.A > 0 ? "#3FC26A" : "rgba(245,235,214,0.35)" }]}>
          {r.delta.A > 0 ? `+${r.delta.A}` : "—"}
        </Text>
        <Text style={[styles.deltaB, { color: r.delta.B > 0 ? "#E8553A" : "rgba(245,235,214,0.35)" }]}>
          {r.delta.B > 0 ? `+${r.delta.B}` : "—"}
        </Text>
      </View>
    </View>
  );
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

  totalsRow: { flexDirection: "row", gap: 10 },
  teamTotal: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 16,
  },
  teamTotalLabel: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, fontWeight: "700" },
  teamTotalNum: { fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: "700", lineHeight: 52, marginTop: 4 },
  teamTotalGoal: { fontFamily: FONT_UI_BOLD, fontSize: 11, color: "rgba(245,235,214,0.5)", fontWeight: "700" },
  winner: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    letterSpacing: 1,
  },

  namesCard: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 14,
  },
  cardLabel: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  editLink: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.saffronSoft, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  teamBadge: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: COLORS.terracottaDark,
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
  nameDisplay: { flex: 1, color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700" },

  sectionLabel: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },

  roundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.12)",
    borderRadius: 12,
  },
  roundNum: { fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.saffronSoft, fontWeight: "700", width: 26, textAlign: "center" },
  roundMain: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },
  roundSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 3, fontStyle: "italic" },
  deltaA: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "700" },
  deltaB: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: "700", marginTop: 1 },

  addCard: {
    marginTop: 18,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 16,
  },
  fieldLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  autoInfo: { fontFamily: FONT_UI, fontSize: 13, color: "rgba(245,235,214,0.75)", marginTop: 6 },
  autoInfoBold: { fontFamily: FONT_UI_BOLD, fontWeight: "800", color: COLORS.saffronSoft },
  rotateBtn: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(212,160,76,0.15)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}66`,
    borderRadius: 10,
  },
  rotateBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 11, color: COLORS.saffronSoft, fontWeight: "700" },

  fourGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  playerChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.4)",
    minWidth: "48%",
    alignItems: "center",
  },
  playerChipActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  playerChipText: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },
  playerChipTextActive: { color: COLORS.terracottaDark },

  bidChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.4)",
  },
  bidChipActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  bidChipText: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },
  bidChipTextActive: { color: COLORS.terracottaDark },

  resultRow: { flexDirection: "row", gap: 8 },
  resultBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(212,160,76,0.3)",
    alignItems: "center",
  },
  resultText: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },

  formBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  formBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },

  addMainBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  addMainBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },

  gameOverCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: COLORS.saffron,
    borderRadius: 16,
    alignItems: "center",
  },
  gameOverTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.saffronSoft,
    letterSpacing: 1,
  },
  gameOverSub: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.75)",
    marginTop: 6,
    textAlign: "center",
  },
});
