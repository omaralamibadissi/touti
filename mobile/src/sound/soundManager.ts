// Gestionnaire son — charge paresseusement les fichiers locaux et fallback silencieux
// si absent. Fichiers attendus dans mobile/assets/sounds/ (tous optionnels).
//
// Pour ajouter de vrais sons : dépose des .mp3 ou .wav dans mobile/assets/sounds/
// avec les noms exacts suivants. Le code restera silencieux tant que les fichiers
// ne sont pas là (pas d'erreur).

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

type SoundKey =
  | "deal"          // distribution des cartes
  | "cardPlay"      // jouer une carte
  | "trickWin"      // remporter un pli
  | "roundEnd"      // fin de manche
  | "gameWin"       // victoire
  | "gameLose"      // défaite
  | "bid"           // poser une enchère
  | "tapIllegal";   // tap sur carte illégale

// Essais de require — chaque fichier est optionnel. Try/catch capture l'absence.
function tryRequire(key: SoundKey): any {
  try {
    switch (key) {
      case "deal":        return require("../../assets/sounds/deal.m4a");
      case "cardPlay":    return require("../../assets/sounds/card-play.m4a");
      case "trickWin":    return require("../../assets/sounds/trick-win.m4a");
      case "roundEnd":    return require("../../assets/sounds/round-end.m4a");
      case "gameWin":     return require("../../assets/sounds/game-win.m4a");
      case "gameLose":    return require("../../assets/sounds/game-lose.m4a");
      case "bid":         return require("../../assets/sounds/bid.m4a");
      case "tapIllegal":  return require("../../assets/sounds/tap-illegal.m4a");
    }
  } catch {
    return null;
  }
}

const loaded: Partial<Record<SoundKey, Audio.Sound>> = {};
let audioModeSet = false;
let enabled = true;
// Incrémenté à chaque stopAllSounds. Invalide toute instance de playSound
// en cours qui attendait sur createAsync : si l'epoch a changé entre-temps,
// on n'enclenche pas replayAsync (sinon le son reprend juste APRÈS l'arrêt
// quand l'utilisateur a déjà quitté la partie).
let epoch = 0;

export function setSoundEnabled(v: boolean) { enabled = v; }
export function isSoundEnabled() { return enabled; }

async function ensureAudioMode() {
  if (audioModeSet) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      allowsRecordingIOS: false,
    });
  } catch {}
  audioModeSet = true;
}

async function getSound(key: SoundKey): Promise<Audio.Sound | null> {
  if (loaded[key]) return loaded[key]!;
  const asset = tryRequire(key);
  if (!asset) return null;
  await ensureAudioMode();
  try {
    const { sound } = await Audio.Sound.createAsync(asset);
    loaded[key] = sound;
    return sound;
  } catch {
    return null;
  }
}

// Table de haptics par défaut (joués même sans fichier son).
const HAPTIC: Partial<Record<SoundKey, () => void>> = {
  cardPlay: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  trickWin: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  roundEnd: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  gameWin:  () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  gameLose: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  bid:      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  tapIllegal: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  deal:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}),
};

export async function playSound(key: SoundKey) {
  if (!enabled) return;
  // Haptic immédiat
  HAPTIC[key]?.();
  // Snapshot de l'epoch avant l'await — si stopAllSounds est appelé pendant
  // que createAsync tourne, on verra la différence et on abandonnera.
  const myEpoch = epoch;
  const s = await getSound(key);
  if (!s) return;
  if (myEpoch !== epoch) return; // stop s'est produit entre-temps → on n'enchaîne pas
  try {
    await s.replayAsync();
  } catch {}
}

// Arrête tous les sons en cours (utile quand on quitte une partie en cours).
// Invalide aussi les playSound en cours d'await, pour éviter qu'un son
// se déclenche juste APRÈS l'abandon.
export async function stopAllSounds() {
  epoch++;
  await Promise.allSettled(
    (Object.keys(loaded) as SoundKey[]).map(async (key) => {
      const s = loaded[key];
      if (!s) return;
      try { await s.stopAsync(); } catch {}
    }),
  );
}
