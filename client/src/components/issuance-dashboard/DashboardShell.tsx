import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useScrolled } from './useScrolled';

export type ViewMode = 'dashboards' | 'data';
export type DatasetId = 'issuance' | 'allocations' | 'market' | 'pipeline' | 'comparables';

export const DATASETS: { id: DatasetId; label: string }[] = [
  { id: 'issuance', label: 'Issuance' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'market', label: 'Market' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'comparables', label: 'Comparables' },
];

export function DashboardShell({
  viewMode,
  onViewModeChange,
  dataset,
  onDatasetChange,
  /** Host-supplied chrome, right of the view tabs. */
  toolbar,
  children,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  dataset: DatasetId;
  onDatasetChange: (dataset: DatasetId) => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { ref, scrolled } = useScrolled();

  return (
    <div ref={ref} className="min-h-full bg-white">
      <div
        className={`sticky top-0 z-20 border-b bg-white/70 backdrop-blur-xl transition-colors duration-200 ${
          scrolled ? 'border-stone-200/80' : 'border-transparent'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-6 px-5 lg:px-8">
          <nav className="flex gap-5 overflow-x-auto" aria-label="Data domains">
            {DATASETS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onDatasetChange(item.id)}
                aria-current={dataset === item.id ? 'page' : undefined}
                className={`relative h-12 whitespace-nowrap text-xs font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-stone-900 after:opacity-0 ${
                  dataset === item.id
                    ? 'text-stone-950 after:opacity-100'
                    : 'text-stone-400 hover:text-stone-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
              <TabsList aria-label="Dashboard or data view" className="h-8 bg-stone-100">
                <TabsTrigger value="dashboards" className="h-7">
                  Dashboards
                </TabsTrigger>
                <TabsTrigger value="data" className="h-7">
                  Data
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {toolbar}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function DatasetPlaceholder({
  dataset,
  onReturn,
}: {
  dataset: DatasetId;
  onReturn: () => void;
}) {
  const label = DATASETS.find((item) => item.id === dataset)?.label ?? dataset;
  return (
    <div className="mx-auto flex min-h-[34rem] max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Database className="h-4 w-4" aria-hidden />
      </span>
      <h1 className="mt-4 text-sm font-semibold text-stone-900">{label} is not populated yet</h1>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        The navigation is ready for additional data domains. This prototype currently models the
        full issuance workflow.
      </p>
      <Button className="mt-4" size="sm" onClick={onReturn}>
        Return to issuance
      </Button>
    </div>
  );
}
