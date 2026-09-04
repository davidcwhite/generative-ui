/** Local, sample-only workflow prototype. No connectors or AI calls are made. */
export type WorkflowKind = 'flash' | 'newsletter';
export type SourceMode = 'files' | 'folder';
export type Field = 'issuer' | 'currency' | 'size' | 'spread';
export type Mapping = Record<Field, string>;
export type SampleRow = Record<string, string | number>;

export interface WorkflowConfig {
  id: string;
  kind: WorkflowKind;
  name: string;
  team: string;
  sourceMode: SourceMode;
  mapping: Mapping;
  baselineMinutes: string;
}

export interface WorkflowDraft extends WorkflowConfig {
  step: number;
  loaded: boolean;
  confirmed: boolean;
}

export interface WorkflowRun {
  id: string;
  config: WorkflowConfig;
  period: string;
  createdAt: string;
  reviewedAt?: string;
  actualMinutes?: number;
  commentary: string;
  rows: SampleRow[];
}

export interface PrototypeStore {
  version: 1;
  workflows: WorkflowConfig[];
  runs: WorkflowRun[];
  draft: WorkflowDraft | null;
}

export const STORAGE_KEY = 'pf-workflow-prototype-v1';
export const FIELDS: { id: Field; label: string; unit: string }[] = [
  { id: 'issuer', label: 'Issuer', unit: 'Name' },
  { id: 'currency', label: 'Currency', unit: 'ISO currency' },
  { id: 'size', label: 'Issue size', unit: 'Millions' },
  { id: 'spread', label: 'Final spread', unit: 'Basis points' },
];
export const COLUMNS = ['Issuer', 'CCY', 'Size_mm', 'Spread_bps'];
export const SAMPLE_ALLOCATIONS = [
  { label: 'Asset managers', millions: 420 },
  { label: 'Insurance', millions: 180 },
  { label: 'Banks', millions: 90 },
  { label: 'Other', millions: 60 },
];
export const WORKFLOW_META = {
  flash: {
    title: 'Deal flash', name: 'Syndicate deal flash',
    description: 'Turn pricing and allocations into a single slide, ready for the team.',
    output: '1 slide', cadence: 'Per transaction', template: 'Syndicate flash',
    files: ['Deal terms.xlsx', 'Final allocations.csv', 'Deal commentary.docx'],
    folder: 'Syndicate / Deal materials', baseline: '45',
  },
  newsletter: {
    title: 'Weekly newsletter', name: 'Weekly EUR credit newsletter',
    description: 'Bring the week’s issuance and your team’s commentary into one consistent pack.',
    output: '3 slides', cadence: 'Weekly', template: 'EUR credit weekly',
    files: ['Weekly issuance.xlsx', 'Market context.xlsx', 'Team commentary.docx'],
    folder: 'Syndicate / Weekly newsletter', baseline: '120',
  },
} as const;

// Fictional fixtures are intentionally kept separate from the app's real/API data.
const SAMPLE_ROWS: SampleRow[] = [
  { Issuer: 'Northstar Energy', CCY: 'EUR', Size_mm: 750, Spread_bps: 105 },
  { Issuer: 'Calder Bank', CCY: 'EUR', Size_mm: 1000, Spread_bps: 90 },
  { Issuer: 'Helix Industries', CCY: 'EUR', Size_mm: 500, Spread_bps: 120 },
  { Issuer: 'Meridian Utilities', CCY: 'EUR', Size_mm: 1250, Spread_bps: 110 },
  { Issuer: 'Atlas Telecom', CCY: 'EUR', Size_mm: 750, Spread_bps: 135 },
  { Issuer: 'Westhaven Group', CCY: 'EUR', Size_mm: 750, Spread_bps: 115 },
];

export function sampleRows(kind: WorkflowKind): SampleRow[] {
  return SAMPLE_ROWS.slice(0, kind === 'flash' ? 1 : 6).map(row => ({ ...row }));
}

export function newDraft(kind: WorkflowKind, team = ''): WorkflowDraft {
  return {
    id: crypto.randomUUID(), kind, name: WORKFLOW_META[kind].name,
    team: team || 'EUR IG Syndicate', sourceMode: 'files',
    mapping: { issuer: 'Issuer', currency: '', size: 'Size_mm', spread: 'Spread_bps' },
    baselineMinutes: '', step: 0, loaded: false, confirmed: false,
  };
}

export function mappingProblems(mapping: Mapping, rows: SampleRow[]): string[] {
  const problems: string[] = [];
  const selected = new Set<string>();
  for (const field of FIELDS) {
    const column = mapping[field.id];
    if (!column || !COLUMNS.includes(column)) {
      problems.push(`Map ${field.label.toLowerCase()} to a source column.`);
      continue;
    }
    if (selected.has(column)) problems.push('Each field needs its own source column.');
    selected.add(column);
    if ((field.id === 'size' && column === 'Spread_bps') || (field.id === 'spread' && column === 'Size_mm')) {
      problems.push(`${field.label} needs a column in ${field.unit.toLowerCase()}.`);
    }
    if (rows.some(row => {
      const value = row[column];
      if (field.id === 'size') return typeof value !== 'number' || !Number.isFinite(value) || value <= 0;
      if (field.id === 'spread') return typeof value !== 'number' || !Number.isFinite(value) || value < 0;
      if (field.id === 'currency') return typeof value !== 'string' || !['EUR', 'USD', 'GBP'].includes(value);
      return typeof value !== 'string' || value.trim().length < 4;
    })) problems.push(`${field.label} has an incompatible value in ${column}.`);
  }
  if (!rows.length) problems.push('Add source data before continuing.');
  return [...new Set(problems)];
}

export function canSaveDraft(draft: WorkflowDraft): boolean {
  return Boolean(draft.name.trim() && draft.team.trim() && draft.loaded && draft.confirmed
    && mappingProblems(draft.mapping, sampleRows(draft.kind)).length === 0
    && (!draft.baselineMinutes || (Number.isFinite(Number(draft.baselineMinutes)) && Number(draft.baselineMinutes) > 0)));
}

export function toConfig(draft: WorkflowDraft): WorkflowConfig {
  return {
    id: draft.id, kind: draft.kind, name: draft.name.trim(), team: draft.team.trim(),
    sourceMode: draft.sourceMode, mapping: { ...draft.mapping }, baselineMinutes: draft.baselineMinutes,
  };
}

export function createRun(config: WorkflowConfig, period: string): WorkflowRun {
  const rows = sampleRows(config.kind);
  if (mappingProblems(config.mapping, rows).length) throw new Error('Source mappings need review.');
  if (!period.trim()) throw new Error('Add an edition label.');
  return {
    id: crypto.randomUUID(), config: { ...config, mapping: { ...config.mapping } },
    period: period.trim(), createdAt: new Date().toISOString(), rows,
    commentary: config.kind === 'flash'
      ? 'Northstar Energy priced a €750m transaction at a final spread of 105 bps. Asset managers received 56% of the final allocation.'
      : 'The sample week includes six EUR transactions totalling €5.0bn. Meridian Utilities was the largest issuer at €1.25bn. Final spreads ranged from 90 to 135 bps.',
  };
}

export function runFacts(run: WorkflowRun) {
  const { mapping } = run.config;
  const sizes = run.rows.map(row => Number(row[mapping.size]));
  return {
    total: sizes.reduce((sum, size) => sum + size, 0),
    count: run.rows.length,
    issuer: String(run.rows[0][mapping.issuer]),
    currency: String(run.rows[0][mapping.currency]),
    spread: Number(run.rows[0][mapping.spread]),
    issuers: run.rows.map((row, index) => ({ name: String(row[mapping.issuer]), size: sizes[index] })),
  };
}

export function money(millions: number): string {
  return millions >= 1000 ? `€${(millions / 1000).toFixed(millions % 1000 === 0 ? 1 : 2)}bn` : `€${millions}m`;
}

export function emptyStore(): PrototypeStore {
  return { version: 1, workflows: [], runs: [], draft: null };
}

function isConfig(value: unknown): value is WorkflowConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as WorkflowConfig;
  return typeof c.id === 'string' && (c.kind === 'flash' || c.kind === 'newsletter')
    && typeof c.name === 'string' && typeof c.team === 'string'
    && (c.sourceMode === 'files' || c.sourceMode === 'folder') && typeof c.baselineMinutes === 'string'
    && Boolean(c.mapping) && FIELDS.every(field => typeof c.mapping[field.id] === 'string');
}

export function parseStore(raw: string | null): PrototypeStore {
  if (!raw) return emptyStore();
  try {
    const data = JSON.parse(raw) as PrototypeStore;
    if (data.version !== 1 || !Array.isArray(data.workflows) || !Array.isArray(data.runs)) return emptyStore();
    return {
      version: 1,
      workflows: data.workflows.filter(c => isConfig(c) && mappingProblems(c.mapping, sampleRows(c.kind)).length === 0),
      runs: data.runs.filter(r => r && typeof r.id === 'string' && isConfig(r.config)
        && typeof r.period === 'string' && typeof r.createdAt === 'string' && typeof r.commentary === 'string'
        && Array.isArray(r.rows) && r.rows.every(row => row && typeof row === 'object')
        && mappingProblems(r.config.mapping, r.rows).length === 0),
      draft: isConfig(data.draft) && Number.isInteger(data.draft.step) && data.draft.step >= 0 && data.draft.step <= 2
        && typeof data.draft.loaded === 'boolean' && typeof data.draft.confirmed === 'boolean' ? data.draft : null,
    };
  } catch { return emptyStore(); }
}
