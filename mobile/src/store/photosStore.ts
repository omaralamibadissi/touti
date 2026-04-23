// Cache en mémoire des photos de profil des autres utilisateurs.
// Chaque `usePhotoOf(name)` consulte le cache ; les inconnus sont poussés
// dans une batch-queue qui fetch toutes les 150ms pour coalescer les demandes
// (ex : un écran qui rend 20 avatars provoque 1 seule requête réseau).
//
// TTL 5 minutes — assez court pour refléter les changements, assez long pour
// qu'un écran ne spam pas le serveur. `invalidate(name)` permet au propriétaire
// de forcer un refresh après `updatePhoto`.

import { useEffect } from "react";
import { create } from "zustand";
import { fetchJson } from "../net/http";

const TTL_MS = 5 * 60 * 1000;

interface Entry {
  photo: string | null;
  fetchedAt: number;
}

interface State {
  cache: Record<string, Entry>;
  pending: Set<string>;
  _timer: ReturnType<typeof setTimeout> | null;
  getCached: (name: string) => string | null | undefined;
  requestFetch: (name: string) => void;
  _flush: () => Promise<void>;
  put: (name: string, photo: string | null) => void;
  invalidate: (name: string) => void;
}

export const usePhotosStore = create<State>((set, get) => ({
  cache: {},
  pending: new Set(),
  _timer: null,

  getCached: (name: string) => {
    if (!name) return null;
    const e = get().cache[name];
    if (!e) return undefined; // pas encore chargé
    if (Date.now() - e.fetchedAt > TTL_MS) return undefined; // expiré
    return e.photo;
  },

  requestFetch: (name: string) => {
    if (!name) return;
    const s = get();
    const c = s.cache[name];
    if (c && Date.now() - c.fetchedAt <= TTL_MS) return; // déjà frais
    if (s.pending.has(name)) return; // déjà en cours
    const next = new Set(s.pending);
    next.add(name);
    set({ pending: next });
    // Débounce : on flush dans 150ms si rien d'autre n'arrive
    if (s._timer) clearTimeout(s._timer);
    const timer = setTimeout(() => {
      void get()._flush();
    }, 150);
    set({ _timer: timer });
  },

  _flush: async () => {
    const s = get();
    if (s.pending.size === 0) return;
    const names = Array.from(s.pending);
    set({ pending: new Set(), _timer: null });
    try {
      const res = await fetchJson<{ photos: Record<string, string | null> }>(
        "/users/photos",
        { method: "POST", body: JSON.stringify({ names }) },
      );
      const now = Date.now();
      const cache = { ...get().cache };
      for (const n of names) {
        cache[n] = { photo: res.photos[n] ?? null, fetchedAt: now };
      }
      set({ cache });
    } catch {
      // silencieux : on reessayera au prochain render qui voit un cache manquant
      const now = Date.now();
      const cache = { ...get().cache };
      for (const n of names) {
        // Marque comme fetched=null pour éviter de spam le serveur pendant TTL
        if (!cache[n]) cache[n] = { photo: null, fetchedAt: now };
      }
      set({ cache });
    }
  },

  put: (name, photo) => {
    if (!name) return;
    const cache = { ...get().cache };
    cache[name] = { photo, fetchedAt: Date.now() };
    set({ cache });
  },

  invalidate: (name) => {
    if (!name) return;
    const cache = { ...get().cache };
    delete cache[name];
    set({ cache });
  },
}));

// Hook qui retourne la photo d'un user. null = pas de photo (affiche
// l'initiale), undefined = pas encore chargé (idem affichage initiale le
// temps que la requête revienne).
export function usePhotoOf(name: string | null | undefined): string | null | undefined {
  const normalized = (name || "").trim();
  const cached = usePhotosStore((s) =>
    normalized ? s.cache[normalized] : undefined,
  );
  const requestFetch = usePhotosStore((s) => s.requestFetch);
  useEffect(() => {
    if (!normalized) return;
    if (cached && Date.now() - cached.fetchedAt <= TTL_MS) return;
    requestFetch(normalized);
  }, [normalized, cached, requestFetch]);
  if (!normalized) return null;
  if (!cached) return undefined;
  if (Date.now() - cached.fetchedAt > TTL_MS) return undefined;
  return cached.photo;
}
