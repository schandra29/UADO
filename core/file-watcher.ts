import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import pino, { Logger } from 'pino';
import debounce from 'lodash.debounce';

export interface FileWatcherOptions {
  cwd?: string;
  debounceMs?: number;
  logger?: Logger;
}

/**
 * Creates a file watcher that emits a `hotState` event whenever watched files change.
 */
export function createFileWatcher(options: FileWatcherOptions = {}): EventEmitter {
  const {
    cwd = process.cwd(),
    debounceMs = 500,
    logger = pino({ name: 'uado:file-watcher' })
  } = options;

  const emitter = new EventEmitter();

  const patterns = [
    '**/*.ts',
    '**/*.tsx',
    'tsconfig.json',
    'package.json',
    'schema.prisma'
  ];

  const watcher = chokidar.watch(patterns, {
    cwd,
    ignored: /node_modules/,
    ignoreInitial: true
  });

  const emitHotState = debounce(() => {
    logger.info('hotState event emitted');
    emitter.emit('hotState');
  }, debounceMs);

  watcher.on('all', (event, path) => {
    logger.debug({ event, path }, 'file change detected');
    emitHotState();
  });

  watcher.on('error', (err) => {
    logger.error({ err }, 'watcher error');
  });

  // Ensure the watcher closes when the emitter is closed
  emitter.on('close', () => {
    watcher.close().catch((err) => logger.error({ err }, 'failed to close watcher'));
  });

  return emitter;
}
