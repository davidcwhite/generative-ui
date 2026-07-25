export type IssuanceStatus = 'Priced' | 'Live' | 'Monitoring';
export type IssuanceCurrency = 'EUR' | 'USD' | 'GBP';
export type IssuanceRegion =
  | 'Western Europe'
  | 'North America'
  | 'APAC (DM)'
  | 'APAC (EM)'
  | 'CEEMEA';

/** Any field the charts can group by. */
export type Dimension = 'sector' | 'region' | 'currency';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface IssuanceRecord {
  id: string;
  pricingDate: string;
  monthKey: string;
  issuer: string;
  ticker: string;
  region: IssuanceRegion;
  sector: string;
  rating: string;
  currency: IssuanceCurrency;
  size: number;
  eurEquivalent: number;
  tenor: string;
  coupon: number;
  spread: number;
  nip: number;
  book: number;
  cover: number;
  leads: string;
  status: IssuanceStatus;
}

export interface SeriesPoint {
  key: string;
  label: string;
  labelLong: string;
  total: number;
  deals: number;
  /** One entry per stack category; absent categories are zero-filled. */
  [category: string]: string | number;
}

export interface CategorySlice {
  category: string;
  volume: number;
  deals: number;
  fill: string;
}

interface IssuerSeed {
  issuer: string;
  ticker: string;
  region: IssuanceRegion;
  sector: string;
  rating: string;
  currency: IssuanceCurrency;
  leads: string;
  /** Relative probability of printing — a European desk sees mostly European supply. */
  weight: number;
}

/** Five years of history ending on the latest pricing date. */
const HISTORY_MONTHS = 60;
const LATEST = { year: 2026, month: 7, day: 24 };

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WE = 'Western Europe';
const NA = 'North America';
const DM = 'APAC (DM)';
const EM = 'APAC (EM)';
const CE = 'CEEMEA';

const ISSUERS: IssuerSeed[] = [
  // Western Europe — the desk's core flow.
  { issuer: 'BMW AG', ticker: 'BMW', region: WE, sector: 'Automobiles', rating: 'A / A2', currency: 'EUR', leads: 'DB, BNP, HSBC', weight: 1 },
  { issuer: 'Siemens AG', ticker: 'SIE', region: WE, sector: 'Industrials', rating: 'A+ / A1', currency: 'EUR', leads: 'BNP, GS, ING', weight: 1 },
  { issuer: 'Allianz SE', ticker: 'ALV', region: WE, sector: 'Financials', rating: 'A- / A2', currency: 'EUR', leads: 'JPM, Citi, UBS', weight: 1 },
  { issuer: 'Enel SpA', ticker: 'ENEL', region: WE, sector: 'Utilities', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'CA, IMI, MS', weight: 1 },
  { issuer: 'TotalEnergies', ticker: 'TTE', region: WE, sector: 'Energy', rating: 'A+ / Aa3', currency: 'EUR', leads: 'BNP, Citi, JPM', weight: 1 },
  { issuer: 'Orange SA', ticker: 'ORA', region: WE, sector: 'Telecoms', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'BNP, CA, Natixis', weight: 1 },
  { issuer: 'SAP SE', ticker: 'SAP', region: WE, sector: 'Technology', rating: 'A+ / A2', currency: 'EUR', leads: 'DB, GS, JPM', weight: 1 },
  { issuer: 'Nestlé SA', ticker: 'NESN', region: WE, sector: 'Consumer', rating: 'AA- / Aa2', currency: 'EUR', leads: 'BNP, Citi, UBS', weight: 1 },
  { issuer: 'AstraZeneca', ticker: 'AZN', region: WE, sector: 'Healthcare', rating: 'A / A2', currency: 'USD', leads: 'BofA, Citi, JPM', weight: 1 },
  { issuer: 'Unilever plc', ticker: 'ULVR', region: WE, sector: 'Consumer', rating: 'A+ / A1', currency: 'GBP', leads: 'Barclays, HSBC, NatWest', weight: 1 },
  { issuer: 'Volkswagen AG', ticker: 'VOW', region: WE, sector: 'Automobiles', rating: 'BBB+ / A3', currency: 'EUR', leads: 'Barclays, DB, SG', weight: 1 },
  { issuer: 'Iberdrola', ticker: 'IBE', region: WE, sector: 'Utilities', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'BBVA, HSBC, Santander', weight: 1 },
  { issuer: 'Shell plc', ticker: 'SHEL', region: WE, sector: 'Energy', rating: 'A+ / Aa2', currency: 'USD', leads: 'Barclays, JPM, UBS', weight: 1 },
  { issuer: 'LVMH', ticker: 'MC', region: WE, sector: 'Consumer', rating: 'A+ / A1', currency: 'EUR', leads: 'CA, HSBC, SG', weight: 1 },
  { issuer: 'Deutsche Telekom', ticker: 'DTE', region: WE, sector: 'Telecoms', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'DB, HSBC, UniCredit', weight: 1 },
  { issuer: 'Roche Holding', ticker: 'ROG', region: WE, sector: 'Healthcare', rating: 'AA / Aa2', currency: 'GBP', leads: 'BNP, GS, UBS', weight: 1 },
  { issuer: 'Mercedes-Benz', ticker: 'MBG', region: WE, sector: 'Automobiles', rating: 'A / A2', currency: 'EUR', leads: 'BNP, DB, MS', weight: 1 },
  { issuer: 'Airbus SE', ticker: 'AIR', region: WE, sector: 'Industrials', rating: 'A / A2', currency: 'EUR', leads: 'BNP, Citi, SG', weight: 1 },
  { issuer: 'BNP Paribas', ticker: 'BNP', region: WE, sector: 'Financials', rating: 'A+ / Aa3', currency: 'EUR', leads: 'BNP, GS, JPM', weight: 1 },
  { issuer: 'Santander', ticker: 'SAN', region: WE, sector: 'Financials', rating: 'A / A2', currency: 'EUR', leads: 'Barclays, Santander, UBS', weight: 1 },
  { issuer: 'RWE AG', ticker: 'RWE', region: WE, sector: 'Utilities', rating: 'BBB+ / Baa2', currency: 'EUR', leads: 'DB, ING, UniCredit', weight: 1 },
  { issuer: 'Vodafone Group', ticker: 'VOD', region: WE, sector: 'Telecoms', rating: 'BBB / Baa2', currency: 'GBP', leads: 'Barclays, HSBC, NatWest', weight: 1 },
  { issuer: 'Diageo plc', ticker: 'DGE', region: WE, sector: 'Consumer', rating: 'A- / A3', currency: 'GBP', leads: 'Barclays, BofA, HSBC', weight: 1 },
  { issuer: 'Sanofi SA', ticker: 'SNY', region: WE, sector: 'Healthcare', rating: 'AA / Aa3', currency: 'EUR', leads: 'BNP, CA, JPM', weight: 1 },
  { issuer: 'ASML Holding', ticker: 'ASML', region: WE, sector: 'Technology', rating: 'A / A2', currency: 'EUR', leads: 'ABN, GS, ING', weight: 1 },
  { issuer: 'Repsol SA', ticker: 'REP', region: WE, sector: 'Energy', rating: 'BBB / Baa2', currency: 'EUR', leads: 'BBVA, CA, Santander', weight: 1 },
  { issuer: 'Schneider Electric', ticker: 'SU', region: WE, sector: 'Industrials', rating: 'A- / A3', currency: 'EUR', leads: 'BNP, CA, SG', weight: 1 },
  { issuer: 'Infineon', ticker: 'IFX', region: WE, sector: 'Technology', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'DB, HSBC, UniCredit', weight: 1 },

  // North America — yankee and reverse-yankee supply.
  { issuer: 'Apple Inc', ticker: 'AAPL', region: NA, sector: 'Technology', rating: 'AA+ / Aaa', currency: 'USD', leads: 'BofA, GS, JPM', weight: 0.8 },
  { issuer: 'JPMorgan Chase', ticker: 'JPM', region: NA, sector: 'Financials', rating: 'A- / A1', currency: 'USD', leads: 'JPM, MS, Wells', weight: 0.8 },
  { issuer: 'Verizon', ticker: 'VZ', region: NA, sector: 'Telecoms', rating: 'BBB+ / Baa1', currency: 'USD', leads: 'BofA, Citi, MUFG', weight: 0.8 },
  { issuer: 'Pfizer Inc', ticker: 'PFE', region: NA, sector: 'Healthcare', rating: 'A / A2', currency: 'EUR', leads: 'BNP, Citi, GS', weight: 0.8 },
  { issuer: 'Ford Motor Credit', ticker: 'F', region: NA, sector: 'Automobiles', rating: 'BBB- / Baa2', currency: 'EUR', leads: 'Barclays, DB, HSBC', weight: 0.8 },
  { issuer: 'Exxon Mobil', ticker: 'XOM', region: NA, sector: 'Energy', rating: 'AA- / Aa2', currency: 'USD', leads: 'BofA, Citi, JPM', weight: 0.8 },
  { issuer: 'Coca-Cola Co', ticker: 'KO', region: NA, sector: 'Consumer', rating: 'A+ / A1', currency: 'EUR', leads: 'BNP, Citi, GS', weight: 0.8 },
  { issuer: 'Caterpillar', ticker: 'CAT', region: NA, sector: 'Industrials', rating: 'A / A2', currency: 'USD', leads: 'Citi, JPM, MS', weight: 0.8 },
  { issuer: 'Duke Energy', ticker: 'DUK', region: NA, sector: 'Utilities', rating: 'BBB+ / Baa2', currency: 'USD', leads: 'BofA, MUFG, Wells', weight: 0.8 },

  // APAC developed.
  { issuer: 'Toyota Motor Credit', ticker: 'TM', region: DM, sector: 'Automobiles', rating: 'A+ / A1', currency: 'USD', leads: 'BofA, MUFG, Nomura', weight: 0.45 },
  { issuer: 'Sony Group', ticker: 'SONY', region: DM, sector: 'Technology', rating: 'A / A3', currency: 'EUR', leads: 'GS, MUFG, Nomura', weight: 0.45 },
  { issuer: 'Mitsubishi UFJ', ticker: 'MUFG', region: DM, sector: 'Financials', rating: 'A- / A1', currency: 'USD', leads: 'Citi, MUFG, MS', weight: 0.45 },
  { issuer: 'Commonwealth Bank', ticker: 'CBA', region: DM, sector: 'Financials', rating: 'AA- / Aa3', currency: 'EUR', leads: 'CBA, HSBC, UBS', weight: 0.45 },
  { issuer: 'BHP Group', ticker: 'BHP', region: DM, sector: 'Industrials', rating: 'A / A1', currency: 'USD', leads: 'Barclays, Citi, JPM', weight: 0.45 },
  { issuer: 'Woodside Energy', ticker: 'WDS', region: DM, sector: 'Energy', rating: 'BBB+ / Baa1', currency: 'USD', leads: 'ANZ, JPM, MUFG', weight: 0.45 },
  { issuer: 'NTT Corp', ticker: 'NTT', region: DM, sector: 'Telecoms', rating: 'A / A2', currency: 'EUR', leads: 'BNP, Nomura, SMBC', weight: 0.45 },

  // APAC emerging.
  { issuer: 'Reliance Industries', ticker: 'RIL', region: EM, sector: 'Energy', rating: 'BBB+ / Baa2', currency: 'USD', leads: 'Citi, HSBC, StanChart', weight: 0.4 },
  { issuer: 'Samsung Electronics', ticker: 'SMSN', region: EM, sector: 'Technology', rating: 'AA- / Aa2', currency: 'USD', leads: 'BofA, Citi, HSBC', weight: 0.4 },
  { issuer: 'Hyundai Capital', ticker: 'HYUN', region: EM, sector: 'Automobiles', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'BNP, HSBC, SG', weight: 0.4 },
  { issuer: 'Bank of China', ticker: 'BOC', region: EM, sector: 'Financials', rating: 'A / A1', currency: 'USD', leads: 'BOC, HSBC, StanChart', weight: 0.4 },
  { issuer: 'State Bank of India', ticker: 'SBIN', region: EM, sector: 'Financials', rating: 'BBB- / Baa3', currency: 'USD', leads: 'Citi, HSBC, StanChart', weight: 0.4 },
  { issuer: 'Petronas', ticker: 'PET', region: EM, sector: 'Energy', rating: 'BBB+ / A2', currency: 'USD', leads: 'CIMB, HSBC, JPM', weight: 0.4 },

  // CEEMEA.
  { issuer: 'Saudi Aramco', ticker: 'ARAMCO', region: CE, sector: 'Energy', rating: 'A / A1', currency: 'USD', leads: 'Citi, GS, JPM', weight: 0.4 },
  { issuer: 'Qatar National Bank', ticker: 'QNBK', region: CE, sector: 'Financials', rating: 'A / Aa3', currency: 'USD', leads: 'Citi, QNB, StanChart', weight: 0.4 },
  { issuer: 'Emirates NBD', ticker: 'EMIRAT', region: CE, sector: 'Financials', rating: 'A+ / A2', currency: 'USD', leads: 'ENBD, HSBC, StanChart', weight: 0.4 },
  { issuer: 'Standard Bank', ticker: 'SBK', region: CE, sector: 'Financials', rating: 'BB- / Ba2', currency: 'USD', leads: 'Citi, SBG, StanChart', weight: 0.4 },
  { issuer: 'PKO Bank Polski', ticker: 'PKO', region: CE, sector: 'Financials', rating: 'BBB+ / A2', currency: 'EUR', leads: 'Erste, ING, UniCredit', weight: 0.4 },
  { issuer: 'CEZ Group', ticker: 'CEZ', region: CE, sector: 'Utilities', rating: 'A- / Baa1', currency: 'EUR', leads: 'CSOB, Erste, SG', weight: 0.4 },
  { issuer: 'Turkcell', ticker: 'TCELL', region: CE, sector: 'Telecoms', rating: 'BB- / B1', currency: 'USD', leads: 'Citi, JPM, StanChart', weight: 0.4 },
];

const SIZES = [300, 500, 600, 750, 1000, 1250, 1500, 1750, 2000, 2500] as const;
const TENORS = ['3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '10Y', '12Y', '15Y', '20Y'] as const;
const EUR_RATES: Record<IssuanceCurrency, number> = { EUR: 1, USD: 0.91, GBP: 1.17 };

/** Assigned by volume rank so a ramp always reads largest to smallest. */
const CATEGORY_RAMP = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;
const OTHER_COLOR = '#e7e5e4';
export const OTHER_CATEGORY = 'Other';

/** Books build Tuesday to Thursday; Mondays and Fridays are thinner. */
const WEEKDAY_WEIGHTS = [0, 0.9, 1.25, 1.3, 1.1, 0.5, 0] as const;

/** Deterministic generator keeps the mocked dataset stable across reloads. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function pick<T>(items: readonly T[], weights: readonly number[], random: () => number): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return items[index];
  }
  return items[items.length - 1];
}

interface MonthSeed {
  key: string;
  year: number;
  month: number;
  /** Business days available for pricing, capped at the latest date. */
  days: number[];
}

function buildMonths(): MonthSeed[] {
  return Array.from({ length: HISTORY_MONTHS }, (_, index) => {
    const offset = HISTORY_MONTHS - 1 - index;
    const absolute = LATEST.year * 12 + (LATEST.month - 1) - offset;
    const year = Math.floor(absolute / 12);
    const month = (absolute % 12) + 1;
    const isLatest = year === LATEST.year && month === LATEST.month;
    const lastDay = isLatest ? LATEST.day : new Date(Date.UTC(year, month, 0)).getUTCDate();

    const days: number[] = [];
    for (let day = 1; day <= lastDay; day += 1) {
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (weekday !== 0 && weekday !== 6) days.push(day);
    }
    return { key: `${year}-${pad(month)}`, year, month, days };
  });
}

const MONTHS = buildMonths();
const ISSUER_WEIGHTS = ISSUERS.map((seed) => seed.weight);

function buildRows(): IssuanceRecord[] {
  const random = mulberry32(20260724);
  const rows: IssuanceRecord[] = [];

  MONTHS.forEach((month) => {
    // Primary markets are seasonal: January and September are heavy, August is thin.
    const seasonal = month.month === 1 || month.month === 9 ? 1.4 : month.month === 8 ? 0.45 : 1;
    // The current month is only part-run, so scale supply by how much of it has passed.
    const complete = month.days.length / 21;
    const dealCount = Math.max(3, Math.round((11 + random() * 6) * seasonal * Math.min(1, complete)));

    for (let dealIndex = 0; dealIndex < dealCount; dealIndex += 1) {
      const seed = pick(ISSUERS, ISSUER_WEIGHTS, random);
      const size = SIZES[Math.floor(random() * SIZES.length)];
      const spread = 48 + Math.round(random() * 118);
      const nip = 1 + Math.round(random() * 11);
      const cover = Number((1.6 + random() * 3.4).toFixed(1));
      const day = pick(
        month.days,
        month.days.map((value) => {
          const weekday = new Date(Date.UTC(month.year, month.month - 1, value)).getUTCDay();
          return WEEKDAY_WEIGHTS[weekday];
        }),
        random,
      );

      rows.push({
        id: `issue-${month.key}-${dealIndex + 1}`,
        pricingDate: `${month.key}-${pad(day)}`,
        monthKey: month.key,
        issuer: seed.issuer,
        ticker: seed.ticker,
        region: seed.region,
        sector: seed.sector,
        rating: seed.rating,
        currency: seed.currency,
        size,
        eurEquivalent: Math.round(size * EUR_RATES[seed.currency]),
        tenor: TENORS[Math.floor(random() * TENORS.length)],
        coupon: Number((2.125 + Math.round(random() * 14) * 0.125).toFixed(3)),
        spread,
        nip,
        book: Math.round(size * cover),
        cover,
        leads: seed.leads,
        status: 'Priced',
      });
    }
  });

  rows.sort((a, b) => b.pricingDate.localeCompare(a.pricingDate));

  // Deals inside the last fortnight are still being executed or watched.
  const latest = `${LATEST.year}-${pad(LATEST.month)}-${pad(LATEST.day)}`;
  const live = shiftDays(latest, -4);
  const monitoring = shiftDays(latest, -12);
  rows.forEach((row) => {
    if (row.pricingDate >= live) row.status = 'Live';
    else if (row.pricingDate >= monitoring) row.status = 'Monitoring';
  });

  return rows;
}

export const SHADCN_ISSUANCE_ROWS: IssuanceRecord[] = buildRows();

export const ISSUANCE_START = SHADCN_ISSUANCE_ROWS[SHADCN_ISSUANCE_ROWS.length - 1].pricingDate;
export const ISSUANCE_END = SHADCN_ISSUANCE_ROWS[0].pricingDate;

const distinct = (values: string[]) => [...new Set(values)].sort();

export const ISSUANCE_CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
export const ISSUANCE_REGIONS: IssuanceRegion[] = [WE, NA, DM, EM, CE];
export const ISSUANCE_STATUSES: IssuanceStatus[] = ['Live', 'Monitoring', 'Priced'];
export const ISSUANCE_SECTORS = distinct(SHADCN_ISSUANCE_ROWS.map((row) => row.sector));
export const ISSUANCE_RATINGS = distinct(SHADCN_ISSUANCE_ROWS.map((row) => row.rating));
export const ISSUANCE_ISSUERS = distinct(SHADCN_ISSUANCE_ROWS.map((row) => row.issuer));
export const ISSUANCE_TICKERS = distinct(SHADCN_ISSUANCE_ROWS.map((row) => row.ticker));

/* ------------------------------------------------------------------ *
 * Date helpers. Dates are handled as ISO strings in UTC throughout so
 * bucket keys never drift across time zones.
 * ------------------------------------------------------------------ */

export function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function shiftDays(iso: string, days: number) {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function shiftMonths(iso: string, months: number) {
  const date = toDate(iso);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return toIso(date);
}

export function daysBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000) + 1;
}

/** Monday of the week containing the date. */
function startOfWeek(iso: string) {
  const date = toDate(iso);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return toIso(date);
}

export function bucketKeyOf(iso: string, granularity: Granularity) {
  if (granularity === 'daily') return iso;
  if (granularity === 'weekly') return startOfWeek(iso);
  if (granularity === 'monthly') return iso.slice(0, 7);
  const month = Number(iso.slice(5, 7));
  return `${iso.slice(0, 4)}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Every bucket in the window, including empty ones, oldest first. */
export function bucketKeysBetween(from: string, to: string, granularity: Granularity) {
  const keys: string[] = [];
  if (granularity === 'daily') {
    for (let cursor = from; cursor <= to; cursor = shiftDays(cursor, 1)) {
      const weekday = toDate(cursor).getUTCDay();
      if (weekday !== 0 && weekday !== 6) keys.push(cursor);
    }
    return keys;
  }
  if (granularity === 'weekly') {
    for (let cursor = startOfWeek(from); cursor <= to; cursor = shiftDays(cursor, 7)) {
      keys.push(cursor);
    }
    return keys;
  }
  if (granularity === 'monthly') {
    for (let cursor = `${from.slice(0, 7)}-01`; cursor.slice(0, 7) <= to.slice(0, 7); cursor = shiftMonths(cursor, 1)) {
      keys.push(cursor.slice(0, 7));
    }
    return keys;
  }
  const startQuarter = Math.floor((Number(from.slice(5, 7)) - 1) / 3);
  let year = Number(from.slice(0, 4));
  let quarter = startQuarter;
  const endKey = bucketKeyOf(to, 'quarterly');
  for (;;) {
    const key = `${year}-Q${quarter + 1}`;
    keys.push(key);
    if (key >= endKey) break;
    quarter += 1;
    if (quarter > 3) {
      quarter = 0;
      year += 1;
    }
  }
  return keys;
}

export function bucketLabel(key: string, granularity: Granularity, multiYear: boolean) {
  if (granularity === 'quarterly') {
    return multiYear ? `${key.slice(5)} ${key.slice(2, 4)}` : key.slice(5);
  }
  if (granularity === 'monthly') {
    const month = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
    return multiYear ? `${month} ${key.slice(2, 4)}` : month;
  }
  const day = Number(key.slice(8, 10));
  const month = MONTH_NAMES[Number(key.slice(5, 7)) - 1];
  return `${day} ${month}`;
}

export function bucketLabelLong(key: string, granularity: Granularity) {
  if (granularity === 'quarterly') return `${key.slice(5)} ${key.slice(0, 4)}`;
  if (granularity === 'monthly') {
    return `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
  }
  const label = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(key));
  return granularity === 'weekly' ? `Week of ${label}` : label;
}

/* ------------------------------------------------------------------ *
 * Aggregation
 * ------------------------------------------------------------------ */

export const DIMENSION_LABELS: Record<Dimension, string> = {
  sector: 'Sector',
  region: 'Region',
  currency: 'Currency',
};

export function dimensionValue(row: IssuanceRecord, dimension: Dimension) {
  return row[dimension];
}

/**
 * Ranks categories by volume and folds everything past the ramp into "Other",
 * so a stack never grows more bands than the palette can distinguish.
 */
export function rankCategories(rows: IssuanceRecord[], dimension: Dimension): CategorySlice[] {
  const totals = new Map<string, { volume: number; deals: number }>();
  rows.forEach((row) => {
    const key = dimensionValue(row, dimension);
    const current = totals.get(key) ?? { volume: 0, deals: 0 };
    current.volume += row.eurEquivalent / 1000;
    current.deals += 1;
    totals.set(key, current);
  });

  const sorted = [...totals.entries()]
    .map(([category, value]) => ({
      category,
      volume: Number(value.volume.toFixed(1)),
      deals: value.deals,
    }))
    .sort((a, b) => b.volume - a.volume);

  const leading = sorted.slice(0, CATEGORY_RAMP.length).map((item, index) => ({
    ...item,
    fill: CATEGORY_RAMP[index],
  }));
  const remaining = sorted.slice(CATEGORY_RAMP.length);
  if (remaining.length === 0) return leading;

  return [
    ...leading,
    {
      category: OTHER_CATEGORY,
      volume: Number(remaining.reduce((sum, item) => sum + item.volume, 0).toFixed(1)),
      deals: remaining.reduce((sum, item) => sum + item.deals, 0),
      fill: OTHER_COLOR,
    },
  ];
}

/** Values folded into the "Other" slice, so clicking it can filter on them. */
export function otherMembers(slices: CategorySlice[], universe: string[]) {
  if (!slices.some((slice) => slice.category === OTHER_CATEGORY)) return [];
  const leading = new Set(slices.map((slice) => slice.category));
  return universe.filter((value) => !leading.has(value));
}

export function categoryUniverse(dimension: Dimension): string[] {
  if (dimension === 'sector') return ISSUANCE_SECTORS;
  if (dimension === 'region') return [...ISSUANCE_REGIONS];
  return [...ISSUANCE_CURRENCIES];
}

/**
 * Buckets rows onto the time axis. When a stack dimension is supplied each
 * point also carries one numeric field per category, which is what Recharts
 * needs for a stacked series.
 */
export function buildSeries(
  rows: IssuanceRecord[],
  from: string,
  to: string,
  granularity: Granularity,
  categories: CategorySlice[] | null,
  otherValues: string[],
  dimension: Dimension | null,
): SeriesPoint[] {
  const keys = bucketKeysBetween(from, to, granularity);
  const multiYear = from.slice(0, 4) !== to.slice(0, 4);
  const otherSet = new Set(otherValues);

  const points = new Map<string, SeriesPoint>(
    keys.map((key) => {
      const point: SeriesPoint = {
        key,
        label: bucketLabel(key, granularity, multiYear),
        labelLong: bucketLabelLong(key, granularity),
        total: 0,
        deals: 0,
      };
      categories?.forEach((category) => {
        point[category.category] = 0;
      });
      return [key, point];
    }),
  );

  rows.forEach((row) => {
    const point = points.get(bucketKeyOf(row.pricingDate, granularity));
    if (!point) return;
    const volume = row.eurEquivalent / 1000;
    point.total = (point.total as number) + volume;
    point.deals = (point.deals as number) + 1;
    if (!categories || !dimension) return;
    const raw = dimensionValue(row, dimension);
    const category = otherSet.has(raw) ? OTHER_CATEGORY : raw;
    if (typeof point[category] === 'number') {
      point[category] = (point[category] as number) + volume;
    }
  });

  return [...points.values()].map((point) => {
    const rounded: SeriesPoint = { ...point, total: Number((point.total as number).toFixed(2)) };
    categories?.forEach((category) => {
      rounded[category.category] = Number((point[category.category] as number).toFixed(2));
    });
    return rounded;
  });
}
