import { AppUnderstanding, EntityNode } from '../../shared/types/app-understanding.types.js';

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
    if (!spec || !Array.isArray(spec.entities)) {
      return; 
    }

    const appSpec = spec as AppUnderstanding;

    this.checkTopologyLimits(appSpec);
    this.checkDanglingRelations(appSpec);
    this.checkCyclicDependencies(appSpec);
  }

  /**
   * Enforces strict graph size limits to prevent resource exhaustion attacks.
   */
  private static checkTopologyLimits(spec: AppUnderstanding): void {
    if (spec.entities.length > TOPOLOGY_LIMITS.MAX_ENTITIES) {
      throw new SemanticGraphError(
        `Graph Topology Violation: Extracted ${spec.entities.length} entities, but the maximum allowed is ${TOPOLOGY_LIMITS.MAX_ENTITIES}. This may indicate a malicious or overly complex prompt.`
      );
    }

    if (spec.workflows && spec.workflows.length > TOPOLOGY_LIMITS.MAX_WORKFLOWS) {
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

    for (const wf of spec.workflows || []) {
      const stepCount = wf.steps?.length ?? 0;
      if (stepCount > TOPOLOGY_LIMITS.MAX_WORKFLOW_STEPS) {
        throw new SemanticGraphError(
          `Graph Topology Violation: Workflow '${wf.name}' has ${stepCount} steps, but the maximum allowed is ${TOPOLOGY_LIMITS.MAX_WORKFLOW_STEPS}.`
        );
      }
    }
  }


  /**
   * Ensures every targetEntity in a relation actually exists in the graph.
   */
  private static checkDanglingRelations(spec: AppUnderstanding): void {
    const validEntityIds = new Set(spec.entities.map(e => e.id));
    const validEntityNames = new Set(spec.entities.map(e => e.name)); // Sometimes AI outputs names instead of IDs

    for (const entity of spec.entities) {
      if (!entity.relations) continue;

      for (const rel of entity.relations) {
        const target = rel.targetEntity;
        if (!validEntityIds.has(target) && !validEntityNames.has(target)) {
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
    // Build adjacency list. Map entity ID -> array of related entity IDs.
    const adjList = new Map<string, string[]>();
    
    // Helper to resolve name or ID to an ID
    const resolveId = (target: string): string | undefined => {
      const found = spec.entities.find(e => e.id === target || e.name === target);
      return found?.id;
    };

    for (const entity of spec.entities) {
      const neighbors: string[] = [];
      for (const rel of entity.relations || []) {
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
          // Cycle detected!
          const cyclePath = [...path, neighbor].map(id => spec.entities.find(e => e.id === id)?.name || id).join(' -> ');
          throw new SemanticGraphError(`Cyclical Dependency Detected: ${cyclePath}. Data models cannot have infinite dependency loops.`);
        }
        if (!state.has(neighbor) || state.get(neighbor) === 0) {
          if (dfs(neighbor, [...path, neighbor])) return true;
        }
      }

      state.set(nodeId, 2);
      return false;
    };

    for (const entity of spec.entities) {
      if (!state.has(entity.id)) {
        dfs(entity.id, [entity.id]);
      }
    }
  }
}
