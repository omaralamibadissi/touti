// Intégration Sentry (crashes + perf) côté serveur.
// Tout l'init est gardé par la présence de SENTRY_DSN — donc le serveur
// fonctionne à l'identique si la var n'est pas set (ex. dev local).

import * as Sentry from "@sentry/node";
import { logger } from "./logger";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("[sentry] SENTRY_DSN absent → Sentry désactivé");
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "dev",
    // Performance tracing : 20 % des requêtes échantillonnées. Suffisant
    // pour détecter les lenteurs, sans exploser la facture Sentry.
    tracesSampleRate: 0.2,
    // Ajoute les infos utiles (release, serverName) à chaque event.
    release: process.env.FLY_ALLOC_ID ?? "local",
  });
  logger.info(
    { tracesSampleRate: 0.2, release: process.env.FLY_ALLOC_ID ?? "local" },
    "[sentry] initialisé",
  );
}

export { Sentry };
