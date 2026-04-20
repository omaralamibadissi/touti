# ADR-0001 — Monorepo en npm workspaces (mobile + server + shared)

**Date :** 2026-04-20
**Statut :** Accepté

## Contexte

Le projet comporte trois surfaces (app mobile, serveur de jeu, types partagés)
qui évoluent ensemble. Une modification des types doit se propager partout
sans désynchronisation.

## Décision

Utiliser **npm workspaces** avec trois packages : `mobile`, `server`, `shared`.
Le package `shared` expose directement son `src/index.ts` (pas de build step
requis pour le dev) et est référencé en `"@touti/shared": "*"` par mobile et
server.

## Conséquences

- ✅ Un seul `npm install` à la racine
- ✅ Types partagés sans publication
- ✅ Facile de refactor un type et voir l'impact des deux côtés
- ⚠️ Metro (Expo) doit pouvoir résoudre `@touti/shared` — géré via le `paths`
  dans `mobile/tsconfig.json` + la résolution node_modules hoistée
- ⚠️ Pour build le server en prod, compiler `shared` avant (`npm run build:shared`)

## Alternatives envisagées

- pnpm / Turborepo : plus puissant mais overkill à ce stade
- 3 repos séparés : trop de friction pour un solo dev
