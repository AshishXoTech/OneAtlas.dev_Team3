import type { Entity } from '../../shared/types/app-understanding.types.js';
import type { RelationSchema } from '../../shared/types/generation.types.js';

const ONE_TO_ONE_SUFFIXES = ['Profile', 'Detail', 'Settings'];

const buildRelationKey = (
  from: string,
  to: string,
  type: RelationSchema['type'],
): string => {
  return [from, to, type].sort().join(':');
};

const isJoinEntity = (entityName: string, entityNames: string[]): string[] => {
  return entityNames.filter(
    (name) =>
      name !== entityName &&
      entityName.toLowerCase().includes(name.toLowerCase()),
  );
};

const createOneToManyRelation = (
  fromEntity: string,
  toEntity: string,
): RelationSchema => ({
  type: 'one-to-many',
  fromEntity,
  toEntity,
  fieldName: `${toEntity.toLowerCase()}s`,
  isRequired: false,
});

const createManyToManyRelation = (
  fromEntity: string,
  toEntity: string,
): RelationSchema => ({
  type: 'many-to-many',
  fromEntity,
  toEntity,
  fieldName: `${toEntity.toLowerCase()}s`,
  isRequired: false,
});

const createOneToOneRelation = (
  fromEntity: string,
  toEntity: string,
): RelationSchema => ({
  type: 'one-to-one',
  fromEntity,
  toEntity,
  fieldName: toEntity.toLowerCase(),
  isRequired: true,
});

export const generateRelationships = (
  entities: Entity[],
): RelationSchema[] => {
  const relations: RelationSchema[] = [];
  const relationKeys = new Set<string>();

  const entityNames = entities.map((entity) => entity.name);

  for (const entity of entities) {
    for (const relatedEntity of entity.relations) {
      const relation = createOneToManyRelation(
        entity.name,
        relatedEntity,
      );

      const key = buildRelationKey(
        relation.fromEntity,
        relation.toEntity,
        relation.type,
      );

      if (!relationKeys.has(key)) {
        relationKeys.add(key);
        relations.push(relation);
      }
    }

    const matchedEntities = isJoinEntity(entity.name, entityNames);

    if (matchedEntities.length === 2) {
      const [firstEntity, secondEntity] = matchedEntities;

      const relation = createManyToManyRelation(
        firstEntity,
        secondEntity,
      );

      const key = buildRelationKey(
        relation.fromEntity,
        relation.toEntity,
        relation.type,
      );

      if (!relationKeys.has(key)) {
        relationKeys.add(key);
        relations.push(relation);
      }
    }

    const oneToOneSuffix = ONE_TO_ONE_SUFFIXES.find((suffix) =>
      entity.name.endsWith(suffix),
    );

    if (oneToOneSuffix) {
      const parentEntity = entity.name.replace(oneToOneSuffix, '');

      if (entityNames.includes(parentEntity)) {
        const relation = createOneToOneRelation(
          parentEntity,
          entity.name,
        );

        const key = buildRelationKey(
          relation.fromEntity,
          relation.toEntity,
          relation.type,
        );

        if (!relationKeys.has(key)) {
          relationKeys.add(key);
          relations.push(relation);
        }
      }
    }
  }

  return relations;
};

export default generateRelationships;
