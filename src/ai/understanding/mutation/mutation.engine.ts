import { ModelRouter } from '../../gateway/router/model.router.js';
import { MutationClassifier } from './mutation.classifier.js';
import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import { MutationPatch } from '../../validation/schemas/mutation.schema.js';
import { logger } from '../../shared/utils/logger.js';
import { UnderstandingOrchestrator } from '../orchestrator/understanding.orchestrator.js';

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

  constructor(router: ModelRouter) {
    this.classifier = new MutationClassifier(router);
    this.orchestrator = new UnderstandingOrchestrator(router);
    this.memory = new MemoryManager();
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
    const updatedSpec = JSON.parse(JSON.stringify(currentSpec)) as AppUnderstanding;

    for (const patch of mutationResponse.patches) {
      try {
        this.applyPatch(updatedSpec, patch);
      } catch (err) {
        logger.error('MutationEngine', 'PATCH_FAILED', `Failed to apply patch: ${patch.operation} on ${patch.targetScope}`, { error: String(err), patch });
        // We continue applying other patches if one fails (best-effort semantic merge)
      }
    }

    this.memory.addTurn(sessionId, mutationPrompt, mutationResponse.patches);

    logger.info('MutationEngine', 'MUTATION_COMPLETE', 'Mutation applied successfully.', {
      appliedPatches: mutationResponse.patches.length
    });

    return {
      data: updatedSpec,
      requiresGlobalRewrite: false,
      appliedPatches: mutationResponse.patches.length
    };
  }

  private applyPatch(spec: AppUnderstanding, patch: MutationPatch): void {
    const scopeMap: Record<string, keyof AppUnderstanding> = {
      'feature': 'features',
      'page': 'pages',
      'entity': 'entities',
      'workflow': 'workflows'
    };

    const targetArrayName = scopeMap[patch.targetScope];
    
    if (!targetArrayName) {
      throw new Error(`Invalid target scope: ${patch.targetScope}`);
    }

    const targetArray = spec[targetArrayName] as any[];

    switch (patch.operation) {
      case 'ADD':
        // Ensure legacy fields mapping for generation engine backwards compatibility
        if (patch.targetScope === 'entity' && patch.payload && !patch.payload.fields) {
          patch.payload.fields = patch.payload.attributes?.map((a: any) => a.name) || [];
        }
        targetArray.push(patch.payload);
        break;

      case 'REMOVE':
        if (!patch.targetId) throw new Error('REMOVE operation requires a targetId');
        const removeIndex = targetArray.findIndex(n => n.id === patch.targetId);
        if (removeIndex !== -1) {
          targetArray.splice(removeIndex, 1);
        } else {
          logger.warn('MutationEngine', 'NODE_NOT_FOUND', `Target ID ${patch.targetId} not found for REMOVE.`);
        }
        break;

      case 'MODIFY':
        if (!patch.targetId) throw new Error('MODIFY operation requires a targetId');
        const modifyIndex = targetArray.findIndex(n => n.id === patch.targetId);
        if (modifyIndex !== -1) {
          // Deep merge the payload over the existing node
          targetArray[modifyIndex] = { ...targetArray[modifyIndex], ...patch.payload };
          // Re-sync legacy fields array if attributes were modified
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
}
