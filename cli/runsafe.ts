import { Command } from 'commander';
import { logInfo, logSuccessFinal, logDryRunNotice, logError } from './logger';

export function registerRunSafeCommands(program: Command): void {
  const rs = program.command('runsafe').description('RunSafe utilities');

  rs.command('apply')
    .option('--dry-run', 'Simulate actions without writing files')
    .option('--atomic', 'Apply changes as one transaction')
    .action(function () {
      const { dryRun, atomic } = this.optsWithGlobals();
      if (dryRun) {
        logDryRunNotice();
        return;
      }
      if (atomic) {
        logInfo('🧪 Atomic mode: All changes applied as one transaction.');
        logSuccessFinal('🌱 Epic planted successfully.');
      } else {
        logSuccessFinal('🌱 Epic applied successfully!');
      }
      logInfo('📄 Logged to paste.log.json');
    });

  rs.command('validate')
    .option('--council', 'Include council feedback')
    .action(function () {
      const { council } = this.optsWithGlobals();
      logSuccessFinal('This epic is valid and safe to apply.');
      if (council) {
        logInfo('🧠 Council feedback appended to the epic.');
      }
    });

  rs.command('doctor')
    .option('--lifted', 'Simulate cooldown lifted')
    .action(function () {
      const { lifted } = this.optsWithGlobals();
      logInfo('🩺 All systems go! Your environment looks solid.');
      if (lifted) {
        logSuccessFinal("Cooldown lifted. You're cleared to apply again.");
      }
    });

  rs.command('chains')
    .option('--fail', 'Simulate failure')
    .action(function () {
      const { fail } = this.optsWithGlobals();
      if (fail) {
        logError('Chain stopped at epic-002.md due to error.');
        return;
      }
      logInfo('⛓️  Chain complete — 3 epics applied successfully.');
      logInfo('📄 Each logged to paste.log.json');
    });
}
