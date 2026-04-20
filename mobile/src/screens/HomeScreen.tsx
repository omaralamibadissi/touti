import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD, SPACING, shade } from "../theme";
import { ZelligeBg, ArabesqueDivider, StarBurst } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BrassButton } from "../components/BrassButton";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

/**
 * HomeScreen — porté du design Claude Design (screen-home.jsx).
 * Fond terracotta, titre TOUTI en Cormorant Garamond, motif zellige en filigrane,
 * CTA "Partie rapide" en laiton, grille de 4 modes de jeu.
 */
export default function HomeScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const canPlay = name.trim().length > 0;

  return (
    <View style={styles.root}>
      {/* Fond dégradé terracotta */}
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Motif zellige en filigrane */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>
      {/* Explosion d'étoiles décorative */}
      <View
        style={{
          position: "absolute",
          top: -60,
          left: "50%",
          marginLeft: -210,
          opacity: 0.1,
        }}
        pointerEvents="none"
      >
        <StarBurst size={420} color={COLORS.saffronSoft} strokeW={0.6} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header profil + monnaies */}
        <View style={styles.header}>
          <View style={styles.profile}>
            <Avatar initials={name.trim()[0]?.toUpperCase() || "?"} size={40} color={COLORS.teal} />
            <View>
              <Text style={styles.greeting}>Salut{name.trim() ? `, ${name.trim()}` : ""}</Text>
              <Text style={styles.level}>NIVEAU 1 · MBTDI</Text>
            </View>
          </View>

          <View style={styles.badges}>
            <CoinBadge value="2 480" gold />
            <CoinBadge value="42" />
          </View>
        </View>

        {/* Titre hero */}
        <View style={styles.hero}>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          <Text style={styles.title}>TOUTI</Text>
          <Text style={styles.subtitle}>LE JEU DE CARTES MAROCAIN</Text>
          <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
        </View>

        {/* Input pseudo */}
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>TON PSEUDO · SMITEK</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Entre ton pseudo…"
            placeholderTextColor="rgba(245,235,214,0.5)"
            style={styles.input}
            autoCapitalize="none"
            maxLength={20}
          />
        </View>

        {/* CTA Partie rapide */}
        <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.sm }}>
          <Pressable
            disabled={!canPlay}
            onPress={() => navigation.navigate("Lobby", { name: name.trim() })}
            style={({ pressed }) => [
              styles.ctaWrapper,
              { opacity: canPlay ? 1 : 0.5, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cta}
            >
              <View>
                <Text style={styles.ctaTitle}>Partie rapide</Text>
                <Text style={styles.ctaSubtitle}>LE3B BZZERBA · 2v2</Text>
              </View>
              <View style={styles.ctaIcon}>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path d="M5 4l14 8-14 8V4z" fill={COLORS.ink} />
                </Svg>
              </View>
            </LinearGradient>
          </Pressable>

          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>12 840 joueurs en ligne</Text>
          </View>
        </View>

        {/* Modes de jeu */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.xl }}>
          <SectionHeader fr="Modes de jeu" dr="ANWA3 L'LO3B" />
          <View style={styles.grid}>
            <ModeTile fr="Avec des amis" dr="M3A S7ABEK" accent={COLORS.teal} />
            <ModeTile fr="Tournoi" dr="BTOLA" accent={COLORS.brassDeep} badge="LIVE" />
            <ModeTile fr="Contre l'IA" dr="DED L'MACHINE" accent="#8B4A7F" />
            <ModeTile fr="Défi du jour" dr="T7ADI L'YOUM" accent={COLORS.terracotta} badge="+250" />
          </View>
        </View>

        {/* Amis en ligne */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.lg }}>
          <SectionHeader fr="Amis en ligne" dr="S7ABEK ONLINE" count={4} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
          >
            {[
              { i: "K", c: COLORS.brass, n: "Karim", on: true },
              { i: "Y", c: "#8B4A7F", n: "Yasmine", on: true },
              { i: "A", c: COLORS.teal, n: "Amine", on: true },
              { i: "F", c: COLORS.terracotta, n: "Fatima", on: false },
              { i: "+", c: "rgba(245,235,214,0.15)", n: "3ayet", on: false },
            ].map((f, i) => (
              <View key={i} style={{ alignItems: "center", gap: 4 }}>
                <Avatar initials={f.i} size={46} color={f.c} online={f.on} />
                <Text style={styles.friendName}>{f.n}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function CoinBadge({ value, gold = false }: { value: string; gold?: boolean }) {
  return (
    <View style={styles.coinBadge}>
      {gold ? (
        <View style={styles.coinGold}>
          <Text style={styles.coinLetter}>D</Text>
        </View>
      ) : (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M12 2l8 7-8 13-8-13 8-7z" fill="#4FC2D9" stroke={COLORS.teal} strokeWidth={1} />
        </Svg>
      )}
      <Text style={styles.coinValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ fr, dr, count }: { fr: string; dr: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={styles.sectionFr}>{fr}</Text>
        <Text style={styles.sectionDr}>{dr}</Text>
      </View>
      {count !== undefined && <Text style={styles.sectionCount}>+{count}</Text>}
    </View>
  );
}

function ModeTile({
  fr,
  dr,
  accent,
  badge,
}: {
  fr: string;
  dr: string;
  accent: string;
  badge?: string;
}) {
  return (
    <View style={styles.modeTile}>
      <LinearGradient
        colors={[accent, shade(accent, -25)]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {badge && (
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{badge}</Text>
        </View>
      )}
      <View style={{ padding: 14, gap: 8 }}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={4} stroke={COLORS.cream} strokeWidth={1.8} fill="none" />
        </Svg>
        <Text style={styles.modeFr}>{fr}</Text>
        <Text style={styles.modeDr}>{dr}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.terracottaDark },
  scroll: { paddingTop: 12, paddingBottom: 24 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  profile: { flexDirection: "row", alignItems: "center", gap: 10 },
  greeting: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "700" },
  level: {
    color: "rgba(245,235,214,0.65)",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 3,
    fontWeight: "600",
  },
  badges: { flexDirection: "row", gap: 8 },

  coinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
  },
  coinGold: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  coinLetter: { color: COLORS.terracottaDark, fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: "700" },
  coinValue: { color: COLORS.cream, fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700" },

  hero: { alignItems: "center", marginTop: 20, gap: 6 },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 72,
    color: COLORS.saffronSoft,
    letterSpacing: 4,
    fontWeight: "700",
    textShadowColor: "rgba(232,161,48,0.55)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    color: COLORS.cream,
    letterSpacing: 6,
    fontWeight: "700",
    fontStyle: "italic",
    opacity: 0.85,
    marginTop: 2,
  },

  inputBlock: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    gap: 8,
  },
  inputLabel: {
    fontSize: 10,
    color: COLORS.saffronSoft,
    letterSpacing: 3,
    fontWeight: "700",
    fontFamily: FONT_UI,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.cream,
    fontSize: 16,
    fontFamily: FONT_UI,
  },

  ctaWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.terracottaDark,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  ctaTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 22,
    color: COLORS.ink,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.8)",
    letterSpacing: 2,
    marginTop: 4,
    fontStyle: "italic",
    fontWeight: "700",
  },
  ctaIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(43,24,16,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.statusGreen,
  },
  onlineText: {
    fontSize: 11,
    color: "rgba(245,235,214,0.75)",
    letterSpacing: 0.8,
    fontWeight: "500",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionFr: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    color: COLORS.cream,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sectionDr: {
    fontFamily: FONT_UI,
    fontSize: 9,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.55)",
    fontWeight: "700",
    fontStyle: "italic",
  },
  sectionCount: {
    fontSize: 11,
    color: COLORS.brass,
    fontWeight: "700",
    letterSpacing: 1,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  modeTile: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
    minHeight: 110,
  },
  modeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.saffron,
    borderRadius: 6,
    zIndex: 2,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 1,
  },
  modeFr: {
    color: COLORS.cream,
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    fontWeight: "700",
  },
  modeDr: {
    color: "rgba(245,235,214,0.65)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    fontStyle: "italic",
  },

  friendName: {
    fontSize: 9,
    color: COLORS.cream,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
