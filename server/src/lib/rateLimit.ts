// Rate-limit in-memory (simple token bucket par clé).
// Adapté au monolithe mono-instance Fly. Si scale-out à l'avenir : Redis.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitRule {
  /** Jetons max par fenêtre */
  capacity: number;
  /** Fenêtre en ms pour la recharge complète */
  windowMs: number;
}

// Tente de consommer 1 jeton pour la clé. Renvoie `true` si autorisé.
export function consume(key: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) {
    buckets.set(key, { tokens: rule.capacity - 1, lastRefill: now });
    return true;
  }
  // Recharge proportionnelle au temps écoulé
  const elapsed = now - b.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / rule.windowMs) * rule.capacity;
    b.tokens = Math.min(rule.capacity, b.tokens + refill);
    b.lastRefill = now;
  }
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

// Nettoie les buckets inactifs depuis > 10× windowMs (cleanup périodique léger)
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets.entries()) {
    if (now - b.lastRefill > 10 * 60 * 1000) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();
