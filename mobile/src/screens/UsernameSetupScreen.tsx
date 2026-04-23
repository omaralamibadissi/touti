import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, ZelligeBg } from "../components/Patterns";
import { useAuthStore } from "../store/authStore";

// NB : aujourd'hui, le pseudo est toujours fixé à la création de compte
// (signUp côté serveur). Cet écran n'est utile QUE pour un user OAuth qui
// arriverait sans pseudo (flow pas encore implémenté). En attendant de
// câbler un endpoint PATCH /auth/me/username, on fait signOut + message
// explicite pour que l'utilisateur ne reste pas bloqué.
export default function UsernameSetupScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const valid = name.trim().length >= 2 && name.trim().length <= 20;

  const handleConfirm = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      Alert.alert(
        "Pseudo figé",
        "Ton pseudo a été choisi à la création du compte et ne peut plus être changé depuis cet écran. Reconnecte-toi avec ton pseudo d'origine, ou crée un nouveau compte.",
        [
          { text: "OK", style: "cancel" },
          { text: "Se déconnecter", style: "destructive", onPress: () => signOut() },
        ],
      );
    } finally {
      setSaving(false);
    }
  };

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

      <View style={styles.content}>
        <View style={styles.hero}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          <Text style={styles.eyebrow}>BIENVENUE</Text>
          <Text style={styles.title}>Choisis ton pseudo</Text>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>PSEUDO</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ton nom de joueur…"
            placeholderTextColor="rgba(245,235,214,0.5)"
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={20}
            autoFocus
          />
          <Text style={styles.hint}>2 à 20 caractères · visible par les autres joueurs</Text>
        </View>

        <Pressable
          onPress={handleConfirm}
          disabled={!valid || saving}
          style={({ pressed }) => [
            styles.cta,
            (!valid || saving) && { opacity: 0.5 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {saving ? (
            <ActivityIndicator color={COLORS.terracottaDark} />
          ) : (
            <Text style={styles.ctaText}>Confirmer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.terracottaDark },
  content: { flex: 1, padding: 28, paddingTop: 100, gap: 36 },
  hero: { alignItems: "center", gap: 8 },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 4,
    color: COLORS.saffronSoft,
    fontWeight: "700",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.cream,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  inputBlock: { gap: 8 },
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
    paddingVertical: 14,
    color: COLORS.cream,
    fontSize: 18,
    fontFamily: FONT_UI,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.55)",
    marginTop: 4,
    fontStyle: "italic",
  },

  cta: {
    borderRadius: 14,
    overflow: "hidden",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
});
