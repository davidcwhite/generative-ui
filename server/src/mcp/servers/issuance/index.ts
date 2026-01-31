#!/usr/bin/env node
// MCP Server: Issuance
// Primary bond issuance data - deals, peer comparisons, NIP calculations

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  getDealsByIssuerId, 
  getDealById, 
  calculateDealSummary,
  getPeerDeals,
  deals 
} from '../../data/deals.js';
import { getIssuerById, getIssuersBySector } from '../../data/issuers.js';
import type { PeerComparison } from '../../types.js';

const server = new McpServer({
  name: 'mcp-issuance',
  version: '1.0.0',
});

// Tool: get_issuer_deals
server.tool(
  'get_issuer_deals',
  {
    description: 'Get all bond deals for a specific issuer, including summary statistics',
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: {
          type: 'string',
          description: 'The canonical issuer ID (e.g., "bmw-ag")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of deals to return (default: all)',
        },
      },
      required: ['issuerId'],
    },
  },
  async (args: { issuerId: string; limit?: number }) => {
    const { issuerId, limit } = args;
    
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
  }
);

// Tool: get_peer_comparison
server.tool(
  'get_peer_comparison',
  {
    description: 'Compare an issuer\'s issuance metrics against sector peers',
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: {
          type: 'string',
          description: 'The canonical issuer ID to compare',
        },
        sector: {
          type: 'string',
          description: 'Override sector for comparison (default: issuer\'s sector)',
        },
      },
      required: ['issuerId'],
    },
  },
  async (args: { issuerId: string; sector?: string }) => {
    const { issuerId, sector } = args;
    
    const issuer = getIssuerById(issuerId);
    if (!issuer) {
      return { error: 'Issuer not found', issuerId };
    }
    
    const targetSector = sector || issuer.sector;
    const issuerDeals = getDealsByIssuerId(issuerId);
    const issuerSummary = calculateDealSummary(issuerDeals);
    
    // Get peer issuers in the same sector
    const peerIssuers = getIssuersBySector(targetSector, issuerId);
    
    const peers = peerIssuers.map(peer => {
      const peerDeals = getDealsByIssuerId(peer.id);
      const peerSummary = calculateDealSummary(peerDeals);
      return {
        issuerId: peer.id,
        issuerName: peer.shortName,
        deals: peerDeals.slice(0, 3), // Top 3 recent deals
        summary: peerSummary,
      };
    });
    
    // Calculate comparison metrics
    const peerAvgNip = peers.length > 0 
      ? peers.reduce((sum, p) => sum + p.summary.avgNip, 0) / peers.length 
      : 0;
    const peerAvgSize = peers.length > 0 
      ? peers.reduce((sum, p) => sum + (p.summary.totalRaised / Math.max(p.summary.totalDeals, 1)), 0) / peers.length 
      : 0;
    const issuerAvgSize = issuerSummary.totalDeals > 0 
      ? issuerSummary.totalRaised / issuerSummary.totalDeals 
      : 0;
    
    const comparison: PeerComparison = {
      issuer: {
        deals: issuerDeals,
        summary: issuerSummary,
      },
      peers,
      comparison: {
        nipVsPeers: issuerSummary.avgNip < peerAvgNip 
          ? `${Math.round(peerAvgNip - issuerSummary.avgNip)}bps tighter than peers` 
          : issuerSummary.avgNip > peerAvgNip 
            ? `${Math.round(issuerSummary.avgNip - peerAvgNip)}bps wider than peers`
            : 'In line with peers',
        sizeVsPeers: issuerAvgSize > peerAvgSize 
          ? `${Math.round((issuerAvgSize / peerAvgSize - 1) * 100)}% larger average deal size` 
          : `${Math.round((1 - issuerAvgSize / peerAvgSize) * 100)}% smaller average deal size`,
        frequencyVsPeers: issuerSummary.totalDeals > 0 
          ? `${issuerSummary.totalDeals} deals in period` 
          : 'No recent issuance',
      },
    };
    
    return {
      issuer: {
        id: issuer.id,
        name: issuer.shortName,
        sector: targetSector,
      },
      comparison,
    };
  }
);

// Tool: get_deal_detail
server.tool(
  'get_deal_detail',
  {
    description: 'Get detailed information about a specific deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'The deal ID',
        },
      },
      required: ['dealId'],
    },
  },
  async (args: { dealId: string }) => {
    const { dealId } = args;
    
    const deal = getDealById(dealId);
    if (!deal) {
      return { error: 'Deal not found', dealId };
    }
    
    const issuer = getIssuerById(deal.issuerId);
    
    return {
      deal,
      issuer: issuer ? {
        id: issuer.id,
        name: issuer.shortName,
        ratings: issuer.ratings,
      } : null,
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
