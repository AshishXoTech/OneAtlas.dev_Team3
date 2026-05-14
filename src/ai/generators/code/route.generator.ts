import crypto from 'node:crypto';

import type {
  AppRouteConfig,
  EntitySchema,
  NavItem,
  RouteDefinition,
} from '../../shared/types/generation.types.js';

const ICON_RULES: Array<{
  patterns: string[];
  icon: string;
}> = [
  {
    patterns: ['contact', 'customer', 'person', 'user'],
    icon: 'Users',
  },
  {
    patterns: ['deal', 'sale', 'revenue', 'money'],
    icon: 'DollarSign',
  },
  {
    patterns: ['task', 'todo', 'checklist'],
    icon: 'CheckSquare',
  },
  {
    patterns: ['project', 'board'],
    icon: 'Layout',
  },
  {
    patterns: ['product', 'item', 'inventory'],
    icon: 'Package',
  },
  {
    patterns: ['message', 'email', 'chat'],
    icon: 'Mail',
  },
];

const resolveIcon = (entityName: string): string => {
  const normalized = entityName.toLowerCase();

  const matchedRule = ICON_RULES.find((rule) =>
    rule.patterns.some((pattern) =>
      normalized.includes(pattern),
    ),
  );

  return matchedRule?.icon ?? 'Circle';
};

const buildRouteDefinition = (
  entity: EntitySchema,
): RouteDefinition => {
  return {
    path: `/${entity.nameSlug}`,
    label: entity.namePlural,
    entityName: entity.name,
    hasListPage: true,
    hasDetailPage: true,
    hasCreatePage: true,
  };
};

const buildNavItem = (
  entity: EntitySchema,
): NavItem => {
  return {
    label: entity.namePlural,
    href: `/${entity.nameSlug}`,
    icon: resolveIcon(entity.name),
  };
};

export const generateRouteConfig = (
  entities: EntitySchema[],
  appName: string,
): AppRouteConfig => {
  const routes = entities.map(buildRouteDefinition);

  const sidebarNav = entities.map(buildNavItem);

  return {
    appId: crypto.randomUUID(),
    appName,
    defaultRoute: routes[0]?.path ?? '/',
    routes,
    sidebarNav,
  };
};

export const routeGenerator = {
  generate: generateRouteConfig,
};

export default routeGenerator;