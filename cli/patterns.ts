import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { printError, printInfo, printTip } from './ui';
import { findBestMatches, PatternEntry } from '../utils/matchPatterns';
import { explainPattern } from '../utils/explainPattern';

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
        printTip('Try generating patterns using `uado guide` or `uado prompt --tag` first.');
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
        printTip('You can delete it and re-run `uado guide` to regenerate.');
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

  patterns
    .command('explain <tag>')
    .description('Explain stored patterns for a tag')
    .action((tag: string) => {
      const patternsPath = path.join(process.cwd(), '.uado', 'patterns.json');
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read patterns: ${err.message}`);
        printTip('Run `uado guide` to create your first pattern examples.');
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
        printTip('Delete the file and re-run `uado guide` to start fresh.');
        return;
      }

      const filtered = all.filter((p) => p.tag === tag);
      if (filtered.length === 0) {
        printInfo(`No patterns found for tag "${tag}".`);
        printTip(`Add one using \`uado prompt --tag ${tag} <text>\``);
        return;
      }

      for (const entry of filtered) {
        const diff = entry.difficulty ?? 'beginner';
        printInfo(`[${entry.tag ?? 'general'}] (${diff})`);
        printInfo(`Prompt: ${entry.prompt}`);
        printInfo(`Snippet: ${entry.outputSnippet}`);
        printInfo(`Explanation: ${explainPattern(entry)}`);
        printInfo('');
      }
    });
}
