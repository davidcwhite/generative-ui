// Mock bond trade data for demonstration purposes

import { z } from 'zod';
import { registry, createDataSource } from './registry.js';

export interface BondTrade {
  id: string;
  tradeDate: string;
  settlementDate: string;
  bondName: string;
  isin: string;
  cusip: string;
  direction: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  yield: number;
  counterparty: string;
  trader: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED' | 'FAILED';
  currency: string;
  notionalValue: number;
}

// Sample counterparties
const counterparties = [
  'Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Citibank', 'Bank of America',
  'Deutsche Bank', 'Barclays', 'Credit Suisse', 'UBS', 'HSBC',
  'BNP Paribas', 'Societe Generale', 'RBC Capital', 'TD Securities', 'Wells Fargo'
];

// Sample traders
const traders = [
  'John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'Robert Wilson',
  'Jennifer Brown', 'David Lee', 'Lisa Anderson', 'James Taylor', 'Maria Garcia'
];

// Sample bonds
const bonds = [
  { name: 'US Treasury 10Y', isin: 'US912810TM17', cusip: '912810TM1', basePrice: 98.5, baseYield: 4.25 },
  { name: 'US Treasury 5Y', isin: 'US91282CGV27', cusip: '91282CGV2', basePrice: 99.2, baseYield: 4.10 },
  { name: 'US Treasury 2Y', isin: 'US91282CHD27', cusip: '91282CHD2', basePrice: 99.8, baseYield: 4.50 },
  { name: 'US Treasury 30Y', isin: 'US912810TQ31', cusip: '912810TQ3', basePrice: 95.5, baseYield: 4.45 },
  { name: 'Germany Bund 10Y', isin: 'DE0001102580', cusip: 'D01102580', basePrice: 97.2, baseYield: 2.35 },
  { name: 'UK Gilt 10Y', isin: 'GB00BDRHNP05', cusip: 'G00BDRHP0', basePrice: 96.8, baseYield: 4.15 },
  { name: 'Japan JGB 10Y', isin: 'JP1103551M19', cusip: 'J11035519', basePrice: 99.5, baseYield: 0.75 },
  { name: 'Apple Inc 3.85% 2043', isin: 'US037833DT49', cusip: '037833DT4', basePrice: 92.3, baseYield: 4.55 },
  { name: 'Microsoft 2.4% 2026', isin: 'US594918BW92', cusip: '594918BW9', basePrice: 97.8, baseYield: 3.20 },
  { name: 'Amazon 3.15% 2027', isin: 'US023135BT85', cusip: '023135BT8', basePrice: 96.5, baseYield: 3.95 },
  { name: 'Google 1.1% 2025', isin: 'US02079KAE47', cusip: '02079KAE4', basePrice: 98.9, baseYield: 2.85 },
  { name: 'JPM 4.125% 2026', isin: 'US46625HRL05', cusip: '46625HRL0', basePrice: 99.1, baseYield: 4.35 },
  { name: 'Goldman Sachs 3.5% 2025', isin: 'US38141GWK93', cusip: '38141GWK9', basePrice: 98.2, baseYield: 4.15 },
  { name: 'Verizon 4.5% 2033', isin: 'US92343VGH60', cusip: '92343VGH6', basePrice: 94.5, baseYield: 5.10 },
  { name: 'AT&T 3.65% 2028', isin: 'US00206RKH49', cusip: '00206RKH4', basePrice: 95.8, baseYield: 4.45 },
];

// Generate a random date within the last 30 days
function randomRecentDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

// Generate settlement date (T+2)
function settlementDate(tradeDate: string): string {
  const date = new Date(tradeDate);
  date.setDate(date.getDate() + 2);
  return date.toISOString().split('T')[0];
}

// Random element from array
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random price variation
function randomPrice(basePrice: number): number {
  const variation = (Math.random() - 0.5) * 2; // +/- 1%
  return Math.round((basePrice + variation) * 1000) / 1000;
}

// Generate random yield variation
function randomYield(baseYield: number): number {
  const variation = (Math.random() - 0.5) * 0.2; // +/- 0.1%
  return Math.round((baseYield + variation) * 1000) / 1000;
}

// Generate the mock trades
function generateTrades(count: number): BondTrade[] {
  const trades: BondTrade[] = [];
  const statuses: BondTrade['status'][] = ['PENDING', 'SETTLED', 'SETTLED', 'SETTLED', 'CANCELLED', 'FAILED'];
  
  for (let i = 1; i <= count; i++) {
    const bond = randomFrom(bonds);
    const tradeDate = randomRecentDate();
    const price = randomPrice(bond.basePrice);
    const quantity = Math.floor(Math.random() * 50 + 1) * 100000; // 100k to 5M in 100k increments
    const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
    
    trades.push({
      id: `TRD-${String(i).padStart(5, '0')}`,
      tradeDate,
      settlementDate: settlementDate(tradeDate),
      bondName: bond.name,
      isin: bond.isin,
      cusip: bond.cusip,
      direction,
      quantity,
      price,
      yield: randomYield(bond.baseYield),
      counterparty: randomFrom(counterparties),
      trader: randomFrom(traders),
      status: randomFrom(statuses),
      currency: bond.isin.startsWith('US') ? 'USD' : 
                bond.isin.startsWith('DE') ? 'EUR' :
                bond.isin.startsWith('GB') ? 'GBP' : 
                bond.isin.startsWith('JP') ? 'JPY' : 'USD',
      notionalValue: Math.round(quantity * price / 100),
    });
  }
  
  // Sort by trade date descending
  trades.sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  
  return trades;
}

// Generate 100 trades
export const bondTrades: BondTrade[] = generateTrades(100);

// Helper function to query trades
export interface TradeQuery {
  bondName?: string;
  isin?: string;
  direction?: 'BUY' | 'SELL';
  counterparty?: string;
  trader?: string;
  status?: BondTrade['status'];
  fromDate?: string;
  toDate?: string;
  minNotional?: number;
  maxNotional?: number;
}

export function queryTrades(query: TradeQuery): BondTrade[] {
  return bondTrades.filter(trade => {
    if (query.bondName && !trade.bondName.toLowerCase().includes(query.bondName.toLowerCase())) return false;
    if (query.isin && trade.isin !== query.isin) return false;
    if (query.direction && trade.direction !== query.direction) return false;
    if (query.counterparty && !trade.counterparty.toLowerCase().includes(query.counterparty.toLowerCase())) return false;
    if (query.trader && !trade.trader.toLowerCase().includes(query.trader.toLowerCase())) return false;
    if (query.status && trade.status !== query.status) return false;
    if (query.fromDate && trade.tradeDate < query.fromDate) return false;
    if (query.toDate && trade.tradeDate > query.toDate) return false;
    if (query.minNotional && trade.notionalValue < query.minNotional) return false;
    if (query.maxNotional && trade.notionalValue > query.maxNotional) return false;
    return true;
  });
}

// Helper function to get trade statistics
export interface TradeStats {
  totalTrades: number;
  totalNotional: number;
  buyCount: number;
  sellCount: number;
  avgPrice: number;
  avgYield: number;
  byStatus: Record<string, number>;
  byCounterparty: Record<string, number>;
  byBond: Record<string, number>;
  dailyVolume: Array<{ date: string; volume: number; count: number }>;
}

export function getTradeStats(trades: BondTrade[]): TradeStats {
  const byStatus: Record<string, number> = {};
  const byCounterparty: Record<string, number> = {};
  const byBond: Record<string, number> = {};
  const dailyVolumeMap: Record<string, { volume: number; count: number }> = {};
  
  let totalNotional = 0;
  let totalPrice = 0;
  let totalYield = 0;
  let buyCount = 0;
  let sellCount = 0;
  
  for (const trade of trades) {
    totalNotional += trade.notionalValue;
    totalPrice += trade.price;
    totalYield += trade.yield;
    
    if (trade.direction === 'BUY') buyCount++;
    else sellCount++;
    
    byStatus[trade.status] = (byStatus[trade.status] || 0) + 1;
    byCounterparty[trade.counterparty] = (byCounterparty[trade.counterparty] || 0) + 1;
    byBond[trade.bondName] = (byBond[trade.bondName] || 0) + 1;
    
    if (!dailyVolumeMap[trade.tradeDate]) {
      dailyVolumeMap[trade.tradeDate] = { volume: 0, count: 0 };
    }
    dailyVolumeMap[trade.tradeDate].volume += trade.notionalValue;
    dailyVolumeMap[trade.tradeDate].count += 1;
  }
  
  const dailyVolume = Object.entries(dailyVolumeMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    totalTrades: trades.length,
    totalNotional,
    buyCount,
    sellCount,
    avgPrice: trades.length > 0 ? Math.round(totalPrice / trades.length * 100) / 100 : 0,
    avgYield: trades.length > 0 ? Math.round(totalYield / trades.length * 100) / 100 : 0,
    byStatus,
    byCounterparty,
    byBond,
    dailyVolume,
  };
}

// Register bond trades as a data source
const bondTradesDataSource = createDataSource<BondTrade>({
  name: 'bond_trades',
  description: 'Bond trading data including Treasury, corporate, and sovereign bonds with counterparty and status information',
  
  filterSchema: z.object({
    bondName: z.string().optional().describe('Filter by bond name (partial match)'),
    isin: z.string().optional().describe('Filter by exact ISIN'),
    direction: z.enum(['BUY', 'SELL']).optional().describe('Filter by trade direction'),
    counterparty: z.string().optional().describe('Filter by counterparty name'),
    trader: z.string().optional().describe('Filter by trader name'),
    status: z.enum(['PENDING', 'SETTLED', 'CANCELLED', 'FAILED']).optional().describe('Filter by status'),
    fromDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
    toDate: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
  }),
  
  columns: [
    { key: 'id', label: 'ID' },
    { key: 'tradeDate', label: 'Trade Date' },
    { key: 'bondName', label: 'Bond' },
    { key: 'direction', label: 'Dir' },
    { key: 'quantity', label: 'Qty' },
    { key: 'price', label: 'Price' },
    { key: 'yield', label: 'Yield' },
    { key: 'counterparty', label: 'Counterparty' },
    { key: 'status', label: 'Status' },
    { key: 'notionalValue', label: 'Notional' },
  ],
  
  chartAggregations: [
    { key: 'byCounterparty', label: 'Trades by Counterparty', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'byBond', label: 'Trades by Bond', xKey: 'name', yKey: 'count', recommendedType: 'bar' },
    { key: 'byStatus', label: 'Trades by Status', xKey: 'name', yKey: 'count', recommendedType: 'pie' },
    { key: 'dailyVolume', label: 'Daily Volume', xKey: 'date', yKey: 'volume', recommendedType: 'line' },
    { key: 'buyVsSell', label: 'Buy vs Sell', xKey: 'name', yKey: 'count', recommendedType: 'pie' },
  ],
  
  query: (filters) => queryTrades(filters as TradeQuery),
  
  aggregate: (data, aggregationType) => {
    const stats = getTradeStats(data);
    
    switch (aggregationType) {
      case 'byCounterparty':
        return Object.entries(stats.byCounterparty)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      case 'byBond':
        return Object.entries(stats.byBond)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      case 'byStatus':
        return Object.entries(stats.byStatus)
          .map(([name, count]) => ({ name, count }));
      case 'dailyVolume':
        return stats.dailyVolume.map(d => ({
          date: d.date,
          volume: Math.round(d.volume / 1000000),
        }));
      case 'buyVsSell':
        return [
          { name: 'Buy', count: stats.buyCount },
          { name: 'Sell', count: stats.sellCount },
        ];
      default:
        return [];
    }
  },
  
  getSummary: (data) => {
    const stats = getTradeStats(data);
    return {
      totalTrades: stats.totalTrades,
      totalNotional: '$' + stats.totalNotional.toLocaleString(),
      buyCount: stats.buyCount,
      sellCount: stats.sellCount,
      avgPrice: stats.avgPrice,
      avgYield: stats.avgYield.toFixed(2) + '%',
    };
  },
});

registry.register(bondTradesDataSource);
