import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { once } from 'events';
import pino from 'pino';
import { logPaste, PasteLogEntry, PasteQueueEntry, logQueueEntry } from './logPaste';
import { createCooldownEngine } from '../core/cooldown-engine';
import { createOrchestrator } from '../core/orchestrator';
import { loadConfig } from '../core/config-loader';
import { printSuccess, printError, printInfo } from './ui';
import { sleep } from '../lib/utils/sleep';

function printPromptBox(text: string): void {
  const lines = text.split(/\r?\n/);
  const width = Math.max(...lines.map((l) => l.length));
  const top = '┌' + '─'.repeat(width + 2) + '┐';
  const bottom = '└' + '─'.repeat(width + 2) + '┘';
  printInfo(top);
  for (const line of lines) {
    const padded = line.padEnd(width);
    printInfo(`│ ${padded} │`);
  }
  printInfo(bottom);
}

async function collectManualResponse(): Promise<string> {
  printInfo('Paste AI response. Press Ctrl+D when done:');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines: string[] = [];
  rl.on('line', (line) => lines.push(line));
  await once(rl, 'close');
  return lines.join('\n');
}

export function registerPromptCommand(program: Command): void {
  program
    .command('prompt [text]')
    .description('Send a test prompt through the orchestrator')
    .option('--simulate-queue', 'Simulate queue logging')
    .action(async function (text?: string) {
      const { config: configPath, simulateQueue } = this.optsWithGlobals();
      const cfg = loadConfig(configPath);
      const logger = pino({ name: 'uado', level: cfg.logLevel });

      if (simulateQueue) {
        const files = ['foo.ts', 'bar.ts', 'baz.ts'];
        const entries: PasteLogEntry[] = [];
        for (const file of files) {
          const entry: PasteLogEntry = {
            timestamp: new Date().toISOString(),
            file,
            bytesWritten: Math.floor(Math.random() * 200) + 1,
            prompt: 'Simulated batch paste for queue testing',
            queueIndex: 0,
            wasOverwrite: false
          };
          logPaste(entry);
          entries.push(entry);
          printInfo(`📝 Simulated paste logged: ${file}`);
        }

        const qEntry: PasteQueueEntry = {
          queueIndex: 0,
          prompt: 'Simulated batch paste for queue testing',
          timestamp: new Date().toISOString(),
          files: entries
        };
        logQueueEntry(qEntry);
        printSuccess('Simulated queue entry logged.');
        return;
      }

      if (!text) {
        printError('No prompt text provided.');
        return;
      }

      const cooldown = createCooldownEngine({
        logger,
        timeoutMs: cfg.cooldownDurationMs,
        stableWindowMs: cfg.stabilityWindowMs
      });
      const orchestrator = createOrchestrator({ cooldownEmitter: cooldown, logger });

      const fakeCallAI = (input: string): Promise<string> =>
        new Promise((res) => setTimeout(() => res(`Response: ${input}`), 1000));

      // TODO: support a --dry-run flag
      // if (dryRun) {
      //   logger.info('Would execute prompt, but dry run is enabled.');
      //   return;
      // }

      let queued = false;
      cooldown.on('cooldown:active', () => {
        queued = true;
        printInfo('🔥 Cooldown active, queued prompt');
      });
      cooldown.on('cooldown:ended', () => {
        if (queued) {
          printSuccess('Prompt accepted');
          queued = false;
        }
      });

      const waitLog = setTimeout(() => {
        if (queued) {
          printInfo('🕒 Waiting...');
        }
      }, 200);

      try {
        const result = await orchestrator.wrapPrompt(async () => {
          if (cfg.mode === 'manual') {
            printPromptBox(text);
            const response = await collectManualResponse();
            const dest = path.join(process.cwd(), 'src/components/ui/MusicShareCard.tsx');
            const destRel = path.relative(process.cwd(), dest);
            const wasOverwrite = fs.existsSync(dest);
            const entry: PasteLogEntry = {
              timestamp: new Date().toISOString(),
              file: destRel,
              bytesWritten: 0,
              prompt: text,
              queueIndex: 1,
              wasOverwrite
            };
            try {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              fs.writeFileSync(dest, response);
              entry.bytesWritten = Buffer.byteLength(response);
              logger.info({ dest }, 'saved manual AI response');
              printSuccess(`File saved: ${destRel} (${entry.bytesWritten} bytes)`);
              if (cfg.cooldownAfterWrite) {
                const ms = cfg.writeCooldownMs ?? 60_000;
                printInfo(`Cooling down for ${Math.round(ms / 1000)}s to let linter stabilize...`);
                await sleep(ms);
              }
            } catch (err: any) {
              entry.error = err.message;
              logger.error({ err }, 'failed to save manual AI response');
              printError(`Failed to write to ${path.basename(dest)} — see error above.`);
            }
            logPaste(entry);
            if (!entry.error) {
              printInfo('📜 Logged in: .uado/paste.log.json');
              printInfo('🧠 Tip: Use `uado history` to view all past prompts!');
            }
            return entry.error ? `Failed to write to ${dest}` : `Saved to ${dest}`;
          }
          return fakeCallAI(text);
        });
        clearTimeout(waitLog);
          if (!queued) {
            printSuccess('Prompt accepted');
          }
          if (cfg.mode !== 'manual') {
            printInfo(result);
          }
      } finally {
        orchestrator.close();
      }
    });
}
