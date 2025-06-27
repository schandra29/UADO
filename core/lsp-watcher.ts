import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import pino, { Logger } from 'pino';

export interface LspWatcherOptions {
  cwd?: string;
  logger?: Logger;
  tsserverPath?: string;
}

export function createLspWatcher(options: LspWatcherOptions = {}): EventEmitter {
  const {
    cwd = process.cwd(),
    logger = pino({ name: 'uado:lsp-watcher' }),
    tsserverPath = 'tsserver'
  } = options;

  const emitter = new EventEmitter();

  const child = spawn(tsserverPath, ['--logVerbosity', 'terse'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data: string | Buffer) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      logger.debug({ line }, 'tsserver stdout');
      if (/Starting updateGraphWorker/.test(line)) {
        logger.debug('tsserver hot');
        emitter.emit('lsphot');
      }
      if (/Finishing updateGraphWorker/.test(line)) {
        logger.debug('tsserver ready');
        emitter.emit('lspready');
      }
    }
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data: string | Buffer) => {
    const text = data.toString();
    logger.error({ text }, 'tsserver stderr');
  });

  child.on('error', (err) => {
    logger.error({ err }, 'tsserver spawn error');
  });

  emitter.on('close', () => {
    child.kill();
  });

  return emitter;
}
