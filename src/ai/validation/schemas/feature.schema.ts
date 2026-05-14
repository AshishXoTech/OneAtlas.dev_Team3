import { z } from 'zod';

/**
 * Validation schema for the core feature and architecture extraction stage.
 * This is the primary driver for generating the application blueprint.
 */
export const FeatureSchema = z.object({
  features: z.array(z.string()).describe("Specific functional capabilities"),
  pages: z.array(z.string()).describe("Required UI views/routes"),
  entities: z.array(z.object({
    name: z.string().describe("PascalCase name of the model"),
    fields: z.array(z.string()).describe("List of data fields"),
    relations: z.array(z.string()).describe("List of related model names")
  })).describe("Database models and their structure"),
  workflows: z.array(z.string()).describe("Key business logic flows")
});

export type FeatureArchitecture = z.infer<typeof FeatureSchema>;
