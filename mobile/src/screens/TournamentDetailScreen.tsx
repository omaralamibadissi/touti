import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking, Platform, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useTournamentStore } from "../store/tournamentStore";

type Props = NativeStackScreenProps<RootStackParamList, "TournamentDetail">;

export default function TournamentDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const tournament = useTournamentStore((s) => s.mine.find((t) => t.id === id));
  const remove = useTournamentStore((s) => s.remove);

  if (!tournament) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: COLORS.cream }}>Tournoi introuvable</Text>
      </View>
    );
  }

  const formatLabel = `${labelFormat(tournament.format)} · ${labelMode(tournament.mode)}`;
  const shareText =
    tournament.format === "irl"
      ? `🃏 ${tournament.name}\n${formatLabel}\n${tournament.tagline ?? ""}\n\n📅 ${tournament.date ?? ""} à ${tournament.time ?? ""}\n📍 ${tournament.location ?? ""}\n⏱ Durée : ${tournament.duration ?? ""}\n👥 ${tournament.maxPlayers} joueurs\n\nRejoins avec le code : ${tournament.code}`
      : `🃏 ${tournament.name}\nTournoi Touti ${formatLabel} · ${tournament.maxPlayers} joueurs\n\nRejoins avec le code : ${tournament.code}`;

  const onShare = async () => {
    try {
      await Share.share({ message: shareText });
    } catch (e) {
      // ignore
    }
  };

  const onOpenMap = () => {
    if (!tournament.location) return;
    const q = encodeURIComponent(tournament.location);
    const url = Platform.OS === "ios" ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${q}`);
    });
  };

  const onDelete = () => {
    Alert.alert(
      "Supprimer ce tournoi ?",
      "",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await remove(tournament.id);
            navigation.goBack();
          },
        },
      ],
    );
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
        <Pressable onPress={onShare} style={styles.topAction}>
          <Text style={styles.topActionText}>↗ Partager</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.eyebrow}>{formatLabel.toUpperCase()}</Text>
        <Text style={styles.title}>{tournament.name}</Text>
        {tournament.tagline && <Text style={styles.tagline}>{tournament.tagline}</Text>}

        {/* Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>CODE DU TOURNOI</Text>
          <Text style={styles.codeValue}>{tournament.code}</Text>
          <Text style={styles.codeHint}>Partage-le pour inviter</Text>
        </View>

        {/* Infos IRL */}
        {tournament.format === "irl" && (
          <View style={styles.infoCard}>
            {tournament.date && <InfoRow label="Date" value={tournament.date} />}
            {tournament.time && <InfoRow label="Heure" value={tournament.time} />}
            {tournament.duration && <InfoRow label="Durée" value={tournament.duration} />}
            {tournament.location && (
              <View style={{ borderTopWidth: 0.5, borderTopColor: "rgba(245,235,214,0.1)", paddingTop: 10, marginTop: 10 }}>
                <Text style={styles.infoLabel}>LIEU</Text>
                <Text style={styles.locationText}>{tournament.location}</Text>
                <Pressable onPress={onOpenMap} style={styles.mapBtn}>
                  <Text style={styles.mapBtnText}>📍 Ouvrir dans Plans / Google Maps</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Info mode + paires */}
        <View style={styles.infoCard}>
          <InfoRow label="Mode" value={labelMode(tournament.mode)} />
          <InfoRow
            label="Paires"
            value={tournament.pairingMode === "random" ? "Aléatoires" : "Choisies"}
          />
          {tournament.mode === "championnat" && (
            <Text style={styles.championnatNote}>
              Les paires changent à chaque partie, tout le monde joue avec tout le monde.
            </Text>
          )}
        </View>

        {/* Joueurs */}
        <Text style={styles.section}>
          JOUEURS · {tournament.players.length}/{tournament.maxPlayers}
        </Text>
        <View style={{ gap: 6, marginTop: 8 }}>
          {tournament.players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <Avatar initials={p.name[0]?.toUpperCase() ?? "?"} size={34} color={COLORS.teal} />
              <Text style={styles.playerName}>{p.name}</Text>
              {p.id === "admin" && <Text style={styles.adminTag}>ADMIN</Text>}
            </View>
          ))}
          {Array.from({ length: tournament.maxPlayers - tournament.players.length }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.playerRow, styles.emptySlot]}>
              <View style={styles.emptyAvatar} />
              <Text style={styles.emptyText}>En attente…</Text>
            </View>
          ))}
        </View>

        {/* Actions admin */}
        <View style={styles.adminActions}>
          <Pressable onPress={onShare} style={styles.bigCta}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.bigCtaText}>Partager le tournoi</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.dangerBtn}>
            <Text style={styles.dangerText}>Supprimer</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function labelFormat(f: string): string {
  if (f === "online") return "En ligne";
  if (f === "irl") return "IRL";
  return f;
}

function labelMode(m: string): string {
  if (m === "classique") return "Classique · paires fixes";
  if (m === "championnat") return "Championnat · paires tournantes";
  return m;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
  },
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
  topAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  topActionText: { color: COLORS.saffronSoft, fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700" },

  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 4, color: COLORS.brass, fontWeight: "700", marginTop: 8 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 34, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 4 },
  tagline: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.8)",
    marginTop: 10,
    lineHeight: 19,
    fontStyle: "italic",
  },

  codeCard: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}55`,
    borderRadius: 16,
    alignItems: "center",
  },
  codeLabel: { fontFamily: FONT_UI_BOLD, fontSize: 10, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  codeValue: {
    fontFamily: FONT_DISPLAY,
    fontSize: 42,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 8,
    marginTop: 8,
  },
  codeHint: { fontFamily: FONT_UI, fontSize: 11, color: "rgba(245,235,214,0.55)", marginTop: 6, fontStyle: "italic" },

  infoCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    borderRadius: 14,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  infoLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
    width: 80,
  },
  infoValue: { fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700", flex: 1 },
  locationText: { fontFamily: FONT_UI_BOLD, fontSize: 14, color: COLORS.cream, fontWeight: "700", marginTop: 4 },
  mapBtn: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(212,160,76,0.2)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 10,
    alignItems: "center",
  },
  mapBtnText: { fontFamily: FONT_UI_BOLD, fontSize: 12, color: COLORS.saffronSoft, fontWeight: "700" },

  championnatNote: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.75)",
    lineHeight: 17,
    fontStyle: "italic",
  },

  section: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.brass,
    fontWeight: "700",
    marginTop: 22,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.12)",
    borderRadius: 10,
  },
  playerName: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 14, color: COLORS.cream, fontWeight: "700" },
  adminTag: {
    fontSize: 9,
    color: COLORS.brass,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: FONT_UI_BOLD,
  },
  emptySlot: { opacity: 0.45 },
  emptyAvatar: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1, borderStyle: "dashed", borderColor: COLORS.brass,
  },
  emptyText: { fontFamily: FONT_UI, fontSize: 12, color: "rgba(245,235,214,0.55)", fontStyle: "italic" },

  adminActions: { marginTop: 24, gap: 8 },
  bigCta: {
    paddingVertical: 16,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bigCtaText: { fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: "800", color: COLORS.terracottaDark, letterSpacing: 0.3 },
  dangerBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(200,70,45,0.2)",
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.55)",
    alignItems: "center",
  },
  dangerText: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: "#E8553A" },
});
