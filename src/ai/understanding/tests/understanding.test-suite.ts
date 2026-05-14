/**
 * Stress test suite for the AI Understanding Layer.
 * Tests cover: standard prompts, adversarial inputs, ambiguous prompts, edge cases.
 * Run with: node --experimental-vm-modules node_modules/jest/bin/jest.js
 */

export interface TestCase {
  name: string;
  prompt: string;
  expectedAppType?: string;
  expectFailure?: boolean;
  tags: Array<'standard' | 'adversarial' | 'ambiguous' | 'edge-case' | 'regression'>;
}

export const TEST_SUITE: TestCase[] = [
  // ── Standard Prompts ──────────────────────────────────────────
  {
    name: 'CRM Dashboard',
    prompt: 'Build a CRM dashboard with lead management and analytics',
    expectedAppType: 'dashboard',
    tags: ['standard', 'regression']
  },
  {
    name: 'E-Commerce Store',
    prompt: 'I want a Shopify-like store with product listings, a checkout cart, and Stripe payments.',
    expectedAppType: 'e-commerce',
    tags: ['standard', 'regression']
  },
  {
    name: 'Project Management SaaS',
    prompt: 'Build a project management app like Linear with kanban boards, issue tracking, and team workspaces.',
    expectedAppType: 'productivity',
    tags: ['standard']
  },
  {
    name: 'HR Internal Tool',
    prompt: 'Build an internal HR portal for employee onboarding, leave management and payroll.',
    expectedAppType: 'internal-tool',
    tags: ['standard', 'regression']
  },
  {
    name: 'Social Media Feed',
    prompt: 'Create a social app with a post feed, likes, comments, and user following.',
    expectedAppType: 'social',
    tags: ['standard']
  },

  // ── Adversarial Prompts ───────────────────────────────────────
  {
    name: 'Junk Input',
    prompt: 'asdfghjkl qwerty random text!!! 1234 @#$%',
    expectFailure: false, // Should degrade gracefully, not crash
    tags: ['adversarial', 'edge-case']
  },
  {
    name: 'SQL Injection Attempt',
    prompt: "'; DROP TABLE apps; -- build me an app",
    expectFailure: false,
    tags: ['adversarial']
  },
  {
    name: 'Extremely Long Prompt',
    prompt: 'Build a comprehensive enterprise platform with '.repeat(500) + 'lead management and analytics.',
    expectFailure: false, // Token guard should kick in
    tags: ['adversarial', 'edge-case']
  },

  // ── Ambiguous Prompts ─────────────────────────────────────────
  {
    name: 'Minimal Prompt',
    prompt: 'I want to build something',
    expectFailure: false,
    tags: ['ambiguous', 'edge-case']
  },
  {
    name: 'Vague App Idea',
    prompt: 'Make an app for my business',
    expectFailure: false,
    tags: ['ambiguous']
  },
  {
    name: 'Multi-Type App',
    prompt: 'A platform that is both a marketplace and an admin tool with social features',
    expectFailure: false,
    tags: ['ambiguous', 'regression']
  },

  // ── Edge Cases ────────────────────────────────────────────────
  {
    name: 'Empty Prompt',
    prompt: '',
    expectFailure: true, // Should throw a clean validation error
    tags: ['edge-case']
  },
  {
    name: 'Whitespace Only',
    prompt: '   ',
    expectFailure: true,
    tags: ['edge-case']
  },
  {
    name: 'Non-English Prompt',
    prompt: 'बनाओ एक CRM डैशबोर्ड जिसमें लीड मैनेजमेंट और एनालिटिक्स हो',
    expectFailure: false,
    tags: ['edge-case']
  }
];
