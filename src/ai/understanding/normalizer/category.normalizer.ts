import type { AppCategory } from '../detector/apptype.detector.js';

/**
 * Canonical Category Alias Normalizer
 * 
 * Maps non-standard AI-generated category labels to our strict enum values.
 * This runs BEFORE Zod validation to prevent invalid_value failures.
 * 
 * Design: Pure deterministic lookup — zero LLM calls, zero latency.
 * 
 * Flow:
 *   raw AI output → alias normalization → canonical enum → schema validation
 */

const VALID_CATEGORIES: Set<string> = new Set([
  'dashboard', 'e-commerce', 'social', 'productivity', 'internal-tool', 'other'
]);

/**
 * Comprehensive alias map built from observed LLM hallucination patterns.
 * Keys are lowercase-trimmed AI outputs; values are canonical AppCategory enums.
 */
const CATEGORY_ALIAS_MAP: Record<string, AppCategory> = {
  // dashboard aliases
  'crm':                'dashboard',
  'analytics':          'dashboard',
  'admin':              'dashboard',
  'admin-panel':        'dashboard',
  'admin panel':        'dashboard',
  'reporting':          'dashboard',
  'metrics':            'dashboard',
  'monitoring':         'dashboard',
  'data-visualization': 'dashboard',
  'bi':                 'dashboard',
  'business-intelligence': 'dashboard',

  // e-commerce aliases
  'marketplace':        'e-commerce',
  'ecommerce':          'e-commerce',
  'shop':               'e-commerce',
  'store':              'e-commerce',
  'storefront':         'e-commerce',
  'retail':             'e-commerce',
  'shopping':           'e-commerce',
  'online-store':       'e-commerce',

  // social aliases
  'community':          'social',
  'forum':              'social',
  'network':            'social',
  'social-network':     'social',
  'social-media':       'social',
  'messaging':          'social',
  'chat':               'social',

  // productivity aliases
  'saas':               'productivity',
  'tool':               'productivity',
  'utility':            'productivity',
  'project-management': 'productivity',
  'collaboration':      'productivity',
  'workspace':          'productivity',
  'planner':            'productivity',
  'organizer':          'productivity',

  // internal-tool aliases
  'backoffice':         'internal-tool',
  'back-office':        'internal-tool',
  'internal':           'internal-tool',
  'enterprise':         'internal-tool',
  'erp':                'internal-tool',
  'portal':             'internal-tool',
  'hr':                 'internal-tool',
  'intranet':           'internal-tool',

  // explicit other aliases
  'platform':           'other',
  'app':                'other',
  'application':        'other',
  'website':            'other',
  'web-app':            'other',
  'custom':             'other',
};

/**
 * Resolves an AI-generated category string to a valid AppCategory enum value.
 * Performs case-insensitive lookup with whitespace normalization.
 * 
 * @returns A valid AppCategory — never throws, always returns a safe value.
 */
export function resolveCategory(rawCategory: string): AppCategory {
  const normalized = rawCategory.toLowerCase().trim().replace(/\s+/g, '-');

  // Already a valid canonical category
  if (VALID_CATEGORIES.has(normalized)) {
    return normalized as AppCategory;
  }

  // Check alias map
  const mapped = CATEGORY_ALIAS_MAP[normalized];
  if (mapped) {
    return mapped;
  }

  // Fuzzy partial match: if the raw string contains a known alias as substring
  for (const [alias, category] of Object.entries(CATEGORY_ALIAS_MAP)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return category;
    }
  }

  // Safe fallback — no match found
  return 'other';
}
