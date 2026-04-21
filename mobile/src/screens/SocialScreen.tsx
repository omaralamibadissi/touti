import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { Avatar } from "../components/Avatar";
import { BottomTabBar, BOTTOM_TAB_HEIGHT } from "../components/BottomTabBar";

type Props = NativeStackScreenProps<RootStackParamList, "Social">;

interface Friend {
  id: string;
  name: string;
  color: string;
  online: boolean;
}

const MOCK_FRIENDS_INIT: Friend[] = [
  { id: "1", name: "Karim", color: COLORS.brass, online: true },
  { id: "2", name: "Yasmine", color: "#8B4A7F", online: true },
  { id: "3", name: "Amine", color: COLORS.teal, online: true },
  { id: "4", name: "Fatima", color: COLORS.terracotta, online: false },
];

const MOCK_RAPIDE = [
  { rank: 1, name: "Mourad", score: 18420, you: false, color: COLORS.brassDeep, chg: "+12" },
  { rank: 2, name: "Layla", score: 17895, you: false, color: "#8B4A7F", chg: "+8" },
  { rank: 3, name: "Khalid", score: 16330, you: false, color: COLORS.teal, chg: "—" },
  { rank: 4, name: "Nadia", score: 15200, you: false, color: COLORS.terracotta, chg: "+3" },
  { rank: 5, name: "Sara", score: 14980, you: true, color: COLORS.teal, chg: "+22" },
  { rank: 6, name: "Amine", score: 14410, you: false, color: COLORS.brass, chg: "-2" },
  { rank: 7, name: "Siham", score: 13870, you: false, color: "#8B4A7F", chg: "—" },
];

const MOCK_TOURNOI = [
  { rank: 1, name: "Rachid", score: 2480, you: false, color: COLORS.terracotta, chg: "+1" },
  { rank: 2, name: "Sara", score: 2310, you: true, color: COLORS.teal, chg: "+2" },
  { rank: 3, name: "Imane", score: 2180, you: false, color: "#8B4A7F", chg: "—" },
  { rank: 4, name: "Hamza", score: 1970, you: false, color: COLORS.brassDeep, chg: "+3" },
  { rank: 5, name: "Layla", score: 1820, you: false, color: "#8B4A7F", chg: "-1" },
  { rank: 6, name: "Youssef", score: 1640, you: false, color: COLORS.teal, chg: "+1" },
];

const FILTERS = ["Amis", "Monde", "Maroc"] as const;
type LeaderboardType = "rapide" | "tournoi";

export default function SocialScreen(_props: Props) {
  const [tab, setTab] = useState<"amis" | "classement">("amis");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Monde");
  const [board, setBoard] = useState<LeaderboardType>("rapide");
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS_INIT);
  const [newName, setNewName] = useState("");

  const addFriend = () => {
    const n = newName.trim();
    if (n.length < 2) return;
    const palette = ["#2E7A8C", "#B8791C", "#8B4A7F", "#C8551D"];
    const color = palette[friends.length % palette.length];
    setFriends([...friends, { id: String(Date.now()), name: n, color, online: false }]);
    setNewName("");
  };

  const removeFriend = (id: string) => {
    Alert.alert(
      "Retirer cet ami ?",
      "",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Retirer", style: "destructive", onPress: () => setFriends(friends.filter((f) => f.id !== id)) },
      ],
    );
  };

  const source = board === "rapide" ? MOCK_RAPIDE : MOCK_TOURNOI;
  const top3 = source.slice(0, 3);
  const rest = source.slice(3);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.tealDeep, "#051D20"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.06 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: BOTTOM_TAB_HEIGHT + 20 }}>
        <View style={{ height: 60 }} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SOCIAL</Text>
            <Text style={styles.title}>{tab === "amis" ? "Amis" : "Classement"}</Text>
          </View>
        </View>

        {/* Switch Amis / Classement */}
        <View style={styles.tabs}>
          <TabPill label="Amis" active={tab === "amis"} onPress={() => setTab("amis")} />
          <TabPill label="Classement" active={tab === "classement"} onPress={() => setTab("classement")} />
        </View>

        {tab === "amis" ? (
          <AmisSection friends={friends} newName={newName} setNewName={setNewName} addFriend={addFriend} removeFriend={removeFriend} />
        ) : (
          <ClassementSection
            filter={filter}
            setFilter={setFilter}
            board={board}
            setBoard={setBoard}
            top3={top3}
            rest={rest}
          />
        )}
      </ScrollView>
      <BottomTabBar />
    </View>
  );
}

// ─── Sections ──────────────────────────────────────────────────────

function AmisSection({
  friends,
  newName,
  setNewName,
  addFriend,
  removeFriend,
}: {
  friends: Friend[];
  newName: string;
  setNewName: (s: string) => void;
  addFriend: () => void;
  removeFriend: (id: string) => void;
}) {
  const online = friends.filter((f) => f.online);
  const offline = friends.filter((f) => !f.online);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 14 }}>
      {/* Ajout */}
      <View style={styles.addBlock}>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Pseudo d'un ami à ajouter…"
          placeholderTextColor="rgba(245,235,214,0.4)"
          style={styles.addInput}
        />
        <Pressable onPress={addFriend} style={styles.addBtn}>
          <LinearGradient
            colors={[COLORS.saffron, COLORS.brassDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.addBtnText}>+ Ajouter</Text>
        </Pressable>
      </View>

      {/* En ligne */}
      {online.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>EN LIGNE · {online.length}</Text>
          <View style={{ gap: 8, marginTop: 6 }}>
            {online.map((f) => (
              <FriendRow key={f.id} friend={f} onRemove={() => removeFriend(f.id)} />
            ))}
          </View>
        </View>
      )}

      {/* Hors ligne */}
      {offline.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>HORS LIGNE · {offline.length}</Text>
          <View style={{ gap: 8, marginTop: 6 }}>
            {offline.map((f) => (
              <FriendRow key={f.id} friend={f} onRemove={() => removeFriend(f.id)} />
            ))}
          </View>
        </View>
      )}

      {friends.length === 0 && (
        <Text style={styles.empty}>Aucun ami pour l'instant — ajoute-en via un pseudo.</Text>
      )}
    </View>
  );
}

function FriendRow({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
  return (
    <View style={styles.friendRow}>
      <View style={{ position: "relative" }}>
        <Avatar initials={friend.name[0]} size={40} color={friend.color} />
        {friend.online && <View style={styles.onlineDot} />}
      </View>
      <Text style={styles.friendName}>{friend.name}</Text>
      <Pressable onPress={onRemove} style={styles.removeBtn}>
        <Text style={styles.removeText}>×</Text>
      </Pressable>
    </View>
  );
}

function ClassementSection({
  filter,
  setFilter,
  board,
  setBoard,
  top3,
  rest,
}: {
  filter: (typeof FILTERS)[number];
  setFilter: (f: (typeof FILTERS)[number]) => void;
  board: LeaderboardType;
  setBoard: (b: LeaderboardType) => void;
  top3: typeof MOCK_RAPIDE;
  rest: typeof MOCK_RAPIDE;
}) {
  return (
    <>
      {/* Switch Rapide / Tournoi */}
      <View style={styles.boardSwitch}>
        <Pressable onPress={() => setBoard("rapide")} style={[styles.boardBtn, board === "rapide" && styles.boardBtnActive]}>
          <Text style={[styles.boardText, board === "rapide" && styles.boardTextActive]}>Partie rapide</Text>
        </Pressable>
        <Pressable onPress={() => setBoard("tournoi")} style={[styles.boardBtn, board === "tournoi" && styles.boardBtnActive]}>
          <Text style={[styles.boardText, board === "tournoi" && styles.boardTextActive]}>Tournoi</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              {active && (
                <LinearGradient
                  colors={[COLORS.saffron, COLORS.brassDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.podium}>
        {[
          { p: top3[1], h: 80, pos: 1 },
          { p: top3[0], h: 110, pos: 0 },
          { p: top3[2], h: 65, pos: 2 },
        ].map(({ p, h, pos }, i) => {
          const medalColors: [string, string] =
            pos === 0 ? [COLORS.saffron, COLORS.brassDeep]
            : pos === 1 ? ["#C0C0C0", "#808080"]
            : ["#CD7F32", "#8B4513"];
          return (
            <View key={i} style={styles.podiumCol}>
              <Avatar initials={p.name[0]} size={pos === 0 ? 54 : 42} color={p.color} />
              <Text style={styles.podiumName}>{p.name}</Text>
              <Text style={styles.podiumScore}>{p.score.toLocaleString("fr-FR")}</Text>
              <View style={[styles.podiumBar, { height: h }]}>
                <LinearGradient
                  colors={medalColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.podiumRank}>{p.rank}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
        {rest.map((p) => (
          <View
            key={p.rank}
            style={[
              styles.row,
              { borderColor: p.you ? COLORS.brass : "rgba(245,235,214,0.15)" },
            ]}
          >
            {p.you && (
              <LinearGradient
                colors={[`${COLORS.brassDeep}66`, `${COLORS.brassDeep}22`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={[styles.rowRank, p.you && { color: COLORS.saffronSoft }]}>#{p.rank}</Text>
            <Avatar initials={p.name[0]} size={34} color={p.color} ring={p.you} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={styles.rowName}>{p.name}</Text>
                {p.you && <Text style={styles.rowYouTag}>VOUS</Text>}
              </View>
              <Text style={styles.rowLevel}>Niveau {Math.floor(p.score / 1200)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowScore}>{p.score.toLocaleString("fr-FR")}</Text>
              <Text
                style={[
                  styles.rowChg,
                  {
                    color: p.chg.startsWith("+") ? "#3FC26A"
                      : p.chg.startsWith("-") ? "#E8553A"
                      : "rgba(245,235,214,0.4)",
                  },
                ]}
              >
                {p.chg}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabPill, active && styles.tabPillActive]}>
      {active && (
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11,
    letterSpacing: 4,
    color: COLORS.brass,
    fontWeight: "700",
  },
  title: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.saffronSoft,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 14 },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    overflow: "hidden",
  },
  tabPillActive: { borderColor: COLORS.saffron },
  tabText: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream },
  tabTextActive: { color: COLORS.terracottaDark },

  // Amis
  addBlock: { flexDirection: "row", gap: 8 },
  addInput: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.cream,
    fontFamily: FONT_UI,
    fontSize: 14,
  },
  addBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addBtnText: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },

  sectionLabel: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.brass,
    fontWeight: "700",
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(245,235,214,0.15)",
    borderRadius: 12,
  },
  friendName: {
    flex: 1,
    fontFamily: FONT_UI_BOLD,
    fontSize: 14,
    color: COLORS.cream,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.statusGreen,
    borderWidth: 2,
    borderColor: COLORS.tealDeep,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(200,70,45,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: { color: "#E8553A", fontSize: 18, fontWeight: "700", lineHeight: 20 },
  empty: {
    fontFamily: FONT_UI,
    fontSize: 13,
    color: "rgba(245,235,214,0.5)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 24,
  },

  // Classement
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 10 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}33`,
    overflow: "hidden",
  },
  filterPillActive: { borderColor: COLORS.saffron },
  filterText: { fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700", color: COLORS.cream },
  filterTextActive: { color: COLORS.terracottaDark },

  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  podiumCol: { flex: 1, alignItems: "center" },
  podiumName: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: COLORS.cream, marginTop: 6 },
  podiumScore: { fontFamily: FONT_DISPLAY, fontSize: 18, color: COLORS.saffronSoft, fontWeight: "700" },
  podiumBar: {
    width: "100%",
    marginTop: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: COLORS.brass,
    borderBottomWidth: 0,
  },
  podiumRank: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: "700", color: COLORS.terracottaDark },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderRadius: 12,
    overflow: "hidden",
  },
  rowRank: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700", color: "rgba(245,235,214,0.65)", width: 30 },
  rowName: { fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  rowYouTag: { fontSize: 9, color: COLORS.brass, letterSpacing: 1, fontFamily: FONT_UI_BOLD, fontWeight: "700" },
  rowLevel: { fontSize: 10, letterSpacing: 1, color: "rgba(245,235,214,0.5)", fontWeight: "600", marginTop: 3, fontFamily: FONT_UI },
  rowScore: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: "700", color: COLORS.saffronSoft },
  rowChg: { fontSize: 10, fontWeight: "700", marginTop: 3 },

  boardSwitch: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    padding: 4,
  },
  boardBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  boardBtnActive: { backgroundColor: COLORS.brassDeep },
  boardText: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "700", color: "rgba(245,235,214,0.7)" },
  boardTextActive: { color: COLORS.cream },
});
