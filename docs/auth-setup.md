# Configuration OAuth — Apple / Google / Facebook

Ce guide t'accompagne pour obtenir les credentials nécessaires à la connexion
via les 3 providers. Tous les identifiants vont dans
`mobile/src/auth/config.ts`.

---

## 1. Google Sign-In (~15 min — gratuit)

**Pré-requis :** compte Google.

### Étapes

1. Va sur https://console.cloud.google.com/
2. Crée un nouveau projet (ex : "Touti Game").
3. Menu **APIs & Services → OAuth consent screen**
   - User Type : **External**
   - Remplis le nom de l'app ("Touti"), ton email, domaine autorisé
   - Scopes : ajoute `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
   - Sauvegarde
4. Menu **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**

   Tu dois créer **3 credentials** (un par plateforme) :

   **a) Web application (pour Expo Go)**
   - Nom : "Touti Web / Expo Go"
   - Authorized redirect URIs :
     - `https://auth.expo.io/@<TON-USERNAME-EXPO>/touti`
     - (Si t'as pas de username Expo : `https://auth.expo.io/@anonymous/touti`)
   - **Copie le Client ID** → `expoClientId` et `webClientId` dans config.ts

   **b) iOS**
   - Nom : "Touti iOS"
   - Bundle ID : `com.omar.touti`
   - **Copie le Client ID** → `iosClientId` dans config.ts

   **c) Android**
   - Nom : "Touti Android"
   - Package name : `com.omar.touti`
   - SHA-1 : celui de ton keystore (pour dev : `expo credentials:manager`)
   - **Copie le Client ID** → `androidClientId` dans config.ts

5. Remplis `mobile/src/auth/config.ts` avec les IDs.

---

## 2. Facebook Login (~15 min — gratuit)

**Pré-requis :** compte Facebook.

### Étapes

1. Va sur https://developers.facebook.com/apps/
2. **Create App** → type : "Consumer" → nom : "Touti"
3. Dans le dashboard, ajoute le produit **Facebook Login** → **Set up**
4. **Facebook Login → Settings** :
   - Client OAuth Login : **Yes**
   - Web OAuth Login : **Yes**
   - Valid OAuth Redirect URIs :
     - `https://auth.expo.io/@<TON-USERNAME-EXPO>/touti`
     - (ou `https://auth.expo.io/@anonymous/touti`)
5. **Settings → Basic** : récupère **App ID** (ex : `1234567890123456`)
6. Mets-le dans `mobile/src/auth/config.ts` → `facebook.appId`
7. Pour tester, bascule l'app en mode **Live** (ou ajoute-toi comme testeur dans Roles).

---

## 3. Apple Sign-In (⚠️ Expo Go non supporté)

**Pré-requis :**
- Mac (pour build iOS local) OU compte EAS Expo
- Apple Developer account — **gratuit** pour tester en simulateur, **$99/an**
  pour publier sur l'App Store

### Étapes

1. Va sur https://developer.apple.com/account/
2. **Certificates, Identifiers & Profiles → Identifiers**
3. Clique sur ton App ID `com.omar.touti` (ou crée-le si absent)
4. Active la capability **"Sign In with Apple"** → Save

### Pour tester réellement

Apple Sign-In ne marche **pas** dans Expo Go. Tu dois :

```bash
# Crée un dev build EAS (gratuit, cloud)
npx eas build --profile development --platform ios
```

Ou en local (nécessite Xcode) :
```bash
npx expo run:ios
```

Une fois le dev build installé sur ton appareil/simulateur, le bouton
"Continuer avec Apple" fonctionne.

Pendant que tu es en Expo Go, ce bouton affiche un message d'erreur et tu
peux utiliser Google/Facebook à la place.

---

## Remplir config.ts

Ouvre `mobile/src/auth/config.ts` et remplace les `REPLACE_ME_*` par les vraies valeurs :

```ts
export const AUTH_CONFIG = {
  google: {
    expoClientId: "1234567890-abc...apps.googleusercontent.com",
    iosClientId: "1234567890-def...apps.googleusercontent.com",
    androidClientId: "1234567890-ghi...apps.googleusercontent.com",
    webClientId: "1234567890-jkl...apps.googleusercontent.com",
  },
  facebook: {
    appId: "1234567890123456",
  },
  apple: {
    bundleId: "com.omar.touti",
  },
} as const;
```

Après modification : reload l'app Expo Go (secoue l'iPhone → Reload) ou
`npx expo start --clear` pour vider le cache Metro.

---

## Sécurité

Les credentials OAuth **client-side** (client IDs, app IDs) peuvent être
publics — ce ne sont pas des secrets. Par contre :

- **Ne jamais commiter** un `client_secret` côté mobile (il n'y en a pas ici
  avec expo-auth-session).
- Pour un vrai déploiement, il faudra un **backend** qui vérifie les tokens
  auprès du provider (Google / Apple / Facebook) avant de créer une session.
  Actuellement on fait confiance au client, ce qui est OK pour un prototype
  mais pas pour de la prod.
