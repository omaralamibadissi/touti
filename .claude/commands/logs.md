---
description: Lire les logs des serveurs en cours (Colyseus + Expo/Metro)
---

Objectif : lire les logs des processus qui tournent dans un autre terminal
(lancés par `Lancer Touti web.command`) pour voir les erreurs de build, les
stack traces, les messages de Colyseus, etc.

Les logs sont dans `.logs/` à la racine du projet :
- `.logs/server.log` — sortie du serveur Colyseus (`tsx watch src/index.ts`)
- `.logs/web.log` — sortie d'Expo Metro + bundle web

Étapes :

1. Montre à Omar les 80 dernières lignes de chaque log :
   - `tail -80 .logs/server.log`
   - `tail -80 .logs/web.log`
2. Identifie les erreurs (lignes "ERROR", "Error:", "Failed", stack traces)
3. Propose un fix. Si c'est un souci de deps / config, modifie le fichier concerné
   (ex: `mobile/babel.config.js`, `mobile/app.json`, `mobile/metro.config.js`)
4. Pour relancer après un fix, demande à Omar de fermer la fenêtre Terminal
   "Lancer Touti web" puis de double-cliquer à nouveau le script sur le Desktop.

Ne tue JAMAIS les processus toi-même (`pkill`, `kill`) — Omar gère la fenêtre
qui les héberge.
