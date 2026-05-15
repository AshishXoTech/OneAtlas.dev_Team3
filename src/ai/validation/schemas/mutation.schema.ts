import { z } from 'zod';

export const MutationPatchSchema = z.object({
  operation: z.enum(['ADD', 'REMOVE', 'MODIFY', 'GLOBAL_REWRITE'])
    .describe('The type of mutation operation to perform.'),
  targetScope: z.enum(['feature', 'page', 'entity', 'workflow', 'app'])
    .describe('The graph scope this mutation applies to. Use "app" for GLOBAL_REWRITE.'),
  targetId: z.string().optional()
    .describe('The exact ID of the node to MODIFY or REMOVE (e.g., "ent_1"). Not needed for ADD.'),
  payload: z.any().optional()
    .describe('The new node object (for ADD) or partial node object (for MODIFY). Structure must match the targetScope type.'),
  reasoning: z.string()
    .describe('Brief explanation of why this mutation was selected based on user intent.')
});

export const MutationResponseSchema = z.object({
  patches: z.array(MutationPatchSchema)
    .describe('An ordered list of mutations to apply to the Intent Graph to fulfill the user request.'),
  requiresGlobalRewrite: z.boolean()
    .describe('Set to true if the prompt fundamentally changes the app architecture (e.g. "turn this CRM into a game") requiring full re-extraction.')
});

export type MutationPatch = z.infer<typeof MutationPatchSchema>;
export type MutationResponse = z.infer<typeof MutationResponseSchema>;
