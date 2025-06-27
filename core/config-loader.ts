import fs from 'fs';
import path from 'path';
import pino, { Logger } from 'pino';

export interface UadoConfig {
  cooldownDurationMs: number;
  stabilityWindowMs: number;
  logLevel: 'info' | 'debug' | 'silent';
  mode: 'openai' | 'claude' | 'manual';
}

export const DEFAULT_CONFIG: UadoConfig = {
  cooldownDurationMs: 90_000,
  stabilityWindowMs: 5_000,
  logLevel: 'info',
  mode: 'openai'
};

export function loadConfig(configPath?: string, logger: Logger = pino({ name: 'uado:config-loader' })): UadoConfig {
  const resolved = configPath ? path.resolve(configPath) : path.join(process.cwd(), '.uadorc.json');
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw);
    const merged: UadoConfig = { ...DEFAULT_CONFIG, ...parsed };
    logger.info({ path: resolved }, 'loaded config');
    return merged;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      logger.warn({ path: resolved }, 'config file not found, defaulting to manual mode');
      return { ...DEFAULT_CONFIG, mode: 'manual' };
    } else {
      logger.error({ err, path: resolved }, 'failed to load config, using defaults');
      return { ...DEFAULT_CONFIG };
    }
  }
}
