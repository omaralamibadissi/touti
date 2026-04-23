// Wrappers haptic centralisés pour les interactions de l'UI.
// Utilisés sur les CTA, confirmations, succès/échec.
//
// iOS honore parfaitement ; Android varie selon l'OEM.

import * as Haptics from "expo-haptics";

let enabled = true;
export function setHapticsEnabled(v: boolean) { enabled = v; }

// Tap léger — pour une pression de bouton standard
export function hapticTap() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Tap medium — pour un choix marquant (création, confirmation)
export function hapticChoice() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

// Succès — opération réussie (ami accepté, partie créée…)
export function hapticSuccess() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// Warning — action à confirmer / potentiellement risquée
export function hapticWarning() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

// Error — échec, validation KO
export function hapticError() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
