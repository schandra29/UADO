import { PatternEntry } from './matchPatterns';

/**
 * Generate a short human readable explanation for a pattern.
 * In real usage this could call a local LLM. For tests we
 * simply return a deterministic description so no network
 * access is required.
 */
export function explainPattern(p: PatternEntry): string {
  const tagDesc: Record<string, string> = {
    'react-component': 'builds a React component',
    'utility': 'creates a small helper function'
  };
  const base = tagDesc[p.tag || ''] || 'demonstrates a useful coding pattern';
  const promptPreview = p.prompt.split(/\n/)[0];
  return `This pattern ${base} based on the prompt "${promptPreview}".`;
}
