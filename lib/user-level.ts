import fs from 'fs';
import path from 'path';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface UserData {
  level: Difficulty;
  counts: Record<Difficulty, number>;
}

const DEFAULT_DATA: UserData = {
  level: 'beginner',
  counts: { beginner: 0, intermediate: 0, advanced: 0 }
};

function userFilePath(): string {
  return path.join(process.cwd(), '.uado', 'user.json');
}

export function loadUserData(): UserData {
  const file = userFilePath();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const level =
      parsed.level === 'beginner' ||
      parsed.level === 'intermediate' ||
      parsed.level === 'advanced'
        ? parsed.level
        : DEFAULT_DATA.level;
    const counts =
      parsed.counts && typeof parsed.counts === 'object'
        ? { ...DEFAULT_DATA.counts, ...parsed.counts }
        : { ...DEFAULT_DATA.counts };
    return { level, counts };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export function saveUserData(data: UserData): void {
  const file = userFilePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    // ignore
  }
}

export function getDifficulty(): Difficulty {
  return loadUserData().level;
}

export function setDifficulty(level: Difficulty): void {
  const data = loadUserData();
  data.level = level;
  saveUserData(data);
}

export function incrementCount(level: Difficulty): number {
  const data = loadUserData();
  data.counts[level] = (data.counts[level] || 0) + 1;
  saveUserData(data);
  return data.counts[level];
}
