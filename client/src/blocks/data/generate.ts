import type {
  Account,
  AccountType,
  Allocation,
  Currency,
  Dataset,
  Deal,
  Issuer,
  MarketPoint,
  RatingBand,
  Region,
  Sector,
  Tranche,
} from './model';

/**
 * Deterministic generator for the whole relational mock.
 *
 * The important part is not that it produces data, but that it produces data
 * with *structure*: spreads are a function of rating, tenor, sector, issuer and
 * the market level on the day, so the peer distribution behind a benchmark
 * ("88bp vs a 94bp median for A 7y") is a real distribution rather than noise.
 * Uniform random spreads would make every benchmark in the product meaningless.
 */

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260725);

/** Box-Muller, so sizes and orders cluster instead of spreading flat. */
function gaussian(mean: number, sd: number) {
  const u = Math.max(rng(), 1e-9);
  const v = Math.max(rng(), 1e-9);
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// ---------------------------------------------------------------- issuers

interface IssuerSeed {
  name: string;
  ticker: string;
  sector: Sector;
  rating: string;
  band: RatingBand;
  country: Region;
}

const ISSUER_SEEDS: IssuerSeed[] = [
  { name: 'BMW Finance NV', ticker: 'BMW', sector: 'Automobiles', rating: 'A / A2', band: 'A', country: 'Germany' },
  { name: 'Mercedes-Benz Group', ticker: 'MBG', sector: 'Automobiles', rating: 'A / A2', band: 'A', country: 'Germany' },
  { name: 'Volkswagen AG', ticker: 'VW', sector: 'Automobiles', rating: 'BBB+ / A3', band: 'BBB', country: 'Germany' },
  { name: 'Stellantis NV', ticker: 'STLA', sector: 'Automobiles', rating: 'BBB / Baa2', band: 'BBB', country: 'France' },
  { name: 'Nestlé SA', ticker: 'NESN', sector: 'Consumer', rating: 'AA- / Aa2', band: 'AA', country: 'Switzerland' },
  { name: 'LVMH', ticker: 'MC', sector: 'Consumer', rating: 'A+ / A1', band: 'A', country: 'France' },
  { name: 'Unilever plc', ticker: 'ULVR', sector: 'Consumer', rating: 'A+ / A1', band: 'A', country: 'UK' },
  { name: 'Diageo plc', ticker: 'DGE', sector: 'Consumer', rating: 'A- / A3', band: 'A', country: 'UK' },
  { name: 'TotalEnergies', ticker: 'TTE', sector: 'Energy', rating: 'A+ / Aa3', band: 'AA', country: 'France' },
  { name: 'Shell plc', ticker: 'SHEL', sector: 'Energy', rating: 'A+ / Aa2', band: 'AA', country: 'UK' },
  { name: 'Repsol SA', ticker: 'REP', sector: 'Energy', rating: 'BBB / Baa2', band: 'BBB', country: 'Southern Europe' },
  { name: 'BNP Paribas', ticker: 'BNP', sector: 'Financials', rating: 'A+ / Aa3', band: 'AA', country: 'France' },
  { name: 'Allianz SE', ticker: 'ALV', sector: 'Financials', rating: 'A- / A2', band: 'A', country: 'Germany' },
  { name: 'Santander', ticker: 'SAN', sector: 'Financials', rating: 'A / A2', band: 'A', country: 'Southern Europe' },
  { name: 'ING Groep', ticker: 'INGA', sector: 'Financials', rating: 'A- / Baa1', band: 'BBB', country: 'Benelux' },
  { name: 'Sanofi SA', ticker: 'SAN FP', sector: 'Healthcare', rating: 'AA / Aa3', band: 'AA', country: 'France' },
  { name: 'Roche Holding', ticker: 'ROG', sector: 'Healthcare', rating: 'AA / Aa2', band: 'AA', country: 'Switzerland' },
  { name: 'AstraZeneca', ticker: 'AZN', sector: 'Healthcare', rating: 'A / A2', band: 'A', country: 'UK' },
  { name: 'Siemens AG', ticker: 'SIE', sector: 'Industrials', rating: 'A+ / A1', band: 'A', country: 'Germany' },
  { name: 'Airbus SE', ticker: 'AIR', sector: 'Industrials', rating: 'A / A2', band: 'A', country: 'France' },
  { name: 'Schneider Electric', ticker: 'SU', sector: 'Industrials', rating: 'A- / A3', band: 'A', country: 'France' },
  { name: 'SAP SE', ticker: 'SAP', sector: 'Technology', rating: 'A+ / A2', band: 'A', country: 'Germany' },
  { name: 'ASML Holding', ticker: 'ASML', sector: 'Technology', rating: 'A / A2', band: 'A', country: 'Benelux' },
  { name: 'Infineon', ticker: 'IFX', sector: 'Technology', rating: 'BBB+ / Baa1', band: 'BBB', country: 'Germany' },
  { name: 'Deutsche Telekom', ticker: 'DTE', sector: 'Telecoms', rating: 'BBB+ / Baa1', band: 'BBB', country: 'Germany' },
  { name: 'Orange SA', ticker: 'ORA', sector: 'Telecoms', rating: 'BBB+ / Baa1', band: 'BBB', country: 'France' },
  { name: 'Vodafone Group', ticker: 'VOD', sector: 'Telecoms', rating: 'BBB / Baa2', band: 'BBB', country: 'UK' },
  { name: 'Iberdrola', ticker: 'IBE', sector: 'Utilities', rating: 'BBB+ / Baa1', band: 'BBB', country: 'Southern Europe' },
  { name: 'Enel SpA', ticker: 'ENEL', sector: 'Utilities', rating: 'BBB+ / Baa1', band: 'BBB', country: 'Southern Europe' },
  { name: 'RWE AG', ticker: 'RWE', sector: 'Utilities', rating: 'BBB+ / Baa2', band: 'BBB', country: 'Germany' },
  { name: 'E.ON SE', ticker: 'EOAN', sector: 'Utilities', rating: 'BBB / Baa2', band: 'BBB', country: 'Germany' },
  { name: 'Engie SA', ticker: 'ENGI', sector: 'Utilities', rating: 'BBB+ / Baa1', band: 'BBB', country: 'France' },
];

const LEAD_BANKS = [
  'BNP', 'DB', 'HSBC', 'JPM', 'Citi', 'GS', 'MS', 'BofA', 'Barclays', 'SG',
  'CA-CIB', 'UniCredit', 'ING', 'Santander', 'BBVA', 'NatWest', 'UBS', 'Natixis',
];

const issuers: Issuer[] = ISSUER_SEEDS.map((seed, index) => ({
  id: `iss-${index + 1}`,
  name: seed.name,
  ticker: seed.ticker,
  sector: seed.sector,
  ratingBand: seed.band,
  rating: seed.rating,
  country: seed.country,
  // Persistent: the market's standing view of the name, not per-deal noise.
  bias: Number(gaussian(0, 6).toFixed(1)),
}));

// ---------------------------------------------------------------- market

const HISTORY_MONTHS = 36;
const LATEST_YEAR = 2026;
const LATEST_MONTH = 7;
const LATEST_DAY = 24;

/** Business days back from the latest pricing date, oldest first. */
function buildCalendar(): Date[] {
  const days: Date[] = [];
  const cursor = new Date(Date.UTC(LATEST_YEAR, LATEST_MONTH - 1, LATEST_DAY));
  const start = new Date(cursor);
  start.setUTCMonth(start.getUTCMonth() - HISTORY_MONTHS);

  while (cursor >= start) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days.unshift(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}

const CALENDAR = buildCalendar();

const iso = (date: Date) => date.toISOString().slice(0, 10);
const monthKeyOf = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/** Mean-reverting random walk: credit grinds tighter then gaps wider. */
function buildMarket(): MarketPoint[] {
  let iboxx = 118;
  let itraxx = 68;
  let bund5 = 2.35;
  let bund10 = 2.55;
  let vol = 92;

  return CALENDAR.map((date, index) => {
    // Two risk-off episodes so the window read has something to say.
    const shock =
      index === Math.floor(CALENDAR.length * 0.28) || index === Math.floor(CALENDAR.length * 0.63)
        ? 16
        : 0;

    iboxx = clamp(iboxx + (95 - iboxx) * 0.004 + gaussian(0, 1.5) + shock, 72, 165);
    itraxx = clamp(itraxx + (58 - itraxx) * 0.005 + gaussian(0, 1.1) + shock * 0.5, 42, 105);
    bund5 = clamp(bund5 + (2.2 - bund5) * 0.003 + gaussian(0, 0.025), 1.4, 3.4);
    bund10 = clamp(bund10 + (2.5 - bund10) * 0.003 + gaussian(0, 0.024), 1.7, 3.7);
    vol = clamp(vol + (88 - vol) * 0.01 + gaussian(0, 3) + shock * 1.6, 62, 165);

    return {
      date: iso(date),
      monthKey: monthKeyOf(date),
      bund5y: Number(bund5.toFixed(3)),
      bund10y: Number(bund10.toFixed(3)),
      iboxxCorp: Number(iboxx.toFixed(1)),
      itraxxMain: Number(itraxx.toFixed(1)),
      ratesVol: Number(vol.toFixed(1)),
    };
  });
}

const market = buildMarket();
const marketByDate = new Map(market.map((point) => [point.date, point]));

// ---------------------------------------------------------------- pricing model

/** Credit curves: wider base and a steeper slope as you go down the stack. */
const BAND_BASE: Record<RatingBand, number> = { AA: 38, A: 62, BBB: 104 };
const BAND_SLOPE: Record<RatingBand, number> = { AA: 1.5, A: 2.3, BBB: 3.3 };
/** Beta to the credit index: lower-rated paper moves more than the market. */
const BAND_BETA: Record<RatingBand, number> = { AA: 0.55, A: 0.8, BBB: 1.15 };

const SECTOR_ADJ: Record<Sector, number> = {
  Healthcare: -9,
  Consumer: -4,
  Utilities: -6,
  Technology: -2,
  Industrials: 0,
  Energy: 3,
  Telecoms: 6,
  Automobiles: 9,
  Financials: 14,
};

const INDEX_BASE = 100;

function modelSpread(issuer: Issuer, tenorYears: number, indexLevel: number) {
  const base = BAND_BASE[issuer.ratingBand] + BAND_SLOPE[issuer.ratingBand] * tenorYears;
  const marketMove = (indexLevel - INDEX_BASE) * BAND_BETA[issuer.ratingBand];
  const execution = gaussian(0, 4.5);
  return Math.max(12, base + SECTOR_ADJ[issuer.sector] + issuer.bias + marketMove + execution);
}

// ---------------------------------------------------------------- deals

const TENOR_POOL = [3, 4, 5, 5, 6, 7, 7, 8, 10, 10, 12, 15, 20, 30];
const CURRENCY_POOL: Currency[] = ['EUR', 'EUR', 'EUR', 'EUR', 'EUR', 'EUR', 'EUR', 'USD', 'USD', 'GBP'];
const EUR_RATE: Record<Currency, number> = { EUR: 1, USD: 0.91, GBP: 1.17 };
const SIZE_POOL = [300, 500, 500, 600, 750, 750, 1000, 1000, 1250, 1500, 1750, 2000];

const FORMATS: Tranche['format'][] = [
  'Senior', 'Senior', 'Senior', 'Senior', 'Green', 'Green', 'Sustainability-linked', 'Subordinated',
];

const tenorLabel = (years: number) => `${years}Y`;

function buildDeals(): { deals: Deal[]; tranches: Tranche[] } {
  const deals: Deal[] = [];
  const tranches: Tranche[] = [];

  // Group the calendar by month so supply can be made seasonal.
  const byMonth = new Map<string, Date[]>();
  CALENDAR.forEach((date) => {
    const key = monthKeyOf(date);
    const list = byMonth.get(key) ?? [];
    list.push(date);
    byMonth.set(key, list);
  });

  let dealIndex = 0;

  byMonth.forEach((days, monthKey) => {
    const month = Number(monthKey.slice(5));
    // January and September are the heavy supply windows; August is shut.
    const seasonal = month === 1 || month === 9 ? 1.45 : month === 8 ? 0.35 : month === 12 ? 0.6 : 1;
    const dealCount = Math.max(3, Math.round((11 + rng() * 5) * seasonal));

    for (let n = 0; n < dealCount; n += 1) {
      dealIndex += 1;
      const issuer = pick(issuers);
      const date = pick(days);
      const point = marketByDate.get(iso(date)) ?? market[market.length - 1];
      const currency = pick(CURRENCY_POOL);

      const dealId = `deal-${String(dealIndex).padStart(4, '0')}`;
      const leadCount = 3 + Math.floor(rng() * 2);
      const leads = [...new Set(Array.from({ length: leadCount }, () => pick(LEAD_BANKS)))];

      deals.push({
        id: dealId,
        issuerId: issuer.id,
        pricingDate: iso(date),
        monthKey,
        currency,
        status: 'priced',
        leads,
        indexLevel: point.iboxxCorp,
      });

      // Mostly single-tranche, with a minority of 2s and a few 3s.
      const roll = rng();
      const trancheCount = roll > 0.92 ? 3 : roll > 0.72 ? 2 : 1;

      // Distinct, ascending tenors within a deal, as a real benchmark would be.
      const tenors = [...new Set(Array.from({ length: trancheCount * 2 }, () => pick(TENOR_POOL)))]
        .sort((a, b) => a - b)
        .slice(0, trancheCount);

      tenors.forEach((tenorYears, position) => {
        const reoffer = Math.round(modelSpread(issuer, tenorYears, point.iboxxCorp));

        // Coverage is better for smaller, higher-quality, tighter-market deals.
        const sizeMm = trancheCount === 1 ? pick(SIZE_POOL) : pick(SIZE_POOL.slice(0, 9));
        const qualityLift = issuer.ratingBand === 'AA' ? 0.5 : issuer.ratingBand === 'A' ? 0.25 : 0;
        const sizeDrag = (sizeMm - 900) / 2400;
        const coverage = Number(
          clamp(gaussian(2.9 + qualityLift - sizeDrag, 0.75), 1.25, 6.4).toFixed(2),
        );

        // A well-covered book buys you more compression and a thinner concession.
        const compression = Math.round(clamp(14 + (coverage - 1.5) * 8 + gaussian(0, 4), 10, 48));
        const nip = Math.round(clamp(9 - (coverage - 1.5) * 2.4 + gaussian(0, 1.8), 0, 16));

        const bund = tenorYears <= 7 ? point.bund5y : point.bund10y;
        const maturity = new Date(date);
        maturity.setUTCFullYear(maturity.getUTCFullYear() + tenorYears);

        tranches.push({
          id: `${dealId}-${String.fromCharCode(65 + position)}`,
          dealId,
          key: String.fromCharCode(65 + position),
          tenorYears,
          tenorLabel: tenorLabel(tenorYears),
          maturity: iso(maturity),
          sizeMm,
          sizeEurMm: Math.round(sizeMm * EUR_RATE[currency]),
          coupon: Number((Math.round((bund + reoffer / 100) * 8) / 8).toFixed(3)),
          iptSpread: reoffer + compression,
          guidanceSpread: reoffer + Math.round(compression * 0.32),
          reofferSpread: reoffer,
          compressionBp: compression,
          nipBp: nip,
          bookMm: Math.round(sizeMm * coverage),
          coverage,
          format: pick(FORMATS),
        });
      });
    }
  });

  deals.sort((a, b) => b.pricingDate.localeCompare(a.pricingDate));

  // The freshest deals are still in execution, which gives the UI live states.
  if (deals[0]) deals[0].status = 'launched';
  if (deals[1]) deals[1].status = 'guidance';
  if (deals[2]) deals[2].status = 'announced';

  return { deals, tranches };
}

const { deals, tranches } = buildDeals();

// ---------------------------------------------------------------- accounts

interface AccountSeed {
  name: string;
  type: AccountType;
  region: Region;
  tier: 1 | 2 | 3;
}

const ACCOUNT_SEEDS: AccountSeed[] = [
  { name: 'Amundi', type: 'Asset manager', region: 'France', tier: 1 },
  { name: 'BlackRock', type: 'Asset manager', region: 'UK', tier: 1 },
  { name: 'PIMCO', type: 'Asset manager', region: 'US', tier: 1 },
  { name: 'DWS', type: 'Asset manager', region: 'Germany', tier: 1 },
  { name: 'Union Investment', type: 'Asset manager', region: 'Germany', tier: 1 },
  { name: 'Deka Investment', type: 'Asset manager', region: 'Germany', tier: 2 },
  { name: 'AXA IM', type: 'Asset manager', region: 'France', tier: 1 },
  { name: 'BNPP AM', type: 'Asset manager', region: 'France', tier: 2 },
  { name: 'Ostrum AM', type: 'Asset manager', region: 'France', tier: 2 },
  { name: 'Candriam', type: 'Asset manager', region: 'Benelux', tier: 2 },
  { name: 'Robeco', type: 'Asset manager', region: 'Benelux', tier: 2 },
  { name: 'NN Investment Partners', type: 'Asset manager', region: 'Benelux', tier: 2 },
  { name: 'Schroders', type: 'Asset manager', region: 'UK', tier: 1 },
  { name: 'M&G Investments', type: 'Asset manager', region: 'UK', tier: 1 },
  { name: 'Insight Investment', type: 'Asset manager', region: 'UK', tier: 2 },
  { name: 'Aviva Investors', type: 'Asset manager', region: 'UK', tier: 2 },
  { name: 'Janus Henderson', type: 'Asset manager', region: 'UK', tier: 3 },
  { name: 'Fidelity International', type: 'Asset manager', region: 'UK', tier: 1 },
  { name: 'Wellington Management', type: 'Asset manager', region: 'US', tier: 1 },
  { name: 'T. Rowe Price', type: 'Asset manager', region: 'US', tier: 2 },
  { name: 'Capital Group', type: 'Asset manager', region: 'US', tier: 1 },
  { name: 'Vanguard', type: 'Asset manager', region: 'US', tier: 2 },
  { name: 'Eurizon', type: 'Asset manager', region: 'Southern Europe', tier: 2 },
  { name: 'Anima SGR', type: 'Asset manager', region: 'Southern Europe', tier: 3 },
  { name: 'Santander AM', type: 'Asset manager', region: 'Southern Europe', tier: 3 },
  { name: 'CaixaBank AM', type: 'Asset manager', region: 'Southern Europe', tier: 3 },
  { name: 'Nordea Asset Management', type: 'Asset manager', region: 'Nordics', tier: 2 },
  { name: 'Swedbank Robur', type: 'Asset manager', region: 'Nordics', tier: 3 },
  { name: 'Muzinich & Co', type: 'Asset manager', region: 'UK', tier: 3 },
  { name: 'Allianz Global Investors', type: 'Insurance', region: 'Germany', tier: 1 },
  { name: 'Generali Insurance AM', type: 'Insurance', region: 'Southern Europe', tier: 1 },
  { name: 'AXA France Vie', type: 'Insurance', region: 'France', tier: 1 },
  { name: 'CNP Assurances', type: 'Insurance', region: 'France', tier: 2 },
  { name: 'Groupama', type: 'Insurance', region: 'France', tier: 3 },
  { name: 'Swiss Re', type: 'Insurance', region: 'Switzerland', tier: 2 },
  { name: 'Zurich Insurance', type: 'Insurance', region: 'Switzerland', tier: 2 },
  { name: 'Legal & General', type: 'Insurance', region: 'UK', tier: 1 },
  { name: 'Phoenix Group', type: 'Insurance', region: 'UK', tier: 3 },
  { name: 'Mapfre', type: 'Insurance', region: 'Southern Europe', tier: 3 },
  { name: 'R+V Versicherung', type: 'Insurance', region: 'Germany', tier: 3 },
  { name: 'APG', type: 'Pension fund', region: 'Benelux', tier: 1 },
  { name: 'PGGM', type: 'Pension fund', region: 'Benelux', tier: 2 },
  { name: 'Norges Bank IM', type: 'Pension fund', region: 'Nordics', tier: 1 },
  { name: 'Alecta', type: 'Pension fund', region: 'Nordics', tier: 2 },
  { name: 'AP Fonden 3', type: 'Pension fund', region: 'Nordics', tier: 3 },
  { name: 'Varma', type: 'Pension fund', region: 'Nordics', tier: 3 },
  { name: 'Ilmarinen', type: 'Pension fund', region: 'Nordics', tier: 3 },
  { name: 'BVK', type: 'Pension fund', region: 'Switzerland', tier: 3 },
  { name: 'USS', type: 'Pension fund', region: 'UK', tier: 2 },
  { name: 'Bayerische Versorgungskammer', type: 'Pension fund', region: 'Germany', tier: 2 },
  { name: 'LBBW Treasury', type: 'Bank treasury', region: 'Germany', tier: 2 },
  { name: 'Helaba Treasury', type: 'Bank treasury', region: 'Germany', tier: 3 },
  { name: 'Rabobank Treasury', type: 'Bank treasury', region: 'Benelux', tier: 2 },
  { name: 'KBC Treasury', type: 'Bank treasury', region: 'Benelux', tier: 3 },
  { name: 'Intesa Treasury', type: 'Bank treasury', region: 'Southern Europe', tier: 3 },
  { name: 'CaixaBank Treasury', type: 'Bank treasury', region: 'Southern Europe', tier: 3 },
  { name: 'Barclays Treasury', type: 'Bank treasury', region: 'UK', tier: 2 },
  { name: 'DZ Bank Treasury', type: 'Bank treasury', region: 'Germany', tier: 3 },
  { name: 'Millennium Capital', type: 'Hedge fund', region: 'UK', tier: 3 },
  { name: 'Capula', type: 'Hedge fund', region: 'UK', tier: 3 },
  { name: 'Algebris', type: 'Hedge fund', region: 'UK', tier: 3 },
  { name: 'BlueBay', type: 'Hedge fund', region: 'UK', tier: 3 },
  { name: 'Cheyne Capital', type: 'Hedge fund', region: 'UK', tier: 3 },
  { name: 'Banque de France', type: 'Official institution', region: 'France', tier: 1 },
  { name: 'Bundesbank', type: 'Official institution', region: 'Germany', tier: 1 },
  { name: 'SNB', type: 'Official institution', region: 'Switzerland', tier: 2 },
  { name: 'MAS', type: 'Official institution', region: 'Asia', tier: 2 },
  { name: 'Bank of Korea', type: 'Official institution', region: 'Asia', tier: 3 },
  { name: 'Pictet Wealth', type: 'Private bank', region: 'Switzerland', tier: 2 },
  { name: 'Julius Baer', type: 'Private bank', region: 'Switzerland', tier: 3 },
  { name: 'Lombard Odier', type: 'Private bank', region: 'Switzerland', tier: 3 },
  { name: 'UBS Wealth', type: 'Private bank', region: 'Switzerland', tier: 2 },
];

/** Anchor accounts hold; fast money flips. Drives allocation quality reads. */
const TYPE_STICKINESS: Record<AccountType, number> = {
  'Pension fund': 0.92,
  Insurance: 0.88,
  'Official institution': 0.9,
  'Asset manager': 0.74,
  'Bank treasury': 0.7,
  'Private bank': 0.6,
  'Hedge fund': 0.28,
};

const accounts: Account[] = ACCOUNT_SEEDS.map((seed, index) => ({
  id: `acc-${index + 1}`,
  name: seed.name,
  type: seed.type,
  region: seed.region,
  tier: seed.tier,
  stickiness: Number(clamp(TYPE_STICKINESS[seed.type] + gaussian(0, 0.06), 0.15, 0.98).toFixed(2)),
}));

// ---------------------------------------------------------------- allocations

/**
 * Allocation data only exists for the trailing window. That mirrors reality —
 * a desk has book detail for its own recent deals, not for three years of the
 * whole market — and keeps the generated dataset to a sane size.
 */
const ALLOCATION_WINDOW_MONTHS = 15;

function allocationCutoff(): string {
  const cutoff = new Date(Date.UTC(LATEST_YEAR, LATEST_MONTH - 1, LATEST_DAY));
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ALLOCATION_WINDOW_MONTHS);
  return iso(cutoff);
}

function buildAllocations(): Allocation[] {
  const cutoff = allocationCutoff();
  const dealById = new Map(deals.map((deal) => [deal.id, deal]));
  const issuerById = new Map(issuers.map((issuer) => [issuer.id, issuer]));
  const rows: Allocation[] = [];

  tranches.forEach((tranche) => {
    const deal = dealById.get(tranche.dealId);
    if (!deal || deal.pricingDate < cutoff) return;
    const issuer = issuerById.get(deal.issuerId);
    if (!issuer) return;

    // Bigger books mean more accounts, not just bigger tickets.
    const targetOrders = clamp(Math.round(tranche.bookMm / 34 + gaussian(0, 8)), 22, 105);

    // Investor mix leans long-only for high grade and fast money for lower.
    const pool = [...accounts].sort(() => rng() - 0.5).slice(0, targetOrders);
    const orders = pool.map((account) => {
      const tierWeight = account.tier === 1 ? 2.1 : account.tier === 2 ? 1.3 : 0.8;
      const orderMm = Math.max(5, Math.round(gaussian(30 * tierWeight, 16 * tierWeight) / 5) * 5);
      return { account, orderMm };
    });

    const totalOrders = orders.reduce((sum, order) => sum + order.orderMm, 0) || 1;

    /**
     * Scaling is the heart of an allocation: tier-1 anchors are protected and
     * fast money is cut hardest, so the fill ratio is deliberately not uniform.
     */
    const weighted = orders.map((order) => {
      const quality =
        (order.account.tier === 1 ? 1.55 : order.account.tier === 2 ? 1.0 : 0.55) *
        (0.55 + order.account.stickiness * 0.75);
      return { ...order, weight: order.orderMm * quality };
    });
    const totalWeight = weighted.reduce((sum, order) => sum + order.weight, 0) || 1;

    // Oversubscribed books drop a tail of accounts entirely; that's the hit rate.
    const dropRate = clamp((tranche.coverage - 1.6) * 0.13, 0, 0.42);

    weighted.forEach((order) => {
      const dropped = order.account.tier === 3 && rng() < dropRate;
      const raw = dropped ? 0 : (order.weight / totalWeight) * tranche.sizeMm;
      const allottedMm = Math.min(order.orderMm, Math.round(raw / 5) * 5);
      rows.push({
        trancheId: tranche.id,
        accountId: order.account.id,
        orderMm: order.orderMm,
        allottedMm,
      });
    });

    // The book total should tie to the tranche size, so reconcile the rounding
    // onto the largest anchor rather than leaving the numbers not adding up.
    const trancheRows = rows.filter((row) => row.trancheId === tranche.id);
    const allotted = trancheRows.reduce((sum, row) => sum + row.allottedMm, 0);
    const drift = tranche.sizeMm - allotted;
    if (drift !== 0 && trancheRows.length) {
      const anchor = trancheRows.reduce((best, row) =>
        row.allottedMm > best.allottedMm ? row : best,
      );
      anchor.allottedMm = Math.max(0, Math.min(anchor.orderMm, anchor.allottedMm + drift));
    }

    // Book size is the sum of what was actually bid, so keep them consistent.
    tranche.bookMm = totalOrders;
    tranche.coverage = Number((totalOrders / tranche.sizeMm).toFixed(2));
  });

  return rows;
}

const allocations = buildAllocations();

export const DATASET: Dataset = { issuers, deals, tranches, accounts, allocations, market };

/** The most recent pricing date in the set; every "as of" hangs off this. */
export const AS_OF = deals[0]?.pricingDate ?? iso(CALENDAR[CALENDAR.length - 1]);
