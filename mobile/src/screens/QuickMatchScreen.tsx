import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { StarBurst, ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "QuickMatch">;

// Données mock d'amis (serait normalement depuis le serveur/store amis)
const MOCK_FRIENDS: Friend[] = [
  { id: "1", name: "Karim", online: true, color: COLORS.brass },
  { id: "2", name: "Yasmine", online: true, color: "#8B4A7F" },
  { id: "3", name: "Amine", online: true, color: COLORS.teal },
  { id: "4", name: "Fatima", online: false, color: COLORS.terracotta },
  { id: "5", name: "Rachid", online: true, color: COLORS.brassDeep },
];

interface Friend {
  id: string;
  name: string;
  online: boolean;
  color: string;
}

interface Slot {
  kind: "me" | "friend" | "empty" | "searching";
  name?: string;
  color?: string;
}

export default function QuickMatchScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const myName = user?.username ?? "Moi";

  // Slots : toi + 3 autres (par défaut vides)
  const [slots, setSlots] = useState<Slot[]>([
    { kind: "me", name: myName, color: COLORS.teal },
    { kind: "empty" },
    { kind: "empty" },
    { kind: "empty" },
  ]);
  const [searching, setSearching] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null); // index du slot à remplir
  const [elapsed, setElapsed] = useState(0);

  // Timer quand on cherche des joueurs
  useEffect(() => {
    if (!searching) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [searching]);

  // Simulation : trouve un random toutes les 3s, remplit les slots vides
  useEffect(() => {
    if (!searching) return;
    const emptyIdx = slots.findIndex((s) => s.kind === "empty" || s.kind === "searching");
    if (emptyIdx === -1) {
      // Tous les slots sont pleins → démarre la partie après un court délai
      const t = setTimeout(() => {
        navigation.replace("Game");
      }, 800);
      return () => clearTimeout(t);
    }
    // Marque le prochain slot vide comme "searching"
    if (slots[emptyIdx].kind !== "searching") {
      const next = [...slots];
      next[emptyIdx] = { kind: "searching" };
      setSlots(next);
    }
    // Après ~2-3s, remplace par un joueur random fictif
    const t = setTimeout(() => {
      const names = ["Mehdi", "Salma", "Youssef", "Nadia", "Omar", "Laila"];
      const colors = ["#2E7A8C", "#B8791C", "#8B4A7F", "#C8551D"];
      const next = [...slots];
      next[emptyIdx] = {
        kind: "friend",
        name: names[Math.floor(Math.random() * names.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
      };
      setSlots(next);
    }, 2200 + Math.random() * 800);
    return () => clearTimeout(t);
  }, [searching, slots, navigation]);

  const inviteFriend = (idx: number, friend: Friend) => {
    const next = [...slots];
    next[idx] = { kind: "friend", name: friend.name, color: friend.color };
    setSlots(next);
    setPickerOpen(null);
  };

  const removeSlot = (idx: number) => {
    if (searching) return;
    const next = [...slots];
    next[idx] = { kind: "empty" };
    setSlots(next);
  };

  const startSearch = () => {
    setSearching(true);
    setElapsed(0);
  };

  const cancelSearch = () => {
    setSearching(false);
    // Remet les slots "searching" en empty
    setSlots(slots.map((s) => (s.kind === "searching" ? { kind: "empty" } : s)));
  };

  const invitedCount = slots.filter((s) => s.kind === "friend").length;
  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.07 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      {/* Header */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M15 18l-6-6 6-6" stroke={COLORS.cream} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.eyebrow}>PARTIE RAPIDE</Text>
          <Text style={styles.title}>{searching ? "Recherche…" : "Prépare ta table"}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Étoile centrale animée quand on cherche */}
      {searching && (
        <View pointerEvents="none" style={styles.starWrap}>
          <SpinningStar size={280} color={COLORS.saffronSoft} stroke={0.8} duration={12000} />
          <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
            <SpinningStar size={180} color={COLORS.brass} stroke={1} duration={18000} reverse opacity={0.5} />
          </View>
        </View>
      )}

      {/* Titre attente */}
      {searching && (
        <View style={styles.waitBlock}>
          <Text style={styles.waitTitle}>On cherche ton équipe</Text>
          <Text style={styles.waitSub}>{timeLabel}</Text>
        </View>
      )}

      {/* Table : coéquipier en face, adversaires à gauche/droite, toi en bas */}
      <View style={styles.tableWrap}>
        <Text style={styles.sectionLabel}>
          TABLE DE 4 · {invitedCount > 0 ? `${invitedCount} ami${invitedCount > 1 ? "s" : ""} invité${invitedCount > 1 ? "s" : ""}` : "solo"}
        </Text>

        <View style={styles.table}>
          {/* Coéquipier (en face) */}
          <View style={styles.seatTop}>
            <Text style={styles.seatLabel}>COÉQUIPIER</Text>
            <SlotCard
              slot={slots[2]}
              canEdit={!searching}
              onInvite={() => setPickerOpen(2)}
              onRemove={() => removeSlot(2)}
              orientation="top"
            />
          </View>

          {/* Adversaires gauche / droite */}
          <View style={styles.seatsMiddle}>
            <View style={styles.seatSide}>
              <Text style={[styles.seatLabel, styles.seatLabelAdv]}>ADVERSAIRE</Text>
              <SlotCard
                slot={slots[1]}
                canEdit={!searching}
                onInvite={() => setPickerOpen(1)}
                onRemove={() => removeSlot(1)}
                orientation="side"
              />
            </View>

            {/* Centre : ornement */}
            <View style={styles.tableCenter}>
              <View style={styles.vsLine} />
              <Text style={styles.vsText}>VS</Text>
              <View style={styles.vsLine} />
            </View>

            <View style={styles.seatSide}>
              <Text style={[styles.seatLabel, styles.seatLabelAdv]}>ADVERSAIRE</Text>
              <SlotCard
                slot={slots[3]}
                canEdit={!searching}
                onInvite={() => setPickerOpen(3)}
                onRemove={() => removeSlot(3)}
                orientation="side"
              />
            </View>
          </View>

          {/* Toi en bas */}
          <View style={styles.seatBottom}>
            <SlotCard
              slot={slots[0]}
              canEdit={false}
              onInvite={() => {}}
              onRemove={() => {}}
              orientation="bottom"
            />
            <Text style={styles.seatLabel}>VOUS</Text>
          </View>
        </View>

        <Text style={styles.teamHint}>
          <Text style={{ color: COLORS.teal }}>■ NOUS</Text>   ·   <Text style={{ color: "#C8551D" }}>■ EUX</Text>
        </Text>
      </View>

      {/* Boutons */}
      <View style={styles.actions}>
        {!searching ? (
          <Pressable onPress={startSearch} style={styles.ctaPrimary}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.ctaPrimaryText}>
              {invitedCount === 0 ? "Commencer la recherche" : "Lancer avec ces joueurs"}
            </Text>
            <Text style={styles.ctaPrimarySub}>
              {invitedCount === 3
                ? "4 joueurs invités"
                : `${3 - invitedCount} joueur${3 - invitedCount > 1 ? "s" : ""} seront trouvés en ligne`}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={cancelSearch} style={styles.ctaCancel}>
            <Text style={styles.ctaCancelText}>Annuler la recherche</Text>
          </Pressable>
        )}
      </View>

      {/* Picker d'amis */}
      {pickerOpen !== null && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Inviter un ami</Text>
            <ScrollView style={{ maxHeight: 280 }}>
              {MOCK_FRIENDS.filter(
                (f) => !slots.find((s) => s.kind === "friend" && s.name === f.name),
              ).map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => inviteFriend(pickerOpen, f)}
                  style={styles.friendItem}
                >
                  <Avatar initials={f.name[0]} size={34} color={f.color} online={f.online} />
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={[styles.friendStatus, { color: f.online ? COLORS.statusGreen : "rgba(245,235,214,0.4)" }]}>
                    {f.online ? "En ligne" : "Hors ligne"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPickerOpen(null)} style={styles.pickerClose}>
              <Text style={styles.pickerCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

type Orientation = "top" | "bottom" | "side";

function SlotCard({
  slot,
  canEdit,
  onInvite,
  onRemove,
  orientation,
}: {
  slot: Slot;
  canEdit: boolean;
  onInvite: () => void;
  onRemove: () => void;
  orientation: Orientation;
}) {
  // Taille selon position — plus petit sur les côtés
  const size = orientation === "side" ? 86 : 108;
  const avatarSize = orientation === "side" ? 32 : 44;
  const fontSize = orientation === "side" ? 11 : 13;

  const base = [
    styles.seatSlot,
    { width: size, height: size, borderRadius: size / 2 },
  ];

  if (slot.kind === "me") {
    return (
      <View style={[base, styles.slotMe]}>
        <Avatar initials={slot.name?.[0]?.toUpperCase() ?? "M"} size={avatarSize} color={slot.color ?? COLORS.teal} />
        <Text style={[styles.seatName, { fontSize }]} numberOfLines={1}>{slot.name}</Text>
      </View>
    );
  }

  if (slot.kind === "friend") {
    return (
      <View style={[base, { backgroundColor: `${slot.color}22`, borderColor: `${slot.color}88` }]}>
        <Avatar initials={slot.name?.[0]?.toUpperCase() ?? "?"} size={avatarSize} color={slot.color ?? COLORS.brass} />
        <Text style={[styles.seatName, { fontSize }]} numberOfLines={1}>{slot.name}</Text>
        {canEdit && (
          <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={6}>
            <Text style={styles.removeBtnText}>×</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (slot.kind === "searching") {
    return (
      <View style={[base, styles.slotSearching]}>
        <DashedPulse />
        <Text style={[styles.searchingText, { fontSize: orientation === "side" ? 9 : 10 }]}>CHERCHE…</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onInvite}
      disabled={!canEdit}
      style={[base, styles.slotEmpty, !canEdit && { opacity: 0.5 }]}
    >
      <View style={[styles.dashedAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        <Text style={[styles.plusText, { fontSize: avatarSize * 0.55 }]}>+</Text>
      </View>
      <Text style={[styles.slotInviteText, { fontSize: orientation === "side" ? 9 : 10 }]}>
        {orientation === "side" ? "Inviter" : "Inviter un ami"}
      </Text>
    </Pressable>
  );
}

function SpinningStar({
  size,
  color,
  stroke,
  duration,
  reverse = false,
  opacity = 1,
}: {
  size: number;
  color: string;
  stroke: number;
  duration: number;
  reverse?: boolean;
  opacity?: number;
}) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);
  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ["360deg", "0deg"] : ["0deg", "360deg"],
  });
  return (
    <Animated.View style={{ transform: [{ rotate }], opacity }}>
      <StarBurst size={size} color={color} strokeW={stroke} />
    </Animated.View>
  );
}

function DashedPulse() {
  const [pulse] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={{
        width: 36, height: 36, borderRadius: 18,
        borderWidth: 1.5, borderStyle: "dashed",
        borderColor: "rgba(245,235,214,0.5)",
        alignItems: "center", justifyContent: "center",
        opacity: pulse,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.saffron }} />
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}55`,
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 3,
    color: COLORS.brass, fontWeight: "700",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 24, color: COLORS.cream,
    fontWeight: "700", marginTop: 2,
  },

  starWrap: {
    position: "absolute",
    top: "22%",
    left: 0, right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.25,
  },

  waitBlock: {
    marginTop: 16,
    alignItems: "center",
  },
  waitTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 20, fontWeight: "700",
    color: COLORS.saffronSoft,
  },
  waitSub: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: "rgba(245,235,214,0.7)",
    marginTop: 4,
    letterSpacing: 2,
    fontStyle: "italic",
  },

  tableWrap: {
    marginTop: 28,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 2,
    color: "rgba(245,235,214,0.75)",
    fontWeight: "700",
    marginBottom: 18,
    textAlign: "center",
  },
  table: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  seatTop: { alignItems: "center", gap: 6 },
  seatBottom: { alignItems: "center", gap: 6 },
  seatsMiddle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  seatSide: { alignItems: "center", gap: 6 },
  seatLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 9, letterSpacing: 2,
    color: COLORS.teal,
    fontWeight: "700",
  },
  seatLabelAdv: {
    color: "#E8553A",
  },
  seatSlot: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(245,235,214,0.15)",
    padding: 6,
    position: "relative",
  },
  slotMe: {
    backgroundColor: `${COLORS.teal}33`,
    borderColor: `${COLORS.teal}AA`,
    borderWidth: 2,
  },
  slotEmpty: {
    borderStyle: "dashed",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  slotSearching: {
    backgroundColor: `${COLORS.brassDeep}33`,
    borderColor: `${COLORS.brass}88`,
  },
  seatName: {
    fontFamily: FONT_UI_BOLD,
    fontWeight: "700",
    color: COLORS.cream,
    marginTop: 2,
    maxWidth: "90%",
    textAlign: "center",
  },
  dashedAvatar: {
    borderWidth: 1.5, borderStyle: "dashed",
    borderColor: "rgba(245,235,214,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  plusText: {
    fontWeight: "300",
    color: "rgba(245,235,214,0.5)",
    lineHeight: 24,
  },
  slotInviteText: {
    fontFamily: FONT_UI,
    color: "rgba(245,235,214,0.65)",
    fontStyle: "italic",
  },
  searchingText: {
    fontFamily: FONT_UI_BOLD,
    fontWeight: "700",
    color: COLORS.saffronSoft,
    letterSpacing: 1,
  },
  tableCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  vsLine: {
    width: 24, height: 1,
    backgroundColor: `${COLORS.brass}77`,
  },
  vsText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16, fontWeight: "700",
    color: COLORS.saffronSoft,
    letterSpacing: 2,
  },
  teamHint: {
    marginTop: 16,
    fontFamily: FONT_UI_BOLD,
    fontSize: 10, letterSpacing: 1.5,
    color: "rgba(245,235,214,0.65)",
  },
  removeBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(200,70,45,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  removeBtnText: {
    fontSize: 16, lineHeight: 18,
    color: "#E8553A", fontWeight: "700",
  },

  actions: {
    position: "absolute",
    bottom: 32,
    left: 16, right: 16,
    gap: 10,
  },
  ctaPrimary: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaPrimaryText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 17, fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.3,
  },
  ctaPrimarySub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    color: "rgba(43,24,16,0.75)",
    letterSpacing: 1,
    marginTop: 4,
    fontStyle: "italic",
  },
  ctaCancel: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 0.5,
    borderColor: "rgba(232,85,58,0.5)",
    alignItems: "center",
  },
  ctaCancelText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 14, fontWeight: "700",
    color: "#E8553A",
  },

  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 100,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#140b06",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}77`,
    borderRadius: 18,
    padding: 20,
  },
  pickerTitle: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 17, fontWeight: "800",
    color: COLORS.saffronSoft,
    marginBottom: 14,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  friendName: {
    flex: 1,
    fontFamily: FONT_UI_BOLD,
    fontSize: 14, fontWeight: "700",
    color: COLORS.cream,
  },
  friendStatus: {
    fontSize: 10, letterSpacing: 1,
    fontWeight: "700",
    fontFamily: FONT_UI_BOLD,
  },
  pickerClose: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerCloseText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13, fontWeight: "700",
    color: COLORS.cream,
  },
});
