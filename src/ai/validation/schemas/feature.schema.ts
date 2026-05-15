import { z } from 'zod';

export const FeatureSchema = z.object({
  features: z.array(z.object({
    id: z.string().describe("Unique identifier for the feature"),
    name: z.string().describe("Functional capability name"),
    description: z.string().describe("Detailed description of the feature")
  })).describe("Specific functional capabilities"),
  
  pages: z.array(z.object({
    id: z.string().describe("Unique identifier for the page"),
    name: z.string().describe("Name of the page/view"),
    route: z.string().describe("URL route path"),
    description: z.string().describe("What happens on this page"),
    requiredEntities: z.array(z.string()).describe("List of entity IDs or names required by this page"),
    layoutTemplate: z.string().describe("Template to use (e.g. dashboard, list, blank)")
  })).describe("Required UI views/routes"),
  
  entities: z.array(z.object({
    id: z.string().describe("Unique identifier for the entity"),
    name: z.string().describe("PascalCase name of the model"),
    description: z.string().describe("Purpose of this entity"),
    attributes: z.array(z.object({
      name: z.string(),
      type: z.string(),
      isRequired: z.boolean()
    })).describe("List of detailed data attributes"),
    relations: z.array(z.object({
      targetEntity: z.string().describe("Name or ID of the related entity"),
      type: z.string().describe("e.g. one-to-many, many-to-many, one-to-one")
    })).describe("List of related models")
  })).describe("Database models and their structure"),
  
  workflows: z.array(z.object({
    id: z.string().describe("Unique identifier for the workflow"),
    name: z.string().describe("Name of the workflow"),
    trigger: z.string().describe("What triggers this workflow (e.g. user_action, system_event)"),
    description: z.string().describe("Detailed business logic flow")
  })).describe("Key business logic flows")
});

export type FeatureArchitecture = z.infer<typeof FeatureSchema>;
