import { logger } from '../../shared/utils/logger.js';

/**
 * Principal-grade utility for safe AI response extraction.
 * Prevents "Cannot read properties of undefined" crashes.
 */
export class SafeCompletionExtractor {
  /**
   * Safely extracts text content from an OpenAI-compatible completion object.
   * Performs multi-level null checks and optional chaining.
   */
  static extractOpenAI(completion: any, providerName: string): string {
    if (!completion) {
      logger.warn('ProviderAdapter', 'EMPTY_RESPONSE', `Provider ${providerName} returned a null completion.`);
      return '';
    }

    // Defensive check for choices array
    if (!Array.isArray(completion.choices) || completion.choices.length === 0) {
      // Check if it's an error payload disguised as a completion
      if (completion.error) {
        throw new Error(`Provider ${providerName} returned error: ${completion.error.message || JSON.stringify(completion.error)}`);
      }
      
      logger.warn('ProviderAdapter', 'EMPTY_CHOICES', `Provider ${providerName} returned zero choices.`, { completion });
      return '';
    }

    const firstChoice = completion.choices[0];
    const content = firstChoice?.message?.content || firstChoice?.text || '';

    if (!content && firstChoice?.finish_reason === 'content_filter') {
      logger.error('ProviderAdapter', 'CONTENT_FILTERED', `Provider ${providerName} filtered the response.`);
      throw new Error(`Content filtered by ${providerName}`);
    }

    return content;
  }

  /**
   * Safely extracts text content from an Anthropic message object.
   */
  static extractAnthropic(response: any, providerName: string): string {
    if (!response || !Array.isArray(response.content) || response.content.length === 0) {
      logger.warn('ProviderAdapter', 'EMPTY_RESPONSE', `Provider ${providerName} returned a null or empty content array.`);
      return '';
    }

    const firstBlock = response.content[0];
    if (firstBlock && 'text' in firstBlock) {
      return firstBlock.text;
    }

    return '';
  }

  /**
   * Safely extracts usage metrics from a completion object.
   * Handles both OpenAI and Anthropic shapes.
   */
  static extractUsage(completion: any) {
    // OpenAI shape
    if (completion?.usage) {
      return {
        promptTokens: completion.usage.prompt_tokens ?? completion.usage.input_tokens ?? 0,
        completionTokens: completion.usage.completion_tokens ?? completion.usage.output_tokens ?? 0,
        totalTokens: completion.usage.total_tokens ?? 0,
      };
    }

    // Anthropic shape
    if (completion?.usage?.input_tokens !== undefined) {
      const input = completion.usage.input_tokens || 0;
      const output = completion.usage.output_tokens || 0;
      return {
        promptTokens: input,
        completionTokens: output,
        totalTokens: input + output,
      };
    }

    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}
