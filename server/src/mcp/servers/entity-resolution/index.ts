#!/usr/bin/env node
// MCP Server: Entity Resolution
// Resolves entity names to canonical identifiers with disambiguation

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchIssuers, getIssuerById } from '../../data/issuers.js';
import type { ResolveEntityResult } from '../../types.js';

const server = new McpServer({
  name: 'mcp-entity-resolution',
  version: '1.0.0',
});

// Tool: resolve_entity
server.tool(
  'resolve_entity',
  {
    description: 'Resolve an entity name (issuer or bond) to canonical identifiers. Returns disambiguation options when multiple matches found.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The entity name to resolve (e.g., "BMW", "Volkswagen")',
        },
        type: {
          type: 'string',
          enum: ['issuer', 'bond'],
          description: 'The type of entity to resolve',
        },
      },
      required: ['query', 'type'],
    },
  },
  async (args: { query: string; type: 'issuer' | 'bond' }): Promise<ResolveEntityResult> => {
    const { query, type } = args;

    if (type === 'issuer') {
      const matches = searchIssuers(query);

      if (matches.length === 0) {
        return {
          matches: [],
          confidence: 'fuzzy',
          query,
        };
      }

      if (matches.length === 1 && matches[0].score >= 0.9) {
        return {
          matches: [matches[0].issuer],
          confidence: 'exact',
          query,
        };
      }

      if (matches[0].score >= 0.9 && (matches.length === 1 || matches[1].score < 0.7)) {
        return {
          matches: [matches[0].issuer],
          confidence: 'exact',
          query,
        };
      }

      // Multiple good matches - return for disambiguation
      return {
        matches: matches.slice(0, 5).map(m => m.issuer),
        confidence: 'ambiguous',
        query,
      };
    }

    // Bond resolution (simplified - search by ISIN prefix or name)
    // For MVP, we'll delegate to issuer resolution
    return {
      matches: [],
      confidence: 'fuzzy',
      query,
    };
  }
);

// Tool: get_entity_details
server.tool(
  'get_entity_details',
  {
    description: 'Get detailed information about a resolved entity by its canonical ID',
    inputSchema: {
      type: 'object',
      properties: {
        entityId: {
          type: 'string',
          description: 'The canonical entity ID (e.g., "bmw-ag")',
        },
        type: {
          type: 'string',
          enum: ['issuer', 'bond'],
          description: 'The type of entity',
        },
      },
      required: ['entityId', 'type'],
    },
  },
  async (args: { entityId: string; type: 'issuer' | 'bond' }) => {
    const { entityId, type } = args;

    if (type === 'issuer') {
      const issuer = getIssuerById(entityId);
      if (!issuer) {
        return { error: 'Issuer not found', entityId };
      }
      return { issuer };
    }

    return { error: 'Bond lookup not implemented in MVP', entityId };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
