import React from "react";
import { Pressable, Text, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_UI_BOLD, RADIUS } from "../theme";

type Variant = "primary" | "ghost" | "danger";

interface Props {
  label: string;
  subLabel?: string;
  onPress?: () => void;
  variant?: Variant;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

/**
 * BrassButton — bouton signature du design (laiton brossé, dégradé chaud).
 * Reproduit `BrassButton` de ui.jsx.
 */
export function BrassButton({
  label,
  subLabel,
  onPress,
  variant = "primary",
  large = false,
  style,
  icon,
}: Props) {
  const colors: Record<Variant, [string, string]> = {
    primary: ["#E8A130", "#B8791C"],
    ghost: ["rgba(245,235,214,0.08)", "rgba(245,235,214,0.04)"],
    danger: ["#C8441A", "#8B2417"],
  };
  const borderColor: Record<Variant, string> = {
    primary: "#8B5A12",
    ghost: "rgba(212,160,76,0.4)",
    danger: "#5A1810",
  };
  const textColor: Record<Variant, string> = {
    primary: "#FDF6E3",
    ghost: COLORS.cream,
    danger: "#FDF6E3",
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          borderColor: borderColor[variant],
          borderRadius: large ? 14 : RADIUS.sm + 2,
          paddingVertical: large ? 16 : 10,
          paddingHorizontal: large ? 28 : 20,
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      <LinearGradient
        colors={colors[variant]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.row}>
        {icon}
        <View>
          <Text style={[styles.label, { color: textColor[variant], fontSize: large ? 18 : 14 }]}>
            {label}
          </Text>
          {subLabel && (
            <Text style={[styles.subLabel, { color: textColor[variant] }]}>{subLabel}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#8B5A12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontFamily: FONT_UI_BOLD, fontWeight: "700", letterSpacing: 0.3 },
  subLabel: {
    fontSize: 10,
    fontStyle: "italic",
    letterSpacing: 2,
    opacity: 0.8,
    marginTop: 2,
    fontWeight: "600",
  },
});
