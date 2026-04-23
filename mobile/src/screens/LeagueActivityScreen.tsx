// Timeline d'activité d'une ligue — joins/leaves, promotions, kicks,
// tournois créés, matchs joués. Pull-to-refresh + état vide soigné.

import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, FlatList,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { useLeagueStore } from "../store/leagueStore";
import { apiGetLeagueActivity, type LeagueActivityApi } from "../net/leagueActivityApi";
import { useT, i18n } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueActivity">;

export default function LeagueActivityScreen({ navigation, route }: Props) {
  const t = useT();
  const { id } = route.params;
  const league = useLeagueStore((s) => s.leagues.find((l) => l.id === id));
  const [events, setEvents] = useState<LeagueActivityApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await apiGetLeagueActivity(id, { limit: 80 });
      setEvents(list);
    } catch {}
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("leagues.activity").toUpperCase()}</Text>
          <Text style={styles.title}>{league.name}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.saffronSoft} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>{t("leagues.activityEmpty")}</Text>
          <Text style={styles.emptySub}>{t("leagues.activityFirst")}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => <ActivityRow event={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.saffronSoft}
            />
          }
        />
      )}
    </View>
  );
}

function ActivityRow({ event }: { event: LeagueActivityApi }) {
  const { icon, text, accent } = renderEvent(event);
  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { borderColor: accent }]}>
        <Text style={[styles.iconText, { color: accent }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowText}>{text}</Text>
        <Text style={styles.rowTime}>{formatRelative(event.createdAt)}</Text>
      </View>
    </View>
  );
}

function renderEvent(e: LeagueActivityApi): { icon: string; text: string; accent: string } {
  const data = e.data || {};
  switch (e.type) {
    case "member_joined":
      return {
        icon: "＋",
        text: `${e.actorName ?? "Quelqu'un"} a rejoint la ligue`,
        accent: COLORS.saffronSoft,
      };
    case "member_left":
      return {
        icon: "→",
        text: `${e.actorName ?? "Quelqu'un"} a quitté la ligue`,
        accent: "rgba(245,235,214,0.55)",
      };
    case "member_kicked":
      return {
        icon: "⊘",
        text: `${e.actorName ?? "Admin"} a exclu ${e.targetName ?? "un membre"}`,
        accent: "#E8553A",
      };
    case "member_promoted":
      return {
        icon: "★",
        text: `${e.targetName ?? "Un membre"} est maintenant admin (par ${e.actorName ?? "un admin"})`,
        accent: COLORS.brass,
      };
    case "member_demoted":
      return {
        icon: "↓",
        text: `${e.targetName ?? "Un admin"} est redevenu membre (par ${e.actorName ?? "un admin"})`,
        accent: COLORS.brass,
      };
    case "tournament_created":
      return {
        icon: "♕",
        text: `${e.actorName ?? "Quelqu'un"} a créé le tournoi « ${data.name ?? "sans nom"} »`,
        accent: COLORS.saffronSoft,
      };
    case "match_played": {
      const players: string[] = data.players ?? [];
      const teamA = players.slice(0, 1).join(" & ") + (players[2] ? ` / ${players[2]}` : "");
      const teamB = players.slice(1, 2).join(" & ") + (players[3] ? ` / ${players[3]}` : "");
      const winner = data.winnerTeam === "A" ? teamA : teamB;
      return {
        icon: "♠",
        text: `${winner} gagne ${data.scoreA ?? "?"} - ${data.scoreB ?? "?"}`,
        accent: COLORS.teal,
      };
    }
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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

  centerBox: {
    flex: 1,
    alignItems: "center", justifyContent: "center",
    padding: 24, gap: 8,
  },
  emptyTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700",
    color: COLORS.cream,
  },
  emptySub: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.55)", textAlign: "center",
    lineHeight: 18,
  },

  row: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    borderRadius: 10,
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    alignItems: "center", justifyContent: "center",
  },
  iconText: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700",
    lineHeight: 16,
  },
  rowText: {
    fontFamily: FONT_UI, fontSize: 12,
    color: COLORS.cream, lineHeight: 16,
  },
  rowTime: {
    fontFamily: FONT_UI, fontSize: 10,
    color: "rgba(245,235,214,0.5)", marginTop: 4, letterSpacing: 0.3,
  },
});
