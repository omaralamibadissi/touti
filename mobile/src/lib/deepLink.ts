// Deep links pour partager codes (salons, ligues, tournois).
//
// Format : `touti://<kind>/<CODE>` — ouvre l'app (native build) et route vers
// l'écran correspondant. En Expo Go le scheme `exp+touti://` fonctionne aussi.
//
// Générateurs utilisés dans les écrans "partager". Le parser est utilisé par
// le listener `Linking` dans App.tsx pour router à l'arrivée.

export type DeepLinkKind = "private" | "quick" | "league" | "tournament";

export interface ParsedDeepLink {
  kind: DeepLinkKind;
  code: string;
}

const SCHEME = "touti";

export function buildLink(kind: DeepLinkKind, code: string): string {
  return `${SCHEME}://${kind}/${encodeURIComponent(code.toUpperCase())}`;
}

export const buildPrivateLink = (code: string) => buildLink("private", code);
export const buildQuickLink = (code: string) => buildLink("quick", code);
export const buildLeagueLink = (code: string) => buildLink("league", code);
export const buildTournamentLink = (code: string) => buildLink("tournament", code);

// Parse `touti://league/ABCD`, `exp+touti://league/ABCD`, ou variantes
// passées par les runtimes Expo (`.../--/league/ABCD`).
export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const stripped = url
      .replace(/^exp\+/, "")
      .replace(/^exp:\/\/[^/]+(\/--)?/, `${SCHEME}://`);
    const m = stripped.match(/^touti:\/\/([^/]+)\/([^/?#]+)/i);
    if (!m) return null;
    const kind = m[1].toLowerCase() as DeepLinkKind;
    const code = decodeURIComponent(m[2]).toUpperCase();
    if (!["private", "quick", "league", "tournament"].includes(kind)) return null;
    return { kind, code };
  } catch {
    return null;
  }
}
