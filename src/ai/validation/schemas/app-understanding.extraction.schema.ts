import { z } from 'zod';

export const EntityAttributeExtractionSchema = z.object({
  name: z.string(),
  type: z.string(),
  isRequired: z.boolean().optional()
});

export const EntityExtractionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  attributes: z.array(EntityAttributeExtractionSchema).default([]),
  relationships: z.array(z.object({
    targetEntity: z.string(),
    type: z.string()
  })).default([])
});

export const PageExtractionSchema = z.object({
  name: z.string(),
  route: z.string().optional(),
  description: z.string().optional(),
  requiredEntities: z.array(z.string()).default([]),
  layoutTemplate: z.string().optional()
});

export const WorkflowExtractionSchema = z.object({
  name: z.string(),
  trigger: z.string().optional(),
  description: z.string().optional()
});

export const AppUnderstandingExtractionSchema = z.object({
  appName: z.string().optional(),
  appType: z.string().optional(),
  targetAudience: z.string().optional(),
  features: z.array(z.string()).default([]),
  pages: z.array(PageExtractionSchema).default([]),
  entities: z.array(EntityExtractionSchema).default([]),
  workflows: z.array(WorkflowExtractionSchema).default([]),
  authRequirements: z.object({
    needsAuth: z.boolean().optional(),
    roles: z.array(z.string()).optional()
  }).optional()
});

export type AppUnderstandingExtraction = z.infer<typeof AppUnderstandingExtractionSchema>;
