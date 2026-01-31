#!/usr/bin/env node
// MCP Server: Investor
// Investor participation history and behavior analytics

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  investors, 
  getInvestorById, 
  getParticipationHistory,
  calculateFlipScore 
} from '../../data/investors.js';

const server = new McpServer({
  name: 'mcp-investor',
  version: '1.0.0',
});

// Tool: get_participation_history
server.tool(
  'get_participation_history',
  {
    description: 'Get participation history for an investor or across an issuer\'s deals',
    inputSchema: {
      type: 'object',
      properties: {
        investorId: {
          type: 'string',
          description: 'Filter by investor ID (optional)',
        },
        issuerId: {
          type: 'string',
          description: 'Filter by issuer ID (optional)',
        },
      },
    },
  },
  async (args: { investorId?: string; issuerId?: string }) => {
    const { investorId, issuerId } = args;
    
    if (!investorId && !issuerId) {
      return { error: 'Either investorId or issuerId must be provided' };
    }
    
    const participations = getParticipationHistory(investorId, issuerId);
    
    // If filtering by investor, include investor details and flip score
    let investorDetails = null;
    let flipScore = null;
    if (investorId) {
      const investor = getInvestorById(investorId);
      if (investor) {
        investorDetails = {
          id: investor.id,
          name: investor.name,
          type: investor.type,
          geography: investor.geography,
          aum: investor.aum,
        };
        flipScore = calculateFlipScore(investorId);
      }
    }
    
    // Calculate behavior breakdown
    const holdCount = participations.filter(p => p.behaviour === 'hold').length;
    const partialFlipCount = participations.filter(p => p.behaviour === 'partial_flip').length;
    const flipCount = participations.filter(p => p.behaviour === 'flip').length;
    
    return {
      investor: investorDetails,
      flipScore,
      participations: participations.slice(0, 20), // Limit to 20 most recent
      summary: {
        totalParticipations: participations.length,
        behaviourBreakdown: {
          hold: holdCount,
          partialFlip: partialFlipCount,
          flip: flipCount,
        },
        avgFillRate: participations.length > 0
          ? Math.round(participations.reduce((sum, p) => sum + p.fillRate, 0) / participations.length * 100)
          : 0,
        avgHoldPeriod: participations.length > 0
          ? Math.round(participations.reduce((sum, p) => sum + p.heldDays, 0) / participations.length)
          : 0,
      },
    };
  }
);

// Tool: get_investor_list
server.tool(
  'get_investor_list',
  {
    description: 'Get list of investors, optionally filtered by type or geography',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by investor type (e.g., "Asset Manager", "Insurance")',
        },
        geography: {
          type: 'string',
          description: 'Filter by geography (e.g., "US", "Germany")',
        },
      },
    },
  },
  async (args: { type?: string; geography?: string }) => {
    const { type, geography } = args;
    
    let filtered = [...investors];
    
    if (type) {
      filtered = filtered.filter(i => i.type === type);
    }
    if (geography) {
      filtered = filtered.filter(i => i.geography === geography);
    }
    
    return {
      investors: filtered.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        geography: i.geography,
        aum: i.aum,
        focusSectors: i.focusSectors,
        flipScore: calculateFlipScore(i.id),
      })),
      total: filtered.length,
    };
  }
);

// Tool: get_top_investors_for_issuer
server.tool(
  'get_top_investors_for_issuer',
  {
    description: 'Get the top investors who have participated in an issuer\'s deals',
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: {
          type: 'string',
          description: 'The issuer ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of investors to return (default: 10)',
        },
      },
      required: ['issuerId'],
    },
  },
  async (args: { issuerId: string; limit?: number }) => {
    const { issuerId, limit = 10 } = args;
    
    const participations = getParticipationHistory(undefined, issuerId);
    
    // Aggregate by investor
    const investorMap = new Map<string, {
      investorId: string;
      investorName: string;
      participationCount: number;
      totalAllocated: number;
      avgFillRate: number;
      behaviours: string[];
    }>();
    
    for (const p of participations) {
      const investor = investors.find(i => {
        const history = getParticipationHistory(i.id);
        return history.some(h => h.dealId === p.dealId);
      });
      
      if (investor) {
        const existing = investorMap.get(investor.id);
        if (existing) {
          existing.participationCount++;
          existing.totalAllocated += p.allocatedSize;
          existing.behaviours.push(p.behaviour);
        } else {
          investorMap.set(investor.id, {
            investorId: investor.id,
            investorName: investor.name,
            participationCount: 1,
            totalAllocated: p.allocatedSize,
            avgFillRate: p.fillRate,
            behaviours: [p.behaviour],
          });
        }
      }
    }
    
    const topInvestors = Array.from(investorMap.values())
      .sort((a, b) => b.totalAllocated - a.totalAllocated)
      .slice(0, limit)
      .map(i => ({
        ...i,
        flipScore: calculateFlipScore(i.investorId),
        dominantBehaviour: i.behaviours.filter(b => b === 'hold').length > i.behaviours.length / 2 ? 'hold' : 
                          i.behaviours.filter(b => b === 'flip').length > i.behaviours.length / 2 ? 'flip' : 'mixed',
      }));
    
    return {
      issuerId,
      topInvestors,
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
