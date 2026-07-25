/**
 * The relational mock behind every block. One dataset, five entities, so a
 * subject carried from one block to another resolves to the same numbers.
 *
 * Scope note: this models issuance, allocations and market backdrop only.
 * There is deliberately no bond-level secondary series, because the real feeds
 * behind this product don't carry one and a block that implies otherwise would
 * be lying about where its numbers came from.
 */

export type Currency = 'EUR' | 'USD' | 'GBP';

/** Broad rating buckets. Comps and benchmarks group on these, not on notches. */
export type RatingBand = 'AA' | 'A' | 'BBB';

export type Sector =
  | 'Automobiles'
  | 'Consumer'
  | 'Energy'
  | 'Financials'
  | 'Healthcare'
  | 'Industrials'
  | 'Technology'
  | 'Telecoms'
  | 'Utilities';

export type DealStatus = 'priced' | 'launched' | 'guidance' | 'announced';

export type AccountType =
  | 'Asset manager'
  | 'Insurance'
  | 'Pension fund'
  | 'Bank treasury'
  | 'Hedge fund'
  | 'Official institution'
  | 'Private bank';

export type Region = 'UK' | 'France' | 'Germany' | 'Benelux' | 'Nordics' | 'Southern Europe' | 'Switzerland' | 'US' | 'Asia';

export interface Issuer {
  id: string;
  name: string;
  ticker: string;
  sector: Sector;
  ratingBand: RatingBand;
  /** Display form, e.g. "A / A2". */
  rating: string;
  country: Region;
  /** Persistent issuer-specific spread bias in bp; the market's view of the name. */
  bias: number;
}

export interface Deal {
  id: string;
  issuerId: string;
  /** ISO date. */
  pricingDate: string;
  monthKey: string;
  currency: Currency;
  status: DealStatus;
  leads: string[];
  /** Index level on the pricing date, so a deal can be judged against its day. */
  indexLevel: number;
}

export interface Tranche {
  id: string;
  dealId: string;
  /** Position within the deal, e.g. "A" / "B" / "C". */
  key: string;
  tenorYears: number;
  tenorLabel: string;
  maturity: string;
  sizeMm: number;
  /** EUR-equivalent size, for anything that aggregates across currencies. */
  sizeEurMm: number;
  coupon: number;
  iptSpread: number;
  guidanceSpread: number;
  reofferSpread: number;
  /** IPT to reoffer, the number a syndicate desk is judged on. */
  compressionBp: number;
  nipBp: number;
  /** Final book, in millions of the tranche currency. */
  bookMm: number;
  coverage: number;
  format: 'Senior' | 'Senior non-preferred' | 'Subordinated' | 'Green' | 'Sustainability-linked';
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  region: Region;
  /** 1 = top-tier anchor account. Drives allocation quality scoring. */
  tier: 1 | 2 | 3;
  /** Long-term propensity to hold rather than flip; used for quality reads. */
  stickiness: number;
}

/**
 * Order-level, not just final allots. This is what makes hit rate, scaling and
 * account reliability honest rather than invented.
 */
export interface Allocation {
  trancheId: string;
  accountId: string;
  orderMm: number;
  allottedMm: number;
}

export interface MarketPoint {
  date: string;
  monthKey: string;
  /** 5y and 10y Bund yields, in percent. */
  bund5y: number;
  bund10y: number;
  /** iBoxx EUR corporates asset-swap spread, in bp. The credit backdrop. */
  iboxxCorp: number;
  /** iTraxx Main, in bp. */
  itraxxMain: number;
  /** Rates volatility index. High vol closes the issuance window. */
  ratesVol: number;
}

export interface Dataset {
  issuers: Issuer[];
  deals: Deal[];
  tranches: Tranche[];
  accounts: Account[];
  allocations: Allocation[];
  market: MarketPoint[];
}

/** A tranche joined to its deal and issuer: the row shape most blocks want. */
export interface TrancheRow extends Tranche {
  issuer: Issuer;
  deal: Deal;
  /** True when the deal has more than one tranche. */
  multiTranche: boolean;
}
