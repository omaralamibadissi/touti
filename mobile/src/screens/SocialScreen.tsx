import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";
import { useFriendsStore } from "../store/friendsStore";

type Props = NativeStackScreenProps<RootStackParamList, "Social">;

export default function SocialScreen({ navigation }: Props) {
  const [newName, setNewName] = useState("");

  const friends = useFriendsStore((s) => s.friends);
  const hydrated = useFriendsStore((s) => s.hydrated);
  const hydrate = useFriendsStore((s) => s.hydrate);
  const addFriend = useFriendsStore((s) => s.add);
  const removeFriend = useFriendsStore((s) => s.remove);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const submitAdd = () => {
    if (newName.trim().length < 2) return;
    addFriend(newName);
    setNewName("");
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert(`Retirer ${name} ?`, "", [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: () => removeFriend(id) },
    ]);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.tealDeep, "#051D20"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + 20 }}>
        <View style={{ height: 60 }} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>SOCIAL</Text>
          <Text style={styles.title}>Mes amis</Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
          {/* Ajout */}
          <View>
            <View style={styles.addBlock}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Pseudo d'un ami à ajouter…"
                placeholderTextColor="rgba(245,235,214,0.4)"
                style={styles.addInput}
                onSubmitEditing={submitAdd}
              />
              <Pressable
                onPress={submitAdd}
                style={[styles.addBtn, newName.trim().length < 2 && { opacity: 0.4 }]}
                disabled={newName.trim().length < 2}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.addBtnText}>+ Ajouter</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Au moins 2 caractères ({newName.trim().length} pour l'instant)
            </Text>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>Aucun ami pour l'instant</Text>
              <Text style={styles.emptySub}>
                Ajoute le pseudo d'un pote pour le voir apparaître ici. Pour jouer ensemble, partage le code de ta partie privée ou ajoute-le à une ligue.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLabel}>TES AMIS · {friends.length}</Text>
              <View style={{ gap: 8, marginTop: 6 }}>
                {friends.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => navigation.navigate("PlayerProfile", { name: f.name })}
                    style={styles.friendRow}
                  >
                    <Avatar initials={f.name[0]?.toUpperCase() ?? "?"} size={40} color={COLORS.teal} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.name}</Text>
                      <Text style={styles.friendSub}>
                        Ajouté le {new Date(f.addedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </Text>
                    </View>
                    <Text style={styles.viewArrow}>→</Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        confirmRemove(f.id, f.name);
                      }}
                      hitSlop={8}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.tapHint}>Tape un ami pour voir son profil</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16 },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11, letterSpacing: 4,
    color: COLORS.brass, fontWeight: "700",
  },
  title: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 28, fontWeight: "800",
    color: COLORS.saffronSoft, marginTop: 4, letterSpacing: 0.3,
  },

  addBlock: { flexDirection: "row", gap: 8 },
  addInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.cream,
    fontFamily: FONT_UI, fontSize: 14,
  },
  addBtn: {
    paddingHorizontal: 16, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  addBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
    marginTop: 4,
    paddingHorizontal: 4,
  },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700",
    marginBottom: 4,
  },

  emptyBlock: {
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    alignItems: "center", gap: 8,
  },
  emptyTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700",
    color: COLORS.cream,
  },
  emptySub: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.6)",
    textAlign: "center", lineHeight: 18,
  },

  friendRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 12,
  },
  friendName: {
    fontFamily: FONT_UI_BOLD, fontSize: 14,
    color: COLORS.cream, fontWeight: "700",
  },
  friendSub: {
    fontFamily: FONT_UI, fontSize: 10,
    color: "rgba(245,235,214,0.55)", marginTop: 2,
  },
  viewArrow: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    color: "rgba(245,235,214,0.4)",
  },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(200,70,45,0.2)",
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
  removeText: { color: "#E8553A", fontSize: 18, fontWeight: "700", lineHeight: 20 },
  tapHint: {
    marginTop: 8,
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.45)",
    fontStyle: "italic",
    textAlign: "center",
  },
});
