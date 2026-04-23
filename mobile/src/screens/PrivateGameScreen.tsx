import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Share, ActivityIndicator, AppState } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useNetGameStore } from "../store/netGameStore";
import { useAuthStore } from "../store/authStore";
import { buildPrivateLink } from "../lib/deepLink";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "PrivateGame">;

function randomCode(): string {
  // 4 lettres, pas de I/O/0/1 pour éviter confusion
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function PrivateGameScreen({ navigation, route }: Props) {
  const t = useT();
  const [mode, setMode] = useState<"menu" | "lobby" | "joining">("menu");
  const [typedCode, setTypedCode] = useState("");
  const incomingCode = route.params?.code?.toUpperCase();

  const myUsername = useAuthStore((s) => s.user?.username) ?? "Player";

  const store = useNetGameStore();
  const { room, connected, connecting, error, players, locked, roomCode } = store;

  // Au montage : tente un reconnect silencieux si on avait une session
  // persistée. Sinon, si un code est passé (deep link), on join direct.
  useEffect(() => {
    (async () => {
      if (!room) {
        const ok = await store.tryReconnect();
        if (ok) { setMode("lobby"); return; }
      }
      if (incomingCode && !room) {
        setTypedCode(incomingCode);
        setMode("lobby");
        await store.connectPrivate(incomingCode, myUsername);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCode]);

  // Reconnect automatique quand l'app revient au foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (next === "active" && !connected && !connecting) {
        await store.tryReconnect();
      }
    });
    return () => sub.remove();
  }, [connected, connecting, store]);

  // Auto-navigation vers le jeu quand la partie démarre (locked → true)
  useEffect(() => {
    if (locked) {
      navigation.replace("Game", { mode: "net" });
    }
  }, [locked, navigation]);

  const hostSeat = players.length > 0 ? players.sort((a, b) => a.seat - b.seat)[0].seat : null;
  const mySessionId = room?.sessionId;
  const me = players.find((p) => p.id === mySessionId);
  const isHost = me && hostSeat != null && me.seat === hostSeat;

  const create = async () => {
    const code = randomCode();
    setMode("lobby");
    await store.connectPrivate(code, myUsername);
  };

  const join = async () => {
    if (typedCode.length !== 4) return;
    setMode("lobby");
    await store.connectPrivate(typedCode, myUsername);
  };

  const share = async () => {
    if (!roomCode) return;
    try {
      const link = buildPrivateLink(roomCode);
      await Share.share({
        message: t("privateGame.shareMsg", { code: roomCode, link }),
      });
    } catch {}
  };

  const cancel = async () => {
    await store.disconnect();
    setMode("menu");
    setTypedCode("");
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
        <Pressable style={styles.iconBtn} onPress={() => (mode === "menu" ? navigation.goBack() : cancel())}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("privateGame.eyebrow")}</Text>
          <Text style={styles.title}>{t("privateGame.titleShort")}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {mode === "menu" && (
          <View style={{ gap: 12 }}>
            <Text style={styles.intro}>{t("privateGame.intro")}</Text>

            <Pressable onPress={create} style={styles.bigBtn}>
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>{t("privateGame.createBtn")}</Text>
              <Text style={styles.bigBtnSub}>{t("privateGame.createBtnSub")}</Text>
            </Pressable>

            <Pressable onPress={() => setMode("joining")} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("privateGame.joinBtn")}</Text>
              <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>{t("privateGame.joinBtnSub")}</Text>
            </Pressable>
          </View>
        )}

        {mode === "joining" && (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.codeLabel}>{t("privateGame.codeFriendLabel")}</Text>
              <TextInput
                value={typedCode}
                onChangeText={(txt) => setTypedCode(txt.toUpperCase().slice(0, 4))}
                placeholder={t("privateGame.codeInputPlaceholder")}
                placeholderTextColor="rgba(245,235,214,0.3)"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={4}
                style={styles.codeInput}
              />
            </View>

            <Pressable
              disabled={typedCode.length !== 4}
              onPress={join}
              style={[styles.bigBtn, typedCode.length !== 4 && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>{t("privateGame.joinAction")}</Text>
            </Pressable>

            <Pressable
              disabled={typedCode.length !== 4}
              onPress={async () => {
                if (typedCode.length !== 4) return;
                setMode("lobby");
                await store.connectSpectator(typedCode, myUsername);
              }}
              style={[styles.bigBtn, styles.bigBtnSecondary, typedCode.length !== 4 && { opacity: 0.4 }]}
            >
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("privateGame.spectate")}</Text>
              <Text style={[styles.bigBtnSub, { color: "rgba(245,235,214,0.6)" }]}>
                {t("privateGame.spectateSub")}
              </Text>
            </Pressable>

            <Pressable onPress={() => { setMode("menu"); setTypedCode(""); }} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("privateGame.back")}</Text>
            </Pressable>
          </View>
        )}

        {mode === "lobby" && (
          <View style={{ gap: 14 }}>
            {connecting && (
              <View style={styles.centerBlock}>
                <ActivityIndicator color={COLORS.saffron} size="large" />
                <Text style={styles.dim}>{t("privateGame.connecting")}</Text>
              </View>
            )}
            {!connecting && !connected && !error && (
              <View style={styles.centerBlock}>
                <Text style={styles.dim}>
                  {roomCode ? t("privateGame.disconnectedWithCode", { code: roomCode }) : t("privateGame.disconnected")}
                </Text>
                {roomCode && (
                  <Pressable
                    onPress={async () => {
                      // Essaye d'abord un vrai reconnect (token), puis fallback
                      // sur un joinOrCreate qui recrée une session dans la même room
                      const ok = await store.tryReconnect();
                      if (!ok) {
                        await store.connectPrivate(roomCode, myUsername);
                      }
                    }}
                    style={[styles.bigBtn, { marginTop: 14 }]}
                  >
                    <LinearGradient
                      colors={[COLORS.saffron, COLORS.brassDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.bigBtnTitle}>{t("privateGame.reconnect")}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={cancel}
                  style={[styles.bigBtn, styles.bigBtnSecondary, { marginTop: 8 }]}
                >
                  <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>
                    {t("privateGame.backToMenu")}
                  </Text>
                </Pressable>
              </View>
            )}

            {error && (
              <View style={[styles.centerBlock, { backgroundColor: "rgba(200,70,45,0.15)" }]}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={cancel} style={[styles.bigBtn, styles.bigBtnSecondary, { marginTop: 14 }]}>
                  <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("privateGame.back")}</Text>
                </Pressable>
              </View>
            )}

            {connected && !error && (
              <>
                {roomCode && (
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeLabel}>{t("privateGame.codeGameLabel")}</Text>
                    <Text style={styles.codeValue}>{roomCode}</Text>
                    <Pressable onPress={share} style={styles.shareRow}>
                      <Text style={styles.shareText}>{t("privateGame.shareAction")}</Text>
                    </Pressable>
                  </View>
                )}

                <Text style={styles.sectionLabel}>
                  {t("privateGame.playersLabel", { count: players.length })}
                </Text>

                <View style={{ gap: 8 }}>
                  {[0, 1, 2, 3].map((seat) => {
                    const p = players.find((x) => x.seat === seat);
                    return (
                      <PlayerSlot
                        key={seat}
                        seat={seat}
                        name={p?.name}
                        connected={p?.connected}
                        ready={p?.ready}
                        isMe={p?.id === mySessionId}
                        reserved={store.reservedSeat === seat}
                        canReserve={isHost && !p}
                        onReserve={() =>
                          store.reserveSeat(store.reservedSeat === seat ? null : (seat as 0|1|2|3))
                        }
                      />
                    );
                  })}
                </View>
                {isHost && store.reservedSeat !== null && (
                  <Text style={styles.reservedHint}>
                    {t("privateGame.reservedHint", { place: placeLabel(store.reservedSeat, t) })}
                  </Text>
                )}

                {isHost ? (
                  <Pressable
                    onPress={() => store.startGame()}
                    style={[styles.bigBtn, { marginTop: 10 }]}
                  >
                    <LinearGradient
                      colors={[COLORS.saffron, COLORS.brassDeep]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.bigBtnTitle}>{t("privateGame.startGame")}</Text>
                    <Text style={styles.bigBtnSub}>
                      {players.length < 4
                        ? t(`privateGame.botsWillFill${4 - players.length > 1 ? "_plural" : ""}`, { count: 4 - players.length })
                        : t("privateGame.allHumans")}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.centerBlock}>
                    <Text style={styles.dim}>{t("privateGame.waitingHost")}</Text>
                  </View>
                )}

                <Pressable onPress={cancel} style={[styles.bigBtn, styles.bigBtnSecondary]}>
                  <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>{t("privateGame.quitAction")}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function placeLabel(seat: number, t: (k: string, p?: any) => string): string {
  const team = seat % 2 === 0 ? t("privateGame.teamUs") : t("privateGame.teamThem");
  return t("privateGame.placeLabel", { team, seat });
}

function PlayerSlot({
  seat,
  name,
  connected,
  ready,
  isMe,
  reserved,
  canReserve,
  onReserve,
}: {
  seat: number;
  name?: string;
  connected?: boolean;
  ready?: boolean;
  isMe?: boolean;
  reserved?: boolean;
  canReserve?: boolean;
  onReserve?: () => void;
}) {
  const tr = useT();
  const team = (seat % 2) as 0 | 1;
  const teamColor = team === 0 ? COLORS.teal : "#C8551D";
  const teamLabel = team === 0 ? tr("privateGame.teamUs") : tr("privateGame.teamThem");

  return (
    <View style={[styles.slotRow, reserved && { borderColor: COLORS.saffron, borderWidth: 1 }]}>
      {name ? (
        <>
          <Avatar
            initials={name[0]?.toUpperCase() ?? "?"}
            size={34}
            color={teamColor}
            online={connected}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.slotName}>
              {name}
              {isMe && <Text style={{ color: COLORS.saffronSoft }}>  {tr("privateGame.you")}</Text>}
            </Text>
            <Text style={[styles.slotTeam, { color: teamColor }]}>{teamLabel}</Text>
          </View>
          {ready && (
            <View style={styles.readyBadge}>
              <Text style={styles.readyText}>{tr("privateGame.ready")}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.emptyCircle} />
          <View style={{ flex: 1 }}>
            <Text style={styles.slotEmptyName}>
              {reserved ? tr("privateGame.reserved") : tr("privateGame.waitingSlot")}
            </Text>
            <Text style={[styles.slotTeam, { color: teamColor, opacity: reserved ? 1 : 0.5 }]}>
              {teamLabel}
            </Text>
          </View>
          {canReserve && onReserve && (
            <Pressable
              onPress={onReserve}
              style={[styles.reserveBtn, reserved && styles.reserveBtnActive]}
            >
              <Text style={[styles.reserveBtnText, reserved && { color: COLORS.terracottaDark }]}>
                {reserved ? tr("privateGame.cancel") : tr("privateGame.invite")}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  content: { flex: 1, padding: 20 },
  intro: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: "rgba(245,235,214,0.75)",
    lineHeight: 20,
    marginBottom: 8,
  },

  bigBtn: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bigBtnSecondary: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  bigBtnTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
  bigBtnSub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.75)",
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: "700",
    fontStyle: "italic",
  },

  centerBlock: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
  },
  dim: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.55)",
    fontStyle: "italic",
  },
  errorText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    color: "#E8553A",
    fontWeight: "700",
    textAlign: "center",
  },

  codeBlock: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
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
  shareRow: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${COLORS.brass}33`,
  },
  shareText: {
    color: COLORS.saffronSoft,
    fontFamily: FONT_UI_BOLD,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
  },

  codeInput: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 16,
    paddingVertical: 18,
    textAlign: "center",
    fontSize: 32,
    fontFamily: FONT_DISPLAY,
    fontWeight: "700",
    color: COLORS.cream,
    letterSpacing: 8,
  },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.7)",
    fontWeight: "700",
    marginTop: 6,
  },

  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.1)",
  },
  slotName: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.cream,
  },
  slotTeam: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginTop: 2,
  },
  slotEmptyName: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.4)",
    fontStyle: "italic",
  },
  emptyCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(245,235,214,0.25)",
  },
  readyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${COLORS.statusGreen}33`,
    borderWidth: 0.5,
    borderColor: COLORS.statusGreen,
  },
  readyText: {
    color: COLORS.statusGreen,
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  reserveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}66`,
  },
  reserveBtnActive: {
    backgroundColor: COLORS.saffron,
    borderColor: COLORS.saffron,
  },
  reserveBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.cream,
    fontWeight: "700",
  },
  reservedHint: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: COLORS.saffronSoft,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 6,
  },
});
