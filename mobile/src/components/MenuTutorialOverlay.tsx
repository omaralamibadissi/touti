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

const STEPS: { title: string; text: string }[] = [
  {
    title: "Le menu principal",
    text:
      "L'app est organisée en 4 onglets en bas : Accueil (jeu), Social (amis), Profil (tes stats), Réglages. Tu peux aussi swiper latéralement pour changer d'onglet.",
  },
  {
    title: "Accueil · modes de jeu",
    text:
      "Sur l'accueil tu trouves toutes les façons de jouer : Solo contre 3 bots, Partie rapide en ligne, Partie privée avec un code, Tournois, Ligues, Score IRL (compteur papier), Règles, Historique et Classement.",
  },
  {
    title: "Social · tes amis",
    text:
      "Onglet Social : ajoute des amis par pseudo, accepte/refuse les demandes, lance une partie privée avec eux. Tu peux aussi leur envoyer des messages directs.",
  },
  {
    title: "Profil · ton niveau",
    text:
      "Onglet Profil : ton niveau, tes parties jouées, ton ratio victoires/défaites, tes coéquipiers favoris. Tape pour voir les détails de chaque match passé.",
  },
  {
    title: "Réglages · tout personnaliser",
    text:
      "Onglet Réglages : son/musique/vibrations, notifications, export de tes données, déconnexion. Tu peux aussi relancer ce tutoriel à tout moment.",
  },
  {
    title: "En jeu · bouton ☰",
    text:
      "Pendant une partie, le bouton ☰ en haut à gauche t'ouvre le menu pause : règles complètes, fiche de score, son, quitter. Accessible à tout moment.",
  },
  {
    title: "C'est parti !",
    text:
      "Voilà, tu connais l'app. Tu peux commencer une vraie partie quand tu veux. Amuse-toi, et rappel : premier à 600 points gagne.",
  },
];

export function MenuTutorialOverlay() {
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
                <Text style={styles.skipText}>Passer</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable onPress={onNext} style={styles.ctaBtn} hitSlop={8}>
              <Text style={styles.ctaText}>
                {isLast ? "Terminer" : "Suivant"}
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
