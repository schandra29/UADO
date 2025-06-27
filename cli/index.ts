import { Command } from 'commander';
import pino from 'pino';
import { createFileWatcher } from '../core/file-watcher';
import { createLspWatcher } from '../core/lsp-watcher';
import { registerDashboardCommand } from './dashboard';
import { registerPromptCommand } from './prompt';

const program = new Command();
program
  .name('uado')
  .description('Universal AI Development Orchestrator');

program
  .command('watch')
  .description('Watch project files and emit hot state events')
  .action(() => {
    const logger = pino({ name: 'uado' });
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

program.parse(process.argv);
