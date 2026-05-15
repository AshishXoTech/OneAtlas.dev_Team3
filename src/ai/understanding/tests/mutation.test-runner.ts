import 'dotenv/config';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { MutationEngine } from '../mutation/mutation.engine.js';
import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import { logger } from '../../shared/utils/logger.js';

const MOCK_BASE_APP: AppUnderstanding = {
  appName: 'Base CRM',
  appType: 'internal-tool',
  features: [
    { id: 'feat_1', name: 'Lead Management', description: 'Manage sales leads' }
  ],
  pages: [
    { id: 'page_1', name: 'Dashboard', route: '/dashboard', description: 'Main CRM view', requiredEntities: ['ent_1'], layoutTemplate: 'dashboard' }
  ],
  entities: [
    { 
      id: 'ent_1', 
      name: 'Lead', 
      description: 'A potential customer',
      attributes: [{ name: 'name', type: 'string', isRequired: true }],
      relations: []
    }
  ],
  workflows: [
    { id: 'wf_1', name: 'Create Lead', description: 'User submits a new lead', triggerType: 'USER_ACTION', executionMode: 'SYNC', steps: ['Submit lead form', 'Save to DB'] }
  ]
};

const TEST_CASES = [
  {
    name: 'ADD Mutation',
    prompt: 'Add Stripe subscription billing to the app.',
    verify: (result: any) => result.data.entities.some((e: any) => e.name.includes('Subscription') || e.name.includes('Billing')) && !result.requiresGlobalRewrite
  },
  {
    name: 'REMOVE Mutation',
    prompt: 'Remove the lead management feature and the Create Lead workflow.',
    verify: (result: any) => !result.data.workflows.some((w: any) => w.id === 'wf_1') && !result.requiresGlobalRewrite
  },
  {
    name: 'GLOBAL_REWRITE Mutation',
    prompt: 'Actually, scrap the CRM. Make this a 2D platformer video game instead.',
    verify: (result: any) => result.requiresGlobalRewrite === true
  }
];

export async function runMutationTests(): Promise<void> {
  const router = new ModelRouter({ 
    openaiKey: process.env.OPENAI_API_KEY, 
    groqKey: process.env.GROQ_API_KEY, 
    geminiKey: process.env.GEMINI_API_KEY 
  });
  const engine = new MutationEngine(router);

  logger.info('MutationTestRunner', 'START', `Running ${TEST_CASES.length} mutation test cases.`);

  let passed = 0;
  for (const tc of TEST_CASES) {
    console.log(`\n▶️ Running Test: ${tc.name}`);
    console.log(`   Prompt: "${tc.prompt}"`);
    
    try {
      const result = await engine.mutate(MOCK_BASE_APP, tc.prompt);
      const isSuccess = tc.verify(result);
      
      if (isSuccess) {
        console.log(`   ✅ PASS`);
        passed++;
      } else {
        console.log(`   ❌ FAIL (Verification failed)`);
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.log(`   ❌ FAIL (Exception)`);
      console.error(error);
    }
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`🧪 Mutation Suite Summary: ${passed} passed / ${TEST_CASES.length - passed} failed`);
  console.log(`──────────────────────────────────────────────────\n`);
}

if (process.argv[1]?.includes('mutation.test-runner')) {
  runMutationTests().catch(console.error);
}
