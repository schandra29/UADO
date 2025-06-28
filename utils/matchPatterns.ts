export interface PatternEntry {
  prompt: string;
  file: string;
  outputSnippet: string;
  tag?: string;
  hash?: string;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function cosineSimilarity(a: string, b: string): number {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  const countsA: Record<string, number> = {};
  const countsB: Record<string, number> = {};
  for (const t of aTokens) countsA[t] = (countsA[t] || 0) + 1;
  for (const t of bTokens) countsB[t] = (countsB[t] || 0) + 1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [t, c] of Object.entries(countsA)) {
    normA += c * c;
    if (countsB[t]) dot += c * countsB[t];
  }
  for (const c of Object.values(countsB)) {
    normB += c * c;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findBestMatches(
  input: string,
  patterns: PatternEntry[],
  topN: number
): PatternEntry[] {
  const scored = patterns
    .map((p) => ({ score: cosineSimilarity(input, p.prompt), entry: p }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  return scored.map((s) => s.entry);
}
