import { Command } from 'commander';
import { spawnSync } from 'child_process';
import path from 'path';
import { logPaste, logQueueEntry, PasteLogEntry, PasteQueueEntry } from './logPaste';
import { printInfo, printSuccess } from './ui';

export function registerTestCommand(program: Command): void {
  const test = program.command('test').description('Testing utilities');

  test
    .command('run')
    .description('Run CLI tests')
    .action(() => {
      const testFile = path.join(__dirname, '..', 'test', 'cli.test.js');
      const result = spawnSync('node', [testFile], { stdio: 'inherit' });
      process.exitCode = result.status === null ? 1 : result.status;
    });

  test
    .command('mock-paste')
    .description('Generate fake log entries for manual inspection')
    .action(runMockPaste);
}

function runMockPaste(): void {
  const timestamp = '2024-01-01T00:00:00.000Z';
  const files = ['fileA.ts', 'fileB.ts', 'fileC.ts'];
  const entries: PasteLogEntry[] = [];

  for (const file of files) {
    const entry: PasteLogEntry = {
      timestamp,
      file,
      bytesWritten: 10,
      prompt: 'Mock prompt',
      queueIndex: 1,
      wasOverwrite: false
    };
    logPaste(entry);
    entries.push(entry);
    printInfo(`📝 Mock paste logged: ${file}`);
  }

  const qEntry: PasteQueueEntry = {
    queueIndex: 1,
    prompt: 'Mock prompt',
    timestamp,
    files: entries
  };
  logQueueEntry(qEntry);
  printSuccess('Mock queue entry logged.');
}
