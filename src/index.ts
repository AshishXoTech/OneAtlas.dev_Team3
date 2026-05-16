/**
 * OneAtlas.dev — AI Understanding Layer (Team 3)
 * Authoritative entry point for the production-ready Intelligence Layer.
 */

import { validateEnv } from './ai/shared/utils/env.validation.js';

// 1. Enforce strict environment validation on library load
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}

// 2. Export Core Orchestration Logic
export { UnderstandingChain } from './ai/prompts/chains/understanding.chain.js';
export { ModelRouter } from './ai/gateway/router/model.router.js';
export { ValidationOrchestrator } from './ai/validation/orchestrator/validation.orchestrator.js';

// 3. Export Domain Contracts & Types
export * from './ai/shared/types/app-understanding.types.js';

// 4. Export Utilities
export { logger } from './ai/shared/utils/logger.js';
export { tracer } from './ai/shared/utils/intelligence_trace.js';
