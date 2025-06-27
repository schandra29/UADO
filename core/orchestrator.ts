import { EventEmitter } from 'events';
import pino, { Logger } from 'pino';

export class CooldownActiveError extends Error {
  constructor() {
    super('Cooldown is active');
    this.name = 'CooldownActiveError';
  }
}

export interface OrchestratorOptions {
  cooldownEmitter: EventEmitter;
  logger?: Logger;
}

export interface PromptWrapper {
  wrapPrompt: <T>(fn: () => Promise<T>) => Promise<T>;
  close: () => void;
}

/**
 * Creates a prompt orchestrator that queues prompt requests while cooldown
 * is active. Queued prompts are retried in order once cooldown ends.
 */
export function createOrchestrator(options: OrchestratorOptions): PromptWrapper {
  const { cooldownEmitter, logger = pino({ name: 'uado:orchestrator' }) } = options;

  let cooldownActive = false;
  type QueueItem<T> = { fn: () => Promise<T>; resolve: (v: T) => void; reject: (e: any) => void };
  const queue: QueueItem<any>[] = [];

  const processQueue = (): void => {
    if (cooldownActive || queue.length === 0) return;
    const item = queue.shift()!;
    logger.info('retrying queued prompt');
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => processQueue());
  };

  const onCooldownActive = (): void => {
    logger.debug('cooldown active');
    cooldownActive = true;
  };

  const onCooldownEnded = (): void => {
    logger.debug('cooldown ended');
    cooldownActive = false;
    processQueue();
  };

  cooldownEmitter.on('cooldown:active', onCooldownActive);
  cooldownEmitter.on('cooldown:ended', onCooldownEnded);

  const wrapPrompt = <T>(fn: () => Promise<T>): Promise<T> => {
    if (cooldownActive) {
      logger.info('prompt queued');
      return new Promise<T>((resolve, reject) => {
        queue.push({ fn, resolve, reject });
      });
    }
    logger.info('prompt allowed');
    return fn();
  };

  const close = (): void => {
    cooldownEmitter.off('cooldown:active', onCooldownActive);
    cooldownEmitter.off('cooldown:ended', onCooldownEnded);
  };

  return { wrapPrompt, close };
}
