/**
 * Market-domain mock data: IssuanceWindow (go/no-go backdrop) and
 * CrossCurrencyRelativeValue (cheapest funding leg after the basis swap).
 */

import type { Trend } from './deal';

export type WindowRead = 'open' | 'selective' | 'shut';

export interface WindowGauge {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  tone: 'good' | 'watch' | 'bad';
}

export interface IssuanceWindowData {
  read: WindowRead;
  asOf: string;
  rationale: string;
  expectedSupply: string;
  gauges: WindowGauge[];
  scoreSeries: number[]; // ~10 sessions, 0–100 window score
}

export interface WindowSample {
  id: string;
  label: string;
  data: IssuanceWindowData;
}

export const windowSamples: WindowSample[] = [
  {
    id: 'open',
    label: 'Constructive',
    data: {
      read: 'open',
      asOf: '2026-06-22T07:30:00Z',
      rationale:
        'Rates stable into the print, MOVE below 90 and IG spreads 2 bps tighter — a constructive window for high-grade supply.',
      expectedSupply: '€6–8 bn IG expected today',
      scoreSeries: [54, 58, 61, 57, 63, 66, 64, 70, 73, 78],
      gauges: [
        { id: 'bund', label: '10Y Bund', value: '2.61%', delta: '−2 bps', trend: 'down', tone: 'good' },
        { id: 'move', label: 'MOVE', value: '86', delta: '−4', trend: 'down', tone: 'good' },
        { id: 'ig', label: 'IG OAS', value: '108 bps', delta: '−2 bps', trend: 'down', tone: 'good' },
        { id: 'supply', label: 'Supply', value: '€7 bn', delta: 'vs €5 bn avg', trend: 'up', tone: 'watch' },
      ],
    },
  },
  {
    id: 'selective',
    label: 'Selective',
    data: {
      read: 'selective',
      asOf: '2026-06-22T07:30:00Z',
      rationale:
        'Vol elevated ahead of CPI and spreads drifting wider — window open for well-rated names with a concession, shut for tier-2 credit.',
      expectedSupply: '€2–3 bn IG, defensive names only',
      scoreSeries: [62, 60, 58, 55, 51, 49, 47, 44, 46, 42],
      gauges: [
        { id: 'bund', label: '10Y Bund', value: '2.78%', delta: '+6 bps', trend: 'up', tone: 'watch' },
        { id: 'move', label: 'MOVE', value: '112', delta: '+9', trend: 'up', tone: 'bad' },
        { id: 'ig', label: 'IG OAS', value: '124 bps', delta: '+4 bps', trend: 'up', tone: 'bad' },
        { id: 'supply', label: 'Supply', value: '€2 bn', delta: 'light calendar', trend: 'down', tone: 'good' },
      ],
    },
  },
];

// --- Cross-Currency Relative Value -------------------------------------------

export interface FundingLeg {
  currency: string;
  refRate: 'SOFR' | '€STR' | 'SONIA' | 'EURIBOR';
  newIssueSpreadBps: number;
  xccyBasisBps: number;
  allInBps: number; // swapped back to home currency
}

export interface CrossCurrencyRVData {
  issuer: string;
  homeCurrency: string;
  tenor: string;
  legs: FundingLeg[];
}

export interface CrossCurrencySample {
  id: string;
  label: string;
  data: CrossCurrencyRVData;
}

export const crossCurrencySamples: CrossCurrencySample[] = [
  {
    id: 'bmw-5y',
    label: 'BMW · 5Y',
    data: {
      issuer: 'BMW Finance NV',
      homeCurrency: 'EUR',
      tenor: '5Y',
      legs: [
        { currency: 'EUR', refRate: '€STR', newIssueSpreadBps: 88, xccyBasisBps: 0, allInBps: 88 },
        { currency: 'USD', refRate: 'SOFR', newIssueSpreadBps: 102, xccyBasisBps: -16, allInBps: 86 },
        { currency: 'GBP', refRate: 'SONIA', newIssueSpreadBps: 118, xccyBasisBps: -23, allInBps: 95 },
      ],
    },
  },
];
