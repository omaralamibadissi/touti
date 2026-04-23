# Touti — Jeu de cartes mobile

> Fichier de contexte pour Claude Code. Lu automatiquement au début de chaque
> session. Garder ce fichier à jour.

## Objectif

Jeu de cartes **Touti** marocain (paquet espagnol 40 cartes, 4 joueurs en
2 équipes), jouable sur iOS et Android. À terme multijoueur temps réel.

## Stack

- **Monorepo npm workspaces** : `mobile/`, `server/`, `shared/`
- **mobile/** : Expo SDK 54 + React Native + TypeScript + React Navigation +
  Zustand. Cartes SVG via `react-native-svg-transformer`.
- **server/** : Node.js + Colyseus 0.16 + TypeScript (pas encore wiré au client)
- **shared/** : types TS partagés (`@touti/shared`)

## Commandes

```bash
# Installation (à la racine)
npm install

# Dev — Metro + Expo Go (à lancer dans Terminal natif, pas Claude Code)
cd mobile && npx expo start --go            # réseau local
cd mobile && npx expo start --go --tunnel   # pour partager avec un pote (via ngrok)

# Pour commander Metro depuis Claude (EXPO_TOKEN déjà en mémoire)
EXPO_TOKEN=... npm run dev:mobile

# Typecheck global
npm run typecheck
```

## Écrans (tous dans `mobile/src/screens/`)

- **Auth** : SplashScreenTransition, SignInScreen (Apple/Google/Facebook),
  UsernameSetupScreen
- **Home (bottom nav)** : HomeScreen, SocialScreen (amis + classement
  rapide/tournoi), ProfileScreen, SettingsScreen
- **Jeu** : GameScreen (table bois, IA, toutes les règles), RulesScreen,
  MatchHistoryScreen
- **Score IRL** : ScoreSheetsListScreen, ScoreTrackerScreen
- **Privé & tournois** : PrivateGameScreen, TournamentHomeScreen,
  CreateTournamentScreen, JoinTournamentScreen, TournamentDetailScreen

## Moteur de jeu

- `mobile/src/engine/touti.ts` — logique complète Touti en TypeScript pur
  (enchères, signaux, Ghna, surcoupe, scoring, rotation, IA). Réutilisable
  côté serveur plus tard.
- Règles écrites : `docs/rules.md`

## Conventions

- TypeScript strict partout
- Composants RN fonctionnels uniquement
- State global : **Zustand uniquement** (jamais Redux)
- Types partagés dans `shared/` — ne pas dupliquer
- Sons : fichiers optionnels dans `mobile/assets/sounds/` (haptics toujours
  actifs même sans son)

## Workflow 2 ordinateurs

- Repo synchronisé via Git + GitHub
- Toujours commencer par `git pull` et finir par `git push`

## Déploiement serveur

- **Fly.io** — app `kbirkbir-server`, région `cdg` (Paris)
- URL : https://kbirkbir-server.fly.dev (WSS : `wss://kbirkbir-server.fly.dev`)
- Config : `Dockerfile` + `fly.toml` à la racine
- Commandes :
  ```bash
  npm run deploy:server           # fly deploy
  npm run deploy:server:logs      # fly logs
  npm run deploy:server:status    # fly status
  ```
- Le serveur s'auto-suspend quand idle (wake ~300ms)

## TODO

**Fait :**
- [x] Déployer serveur Colyseus (Fly.io) — `kbirkbir-server.fly.dev`
- [x] Wirer le client mobile au serveur Colyseus (partie rapide + privée)
- [x] Tests logique de règles (Jest sur `engine/touti.ts`)
- [x] CI GitHub Actions : typecheck + tests à chaque push
- [x] Observabilité serveur : pino logs + Sentry + Resend (emails reports)
- [x] Musique du menu (Desert City, Kevin MacLeod CC-BY 3.0)
- [x] Nettoyage Settings (vitesse / vibrations / dos cartes / couleur table retirés)
- [x] Row Notifications → ouvre les réglages système
- [x] i18n FR / EN / AR complet (tous les écrans visibles)

**À faire :**
- [ ] Build EAS iOS (Apple Sign-In + TestFlight) — débloque OAuth natif
- [ ] Déclaration CNDP (Loi 09-08 Maroc) — obligatoire avant publi
- [ ] Apple / Google / Facebook OAuth réels (dépend du build EAS)
- [ ] Notifications push (amis, tournois, tour en partie asynchrone)
- [ ] Anti-triche — vérif côté serveur pour parties privées / solo
- [ ] Screenshots + textes App Store / Play Store
