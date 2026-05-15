import { AppUnderstandingExtraction } from './app-understanding.extraction.schema.js';

export function normalizeLayoutTemplate(template?: string): string {
  if (!template) return 'blank';
  const t = template.toLowerCase();
  if (t.includes('dashboard')) return 'dashboard';
  if (t.includes('login') || t.includes('auth')) return 'auth';
  if (t.includes('list')) return 'crud-list';
  if (t.includes('detail')) return 'crud-detail';
  if (t.includes('landing')) return 'landing';
  if (t.includes('form')) return 'form';
  return 'blank';
}

export function normalizeWorkflowTrigger(trigger?: string): string {
  if (!trigger) return 'user_action';
  const t = trigger.toLowerCase();
  if (t.includes('manual')) return 'user_action';
  if (t.includes('cron') || t.includes('schedule')) return 'scheduled';
  if (t.includes('event') || t.includes('system')) return 'system_event';
  return 'user_action';
}

export function normalizeRelationshipType(type?: string): string {
  if (!type) return 'one-to-one';
  const t = type.toLowerCase();
  if (t.includes('many_many') || t === 'many to many') return 'many-to-many';
  if (t.includes('one_many') || t === 'one to many') return 'one-to-many';
  if (t.includes('one_one') || t === 'one to one') return 'one-to-one';
  return t; // Pass through if it looks okay, runtime validation will catch it
}

export function slugify(text: string): string {
  return '/' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export function normalizeUnderstanding(extracted: AppUnderstandingExtraction): any {
  return {
    appName: extracted.appName || 'Untitled App',
    appType: extracted.appType || 'other',
    targetAudience: extracted.targetAudience || 'General users',
    features: extracted.features || [],
    pages: (extracted.pages || []).map(p => ({
      name: p.name,
      route: p.route || slugify(p.name),
      description: p.description || `${p.name} page`,
      requiredEntities: p.requiredEntities || [],
      layoutTemplate: normalizeLayoutTemplate(p.layoutTemplate)
    })),
    entities: (extracted.entities || []).map(e => ({
      name: e.name,
      description: e.description || `${e.name} entity`,
      attributes: (e.attributes || []).map(a => ({
        name: a.name,
        type: a.type || 'string',
        isRequired: a.isRequired ?? false
      })),
      relationships: (e.relationships || []).map(r => ({
        targetEntity: r.targetEntity,
        type: normalizeRelationshipType(r.type)
      }))
    })),
    workflows: (extracted.workflows || []).map(w => ({
      name: w.name,
      trigger: normalizeWorkflowTrigger(w.trigger),
      description: w.description || `Workflow for ${w.name}`
    })),
    authRequirements: {
      needsAuth: extracted.authRequirements?.needsAuth ?? false,
      roles: extracted.authRequirements?.roles || []
    }
  };
}
