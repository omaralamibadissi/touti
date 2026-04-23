import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useTournamentStore, type Tournament, type TournamentPair } from "../store/tournamentStore";
import { useAuthStore } from "../store/authStore";
import { buildTournamentLink } from "../lib/deepLink";

type Props = NativeStackScreenProps<RootStackParamList, "TournamentDetail">;

export default function TournamentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const tournament = useTournamentStore((s) => s.mine.find((t) => t.id === id));
  const remove = useTournamentStore((s) => s.remove);
  const startT = useTournamentStore((s) => s.start);
  const recordResult = useTournamentStore((s) => s.recordResult);
  const refreshOne = useTournamentStore((s) => s.refreshOne);

  // Refresh à chaque ouverture pour voir les résultats auto-enregistrés
  useEffect(() => {
    if (id) refreshOne(id).catch(() => {});
  }, [id, refreshOne]);
  const myUsername = useAuthStore((s) => s.user?.username) ?? "Joueur";
  const isAdmin = tournament && tournament.createdBy === myUsername;

  if (!tournament) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: COLORS.cream }}>Tournoi introuvable</Text>
      </View>
    );
  }

  const formatLabel = `${labelFormat(tournament.format)} · ${labelMode(tournament.mode)}`;
  const tournamentLink = buildTournamentLink(tournament.code);
  const shareText =
    tournament.format === "irl"
      ? `🃏 ${tournament.name}\n${formatLabel}\n${tournament.tagline ?? ""}\n\n📅 ${tournament.date ?? ""} à ${tournament.time ?? ""}\n📍 ${tournament.location ?? ""}\n⏱ Durée : ${tournament.duration ?? ""}\n👥 ${tournament.maxPlayers} joueurs\n\nRejoins avec le code : ${tournament.code}\n${tournamentLink}`
      : `🃏 ${tournament.name}\nTournoi Touti ${formatLabel} · ${tournament.maxPlayers} joueurs\n\nRejoins avec le code : ${tournament.code}\n${tournamentLink}`;

  const onShare = async () => {
    try {
      await Share.share({ message: shareText });
    } catch (e) {
      // ignore
    }
  };

  const onOpenMap = () => {
    if (!tournament.location) return;
    const q = encodeURIComponent(tournament.location);
    const url = Platform.OS === "ios" ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${q}`);
    });
  };

  const onDelete = () => {
    Alert.alert(
      "Supprimer ce tournoi ?",
      "",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await remove(tournament.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Pressable onPress={onShare} style={styles.topAction}>
          <Text style={styles.topActionText}>↗ Partager</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.eyebrow}>{formatLabel.toUpperCase()}</Text>
        <Text style={styles.title}>{tournament.name}</Text>
        {tournament.tagline && <Text style={styles.tagline}>{tournament.tagline}</Text>}

        {/* Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CODE DU TOURNOI</Text>
          <Text style={styles.codeValue}>{tournament.code}</Text>
          <Text style={styles.codeHint}>Partage-le pour inviter</Text>
        </View>

        {/* Infos IRL */}
        {tournament.format === "irl" && (
          <View style={styles.infoCard}>
            {tournament.date && <InfoRow label="Date" value={tournament.date} />}
            {tournament.time && <InfoRow label="Heure" value={tournament.time} />}
            {tournament.duration && <InfoRow label="Durée" value={tournament.duration} />}
            {tournament.location && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: "rgba(245,235,214,0.1)", paddingTop: 10, marginTop: 10 }}>
                <Text style={styles.infoLabel}>LIEU</Text>
                <Text style={styles.locationText}>{tournament.location}</Text>
                <Pressable onPress={onOpenMap} style={styles.mapBtn}>
                  <Text style={styles.mapBtnText}>📍 Ouvrir dans Plans / Google Maps</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Info mode + paires */}
        <View style={styles.infoCard}>
          <InfoRow label="Mode" value={labelMode(tournament.mode)} />
          <InfoRow
            label="Paires"
            value={tournament.pairingMode === "random" ? "Aléatoires" : "Choisies"}
          />
          {tournament.mode === "championnat" && (
            <Text style={styles.championnatNote}>
              Les paires changent à chaque partie, tout le monde joue avec tout le monde.
            </Text>
          )}
        </View>

        {/* Joueurs */}
        <Text style={styles.section}>
          JOUEURS · {tournament.players.length}/{tournament.maxPlayers}
        </Text>
        <View style={{ gap: 6, marginTop: 8 }}>
          {tournament.players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <Avatar initials={p.name[0]?.toUpperCase() ?? "?"} size={34} color={COLORS.teal} />
              <Text style={styles.playerName}>{p.name}</Text>
              {p.id === "admin" && <Text style={styles.adminTag}>ADMIN</Text>}
            </View>
          ))}
          {Array.from({ length: tournament.maxPlayers - tournament.players.length }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.playerRow, styles.emptySlot]}>
              <View style={styles.emptyAvatar} />
              <Text style={styles.emptyText}>En attente…</Text>
            </View>
          ))}
        </View>

        {/* Actions admin */}
        <View style={styles.adminActions}>
          {tournament.status === "open" || tournament.status === "full" ? (
            <>
              <Pressable onPress={onShare} style={styles.bigCta}>
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.bigCtaText}>Partager le tournoi</Text>
              </Pressable>

              {isAdmin ? (
                (() => {
                  const needed = tournament.maxPlayers;
                  const current = tournament.players.length;
                  const canStart = current >= needed;
                  return (
                    <>
                      <Pressable
                        disabled={!canStart}
                        onPress={async () => {
                          if (!canStart) return;
                          await startT(tournament.id);
                        }}
                        style={[styles.bigCta, { marginTop: 8, opacity: canStart ? 1 : 0.4 }]}
                      >
                        <LinearGradient
                          colors={canStart ? ["#3FC26A", "#2B8A4A"] : ["#5a5a5a", "#3a3a3a"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.bigCtaText}>▶ Lancer le tournoi</Text>
                      </Pressable>
                      {!canStart && (
                        <Text style={{ fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.6)", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                          {current} / {needed} joueurs inscrits — en attente des {needed - current} manquant{needed - current > 1 ? "s" : ""}.
                        </Text>
                      )}
                    </>
                  );
                })()
              ) : (
                <>
                  <Pressable
                    disabled
                    style={[styles.bigCta, { marginTop: 8, opacity: 0.35 }]}
                  >
                    <LinearGradient
                      colors={["#5a5a5a", "#3a3a3a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.bigCtaText}>▶ Lancer le tournoi</Text>
                  </Pressable>
                  <Text style={{ fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.6)", textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                    Seul l'admin ({tournament.createdBy}) peut le lancer.
                  </Text>
                </>
              )}

              {isAdmin && (
                <Pressable onPress={onDelete} style={styles.dangerBtn}>
                  <Text style={styles.dangerText}>Supprimer</Text>
                </Pressable>
              )}
            </>
          ) : null}
        </View>

        {/* RUNTIME : paires + matchs + classement */}
        {tournament.status === "started" || tournament.status === "finished" ? (
          <>
            {/* Classement des paires */}
            <Text style={styles.section}>
              CLASSEMENT · 3 pts / victoire · −1 / défaite
            </Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              {[...(tournament.pairs || [])]
                .map((p) => ({ ...p, classementPoints: p.wins * 3 - p.losses }))
                .sort((a, b) =>
                  b.classementPoints - a.classementPoints ||
                  b.points - a.points ||
                  b.wins - a.wins,
                )
                .map((p, i) => (
                  <View key={p.id} style={styles.pairRankRow}>
                    <Text style={[styles.pairRank, i < 3 && { color: COLORS.saffronSoft }]}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pairNames}>{p.names[0]} & {p.names[1]}</Text>
                      <Text style={styles.pairMeta}>
                        {p.wins}V / {p.losses}D · cumul {p.points}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.pairScore}>{p.classementPoints}</Text>
                      <Text style={styles.pairScoreSub}>pts</Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* Matchs — bracket visuel en classique, liste en championnat */}
            <Text style={styles.section}>MATCHS</Text>
            {tournament.mode === "classique" ? (
              <BracketView
                tournament={tournament}
                myUsername={myUsername}
                canReport={!!isAdmin}
                onPlay={(roomCode) =>
                  navigation.navigate("QuickMatch", {
                    code: roomCode,
                    leagueId: tournament.leagueId,
                  })
                }
                onReport={(matchId, pA, pB) => {
                  Alert.prompt?.(
                    "Saisir résultat",
                    `${pA.names.join(" & ")} vs ${pB.names.join(" & ")}\nScore au format "600-540"`,
                    async (text: string) => {
                      const match = (text || "").match(/^\s*(\d+)\s*[-:_]\s*(\d+)\s*$/);
                      if (!match) return;
                      await recordResult(
                        tournament.id,
                        matchId,
                        parseInt(match[1], 10),
                        parseInt(match[2], 10),
                      );
                    },
                  );
                }}
              />
            ) : (
              <View style={{ gap: 6, marginTop: 8 }}>
                {(tournament.matches || []).map((m) => {
                  const pA = tournament.pairs?.find((p) => p.id === m.pairAId);
                  const pB = tournament.pairs?.find((p) => p.id === m.pairBId);
                  if (!pA || !pB) return null;
                  const mePlays =
                    pA.names.includes(myUsername) || pB.names.includes(myUsername);
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.matchRow,
                        m.status === "finished" && { opacity: 0.7 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchRound}>ROUND {m.round}</Text>
                        <Text style={styles.matchPair}>{pA.names.join(" & ")}</Text>
                        <Text style={styles.matchVs}>vs</Text>
                        <Text style={styles.matchPair}>{pB.names.join(" & ")}</Text>
                        {m.status === "finished" && (
                          <Text style={styles.matchResult}>
                            {m.scoreA} - {m.scoreB} · {m.winnerPairId === m.pairAId ? pA.names.join(" & ") : pB.names.join(" & ")} gagne
                          </Text>
                        )}
                      </View>
                      {m.status === "pending" && (
                        <View style={{ gap: 6 }}>
                          {mePlays && (
                            <Pressable
                              onPress={() => {
                                navigation.navigate("QuickMatch", {
                                  code: m.roomCode,
                                  leagueId: tournament.leagueId,
                                });
                              }}
                              style={styles.matchPlayBtn}
                            >
                              <Text style={styles.matchPlayText}>Jouer · {m.roomCode}</Text>
                            </Pressable>
                          )}
                          {isAdmin && (
                            <Pressable
                              onPress={() => {
                                Alert.prompt?.(
                                  "Saisir résultat",
                                  `${pA.names.join(" & ")} vs ${pB.names.join(" & ")}\nScore au format "600-540"`,
                                  async (text: string) => {
                                    const match = (text || "").match(/^\s*(\d+)\s*[-:_]\s*(\d+)\s*$/);
                                    if (!match) return;
                                    await recordResult(
                                      tournament.id,
                                      m.id,
                                      parseInt(match[1], 10),
                                      parseInt(match[2], 10),
                                    );
                                  },
                                );
                              }}
                              style={styles.matchReportBtn}
                            >
                              <Text style={styles.matchReportText}>Saisir résultat</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {tournament.status === "finished" && (
              <View style={styles.finishedBanner}>
                <Text style={styles.finishedText}>🏆 TOURNOI TERMINÉ</Text>
                <Text style={styles.finishedSub}>
                  Vainqueur : {[...(tournament.pairs || [])]
                    .sort(
                      (a, b) =>
                        (b.wins * 3 - b.losses) - (a.wins * 3 - a.losses) ||
                        b.points - a.points,
                    )[0]?.names.join(" & ")}
                </Text>
              </View>
            )}

            <Pressable onPress={onDelete} style={[styles.dangerBtn, { marginTop: 16 }]}>
              <Text style={styles.dangerText}>Supprimer le tournoi</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function labelFormat(f: string): string {
  if (f === "online") return "En ligne";
  if (f === "irl") return "IRL";
  return f;
}

function labelMode(m: string): string {
  if (m === "classique") return "Classique · paires fixes";
  if (m === "championnat") return "Championnat · paires tournantes";
  return m;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  topAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topActionText: { color: COLORS.saffronSoft, fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700" },

  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 4, color: COLORS.brass, fontWeight: "700", marginTop: 8 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 4 },
  tagline: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.8)",
    marginTop: 10,
    lineHeight: 19,
    fontStyle: "italic",
  },

  codeCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 16,
    alignItems: "center",
  },
  codeLabel: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  codeValue: {
    fontFamily: FONT_DISPLAY,
    fontSize: 42,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 8,
    marginTop: 8,
  },
  codeHint: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.55)", marginTop: 6, fontStyle: "italic" },

  infoCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 14,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  infoLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
    width: 80,
  },
  infoValue: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700", flex: 1 },
  locationText: { fontFamily: FONT_UI_BOLD, fontSize: 14, color: COLORS.cream, fontWeight: "700", marginTop: 4 },
  mapBtn: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(212,160,76,0.2)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 10,
    alignItems: "center",
  },
  mapBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.saffronSoft, fontWeight: "700" },

  championnatNote: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.75)",
    lineHeight: 17,
    fontStyle: "italic",
  },

  section: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
    marginTop: 22,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.12)",
    borderRadius: 10,
  },
  playerName: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 14, color: COLORS.cream, fontWeight: "700" },
  adminTag: {
    fontSize: 9,
    color: COLORS.brass,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: FONT_UI_BOLD,
  },
  emptySlot: { opacity: 0.45 },
  emptyAvatar: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderStyle: "dashed", borderColor: COLORS.brass,
  },
  emptyText: { fontFamily: FONT_UI, fontSize: 12, color: "rgba(245,235,214,0.55)", fontStyle: "italic" },

  adminActions: { marginTop: 24, gap: 8 },
  bigCta: {
    paddingVertical: 16,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bigCtaText: { fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "800", color: COLORS.terracottaDark, letterSpacing: 0.3 },
  dangerBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(200,70,45,0.2)",
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.55)",
    alignItems: "center",
  },
  dangerText: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: "#E8553A" },

  pairRankRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 10, backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10, borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
  },
  pairRank: {
    fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700",
    color: "rgba(245,235,214,0.55)", width: 24, textAlign: "center",
  },
  pairNames: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  pairMeta: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 2 },
  pairScore: { fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: "700", color: COLORS.saffronSoft, lineHeight: 24 },
  pairScoreSub: {
    fontFamily: FONT_UI_BOLD, fontSize: 9, letterSpacing: 1,
    color: "rgba(245,235,214,0.55)", fontWeight: "700", marginTop: -1,
  },

  matchRow: {
    flexDirection: "row", gap: 10, padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 10,
    borderWidth: 0.5, borderColor: "rgba(245,235,214,0.1)",
  },
  matchRound: {
    fontFamily: FONT_UI_BOLD, fontSize: 9, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700", marginBottom: 4,
  },
  matchPair: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },
  matchVs: { fontFamily: FONT_DISPLAY, fontSize: 11, color: COLORS.brass, marginVertical: 2 },
  matchResult: {
    fontFamily: FONT_UI, fontSize: 11, fontStyle: "italic",
    color: COLORS.saffronSoft, marginTop: 6,
  },
  matchPlayBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.saffron, alignItems: "center",
  },
  matchPlayText: {
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  matchReportBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    alignItems: "center",
  },
  matchReportText: {
    fontFamily: FONT_UI_BOLD, fontSize: 10,
    color: COLORS.cream, letterSpacing: 0.5,
  },

  finishedBanner: {
    marginTop: 20, padding: 20,
    backgroundColor: `${COLORS.saffron}22`,
    borderWidth: 1, borderColor: COLORS.saffron,
    borderRadius: 14, alignItems: "center",
  },
  finishedText: {
    fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: "700",
    color: COLORS.saffronSoft, letterSpacing: 2,
  },
  finishedSub: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: COLORS.cream, marginTop: 4,
  },

  // ─── Bracket classique ────────────────────────────────────────
  bracketScroll: { marginTop: 8 },
  bracketContent: { paddingRight: 20, paddingBottom: 8, gap: 0 },
  bracketColumn: {
    width: 180,
    marginRight: 14,
    gap: 12,
  },
  bracketRoundLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: COLORS.brass, fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  bracketMatch: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    overflow: "hidden",
  },
  bracketSide: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  bracketSideDivider: {
    height: 0.5,
    backgroundColor: `${COLORS.brass}33`,
  },
  bracketPair: {
    flex: 1,
    fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "600",
    color: COLORS.cream,
  },
  bracketPairWinner: {
    color: COLORS.saffronSoft, fontWeight: "800",
  },
  bracketPairLoser: {
    color: "rgba(245,235,214,0.45)", fontWeight: "500",
  },
  bracketScore: {
    fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
    minWidth: 30, textAlign: "right",
  },
  bracketEmpty: {
    padding: 8,
    alignItems: "center",
  },
  bracketEmptyText: {
    fontFamily: FONT_UI, fontSize: 10,
    color: "rgba(245,235,214,0.4)",
    fontStyle: "italic",
  },
  bracketActions: {
    padding: 8,
    gap: 6,
    borderTopWidth: 0.5,
    borderTopColor: `${COLORS.brass}33`,
  },
  bracketBtn: {
    paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  bracketBtnPlay: {
    backgroundColor: COLORS.saffron,
  },
  bracketBtnPlayText: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.5,
  },
  bracketBtnReport: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  bracketBtnReportText: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.3,
  },
});

// ─── Bracket visuel pour tournoi classique (élimination directe) ──

function roundLabel(round: number, totalRounds: number): string {
  if (totalRounds <= 0) return `ROUND ${round}`;
  const fromFinal = totalRounds - round; // 0 = finale, 1 = demi, 2 = quart…
  if (fromFinal === 0) return "FINALE";
  if (fromFinal === 1) return "DEMI";
  if (fromFinal === 2) return "QUARTS";
  if (fromFinal === 3) return "1/8";
  return `ROUND ${round}`;
}

function BracketView({
  tournament,
  myUsername,
  canReport,
  onPlay,
  onReport,
}: {
  tournament: Tournament;
  myUsername: string;
  canReport: boolean;
  onPlay: (roomCode: string) => void;
  onReport: (matchId: string, pA: TournamentPair, pB: TournamentPair) => void;
}) {
  const matches = tournament.matches || [];
  const pairs = tournament.pairs || [];

  if (matches.length === 0) {
    return (
      <View style={[styles.bracketEmpty, { marginTop: 12 }]}>
        <Text style={styles.bracketEmptyText}>Aucun match programmé</Text>
      </View>
    );
  }

  // Group matches by round
  const byRound = new Map<number, typeof matches>();
  for (const m of matches) {
    const list = byRound.get(m.round) || [];
    list.push(m);
    byRound.set(m.round, list);
  }
  const rounds = [...byRound.keys()].sort((a, b) => a - b);
  const totalRounds = rounds.length;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bracketScroll}
      contentContainerStyle={styles.bracketContent}
    >
      {rounds.map((round) => {
        const roundMatches = byRound.get(round) || [];
        return (
          <View key={round} style={styles.bracketColumn}>
            <Text style={styles.bracketRoundLabel}>
              {roundLabel(round, totalRounds)}
            </Text>
            {roundMatches.map((m) => {
              const pA = pairs.find((p) => p.id === m.pairAId);
              const isBye = m.pairBId === "__BYE__";
              const pB = isBye ? null : pairs.find((p) => p.id === m.pairBId);
              if (!pA || (!isBye && !pB)) return null;
              const winnerA = m.winnerPairId === m.pairAId;
              const winnerB = !isBye && m.winnerPairId === m.pairBId;
              const mePlays =
                pA.names.includes(myUsername) ||
                (pB?.names.includes(myUsername) ?? false);
              return (
                <View key={m.id} style={styles.bracketMatch}>
                  {/* Paire A */}
                  <View style={styles.bracketSide}>
                    <Text
                      style={[
                        styles.bracketPair,
                        m.status === "finished" && (winnerA ? styles.bracketPairWinner : styles.bracketPairLoser),
                      ]}
                      numberOfLines={2}
                    >
                      {pA.names.join(" & ")}
                    </Text>
                    {m.status === "finished" && !isBye && (
                      <Text style={styles.bracketScore}>{m.scoreA}</Text>
                    )}
                    {isBye && (
                      <Text style={[styles.bracketScore, { color: COLORS.saffronSoft, fontSize: 10 }]}>
                        BYE
                      </Text>
                    )}
                  </View>
                  <View style={styles.bracketSideDivider} />
                  {/* Paire B (ou BYE) */}
                  <View style={styles.bracketSide}>
                    <Text
                      style={[
                        styles.bracketPair,
                        isBye && styles.bracketPairLoser,
                        m.status === "finished" && !isBye && (winnerB ? styles.bracketPairWinner : styles.bracketPairLoser),
                      ]}
                      numberOfLines={2}
                    >
                      {isBye ? "— bye —" : pB!.names.join(" & ")}
                    </Text>
                    {m.status === "finished" && !isBye && (
                      <Text style={styles.bracketScore}>{m.scoreB}</Text>
                    )}
                  </View>
                  {/* Actions pour les matchs pending */}
                  {m.status === "pending" && !isBye && pB && (mePlays || canReport) && (
                    <View style={styles.bracketActions}>
                      {mePlays && (
                        <Pressable
                          onPress={() => onPlay(m.roomCode)}
                          style={[styles.bracketBtn, styles.bracketBtnPlay]}
                        >
                          <Text style={styles.bracketBtnPlayText}>▶ JOUER · {m.roomCode}</Text>
                        </Pressable>
                      )}
                      {canReport && (
                        <Pressable
                          onPress={() => onReport(m.id, pA, pB)}
                          style={[styles.bracketBtn, styles.bracketBtnReport]}
                        >
                          <Text style={styles.bracketBtnReportText}>Saisir résultat</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
