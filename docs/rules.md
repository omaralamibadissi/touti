# Touti — Règles officielles

> Source de vérité pour l'implémentation (serveur + client). Si la logique du
> code diverge de ce fichier, c'est le code qui a tort.

## But

- 4 joueurs, 2 équipes de 2 (partenaire en face).
- Première équipe à **600 points** gagne la partie. Une partie = plusieurs manches.

## Jeu de cartes

Paquet espagnol **40 cartes** — 4 couleurs × 10 cartes.

| Darija arabizi | FR          | Code interne (Suit) |
|----------------|-------------|---------------------|
| Lekhel         | Bâtons      | `bastos`            |
| Koubbas        | Coupes      | `copas`             |
| Dheb           | Pièces d'or | `oros`              |
| Chbada         | Épées       | `espadas`           |

**Rangs présents (rank) :** 1, 2, 3, 4, 5, 6, 7, 10, 11, 12
(pas de 8, 9 — et les figures sont 10=Sota / 11=Caballo / 12=Rey).

## Valeur des cartes (force & points)

Ordre de force décroissant + points :

| Rang | Nom          | Force | Points |
|------|--------------|-------|--------|
| 1    | As (Ace)     | 1er   | **11** |
| 3    | Triss        | 2e    | **10** |
| 12   | Rey (Roi)    | 3e    | **4**  |
| 11   | Caballo (Cavalier) | 4e | **3** |
| 10   | Sota (Valet) | 5e    | **2**  |
| 7    | —            | 6e    | 0      |
| 6    | —            | 7e    | 0      |
| 5    | —            | 8e    | 0      |
| 4    | —            | 9e    | 0      |
| 2    | —            | 10e   | 0      |

Total points en jeu par manche : **120 pts** (30 pts × 4 couleurs) + **10 pts** pour le dernier pli (9a3a) = **130 pts** minimum (hors Ghna).

## Atout (Tronfo)

- Jeu à atout. La couleur d'atout est choisie par l'équipe qui **remporte les enchères**.
- Un atout bat n'importe quelle carte d'une autre couleur.
- Entre atouts, la force standard s'applique.

## Phase d'enchères (Chra / Mzaida)

1. **Distribution** : 10 cartes par joueur, distribuées **5 par 5**, sens **anti-horaire**.
2. **Mâle** : joueur à la droite du distributeur — il ouvre les enchères.
3. **Enchères** : tour de rôle anti-horaire. Chacun annonce un **multiple de 10**
   ≥ 70 (70, 80, 90, …, jusqu'à **230 max**), ou "**passe**". Le chiffre = objectif
   de points que l'équipe s'engage à atteindre.
4. **Info partenaire** : à son tour, un joueur peut annoncer "**un As**" ou
   "**un Compte**" au lieu d'enchérir, pour signaler sa force.
   - **Signaler ferme ton accès aux enchères** : tu ne peux plus enchérir
     après (seulement passer ou signaler l'autre type).
   - **Enchérir ferme ton accès au signal** (même si tu passes ensuite).
   - Chaque type de signal (As / Compte) n'est utilisable qu'**une seule fois
     par phase** : si tu as 3 As, tu ne dis "un As" qu'une fois.
   - **Fin automatique** : dès qu'un signal est fait et qu'il ne reste plus
     que le plus haut enchérisseur en course (tous les autres ont passé ou
     signalé), les enchères se ferment immédiatement — pas besoin de refaire
     un tour complet.
5. **Fin des enchères** : quand tous les autres ont passé, le gagnant choisit
   la couleur d'atout. Si les 4 passent : le Mâle redistribue, nouvelle manche.
6. **Paliers & Ghna** :
   - Mise 70 → aucune Ghna garantie
   - Mise 80 → une Ghna de 20 pts possible
   - Mise 90 → une Ghna de 40 pts (atout) possible
   - Mise 100+ → toutes combinaisons de Ghna possibles

## Déroulement d'un pli

Le joueur qui a la main pose n'importe quelle carte. Les autres **dans l'ordre**
tentent :

1. Si tu as la couleur demandée :
   - **Tu dois jouer une carte plus haute que la plus haute déjà posée** — si tu en as une.
   - **Exception** : si un joueur a déjà coupé avec un atout, tu n'es **plus obligé de monter** (l'atout bat déjà tout). Tu joues alors n'importe quelle carte de la couleur.
2. Sinon (pas la couleur), obligation d'atout si possible.
   - Si un atout a déjà été posé et que tu as un atout **plus fort**, tu dois
     **surcouper** (jouer un atout supérieur).
3. Sinon, n'importe quelle carte.

**Gagnant du pli :** l'atout le plus fort, ou à défaut la carte la plus forte
de la couleur de départ. Il ramasse le pli et ouvre le suivant.

## Ghna (annonce de bonus)

Un joueur a dans sa main **Caballo + Rey** de la **même couleur** :

- Ghna dans la couleur d'**atout** → **40 pts**
- Ghna dans une **autre couleur** → **20 pts**

**Conditions** :

- L'équipe du joueur doit avoir **gagné les enchères**.
- Ghna 20 pts → mise minimum **80**.
- Ghna 40 pts → mise minimum **90**.
- Doit être annoncée **juste après qu'un pli soit gagné** par l'annonceur ou
  son partenaire. Sinon il faut attendre le prochain pli gagné.
- **Un seul Ghna par pli** maximum.

## Fin de manche

- La manche finit quand les joueurs n'ont plus de cartes (10 plis joués).
- Le vainqueur du **dernier pli** gagne **+10 pts** (la **9a3a**).
- Si l'équipe qui a gagné les enchères **atteint ou dépasse son objectif** :
  elle marque **sa mise** (ex : 90 pts si elle avait misé 90).
- Sinon : c'est l'**équipe adverse** qui marque la mise.

## Fin de partie

Première équipe à **600 points** gagne.
