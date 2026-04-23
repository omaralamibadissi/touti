// Paramètres d'une ligue — réservés aux admins.
// Modifier nom / tagline / couleur, ou supprimer la ligue.

import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { useLeagueStore } from "../store/leagueStore";
import { useAuthStore } from "../store/authStore";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueSettings">;

const LEAGUE_COLORS = [COLORS.teal, COLORS.brass, "#8B4A7F", COLORS.terracotta, "#2E7A8C"];

export default function LeagueSettingsScreen({ navigation, route }: Props) {
  const t = useT();
  const { id } = route.params;
  const league = useLeagueStore((s) => s.leagues.find((l) => l.id === id));
  const updateLeague = useLeagueStore((s) => s.update);
  const removeLeague = useLeagueStore((s) => s.remove);
  const myUsername = useAuthStore((s) => s.user?.username) ?? "";

  const [name, setName] = useState(league?.name ?? "");
  const [tagline, setTagline] = useState(league?.tagline ?? "");
  const [color, setColor] = useState(league?.color ?? COLORS.teal);
  const [saving, setSaving] = useState(false);

  if (!league) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI, fontSize: 14 }}>
          {t("leagues.notFound")}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { marginTop: 20 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>
    );
  }

  const isAdmin = league.members.find((m) => m.id === myUsername)?.role === "admin";
  if (!isAdmin) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800" }}>
          Accès réservé
        </Text>
        <Text style={{ color: "rgba(245,235,214,0.6)", fontFamily: FONT_UI, fontSize: 12, marginTop: 10, textAlign: "center" }}>
          Seuls les admins peuvent modifier les paramètres de la ligue.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { marginTop: 24 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>
    );
  }

  const dirty =
    name.trim() !== league.name ||
    (tagline ?? "") !== (league.tagline ?? "") ||
    color !== (league.color ?? COLORS.teal);

  const onSave = async () => {
    if (!dirty || saving) return;
    if (name.trim().length < 3) {
      Alert.alert("Nom trop court", "Minimum 3 caractères.");
      return;
    }
    setSaving(true);
    try {
      await updateLeague(id, {
        name: name.trim(),
        tagline: tagline.trim(),
        color,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      `Supprimer "${league.name}" ?`,
      "Cette action est immédiate et irréversible. Toutes les données (membres, chat, activité, tournois liés) seront perdues.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmer",
              "Tu es vraiment sûr ? Il n'y a pas de retour en arrière.",
              [
                { text: "Non", style: "cancel" },
                {
                  text: "Oui, supprimer",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await removeLeague(id);
                      navigation.popToTop();
                    } catch (e: any) {
                      Alert.alert("Erreur", e?.message ?? "Impossible");
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

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("leagues.settings").toUpperCase()}</Text>
          <Text style={styles.title}>{league.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 60 }}>
        {/* Nom */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Nom de la ligue</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom"
            placeholderTextColor="rgba(245,235,214,0.3)"
            style={styles.input}
            maxLength={40}
          />
        </View>

        {/* Tagline */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Slogan (optionnel)</Text>
          <TextInput
            value={tagline}
            onChangeText={setTagline}
            placeholder="Une phrase qui décrit la ligue"
            placeholderTextColor="rgba(245,235,214,0.3)"
            style={styles.input}
            maxLength={80}
          />
        </View>

        {/* Couleur */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Couleur</Text>
          <View style={styles.colorRow}>
            {LEAGUE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c && { borderColor: COLORS.saffronSoft, borderWidth: 2 },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sauvegarder */}
        <Pressable
          onPress={onSave}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.4 }]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.saveBtnText}>{saving ? "Sauvegarde…" : "Sauvegarder"}</Text>
        </Pressable>

        {/* Zone dangereuse */}
        <View style={styles.dangerBox}>
          <Text style={styles.dangerTitle}>Zone dangereuse</Text>
          <Text style={styles.dangerSub}>
            Supprimer la ligue efface définitivement tous ses contenus. Les membres seront déconnectés automatiquement.
          </Text>
          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Supprimer la ligue</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: "row", gap: 12, alignItems: "center",
    borderBottomWidth: 0.5, borderBottomColor: `${COLORS.brass}33`,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3,
    color: COLORS.brass, fontWeight: "700",
  },
  title: {
    fontFamily: FONT_UI_BOLD, fontSize: 18, fontWeight: "800",
    color: COLORS.saffronSoft, letterSpacing: 0.2, marginTop: 2,
  },

  field: { gap: 8 },
  fieldLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 1,
    color: COLORS.brass, fontWeight: "700",
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.cream,
    fontFamily: FONT_UI, fontSize: 14,
  },
  colorRow: { flexDirection: "row", gap: 10 },
  colorDot: {
    width: 40, height: 40, borderRadius: 20,
    borderColor: "transparent",
  },

  saveBtn: {
    paddingVertical: 14, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    marginTop: 6,
  },
  saveBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.3,
  },

  dangerBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "rgba(200,70,45,0.1)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.4)",
    gap: 10,
  },
  dangerTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 12, letterSpacing: 2,
    color: "#E8553A", fontWeight: "800",
  },
  dangerSub: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.65)", lineHeight: 16,
  },
  deleteBtn: {
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: "rgba(200,70,45,0.2)",
    borderWidth: 0.5, borderColor: "rgba(232,85,58,0.5)",
    alignItems: "center",
  },
  deleteBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: "#E8553A", letterSpacing: 0.3,
  },
});
