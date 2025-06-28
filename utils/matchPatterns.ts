export interface PatternEntry {
  prompt: string;
  file: string;
  outputSnippet: string;
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter(Boolean));
}

function similarity(a: string, b: string): number {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.size === 0 && bTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) intersection++;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function findBestMatches(
  input: string,
  patterns: PatternEntry[],
  topN: number
): PatternEntry[] {
  const scored = patterns
    .map((p) => ({ score: similarity(input, p.prompt), entry: p }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  return scored.map((s) => s.entry);
}
