import fs from 'fs';
import path from 'path';
import { PasteLogEntry } from './logPaste';
import { printError, printInfo, printSuccess } from './ui';
import { runGuardrails } from './guardrails';
import { loadConfig } from '../core/config-loader';
import { sleep } from '../lib/utils/sleep';

export interface QueueLogEntry {
  queueIndex: number;
  prompt: string;
  timestamp: string;
  files: Array<PasteLogEntry & { output?: string }>;
}

export async function runReplayCommand(
  indexStr: string,
  configPath?: string,
  bypassGuardrails?: boolean,
  dryRun?: boolean
): Promise<void> {
  const index = parseInt(indexStr, 10);
  if (Number.isNaN(index)) {
    printError('Invalid queue index');
    return;
  }

  const logPath = path.join(process.cwd(), '.uado', 'queue.log.json');
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (err: any) {
    printError(`Failed to read queue log: ${err.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    printError('Queue log is not in the expected format.');
    return;
  }

  const entries = data as QueueLogEntry[];
  const entry = entries.find((e) => e.queueIndex === index);
  if (!entry) {
    printError(`Queue entry #${index} not found.`);
    return;
  }

  const cfg = loadConfig(configPath);

  printInfo(`\n🔁 Replaying queue entry #${index}...`);

  for (const file of entry.files) {
    const dest = path.join(process.cwd(), file.file);
    const exists = fs.existsSync(dest);
    if (exists && file.wasOverwrite === false) {
      printError(`Skipped existing file: ${file.file}`);
      continue;
    }

    try {
      runGuardrails({ snippets: [file.output || ''], bypass: bypassGuardrails });
      if (dryRun) {
        printInfo(`[dry-run] Would restore: ./${file.file} (${file.bytesWritten} bytes)`);
        continue;
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, file.output || '');
      printSuccess(`Restored: ./${file.file} (${file.bytesWritten} bytes)`);
    } catch (err: any) {
      printError(`Failed to restore ${file.file}: ${err.message}`);
    }
  }

  if (cfg.cooldownAfterWrite && !dryRun) {
    const ms = cfg.writeCooldownMs ?? 60_000;
    printInfo(`Cooling down for ${Math.round(ms / 1000)}s to let linter stabilize...`);
    await sleep(ms);
  }
}

