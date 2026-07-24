import { useEffect, useMemo, useState, type ReactNode, type Ref } from 'react';
import {
  Grid2X2,
  GripVertical,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import {
  DashboardError,
  DashboardLoading,
  InvestorMix,
  MetricStrip,
  PipelineList,
  RecentDealsTable,
  RelativeValueChart,
  VolumeTrendChart,
} from './shared';
import { useDashboardData } from './useDashboardData';

type DashboardBreakpoint = 'lg' | 'md' | 'sm' | 'xs';
type WidgetId = 'metrics' | 'trend' | 'pipeline' | 'relative' | 'investor' | 'deals';

const STORAGE_KEY = 'primary-flow-dashboard-layout-v1';
const VISIBLE_STORAGE_KEY = 'primary-flow-dashboard-widgets-v1';

const WIDGET_LABEL: Record<WidgetId, string> = {
  metrics: 'Market snapshot',
  trend: 'Primary activity',
  pipeline: 'Forward pipeline',
  relative: 'Relative value',
  investor: 'Investor mix',
  deals: 'Recent deals',
};

const ALL_WIDGETS = Object.keys(WIDGET_LABEL) as WidgetId[];

const DEFAULT_LAYOUTS: ResponsiveLayouts<DashboardBreakpoint> = {
  lg: [
    { i: 'metrics', x: 0, y: 0, w: 12, h: 3, minW: 8, minH: 3 },
    { i: 'trend', x: 0, y: 3, w: 8, h: 5, minW: 5, minH: 4 },
    { i: 'pipeline', x: 8, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
    { i: 'relative', x: 0, y: 8, w: 7, h: 5, minW: 5, minH: 4 },
    { i: 'investor', x: 7, y: 8, w: 5, h: 5, minW: 3, minH: 4 },
    { i: 'deals', x: 0, y: 13, w: 12, h: 5, minW: 8, minH: 4 },
  ],
  md: [
    { i: 'metrics', x: 0, y: 0, w: 8, h: 3 },
    { i: 'trend', x: 0, y: 3, w: 8, h: 5 },
    { i: 'pipeline', x: 0, y: 8, w: 4, h: 5 },
    { i: 'investor', x: 4, y: 8, w: 4, h: 5 },
    { i: 'relative', x: 0, y: 13, w: 8, h: 5 },
    { i: 'deals', x: 0, y: 18, w: 8, h: 5 },
  ],
  sm: [
    { i: 'metrics', x: 0, y: 0, w: 4, h: 4 },
    { i: 'trend', x: 0, y: 4, w: 4, h: 5 },
    { i: 'pipeline', x: 0, y: 9, w: 4, h: 5 },
    { i: 'relative', x: 0, y: 14, w: 4, h: 5 },
    { i: 'investor', x: 0, y: 19, w: 4, h: 5 },
    { i: 'deals', x: 0, y: 24, w: 4, h: 5 },
  ],
  xs: ALL_WIDGETS.map((id, index) => ({
    i: id,
    x: 0,
    y: index * 5,
    w: 1,
    h: id === 'metrics' ? 5 : 5,
  })),
};

function readSavedLayouts(): ResponsiveLayouts<DashboardBreakpoint> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ResponsiveLayouts<DashboardBreakpoint>) : DEFAULT_LAYOUTS;
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

function readSavedVisible(): WidgetId[] {
  try {
    const saved = window.localStorage.getItem(VISIBLE_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as WidgetId[]) : ALL_WIDGETS;
    return parsed.filter((id) => ALL_WIDGETS.includes(id));
  } catch {
    return ALL_WIDGETS;
  }
}

function WorkspaceWidget({
  id,
  title,
  description,
  editing,
  onHide,
  children,
  contentClassName = '',
}: {
  id: WidgetId;
  title: string;
  description?: string;
  editing: boolean;
  onHide: (id: WidgetId) => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className={`workspace-widget h-full ${editing ? 'workspace-widget--editing' : ''}`}>
      <div className="workspace-widget__header drag-handle">
        <div className="flex min-w-0 items-center gap-2.5">
          {editing && (
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-stone-900">{title}</h2>
            {description && (
              <p className="mt-0.5 truncate text-[10px] text-stone-400">{description}</p>
            )}
          </div>
        </div>
        {editing && (
          <button
            type="button"
            onClick={() => onHide(id)}
            aria-label={`Hide ${title}`}
            className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      <div className={`min-h-0 flex-1 overflow-auto ${contentClassName}`}>{children}</div>
    </div>
  );
}

export default function ConfigurableDashboard() {
  const { data, isPending, error } = useDashboardData();
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] =
    useState<ResponsiveLayouts<DashboardBreakpoint>>(readSavedLayouts);
  const [visible, setVisible] = useState<WidgetId[]>(readSavedVisible);
  const [savedLabel, setSavedLabel] = useState('Saved locally');

  useEffect(() => {
    const timer = window.setTimeout(() => setSavedLabel('Saved locally'), 1000);
    return () => window.clearTimeout(timer);
  }, [layouts, visible]);

  useEffect(() => {
    window.localStorage.setItem(VISIBLE_STORAGE_KEY, JSON.stringify(visible));
  }, [visible]);

  const visibleSet = useMemo(() => new Set(visible), [visible]);

  const hideWidget = (id: WidgetId) => {
    setVisible((current) => current.filter((item) => item !== id));
    setSavedLabel('Saving…');
  };

  const toggleWidget = (id: WidgetId) => {
    setVisible((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setSavedLabel('Saving…');
  };

  const reset = () => {
    setLayouts(DEFAULT_LAYOUTS);
    setVisible(ALL_WIDGETS);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(VISIBLE_STORAGE_KEY);
    setSavedLabel('Reset');
  };

  if (isPending) return <DashboardLoading />;
  if (error || !data) {
    return <DashboardError message={error?.message ?? 'No workspace data returned.'} />;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-5 lg:px-6">
      <div className="mb-4 rounded-xl border border-stone-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <Grid2X2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h1 className="text-sm font-semibold text-stone-950">My syndicate workspace</h1>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {editing
                  ? 'Drag from widget headers and resize from the lower-right corner.'
                  : 'A personalized layout that stays calm until editing is enabled.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] text-stone-400" aria-live="polite">
              {savedLabel}
            </span>
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              aria-pressed={editing}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                editing
                  ? 'border-stone-900 bg-stone-900 text-white hover:bg-stone-800'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              {editing ? 'Finish editing' : 'Edit dashboard'}
            </button>
          </div>
        </div>

        {editing && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-stone-100 pt-3">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
              Widgets
            </span>
            {ALL_WIDGETS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleWidget(id)}
                aria-pressed={visibleSet.has(id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                  visibleSet.has(id)
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-500 hover:text-stone-800'
                }`}
              >
                {WIDGET_LABEL[id]}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-6 text-center">
          <Grid2X2 className="h-6 w-6 text-stone-400" aria-hidden />
          <h2 className="mt-4 text-sm font-semibold text-stone-900">Your workspace is empty</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-stone-500">
            Restore the default layout or use the widget controls above to add a view.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            Restore default widgets
          </button>
        </div>
      ) : (
        <div ref={containerRef as unknown as Ref<HTMLDivElement>}>
          {mounted && (
            <ResponsiveGridLayout<DashboardBreakpoint>
              width={width}
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
              cols={{ lg: 12, md: 8, sm: 4, xs: 1 }}
              rowHeight={54}
              margin={{ lg: [12, 12], md: [12, 12], sm: [10, 10], xs: [8, 8] }}
              containerPadding={null}
              dragConfig={{ enabled: editing, handle: '.drag-handle', cancel: 'button' }}
              resizeConfig={{ enabled: editing, handles: ['se'] }}
              onLayoutChange={(_, nextLayouts) => {
                setLayouts(nextLayouts);
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLayouts));
                setSavedLabel('Saving…');
              }}
              className={`workspace-grid ${editing ? 'workspace-grid--editing' : ''}`}
            >
              {visibleSet.has('metrics') && (
                <div key="metrics">
                  <WorkspaceWidget
                    id="metrics"
                    title="Market snapshot"
                    editing={editing}
                    onHide={hideWidget}
                  >
                    <MetricStrip metrics={data.metrics} />
                  </WorkspaceWidget>
                </div>
              )}
              {visibleSet.has('trend') && (
                <div key="trend">
                  <WorkspaceWidget
                    id="trend"
                    title="Primary market activity"
                    description="Supply and average NIP"
                    editing={editing}
                    onHide={hideWidget}
                    contentClassName="px-4 pb-2"
                  >
                    <VolumeTrendChart data={data.issuance} compact />
                  </WorkspaceWidget>
                </div>
              )}
              {visibleSet.has('pipeline') && (
                <div key="pipeline">
                  <WorkspaceWidget
                    id="pipeline"
                    title="Forward pipeline"
                    description="Next four sessions"
                    editing={editing}
                    onHide={hideWidget}
                  >
                    <PipelineList data={data.pipeline} />
                  </WorkspaceWidget>
                </div>
              )}
              {visibleSet.has('relative') && (
                <div key="relative">
                  <WorkspaceWidget
                    id="relative"
                    title="Automobiles relative value"
                    description="Indicative asset-swap spreads"
                    editing={editing}
                    onHide={hideWidget}
                    contentClassName="px-3 pb-2"
                  >
                    <RelativeValueChart data={data.relativeValue} />
                  </WorkspaceWidget>
                </div>
              )}
              {visibleSet.has('investor') && (
                <div key="investor">
                  <WorkspaceWidget
                    id="investor"
                    title="Investor mix"
                    description="Latest ten benchmarks"
                    editing={editing}
                    onHide={hideWidget}
                    contentClassName="px-5 py-4"
                  >
                    <InvestorMix data={data.investorMix} />
                  </WorkspaceWidget>
                </div>
              )}
              {visibleSet.has('deals') && (
                <div key="deals">
                  <WorkspaceWidget
                    id="deals"
                    title="Recent and live deals"
                    description="Execution snapshot"
                    editing={editing}
                    onHide={hideWidget}
                  >
                    <RecentDealsTable data={data.deals} limit={4} />
                  </WorkspaceWidget>
                </div>
              )}
            </ResponsiveGridLayout>
          )}
        </div>
      )}
    </div>
  );
}
