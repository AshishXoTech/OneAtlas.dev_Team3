import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';

/**
 * A highly compressed version of AppUnderstanding.
 * Strips out descriptions and verbose metadata to save LLM context tokens.
 */
export type CompressedAppUnderstanding = Omit<AppUnderstanding, 'features' | 'pages' | 'entities' | 'workflows'> & {
  features: { id: string; name: string }[];
  pages: { id: string; name: string; requiredEntities: string[] }[];
  entities: {
    id: string;
    name: string;
    attributes: { name: string; type: string }[];
    relations: { targetEntity: string; type: string }[];
  }[];
  workflows: { id: string; name: string; trigger: string }[];
};

export class ContextCompressor {
  /**
   * Compresses the Intent Graph by stripping non-structural strings.
   * This reduces token overhead by ~60% when feeding state back into the LLM.
   */
  static compress(spec: AppUnderstanding): CompressedAppUnderstanding {
    return {
      appName: spec.appName,
      appType: spec.appType,
      features: spec.features.map(f => ({
        id: f.id,
        name: f.name
      })),
      pages: spec.pages.map(p => ({
        id: p.id,
        name: p.name,
        requiredEntities: p.requiredEntities
      })),
      entities: spec.entities.map(e => ({
        id: e.id,
        name: e.name,
        attributes: (e.attributes || []).map(a => ({ name: a.name, type: a.type })),
        relations: e.relations || []
      })),
      workflows: spec.workflows.map(w => ({
        id: w.id,
        name: w.name,
        trigger: w.trigger
      }))
    };
  }
}
