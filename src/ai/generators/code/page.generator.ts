import type {
  EntitySchema,
  FieldSchema,
  GeneratedFile,
} from '../../shared/types/generation.types.js';

const SYSTEM_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'tenantId',
];

const getDisplayFields = (
  fields: FieldSchema[],
): FieldSchema[] => {
  return fields
    .filter((field) => !SYSTEM_FIELDS.includes(field.name))
    .slice(0, 4);
};

const generateColumns = (
  fields: FieldSchema[],
): string => {
  return fields
    .map(
      (field) => `{
    accessorKey: '${field.name}',
    header: '${field.name}',
  }`,
    )
    .join(',\n');
};

const generateInput = (field: FieldSchema): string => {
  switch (field.uiComponent) {
    case 'Textarea':
      return `<textarea {...register('${field.name}')} className="border rounded-md p-2 min-h-[120px]" />`;

    case 'Switch':
      return `<input type="checkbox" {...register('${field.name}')} />`;

    case 'DatePicker':
      return `<input type="date" {...register('${field.name}')} className="border rounded-md p-2" />`;

    case 'NumberInput':
      return `<input type="number" {...register('${field.name}')} className="border rounded-md p-2" />`;

    case 'Select':
      return `
<select {...register('${field.name}')} className="border rounded-md p-2">
  <option value="">Select ${field.name}</option>
</select>`;

    default:
      return `<input type="text" {...register('${field.name}')} className="border rounded-md p-2" />`;
  }
};

const buildListPage = (
  entity: EntitySchema,
): GeneratedFile => {
  const displayFields = getDisplayFields(entity.fields);

  return {
    filePath: `${entity.pagePath}/page.tsx`,
    fileType: 'page',
    entityName: entity.name,
    content: `'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { DataTable } from '@/components/ui/data-table';

const columns = [
${generateColumns(displayFields)}
];

export default function ${entity.namePlural}Page() {
  const { data = [] } = useQuery({
    queryKey: ['${entity.nameSlug}'],
    queryFn: async () => {
      const response = await fetch('${entity.apiPath}');
      const result = await response.json();
      return result.data ?? [];
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">${entity.namePlural}</h1>

        <Link
          href="./${entity.nameSlug}/new"
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          New ${entity.name}
        </Link>
      </div>

      <DataTable columns={columns} data={data} />
    </div>
  );
}
`,
  };
};

const buildDetailPage = (
  entity: EntitySchema,
): GeneratedFile => {
  const editableFields = entity.fields.filter(
    (field) => !SYSTEM_FIELDS.includes(field.name),
  );

  return {
    filePath: `${entity.pagePath}/[id]/page.tsx`,
    fileType: 'page',
    entityName: entity.name,
    content: `'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

export default function ${entity.name}DetailPage() {
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const loadRecord = async () => {
      const response = await fetch(window.location.pathname.replace('/(dashboard)', '/api'));
      const result = await response.json();
      reset(result.data);
    };

    void loadRecord();
  }, [reset]);

  const onSubmit = async (values: unknown) => {
    await fetch(window.location.pathname.replace('/(dashboard)', '/api'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Link href="/${entity.nameSlug}" className="text-sm underline">
        Back
      </Link>

      <h1 className="text-3xl font-bold">
        Edit ${entity.name}
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        ${editableFields
          .map(
            (field) => `
<div className="flex flex-col gap-2">
  <label>${field.name}</label>
  ${generateInput(field)}
</div>`,
          )
          .join('\n')}

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          Save
        </button>
      </form>
    </div>
  );
}
`,
  };
};

const buildCreatePage = (
  entity: EntitySchema,
): GeneratedFile => {
  const createFields = entity.fields.filter(
    (field) => !SYSTEM_FIELDS.includes(field.name),
  );

  return {
    filePath: `${entity.pagePath}/new/page.tsx`,
    fileType: 'page',
    entityName: entity.name,
    content: `'use client';

import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

const schema = z.object({});

export default function Create${entity.name}Page() {
  const router = useRouter();

  const { register, handleSubmit } = useForm();

  const onSubmit = async (values: unknown) => {
    await fetch('${entity.apiPath}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });

    router.push('/${entity.nameSlug}');
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">
        Create ${entity.name}
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        ${createFields
          .map(
            (field) => `
<div className="flex flex-col gap-2">
  <label>${field.name}</label>
  ${generateInput(field)}
</div>`,
          )
          .join('\n')}

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          Create ${entity.name}
        </button>
      </form>
    </div>
  );
}
`,
  };
};

export const generatePages = (
  entity: EntitySchema,
): GeneratedFile[] => {
  return [
    buildListPage(entity),
    buildDetailPage(entity),
    buildCreatePage(entity),
  ];
};

export const pageGenerator = {
  generate: generatePages,
};

export default pageGenerator;
