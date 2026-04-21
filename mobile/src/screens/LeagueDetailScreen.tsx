import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useLeagueStore } from "../store/leagueStore";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

export default function LeagueDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const league = useLeagueStore((s) => s.leagues.find((l) => l.id === id));
  const leave = useLeagueStore((s) => s.leave);
  const setActive = useLeagueStore((s) => s.setActive);
  const activeId = useLeagueStore((s) => s.activeLeagueId);
  const myUsername = useAuthStore((s) => s.user?.username) ?? "Player";

  // NB : pas de redirect agressif — si la ligue disparaît (leave/remove),
  // l'écran affiche un état vide le temps que l'utilisateur navigue back.
  if (!league) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={["#2E1B5B", "#0B0721"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI, fontSize: 14 }}>
          Ligue introuvable
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.iconBtn, { marginTop: 20 }]}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
      </View>
    );
  }

  const color = league.color || COLORS.teal;
  const isAdmin = league.members.find((m) => m.id === myUsername)?.role === "admin";

  const share = async () => {
    try {
      await Share.share({
        message: `Rejoins ma ligue Touti "${league.name}" !\nCode : ${league.code}\n\nOuvre l'app Touti → Mes ligues → Rejoindre.`,
      });
    } catch {}
  };

  const onLeave = () => {
    Alert.alert(
      "Quitter la ligue",
      `Sûr de quitter "${league.name}" ? Tu perdras l'accès aux tournois privés de la ligue.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            await leave(league.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const createTournament = () => {
    // On passe l'id de la ligue aux params de création pour restriction optionnelle
    navigation.navigate("CreateTournament", { leagueId: league.id });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[color, "#0B0721"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.1 }]} pointerEvents="none">
        <ZelligeBg color={color} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LIGUE</Text>
          <Text style={styles.title} numberOfLines={1}>{league.name}</Text>
        </View>
        <Pressable onPress={share} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>↗</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CODE D'INVITATION</Text>
          <Text style={styles.codeValue}>{league.code}</Text>
          {league.tagline && <Text style={styles.tagline}>"{league.tagline}"</Text>}
          <Pressable onPress={share} style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>↗ Partager le code</Text>
          </Pressable>
        </View>

        {/* Actif */}
        {activeId !== league.id && (
          <Pressable onPress={() => setActive(league.id)} style={styles.activateCard}>
            <Text style={styles.activateText}>
              Activer cette ligue pour filtrer tes tournois
            </Text>
          </Pressable>
        )}

        {/* Membres */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            MEMBRES · {league.members.length}
          </Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {league.members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Avatar initials={m.name[0]?.toUpperCase() ?? "?"} size={34} color={color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.name}
                    {m.id === myUsername && <Text style={{ color: COLORS.saffronSoft }}>  (vous)</Text>}
                  </Text>
                  <Text style={styles.memberMeta}>
                    {m.role === "admin" ? "Administrateur" : "Membre"}
                    {" · "}
                    depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action : voir le classement de la ligue */}
        <Pressable
          onPress={() => navigation.navigate("Leaderboard", { scope: "league" })}
          style={[styles.bigBtn, { marginTop: 24, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0.5, borderColor: `${COLORS.brass}55` }]}
        >
          <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Voir le classement</Text>
          <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
            Individuel + paires, filtré sur la ligue
          </Text>
        </Pressable>

        {/* Action : créer un tournoi de la ligue */}
        <Pressable onPress={createTournament} style={[styles.bigBtn, { marginTop: 10 }]}>
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.bigBtnTitle}>Créer un tournoi de ligue</Text>
          <Text style={styles.bigBtnSub}>Réservé aux membres de "{league.name}"</Text>
        </Pressable>

        {/* Quitter */}
        <Pressable onPress={onLeave} style={[styles.leaveBtn, { marginTop: 16 }]}>
          <Text style={styles.leaveBtnText}>
            {isAdmin ? "Supprimer la ligue" : "Quitter la ligue"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  codeCard: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    alignItems: "center",
  },
  codeLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
  },
  codeValue: {
    fontFamily: FONT_DISPLAY,
    fontSize: 44,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 8,
    marginTop: 8,
  },
  tagline: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.65)",
    fontStyle: "italic",
    marginTop: 6,
  },
  shareBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${COLORS.brass}33`,
  },
  shareBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.saffronSoft,
    letterSpacing: 1,
  },

  activateCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(245,215,120,0.15)",
    borderWidth: 0.5,
    borderColor: `${COLORS.saffron}55`,
    alignItems: "center",
  },
  activateText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    color: COLORS.saffronSoft,
    fontWeight: "700",
  },

  section: { marginTop: 24 },
  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.6)",
    fontWeight: "700",
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.1)",
  },
  memberName: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.cream,
  },
  memberMeta: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    marginTop: 2,
  },

  bigBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bigBtnTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
  bigBtnSub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.75)",
    marginTop: 3,
    letterSpacing: 1,
    fontWeight: "700",
    fontStyle: "italic",
  },

  leaveBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(200,70,45,0.15)",
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.5)",
  },
  leaveBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    color: "#E8553A",
    fontWeight: "700",
  },
});
