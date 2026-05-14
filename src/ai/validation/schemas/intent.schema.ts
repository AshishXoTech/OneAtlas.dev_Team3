import { z } from 'zod';

/**
 * Validation schema for the primary intent extraction stage.
 * Used to define the high-level application identity.
 */
export const IntentSchema = z.object({
  primaryIntent: z.string()
    .describe("A highly concise, 3-7 word summary title representing what the user wants to build.")
});

export type Intent = z.infer<typeof IntentSchema>;
