import { AppNormalizer } from '../../understanding/normalizer/app.normalizer.js';
import { logger } from '../../shared/utils/logger.js';

const normalizer = new AppNormalizer();

export async function runNormalizationTests(): Promise<void> {
  logger.info('NormalizationTestRunner', 'START', 'Running Phase 6 normalization tests.');
  let passed = 0;
  let failed = 0;

  // ─── TEST 1: Bi-Directional Relation Enforcement ─────────────────────────
  console.log(`\n▶️ TEST 1: Bi-Directional Relation Enforcement`);
  console.log(`   Order has a relation to User, but User has no relation back to Order.`);
  const asymmetricEntities = [
    { id: 'ent_user', name: 'User', description: 'App user', attributes: [{ name: 'email', type: 'string', isRequired: true }], relations: [] },
    { id: 'ent_order', name: 'Order', description: 'A purchase', attributes: [{ name: 'total', type: 'number', isRequired: true }], relations: [{ targetEntity: 'ent_user', type: 'many-to-one' }] },
  ];

  const result1 = normalizer.normalizeEntities(asymmetricEntities);
  const userEntity = result1.find(e => e.id === 'ent_user');
  const userHasOrderRelation = userEntity?.relations?.some((r: any) => r.targetEntity === 'ent_order');

  if (userHasOrderRelation) {
    console.log(`   ✅ PASS: User entity now has a reverse 'one-to-many' relation to Order.`);
    passed++;
  } else {
    console.log(`   ❌ FAIL: User entity is missing a reverse relation to Order.`);
    console.log(JSON.stringify(userEntity, null, 2));
    failed++;
  }

  // ─── TEST 2: Alias Deduplication (Client → User merge) ───────────────────
  console.log(`\n▶️ TEST 2: Canonical Alias Deduplication`);
  console.log(`   'User' and 'Users' both have an 'email' attribute. They should be merged.`);
  const duplicateEntities = [
    { id: 'ent_user', name: 'User', description: 'App user', attributes: [{ name: 'email', type: 'string', isRequired: true }, { name: 'password', type: 'string', isRequired: true }], relations: [] },
    { id: 'ent_users', name: 'Users', description: 'Platform users', attributes: [{ name: 'email', type: 'string', isRequired: true }, { name: 'role', type: 'string', isRequired: false }], relations: [] },
    { id: 'ent_order', name: 'Order', description: 'A purchase', attributes: [{ name: 'total', type: 'number', isRequired: true }], relations: [] },
  ];

  const result2 = normalizer.normalizeEntities(duplicateEntities);
  const entityCount = result2.length;
  const hasMergedAttrs = result2.find(e => e.name === 'User')?.attributes?.some((a: any) => a.name === 'role');

  if (entityCount === 2 && hasMergedAttrs) {
    console.log(`   ✅ PASS: 'Users' was merged into 'User'. Entity count: ${entityCount}. Merged 'role' attribute found.`);
    passed++;
  } else {
    console.log(`   ❌ FAIL: Deduplication failed. Expected 2 entities, got ${entityCount}.`);
    console.log(result2.map((e: any) => ({ name: e.name, attrs: e.attributes?.map((a: any) => a.name) })));
    failed++;
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log(`🧪 Normalization Suite: ${passed} passed / ${failed} failed / ${passed + failed} total`);
  console.log(`──────────────────────────────────────────────────\n`);
}

if (process.argv[1]?.includes('normalization.test-runner')) {
  runNormalizationTests().catch(console.error);
}
