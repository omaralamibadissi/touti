# Touti — Jeu de cartes mobile en ligne

> Fichier de contexte pour Claude Code. Tout ce qui est ici est lu automatiquement
> au début de chaque session. Garder ce fichier à jour = avoir un workflow fluide.

## Objectif

Construire un jeu de cartes **Touti** (jeu marocain, paquet espagnol 40 cartes,
4 joueurs en 2 équipes) en multijoueur temps réel, jouable sur iOS et Android.

Les règles exactes sont volontairement laissées à définir — on pose d'abord
l'infrastructure, on code les règles dans un second temps.

## Stack

- **Monorepo npm workspaces** : `mobile/`, `server/`, `shared/`
- **mobile/** : Expo SDK 51 + React Native + TypeScript + React Navigation + Zustand + `colyseus.js`
- **server/** : Node.js + Colyseus 0.15 + TypeScript (rooms, schema synchronisé)
- **shared/** : types TS partagés (Card, Player, GameState, messages) — importés via `@touti/shared`

## Commandes

```bash
# Installation initiale (à la racine)
npm install

# TOUT lancer + ouvrir Chrome (recommandé pour Omar)
# Double-clic sur "Lancer Touti web.command" sur le Desktop du projet
# → serveur + expo web, logs dans .logs/server.log et .logs/web.log

# Ou manuellement :
npm run dev:server          # http://localhost:2567 (monitor: /colyseus)
npm run dev:mobile          # Expo Go via QR
npm run dev:web             # preview web dans le navigateur

# Typecheck global
npm run typecheck
```

## Lire les logs en cours

Quand `Lancer Touti web.command` tourne, les logs sont dans `.logs/`. Pour les
consulter pendant une session de debug, utilise la slash command `/logs`.

## Architecture

- Le client (mobile) se connecte au serveur via WebSocket en utilisant `colyseus.js`
- Le serveur gère une `GameRoom` (4 joueurs max), synchronise automatiquement
  `GameState` via `@colyseus/schema`
- La main privée d'un joueur n'est **jamais** dans le state partagé : elle est
  envoyée via un message privé `"hand"` (voir `shared/src/protocol.ts`)

## Conventions de code

- TypeScript strict partout
- Composants RN fonctionnels uniquement (pas de class components)
- State global côté mobile : **Zustand uniquement** (pas de Redux)
- Les types partagés vivent dans `shared/` — ne jamais dupliquer dans `mobile/` ou `server/`
- Couleurs de l'UI : fond `#0b0f14`, accent `#2563eb`, succès `#16a34a`

## Workflow 2 ordinateurs

- Le repo est synchronisé via Git + GitHub
- Toujours commencer par `git pull` et finir par `git push`
- Les configs Claude Code (ce fichier + `.claude/`) sont versionnées → les
  plugins et le contexte suivent automatiquement

## Plugins Claude Code recommandés

- `design` (Figma + critique UI + handoff)
- `engineering` (ADR, testing strategy, docs)

## TODO majeurs

- [ ] Définir et implémenter les règles de Touti (distribution, atout, plis, scoring)
- [ ] Distinguer les mains privées via `room.send("hand", …)` et gérer la reconnexion
- [ ] Écran de jeu (plateau, main, plis joués)
- [ ] Matchmaking (créer / rejoindre une partie publique ou privée via code)
- [ ] Assets graphiques : cartes espagnoles (40), dos de carte, table
- [ ] Tests : logique de règles (Jest côté server/shared), scénarios multijoueur
- [ ] CI GitHub Actions : typecheck + tests à chaque push
- [ ] Déploiement serveur (Fly.io / Railway) et app (EAS Build)
