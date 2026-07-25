export type IssuanceStatus = 'Priced' | 'Live' | 'Monitoring';
export type IssuanceCurrency = 'EUR' | 'USD' | 'GBP';

export interface IssuanceRecord {
  id: string;
  pricingDate: string;
  monthKey: string;
  monthLabel: string;
  monthLabelLong: string;
  issuer: string;
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

export interface MonthlyIssuance {
  monthKey: string;
  month: string;
  volume: number;
  deals: number;
}

export interface SectorIssuance {
  sector: string;
  volume: number;
  deals: number;
  fill: string;
}

interface IssuerSeed {
  issuer: string;
  sector: string;
  rating: string;
  currency: IssuanceCurrency;
  leads: string;
}

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

/** Three years of history ending with the current pricing month. */
const HISTORY_MONTHS = 36;
const LATEST_YEAR = 2026;
const LATEST_MONTH = 7;

interface MonthSeed {
  key: string;
  label: string;
  labelLong: string;
  year: number;
  month: number;
}

const MONTHS: MonthSeed[] = Array.from({ length: HISTORY_MONTHS }, (_, index) => {
  const offset = HISTORY_MONTHS - 1 - index;
  const absolute = LATEST_YEAR * 12 + (LATEST_MONTH - 1) - offset;
  const year = Math.floor(absolute / 12);
  const month = (absolute % 12) + 1;
  const label = MONTH_NAMES[month - 1];
  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    label,
    labelLong: `${label} ${String(year).slice(2)}`,
    year,
    month,
  };
});

const ISSUERS: IssuerSeed[] = [
  { issuer: 'BMW AG', sector: 'Automobiles', rating: 'A / A2', currency: 'EUR', leads: 'DB, BNP, HSBC' },
  { issuer: 'Siemens AG', sector: 'Industrials', rating: 'A+ / A1', currency: 'EUR', leads: 'BNP, GS, ING' },
  { issuer: 'Allianz SE', sector: 'Financials', rating: 'A- / A2', currency: 'EUR', leads: 'JPM, Citi, UBS' },
  { issuer: 'Enel SpA', sector: 'Utilities', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'CA, IMI, MS' },
  { issuer: 'TotalEnergies', sector: 'Energy', rating: 'A+ / Aa3', currency: 'EUR', leads: 'BNP, Citi, JPM' },
  { issuer: 'Orange SA', sector: 'Telecoms', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'BNP, CA, Natixis' },
  { issuer: 'SAP SE', sector: 'Technology', rating: 'A+ / A2', currency: 'EUR', leads: 'DB, GS, JPM' },
  { issuer: 'Nestlé SA', sector: 'Consumer', rating: 'AA- / Aa2', currency: 'EUR', leads: 'BNP, Citi, UBS' },
  { issuer: 'AstraZeneca', sector: 'Healthcare', rating: 'A / A2', currency: 'USD', leads: 'BofA, Citi, JPM' },
  { issuer: 'Unilever plc', sector: 'Consumer', rating: 'A+ / A1', currency: 'GBP', leads: 'Barclays, HSBC, NatWest' },
  { issuer: 'Volkswagen AG', sector: 'Automobiles', rating: 'BBB+ / A3', currency: 'EUR', leads: 'Barclays, DB, SG' },
  { issuer: 'Iberdrola', sector: 'Utilities', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'BBVA, HSBC, Santander' },
  { issuer: 'Shell plc', sector: 'Energy', rating: 'A+ / Aa2', currency: 'USD', leads: 'Barclays, JPM, UBS' },
  { issuer: 'LVMH', sector: 'Consumer', rating: 'A+ / A1', currency: 'EUR', leads: 'CA, HSBC, SG' },
  { issuer: 'Deutsche Telekom', sector: 'Telecoms', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'DB, HSBC, UniCredit' },
  { issuer: 'Roche Holding', sector: 'Healthcare', rating: 'AA / Aa2', currency: 'GBP', leads: 'BNP, GS, UBS' },
  { issuer: 'Mercedes-Benz', sector: 'Automobiles', rating: 'A / A2', currency: 'EUR', leads: 'BNP, DB, MS' },
  { issuer: 'Airbus SE', sector: 'Industrials', rating: 'A / A2', currency: 'EUR', leads: 'BNP, Citi, SG' },
  { issuer: 'BNP Paribas', sector: 'Financials', rating: 'A+ / Aa3', currency: 'EUR', leads: 'BNP, GS, JPM' },
  { issuer: 'Santander', sector: 'Financials', rating: 'A / A2', currency: 'EUR', leads: 'Barclays, Santander, UBS' },
  { issuer: 'RWE AG', sector: 'Utilities', rating: 'BBB+ / Baa2', currency: 'EUR', leads: 'DB, ING, UniCredit' },
  { issuer: 'Vodafone Group', sector: 'Telecoms', rating: 'BBB / Baa2', currency: 'GBP', leads: 'Barclays, HSBC, NatWest' },
  { issuer: 'Diageo plc', sector: 'Consumer', rating: 'A- / A3', currency: 'GBP', leads: 'Barclays, BofA, HSBC' },
  { issuer: 'Sanofi SA', sector: 'Healthcare', rating: 'AA / Aa3', currency: 'EUR', leads: 'BNP, CA, JPM' },
  { issuer: 'ASML Holding', sector: 'Technology', rating: 'A / A2', currency: 'EUR', leads: 'ABN, GS, ING' },
  { issuer: 'Repsol SA', sector: 'Energy', rating: 'BBB / Baa2', currency: 'EUR', leads: 'BBVA, CA, Santander' },
  { issuer: 'Schneider Electric', sector: 'Industrials', rating: 'A- / A3', currency: 'EUR', leads: 'BNP, CA, SG' },
  { issuer: 'Infineon', sector: 'Technology', rating: 'BBB+ / Baa1', currency: 'EUR', leads: 'DB, HSBC, UniCredit' },
];

const SIZES = [300, 500, 600, 750, 1000, 1250, 1500, 1750, 2000, 2500] as const;
const TENORS = ['3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '10Y', '12Y', '15Y', '20Y'] as const;
const EUR_RATES: Record<IssuanceCurrency, number> = { EUR: 1, USD: 0.91, GBP: 1.17 };

/** Assigned by volume rank so the ramp always reads largest to smallest. */
const SECTOR_RAMP = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;
const OTHER_COLOR = '#e7e5e4';

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

function buildRows(): IssuanceRecord[] {
  const random = mulberry32(20260724);
  const rows: IssuanceRecord[] = [];

  MONTHS.forEach((month) => {
    // Primary markets are seasonal: January and September are heavy, August is thin.
    const seasonal = month.month === 1 || month.month === 9 ? 1.4 : month.month === 8 ? 0.45 : 1;
    const dealCount = Math.max(4, Math.round((10 + random() * 6) * seasonal));

    for (let dealIndex = 0; dealIndex < dealCount; dealIndex += 1) {
      const seed = ISSUERS[Math.floor(random() * ISSUERS.length)];
      const size = SIZES[Math.floor(random() * SIZES.length)];
      const spread = 48 + Math.round(random() * 118);
      const nip = 1 + Math.round(random() * 11);
      const cover = Number((1.6 + random() * 3.4).toFixed(1));
      const day = 1 + Math.floor(random() * 27);

      rows.push({
        id: `issue-${month.key}-${dealIndex + 1}`,
        pricingDate: `${month.key}-${String(day).padStart(2, '0')}`,
        monthKey: month.key,
        monthLabel: month.label,
        monthLabelLong: month.labelLong,
        issuer: seed.issuer,
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

  // The newest deals are still in execution, so they lead the default sort.
  if (rows[0]) rows[0].status = 'Live';
  if (rows[1]) rows[1].status = 'Monitoring';
  if (rows[2]) rows[2].status = 'Monitoring';

  return rows;
}

export const SHADCN_ISSUANCE_ROWS: IssuanceRecord[] = buildRows();

export const ISSUANCE_MONTHS: string[] = MONTHS.map((month) => month.key);
export const ISSUANCE_CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
export const ISSUANCE_SECTORS = [...new Set(SHADCN_ISSUANCE_ROWS.map((row) => row.sector))].sort();
export const ISSUANCE_RATINGS = [...new Set(SHADCN_ISSUANCE_ROWS.map((row) => row.rating))].sort();

export function aggregateMonthlyIssuance(
  rows: IssuanceRecord[],
  monthKeys: string[],
): MonthlyIssuance[] {
  const useLongLabels = monthKeys.length > 12;
  const byMonth = new Map<string, MonthlyIssuance>(
    monthKeys.map((key) => {
      const month = MONTHS.find((item) => item.key === key);
      return [
        key,
        {
          monthKey: key,
          month: (useLongLabels ? month?.labelLong : month?.label) ?? key,
          volume: 0,
          deals: 0,
        },
      ];
    }),
  );

  rows.forEach((row) => {
    const point = byMonth.get(row.monthKey);
    if (!point) return;
    point.volume += row.eurEquivalent / 1000;
    point.deals += 1;
  });

  return [...byMonth.values()].map((point) => ({
    ...point,
    volume: Number(point.volume.toFixed(1)),
  }));
}

export function aggregateSectorIssuance(rows: IssuanceRecord[]): SectorIssuance[] {
  const totals = new Map<string, { volume: number; deals: number }>();
  rows.forEach((row) => {
    const current = totals.get(row.sector) ?? { volume: 0, deals: 0 };
    current.volume += row.eurEquivalent / 1000;
    current.deals += 1;
    totals.set(row.sector, current);
  });

  const sorted = [...totals.entries()]
    .map(([sector, value]) => ({
      sector,
      volume: Number(value.volume.toFixed(1)),
      deals: value.deals,
    }))
    .sort((a, b) => b.volume - a.volume);

  const leading = sorted.slice(0, SECTOR_RAMP.length).map((item, index) => ({
    ...item,
    fill: SECTOR_RAMP[index],
  }));
  const remaining = sorted.slice(SECTOR_RAMP.length);
  if (remaining.length === 0) return leading;

  return [
    ...leading,
    {
      sector: 'Other',
      volume: Number(remaining.reduce((sum, item) => sum + item.volume, 0).toFixed(1)),
      deals: remaining.reduce((sum, item) => sum + item.deals, 0),
      fill: OTHER_COLOR,
    },
  ];
}

/** Sectors folded into the "Other" slice for the supplied rows. */
export function otherSectorMembers(rows: IssuanceRecord[]): string[] {
  const leading = new Set(
    aggregateSectorIssuance(rows)
      .filter((item) => item.sector !== 'Other')
      .map((item) => item.sector),
  );
  return ISSUANCE_SECTORS.filter((sector) => !leading.has(sector));
}
