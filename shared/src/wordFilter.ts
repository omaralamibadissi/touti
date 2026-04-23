// Filtre d'insultes — FR + darija/arabe latinisé + anglais.
// Utilisé côté serveur (chat Colyseus) ET côté client (bulle solo vs IA).
//
// Approche pragmatique : on masque les mots trouvés par des `***` plutôt que
// de rejeter le message. On détecte aussi les variantes avec chiffres-leet
// (3=e, 0=o, 1=i) et les répétitions de lettre (`puuute` → détecté comme `pute`).

const BAD_WORDS: string[] = [
  // FR
  "pute", "putain", "salope", "connard", "connasse", "encule", "enculer",
  "enculé", "enculee", "fdp", "tg", "ta gueule", "ntm",
  "bâtard", "batard", "bâtards", "batards", "pd", "pédé", "pede",
  "nique", "niquer", "niquée", "niquer ta", "niquer ta mere",
  "merde", "bordel",
  // Darija / arabe latinisé — insultes courantes
  "zamel", "zemmal", "kahba", "ka7ba", "q7ab", "q7be", "q7ba",
  "lah yen3al", "y3awed",
  "3ar", "3ari", "nik", "nikom", "nikmok",
  "hmar", "7mar",
  "kelb", "klab",
  "wld lkahba", "weld lkahba",
  // EN
  "fuck", "fucker", "shit", "bitch", "asshole", "dick", "pussy",
];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "@": "a", "$": "s", "!": "i",
};

function buildNormalized(original: string): { normalized: string; map: number[] } {
  const normalized: string[] = [];
  const map: number[] = [];
  let lastChar = "";
  for (let i = 0; i < original.length; i++) {
    const ch0 = original[i];
    const lower = ch0.toLowerCase();
    const ch = LEET[lower] ?? lower;
    if (ch === lastChar) continue;
    normalized.push(ch);
    map.push(i);
    lastChar = ch;
  }
  return { normalized: normalized.join(""), map };
}

export function sanitize(text: string): string {
  if (!text) return text;
  const { normalized, map } = buildNormalized(text);
  const out = text.split("");
  for (const word of BAD_WORDS) {
    let start = 0;
    while (true) {
      const idx = normalized.indexOf(word, start);
      if (idx < 0) break;
      const before = idx === 0 ? "" : normalized[idx - 1];
      const after = normalized[idx + word.length] ?? "";
      const isWordChar = (c: string) => /[a-z0-9]/.test(c);
      if (!isWordChar(before) && !isWordChar(after)) {
        const oStart = map[idx];
        const oEnd = map[idx + word.length - 1] ?? oStart;
        for (let k = oStart; k <= oEnd; k++) {
          if (out[k] && out[k] !== " ") out[k] = "*";
        }
      }
      start = idx + 1;
    }
  }
  return out.join("");
}

export function containsBadWord(text: string): boolean {
  const { normalized } = buildNormalized(text);
  for (const word of BAD_WORDS) {
    if (normalized.includes(word)) return true;
  }
  return false;
}
