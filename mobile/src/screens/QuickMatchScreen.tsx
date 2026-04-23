import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, ScrollView, TextInput, Share, AppState } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { StarBurst, ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useAuthStore } from "../store/authStore";
import { buildQuickLink } from "../lib/deepLink";
import { apiMatchmakingStats, apiHybridCandidate, type MatchmakingStats } from "../net/statsApi";
import { useNetGameStore } from "../store/netGameStore";

type Props = NativeStackScreenProps<RootStackParamList, "QuickMatch">;

type Mode = "menu" | "pool" | "create" | "join" | "lobby";

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function QuickMatchScreen({ navigation, route }: Props) {
  const myName = useAuthStore((s) => s.user?.username) ?? "Moi";
  const store = useNetGameStore();
  const { room, connected, connecting, error, players, locked, roomCode } = store;

  const prefilledCode = route.params?.code;
  const prefilledLeagueId = route.params?.leagueId;
  const [mode, setMode] = useState<Mode>(prefilledCode ? "lobby" : "menu");
  const [typedCode, setTypedCode] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [mmStats, setMmStats] = useState<MatchmakingStats | null>(null);

  // Si un code est passé en params, on rejoint direct ce salon
  useEffect(() => {
    if (prefilledCode && prefilledCode.length === 4) {
      store.connectQuickCode(prefilledCode, myName, prefilledLeagueId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chrono pendant la recherche / attente
  useEffect(() => {
    if (mode !== "pool" && mode !== "lobby") return;
    const start = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [mode]);

  // Poll stats matchmaking toutes les 3s pendant la recherche pool
  useEffect(() => {
    if (mode !== "pool") {
      setMmStats(null);
      return;
    }
    const fetchStats = () => {
      apiMatchmakingStats().then(setMmStats).catch(() => {});
    };
    fetchStats();
    const t = setInterval(fetchStats, 3000);
    return () => clearInterval(t);
  }, [mode]);

  // Navigation auto quand partie démarre (locked=true)
  useEffect(() => {
    if (locked) navigation.replace("Game", { mode: "net" });
  }, [locked, navigation]);

  // AppState reconnect
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (next === "active" && !connected && !connecting) {
        await store.tryReconnect();
      }
    });
    return () => sub.remove();
  }, [connected, connecting, store]);

  const startPool = async () => {
    setMode("pool");
    await store.connectQuickMatch(myName);
  };

  const createCodeRoom = async () => {
    const code = randomCode();
    setMode("lobby");
    await store.connectQuickCode(code, myName);
  };

  // Création d'un salon "hybride" : les amis peuvent rejoindre par code,
  // après 30s les sièges vides sont ouverts au pool matchmaking.
  const createHybridRoom = async () => {
    const code = randomCode();
    setMode("lobby");
    await store.connectQuickCode(code, myName, undefined, true);
  };

  // Flow pool modifié : cherche d'abord un salon hybride ouvert, sinon pool classique
  const startPoolSmart = async () => {
    setMode("pool");
    try {
      const candidate = await apiHybridCandidate();
      if (candidate.hybrid && candidate.code) {
        // Un salon hybride est ouvert → on le rejoint comme n'importe quel code
        await store.connectQuickCode(candidate.code, myName);
        return;
      }
    } catch {}
    await store.connectQuickMatch(myName);
  };

  const joinCodeRoom = async () => {
    if (typedCode.length !== 4) return;
    setMode("lobby");
    await store.connectQuickCode(typedCode, myName);
  };

  const cancel = async () => {
    await store.disconnect();
    setMode("menu");
    setTypedCode("");
  };

  const share = async () => {
    if (!roomCode) return;
    try {
      const link = buildQuickLink(roomCode);
      await Share.share({
        message: `🃏 Rejoins ma Partie rapide Touti !\nCode : ${roomCode}\n${link}`,
      });
    } catch {}
  };

  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.07 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => (mode === "menu" ? navigation.goBack() : cancel())}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M15 18l-6-6 6-6" stroke={COLORS.cream} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.eyebrow}>PARTIE RAPIDE</Text>
          <Text style={styles.title}>{titleForMode(mode)}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {mode === "menu" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.intro}>
              Joue en ligne — invite tes potes ou laisse le serveur trouver d'autres joueurs pour toi.
            </Text>

            <Pressable onPress={createCodeRoom} style={styles.bigBtn}>
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>Créer un salon</Text>
              <Text style={styles.bigBtnSub}>Code à partager · attend 4 humains</Text>
            </Pressable>

            <Pressable onPress={createHybridRoom} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Avec amis + randoms</Text>
              <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
                Code à partager · quand tous ready, sièges libres ouverts au pool
              </Text>
            </Pressable>

            <Pressable onPress={() => setMode("join")} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Rejoindre avec code</Text>
              <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>Entre le code d'un salon</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable onPress={startPoolSmart} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Chercher des joueurs aléatoires</Text>
              <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
                Matchmaking public · rejoint d'abord un salon hybride si dispo
              </Text>
            </Pressable>
          </View>
        )}

        {mode === "join" && (
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.inputLabel}>CODE DU SALON</Text>
              <TextInput
                value={typedCode}
                onChangeText={(t) => setTypedCode(t.toUpperCase().slice(0, 4))}
                placeholder="AB12"
                placeholderTextColor="rgba(245,235,214,0.3)"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                style={[styles.input, { textAlign: "center", letterSpacing: 8, fontSize: 28 }]}
              />
              <Text style={styles.hint}>4 caractères exactement</Text>
            </View>
            <Pressable
              onPress={joinCodeRoom}
              disabled={typedCode.length !== 4}
              style={[styles.bigBtn, typedCode.length !== 4 && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>Rejoindre</Text>
            </Pressable>
          </View>
        )}

        {(mode === "pool" || mode === "lobby") && (
          <View style={{ gap: 16 }}>
            {error ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorTitle}>Oups</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={cancel} style={[styles.bigBtn, styles.bigBtnSecondary, { marginTop: 12 }]}>
                  <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Retour</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Code share (lobby mode only) */}
                {mode === "lobby" && roomCode && (
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeLabel}>CODE DU SALON</Text>
                    <Text style={styles.codeValue}>{roomCode}</Text>
                    <Pressable onPress={share} style={styles.shareRow}>
                      <Text style={styles.shareText}>↗ Partager</Text>
                    </Pressable>
                  </View>
                )}

                {/* Status */}
                <View style={styles.statusBlock}>
                  {connecting ? (
                    <Text style={styles.statusTitle}>Connexion…</Text>
                  ) : (
                    <>
                      <Text style={styles.statusTitle}>
                        {mode === "pool"
                          ? `Recherche · ${players.length}/4`
                          : `Salon · ${players.length}/4`}
                      </Text>
                      <Text style={styles.statusSub}>{timeLabel}</Text>
                      {mode === "pool" && mmStats && (
                        <Text style={styles.poolStats}>
                          {mmStats.searching} joueur{mmStats.searching > 1 ? "s" : ""} en recherche
                          {mmStats.avgWaitSec > 0 && ` · attente estimée ~${mmStats.avgWaitSec}s`}
                        </Text>
                      )}
                    </>
                  )}
                </View>

                {/* Slots 2x2 */}
                {(() => {
                  const iAmHost = players.find((x) => x.seat === 0)?.id === room?.sessionId;
                  return (
                    <View style={styles.slotsGrid}>
                      {[0, 1, 2, 3].map((seat) => {
                        const p = players.find((x) => x.seat === seat);
                        return (
                          <SlotCard
                            key={seat}
                            seat={seat}
                            name={p?.name}
                            isMe={p?.id === room?.sessionId}
                            reserved={store.reservedSeat === seat}
                            canReserve={iAmHost && !p && mode === "lobby"}
                            onReserve={() =>
                              store.reserveSeat(
                                store.reservedSeat === seat ? null : (seat as 0 | 1 | 2 | 3),
                              )
                            }
                          />
                        );
                      })}
                    </View>
                  );
                })()}

                <Text style={styles.hint}>
                  La partie démarre auto dès que les 4 sièges sont occupés par des humains.
                </Text>

                <Pressable onPress={cancel} style={[styles.bigBtn, styles.bigBtnSecondary]}>
                  <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Annuler</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function titleForMode(m: Mode): string {
  switch (m) {
    case "menu": return "En ligne";
    case "pool": return "Recherche random…";
    case "create":
    case "lobby": return "Salon en attente";
    case "join": return "Rejoindre un salon";
  }
}

function SlotCard({
  seat,
  name,
  isMe,
  reserved,
  canReserve,
  onReserve,
}: {
  seat: number;
  name?: string;
  isMe?: boolean;
  reserved?: boolean;
  canReserve?: boolean;
  onReserve?: () => void;
}) {
  const team = seat % 2 === 0 ? "NOUS" : "EUX";
  const teamColor = seat % 2 === 0 ? COLORS.teal : "#C8551D";
  if (name) {
    return (
      <View style={[styles.slot, isMe ? styles.slotMe : styles.slotFilled]}>
        <Avatar initials={name[0]?.toUpperCase() ?? "?"} size={36} color={isMe ? COLORS.teal : COLORS.brass} />
        <View style={{ flex: 1 }}>
          <Text style={styles.slotName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.slotTag, { color: teamColor }]}>{isMe ? "VOUS" : team}</Text>
        </View>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.slot,
        styles.slotEmpty,
        reserved && { borderColor: COLORS.saffron, borderWidth: 2, borderStyle: "solid" },
      ]}
    >
      <DashedPulse />
      <View style={{ flex: 1 }}>
        <Text style={styles.slotEmptyText} numberOfLines={1}>
          {reserved ? "Réservé" : "Vide"}
        </Text>
        <Text style={[styles.slotTag, { color: teamColor, opacity: reserved ? 1 : 0.6 }]}>{team}</Text>
      </View>
      {canReserve && onReserve && (
        <Pressable onPress={onReserve} style={styles.reserveMini}>
          <Text style={[styles.reserveMiniText, reserved && { color: COLORS.saffronSoft }]}>
            {reserved ? "×" : "+"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function DashedPulse() {
  const [pulse] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={{
        width: 36, height: 36, borderRadius: 18,
        borderWidth: 1.5, borderStyle: "dashed",
        borderColor: "rgba(245,235,214,0.5)",
        alignItems: "center", justifyContent: "center",
        opacity: pulse,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.saffron }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  intro: {
    fontFamily: FONT_UI, fontSize: 14,
    color: "rgba(245,235,214,0.75)", lineHeight: 20, marginBottom: 4,
  },
  divider: {
    height: 0.5, backgroundColor: "rgba(245,235,214,0.15)", marginVertical: 4,
  },

  bigBtn: {
    paddingVertical: 18, paddingHorizontal: 20,
    borderRadius: 16, alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  bigBtnSecondary: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
  },
  bigBtnTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.3,
  },
  bigBtnSub: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(43,24,16,0.75)", marginTop: 4,
    letterSpacing: 1, fontWeight: "700", fontStyle: "italic",
  },

  inputLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3,
    color: COLORS.brass, fontWeight: "700", marginBottom: 6,
  },
  input: {
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1, borderColor: `${COLORS.brass}77`,
    borderRadius: 16, paddingVertical: 16,
    fontFamily: FONT_DISPLAY, fontWeight: "700",
    color: COLORS.cream,
  },
  hint: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.6)", fontStyle: "italic",
    textAlign: "center", marginTop: 8, lineHeight: 16,
  },

  codeBlock: {
    padding: 16, backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14, borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    alignItems: "center",
  },
  codeLabel: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3,
    color: COLORS.brass, fontWeight: "700",
  },
  codeValue: {
    fontFamily: FONT_DISPLAY, fontSize: 44,
    color: COLORS.saffronSoft, fontWeight: "700",
    letterSpacing: 8, marginTop: 8,
  },
  shareRow: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, backgroundColor: `${COLORS.brass}33`,
  },
  shareText: {
    color: COLORS.saffronSoft, fontFamily: FONT_UI_BOLD,
    fontWeight: "700", fontSize: 12, letterSpacing: 1,
  },

  statusBlock: { alignItems: "center", paddingVertical: 4 },
  statusTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 18, fontWeight: "700",
    color: COLORS.saffronSoft,
  },
  statusSub: {
    fontFamily: FONT_UI, fontSize: 13,
    color: "rgba(245,235,214,0.7)", marginTop: 4, letterSpacing: 2, fontStyle: "italic",
  },
  poolStats: {
    fontFamily: FONT_UI_BOLD, fontSize: 11,
    color: COLORS.brass, marginTop: 8, letterSpacing: 0.5,
    textAlign: "center",
  },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slot: {
    width: "48%",
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 10, borderRadius: 14, borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(245,235,214,0.15)",
    minHeight: 62,
  },
  slotMe: {
    backgroundColor: `${COLORS.teal}33`,
    borderColor: `${COLORS.teal}AA`, borderWidth: 2,
  },
  slotFilled: {
    backgroundColor: `${COLORS.brass}22`,
    borderColor: `${COLORS.brass}66`,
  },
  slotEmpty: {
    borderStyle: "dashed", backgroundColor: "rgba(0,0,0,0.2)",
  },
  slotName: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
  },
  slotTag: {
    fontSize: 9, letterSpacing: 1.5,
    color: COLORS.saffronSoft, fontWeight: "700",
    marginTop: 2, fontFamily: FONT_UI_BOLD,
  },
  slotEmptyText: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.5)", fontStyle: "italic",
  },
  reserveMini: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    alignItems: "center", justifyContent: "center",
  },
  reserveMiniText: {
    color: COLORS.cream, fontSize: 14, fontWeight: "700",
  },

  errorBlock: {
    padding: 20, backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14, borderWidth: 0.5, borderColor: "rgba(232,85,58,0.6)",
    alignItems: "center",
  },
  errorTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800",
    color: "#E8553A",
  },
  errorText: {
    fontFamily: FONT_UI, fontSize: 13,
    color: COLORS.cream, textAlign: "center",
    marginTop: 8, lineHeight: 18,
  },
});
