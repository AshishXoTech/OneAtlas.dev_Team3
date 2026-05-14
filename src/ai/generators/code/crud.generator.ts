import type {
  EntitySchema,
  FieldSchema,
  GeneratedFile,
} from '../../shared/types/generation.types.js';

const EXCLUDED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'tenantId',
];

const mapZodType = (field: FieldSchema): string => {
  switch (field.prismaType) {
    case 'Int':
    case 'Float':
      return 'z.number()';

    case 'Boolean':
      return 'z.boolean()';

    case 'DateTime':
      return 'z.string()';

    default:
      return 'z.string()';
  }
};

const buildSchemaFields = (
  fields: FieldSchema[],
): string => {
  return fields
    .filter(
      (field) => !EXCLUDED_FIELDS.includes(field.name),
    )
    .map(
      (field) =>
        `  ${field.name}: ${mapZodType(field)},`,
    )
    .join('\n');
};

const buildListRoute = (
  entity: EntitySchema,
): GeneratedFile => {
  const schemaFields = buildSchemaFields(entity.fields);

  return {
    filePath: `app/api/${entity.nameSlug}/route.ts`,
    fileType: 'api-route',
    entityName: entity.name,
    content: `import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const createSchema = z.object({
${schemaFields}
});

const getTenantId = (): string => {
  return 'tenant_mock';
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const search = searchParams.get('search');

  const tenantId = getTenantId();

  return NextResponse.json({
    data: [],
    meta: {
      total: 0,
      page,
      limit,
      totalPages: 0,
      tenantId,
      search,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const validated = createSchema.parse(body);

    const payload = {
      ...validated,
      tenantId: getTenantId(),
    };

    return NextResponse.json({
      data: payload,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Invalid request',
        code: 'VALIDATION_ERROR',
      },
      {
        status: 400,
      },
    );
  }
}
`,
  };
};

const buildDetailRoute = (
  entity: EntitySchema,
): GeneratedFile => {
  const schemaFields = buildSchemaFields(entity.fields);

  return {
    filePath: `app/api/${entity.nameSlug}/[id]/route.ts`,
    fileType: 'api-route',
    entityName: entity.name,
    content: `import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const updateSchema = z.object({
${schemaFields}
});

const getTenantId = (): string => {
  return 'tenant_mock';
};

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  return NextResponse.json({
    data: {
      id: context.params.id,
      tenantId: getTenantId(),
    },
  });
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const body: unknown = await request.json();

    const validated = updateSchema.parse(body);

    return NextResponse.json({
      data: {
        id: context.params.id,
        ...validated,
        tenantId: getTenantId(),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : 'Invalid request',
        code: 'VALIDATION_ERROR',
      },
      {
        status: 400,
      },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  return NextResponse.json({
    data: {
      id: context.params.id,
      deletedAt: new Date().toISOString(),
    },
  });
}
`,
  };
};

export const generateCrudRoutes = (
  entity: EntitySchema,
): GeneratedFile[] => {
  return [
    buildListRoute(entity),
    buildDetailRoute(entity),
  ];
};

export const crudGenerator = {
  generate: generateCrudRoutes,
};

export default crudGenerator;
