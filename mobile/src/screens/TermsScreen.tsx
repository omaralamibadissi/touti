import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { COLORS, FONT_DISPLAY, FONT_UI, FONT_UI_BOLD } from "../theme";
import { ZelligeBg } from "../components/Patterns";
import { useT } from "../lib/i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Terms">;

export default function TermsScreen({ navigation, route }: Props) {
  const t = useT();
  const which = route.params?.section ?? "privacy";

  return (
    <View style={styles.root}>
      <LinearGradient colors={[COLORS.tealDeep, "#051D20"]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: 0.05 }]} pointerEvents="none">
        <ZelligeBg color={COLORS.tealDeep} accent={COLORS.brass} size={60} />
      </View>

      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{which === "terms" ? t("terms.tabTerms").toUpperCase() : t("terms.tabPrivacy").toUpperCase()}</Text>
          <Text style={styles.title}>
            {which === "terms" ? t("terms.titleTerms") : t("terms.titlePrivacy")}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => navigation.setParams({ section: "terms" })}
          style={[styles.tab, which === "terms" && styles.tabActive]}
        >
          <Text style={[styles.tabText, which === "terms" && styles.tabTextActive]}>{t("terms.tabTerms")}</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.setParams({ section: "privacy" })}
          style={[styles.tab, which === "privacy" && styles.tabActive]}
        >
          <Text style={[styles.tabText, which === "privacy" && styles.tabTextActive]}>{t("terms.tabPrivacy")}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {which === "terms" ? <TermsBody /> : <PrivacyBody />}
      </ScrollView>
    </View>
  );
}

function TermsBody() {
  return (
    <>
      <Section title="1. Objet">
        Ces Conditions Générales d'Utilisation (CGU) régissent votre accès et votre utilisation de l'application Touti, un jeu de cartes multijoueur inspiré du Touti marocain.
      </Section>
      <Section title="2. Compte">
        Vous devez créer un compte avec un pseudo unique et un mot de passe. Vous êtes responsable de la confidentialité de vos identifiants. Vous pouvez supprimer votre compte à tout moment depuis les réglages.
      </Section>
      <Section title="3. Comportement">
        Vous vous engagez à ne pas :{"\n"}
        • insulter ou harceler d'autres joueurs dans le chat{"\n"}
        • tricher ou utiliser des bots non autorisés{"\n"}
        • tenter de pirater, spammer ou surcharger le serveur{"\n"}
        • utiliser un pseudo offensant ou usurpant l'identité d'autrui
      </Section>
      <Section title="4. Contenu utilisateur">
        Vous restez propriétaire de ce que vous écrivez dans le chat, mais acceptez que Touti stocke et affiche vos messages aux autres participants d'une même partie.
      </Section>
      <Section title="5. Modifications">
        Touti peut mettre à jour ces CGU. Les changements majeurs vous seront notifiés dans l'app.
      </Section>
      <Section title="6. Résiliation">
        Touti peut suspendre ou supprimer un compte qui ne respecte pas ces règles, après un éventuel avertissement.
      </Section>
      <Section title="7. Limitation de responsabilité">
        L'app est fournie "telle quelle". Touti fait de son mieux pour assurer un service fiable, mais ne garantit pas une disponibilité 100% ni l'absence de bugs. Touti n'est pas responsable des conflits entre joueurs.
      </Section>
      <Section title="8. Droit applicable">
        Ces CGU sont régies par le droit marocain et les règles de l'Union européenne en ce qui concerne les données personnelles.
      </Section>
      <Footer />
    </>
  );
}

function PrivacyBody() {
  return (
    <>
      <Section title="1. Ce que nous collectons">
        • Votre pseudo, votre mot de passe (chiffré avec bcrypt), et optionnellement votre email{"\n"}
        • L'historique de vos parties jouées dans l'app (scores, joueurs, timestamps){"\n"}
        • Les ligues que vous créez ou rejoignez{"\n"}
        • Les messages que vous écrivez dans le chat en partie
      </Section>
      <Section title="2. Ce que nous ne collectons pas">
        • Votre géolocalisation précise{"\n"}
        • Votre carnet de contacts{"\n"}
        • Votre historique hors-app{"\n"}
        • Vos informations de paiement (l'app est gratuite)
      </Section>
      <Section title="3. Hébergement et sécurité">
        Les données sont stockées sur les serveurs de Fly.io (UE, Paris). Le mot de passe est hashé (bcrypt, cost 10). Les communications serveur passent en TLS 1.3.
      </Section>
      <Section title="4. Partage avec des tiers">
        Nous ne vendons ni partageons vos données. Les seuls tiers sont les providers d'authentification (Apple, Google, Facebook — optionnels) qui reçoivent uniquement un token d'identification.
      </Section>
      <Section title="5. Vos droits RGPD & Loi 09-08 (Maroc)">
        Vous pouvez à tout moment :{"\n"}
        • Exporter vos données au format JSON (bouton "Télécharger mes données" dans les Réglages){"\n"}
        • Supprimer définitivement votre compte (bouton "Supprimer mon compte" dans les Réglages){"\n"}
        • Demander la rectification d'une donnée par email
      </Section>
      <Section title="6. Durée de conservation">
        Vos données sont conservées tant que votre compte est actif. Après suppression, nous gardons uniquement un identifiant anonyme pour préserver l'intégrité des classements historiques.
      </Section>
      <Section title="7. Cookies et traceurs">
        L'app ne contient pas de traceur publicitaire. Aucun cookie n'est posé.
      </Section>
      <Section title="8. Mineurs">
        L'app est accessible aux 13 ans et plus. Si vous êtes mineur, un accord parental est requis avant création de compte.
      </Section>
      <Section title="9. Contact">
        Pour exercer vos droits ou pour toute question : omaralamibadissi@gmail.com
      </Section>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function Footer() {
  return (
    <Text style={styles.footer}>
      Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}{"\n"}
      Touti · fait au Maroc
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 0.5, borderColor: `${COLORS.brass}44`,
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: COLORS.cream, fontSize: 18, fontWeight: "700", fontFamily: FONT_UI_BOLD },
  eyebrow: { fontFamily: FONT_UI_BOLD, fontSize: 11, letterSpacing: 3, color: COLORS.brass, fontWeight: "700" },
  title: { fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.cream, fontWeight: "700", marginTop: 2 },

  tabs: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 4, marginBottom: 4 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    borderWidth: 0.5, borderColor: "rgba(212,160,76,0.3)",
  },
  tabActive: { backgroundColor: COLORS.saffron, borderColor: COLORS.saffron },
  tabText: {
    fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: "700",
    color: COLORS.cream, letterSpacing: 0.5,
  },
  tabTextActive: { color: COLORS.terracottaDark },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontFamily: FONT_UI_BOLD, fontSize: 13, fontWeight: "800",
    color: COLORS.saffronSoft, marginBottom: 6, letterSpacing: 0.3,
  },
  sectionText: {
    fontFamily: FONT_UI, fontSize: 13,
    color: "rgba(245,235,214,0.85)", lineHeight: 20,
  },
  footer: {
    fontFamily: FONT_UI, fontSize: 11,
    color: "rgba(245,235,214,0.45)",
    textAlign: "center", marginTop: 24, lineHeight: 16,
    fontStyle: "italic",
  },
});
