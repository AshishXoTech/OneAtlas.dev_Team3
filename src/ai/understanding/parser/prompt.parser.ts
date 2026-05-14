import { sanitizePrompt, extractKeywords } from './parser.utils.js';

export interface ParsedPrompt {
  original: string;
  sanitized: string;
  keywords: string[];
  characterCount: number;
}

export class PromptParser {
  /**
   * Pre-processes raw user input into a clean object before feeding into the AI pipeline.
   * Eliminates messy data formats that could confuse the LLM prompt.
   */
  parse(rawPrompt: string): ParsedPrompt {
    return {
      original: rawPrompt.trim(),
      sanitized: sanitizePrompt(rawPrompt),
      keywords: extractKeywords(rawPrompt),
      characterCount: rawPrompt.length,
    };
  }
}
