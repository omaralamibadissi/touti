// Setup Expo push notifications :
//   - demande permission
//   - récupère le token ExponentPushToken[...]
//   - l'envoie au serveur via /auth/push-token
//
// Doit être appelé une fois l'utilisateur loggé (sinon pas de token serveur).

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiSetPushToken } from "../net/authApi";

// Quand l'app est en foreground et qu'une notif arrive : on affiche quand même
// la bannière (sinon silencieuse).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // iOS 15+ specific
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let registered = false;

export async function registerForPushNotifications(): Promise<string | null> {
  if (registered) return null;

  // Pas de push sur simulateur/emulator
  if (!Device.isDevice) {
    console.log("[push] skipped : not a physical device");
    return null;
  }

  try {
    // Android : besoin d'un channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E6AA44",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") {
      console.log("[push] permission denied");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResp.data;
    if (!token) return null;

    // Enregistre côté serveur
    await apiSetPushToken(token).catch((e) => {
      console.warn("[push] register failed:", e?.message);
    });
    registered = true;
    console.log("[push] registered:", token.slice(0, 30) + "…");
    return token;
  } catch (e: any) {
    console.warn("[push] setup failed:", e?.message);
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    await apiSetPushToken(null);
  } catch {}
  registered = false;
}
