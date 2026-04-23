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
import { buildLeagueLink } from "../lib/deepLink";
import { useT, i18n } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueDetail">;

export default function LeagueDetailScreen({ navigation, route }: Props) {
  const t = useT();
  const { id } = route.params;
  const league = useLeagueStore((s) => s.leagues.find((l) => l.id === id));
  const leave = useLeagueStore((s) => s.leave);
  const setActive = useLeagueStore((s) => s.setActive);
  const activeId = useLeagueStore((s) => s.activeLeagueId);
  const promote = useLeagueStore((s) => s.promote);
  const demote = useLeagueStore((s) => s.demote);
  const kick = useLeagueStore((s) => s.kick);
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

  const openMemberActions = (member: { id: string; name: string; role: "admin" | "member" }) => {
    if (!isAdmin || member.id === myUsername) return;
    const options: any[] = [];
    if (member.role === "member") {
      options.push({
        text: t("leagues.promoteAdmin"),
        onPress: async () => {
          try { await promote(league.id, member.name); }
          catch (e: any) { Alert.alert(t("common.error"), e?.message ?? t("leagues.errorGeneric")); }
        },
      });
    } else {
      options.push({
        text: t("leagues.demoteAdmin"),
        onPress: async () => {
          try { await demote(league.id, member.name); }
          catch (e: any) { Alert.alert(t("common.error"), e?.message ?? t("leagues.errorGeneric")); }
        },
      });
    }
    options.push({
      text: t("leagues.kickMember"),
      style: "destructive",
      onPress: () => {
        Alert.alert(
          t("leagues.kickTitle", { name: member.name }),
          t("leagues.kickConfirmBody"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("leagues.kickBtn"),
              style: "destructive",
              onPress: async () => {
                try { await kick(league.id, member.name); }
                catch (e: any) { Alert.alert(t("common.error"), e?.message ?? t("leagues.errorGeneric")); }
              },
            },
          ],
        );
      },
    });
    options.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(member.name, member.role === "admin" ? t("leagues.adminRoleLabel") : t("leagues.memberRoleLabel"), options);
  };

  const share = async () => {
    try {
      const link = buildLeagueLink(league.code);
      await Share.share({
        message: t("leagues.shareMessage", { name: league.name, code: league.code, link }),
      });
    } catch {}
  };

  const onLeave = () => {
    const admins = league.members.filter((m) => m.role === "admin");
    const onlyAdmin = isAdmin && admins.length === 1 && league.members.length > 1;
    const willDelete = league.members.length === 1;

    const body = willDelete
      ? t("leagues.leaveBodyLast")
      : onlyAdmin
      ? t("leagues.leaveBodyOnlyAdmin")
      : t("leagues.leaveBodyNormal", { name: league.name });

    Alert.alert(t("leagues.leaveLeague"), body, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: willDelete ? t("leagues.leaveAndDelete") : t("leagues.leaveBtn"),
        style: "destructive",
        onPress: async () => {
          try {
            await leave(league.id, myUsername);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert(t("common.error"), e?.message ?? t("leagues.errorGeneric"));
          }
        },
      },
    ]);
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
          <Text style={styles.eyebrow}>{t("leagues.eyebrow")}</Text>
          <Text style={styles.title} numberOfLines={1}>{league.name}</Text>
        </View>
        <Pressable onPress={share} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>↗</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Code card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t("tournaments.code").toUpperCase()}</Text>
          <Text style={styles.codeValue}>{league.code}</Text>
          {league.tagline && <Text style={styles.tagline}>"{league.tagline}"</Text>}
          <Pressable onPress={share} style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>↗ {t("common.share")}</Text>
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
            {league.members.map((m) => {
              const canManage = isAdmin && m.id !== myUsername;
              return (
                <View key={m.id} style={styles.memberRow}>
                  <Avatar initials={m.name[0]?.toUpperCase() ?? "?"} size={34} color={color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>
                      {m.name}
                      {m.id === myUsername && <Text style={{ color: COLORS.saffronSoft }}>  (vous)</Text>}
                    </Text>
                    <Text style={styles.memberMeta}>
                      {m.role === "admin" ? t("leagues.administrator") : t("leagues.memberOf")}
                      {" · "}
                      {t("leagues.joinedSince", { date: new Date(m.joinedAt).toLocaleDateString(i18n.locale.startsWith("en") ? "en-US" : i18n.locale.startsWith("ar") ? "ar-MA" : "fr-FR", { day: "numeric", month: "short" }) })}
                    </Text>
                  </View>
                  {canManage && (
                    <Pressable
                      onPress={() => openMemberActions(m)}
                      style={styles.memberMenuBtn}
                      hitSlop={8}
                    >
                      <Text style={styles.memberMenuDots}>⋯</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Action : chat de ligue */}
        <Pressable
          onPress={() => navigation.navigate("LeagueChat", { id: league.id })}
          style={[styles.bigBtn, { marginTop: 24, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0.5, borderColor: `${COLORS.brass}55` }]}
        >
          <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>💬 {t("leagues.chat")}</Text>
          <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
            Discute avec les membres de "{league.name}"
          </Text>
        </Pressable>

        {/* Action : fil d'activité */}
        <Pressable
          onPress={() => navigation.navigate("LeagueActivity", { id: league.id })}
          style={[styles.bigBtn, { marginTop: 10, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0.5, borderColor: `${COLORS.brass}55` }]}
        >
          <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>📜 {t("leagues.activity")}</Text>
          <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
            Membres, tournois, matchs joués
          </Text>
        </Pressable>

        {/* Action : voir le classement de la ligue */}
        <Pressable
          onPress={() => navigation.navigate("Leaderboard", { scope: "league" })}
          style={[styles.bigBtn, { marginTop: 10, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0.5, borderColor: `${COLORS.brass}55` }]}
        >
          <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("leagues.viewLeaderboard")}</Text>
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
          <Text style={styles.bigBtnTitle}>{t("tournaments.create")}</Text>
          <Text style={styles.bigBtnSub}>Réservé aux membres de "{league.name}"</Text>
        </Pressable>

        {/* Action admin : paramètres de la ligue */}
        {isAdmin && (
          <Pressable
            onPress={() => navigation.navigate("LeagueSettings", { id: league.id })}
            style={[styles.bigBtn, { marginTop: 10, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 0.5, borderColor: `${COLORS.brass}55` }]}
          >
            <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>⚙ Paramètres</Text>
            <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
              Modifier nom, couleur, slogan · Supprimer la ligue
            </Text>
          </Pressable>
        )}

        {/* Quitter (action perso — même admin peut quitter sans supprimer) */}
        <Pressable onPress={onLeave} style={[styles.leaveBtn, { marginTop: 16 }]}>
          <Text style={styles.leaveBtnText}>{t("leagues.leaveLeague")}</Text>
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
  memberMenuBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  memberMenuDots: {
    fontSize: 18, color: COLORS.cream, fontWeight: "700", lineHeight: 18,
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
