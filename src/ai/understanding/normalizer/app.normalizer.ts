import { FeatureNode, PageNode, WorkflowNode } from '../../shared/types/app-understanding.types.js';

export class AppNormalizer {
  normalizeName(name: string): string {
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  normalizePages(pages: PageNode[]): PageNode[] {
    const seen = new Set();
    return pages.filter(p => {
      const route = p.route.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-\/]/g, '');
      if (seen.has(route)) return false;
      seen.add(route);
      p.route = route.startsWith('/') ? route : `/${route}`;
      return true;
    });
  }

  normalizeFeatures(features: FeatureNode[]): FeatureNode[] {
    const seen = new Set();
    return features.filter(f => {
      const name = f.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  normalizeWorkflows(workflows: WorkflowNode[]): WorkflowNode[] {
    const seen = new Set();
    return workflows.filter(w => {
      const name = w.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      
      // Ensure enums are valid (fallback to generic if LLM hallucinates)
      const validTriggers = ['USER_ACTION', 'SYSTEM_EVENT', 'SCHEDULED'];
      if (!validTriggers.includes(w.triggerType)) w.triggerType = 'USER_ACTION';
      
      const validModes = ['SYNC', 'ASYNC'];
      if (!validModes.includes(w.executionMode)) w.executionMode = 'SYNC';
      
      // Ensure steps is always an array
      if (!w.steps || !Array.isArray(w.steps)) {
        w.steps = ["Execute Workflow"];
      }
      
      return true;
    });
  }

  normalizeEntities(entities: any[]): any[] {
    // 1. Heuristic Canonical Deduplication
    const deduplicated = new Map<string, any>();
    const aliasMap = new Map<string, string>(); // Maps old IDs/names to canonical IDs

    for (const entity of entities) {
      const normalizedName = this.normalizeName(entity.name).toLowerCase();
      let isDuplicate = false;

      for (const [canonicalId, existing] of deduplicated.entries()) {
        const existingName = this.normalizeName(existing.name).toLowerCase();
        // Simple heuristic: If names match, or one is a subset of another (e.g. User vs UserProfile)
        // AND they share at least one attribute name, merge them.
        if (normalizedName === existingName || normalizedName.includes(existingName) || existingName.includes(normalizedName)) {
          const sharedAttrs = entity.attributes?.some((a: any) => 
            existing.attributes?.some((ea: any) => ea.name.toLowerCase() === a.name.toLowerCase())
          );
          
          if (sharedAttrs || (!entity.attributes?.length && !existing.attributes?.length)) {
            // Merge attributes and relations
            const newAttrs = [...(existing.attributes || []), ...(entity.attributes || [])];
            existing.attributes = Array.from(new Map(newAttrs.map(a => [a.name.toLowerCase(), a])).values());
            
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

    // 2. Bi-Directional Relationship Enforcement & Alias Resolution
    for (const entity of mergedEntities) {
      if (!entity.relations) continue;

      // First, resolve any aliases in targetEntities
      for (const rel of entity.relations) {
        if (aliasMap.has(rel.targetEntity)) {
          rel.targetEntity = aliasMap.get(rel.targetEntity)!;
        }
      }

      // Second, enforce bi-directional links
      for (const rel of entity.relations) {
        const targetId = rel.targetEntity;
        const targetEntity = mergedEntities.find(e => e.id === targetId);
        
        if (targetEntity) {
          if (!targetEntity.relations) targetEntity.relations = [];
          
          // Check if the reverse relation already exists
          const reverseExists = targetEntity.relations.some((r: any) => 
            r.targetEntity === entity.id || r.targetEntity === entity.name
          );
          
          if (!reverseExists) {
            // Determine reverse type heuristically
            let reverseType = 'many-to-one';
            if (rel.type === 'one-to-one') reverseType = 'one-to-one';
            if (rel.type === 'many-to-many') reverseType = 'many-to-many';
            if (rel.type === 'many-to-one') reverseType = 'one-to-many';

            targetEntity.relations.push({
              targetEntity: entity.id,
              type: reverseType
            });
          }
        }
      }
    }

    return mergedEntities;
  }
}
