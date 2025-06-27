import { Command } from 'commander';
import pino from 'pino';
import { createFileWatcher } from '../core/file-watcher';
import { createLspWatcher } from '../core/lsp-watcher';
import { createCooldownEngine } from '../core/cooldown-engine';

export function registerDashboardCommand(program: Command): void {
  program
    .command('dashboard')
    .description('Run live dashboard with system diagnostic signals')
    .action(() => {
      const logger = pino({ name: 'uado' });
      logger.info('Starting dashboard...');

      const fileWatcher = createFileWatcher({ logger });
      const lspWatcher = createLspWatcher({ logger });
      const cooldown = createCooldownEngine({ logger });

      // Forward watcher events to cooldown engine
      fileWatcher.on('hotState', () => {
        cooldown.emit('hotState');
        recordEvent('hotState');
      });
      lspWatcher.on('lsphot', () => {
        cooldown.emit('lsphot');
        recordEvent('lsphot');
      });
      lspWatcher.on('lspready', () => {
        cooldown.emit('lspready');
        recordEvent('lspready');
      });

      cooldown.on('cooldown:active', () => {
        cooldownActive = true;
        recordEvent('cooldown:active');
      });
      cooldown.on('cooldown:ended', () => {
        cooldownActive = false;
        cooldownEndsAt = 0;
        recordEvent('cooldown:ended');
      });

      let cooldownActive = false;
      let lastEvent = '';
      let cooldownEndsAt = 0;
      const recentEvents: Array<{ ts: Date; event: string }> = [];
      const timeoutMs = 90_000;
      const stableWindowMs = 5_000;

      const recordEvent = (event: string): void => {
        lastEvent = event;
        recentEvents.push({ ts: new Date(), event });
        if (recentEvents.length > 5) recentEvents.shift();
        if (event === 'hotState' || event === 'lsphot') {
          cooldownEndsAt = Date.now() + timeoutMs;
        } else if (event === 'lspready' && cooldownActive) {
          cooldownEndsAt = Date.now() + stableWindowMs;
        }
      };

      const render = (): void => {
        console.clear();
        console.log(cooldownActive ? '🔴 Cooldown Active' : '🟢 System Ready');
        console.log(`Last event: ${lastEvent || 'none'}`);
        if (cooldownActive) {
          const remaining = Math.max(0, cooldownEndsAt - Date.now());
          console.log(`Time remaining on cooldown: ${(remaining / 1000).toFixed(1)}s`);
        }
        console.log('Recent events:');
        for (const ev of recentEvents.slice().reverse()) {
          console.log(`${ev.ts.toISOString()} - ${ev.event}`);
        }
      };

      const interval = setInterval(render, 500);
      render();

      const cleanup = (): void => {
        clearInterval(interval);
        fileWatcher.emit('close');
        lspWatcher.emit('close');
      };

      process.on('SIGINT', () => {
        cleanup();
        process.exit(0);
      });
    });
}
