import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { createFileWatcher } from '../core/file-watcher';
import { createLspWatcher } from '../core/lsp-watcher';
import { loadConfig } from '../core/config-loader';
import { registerDashboardCommand } from './dashboard';
import { registerPromptCommand } from './prompt';
import { registerPatternsCommand } from './patterns';
import { registerStarCommand } from './star';
import { registerGuideCommand } from './guide';
import { runHistoryCommand } from './history';
import { registerTestCommand } from './test';
import { runReplayCommand } from './replay';
import { registerStatusCommand } from './status';
import { registerVersionCommand } from './version';
import { registerConfigCommand } from './config';
import { registerLevelCommand } from './level';
import { registerRunSafeCommands } from './runsafe';

import { printInfo, setUseEmoji } from './ui';

const program = new Command();
program
  .name('uado')
  .description('Universal AI Development Orchestrator')
  .option('-c, --config <path>', 'path to config file')
  .option('--no-emoji', 'disable emoji in output')
  .option('--no-guardrails', 'disable safety guardrails');

program
  .command('watch')
  .description('Watch project files and emit hot state events')
  .action(function () {
    const { config: configPath } = this.optsWithGlobals();
    const cfg = loadConfig(configPath);
    const logger = pino({ name: 'uado', level: cfg.logLevel });
    logger.info('Starting file watcher...');

    const watcher = createFileWatcher({ logger });
    const lspWatcher = createLspWatcher({ logger });

    watcher.on('hotState', () => {
      logger.info('hotState event received');
    });

    lspWatcher.on('lsphot', () => {
      logger.info('lsphot event received');
    });
    lspWatcher.on('lspready', () => {
      logger.info('lspready event received');
    });
  });

registerDashboardCommand(program);
registerPromptCommand(program);
registerPatternsCommand(program);
registerGuideCommand(program);
registerTestCommand(program);
registerStatusCommand(program);
registerVersionCommand(program);
registerConfigCommand(program);
registerLevelCommand(program);
registerStarCommand(program);
registerRunSafeCommands(program);
program
  .command('history')
  .description('Show paste history')
  .action(runHistoryCommand);
program
  .command('replay <index>')
  .description('Replay queued paste files')
  .option('--dry-run', 'Simulate restoring files without writing')
  .option('--force', 'Write even if linting fails')
  .action(async function (index: string) {
    const { config: configPath, noGuardrails, dryRun, force } = this.optsWithGlobals();
    await runReplayCommand(index, configPath, noGuardrails, dryRun, force);
  });
program.parse(process.argv);
const opts = program.opts();
setUseEmoji(!(opts.noEmoji === true));
maybeShowWelcome();

function maybeShowWelcome(): void {
  const dir = path.join(process.cwd(), '.uado');
  const flagPath = path.join(dir, '.first-run.json');
  const logPath = path.join(dir, 'paste.log.json');

  let shown = false;
  try {
    const data = JSON.parse(fs.readFileSync(flagPath, 'utf8')) as {
      shown?: boolean;
    };
    shown = data.shown === true;
  } catch {
    shown = false;
  }

  if (!shown && (!fs.existsSync(dir) || !fs.existsSync(logPath))) {
    printInfo('\n🎉 Welcome to UADO CLI!');
    printInfo('📂 A new `.uado/` folder will be created for your paste history.');
    printInfo('🧠 Run `uado history` to browse past prompts and files.\n');
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        flagPath,
        JSON.stringify({ shown: true, firstRunAt: new Date().toISOString() }, null, 2)
      );
    } catch {
      // ignore errors
    }
  }
}
