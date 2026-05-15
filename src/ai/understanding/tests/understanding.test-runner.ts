import 'dotenv/config'; // Loads .env before any process.env access
import { TEST_SUITE, TestCase } from './understanding.test-suite.js';
import { UnderstandingOrchestrator } from '../orchestrator/understanding.orchestrator.js';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { logger } from '../../shared/utils/logger.js';

interface TestResult {
  name: string;
  passed: boolean;
  latencyMs?: number;
  confidence?: number;
  appType?: string;
  error?: string;
  tags: TestCase['tags'];
}

/**
 * Runs the full stress test suite against the live pipeline.
 * Requires OPENAI_API_KEY to be set in the environment.
 */
export async function runStressTests(): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;

  if (!openaiKey && !groqKey && !geminiKey && !deepseekKey && !openrouterKey && !mistralKey) {
    throw new Error('At least one API Key must be set.');
  }

  const router = new ModelRouter({ openaiKey, groqKey, geminiKey, deepseekKey, openrouterKey, mistralKey });
  const orchestrator = new UnderstandingOrchestrator(router);
  const results: TestResult[] = [];

  logger.info('StressTestRunner', 'SUITE_START', `Running ${TEST_SUITE.length} test cases.`);

  for (const testCase of TEST_SUITE) {
    const start = Date.now();
    try {
      const result = await orchestrator.process(testCase.prompt);
      const passed = testCase.expectFailure ? false : true;
      const latencyMs = Date.now() - start;

      results.push({
        name: testCase.name,
        passed,
        latencyMs: result.latencyMs,
        confidence: result.confidence.score,
        appType: result.data.appType,
        tags: testCase.tags
      });

      logger.info('StressTestRunner', 'TEST_PASS', ` PASS: ${testCase.name}`, {
        appType: result.data.appType,
        confidence: result.confidence.score,
        latencyMs
      });

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const passed = testCase.expectFailure === true; // Expected failures count as passing

      results.push({ name: testCase.name, passed, error, tags: testCase.tags });

      if (passed) {
        logger.info('StressTestRunner', 'EXPECTED_FAILURE', ` EXPECTED FAIL: ${testCase.name}`, { error });
      } else {
        logger.error('StressTestRunner', 'TEST_FAIL', ` FAIL: ${testCase.name}`, { error });
      }
    }
  }

  // ── Report Summary ──────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🧪 Test Suite Summary: ${passed} passed / ${failed} failed / ${results.length} total`);
  console.log(`${'─'.repeat(50)}\n`);

  results.filter(r => !r.passed).forEach(r => {
    console.log(`  ❌ ${r.name} → ${r.error || 'Unexpected success on expected failure'}`);
  });
}

// Allow running directly: `node understanding.test-runner.js`
if (process.argv[1]?.includes('understanding.test-runner')) {
  runStressTests().catch(console.error);
}
