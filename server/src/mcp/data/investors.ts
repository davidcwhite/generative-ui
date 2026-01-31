// Mock investor data for DCM Bond Issuance

import type { Investor, Participation } from '../types.js';

export const investors: Investor[] = [
  // Asset Managers
  {
    id: 'blackrock',
    name: 'BlackRock',
    type: 'Asset Manager',
    geography: 'US',
    aum: 9500000,
    focusSectors: ['Automobiles', 'Industrials', 'Energy', 'Consumer Goods'],
  },
  {
    id: 'pimco',
    name: 'PIMCO',
    type: 'Asset Manager',
    geography: 'US',
    aum: 1800000,
    focusSectors: ['Automobiles', 'Industrials', 'Energy'],
  },
  {
    id: 'amundi',
    name: 'Amundi',
    type: 'Asset Manager',
    geography: 'France',
    aum: 2100000,
    focusSectors: ['Automobiles', 'Industrials', 'Chemicals', 'Consumer Goods'],
  },
  {
    id: 'dws',
    name: 'DWS Group',
    type: 'Asset Manager',
    geography: 'Germany',
    aum: 900000,
    focusSectors: ['Automobiles', 'Industrials', 'Chemicals'],
  },
  {
    id: 'fidelity',
    name: 'Fidelity Investments',
    type: 'Asset Manager',
    geography: 'US',
    aum: 4200000,
    focusSectors: ['Automobiles', 'Energy', 'Consumer Goods'],
  },
  {
    id: 'schroders',
    name: 'Schroders',
    type: 'Asset Manager',
    geography: 'UK',
    aum: 750000,
    focusSectors: ['Automobiles', 'Industrials', 'Consumer Goods'],
  },
  // Insurance
  {
    id: 'allianz-im',
    name: 'Allianz Global Investors',
    type: 'Insurance',
    geography: 'Germany',
    aum: 680000,
    focusSectors: ['Automobiles', 'Industrials', 'Energy'],
  },
  {
    id: 'axa-im',
    name: 'AXA Investment Managers',
    type: 'Insurance',
    geography: 'France',
    aum: 850000,
    focusSectors: ['Automobiles', 'Industrials', 'Consumer Goods'],
  },
  {
    id: 'prudential',
    name: 'Prudential Financial',
    type: 'Insurance',
    geography: 'US',
    aum: 1500000,
    focusSectors: ['Automobiles', 'Energy', 'Industrials'],
  },
  {
    id: 'swiss-re',
    name: 'Swiss Re',
    type: 'Insurance',
    geography: 'Switzerland',
    aum: 220000,
    focusSectors: ['Energy', 'Industrials'],
  },
  // Pension Funds
  {
    id: 'calpers',
    name: 'CalPERS',
    type: 'Pension',
    geography: 'US',
    aum: 450000,
    focusSectors: ['Automobiles', 'Industrials', 'Energy'],
  },
  {
    id: 'abp',
    name: 'ABP',
    type: 'Pension',
    geography: 'Netherlands',
    aum: 530000,
    focusSectors: ['Automobiles', 'Industrials', 'Consumer Goods'],
  },
  {
    id: 'gpif',
    name: 'GPIF',
    type: 'Pension',
    geography: 'Japan',
    aum: 1600000,
    focusSectors: ['Automobiles', 'Energy'],
  },
  // Banks
  {
    id: 'deutsche-am',
    name: 'Deutsche Bank Wealth Management',
    type: 'Bank',
    geography: 'Germany',
    aum: 450000,
    focusSectors: ['Automobiles', 'Industrials'],
  },
  {
    id: 'ubs-am',
    name: 'UBS Asset Management',
    type: 'Bank',
    geography: 'Switzerland',
    aum: 1100000,
    focusSectors: ['Automobiles', 'Consumer Goods', 'Energy'],
  },
  // Hedge Funds
  {
    id: 'bridgewater',
    name: 'Bridgewater Associates',
    type: 'Hedge Fund',
    geography: 'US',
    aum: 150000,
    focusSectors: ['Automobiles', 'Energy'],
  },
  {
    id: 'citadel',
    name: 'Citadel',
    type: 'Hedge Fund',
    geography: 'US',
    aum: 62000,
    focusSectors: ['Automobiles', 'Industrials'],
  },
  // Central Banks
  {
    id: 'norges-bank',
    name: 'Norges Bank Investment Management',
    type: 'Central Bank',
    geography: 'Norway',
    aum: 1400000,
    focusSectors: ['Automobiles', 'Industrials', 'Energy', 'Consumer Goods'],
  },
];

// Generate allocations for each deal
export function generateAllocationsForDeal(dealId: string, dealSize: number): {
  investorId: string;
  investorName: string;
  investorType: Investor['type'];
  geography: string;
  orderSize: number;
  allocatedSize: number;
  fillRate: number;
}[] {
  // Deterministic "random" based on deal ID
  const seed = dealId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;

  // Select 8-12 investors for this deal
  const numInvestors = 8 + Math.floor(rng(1) * 5);
  const shuffled = [...investors].sort((a, b) => rng(a.id.length) - rng(b.id.length));
  const selectedInvestors = shuffled.slice(0, numInvestors);

  const allocations = selectedInvestors.map((investor, i) => {
    // Order size varies by investor type
    const baseOrder = {
      'Asset Manager': dealSize * (0.08 + rng(i * 2) * 0.12),
      'Insurance': dealSize * (0.05 + rng(i * 3) * 0.08),
      'Pension': dealSize * (0.04 + rng(i * 4) * 0.06),
      'Bank': dealSize * (0.03 + rng(i * 5) * 0.05),
      'Hedge Fund': dealSize * (0.02 + rng(i * 6) * 0.04),
      'Central Bank': dealSize * (0.06 + rng(i * 7) * 0.10),
    }[investor.type] || dealSize * 0.05;

    const orderSize = Math.round(baseOrder);
    const fillRate = 0.3 + rng(i * 8) * 0.5; // 30-80% fill rate
    const allocatedSize = Math.round(orderSize * fillRate);

    return {
      investorId: investor.id,
      investorName: investor.name,
      investorType: investor.type,
      geography: investor.geography,
      orderSize,
      allocatedSize,
      fillRate: Math.round(fillRate * 100) / 100,
    };
  });

  return allocations;
}

// Generate participation history for an investor
export function getParticipationHistory(investorId?: string, issuerId?: string): Participation[] {
  // Import deals inline to avoid circular dependency
  const { deals } = require('./deals.js');
  
  const participations: Participation[] = [];
  
  for (const deal of deals) {
    const allocations = generateAllocationsForDeal(deal.id, deal.size);
    
    for (const alloc of allocations) {
      // Filter by investor or issuer if specified
      if (investorId && alloc.investorId !== investorId) continue;
      if (issuerId && deal.issuerId !== issuerId) continue;
      
      // Generate deterministic behaviour data
      const seed = (deal.id + alloc.investorId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const rng = ((seed * 9301 + 49297) % 233280) / 233280;
      
      const heldDays = Math.floor(30 + rng * 150); // 30-180 days
      const soldPercentage = rng < 0.6 ? 0 : (rng < 0.8 ? Math.floor(rng * 50) : Math.floor(50 + rng * 50));
      
      let behaviour: 'hold' | 'partial_flip' | 'flip';
      if (soldPercentage === 0) behaviour = 'hold';
      else if (soldPercentage < 50) behaviour = 'partial_flip';
      else behaviour = 'flip';
      
      participations.push({
        dealId: deal.id,
        dealName: `${deal.issuerName} ${deal.coupon}% ${deal.tenor}`,
        issuerName: deal.issuerName,
        date: deal.pricingDate,
        orderSize: alloc.orderSize,
        allocatedSize: alloc.allocatedSize,
        fillRate: alloc.fillRate,
        heldDays,
        soldPercentage,
        behaviour,
      });
    }
  }
  
  return participations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Get investor by ID
export function getInvestorById(id: string): Investor | undefined {
  return investors.find(i => i.id === id);
}

// Calculate flip score for an investor (0-100, lower is better)
export function calculateFlipScore(investorId: string): number {
  const participations = getParticipationHistory(investorId);
  if (participations.length === 0) return 50;
  
  const flipWeight = participations.reduce((sum, p) => {
    if (p.behaviour === 'hold') return sum;
    if (p.behaviour === 'partial_flip') return sum + 0.5;
    return sum + 1;
  }, 0);
  
  return Math.round((flipWeight / participations.length) * 100);
}
