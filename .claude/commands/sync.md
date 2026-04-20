---
description: Synchroniser le repo entre les 2 ordis (pull + status + push si besoin)
---

Objectif : s'assurer que le repo local est à jour avec GitHub avant de coder,
et pousser les changements à la fin de la session.

1. `git status` — vérifier qu'il n'y a pas de travail non commité
2. Si dirty : demander à Omar s'il veut commiter / stash / abandonner
3. `git pull --rebase` sur la branche courante
4. Afficher un résumé de ce qui a changé
5. À la fin de la session, proposer `git push`

Ne fais JAMAIS de `git reset --hard` sans confirmation explicite.
