import type { Entity } from '../../shared/types/app-understanding.types.js';

import type {
  FieldSchema,
  PrismaFieldType,
  UIComponentType,
} from '../../shared/types/generation.types.js';

interface FieldRule {
  patterns: RegExp[];
  prismaType: PrismaFieldType;
  uiComponent: UIComponentType;
}

const BASE_FIELDS: FieldSchema[] = [
  {
    name: 'id',
    prismaType: 'String',
    isRequired: true,
    isId: true,
    defaultValue: 'cuid()',
    uiComponent: 'Input',
  },
  {
    name: 'createdAt',
    prismaType: 'DateTime',
    isRequired: true,
    defaultValue: 'now()',
    uiComponent: 'DatePicker',
  },
  {
    name: 'updatedAt',
    prismaType: 'DateTime',
    isRequired: true,
    uiComponent: 'DatePicker',
  },
  {
    name: 'tenantId',
    prismaType: 'String',
    isRequired: true,
    uiComponent: 'Input',
  },
];

const FIELD_RULES: FieldRule[] = [
  {
    patterns: [/email/i, /url/i, /website/i],
    prismaType: 'String',
    uiComponent: 'Input',
  },
  {
    patterns: [/description/i, /notes/i, /bio/i, /content/i, /body/i],
    prismaType: 'String',
    uiComponent: 'Textarea',
  },
  {
    patterns: [/price/i, /amount/i, /salary/i, /cost/i, /revenue/i],
    prismaType: 'Float',
    uiComponent: 'NumberInput',
  },
  {
    patterns: [/count/i, /quantity/i, /age/i, /year/i],
    prismaType: 'Int',
    uiComponent: 'NumberInput',
  },
  {
    patterns: [/^is[A-Z]/, /^is[a-z]/],
    prismaType: 'Boolean',
    uiComponent: 'Switch',
  },
  {
    patterns: [/createdAt/i, /updatedAt/i, /date/i, /At$/],
    prismaType: 'DateTime',
    uiComponent: 'DatePicker',
  },
  {
    patterns: [/status/i, /type/i, /category/i, /priority/i],
    prismaType: 'String',
    uiComponent: 'Select',
  },
];

const DEFAULT_FIELD_CONFIG = {
  prismaType: 'String' as PrismaFieldType,
  uiComponent: 'Input' as UIComponentType,
};

function resolveFieldConfig(
  fieldName: string,
): typeof DEFAULT_FIELD_CONFIG {
  for (const rule of FIELD_RULES) {
    const matched = rule.patterns.some((pattern) =>
      pattern.test(fieldName),
    );

    if (matched) {
      return {
        prismaType: rule.prismaType,
        uiComponent: rule.uiComponent,
      };
    }
  }

  return DEFAULT_FIELD_CONFIG;
}

function buildFieldSchema(fieldName: string): FieldSchema {
  const config = resolveFieldConfig(fieldName);

  return {
    name: fieldName,
    prismaType: config.prismaType,
    uiComponent: config.uiComponent,
    isRequired: true,
    isUnique: /email/i.test(fieldName),
  };
}

export function generateFields(entity: Entity): FieldSchema[] {
  const fieldNames = entity.fields || (entity.attributes || []).map((a: any) => a.name);
  const generatedFields = fieldNames.map(buildFieldSchema);

  return [...BASE_FIELDS, ...generatedFields];
}

export default generateFields;
