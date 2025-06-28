import { Command } from 'commander';
import { printError, printSuccess } from './ui';
import { setDifficulty, Difficulty } from '../lib/user-level';

const LEVELS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export function registerLevelCommand(program: Command): void {
  program
    .command('level <difficulty>')
    .description('Set your skill level')
    .action((difficulty: string) => {
      if (!LEVELS.includes(difficulty as Difficulty)) {
        printError('Difficulty must be beginner, intermediate, or advanced');
        return;
      }
      setDifficulty(difficulty as Difficulty);
      printSuccess(`Difficulty set to ${difficulty}`);
    });
}
