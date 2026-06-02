/**
 * Mock bond-issuance data for the Issuance Components lab.
 * Numbers echo the reference KPI dashboard; nothing here hits the network.
 */

export type Trend = 'up' | 'down' | 'flat';

export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  /** Tiny sparkline series (relative values, no axis). */
  spark: number[];
}

export const kpis: Kpi[] = [
  {
    id: 'us-ig',
    label: 'US investment grade (YTD Apr)',
    value: '$1.01T',
    delta: '+28% YoY',
    trend: 'up',
    spark: [42, 48, 45, 53, 61, 58, 67, 72, 70, 81, 88, 96],
  },
  {
    id: 'eur-bank',
    label: 'EUR bank bond issuance (2025 FY est.)',
    value: '€435bn',
    delta: '+3% YoY',
    trend: 'up',
    spark: [60, 58, 62, 59, 64, 63, 66, 65, 68, 67, 70, 72],
  },
  {
    id: 'ust',
    label: 'US Treasuries (YTD Apr)',
    value: '$10.8T',
    delta: '+9.2% YoY',
    trend: 'up',
    spark: [70, 72, 71, 74, 76, 75, 78, 80, 79, 83, 86, 88],
  },
  {
    id: 'nic',
    label: 'Avg new issue concession',
    value: '3.4 bps',
    delta: '-1.2 bps tighter',
    trend: 'down',
    spark: [9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3],
  },
];

export interface CurrencySlice {
  name: string;
  value: number;
  color: string;
}

/** Global DCM issuance by currency — Q1 (share of volume). */
export const currencyMix: CurrencySlice[] = [
  { name: 'USD', value: 50, color: '#3b82f6' },
  { name: 'EUR', value: 28, color: '#10b981' },
  { name: 'GBP', value: 9, color: '#b45309' },
  { name: 'JPY', value: 7, color: '#ec4899' },
  { name: 'Other', value: 6, color: '#9ca3af' },
];

export interface SupplyDatum {
  period: string;
  coveredBonds: number;
  seniorUnsecured: number;
  bankCapital: number;
}

/** EUR bank bond supply by segment (€bn): actual vs expected. */
export const supplyBySegment: SupplyDatum[] = [
  { period: '2025 actual', coveredBonds: 150, seniorUnsecured: 200, bankCapital: 35 },
  { period: '2026 expected', coveredBonds: 145, seniorUnsecured: 165, bankCapital: 35 },
];

export const supplySegments = [
  { key: 'coveredBonds', label: 'Covered bonds', color: '#7c3aed' },
  { key: 'seniorUnsecured', label: 'Senior unsecured', color: '#10b981' },
  { key: 'bankCapital', label: 'Bank capital', color: '#f97316' },
] as const;

export interface DealSnapshotData {
  issuer: string;
  ticker: string;
  rating: string;
  currency: string;
  tenor: string;
  maturity: string;
  couponPct: number;
  format: string;
  status: string;
  dealSizeMm: number;
  guidanceBps: number;
  finalSpreadBps: number;
  orderbookMm: number;
  bookCoverage: number;
  newIssueConcessionBps: number;
  pricingDate: string;
  leads: string;
  esg: string;
  useOfProceeds: string;
}

export const dealSnapshot: DealSnapshotData = {
  issuer: 'BMW Finance NV',
  ticker: 'BMW',
  rating: 'A',
  currency: 'EUR',
  tenor: '5Y',
  maturity: '2031-05-15',
  couponPct: 3.375,
  format: 'Senior',
  status: 'Priced',
  dealSizeMm: 1250,
  guidanceBps: 95,
  finalSpreadBps: 88,
  orderbookMm: 4100,
  bookCoverage: 3.28,
  newIssueConcessionBps: 7,
  pricingDate: '2026-04-22',
  leads: 'BNPP · DB · HSBC · JPM',
  esg: 'Green',
  useOfProceeds: 'EV financing & general corporate',
};

export interface SecondaryPoint {
  t: string;
  price: number;
  spread: number;
}

/** Intraday secondary performance: reoffer par at 100.0, tightening through the session. */
export const secondaryPrevClose = 100.0;

export const secondaryPerf: SecondaryPoint[] = [
  { t: '09:00', price: 100.0, spread: 88 },
  { t: '09:30', price: 99.97, spread: 88.3 },
  { t: '10:00', price: 100.04, spread: 87.6 },
  { t: '10:30', price: 100.02, spread: 87.8 },
  { t: '11:00', price: 100.09, spread: 87.1 },
  { t: '11:30', price: 100.14, spread: 86.6 },
  { t: '12:00', price: 100.11, spread: 86.9 },
  { t: '12:30', price: 100.18, spread: 86.2 },
  { t: '13:00', price: 100.24, spread: 85.6 },
  { t: '13:30', price: 100.21, spread: 85.9 },
  { t: '14:00', price: 100.29, spread: 85.1 },
  { t: '14:30', price: 100.34, spread: 84.6 },
  { t: '15:00', price: 100.31, spread: 84.9 },
  { t: '15:30', price: 100.38, spread: 84.2 },
  { t: '16:00', price: 100.42, spread: 83.8 },
  { t: '16:30', price: 100.41, spread: 83.9 },
];

export const secondarySummary = {
  bondName: 'BMW 3.375% 2031',
  reofferSpread: 88,
  currentSpread: 83.9,
  reofferPrice: 100.0,
  currentPrice: 100.41,
  trend: 'Tightening',
};
