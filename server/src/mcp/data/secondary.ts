// Mock secondary market performance data for DCM Bond Issuance

import type { SecondaryPerformance, CurvePoint } from '../types.js';
import { deals, getDealById } from './deals.js';

// Generate secondary performance for a deal (post-pricing performance)
export function generateSecondaryPerformance(isin: string, days: number = 30): SecondaryPerformance[] {
  const deal = deals.find(d => d.isin === isin);
  if (!deal) return [];
  
  const pricingDate = new Date(deal.pricingDate);
  const performance: SecondaryPerformance[] = [];
  
  // Deterministic "random" based on ISIN
  const seed = isin.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280 - 0.5;
  
  // Initial values from deal
  let currentPrice = deal.reoffer;
  let currentSpread = deal.spread;
  
  for (let i = 0; i <= Math.min(days, 90); i++) {
    const date = new Date(pricingDate);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Price and spread movements (bonds typically tighten after issuance)
    const priceChange = rng(i) * 0.3 + (i < 7 ? 0.05 : 0); // Initial tightening
    const spreadChange = rng(i + 100) * 2 - (i < 7 ? 1 : 0); // Spread tightens initially
    
    currentPrice = Math.round((currentPrice + priceChange) * 100) / 100;
    currentSpread = Math.max(10, Math.round(currentSpread + spreadChange));
    
    // Calculate yield (simplified)
    const yieldToMaturity = deal.coupon + (100 - currentPrice) / 5; // Rough approximation
    
    // Volume traded (higher initially, then tapers)
    const baseVolume = deal.size * 0.02;
    const volumeMultiplier = i < 7 ? 3 : (i < 14 ? 2 : 1);
    const volumeTraded = Math.round(baseVolume * volumeMultiplier * (0.5 + rng(i + 200)));
    
    performance.push({
      isin,
      date: date.toISOString().split('T')[0],
      price: currentPrice,
      spread: currentSpread,
      yieldToMaturity: Math.round(yieldToMaturity * 100) / 100,
      volumeTraded,
      daysFromPricing: i,
    });
  }
  
  return performance;
}

// Calculate spread drift from issue
export function calculateSpreadDrift(isin: string): number {
  const deal = deals.find(d => d.isin === isin);
  if (!deal) return 0;
  
  const performance = generateSecondaryPerformance(isin, 30);
  if (performance.length === 0) return 0;
  
  const latestSpread = performance[performance.length - 1].spread;
  return latestSpread - deal.spread;
}

// Generate sector curve (spread curve by tenor)
export function generateSectorCurve(sector: string, rating: string): { curve: CurvePoint[]; benchmark: string } {
  // Deterministic "random" based on sector and rating
  const seed = (sector + rating).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;
  
  // Base spreads by rating
  const baseSpread = {
    'AAA': 20,
    'AA+': 30,
    'AA': 35,
    'AA-': 45,
    'A+': 55,
    'A': 70,
    'A-': 85,
    'BBB+': 100,
    'BBB': 120,
    'BBB-': 150,
  }[rating] || 80;
  
  // Sector adjustments
  const sectorAdjustment = {
    'Automobiles': 15,
    'Industrials': 5,
    'Energy': 10,
    'Chemicals': 8,
    'Consumer Goods': -5,
  }[sector] || 0;
  
  const tenors = ['1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '15Y', '20Y', '30Y'];
  const tenorMultipliers = [0.6, 0.7, 0.8, 1.0, 1.15, 1.3, 1.45, 1.55, 1.65];
  
  const curve: CurvePoint[] = tenors.map((tenor, i) => {
    const spread = Math.round((baseSpread + sectorAdjustment) * tenorMultipliers[i] + rng(i) * 10);
    const yieldValue = 3.0 + (i * 0.15) + rng(i + 10) * 0.2; // Simplified yield curve
    
    return {
      tenor,
      spread,
      yield: Math.round(yieldValue * 100) / 100,
    };
  });
  
  return {
    curve,
    benchmark: rating.startsWith('A') ? 'EUR Mid-Swap' : 'EUR Bund',
  };
}

// Get performance summary for a deal
export function getPerformanceSummary(isin: string): {
  currentSpread: number;
  issueSpread: number;
  drift: number;
  currentPrice: number;
  issuePrice: number;
  priceChange: number;
  avgDailyVolume: number;
} | null {
  const deal = deals.find(d => d.isin === isin);
  if (!deal) return null;
  
  const performance = generateSecondaryPerformance(isin, 30);
  if (performance.length === 0) return null;
  
  const latest = performance[performance.length - 1];
  const avgVolume = performance.reduce((sum, p) => sum + p.volumeTraded, 0) / performance.length;
  
  return {
    currentSpread: latest.spread,
    issueSpread: deal.spread,
    drift: latest.spread - deal.spread,
    currentPrice: latest.price,
    issuePrice: deal.reoffer,
    priceChange: Math.round((latest.price - deal.reoffer) * 100) / 100,
    avgDailyVolume: Math.round(avgVolume),
  };
}
