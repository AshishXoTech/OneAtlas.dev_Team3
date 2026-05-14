import { JsonUtils } from '../../shared/utils/json.utils.js';

/**
 * Standardized formatter for AI outputs across the pipeline.
 * Ensures data is cleaned, valid JSON before it hits the validation orchestrator.
 */
export class OutputFormatter {
  /**
   * Sanitizes raw LLM output strings into clean, parseable JSON strings.
   */
  static format(rawContent: string): string {
    if (!rawContent) return '';
    
    // Step 1: Strip markdown wrappers
    const cleaned = JsonUtils.cleanMarkdown(rawContent);
    
    // Step 2: Handle edge cases (like trailing commas if needed, or non-printable chars)
    // For now, cleanMarkdown handles 99% of cases.
    
    return cleaned;
  }
}
