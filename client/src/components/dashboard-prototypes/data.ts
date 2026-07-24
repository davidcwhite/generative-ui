export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  delta?: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

export interface IssuancePoint {
  month: string;
  volume: number;
  deals: number;
  avgNip: number;
}

export interface PipelineDeal {
  id: string;
  issuer: string;
  sector: string;
  rating: string;
  tenor: string;
  expectedSize: string;
  timing: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface RelativeValuePoint {
  issuer: string;
  fiveYear: number;
  sevenYear: number;
}

export interface InvestorMixPoint {
  name: string;
  value: number;
}

export interface DealRow {
  id: string;
  status: 'Live' | 'Priced' | 'Monitoring';
  pricingDate: string;
  issuer: string;
  sector: string;
  rating: string;
  currency: 'EUR' | 'USD' | 'GBP';
  size: number;
  tenor: string;
  coupon: number;
  guidance: string;
  spread: number;
  nip: number;
  book: number;
  oversubscription: number;
  leads: string;
}

export interface DashboardData {
  asOf: string;
  metrics: DashboardMetric[];
  issuance: IssuancePoint[];
  pipeline: PipelineDeal[];
  relativeValue: RelativeValuePoint[];
  investorMix: InvestorMixPoint[];
  deals: DealRow[];
}

const metrics: DashboardMetric[] = [
  {
    label: 'EUR IG supply',
    value: '€18.6bn',
    detail: '32 deals this week',
    delta: '+12% vs 4w avg',
    tone: 'neutral',
  },
  {
    label: 'Average NIP',
    value: '7.4bp',
    detail: 'Senior unsecured',
    delta: '1.8bp tighter',
    tone: 'positive',
  },
  {
    label: 'Average book',
    value: '3.1x',
    detail: 'Peak demand',
    delta: '+0.4x week/week',
    tone: 'positive',
  },
  {
    label: 'Market window',
    value: 'Open',
    detail: 'Constructive through Thu',
    delta: 'Low execution risk',
    tone: 'positive',
  },
];

const issuance: IssuancePoint[] = [
  { month: 'Aug', volume: 42, deals: 31, avgNip: 9.8 },
  { month: 'Sep', volume: 61, deals: 44, avgNip: 9.1 },
  { month: 'Oct', volume: 55, deals: 39, avgNip: 8.7 },
  { month: 'Nov', volume: 47, deals: 35, avgNip: 8.3 },
  { month: 'Dec', volume: 23, deals: 18, avgNip: 10.2 },
  { month: 'Jan', volume: 78, deals: 52, avgNip: 8.9 },
  { month: 'Feb', volume: 69, deals: 48, avgNip: 8.1 },
  { month: 'Mar', volume: 73, deals: 50, avgNip: 7.8 },
  { month: 'Apr', volume: 58, deals: 42, avgNip: 7.6 },
  { month: 'May', volume: 65, deals: 46, avgNip: 7.2 },
  { month: 'Jun', volume: 51, deals: 37, avgNip: 7.1 },
  { month: 'Jul', volume: 38, deals: 28, avgNip: 7.4 },
];

const pipeline: PipelineDeal[] = [
  {
    id: 'pipe-1',
    issuer: 'BMW AG',
    sector: 'Automobiles',
    rating: 'A / A2',
    tenor: '5Y / 8Y',
    expectedSize: '€1.0–1.5bn',
    timing: 'Tue',
    confidence: 'High',
  },
  {
    id: 'pipe-2',
    issuer: 'Siemens AG',
    sector: 'Industrials',
    rating: 'A+ / A1',
    tenor: '7Y',
    expectedSize: '€750m',
    timing: 'Wed',
    confidence: 'High',
  },
  {
    id: 'pipe-3',
    issuer: 'Renault SA',
    sector: 'Automobiles',
    rating: 'BBB- / Baa3',
    tenor: '4Y',
    expectedSize: '€500m',
    timing: 'Wed–Thu',
    confidence: 'Medium',
  },
  {
    id: 'pipe-4',
    issuer: 'Allianz SE',
    sector: 'Insurance',
    rating: 'A- / A2',
    tenor: 'PerpNC6',
    expectedSize: '€1.0bn',
    timing: 'Thu',
    confidence: 'Medium',
  },
];

const relativeValue: RelativeValuePoint[] = [
  { issuer: 'BMW', fiveYear: 84, sevenYear: 96 },
  { issuer: 'Mercedes', fiveYear: 87, sevenYear: 101 },
  { issuer: 'VW', fiveYear: 94, sevenYear: 108 },
  { issuer: 'Stellantis', fiveYear: 103, sevenYear: 117 },
  { issuer: 'Renault', fiveYear: 112, sevenYear: 128 },
];

const investorMix: InvestorMixPoint[] = [
  { name: 'Asset managers', value: 47 },
  { name: 'Insurance', value: 23 },
  { name: 'Banks', value: 15 },
  { name: 'Pensions', value: 9 },
  { name: 'Other', value: 6 },
];

const deals: DealRow[] = [
  {
    id: 'deal-001',
    status: 'Live',
    pricingDate: '2026-07-13',
    issuer: 'BMW AG',
    sector: 'Automobiles',
    rating: 'A / A2',
    currency: 'EUR',
    size: 1000,
    tenor: '5Y',
    coupon: 3.25,
    guidance: 'MS + 90 area',
    spread: 86,
    nip: 5,
    book: 3450,
    oversubscription: 3.5,
    leads: 'DB, BNP, HSBC',
  },
  {
    id: 'deal-002',
    status: 'Live',
    pricingDate: '2026-07-13',
    issuer: 'Allianz SE',
    sector: 'Insurance',
    rating: 'A- / A2',
    currency: 'EUR',
    size: 750,
    tenor: '10Y',
    coupon: 3.75,
    guidance: 'MS + 120 area',
    spread: 114,
    nip: 7,
    book: 2200,
    oversubscription: 2.9,
    leads: 'JPM, Citi, UBS',
  },
  {
    id: 'deal-003',
    status: 'Priced',
    pricingDate: '2026-07-11',
    issuer: 'Siemens AG',
    sector: 'Industrials',
    rating: 'A+ / A1',
    currency: 'EUR',
    size: 1250,
    tenor: '7Y',
    coupon: 3.0,
    guidance: 'MS + 78–80',
    spread: 75,
    nip: 4,
    book: 5100,
    oversubscription: 4.1,
    leads: 'BNP, GS, ING',
  },
  {
    id: 'deal-004',
    status: 'Priced',
    pricingDate: '2026-07-10',
    issuer: 'Volkswagen AG',
    sector: 'Automobiles',
    rating: 'BBB+ / A3',
    currency: 'EUR',
    size: 1500,
    tenor: '8Y',
    coupon: 3.625,
    guidance: 'MS + 115 area',
    spread: 108,
    nip: 8,
    book: 4300,
    oversubscription: 2.9,
    leads: 'Barclays, DB, SG',
  },
  {
    id: 'deal-005',
    status: 'Priced',
    pricingDate: '2026-07-09',
    issuer: 'Enel SpA',
    sector: 'Utilities',
    rating: 'BBB+ / Baa1',
    currency: 'EUR',
    size: 1000,
    tenor: '12Y',
    coupon: 4.0,
    guidance: 'MS + 135–140',
    spread: 132,
    nip: 6,
    book: 2750,
    oversubscription: 2.8,
    leads: 'CA, IMI, MS',
  },
  {
    id: 'deal-006',
    status: 'Monitoring',
    pricingDate: '2026-07-14',
    issuer: 'Renault SA',
    sector: 'Automobiles',
    rating: 'BBB- / Baa3',
    currency: 'EUR',
    size: 500,
    tenor: '4Y',
    coupon: 3.875,
    guidance: 'IPTs + 130 area',
    spread: 124,
    nip: 10,
    book: 0,
    oversubscription: 0,
    leads: 'BNP, Natixis, SG',
  },
  {
    id: 'deal-007',
    status: 'Priced',
    pricingDate: '2026-07-08',
    issuer: 'Deutsche Telekom',
    sector: 'Telecoms',
    rating: 'BBB+ / Baa1',
    currency: 'EUR',
    size: 750,
    tenor: '6Y',
    coupon: 3.125,
    guidance: 'MS + 88–90',
    spread: 84,
    nip: 5,
    book: 2400,
    oversubscription: 3.2,
    leads: 'DB, HSBC, UniCredit',
  },
  {
    id: 'deal-008',
    status: 'Priced',
    pricingDate: '2026-07-07',
    issuer: 'TotalEnergies',
    sector: 'Energy',
    rating: 'A+ / Aa3',
    currency: 'EUR',
    size: 2000,
    tenor: '5Y / 10Y',
    coupon: 3.25,
    guidance: 'MS + 82 / + 108',
    spread: 78,
    nip: 3,
    book: 6900,
    oversubscription: 3.5,
    leads: 'BNP, Citi, JPM',
  },
  {
    id: 'deal-009',
    status: 'Priced',
    pricingDate: '2026-07-04',
    issuer: 'Mercedes-Benz',
    sector: 'Automobiles',
    rating: 'A / A2',
    currency: 'EUR',
    size: 1000,
    tenor: '5Y',
    coupon: 3.125,
    guidance: 'MS + 90 area',
    spread: 85,
    nip: 5,
    book: 3200,
    oversubscription: 3.2,
    leads: 'BofA, Commerz, MS',
  },
  {
    id: 'deal-010',
    status: 'Priced',
    pricingDate: '2026-07-03',
    issuer: 'Iberdrola',
    sector: 'Utilities',
    rating: 'BBB+ / Baa1',
    currency: 'EUR',
    size: 850,
    tenor: '9Y',
    coupon: 3.625,
    guidance: 'MS + 115–120',
    spread: 111,
    nip: 6,
    book: 2600,
    oversubscription: 3.1,
    leads: 'BBVA, HSBC, Santander',
  },
  {
    id: 'deal-011',
    status: 'Priced',
    pricingDate: '2026-07-02',
    issuer: 'Orange SA',
    sector: 'Telecoms',
    rating: 'BBB+ / Baa1',
    currency: 'EUR',
    size: 1250,
    tenor: '7Y',
    coupon: 3.375,
    guidance: 'MS + 105 area',
    spread: 99,
    nip: 7,
    book: 3750,
    oversubscription: 3.0,
    leads: 'BNP, CA, Natixis',
  },
  {
    id: 'deal-012',
    status: 'Priced',
    pricingDate: '2026-06-30',
    issuer: 'Shell plc',
    sector: 'Energy',
    rating: 'A+ / Aa2',
    currency: 'EUR',
    size: 1500,
    tenor: '8Y',
    coupon: 3.25,
    guidance: 'MS + 92–95',
    spread: 88,
    nip: 4,
    book: 5250,
    oversubscription: 3.5,
    leads: 'Barclays, JPM, UBS',
  },
  {
    id: 'deal-013',
    status: 'Priced',
    pricingDate: '2026-06-27',
    issuer: 'SAP SE',
    sector: 'Technology',
    rating: 'A+ / A2',
    currency: 'EUR',
    size: 1000,
    tenor: '6Y',
    coupon: 2.875,
    guidance: 'MS + 72–75',
    spread: 69,
    nip: 3,
    book: 4100,
    oversubscription: 4.1,
    leads: 'DB, GS, JPM',
  },
  {
    id: 'deal-014',
    status: 'Priced',
    pricingDate: '2026-06-25',
    issuer: 'Stellantis NV',
    sector: 'Automobiles',
    rating: 'BBB+ / Baa2',
    currency: 'EUR',
    size: 750,
    tenor: '7Y',
    coupon: 3.75,
    guidance: 'MS + 125 area',
    spread: 118,
    nip: 8,
    book: 2250,
    oversubscription: 3.0,
    leads: 'BNP, Intesa, SG',
  },
  {
    id: 'deal-015',
    status: 'Priced',
    pricingDate: '2026-06-24',
    issuer: 'Nestlé SA',
    sector: 'Consumer',
    rating: 'AA- / Aa2',
    currency: 'EUR',
    size: 1000,
    tenor: '10Y',
    coupon: 2.875,
    guidance: 'MS + 68–70',
    spread: 65,
    nip: 2,
    book: 4800,
    oversubscription: 4.8,
    leads: 'BNP, Citi, UBS',
  },
  {
    id: 'deal-016',
    status: 'Priced',
    pricingDate: '2026-06-20',
    issuer: 'LVMH',
    sector: 'Consumer',
    rating: 'A+ / A1',
    currency: 'EUR',
    size: 1250,
    tenor: '5Y / 9Y',
    coupon: 3.0,
    guidance: 'MS + 72 / + 92',
    spread: 69,
    nip: 3,
    book: 5600,
    oversubscription: 4.5,
    leads: 'CA, HSBC, SG',
  },
  {
    id: 'deal-017',
    status: 'Priced',
    pricingDate: '2026-06-18',
    issuer: 'AstraZeneca',
    sector: 'Healthcare',
    rating: 'A / A2',
    currency: 'USD',
    size: 2000,
    tenor: '5Y / 10Y',
    coupon: 4.625,
    guidance: 'T + 82 / + 102',
    spread: 79,
    nip: 4,
    book: 7200,
    oversubscription: 3.6,
    leads: 'BofA, Citi, JPM',
  },
  {
    id: 'deal-018',
    status: 'Priced',
    pricingDate: '2026-06-16',
    issuer: 'Unilever plc',
    sector: 'Consumer',
    rating: 'A+ / A1',
    currency: 'GBP',
    size: 700,
    tenor: '8Y',
    coupon: 4.125,
    guidance: 'G + 92–95',
    spread: 90,
    nip: 4,
    book: 2100,
    oversubscription: 3.0,
    leads: 'Barclays, HSBC, NatWest',
  },
];

export const DASHBOARD_DATA: DashboardData = {
  asOf: '13 Jul 2026 · 17:42 London',
  metrics,
  issuance,
  pipeline,
  relativeValue,
  investorMix,
  deals,
};

export async function fetchDashboardData(): Promise<DashboardData> {
  // Keeps the prototype self-contained while exercising the same cached async
  // data path a production dashboard would use.
  await new Promise((resolve) => window.setTimeout(resolve, 240));
  return DASHBOARD_DATA;
}
