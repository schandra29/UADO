import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawnSync } from 'child_process';
import { printInfo, printSuccess, printError } from './ui';
import { PatternEntry } from '../utils/matchPatterns';
import { logPattern } from './logPattern';

const SCENARIOS = ['utility', 'debug', 'refactor'];

function getExamples(tag: string): PatternEntry[] {
  const patternsPath = path.join(process.cwd(), '.uado', 'patterns.json');
  if (!fs.existsSync(patternsPath)) return [];

  try {
    const raw = fs.readFileSync(patternsPath, 'utf8');
    const parsed = JSON.parse(raw);
    let entries: PatternEntry[] = [];
    if (Array.isArray(parsed)) {
      entries = parsed as PatternEntry[];
    } else if (parsed && typeof parsed === 'object') {
      for (const arr of Object.values(parsed as Record<string, PatternEntry[]>)) {
        if (Array.isArray(arr)) entries = entries.concat(arr);
      }
    }
    return entries.filter((e) => e.tag === tag);
  } catch {
    return [];
  }
}

function scenarioPrompt(s: string): string {
  switch (s) {
    case 'utility':
      return 'Write a small utility function and explain how it works.';
    case 'debug':
      return 'Help me fix a bug in my code. Ask clarifying questions if needed.';
    case 'refactor':
      return 'Suggest a refactor that improves readability and maintainability.';
    default:
      return '';
  }
}

export function registerGuideCommand(program: Command): void {
  program
    .command('guide <scenario>')
    .description('Interactive onboarding walkthroughs')
    .action(async function (scenario: string) {
      if (!SCENARIOS.includes(scenario)) {
        printError('Unknown scenario. Supported: utility, debug, refactor');
        return;
      }

      printInfo(`\n🟢 Starting guide for "${scenario}"...`);

      const examples = getExamples(scenario);
      printInfo('\nStep 1/3: Example prompts');
      if (examples.length === 0) {
        printInfo('No saved examples yet.');
      } else {
        for (const ex of examples) {
          printInfo(`Prompt: ${ex.prompt}`);
          if (ex.outputSnippet) printInfo(`Output:\n${ex.outputSnippet}`);
          printInfo('---');
        }
      }

      const basePrompt = scenarioPrompt(scenario);
      printInfo('\nStep 2/3: Suggested prompt');
      printInfo(basePrompt);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const finalPrompt: string = await new Promise((res) => {
        rl.question('\nEdit the prompt or press Enter to accept:\n', (ans) => {
          rl.close();
          res(ans.trim() ? ans : basePrompt);
        });
      });

      printInfo('\nStep 3/3: Running prompt...\n');
      const cliPath = path.resolve(__dirname, '..', 'index.js');
      spawnSync('node', [cliPath, 'prompt', finalPrompt], { stdio: 'inherit' });

      const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
      const worked: string = await new Promise((res) => {
        rl2.question('Did this work for you? (y/N) ', (ans) => {
          rl2.close();
          res(ans.trim().toLowerCase());
        });
      });
      if (worked === 'y' || worked === 'yes') {
        logPattern(finalPrompt, `guide/${scenario}.txt`, '', scenario);
        printSuccess('Great! Example logged for future suggestions.');
      } else {
        printInfo('Thanks for trying the guide!');
      }
    });
}
