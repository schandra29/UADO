import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { printWarn } from './ui';

export interface GuardrailOptions {
  snippets?: string[];
  bypass?: boolean;
}

export function runGuardrails(options: GuardrailOptions = {}): void {
  const { snippets = [], bypass } = options;
  if (bypass) return;
  const cwd = process.cwd();
  const warnings: string[] = [];

  // package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    warnings.push('package.json not found. Dependencies may be missing.');
  } else {
    try {
      JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {
      warnings.push('package.json is malformed.');
    }
  }

  // node_modules check when new packages referenced
  if (snippets.some(refersToPackage) && !fs.existsSync(path.join(cwd, 'node_modules'))) {
    warnings.push('node_modules folder is missing. Run `npm install` before continuing.');
  }

  // merge conflict markers
  if (snippets.some((s) => s.includes('<<<<<<< HEAD')) || hasConflicts(cwd)) {
    warnings.push('Unresolved merge conflict markers detected.');
  }

  // git status
  if (fs.existsSync(path.join(cwd, '.git'))) {
    const res = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' });
    if (res.stdout.trim() !== '') {
      warnings.push('Untracked or unstaged Git changes found.');
    }
  }

  for (const w of warnings) {
    printWarn(w);
  }
}

function refersToPackage(code: string): boolean {
  return /from ['"][^./][^'"]+['"]/.test(code) || /require\(['"][^./][^'"]+['"]\)/.test(code);
}

function hasConflicts(dir: string): boolean {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (hasConflicts(full)) return true;
    } else if (e.isFile()) {
      try {
        if (fs.readFileSync(full, 'utf8').includes('<<<<<<< HEAD')) return true;
      } catch {
        // ignore binary
      }
    }
  }
  return false;
}
