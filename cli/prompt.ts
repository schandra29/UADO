import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { once } from 'events';
import pino from 'pino';
import { logPaste, PasteLogEntry, PasteQueueEntry, logQueueEntry } from './logPaste';
import { logPattern } from './logPattern';
import { createCooldownEngine } from '../core/cooldown-engine';
import { createOrchestrator } from '../core/orchestrator';
import { loadConfig } from '../core/config-loader';
import { printSuccess, printError, printInfo } from './ui';
import { runGuardrails } from './guardrails';
import { sleep } from '../lib/utils/sleep';
import { findBestMatches, PatternEntry } from '../utils/matchPatterns';
import { computeHash } from '../utils/hash';
import { saveSnapshot } from './snapshot';
import { validateCode } from './validate';
import { logReview } from './logReview';

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
    .option('--dry-run', 'Simulate file writes without saving')
    .option('--tag <tag>', 'tag for pattern logging')
    .option('--force', 'Write even if linting fails')
    .action(async function (text?: string) {
      const { config: configPath, simulateQueue, tag, noGuardrails, dryRun, force } = this.optsWithGlobals();
      const cfg = loadConfig(configPath);
      const logger = pino({ name: 'uado', level: cfg.logLevel });
      const startTime = Date.now();
      let destRelWritten: string | undefined;

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
        printError('No prompt text provided. Run `uado prompt "your text"` or see `uado prompt -h`.');
        return;
      }

      const originalText = text;
      if (cfg.enablePatternInjection) {
        const patternsPath = path.join(process.cwd(), '.uado', 'patterns.json');
        try {
          const raw = fs.readFileSync(patternsPath, 'utf8');
          let patterns: PatternEntry[] = [];
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            patterns = parsed as PatternEntry[];
          } else if (parsed && typeof parsed === 'object') {
            for (const arr of Object.values(
              parsed as Record<string, PatternEntry[]>
            )) {
              if (Array.isArray(arr)) patterns = patterns.concat(arr);
            }
          }
          const matches = findBestMatches(text, patterns, 2);
          if (matches.length > 0) {
            const injection = matches
              .map((m) => `Prompt: ${m.prompt}\nOutput:\n${m.outputSnippet}`)
              .join('\n---\n');
            text = `${injection}\n\n${text}`;
            logger.info(
              { usedPatterns: matches.map((m) => m.file) },
              'pattern injection applied'
            );
          } else {
            logger.info('pattern injection enabled but no matches found');
          }
        } catch (err: any) {
          logger.warn({ err }, 'failed to load patterns for injection');
        }
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
              bytesWritten: Buffer.byteLength(response),
              prompt: text,
              queueIndex: 1,
              wasOverwrite
            };

            runGuardrails({ snippets: [response], bypass: noGuardrails });

            const review = validateCode(response, dest);
            logReview({
              file: destRel,
              result: review.passed ? 'passed' : 'failed',
              eslintErrors: review.eslintErrors,
              tscErrors: review.tscErrors,
              timestamp: new Date().toISOString()
            });
            if (review.passed) {
              printSuccess('✅ Success');
            } else {
              printError('⚠️ Failure');
              if (!force) {
                entry.error = 'lint or type errors';
                return 'Validation failed';
              }
            }

            if (dryRun) {
              printInfo(`[dry-run] Would save: ${destRel} (${entry.bytesWritten} bytes)`);
              const hash = computeHash(entry);
              saveSnapshot(response, hash);
              return `Dry run, file not written`;
            }

            try {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              fs.writeFileSync(dest, response);
              logger.info({ dest }, 'saved manual AI response');
              printSuccess(`File saved: ${destRel} (${entry.bytesWritten} bytes)`);
              const hash = computeHash(entry);
              saveSnapshot(response, hash);
              if (cfg.cooldownAfterWrite) {
                const ms = cfg.writeCooldownMs ?? 60_000;
                printInfo('🕐 Cooldown active… waiting for lint/test stabilization.');
                await sleep(ms);
              }
            } catch (err: any) {
              entry.error = err.message;
              logger.error({ err }, 'failed to save manual AI response');
              printError(`Failed to write to ${path.basename(dest)} — see error above.`);
            }

            logPaste(entry);
            if (!entry.error) {
              if (cfg.enablePatternInjection) {
                const snippet = response.slice(0, 200);
                logPattern(originalText, destRel, snippet, tag);
                printInfo('📈 Pattern added to .uado/patterns.json');
              }
              printInfo('📜 Logged in: .uado/paste.log.json');
              printInfo('🧠 Tip: Use `uado history` to view all past prompts!');
            }

            destRelWritten = destRel;
            return entry.error ? `Failed to write to ${dest}` : `Saved to ${dest}`;
          }
          return fakeCallAI(text);
        });
        clearTimeout(waitLog);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (!queued) {
          printSuccess('Prompt accepted');
        }
        if (cfg.mode !== 'manual') {
          printInfo(result);
        }
        if (destRelWritten) {
          printSuccess(`Saved ${destRelWritten} in ${elapsed}s`);
        }
      } finally {
        orchestrator.close();
      }
    });
}
