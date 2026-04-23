import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useTournamentStore } from "../store/tournamentStore";
import { useAuthStore } from "../store/authStore";
import { apiGetTournamentByCode, type TournamentApi } from "../net/tournamentsApi";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "JoinTournament">;

export default function JoinTournamentScreen({ navigation, route }: Props) {
  const tr = useT();
  const incomingCode = route.params?.code?.toUpperCase();
  const [code, setCode] = useState(incomingCode ?? "");
  const [preview, setPreview] = useState<TournamentApi | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const joinByCode = useTournamentStore((s) => s.joinByCode);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (incomingCode) setCode(incomingCode);
  }, [incomingCode]);

  // Quand le code atteint 6 caractères → fetch preview pour connaître le mode
  useEffect(() => {
    if (code.length !== 6) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    apiGetTournamentByCode(code)
      .then((t) => { if (!cancelled) setPreview(t); })
      .catch(() => { if (!cancelled) setPreview(null); })
      .finally(() => { if (!cancelled) setPreviewing(false); });
    return () => { cancelled = true; };
  }, [code]);

  const needsPartner = preview?.pairingMode === "chosen";
  const canSubmit =
    code.length === 6 &&
    !!preview &&
    (!needsPartner || partnerName.trim().length >= 2);

  const onJoin = async () => {
    if (!user?.username || !canSubmit) return;
    const partner = needsPartner ? partnerName.trim() : undefined;
    const joined = await joinByCode(code, user.username, partner);
    if (!joined) {
      Alert.alert(tr("tournaments.joinFailTitle"), tr("tournaments.joinFailBody"));
      return;
    }
    navigation.replace("TournamentDetail", { id: joined.id });
  };

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
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.eyebrow}>{tr("tournaments.joinEyebrow")}</Text>
        <Text style={styles.title}>{tr("tournaments.joinShort")}</Text>

        <TextInput
          value={code}
          onChangeText={(txt) => setCode(txt.toUpperCase().slice(0, 6))}
          placeholder={tr("tournaments.codePlaceholder")}
          placeholderTextColor="rgba(245,235,214,0.3)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={styles.codeInput}
        />
        <Text style={styles.hint}>{tr("tournaments.codeHint")}</Text>

        {/* Preview du tournoi */}
        {previewing && (
          <ActivityIndicator color={COLORS.saffronSoft} style={{ marginTop: 14 }} />
        )}
        {!previewing && code.length === 6 && !preview && (
          <Text style={styles.errText}>{tr("tournaments.codeInvalid")}</Text>
        )}
        {!previewing && preview && (
          <View style={styles.previewBox}>
            <Text style={styles.previewName}>{preview.name}</Text>
            <Text style={styles.previewSub}>
              {preview.format === "irl" ? tr("tournaments.formatIrl") : tr("tournaments.formatOnline")}
              {" · "}
              {preview.mode === "classique" ? tr("tournaments.modeClassic") : tr("tournaments.modeChampionship")}
              {" · "}
              {preview.pairingMode === "chosen" ? tr("tournaments.pairingFixed") : tr("tournaments.pairingRandom")}
            </Text>
            <Text style={styles.previewCount}>
              {preview.players.length} / {preview.maxPlayers} {tr("tournaments.playersShort")}
            </Text>
          </View>
        )}

        {/* Champ partenaire (mode chosen uniquement) */}
        {needsPartner && (
          <View style={styles.partnerWrap}>
            <Text style={styles.partnerLabel}>{tr("tournaments.yourPartner")}</Text>
            <TextInput
              value={partnerName}
              onChangeText={setPartnerName}
              placeholder={tr("tournaments.partnerPlaceholder")}
              placeholderTextColor="rgba(245,235,214,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.partnerInput}
            />
            <Text style={styles.partnerHint}>{tr("tournaments.partnerHint")}</Text>
          </View>
        )}

        <Pressable
          disabled={!canSubmit}
          onPress={onJoin}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>{tr("tournaments.joinAction")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { paddingTop: 60, paddingHorizontal: 16 },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 4, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 36, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 6 },
  codeInput: {
    marginTop: 28,
    width: 260,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 16,
    paddingVertical: 18,
    textAlign: "center",
    fontSize: 32,
    fontFamily: FONT_DISPLAY,
    fontWeight: "700",
    color: COLORS.cream,
    letterSpacing: 8,
  },
  hint: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.55)", marginTop: 10, letterSpacing: 1 },
  errText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12,
    color: "#E8553A", marginTop: 14,
  },
  previewBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    alignItems: "center",
    width: 260,
  },
  previewName: {
    fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "700",
    color: COLORS.cream,
  },
  previewSub: {
    fontFamily: FONT_UI, fontSize: 10, letterSpacing: 0.5,
    color: "rgba(245,235,214,0.7)", marginTop: 4,
  },
  previewCount: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700",
    color: COLORS.saffronSoft, marginTop: 6,
  },
  partnerWrap: {
    marginTop: 16, width: 260, gap: 6,
  },
  partnerLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700",
  },
  partnerInput: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.cream,
    fontFamily: FONT_UI, fontSize: 14,
  },
  partnerHint: {
    fontFamily: FONT_UI, fontSize: 10,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
    lineHeight: 14,
  },
  cta: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800", color: COLORS.terracottaDark, letterSpacing: 0.3 },
});
