import { Command } from 'commander';
import pino from 'pino';
import { createFileWatcher } from '../core/file-watcher';

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

    watcher.on('hotState', () => {
      logger.info('hotState event received');
    });
  });

program.parse(process.argv);
