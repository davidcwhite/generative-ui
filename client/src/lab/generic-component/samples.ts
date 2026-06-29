/**
 * Example payloads an agent might emit. These double as documentation of the
 * contract and as the demo data for the studio. Domain is bond issuance, but
 * the component itself is domain-agnostic.
 */

import type { GenericComponentPayload } from './contract';

export interface GenericSample {
  id: string;
  label: string;
  data: GenericComponentPayload;
}

/** Bar chart: this deal's new-issue concession against its peers. */
const peerConcessionChart: GenericComponentPayload = {
  eyebrow: 'Generated',
  title: 'New-issue concession vs peers',
  subtitle: 'EUR IG autos · last 90 days',
  kpis: [
    { label: 'This deal', value: 7, format: 'bps', delta: { value: '−2 vs sector', tone: 'positive' } },
    { label: 'Sector average', value: 9, format: 'bps' },
    { label: 'Deals in set', value: 6 },
  ],
  body: {
    type: 'chart',
    chart: 'bar',
    format: 'bps',
    caption:
      'BMW priced at a 7 bps new-issue concession, 2 bps inside the 9 bps sector average across six comparable EUR auto deals.',
    bars: [
      { label: 'TMCC', value: 5 },
      { label: 'M-B', value: 6 },
      { label: 'BMW', value: 7, emphasis: true },
      { label: 'VW', value: 9 },
      { label: 'Stla', value: 12 },
      { label: 'RNO', value: 14 },
    ],
  },
};

/** Rich table: comparable secondary levels with a highlighted "this deal" row. */
const peerTable: GenericComponentPayload = {
  eyebrow: 'Generated',
  title: 'Comparable EUR auto new issues',
  subtitle: 'Secondary z-spread vs reoffer',
  currency: 'EUR',
  kpis: [
    { label: 'Tightest', value: 66, format: 'bps' },
    { label: 'Widest', value: 182, format: 'bps' },
    { label: 'This deal', value: 84, format: 'bps' },
  ],
  body: {
    type: 'table',
    caption:
      'Eight comparable EUR auto bonds by z-spread and recent move. BMW 2031 is the current deal. Numeric columns carry raw numbers so the grid sorts by value.',
    columns: [
      { label: 'Issuer' },
      { label: 'Rating' },
      { label: 'Tenor' },
      { label: 'Z-spread', numeric: true, format: 'bps' },
      { label: 'Δ 1w', numeric: true, format: 'bps' },
    ],
    rows: [
      { cells: ['Toyota Motor Cr 2030', 'A+', '5Y', 66, { value: 0, tone: 'neutral' }] },
      { cells: ['Honda Finance 2030', 'A', '5Y', 74, { value: -1, tone: 'positive' }] },
      { cells: ['Mercedes-Benz 2030', 'A', '5Y', 80, { value: 1, tone: 'negative' }] },
      {
        emphasis: true,
        cells: ['BMW 2031', 'A', '5Y', 84, { value: -4, tone: 'positive' }],
      },
      { cells: ['Volkswagen 2030', 'A−', '5Y', 96, { value: 2, tone: 'negative' }] },
      { cells: ['Renault 2029', 'BBB', '4Y', 108, { value: 5, tone: 'negative' }] },
      { cells: ['Stellantis 2030', 'BBB+', '5Y', 112, { value: 3, tone: 'negative' }] },
      { cells: ['Ford 2032', 'BBB−', '7Y', 182, { value: -2, tone: 'positive' }] },
    ],
  },
};

/** Bar chart with a year-over-year KPI delta — the comparison case. */
const annualVolumeChart: GenericComponentPayload = {
  eyebrow: 'Generated',
  title: 'Annual EUR IG issuance volume',
  subtitle: 'Primary supply by year',
  currency: 'EUR',
  status: { label: 'YTD', tone: 'neutral' },
  kpis: [
    { label: '2026 YTD', value: 48000, format: 'currency', delta: { value: '+12% YoY', tone: 'positive' } },
    { label: '5-year average', value: 41000, format: 'currency' },
  ],
  body: {
    type: 'chart',
    chart: 'bar',
    format: 'currency',
    caption: 'EUR investment-grade primary supply has risen to €48bn year-to-date, 12% above last year.',
    bars: [
      { label: '2022', value: 36000 },
      { label: '2023', value: 39000 },
      { label: '2024', value: 43000 },
      { label: '2025', value: 43000 },
      { label: '2026', value: 48000, emphasis: true },
    ],
  },
};

export const genericSamples: GenericSample[] = [
  { id: 'peer-concession', label: 'Bar · peers', data: peerConcessionChart },
  { id: 'peer-table', label: 'Table · comparables', data: peerTable },
  { id: 'annual-volume', label: 'Bar · YoY', data: annualVolumeChart },
];
