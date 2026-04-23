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
          <Text style={styles.p}>
            Une partie est découpée en <Bold>manches</Bold>. À chaque manche, une équipe <Bold>promet</Bold>
            (mise aux enchères) d'atteindre un score. Si elle réussit, elle marque sa promesse.
            Sinon, l'équipe adverse la marque.
          </Text>
          <Text style={styles.hint}>
            Une partie typique dure 3 à 17 manches. Plus les mises sont hautes, plus ça monte vite.
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
        <Section emoji="🤲" title="La distribution" sub="Chra">
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
            Chacun à son tour, dans le sens anti-horaire, fait une des actions suivantes :
          </Text>
          <Rule
            title="Enchérir"
            body="Annonce un multiple de 10 entre 70 et 230. Ton chiffre doit être STRICTEMENT supérieur à la dernière mise. C'est l'objectif de points que ton équipe promet d'atteindre si elle gagne les enchères."
          />
          <Rule
            title="Passer"
            body="Tu renonces à enchérir. Tu n'auras plus le droit de parler jusqu'à la fin de la phase."
          />
          <Rule
            title="Signal au partenaire"
            body={
              "Au lieu d'enchérir, tu peux dire « un As » ou « un Compte » pour signaler ta force." +
              " Après avoir signalé, tu ne peux plus enchérir. Après avoir enchéri, tu ne peux plus signaler." +
              " Chaque signal (As / Compte) n'est utilisable qu'une fois par phase." +
              " Dès qu'un signal est fait et qu'il ne reste plus que le plus haut enchérisseur en course, les enchères se ferment automatiquement."
            }
          />
          <Text style={[styles.hint, { marginTop: 10 }]}>
            Exemple — Ali 70 · Karim 80 · Omar passe · Salma 90 · Ali passe · Karim 100 · Salma passe
            → Karim gagne avec 100 et choisit l'atout.
          </Text>
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
            Chaque <Bold>pli</Bold> = les 4 joueurs posent une carte chacun. Le gagnant ramasse les 4 cartes
            et ouvre le pli suivant.
          </Text>
          <Text style={styles.p}>
            Le joueur qui <Bold>ouvre</Bold> pose n'importe quelle carte. Les 3 autres, à leur tour, doivent respecter ces obligations dans l'ordre :
          </Text>
          <Rule
            title="1. Fournir la couleur"
            body="Si tu as la couleur demandée, tu dois la jouer."
          />
          <Rule
            title="2. Monter si tu peux"
            body="Tu dois jouer une carte plus haute que la plus haute déjà posée, sauf si quelqu'un a déjà coupé avec un atout (auquel cas tu joues la couleur librement)."
          />
          <Rule
            title="3. Couper à l'atout"
            body="Si tu n'as pas la couleur, tu dois jouer un atout si tu en as."
          />
          <Rule
            title="4. Surcouper"
            body="Si un atout a déjà été posé et que tu as un atout plus fort, tu es obligé de le jouer."
          />
          <Rule
            title="5. Défausse"
            body="Si tu n'as ni la couleur ni d'atout, tu joues ce que tu veux (tu « défausses »)."
          />
          <Text style={[styles.hint, { marginTop: 10 }]}>
            Gagnant : l'<Bold>atout le plus fort</Bold>, ou à défaut la <Bold>plus haute carte de la couleur ouverte</Bold>.
          </Text>
          <Text style={[styles.hint, { marginTop: 8 }]}>
            Exemple — atout Koubbas. Ali ouvre avec le 3 de Dheb (10 pts). Karim n'a pas Dheb → coupe au 10 de Koubbas. Omar joue Rey de Dheb (ne bat pas l'atout). Salma a des Koubbas + As → doit surcouper → As de Koubbas. Salma gagne et ramasse 27 pts.
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
            title="Plafond par équipe selon la mise"
            body={
              "Le total de points de Ghna que ton équipe peut annoncer dépend de la mise : " +
              "70 → 0 pt, 80+ → 20 pts max, 90+ → 40 pts max (1×40 OU 2×20), 100+ → 100 pts (illimité en pratique)."
            }
          />
          <Rule
            title="Équipe gagnante des enchères"
            body="Seuls les membres de l'équipe qui a gagné les enchères peuvent annoncer Ghna."
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

        {/* Section : Conseils débutant */}
        <Section emoji="💡" title="Conseils pour débuter" sub="Stratégie de base">
          <Rule
            title="Regarde tes As et tes Triss"
            body="Ces cartes rapportent le plus de points (11 et 10) et sont parmi les plus faciles à jouer gagnantes. Compte-les avant d'enchérir."
          />
          <Rule
            title="Écoute les signaux du partenaire"
            body="Si ton partenaire dit « un As » ou « un Compte », tu as une info précieuse. Ses cartes hautes peuvent compléter les tiennes."
          />
          <Rule
            title="Ne bluffe pas trop haut"
            body="90 c'est déjà une mise sérieuse. Vise 50-60% des points minimum de ta main + une estimation prudente du partenaire."
          />
          <Rule
            title="Garde un atout en réserve"
            body="Avoir encore un atout en fin de manche, surtout si les adversaires n'en ont plus, ça vaut de l'or."
          />
          <Rule
            title="Compte les atouts joués"
            body="Quand il ne reste plus d'atouts chez les adversaires, tes cartes hautes des autres couleurs peuvent passer sans être coupées."
          />
        </Section>

        {/* Section : Lexique darija */}
        <Section emoji="📖" title="Lexique darija" sub="Les termes à connaître">
          <Rule title="Chra" body="Phase d'enchères." />
          <Rule title="Mâle" body="Joueur qui parle en premier (à la droite du distributeur)." />
          <Rule title="Tronfo" body="L'atout — la couleur maîtresse de la manche." />
          <Rule title="Touti" body="Le nom du jeu." />
          <Rule title="Triss" body="Le 3 — la 2e carte la plus forte après l'As (10 points)." />
          <Rule title="Sota / Caballo / Rey" body="Valet (10) / Cavalier (11) / Roi (12)." />
          <Rule title="Ghna" body="Annonce bonus (Caballo + Rey de même couleur dans ta main)." />
          <Rule title="9a3a" body="Bonus de +10 pts pour le gagnant du dernier pli (10e)." />
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
