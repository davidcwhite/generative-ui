/**
 * Team Workspace model.
 *
 * Five configuration layers, applied in order when the agent answers:
 *   1. Macro instruction      — desk-wide behaviour (tone, conventions, compliance)
 *   2. Dataset instructions   — how to process/filter a specific dataset
 *   3. Skills                 — enabled capabilities (table views, pptx, analyses)
 *   4. Workflows              — multi-step routines chaining datasets + skills
 *   5. Saved prompts          — reusable questions the desk asks often
 *
 * Instructions are tagged with scopes: 'global' or one/more dataset ids.
 */

export type DatasetId = 'issuance' | 'allocations' | 'comps' | 'pipeline';
export type Scope = 'global' | DatasetId;

export interface DatasetMeta {
  id: DatasetId;
  name: string;
  description: string;
  /** What a syndicate banker cares about in this view. */
  bankerLens: string;
  sampleFields: string[];
  /** Fields offered in the default-filter builder. */
  filterFields: { field: string; label: string; suggestions: string[] }[];
}

export interface FilterRule {
  id: string;
  field: string;
  operator: 'is' | 'is not' | 'at least' | 'at most';
  value: string;
}

export interface DatasetConfig {
  id: DatasetId;
  enabled: boolean;
  filters: FilterRule[];
}

export interface Instruction {
  id: string;
  text: string;
  scopes: Scope[];
  enabled: boolean;
  createdAt: number;
}

export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  category: 'Analysis' | 'Output' | 'Data handling';
  example: string;
}

export interface SkillConfig {
  id: string;
  enabled: boolean;
  note: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  detail: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  steps: WorkflowStep[];
}

export interface SavedPrompt {
  id: string;
  title: string;
  body: string;
  scopes: Scope[];
}

export interface TeamProfile {
  teamName: string;
  deskType: string;
  currencies: string[];
}

export interface WorkspaceConfig {
  version: 1;
  completedOnboarding: boolean;
  profile: TeamProfile;
  macroInstruction: string;
  instructions: Instruction[];
  datasets: DatasetConfig[];
  skills: SkillConfig[];
  workflows: Workflow[];
  prompts: SavedPrompt[];
}

/* ------------------------------------------------------------------ */
/* Reference data                                                      */
/* ------------------------------------------------------------------ */

export const DATASETS: DatasetMeta[] = [
  {
    id: 'issuance',
    name: 'Issuance',
    description: 'Primary market deals: pricing, size, tenor, spread, NIP, books.',
    bankerLens:
      'The execution record. Bankers scan for pricing benchmarks, concession trends and who got what done in the current window.',
    sampleFields: ['issuer', 'pricing_date', 'currency', 'size_m', 'tenor', 'spread_bp', 'nip_bp', 'book_x'],
    filterFields: [
      { field: 'currency', label: 'Currency', suggestions: ['EUR', 'USD', 'GBP'] },
      { field: 'rating_bucket', label: 'Rating bucket', suggestions: ['IG', 'Crossover', 'HY'] },
      { field: 'size_m', label: 'Size (m)', suggestions: ['250', '500', '1000'] },
      { field: 'self_led', label: 'Self-led deals', suggestions: ['excluded', 'included'] },
    ],
  },
  {
    id: 'allocations',
    name: 'Allocations',
    description: 'Investor allocation breakdowns by type, geography and account.',
    bankerLens:
      'Book quality. Bankers look at real-money share, top accounts and geographic mix to argue allocation strategy with issuers.',
    sampleFields: ['deal_id', 'investor_type', 'geography', 'allocated_m', 'limit_m', 'quality_tier'],
    filterFields: [
      { field: 'investor_type', label: 'Investor type', suggestions: ['Asset manager', 'Insurance', 'Bank', 'Hedge fund'] },
      { field: 'geography', label: 'Geography', suggestions: ['Europe', 'UK', 'US', 'Asia'] },
      { field: 'quality_tier', label: 'Quality tier', suggestions: ['Tier 1', 'Tier 2'] },
    ],
  },
  {
    id: 'comps',
    name: 'Comparables',
    description: 'Secondary curves and peer comparables for relative value.',
    bankerLens:
      'Fair value. Bankers build pricing off peer curves — the peer set, tenor interpolation and spread convention must match desk practice.',
    sampleFields: ['issuer', 'isin', 'tenor', 'z_spread_bp', 'g_spread_bp', 'sector', 'rating'],
    filterFields: [
      { field: 'sector', label: 'Sector', suggestions: ['Automobiles', 'Utilities', 'Industrials', 'Financials'] },
      { field: 'rating', label: 'Rating', suggestions: ['AA', 'A', 'BBB'] },
      { field: 'liquidity', label: 'Liquidity', suggestions: ['Benchmark only', 'All bonds'] },
    ],
  },
  {
    id: 'pipeline',
    name: 'Pipeline',
    description: 'Mandated and expected transactions over coming sessions.',
    bankerLens:
      'Supply picture. Bankers weigh expected supply against demand to advise on timing and windows — confidence levels matter.',
    sampleFields: ['issuer', 'expected_size', 'tenor', 'timing', 'confidence', 'status'],
    filterFields: [
      { field: 'confidence', label: 'Confidence', suggestions: ['High', 'Medium', 'Low'] },
      { field: 'timing', label: 'Timing', suggestions: ['This week', 'This month', 'This quarter'] },
    ],
  },
];

export const DATASET_META: Record<DatasetId, DatasetMeta> = Object.fromEntries(
  DATASETS.map((d) => [d.id, d]),
) as Record<DatasetId, DatasetMeta>;

export const SKILL_LIBRARY: SkillMeta[] = [
  {
    id: 'peer-comps-table',
    name: 'Peer comps table',
    description: 'Builds a formatted peer comparison table with curve-interpolated spreads at requested tenors.',
    category: 'Analysis',
    example: '“Show BMW vs auto peers at 5Y and 7Y”',
  },
  {
    id: 'nip-analysis',
    name: 'NIP analysis',
    description: 'Computes new issue premium versus interpolated secondary fair value, flagging outliers.',
    category: 'Analysis',
    example: '“What NIP did utilities pay this month?”',
  },
  {
    id: 'book-intelligence',
    name: 'Book intelligence',
    description: 'Summarizes book quality: real-money share, top accounts, geographic skew and drop patterns.',
    category: 'Analysis',
    example: '“How did the book behave on the last Allianz deal?”',
  },
  {
    id: 'pptx-brief',
    name: 'PPTX mandate brief',
    description: 'Exports a mandate pitch pack: issuance history, comps, allocation views in desk template.',
    category: 'Output',
    example: '“Create the BMW mandate brief deck”',
  },
  {
    id: 'table-views',
    name: 'Custom table views',
    description: 'Renders answers as dense tables using desk column conventions and ordering.',
    category: 'Output',
    example: '“List this week’s EUR IG prints as a table”',
  },
  {
    id: 'term-sheet-extract',
    name: 'Term-sheet extraction',
    description: 'Parses uploaded term sheets and normalizes fields into the issuance dataset shape.',
    category: 'Data handling',
    example: 'Drop a PDF term sheet into chat',
  },
  {
    id: 'league-tables',
    name: 'League tables',
    description: 'Builds bookrunner league tables with desk crediting rules (full to each, self-led excluded).',
    category: 'Analysis',
    example: '“YTD EUR IG league table”',
  },
  {
    id: 'window-monitor',
    name: 'Issuance window monitor',
    description: 'Assesses market conditions and pipeline congestion to advise on execution windows.',
    category: 'Analysis',
    example: '“Is Tuesday a good window for a 10Y?”',
  },
];

export const SKILL_META: Record<string, SkillMeta> = Object.fromEntries(
  SKILL_LIBRARY.map((s) => [s.id, s]),
);

export const MACRO_TEMPLATES: { title: string; text: string }[] = [
  {
    title: 'Desk conventions',
    text: 'Quote spreads versus mid-swaps in basis points. Sizes in millions with currency prefix (EUR 500m). Dates as 13 Jul. Always state the as-of time for market data.',
  },
  {
    title: 'Tone & audience',
    text: 'Write for a syndicate desk: concise, factual, no filler. Lead with the number, then one line of context. Flag stale data (>1 day) explicitly.',
  },
  {
    title: 'Compliance guardrails',
    text: 'Never present indicative levels as firm. Label all forward-looking statements as estimates. Do not reference deals in blackout without a wall-crossing note.',
  },
];

export const DESK_TYPES = ['DCM Syndicate', 'DCM Origination', 'Leveraged Finance', 'FIG DCM', 'SSA'];
export const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

/* ------------------------------------------------------------------ */
/* Defaults + persistence                                              */
/* ------------------------------------------------------------------ */

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const STARTER_INSTRUCTIONS: Omit<Instruction, 'id' | 'createdAt'>[] = [
  {
    text: 'Exclude self-led transactions from any league table or peer statistics unless explicitly asked.',
    scopes: ['issuance'],
    enabled: true,
  },
  {
    text: 'When summarizing books, report real-money share (AM + insurance + pension) as the headline quality metric.',
    scopes: ['allocations'],
    enabled: true,
  },
  {
    text: 'Interpolate curves linearly in z-spread between adjacent liquid points; never extrapolate beyond the longest bond.',
    scopes: ['comps'],
    enabled: true,
  },
];

export const STARTER_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-morning',
    name: 'Morning market update',
    description: 'The 7:45 desk note: overnight prints, today’s expected supply, window read.',
    enabled: true,
    steps: [
      { id: 'wfs-1', label: 'Pull overnight issuance', detail: 'Issuance · last 24h, all currencies' },
      { id: 'wfs-2', label: 'Check pipeline for today', detail: 'Pipeline · confidence High/Medium' },
      { id: 'wfs-3', label: 'Assess window', detail: 'Skill · Issuance window monitor' },
      { id: 'wfs-4', label: 'Compose desk note', detail: 'Output · table + 3 bullet summary' },
    ],
  },
  {
    id: 'wf-mandate',
    name: 'Mandate pitch pack',
    description: 'Everything needed to walk into an issuer meeting.',
    enabled: true,
    steps: [
      { id: 'wfs-5', label: 'Issuer history', detail: 'Issuance · issuer’s last 3 years' },
      { id: 'wfs-6', label: 'Peer comps', detail: 'Skill · Peer comps table at 5Y/7Y/10Y' },
      { id: 'wfs-7', label: 'Book precedents', detail: 'Allocations · last 2 sector deals' },
      { id: 'wfs-8', label: 'Export deck', detail: 'Skill · PPTX mandate brief' },
    ],
  },
  {
    id: 'wf-postdeal',
    name: 'Post-pricing wrap',
    description: 'Same-day wrap for the issuer after a deal prices.',
    enabled: false,
    steps: [
      { id: 'wfs-9', label: 'Final terms recap', detail: 'Issuance · the priced deal' },
      { id: 'wfs-10', label: 'Book analysis', detail: 'Skill · Book intelligence' },
      { id: 'wfs-11', label: 'NIP vs peers', detail: 'Skill · NIP analysis' },
    ],
  },
];

export const STARTER_PROMPTS: SavedPrompt[] = [
  {
    id: 'pr-1',
    title: 'Weekly EUR IG recap',
    body: 'Summarize this week’s EUR IG supply: total volume, deal count, average NIP and book cover, notable outliers.',
    scopes: ['issuance'],
  },
  {
    id: 'pr-2',
    title: 'Fair value check',
    body: 'Where would a new [ISSUER] [TENOR] price based on the peer curve? Show the interpolation and suggested NIP range.',
    scopes: ['comps'],
  },
  {
    id: 'pr-3',
    title: 'Supply outlook',
    body: 'What supply is expected over the next two weeks and where is congestion likely?',
    scopes: ['pipeline', 'issuance'],
  },
];

export function defaultConfig(): WorkspaceConfig {
  return {
    version: 1,
    completedOnboarding: false,
    profile: { teamName: '', deskType: 'DCM Syndicate', currencies: ['EUR'] },
    macroInstruction: '',
    instructions: [],
    datasets: DATASETS.map((d) => ({ id: d.id, enabled: true, filters: [] })),
    skills: SKILL_LIBRARY.map((s) => ({ id: s.id, enabled: false, note: '' })),
    workflows: STARTER_WORKFLOWS,
    prompts: STARTER_PROMPTS,
  };
}

const STORAGE_KEY = 'pf-team-workspace-v1';

export function loadConfig(): WorkspaceConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WorkspaceConfig;
      if (parsed.version === 1) return parsed;
    }
  } catch {
    /* fall through to default */
  }
  return defaultConfig();
}

export function saveConfig(config: WorkspaceConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable — session-only */
  }
}

export function resetConfig() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Instructions that apply to a dataset (its own scope plus global). */
export function instructionsForScope(instructions: Instruction[], scope: Scope): Instruction[] {
  return instructions.filter((i) => i.scopes.includes(scope));
}

export function scopeLabel(scope: Scope): string {
  return scope === 'global' ? 'Global' : DATASET_META[scope].name;
}
