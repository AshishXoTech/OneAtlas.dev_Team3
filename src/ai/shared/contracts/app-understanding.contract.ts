import { z } from 'zod';

/**
 * CRITICAL BOUNDARY: Contract boundary between Teammate 1 (AI Layer) and Teammate 2 (Generation Engine).
 * DO NOT modify without cross-team agreement.
 */

export const AppUnderstandingSchema = z.object({
  appName: z.string()
    .describe("The normalized, human-readable name of the application"),
  
  appType: z.enum(["dashboard", "e-commerce", "social", "productivity", "internal-tool", "other"])
    .describe("The core archetype of the application"),
  
  features: z.array(z.string())
    .describe("A list of core features extracted from the user's prompt"),
  
  pages: z.array(z.string())
    .describe("A list of required pages/views to support the features"),
  
  entities: z.array(z.object({
    name: z.string(),
    fields: z.array(z.string()),
    relations: z.array(z.string())
  })).describe("Structured database entity objects"),
  
  workflows: z.array(z.string())
    .describe("Core business logic workflows detected"),

  metadata: z.object({
    rawPrompt: z.string().optional()
  }).optional()
});

export type AppUnderstanding = z.infer<typeof AppUnderstandingSchema>;
