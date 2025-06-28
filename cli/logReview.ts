import fs from 'fs';
import path from 'path';

export interface ReviewLogEntry {
  file: string;
  result: 'passed' | 'failed';
  eslintErrors: string[];
  tscErrors: string[];
  timestamp: string;
}

export function logReview(entry: ReviewLogEntry): void {
  const dir = path.join(process.cwd(), '.uado');
  const logPath = path.join(dir, 'review.log.json');

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }

  let log: ReviewLogEntry[] = [];
  try {
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) log = parsed as ReviewLogEntry[];
    } else {
      fs.writeFileSync(logPath, '[]', { flag: 'wx' });
    }
  } catch {
    log = [];
  }

  log.push(entry);
  try {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch {
    // ignore
  }
}

