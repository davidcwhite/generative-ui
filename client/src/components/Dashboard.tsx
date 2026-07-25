import { lazy, Suspense, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DashboardChromeProvider,
  useDashboardChrome,
} from './dashboard-prototypes/DashboardSettings';
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
const ShadcnIssuanceDashboard = lazy(
  () => import('./dashboard-prototypes/ShadcnIssuanceDashboard'),
);

const dashboardQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function Dashboard() {
  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <DashboardChromeProvider>
        <DashboardSurface />
      </DashboardChromeProvider>
    </QueryClientProvider>
  );
}

/**
 * No shell chrome: each prototype owns its own header, and the prototype
 * switcher lives in the settings flyover so the page reads as a real product.
 */
function DashboardSurface() {
  const { prototype, setPrototype } = useDashboardChrome();

  return (
    <main
      data-dashboard-scroll
      className={`min-h-0 min-w-0 flex-1 overflow-auto ${
        prototype.canvas === 'white' ? 'bg-white' : 'bg-[#FAFAF8]'
      }`}
    >
      <Suspense fallback={<DashboardLoading />}>
        {prototype.id === 'curated' ? (
          <CuratedDashboard onOpenWorkbench={() => setPrototype('workbench')} />
        ) : prototype.id === 'configurable' ? (
          <ConfigurableDashboard />
        ) : prototype.id === 'workbench' ? (
          <DataWorkbench />
        ) : (
          <ShadcnIssuanceDashboard />
        )}
      </Suspense>
    </main>
  );
}
