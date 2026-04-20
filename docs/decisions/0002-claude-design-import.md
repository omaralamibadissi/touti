# ADR-0002 — Import du design depuis Claude Design

**Date :** 2026-04-20
**Statut :** Accepté

## Contexte

L'esquisse visuelle de Touti a été faite dans **Claude Design** (produit
Anthropic sorti le 17/04/2026). Le design a été exporté via
`Export → Download as .zip` → `touti-handoff.zip` déposé à la racine du repo,
puis désarchivé dans `design/extracted/touti/`.

Le bundle contient :

- `touti/README.md` — consignes pour l'agent de code
- `touti/project/Touti.html` — entry point (wrapper app + grille des écrans)
- `touti/project/ui.jsx` — tokens (COLORS, fonts) + primitives (BrassButton, Avatar, OrnateFrame)
- `touti/project/patterns.jsx` — motifs (ZelligeBg, StarBurst, ArabesqueDivider)
- `touti/project/cards.jsx` — deck espagnol style "baraja" (SVG)
- `touti/project/ios-frame.jsx` — frame iOS (status bar, nav, keyboard)
- `touti/project/game-engine.jsx` — moteur de jeu local (tricks, AI)
- `touti/project/screen-home.jsx`, `screen-table.jsx`, `screen-others.jsx`

Le design est du **web React avec styles inline**. Cible : React Native + Expo.

## Décision

1. **Tokens → `mobile/src/theme.ts`** : palette (terracotta, saffron, brass, cream,
   felt, midnight…), fontFamily strings, shadows, radii, helper `shade()`.

2. **Motifs SVG → `mobile/src/components/Patterns.tsx`** en utilisant
   `react-native-svg`. Port 1-pour-1 de ZelligeBg, ArabesqueDivider, StarBurst.

3. **Primitives UI → `mobile/src/components/`** :
   - `BrassButton.tsx` (dégradé laiton, variants primary/ghost/danger)
   - `Avatar.tsx` (cercle dégradé + statut online + ring)

4. **Polices Google Fonts** via `@expo-google-fonts/inter` et
   `@expo-google-fonts/cormorant-garamond`. Chargement asynchrone dans `App.tsx`
   avec splash pendant le chargement.

5. **Écrans portés** (v1) :
   - `HomeScreen` — fidèle au design (hero TOUTI, CTA "Partie rapide",
     grille 2×2 de modes, friends list horizontal) + ajout d'un input pseudo
     pour la connexion Colyseus
   - `LobbyScreen` — reskin dans le style terracotta avec BrassButton
   - `GameScreen` — placeholder dans le style midnight (le plateau complet
     viendra dans un ADR séparé)

## Hors scope (pour l'instant)

- **Composant Card baraja** : le SVG des 4 couleurs (oros/copas/espadas/bastos)
  + figures royales (Sota/Caballo/Rey) est volumineux. À porter dans une
  itération dédiée quand on codera le plateau.
- **Écran de jeu complet** : `screen-table.jsx` est couplé à `game-engine.jsx`
  (logique locale). On branchera plutôt sur l'état Colyseus synchronisé côté
  `shared/` + `server/`.
- **Moteur de jeu local** (`game-engine.jsx`) : on n'en prend pas la logique,
  on garde Colyseus comme source de vérité. Il peut servir de référence pour
  les règles de Touti.

## Conséquences

- ✅ Identité visuelle cohérente sur tous les écrans existants
- ✅ Ré-utilisable : ajouter un nouvel écran part des mêmes tokens
- ⚠️ +16 packages npm (fonts, svg, gradient) — ~2 MB de plus dans le bundle
- ⚠️ Fallback nécessaire si la connexion internet est mauvaise au premier
  lancement (les Google Fonts sont téléchargées à l'usage avec cache)

## Fichiers source référence

Tout le bundle exporté reste dans `design/extracted/touti/` et est commité
— utile pour de futures itérations de design sans repasser par l'export.
