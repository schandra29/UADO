import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { PasteLogEntry } from './logPaste';
import { printError, printInfo, printSuccess } from './ui';
import { computeHash } from '../utils/hash';
import { cosineSimilarity } from '../utils/matchPatterns';

export interface StarredEntry {
  prompt: string;
  output: string;
  file: string;
  timestamp: string;
  hash: string;
  tag?: string;
}

export function registerStarCommand(program: Command): void {
  program
    .command('star <index>')
    .description('Star a prompt from history')
    .option('--tag <tag>', 'optional tag')
    .action(function (indexStr: string) {
      const { tag } = this.optsWithGlobals();
      const logPath = path.join(process.cwd(), '.uado', 'paste.log.json');
      if (!fs.existsSync(logPath)) {
        printError('No paste log found');
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read paste log: ${err.message}`);
        return;
      }
      if (!Array.isArray(data)) {
        printError('paste.log.json is not in expected format');
        return;
      }
      const entries = (data as PasteLogEntry[]).slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const index = parseInt(indexStr, 10);
      if (Number.isNaN(index) || index < 1 || index > entries.length) {
        printError('Invalid index');
        return;
      }
      const entry = entries[index - 1];
      const hash = entry.hash || computeHash(entry);
      const snapDir = path.join(process.cwd(), '.uado', 'snapshots');
      const snap = fs
        .readdirSync(snapDir, { withFileTypes: true })
        .filter((d) => d.isFile() && d.name.includes(hash))[0];
      if (!snap) {
        printError('Snapshot for entry not found');
        return;
      }
      const output = fs.readFileSync(path.join(snapDir, snap.name), 'utf8');
      const starPath = path.join(process.cwd(), '.uado', 'starred.json');
      let stars: StarredEntry[] = [];
      try {
        if (fs.existsSync(starPath)) {
          const raw = fs.readFileSync(starPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) stars = parsed as StarredEntry[];
        } else {
          fs.mkdirSync(path.dirname(starPath), { recursive: true });
          fs.writeFileSync(starPath, '[]');
        }
      } catch {
        stars = [];
      }
      const starEntry: StarredEntry = {
        prompt: entry.prompt,
        output,
        file: entry.file,
        timestamp: entry.timestamp,
        hash,
        tag
      };
      stars.push(starEntry);
      try {
        fs.writeFileSync(starPath, JSON.stringify(stars, null, 2));
        printSuccess('Prompt starred');
      } catch (err: any) {
        printError(`Failed to update starred.json: ${err.message}`);
      }
    });

  program
    .command('starred')
    .description('List starred prompts')
    .option('--limit <n>', 'limit results')
    .action(function () {
      const { limit } = this.optsWithGlobals();
      const starPath = path.join(process.cwd(), '.uado', 'starred.json');
      if (!fs.existsSync(starPath)) {
        printInfo('No starred prompts found');
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(fs.readFileSync(starPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read starred prompts: ${err.message}`);
        return;
      }
      if (!Array.isArray(data)) {
        printError('starred.json is not in expected format');
        return;
      }
      const entries = data as StarredEntry[];
      const max = limit ? parseInt(limit, 10) : entries.length;
      for (const e of entries.slice(0, max)) {
        const preview = e.prompt.replace(/\s+/g, ' ').slice(0, 60);
        const count = e.output.split(/\r?\n/).length;
        printInfo(`⭐ [${e.tag || 'general'}] ${e.timestamp} (${count} lines)`);
        printInfo(`  ${preview}`);
        printInfo('');
      }
    });

  program
    .command('suggest <text>')
    .description('Suggest similar starred prompts')
    .option('--limit <n>', 'limit results')
    .action(function (text: string) {
      const { limit } = this.optsWithGlobals();
      const starPath = path.join(process.cwd(), '.uado', 'starred.json');
      if (!fs.existsSync(starPath)) {
        printInfo('No starred prompts found');
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(fs.readFileSync(starPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read starred prompts: ${err.message}`);
        return;
      }
      if (!Array.isArray(data)) {
        printError('starred.json is not in expected format');
        return;
      }
      const entries = data as StarredEntry[];
      const scored = entries
        .map((e) => ({ score: cosineSimilarity(text, e.prompt), entry: e }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
      const max = limit ? parseInt(limit, 10) : 3;
      for (const s of scored.slice(0, max)) {
        printInfo(`⭐ [${s.entry.tag || 'general'}] ${(s.score * 100).toFixed(0)}%`);
        printInfo(`  ${s.entry.prompt}`);
        printInfo('');
      }
    });

  program
    .command('diff <index>')
    .description('Diff latest snapshot with a starred prompt')
    .action(function (indexStr: string) {
      const starPath = path.join(process.cwd(), '.uado', 'starred.json');
      if (!fs.existsSync(starPath)) {
        printError('No starred prompts found');
        return;
      }
      let data: unknown;
      try {
        data = JSON.parse(fs.readFileSync(starPath, 'utf8'));
      } catch (err: any) {
        printError(`Failed to read starred prompts: ${err.message}`);
        return;
      }
      if (!Array.isArray(data)) {
        printError('starred.json is not in expected format');
        return;
      }
      const entries = data as StarredEntry[];
      const index = parseInt(indexStr, 10);
      if (Number.isNaN(index) || index < 1 || index > entries.length) {
        printError('Invalid index');
        return;
      }
      const entry = entries[index - 1];
      const snapDir = path.join(process.cwd(), '.uado', 'snapshots');
      const snaps = fs
        .readdirSync(snapDir, { withFileTypes: true })
        .filter((d) => d.isFile())
        .sort((a, b) => b.name.localeCompare(a.name));
      if (snaps.length === 0) {
        printError('No snapshots found');
        return;
      }
      const latest = fs.readFileSync(path.join(snapDir, snaps[0].name), 'utf8');
      let diffOutput = '';
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { diffStringsUnified } = require('@vitest/utils/diff');
        diffOutput = diffStringsUnified(entry.output, latest);
      } catch {
        diffOutput = 'diff library unavailable';
      }
      console.log(diffOutput);
    });
}
