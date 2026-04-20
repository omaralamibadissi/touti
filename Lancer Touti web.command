#!/bin/bash
# Touti — lance tout en mode web, et logge vers des fichiers lisibles par Claude Code.
set -e
cd "$(dirname "$0")"

LOG_DIR=".logs"
mkdir -p "$LOG_DIR"
SERVER_LOG="$LOG_DIR/server.log"
WEB_LOG="$LOG_DIR/web.log"

echo "=== 1/4  Kill des anciens Metro / Expo / tsx ==="
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "node.*expo" 2>/dev/null || true
sleep 2

echo ""
echo "=== 2/4  npm install (deps à jour) ==="
npm install --no-audit --no-fund 2>&1 | tail -5

echo ""
echo "=== 3/4  Serveur Colyseus en arrière-plan → $SERVER_LOG ==="
: > "$SERVER_LOG"
(npm run dev:server >> "$SERVER_LOG" 2>&1) &
echo "Serveur PID=$! — Claude Code lit via : cat $SERVER_LOG"

echo ""
echo "=== 4/4  Expo web en arrière-plan → $WEB_LOG ==="
: > "$WEB_LOG"
(sleep 2 && open -a "Google Chrome" "http://localhost:8081") &
(npm run dev:web >> "$WEB_LOG" 2>&1) &
EXPO_PID=$!
echo "Expo PID=$EXPO_PID — Claude Code lit via : cat $WEB_LOG"
echo ""
echo "=== Tout tourne. Laisse cette fenêtre ouverte. ==="
echo "Logs vivants :"
echo "  tail -f $SERVER_LOG"
echo "  tail -f $WEB_LOG"
echo ""
echo "Pour arrêter : ferme cette fenêtre (Cmd+W) ou Ctrl+C."
echo ""

# Attendre que l'un des process enfant meure pour tenir la fenêtre
wait $EXPO_PID
