import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { compareSnapshot, readJSON } from './utils';

interface TestResult { name: string; passed: boolean; message?: string; }

const cliPath = path.resolve(__dirname, '..', 'index.js');

function runCmd(args: string[], cwd: string): { stdout: string; stderr: string; status: number | null } {
  const res = spawnSync('node', [cliPath, ...args], { cwd, encoding: 'utf8' });
  return { stdout: res.stdout, stderr: res.stderr, status: res.status };
}

function testMockPaste(tmpDir: string): TestResult {
  runCmd(['test', 'mock-paste'], tmpDir);
  const pastePath = path.join(tmpDir, '.uado', 'paste.log.json');
  const queuePath = path.join(tmpDir, '.uado', 'queue.log.json');
  const actualPaste = readJSON(pastePath);
  const actualQueue = readJSON(queuePath);
  const snapDir = path.join(__dirname, '../../test/__snapshots__');
  const ok1 = compareSnapshot(actualPaste, path.join(snapDir, 'paste.log.json'));
  const ok2 = compareSnapshot(actualQueue, path.join(snapDir, 'queue.log.json'));
  return { name: 'test-mock-paste', passed: ok1 && ok2, message: !(ok1 && ok2) ? 'snapshot mismatch' : undefined };
}

function testHistoryOutput(tmpDir: string): TestResult {
  const res = runCmd(['history'], tmpDir);
  const snapDir = path.join(__dirname, '../../test/__snapshots__');
  const expected = fs.readFileSync(path.join(snapDir, 'history.txt'), 'utf8');
  const passed = res.stdout.trim() === expected.trim();
  return { name: 'test-history', passed, message: passed ? undefined : 'output mismatch' };
}

function main(): void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uado-test-'));
  const results = [testMockPaste(tmpDir), testHistoryOutput(tmpDir)];

  for (const r of results) {
    if (r.passed) {
      console.log(`\u2705 ${r.name}: PASS`);
    } else {
      console.log(`\u274c ${r.name}: FAIL${r.message ? ' (' + r.message + ')' : ''}`);
    }
  }

  const failed = results.some((r) => !r.passed);
  if (failed) process.exit(1);
}

main();
