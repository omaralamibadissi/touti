// Profil d'un ami — même layout que ProfileScreen mais avec sections
// spécifiques : ligues en commun, matchs en commun (coéquipier / adversaire).

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg, StarBurst } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useMatchHistoryStore, type MatchEntry } from "../store/matchHistoryStore";
import { useFriendsStore } from "../store/friendsStore";
import { useLeagueStore } from "../store/leagueStore";
import { useTournamentStore } from "../store/tournamentStore";
import { useAuthStore } from "../store/authStore";
import { totalXp, levelProgress, rankLabel, matchUserTeam, matchUserWon } from "../lib/leveling";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerProfile">;

// Tournois gagnés par `playerName` (paire gagnante).
function countTournamentsWon(
  tournaments: { status: string; pairs?: { names: [string, string]; wins: number; points: number }[] }[],
  playerName: string,
): number {
  let n = 0;
  for (const t of tournaments) {
    if (t.status !== "finished" || !t.pairs || t.pairs.length === 0) continue;
    const winner = [...t.pairs].sort((a, b) => b.points - a.points || b.wins - a.wins)[0];
    if (winner.names.includes(playerName)) n++;
  }
  return n;
}

export default function PlayerProfileScreen({ navigation, route }: Props) {
  const { name, friendshipId } = route.params;
  const initials = (name[0] ?? "?").toUpperCase();

  const myUsername = useAuthStore((s) => s.user?.username ?? "");
  const removeFriend = useFriendsStore((s) => s.remove);
  const friends = useFriendsStore((s) => s.friends);
  const online = friends.find((f) => f.id === friendshipId)?.online ?? false;
  const allMatches = useMatchHistoryStore((s) => s.matches);
  const leagues = useLeagueStore((s) => s.leagues);
  const tournaments = useTournamentStore((s) => s.mine);

  // Parties impliquant ce joueur (humains uniquement, pas IRL)
  const playerMatches = useMemo(
    () => allMatches.filter((m: MatchEntry) =>
      m.type !== "irl" && m.playerNames?.includes(name)
    ),
    [allMatches, name],
  );

  // Stats calculées DU POINT DE VUE de l'ami (à partir de mon historique partagé)
  const stats = useMemo(() => {
    const games = playerMatches.length;
    let wins = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const m of playerMatches) {
      // Détection robuste de l'équipe via helper (case-insensitive + trim)
      const team = matchUserTeam(m, name);
      const onA = team === "A";
      const won = matchUserWon(m, name);
      if (won) wins++;
      if (onA) {
        pointsFor += m.scoreA;
        pointsAgainst += m.scoreB;
      } else {
        pointsFor += m.scoreB;
        pointsAgainst += m.scoreA;
      }
    }
    const losses = games - wins;
    const ratio = games === 0 ? 0 : Math.round((wins / games) * 100);
    const tournamentsWon = countTournamentsWon(tournaments, name);
    const xp = totalXp(playerMatches);
    const prog = levelProgress(xp);
    return {
      games, wins, losses, ratio,
      pointsFor, pointsAgainst, tournamentsWon,
      level: prog.level,
      xpIntoLevel: prog.xpIntoLevel,
      xpForNextLevel: prog.xpForNextLevel,
      progressRatio: prog.ratio,
      rank: rankLabel(prog.level),
    };
  }, [playerMatches, tournaments, name]);

  // Ligues en commun : où moi + l'ami sommes membres
  const commonLeagues = useMemo(() => {
    if (!myUsername) return [];
    return leagues.filter((l) => {
      const names = l.members.map((m) => m.name);
      return names.includes(myUsername) && names.includes(name);
    });
  }, [leagues, myUsername, name]);

  // Matchs en commun : partitionés coéquipier (même équipe) / adversaire
  const matchesWithFriend = useMemo(() => {
    if (!myUsername) return { teammate: [], opponent: [] };
    const teammate: MatchEntry[] = [];
    const opponent: MatchEntry[] = [];
    for (const m of playerMatches) {
      if (!m.playerNames.includes(myUsername)) continue;
      // équipe A = sièges 0,2 · équipe B = sièges 1,3
      const myIdx = m.playerNames.indexOf(myUsername);
      const theirIdx = m.playerNames.indexOf(name);
      const myTeam = myIdx % 2 === 0 ? "A" : "B";
      const theirTeam = theirIdx % 2 === 0 ? "A" : "B";
      if (myTeam === theirTeam) teammate.push(m);
      else opponent.push(m);
    }
    return { teammate, opponent };
  }, [playerMatches, myUsername, name]);

  const confirmDelete = () => {
    Alert.alert(
      `Supprimer ${name} ?`,
      "Vous ne serez plus amis. Tu pourras lui renvoyer une demande plus tard.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmer",
              `Retirer définitivement ${name} de tes amis ?`,
              [
                { text: "Non", style: "cancel" },
                {
                  text: "Oui, supprimer",
                  style: "destructive",
                  onPress: async () => {
                    if (!friendshipId) return;
                    await removeFriend(friendshipId);
                    navigation.goBack();
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

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Bannière */}
        <View style={styles.banner}>
          <LinearGradient colors={[COLORS.terracotta, COLORS.terracottaDark]} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { opacity: 0.15 }]} pointerEvents="none">
            <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={50} />
          </View>
          <View style={{ position: "absolute", top: -80, right: -60, opacity: 0.25 }} pointerEvents="none">
            <StarBurst size={280} color={COLORS.saffronSoft} strokeW={0.8} />
          </View>

          <View style={styles.topBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
          </View>

          <View style={styles.idRow}>
            <View>
              <Avatar initials={initials} size={84} color={COLORS.teal} online={online} />
              <View style={styles.levelBadge}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.levelText}>{stats.level}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.handle}>@{name.toLowerCase().replace(/\s+/g, "_")}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.expertTag}>
                  <Text style={styles.expertText}>{stats.rank}</Text>
                </View>
                {online && (
                  <View style={styles.onlineTag}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>EN LIGNE</Text>
                  </View>
                )}
              </View>
              <View style={styles.xpBarWrap}>
                <View style={styles.xpBarBg}>
                  <View style={[styles.xpBarFill, { width: `${Math.max(2, stats.progressRatio * 100)}%` }]} />
                </View>
                <Text style={styles.xpBarText}>
                  {stats.xpIntoLevel} / {stats.xpForNextLevel} XP → niv. {stats.level + 1}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats — même layout que ProfileScreen */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatBlock label="Parties" value={String(stats.games)} />
            <StatBlock label="Victoires" value={String(stats.wins)} highlight />
            <StatBlock label="Ratio" value={stats.games ? `${stats.ratio}%` : "—"} />
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <StatBlock label="Points gagnés" value={String(stats.pointsFor)} />
            <StatBlock label="Points perdus" value={String(stats.pointsAgainst)} />
            <StatBlock label="Tournois gagnés" value={String(stats.tournamentsWon)} highlight />
          </View>
        </View>

        {/* Ligues en commun */}
        {commonLeagues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ligues en commun</Text>
            <View style={{ gap: 6, marginTop: 10 }}>
              {commonLeagues.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => navigation.navigate("LeagueDetail", { id: l.id })}
                  style={styles.leagueRow}
                >
                  <View style={[styles.leagueDot, { backgroundColor: l.color ?? COLORS.brass }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leagueName}>{l.name}</Text>
                    <Text style={styles.leagueSub}>
                      {l.members.length} membre{l.members.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Matchs en commun — coéquipier */}
        {matchesWithFriend.teammate.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              En équipe ({matchesWithFriend.teammate.length})
            </Text>
            <View style={{ gap: 6, marginTop: 10 }}>
              {matchesWithFriend.teammate.slice(0, 5).map((m) => (
                <MatchRow key={m.id} match={m} myUsername={myUsername} navigation={navigation} />
              ))}
            </View>
          </View>
        )}

        {/* Matchs en commun — adversaire */}
        {matchesWithFriend.opponent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Contre {name} ({matchesWithFriend.opponent.length})
            </Text>
            <View style={{ gap: 6, marginTop: 10 }}>
              {matchesWithFriend.opponent.slice(0, 5).map((m) => (
                <MatchRow key={m.id} match={m} myUsername={myUsername} navigation={navigation} />
              ))}
            </View>
          </View>
        )}

        {/* Aucune interaction */}
        {commonLeagues.length === 0 && playerMatches.length === 0 && (
          <View style={[styles.section, { paddingTop: 24 }]}>
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucune partie ni ligue en commun avec {name}
              </Text>
            </View>
          </View>
        )}

        {/* Action : envoyer un message direct */}
        {friendshipId && (() => {
          const otherId = friends.find((f) => f.id === friendshipId)?.otherId;
          if (!otherId) return null;
          return (
            <View style={styles.dmSection}>
              <Pressable
                onPress={() => navigation.navigate("DirectMessage", { otherId, otherName: name })}
                style={styles.dmBtn}
              >
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.dmBtnText}>💬 Envoyer un message</Text>
              </Pressable>
            </View>
          );
        })()}

        {/* Bouton suppression ami */}
        {friendshipId && (
          <View style={styles.dangerSection}>
            <Pressable onPress={confirmDelete} style={styles.dangerBtn}>
              <Text style={styles.dangerText}>Supprimer cet ami</Text>
            </Pressable>
            <Text style={styles.dangerHint}>
              Supprime {name} de ta liste d'amis. Vous pourrez redevenir amis en envoyant une nouvelle demande.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MatchRow({
  match, myUsername, navigation,
}: {
  match: MatchEntry;
  myUsername: string;
  navigation: Props["navigation"];
}) {
  const myIdx = match.playerNames.indexOf(myUsername);
  const onA = myIdx === 0 || myIdx === 2;
  const won = (match.winnerTeam === "A" && onA) || (match.winnerTeam === "B" && !onA);
  return (
    <Pressable
      onPress={() => navigation.navigate("MatchDetail", { id: match.id })}
      style={styles.gameRow}
    >
      <View style={[styles.wonBar, { backgroundColor: won ? "#3FC26A" : "#E8553A" }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.gameTitle}>
          {won ? "Victoire" : "Défaite"} ·{" "}
          {new Date(match.finishedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </Text>
        <Text style={styles.gameSub}>
          {match.playerNames.filter((n) => n !== myUsername).join(" · ")}
        </Text>
      </View>
      <Text style={[styles.gameScore, { color: won ? COLORS.saffronSoft : "rgba(245,235,214,0.7)" }]}>
        {match.scoreA}-{match.scoreB}
      </Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.statValue, { color: highlight ? COLORS.saffronSoft : COLORS.cream }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: { height: 240, overflow: "hidden" },
  topBar: { position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row" },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },

  idRow: { flexDirection: "row", alignItems: "flex-end", gap: 14, padding: 20, paddingTop: 110 },
  levelBadge: {
    position: "absolute", bottom: -4, right: -4,
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: COLORS.terracottaDark,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  levelText: {
    fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  name: {
    fontFamily: FONT_UI_BOLD, fontSize: 26, fontWeight: "800",
    color: COLORS.cream, letterSpacing: 0.3,
  },
  handle: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    letterSpacing: 1.5, marginTop: 4, fontStyle: "italic",
  },
  tagsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  expertTag: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COLORS.saffron, borderRadius: 4 },
  onlineTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 7, paddingVertical: 3,
    backgroundColor: "rgba(63,194,106,0.18)",
    borderWidth: 0.5, borderColor: "rgba(63,194,106,0.55)",
    borderRadius: 4,
  },
  onlineDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#3FC26A",
  },
  onlineText: {
    fontSize: 9, fontWeight: "800", color: "#3FC26A",
    letterSpacing: 1, fontFamily: FONT_UI_BOLD,
  },
  expertText: {
    fontSize: 9, fontWeight: "800", color: COLORS.terracottaDark,
    letterSpacing: 1, fontFamily: FONT_UI_BOLD,
  },

  xpBarWrap: { marginTop: 10, gap: 4 },
  xpBarBg: {
    height: 4, borderRadius: 2, width: 200,
    backgroundColor: "rgba(0,0,0,0.35)", overflow: "hidden",
  },
  xpBarFill: { height: 4, backgroundColor: COLORS.saffron, borderRadius: 2 },
  xpBarText: {
    fontFamily: FONT_UI, fontSize: 9,
    color: "rgba(245,235,214,0.65)", letterSpacing: 0.5,
  },

  statsCard: {
    marginHorizontal: 16, marginTop: 14,
    padding: 14, backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16, borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  statsGrid: { flexDirection: "row" },
  divider: { height: 0.5, backgroundColor: `${COLORS.brass}44`, marginVertical: 12 },
  statValue: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: "700", lineHeight: 24 },
  statLabel: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.75)", marginTop: 5, fontWeight: "600",
  },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },

  leagueRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 10,
  },
  leagueDot: { width: 10, height: 10, borderRadius: 5 },
  leagueName: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  leagueSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 2 },

  gameRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 10,
  },
  wonBar: { width: 8, height: 34, borderRadius: 4 },
  gameTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream, lineHeight: 14 },
  gameSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 3 },
  gameScore: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "700" },
  arrow: {
    fontFamily: FONT_DISPLAY, fontSize: 20,
    color: "rgba(245,235,214,0.4)",
    marginLeft: 4,
  },

  emptyBox: {
    padding: 18, backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10, alignItems: "center",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
  },
  emptyText: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.55)", fontStyle: "italic",
  },

  dmSection: { paddingHorizontal: 16, paddingTop: 20 },
  dmBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, alignItems: "center",
    overflow: "hidden",
  },
  dmBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.3,
  },
  dangerSection: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  dangerBtn: {
    paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 12, alignItems: "center",
    backgroundColor: "rgba(200,70,45,0.12)",
    borderWidth: 0.5, borderColor: "rgba(232,85,58,0.5)",
  },
  dangerText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: "#E8553A", letterSpacing: 0.3,
  },
  dangerHint: {
    fontFamily: FONT_UI, fontSize: 10,
    color: "rgba(245,235,214,0.45)",
    textAlign: "center", lineHeight: 14,
    fontStyle: "italic",
  },
});
