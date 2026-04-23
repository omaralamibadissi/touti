// Conversation 1-to-1 entre amis — interface type WhatsApp.
// Polling 8s pour refresh, auto-scroll bas, mark-as-read à l'ouverture.

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
import { useDirectMessagesStore, type DirectMessage } from "../store/directMessagesStore";
import { useAuthStore } from "../store/authStore";
import { useFriendsStore } from "../store/friendsStore";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "DirectMessage">;

const EMPTY_MSGS: DirectMessage[] = [];

export default function DirectMessageScreen({ navigation, route }: Props) {
  const t = useT();
  const { otherId, otherName } = route.params;
  const messages = useDirectMessagesStore((s) => s.messagesByOther[otherId] ?? EMPTY_MSGS);
  const loading = useDirectMessagesStore((s) => !!s.loadingConv[otherId]);
  const refreshConv = useDirectMessagesStore((s) => s.refreshConv);
  const send = useDirectMessagesStore((s) => s.send);
  const markRead = useDirectMessagesStore((s) => s.markRead);
  const myUsername = useAuthStore((s) => s.user?.username) ?? "";
  const friends = useFriendsStore((s) => s.friends);
  const onlineFriend = friends.find((f) => f.name === otherName)?.online;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<DirectMessage>>(null);

  useEffect(() => {
    refreshConv(otherId);
    markRead(otherId).catch(() => {});
    const timer = setInterval(() => {
      refreshConv(otherId);
      markRead(otherId).catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [otherId, refreshConv, markRead]);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const msg = await send(otherId, text);
    setSending(false);
    if (msg) setDraft("");
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Avatar initials={otherName[0]?.toUpperCase() ?? "?"} size={34} color={COLORS.teal} online={onlineFriend} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{otherName}</Text>
          {onlineFriend && <Text style={styles.subOnline}>{t("dm.online")}</Text>}
        </View>
      </View>

      {/* Liste */}
      {loading && messages.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.saffronSoft} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>{t("dm.empty")}</Text>
          <Text style={styles.emptySub}>{t("dm.placeholder")}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16, gap: 6 }}
          renderItem={({ item, index }) => {
            const mine = item.senderName === myUsername;
            const prev = messages[index - 1];
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
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
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
          placeholder={t("dm.placeholder")}
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
  return da.getDate() === db.getDate() && da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear();
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (sameDay(ts, now.getTime())) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(ts, yesterday.getTime())) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingTop: 56, paddingHorizontal: 14, paddingBottom: 14,
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
  title: {
    fontFamily: FONT_UI_BOLD, fontSize: 16, fontWeight: "800",
    color: COLORS.cream, letterSpacing: 0.2,
  },
  subOnline: {
    fontFamily: FONT_UI_BOLD, fontSize: 10,
    color: "#3FC26A", letterSpacing: 0.5, marginTop: 2,
  },

  centerBox: {
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
    maxWidth: "78%",
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
