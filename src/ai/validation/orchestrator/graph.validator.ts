import type { AppUnderstanding, EntityNode } from '../../shared/types/app-understanding.types.js';

export class SemanticGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemanticGraphError';
  }
}

/**
 * Hard topology limits. Graphs exceeding these thresholds are rejected
 * as potential resource exhaustion attacks on the generation/runtime engines.
 */
const TOPOLOGY_LIMITS = {
  MAX_ENTITIES: 50,
  MAX_WORKFLOWS: 30,
  MAX_RELATIONS_PER_ENTITY: 20,
  MAX_WORKFLOW_STEPS: 25,
};

export class GraphValidator {
  /**
   * Performs graph theory validation on the Intent Graph to catch semantic logic errors
   * that Zod syntax validation cannot detect.
   */
  static validate(spec: any): void {
    // Only run if the spec looks like an AppUnderstanding object
    if (!spec || typeof spec !== 'object') {
      return; // Skip for primitive results (e.g. AppType string)
    }

    // Check if this is a full graph or just a partial/different schema
    if (!('entities' in spec) && !('features' in spec)) {
      return; 
    }

    const appSpec = spec as AppUnderstanding;
    
    // Ensure core collections exist for full graphs
    if (!Array.isArray(appSpec.entities)) throw new SemanticGraphError('Graph missing entities array.');
    if (!Array.isArray(appSpec.features)) throw new SemanticGraphError('Graph missing features array.');
    if (!Array.isArray(appSpec.pages)) throw new SemanticGraphError('Graph missing pages array.');
    if (!Array.isArray(appSpec.workflows)) throw new SemanticGraphError('Graph missing workflows array.');

    // Node integrity MUST be checked first to ensure IDs/Names exist for further graph analysis
    this.checkNodeIntegrity(appSpec);
    
    this.checkTopologyLimits(appSpec);
    this.checkDanglingRelations(appSpec);
    this.checkCyclicDependencies(appSpec);
  }

  /**
   * Node integrity MUST be checked first to ensure IDs/Names exist for further graph analysis.
   */
  private static checkNodeIntegrity(spec: AppUnderstanding): void {
    if (!spec.entities) return;

    for (const entity of spec.entities) {
      if (!entity?.name) {
        throw new SemanticGraphError(`Integrity Violation: Entity in graph is missing a 'name' property.`);
      }

      // 1. Name Formatting (PascalCase for DB)
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(entity.name)) {
        throw new SemanticGraphError(`Naming Violation: Entity '${entity.name}' must be in PascalCase for Database compatibility.`);
      }

      // 2. Minimum Attributes
      if (!entity.attributes || !Array.isArray(entity.attributes) || entity.attributes.length === 0) {
        throw new SemanticGraphError(`Schema Violation: Entity '${entity.name}' has no attributes. Every entity must have at least one field.`);
      }

      // 3. ID Consistency
      if (!entity.id) {
        throw new SemanticGraphError(`Integrity Violation: Entity '${entity.name}' has no ID.`);
      }
      
      if (!entity.id.startsWith('ent_') && !entity.id.startsWith('e')) {
        entity.id = `ent_${entity.id.toString().replace(/^ent_/, '')}`;
      }
    }

    if (spec.pages) {
      for (const page of spec.pages) {
        if (!page?.route || typeof page.route !== 'string' || !page.route.startsWith('/')) {
          throw new SemanticGraphError(`Routing Violation: Page '${page?.name || 'unknown'}' has invalid route '${page?.route || 'undefined'}'. Routes must start with '/'.`);
        }
      }
    }
  }

  /**
   * Enforces strict graph size limits to prevent resource exhaustion attacks.
   */
  private static checkTopologyLimits(spec: AppUnderstanding): void {
    if (spec.entities.length > TOPOLOGY_LIMITS.MAX_ENTITIES) {
      throw new SemanticGraphError(
        `Graph Topology Violation: Extracted ${spec.entities.length} entities, but the maximum allowed is ${TOPOLOGY_LIMITS.MAX_ENTITIES}.`
      );
    }

    if (spec.workflows.length > TOPOLOGY_LIMITS.MAX_WORKFLOWS) {
      throw new SemanticGraphError(
        `Graph Topology Violation: Extracted ${spec.workflows.length} workflows, but the maximum allowed is ${TOPOLOGY_LIMITS.MAX_WORKFLOWS}.`
      );
    }

    for (const entity of spec.entities) {
      const relCount = entity.relations?.length ?? 0;
      if (relCount > TOPOLOGY_LIMITS.MAX_RELATIONS_PER_ENTITY) {
        throw new SemanticGraphError(
          `Graph Topology Violation: Entity '${entity.name}' has ${relCount} relations, but the maximum allowed per entity is ${TOPOLOGY_LIMITS.MAX_RELATIONS_PER_ENTITY}.`
        );
      }
    }
  }

  /**
   * Ensures every targetEntity in a relation actually exists in the graph.
   */
  private static checkDanglingRelations(spec: AppUnderstanding): void {
    const validEntityIds = new Set(spec.entities.filter(e => e?.id).map(e => e.id));
    const validEntityNames = new Set(spec.entities.filter(e => e?.name).map(e => e.name.toLowerCase())); 

    for (const entity of spec.entities) {
      if (!entity?.relations || !Array.isArray(entity.relations)) continue;

      for (const rel of entity.relations) {
        const target = rel?.targetEntity;
        if (!target) {
          throw new SemanticGraphError(`Integrity Violation: Relation in entity '${entity.name}' is missing 'targetEntity'.`);
        }

        const targetLower = target.toLowerCase();
        
        if (!validEntityIds.has(target) && !validEntityNames.has(targetLower)) {
          throw new SemanticGraphError(
            `Dangling Relation: Entity '${entity.name}' has a relation to '${target}', but '${target}' does not exist in the graph.`
          );
        }
      }
    }
  }

  /**
   * Detects infinite loops (A -> B -> A) using Depth First Search.
   */
  private static checkCyclicDependencies(spec: AppUnderstanding): void {
    const adjList = new Map<string, string[]>();
    
    const resolveId = (target: string): string | undefined => {
      if (!target) return undefined;
      const found = spec.entities.find(e => e.id === target || (e.name && e.name.toLowerCase() === target.toLowerCase()));
      return found?.id;
    };

    for (const entity of spec.entities) {
      if (!entity?.id) continue;
      const neighbors: string[] = [];
      for (const rel of entity.relations || []) {
        if (!rel?.targetEntity) continue;
        const targetId = resolveId(rel.targetEntity);
        if (targetId) neighbors.push(targetId);
      }
      adjList.set(entity.id, neighbors);
    }

    // 0 = unvisited, 1 = visiting (in current path), 2 = visited
    const state = new Map<string, number>();

    const dfs = (nodeId: string, path: string[]): boolean => {
      state.set(nodeId, 1);
      
      const neighbors = adjList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (state.get(neighbor) === 1) {
          const cyclePath = [...path, neighbor].map(id => spec.entities.find(e => e.id === id)?.name || id).join(' -> ');
          throw new SemanticGraphError(`Cyclical Dependency Detected: ${cyclePath}. Circular relationships are restricted in this runtime.`);
        }
        if (!state.has(neighbor) || state.get(neighbor) === 0) {
          if (dfs(neighbor, [...path, neighbor])) return true;
        }
      }

      state.set(nodeId, 2);
      return false;
    };

    for (const entity of spec.entities) {
      if (entity?.id && !state.has(entity.id)) {
        dfs(entity.id, [entity.id]);
      }
    }
  }
}
