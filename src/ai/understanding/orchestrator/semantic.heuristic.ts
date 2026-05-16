import type { AppUnderstanding } from '../../shared/types/app-understanding.types.js';
import type { AppCategory } from '../detector/apptype.detector.js';
import { ARCHETYPE_BASELINES } from './archetypes.js';

/**
 * Principal-grade semantic recovery engine.
 * Synthesizes a minimal viable AppUnderstanding graph from the raw prompt
 * when the AI pipeline is degraded or returning empty results.
 */
export class SemanticHeuristic {
  /**
   * Synthesizes a minimal graph based on app category and prompt keywords.
   */
  static synthesize(prompt: string, category: AppCategory): AppUnderstanding {
    // Start with the baseline for the category
    const baseline = ARCHETYPE_BASELINES[category.toLowerCase()] || ARCHETYPE_BASELINES['other'];
    
    // Deep clone the baseline
    const graph: AppUnderstanding = JSON.parse(JSON.stringify(baseline));
    
    // Customize app name from prompt if possible
    if (prompt.length > 5 && prompt.length < 50) {
      graph.appName = prompt.charAt(0).toUpperCase() + prompt.slice(1);
    }

    // Heuristic: If prompt mentions "billing" or "payment", ensure we have a billing feature
    if (prompt.toLowerCase().includes('billing') || prompt.toLowerCase().includes('payment')) {
      if (!graph.features.some(f => f.name.toLowerCase().includes('billing'))) {
        graph.features.push({
          id: 'feat_billing_recovery',
          name: 'Billing & Payments',
          description: 'Automated billing system (Heuristic Recovery)'
        });
      }
    }

    // Ensure we have at least one page
    if (graph.pages.length === 0) {
      graph.pages.push({
        id: 'page_home_recovery',
        name: 'Home',
        route: '/',
        description: 'Main landing page',
        requiredEntities: [],
        layoutTemplate: 'dashboard'
      });
    }

    return graph;
  }
}
