/**
 * Utility functions for raw text normalization, tokenization, and cleanup.
 * Deterministic pre-processing reduces LLM token costs and improves classification.
 */

export function sanitizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function extractKeywords(prompt: string, stopWords: string[] = ['a', 'an', 'the', 'is', 'to', 'and', 'for', 'with']): string[] {
  const sanitized = sanitizePrompt(prompt).replace(/[^\w\s]/g, '');
  const words = sanitized.split(' ');
  return words.filter(w => !stopWords.includes(w) && w.length > 2);
}
