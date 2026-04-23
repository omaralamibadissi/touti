# Changelog — règles du jeu

Historique des modifications des **règles** de Touti implémentées dans le
moteur (`shared/src/engine/touti.ts`) et documentées dans `docs/rules.md`.

Ce fichier ne liste **que** les changements de règles. Pour les modifs de
code, UI, serveur, voir `git log`.

Format : date · changement · impact joueur · commit court.

---

## 2026-04-24

### Ghna — le buyer est désormais le seul arbitre
**Avant** : chaque membre de l'équipe qui avait une paire Rey+Caballo
pouvait annoncer sa Ghna de son propre chef après un pli gagné par son
équipe.

**Maintenant** : seul l'acheteur (gagnant des enchères, `bidWinner`) décide.
À chaque pli gagné par son équipe, il peut :
- chanter une de ses propres paires,
- **autoriser son partenaire** à chanter une de ses paires à lui,
- passer (ne rien annoncer ce pli-ci).

Le partenaire ne peut plus chanter sans autorisation explicite du buyer,
même s'il a les cartes.

**Impact joueur** : le buyer garde le contrôle stratégique de la gestion du
plafond d'équipe. Il peut arbitrer "je prends mes 40 d'abord ou je laisse
passer les 2×20 de mon partenaire".

Commit : `c84aca1`

---

## 2026-04-22

### IA peut miser jusqu'à 230 (plus plafonnée à 120)
**Avant** : `aiBid` refusait toute mise supérieure à 120.

**Maintenant** : `aiBid` peut miser jusqu'à `MAX_BID` (230) selon la force
de main, conformément aux règles.

**Impact joueur** : IA plus agressive quand elle a une très forte main.
Parties solo plus variées.

Commit : audit-fix

### Plafonds Ghna précisés
**Avant** (doc onboarding cassée) : "20/40/70/100 selon ta mise".

**Maintenant** (conforme à `docs/rules.md`) :
- Mise 70 → plafond **0** (aucune Ghna autorisée)
- Mise 80 → plafond **20** (max 1×Ghna 20)
- Mise 90 → plafond **40** (max 1×40 ou 2×20)
- Mise 100+ → plafond **100** (3×20 + 1×40 possible)

**Impact joueur** : clarification — l'engine appliquait déjà les bonnes
règles, c'est le texte de l'onboarding qui était faux.

### Règle du signal Ghna rejetée (ancienne version inventée)
**Avant** (texte onboarding inventé) : "Quand tu joues les 10 d'une couleur
dans l'ordre, tu annonces Ghna".

**Maintenant** : Ghna = **Caballo + Rey de la même couleur en main** au
moment où ton équipe gagne un pli. Pas de "10 dans l'ordre".

**Impact joueur** : retour à la vraie règle Touti.

### Enchères — borne haute 230 (pas 170)
**Avant** (texte onboarding cassé) : "70 à 170".

**Maintenant** : **70 à 230 par pas de 10**, conformément à `docs/rules.md`.

**Impact joueur** : possibilité de mises très hautes (170, 180, …, 230)
reflétées correctement dans les textes.

### Surcoupe obligatoire explicitée
Texte onboarding et tuto in-game étoffés pour préciser que si un atout est
déjà posé, on **doit** surcouper plus fort si on en a la capacité.
L'engine appliquait déjà cette règle, seul le texte a été complété.

---

## Ce qui n'a JAMAIS changé (rappel de règles)

- Paquet : 40 cartes espagnoles (4 couleurs × 10 rangs, pas de 8 ni 9)
- 4 joueurs, 2 équipes face à face (0+2 vs 1+3)
- Distribution : 5 par 5 anti-horaire
- Force des cartes : As > Triss (3) > Rey (12) > Caballo (11) > Sota (10) > 7 > 6 > 5 > 4 > 2
- Points cartes : As=11, Triss=10, Rey=4, Caballo=3, Sota=2, reste=0
- 9a3a : +10 pts au gagnant du dernier pli
- Objectif de partie : 600 points
- Signal "un As" ou "un Compte" : 1 fois max chacun par joueur et par tour d'enchères
- Signaler ferme l'accès à la mise (et inversement) pour ce joueur
