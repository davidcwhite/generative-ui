#!/usr/bin/env node
// MCP Server: Export & Audit
// Generate exportable documents with full provenance and audit trail

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getIssuerById } from '../../data/issuers.js';
import { getDealsByIssuerId, calculateDealSummary, getPeerDeals } from '../../data/deals.js';
import { generateAllocationsForDeal } from '../../data/investors.js';
import { getPerformanceSummary } from '../../data/secondary.js';
import type { MandateBrief, MandateBriefSection, Provenance } from '../../types.js';

const server = new McpServer({
  name: 'mcp-export-audit',
  version: '1.0.0',
});

// Tool: generate_mandate_brief
server.tool(
  'generate_mandate_brief',
  {
    description: 'Generate a comprehensive mandate brief document for an issuer with full data provenance',
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: {
          type: 'string',
          description: 'The issuer ID to generate the brief for',
        },
        sections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Sections to include: "overview", "issuance_history", "peer_comparison", "investor_analysis", "secondary_performance", "recommendations"',
        },
      },
      required: ['issuerId'],
    },
  },
  async (args: { issuerId: string; sections?: string[] }) => {
    const { issuerId, sections = ['overview', 'issuance_history', 'peer_comparison', 'investor_analysis', 'secondary_performance'] } = args;
    
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }
    
    const deals = getDealsByIssuerId(issuerId);
    const summary = calculateDealSummary(deals);
    const peerDeals = getPeerDeals(issuerId);
    
    const sources: string[] = [];
    const briefSections: MandateBriefSection[] = [];
    
    // Overview section
    if (sections.includes('overview')) {
      sources.push('mcp-entity-resolution');
      briefSections.push({
        title: 'Issuer Overview',
        content: `${issuer.name} (${issuer.shortName}) is a ${issuer.sector} company based in ${issuer.country}. ` +
                 `Current credit ratings: ${issuer.ratings.map(r => `${r.agency}: ${r.rating}`).join(', ')}.`,
        dataPoints: [
          { field: 'Legal Name', value: issuer.name },
          { field: 'LEI', value: issuer.lei },
          { field: 'Sector', value: issuer.sector },
          { field: 'Country', value: issuer.country },
        ],
      });
    }
    
    // Issuance History section
    if (sections.includes('issuance_history')) {
      sources.push('mcp-issuance');
      briefSections.push({
        title: 'Issuance History',
        content: `${issuer.shortName} has completed ${summary.totalDeals} bond issuances, ` +
                 `raising a total of €${summary.totalRaised.toLocaleString()}M. ` +
                 `Average tenor: ${summary.avgTenor}, average NIP: ${summary.avgNip}bps, ` +
                 `average oversubscription: ${summary.avgOversubscription}x.`,
        dataPoints: deals.slice(0, 5).map(d => ({
          deal: `${d.coupon}% ${d.tenor}`,
          date: d.pricingDate,
          size: `€${d.size}M`,
          spread: `${d.spread}bps`,
          oversubscription: `${d.oversubscription}x`,
        })),
      });
    }
    
    // Peer Comparison section
    if (sections.includes('peer_comparison')) {
      sources.push('mcp-issuance');
      const peerSummaries = new Map<string, typeof summary>();
      for (const deal of peerDeals) {
        if (!peerSummaries.has(deal.issuerId)) {
          peerSummaries.set(deal.issuerId, calculateDealSummary(peerDeals.filter(d => d.issuerId === deal.issuerId)));
        }
      }
      
      briefSections.push({
        title: 'Peer Comparison',
        content: `Compared to ${issuer.sector} sector peers, ${issuer.shortName}'s average NIP of ${summary.avgNip}bps ` +
                 `and oversubscription of ${summary.avgOversubscription}x reflects strong investor demand.`,
        dataPoints: Array.from(peerSummaries.entries()).slice(0, 4).map(([id, s]) => {
          const peerIssuer = getIssuerById(id);
          return {
            issuer: peerIssuer?.shortName || id,
            deals: s.totalDeals,
            avgNip: `${s.avgNip}bps`,
            avgOversubscription: `${s.avgOversubscription}x`,
          };
        }),
      });
    }
    
    // Investor Analysis section
    if (sections.includes('investor_analysis') && deals.length > 0) {
      sources.push('mcp-bookbuild', 'mcp-investor');
      const latestDeal = deals[0];
      const allocations = generateAllocationsForDeal(latestDeal.id, latestDeal.size);
      
      // Aggregate by type
      const byType = new Map<string, number>();
      for (const alloc of allocations) {
        byType.set(alloc.investorType, (byType.get(alloc.investorType) || 0) + alloc.allocatedSize);
      }
      
      briefSections.push({
        title: 'Investor Analysis',
        content: `Most recent deal (${latestDeal.coupon}% ${latestDeal.tenor}) attracted ${allocations.length} institutional investors. ` +
                 `The book was ${latestDeal.oversubscription}x oversubscribed with strong participation from Asset Managers and Insurance accounts.`,
        dataPoints: Array.from(byType.entries()).map(([type, amount]) => ({
          type,
          allocated: `€${amount}M`,
          share: `${Math.round(amount / latestDeal.size * 100)}%`,
        })),
      });
    }
    
    // Secondary Performance section
    if (sections.includes('secondary_performance') && deals.length > 0) {
      sources.push('mcp-secondary');
      const performanceData = deals.slice(0, 3).map(d => {
        const perf = getPerformanceSummary(d.isin);
        return {
          bond: `${d.coupon}% ${d.tenor}`,
          issueSpread: `${d.spread}bps`,
          currentSpread: perf ? `${perf.currentSpread}bps` : 'N/A',
          drift: perf ? `${perf.drift > 0 ? '+' : ''}${perf.drift}bps` : 'N/A',
          trend: perf ? (perf.drift < -3 ? 'Tightening' : perf.drift > 3 ? 'Widening' : 'Stable') : 'N/A',
        };
      });
      
      briefSections.push({
        title: 'Secondary Performance',
        content: `${issuer.shortName}'s bonds have generally performed well in the secondary market, ` +
                 `with spreads stable to tighter since issuance.`,
        dataPoints: performanceData,
      });
    }
    
    const provenance: Provenance = {
      sources,
      timestamp: new Date().toISOString(),
      queryContext: `Mandate brief for ${issuer.shortName}`,
    };
    
    const brief: MandateBrief = {
      issuerId,
      issuerName: issuer.shortName,
      generatedAt: new Date().toISOString(),
      sections: briefSections,
      provenance,
    };
    
    return {
      brief,
      exportFormats: ['pdf', 'pptx', 'xlsx', 'email'],
      auditTrail: {
        generated: new Date().toISOString(),
        sources: sources.length,
        dataPoints: briefSections.reduce((sum, s) => sum + (s.dataPoints?.length || 0), 0),
      },
    };
  }
);

// Tool: export_to_format
server.tool(
  'export_to_format',
  {
    description: 'Export a generated document to a specific format (simulated in MVP)',
    inputSchema: {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          description: 'Type of document (e.g., "mandate_brief")',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'pptx', 'xlsx', 'email'],
          description: 'Export format',
        },
        issuerId: {
          type: 'string',
          description: 'The issuer ID',
        },
      },
      required: ['documentType', 'format', 'issuerId'],
    },
  },
  async (args: { documentType: string; format: string; issuerId: string }) => {
    const { documentType, format, issuerId } = args;
    
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }
    
    // In MVP, we simulate the export
    const filename = `${issuer.shortName.replace(/\s+/g, '_')}_${documentType}_${new Date().toISOString().split('T')[0]}.${format}`;
    
    return {
      status: 'success',
      message: `Document ready for export as ${format.toUpperCase()}`,
      filename,
      format,
      documentType,
      issuer: issuer.shortName,
      note: 'In production, this would generate and return a download link or send email.',
      auditEntry: {
        action: 'export',
        format,
        timestamp: new Date().toISOString(),
        documentType,
        issuerId,
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
