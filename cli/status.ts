import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { loadConfig } from '../core/config-loader';
import { printInfo } from './ui';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show current configuration and log status')
    .action(function () {
      const { config: configPath, noGuardrails } = this.optsWithGlobals();
      const cfg = loadConfig(configPath);

      printInfo('\nConfiguration:');
      const entries: Array<[string, unknown]> = Object.entries(cfg);
      for (const [k, v] of entries) {
        printInfo(`- ${k}: ${JSON.stringify(v)}`);
      }
      printInfo(`- guardrails: ${noGuardrails ? 'disabled' : 'enabled'}`);

      const queuePath = path.join(process.cwd(), '.uado', 'queue.log.json');
      let queueSize = 0;
      try {
        const raw = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        if (Array.isArray(raw)) queueSize = raw.length;
      } catch {
        queueSize = 0;
      }
      printInfo(`\nQueue entries: ${queueSize}`);

      printInfo('\nActive logs:');
      const files = ['paste.log.json', 'queue.log.json', 'patterns.json'];
      const dir = path.join(process.cwd(), '.uado');
      for (const f of files) {
        const exists = fs.existsSync(path.join(dir, f));
        if (exists) printInfo(`- ${f}`);
      }
    });
}
