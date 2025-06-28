import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { printError, printInfo } from './ui';
import { findBestMatches, PatternEntry } from '../utils/matchPatterns';

export function registerPatternsCommand(program: Command): void {
  const patterns = program.command('patterns').description('Pattern utilities');

  patterns
    .command('suggest <text>')
    .description('Suggest similar prompt patterns')
    .action((text: string) => {
      const patternsPath = path.join(process.cwd(), '.uado', 'patterns.json');
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read patterns: ${err.message}`);
        return;
      }

      let all: PatternEntry[] = [];
      if (Array.isArray(raw)) {
        all = raw as PatternEntry[];
      } else if (raw && typeof raw === 'object') {
        for (const arr of Object.values(raw as Record<string, PatternEntry[]>)) {
          if (Array.isArray(arr)) all = all.concat(arr);
        }
      } else {
        printError('patterns.json is not in the expected format.');
        return;
      }

      const matches = findBestMatches(text, all, 3);
      if (matches.length === 0) {
        printInfo('No similar patterns found.');
        return;
      }

      for (const m of matches) {
        if (m.tag) printInfo(`[${m.tag}]`);
        printInfo(`Prompt: ${m.prompt}`);
        printInfo(`File: ${m.file}`);
        printInfo(`Snippet: ${m.outputSnippet}`);
        printInfo('');
      }
    });
}
