// Mock deal data for DCM Bond Issuance

import type { Deal, DealSummary, MarketSummary } from '../types.js';
import { getIssuerById } from './issuers.js';

const leadBanks = [
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Citibank', 'Bank of America',
  'Deutsche Bank', 'Barclays', 'BNP Paribas', 'HSBC', 'UBS',
];

const coLeadBanks = [
  'Credit Suisse', 'Societe Generale', 'RBC Capital', 'TD Securities', 'Wells Fargo',
  'Mizuho', 'SMBC Nikko', 'Credit Agricole', 'ING', 'Santander',
];

// Generate deterministic deals for each issuer
export const deals: Deal[] = [
  // BMW AG deals
  {
    id: 'deal-bmw-001',
    issuerId: 'bmw-ag',
    issuerName: 'BMW AG',
    isin: 'XS2725478901',
    announceDate: '2025-11-05',
    pricingDate: '2025-11-07',
    settleDate: '2025-11-14',
    currency: 'EUR',
    size: 1000,
    tenor: '5Y',
    coupon: 3.25,
    reoffer: 99.75,
    spread: 85,
    nip: 5,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Deutsche Bank', 'BNP Paribas'],
    coLeads: ['HSBC', 'Societe Generale'],
    oversubscription: 3.2,
  },
  {
    id: 'deal-bmw-002',
    issuerId: 'bmw-ag',
    issuerName: 'BMW AG',
    isin: 'XS2698234567',
    announceDate: '2025-06-12',
    pricingDate: '2025-06-14',
    settleDate: '2025-06-21',
    currency: 'EUR',
    size: 750,
    tenor: '7Y',
    coupon: 3.50,
    reoffer: 99.50,
    spread: 95,
    nip: 8,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Goldman Sachs', 'Deutsche Bank'],
    coLeads: ['Credit Agricole', 'ING'],
    oversubscription: 2.8,
  },
  {
    id: 'deal-bmw-003',
    issuerId: 'bmw-ag',
    issuerName: 'BMW AG',
    isin: 'XS2654321098',
    announceDate: '2025-02-20',
    pricingDate: '2025-02-22',
    settleDate: '2025-03-01',
    currency: 'USD',
    size: 1500,
    tenor: '10Y',
    coupon: 4.125,
    reoffer: 99.25,
    spread: 120,
    nip: 10,
    format: 'RegS/144A',
    seniority: 'Senior',
    leads: ['JP Morgan', 'Morgan Stanley'],
    coLeads: ['Citibank', 'Bank of America'],
    oversubscription: 4.1,
  },
  {
    id: 'deal-bmw-004',
    issuerId: 'bmw-ag',
    issuerName: 'BMW AG',
    isin: 'XS2598765432',
    announceDate: '2024-09-10',
    pricingDate: '2024-09-12',
    settleDate: '2024-09-19',
    currency: 'EUR',
    size: 500,
    tenor: '3Y',
    coupon: 2.875,
    reoffer: 99.90,
    spread: 65,
    nip: 3,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Barclays', 'HSBC'],
    coLeads: ['Santander'],
    oversubscription: 2.5,
  },
  // Volkswagen AG deals
  {
    id: 'deal-vw-001',
    issuerId: 'volkswagen-ag',
    issuerName: 'Volkswagen AG',
    isin: 'XS2712345678',
    announceDate: '2025-10-15',
    pricingDate: '2025-10-17',
    settleDate: '2025-10-24',
    currency: 'EUR',
    size: 1250,
    tenor: '5Y',
    coupon: 3.50,
    reoffer: 99.60,
    spread: 105,
    nip: 8,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Deutsche Bank', 'Goldman Sachs'],
    coLeads: ['BNP Paribas', 'Credit Agricole'],
    oversubscription: 2.6,
  },
  {
    id: 'deal-vw-002',
    issuerId: 'volkswagen-ag',
    issuerName: 'Volkswagen AG',
    isin: 'XS2687654321',
    announceDate: '2025-05-08',
    pricingDate: '2025-05-10',
    settleDate: '2025-05-17',
    currency: 'EUR',
    size: 1000,
    tenor: '10Y',
    coupon: 4.00,
    reoffer: 99.40,
    spread: 135,
    nip: 12,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['JP Morgan', 'Barclays'],
    coLeads: ['HSBC', 'ING'],
    oversubscription: 2.2,
  },
  {
    id: 'deal-vw-003',
    issuerId: 'volkswagen-ag',
    issuerName: 'Volkswagen AG',
    isin: 'XS2623456789',
    announceDate: '2024-12-01',
    pricingDate: '2024-12-03',
    settleDate: '2024-12-10',
    currency: 'USD',
    size: 2000,
    tenor: '7Y',
    coupon: 4.375,
    reoffer: 99.50,
    spread: 145,
    nip: 15,
    format: 'RegS/144A',
    seniority: 'Senior',
    leads: ['Morgan Stanley', 'Citibank'],
    coLeads: ['Bank of America', 'Wells Fargo'],
    oversubscription: 2.9,
  },
  // Mercedes-Benz deals
  {
    id: 'deal-mb-001',
    issuerId: 'mercedes-benz-ag',
    issuerName: 'Mercedes-Benz',
    isin: 'XS2734567890',
    announceDate: '2025-12-02',
    pricingDate: '2025-12-04',
    settleDate: '2025-12-11',
    currency: 'EUR',
    size: 1500,
    tenor: '5Y',
    coupon: 3.125,
    reoffer: 99.80,
    spread: 80,
    nip: 4,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['BNP Paribas', 'Deutsche Bank'],
    coLeads: ['Barclays', 'HSBC'],
    oversubscription: 3.5,
  },
  {
    id: 'deal-mb-002',
    issuerId: 'mercedes-benz-ag',
    issuerName: 'Mercedes-Benz',
    isin: 'XS2701234567',
    announceDate: '2025-07-20',
    pricingDate: '2025-07-22',
    settleDate: '2025-07-29',
    currency: 'EUR',
    size: 1000,
    tenor: '8Y',
    coupon: 3.625,
    reoffer: 99.55,
    spread: 100,
    nip: 7,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Goldman Sachs', 'JP Morgan'],
    coLeads: ['Credit Suisse', 'UBS'],
    oversubscription: 3.0,
  },
  {
    id: 'deal-mb-003',
    issuerId: 'mercedes-benz-ag',
    issuerName: 'Mercedes-Benz',
    isin: 'XS2645678901',
    announceDate: '2025-03-15',
    pricingDate: '2025-03-17',
    settleDate: '2025-03-24',
    currency: 'USD',
    size: 1750,
    tenor: '10Y',
    coupon: 4.00,
    reoffer: 99.30,
    spread: 115,
    nip: 9,
    format: 'RegS/144A',
    seniority: 'Senior',
    leads: ['Morgan Stanley', 'Bank of America'],
    coLeads: ['Citibank', 'TD Securities'],
    oversubscription: 3.8,
  },
  // Porsche deals
  {
    id: 'deal-porsche-001',
    issuerId: 'porsche-ag',
    issuerName: 'Porsche AG',
    isin: 'XS2756789012',
    announceDate: '2025-09-25',
    pricingDate: '2025-09-27',
    settleDate: '2025-10-04',
    currency: 'EUR',
    size: 750,
    tenor: '5Y',
    coupon: 3.375,
    reoffer: 99.70,
    spread: 90,
    nip: 6,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Deutsche Bank', 'Goldman Sachs'],
    coLeads: ['BNP Paribas'],
    oversubscription: 4.2,
  },
  {
    id: 'deal-porsche-002',
    issuerId: 'porsche-ag',
    issuerName: 'Porsche AG',
    isin: 'XS2689012345',
    announceDate: '2025-04-10',
    pricingDate: '2025-04-12',
    settleDate: '2025-04-19',
    currency: 'EUR',
    size: 500,
    tenor: '7Y',
    coupon: 3.75,
    reoffer: 99.45,
    spread: 110,
    nip: 10,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['JP Morgan', 'Barclays'],
    coLeads: ['HSBC', 'Credit Agricole'],
    oversubscription: 3.6,
  },
  // Siemens deals
  {
    id: 'deal-siemens-001',
    issuerId: 'siemens-ag',
    issuerName: 'Siemens AG',
    isin: 'XS2767890123',
    announceDate: '2025-11-18',
    pricingDate: '2025-11-20',
    settleDate: '2025-11-27',
    currency: 'EUR',
    size: 1000,
    tenor: '10Y',
    coupon: 3.00,
    reoffer: 99.85,
    spread: 55,
    nip: 3,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Deutsche Bank', 'BNP Paribas'],
    coLeads: ['Societe Generale', 'Credit Agricole'],
    oversubscription: 4.5,
  },
  {
    id: 'deal-siemens-002',
    issuerId: 'siemens-ag',
    issuerName: 'Siemens AG',
    isin: 'XS2634567890',
    announceDate: '2025-01-22',
    pricingDate: '2025-01-24',
    settleDate: '2025-01-31',
    currency: 'EUR',
    size: 750,
    tenor: '5Y',
    coupon: 2.75,
    reoffer: 99.90,
    spread: 45,
    nip: 2,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Goldman Sachs', 'JP Morgan'],
    coLeads: ['Barclays', 'HSBC'],
    oversubscription: 5.0,
  },
  // BASF deals
  {
    id: 'deal-basf-001',
    issuerId: 'basf-se',
    issuerName: 'BASF',
    isin: 'XS2778901234',
    announceDate: '2025-08-05',
    pricingDate: '2025-08-07',
    settleDate: '2025-08-14',
    currency: 'EUR',
    size: 1250,
    tenor: '7Y',
    coupon: 3.25,
    reoffer: 99.65,
    spread: 75,
    nip: 5,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['Deutsche Bank', 'Barclays'],
    coLeads: ['BNP Paribas', 'ING'],
    oversubscription: 3.1,
  },
  // TotalEnergies deals
  {
    id: 'deal-total-001',
    issuerId: 'totalenergies-se',
    issuerName: 'TotalEnergies',
    isin: 'XS2789012345',
    announceDate: '2025-10-01',
    pricingDate: '2025-10-03',
    settleDate: '2025-10-10',
    currency: 'EUR',
    size: 2000,
    tenor: '10Y',
    coupon: 2.875,
    reoffer: 99.90,
    spread: 50,
    nip: 2,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['BNP Paribas', 'Societe Generale'],
    coLeads: ['Credit Agricole', 'HSBC'],
    oversubscription: 4.8,
  },
  // Shell deals
  {
    id: 'deal-shell-001',
    issuerId: 'shell-plc',
    issuerName: 'Shell',
    isin: 'XS2790123456',
    announceDate: '2025-09-08',
    pricingDate: '2025-09-10',
    settleDate: '2025-09-17',
    currency: 'USD',
    size: 2500,
    tenor: '10Y',
    coupon: 4.25,
    reoffer: 99.75,
    spread: 65,
    nip: 4,
    format: 'RegS/144A',
    seniority: 'Senior',
    leads: ['JP Morgan', 'Citibank'],
    coLeads: ['Bank of America', 'Goldman Sachs'],
    oversubscription: 4.0,
  },
  // LVMH deals
  {
    id: 'deal-lvmh-001',
    issuerId: 'lvmh-se',
    issuerName: 'LVMH',
    isin: 'XS2801234567',
    announceDate: '2025-11-25',
    pricingDate: '2025-11-27',
    settleDate: '2025-12-04',
    currency: 'EUR',
    size: 1500,
    tenor: '8Y',
    coupon: 2.625,
    reoffer: 99.85,
    spread: 40,
    nip: 2,
    format: 'RegS',
    seniority: 'Senior',
    leads: ['BNP Paribas', 'Goldman Sachs'],
    coLeads: ['Societe Generale', 'Credit Agricole'],
    oversubscription: 5.5,
  },
];

// Helper to get deals by issuer
export function getDealsByIssuerId(issuerId: string, limit?: number): Deal[] {
  const issuerDeals = deals
    .filter(d => d.issuerId === issuerId)
    .sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime());
  
  return limit ? issuerDeals.slice(0, limit) : issuerDeals;
}

// Helper to get deal by ID
export function getDealById(dealId: string): Deal | undefined {
  return deals.find(d => d.id === dealId);
}

// Calculate summary stats for deals
export function calculateDealSummary(dealList: Deal[]): DealSummary {
  if (dealList.length === 0) {
    return { totalDeals: 0, totalRaised: 0, avgTenor: 'N/A', avgNip: 0, avgOversubscription: 0 };
  }

  const totalRaised = dealList.reduce((sum, d) => sum + d.size, 0);
  const avgNip = dealList.reduce((sum, d) => sum + d.nip, 0) / dealList.length;
  const avgOversubscription = dealList.reduce((sum, d) => sum + d.oversubscription, 0) / dealList.length;
  
  // Calculate average tenor (parse years from tenor string)
  const tenorYears = dealList.map(d => parseInt(d.tenor.replace('Y', '')));
  const avgTenorYears = tenorYears.reduce((sum, t) => sum + t, 0) / tenorYears.length;

  return {
    totalDeals: dealList.length,
    totalRaised,
    avgTenor: `${avgTenorYears.toFixed(1)}Y`,
    avgNip: Math.round(avgNip * 10) / 10,
    avgOversubscription: Math.round(avgOversubscription * 10) / 10,
  };
}

// Get peer deals for comparison
export function getPeerDeals(issuerId: string, sector?: string): Deal[] {
  const issuer = getIssuerById(issuerId);
  if (!issuer) return [];
  
  const targetSector = sector || issuer.sector;
  
  return deals
    .filter(d => {
      const dealIssuer = getIssuerById(d.issuerId);
      return dealIssuer && dealIssuer.sector === targetSector && d.issuerId !== issuerId;
    })
    .sort((a, b) => new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime());
}

// Get all deals with optional filtering
export function getAllDeals(options?: {
  limit?: number;
  sector?: string;
  currency?: string;
  sortBy?: 'date' | 'size' | 'spread';
}): Deal[] {
  let result = [...deals];
  
  // Apply sector filter
  if (options?.sector) {
    result = result.filter(d => {
      const issuer = getIssuerById(d.issuerId);
      return issuer && issuer.sector.toLowerCase() === options.sector!.toLowerCase();
    });
  }
  
  // Apply currency filter
  if (options?.currency) {
    result = result.filter(d => d.currency.toLowerCase() === options.currency!.toLowerCase());
  }
  
  // Sort
  const sortBy = options?.sortBy || 'date';
  result.sort((a, b) => {
    switch (sortBy) {
      case 'size':
        return b.size - a.size;
      case 'spread':
        return b.spread - a.spread;
      case 'date':
      default:
        return new Date(b.pricingDate).getTime() - new Date(a.pricingDate).getTime();
    }
  });
  
  // Apply limit
  if (options?.limit) {
    result = result.slice(0, options.limit);
  }
  
  return result;
}

// Calculate market-wide summary statistics
export function getMarketSummary(dealList: Deal[]): MarketSummary {
  if (dealList.length === 0) {
    return {
      totalDeals: 0,
      totalVolume: 0,
      avgSpread: 0,
      avgNip: 0,
      bySector: [],
      byCurrency: [],
    };
  }

  const totalVolume = dealList.reduce((sum, d) => sum + d.size, 0);
  const avgSpread = dealList.reduce((sum, d) => sum + d.spread, 0) / dealList.length;
  const avgNip = dealList.reduce((sum, d) => sum + d.nip, 0) / dealList.length;

  // Group by sector
  const sectorMap = new Map<string, { count: number; volume: number }>();
  for (const deal of dealList) {
    const issuer = getIssuerById(deal.issuerId);
    const sector = issuer?.sector || 'Unknown';
    const existing = sectorMap.get(sector) || { count: 0, volume: 0 };
    sectorMap.set(sector, {
      count: existing.count + 1,
      volume: existing.volume + deal.size,
    });
  }
  const bySector = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({ sector, ...data }))
    .sort((a, b) => b.volume - a.volume);

  // Group by currency
  const currencyMap = new Map<string, { count: number; volume: number }>();
  for (const deal of dealList) {
    const existing = currencyMap.get(deal.currency) || { count: 0, volume: 0 };
    currencyMap.set(deal.currency, {
      count: existing.count + 1,
      volume: existing.volume + deal.size,
    });
  }
  const byCurrency = Array.from(currencyMap.entries())
    .map(([currency, data]) => ({ currency, ...data }))
    .sort((a, b) => b.volume - a.volume);

  return {
    totalDeals: dealList.length,
    totalVolume,
    avgSpread: Math.round(avgSpread),
    avgNip: Math.round(avgNip * 10) / 10,
    bySector,
    byCurrency,
  };
}
