import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useTournamentStore } from "../store/tournamentStore";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "JoinTournament">;

export default function JoinTournamentScreen({ navigation }: Props) {
  const [code, setCode] = useState("");
  const joinByCode = useTournamentStore((s) => s.joinByCode);
  const user = useAuthStore((s) => s.user);

  const onJoin = async () => {
    if (!user?.username) return;
    const t = await joinByCode(code, user.username);
    if (!t) {
      Alert.alert("Code invalide", "Aucun tournoi trouvé avec ce code.");
      return;
    }
    navigation.replace("TournamentDetail", { id: t.id });
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
        <Text style={styles.eyebrow}>REJOINDRE UN TOURNOI</Text>
        <Text style={styles.title}>Entre le code</Text>

        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
          placeholder="CODE"
          placeholderTextColor="rgba(245,235,214,0.3)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          style={styles.codeInput}
        />
        <Text style={styles.hint}>6 caractères — reçus d'un ami</Text>

        <Pressable
          disabled={code.length !== 6}
          onPress={onJoin}
          style={({ pressed }) => [
            styles.cta,
            code.length !== 6 && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>Rejoindre</Text>
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
  cta: {
    marginTop: 30,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800", color: COLORS.terracottaDark, letterSpacing: 0.3 },
});
