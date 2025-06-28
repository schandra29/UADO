import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { printInfo } from './ui';

export function registerVersionCommand(program: Command): void {
  program
    .command('version')
    .description('Print CLI version')
    .action(() => {
      const pkgPath = path.join(__dirname, '..', 'package.json');
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as { version?: string };
      printInfo(pkg.version || 'unknown');
    });
}
