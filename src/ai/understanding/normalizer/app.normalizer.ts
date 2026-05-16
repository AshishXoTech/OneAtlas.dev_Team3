import { FeatureNode, PageNode, WorkflowNode } from '../../shared/types/app-understanding.types.js';

export class AppNormalizer {
  normalizeName(name: string): string {
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  normalizePages(pages: PageNode[] = []): PageNode[] {
    if (!Array.isArray(pages)) return [];
    const seen = new Set();
    return pages.filter(p => {
      if (!p?.route || typeof p.route !== 'string') return false;
      const route = p.route.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-\/]/g, '');
      if (seen.has(route)) return false;
      seen.add(route);
      p.route = route.startsWith('/') ? route : `/${route}`;
      return true;
    });
  }

  normalizeFeatures(features: FeatureNode[] = []): FeatureNode[] {
    if (!Array.isArray(features)) return [];
    const seen = new Set();
    return features.filter(f => {
      if (!f?.name || typeof f.name !== 'string') return false;
      const name = f.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  normalizeWorkflows(workflows: WorkflowNode[] = []): WorkflowNode[] {
    if (!Array.isArray(workflows)) return [];
    const seen = new Set();
    return workflows.filter(w => {
      if (!w?.name || typeof w.name !== 'string') return false;
      const name = w.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      
      // Ensure enums are valid (fallback to generic if LLM hallucinates)
      const validTriggers = ['USER_ACTION', 'SYSTEM_EVENT', 'SCHEDULED'];
      if (!w.triggerType || !validTriggers.includes(w.triggerType)) w.triggerType = 'USER_ACTION';
      
      const validModes = ['SYNC', 'ASYNC'];
      if (!w.executionMode || !validModes.includes(w.executionMode)) w.executionMode = 'SYNC';
      
      // Ensure steps is always an array
      if (!w.steps || !Array.isArray(w.steps)) {
        w.steps = ["Execute Workflow"];
      }
      
      return true;
    });
  }

  normalizeEntities(entities: any[] = []): any[] {
    if (!Array.isArray(entities)) return [];

    // 1. Heuristic Canonical Deduplication
    const deduplicated = new Map<string, any>();
    const aliasMap = new Map<string, string>(); // Maps old IDs/names to canonical IDs

    for (const entity of entities) {
      if (!entity || !entity.name || !entity.id) continue;
      
      const normalizedName = this.normalizeName(entity.name).toLowerCase();
      let isDuplicate = false;

      // Ensure basic structure
      entity.attributes = Array.isArray(entity.attributes) ? entity.attributes : [];
      entity.relations = Array.isArray(entity.relations) ? entity.relations : [];

      for (const [canonicalId, existing] of deduplicated.entries()) {
        const existingName = this.normalizeName(existing.name).toLowerCase();
        
        // Ensure existing node structure is also safe
        existing.attributes = Array.isArray(existing.attributes) ? existing.attributes : [];
        existing.relations = Array.isArray(existing.relations) ? existing.relations : [];

        // Simple heuristic: If names match, or one is a subset of another (e.g. User vs UserProfile)
        // AND they share at least one attribute name, merge them.
        if (normalizedName === existingName || normalizedName.includes(existingName) || existingName.includes(normalizedName)) {
          const sharedAttrs = entity.attributes.some((a: any) => 
            typeof a?.name === 'string' && existing.attributes?.some((ea: any) => 
              typeof ea?.name === 'string' && ea.name.toLowerCase() === a.name.toLowerCase()
            )
          );
          
          if (sharedAttrs || (entity.attributes.length === 0 && existing.attributes.length === 0)) {
            // Merge attributes (deduplicate by name)
            const combinedAttrs = [...(existing.attributes || []), ...(entity.attributes || [])];
            existing.attributes = Array.from(new Map(
              combinedAttrs
                .filter(a => typeof a?.name === 'string')
                .map(a => [a.name.toLowerCase(), a])
            ).values());
            
            // Merge relations
            existing.relations = [...(existing.relations || []), ...(entity.relations || [])];
            
            aliasMap.set(entity.id, canonicalId);
            aliasMap.set(entity.name, canonicalId);
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        deduplicated.set(entity.id, entity);
        aliasMap.set(entity.name, entity.id);
      }
    }

    const mergedEntities = Array.from(deduplicated.values());

    // 2. DAG-Safe Relationship Normalization & Alias Resolution
    // IMPORTANT: Do NOT create reverse/bi-directional relations.
    // The graph MUST remain a Directed Acyclic Graph (DAG).
    // Only resolve aliases and remove dangling/duplicate relations.
    for (const entity of mergedEntities) {
      if (!Array.isArray(entity.relations)) {
        entity.relations = [];
        continue;
      }

      // Resolve any aliases in targetEntities (e.g., merged entity IDs)
      for (const rel of entity.relations) {
        if (rel?.targetEntity && aliasMap.has(rel.targetEntity)) {
          rel.targetEntity = aliasMap.get(rel.targetEntity)!;
        }
      }

      // Remove self-referencing relations (entity pointing to itself)
      entity.relations = entity.relations.filter((rel: any) => 
        rel?.targetEntity && rel.targetEntity !== entity.id && rel.targetEntity !== entity.name
      );

      // Deduplicate relations by targetEntity
      const seenTargets = new Set<string>();
      entity.relations = entity.relations.filter((rel: any) => {
        if (!rel?.targetEntity) return false;
        const key = rel.targetEntity.toLowerCase();
        if (seenTargets.has(key)) return false;
        seenTargets.add(key);
        return true;
      });
    }

    return mergedEntities;
  }
}
