# Sound assets

Effets sonores **Kenney** (CC0 / domaine public — aucune attribution requise).
Sources :
- https://kenney.nl/assets/casino-audio (card-shuffle, card-place)
- https://kenney.nl/assets/music-jingles (Pizzicato / Steel / Hit / NES jingles)
- https://kenney.nl/assets/ui-audio (click)
- https://kenney.nl/assets/interface-sounds (error)

Format : M4A/AAC 96 kbps (compromis qualité/taille, compatible iOS + Android).

| Fichier             | Joué quand                          | Source                         |
|---------------------|--------------------------------------|---------------------------------|
| `deal.m4a`          | Distribution des cartes              | casino/card-shuffle             |
| `card-play.m4a`     | Un joueur pose une carte             | casino/card-place-1             |
| `trick-win.m4a`     | Fin d'un pli                         | jingles/PIZZI00 (pizzicato)     |
| `round-end.m4a`     | Fin d'une manche                     | jingles/STEEL03 (steel)         |
| `game-win.m4a`      | Victoire (NOUS gagne)                | jingles/NES00 (8-bit triomphe)  |
| `game-lose.m4a`     | Défaite (EUX gagne)                  | jingles/HIT08                   |
| `bid.m4a`           | Poser une enchère                    | ui/click1                       |
| `tap-illegal.m4a`   | Tap sur une carte impossible à jouer | interface/error_008             |

Total : ~240 KB.

Le script `tools/gen_sounds.py` génère des sons procéduraux de secours (WAV).
