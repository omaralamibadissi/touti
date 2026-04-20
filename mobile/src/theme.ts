// Design tokens — portés depuis le handoff Claude Design.
// Source : design/extracted/touti/project/ui.jsx + screen-home.jsx

export const COLORS = {
  // Palette marocaine chaude
  terracotta: "#C8441A",
  terracottaDark: "#8B2417",
  terracottaDeep: "#4E1208",
  saffron: "#E8A130",
  saffronSoft: "#F4D89E",
  brass: "#D4A04C",
  brassDeep: "#B8791C",
  teal: "#0F5A5E",
  tealDeep: "#083E42",
  cream: "#F5EBD6",
  creamDark: "#E8D9B8",
  ink: "#2B1810",
  inkSoft: "#5A3E2B",

  // Tables de jeu
  felt: "#1A4A3A",
  feltDark: "#0E2E24",

  // Utilitaires UI
  bg: "#1a1410",
  statusGreen: "#3FC26A",
} as const;

export const TABLE_COLORS = {
  felt: { base: "#0F4A3A", dark: "#062820", accent: "#D4A04C" },
  terracotta: { base: "#8B2417", dark: "#4E1208", accent: "#E8A130" },
  midnight: { base: "#1A2840", dark: "#0A1428", accent: "#D4A04C" },
} as const;

// Familles de polices — à charger via @expo-google-fonts/*
// Fallbacks : les polices système iOS/Android si pas encore chargées.
export const FONT_DISPLAY = "CormorantGaramond_700Bold"; // Cormorant Garamond
export const FONT_DISPLAY_REG = "CormorantGaramond_600SemiBold";
export const FONT_UI = "Inter_500Medium";
export const FONT_UI_BOLD = "Inter_700Bold";
export const FONT_UI_EXTRA = "Inter_800ExtraBold";

// Espacements / radii communs
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Ombres (shadowX) — pour iOS via shadowColor, Android via elevation
export const SHADOWS = {
  brass: {
    shadowColor: "#8B5A12",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// Helper : assombrit / éclaircit une couleur hex
export function shade(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (c: number) => Math.max(0, Math.min(255, c + (pct / 100) * 255));
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(f(r))}${toHex(f(g))}${toHex(f(b))}`;
}
