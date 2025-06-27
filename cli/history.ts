import fs from 'fs';
import path from 'path';
import { PasteLogEntry } from './logPaste';
import { printInfo, printError, printTip } from './ui';

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
    printInfo('No paste history found yet.');
    printTip('Try running `uado prompt` or `uado paste` first!');
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  } catch (err: any) {
    printError(`Failed to read paste history: ${err.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    printError('Paste log is not in the expected format.');
    return;
  }

  const entries = (data as PasteLogEntry[]).slice();
  entries.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (entries.length === 0) {
    printInfo('No paste history found yet.');
    printTip('Try running `uado prompt` or `uado paste` first!');
    return;
  }

  for (const entry of entries) {
    const preview = entry.prompt.replace(/\s+/g, ' ').slice(0, 100);
    printInfo(`📄 ${chalk.cyan(entry.file)}`);
    printInfo(`  🕓 ${chalk.dim(entry.timestamp)}  🔠 ${entry.bytesWritten} bytes`);
    printInfo(`  🧠 ${chalk.gray(preview)}`);
    if (typeof entry.queueIndex === 'number') {
      printInfo(`  🧾 ${chalk.yellow(String(entry.queueIndex))}`);
      printInfo(chalk.dim(`  To replay this paste, run: uado replay ${entry.queueIndex}`));
    }
    printInfo('');
  }
}
