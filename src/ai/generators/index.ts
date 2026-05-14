import crypto from 'node:crypto';

import type { AppUnderstanding } from '../shared/types/app-understanding.types.js';

import type {
  GeneratedFile,
  GenerationResult,
} from '../shared/types/generation.types.js';

import {
  generateFields,
} from './schema/field.generator.js';

import {
  generateRelationships,
} from './schema/relationship.generator.js';

import {
  generateEntitySchemas,
} from './schema/entity.generator.js';

import {
  prismaBuilder,
} from './schema/prisma.builder.js';

import {
  pageGenerator,
} from './code/page.generator.js';

import {
  crudGenerator,
} from './code/crud.generator.js';

import {
  componentGenerator,
} from './code/component.generator.js';

import {
  routeGenerator,
} from './code/route.generator.js';

import {
  layoutGenerator,
} from './code/layout.generator.js';

export class GenerationEngine {
  async generate(
    understanding: AppUnderstanding,
  ): Promise<GenerationResult> {
    const entitySchemas =
      generateEntitySchemas(understanding);

    const prismaSchema =
      prismaBuilder.build(entitySchemas);

    const routeConfig =
      routeGenerator.generate(
        entitySchemas,
        understanding.appName,
      );

    const files: GeneratedFile[] = [];

    for (const entity of entitySchemas) {
      files.push(
        ...pageGenerator.generate(entity),
      );

      files.push(
        ...crudGenerator.generate(entity),
      );

      files.push(
        componentGenerator.generate(entity),
      );
    }

    files.push(
      ...layoutGenerator.generate(
        routeConfig,
        understanding.appName,
      ),
    );

    files.push({
      filePath: 'prisma/schema.prisma',
      content: prismaSchema,
      fileType: 'prisma-schema',
    });

    return {
      appId: crypto.randomUUID(),
      appName: understanding.appName,
      prismaSchema,
      files,
      routeConfig,
      entitySchemas,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const generationEngine =
  new GenerationEngine();

export {
  generateFields,
} from './schema/field.generator.js';

export {
  generateRelationships,
} from './schema/relationship.generator.js';

export {
  generateEntitySchemas,
} from './schema/entity.generator.js';

export {
  prismaBuilder,
} from './schema/prisma.builder.js';

export {
  pageGenerator,
} from './code/page.generator.js';

export {
  crudGenerator,
} from './code/crud.generator.js';

export {
  componentGenerator,
} from './code/component.generator.js';

export {
  routeGenerator,
} from './code/route.generator.js';

export {
  layoutGenerator,
} from './code/layout.generator.js';