import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useTournamentStore, TournamentFormat, TournamentMode, PairingMode } from "../store/tournamentStore";
import { useAuthStore } from "../store/authStore";
import { useLeagueStore } from "../store/leagueStore";

type Props = NativeStackScreenProps<RootStackParamList, "CreateTournament">;

export default function CreateTournamentScreen({ navigation, route }: Props) {
  const create = useTournamentStore((s) => s.create);
  const user = useAuthStore((s) => s.user);

  // Si un leagueId arrive en params, tournoi restreint à la ligue
  const leagueIdFromRoute = route.params?.leagueId;
  const leagues = useLeagueStore((s) => s.leagues);
  const activeLeagueId = useLeagueStore((s) => s.activeLeagueId);
  const [leagueScope, setLeagueScope] = useState<string | null>(leagueIdFromRoute || null);
  const scopedLeague = leagues.find((l) => l.id === leagueScope);

  const [format, setFormat] = useState<TournamentFormat>("online");
  const [mode, setMode] = useState<TournamentMode>("classique");
  const [pairing, setPairing] = useState<PairingMode>("random");
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [location, setLocation] = useState("");
  const [tagline, setTagline] = useState("");

  const canSubmit =
    name.trim().length >= 2 &&
    maxPlayers >= 4 &&
    maxPlayers % 4 === 0 &&
    (format !== "irl" || (date && time && location));

  const onSubmit = async () => {
    if (!canSubmit || !user?.username) return;
    const t = await create({
      adminName: user.username,
      name: name.trim(),
      format,
      mode,
      pairingMode: pairing,
      maxPlayers,
      date: format === "irl" ? date : undefined,
      time: format === "irl" ? time : undefined,
      duration: format === "irl" ? duration : undefined,
      location: format === "irl" ? location : undefined,
      tagline: format === "irl" ? tagline : undefined,
      leagueId: leagueScope || undefined,
      leagueName: scopedLeague?.name,
    });
    navigation.replace("TournamentDetail", { id: t.id });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>NOUVEAU TOURNOI</Text>
          <Text style={styles.title}>Créer</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Format En ligne / IRL */}
        <Text style={styles.label}>FORMAT</Text>
        <View style={styles.row}>
          <BigTile active={format === "online"} title="En ligne" sub="Code à partager" onPress={() => setFormat("online")} />
          <BigTile active={format === "irl"} title="IRL" sub="En vrai, lieu + date" onPress={() => setFormat("irl")} />
        </View>

        {/* Mode Classique / Championnat */}
        <Text style={styles.label}>TYPE DE TOURNOI</Text>
        <View style={styles.row}>
          <BigTile
            active={mode === "classique"}
            title="Classique"
            sub="Élimination directe (bracket)"
            onPress={() => setMode("classique")}
          />
          <BigTile
            active={mode === "championnat"}
            title="Championnat"
            sub="Toutes les paires se rencontrent (round-robin)"
            onPress={() => setMode("championnat")}
          />
        </View>

        {/* Pairing — paires TOUJOURS fixes, juste manière de les constituer */}
        <Text style={styles.label}>CONSTITUTION DES PAIRES</Text>
        <View style={styles.pillRow}>
          <Pill label="Aléatoire" active={pairing === "random"} onPress={() => setPairing("random")} />
          <Pill label="Choisies" active={pairing === "chosen"} onPress={() => setPairing("chosen")} />
        </View>
        <Text style={styles.hint}>
          Les paires sont fixes pendant tout le tournoi.{" "}
          {pairing === "random"
            ? "Tirage au sort au début du tournoi."
            : "Chaque duo s'inscrit ensemble (une personne inscrit sa paire)."}
        </Text>

        {/* Restriction ligue */}
        {leagues.length > 0 && (
          <>
            <Text style={styles.label}>RÉSERVÉ À UNE LIGUE ?</Text>
            <View style={styles.leagueRow}>
              <Pressable
                onPress={() => setLeagueScope(null)}
                style={[styles.leagueChip, leagueScope === null && styles.leagueChipActive]}
              >
                <Text style={[styles.leagueChipText, leagueScope === null && styles.leagueChipTextActive]}>
                  Ouvert à tous
                </Text>
              </Pressable>
              {leagues.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => setLeagueScope(l.id)}
                  style={[
                    styles.leagueChip,
                    leagueScope === l.id && styles.leagueChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.leagueChipText,
                      leagueScope === l.id && styles.leagueChipTextActive,
                    ]}
                  >
                    {l.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            {scopedLeague && (
              <Text style={styles.hint}>
                Seuls les {scopedLeague.members.length} membres de "{scopedLeague.name}" pourront rejoindre.
              </Text>
            )}
          </>
        )}

        {/* Nom */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={styles.label}>NOM DU TOURNOI</Text>
          <Text style={styles.counter}>{name.trim().length} car. · min 2</Text>
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex : Tournoi du quartier"
          placeholderTextColor="rgba(245,235,214,0.4)"
          style={styles.input}
        />
        <Text style={styles.hint}>Au moins 2 caractères pour valider</Text>

        {/* Nb de joueurs — multiple de 4, illimité */}
        <Text style={styles.label}>NOMBRE DE JOUEURS</Text>
        <View style={styles.stepperRow}>
          <Pressable
            onPress={() => setMaxPlayers(Math.max(4, maxPlayers - 4))}
            style={styles.stepperBtn}
          >
            <Text style={styles.stepperBtnText}>−4</Text>
          </Pressable>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperValueNum}>{maxPlayers}</Text>
            <Text style={styles.stepperValueSub}>{maxPlayers / 2} paires</Text>
          </View>
          <Pressable onPress={() => setMaxPlayers(maxPlayers + 4)} style={styles.stepperBtn}>
            <Text style={styles.stepperBtnText}>+4</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Toujours un multiple de 4 (deux équipes de 2 par table).
        </Text>

        {/* IRL uniquement */}
        {format === "irl" && (
          <>
            <Text style={styles.label}>DATE</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="Ex : 2026-05-15"
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={styles.input}
            />
            <Text style={styles.label}>HEURE</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="Ex : 20h30"
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={styles.input}
            />
            <Text style={styles.label}>DURÉE</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="Ex : 3h"
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={styles.input}
            />
            <Text style={styles.label}>LIEU</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Ex : Café des Sports, Rabat"
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={styles.input}
            />
            <Text style={styles.hint}>Ouvrable dans Plans / Google Maps depuis le détail.</Text>

            <Text style={styles.label}>PHRASE D'ACCROCHE</Text>
            <TextInput
              value={tagline}
              onChangeText={setTagline}
              placeholder="Ex : Gagnant paie le thé !"
              placeholderTextColor="rgba(245,235,214,0.4)"
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              multiline
            />
          </>
        )}

        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>Créer le tournoi</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BigTile({
  active,
  title,
  sub,
  onPress,
}: {
  active: boolean;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.bigTile, active && styles.bigTileActive]}>
      <Text style={[styles.bigTitle, active && { color: COLORS.terracottaDark }]}>{title}</Text>
      <Text style={[styles.bigSub, active && { color: "rgba(43,24,16,0.7)" }]}>{sub}</Text>
    </Pressable>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  label: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.cream,
    fontSize: 15,
    fontFamily: FONT_UI,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(245,235,214,0.55)",
    marginTop: 6,
    fontStyle: "italic",
  },
  counter: {
    fontFamily: FONT_UI,
    fontSize: 10,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
  },

  leagueRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  leagueChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.3)",
  },
  leagueChipActive: {
    backgroundColor: COLORS.saffron,
    borderColor: COLORS.saffron,
  },
  leagueChipText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.cream,
  },
  leagueChipTextActive: {
    color: COLORS.terracottaDark,
  },

  row: { flexDirection: "row", gap: 10 },
  bigTile: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.4)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  bigTileActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  bigTitle: { fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "800", color: COLORS.cream },
  bigSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.6)", marginTop: 4, textAlign: "center", lineHeight: 14 },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.4)",
  },
  pillActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  pillText: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  pillTextActive: { color: COLORS.terracottaDark },

  stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 54, height: 54,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 16, color: COLORS.saffronSoft, fontWeight: "800" },
  stepperValue: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 14,
    paddingVertical: 10,
  },
  stepperValueNum: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: "700", color: COLORS.saffronSoft, lineHeight: 30 },
  stepperValueSub: { fontFamily: FONT_UI, fontSize: 10, color: "rgba(245,235,214,0.55)", marginTop: 2, fontStyle: "italic" },

  cta: {
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
});
