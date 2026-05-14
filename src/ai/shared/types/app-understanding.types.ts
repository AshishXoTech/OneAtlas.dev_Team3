/**
 * CRITICAL BOUNDARY: Contract boundary between Teammate 1 (AI Layer) and Teammate 2 (Generation Engine).
 * DO NOT modify without cross-team agreement.
 */
/**
 * TODO: Define app-understanding.types structure
 */
export interface AppUnderstandingTypes {
  // Add properties here
}

export interface Entity {
  name: string;
  fields: string[];
  relations: string[];
}

export interface AppUnderstanding {
  appName: string;
  entities: Entity[];
}
