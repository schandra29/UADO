import fs from 'fs';
import path from 'path';

export interface PasteLogEntry {
  timestamp: string;
  file: string;
  bytesWritten: number;
  prompt: string;
  queueIndex: number;
  wasOverwrite: boolean;
  error?: string;
}

export function logPaste(entry: PasteLogEntry): void {
  const dir = path.join(process.cwd(), '.uado');
  const logPath = path.join(dir, 'paste.log.json');

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore mkdir errors
  }

  let log: PasteLogEntry[] = [];
  try {
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) log = parsed as PasteLogEntry[];
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
    // ignore write errors
  }
}
