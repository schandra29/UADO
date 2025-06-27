import fs from 'fs';
import path from 'path';
import { printError } from './ui';

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

export interface PasteQueueEntry {
  queueIndex: number;
  prompt: string;
  timestamp: string;
  files: PasteLogEntry[];
}

export function logQueueEntry(entry: PasteQueueEntry): void {
  const dir = path.join(process.cwd(), '.uado');
  const logPath = path.join(dir, 'queue.log.json');

  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore mkdir errors
  }

  let log: PasteQueueEntry[] = [];
  try {
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) log = parsed as PasteQueueEntry[];
    } else {
      fs.writeFileSync(logPath, '[]', { flag: 'wx' });
    }
  } catch (err: any) {
    log = [];
    printError(`Failed to read queue log: ${err.message}`);
  }

  const nextIndex =
    log.length > 0
      ? Math.max(...log.map((e) => e.queueIndex || 0)) + 1
      : 1;

  entry.queueIndex = nextIndex;
  log.push(entry);

  try {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch {
    // ignore write errors
  }
}
