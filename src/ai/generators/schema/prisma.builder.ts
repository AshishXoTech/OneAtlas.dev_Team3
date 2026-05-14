import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import type {
  EntitySchema,
  FieldSchema,
  RelationSchema,
} from '../../shared/types/generation.types.js';

const buildFieldLine = (field: FieldSchema): string => {
  const attributes: string[] = [];

  if (field.isId) {
    attributes.push('@id');
    attributes.push('@default(cuid())');
  }

  if (field.name === 'createdAt') {
    attributes.push('@default(now())');
  }

  if (field.name === 'updatedAt') {
    attributes.push('@updatedAt');
  }

  if (field.isUnique) {
    attributes.push('@unique');
  }

  return `  ${field.name} ${field.prismaType} ${attributes.join(' ')}`.trim();
};

const buildRelationLine = (
  entity: EntitySchema,
  relation: RelationSchema,
): string | null => {
  if (relation.fromEntity !== entity.name) {
    return null;
  }

  if (relation.type === 'one-to-many') {
    return `  ${relation.fieldName} ${relation.toEntity}[]`;
  }

  if (relation.type === 'many-to-many') {
    return `  ${relation.fieldName} ${relation.toEntity}[]`;
  }

  return `  ${relation.fieldName} ${relation.toEntity}?`;
};

const buildModelBlock = (entity: EntitySchema): string => {
  const fieldLines = entity.fields.map(buildFieldLine);

  const relationLines = entity.relations
    .map((relation) => buildRelationLine(entity, relation))
    .filter((line): line is string => Boolean(line));

  return `
model ${entity.name} {
${[...fieldLines, ...relationLines].join('\n')}

  @@index([tenantId])
  @@map("${entity.tableName}")
}`.trim();
};

export const buildPrismaSchema = (
  entities: EntitySchema[],
): string => {
  const header = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/*
Sample Contact model:

model Contact {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([tenantId])
  @@map("contacts")
}
*/
`.trim();

  const models = entities.map(buildModelBlock).join('\n\n');

  return `${header}\n\n${models}`;
};

export const validatePrismaSchema = (
  content: string,
): { valid: boolean; error?: string } => {
  try {
    writeFileSync('/tmp/schema.prisma', content);

    execSync(
      'npx prisma validate --schema=/tmp/schema.prisma',
      {
        stdio: 'pipe',
      },
    );

    return { valid: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return {
        valid: false,
        error: error.message,
      };
    }

    return {
      valid: false,
      error: 'Unknown Prisma validation error',
    };
  }
};

export const prismaBuilder = {
  build: buildPrismaSchema,
  validate: validatePrismaSchema,
};

export default prismaBuilder;
