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

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'uado-test-'));
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

function writePatterns(dir: string): void {
  const patterns = [
    {
      prompt: 'Create a React button',
      file: 'src/Button.tsx',
      outputSnippet: '<button>...</button>',
      tag: 'react-component'
    },
    {
      prompt: 'Create React header',
      file: 'src/Header.tsx',
      outputSnippet: '<header>...</header>',
      tag: 'react-component'
    },
    {
      prompt: 'Utility fn',
      file: 'src/util.ts',
      outputSnippet: 'export function',
      tag: 'utility'
    }
  ];
  const pdir = path.join(dir, '.uado');
  fs.mkdirSync(pdir, { recursive: true });
  fs.writeFileSync(
    path.join(pdir, 'patterns.json'),
    JSON.stringify(patterns, null, 2)
  );
}

function testExplainMissingTag(tmpDir: string): TestResult {
  const res = runCmd(['patterns', 'explain'], tmpDir);
  const passed = res.status !== 0;
  return { name: 'patterns-missing-tag', passed, message: passed ? undefined : 'expected failure' };
}

function testExplainUnknownTag(tmpDir: string): TestResult {
  writePatterns(tmpDir);
  const res = runCmd(['patterns', 'explain', 'nope'], tmpDir);
  const passed = res.stdout.includes('No patterns found for tag');
  return { name: 'patterns-unknown-tag', passed, message: passed ? undefined : 'unexpected output' };
}

function testExplainFilter(tmpDir: string): TestResult {
  writePatterns(tmpDir);
  const res = runCmd(['patterns', 'explain', 'react-component'], tmpDir);
  const hasButton = res.stdout.includes('Create a React button');
  const hasHeader = res.stdout.includes('Create React header');
  const noUtil = !res.stdout.includes('Utility fn');
  const passed = hasButton && hasHeader && noUtil;
  return { name: 'patterns-filter', passed, message: passed ? undefined : 'filter mismatch' };
}

function guardrailProject(dir: string, modify: (qPath: string) => void): { stdout: string; stderr: string } {
  runCmd(['test', 'mock-paste'], dir);
  const qPath = path.join(dir, '.uado', 'queue.log.json');
  modify(qPath);
  return runCmd(['replay', '1'], dir);
}

function testMissingPackageJson(): TestResult {
  const dir = makeTmpDir();
  const res = guardrailProject(dir, () => {});
  const passed = res.stdout.includes('package.json');
  return { name: 'guardrail-packagejson', passed, message: passed ? undefined : 'warning missing' };
}

function testNodeModules(): TestResult {
  const dir = makeTmpDir();
  const res = guardrailProject(dir, (qPath) => {
    const data = readJSON(qPath);
    data[0].files[0].output = "import axios from 'axios';";
    fs.writeFileSync(qPath, JSON.stringify(data, null, 2));
  });
  const passed = res.stdout.includes('node_modules');
  return { name: 'guardrail-node-modules', passed, message: passed ? undefined : 'warning missing' };
}

function testMergeConflicts(): TestResult {
  const dir = makeTmpDir();
  const res = guardrailProject(dir, (qPath) => {
    const data = readJSON(qPath);
    data[0].files[0].output = '<<<<<<< HEAD\nfoo\n=======\nbar\n>>>>>>> main';
    fs.writeFileSync(qPath, JSON.stringify(data, null, 2));
  });
  const passed = res.stdout.includes('merge conflict');
  return { name: 'guardrail-merge-conflict', passed, message: passed ? undefined : 'warning missing' };
}

function testGitChanges(): TestResult {
  const dir = makeTmpDir();
  runCmd(['test', 'mock-paste'], dir);
  spawnSync('git', ['init'], { cwd: dir });
  const res = runCmd(['replay', '1'], dir);
  const passed = res.stdout.includes('Git changes');
  return { name: 'guardrail-git-status', passed, message: passed ? undefined : 'warning missing' };
}

function main(): void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uado-test-'));
  const results = [
    testMockPaste(tmpDir),
    testHistoryOutput(tmpDir),
    testExplainMissingTag(tmpDir),
    testExplainUnknownTag(tmpDir),
    testExplainFilter(tmpDir),
    testMissingPackageJson(),
    testNodeModules(),
    testMergeConflicts(),
    testGitChanges()
  ];

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
