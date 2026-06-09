/**
 * Mock two-turn conversation for the Trust Panel · Chat lab.
 *
 * Reuses the three lineages from the v2 lab and adds a fourth (spread
 * tightening) so each turn carries two traceable components. The panel
 * hierarchy mirrors the chat: turn → component → query step.
 */

import {
  lineageComponents,
  type AssetDescriptor,
  type ComponentLineage,
} from '../data-lineage-v2/lineageData';

/* ── Component 4: Spread tightening (IPT → launch) ──────────────────────── */

const spreadTightening: ComponentLineage = {
  id: 'spread-tightening',
  title: 'Spread tightening',
  subtitle: 'IPT to launch — BMW 3.375% 2031',
  kind: 'metric',
  sources: [
    {
      id: 'S1',
      name: 'Price talk log',
      system: 'bookbuild.price_talk',
      tier: 2,
      owner: 'Syndicate desk',
      asOf: '22 Apr 2026 13:40 BST',
      freshness: 'Final at launch',
      rowCount: 3,
      description: 'Spread talk published during execution: IPT, guidance, launch.',
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
      description: 'Confirmed deal record with the final reoffer spread.',
    },
  ],
  transforms: [
    {
      id: 'T1',
      kind: 'filter',
      label: 'Price talk for this deal',
      detail: 'All published talk for BMW-2031, in time order.',
      from: ['S1'],
    },
    {
      id: 'T2',
      kind: 'derive',
      label: 'Tightening',
      detail: 'IPT midpoint minus launch spread.',
      formula: 'tightening = IPT − launch = 120 − 88 = 32 bps',
      from: ['T1', 'S2'],
    },
  ],
  results: [
    { label: 'IPT to launch', value: '32 bps', emphasis: true, citation: 'S1' },
    { label: 'IPT', value: '+120 area', citation: 'S1' },
    { label: 'Launch', value: '+88 bps', citation: 'S2' },
  ],
  formula: 'tightening = IPT − launch = 120 − 88 = 32 bps',
  steps: [
    {
      id: 'Q1',
      label: 'Price talk',
      kind: 'filter',
      sql: `SELECT stage, spread_talk, published_at
FROM   bookbuild.price_talk
WHERE  deal_id = 'BMW-2031'
ORDER BY published_at;`,
      table: {
        caption: 'bookbuild.price_talk — published talk for BMW-2031',
        columns: ['Stage', 'Talk', 'Published'],
        resultNote: 'Three stages published during execution; launch is the final print.',
        rows: [
          { cells: ['IPT', '+120 area', '09:02'], contributes: true },
          { cells: ['Guidance', '+95 (±3)', '11:35'], contributes: true },
          { cells: ['Launch', '+88', '13:28'], contributes: true },
        ],
      },
    },
    {
      id: 'Q2',
      label: 'Tightening',
      kind: 'derive',
      sql: `SELECT 120 - d.reoffer_spread AS tightening_bps   -- 120 - 88 = 32
FROM   issuance.deals d
WHERE  d.deal_id = 'BMW-2031';`,
      table: {
        caption: 'issuance.deals — confirmed pricing',
        columns: ['Field', 'Value'],
        resultNote: 'IPT +120 minus launch +88 = 32 bps of tightening through execution.',
        rows: [
          { cells: ['ipt_mid', '+120 bps'], contributes: true },
          { cells: ['reoffer_spread', '+88 bps'], contributes: true },
          { cells: ['tightening', '32 bps'], contributes: true, emphasis: true },
        ],
      },
    },
  ],
  audit: [
    { id: 'A1', ts: '22 Apr 2026 13:41:02', actor: 'engine', action: 'query bookbuild.price_talk', hash: '7c8d…f31', detail: '3 rows · dealId=BMW-2031' },
    { id: 'A2', ts: '22 Apr 2026 13:41:02', actor: 'engine', action: 'compute tightening', hash: '9e0f…b52', detail: '120 − 88 = 32 bps' },
  ],
};

/* ── Conversation model ──────────────────────────────────────────────────── */

export interface ChatTurn {
  id: string;
  /** The user's question — shown in the bubble and (truncated) in the rail. */
  question: string;
  /** Short assistant lead-in above the components. */
  answerLead: string;
  assetIds: string[];
}

export const chatTurns: ChatTurn[] = [
  {
    id: 'turn-1',
    question: 'Walk me through the BMW 3.375% 2031 bookbuild',
    answerLead:
      'The book closed strongly covered, with demand concentrated in UK and French real-money accounts.',
    assetIds: ['oversubscription', 'allocation-geography'],
  },
  {
    id: 'turn-2',
    question: 'How did pricing land vs fair value?',
    answerLead:
      'Pricing came 2 bps inside the sector average concession, after tightening 32 bps through execution.',
    assetIds: ['concession-vs-sector', 'spread-tightening'],
  },
];

export const chatLineages: ComponentLineage[] = [...lineageComponents, spreadTightening];

export function getChatLineage(id: string): ComponentLineage | undefined {
  return chatLineages.find((c) => c.id === id);
}

function descriptor(c: ComponentLineage): AssetDescriptor {
  const headline = c.results.find((r) => r.emphasis) ?? c.results[0];
  return {
    id: c.id,
    title: c.title,
    kind: c.kind ?? 'metric',
    citation: headline?.citation,
    value: headline?.value,
  };
}

/** Asset descriptors grouped per turn, in chat order. */
export function turnAssets(turn: ChatTurn): AssetDescriptor[] {
  return turn.assetIds
    .map((id) => getChatLineage(id))
    .filter((c): c is ComponentLineage => Boolean(c))
    .map(descriptor);
}

/** The turn an asset belongs to. */
export function turnForAsset(assetId: string): ChatTurn | undefined {
  return chatTurns.find((t) => t.assetIds.includes(assetId));
}

/** Flat asset order across the whole conversation (for ←/→ cycling). */
export const allAssetIds: string[] = chatTurns.flatMap((t) => t.assetIds);
