import { z } from 'zod';

export const EntityAttributeSchema = z.object({
  name: z.string().describe("Name of the attribute (e.g., 'email', 'price')"),
  type: z.enum(["string", "number", "boolean", "date", "reference", "json"]).describe("Data type of the attribute"),
  isRequired: z.boolean().describe("Whether this attribute is required")
});

export const EntitySchema = z.object({
  name: z.string().describe("Name of the entity (e.g., 'User', 'Invoice')"),
  description: z.string().describe("Brief description of the entity's role"),
  attributes: z.array(EntityAttributeSchema).describe("Data fields for this entity"),
  relationships: z.array(z.object({
    targetEntity: z.string(),
    type: z.enum(["one-to-one", "one-to-many", "many-to-many"])
  })).describe("Relationships to other entities. If none, return an empty array.")
});

export const PageSchema = z.object({
  name: z.string().describe("Name of the page (e.g., 'Dashboard', 'Settings')"),
  route: z.string().describe("URL route (e.g., '/dashboard', '/settings')"),
  description: z.string().describe("What the user does on this page"),
  requiredEntities: z.array(z.string()).describe("Entities accessed or modified on this page (by name)"),
  layoutTemplate: z.enum(["dashboard", "landing", "auth", "crud-list", "crud-detail", "form", "blank"]).describe("The Team 4 layout template to use")
});

export const WorkflowSchema = z.object({
  name: z.string().describe("Name of the workflow"),
  trigger: z.enum(["user_action", "scheduled", "system_event"]),
  description: z.string().describe("Step-by-step logic description")
});

export const AppUnderstandingSchema = z.object({
  appName: z.string().describe("The normalized, human-readable name of the application"),
  appType: z.enum(["dashboard", "e-commerce", "social", "productivity", "internal-tool", "crm", "saas", "other"]).describe("The core archetype of the application"),
  targetAudience: z.string().describe("Who is the primary user of this application?"),
  features: z.array(z.string()).describe("A list of core features extracted from the user's prompt"),
  pages: z.array(PageSchema).describe("Structured pages/views required"),
  entities: z.array(EntitySchema).describe("Structured data entities with attributes and relationships"),
  workflows: z.array(WorkflowSchema).describe("Core business logic workflows"),
  authRequirements: z.object({
    needsAuth: z.boolean(),
    roles: z.array(z.string()).describe("Required user roles (e.g., ['admin', 'user'])")
  }).describe("Authentication and RBAC requirements")
});

export type AppUnderstanding = z.infer<typeof AppUnderstandingSchema>;
