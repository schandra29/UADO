import { Command } from 'commander';
import pino from 'pino';
import { createCooldownEngine } from '../core/cooldown-engine';
import { createOrchestrator } from '../core/orchestrator';

export function registerPromptCommand(program: Command): void {
  program
    .command('prompt <text>')
    .description('Send a test prompt through the orchestrator')
    .action(async (text: string) => {
      const logger = pino({ name: 'uado' });
      const cooldown = createCooldownEngine({ logger });
      const orchestrator = createOrchestrator({ cooldownEmitter: cooldown, logger });

      const fakeCallAI = (input: string): Promise<string> =>
        new Promise((res) => setTimeout(() => res(`Response: ${input}`), 1000));

      let queued = false;
      cooldown.on('cooldown:active', () => {
        queued = true;
        console.log('🔥 Cooldown active, queued prompt');
      });
      cooldown.on('cooldown:ended', () => {
        if (queued) {
          console.log('✅ Prompt accepted');
          queued = false;
        }
      });

      const waitLog = setTimeout(() => {
        if (queued) {
          console.log('🕒 Waiting...');
        }
      }, 200);

      try {
        const result = await orchestrator.wrapPrompt(() => fakeCallAI(text));
        clearTimeout(waitLog);
        if (!queued) {
          console.log('✅ Prompt accepted');
        }
        console.log(result);
      } finally {
        orchestrator.close();
      }
    });
}
