import { lazy, Suspense, useState, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Grid2X2,
  LayoutDashboard,
  TableProperties,
  type LucideIcon,
} from 'lucide-react';
import { DashboardLoading } from './dashboard-prototypes/shared';

const CuratedDashboard = lazy(
  () => import('./dashboard-prototypes/CuratedDashboard'),
) as ComponentType<{ onOpenWorkbench?: () => void }>;
const ConfigurableDashboard = lazy(
  () => import('./dashboard-prototypes/ConfigurableDashboard'),
);
const DataWorkbench = lazy(
  () => import('./dashboard-prototypes/DataWorkbench'),
);

type PrototypeId = 'curated' | 'configurable' | 'workbench';

interface PrototypeOption {
  id: PrototypeId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

const PROTOTYPES: PrototypeOption[] = [
  {
    id: 'curated',
    label: 'Curated overview',
    shortLabel: 'Overview',
    description: 'Responsive CSS Grid · strongest default hierarchy',
    icon: LayoutDashboard,
  },
  {
    id: 'configurable',
    label: 'Configurable workspace',
    shortLabel: 'Workspace',
    description: 'React Grid Layout v2 · explicit edit mode',
    icon: Grid2X2,
  },
  {
    id: 'workbench',
    label: 'Data workbench',
    shortLabel: 'Workbench',
    description: 'AG Grid · dense analytical workflow',
    icon: TableProperties,
  },
];

const dashboardQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Dashboard() {
  const [activePrototype, setActivePrototype] = useState<PrototypeId>('curated');
  const active = PROTOTYPES.find((item) => item.id === activePrototype) ?? PROTOTYPES[0];

  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#FAFAF8]">
        <header className="sticky top-0 z-30 shrink-0 border-b border-stone-200 bg-[#FAFAF8]/95 px-4 py-3 backdrop-blur-md lg:px-6">
          <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-[-0.02em] text-stone-950">
                  Dashboard prototypes
                </h1>
                <span className="hidden rounded-full bg-stone-200/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-500 sm:inline-flex">
                  Lab
                </span>
              </div>
              <p className="mt-0.5 hidden truncate text-[11px] text-stone-500 sm:block">
                {active.description}
              </p>
            </div>

            <nav
              className="hidden items-center rounded-xl border border-stone-200 bg-white p-1 md:flex"
              aria-label="Dashboard prototypes"
            >
              {PROTOTYPES.map((prototype) => {
                const Icon = prototype.icon;
                const selected = prototype.id === activePrototype;
                return (
                  <button
                    key={prototype.id}
                    type="button"
                    onClick={() => setActivePrototype(prototype.id)}
                    aria-current={selected ? 'page' : undefined}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                      selected
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {prototype.shortLabel}
                  </button>
                );
              })}
            </nav>

            <label className="md:hidden">
              <span className="sr-only">Dashboard prototype</span>
              <select
                value={activePrototype}
                onChange={(event) => setActivePrototype(event.target.value as PrototypeId)}
                className="h-9 rounded-lg border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
              >
                {PROTOTYPES.map((prototype) => (
                  <option key={prototype.id} value={prototype.id}>
                    {prototype.shortLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          <Suspense fallback={<DashboardLoading />}>
            {activePrototype === 'curated' ? (
              <CuratedDashboard onOpenWorkbench={() => setActivePrototype('workbench')} />
            ) : activePrototype === 'configurable' ? (
              <ConfigurableDashboard />
            ) : (
              <DataWorkbench />
            )}
          </Suspense>
        </main>
      </div>
    </QueryClientProvider>
  );
}
