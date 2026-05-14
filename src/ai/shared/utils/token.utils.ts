/**
 * Utilities to safely guard against token overflow before sending to any LLM provider.
 * Prevents expensive failed API calls and prompt truncation.
 */

const APPROX_CHARS_PER_TOKEN = 4;

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

/**
 * Hard truncate a string to stay safely under a token ceiling.
 * Preserves the start of the prompt since that carries the core intent.
 */
export function truncateToTokenLimit(text: string, maxTokens: number = 4096): string {
  const maxChars = maxTokens * APPROX_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  return truncated + '\n[...truncated for token safety]';
}

/**
 * Validates that a prompt is safe to send before even calling the provider.
 */
export function assertPromptSafe(prompt: string, maxTokens: number = 4096): { safe: boolean; estimatedTokens: number } {
  const estimatedTokens = estimateTokenCount(prompt);
  return { safe: estimatedTokens <= maxTokens, estimatedTokens };
}
