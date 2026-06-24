/**
 * Deal-domain mock data: DealSnapshot, NewIssueTermsMonitor, SecondaryPerformance.
 * Nothing here hits the network. Numbers are kept internally consistent across
 * the three components (same BMW 5Y EUR benchmark) so demos read credibly.
 */

export type Trend = 'up' | 'down' | 'flat';
export type DealStatus = 'announced' | 'guidance' | 'launched' | 'priced';

export interface DealSnapshotData {
  issuer: string;
  ticker: string;
  rating: string;
  currency: string;
  tenor: string;
  maturity: string;
  couponPct: number | null;
  format: string;
  esg: string;
  status: DealStatus;
  dealSizeMm: number;
  iptBps: number;
  guidanceBps: number;
  finalSpreadBps: number | null; // null until priced
  orderbookMm: number;
  bookCoverage: number;
  newIssueConcessionBps: number | null;
  pricingDate: string;
  leads: string;
  useOfProceeds: string;
}

export interface DealSample {
  id: string;
  label: string;
  data: DealSnapshotData;
}

export const dealSamples: DealSample[] = [
  {
    id: 'bmw-priced',
    label: 'BMW · Priced',
    data: {
      issuer: 'BMW Finance NV',
      ticker: 'BMW',
      rating: 'A',
      currency: 'EUR',
      tenor: '5Y',
      maturity: '2031-05-15',
      couponPct: 3.375,
      format: 'Senior',
      esg: 'Green',
      status: 'priced',
      dealSizeMm: 1250,
      iptBps: 100,
      guidanceBps: 92,
      finalSpreadBps: 88,
      orderbookMm: 4100,
      bookCoverage: 3.28,
      newIssueConcessionBps: 7,
      pricingDate: '2026-04-22',
      leads: 'BNPP · DB · HSBC · JPM',
      useOfProceeds: 'EV financing & general corporate',
    },
  },
  {
    id: 'socgen-guidance',
    label: 'SocGen · Guidance',
    data: {
      issuer: 'Société Générale',
      ticker: 'SOCGEN',
      rating: 'A-',
      currency: 'EUR',
      tenor: '6NC5',
      maturity: '2032-06-03',
      couponPct: null,
      format: 'Senior Preferred',
      esg: '—',
      status: 'guidance',
      dealSizeMm: 1000,
      iptBps: 130,
      guidanceBps: 115,
      finalSpreadBps: null,
      orderbookMm: 3200,
      bookCoverage: 3.2,
      newIssueConcessionBps: null,
      pricingDate: '2026-06-22',
      leads: 'SG · BARC · UBS · UCG',
      useOfProceeds: 'General corporate purposes',
    },
  },
  {
    id: 'kfw-announced',
    label: 'KfW · Announced',
    data: {
      issuer: 'KfW',
      ticker: 'KFW',
      rating: 'AAA',
      currency: 'EUR',
      tenor: '10Y',
      maturity: '2036-06-30',
      couponPct: null,
      format: 'SSA',
      esg: 'Green',
      status: 'announced',
      dealSizeMm: 3000,
      iptBps: 32,
      guidanceBps: 32,
      finalSpreadBps: null,
      orderbookMm: 0,
      bookCoverage: 0,
      newIssueConcessionBps: null,
      pricingDate: '2026-06-23',
      leads: 'CMZ · DB · GS · NWM',
      useOfProceeds: 'Green bond framework — renewables',
    },
  },
];

// --- New Issue Terms Monitor -------------------------------------------------

export interface PriceStage {
  stage: 'ipt' | 'guidance' | 'launch' | 'priced';
  label: string;
  lowBps?: number;
  highBps?: number;
  pointBps?: number;
  at?: string;
}

export interface NewIssueTermsData {
  bondName: string;
  benchmark: string;
  stages: PriceStage[];
  currentStage: PriceStage['stage'];
  tighteningBps: number;
  newIssueConcessionBps: number | null;
  bookCoverageAtLaunch: number;
  priceProgressions: number;
}

export interface TermsSample {
  id: string;
  label: string;
  data: NewIssueTermsData;
}

export const termsSamples: TermsSample[] = [
  {
    id: 'bmw-priced',
    label: 'BMW · Priced',
    data: {
      bondName: 'BMW 3.375% 2031',
      benchmark: 'vs MS',
      currentStage: 'priced',
      tighteningBps: -12,
      newIssueConcessionBps: 7,
      bookCoverageAtLaunch: 3.28,
      priceProgressions: 2,
      stages: [
        { stage: 'ipt', label: 'IPT', lowBps: 98, highBps: 102, at: '2026-04-22T08:05:00Z' },
        { stage: 'guidance', label: 'Guidance', lowBps: 90, highBps: 94, at: '2026-04-22T09:40:00Z' },
        { stage: 'launch', label: 'Launch', pointBps: 88, at: '2026-04-22T10:55:00Z' },
        { stage: 'priced', label: 'Priced', pointBps: 88, at: '2026-04-22T12:15:00Z' },
      ],
    },
  },
  {
    id: 'socgen-guidance',
    label: 'SocGen · In progress',
    data: {
      bondName: 'SocGen Senior Pref 6NC5',
      benchmark: 'vs MS',
      currentStage: 'guidance',
      tighteningBps: -15,
      newIssueConcessionBps: null,
      bookCoverageAtLaunch: 3.2,
      priceProgressions: 1,
      stages: [
        { stage: 'ipt', label: 'IPT', lowBps: 127, highBps: 133, at: '2026-06-22T08:10:00Z' },
        { stage: 'guidance', label: 'Guidance', lowBps: 113, highBps: 117, at: '2026-06-22T09:30:00Z' },
        { stage: 'launch', label: 'Launch' },
        { stage: 'priced', label: 'Priced' },
      ],
    },
  },
];

// --- Secondary Performance ---------------------------------------------------

export interface SecondaryPoint {
  t: string;
  price: number;
  spreadBps: number;
}

export interface SecondaryPerfData {
  bondName: string;
  reofferPrice: number;
  reofferSpreadBps: number;
  series: SecondaryPoint[];
}

export interface SecondarySample {
  id: string;
  label: string;
  data: SecondaryPerfData;
}

const bmwSecondary: SecondaryPoint[] = [
  { t: '09:00', price: 100.0, spreadBps: 88 },
  { t: '09:30', price: 99.97, spreadBps: 88.3 },
  { t: '10:00', price: 100.04, spreadBps: 87.6 },
  { t: '10:30', price: 100.02, spreadBps: 87.8 },
  { t: '11:00', price: 100.09, spreadBps: 87.1 },
  { t: '11:30', price: 100.14, spreadBps: 86.6 },
  { t: '12:00', price: 100.11, spreadBps: 86.9 },
  { t: '12:30', price: 100.18, spreadBps: 86.2 },
  { t: '13:00', price: 100.24, spreadBps: 85.6 },
  { t: '13:30', price: 100.21, spreadBps: 85.9 },
  { t: '14:00', price: 100.29, spreadBps: 85.1 },
  { t: '14:30', price: 100.34, spreadBps: 84.6 },
  { t: '15:00', price: 100.31, spreadBps: 84.9 },
  { t: '15:30', price: 100.38, spreadBps: 84.2 },
  { t: '16:00', price: 100.42, spreadBps: 83.8 },
  { t: '16:30', price: 100.41, spreadBps: 83.9 },
];

export const secondarySamples: SecondarySample[] = [
  {
    id: 'bmw-tightening',
    label: 'BMW · Tightening',
    data: {
      bondName: 'BMW 3.375% 2031',
      reofferPrice: 100.0,
      reofferSpreadBps: 88,
      series: bmwSecondary,
    },
  },
];
