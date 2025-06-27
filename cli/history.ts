import fs from 'fs';
import path from 'path';
import { PasteLogEntry } from './logPaste';

let chalk: {
  cyan: (s: string) => string;
  gray: (s: string) => string;
  dim: (s: string) => string;
  yellow: (s: string) => string;
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  chalk = require('chalk');
} catch {
  chalk = {
    cyan: (s: string) => s,
    gray: (s: string) => s,
    dim: (s: string) => s,
    yellow: (s: string) => s
  };
}

export function runHistoryCommand(): void {
  const logPath = path.join(process.cwd(), '.uado', 'paste.log.json');

  if (!fs.existsSync(logPath)) {
    console.log('No paste history found yet.');
    console.log('Try running `uado prompt` or `uado paste` first!');
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (err: any) {
    console.log('Failed to read paste history:', err.message);
    return;
  }

  if (!Array.isArray(data)) {
    console.log('Paste log is not in the expected format.');
    return;
  }

  const entries = (data as PasteLogEntry[]).slice();
  entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (entries.length === 0) {
    console.log('No paste history found yet.');
    console.log('Try running `uado prompt` or `uado paste` first!');
    return;
  }

  for (const entry of entries) {
    const preview = entry.prompt.replace(/\s+/g, ' ').slice(0, 100);
    console.log(`📄 ${chalk.cyan(entry.file)}`);
    console.log(`  🕓 ${chalk.dim(entry.timestamp)}  🔠 ${entry.bytesWritten} bytes`);
    console.log(`  🧠 ${chalk.gray(preview)}`);
    if (typeof entry.queueIndex === 'number') {
      console.log(`  🧾 ${chalk.yellow(String(entry.queueIndex))}`);
      console.log(
        chalk.dim(`  To replay this paste, run: uado replay ${entry.queueIndex}`)
      );
    }
    console.log('');
  }
}
