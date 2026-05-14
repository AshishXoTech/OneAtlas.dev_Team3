/**
 * CRITICAL BOUNDARY: Authoritative AppUnderstanding contract shared between
 * Team 3 AI Understanding Layer (producer) and Generation Engine (consumer).
 *
 * DO NOT modify without cross-team agreement.
 *
 * Entity objects are constructed by the Understanding Orchestrator from
 * the AI-extracted entity names. The generation engine uses .name, .fields,
 * and .relations to drive code generation.
 */

export interface Entity {
  /** PascalCase entity name, e.g. "User", "Product" */
  name: string;
  /**
   * Field names for this entity. The generation engine maps these
   * through field.generator.ts heuristics → FieldSchema objects.
   */
  fields: string[];
  /** Names of related entity types, e.g. ["Order", "Product"] */
  relations: string[];
}

export interface AppUnderstanding {
  /** Normalized, human-readable app name, e.g. "CRM Lead Dashboard" */
  appName: string;
  /** Core app archetype — used to guide generation strategy */
  appType: 'dashboard' | 'e-commerce' | 'social' | 'productivity' | 'internal-tool' | 'other';
  /** High-level capability list, e.g. ["user authentication", "stripe payments"] */
  features: string[];
  /** UI route names, e.g. ["dashboard", "checkout", "login"] */
  pages: string[];
  /** Structured database entity objects — drives Prisma schema + CRUD generation */
  entities: Entity[];
  /** Business logic workflow names, e.g. ["user registration", "order checkout"] */
  workflows: string[];
  /** Pipeline metadata passed through from the raw user prompt */
  metadata?: {
    rawPrompt?: string;
  };
}
