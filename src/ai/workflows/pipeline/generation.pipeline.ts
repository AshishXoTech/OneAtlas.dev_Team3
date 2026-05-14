import crypto from 'node:crypto';

import type { AppUnderstanding } from '../../shared/types/app-understanding.types.js';

import type {
  AppRouteConfig,
  EntitySchema,
  GeneratedFile,
  GenerationResult,
} from '../../shared/types/generation.types.js';

import type {
  PipelineStage,
} from '../state/generation.state.js';

import {
  generateEntitySchemas,
  prismaBuilder,
  pageGenerator,
  crudGenerator,
  componentGenerator,
  routeGenerator,
  layoutGenerator,
} from '../../generators/index.js';

export interface PipelineContext {
  runId: string;
  projectId: string;
  orgId: string;
  rawPrompt: string;
  understanding?: AppUnderstanding;
  entitySchemas?: EntitySchema[];
  prismaSchema?: string;
  generatedFiles?: GeneratedFile[];
  routeConfig?: AppRouteConfig;
  result?: GenerationResult;
}

export interface PipelineStep {
  stage: PipelineStage;
  name: string;
  run: (
    context: PipelineContext,
  ) => Promise<PipelineContext>;
  shouldSkip?: (
    context: PipelineContext,
  ) => boolean;
}

const generatePageFiles = (
  entities: EntitySchema[],
): GeneratedFile[] => {
  return entities.flatMap((entity) =>
    pageGenerator.generate(entity),
  );
};

const generateApiFiles = (
  entities: EntitySchema[],
): GeneratedFile[] => {
  return entities.flatMap((entity) =>
    crudGenerator.generate(entity),
  );
};

const generateComponentFiles = (
  entities: EntitySchema[],
): GeneratedFile[] => {
  return entities.map((entity) =>
    componentGenerator.generate(entity),
  );
};

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    stage: 'entity_schema_gen',
    name: 'Entity Schema Generation',
    run: async (context) => {
      const entitySchemas =
        generateEntitySchemas(
          context.understanding!,
        );

      return {
        ...context,
        entitySchemas,
      };
    },
  },
  {
    stage: 'prisma_schema_gen',
    name: 'Prisma Schema Generation',
    run: async (context) => {
      const prismaSchema =
        prismaBuilder.build(
          context.entitySchemas!,
        );

      return {
        ...context,
        prismaSchema,
      };
    },
  },
  {
    stage: 'page_generation',
    name: 'Page Generation',
    run: async (context) => {
      const files =
        generatePageFiles(
          context.entitySchemas!,
        );

      return {
        ...context,
        generatedFiles: [
          ...(context.generatedFiles ?? []),
          ...files,
        ],
      };
    },
  },
  {
    stage: 'api_generation',
    name: 'API Generation',
    run: async (context) => {
      const files =
        generateApiFiles(
          context.entitySchemas!,
        );

      return {
        ...context,
        generatedFiles: [
          ...(context.generatedFiles ?? []),
          ...files,
        ],
      };
    },
  },
  {
    stage: 'component_generation',
    name: 'Component Generation',
    run: async (context) => {
      const files =
        generateComponentFiles(
          context.entitySchemas!,
        );

      return {
        ...context,
        generatedFiles: [
          ...(context.generatedFiles ?? []),
          ...files,
        ],
      };
    },
  },
  {
    stage: 'layout_generation',
    name: 'Layout Generation',
    run: async (context) => {
      const routeConfig =
        routeGenerator.generate(
          context.entitySchemas!,
          context.understanding!.appName,
        );

      const files =
        layoutGenerator.generate(
          routeConfig,
          context.understanding!.appName,
        );

      return {
        ...context,
        routeConfig,
        generatedFiles: [
          ...(context.generatedFiles ?? []),
          ...files,
        ],
      };
    },
  },
  {
    stage: 'packaging',
    name: 'Packaging',
    run: async (context) => {
      const result: GenerationResult = {
        appId: crypto.randomUUID(),
        appName:
          context.understanding!.appName,
        prismaSchema:
          context.prismaSchema!,
        files: [
          ...(context.generatedFiles ?? []),
          {
            filePath:
              'prisma/schema.prisma',
            content:
              context.prismaSchema!,
            fileType:
              'prisma-schema',
          },
        ],
        routeConfig:
          context.routeConfig!,
        entitySchemas:
          context.entitySchemas!,
        generatedAt:
          new Date().toISOString(),
      };

      return {
        ...context,
        result,
      };
    },
  },
  {
    stage: 'deployment_handoff',
    name: 'Deployment Handoff',
    run: async (context) => {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('[Pipeline] Redis unconfigured. Cannot perform deployment handoff.');
        return context;
      }

      await fetch(
        `${
          process.env.UPSTASH_REDIS_REST_URL
        }/rpush/deploy:queue`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${
              process.env.UPSTASH_REDIS_REST_TOKEN
            }`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            value: JSON.stringify(
              context.result,
            ),
          }),
        },
      );

      return context;
    },
  },
];