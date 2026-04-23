import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, TextInput, Keyboard } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_UI, FONT_UI_BOLD } from "../theme";
import { useT, t } from "../lib/i18n";

// Messages rapides prédéfinis — les autres se font via l'input perso
// Fonction pour résoudre à l'appel, pour suivre la langue courante
export const getQuickMessages = (): { text: string; emoji: string }[] => [
  { text: t("gameChat.quickNice"), emoji: "👏" },
  { text: t("gameChat.quickLuck"), emoji: "🍀" },
  { text: t("gameChat.quickThanks"), emoji: "🙏" },
  { text: t("gameChat.quickWow"), emoji: "🤯" },
  { text: "Yallah", emoji: "🚀" },
  { text: t("gameChat.quickWhat"), emoji: "😱" },
  { text: "😂", emoji: "" },
];
// Back-compat : ancien nom exporté
export const QUICK_MESSAGES = getQuickMessages();

const MAX_LEN = 60;

// Bouton flottant + palette modale
export function ChatLauncher({
  onSend,
  bottom,
}: {
  onSend: (msg: string) => void;
  bottom: number;
}) {
  const tr = useT();
  const messages = getQuickMessages();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const sendCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    onSend(trimmed.slice(0, MAX_LEN));
    setCustom("");
    setOpen(false);
    Keyboard.dismiss();
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(!open)}
        style={[styles.fab, { bottom }]}
      >
        <Text style={styles.fabIcon}>💬</Text>
      </Pressable>

      {open && (
        <View style={[styles.palette, { bottom: bottom + 60 }]}>
          {/* Messages rapides */}
          <View style={styles.paletteGrid}>
            {messages.map((m, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  onSend(m.text + (m.emoji ? " " + m.emoji : ""));
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.chipText}>
                  {m.text} {m.emoji}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Input perso */}
          <View style={styles.inputRow}>
            <TextInput
              value={custom}
              onChangeText={setCustom}
              placeholder={tr("game.chatPlaceholder2")}
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={styles.input}
              maxLength={MAX_LEN}
              onSubmitEditing={sendCustom}
              returnKeyType="send"
            />
            <Pressable onPress={sendCustom} disabled={!custom.trim()} style={[styles.sendBtn, !custom.trim() && { opacity: 0.4 }]}>
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.sendBtnText}>↑</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

// Bulle de message flottante au-dessus d'un avatar
export function ChatBubble({
  text,
  anchor,
}: {
  text: string;
  anchor: { top: number; left?: number; right?: number };
}) {
  const opacity = useState(() => new Animated.Value(0))[0];
  const translateY = useState(() => new Animated.Value(-10))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 12 }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          top: anchor.top,
          ...(anchor.left != null ? { left: anchor.left } : {}),
          ...(anchor.right != null ? { right: anchor.right } : {}),
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <LinearGradient
        colors={["#FDF6E3", "#F4E1B8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.bubbleText}>{text}</Text>
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 95,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: { fontSize: 20 },

  palette: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 94,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.88)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    gap: 10,
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(212,160,76,0.2)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 18,
  },
  chipText: {
    color: COLORS.cream,
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    fontWeight: "700",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(212,160,76,0.3)",
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.cream,
    fontFamily: FONT_UI,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sendBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },

  bubble: {
    position: "absolute",
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    zIndex: 50,
  },
  bubbleText: {
    color: "#2B1810",
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    fontWeight: "700",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -6,
    left: 16,
    width: 12,
    height: 12,
    backgroundColor: "#FDF6E3",
    transform: [{ rotate: "45deg" }],
  },
});
