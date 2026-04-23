// Paramètres d'une ligue — réservés aux admins.
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Modifier nom / tagline / couleur, ou supprimer la ligue.

import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Alert, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
  const insets = useSafeAreaInsets();
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
          {t("leagues.accessRestricted")}
        </Text>
        <Text style={{ color: "rgba(245,235,214,0.6)", fontFamily: FONT_UI, fontSize: 12, marginTop: 10, textAlign: "center" }}>
          {t("leagues.accessRestrictedBody")}
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

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("profile.photoPermTitle"), t("profile.photoPermBody"));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    try {
      const out = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!out.base64) throw new Error("no base64");
      const dataUrl = `data:image/jpeg;base64,${out.base64}`;
      await updateLeague(id, { photo: dataUrl });
    } catch (e: any) {
      Alert.alert(t("common.error"), e?.message ?? t("profile.photoFailBody"));
    }
  };

  const removePhoto = async () => {
    Alert.alert(
      t("leagues.photoRemoveTitle"),
      t("leagues.photoRemoveBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            try {
              await updateLeague(id, { photo: null });
            } catch (e: any) {
              Alert.alert(t("common.error"), e?.message ?? t("leagues.errorSave"));
            }
          },
        },
      ],
    );
  };

  const onLogoPress = () => {
    if (league.photo) {
      Alert.alert(
        t("leagues.photoActionsTitle"),
        undefined,
        [
          { text: t("profile.photoChange"), onPress: pickPhoto },
          { text: t("common.remove"), style: "destructive", onPress: removePhoto },
          { text: t("common.cancel"), style: "cancel" },
        ],
      );
    } else {
      pickPhoto();
    }
  };

  const onSave = async () => {
    if (!dirty || saving) return;
    if (name.trim().length < 3) {
      Alert.alert(t("leagues.nameShort"), t("leagues.nameShortBody"));
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
      Alert.alert(t("common.error"), e?.message ?? t("leagues.errorSave"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      t("leagues.deleteSureTitle", { name: league.name }),
      t("leagues.deleteSureBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("leagues.confirmTitle"),
              t("leagues.confirmBody"),
              [
                { text: t("common.no"), style: "cancel" },
                {
                  text: t("leagues.confirmYesDelete"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await removeLeague(id);
                      navigation.popToTop();
                    } catch (e: any) {
                      Alert.alert(t("common.error"), e?.message ?? t("leagues.errorGeneric"));
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

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("leagues.settings").toUpperCase()}</Text>
          <Text style={styles.title}>{league.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 60 }}>
        {/* Photo */}
        <View style={{ alignItems: "center", gap: 10 }}>
          <Pressable onPress={onLogoPress} hitSlop={10} style={styles.photoWrap}>
            {league.photo ? (
              <Image source={{ uri: league.photo }} style={styles.photo} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[color, "#000"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.photo}
              />
            )}
            <View style={styles.photoEditBadge}>
              <Text style={styles.photoEditIcon}>✎</Text>
            </View>
          </Pressable>
          <Text style={styles.photoHint}>{t("leagues.photoTapHint")}</Text>
        </View>

        {/* Nom */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("leagues.nameField")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("leagues.namePlaceholder3")}
            placeholderTextColor="rgba(245,235,214,0.3)"
            style={styles.input}
            maxLength={40}
          />
        </View>

        {/* Tagline */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("leagues.taglineField")}</Text>
          <TextInput
            value={tagline}
            onChangeText={setTagline}
            placeholder={t("leagues.taglinePlaceholder")}
            placeholderTextColor="rgba(245,235,214,0.3)"
            style={styles.input}
            maxLength={80}
          />
        </View>

        {/* Couleur */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t("leagues.colorField")}</Text>
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
          <Text style={styles.saveBtnText}>{saving ? t("leagues.saveBusy") : t("leagues.saveAction")}</Text>
        </Pressable>

        {/* Zone dangereuse */}
        <View style={styles.dangerBox}>
          <Text style={styles.dangerTitle}>{t("leagues.dangerZone")}</Text>
          <Text style={styles.dangerSub}>{t("leagues.dangerBody")}</Text>
          <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>{t("leagues.deleteAction")}</Text>
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

  photoWrap: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: `${COLORS.brass}88`,
    overflow: "visible",
  },
  photo: {
    width: 106, height: 106, borderRadius: 53, overflow: "hidden",
  },
  photoEditBadge: {
    position: "absolute",
    bottom: -2, right: -2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.saffron,
    borderWidth: 2, borderColor: COLORS.tealDeep,
    alignItems: "center", justifyContent: "center",
  },
  photoEditIcon: {
    fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "800",
    color: COLORS.terracottaDark, lineHeight: 17,
  },
  photoHint: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.55)", letterSpacing: 0.5,
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
