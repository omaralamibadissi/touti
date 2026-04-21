import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ArabesqueDivider, ZelligeBg } from "../components/Patterns";
import { Card, SuitGlyph } from "../components/Card";

type Props = NativeStackScreenProps<RootStackParamList, "Rules">;

export default function RulesScreen({ navigation }: Props) {
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
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LES RÈGLES DU</Text>
          <Text style={styles.title}>TOUTI</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.hero}>
          <ArabesqueDivider width={200} color={COLORS.saffronSoft} />
          <Text style={styles.intro}>
            Jeu de cartes marocain · 4 joueurs en 2 équipes · premier à 600 points gagne la partie.
          </Text>
          <ArabesqueDivider width={200} color={COLORS.saffronSoft} />
        </View>

        {/* Section : le but */}
        <Section emoji="🎯" title="Le but" sub="Gagner la bataille des plis">
          <Text style={styles.p}>
            Vous êtes <Bold>4 joueurs</Bold> en <Bold>2 équipes de 2</Bold> (partenaires en face).
            La première équipe à cumuler <Highlight>600 points</Highlight> remporte la partie.
          </Text>
        </Section>

        {/* Section : les cartes */}
        <Section emoji="🃏" title="Le paquet" sub="40 cartes espagnoles">
          <Text style={styles.p}>
            4 couleurs × 10 cartes. Pas de 8 ni de 9. Les figures sont
            <Bold> Sota (10) · Caballo (11) · Rey (12)</Bold>.
          </Text>
          <View style={styles.suitsRow}>
            <SuitLabel suit="oros" label="Dheb · Or" />
            <SuitLabel suit="copas" label="Koubbas · Coupes" />
            <SuitLabel suit="espadas" label="Chbada · Épées" />
            <SuitLabel suit="bastos" label="Lekhel · Bâtons" />
          </View>
        </Section>

        {/* Section : valeur des cartes */}
        <Section emoji="⭐" title="Valeur des cartes" sub="Force & points">
          <Text style={styles.p}>
            De la plus forte à la plus faible, avec les points qu'elle rapporte quand tu la captures :
          </Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            <RankRow rank={1} name="As" points={11} />
            <RankRow rank={3} name="Triss" points={10} />
            <RankRow rank={12} name="Rey" points={4} />
            <RankRow rank={11} name="Caballo" points={3} />
            <RankRow rank={10} name="Sota" points={2} />
            <RankRow rank={7} name="7 · 6 · 5 · 4 · 2" points={0} multi />
          </View>
          <Text style={styles.hint}>
            Total en jeu par manche : <Bold>120 pts</Bold> (cartes) + <Bold>10 pts</Bold> pour le dernier pli (la <Bold>9a3a</Bold>).
          </Text>
        </Section>

        {/* Section : distribution */}
        <Section emoji="🤲" title="La distribution" sub="Chra · Mzaida">
          <Text style={styles.p}>
            Le distributeur donne <Bold>10 cartes</Bold> à chaque joueur, par paquets de <Bold>5</Bold>,
            en sens <Bold>anti-horaire</Bold>.
          </Text>
          <Text style={styles.p}>
            Le premier à parler est le <Highlight>Mâle</Highlight> : le joueur à la <Bold>droite du distributeur</Bold>.
          </Text>
        </Section>

        {/* Section : enchères */}
        <Section emoji="💬" title="Les enchères" sub="Proposer un objectif">
          <Text style={styles.p}>
            Chacun à son tour, dans le sens anti-horaire, annonce un multiple de 10
            entre <Highlight>70</Highlight> et <Highlight>230</Highlight>, ou <Bold>passe</Bold>.
          </Text>
          <Text style={styles.p}>
            Le chiffre = objectif que ton équipe s'engage à atteindre si elle gagne les enchères.
          </Text>
          <Rule
            title="Signal au partenaire"
            body="Au lieu d'enchérir, tu peux dire « un As » ou « un Compte » pour signaler ta force. Après avoir signalé, tu ne peux plus enchérir. Après avoir enchéri, tu ne peux plus signaler. Chaque signal (As / Compte) n'est utilisable qu'une fois par phase. Dès qu'un signal est fait et qu'il ne reste plus que le plus haut enchérisseur en course, les enchères se ferment automatiquement."
          />
          <Rule
            title="Tout le monde passe ?"
            body="Le distributeur tourne (comme si une manche avait été jouée) et on redistribue."
          />
          <Rule
            title="Gagnant des enchères"
            body="Le plus haut enchérisseur choisit la couleur d'atout (Tronfo)."
          />
        </Section>

        {/* Section : déroulement */}
        <Section emoji="🎴" title="Le jeu" sub="Les règles de pose">
          <Text style={styles.p}>
            Le joueur qui ouvre le pli pose ce qu'il veut. Les autres doivent respecter ces obligations :
          </Text>
          <Rule
            title="1. Fournir la couleur"
            body="Si tu as la couleur demandée, tu dois la jouer."
          />
          <Rule
            title="2. Monter si tu peux"
            body="Tu dois jouer une carte plus haute que la plus haute déjà posée, sauf si quelqu'un a déjà coupé avec l'atout."
          />
          <Rule
            title="3. Couper à l'atout"
            body="Si tu n'as pas la couleur, tu dois jouer un atout si tu en as."
          />
          <Rule
            title="4. Surcouper"
            body="Si un atout a déjà été posé et que tu as un atout plus fort, tu es obligé de le jouer."
          />
          <Text style={[styles.hint, { marginTop: 10 }]}>
            Le pli est remporté par l'atout le plus fort, ou à défaut par la plus haute carte de la couleur demandée.
          </Text>
        </Section>

        {/* Section : ghna */}
        <Section emoji="👑" title="La Ghna" sub="Caballo + Rey · annonce bonus">
          <Text style={styles.p}>
            Si tu as <Bold>Caballo + Rey</Bold> de la même couleur dans ta main :
          </Text>
          <View style={styles.ghnaBlock}>
            <GhnaLine value={40} text="Dans la couleur d'atout" />
            <GhnaLine value={20} text="Dans une autre couleur" />
          </View>
          <Rule
            title="Conditions"
            body="Ton équipe doit avoir gagné les enchères. Mise minimum 80 pour Ghna 20, et 90 pour Ghna 40."
          />
          <Rule
            title="Timing"
            body="L'annonce doit être faite juste après un pli gagné par toi ou ton partenaire. Un seul Ghna par pli."
          />
        </Section>

        {/* Section : scoring */}
        <Section emoji="🏁" title="Fin de manche" sub="Le calcul">
          <Text style={styles.p}>
            La manche s'arrête quand les 10 plis ont été joués.
          </Text>
          <Rule
            title="Si l'équipe qui a enchéri atteint sa mise"
            body="Elle marque le montant de sa mise."
            success
          />
          <Rule
            title="Sinon"
            body="C'est l'équipe adverse qui marque ce montant."
            danger
          />
          <Rule
            title="+10 pour la 9a3a"
            body="L'équipe qui gagne le dernier pli touche un bonus de 10 pts."
          />
        </Section>

        {/* Section : fin de partie */}
        <Section emoji="🏆" title="Fin de partie" sub="Objectif 600">
          <Text style={styles.p}>
            La première équipe à <Highlight>atteindre ou dépasser 600 points</Highlight> remporte la partie.
            Le surplus est conservé (ex : 520 + 120 = 640 et c'est fini).
          </Text>
        </Section>

        <View style={{ alignItems: "center", marginTop: 30 }}>
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
          <Text style={styles.outro}>Bonne chance à ta table.</Text>
          <ArabesqueDivider width={220} color={COLORS.saffronSoft} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────

function Section({
  emoji,
  title,
  sub,
  children,
}: {
  emoji: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{sub}</Text>
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Rule({
  title,
  body,
  success,
  danger,
}: {
  title: string;
  body: string;
  success?: boolean;
  danger?: boolean;
}) {
  const accent = success ? "#3FC26A" : danger ? "#E8553A" : COLORS.brass;
  return (
    <View style={[styles.rule, { borderLeftColor: accent }]}>
      <Text style={[styles.ruleTitle, { color: accent }]}>{title}</Text>
      <Text style={styles.ruleBody}>{body}</Text>
    </View>
  );
}

function SuitLabel({ suit, label }: { suit: "oros" | "copas" | "espadas" | "bastos"; label: string }) {
  return (
    <View style={styles.suitLabel}>
      <View style={styles.suitDisc}>
        <SuitGlyph suit={suit} size={20} />
      </View>
      <Text style={styles.suitText}>{label}</Text>
    </View>
  );
}

function RankRow({
  rank,
  name,
  points,
  multi,
}: {
  rank: number;
  name: string;
  points: number;
  multi?: boolean;
}) {
  return (
    <View style={styles.rankRow}>
      <View style={styles.rankBadge}>
        {multi ? (
          <Text style={styles.rankText}>···</Text>
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>
      <Text style={styles.rankName}>{name}</Text>
      <View style={styles.pointsPill}>
        <Text style={styles.pointsText}>{points} pt{points > 1 ? "s" : ""}</Text>
      </View>
    </View>
  );
}

function GhnaLine({ value, text }: { value: number; text: string }) {
  return (
    <View style={styles.ghnaLine}>
      <View style={styles.ghnaBadge}>
        <LinearGradient
          colors={[COLORS.saffron, COLORS.brassDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.ghnaValue}>+{value}</Text>
      </View>
      <Text style={styles.ghnaText}>{text}</Text>
    </View>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <Text style={styles.highlight}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 60, paddingHorizontal: 16 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 32, color: COLORS.saffronSoft, fontWeight: "700", marginTop: 2, letterSpacing: 4 },

  hero: { alignItems: "center", gap: 14, marginBottom: 24 },
  intro: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: "rgba(245,235,214,0.85)",
    textAlign: "center",
    lineHeight: 21,
    fontStyle: "italic",
  },

  section: {
    marginBottom: 22,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}44`,
    borderRadius: 18,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionEmoji: { fontSize: 30 },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sectionSub: {
    fontFamily: FONT_UI,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(245,235,214,0.55)",
    fontWeight: "700",
    fontStyle: "italic",
    marginTop: 2,
  },
  sectionBody: { padding: 18, paddingTop: 12 },

  p: {
    fontFamily: FONT_UI,
    fontSize: 14,
    color: COLORS.cream,
    lineHeight: 21,
    marginBottom: 10,
  },
  hint: {
    fontFamily: FONT_UI,
    fontSize: 12,
    color: "rgba(245,235,214,0.7)",
    lineHeight: 18,
    fontStyle: "italic",
    marginTop: 6,
  },

  bold: { fontFamily: FONT_UI_BOLD, fontWeight: "700", color: COLORS.cream },
  highlight: { fontFamily: FONT_UI_BOLD, fontWeight: "700", color: COLORS.saffronSoft },

  rule: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  ruleTitle: { fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  ruleBody: { fontFamily: FONT_UI, fontSize: 13, color: "rgba(245,235,214,0.85)", lineHeight: 19, marginTop: 3 },

  suitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  suitLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.35)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: "47%",
  },
  suitDisc: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#FBF6EA",
    alignItems: "center",
    justifyContent: "center",
  },
  suitText: { fontFamily: FONT_UI_BOLD, fontSize: 11, fontWeight: "700", color: COLORS.cream, flex: 1 },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 0.5,
    borderColor: "rgba(212,160,76,0.25)",
    borderRadius: 10,
  },
  rankBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.saffronSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.terracottaDark,
  },
  rankName: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 14, fontWeight: "700", color: COLORS.cream },
  pointsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.brassDeep,
    borderRadius: 10,
  },
  pointsText: { fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "800", color: COLORS.cream },

  ghnaBlock: { gap: 8, marginVertical: 10 },
  ghnaLine: { flexDirection: "row", alignItems: "center", gap: 12 },
  ghnaBadge: {
    width: 54, height: 34, borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  ghnaValue: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: "800", color: COLORS.terracottaDark },
  ghnaText: { flex: 1, fontFamily: FONT_UI_BOLD, fontSize: 13, color: COLORS.cream, fontWeight: "700" },

  outro: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    color: COLORS.saffronSoft,
    fontWeight: "700",
    letterSpacing: 1,
    marginVertical: 8,
    fontStyle: "italic",
  },
});
