/**
 * Book-domain mock data: AllocationSummary (who got filled) and
 * PeerAnalysis (issuer vs comparables on the curve + secondary liquidity).
 */

export interface AllocSegment {
  label: string;
  allocatedMm: number;
  pct: number;
  color: string;
}

export interface AllocationBreakdown {
  id: 'investorType' | 'geography' | 'quality';
  label: string;
  segments: AllocSegment[];
}

export interface AllocationSummaryData {
  bondName: string;
  currency: string;
  dealSizeMm: number;
  orderbookMm: number;
  bookCoverage: number;
  accounts: number;
  top10Pct: number;
  realMoneyPct: number;
  avgFillPct: number;
  breakdowns: AllocationBreakdown[];
}

export interface AllocationSample {
  id: string;
  label: string;
  data: AllocationSummaryData;
}

export const allocationSamples: AllocationSample[] = [
  {
    id: 'bmw',
    label: 'BMW 5Y',
    data: {
      bondName: 'BMW 3.375% 2031',
      currency: 'EUR',
      dealSizeMm: 1250,
      orderbookMm: 4100,
      bookCoverage: 3.28,
      accounts: 142,
      top10Pct: 38,
      realMoneyPct: 76,
      avgFillPct: 42,
      breakdowns: [
        {
          id: 'investorType',
          label: 'By Investor Type',
          segments: [
            { label: 'Asset managers', allocatedMm: 688, pct: 55, color: '#3b82f6' },
            { label: 'Banks & PB', allocatedMm: 224, pct: 18, color: '#10b981' },
            { label: 'Insurers & pension', allocatedMm: 188, pct: 15, color: '#8b5cf6' },
            { label: 'Hedge funds', allocatedMm: 100, pct: 8, color: '#f59e0b' },
            { label: 'Central banks & OI', allocatedMm: 50, pct: 4, color: '#9ca3af' },
          ],
        },
        {
          id: 'geography',
          label: 'By Geography',
          segments: [
            { label: 'UK & Ireland', allocatedMm: 275, pct: 22, color: '#3b82f6' },
            { label: 'France', allocatedMm: 238, pct: 19, color: '#10b981' },
            { label: 'Germany & Austria', allocatedMm: 225, pct: 18, color: '#8b5cf6' },
            { label: 'Benelux', allocatedMm: 150, pct: 12, color: '#f59e0b' },
            { label: 'Southern Europe', allocatedMm: 138, pct: 11, color: '#ec4899' },
            { label: 'Nordics', allocatedMm: 113, pct: 9, color: '#14b8a6' },
            { label: 'Other', allocatedMm: 111, pct: 9, color: '#9ca3af' },
          ],
        },
        {
          id: 'quality',
          label: 'By Quality',
          segments: [
            { label: 'Real money', allocatedMm: 950, pct: 76, color: '#10b981' },
            { label: 'Fast money', allocatedMm: 300, pct: 24, color: '#f59e0b' },
          ],
        },
      ],
    },
  },
];

// --- Peer Analysis -----------------------------------------------------------

export interface PeerBond {
  id: string;
  issuer: string;
  isSelf: boolean;
  rating: string;
  tenorYears: number;
  zSpreadBps: number;
  outstandingMm: number;
  tradedMm: number; // recent window — liquidity proxy
  changeBps: number;
}

export interface PeerAnalysisData {
  issuer: string;
  sector: string;
  benchmarkLabel: string;
  peers: PeerBond[];
}

export interface PeerSample {
  id: string;
  label: string;
  data: PeerAnalysisData;
}

export const peerSamples: PeerSample[] = [
  {
    id: 'eur-autos',
    label: 'EUR IG autos',
    data: {
      issuer: 'BMW Finance NV',
      sector: 'Autos & mobility',
      benchmarkLabel: 'EUR IG autos · 3–7Y',
      peers: [
        { id: 'bmw-29', issuer: 'BMW 2029', isSelf: true, rating: 'A', tenorYears: 4, zSpreadBps: 72, outstandingMm: 1500, tradedMm: 180, changeBps: -1 },
        { id: 'bmw-31', issuer: 'BMW 2031', isSelf: true, rating: 'A', tenorYears: 5, zSpreadBps: 84, outstandingMm: 1250, tradedMm: 240, changeBps: -4 },
        { id: 'mbg-30', issuer: 'Mercedes-Benz 2030', isSelf: false, rating: 'A', tenorYears: 5, zSpreadBps: 80, outstandingMm: 1750, tradedMm: 150, changeBps: 1 },
        { id: 'vw-30', issuer: 'Volkswagen 2030', isSelf: false, rating: 'A-', tenorYears: 5, zSpreadBps: 96, outstandingMm: 2000, tradedMm: 320, changeBps: 2 },
        { id: 'tmcc-30', issuer: 'Toyota Motor Cr 2030', isSelf: false, rating: 'A+', tenorYears: 5, zSpreadBps: 66, outstandingMm: 1250, tradedMm: 90, changeBps: 0 },
        { id: 'stla-30', issuer: 'Stellantis 2030', isSelf: false, rating: 'BBB+', tenorYears: 5, zSpreadBps: 112, outstandingMm: 1000, tradedMm: 130, changeBps: 3 },
        { id: 'rno-29', issuer: 'Renault 2029', isSelf: false, rating: 'BBB-', tenorYears: 4, zSpreadBps: 138, outstandingMm: 750, tradedMm: 80, changeBps: 1 },
        { id: 'f-32', issuer: 'Ford 2032', isSelf: false, rating: 'BBB-', tenorYears: 7, zSpreadBps: 182, outstandingMm: 1200, tradedMm: 210, changeBps: -2 },
      ],
    },
  },
];
