#!/usr/bin/env node
// MCP Server: Secondary
// Secondary market performance data - post-pricing performance, curves, liquidity

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  generateSecondaryPerformance, 
  calculateSpreadDrift, 
  generateSectorCurve,
  getPerformanceSummary 
} from '../../data/secondary.js';
import { deals } from '../../data/deals.js';
import { getIssuerById } from '../../data/issuers.js';

const server = new McpServer({
  name: 'mcp-secondary',
  version: '1.0.0',
});

// Tool: get_performance
server.tool(
  'get_performance',
  {
    description: 'Get secondary market performance for a bond (price, spread, volume over time)',
    inputSchema: {
      type: 'object',
      properties: {
        isin: {
          type: 'string',
          description: 'The ISIN of the bond',
        },
        days: {
          type: 'number',
          description: 'Number of days of performance data (default: 30, max: 90)',
        },
      },
      required: ['isin'],
    },
  },
  async (args: { isin: string; days?: number }) => {
    const { isin, days = 30 } = args;
    
    const deal = deals.find(d => d.isin === isin);
    if (!deal) {
      return { error: 'Bond not found', isin };
    }
    
    const performance = generateSecondaryPerformance(isin, Math.min(days, 90));
    const drift = calculateSpreadDrift(isin);
    const summary = getPerformanceSummary(isin);
    
    return {
      bond: {
        isin,
        issuer: deal.issuerName,
        coupon: deal.coupon,
        tenor: deal.tenor,
        pricingDate: deal.pricingDate,
        issueSpread: deal.spread,
        issuePrice: deal.reoffer,
      },
      performance,
      drift,
      summary,
      analysis: {
        trend: drift < -5 ? 'Tightening' : drift > 5 ? 'Widening' : 'Stable',
        driftBps: drift,
        interpretation: drift < -5 
          ? 'Bond has performed well post-issuance, spreads have tightened'
          : drift > 5 
            ? 'Bond has underperformed post-issuance, spreads have widened'
            : 'Bond trading close to issue levels',
      },
    };
  }
);

// Tool: get_sector_curve
server.tool(
  'get_sector_curve',
  {
    description: 'Get the credit curve for a sector and rating combination',
    inputSchema: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          description: 'The sector (e.g., "Automobiles", "Industrials", "Energy")',
        },
        rating: {
          type: 'string',
          description: 'The credit rating (e.g., "A", "BBB+", "AA-")',
        },
      },
      required: ['sector', 'rating'],
    },
  },
  async (args: { sector: string; rating: string }) => {
    const { sector, rating } = args;
    
    const { curve, benchmark } = generateSectorCurve(sector, rating);
    
    return {
      sector,
      rating,
      benchmark,
      curve,
      asOf: new Date().toISOString().split('T')[0],
    };
  }
);

// Tool: get_issuer_secondary_performance
server.tool(
  'get_issuer_secondary_performance',
  {
    description: 'Get secondary performance across all bonds for an issuer',
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: {
          type: 'string',
          description: 'The canonical issuer ID',
        },
      },
      required: ['issuerId'],
    },
  },
  async (args: { issuerId: string }) => {
    const { issuerId } = args;
    
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }
    
    const issuerDeals = deals.filter(d => d.issuerId === issuerId);
    
    const bondPerformance = issuerDeals.map(deal => {
      const summary = getPerformanceSummary(deal.isin);
      return {
        isin: deal.isin,
        tenor: deal.tenor,
        coupon: deal.coupon,
        pricingDate: deal.pricingDate,
        issueSpread: deal.spread,
        currentSpread: summary?.currentSpread || deal.spread,
        drift: summary?.drift || 0,
        currentPrice: summary?.currentPrice || deal.reoffer,
        priceChange: summary?.priceChange || 0,
      };
    });
    
    // Calculate aggregate metrics
    const avgDrift = bondPerformance.length > 0
      ? bondPerformance.reduce((sum, b) => sum + b.drift, 0) / bondPerformance.length
      : 0;
    
    return {
      issuer: {
        id: issuer.id,
        name: issuer.shortName,
        sector: issuer.sector,
      },
      bonds: bondPerformance,
      aggregate: {
        totalBonds: bondPerformance.length,
        avgDriftBps: Math.round(avgDrift),
        overallTrend: avgDrift < -3 ? 'Tightening' : avgDrift > 3 ? 'Widening' : 'Stable',
      },
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
