import { z } from 'zod';

export const AppUnderstandingSchema = z.object({
  appName: z.string()
    .describe("The normalized, human-readable name of the application"),
  
  appType: z.enum(["dashboard", "e-commerce", "social", "productivity", "internal-tool", "other"])
    .describe("The core archetype of the application"),
  
  features: z.array(z.string())
    .describe("A list of core features extracted from the user's prompt"),
  
  pages: z.array(z.string())
    .describe("A list of required pages/views to support the features"),
  
  entities: z.array(z.string())
    .describe("High-level data entities detected (e.g., 'User', 'Lead', 'Product')"),
  
  workflows: z.array(z.string())
    .describe("Core business logic workflows detected")
});

export type AppUnderstanding = z.infer<typeof AppUnderstandingSchema>;
