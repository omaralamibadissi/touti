import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { PhotoAvatar } from "../components/PhotoAvatar";
import { useMatchHistoryStore } from "../store/matchHistoryStore";
import { useLeagueStore } from "../store/leagueStore";
import { useFriendsStore } from "../store/friendsStore";
import { useAuthStore } from "../store/authStore";
import {
  computeIndividualRanking,
  computePairRanking,
  computeLeagueRanking,
  computeFriendsRanking,
  type PlayerStat,
  type PairStat,
} from "../lib/leaderboard";
import {
  apiIndividualRanking,
  apiPairRanking,
} from "../net/matchesApi";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Leaderboard">;

type Scope = "league" | "friends" | "global";
type Sub = "indiv" | "pairs";

export default function LeaderboardScreen({ navigation, route }: Props) {
  const t = useT();
  const initialScope: Scope = route.params?.scope ?? "global";
  const initialSub: Sub = route.params?.sub ?? "indiv";
  const [scope, setScope] = useState<Scope>(initialScope);
  const [sub, setSub] = useState<Sub>(initialSub);

  const matches = useMatchHistoryStore((s) => s.matches);
  const myName = useAuthStore((s) => s.user?.username) ?? "Joueur";

  const leagues = useLeagueStore((s) => s.leagues);
  const activeLeagueId = useLeagueStore((s) => s.activeLeagueId);
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) || leagues[0];

  const friends = useFriendsStore((s) => s.friends);

  // Calculs locaux (fallback hors-ligne) ───────────────────────────
  const localGlobalIndiv = useMemo(() => computeIndividualRanking(matches), [matches]);
  const localGlobalPairs = useMemo(() => computePairRanking(matches), [matches]);
  const localFriendsRanking = useMemo(
    () => computeFriendsRanking(matches, friends.map((f) => f.name), myName),
    [matches, friends, myName],
  );
  const localLeagueRanking = useMemo(
    () => (activeLeague ? computeLeagueRanking(matches, activeLeague) : null),
    [matches, activeLeague],
  );

  // Fetch serveur pour le scope + sub actuels
  const [serverIndiv, setServerIndiv] = useState<PlayerStat[] | null>(null);
  const [serverPairs, setServerPairs] = useState<PairStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async (isInitial: boolean) => {
      if (isInitial) {
        setLoading(true);
        setServerErr(null);
      }
      try {
        if (scope === "global") {
          const [indiv, pairs] = await Promise.all([
            apiIndividualRanking("global"),
            apiPairRanking("global"),
          ]);
          if (cancelled) return;
          setServerIndiv(indiv as PlayerStat[]);
          setServerPairs(pairs.map((p) => ({ ...p, key: `${p.names[0]}|${p.names[1]}` })) as PairStat[]);
        } else if (scope === "friends") {
          const friendNames = [myName, ...friends.map((f) => f.name)];
          const [indiv, pairs] = await Promise.all([
            apiIndividualRanking("friends", { friends: friendNames }),
            apiPairRanking("friends", { friends: friendNames }),
          ]);
          if (cancelled) return;
          setServerIndiv(indiv as PlayerStat[]);
          setServerPairs(pairs.map((p) => ({ ...p, key: `${p.names[0]}|${p.names[1]}` })) as PairStat[]);
        } else if (scope === "league" && activeLeague) {
          const [indiv, pairs] = await Promise.all([
            apiIndividualRanking("league", { leagueId: activeLeague.id }),
            apiPairRanking("league", { leagueId: activeLeague.id }),
          ]);
          if (cancelled) return;
          setServerIndiv(indiv as PlayerStat[]);
          setServerPairs(pairs.map((p) => ({ ...p, key: `${p.names[0]}|${p.names[1]}` })) as PairStat[]);
        }
      } catch (e: any) {
        if (!cancelled && isInitial) setServerErr(e?.message ?? t("leaderboard.serverUnavailable"));
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    };
    fetchData(true);
    // Refresh périodique toutes les 60s pour que le classement ne reste pas
    // figé sur le fetch initial (parties qui arrivent pendant la session).
    const iv = setInterval(() => fetchData(false), 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [scope, activeLeague?.id, friends.length, myName]);

  // Affichage : serveur si dispo, sinon fallback local
  const globalIndiv = serverIndiv ?? localGlobalIndiv;
  const globalPairs = serverPairs ?? localGlobalPairs;
  const friendsRanking = {
    individual: serverIndiv ?? localFriendsRanking.individual,
    pairs: serverPairs ?? localFriendsRanking.pairs,
  };
  const leagueRanking = activeLeague
    ? {
        individual: serverIndiv ?? (localLeagueRanking?.individual ?? []),
        pairs: serverPairs ?? (localLeagueRanking?.pairs ?? []),
      }
    : null;

  const handleNamePress = (name: string) => {
    if (name === myName) {
      navigation.navigate("MainTabs", { screen: "Profile" });
    } else {
      navigation.navigate("PlayerProfile", { name });
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1a2840", "#0a1428", "#05060c"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color="#1a2840" accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("leaderboard.eyebrow")}</Text>
          <Text style={styles.title}>{t("leaderboard.title")}</Text>
        </View>
      </View>

      {/* Scope tabs */}
      <View style={styles.scopeTabs}>
        <ScopeBtn label={t("leaderboard.scopeLeague")} active={scope === "league"} onPress={() => setScope("league")} />
        <ScopeBtn label={t("leaderboard.scopeFriends")} active={scope === "friends"} onPress={() => setScope("friends")} />
        <ScopeBtn label={t("leaderboard.scopeGlobal")} active={scope === "global"} onPress={() => setScope("global")} />
      </View>

      {/* Sub tabs */}
      <View style={styles.subTabs}>
        <SubBtn label={t("leaderboard.subIndiv")} active={sub === "indiv"} onPress={() => setSub("indiv")} />
        <SubBtn label={t("leaderboard.subPairs")} active={sub === "pairs"} onPress={() => setSub("pairs")} />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          {t("leaderboard.disclaimer", { emph: t("leaderboard.disclaimerEmph") })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {scope === "global" && (
          sub === "indiv" ? (
            <IndivList list={globalIndiv} onPress={handleNamePress} myName={myName} />
          ) : (
            <PairsList list={globalPairs} onPress={handleNamePress} />
          )
        )}

        {scope === "friends" && (
          friends.length === 0 ? (
            <Empty
              title={t("leaderboard.emptyNoFriends")}
              sub={t("leaderboard.emptyNoFriendsBody")}
              cta={t("leaderboard.goSocial")}
              onPress={() => navigation.navigate("MainTabs", { screen: "Social" })}
            />
          ) : sub === "indiv" ? (
            <IndivList list={friendsRanking.individual} onPress={handleNamePress} myName={myName} />
          ) : (
            <PairsList list={friendsRanking.pairs} onPress={handleNamePress} />
          )
        )}

        {scope === "league" && (
          !activeLeague ? (
            <Empty
              title={t("leaderboard.emptyNoLeague")}
              sub={t("leaderboard.emptyNoLeagueBody")}
              cta={t("leaderboard.myLeagues")}
              onPress={() => navigation.navigate("Leagues")}
            />
          ) : (
            <View style={{ gap: 14 }}>
              <View style={[styles.leagueHeader, { backgroundColor: `${activeLeague.color || COLORS.teal}22`, borderColor: `${activeLeague.color || COLORS.teal}77` }]}>
                <Text style={styles.leagueHeaderName}>{activeLeague.name}</Text>
                <Text style={styles.leagueHeaderSub}>
                  {t("leaderboard.leagueActive", { count: activeLeague.members.length })}
                </Text>
              </View>
              {sub === "indiv" ? (
                leagueRanking && leagueRanking.individual.length > 0 ? (
                  <IndivList list={leagueRanking.individual} onPress={handleNamePress} myName={myName} />
                ) : (
                  <Empty title={t("leaderboard.noLeagueMatches")} sub={t("leaderboard.noLeagueMatchesBody")} />
                )
              ) : (
                leagueRanking && leagueRanking.pairs.length > 0 ? (
                  <PairsList list={leagueRanking.pairs} onPress={handleNamePress} />
                ) : (
                  <Empty title={t("leaderboard.noLeaguePairs")} sub={t("leaderboard.noLeaguePairsBody")} />
                )
              )}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function ScopeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.scopeBtn, active && styles.scopeBtnActive]}>
      <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SubBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.subBtn, active && styles.subBtnActive]}>
      <Text style={[styles.subText, active && styles.subTextActive]}>{label}</Text>
    </Pressable>
  );
}

function IndivList({
  list,
  onPress,
  myName,
}: {
  list: PlayerStat[];
  onPress: (name: string) => void;
  myName: string;
}) {
  const t = useT();
  if (list.length === 0) {
    return <Empty title={t("leaderboard.emptyRanking")} sub={t("leaderboard.emptyRankingBody")} />;
  }
  return (
    <View style={{ gap: 6 }}>
      {list.map((p, i) => (
        <Pressable key={p.name} onPress={() => onPress(p.name)} style={[styles.row, p.name === myName && styles.rowMe]}>
          {p.name === myName && (
            <LinearGradient
              colors={[`${COLORS.brassDeep}55`, `${COLORS.brassDeep}11`]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Text style={[styles.rank, i < 3 && styles.rankTop, p.name === myName && { color: COLORS.saffronSoft }]}>
            {i + 1}
          </Text>
          <PhotoAvatar username={p.name} size={34} color={COLORS.teal} ring={p.name === myName} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <Text style={styles.rowName}>{p.name}</Text>
              {p.name === myName && <Text style={styles.youTag}>{t("common.you").toUpperCase()}</Text>}
            </View>
            <Text style={styles.rowMeta}>
              {p.games}p · {p.wins}V / {p.losses}D · {p.ratio}% · cumul {p.pointsFor}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.rowScore}>{p.classementPoints ?? (p.wins * 3 - p.losses)}</Text>
            <Text style={styles.rowScoreSub}>pts</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function PairsList({
  list,
  onPress,
}: {
  list: PairStat[];
  onPress: (name: string) => void;
}) {
  const t = useT();
  if (list.length === 0) {
    return <Empty title={t("leaderboard.emptyPairs")} sub={t("leaderboard.emptyPairsBody")} />;
  }
  return (
    <View style={{ gap: 6 }}>
      {list.map((p, i) => (
        <View key={p.key} style={styles.row}>
          <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
          <View style={styles.pairAvatars}>
            <Pressable onPress={() => onPress(p.names[0])}>
              <PhotoAvatar username={p.names[0]} size={30} color={COLORS.teal} ring={false} />
            </Pressable>
            <Pressable onPress={() => onPress(p.names[1])} style={{ marginLeft: -10 }}>
              <PhotoAvatar username={p.names[1]} size={30} color={COLORS.brass} ring={false} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>
              {p.names[0]} & {p.names[1]}
            </Text>
            <Text style={styles.rowMeta}>
              {p.games}p · {p.wins}V / {p.losses}D · cumul {p.pointsFor}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.rowScore}>{p.classementPoints ?? (p.wins * 3 - p.losses)}</Text>
            <Text style={styles.rowScoreSub}>pts</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Empty({
  title,
  sub,
  cta,
  onPress,
}: {
  title: string;
  sub: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{sub}</Text>
      {cta && onPress && (
        <Pressable onPress={onPress} style={styles.emptyCta}>
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  scopeTabs: {
    flexDirection: "row", gap: 6,
    paddingHorizontal: 16, marginTop: 6,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    borderWidth: 0.5, borderColor: "rgba(212,160,76,0.3)",
  },
  scopeBtnActive: {
    backgroundColor: COLORS.saffron,
    borderColor: COLORS.saffron,
  },
  scopeText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.5,
  },
  scopeTextActive: { color: COLORS.terracottaDark },

  subTabs: {
    flexDirection: "row", gap: 6,
    paddingHorizontal: 16, marginTop: 6,
  },
  subBtn: {
    flex: 1,
    paddingVertical: 8, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
  },
  subBtnActive: {
    backgroundColor: `${COLORS.brassDeep}55`,
    borderColor: COLORS.brass,
  },
  subText: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700",
    color: "rgba(245,235,214,0.65)", letterSpacing: 0.5,
  },
  subTextActive: { color: COLORS.cream },

  disclaimer: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
    borderLeftWidth: 2, borderLeftColor: COLORS.saffron,
  },
  disclaimerText: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.7)",
    fontStyle: "italic", lineHeight: 16,
  },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    overflow: "hidden",
  },
  rowMe: { borderColor: COLORS.brass },
  rank: {
    fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700",
    color: "rgba(245,235,214,0.5)", width: 24, textAlign: "center",
  },
  rankTop: { color: COLORS.saffronSoft },
  rowName: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  youTag: { fontSize: 9, color: COLORS.brass, letterSpacing: 1, fontFamily: FONT_UI_BOLD, fontWeight: "700" },
  rowMeta: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 2 },
  rowScore: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: "700", color: COLORS.saffronSoft, lineHeight: 24 },
  rowScoreSub: {
    fontFamily: FONT_UI_BOLD, fontSize: 9, letterSpacing: 1,
    color: "rgba(245,235,214,0.55)", fontWeight: "700", marginTop: -1,
  },
  pairAvatars: { flexDirection: "row" },

  emptyBox: {
    padding: 22, gap: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
    alignItems: "center",
  },
  emptyTitle: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  emptyText: { fontFamily: FONT_UI, fontSize: 12, color: "rgba(245,235,214,0.6)", textAlign: "center", lineHeight: 18 },
  emptyCta: {
    marginTop: 6,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 10, overflow: "hidden",
  },
  emptyCtaText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800",
    color: COLORS.terracottaDark,
  },

  leagueHeader: {
    padding: 14, borderRadius: 12, borderWidth: 0.5,
  },
  leagueHeaderName: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700", color: COLORS.cream },
  leagueHeaderSub: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.6)", marginTop: 4, fontStyle: "italic",
  },
});
