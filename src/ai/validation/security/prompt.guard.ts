import { logger } from '../../shared/utils/logger.js';

export class PromptGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PromptGuardError';
  }
}

/**
 * Heuristic-based adversarial prompt detection.
 * Runs synchronously at zero cost — no LLM calls.
 * Acts as the FIRST line of defense before any expensive AI work is triggered.
 */
export class PromptGuard {
  /**
   * Patterns targeting jailbreak and prompt injection attacks.
   * Matches common direct override instructions used to bypass LLM guardrails.
   */
  private static readonly JAILBREAK_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
    /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|context|rules?)/i,
    /you\s+are\s+now\s+(a\s+)?(?!an?\s+app)/i,  // Still useful but let's watch for false positives
    /act\s+as\s+(if\s+you\s+are\s+)?(a\s+)?(?!an?\s+(app|platform|tool|builder|assistant))/i, // Added builder/assistant to allowed roles
    /pretend\s+(you\s+are|to\s+be)\s+(?!an?\s+(app|builder|assistant|platform))/i, // Added lookahead to allow legitimate role-play
    /bypass\s+(all\s+)?(safety|security|guardrail|filter)/i,
    /reveal\s+(your\s+)?(system\s+prompt|instructions?|internal\s+prompt)/i,
    /print\s+(your\s+)?(system\s+prompt|instructions?)/i,
    /what\s+(are\s+your|is\s+your)\s+(system\s+prompt|instructions?)/i,
    /mine\s+crypto(currency)?/i,
    /generate\s+(malware|ransomware|virus|exploit)/i,
    /\bDAN\b/,           // "Do Anything Now" — well-known jailbreak
    /jailbreak/i,
  ];

  /**
   * Validates the raw user prompt for adversarial content.
   * Throws PromptGuardError immediately if a threat is detected.
   */
  static validate(rawPrompt: string): void {
    // 1. Length sanity check — extremely long prompts may be token-stuffing attacks
    // We relax this for Team 3 to allow for semantic distillation of larger contexts (up to ~8k tokens)
    if (rawPrompt.length > 32000) {
      logger.warn('PromptGuard', 'PROMPT_TOO_LONG', 'Prompt exceeds absolute security limit.', { length: rawPrompt.length });
      throw new PromptGuardError(`Prompt is too long (${rawPrompt.length} characters). Security limit is 32,000.`);
    }

    // 2. Jailbreak pattern matching
    for (const pattern of this.JAILBREAK_PATTERNS) {
      if (pattern.test(rawPrompt)) {
        logger.warn('PromptGuard', 'JAILBREAK_DETECTED', 'Adversarial prompt pattern detected. Request rejected.', {
          matchedPattern: pattern.toString()
        });
        throw new PromptGuardError('Your request contains content that cannot be processed by the application synthesis engine. Please describe the app you want to build.');
      }
    }

    logger.info('PromptGuard', 'PROMPT_SAFE', 'Prompt passed adversarial validation.');
  }
}
