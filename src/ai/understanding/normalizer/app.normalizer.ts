import { FeatureNode, PageNode, WorkflowNode } from '../../shared/types/app-understanding.types.js';

export class AppNormalizer {
  normalizeName(name: string): string {
    return name
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  }

  normalizePages(pages: PageNode[]): PageNode[] {
    const seen = new Set();
    return pages.filter(p => {
      const route = p.route.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-\/]/g, '');
      if (seen.has(route)) return false;
      seen.add(route);
      p.route = route.startsWith('/') ? route : `/${route}`;
      return true;
    });
  }

  normalizeFeatures(features: FeatureNode[]): FeatureNode[] {
    const seen = new Set();
    return features.filter(f => {
      const name = f.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  normalizeWorkflows(workflows: WorkflowNode[]): WorkflowNode[] {
    const seen = new Set();
    return workflows.filter(w => {
      const name = w.name.trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      
      // Ensure enums are valid (fallback to generic if LLM hallucinates)
      const validTriggers = ['USER_ACTION', 'SYSTEM_EVENT', 'SCHEDULED'];
      if (!validTriggers.includes(w.triggerType)) w.triggerType = 'USER_ACTION';
      
      const validModes = ['SYNC', 'ASYNC'];
      if (!validModes.includes(w.executionMode)) w.executionMode = 'SYNC';
      
      // Ensure steps is always an array
      if (!w.steps || !Array.isArray(w.steps)) {
        w.steps = ["Execute Workflow"];
      }
      
      return true;
    });
  }
}
