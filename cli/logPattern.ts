import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PatternEntry {
  prompt: string;
  file: string;
  outputSnippet: string;
  tag: string;
  hash: string;
}

interface PatternsFile {
  [tag: string]: PatternEntry[];
}

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

export function logPattern(
  prompt: string,
  file: string,
  outputSnippet: string,
  tag = 'general'
): void {
  const dir = path.join(process.cwd(), '.uado');
  const patternsPath = path.join(dir, 'patterns.json');

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }

  let data: PatternsFile = {};
  try {
    if (fs.existsSync(patternsPath)) {
      const raw = fs.readFileSync(patternsPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        data = { general: parsed as PatternEntry[] };
      } else if (parsed && typeof parsed === 'object') {
        data = parsed as PatternsFile;
      }
    }
  } catch {
    data = {};
  }

  const hash = hashPrompt(prompt);

  const entries = Object.values(data).flat();
  if (entries.some((e) => e.hash === hash)) return;

  const entry: PatternEntry = { prompt, file, outputSnippet, tag, hash };
  if (!Array.isArray(data[tag])) data[tag] = [];
  data[tag].push(entry);

  try {
    fs.writeFileSync(patternsPath, JSON.stringify(data, null, 2));
  } catch {
    // ignore
  }
}
