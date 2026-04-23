// Écran Login / Inscription simple par pseudo + mot de passe.
// Stocke un JWT en SecureStore, tous les appels API sont ensuite authentifiés.

import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, ZelligeBg, StarBurst } from "../components/Patterns";
import { useAuthStore } from "../store/authStore";
import { hapticChoice, hapticError, hapticSuccess } from "../lib/haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

// ─── Logos officiels (SVG inline) ──────────────────────────────────

function AppleLogo({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.75 1.18-.25 2.31-.94 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function FacebookLogo({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </Svg>
  );
}

type Mode = "welcome" | "signin" | "signup";

export default function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [mode, setMode] = useState<Mode>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const signUp = useAuthStore((s) => s.signUp);
  const signIn = useAuthStore((s) => s.signIn);
  const clearError = useAuthStore((s) => s.clearError);

  const onSignIn = async () => {
    clearError();
    hapticChoice();
    try {
      await signIn({ username: username.trim(), password });
      hapticSuccess();
    } catch {
      hapticError();
    }
  };
  const onSignUp = async () => {
    clearError();
    hapticChoice();
    try {
      await signUp({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });
      hapticSuccess();
    } catch {
      hapticError();
    }
  };

  const canSignIn = username.trim().length >= 3 && password.length >= 6;
  const canSignUp =
    canSignIn &&
    /^[a-zA-Z0-9_-]+$/.test(username.trim()) &&
    acceptedTerms;

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
      <View style={{ position: "absolute", top: -60, right: -80, opacity: 0.25 }} pointerEvents="none">
        <StarBurst size={320} color={COLORS.saffronSoft} strokeW={0.7} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
            <Text style={styles.title}>TOUTI</Text>
            <Text style={styles.subtitle}>LE JEU DE CARTES MAROCAIN</Text>
            <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          </View>

          {mode === "welcome" && (
            <View style={styles.block}>
              <Text style={styles.intro}>
                Pour jouer en ligne, créer des ligues et participer à des tournois,
                il te faut un compte.
              </Text>

              {/* OAuth providers */}
              <OAuthButton
                provider="apple"
                label="Continuer avec Apple"
                renderIcon={() => <AppleLogo color="#fff" />}
                bg="#000"
                fg="#fff"
              />
              <OAuthButton
                provider="google"
                label="Continuer avec Google"
                renderIcon={() => <GoogleLogo />}
                bg="#fff"
                fg="#3c4043"
              />
              <OAuthButton
                provider="facebook"
                label="Continuer avec Facebook"
                renderIcon={() => <FacebookLogo color="#fff" />}
                bg="#1877F2"
                fg="#fff"
              />

              <View style={styles.separator}>
                <View style={styles.sepLine} />
                <Text style={styles.sepText}>OU</Text>
                <View style={styles.sepLine} />
              </View>

              <Pressable
                onPress={() => { clearError(); setMode("signup"); }}
                style={styles.primaryBtn}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.primaryText}>Créer un compte (pseudo)</Text>
              </Pressable>
              <Pressable
                onPress={() => { clearError(); setMode("signin"); }}
                style={[styles.primaryBtn, styles.secondaryBtn]}
              >
                <Text style={[styles.primaryText, { color: COLORS.cream }]}>J'ai déjà un compte</Text>
              </Pressable>
            </View>
          )}

          {(mode === "signin" || mode === "signup") && (
            <View style={styles.block}>
              <Text style={styles.formTitle}>
                {mode === "signup" ? "Créer un compte" : "Connexion"}
              </Text>

              <View>
                <Text style={styles.label}>PSEUDO</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="ton_pseudo"
                  placeholderTextColor="rgba(245,235,214,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={24}
                  style={styles.input}
                />
                {mode === "signup" && (
                  <Text style={styles.hint}>
                    3-24 caractères · lettres, chiffres, _ ou -
                  </Text>
                )}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>MOT DE PASSE</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  placeholderTextColor="rgba(245,235,214,0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  style={styles.input}
                />
                {mode === "signup" && (
                  <Text style={styles.hint}>6 caractères minimum</Text>
                )}
              </View>

              {mode === "signup" && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>EMAIL (OPTIONNEL)</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="toi@email.com"
                    placeholderTextColor="rgba(245,235,214,0.4)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={styles.input}
                  />
                  <Text style={styles.hint}>
                    Utile plus tard pour récupérer ton compte
                  </Text>
                </View>
              )}

              {mode === "signup" && (
                <Pressable
                  onPress={() => setAcceptedTerms((v) => !v)}
                  style={styles.termsRow}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>
                    J'ai lu et j'accepte les{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => navigation.navigate("Terms", { section: "terms" })}
                    >
                      CGU
                    </Text>
                    {" "}et la{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => navigation.navigate("Terms", { section: "privacy" })}
                    >
                      politique de confidentialité
                    </Text>
                    .
                  </Text>
                </Pressable>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={mode === "signup" ? onSignUp : onSignIn}
                disabled={busy || !(mode === "signup" ? canSignUp : canSignIn)}
                style={[
                  styles.primaryBtn,
                  { marginTop: 16 },
                  (busy || !(mode === "signup" ? canSignUp : canSignIn)) && { opacity: 0.5 },
                ]}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {busy ? (
                  <ActivityIndicator color={COLORS.terracottaDark} />
                ) : (
                  <Text style={styles.primaryText}>
                    {mode === "signup" ? "Créer le compte" : "Se connecter"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  clearError();
                  setMode(mode === "signup" ? "signin" : "signup");
                }}
                style={{ marginTop: 14, alignItems: "center" }}
              >
                <Text style={styles.toggleText}>
                  {mode === "signup"
                    ? "J'ai déjà un compte · Me connecter"
                    : "Pas encore de compte · Créer"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { clearError(); setMode("welcome"); }}
                style={{ marginTop: 8, alignItems: "center" }}
              >
                <Text style={[styles.toggleText, { fontSize: 11, opacity: 0.6 }]}>
                  ← Retour
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Bouton OAuth — pour l'instant l'UI est là, mais tap affiche une explication
// honnête : la config provider (client IDs + bundle IDs + Apple Dev account)
// doit être faite et il faut un build natif (Expo Go ne supporte pas).
function OAuthButton({
  provider,
  label,
  renderIcon,
  bg,
  fg,
}: {
  provider: "apple" | "google" | "facebook";
  label: string;
  renderIcon: () => React.ReactNode;
  bg: string;
  fg: string;
}) {
  const requirements: Record<string, string> = {
    apple: "compte Apple Developer actif + app dans Xcode signée + build natif EAS",
    google: "Google Cloud OAuth client + build natif EAS (ne fonctionne pas dans Expo Go)",
    facebook: "Meta Developer app configurée + build natif EAS",
  };
  const onPress = () => {
    Alert.alert(
      `Connexion ${provider} · bientôt`,
      `Le serveur est prêt à vérifier les tokens ${provider}.\n\nIl reste à faire : ${requirements[provider]}.\n\nPour l'instant, utilise pseudo + mot de passe.`,
    );
  };
  return (
    <Pressable onPress={onPress} style={[styles.oauthBtn, { backgroundColor: bg }]}>
      {renderIcon()}
      <Text style={[styles.oauthLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  hero: { alignItems: "center", gap: 6, marginBottom: 20 },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 64,
    color: COLORS.saffronSoft,
    letterSpacing: 4,
    fontWeight: "700",
    textShadowColor: "rgba(232,161,48,0.55)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 4,
    color: COLORS.brass,
    fontWeight: "700",
  },

  block: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },
  intro: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: COLORS.cream,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  formTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center",
  },

  label: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT_UI,
    fontSize: 16,
    color: COLORS.cream,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
    marginTop: 4,
  },

  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    minHeight: 52,
    marginTop: 10,
  },
  secondaryBtn: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  primaryText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
  toggleText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    color: COLORS.saffronSoft,
    letterSpacing: 1,
    fontWeight: "700",
  },

  errorBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(232,85,58,0.15)",
    borderRadius: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#E8553A",
  },
  errorText: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "#E8553A",
    fontWeight: "600",
    lineHeight: 17,
  },

  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.15)",
  },
  oauthIcon: {
    fontSize: 18,
    fontFamily: FONT_UI_BOLD,
    fontWeight: "800",
  },
  oauthLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "700",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
  },
  sepLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "rgba(245,235,214,0.2)",
  },
  sepText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.5)",
    fontWeight: "700",
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: `${COLORS.brass}88`,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: COLORS.saffron,
    borderColor: COLORS.saffron,
  },
  checkmark: {
    color: COLORS.terracottaDark,
    fontFamily: FONT_UI_BOLD,
    fontSize: 14, fontWeight: "800",
  },
  termsText: {
    flex: 1,
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.85)",
    lineHeight: 17,
  },
  termsLink: {
    color: COLORS.saffronSoft,
    textDecorationLine: "underline",
    fontWeight: "700",
  },
});
