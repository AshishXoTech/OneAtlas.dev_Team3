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

const renderField = (field: FieldSchema): string => {
  switch (field.uiComponent) {
    case 'Textarea':
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>${field.name}</FormLabel>
      <FormControl>
        <Textarea rows={4} {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`;

    case 'Switch':
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between border rounded-lg p-4">
      <FormLabel>${field.name}</FormLabel>

      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>`;

    case 'DatePicker':
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>${field.name}</FormLabel>
      <FormControl>
        <Input type="date" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`;

    case 'NumberInput':
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>${field.name}</FormLabel>
      <FormControl>
        <Input type="number" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`;

    case 'Select':
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>${field.name}</FormLabel>

      <Select
        onValueChange={field.onChange}
        defaultValue={field.value}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select ${field.name}" />
          </SelectTrigger>
        </FormControl>

        <SelectContent>
          <SelectItem value="option-1">
            Option 1
          </SelectItem>

          <SelectItem value="option-2">
            Option 2
          </SelectItem>
        </SelectContent>
      </Select>

      <FormMessage />
    </FormItem>
  )}
/>`;

    default:
      return `
<FormField
  control={form.control}
  name="${field.name}"
  render={({ field }) => (
    <FormItem>
      <FormLabel>${field.name}</FormLabel>
      <FormControl>
        <Input type="text" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>`;
  }
};

export const generateComponent = (
  entity: EntitySchema,
): GeneratedFile => {
  const editableFields = entity.fields.filter(
    (field) => !EXCLUDED_FIELDS.includes(field.name),
  );

  return {
    filePath: `components/${entity.nameSlug}/${entity.name}Form.tsx`,
    fileType: 'component',
    entityName: entity.name,
    content: `'use client';

import { useForm } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ${entity.name}FormProps {
  defaultValues?: Partial<Record<string, unknown>>;
  onSubmit: (data: unknown) => void;
}

export function ${entity.name}Form({
  defaultValues,
  onSubmit,
}: ${entity.name}FormProps) {
  const form = useForm({
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        ${editableFields.map(renderField).join('\n')}

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          Save ${entity.name}
        </button>
      </form>
    </Form>
  );
}

export default ${entity.name}Form;
`,
  };
};

export const componentGenerator = {
  generate: generateComponent,
};

export default componentGenerator;