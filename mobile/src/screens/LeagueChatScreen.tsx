// Chat dédié à une ligue. Accessible uniquement aux membres.
// Polling simple à l'ouverture — pas de socket (MVP).

import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { Avatar } from "../components/Avatar";
import { useLeagueStore } from "../store/leagueStore";
import { useLeagueChatStore, type LeagueMessage } from "../store/leagueChatStore";
import { useAuthStore } from "../store/authStore";
import { useT, i18n } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "LeagueChat">;

// Array vide stable — évite le crash Zustand "infinite snapshot" quand aucun
// message n'est encore chargé pour cette ligue.
const EMPTY_MESSAGES: LeagueMessage[] = [];

export default function LeagueChatScreen({ navigation, route }: Props) {
  const t = useT();
  const { id } = route.params;
  const league = useLeagueStore((s) => s.leagues.find((l) => l.id === id));
  const messages = useLeagueChatStore((s) => s.byLeague[id] ?? EMPTY_MESSAGES);
  const loading = useLeagueChatStore((s) => !!s.loading[id]);
  const refresh = useLeagueChatStore((s) => s.refresh);
  const post = useLeagueChatStore((s) => s.post);
  const myUsername = useAuthStore((s) => s.user?.username) ?? "";
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<LeagueMessage>>(null);

  // Load au mount + polling avec backoff exponentiel en cas d'échec :
  // 8s si tout va bien, puis 16 / 32 / 60s max si le refresh rate, pour
  // éviter de mitrailler le réseau et la batterie quand le tel est offline.
  // Reset à 8s dès qu'un refresh réussit à nouveau.
  useEffect(() => {
    let cancelled = false;
    let delay = 8000;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (cancelled) return;
      try {
        await refresh(id);
        delay = 8000; // succès : on ramène le polling à la cadence normale
      } catch {
        delay = Math.min(delay * 2, 60_000); // échec : on relâche progressivement
      }
      if (!cancelled) timer = setTimeout(tick, delay);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, refresh]);

  // Auto-scroll vers le bas quand la liste change
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  if (!league) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={["#2E1B5B", "#0B0721"]} style={StyleSheet.absoluteFill} />
        <Text style={{ color: COLORS.cream, fontFamily: FONT_UI, fontSize: 14 }}>
          {t("leagues.notFound")}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { marginTop: 20 }]}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
      </View>
    );
  }

  const onSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const msg = await post(id, text);
    setSending(false);
    if (msg) setDraft("");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.tealDeep, "#051D20"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t("leagues.chat").toUpperCase()}</Text>
          <Text style={styles.title}>{league.name}</Text>
        </View>
      </View>

      {/* Liste */}
      {loading && messages.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.saffronSoft} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t("leagues.chatEmpty")}</Text>
          <Text style={styles.emptySub}>{t("leagues.chatFirst")}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16, gap: 8 }}
          renderItem={({ item, index }) => {
            const mine = item.authorName === myUsername;
            const prev = messages[index - 1];
            const showAuthor = !mine && (!prev || prev.authorName !== item.authorName);
            const showDateSep = !prev || !sameDay(prev.createdAt, item.createdAt);
            return (
              <>
                {showDateSep && (
                  <View style={styles.dateSepRow}>
                    <View style={styles.dateSepLine} />
                    <Text style={styles.dateSepText}>{formatDateLabel(item.createdAt)}</Text>
                    <View style={styles.dateSepLine} />
                  </View>
                )}
                <View style={[styles.msgRow, mine && { justifyContent: "flex-end" }]}>
                  {!mine && showAuthor && (
                    <Avatar initials={item.authorName[0]?.toUpperCase() ?? "?"} size={28} color={COLORS.brass} />
                  )}
                  {!mine && !showAuthor && <View style={{ width: 28 }} />}
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && showAuthor && (
                      <Text style={styles.msgAuthor}>{item.authorName}</Text>
                    )}
                    <Text style={[styles.msgText, mine && { color: COLORS.terracottaDark }]}>
                      {item.text}
                    </Text>
                    <Text style={[styles.msgTime, mine && { color: "rgba(43,24,16,0.55)" }]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("leagues.chatPlaceholder")}
          placeholderTextColor="rgba(245,235,214,0.4)"
          style={styles.input}
          multiline
          maxLength={500}
          onSubmitEditing={onSend}
        />
        <Pressable
          onPress={onSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.sendBtnText}>{sending ? "…" : t("dm.send")}</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getDate() === db.getDate() &&
    da.getMonth() === db.getMonth() &&
    da.getFullYear() === db.getFullYear()
  );
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(ts, now.getTime())) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(ts, yesterday.getTime())) return "Hier";
  const loc = i18n.locale.startsWith("en") ? "en-US" : i18n.locale.startsWith("ar") ? "ar-MA" : "fr-FR";
  return d.toLocaleDateString(loc, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
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

  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyBox: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8,
  },
  emptyTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream,
  },
  emptySub: {
    fontFamily: FONT_UI, fontSize: 12,
    color: "rgba(245,235,214,0.55)", textAlign: "center",
  },

  msgRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleTheirs: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: COLORS.saffronSoft,
    borderBottomRightRadius: 4,
  },
  msgAuthor: {
    fontFamily: FONT_UI_BOLD, fontSize: 10, fontWeight: "700",
    color: COLORS.brass, letterSpacing: 0.3, marginBottom: 3,
  },
  msgText: {
    fontFamily: FONT_UI, fontSize: 13,
    color: COLORS.cream, lineHeight: 18,
  },
  msgTime: {
    fontFamily: FONT_UI, fontSize: 9,
    color: "rgba(245,235,214,0.45)", marginTop: 4, letterSpacing: 0.3,
  },

  dateSepRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 8,
  },
  dateSepLine: {
    flex: 1, height: 0.5,
    backgroundColor: `${COLORS.brass}33`,
  },
  dateSepText: {
    fontFamily: FONT_UI_BOLD, fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    letterSpacing: 1,
    textTransform: "capitalize",
  },

  inputBar: {
    flexDirection: "row", gap: 8, alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 0.5, borderTopColor: `${COLORS.brass}33`,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.cream,
    fontFamily: FONT_UI, fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    minWidth: 80,
  },
  sendBtnText: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.3,
  },
});
