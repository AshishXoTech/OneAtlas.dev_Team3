import { ModelRouter } from '../../gateway/router/model.router.js';
import { MutationClassifier } from './mutation.classifier.js';
import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import { MutationPatch } from '../../validation/schemas/mutation.schema.js';
import { logger } from '../../shared/utils/logger.js';
import { UnderstandingOrchestrator } from '../orchestrator/understanding.orchestrator.js';
import { AppNormalizer } from '../normalizer/app.normalizer.js';

import { MemoryManager } from '../memory/memory.manager.js';

export interface MutationResult {
  data: AppUnderstanding;
  requiresGlobalRewrite: boolean;
  appliedPatches: number;
}

export class MutationEngine {
  private classifier: MutationClassifier;
  private orchestrator: UnderstandingOrchestrator;
  private memory: MemoryManager;
  private appNormalizer: AppNormalizer;

  constructor(router: ModelRouter) {
    this.classifier = new MutationClassifier(router);
    this.orchestrator = new UnderstandingOrchestrator(router);
    this.memory = new MemoryManager();
    this.appNormalizer = new AppNormalizer();
  }

  async mutate(currentSpec: AppUnderstanding, mutationPrompt: string, sessionId: string = 'default-session'): Promise<MutationResult> {
    logger.info('MutationEngine', 'MUTATION_START', 'Processing mutation request.', { sessionId });

    const historyContext = this.memory.formatHistoryForPrompt(sessionId);

    // 1. Classify the mutation intent with compressed context and history
    const mutationResponse = await this.classifier.classify(currentSpec, mutationPrompt, historyContext);

    // 2. Handle global rewrite
    if (mutationResponse.requiresGlobalRewrite) {
      logger.warn('MutationEngine', 'GLOBAL_REWRITE', 'Mutation requires full architectural rewrite. Falling back to Orchestrator.');
      const newSpecResult = await this.orchestrator.process(mutationPrompt);
      return {
        data: newSpecResult.data,
        requiresGlobalRewrite: true,
        appliedPatches: 0
      };
    }

    // 3. Apply patches natively in-memory
    const originalSpec = JSON.parse(JSON.stringify(currentSpec)) as AppUnderstanding;
    const updatedSpec = JSON.parse(JSON.stringify(currentSpec)) as AppUnderstanding;

    let appliedCount = 0;
    for (const patch of mutationResponse.patches) {
      try {
        this.normalizePatch(patch);
        this.validatePatch(patch);
        this.applyPatch(updatedSpec, patch);
        appliedCount++;
      } catch (err) {
        logger.error('MutationEngine', 'PATCH_REJECTED', `Mutation patch failed validation/application: ${patch.operation}`, { 
          error: String(err), 
          patch 
        });
        // We continue to next patch — one bad patch shouldn't kill the whole intent if others are valid
      }
    }

    // 4. Post-Mutation Relation Target Resolution
    // The LLM may emit semantic IDs (e.g. "ent_lead") or entity names ("Lead")
    // that don't match the actual entity IDs in the graph (e.g. "ent_1").
    // Resolve these before validation.
    this.resolveRelationTargets(updatedSpec);

    // 5. Post-Mutation Graph Normalization & Invariant Enforcement
    try {
      // Re-run ALL normalizers to ensure the mutation didn't introduce messy strings or missing arrays
      updatedSpec.appName = this.appNormalizer.normalizeName(updatedSpec.appName);
      updatedSpec.features = this.appNormalizer.normalizeFeatures(updatedSpec.features);
      updatedSpec.pages = this.appNormalizer.normalizePages(updatedSpec.pages);
      updatedSpec.workflows = this.appNormalizer.normalizeWorkflows(updatedSpec.workflows);
      updatedSpec.entities = this.appNormalizer.normalizeEntities(updatedSpec.entities);

      const { GraphValidator } = await import('../../validation/orchestrator/graph.validator.js');
      GraphValidator.validate(updatedSpec);
      
    } catch (validationErr) {
      logger.error('MutationEngine', 'INVARIANT_VIOLATION', 'Mutation resulted in an invalid graph state. Rolling back.', { 
        error: String(validationErr),
        sessionId 
      });
      
      return {
        data: originalSpec,
        requiresGlobalRewrite: false,
        appliedPatches: 0
      };
    }

    this.memory.addTurn(sessionId, mutationPrompt, mutationResponse.patches);

    logger.info('MutationEngine', 'MUTATION_COMPLETE', 'Mutation applied successfully.', {
      appliedPatches: appliedCount
    });

    return {
      data: updatedSpec,
      requiresGlobalRewrite: false,
      appliedPatches: appliedCount
    };
  }

  private validatePatch(patch: MutationPatch): void {
    if (!patch.operation || !patch.targetScope) {
      throw new Error('Patch missing required fields: operation or targetScope');
    }

    if (patch.operation === 'ADD' || patch.operation === 'MODIFY') {
      if (!patch.payload) throw new Error(`${patch.operation} requires a payload`);
      
      const p = patch.payload;
      // Only require name for ADD. For MODIFY, we can update individual fields.
      if (patch.operation === 'ADD') {
        if (patch.targetScope === 'entity' && !p.name) throw new Error('Entity addition requires a name');
        if (patch.targetScope === 'page' && !p.route) throw new Error('Page addition requires a route');
        if (patch.targetScope === 'workflow' && !p.name) throw new Error('Workflow addition requires a name');
        if (patch.targetScope === 'feature' && !p.name) throw new Error('Feature addition requires a name');
      }
    }

    if (patch.operation === 'REMOVE' || patch.operation === 'MODIFY') {
      if (!patch.targetId) throw new Error(`${patch.operation} requires a targetId`);
    }
  }

  /**
   * Normalizes patch payloads to fix common AI non-determinism (e.g. entityId vs targetEntity)
   */
  private normalizePatch(patch: MutationPatch): void {
    if (!patch.payload) return;

    // 1. Fix relations (entityId/target -> targetEntity)
    if (patch.payload.relations && Array.isArray(patch.payload.relations)) {
      patch.payload.relations = patch.payload.relations.map((rel: any) => {
        if (!rel.targetEntity && (rel.entityId || rel.target)) {
          return { ...rel, targetEntity: rel.entityId || rel.target };
        }
        return rel;
      });
    }

    // 2. Fix attributes (fields -> attributes)
    if (patch.targetScope === 'entity' && patch.payload.fields && !patch.payload.attributes) {
      patch.payload.attributes = patch.payload.fields.map((f: any) => {
        return typeof f === 'string' ? { name: f, type: 'string' } : f;
      });
    }
  }

  private applyPatch(spec: AppUnderstanding, patch: MutationPatch): void {
    const scopeMap: Record<string, keyof AppUnderstanding> = {
      'feature': 'features',
      'page': 'pages',
      'entity': 'entities',
      'workflow': 'workflows'
    };

    const targetArrayName = scopeMap[patch.targetScope];
    if (!targetArrayName) throw new Error(`Invalid target scope: ${patch.targetScope}`);

    // Ensure array exists (Defensive Architecture)
    if (!spec[targetArrayName]) {
      (spec as any)[targetArrayName] = [];
    }

    const targetArray = spec[targetArrayName] as any[];

    switch (patch.operation) {
      case 'ADD':
        const newNode = { ...patch.payload };
        // Ensure ID exists, or generate one
        if (!newNode.id) {
          const prefix = patch.targetScope.slice(0, 3);
          newNode.id = `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
        }
        
        // Backwards compatibility mapping for generation engine
        if (patch.targetScope === 'entity') {
          newNode.attributes = newNode.attributes || [];
          newNode.relations = newNode.relations || [];
          if (!newNode.fields) {
            newNode.fields = newNode.attributes.map((a: any) => a.name);
          }
        }
        
        targetArray.push(newNode);
        break;

      case 'REMOVE':
        const removeIndex = targetArray.findIndex(n => n?.id === patch.targetId);
        if (removeIndex !== -1) {
          targetArray.splice(removeIndex, 1);
        } else {
          logger.warn('MutationEngine', 'NODE_NOT_FOUND', `Target ID ${patch.targetId} not found for REMOVE.`);
        }
        break;

      case 'MODIFY':
        const modifyIndex = targetArray.findIndex(n => n?.id === patch.targetId);
        if (modifyIndex !== -1) {
          // Selective merge to prevent wiping out nested structures
          const existing = targetArray[modifyIndex];
          targetArray[modifyIndex] = { ...existing, ...patch.payload };
          
          // Re-sync legacy fields if entity attributes changed
          if (patch.targetScope === 'entity' && patch.payload.attributes) {
            targetArray[modifyIndex].fields = patch.payload.attributes.map((a: any) => a.name);
          }
        } else {
          logger.warn('MutationEngine', 'NODE_NOT_FOUND', `Target ID ${patch.targetId} not found for MODIFY.`);
        }
        break;

      default:
        throw new Error(`Unsupported operation: ${patch.operation}`);
    }
  }

  /**
   * Resolves relation targets from semantic IDs (ent_lead, Lead) to actual graph IDs (ent_1).
   * The LLM generates semantically meaningful IDs, but existing entities may have different IDs.
   * This step bridges the gap before graph validation.
   */
  private resolveRelationTargets(spec: AppUnderstanding): void {
    // Build resolution map: name (lowercase) -> actual ID, semantic ID -> actual ID
    const resolutionMap = new Map<string, string>();
    
    for (const entity of spec.entities) {
      if (!entity?.id || !entity?.name) continue;
      
      // Map by lowercase name
      resolutionMap.set(entity.name.toLowerCase(), entity.id);
      
      // Map by the entity's own ID (identity mapping)
      resolutionMap.set(entity.id.toLowerCase(), entity.id);
      
      // Map by common LLM-generated semantic patterns (ent_lead, ent_subscription, etc.)
      const semanticId = `ent_${entity.name.toLowerCase().replace(/\s+/g, '_')}`;
      resolutionMap.set(semanticId, entity.id);
    }

    // Resolve all relation targets across all entities
    for (const entity of spec.entities) {
      if (!entity?.relations || !Array.isArray(entity.relations)) continue;
      
      for (const rel of entity.relations) {
        if (!rel?.targetEntity) continue;
        
        const targetLower = rel.targetEntity.toLowerCase();
        const resolved = resolutionMap.get(targetLower);
        
        if (resolved && resolved !== rel.targetEntity) {
          logger.info('MutationEngine', 'RELATION_RESOLVED', 
            `Resolved relation target: "${rel.targetEntity}" → "${resolved}" in entity "${entity.name}".`
          );
          rel.targetEntity = resolved;
        }
      }
    }
  }
}
