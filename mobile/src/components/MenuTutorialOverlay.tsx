// Menu tutorial overlay — série de bulles explicatives sur les sections
// principales de l'app (tabs Home/Social/Profile/Settings + tuiles de jeu).
//
// Activation : `menuTutorialActive` dans authStore. Se termine quand l'user
// tape "Terminer" sur la dernière bulle.

import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../store/authStore";
import {
  COLORS,
  FONT_DISPLAY,
  FONT_UI,
  FONT_UI_BOLD,
  FONT_UI_EXTRA,
} from "../theme";
import { hapticTap, hapticChoice } from "../lib/haptics";

import { useT } from "../lib/i18n";

function useSteps(): { title: string; text: string }[] {
  const t = useT();
  return [
    { title: t("menuTuto.step1Title"), text: t("menuTuto.step1Body") },
    { title: t("menuTuto.step2Title"), text: t("menuTuto.step2Body") },
    { title: t("menuTuto.step3Title"), text: t("menuTuto.step3Body") },
    { title: t("menuTuto.step4Title"), text: t("menuTuto.step4Body") },
    { title: t("menuTuto.step5Title"), text: t("menuTuto.step5Body") },
    { title: t("menuTuto.step6Title"), text: t("menuTuto.step6Body") },
    { title: t("menuTuto.step7Title"), text: t("menuTuto.step7Body") },
  ];
}

export function MenuTutorialOverlay() {
  const t = useT();
  const STEPS = useSteps();
  const active = useAuthStore((s) => s.menuTutorialActive);
  const setMenuTutorialActive = useAuthStore((s) => s.setMenuTutorialActive);
  const setPendingMenuTutorial = useAuthStore((s) => s.setPendingMenuTutorial);
  const [index, setIndex] = useState(0);

  // Réinitialise l'index chaque fois que l'overlay est activé
  useEffect(() => {
    if (active) setIndex(0);
  }, [active]);

  if (!active) return null;

  const isLast = index === STEPS.length - 1;
  const step = STEPS[index];

  const onNext = () => {
    if (isLast) {
      hapticChoice();
      setMenuTutorialActive(false);
      setPendingMenuTutorial(false);
    } else {
      hapticTap();
      setIndex((i) => i + 1);
    }
  };

  const onSkip = () => {
    hapticTap();
    setMenuTutorialActive(false);
    setPendingMenuTutorial(false);
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="auto">
      <Pressable
        onPress={onNext}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.72)" }]}
      />

      <View style={styles.card}>
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardInner}>
          <Text style={styles.stepCount}>{index + 1} / {STEPS.length}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.text}</Text>
          <View style={styles.footer}>
            {!isLast && (
              <Pressable onPress={onSkip} hitSlop={8} style={styles.skipBtn}>
                <Text style={styles.skipText}>{t("menuTuto.skip")}</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onNext} style={styles.ctaBtn} hitSlop={8}>
              <Text style={styles.ctaText}>
                {isLast ? t("menuTuto.finish") : t("menuTuto.next")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: `${COLORS.cream}55`,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cardInner: {
    padding: 22,
    gap: 12,
  },
  stepCount: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 3,
    color: "rgba(43,24,16,0.6)",
    fontWeight: "700",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: FONT_UI,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkSoft,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  skipBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
  },
  skipText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 12,
    letterSpacing: 1.5,
    color: "rgba(43,24,16,0.55)",
    fontWeight: "700",
  },
  ctaBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.terracottaDark,
  },
  ctaText: {
    fontFamily: FONT_UI_EXTRA,
    fontSize: 13,
    letterSpacing: 1.2,
    color: COLORS.cream,
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "rgba(245,235,214,0.3)",
  },
  dotActive: {
    width: 20,
    backgroundColor: COLORS.saffronSoft,
  },
});
