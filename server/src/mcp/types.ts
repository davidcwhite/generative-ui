// Shared types for DCM Bond Issuance MCP servers

// === Entity Resolution ===
export interface Issuer {
  id: string;
  lei: string;
  name: string;
  shortName: string;
  aliases: string[];
  sector: string;
  country: string;
  ratings: { agency: string; rating: string }[];
}

export interface EntityMatch {
  entity: Issuer;
  score: number;
  matchType: 'exact' | 'alias' | 'fuzzy';
}

export interface ResolveEntityResult {
  matches: Issuer[];
  confidence: 'exact' | 'fuzzy' | 'ambiguous';
  query: string;
}

// === Issuance ===
export interface Deal {
  id: string;
  issuerId: string;
  issuerName: string;
  isin: string;
  announceDate: string;
  pricingDate: string;
  settleDate: string;
  currency: string;
  size: number;
  tenor: string;
  coupon: number;
  reoffer: number;
  spread: number;
  nip: number;
  format: 'RegS' | '144A' | 'RegS/144A';
  seniority: 'Senior' | 'Subordinated' | 'Secured';
  leads: string[];
  coLeads: string[];
  oversubscription: number;
}

export interface DealSummary {
  totalDeals: number;
  totalRaised: number;
  avgTenor: string;
  avgNip: number;
  avgOversubscription: number;
}

export interface MarketSummary {
  totalDeals: number;
  totalVolume: number;
  avgSpread: number;
  avgNip: number;
  bySector: { sector: string; count: number; volume: number }[];
  byCurrency: { currency: string; count: number; volume: number }[];
}

export interface PeerComparison {
  issuer: {
    deals: Deal[];
    summary: DealSummary;
  };
  peers: {
    issuerId: string;
    issuerName: string;
    deals: Deal[];
    summary: DealSummary;
  }[];
  comparison: {
    nipVsPeers: string;
    sizeVsPeers: string;
    frequencyVsPeers: string;
  };
}

// === Bookbuilding ===
export interface Allocation {
  dealId: string;
  investorId: string;
  investorName: string;
  investorType: 'Asset Manager' | 'Insurance' | 'Bank' | 'Hedge Fund' | 'Pension' | 'Central Bank';
  geography: string;
  orderSize: number;
  allocatedSize: number;
  fillRate: number;
}

export interface AllocationBreakdown {
  byType: { type: string; amount: number; percentage: number }[];
  byGeography: { geography: string; amount: number; percentage: number }[];
}

export interface OrderEvent {
  timestamp: string;
  cumulativeOrders: number;
  cumulativeSize: number;
  eventType: 'order' | 'revision' | 'guidance';
  description?: string;
}

// === Secondary ===
export interface SecondaryPerformance {
  isin: string;
  date: string;
  price: number;
  spread: number;
  yieldToMaturity: number;
  volumeTraded: number;
  daysFromPricing: number;
}

export interface CurvePoint {
  tenor: string;
  spread: number;
  yield: number;
}

// === Investor ===
export interface Investor {
  id: string;
  name: string;
  type: 'Asset Manager' | 'Insurance' | 'Bank' | 'Hedge Fund' | 'Pension' | 'Central Bank';
  geography: string;
  aum: number;
  focusSectors: string[];
}

export interface Participation {
  dealId: string;
  dealName: string;
  issuerName: string;
  date: string;
  orderSize: number;
  allocatedSize: number;
  fillRate: number;
  heldDays: number;
  soldPercentage: number;
  behaviour: 'hold' | 'partial_flip' | 'flip';
}

// === Export ===
export interface MandateBriefSection {
  title: string;
  content: string;
  dataPoints?: Record<string, string | number>[];
}

export interface Provenance {
  sources: string[];
  timestamp: string;
  userId?: string;
  queryContext: string;
}

export interface MandateBrief {
  issuerId: string;
  issuerName: string;
  generatedAt: string;
  sections: MandateBriefSection[];
  provenance: Provenance;
}
