#!/usr/bin/env node
// MCP Server: Bookbuilding
// Order book and allocation data for primary issuance

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { generateAllocationsForDeal } from '../../data/investors.js';
import { getDealById } from '../../data/deals.js';
import type { AllocationBreakdown, OrderEvent } from '../../types.js';

const server = new McpServer({
  name: 'mcp-bookbuild',
  version: '1.0.0',
});

// Tool: get_allocations
server.tool(
  'get_allocations',
  {
    description: 'Get allocation breakdown for a specific deal, including investor type and geography distribution',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'The deal ID to get allocations for',
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
    
    const allocations = generateAllocationsForDeal(dealId, deal.size);
    
    // Calculate breakdown by investor type
    const byTypeMap = new Map<string, number>();
    const byGeoMap = new Map<string, number>();
    let totalAllocated = 0;
    
    for (const alloc of allocations) {
      totalAllocated += alloc.allocatedSize;
      byTypeMap.set(alloc.investorType, (byTypeMap.get(alloc.investorType) || 0) + alloc.allocatedSize);
      byGeoMap.set(alloc.geography, (byGeoMap.get(alloc.geography) || 0) + alloc.allocatedSize);
    }
    
    const byType = Array.from(byTypeMap.entries())
      .map(([type, amount]) => ({
        type,
        amount,
        percentage: Math.round((amount / totalAllocated) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
    
    const byGeography = Array.from(byGeoMap.entries())
      .map(([geography, amount]) => ({
        geography,
        amount,
        percentage: Math.round((amount / totalAllocated) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
    
    const breakdown: AllocationBreakdown = { byType, byGeography };
    
    return {
      deal: {
        id: deal.id,
        issuer: deal.issuerName,
        size: deal.size,
        oversubscription: deal.oversubscription,
      },
      allocations: allocations.map(a => ({
        ...a,
        dealId,
      })),
      breakdown,
      summary: {
        totalInvestors: allocations.length,
        totalAllocated,
        avgFillRate: Math.round(allocations.reduce((sum, a) => sum + a.fillRate, 0) / allocations.length * 100),
      },
    };
  }
);

// Tool: get_order_book_timeline
server.tool(
  'get_order_book_timeline',
  {
    description: 'Get the order book build-up timeline for a deal (simulated)',
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
    
    // Generate simulated order book timeline
    const seed = dealId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rng = (n: number) => ((seed * (n + 1) * 9301 + 49297) % 233280) / 233280;
    
    const targetSize = deal.size * deal.oversubscription;
    const events: OrderEvent[] = [];
    
    // Morning announcement
    const announceDate = new Date(deal.announceDate);
    let cumulativeOrders = 0;
    let cumulativeSize = 0;
    
    // Generate events over the book-building period (typically 1-2 days)
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    
    for (let day = 0; day < 2; day++) {
      for (let i = 0; i < hours.length; i++) {
        const eventDate = new Date(announceDate);
        eventDate.setDate(eventDate.getDate() + day);
        
        const hourIndex = day * 8 + i;
        const progressFactor = (hourIndex + 1) / 16;
        const targetAtPoint = targetSize * progressFactor * (0.8 + rng(hourIndex) * 0.4);
        
        const newOrders = Math.floor(3 + rng(hourIndex + 100) * 8);
        const newSize = Math.max(0, targetAtPoint - cumulativeSize);
        
        cumulativeOrders += newOrders;
        cumulativeSize += newSize;
        
        let eventType: 'order' | 'revision' | 'guidance' = 'order';
        let description: string | undefined;
        
        if (day === 0 && i === 0) {
          eventType = 'guidance';
          description = `IPTs: ${deal.spread + 15}bps area`;
        } else if (day === 0 && i === 4) {
          eventType = 'guidance';
          description = `Guidance: ${deal.spread + 8}-${deal.spread + 12}bps`;
        } else if (day === 1 && i === 2 && deal.oversubscription > 2.5) {
          eventType = 'revision';
          description = `Revised guidance: ${deal.spread + 3}-${deal.spread + 7}bps`;
        }
        
        events.push({
          timestamp: `${eventDate.toISOString().split('T')[0]}T${hours[i]}:00Z`,
          cumulativeOrders,
          cumulativeSize: Math.round(cumulativeSize),
          eventType,
          description,
        });
        
        // Stop if we've reached near final size
        if (cumulativeSize >= targetSize * 0.95) break;
      }
    }
    
    // Determine momentum
    let momentum: string;
    if (deal.oversubscription >= 4) momentum = 'Very Strong';
    else if (deal.oversubscription >= 3) momentum = 'Strong';
    else if (deal.oversubscription >= 2) momentum = 'Good';
    else momentum = 'Moderate';
    
    return {
      deal: {
        id: deal.id,
        issuer: deal.issuerName,
        size: deal.size,
      },
      events,
      summary: {
        finalOrders: cumulativeOrders,
        finalSize: Math.round(cumulativeSize),
        oversubscription: deal.oversubscription,
        momentum,
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
