// Mock issuer data for DCM Bond Issuance

import type { Issuer } from '../types.js';

export const issuers: Issuer[] = [
  {
    id: 'bmw-ag',
    lei: '5299006WR3LK4LFVJG62',
    name: 'Bayerische Motoren Werke Aktiengesellschaft',
    shortName: 'BMW AG',
    aliases: ['BMW', 'BMW Group', 'Bayerische Motoren Werke'],
    sector: 'Automobiles',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'A' },
      { agency: 'Moody\'s', rating: 'A2' },
      { agency: 'Fitch', rating: 'A' },
    ],
  },
  {
    id: 'volkswagen-ag',
    lei: '529900R8Z2H4L8W9NH85',
    name: 'Volkswagen Aktiengesellschaft',
    shortName: 'Volkswagen AG',
    aliases: ['VW', 'Volkswagen', 'VW Group'],
    sector: 'Automobiles',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'BBB+' },
      { agency: 'Moody\'s', rating: 'A3' },
      { agency: 'Fitch', rating: 'BBB+' },
    ],
  },
  {
    id: 'mercedes-benz-ag',
    lei: '529900R27DL06UVNT076',
    name: 'Mercedes-Benz Group AG',
    shortName: 'Mercedes-Benz',
    aliases: ['Mercedes', 'Daimler', 'Mercedes-Benz Group', 'Daimler AG'],
    sector: 'Automobiles',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'A' },
      { agency: 'Moody\'s', rating: 'A2' },
      { agency: 'Fitch', rating: 'A-' },
    ],
  },
  {
    id: 'porsche-ag',
    lei: '529900P3G9Z4YYDQQ854',
    name: 'Dr. Ing. h.c. F. Porsche AG',
    shortName: 'Porsche AG',
    aliases: ['Porsche', 'Porsche Automobil'],
    sector: 'Automobiles',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'A-' },
      { agency: 'Moody\'s', rating: 'A3' },
    ],
  },
  {
    id: 'audi-ag',
    lei: '529900G2YW1GHYF3BT23',
    name: 'AUDI Aktiengesellschaft',
    shortName: 'Audi AG',
    aliases: ['Audi', 'Audi Group'],
    sector: 'Automobiles',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'BBB+' },
      { agency: 'Moody\'s', rating: 'A3' },
    ],
  },
  {
    id: 'siemens-ag',
    lei: '529900DR2VXHGXZC1A23',
    name: 'Siemens Aktiengesellschaft',
    shortName: 'Siemens AG',
    aliases: ['Siemens', 'Siemens Group'],
    sector: 'Industrials',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'A+' },
      { agency: 'Moody\'s', rating: 'A1' },
      { agency: 'Fitch', rating: 'A+' },
    ],
  },
  {
    id: 'basf-se',
    lei: '529900PM64WH8AF1E917',
    name: 'BASF SE',
    shortName: 'BASF',
    aliases: ['BASF', 'BASF SE'],
    sector: 'Chemicals',
    country: 'Germany',
    ratings: [
      { agency: 'S&P', rating: 'A' },
      { agency: 'Moody\'s', rating: 'A2' },
    ],
  },
  {
    id: 'totalenergies-se',
    lei: '529900S21EQ7XV0JVV45',
    name: 'TotalEnergies SE',
    shortName: 'TotalEnergies',
    aliases: ['Total', 'TotalEnergies', 'Total SA'],
    sector: 'Energy',
    country: 'France',
    ratings: [
      { agency: 'S&P', rating: 'AA-' },
      { agency: 'Moody\'s', rating: 'Aa3' },
      { agency: 'Fitch', rating: 'AA-' },
    ],
  },
  {
    id: 'shell-plc',
    lei: '21380068P1DRHMJ8KU70',
    name: 'Shell plc',
    shortName: 'Shell',
    aliases: ['Shell', 'Royal Dutch Shell'],
    sector: 'Energy',
    country: 'United Kingdom',
    ratings: [
      { agency: 'S&P', rating: 'AA-' },
      { agency: 'Moody\'s', rating: 'Aa3' },
    ],
  },
  {
    id: 'lvmh-se',
    lei: 'IOG4E947OATN0K7VS2V9',
    name: 'LVMH Moët Hennessy Louis Vuitton SE',
    shortName: 'LVMH',
    aliases: ['LVMH', 'Louis Vuitton', 'Moet Hennessy'],
    sector: 'Consumer Goods',
    country: 'France',
    ratings: [
      { agency: 'S&P', rating: 'A+' },
      { agency: 'Moody\'s', rating: 'A1' },
    ],
  },
];

// Helper to find issuer by ID
export function getIssuerById(id: string): Issuer | undefined {
  return issuers.find(i => i.id === id);
}

// Helper to search issuers
export function searchIssuers(query: string): { issuer: Issuer; score: number; matchType: 'exact' | 'alias' | 'fuzzy' }[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: { issuer: Issuer; score: number; matchType: 'exact' | 'alias' | 'fuzzy' }[] = [];

  for (const issuer of issuers) {
    // Exact match on shortName
    if (issuer.shortName.toLowerCase() === normalizedQuery) {
      results.push({ issuer, score: 1.0, matchType: 'exact' });
      continue;
    }

    // Exact match on name
    if (issuer.name.toLowerCase() === normalizedQuery) {
      results.push({ issuer, score: 0.95, matchType: 'exact' });
      continue;
    }

    // Alias match
    const aliasMatch = issuer.aliases.find(a => a.toLowerCase() === normalizedQuery);
    if (aliasMatch) {
      results.push({ issuer, score: 0.9, matchType: 'alias' });
      continue;
    }

    // Fuzzy match - contains query
    if (
      issuer.shortName.toLowerCase().includes(normalizedQuery) ||
      issuer.name.toLowerCase().includes(normalizedQuery) ||
      issuer.aliases.some(a => a.toLowerCase().includes(normalizedQuery))
    ) {
      results.push({ issuer, score: 0.7, matchType: 'fuzzy' });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// Get issuers by sector (for peer comparison)
export function getIssuersBySector(sector: string, excludeId?: string): Issuer[] {
  return issuers.filter(i => i.sector === sector && i.id !== excludeId);
}
