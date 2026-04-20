# Touti 🂡

Jeu de cartes **Touti** en ligne, mobile (iOS + Android), multijoueur temps réel.

**Stack :** Expo / React Native · TypeScript · Zustand · Colyseus · npm workspaces.

---

## Structure

```
touti-game/
├── CLAUDE.md              # contexte lu automatiquement par Claude Code
├── .claude/               # settings, commandes custom, plugins activés
│   ├── settings.json
│   └── commands/          # /sync, /new-feature
├── mobile/                # app Expo / React Native
│   ├── App.tsx
│   └── src/
│       ├── screens/       # Home, Lobby, Game
│       ├── store/         # Zustand
│       └── net/           # client Colyseus
├── server/                # serveur Colyseus
│   └── src/
│       ├── index.ts
│       └── rooms/         # GameRoom + schema
├── shared/                # types + protocole partagés
│   └── src/
└── package.json           # monorepo npm workspaces
```

## Prérequis

- Node 20+
- npm 10+
- Expo Go sur ton téléphone (App Store / Play Store) pour tester rapidement

## Installation

```bash
cd touti-game
npm install
```

## Lancer en dev

Dans **deux terminaux** :

```bash
# Terminal 1 — serveur de jeu
npm run dev:server
# → http://localhost:2567 (dashboard Colyseus sur /colyseus)

# Terminal 2 — app mobile
npm run dev:mobile
# → scanne le QR code avec Expo Go
```

Si ton téléphone n'est pas sur le même réseau que ton ordi, remplace
`ws://localhost:2567` dans `mobile/app.json` → `extra.SERVER_URL` par l'IP locale
de ton ordi (ex. `ws://192.168.1.42:2567`).

## Workflow 2 ordinateurs

Un seul principe : **tout passe par Git**. Pas de copie manuelle.

### Setup initial (à faire une seule fois)

```bash
# Ordi 1 — créer le repo local et le pousser
cd touti-game
git init
git add .
git commit -m "chore: initial scaffold"
gh repo create touti-game --private --source=. --push
# (ou crée le repo à la main sur github.com puis git remote add + git push)
```

### Sur l'ordi 2 — récupérer le projet

```bash
git clone git@github.com:<ton-user>/touti-game.git
cd touti-game
npm install
```

### Au quotidien

```bash
# Avant de coder
git pull --rebase

# ... tu codes ...

# En fin de session
git add .
git commit -m "feat: ..."
git push
```

Les fichiers `CLAUDE.md` et `.claude/` sont versionnés → Claude Code retrouve
automatiquement le même contexte et les mêmes plugins sur les deux ordis.

## Plugins Claude Code utilisés

- **design** — critique UI, design system, handoff, UX copy, Figma MCP
- **engineering** — ADR, testing strategy, docs techniques

Les deux sont déclarés dans `.claude/settings.json` et activés automatiquement
dans ce projet.

## Commandes slash custom

- `/sync` — pull / status / push guidé
- `/new-feature` — démarre une feature proprement (branche + TODO + plan)

## Prochaines étapes

Voir la section **TODO majeurs** de [`CLAUDE.md`](./CLAUDE.md).
