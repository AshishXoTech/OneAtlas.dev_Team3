import { z } from 'zod';
import { logger } from './logger.js';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    logger.info('EnvValidator', 'VALIDATED', 'Environment variables validated successfully.');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.issues.map(i => i.path.join('.')).join(', ');
      logger.error('EnvValidator', 'MISSING_KEYS', `Critical Environment Variables missing: ${missingKeys}`);
      throw new Error(`[Production Guard] Missing critical environment variables: ${missingKeys}. Please check your .env file.`);
    }
    throw error;
  }
}
