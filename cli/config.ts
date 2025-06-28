import { Command } from 'commander';
import { loadConfig, UadoConfig } from '../core/config-loader';
import { printInfo } from './ui';

const EXPLAIN: Record<keyof UadoConfig, string> = {
  cooldownDurationMs: 'maximum time to stay in cooldown after a file change',
  stabilityWindowMs: 'how long to wait after LSP reports ready',
  logLevel: 'info, debug, or silent',
  mode: 'openai, claude, or manual copy/paste mode',
  cooldownAfterWrite: 'enable a delay after writing files',
  writeCooldownMs: 'cooldown duration when cooldownAfterWrite is enabled',
  enablePatternInjection: 'inject examples from .uado/patterns.json'
};

export function registerConfigCommand(program: Command): void {
  program
    .command('config')
    .description('Show resolved configuration with explanations')
    .action(function () {
      const { config: configPath } = this.optsWithGlobals();
      const cfg = loadConfig(configPath);
      printInfo('');
      for (const [k, v] of Object.entries(cfg)) {
        const key = k as keyof UadoConfig;
        const explain = EXPLAIN[key];
        printInfo(`${key}: ${JSON.stringify(v)}${explain ? ' // ' + explain : ''}`);
      }
    });
}
