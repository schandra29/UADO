import { Command } from 'commander';
import pino from 'pino';
import { createFileWatcher } from '../core/file-watcher';
import { createLspWatcher } from '../core/lsp-watcher';
import { loadConfig } from '../core/config-loader';
import { registerDashboardCommand } from './dashboard';
import { registerPromptCommand } from './prompt';
import { runHistoryCommand } from './history';

const program = new Command();
program
  .name('uado')
  .description('Universal AI Development Orchestrator')
  .option('-c, --config <path>', 'path to config file');

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
program
  .command('history')
  .description('Show paste history')
  .action(runHistoryCommand);

program.parse(process.argv);
