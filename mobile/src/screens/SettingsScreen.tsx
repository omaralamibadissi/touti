import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Share } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useAuthStore } from "../store/authStore";
import { apiExportMe } from "../net/authApi";
import { hapticTap, hapticChoice, hapticWarning, setHapticsEnabled } from "../lib/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [vib, setVib] = useState(true);
  const [exporting, setExporting] = useState(false);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const resetOnboarding = useAuthStore((s) => s.resetOnboarding);
  const username = useAuthStore((s) => s.user?.username) ?? "user";

  const handleSignOut = async () => {
    hapticChoice();
    await signOut();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await apiExportMe();
      const json = JSON.stringify(data, null, 2);
      const fileName = `touti-export-${username}-${Date.now()}.json`;
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Mes données Touti",
          UTI: "public.json",
        });
      } else {
        // Fallback : partage via Share API natif avec le JSON inliné
        await Share.share({ message: json });
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'exporter les données");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    hapticWarning();
    Alert.alert(
      "Supprimer mon compte ?",
      "Action définitive. Tout ton historique, ligues et statistiques seront supprimés du serveur. Tu ne pourras pas récupérer ton compte.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            // Deuxième confirmation
            Alert.alert(
              "Es-tu vraiment sûr ?",
              "Tape le nom de ton compte pour confirmer : " + username,
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "OUI, SUPPRIMER DÉFINITIVEMENT",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (e: any) {
                      Alert.alert("Erreur", e?.message ?? "Suppression impossible");
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + 20 }}>
        <View style={{ height: 60 }} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>RÉGLAGES</Text>
            <Text style={styles.title}>Paramètres</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Group title="Le jeu">
            <Row label="Langue" value="Français" />
            <Row label="Dos des cartes" value="Zellige" swatchColor={COLORS.terracottaDark} />
            <Row label="Couleur de table" value="Bois" swatchColor="#6b4126" />
            <Row label="Vitesse du jeu" value="Normale" />
            <Row
              label="Revoir le tutoriel"
              chevron
              last
              onPress={() => {
                hapticTap();
                navigation.navigate("Onboarding");
              }}
            />
          </Group>

          <Group title="Son & Vibrations">
            <Row label="Effets sonores" toggle toggled={sfx} onToggle={() => { hapticTap(); setSfx((v) => !v); }} />
            <Row label="Musique" toggle toggled={music} onToggle={() => { hapticTap(); setMusic((v) => !v); }} />
            <Row
              label="Vibrations"
              toggle
              toggled={vib}
              onToggle={() => {
                const next = !vib;
                setVib(next);
                setHapticsEnabled(next);
                if (next) hapticTap();
              }}
              last
            />
          </Group>

          <Group title="Compte">
            <Row label="Notifications" chevron />
            <Row
              label="Confidentialité & CGU"
              chevron
              onPress={() => navigation.navigate("Terms", { section: "privacy" })}
            />
            <Row
              label={exporting ? "Export en cours…" : "Télécharger mes données"}
              chevron={!exporting}
              onPress={exporting ? undefined : handleExport}
            />
            <Row label="Déconnexion" chevron onPress={handleSignOut} />
            <Row label="Supprimer mon compte" chevron danger last onPress={handleDelete} />
          </Group>

          <View style={styles.footer}>
            <Text style={styles.version}>TOUTI v0.1.0</Text>
            <Text style={styles.tagline}>Fait avec ♥ au Maroc</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  toggle,
  toggled,
  onToggle,
  chevron,
  swatchColor,
  danger,
  last,
  onPress,
}: {
  label: string;
  value?: string;
  toggle?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
  chevron?: boolean;
  swatchColor?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={toggle ? onToggle : onPress}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <Text style={[styles.rowLabel, danger && { color: "#E8553A" }]}>{label}</Text>
      <View style={styles.rowRight}>
        {swatchColor && <View style={[styles.swatch, { backgroundColor: swatchColor }]} />}
        {value !== undefined && !toggle && <Text style={styles.rowValue}>{value}</Text>}
        {toggle && (
          <View
            style={[
              styles.toggle,
              {
                backgroundColor: toggled ? COLORS.brassDeep : "rgba(255,255,255,0.12)",
              },
            ]}
          >
            {toggled && (
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[styles.toggleKnob, { left: toggled ? 20 : 2 }]} />
          </View>
        )}
        {chevron && (
          <Svg width={8} height={14} viewBox="0 0 8 14">
            <Path d="M1 1l6 6-6 6" stroke="rgba(245,235,214,0.35)" strokeWidth={2} fill="none" strokeLinecap="round" />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontFamily: FONT_UI_BOLD, fontWeight: "700" },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 4,
    color: COLORS.brass,
    fontWeight: "700",
  },
  title: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  groupTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.brass,
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  groupCard: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: "rgba(245,235,214,0.08)" },
  rowLabel: {
    fontFamily: FONT_UI,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.cream,
    flex: 1,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowValue: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.brass, fontWeight: "600" },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: COLORS.brass,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  toggleKnob: {
    position: "absolute",
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FDF6E3",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },

  footer: { alignItems: "center", marginTop: 24 },
  version: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 4,
    color: "rgba(245,235,214,0.4)",
    fontWeight: "700",
  },
  tagline: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.4)",
    marginTop: 6,
    fontStyle: "italic",
  },
});
