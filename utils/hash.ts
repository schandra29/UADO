import crypto from 'crypto';

function canonicalStringify(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalStringify(v)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((k) =>
    JSON.stringify(k) + ':' + canonicalStringify((value as any)[k])
  );
  return '{' + entries.join(',') + '}';
}

export function computeHash(data: object): string {
  const str = canonicalStringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}
