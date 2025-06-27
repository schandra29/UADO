import fs from 'fs';
import path from 'path';
import pino, { Logger } from 'pino';

export interface UadoConfig {
  cooldownDurationMs: number;
  stabilityWindowMs: number;
  logLevel: 'info' | 'debug' | 'silent';
}

export const DEFAULT_CONFIG: UadoConfig = {
  cooldownDurationMs: 90_000,
  stabilityWindowMs: 5_000,
  logLevel: 'info'
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
      logger.info({ path: resolved }, 'config file not found, using defaults');
    } else {
      logger.error({ err, path: resolved }, 'failed to load config, using defaults');
    }
    return { ...DEFAULT_CONFIG };
  }
}
