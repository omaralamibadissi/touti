import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [name, setName] = useState("");

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Touti</Text>
      <Text style={styles.subtitle}>Jeu de cartes en ligne</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ton pseudo"
        placeholderTextColor="#6b7280"
        style={styles.input}
        autoCapitalize="none"
        maxLength={20}
      />

      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        disabled={!name.trim()}
        onPress={() => navigation.navigate("Lobby", { name: name.trim() })}
      >
        <Text style={styles.buttonText}>Rejoindre une partie</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  title: { color: "#ffffff", fontSize: 48, fontWeight: "800" },
  subtitle: { color: "#9ca3af", fontSize: 16, marginBottom: 24 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#374151",
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
  },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
