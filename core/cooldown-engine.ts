import { EventEmitter } from 'events';
import pino, { Logger } from 'pino';

export interface CooldownEngineOptions {
  cwd?: string;
  logger?: Logger;
  /** Maximum time to stay in cooldown before automatically exiting. */
  timeoutMs?: number;
  /** Duration to wait for file stability after `lspready`. */
  stableWindowMs?: number;
}

/**
 * Cooldown engine that delays actions while project files are in a \"hot\" state.
 *
 * It listens for `hotState`, `lsphot` and `lspready` events and emits
 * `cooldown:active` and `cooldown:ended` transitions.
 */
export function createCooldownEngine(options: CooldownEngineOptions = {}): EventEmitter {
  const {
    cwd = process.cwd(),
    logger = pino({ name: 'uado:cooldown' }),
    timeoutMs = 90_000,
    stableWindowMs = 5_000
  } = options;

  // cwd is currently unused but kept for future heuristics
  void cwd;

  const emitter = new EventEmitter();

  let cooldownActive = false;
  let timeout: NodeJS.Timeout | null = null;
  let stableTimer: NodeJS.Timeout | null = null;

  const clearTimers = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
  };

  const exitCooldown = (): void => {
    if (!cooldownActive) return;
    clearTimers();
    cooldownActive = false;
    logger.info('cooldown:ended');
    emitter.emit('cooldown:ended');
  };

  const scheduleExitTimeout = (): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      logger.debug('cooldown timeout reached');
      exitCooldown();
    }, timeoutMs);
  };

  const enterCooldown = (): void => {
    logger.debug('TODO: heuristic extension when LOC diff > 500 or multiple folders touched');
    if (!cooldownActive) {
      cooldownActive = true;
      logger.info('cooldown:active');
      emitter.emit('cooldown:active');
    }
    scheduleExitTimeout();
    if (stableTimer) {
      clearTimeout(stableTimer);
      stableTimer = null;
    }
  };

  const scheduleStableExit = (): void => {
    if (!cooldownActive) return;
    if (stableTimer) clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      logger.debug('stable window elapsed after lspready');
      exitCooldown();
    }, stableWindowMs);
  };

  // Public event API
  emitter.on('hotState', enterCooldown);
  emitter.on('lsphot', enterCooldown);
  emitter.on('lspready', scheduleStableExit);

  return emitter;
}
