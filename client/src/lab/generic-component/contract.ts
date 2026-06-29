/**
 * Generic generated-UI component — the contract between a backend agent and the
 * frontend. The agent emits one JSON payload in this shape; the frontend renders
 * a KPI strip on top and a single tagged body (chart OR table) beneath.
 *
 * Design goals:
 *  - Portable: this file has ZERO runtime dependencies. Copy the folder as-is.
 *  - Small agent surface: only `title` and `body` are required. Everything that
 *    raises the chance of a malformed payload (deltas, tones, status, emphasis)
 *    is optional.
 *  - Forgiving: pair with `isGenericComponentPayload` so a bad payload degrades
 *    to an empty state instead of crashing the UI.
 */

/** Semantic tone for deltas, status chips and table cells. Self-describing so an agent can pick correctly. */
export type Tone = 'positive' | 'negative' | 'warning' | 'neutral';

/**
 * Formatting hint applied when a value is a raw `number`. Strings are always
 * rendered verbatim, so an agent can either send numbers + a format, or send
 * pre-formatted strings — whichever is easier.
 */
export type ValueFormat = 'number' | 'currency' | 'percent' | 'bps' | 'multiple';

/** One metric in the top strip. */
export interface Kpi {
  label: string;
  value: string | number;
  /** Optional comparison (e.g. year-over-year). Colour comes from `tone`. */
  delta?: { value: string | number; tone?: Tone };
  /** Formatting hint for raw-number `value`/`delta`. Ignored for strings. */
  format?: ValueFormat;
}

/** A single bar in a bar chart. */
export interface BarDatum {
  label: string;
  value: number;
  /** Highlight one bar (e.g. "this deal" among peers). */
  emphasis?: boolean;
}

export interface ChartBody {
  type: 'chart';
  /** Only `bar` today; the union leaves room to grow without breaking payloads. */
  chart: 'bar';
  bars: BarDatum[];
  /** Formatting hint for bar values (axis + tooltip). */
  format?: ValueFormat;
  /** Plain-language summary used as the chart's accessible caption. */
  caption?: string;
}

/** A table cell: a bare value, or a value carrying a semantic tone. */
export type TableCell = string | number | { value: string | number; tone?: Tone };

export interface TableColumn {
  label: string;
  /** Right-align + tabular figures, and sort numerically (not lexically). */
  numeric?: boolean;
  /**
   * Formatting hint for raw-number cells in this column (e.g. `bps`, `currency`).
   * Send numbers in the cells and let the grid format them — this keeps sorting
   * correct. Strings in cells are always rendered verbatim.
   */
  format?: ValueFormat;
}

export interface TableRow {
  /** Positional, aligned to `columns`. */
  cells: TableCell[];
  /** Highlight as the result / headline row. */
  emphasis?: boolean;
}

export interface TableBody {
  type: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  /** Plain-language summary used as the table's accessible caption. */
  caption?: string;
}

export type GenericBody = ChartBody | TableBody;

/** The full payload an agent emits for one generated component. */
export interface GenericComponentPayload {
  /** Required headline. */
  title: string;
  /** Optional context line under the title. */
  subtitle?: string;
  /** Optional small overline label, e.g. "Generated". */
  eyebrow?: string;
  /** Optional status chip, e.g. { label: "Priced", tone: "positive" }. */
  status?: { label: string; tone?: Tone };
  /** Optional KPI strip. Omit or empty → no strip is rendered. */
  kpis?: Kpi[];
  /** ISO 4217 currency code used when a value's format is `currency`. Defaults to USD. */
  currency?: string;
  /** Exactly one body, tagged by `type`. */
  body: GenericBody;
}

/**
 * Runtime guard. Validates the minimum required shape so an untrusted payload
 * (e.g. straight from a model) renders an empty state rather than throwing.
 */
export function isGenericComponentPayload(input: unknown): input is GenericComponentPayload {
  if (typeof input !== 'object' || input === null) return false;
  const p = input as Record<string, unknown>;

  if (typeof p.title !== 'string') return false;
  if (p.kpis !== undefined && !Array.isArray(p.kpis)) return false;

  const body = p.body as Record<string, unknown> | undefined;
  if (typeof body !== 'object' || body === null) return false;

  if (body.type === 'chart') {
    if (body.chart !== 'bar' || !Array.isArray(body.bars)) return false;
    return body.bars.every(
      (b) =>
        typeof b === 'object' &&
        b !== null &&
        typeof (b as BarDatum).label === 'string' &&
        typeof (b as BarDatum).value === 'number',
    );
  }

  if (body.type === 'table') {
    return Array.isArray(body.columns) && Array.isArray(body.rows);
  }

  return false;
}
