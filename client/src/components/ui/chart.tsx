import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error('Chart components must be used inside ChartContainer');
  return context;
}

export function ChartContainer({
  config,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}) {
  const colorVariables = Object.entries(config).reduce<React.CSSProperties>(
    (variables, [key, item]) => {
      if (item.color) {
        (variables as Record<string, string>)[`--color-${key}`] = item.color;
      }
      return variables;
    },
    {},
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        className={cn(
          'flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        style={{ ...colorVariables, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

type TooltipItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  payload?: Record<string, unknown>;
};

function numericValue(value: TooltipItem['value']) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  nameKey,
  valueFormatter,
  labelFormatter,
  footer,
  maxRows,
  hideEmpty = false,
  rankRows = false,
  emptyLabel = 'No data',
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  nameKey?: string;
  valueFormatter?: (value: TooltipItem['value'], item: TooltipItem) => React.ReactNode;
  labelFormatter?: (label: React.ReactNode, payload: TooltipItem[]) => React.ReactNode;
  /** Rendered under the rows — a stack total, for instance. */
  footer?: (payload: TooltipItem[]) => React.ReactNode;
  /** Rows past this count collapse into a single summary line. */
  maxRows?: number;
  /** Drop series that contributed nothing to this point. */
  hideEmpty?: boolean;
  /** Order by this point's own values rather than the series order. */
  rankRows?: boolean;
  emptyLabel?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const rows = payload.map((item, index) => {
    const payloadName = nameKey && item.payload ? item.payload[nameKey] : item.name ?? item.dataKey;
    const key = String(payloadName ?? item.dataKey ?? 'value');
    const itemConfig = config[key] ?? config[String(item.dataKey ?? '')];
    return {
      id: `${key}-${index}`,
      label: itemConfig?.label ?? key,
      color: item.color ?? itemConfig?.color,
      value: item.value,
      numeric: numericValue(item.value),
      item,
    };
  });

  const present = hideEmpty ? rows.filter((row) => row.numeric !== 0) : rows;
  const ordered = rankRows ? [...present].sort((a, b) => b.numeric - a.numeric) : present;

  // Collapsing a single row would trade it for a line that says less.
  const collapse = maxRows !== undefined && ordered.length > maxRows + 1;
  const shown = collapse ? ordered.slice(0, maxRows) : ordered;
  const rest = collapse ? ordered.slice(maxRows) : [];
  const restTotal = rest.reduce((sum, row) => sum + row.numeric, 0);

  const renderValue = (value: TooltipItem['value'], item: TooltipItem) => {
    if (valueFormatter) return valueFormatter(value, item);
    if (Array.isArray(value)) return value.join('–');
    return value != null ? String(value) : '—';
  };

  return (
    <div
      className={cn(
        'grid min-w-32 max-w-[17rem] gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs shadow-lg',
        className,
      )}
    >
      {!hideLabel && label != null && (
        <p className="font-medium text-foreground">
          {labelFormatter ? labelFormatter(label, payload) : String(label)}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="text-muted-foreground">{emptyLabel}</p>
      ) : (
        shown.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
                aria-hidden
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="shrink-0 font-mono font-medium tabular-nums text-foreground">
              {renderValue(row.value, row.item)}
            </span>
          </div>
        ))
      )}

      {rest.length > 0 && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0" aria-hidden />
            <span className="truncate">{rest.length} more</span>
          </span>
          <span className="shrink-0 font-mono tabular-nums">
            {renderValue(restTotal, rest[0].item)}
          </span>
        </div>
      )}

      {footer && <div className="mt-0.5 border-t border-border/70 pt-1.5">{footer(payload)}</div>}
    </div>
  );
}
