/**
 * CRITICAL BOUNDARY: Authoritative AppUnderstanding contract.
 * Intent Graph Topology.
 */

export interface FeatureNode {
  id: string;
  name: string;
  description: string;
}

export interface PageNode {
  id: string;
  name: string;
  route: string;
  description: string;
  requiredEntities: string[];
  layoutTemplate: string;
}

export interface EntityAttribute {
  name: string;
  type: string;
  isRequired: boolean;
}

export interface EntityRelation {
  targetEntity: string;
  type: string;
}

export interface EntityNode {
  id: string;
  name: string;
  description: string;
  attributes: EntityAttribute[];
  relations: EntityRelation[];
  
  // Legacy aliases for backward compatibility with generation layer
  fields?: string[]; 
}

export interface WorkflowNode {
  id: string;
  name: string;
  trigger: string;
  description: string;
}

export interface AppUnderstanding {
  appName: string;
  appType: 'dashboard' | 'e-commerce' | 'social' | 'productivity' | 'internal-tool' | 'other';
  features: FeatureNode[];
  pages: PageNode[];
  entities: EntityNode[];
  workflows: WorkflowNode[];
  metadata?: {
    rawPrompt?: string;
  };
}

export type Entity = EntityNode;
