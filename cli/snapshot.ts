import fs from 'fs';
import path from 'path';

export function saveSnapshot(content: string, hash: string): string {
  const dir = path.join(process.cwd(), '.uado', 'snapshots');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${timestamp}-${hash}.txt`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content);
  return path.relative(process.cwd(), file);
}
