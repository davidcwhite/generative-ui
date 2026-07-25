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
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'grid min-w-32 gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-2 text-xs shadow-lg',
        className,
      )}
    >
      {!hideLabel && label != null && (
        <p className="font-medium text-foreground">
          {labelFormatter ? labelFormatter(label, payload) : String(label)}
        </p>
      )}
      {payload.map((item, index) => {
        const payloadName =
          nameKey && item.payload ? item.payload[nameKey] : item.name ?? item.dataKey;
        const key = String(payloadName ?? item.dataKey ?? 'value');
        const itemConfig = config[key] ?? config[String(item.dataKey ?? '')];
        return (
          <div key={`${key}-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: item.color ?? itemConfig?.color }}
                aria-hidden
              />
              {itemConfig?.label ?? key}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {valueFormatter
                ? valueFormatter(item.value, item)
                : Array.isArray(item.value)
                  ? item.value.join('–')
                  : item.value != null
                    ? String(item.value)
                    : '—'}
            </span>
          </div>
        );
      })}
      {footer && (
        <div className="mt-0.5 border-t border-border/70 pt-1.5">{footer(payload)}</div>
      )}
    </div>
  );
}
