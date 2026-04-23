// Logger structuré (pino). Source unique pour tout le serveur.
// En dev : sortie lisible humainement via pino-pretty.
// En prod (Fly) : sortie JSON brut, consommable par l'aggregateur de logs.

import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          translateTime: "HH:MM:ss",
        },
      },
  base: { env: isProd ? "prod" : "dev" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper pour créer un logger enfant lié à un contexte (ex. une room, un user).
// Exemple : const roomLog = childLogger({ room: "ABC123" });
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
