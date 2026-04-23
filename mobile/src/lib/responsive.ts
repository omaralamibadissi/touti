// Helpers responsive pour supporter tous les écrans : petits iPhones (SE)
// jusqu'aux grandes tablettes (iPad Pro 12.9", Galaxy Tab).
//
// Philosophie :
//   - `useResponsive()` → hook qui donne width, height, isTablet, isLandscape,
//     et un `scale(n)` qui interpole entre petit téléphone et tablette.
//   - Les paddings fixes comme `paddingTop: 60` sont remplacés par
//     `useSafeAreaInsets().top + 16` pour respecter les notches/Dynamic Island.
//   - Les layouts liste gagnent une `maxContentWidth` (~540px) sur tablette
//     pour ne pas s'étirer bêtement en 12" de large.
//
// Breakpoints :
//   - phone        : width < 600
//   - tablet       : width ≥ 600
//   - large tablet : width ≥ 900

import { useWindowDimensions } from "react-native";

export interface Responsive {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  /** Max logique pour une colonne de liste — évite l'étirement sur iPad Pro. */
  maxContentWidth: number;
  /** Interpole une valeur "téléphone" vers "tablette". */
  scale: (phoneValue: number, tabletValue?: number) => number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
  const isLandscape = width > height;
  // On se fie à la plus petite dimension pour détecter une tablette —
  // un iPhone Pro Max en landscape est large mais reste un téléphone.
  const isTablet = minDim >= 600;
  const isLargeTablet = minDim >= 900 || maxDim >= 1200;
  const maxContentWidth = isLargeTablet ? 640 : isTablet ? 560 : Infinity;

  const scale = (phoneValue: number, tabletValue?: number): number => {
    if (!isTablet) return phoneValue;
    if (tabletValue != null) return tabletValue;
    // Si pas de tabletValue explicite, on agrandit de 25-40%
    return isLargeTablet ? phoneValue * 1.35 : phoneValue * 1.2;
  };

  return { width, height, isLandscape, isTablet, isLargeTablet, maxContentWidth, scale };
}
