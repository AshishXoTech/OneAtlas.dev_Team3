import type { AppUnderstanding } from '../../shared/types/app-understanding.types.js';

import type {
  EntitySchema,
  RelationSchema,
} from '../../shared/types/generation.types.js';

import { generateFields } from './field.generator.js';
import { generateRelationships } from './relationship.generator.js';

const toPascalCase = (value: string): string => {
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(
      (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('');
};

const toSnakeCase = (value: string): string => {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]/g, '_')
    .toLowerCase();
};

const toKebabCase = (value: string): string => {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
};

const toPlural = (value: string): string => {
  if (value.endsWith('s')) {
    return `${value}es`;
  }

  if (
    value.endsWith('x') ||
    value.endsWith('z') ||
    value.endsWith('ch') ||
    value.endsWith('sh')
  ) {
    return `${value}es`;
  }

  return `${value}s`;
};

const getEntityRelations = (
  entityName: string,
  relations: RelationSchema[],
): RelationSchema[] => {
  return relations.filter(
    (relation) =>
      relation.fromEntity === entityName ||
      relation.toEntity === entityName,
  );
};

export const generateEntitySchemas = (
  understanding: AppUnderstanding,
): EntitySchema[] => {
  const relationships = generateRelationships(
    understanding.entities,
  );

  return understanding.entities.map((entity) => {
    const entityName = toPascalCase(entity.name);
    const pluralName = toPlural(entityName);
    const slug = toKebabCase(pluralName);

    return {
      name: entityName,
      namePlural: pluralName,
      nameSlug: slug,
      tableName: toSnakeCase(pluralName),
      fields: generateFields(entity),
      relations: getEntityRelations(entityName, relationships),
      apiPath: `/api/${slug}`,
      pagePath: `app/(dashboard)/${slug}`,
    };
  });
};

export default generateEntitySchemas;
