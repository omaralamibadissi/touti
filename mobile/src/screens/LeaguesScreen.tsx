import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg, StarBurst } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useLeagueStore, type League } from "../store/leagueStore";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "Leagues">;

const LEAGUE_COLORS = [COLORS.teal, COLORS.brass, "#8B4A7F", COLORS.terracotta, "#2E7A8C"];

export default function LeaguesScreen({ navigation }: Props) {
  const [mode, setMode] = useState<"list" | "create" | "join">("list");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [chosenColor, setChosenColor] = useState(LEAGUE_COLORS[0]);
  const [joinCode, setJoinCode] = useState("");

  const myUsername = useAuthStore((s) => s.user?.username) ?? "Player";

  const hydrate = useLeagueStore((s) => s.hydrate);
  const hydrated = useLeagueStore((s) => s.hydrated);
  const leagues = useLeagueStore((s) => s.leagues);
  const activeId = useLeagueStore((s) => s.activeLeagueId);
  const createLeague = useLeagueStore((s) => s.create);
  const joinLeague = useLeagueStore((s) => s.join);
  const setActive = useLeagueStore((s) => s.setActive);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const submitCreate = async () => {
    if (name.trim().length < 3) {
      Alert.alert("Nom trop court", "Donne un nom d'au moins 3 caractères.");
      return;
    }
    try {
      const l = await createLeague({
        name,
        createdBy: myUsername,
        tagline,
        color: chosenColor,
      });
      setName("");
      setTagline("");
      setMode("list");
      // Navigation directe (plus de setTimeout)
      navigation.navigate("LeagueDetail", { id: l.id });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Création impossible");
    }
  };

  const submitJoin = async () => {
    if (joinCode.length !== 6) return;
    const l = await joinLeague(joinCode, { id: myUsername, name: myUsername });
    if (!l) {
      Alert.alert("Code inconnu", "Personne autour de toi n'a partagé cette ligue sur cet appareil.\n\nDemande au créateur d'ouvrir sa ligue en même temps que toi (v1 locale, serveur à venir).");
      return;
    }
    setMode("list");
    setJoinCode("");
    navigation.navigate("LeagueDetail", { id: l.id });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#2E1B5B", "#1A0F3A", "#0B0721"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color="#2E1B5B" accent={COLORS.saffronSoft} size={70} />
      </View>
      <View style={{ position: "absolute", top: -60, right: -80, opacity: 0.2 }} pointerEvents="none">
        <StarBurst size={260} color={COLORS.saffronSoft} strokeW={0.6} />
      </View>

      <View style={styles.topBar}>
        <Pressable
          onPress={() => (mode === "list" ? navigation.goBack() : setMode("list"))}
          style={styles.iconBtn}
        >
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LIGUES</Text>
          <Text style={styles.title}>Mes ligues</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {mode === "list" && (
          <View style={{ gap: 12 }}>
            {leagues.length === 0 ? (
              <View style={styles.emptyBlock}>
                <Text style={styles.emptyTitle}>Aucune ligue pour l'instant</Text>
                <Text style={styles.emptySub}>
                  Crée ta propre ligue pour organiser des tournois privés avec tes potes réguliers,
                  ou rejoins celle d'un ami avec son code.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={styles.sectionLabel}>TES LIGUES</Text>
                {leagues.map((l) => (
                  <LeagueCard
                    key={l.id}
                    league={l}
                    isActive={l.id === activeId}
                    onPress={() => navigation.navigate("LeagueDetail", { id: l.id })}
                    onSetActive={() => setActive(l.id)}
                  />
                ))}
              </View>
            )}

            <Pressable onPress={() => setMode("create")} style={[styles.bigBtn, { marginTop: 16 }]}>
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>Créer une ligue</Text>
              <Text style={styles.bigBtnSub}>Invite tes potes par code</Text>
            </Pressable>
            <Pressable onPress={() => setMode("join")} style={[styles.bigBtn, styles.bigBtnSecondary]}>
              <Text style={[styles.bigBtnTitle, { color: COLORS.cream }]}>Rejoindre avec un code</Text>
            </Pressable>
          </View>
        )}

        {mode === "create" && (
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionLabel}>NOUVELLE LIGUE</Text>
            <View>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Nom</Text>
                <Text style={styles.inputCounter}>
                  {name.trim().length}/32 · min 3
                </Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Les Champions de Casa"
                placeholderTextColor="rgba(245,235,214,0.3)"
                maxLength={32}
                style={styles.input}
              />
              <Text style={styles.inputHint}>3 caractères minimum</Text>
            </View>
            <View>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Slogan (optionnel)</Text>
                <Text style={styles.inputCounter}>{tagline.length}/60</Text>
              </View>
              <TextInput
                value={tagline}
                onChangeText={setTagline}
                placeholder="On joue tous les dimanches"
                placeholderTextColor="rgba(245,235,214,0.3)"
                maxLength={60}
                style={styles.input}
              />
            </View>
            <View>
              <Text style={styles.inputLabel}>Couleur</Text>
              <View style={styles.colorRow}>
                {LEAGUE_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setChosenColor(c)}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: c,
                        borderColor: chosenColor === c ? COLORS.saffronSoft : "transparent",
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
            <Pressable
              onPress={submitCreate}
              disabled={name.trim().length < 3}
              style={[styles.bigBtn, name.trim().length < 3 && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>Créer</Text>
            </Pressable>
          </View>
        )}

        {mode === "join" && (
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionLabel}>REJOINDRE</Text>
            <View>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Code de la ligue</Text>
                <Text style={styles.inputCounter}>{joinCode.length}/6</Text>
              </View>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase().slice(0, 6))}
                placeholder="AB12CD"
                placeholderTextColor="rgba(245,235,214,0.3)"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                style={[styles.input, { textAlign: "center", letterSpacing: 6, fontSize: 22 }]}
              />
              <Text style={styles.inputHint}>6 caractères exactement</Text>
            </View>
            <Pressable
              onPress={submitJoin}
              disabled={joinCode.length !== 6}
              style={[styles.bigBtn, joinCode.length !== 6 && { opacity: 0.4 }]}
            >
              <LinearGradient
                colors={[COLORS.saffron, COLORS.brassDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.bigBtnTitle}>Rejoindre</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function LeagueCard({
  league,
  isActive,
  onPress,
  onSetActive,
}: {
  league: League;
  isActive: boolean;
  onPress: () => void;
  onSetActive: () => void;
}) {
  const color = league.color || COLORS.teal;
  return (
    <Pressable onPress={onPress} style={[styles.leagueCard, { borderColor: `${color}88` }]}>
      <LinearGradient
        colors={[`${color}44`, `${color}11`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.leagueName}>{league.name}</Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
        </View>
        {league.tagline && <Text style={styles.leagueTagline}>{league.tagline}</Text>}
        <View style={styles.leagueMeta}>
          <Text style={styles.leagueMembers}>
            {league.members.length} membre{league.members.length > 1 ? "s" : ""}
          </Text>
          <Text style={styles.leagueCode}>{league.code}</Text>
        </View>
      </View>
      {!isActive && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onSetActive();
          }}
          style={styles.setActiveBtn}
        >
          <Text style={styles.setActiveText}>Activer</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.6)",
    fontWeight: "700",
    marginBottom: 4,
  },

  emptyBlock: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.15)",
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.cream,
  },
  emptySub: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.65)",
    textAlign: "center",
    lineHeight: 18,
  },

  leagueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  leagueName: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.cream,
  },
  leagueTagline: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.7)",
    marginTop: 2,
    fontStyle: "italic",
  },
  leagueMeta: { flexDirection: "row", gap: 10, marginTop: 6, alignItems: "center" },
  leagueMembers: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    color: "rgba(245,235,214,0.6)",
    letterSpacing: 1,
    fontWeight: "700",
  },
  leagueCode: {
    fontFamily: FONT_DISPLAY,
    fontSize: 12,
    color: COLORS.saffronSoft,
    letterSpacing: 3,
    fontWeight: "700",
  },

  activeBadge: {
    backgroundColor: COLORS.saffron,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 8,
    letterSpacing: 1,
    color: COLORS.terracottaDark,
    fontWeight: "800",
  },
  setActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  setActiveText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    color: COLORS.cream,
    letterSpacing: 1,
    fontWeight: "700",
  },

  inputLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
  },
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  inputCounter: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
  },
  inputHint: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.55)",
    fontStyle: "italic",
    marginTop: 4,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: `${COLORS.brass}66`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONT_UI,
    fontSize: 15,
    color: COLORS.cream,
  },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },

  bigBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bigBtnSecondary: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
  },
  bigBtnTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
  bigBtnSub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.75)",
    marginTop: 3,
    letterSpacing: 1,
    fontWeight: "700",
    fontStyle: "italic",
  },
});
