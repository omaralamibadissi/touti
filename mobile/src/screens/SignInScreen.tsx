import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, StarBurst, ZelligeBg } from "../components/Patterns";
import { useAuthStore, AuthProvider } from "../store/authStore";
import {
  fetchFacebookProfile,
  fetchGoogleProfile,
  requireConfigured,
  signInApple,
  useFacebookAuth,
  useGoogleAuth,
} from "../auth/providers";

export default function SignInScreen() {
  const signInWithProfile = useAuthStore((s) => s.signInWithProfile);
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const google = useGoogleAuth();
  const facebook = useFacebookAuth();

  // Réaction aux réponses OAuth Google / Facebook
  useEffect(() => {
    (async () => {
      const r = google.response;
      if (r?.type !== "success") return;
      try {
        const token = r.authentication?.accessToken;
        if (!token) throw new Error("Pas de token Google.");
        const profile = await fetchGoogleProfile(token);
        await signInWithProfile("google", profile);
      } catch (e) {
        Alert.alert("Erreur Google", (e as Error).message);
      } finally {
        setLoading(null);
      }
    })();
  }, [google.response, signInWithProfile]);

  useEffect(() => {
    (async () => {
      const r = facebook.response;
      if (r?.type !== "success") return;
      try {
        const token = r.authentication?.accessToken;
        if (!token) throw new Error("Pas de token Facebook.");
        const profile = await fetchFacebookProfile(token);
        await signInWithProfile("facebook", profile);
      } catch (e) {
        Alert.alert("Erreur Facebook", (e as Error).message);
      } finally {
        setLoading(null);
      }
    })();
  }, [facebook.response, signInWithProfile]);

  const handleApple = async () => {
    setLoading("apple");
    try {
      const profile = await signInApple();
      await signInWithProfile("apple", profile);
    } catch (e) {
      Alert.alert("Erreur Apple", (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading("google");
    try {
      requireConfigured("google");
      const res = await google.promptAsync();
      if (res.type !== "success") {
        setLoading(null);
        if (res.type === "error") Alert.alert("Erreur Google", "Connexion annulée ou refusée.");
      }
      // Le reste est géré par le useEffect sur google.response
    } catch (e) {
      Alert.alert("Erreur Google", (e as Error).message);
      setLoading(null);
    }
  };

  const handleFacebook = async () => {
    setLoading("facebook");
    try {
      requireConfigured("facebook");
      const res = await facebook.promptAsync();
      if (res.type !== "success") {
        setLoading(null);
        if (res.type === "error") Alert.alert("Erreur Facebook", "Connexion annulée ou refusée.");
      }
    } catch (e) {
      Alert.alert("Erreur Facebook", (e as Error).message);
      setLoading(null);
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
      <View style={styles.starWrap} pointerEvents="none">
        <StarBurst size={420} color={COLORS.saffronSoft} strokeW={0.6} />
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          <Text style={styles.title}>TOUTI</Text>
          <Text style={styles.subtitle}>LE JEU DE CARTES MAROCAIN</Text>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
        </View>

        <Text style={styles.welcome}>Bienvenue</Text>
        <Text style={styles.prompt}>Connecte-toi pour commencer</Text>

        <View style={styles.buttons}>
          {Platform.OS === "ios" && (
            <ProviderButton
              label="Continuer avec Apple"
              loading={loading === "apple"}
              onPress={handleApple}
              background="#000"
              color="#fff"
              icon={<AppleIcon />}
            />
          )}
          <ProviderButton
            label="Continuer avec Google"
            loading={loading === "google"}
            onPress={handleGoogle}
            disabled={!google.request}
            background="#fff"
            color="#1F1F1F"
            icon={<GoogleIcon />}
          />
          <ProviderButton
            label="Continuer avec Facebook"
            loading={loading === "facebook"}
            onPress={handleFacebook}
            disabled={!facebook.request}
            background="#1877F2"
            color="#fff"
            icon={<FacebookIcon />}
          />
        </View>

        <Text style={styles.tos}>
          En continuant, tu acceptes les conditions d'utilisation
        </Text>
      </View>
    </View>
  );
}

function ProviderButton({
  label,
  loading,
  onPress,
  background,
  color,
  icon,
  disabled,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
  background: string;
  color: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: background, opacity: pressed || isDisabled ? 0.85 : 1 },
      ]}
    >
      <View style={styles.btnIcon}>{loading ? <ActivityIndicator color={color} size="small" /> : icon}</View>
      <Text style={[styles.btnLabel, { color }]}>{label}</Text>
      <View style={{ width: 24 }} />
    </Pressable>
  );
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z"
      />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12 10.2v3.85h5.35c-.22 1.41-1.66 4.14-5.35 4.14a6.02 6.02 0 010-12.04c1.9 0 3.18.81 3.9 1.5l2.67-2.56A9.68 9.68 0 0012 2a10 10 0 100 20c5.78 0 9.61-4.06 9.61-9.77 0-.66-.07-1.17-.16-1.68H12Z"
      />
    </Svg>
  );
}

function FacebookIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#fff"
        d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.8-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.9h-2.34v6.98A10 10 0 0022 12Z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.terracottaDark },
  starWrap: { position: "absolute", top: -80, left: "50%", marginLeft: -210, opacity: 0.1 },

  content: { flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 50, justifyContent: "space-between" },

  hero: { alignItems: "center", gap: 8 },
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
  },

  welcome: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.cream,
    textAlign: "center",
    marginTop: 30,
  },
  prompt: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: "rgba(245,235,214,0.75)",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.5,
  },

  buttons: { gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnIcon: { width: 24, alignItems: "center" },
  btnLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONT_UI_BOLD,
    fontSize: 15,
    fontWeight: "700",
  },

  tos: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.5)",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});
