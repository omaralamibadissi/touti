import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONT_DISPLAY, shade } from "../theme";

interface Props {
  initials: string;
  size?: number;
  color?: string;
  online?: boolean;
  ring?: boolean;
  // Data URL base64 (JPEG). Si présent, remplace la lettre initiale.
  photo?: string | null;
}

export function Avatar({
  initials,
  size = 48,
  color = COLORS.brass,
  online = false,
  ring = true,
  photo,
}: Props) {
  const hasPhoto = !!photo && photo.length > 0;
  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: COLORS.cream,
          borderWidth: ring ? 2 : 0,
        },
      ]}
    >
      {hasPhoto ? (
        <Image
          source={{ uri: photo! }}
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: size / 2 },
          ]}
          resizeMode="cover"
        />
      ) : (
        <>
          <LinearGradient
            colors={[color, shade(color, -20)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2 }]}
          />
          <Text
            style={{
              color: "#FDF6E3",
              fontFamily: FONT_DISPLAY,
              fontWeight: "700",
              fontSize: size * 0.4,
            }}
          >
            {initials}
          </Text>
        </>
      )}
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.22,
              height: size * 0.22,
              borderRadius: (size * 0.22) / 2,
              bottom: 0,
              right: 2,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dot: {
    position: "absolute",
    backgroundColor: COLORS.statusGreen,
    borderWidth: 2,
    borderColor: COLORS.cream,
  },
});
