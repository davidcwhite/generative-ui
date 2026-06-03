/**
 * Mock data for the Deal Snapshot tear sheet lab.
 * One cohesive deal (BMW 3.375% 2031), consistent with the issuance lab. No network.
 */

export interface DealMeta {
  issuer: string;
  ticker: string;
  isin: string;
  rating: string;
  currency: string;
  format: string;
  esg: string;
  status: string;
  pricingDate: string;
  bondName: string;
}

export const dealMeta: DealMeta = {
  issuer: 'BMW Finance NV',
  ticker: 'BMW',
  isin: 'XS2789456123',
  rating: 'A / A2',
  currency: 'EUR',
  format: 'Senior Unsecured',
  esg: 'Green',
  status: 'Priced',
  pricingDate: '22 Apr 2026',
  bondName: 'BMW 3.375% 2031',
};

export interface DealKpi {
  id: string;
  label: string;
  value: string;
  context: string;
  positive?: boolean;
}

export const dealKpis: DealKpi[] = [
  { id: 'size', label: 'Deal size', value: '€1.25bn', context: 'From €1.0bn launch' },
  { id: 'spread', label: 'Final spread', value: '+88 bps', context: 'Guidance +95 area', positive: true },
  { id: 'cover', label: 'Oversubscription', value: '3.3x', context: '€4.1bn final book', positive: true },
  { id: 'nic', label: 'New issue concession', value: '7 bps', context: 'Sector avg 9 bps', positive: true },
  { id: 'coupon', label: 'Coupon', value: '3.375%', context: '5Y · mat. 2031' },
];

export interface GeographySlice {
  name: string;
  pct: number;
  color: string;
}

/** Allocation by investor geography (% of final allocation). */
export const allocationByGeography: GeographySlice[] = [
  { name: 'UK', pct: 24, color: '#3b82f6' },
  { name: 'France', pct: 18, color: '#10b981' },
  { name: 'Germany', pct: 16, color: '#f59e0b' },
  { name: 'Benelux', pct: 12, color: '#8b5cf6' },
  { name: 'Nordics', pct: 9, color: '#06b6d4' },
  { name: 'S. Europe', pct: 8, color: '#ec4899' },
  { name: 'Asia', pct: 7, color: '#f97316' },
  { name: 'Other', pct: 6, color: '#9ca3af' },
];

export interface InvestorTypeBar {
  name: string;
  pct: number;
  fillRate: number;
  color: string;
}

/** Allocation by investor type (% of allocation + average fill rate). */
export const allocationByType: InvestorTypeBar[] = [
  { name: 'Asset / Fund managers', pct: 58, fillRate: 0.71, color: '#3b82f6' },
  { name: 'Banks / Private banks', pct: 18, fillRate: 0.64, color: '#10b981' },
  { name: 'Insurance / Pension', pct: 14, fillRate: 0.82, color: '#8b5cf6' },
  { name: 'Hedge funds', pct: 6, fillRate: 0.38, color: '#f59e0b' },
  { name: 'Central banks / OI', pct: 4, fillRate: 0.9, color: '#06b6d4' },
];

export const allocationSummary = {
  totalInvestors: 184,
  avgFillRate: 0.68,
  granularity: 'High',
};

export interface SecondaryPoint {
  t: string;
  price: number;
  spread: number;
}

/** Intraday secondary trading: reoffer par 100.0, spread tightening through the session. */
export const secondaryPrevClose = 100.0;

export const secondarySeries: SecondaryPoint[] = [
  { t: '09:00', price: 100.0, spread: 88 },
  { t: '09:30', price: 100.03, spread: 87.7 },
  { t: '10:00', price: 100.06, spread: 87.3 },
  { t: '10:30', price: 100.04, spread: 87.6 },
  { t: '11:00', price: 100.11, spread: 86.9 },
  { t: '11:30', price: 100.16, spread: 86.3 },
  { t: '12:00', price: 100.13, spread: 86.6 },
  { t: '12:30', price: 100.2, spread: 85.9 },
  { t: '13:00', price: 100.26, spread: 85.3 },
  { t: '13:30', price: 100.23, spread: 85.6 },
  { t: '14:00', price: 100.31, spread: 84.8 },
  { t: '14:30', price: 100.36, spread: 84.3 },
  { t: '15:00', price: 100.33, spread: 84.6 },
  { t: '15:30', price: 100.4, spread: 83.9 },
  { t: '16:00', price: 100.45, spread: 83.4 },
  { t: '16:30', price: 100.44, spread: 83.5 },
];

export const secondarySummary = {
  bondName: dealMeta.bondName,
  reofferSpread: 88,
  currentSpread: 83.5,
  reofferPrice: 100.0,
  currentPrice: 100.44,
  trend: 'Tightening',
};
