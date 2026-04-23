import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD, FONT_UI_EXTRA } from "../theme";
import { ArabesqueDivider, ZelligeBg } from "../components/Patterns";
import { useAuthStore } from "../store/authStore";
import { hapticTap, hapticChoice } from "../lib/haptics";
import { SuitGlyph } from "../components/Card";
import { getCardComponent } from "../components/cardAssets";

// Petites cartes Rey + Caballo fannées — repris du logo d'app.
// Les SVG n'incluent PAS le fond de la carte, il faut wrapper avec un View
// crème + radius pour simuler une vraie carte.
function MiniCard({
  suit,
  rank,
  width,
  height,
}: {
  suit: "oros" | "copas" | "espadas" | "bastos";
  rank: 11 | 12;
  width: number;
  height: number;
}) {
  const CardSvg = getCardComponent(suit, rank);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: width * 0.07,
        backgroundColor: "#FBF6EA",
        borderWidth: 1,
        borderColor: "#151515",
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <CardSvg width={width} height={height} />
    </View>
  );
}

function HeroCards() {
  return (
    <View style={{ width: 220, height: 170, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", transform: [{ rotate: "-14deg" }, { translateX: -40 }] }}>
        <MiniCard suit="oros" rank={11} width={100} height={160} />
      </View>
      <View style={{ position: "absolute", transform: [{ rotate: "14deg" }, { translateX: 40 }] }}>
        <MiniCard suit="oros" rank={12} width={100} height={160} />
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type InfoSlide = {
  eyebrow: string;
  title: string;
  hero: React.ReactNode;
  body: string;
};

// Slides informatives — format court, contenu aligné sur docs/rules.md.
const SUIT_SIZE = 110;
const INFO_SLIDES: InfoSlide[] = [
  {
    eyebrow: "LE BUT",
    title: "600 points",
    hero: <SuitGlyph suit="oros" size={SUIT_SIZE} />,
    body:
      "Une vraie partie de Touti, on joue jusqu'à 600 points cumulés sur plusieurs manches. Une manche = 10 plis.",
  },
  {
    eyebrow: "UN TOUR",
    title: "Mise · atout · jeu",
    hero: <SuitGlyph suit="copas" size={SUIT_SIZE} />,
    body:
      "Chacun mise 70 à 230 par pas de 10, passe, ou signale. Le plus haut misseur choisit l'atout. Puis les 10 plis s'enchaînent.",
  },
  {
    eyebrow: "LE GHNA",
    title: "Bonus en jouant",
    hero: <SuitGlyph suit="espadas" size={SUIT_SIZE} />,
    body:
      "Si tu as le Rey + Caballo d'une même couleur en main, annonce Ghna après un pli gagné : 40 pts si c'est l'atout, 20 sinon.",
  },
  {
    eyebrow: "LE TUTORIEL",
    title: "Une seule manche",
    hero: <SuitGlyph suit="bastos" size={SUIT_SIZE} />,
    body:
      "Pour le tuto, on ne joue qu'UNE manche pour que tu te fasses la main. Dans une vraie partie c'est premier à 600 pts qui gagne.",
  },
];

// Structure : slide 0 = accueil (bienvenue + intro, pas de boutons),
// slides 1..N = INFO_SLIDES, slide finale = choix du parcours (3 boutons).

export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  // 1 (accueil) + INFO_SLIDES.length + 1 (choix à la fin)
  const totalSlides = 1 + INFO_SLIDES.length + 1;
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const markOnboardingDone = useAuthStore((s) => s.markOnboardingDone);
  const markCoachmarksDone = useAuthStore((s) => s.markCoachmarksDone);
  const setPostOnboardingAction = useAuthStore((s) => s.setPostOnboardingAction);
  const setPendingMenuTutorial = useAuthStore((s) => s.setPendingMenuTutorial);
  const alreadyDone = useAuthStore((s) => s.onboardingDone);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== index) {
      setIndex(newIndex);
      hapticTap();
    }
  };

  const goTo = (i: number) => {
    // On ne set PAS l'index ici — c'est `onScroll` qui s'en charge quand
    // l'animation de scroll passe la moitié. Sinon les points (dots) sautent
    // instantanément à la nouvelle slide alors que le scroll est encore en
    // cours, et ça donne un effet « freeze ».
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
  };

  // Finit l'onboarding et déclenche l'action choisie.
  // Si l'utilisateur relance depuis Settings (alreadyDone=true), on ne ré-écrit
  // pas le flag — on navigue juste vers la bonne destination.
  const finish = async (action: "full" | "menu" | "skip") => {
    hapticChoice();

    // Pour "menu" et "skip", on marque le tuto-jeu (coachmarks) comme déjà vu
    // — sinon il se déclencherait à la prochaine partie solo, ce que l'user
    // ne veut pas puisqu'il vient d'indiquer "je connais" ou "passer".
    // Pour "full", on LAISSE coachmarksDone à false (le tuto doit se lancer).
    if (action !== "full") {
      await markCoachmarksDone().catch(() => {});
    }

    if (alreadyDone) {
      // Re-view depuis Settings : exécute l'action sans toucher au flag.
      if (action === "skip") {
        navigation.goBack();
        return;
      }
      // Pour full/menu, on active les tutos via le store + nav adaptée
      if (action === "full") {
        setPendingMenuTutorial(true);
        navigation.replace("Game", { mode: "local", tutorial: true });
      } else {
        setPendingMenuTutorial(true);
        navigation.goBack();
      }
      return;
    }

    // Premier onboarding : on pose d'abord `markOnboardingDone` et SEULEMENT
    // une fois qu'il a réussi, on positionne les flags downstream. Sinon, si
    // AsyncStorage échoue, on se retrouve avec `pendingMenuTutorial=true`
    // orphelin alors que l'app reste bloquée sur Onboarding.
    try {
      await markOnboardingDone();
    } catch (e) {
      console.warn("[Onboarding] markOnboardingDone failed", e);
      return; // n'avance pas les flags si on n'a pas pu persister l'état
    }
    if (action === "skip") {
      setPostOnboardingAction("home");
    } else if (action === "full") {
      setPendingMenuTutorial(true);
      setPostOnboardingAction("play");
    } else {
      setPendingMenuTutorial(true);
      setPostOnboardingAction("menu");
    }
  };

  const isChoiceSlide = index === totalSlides - 1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[COLORS.terracotta, COLORS.terracottaDark, COLORS.terracottaDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.terracottaDark} accent={COLORS.saffronSoft} size={70} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Slide 0 : accueil (inchangé, sans les boutons) */}
        <View style={[styles.slide, { width }]}>
          <View style={styles.hero}>
            <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
            <View style={styles.heroVisual}>
              <HeroCards />
            </View>
            <Text style={styles.eyebrow}>BIENVENUE</Text>
            <Text style={styles.title}>Touti</Text>
            <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
          </View>
          <Text style={styles.body}>
            Le jeu de cartes marocain. 40 cartes espagnoles, 4 joueurs en 2 équipes.
          </Text>
        </View>

        {/* Slides 1..N : info (inchangées) */}
        {INFO_SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.hero}>
              <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
              <View style={styles.heroVisual}>{s.hero}</View>
              <Text style={styles.eyebrow}>{s.eyebrow}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <ArabesqueDivider width={180} color={COLORS.saffronSoft} />
            </View>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}

        {/* Dernière slide : choix du parcours (boutons déplacés depuis slide 0) */}
        <View style={[styles.slide, { width }]}>
          <Text style={styles.body}>Comment veux-tu commencer ?</Text>
          <View style={styles.choicesWrap}>
            <Pressable
              onPress={() => finish("full")}
              style={styles.choiceBtn}
            >
              <Text style={styles.choiceLabel}>Apprendre à jouer</Text>
              <Text style={styles.choiceSub}>Tuto jeu (1 manche) + tuto menu</Text>
            </Pressable>
            <Pressable
              onPress={() => finish("menu")}
              style={[styles.choiceBtn, styles.choiceBtnSecondary]}
            >
              <Text style={styles.choiceLabelSecondary}>Je connais le jeu</Text>
              <Text style={styles.choiceSubSecondary}>Juste le tuto des menus</Text>
            </Pressable>
            <Pressable
              onPress={() => finish("skip")}
              style={styles.choiceGhost}
              hitSlop={6}
            >
              <Text style={styles.choiceGhostText}>Passer tout · direct à l'app</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Dots — toujours visibles */}
      <View style={styles.dots}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      {/* CTA "Suivant" — masqué sur la slide de choix (les 3 boutons font office de CTA) */}
      {!isChoiceSlide && (
        <View style={styles.cta}>
          <Pressable onPress={() => goTo(index + 1)} style={styles.primaryBtn}>
            <LinearGradient
              colors={[COLORS.saffron, COLORS.brassDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.primaryText}>Suivant</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 60, paddingHorizontal: 20,
    flexDirection: "row", justifyContent: "flex-end",
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  skipText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12,
    color: "rgba(245,235,214,0.75)",
    letterSpacing: 1.5, fontWeight: "700",
  },

  slide: {
    flex: 1, paddingHorizontal: 28,
    alignItems: "center", justifyContent: "center",
    gap: 22,
  },
  hero: { alignItems: "center", gap: 12 },
  heroVisual: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  eyebrow: {
    fontFamily: FONT_UI_BOLD,
    fontSize: 11, letterSpacing: 4,
    color: COLORS.brass, fontWeight: "700",
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 44,
    color: COLORS.cream,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  body: {
    fontFamily: FONT_UI, fontSize: 15, lineHeight: 22,
    color: "rgba(245,235,214,0.82)",
    textAlign: "center",
    paddingHorizontal: 10,
  },

  // Choix de parcours sur la slide 0
  choicesWrap: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  choiceBtn: {
    paddingVertical: 16, paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.saffron,
    borderWidth: 0.5, borderColor: `${COLORS.brass}88`,
    shadowColor: "#000", shadowOpacity: 0.25,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  choiceBtnActive: {
    backgroundColor: COLORS.brassDeep,
  },
  choiceBtnSecondary: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: `${COLORS.brass}55`,
  },
  choiceLabel: {
    fontFamily: FONT_UI_EXTRA, fontSize: 15, fontWeight: "800",
    color: COLORS.terracottaDark, letterSpacing: 0.5,
  },
  choiceSub: {
    fontFamily: FONT_UI, fontSize: 11, marginTop: 2,
    color: "rgba(43,24,16,0.75)", fontStyle: "italic",
  },
  choiceLabelSecondary: {
    fontFamily: FONT_UI_EXTRA, fontSize: 15, fontWeight: "800",
    color: COLORS.saffronSoft, letterSpacing: 0.5,
  },
  choiceSubSecondary: {
    fontFamily: FONT_UI, fontSize: 11, marginTop: 2,
    color: "rgba(245,235,214,0.55)", fontStyle: "italic",
  },
  choiceGhost: {
    alignItems: "center", paddingVertical: 10, marginTop: 4,
  },
  choiceGhostText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12,
    color: "rgba(245,235,214,0.6)",
    letterSpacing: 1.5, fontWeight: "700",
  },

  dots: {
    flexDirection: "row", justifyContent: "center", gap: 8,
    marginBottom: 18,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "rgba(245,235,214,0.25)",
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.saffronSoft,
  },

  cta: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5,
    borderColor: `${COLORS.brass}66`,
    shadowColor: "#000", shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryText: {
    fontFamily: FONT_UI_EXTRA,
    fontSize: 15, fontWeight: "800",
    color: COLORS.terracottaDark,
    letterSpacing: 0.5,
  },
});
