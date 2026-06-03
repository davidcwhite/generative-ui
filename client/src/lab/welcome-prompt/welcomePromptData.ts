import {
  Target,
  TrendingUp,
  GitCompare,
  FileSignature,
  Activity,
  type LucideIcon,
} from 'lucide-react';

export type PromptCategoryId = 'pitch' | 'research' | 'compare' | 'generate' | 'monitor';

export interface PromptCategory {
  id: PromptCategoryId;
  label: string;
  icon: LucideIcon;
}

export interface PromptSuggestion {
  id: string;
  categoryId: PromptCategoryId;
  /** Short title shown in the prompt list. */
  label: string;
  /** Full prompt text previewed in the composer and committed on click. */
  prompt: string;
}

export const promptCategories: PromptCategory[] = [
  { id: 'pitch', label: 'Pitch', icon: Target },
  { id: 'research', label: 'Research', icon: TrendingUp },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'generate', label: 'Generate', icon: FileSignature },
  { id: 'monitor', label: 'Monitor', icon: Activity },
];

export const promptSuggestions: PromptSuggestion[] = [
  // Pitch
  {
    id: 'pitch-bmw',
    categoryId: 'pitch',
    label: 'Build a mandate pitch angle for BMW',
    prompt: "We're pitching BMW for a mandate. Build me a pitch angle backed by recent issuance and investor demand.",
  },
  {
    id: 'pitch-window',
    categoryId: 'pitch',
    label: 'Find the best issuance window for Siemens',
    prompt: 'When is the best issuance window for Siemens over the next quarter, and why?',
  },
  {
    id: 'pitch-reverse',
    categoryId: 'pitch',
    label: 'Reverse-enquiry talking points for Enel',
    prompt: 'Give me reverse-enquiry talking points for Enel based on current investor appetite.',
  },
  {
    id: 'pitch-funding',
    categoryId: 'pitch',
    label: 'Outline a funding strategy for Volkswagen',
    prompt: 'Outline a 12-month funding strategy for Volkswagen across tenors and currencies.',
  },
  {
    id: 'pitch-esg',
    categoryId: 'pitch',
    label: 'Make the case for a debut green bond',
    prompt: 'Make the case for a debut green bond from an auto issuer, including likely demand and pricing benefit.',
  },
  {
    id: 'pitch-defensive',
    categoryId: 'pitch',
    label: 'Prepare for a competitor pitch',
    prompt: 'We are defending a relationship from a competitor pitch. Prepare counter-arguments and recent execution proof points.',
  },
  // Research
  {
    id: 'research-vw-history',
    categoryId: 'research',
    label: "Show Volkswagen's issuance history",
    prompt: "Show me Volkswagen's issuance history with tenors, spreads, and oversubscription.",
  },
  {
    id: 'research-allocations',
    categoryId: 'research',
    label: 'Allocation quality on the last BMW deal',
    prompt: 'Break down allocation quality on the most recent BMW deal by investor type and geography.',
  },
  {
    id: 'research-secondary',
    categoryId: 'research',
    label: 'Secondary performance for recent auto deals',
    prompt: 'How have recent auto sector new issues performed in secondary versus reoffer?',
  },
  {
    id: 'research-curve',
    categoryId: 'research',
    label: 'Map the Mercedes-Benz credit curve',
    prompt: 'Map the Mercedes-Benz credit curve and highlight where it looks rich or cheap.',
  },
  {
    id: 'research-demand',
    categoryId: 'research',
    label: 'Summarise current investor demand themes',
    prompt: 'Summarise the dominant investor demand themes in EUR credit over the last month.',
  },
  {
    id: 'research-supply',
    categoryId: 'research',
    label: 'Review the auto sector supply pipeline',
    prompt: 'Review the expected auto sector supply pipeline and flag any crowding risk.',
  },
  // Compare
  {
    id: 'compare-mercedes-peers',
    categoryId: 'compare',
    label: 'Compare Mercedes-Benz to sector peers',
    prompt: 'Compare Mercedes-Benz to its auto sector peers on spread, tenor, and new-issue concession.',
  },
  {
    id: 'compare-nip',
    categoryId: 'compare',
    label: 'Where would VW price a 7-year vs peers?',
    prompt: 'Where would Volkswagen likely price a 7-year versus its closest peers right now?',
  },
  {
    id: 'compare-investor',
    categoryId: 'compare',
    label: 'Investor overlap between BMW and Daimler',
    prompt: 'Show the investor overlap between recent BMW and Daimler books.',
  },
  {
    id: 'compare-currency',
    categoryId: 'compare',
    label: 'Compare EUR vs USD funding for Siemens',
    prompt: 'Compare EUR versus USD funding economics for Siemens including basis and demand depth.',
  },
  {
    id: 'compare-rating',
    categoryId: 'compare',
    label: 'Benchmark spreads across rating bands',
    prompt: 'Benchmark auto sector spreads across A and BBB rating bands at the 5-year point.',
  },
  // Generate
  {
    id: 'generate-brief',
    categoryId: 'generate',
    label: 'Generate a mandate brief for Siemens',
    prompt: 'Generate a mandate brief for Siemens covering rationale, timing, structure, and target investors.',
  },
  {
    id: 'generate-pack',
    categoryId: 'generate',
    label: 'Draft an investor meeting pack',
    prompt: 'Draft an investor meeting pack for a debut green bond from an auto issuer.',
  },
  {
    id: 'generate-termsheet',
    categoryId: 'generate',
    label: 'Build a draft term sheet',
    prompt: 'Build a draft term sheet for a EUR 7-year senior unsecured benchmark.',
  },
  {
    id: 'generate-summary',
    categoryId: 'generate',
    label: 'Summarise a deal for internal distribution',
    prompt: 'Summarise the latest BMW deal for internal distribution, including book quality and pricing outcome.',
  },
  {
    id: 'generate-email',
    categoryId: 'generate',
    label: 'Draft a post-trade client email',
    prompt: 'Draft a concise post-trade client email recapping the execution and final terms.',
  },
  // Monitor
  {
    id: 'monitor-pipeline',
    categoryId: 'monitor',
    label: 'Track the live issuance pipeline',
    prompt: 'Track the live EUR issuance pipeline and alert me to any new auto sector mandates.',
  },
  {
    id: 'monitor-spreads',
    categoryId: 'monitor',
    label: 'Watch spread moves on my coverage',
    prompt: 'Watch intraday spread moves across my coverage names and flag anything beyond two standard deviations.',
  },
  {
    id: 'monitor-redemptions',
    categoryId: 'monitor',
    label: 'Flag upcoming redemptions to pre-fund',
    prompt: 'Flag upcoming redemptions over the next six months where the issuer may want to pre-fund.',
  },
  {
    id: 'monitor-ratings',
    categoryId: 'monitor',
    label: 'Surface recent rating actions',
    prompt: 'Surface recent rating actions and outlook changes across the auto sector.',
  },
];
