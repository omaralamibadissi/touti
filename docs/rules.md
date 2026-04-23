# Touti — Règles complètes

> Guide accessible à tous. Si c'est ta première partie, lis dans l'ordre.
> Ce fichier est **la source de vérité** pour le code : en cas de divergence,
> c'est le code qui est bogué, pas les règles.

---

## 1. Vue d'ensemble

**Touti** est un jeu de cartes marocain à **plis** avec **enchères**, joué à
**4 joueurs en 2 équipes de 2**. Les partenaires sont **face à face** autour
de la table. La première équipe à atteindre **600 points** gagne la partie.

Une **partie** = plusieurs **manches** jusqu'à ce qu'une équipe dépasse 600.
Une **manche** = une distribution + une phase d'enchères + 10 plis joués.

**Principe simple** : à chaque manche, une équipe **promet** (mise aux
enchères) d'atteindre un certain score. Si elle réussit, elle marque sa
promesse. Sinon, c'est l'équipe adverse qui la marque.

---

## 2. Le paquet (40 cartes)

On joue avec un **paquet espagnol** de 40 cartes, réparties en **4 couleurs**
de 10 cartes chacune.

| Darija (arabizi) | Français        | Code interne |
|------------------|-----------------|--------------|
| **Lekhel**       | Bâtons          | `bastos`     |
| **Koubbas**      | Coupes          | `copas`      |
| **Dheb**         | Pièces d'or     | `oros`       |
| **Chbada**       | Épées           | `espadas`    |

Chaque couleur contient les **rangs** : 1, 2, 3, 4, 5, 6, 7, 10, 11, 12.
(Pas de 8 ni de 9.) Les figures sont :

- **Sota** = rang 10 (Valet)
- **Caballo** = rang 11 (Cavalier)
- **Rey** = rang 12 (Roi)

---

## 3. Valeur et force des cartes

Chaque carte a **deux** caractéristiques distinctes :

- Sa **force** (qui bat qui dans un pli)
- Ses **points** (ce que capturer le pli rapporte)

Ordre du plus FORT au plus faible :

| Rang | Nom        | Force | Points |
|------|------------|-------|--------|
| 1    | **As**     | 1ᵉʳ   | **11** |
| 3    | **Triss**  | 2ᵉ    | **10** |
| 12   | **Rey**    | 3ᵉ    | **4**  |
| 11   | **Caballo**| 4ᵉ    | **3**  |
| 10   | **Sota**   | 5ᵉ    | **2**  |
| 7    | Sept       | 6ᵉ    | 0      |
| 6    | Six        | 7ᵉ    | 0      |
| 5    | Cinq       | 8ᵉ    | 0      |
| 4    | Quatre     | 9ᵉ    | 0      |
| 2    | Deux       | 10ᵉ   | 0      |

**À retenir** :

- L'**As** est la carte la plus forte ET celle qui vaut le plus (11 pts).
- Le **Triss** (3) est la 2ᵉ plus forte (10 pts) — attention, la carte « 2 »
  est au contraire la plus faible.
- Seules les 5 cartes « hautes » (1, 3, 10, 11, 12) rapportent des points.

Total de points dans une manche :

- **120 pts** de cartes (30 pts par couleur × 4)
- **+10 pts** pour le gagnant du dernier pli (la **9a3a**)
- **+ éventuellement** des points de **Ghna** (voir section 7)

Soit **130 pts minimum** par manche, plus selon les Ghna annoncées.

---

## 4. L'atout (Tronfo)

Touti est un jeu **à atout**, c'est-à-dire qu'une couleur est déclarée
« maîtresse » pour la manche. Toute carte d'atout bat toute carte des 3
autres couleurs.

- L'atout est choisi **par l'équipe qui a gagné les enchères**, plus
  précisément par le **joueur qui a placé la plus haute mise**.
- Le choix est fait **après** la phase d'enchères, avant le premier pli.

Entre deux atouts, c'est la **force normale** qui décide (As > Triss > Rey > …).

---

## 5. Distribution et préliminaires

Avant chaque manche :

1. Le **distributeur** tourne (rotation anti-horaire à chaque manche).
2. Il distribue les cartes **5 par 5**, dans le **sens anti-horaire**, pour
   que chaque joueur ait 10 cartes en main.
3. Le **Mâle** (le joueur à droite du distributeur) **parle en premier**
   pour les enchères.

---

## 6. Phase d'enchères (Chra)

C'est ici que les équipes se jaugent. Le but : estimer combien de points
ton équipe pense capturer dans cette manche.

### 6.1 Comment ça se passe

L'ordre est **anti-horaire** en partant du Mâle. Chacun à son tour doit
faire **l'une de ces actions** :

- **Enchérir** (dire un nombre) — ce nombre est un **multiple de 10** entre
  **70 et 230**. Ton nombre doit être **strictement supérieur** à la dernière
  mise faite.
- **Passer** — tu renonces à enchérir. Tu n'auras plus le droit de parler.
- **Signaler** — donner une info à ton partenaire (voir section 6.3).

Quand tous les autres ont passé ou signalé, le dernier enchérisseur
**gagne** les enchères. C'est lui qui choisira l'atout.

### 6.2 Exemple de tour d'enchères

Imaginons Ali (Mâle), Karim, Omar, Salma (dans l'ordre anti-horaire) :

```
Ali    → 70
Karim  → 80
Omar   → passe
Salma  → 90
Ali    → passe
Karim  → 100
Omar   → (déjà passé, il est out)
Salma  → passe
Ali    → (déjà passé)
→ Karim gagne avec 100. Il choisit l'atout.
```

### 6.3 Les signaux (As / Compte)

À son tour, **au lieu d'enchérir**, un joueur peut donner une **info** à son
partenaire :

- **« Un As »** → je détiens au moins un As en main
- **« Un Compte »** → je détiens au moins un **10/11/12** de valeur (Rey,
  Caballo, Sota — ce qu'on appelle des « cartes qui comptent »)

**Règles importantes sur les signaux** :

- **Signaler ≠ enchérir** : si tu signales, tu ne peux **plus enchérir**
  dans cette phase. Tu peux seulement passer ou signaler l'autre type.
- **Enchérir ferme ton accès au signal** : une fois que tu as enchéri (même
  une seule fois), tu ne pourras **plus jamais signaler** dans cette phase.
- Chaque type de signal n'est utilisable **qu'une seule fois** par phase :
  si tu as 3 As, tu n'annonces « un As » qu'une fois.
- **Fermeture automatique** : dès qu'il ne reste plus que le plus haut
  enchérisseur « en course » (tous les autres ont passé ou signalé),
  les enchères se ferment immédiatement — pas besoin de refaire un tour.

### 6.4 Si les 4 joueurs passent

Personne n'a eu le courage d'enchérir. Alors :

- Les cartes sont **rendues**
- Le distributeur **passe au suivant** (rotation anti-horaire)
- Nouvelle distribution → on recommence les enchères

### 6.5 Paliers & Ghna (ce que la mise débloque)

La mise que tu fais conditionne le **plafond de points de Ghna** que ton
équipe pourra annoncer pendant la manche. Voir section 7 pour ce qu'est
une Ghna.

| Ta mise | Points de Ghna max que ton équipe peut annoncer |
|---------|------------------------------------------------|
| 70      | **0 pt** (aucune Ghna autorisée)                |
| 80+     | **20 pts** max (donc au plus 1 × Ghna 20)       |
| 90+     | **40 pts** max (1 × 40, OU 2 × 20)              |
| 100+    | **100 pts** max (quasi illimité — 3×20 + 1×40)  |

---

## 7. La Ghna (annonce bonus)

Une **Ghna** est une annonce qui rapporte des points supplémentaires à ton
équipe, à condition d'avoir certaines cartes en main ET d'avoir gagné les
enchères.

### 7.1 Comment Ghna ?

Tu dois avoir dans ta main **le Caballo ET le Rey** de la **même couleur**
(la paire « royale » 11+12).

- Si les deux cartes sont dans la **couleur d'atout** → **Ghna 40 pts**
- Sinon (autre couleur) → **Ghna 20 pts**

### 7.2 Conditions strictes pour annoncer

1. Ton équipe doit avoir **gagné les enchères** (sinon pas de Ghna possible).
2. Le **total cumulé** de Ghna annoncées par ton équipe ne peut pas dépasser
   le **plafond** fixé par la mise (voir section 6.5).
3. Tu dois annoncer **juste après qu'un pli soit gagné** par toi ou ton
   partenaire. Si le pli est gagné par l'adversaire, tu attends.
4. **Un seul Ghna par pli** maximum (même s'il reste de la marge sur le
   plafond).

### 7.3 Exemple concret

Ton équipe a misé **90** → plafond = **40 pts**. Ton partenaire a Rey+Caballo
de Koubbas et Rey+Caballo de Dheb. L'atout est Dheb.

- Premier pli gagné par ton partenaire → il peut annoncer **Ghna Dheb (40)**
  ou **Ghna Koubbas (20)**. Il choisit Dheb (40 pts) → plafond atteint.
- Plus aucune Ghna possible pour cette manche (plafond saturé).

**Alternative** : il annonce d'abord Koubbas (20). Plus tard, sur un autre
pli gagné, il pourrait annoncer Dheb (40)… sauf que **20 + 40 = 60 > 40**.
Donc non, pas possible. Il ne peut annoncer qu'une seule de ces deux.

Avec une mise **100+**, les deux Ghna seraient possibles (60 ≤ 100).

### 7.4 Passer sur une Ghna

Quand tu as la possibilité d'annoncer, l'app te propose. Tu peux toujours
**choisir de ne rien annoncer** — stratégique si tu veux garder tes cartes
fortes pour les plis suivants.

---

## 8. Déroulement d'un pli

Un **pli** = chacun des 4 joueurs pose une carte, puis on détermine qui
gagne et ramasse les 4 cartes.

### 8.1 Qui ouvre le pli

- Pour le **1ᵉʳ pli** : c'est le **Mâle** (joueur à droite du distributeur
  initial).
- Pour les plis suivants : c'est le **vainqueur du pli précédent**.

Celui qui ouvre peut poser **n'importe quelle carte** de sa main.

### 8.2 Les contraintes pour les 3 autres

Les 3 autres jouent chacun à leur tour (anti-horaire). Ils doivent
respecter cette hiérarchie de règles :

**Règle 1 — Si tu as la couleur demandée** (la couleur de la carte ouverte) :

- Tu dois jouer cette couleur.
- Tu dois **monter** (jouer une carte plus haute que la plus haute déjà
  posée) **si tu as une carte plus haute**.
- **Exception** : si quelqu'un a déjà **coupé** avec un atout (la couleur
  demandée n'est pas l'atout), tu n'es **plus obligé de monter**. Tu joues
  alors n'importe quelle carte de la couleur demandée.

**Règle 2 — Si tu n'as PAS la couleur demandée** :

- Si tu as un atout, tu **dois** en jouer un (on appelle ça **couper**).
- Si un atout a déjà été posé et que tu en as un **plus fort**, tu dois
  **surcouper** (jouer un atout supérieur).
- Si tu n'as aucun atout plus fort, tu peux jouer n'importe quel atout
  (même petit) ou, à défaut, n'importe quelle carte d'une autre couleur.

**Règle 3 — Si tu n'as ni la couleur ni atout** :

- Tu joues **n'importe quelle carte** (un défausse).

### 8.3 Qui gagne le pli

- Si au moins un atout a été joué : **l'atout le plus fort** gagne.
- Sinon : la **carte la plus forte de la couleur ouverte** gagne.

Le gagnant **ramasse les 4 cartes** (elles compteront pour son équipe à la
fin) et **ouvre le pli suivant**.

### 8.4 Exemple d'un pli

Atout = Koubbas (Coupes). Ali ouvre avec le **3 de Dheb** (Triss de
Pièces d'or, 10 pts).

- Karim n'a pas de Dheb → il a des Koubbas → il doit couper. Il joue le
  **10 de Koubbas** (Sota d'atout).
- Omar (partenaire d'Ali) a du Dheb → il joue le **Rey de Dheb**. Mais le
  pli est déjà coupé par atout, donc son Rey ne compte pas face à l'atout.
- Salma a aussi des Koubbas. Elle peut soit couper (mais doit surcouper →
  jouer atout plus fort que le 10 de Koubbas). Elle a le **As de Koubbas**
  → elle doit jouer l'As (surcoupe).

Vainqueur : Salma (As d'atout > 10 d'atout > toutes les autres cartes).
Points capturés dans le pli : 11 (As) + 2 (Sota) + 4 (Rey) + 10 (Triss) = **27 pts** pour l'équipe de Salma.

---

## 9. Fin de la manche

La manche finit quand **les 10 plis ont été joués** et que les mains sont
vides. On calcule les scores :

1. **Dernier pli = 9a3a** : le gagnant du 10ᵉ pli (et dernier) ajoute
   **+10 pts** au total de son équipe (pour ce pli).
2. Chaque équipe totalise les **points des cartes** qu'elle a capturées dans
   ses plis.
3. Si une équipe a annoncé des **Ghna**, elle ajoute ces points aussi.

### 9.1 Calcul du score de la manche

**L'équipe qui avait gagné les enchères** doit vérifier son objectif :

- Si son total de points (cartes + 9a3a + Ghna) **atteint ou dépasse sa
  mise** → elle marque **sa mise** au compteur (ex : misée 90 → marque 90).
- Sinon → c'est **l'équipe adverse** qui marque la mise (ex : si l'équipe
  qui avait misé 90 n'arrive qu'à 85 pts, les adversaires marquent 90).

**Important** : on ne marque jamais les points « capturés » directement — on
marque **la mise** de l'équipe qui a gagné les enchères, selon qu'elle a
réussi ou raté son objectif.

### 9.2 Exemple

- Équipe A mise 90. Atout = Koubbas.
- Fin de manche : équipe A a capturé 75 pts de cartes + 10 pts (dernier pli)
  + 20 pts (Ghna sur Dheb) = **105 pts** → objectif atteint.
- Équipe A marque **90** au total cumulé.

Si équipe A avait fait seulement 80 pts → elle rate sa mise → **Équipe B
marque 90**.

---

## 10. Fin de la partie

- On joue manche après manche.
- La **première équipe à atteindre ou dépasser 600 points** gagne la partie.

Il n'y a pas de limite théorique de manches — la partie dure jusqu'à ce
qu'une équipe y arrive. Une partie typique prend **3 à 17 manches** selon le
niveau des enchères.

---

## 11. Résumé rapide (aide-mémoire)

- **4 joueurs**, 2 équipes face à face. Objectif : **600 pts**.
- **Distribution** 5 par 5 anti-horaire, 10 cartes par joueur.
- **Enchères** : multiples de 10 entre 70 et 230, ou passe, ou signale
  (un As / un Compte). Signaler ferme les enchères ; enchérir ferme les
  signaux.
- **Atout** choisi par le meilleur enchérisseur.
- **Couleur obligatoire**, montée obligatoire (sauf pli coupé), atout
  obligatoire à défaut.
- **Ghna** : Rey + Caballo d'une couleur → 40 pts si atout, 20 sinon.
  Plafond par équipe : 70→0, 80→20, 90→40, 100+→100.
- **Dernier pli (9a3a)** : +10 pts au gagnant.
- **Objectif rempli → équipe qui mise marque sa mise ; raté → adversaire la marque.**

---

## 12. Termes darija / lexique

| Terme      | Signification                                    |
|------------|--------------------------------------------------|
| **Chra**   | Phase d'enchères                                 |
| **Mâle**   | Joueur qui parle en premier aux enchères         |
| **Tronfo** | Atout (la couleur maîtresse)                     |
| **Touti**  | Le nom du jeu                                    |
| **Sota**   | Valet (rang 10)                                  |
| **Caballo**| Cavalier (rang 11)                               |
| **Rey**    | Roi (rang 12)                                    |
| **Triss**  | Le 3 (2ᵉ carte la plus forte après l'As)         |
| **Ghna**   | Annonce bonus (Caballo + Rey de même couleur)    |
| **9a3a**   | Bonus +10 pts pour le gagnant du dernier pli     |

---

## 13. Conseils pour débuter

1. **Regarde tes As et tes Triss** avant d'enchérir — ces cartes rapportent
   plus de points et sont plus faciles à jouer gagnantes.
2. **Écoute les signaux du partenaire** — si ton partenaire annonce « un As »
   ou « un Compte », adapte ton enchère en conséquence.
3. **Ne bluffe pas trop haut** — 90 c'est une mise sérieuse. Tu vises
   50-60% des points minimum de ta main + celle du partenaire.
4. **Garde un atout en réserve** — toujours utile en fin de manche.
5. **Compte les atouts joués** — si tu sais qu'il ne reste plus d'atout chez
   les adversaires, tes cartes hautes peuvent passer.

Bon jeu !
