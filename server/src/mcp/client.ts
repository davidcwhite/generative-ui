// MCP Client Adapter for Vercel AI SDK
// Wraps MCP server tools for direct integration with streamText()

import { tool } from 'ai';
import { z } from 'zod';

// Import data layer directly (in production, these would be MCP server calls)
import { searchIssuers, getIssuerById, getIssuersBySector } from './data/issuers.js';
import { getDealsByIssuerId, getDealById, calculateDealSummary, getPeerDeals, getAllDeals, getMarketSummary } from './data/deals.js';
import { generateAllocationsForDeal, getParticipationHistory, calculateFlipScore, investors, getInvestorById } from './data/investors.js';
import { generateSecondaryPerformance, calculateSpreadDrift, generateSectorCurve, getPerformanceSummary } from './data/secondary.js';
import type { ResolveEntityResult, PeerComparison, AllocationBreakdown, MandateBrief, MandateBriefSection, Provenance } from './types.js';

// === Entity Resolution Tools ===

export const resolve_entity = tool({
  description: 'Resolve an entity name (issuer) to canonical identifiers. Returns disambiguation options when multiple matches found. ALWAYS call this first when the user mentions a company name.',
  parameters: z.object({
    query: z.string().describe('The entity name to resolve (e.g., "BMW", "Volkswagen")'),
    type: z.enum(['issuer', 'bond']).describe('The type of entity to resolve'),
  }),
  execute: async ({ query, type }): Promise<ResolveEntityResult> => {
    if (type === 'issuer') {
      const matches = searchIssuers(query);

      if (matches.length === 0) {
        return { matches: [], confidence: 'fuzzy', query };
      }

      if (matches.length === 1 && matches[0].score >= 0.9) {
        return { matches: [matches[0].issuer], confidence: 'exact', query };
      }

      if (matches[0].score >= 0.9 && (matches.length === 1 || matches[1].score < 0.7)) {
        return { matches: [matches[0].issuer], confidence: 'exact', query };
      }

      return { matches: matches.slice(0, 5).map(m => m.issuer), confidence: 'ambiguous', query };
    }

    return { matches: [], confidence: 'fuzzy', query };
  },
});

// === Issuance Tools ===

export const get_issuer_deals = tool({
  description: 'Get all bond deals for a specific issuer, including summary statistics. Use after resolving the issuer.',
  parameters: z.object({
    issuerId: z.string().describe('The canonical issuer ID (e.g., "bmw-ag")'),
    limit: z.number().optional().describe('Maximum number of deals to return'),
  }),
  execute: async ({ issuerId, limit }) => {
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }

    const issuerDeals = getDealsByIssuerId(issuerId, limit);
    const summary = calculateDealSummary(issuerDeals);

    return {
      issuer: {
        id: issuer.id,
        name: issuer.shortName,
        fullName: issuer.name,
        sector: issuer.sector,
        ratings: issuer.ratings,
      },
      deals: issuerDeals,
      summary,
    };
  },
});

export const get_peer_comparison = tool({
  description: 'Compare an issuer\'s issuance metrics against sector peers',
  parameters: z.object({
    issuerId: z.string().describe('The canonical issuer ID to compare'),
    sector: z.string().optional().describe('Override sector for comparison'),
  }),
  execute: async ({ issuerId, sector }) => {
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }

    const targetSector = sector || issuer.sector;
    const issuerDeals = getDealsByIssuerId(issuerId);
    const issuerSummary = calculateDealSummary(issuerDeals);
    const peerIssuers = getIssuersBySector(targetSector, issuerId);

    const peers = peerIssuers.map(peer => {
      const peerDeals = getDealsByIssuerId(peer.id);
      return {
        issuerId: peer.id,
        issuerName: peer.shortName,
        deals: peerDeals.slice(0, 3),
        summary: calculateDealSummary(peerDeals),
      };
    });

    const peerAvgNip = peers.length > 0 ? peers.reduce((sum, p) => sum + p.summary.avgNip, 0) / peers.length : 0;

    return {
      issuer: { id: issuer.id, name: issuer.shortName, sector: targetSector },
      issuerDeals: issuerDeals.slice(0, 5),
      issuerSummary,
      peers,
      comparison: {
        nipVsPeers: issuerSummary.avgNip < peerAvgNip
          ? `${Math.round(peerAvgNip - issuerSummary.avgNip)}bps tighter than peers`
          : issuerSummary.avgNip > peerAvgNip
            ? `${Math.round(issuerSummary.avgNip - peerAvgNip)}bps wider than peers`
            : 'In line with peers',
      },
    };
  },
});

// === Bookbuilding Tools ===

export const get_allocations = tool({
  description: 'Get allocation breakdown for a specific deal, including investor type and geography distribution',
  parameters: z.object({
    dealId: z.string().describe('The deal ID to get allocations for'),
  }),
  execute: async ({ dealId }) => {
    const deal = getDealById(dealId);
    if (!deal) {
      return { error: 'Deal not found', dealId };
    }

    const allocations = generateAllocationsForDeal(dealId, deal.size);

    const byTypeMap = new Map<string, number>();
    const byGeoMap = new Map<string, number>();
    let totalAllocated = 0;

    for (const alloc of allocations) {
      totalAllocated += alloc.allocatedSize;
      byTypeMap.set(alloc.investorType, (byTypeMap.get(alloc.investorType) || 0) + alloc.allocatedSize);
      byGeoMap.set(alloc.geography, (byGeoMap.get(alloc.geography) || 0) + alloc.allocatedSize);
    }

    const byType = Array.from(byTypeMap.entries())
      .map(([type, amount]) => ({ type, amount, percentage: Math.round((amount / totalAllocated) * 100) }))
      .sort((a, b) => b.amount - a.amount);

    const byGeography = Array.from(byGeoMap.entries())
      .map(([geography, amount]) => ({ geography, amount, percentage: Math.round((amount / totalAllocated) * 100) }))
      .sort((a, b) => b.amount - a.amount);

    return {
      deal: { id: deal.id, issuer: deal.issuerName, size: deal.size, oversubscription: deal.oversubscription },
      allocations: allocations.map(a => ({ ...a, dealId })),
      breakdown: { byType, byGeography },
      summary: {
        totalInvestors: allocations.length,
        totalAllocated,
        avgFillRate: Math.round(allocations.reduce((sum, a) => sum + a.fillRate, 0) / allocations.length * 100),
      },
    };
  },
});

// === Secondary Tools ===

export const get_performance = tool({
  description: 'Get secondary market performance for a bond (price, spread, volume over time)',
  parameters: z.object({
    isin: z.string().describe('The ISIN of the bond'),
    days: z.number().optional().describe('Number of days of performance data (default: 30)'),
  }),
  execute: async ({ isin, days = 30 }) => {
    const { deals } = await import('./data/deals.js');
    const deal = deals.find((d: { isin: string }) => d.isin === isin);
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
        issueSpread: deal.spread,
        issuePrice: deal.reoffer,
      },
      performance,
      drift,
      summary,
      analysis: {
        trend: drift < -5 ? 'Tightening' : drift > 5 ? 'Widening' : 'Stable',
        interpretation: drift < -5
          ? 'Bond has performed well post-issuance'
          : drift > 5
            ? 'Bond has underperformed post-issuance'
            : 'Bond trading close to issue levels',
      },
    };
  },
});

// === Investor Tools ===

export const get_participation_history = tool({
  description: 'Get participation history for investors in an issuer\'s deals',
  parameters: z.object({
    issuerId: z.string().describe('The issuer ID to get investor participation for'),
  }),
  execute: async ({ issuerId }) => {
    const participations = getParticipationHistory(undefined, issuerId);

    const holdCount = participations.filter(p => p.behaviour === 'hold').length;
    const flipCount = participations.filter(p => p.behaviour === 'flip').length;

    return {
      issuerId,
      participations: participations.slice(0, 15),
      summary: {
        totalParticipations: participations.length,
        holdPercentage: Math.round((holdCount / participations.length) * 100),
        flipPercentage: Math.round((flipCount / participations.length) * 100),
      },
    };
  },
});

// === Export Tools ===

export const generate_mandate_brief = tool({
  description: 'Generate a comprehensive mandate brief document for an issuer with full data provenance. Use this when the user wants to export or create a pitch document.',
  parameters: z.object({
    issuerId: z.string().describe('The issuer ID to generate the brief for'),
    sections: z.array(z.string()).optional().describe('Sections: "overview", "issuance_history", "peer_comparison", "investor_analysis", "secondary_performance"'),
  }),
  execute: async ({ issuerId, sections = ['overview', 'issuance_history', 'peer_comparison', 'investor_analysis', 'secondary_performance'] }) => {
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }

    const deals = getDealsByIssuerId(issuerId);
    const summary = calculateDealSummary(deals);
    const sources: string[] = [];
    const briefSections: MandateBriefSection[] = [];

    if (sections.includes('overview')) {
      sources.push('mcp-entity-resolution');
      briefSections.push({
        title: 'Issuer Overview',
        content: `${issuer.name} (${issuer.shortName}) is a ${issuer.sector} company based in ${issuer.country}. ` +
          `Credit ratings: ${issuer.ratings.map(r => `${r.agency}: ${r.rating}`).join(', ')}.`,
        dataPoints: [
          { field: 'Legal Name', value: issuer.name },
          { field: 'LEI', value: issuer.lei },
          { field: 'Sector', value: issuer.sector },
          { field: 'Country', value: issuer.country },
        ],
      });
    }

    if (sections.includes('issuance_history')) {
      sources.push('mcp-issuance');
      briefSections.push({
        title: 'Issuance History',
        content: `${issuer.shortName} has completed ${summary.totalDeals} bond issuances, ` +
          `raising €${summary.totalRaised.toLocaleString()}M. Average NIP: ${summary.avgNip}bps.`,
        dataPoints: deals.slice(0, 5).map(d => ({
          deal: `${d.coupon}% ${d.tenor}`,
          date: d.pricingDate,
          size: `€${d.size}M`,
          spread: `${d.spread}bps`,
        })),
      });
    }

    if (sections.includes('peer_comparison')) {
      sources.push('mcp-issuance');
      briefSections.push({
        title: 'Peer Comparison',
        content: `Compared to ${issuer.sector} sector peers, ${issuer.shortName}'s average NIP of ${summary.avgNip}bps ` +
          `and oversubscription of ${summary.avgOversubscription}x reflects strong investor demand.`,
      });
    }

    if (sections.includes('investor_analysis') && deals.length > 0) {
      sources.push('mcp-bookbuild', 'mcp-investor');
      const latestDeal = deals[0];
      const allocations = generateAllocationsForDeal(latestDeal.id, latestDeal.size);
      briefSections.push({
        title: 'Investor Analysis',
        content: `Most recent deal attracted ${allocations.length} institutional investors with ${latestDeal.oversubscription}x oversubscription.`,
      });
    }

    if (sections.includes('secondary_performance') && deals.length > 0) {
      sources.push('mcp-secondary');
      briefSections.push({
        title: 'Secondary Performance',
        content: `${issuer.shortName}'s bonds have generally performed well in the secondary market.`,
      });
    }

    const brief: MandateBrief = {
      issuerId,
      issuerName: issuer.shortName,
      generatedAt: new Date().toISOString(),
      sections: briefSections,
      provenance: {
        sources,
        timestamp: new Date().toISOString(),
        queryContext: `Mandate brief for ${issuer.shortName}`,
      },
    };

    return {
      brief,
      exportFormats: ['pdf', 'pptx', 'xlsx', 'email'],
    };
  },
});

// === Market Overview Tools ===

export const get_market_deals = tool({
  description: 'Get recent bond deals across all issuers. Use when user asks for market overview, all issuance, supply data, or recent deals WITHOUT specifying a specific issuer. Does NOT require an issuer name.',
  parameters: z.object({
    limit: z.number().optional().describe('Number of deals to return (default: 10, max: 50)'),
    sector: z.string().optional().describe('Filter by sector (e.g., "Automotive", "Energy", "Industrial")'),
    currency: z.string().optional().describe('Filter by currency (e.g., "EUR", "USD")'),
  }),
  execute: async ({ limit = 10, sector, currency }) => {
    const dealList = getAllDeals({
      limit: Math.min(limit, 50),
      sector,
      currency,
      sortBy: 'date',
    });

    const summary = getMarketSummary(dealList);

    return {
      deals: dealList,
      summary,
      filters: {
        sector: sector || 'All',
        currency: currency || 'All',
        showing: dealList.length,
      },
    };
  },
});

// Export all DCM tools as a combined object
export const dcmTools = {
  resolve_entity,
  get_issuer_deals,
  get_peer_comparison,
  get_allocations,
  get_performance,
  get_participation_history,
  generate_mandate_brief,
  get_market_deals,
};
