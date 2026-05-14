export type PrismaFieldType =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Json';

export type UIComponentType =
  | 'Input'
  | 'Textarea'
  | 'Switch'
  | 'DatePicker'
  | 'Select'
  | 'NumberInput';

export type GeneratedFileType =
  | 'page'
  | 'api-route'
  | 'component'
  | 'prisma-schema'
  | 'config';

export interface GeneratedFile {
  filePath: string;
  content: string;
  fileType: GeneratedFileType;
  entityName?: string;
}

export interface FieldSchema {
  name: string;
  prismaType: PrismaFieldType;
  isRequired: boolean;
  isUnique?: boolean;
  isId?: boolean;
  defaultValue?: string;
  uiComponent: UIComponentType;
  isRelation?: boolean;
  relationTo?: string;
}

export interface RelationSchema {
  type: 'one-to-many' | 'many-to-many' | 'one-to-one';
  fromEntity: string;
  toEntity: string;
  fieldName: string;
  isRequired: boolean;
}

export interface EntitySchema {
  name: string;
  namePlural: string;
  nameSlug: string;
  tableName: string;
  fields: FieldSchema[];
  relations: RelationSchema[];
  apiPath: string;
  pagePath: string;
}

export interface RouteDefinition {
  path: string;
  label: string;
  entityName: string;
  hasListPage: boolean;
  hasDetailPage: boolean;
  hasCreatePage: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface AppRouteConfig {
  appId: string;
  appName: string;
  defaultRoute: string;
  routes: RouteDefinition[];
  sidebarNav: NavItem[];
}

export interface GenerationResult {
  appId: string;
  appName: string;
  prismaSchema: string;
  files: GeneratedFile[];
  routeConfig: AppRouteConfig;
  entitySchemas: EntitySchema[];
  generatedAt: string;
}
