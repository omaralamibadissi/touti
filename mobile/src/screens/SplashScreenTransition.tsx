import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_DISPLAY, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, StarBurst, ZelligeBg } from "../components/Patterns";
import { getCardComponent } from "../components/cardAssets";

/**
 * Splash custom rendu en natif (SVG + texte) — aucun PNG, donc pas de
 * contours antialiasés sur le fond. Apparaît pendant ~1.8s puis onDone().
 */
interface Props {
  onDone: () => void;
}

export default function SplashScreenTransition({ onDone }: Props) {
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.92)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(starRotate, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(600),
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [fadeOut, onDone, starRotate, subOpacity, titleOpacity, titleScale]);

  const spin = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeOut }]}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      {/* Étoile qui tourne lentement derrière */}
      <Animated.View
        style={[styles.starWrap, { transform: [{ rotate: spin }] }]}
        pointerEvents="none"
      >
        <StarBurst size={360} color={COLORS.saffronSoft} strokeW={0.6} />
      </Animated.View>

      <View style={styles.center}>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: titleOpacity,
            transform: [{ scale: titleScale }],
          }}
        >
          <SplashCards />
        </Animated.View>

        <Animated.View
          style={{
            alignItems: "center",
            opacity: subOpacity,
            marginTop: 24,
          }}
        >
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
          <Text style={styles.title}>TOUTI</Text>
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Rey + Caballo de oros fannés — identiques au logo d'app.
// Les SVG n'incluent PAS le fond : on wrappe dans un View crème avec radius.
function SplashMini({
  rank,
  width,
  height,
}: {
  rank: 11 | 12;
  width: number;
  height: number;
}) {
  const CardSvg = getCardComponent("oros", rank);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: width * 0.07,
        backgroundColor: "#FBF6EA",
        borderWidth: 1,
        borderColor: "#151515",
        overflow: "hidden",
      }}
    >
      <CardSvg width={width} height={height} />
    </View>
  );
}

function SplashCards() {
  return (
    <View style={cardStyles.wrap}>
      <View style={[cardStyles.card, { transform: [{ rotate: "-14deg" }, { translateX: -50 }] }]}>
        <SplashMini rank={11} width={130} height={208} />
      </View>
      <View style={[cardStyles.card, { transform: [{ rotate: "14deg" }, { translateX: 50 }] }]}>
        <SplashMini rank={12} width={130} height={208} />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {
    width: 300, height: 230,
    alignItems: "center", justifyContent: "center",
  },
  card: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  starWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.12,
  },
  center: { alignItems: "center" },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 84,
    color: COLORS.saffronSoft,
    letterSpacing: 6,
    fontWeight: "700",
    textShadowColor: "rgba(232,161,48,0.55)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 18,
    marginVertical: 6,
  },
  tagline: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    color: COLORS.cream,
    letterSpacing: 6,
    fontWeight: "700",
    fontStyle: "italic",
    opacity: 0.85,
  },
});
