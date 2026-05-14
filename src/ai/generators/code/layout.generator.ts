import type {
  AppRouteConfig,
  GeneratedFile,
} from '../../shared/types/generation.types.js';

const buildDashboardLayout = (
  routeConfig: AppRouteConfig,
  appName: string,
): GeneratedFile => {
  return {
    filePath: 'app/(dashboard)/layout.tsx',
    fileType: 'config',
    content: `import type { ReactNode } from 'react';

import Sidebar from '@/components/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={${JSON.stringify(
        routeConfig.sidebarNav,
        null,
        2,
      )}} />

      <main className="flex-1 bg-muted/20">
        <header className="border-b px-6 py-4 bg-background">
          <h1 className="text-2xl font-bold">
            ${appName}
          </h1>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
`,
  };
};

const buildDashboardHome = (
  routeConfig: AppRouteConfig,
): GeneratedFile => {
  return {
    filePath: 'app/(dashboard)/page.tsx',
    fileType: 'page',
    content: `export default function DashboardHomePage() {
  const stats = ${JSON.stringify(
    routeConfig.routes.map((route) => ({
      label: route.label,
      count: 0,
    })),
    null,
    2,
  )};

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border bg-background p-6 shadow-sm"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {stat.label}
            </p>

            <h2 className="text-3xl font-bold">
              {stat.count}
            </h2>
          </div>
        </div>
      ))}
    </div>
  );
}
`,
  };
};

const buildSidebarComponent = (): GeneratedFile => {
  return {
    filePath: 'components/sidebar.tsx',
    fileType: 'component',
    content: `'use client';

import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({
  items,
}: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-background">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">
          OneAtlas
        </h2>
      </div>

      <nav className="p-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center rounded-lg px-3 py-2 text-sm hover:bg-muted"
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
`,
  };
};

export const generateLayouts = (
  routeConfig: AppRouteConfig,
  appName: string,
): GeneratedFile[] => {
  return [
    buildDashboardLayout(routeConfig, appName),
    buildDashboardHome(routeConfig),
    buildSidebarComponent(),
  ];
};

export const layoutGenerator = {
  generate: generateLayouts,
};

export default layoutGenerator;