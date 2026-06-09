/**
 * Provenance / data-lineage model for the Data Lineage lab.
 *
 * Principle (from AI-provenance best practice): the component never invents a
 * number — a source dataset + an explicit chain of transforms produces it, and
 * every step is inspectable and auditable. All mock data; no network.
 */

export type SourceTier = 1 | 2 | 3;

export const TIER_LABEL: Record<SourceTier, string> = {
  1: 'Confirmed record',
  2: 'Syndicate / unaudited',
  3: 'Reference / modelled',
};

export interface DataSource {
  id: string; // citation id, e.g. "S1"
  name: string;
  system: string;
  tier: SourceTier;
  owner: string;
  asOf: string;
  freshness: string;
  rowCount: number;
  description: string;
}

export type TransformKind = 'filter' | 'join' | 'aggregate' | 'derive' | 'assumption';

export interface TransformStep {
  id: string;
  kind: TransformKind;
  label: string;
  detail: string;
  formula?: string;
  /** Source/transform ids feeding this step (for the lineage graph). */
  from: string[];
}

export interface ResultValue {
  label: string;
  value: string;
  citation?: string; // source id this value traces back to
  emphasis?: boolean;
}

export interface UnderlyingRow {
  cells: (string | number)[];
  /** Does this row feed the final figure (vs. excluded by the WHERE clause)? */
  contributes: boolean;
  /** Highlight as the result / headline row. */
  emphasis?: boolean;
}

export interface UnderlyingTable {
  caption: string;
  columns: string[];
  /** Right-align these column indices (numeric columns). */
  numericCols?: number[];
  rows: UnderlyingRow[];
  resultNote: string;
}

/**
 * One stage of the query chain behind a figure. A banker clicks through these
 * to see each SQL-like step and the bonds/rows it operated on or produced.
 */
export interface QueryStep {
  id: string;
  /** Short label for the stepper, e.g. "Live orders". */
  label: string;
  kind: TransformKind;
  sql: string;
  table: UnderlyingTable;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  hash: string;
  detail: string;
}

/** What kind of asset the figure is rendered as (drives the switcher glyph). */
export type AssetKind = 'metric' | 'chart';

export interface ComponentLineage {
  id: string;
  title: string;
  subtitle: string;
  /** How the figure is presented in the answer. Defaults to 'metric'. */
  kind?: AssetKind;
  sources: DataSource[];
  transforms: TransformStep[];
  results: ResultValue[];
  formula: string;
  /** The query chain that produced the figure: one SQL step + its data each. */
  steps: QueryStep[];
  audit: AuditEvent[];
}

/** Light descriptor for the in-answer asset switcher. */
export interface AssetDescriptor {
  id: string;
  title: string;
  kind: AssetKind;
  /** Primary source citation for the headline figure, e.g. "S1". */
  citation?: string;
  /** Headline value shown as a hint in the switcher / preview. */
  value?: string;
}

const TRANSFORM_LABEL: Record<TransformKind, string> = {
  filter: 'Filter',
  join: 'Join',
  aggregate: 'Aggregate',
  derive: 'Derive',
  assumption: 'Assumption',
};

export function transformKindLabel(kind: TransformKind): string {
  return TRANSFORM_LABEL[kind];
}

/* ── Component 1: Oversubscription (scalar with a formula) ──────────────── */

const oversubscription: ComponentLineage = {
  id: 'oversubscription',
  title: 'Oversubscription',
  subtitle: 'BMW 3.375% 2031 — final book cover',
  kind: 'metric',
  sources: [
    {
      id: 'S1',
      name: 'Syndicate orderbook',
      system: 'bookbuild.investors',
      tier: 2,
      owner: 'Syndicate desk',
      asOf: '22 Apr 2026 14:05 BST',
      freshness: 'Final book',
      rowCount: 184,
      description: 'Investor orders captured during bookbuilding, including order size and status.',
    },
    {
      id: 'S2',
      name: 'Deal terms',
      system: 'issuance.deals',
      tier: 1,
      owner: 'Origination',
      asOf: '22 Apr 2026 13:40 BST',
      freshness: 'Confirmed at pricing',
      rowCount: 1,
      description: 'Confirmed deal record: launch size, final size, spread, coupon.',
    },
  ],
  transforms: [
    {
      id: 'T1',
      kind: 'filter',
      label: 'Active orders only',
      detail: 'Keep orders where status is not "pulled" or "cancelled".',
      formula: "orders.filter(o => o.status === 'live')",
      from: ['S1'],
    },
    {
      id: 'T2',
      kind: 'assumption',
      label: 'Exclude pulled orders',
      detail: '3 orders (€140m) were pulled before pricing and are excluded from book cover.',
      from: ['T1'],
    },
    {
      id: 'T3',
      kind: 'aggregate',
      label: 'Sum final book',
      detail: 'Sum of live order sizes = €4.10bn.',
      formula: 'finalBook = Σ orders.orderSize = €4.10bn',
      from: ['T2'],
    },
    {
      id: 'T4',
      kind: 'derive',
      label: 'Cover ratio',
      detail: 'Final book divided by final deal size.',
      formula: 'oversubscription = finalBook / dealSize = 4.10 / 1.25 = 3.28x',
      from: ['T3', 'S2'],
    },
  ],
  results: [
    { label: 'Oversubscription', value: '3.28x', emphasis: true, citation: 'S1' },
    { label: 'Final book', value: '€4.10bn', citation: 'S1' },
    { label: 'Final deal size', value: '€1.25bn', citation: 'S2' },
  ],
  formula: 'oversubscription = Σ live_orders.size ÷ deal.finalSize',
  steps: [
    {
      id: 'Q1',
      label: 'Pull orders',
      kind: 'filter',
      sql: `SELECT investor, type, order_size, status
FROM   bookbuild.orders
WHERE  deal_id = 'BMW-2031'
ORDER BY order_size DESC;`,
      table: {
        caption: 'bookbuild.orders — all orders for BMW-2031 (184 rows, top shown)',
        columns: ['Investor', 'Type', 'Order €m', 'Status'],
        numericCols: [2],
        resultNote: '2 orders (€140m) are flagged "pulled" — excluded in the next step.',
        rows: [
          { cells: ['Aldgate AM', 'Asset manager', 250, 'live'], contributes: true },
          { cells: ['Meridian Global Bond', 'Asset manager', 210, 'live'], contributes: true },
          { cells: ['Rheinpark Insurance', 'Insurance', 180, 'live'], contributes: true },
          { cells: ['Hansa Lebensversicherung', 'Insurance', 165, 'live'], contributes: true },
          { cells: ['Northwall Pensions', 'Pension', 150, 'live'], contributes: true },
          { cells: ['BancRiviera Treasury', 'Bank', 120, 'live'], contributes: true },
          { cells: ['Sable Macro Fund', 'Hedge fund', 90, 'pulled'], contributes: false },
          { cells: ['Kestrel Credit Opps', 'Hedge fund', 50, 'pulled'], contributes: false },
        ],
      },
    },
    {
      id: 'Q2',
      label: 'Final book',
      kind: 'aggregate',
      sql: `SELECT status, SUM(order_size) AS book
FROM   bookbuild.orders
WHERE  deal_id = 'BMW-2031'
GROUP BY status;   -- live book = €4.10bn`,
      table: {
        caption: 'Aggregated by status',
        columns: ['Status', 'Orders', 'Book €m'],
        numericCols: [1, 2],
        resultNote: 'Final book = live orders only = €4.10bn.',
        rows: [
          { cells: ['live', 182, 4100], contributes: true, emphasis: true },
          { cells: ['pulled', 2, 140], contributes: false },
        ],
      },
    },
    {
      id: 'Q3',
      label: 'Cover ratio',
      kind: 'derive',
      sql: `SELECT 4.10 / d.final_size AS oversubscription
FROM   issuance.deals d
WHERE  d.deal_id = 'BMW-2031';   -- 4.10 / 1.25 = 3.28x`,
      table: {
        caption: 'issuance.deals — confirmed deal terms',
        columns: ['Field', 'Value'],
        resultNote: 'Final book €4.10bn ÷ final size €1.25bn = 3.28x.',
        rows: [
          { cells: ['final_size €bn', '1.25'], contributes: true },
          { cells: ['final_book €bn', '4.10'], contributes: true },
          { cells: ['oversubscription', '3.28x'], contributes: true, emphasis: true },
        ],
      },
    },
  ],
  audit: [
    { id: 'A1', ts: '22 Apr 2026 14:05:02', actor: 'engine', action: 'query bookbuild.investors', hash: 'a1f3…9c2', detail: '184 rows · dealId=BMW-2031' },
    { id: 'A2', ts: '22 Apr 2026 14:05:02', actor: 'engine', action: 'query issuance.deals', hash: 'b7e0…41d', detail: '1 row · dealId=BMW-2031' },
    { id: 'A3', ts: '22 Apr 2026 14:05:03', actor: 'engine', action: 'compute oversubscription', hash: 'c4a8…77e', detail: '4.10 / 1.25 = 3.28x' },
  ],
};

/* ── Component 2: Allocation by geography (aggregation + join) ──────────── */

const allocationGeography: ComponentLineage = {
  id: 'allocation-geography',
  title: 'Allocations by geography',
  subtitle: 'Final allocation share by investor region',
  kind: 'chart',
  sources: [
    {
      id: 'S1',
      name: 'Final allocations',
      system: 'bookbuild.allocations',
      tier: 2,
      owner: 'Syndicate desk',
      asOf: '22 Apr 2026 15:20 BST',
      freshness: 'Post-allocation',
      rowCount: 184,
      description: 'Allocated size per investor after the syndicate allocation decision.',
    },
    {
      id: 'S2',
      name: 'Investor domicile',
      system: 'reference.investors',
      tier: 3,
      owner: 'Data management',
      asOf: '01 Apr 2026',
      freshness: 'Monthly refresh',
      rowCount: 1240,
      description: 'Reference mapping of investor to country and region grouping.',
    },
  ],
  transforms: [
    {
      id: 'T1',
      kind: 'filter',
      label: 'This deal only',
      detail: 'Allocations where dealId = BMW-2031.',
      formula: "allocations.filter(a => a.dealId === 'BMW-2031')",
      from: ['S1'],
    },
    {
      id: 'T2',
      kind: 'join',
      label: 'Map investor → region',
      detail: 'Join each allocation to the investor’s domicile region.',
      formula: 'allocations ⋈ reference.investors on investorId',
      from: ['T1', 'S2'],
    },
    {
      id: 'T3',
      kind: 'assumption',
      label: 'Region grouping',
      detail: 'Benelux = NL+BE+LU; Nordics = SE+NO+DK+FI. Sub-1% regions folded into "Other".',
      from: ['T2'],
    },
    {
      id: 'T4',
      kind: 'aggregate',
      label: 'Share by region',
      detail: 'Sum allocated size per region ÷ total allocated.',
      formula: 'pct[r] = Σ alloc[r].size / Σ alloc.size',
      from: ['T3'],
    },
  ],
  results: [
    { label: 'UK', value: '24%', emphasis: true, citation: 'S1' },
    { label: 'France', value: '18%', citation: 'S1' },
    { label: 'Germany', value: '16%', citation: 'S1' },
    { label: 'Regions covered', value: '8', citation: 'S2' },
  ],
  formula: 'share[region] = Σ allocation.size by region ÷ total allocated',
  steps: [
    {
      id: 'Q1',
      label: 'Allocations',
      kind: 'filter',
      sql: `SELECT investor_id, investor, allocated_size
FROM   bookbuild.allocations
WHERE  deal_id = 'BMW-2031'
ORDER BY allocated_size DESC;`,
      table: {
        caption: 'bookbuild.allocations — final allocations (184 rows, top shown)',
        columns: ['Investor', 'Allocated €m'],
        numericCols: [1],
        resultNote: 'Allocated size per investor, before region mapping.',
        rows: [
          { cells: ['Aldgate AM', 95], contributes: true },
          { cells: ['Rheinpark Insurance', 70], contributes: true },
          { cells: ['Quai Capital', 64], contributes: true },
          { cells: ['Thames Fixed Income', 52], contributes: true },
          { cells: ['Lowlands Invest', 48], contributes: true },
          { cells: ['Nordlys Pensjon', 36], contributes: true },
        ],
      },
    },
    {
      id: 'Q2',
      label: 'Map region',
      kind: 'join',
      sql: `SELECT a.investor, ref.country, ref.region, a.allocated_size
FROM   bookbuild.allocations a
JOIN   reference.investors ref ON ref.investor_id = a.investor_id
WHERE  a.deal_id = 'BMW-2031';`,
      table: {
        caption: 'allocations ⋈ reference.investors (domicile mapping)',
        columns: ['Investor', 'Country', 'Region', '€m'],
        numericCols: [3],
        resultNote: 'Each investor mapped to its domicile region. Benelux = NL+BE+LU.',
        rows: [
          { cells: ['Aldgate AM', 'GB', 'UK', 95], contributes: true },
          { cells: ['Thames Fixed Income', 'GB', 'UK', 52], contributes: true },
          { cells: ['Quai Capital', 'FR', 'France', 64], contributes: true },
          { cells: ['Rheinpark Insurance', 'DE', 'Germany', 70], contributes: true },
          { cells: ['Lowlands Invest', 'NL', 'Benelux', 48], contributes: true },
          { cells: ['Nordlys Pensjon', 'NO', 'Nordics', 36], contributes: true },
        ],
      },
    },
    {
      id: 'Q3',
      label: 'Share by region',
      kind: 'aggregate',
      sql: `SELECT ref.region,
       SUM(a.allocated_size) / SUM(SUM(a.allocated_size)) OVER () AS share
FROM   bookbuild.allocations a
JOIN   reference.investors ref ON ref.investor_id = a.investor_id
WHERE  a.deal_id = 'BMW-2031'
GROUP BY ref.region
ORDER BY share DESC;`,
      table: {
        caption: 'Grouped by region ÷ total allocated (€1.25bn)',
        columns: ['Region', '€m', 'Share'],
        numericCols: [1, 2],
        resultNote: 'These shares drive the donut. UK is the largest at 24%.',
        rows: [
          { cells: ['UK', 300, '24%'], contributes: true, emphasis: true },
          { cells: ['France', 225, '18%'], contributes: true },
          { cells: ['Germany', 200, '16%'], contributes: true },
          { cells: ['Benelux', 150, '12%'], contributes: true },
          { cells: ['Nordics', 113, '9%'], contributes: true },
          { cells: ['Other', 262, '21%'], contributes: true },
        ],
      },
    },
  ],
  audit: [
    { id: 'A1', ts: '22 Apr 2026 15:20:11', actor: 'engine', action: 'query bookbuild.allocations', hash: 'd2c1…a90', detail: '184 rows · dealId=BMW-2031' },
    { id: 'A2', ts: '22 Apr 2026 15:20:11', actor: 'engine', action: 'join reference.investors', hash: 'e9b4…12f', detail: '184 matched · 0 unmatched' },
    { id: 'A3', ts: '22 Apr 2026 15:20:12', actor: 'engine', action: 'aggregate by region', hash: 'f0a7…6db', detail: '8 region buckets' },
  ],
};

/* ── Component 3: New issue concession vs sector (multi-source + model) ─── */

const concessionVsSector: ComponentLineage = {
  id: 'concession-vs-sector',
  title: 'New issue concession vs sector',
  subtitle: 'Pricing premium relative to fair value and peers',
  kind: 'metric',
  sources: [
    {
      id: 'S1',
      name: 'Deal pricing',
      system: 'issuance.deals',
      tier: 1,
      owner: 'Origination',
      asOf: '22 Apr 2026 13:40 BST',
      freshness: 'Confirmed at pricing',
      rowCount: 1,
      description: 'Reoffer spread for the BMW 2031 line (+88 bps).',
    },
    {
      id: 'S2',
      name: 'Secondary curve',
      system: 'market.secondary',
      tier: 2,
      owner: 'Trading',
      asOf: '22 Apr 2026 13:35 BST',
      freshness: 'Intraday snapshot',
      rowCount: 6,
      description: 'BMW outstanding curve used to interpolate a 5Y fair value.',
    },
    {
      id: 'S3',
      name: 'Sector comparables',
      system: 'issuance.deals (peers)',
      tier: 1,
      owner: 'Origination',
      asOf: 'Trailing 90 days',
      freshness: 'Rolling window',
      rowCount: 14,
      description: 'Autos sector new issues over the last 90 days with their concessions.',
    },
  ],
  transforms: [
    {
      id: 'T1',
      kind: 'assumption',
      label: 'Fair value model',
      detail: 'Interpolate 5Y fair value (+81 bps) from the secondary curve (linear between 3Y and 7Y points).',
      formula: 'fairValue = interp(curve, 5Y) = +81 bps',
      from: ['S2'],
    },
    {
      id: 'T2',
      kind: 'derive',
      label: 'Concession',
      detail: 'Reoffer spread minus modelled fair value.',
      formula: 'NIC = reoffer − fairValue = 88 − 81 = 7 bps',
      from: ['S1', 'T1'],
    },
    {
      id: 'T3',
      kind: 'filter',
      label: 'Sector peers',
      detail: 'Autos sector, last 90 days, senior unsecured.',
      from: ['S3'],
    },
    {
      id: 'T4',
      kind: 'aggregate',
      label: 'Peer average NIC',
      detail: 'Mean concession across 14 peer deals = 9 bps.',
      formula: 'sectorAvg = mean(peers.nic) = 9 bps',
      from: ['T3'],
    },
    {
      id: 'T5',
      kind: 'derive',
      label: 'Versus sector',
      detail: 'Concession minus sector average (negative = priced inside sector).',
      formula: 'delta = NIC − sectorAvg = 7 − 9 = −2 bps',
      from: ['T2', 'T4'],
    },
  ],
  results: [
    { label: 'New issue concession', value: '7 bps', emphasis: true, citation: 'S1' },
    { label: 'Modelled fair value', value: '+81 bps', citation: 'S2' },
    { label: 'Sector average', value: '9 bps', citation: 'S3' },
    { label: 'Vs sector', value: '-2 bps', citation: 'S3' },
  ],
  formula: 'NIC = reoffer − fairValue ; vsSector = NIC − mean(peer.NIC)',
  steps: [
    {
      id: 'Q1',
      label: 'Fair value',
      kind: 'assumption',
      sql: `-- Interpolate a 5Y fair value from BMW's secondary curve
SELECT tenor_yrs, g_spread
FROM   market.secondary
WHERE  issuer = 'BMW'
ORDER BY tenor_yrs;   -- 5Y interpolated between 3Y and 7Y`,
      table: {
        caption: 'market.secondary — BMW outstanding curve (intraday)',
        columns: ['Tenor', 'G-spread bps', 'Note'],
        numericCols: [1],
        resultNote: 'Assumption: linear interp 3Y→7Y gives a 5Y fair value of +81 bps.',
        rows: [
          { cells: ['2Y', 64, 'observed'], contributes: true },
          { cells: ['3Y', 72, 'observed'], contributes: true },
          { cells: ['5Y', 81, 'interpolated'], contributes: true, emphasis: true },
          { cells: ['7Y', 95, 'observed'], contributes: true },
          { cells: ['10Y', 118, 'observed'], contributes: true },
        ],
      },
    },
    {
      id: 'Q2',
      label: 'This deal NIC',
      kind: 'derive',
      sql: `SELECT d.reoffer_spread - 81 AS nic_bps   -- 88 - 81 = 7
FROM   issuance.deals d
WHERE  d.deal_id = 'BMW-2031';`,
      table: {
        caption: 'issuance.deals — BMW 2031 pricing',
        columns: ['Field', 'Value'],
        resultNote: 'Reoffer +88 bps minus modelled fair value +81 bps = 7 bps concession.',
        rows: [
          { cells: ['reoffer_spread', '+88 bps'], contributes: true },
          { cells: ['fair_value (model)', '+81 bps'], contributes: true },
          { cells: ['new issue concession', '7 bps'], contributes: true, emphasis: true },
        ],
      },
    },
    {
      id: 'Q3',
      label: 'Sector avg',
      kind: 'aggregate',
      sql: `SELECT AVG(p.nic_bps) AS sector_avg_bps   -- = 9
FROM   issuance.deals p
WHERE  p.sector = 'Autos'
  AND  p.seniority = 'Senior unsecured'
  AND  p.priced_at >= CURRENT_DATE - INTERVAL '90 days';`,
      table: {
        caption: 'issuance.deals — Autos peers, trailing 90 days',
        columns: ['Issuer', 'Date', 'Tenor', 'NIC bps'],
        numericCols: [3],
        resultNote: 'Peer mean = 9 bps. This deal at 7 bps prices 2 bps inside the sector.',
        rows: [
          { cells: ['Volkswagen Intl Fin', '08 Apr', '5Y', 8], contributes: true },
          { cells: ['Mercedes-Benz', '02 Apr', '5Y', 6], contributes: true },
          { cells: ['Stellantis', '27 Mar', '7Y', 12], contributes: true },
          { cells: ['RCI Banque', '19 Mar', '4Y', 11], contributes: true },
          { cells: ['Toyota Motor Credit', '14 Mar', '5Y', 7], contributes: true },
          { cells: ['Daimler Truck', '03 Mar', '6Y', 10], contributes: true },
          { cells: ['BMW (this deal)', '22 Apr', '5Y', 7], contributes: true, emphasis: true },
        ],
      },
    },
  ],
  audit: [
    { id: 'A1', ts: '22 Apr 2026 13:41:00', actor: 'engine', action: 'query issuance.deals', hash: '1b2c…e4f', detail: 'reoffer=+88 bps' },
    { id: 'A2', ts: '22 Apr 2026 13:41:00', actor: 'engine', action: 'interpolate market.secondary', hash: '3d4e…a1b', detail: 'fairValue=+81 bps (assumption)' },
    { id: 'A3', ts: '22 Apr 2026 13:41:01', actor: 'engine', action: 'aggregate peers', hash: '5f6a…c2d', detail: '14 peer deals · avg 9 bps' },
  ],
};

export const lineageComponents: ComponentLineage[] = [
  oversubscription,
  allocationGeography,
  concessionVsSector,
];

export function getLineage(id: string): ComponentLineage | undefined {
  return lineageComponents.find((c) => c.id === id);
}

/** Ordered descriptors for the in-answer asset switcher. */
export const assetDescriptors: AssetDescriptor[] = lineageComponents.map((c) => {
  const headline = c.results.find((r) => r.emphasis) ?? c.results[0];
  return {
    id: c.id,
    title: c.title,
    kind: c.kind ?? 'metric',
    citation: headline?.citation,
    value: headline?.value,
  };
});

/** The primary source behind a figure (the one its headline cites, else first). */
export function primarySource(lineage: ComponentLineage): DataSource {
  const headline = lineage.results.find((r) => r.emphasis) ?? lineage.results[0];
  return (
    lineage.sources.find((s) => s.id === headline?.citation) ?? lineage.sources[0]
  );
}
