import 'dotenv/config';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { ValidationOrchestrator } from '../../validation/orchestrator/validation.orchestrator.js';
import { FeatureSchema } from '../../validation/schemas/feature.schema.js';
import { logger } from '../../shared/utils/logger.js';

// A mock AI Provider that explicitly hallucinates a circular dependency
class HallucinatingProvider {
  async generate() {
    return {
      content: JSON.stringify({
        features: [{ id: 'feat_1', name: 'Auth', description: 'desc' }],
        pages: [],
        workflows: [],
        entities: [
          {
            id: 'ent_1',
            name: 'User',
            description: 'User model',
            attributes: [],
            relations: [{ targetEntity: 'ent_2', type: 'one-to-one' }] // User requires Profile
          },
          {
            id: 'ent_2',
            name: 'Profile',
            description: 'Profile model',
            attributes: [],
            relations: [{ targetEntity: 'ent_1', type: 'one-to-one' }] // Profile requires User (Cycle!)
          }
        ]
      })
    };
  }
}

// A mock Router to intercept the provider
class MockRouter extends ModelRouter {
  getProviderForTask(taskType: string): any {
    return { 
      provider: new HallucinatingProvider() as any, 
      config: { 
        preferredTier: 'FAST',
        primaryProvider: 'mock',
        fallbackProviders: []
      } 
    };
  }
}

export async function runRecoveryTests() {
  logger.info('RecoveryTestRunner', 'START', `Running Semantic Graph Recovery Test.`);
  
  const router = new MockRouter({ openaiKey: 'mock', groqKey: 'mock', geminiKey: 'mock' });
  const orchestrator = new ValidationOrchestrator(router.getProviderForTask('mock').provider);

  console.log(`\n▶️ Test: Detecting and Repairing a Circular Dependency (Entity 1 <-> Entity 2)`);
  
  try {
    const result = await orchestrator.executeWithValidation({
      prompt: 'Extract models for a user and profile.',
      systemPrompt: 'Mock',
      schemaName: 'SemanticRecoveryTest',
      modelTier: 'FAST',
      schema: FeatureSchema
    }, {
      maxAttempts: 1, // Only try once to see if it catches it and fails
      baseDelayMs: 0,
      maxDelayMs: 0,
      enableRecovery: false // Turn off AI recovery so we can inspect the exact error thrown
    });

    if (result.success) {
      console.log(`   ❌ FAIL: Orchestrator failed to catch the circular dependency. It passed validation.`);
    } else {
      if (result.error.details?.includes('Cyclical Dependency Detected')) {
        console.log(`   ✅ PASS: Orchestrator successfully caught SemanticGraphError: ${result.error.details}`);
      } else {
        console.log(`   ❌ FAIL: Caught an error, but it was not the SemanticGraphError. Details: ${result.error.details}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

if (process.argv[1]?.includes('recovery.test-runner')) {
  runRecoveryTests().catch(console.error);
}
