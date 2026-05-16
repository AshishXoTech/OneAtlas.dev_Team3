import { z } from 'zod';

export const MutationPatchSchema = z.object({
  operation: z.enum(['ADD', 'REMOVE', 'MODIFY', 'GLOBAL_REWRITE'])
    .describe('The type of mutation operation to perform.'),
  targetScope: z.enum(['feature', 'page', 'entity', 'workflow', 'app'])
    .describe('The graph scope this mutation applies to. Use "app" for GLOBAL_REWRITE.'),
  targetId: z.string().optional()
    .describe('The exact ID of the node to MODIFY or REMOVE (e.g., "ent_1"). Not needed for ADD.'),
  payload: z.any().optional()
    .describe('Node payload. ADD: Full object matching Page/Entity/Workflow contract. Page MUST include "route". Entity MUST include "attributes" and "relations". Workflow MUST include "triggerType". MODIFY: Partial fields.'),
  reasoning: z.string()
    .describe('Detailed semantic reasoning. Must explicitly state: 1. Why this operation? 2. Why does this NOT create a circular dependency? 3. Are all required fields (e.g. Page route) present?')
});

export const MutationResponseSchema = z.object({
  patches: z.array(MutationPatchSchema)
    .describe('An ordered list of mutations to apply to the Intent Graph to fulfill the user request.'),
  requiresGlobalRewrite: z.boolean()
    .describe('Set to true ONLY if the prompt fundamentally changes the app architecture or domain (e.g. "turn this CRM into a game") requiring full re-extraction.'),
  blastRadiusScore: z.number().min(0).max(1)
    .describe('Estimated ratio of the existing graph that will be disrupted. 0 = purely additive, 1 = total replacement.'),
  preservationReasoning: z.string()
    .describe('Explanation of which sections of the existing graph (entities, pages, workflows) are STABLE and will be preserved intact.')
});

export type MutationPatch = z.infer<typeof MutationPatchSchema>;
export type MutationResponse = z.infer<typeof MutationResponseSchema>;
