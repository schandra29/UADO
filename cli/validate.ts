import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

export interface LintResult {
  passed: boolean;
  eslintErrors: string[];
  tscErrors: string[];
}

function run(cmd: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  return spawnSync(cmd, args, { encoding: 'utf8' });
}

export function validateCode(content: string, dest: string): LintResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uado-validate-'));
  const tmpFile = path.join(tmpDir, path.basename(dest));
  fs.writeFileSync(tmpFile, content);

  let eslintErrors: string[] = [];
  let tscErrors: string[] = [];

  const eslintCmd = path.join(process.cwd(), 'node_modules', '.bin', 'eslint');
  if (fs.existsSync(eslintCmd)) {
    const res = run(eslintCmd, ['--quiet', tmpFile]);
    if (res.status !== 0) {
      const out = (res.stdout + res.stderr).trim();
      if (out) eslintErrors = out.split(/\n/).filter(Boolean);
    }
  }

  const tscCmd = path.join(process.cwd(), 'node_modules', '.bin', 'tsc');
  if (fs.existsSync(tscCmd)) {
    const res = run(tscCmd, ['--noEmit', tmpFile]);
    if (res.status !== 0) {
      const out = (res.stdout + res.stderr).trim();
      if (out) tscErrors = out.split(/\n/).filter(Boolean);
    }
  }

  const passed = eslintErrors.length === 0 && tscErrors.length === 0;

  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { passed, eslintErrors, tscErrors };
}

