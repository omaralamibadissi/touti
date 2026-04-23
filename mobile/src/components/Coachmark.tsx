// Overlay tutoriel — bulles qui pointent séquentiellement sur des zones de
// l'écran. Utilisé pour la 1ère partie solo de l'user.
//
// Usage :
//   const handRef = useRef<View>(null);
//   <Coachmark
//     steps={[{ targetRef: handRef, text: "Ta main", placement: "above" }, ...]}
//     onDone={() => markCoachmarksDone()}
//   />
//
// Limitations :
//   - Le "trou" n'est pas vraiment découpé : on overlay une bordure brillante
//     autour de la zone ciblée par-dessus un voile semi-transparent.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_UI, FONT_UI_BOLD, FONT_UI_EXTRA } from "../theme";
import { hapticTap, hapticChoice } from "../lib/haptics";

export type CoachmarkStep = {
  targetRef?: React.RefObject<View | null> | null;
  text: string;
  // Place la bulle au-dessus ou en-dessous de la cible (auto par défaut)
  placement?: "above" | "below" | "auto";
  // Label spécifique pour cette étape (par défaut "Suivant"/"Compris")
  ctaLabel?: string;
};

type Props = {
  visible: boolean;
  steps: CoachmarkStep[];
  onDone: () => void;
};

type Rect = { x: number; y: number; w: number; h: number };

export function Coachmark({ visible, steps, onDone }: Props) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = steps[index];

  // Mesure la position de la cible à chaque changement d'étape
  useEffect(() => {
    if (!visible || !step?.targetRef?.current) {
      setRect(null);
      return;
    }
    const node = step.targetRef.current;
    // Laisse le layout se stabiliser
    const t = setTimeout(() => {
      node.measureInWindow((x, y, w, h) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        setRect({ x, y, w, h });
      });
    }, 50);
    return () => clearTimeout(t);
  }, [visible, index, step]);

  if (!visible || !step) return null;

  const isLast = index === steps.length - 1;
  const onNext = () => {
    if (isLast) {
      hapticChoice();
      onDone();
    } else {
      hapticTap();
      setIndex((i) => i + 1);
    }
  };

  // Position de la bulle par rapport au rect mesuré
  const bubbleGeom = computeBubbleGeometry(rect, step.placement, winW, winH);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
      {/* Voile plein écran qui intercepte les taps */}
      <Pressable
        onPress={onNext}
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.68)" }]}
      />

      {/* Ring autour de la zone ciblée */}
      {rect && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: rect.x - 6,
            top: rect.y - 6,
            width: rect.w + 12,
            height: rect.h + 12,
            borderRadius: 14,
            borderWidth: 2.5,
            borderColor: COLORS.saffronSoft,
            shadowColor: COLORS.saffron,
            shadowOpacity: 0.8,
            shadowRadius: 12,
          }}
        />
      )}

      {/* Bulle + bouton */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bubble,
          {
            top: bubbleGeom.top,
            left: bubbleGeom.left,
            width: bubbleGeom.width,
          },
        ]}
      >
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bubbleInner}>
          <Text style={styles.stepCount}>{index + 1} / {steps.length}</Text>
          <Text style={styles.bubbleText}>{step.text}</Text>
          <Pressable onPress={onNext} style={styles.ctaBtn} hitSlop={12}>
            <Text style={styles.ctaText}>
              {step.ctaLabel ?? (isLast ? "Compris" : "Suivant")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function computeBubbleGeometry(
  rect: Rect | null,
  placement: CoachmarkStep["placement"],
  winW: number,
  winH: number,
): { top: number; left: number; width: number } {
  const BUBBLE_W = Math.min(320, winW - 40);
  const MARGIN = 20;
  const GAP = 16;
  const EST_H = 150;

  if (!rect) {
    // Pas de cible mesurée : bulle au milieu bas
    return {
      top: winH / 2 - EST_H / 2,
      left: (winW - BUBBLE_W) / 2,
      width: BUBBLE_W,
    };
  }

  const targetTop = rect.y;
  const targetBottom = rect.y + rect.h;
  const spaceAbove = targetTop - MARGIN;
  const spaceBelow = winH - targetBottom - MARGIN;

  let pos: "above" | "below";
  if (placement === "above") pos = "above";
  else if (placement === "below") pos = "below";
  else pos = spaceBelow >= EST_H || spaceBelow > spaceAbove ? "below" : "above";

  let top: number;
  if (pos === "above") {
    top = Math.max(MARGIN, targetTop - GAP - EST_H);
  } else {
    top = Math.min(winH - EST_H - MARGIN, targetBottom + GAP);
  }

  // Centre horizontalement sur la cible, clamp dans l'écran
  let left = rect.x + rect.w / 2 - BUBBLE_W / 2;
  left = Math.max(MARGIN, Math.min(winW - BUBBLE_W - MARGIN, left));

  return { top, left, width: BUBBLE_W };
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: `${COLORS.cream}55`,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bubbleInner: {
    padding: 16,
    gap: 10,
  },
  stepCount: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(43,24,16,0.6)",
    fontWeight: "700",
  },
  bubbleText: {
    fontFamily: FONT_UI,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.ink,
    fontWeight: "600",
  },
  ctaBtn: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.terracottaDark,
  },
  ctaText: {
    fontFamily: FONT_UI_EXTRA,
    fontSize: 12,
    letterSpacing: 1,
    color: COLORS.cream,
    fontWeight: "800",
  },
});
