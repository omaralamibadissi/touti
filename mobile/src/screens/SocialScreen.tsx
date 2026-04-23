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
import { useAuthStore } from "../store/authStore";
import { hapticTap, hapticSuccess, hapticError } from "../lib/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Social">;

export default function SocialScreen({ navigation }: Props) {
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myUsername = useAuthStore((s) => s.user?.username) ?? "Joueur";
  const friends = useFriendsStore((s) => s.friends);
  const incoming = useFriendsStore((s) => s.incoming);
  const outgoing = useFriendsStore((s) => s.outgoing);
  const hydrated = useFriendsStore((s) => s.hydrated);
  const hydrate = useFriendsStore((s) => s.hydrate);
  const refresh = useFriendsStore((s) => s.refresh);
  const requestFriend = useFriendsStore((s) => s.request);
  const acceptFriend = useFriendsStore((s) => s.accept);
  const rejectFriend = useFriendsStore((s) => s.reject);

  useEffect(() => {
    if (!hydrated) hydrate(myUsername);
    else refresh();
  }, [hydrated, hydrate, refresh, myUsername]);

  const submitAdd = async () => {
    if (newName.trim().length < 3 || submitting) return;
    setSubmitting(true);
    const res = await requestFriend(newName);
    setSubmitting(false);
    if (res.ok) {
      setNewName("");
      hapticSuccess();
      Alert.alert(
        "Demande envoyée",
        `Ta demande a été envoyée à ${newName.trim()}. Tu deviendras ami dès qu'il accepte.`,
      );
    } else {
      hapticError();
      Alert.alert("Impossible", res.error);
    }
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

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 18 }}>
          {/* Ajout */}
          <View>
            <View style={styles.addBlock}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Pseudo exact de l'ami à ajouter…"
                placeholderTextColor="rgba(245,235,214,0.4)"
                style={styles.addInput}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={submitAdd}
              />
              <Pressable
                onPress={submitAdd}
                style={[styles.addBtn, (newName.trim().length < 3 || submitting) && { opacity: 0.4 }]}
                disabled={newName.trim().length < 3 || submitting}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.addBtnText}>{submitting ? "…" : "Envoyer"}</Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Le pseudo est sensible à la casse · Une demande sera envoyée à l'autre joueur qui devra l'accepter
            </Text>
          </View>

          {/* Demandes reçues */}
          {incoming.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>DEMANDES REÇUES · {incoming.length}</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {incoming.map((f) => (
                  <View key={f.id} style={[styles.friendRow, { borderColor: `${COLORS.saffron}66` }]}>
                    <Avatar initials={f.requesterName[0]?.toUpperCase() ?? "?"} size={40} color={COLORS.saffron} online={!!(f as any).requesterOnline} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.requesterName}</Text>
                      <Text style={styles.friendSub}>veut être ton ami</Text>
                    </View>
                    <Pressable
                      onPress={() => { hapticSuccess(); acceptFriend(f.id); }}
                      style={styles.acceptBtn}
                    >
                      <Text style={styles.acceptText}>✓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { hapticTap(); rejectFriend(f.id); }}
                      style={styles.rejectBtn}
                    >
                      <Text style={styles.rejectText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Amis confirmés */}
          {friends.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>TES AMIS · {friends.length}</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {friends.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => { hapticTap(); navigation.navigate("PlayerProfile", { name: f.name, friendshipId: f.id }); }}
                    style={styles.friendRow}
                  >
                    <Avatar initials={f.name[0]?.toUpperCase() ?? "?"} size={40} color={COLORS.teal} online={!!f.online} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.name}</Text>
                      <Text style={styles.friendSub}>
                        {f.online
                          ? "En ligne"
                          : `Ami depuis le ${new Date(f.addedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                      </Text>
                    </View>
                    <Text style={styles.viewArrow}>›</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.tapHint}>Tape un ami pour voir son profil</Text>
            </View>
          )}

          {/* Demandes envoyées */}
          {outgoing.length > 0 && (
            <View>
              <Text style={styles.sectionLabel}>EN ATTENTE · {outgoing.length}</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                {outgoing.map((f) => (
                  <View key={f.id} style={[styles.friendRow, { opacity: 0.65 }]}>
                    <Avatar initials={f.receiverName[0]?.toUpperCase() ?? "?"} size={40} color={COLORS.brass} online={!!(f as any).receiverOnline} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.receiverName}</Text>
                      <Text style={styles.friendSub}>en attente de réponse</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: "rgba(245,235,214,0.4)" }}>⏳</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyEmoji}>✾</Text>
              <Text style={styles.emptyTitle}>Pas encore d'amis</Text>
              <Text style={styles.emptySub}>
                Tape le pseudo exact d'un joueur pour lui envoyer une demande. Il doit avoir un compte et accepter pour que vous deveniez amis.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    minWidth: 90,
  },
  addBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    fontStyle: "italic",
    marginTop: 6,
    paddingHorizontal: 4,
    lineHeight: 14,
  },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700",
  },

  emptyBlock: {
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 14,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    alignItems: "center", gap: 10,
  },
  emptyEmoji: {
    fontSize: 36, color: COLORS.saffronSoft, fontFamily: FONT_DISPLAY,
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
    fontSize: 22,
    color: "rgba(245,235,214,0.4)",
    paddingHorizontal: 4,
  },
  tapHint: {
    marginTop: 8,
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.45)",
    fontStyle: "italic",
    textAlign: "center",
  },

  acceptBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: `${COLORS.saffron}33`,
    borderWidth: 0.5, borderColor: COLORS.saffron,
    alignItems: "center", justifyContent: "center",
  },
  acceptText: {
    fontSize: 16, fontWeight: "700", color: COLORS.saffronSoft,
    fontFamily: FONT_UI_BOLD,
  },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(200,70,45,0.15)",
    borderWidth: 0.5, borderColor: "rgba(232,85,58,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  rejectText: {
    fontSize: 20, fontWeight: "700", color: "#E8553A",
    lineHeight: 22, fontFamily: FONT_UI_BOLD,
  },
});
