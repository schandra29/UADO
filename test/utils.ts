import fs from 'fs';

export function compareSnapshot(actual: unknown, expectedPath: string): boolean {
  if (!fs.existsSync(expectedPath)) {
    return false;
  }
  const expectedRaw = fs.readFileSync(expectedPath, 'utf8');
  const expected = JSON.parse(expectedRaw);
  return JSON.stringify(actual, null, 2) === JSON.stringify(expected, null, 2);
}

export function readJSON(file: string): any {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
