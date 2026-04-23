// Module d'internationalisation.
// - 3 langues : fr (défaut), en, ar.
// - Auto-détection de la langue de l'appareil au 1er lancement.
// - Persistance du choix dans AsyncStorage (scope device, pas user).
// - `useT()` = hook réactif : les composants se re-render à chaque
//   changement de langue.
// - Note RTL : pour l'arabe on garde le layout LTR afin de ne pas
//   casser les écrans de jeu (positions fixes des cartes etc.).
//   Seul le texte est en arabe. À améliorer plus tard si besoin.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import { create } from "zustand";

import fr from "./fr";
import en from "./en";
import ar from "./ar";

export type Locale = "fr" | "en" | "ar";
const ALL_LOCALES: Locale[] = ["fr", "en", "ar"];

// Instance i18n-js partagée à l'échelle du module.
export const i18n = new I18n({ fr, en, ar });
i18n.defaultLocale = "fr";
i18n.enableFallback = true;
i18n.locale = "fr";

function autoDetect(): Locale {
  try {
    for (const lang of getLocales()) {
      const code = (lang.languageCode || "").toLowerCase() as Locale;
      if (ALL_LOCALES.includes(code)) return code;
    }
  } catch {}
  return "fr";
}

const STORAGE_KEY = "touti.locale.v1";

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (l: Locale) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: "fr",
  hydrated: false,
  hydrate: async () => {
    try {
      const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as Locale | null;
      const l: Locale =
        saved && ALL_LOCALES.includes(saved) ? saved : autoDetect();
      i18n.locale = l;
      set({ locale: l, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  setLocale: async (l) => {
    i18n.locale = l;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {}
    set({ locale: l });
  },
}));

// Traduction brute. Prend en charge l'interpolation `{{var}}` via i18n-js.
// Fallback gracieux : si la clé n'existe pas, retourne la clé brute plutôt
// que de faire crasher l'écran.
export function t(key: string, params?: Record<string, any>): string {
  const translated = i18n.t(key, { ...params, defaultValue: key });
  return typeof translated === "string" ? translated : key;
}

// Hook réactif : les composants qui l'utilisent se re-render automatiquement
// quand la langue change. Retourne le `t` global — mais en l'utilisant via
// ce hook on crée la dépendance Zustand qui déclenche le re-render.
export function useT(): typeof t {
  useLocaleStore((s) => s.locale); // subscribe pour re-render
  return t;
}

// Retourne le nom d'une couleur selon la langue active.
// - "fr" : nom FR + darija entre parenthèses (ex: "Coupes (Koubbas)")
// - "en" : même format avec anglais (ex: "Cups (Koubbas)")
// - "ar" : nom arabe + darija (ex: "الكؤوس (القباب)")
// La darija reste affichée partout car c'est le terme authentique du jeu.
export function suitLabel(suit: "oros" | "copas" | "espadas" | "bastos"): string {
  const key = suit.charAt(0).toUpperCase() + suit.slice(1);
  const main = t(`game.suit${key}`);
  const dr = t(`game.suit${key}Dr`);
  return main === dr ? main : `${main} (${dr})`;
}

// Nom court (darija uniquement) — pour les petits composants compacts.
export function suitLabelShort(suit: "oros" | "copas" | "espadas" | "bastos"): string {
  const key = suit.charAt(0).toUpperCase() + suit.slice(1);
  return t(`game.suit${key}Dr`);
}

// Nom court pour Ghna — sans redondance : en FR on veut "Koubbas", en AR "القباب".
export function suitNameForGhna(suit: "oros" | "copas" | "espadas" | "bastos"): string {
  return suitLabelShort(suit);
}
