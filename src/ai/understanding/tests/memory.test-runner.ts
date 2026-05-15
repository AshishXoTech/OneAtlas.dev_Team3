import 'dotenv/config';
import { ModelRouter } from '../../gateway/router/model.router.js';
import { MutationEngine } from '../mutation/mutation.engine.js';
import { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import { logger } from '../../shared/utils/logger.js';

const INITIAL_APP: AppUnderstanding = {
  appName: 'Blog Platform',
  appType: 'social',
  features: [
    { id: 'feat_1', name: 'Articles', description: 'Publish and read articles' }
  ],
  pages: [
    { id: 'page_1', name: 'Home', route: '/', description: 'Feed of articles', requiredEntities: ['ent_1'], layoutTemplate: 'list' }
  ],
  entities: [
    { 
      id: 'ent_1', 
      name: 'Article', 
      description: 'A blog post',
      attributes: [{ name: 'title', type: 'string', isRequired: true }],
      relations: []
    }
  ],
  workflows: []
};

export async function runMemoryTests(): Promise<void> {
  const router = new ModelRouter({ 
    openaiKey: process.env.OPENAI_API_KEY, 
    groqKey: process.env.GROQ_API_KEY, 
    geminiKey: process.env.GEMINI_API_KEY 
  });
  
  const engine = new MutationEngine(router);
  const SESSION_ID = 'test-session-1';

  logger.info('MemoryTestRunner', 'START', `Running multi-turn memory test.`);
  
  let currentSpec = INITIAL_APP;

  // TURN 1
  console.log(`\n▶️ TURN 1: "Add a comments system."`);
  const result1 = await engine.mutate(currentSpec, "Add a comments system.", SESSION_ID);
  currentSpec = result1.data;
  
  const hasComments = currentSpec.entities.some(e => e.name.toLowerCase().includes('comment'));
  if (hasComments) {
    console.log(`   ✅ PASS (Comments added)`);
  } else {
    console.log(`   ❌ FAIL`);
    return;
  }

  // TURN 2 (Pronoun Resolution relies on Memory)
  console.log(`\n▶️ TURN 2: "Make it require an author to post."`);
  const result2 = await engine.mutate(currentSpec, "Make it require an author to post.", SESSION_ID);
  currentSpec = result2.data;

  // If memory works, the LLM will modify the Comment entity to have an author attribute or relation, rather than hallucinating what "it" means.
  const commentEntity = currentSpec.entities.find(e => e.name.toLowerCase().includes('comment'));
  const hasAuthor = commentEntity?.attributes.some(a => a.name.toLowerCase().includes('author')) || 
                    commentEntity?.relations.some(r => r.targetEntity.toLowerCase().includes('author') || r.targetEntity.toLowerCase().includes('user'));

  if (hasAuthor) {
    console.log(`   ✅ PASS (Pronoun resolved and applied to Comment)`);
  } else {
    console.log(`   ❌ FAIL (Memory failed or pronoun not resolved)`);
    console.log(JSON.stringify(commentEntity, null, 2));
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`🧪 Memory Suite Summary: Complete`);
  console.log(`──────────────────────────────────────────────────\n`);
}

if (process.argv[1]?.includes('memory.test-runner')) {
  runMemoryTests().catch(console.error);
}
