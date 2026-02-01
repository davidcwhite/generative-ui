# MCP Migration Guide

This document explains how to migrate from the current Vercel AI SDK tool setup to Model Context Protocol (MCP) services. The codebase already includes MCP server implementations that are not yet integrated.

## Table of Contents

1. [Introduction](#introduction)
2. [Current vs Target Architecture](#current-vs-target-architecture)
3. [Existing MCP Servers](#existing-mcp-servers)
4. [Deployment Options](#deployment-options)
5. [Migration Steps](#migration-steps)
6. [Code Examples](#code-examples)
7. [GPT-5 Compatibility](#gpt-5-compatibility)

---

## Introduction

### What is MCP?

Model Context Protocol (MCP) is an open standard for connecting AI models to external tools and data sources. It provides:

- **Protocol Standardization**: A consistent interface for tool discovery and invocation
- **Language Agnostic**: Servers can be written in any language
- **Reusability**: MCP servers can be shared across different AI applications
- **Separation of Concerns**: Tool logic is decoupled from the AI integration layer

### Current State

The codebase has **6 MCP servers** already implemented in `server/src/mcp/servers/`, but they are **not currently used**. Instead, tools are defined directly using the Vercel AI SDK's `tool()` function in `server/src/mcp/client.ts`.

### Why Migrate?

| Current Approach | MCP Approach |
|-----------------|--------------|
| Tools tightly coupled to Express server | Tools run as independent services |
| Must restart entire server to update tools | Update individual MCP servers independently |
| Single deployment unit | Can scale tool servers independently |
| Vercel AI SDK specific | Works with any MCP-compatible client |

---

## Current vs Target Architecture

### Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│                                                          │
│  ┌──────────────┐    ┌─────────────────────────────┐   │
│  │  streamText  │───>│  mcp/client.ts (Vercel SDK) │   │
│  │  (AI SDK)    │    │  - resolve_entity           │   │
│  └──────────────┘    │  - get_issuer_deals         │   │
│                      │  - get_allocations          │   │
│                      │  - etc.                     │   │
│                      └──────────────┬──────────────┘   │
│                                     │                   │
│                      ┌──────────────▼──────────────┐   │
│                      │     Data Layer              │   │
│                      │  mcp/data/*.ts              │   │
│                      └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Embedded Mode)

```
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│                                                          │
│  ┌──────────────┐    ┌─────────────────────────────┐   │
│  │  streamText  │───>│      MCP Client Adapter     │   │
│  │  (AI SDK)    │    │  (wraps MCP for AI SDK)     │   │
│  └──────────────┘    └──────────────┬──────────────┘   │
│                                     │ stdio            │
│                      ┌──────────────▼──────────────┐   │
│                      │   MCP Server Processes      │   │
│                      │  - mcp-entity-resolution    │   │
│                      │  - mcp-issuance             │   │
│                      │  - mcp-bookbuild            │   │
│                      │  - mcp-secondary            │   │
│                      └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Standalone Mode)

```
┌──────────────────────┐         ┌─────────────────────────┐
│    Express Server    │         │    MCP Server Cluster   │
│                      │         │                         │
│  ┌──────────────┐   │  HTTP   │  ┌───────────────────┐  │
│  │  streamText  │───┼────────>│  │ mcp-entity-res    │  │
│  │  (AI SDK)    │   │         │  ├───────────────────┤  │
│  └──────────────┘   │         │  │ mcp-issuance      │  │
│         │           │         │  ├───────────────────┤  │
│  ┌──────▼───────┐   │         │  │ mcp-bookbuild     │  │
│  │  MCP Client  │   │         │  ├───────────────────┤  │
│  │  (HTTP)      │   │         │  │ mcp-secondary     │  │
│  └──────────────┘   │         │  └───────────────────┘  │
└──────────────────────┘         └─────────────────────────┘
```

---

## Existing MCP Servers

The following MCP servers are already implemented but not integrated:

| Server | Location | Tools | Description |
|--------|----------|-------|-------------|
| **entity-resolution** | `mcp/servers/entity-resolution/` | `resolve_entity`, `get_entity_details` | Resolves company names to canonical IDs |
| **issuance** | `mcp/servers/issuance/` | `get_issuer_deals`, `get_peer_comparison`, `get_deal_detail` | Primary bond issuance data |
| **bookbuild** | `mcp/servers/bookbuild/` | `get_allocations`, `get_order_book_timeline` | Order book and allocation data |
| **secondary** | `mcp/servers/secondary/` | `get_performance`, `get_sector_curve`, `get_issuer_secondary_performance` | Secondary market performance |
| **investor** | `mcp/servers/investor/` | `get_participation_history` | Investor analysis |
| **export-audit** | `mcp/servers/export-audit/` | `generate_mandate_brief` | Document export with audit trail |

Each server:
- Is a standalone Node.js executable (shebang `#!/usr/bin/env node`)
- Uses stdio transport for communication
- Imports from the shared data layer (`mcp/data/*.ts`)
- Has a `main()` function that starts the server

---

## Deployment Options

### Option A: Embedded (Local with Project)

MCP servers run as child processes spawned by the main Express server.

**Pros:**
- Single deployment unit
- Simple infrastructure
- Good for development and single-tenant deployments
- No network latency between server and tools

**Cons:**
- All services share the same process resources
- Must restart main server to update MCP servers
- Harder to scale individual tools

**Best for:** Development, demos, single-tenant deployments

### Option B: Standalone Services

MCP servers run as separate services communicating over HTTP/SSE.

**Pros:**
- Independent scaling and deployment
- Can update tools without restarting main server
- Better resource isolation
- Can run MCP servers in different languages

**Cons:**
- More complex infrastructure
- Network latency between services
- Requires service discovery/configuration

**Best for:** Production, multi-tenant, microservices architecture

---

## Migration Steps

### Step 1: Update MCP Server Schemas for GPT-5 Compatibility

GPT-5 reasoning models require all properties to be in the `required` array. Update each MCP server's tool schemas:

**Before (breaks with GPT-5):**
```typescript
server.tool(
  'get_issuer_deals',
  {
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: { type: 'string' },
        limit: { type: 'number' },  // Optional
      },
      required: ['issuerId'],  // Missing 'limit'
    },
  },
  async (args) => { /* ... */ }
);
```

**After (GPT-5 compatible):**
```typescript
server.tool(
  'get_issuer_deals',
  {
    inputSchema: {
      type: 'object',
      properties: {
        issuerId: { 
          type: 'string',
          description: 'The canonical issuer ID'
        },
        limit: { 
          type: 'number',
          description: 'Maximum deals to return (use 10 for default)'
        },
      },
      required: ['issuerId', 'limit'],  // All fields required
    },
  },
  async (args) => {
    const { issuerId, limit = 10 } = args;  // Default in handler
    /* ... */
  }
);
```

### Step 2: Create MCP Client Module

Create a new file `server/src/mcp/mcp-client.ts`:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface MCPConnection {
  client: Client;
  process: ChildProcess;
}

const connections = new Map<string, MCPConnection>();

export async function connectToServer(serverName: string): Promise<Client> {
  if (connections.has(serverName)) {
    return connections.get(serverName)!.client;
  }

  const serverPath = path.join(
    import.meta.dirname,
    'servers',
    serverName,
    'index.js'
  );

  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  const transport = new StdioClientTransport({
    reader: serverProcess.stdout!,
    writer: serverProcess.stdin!,
  });

  const client = new Client({
    name: 'generative-ui-client',
    version: '1.0.0',
  });

  await client.connect(transport);

  connections.set(serverName, { client, process: serverProcess });

  return client;
}

export async function callTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = await connectToServer(serverName);
  const result = await client.callTool({ name: toolName, arguments: args });
  return result.content;
}

export async function disconnectAll(): Promise<void> {
  for (const [name, conn] of connections) {
    await conn.client.close();
    conn.process.kill();
    connections.delete(name);
  }
}
```

### Step 3: Create AI SDK Adapter

Create `server/src/mcp/mcp-tools.ts` to wrap MCP tools for the Vercel AI SDK:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { callTool } from './mcp-client.js';

// Map MCP server tools to Vercel AI SDK tools
export const mcpTools = {
  resolve_entity: tool({
    description: 'Resolve an entity name to canonical identifiers',
    parameters: z.object({
      query: z.string().describe('The entity name to resolve'),
      type: z.enum(['issuer', 'bond']).describe('Entity type'),
    }),
    execute: async (args) => {
      return callTool('entity-resolution', 'resolve_entity', args);
    },
  }),

  get_issuer_deals: tool({
    description: 'Get bond deals for a specific issuer',
    parameters: z.object({
      issuerId: z.string().describe('The canonical issuer ID'),
      limit: z.number().describe('Maximum deals to return (use 10 for default)'),
    }),
    execute: async (args) => {
      return callTool('issuance', 'get_issuer_deals', args);
    },
  }),

  get_allocations: tool({
    description: 'Get allocation breakdown for a deal',
    parameters: z.object({
      dealId: z.string().describe('The deal ID'),
    }),
    execute: async (args) => {
      return callTool('bookbuild', 'get_allocations', args);
    },
  }),

  get_performance: tool({
    description: 'Get secondary market performance for a bond',
    parameters: z.object({
      isin: z.string().describe('The ISIN of the bond'),
      days: z.number().describe('Number of days (use 30 for default)'),
    }),
    execute: async (args) => {
      return callTool('secondary', 'get_performance', args);
    },
  }),

  // Add remaining tools...
};
```

### Step 4: Update Express Server

Replace the direct tool imports with MCP tools:

```typescript
// Before
import { dcmTools } from './mcp/client.js';

// After
import { mcpTools } from './mcp/mcp-tools.js';
import { disconnectAll } from './mcp/mcp-client.js';

// Use MCP tools
const result = streamText({
  model: openai('gpt-4o'),
  system: buildDCMSystemPrompt(),
  messages,
  tools: mcpTools,
  maxSteps: 10,
});

// Cleanup on server shutdown
process.on('SIGTERM', async () => {
  await disconnectAll();
  process.exit(0);
});
```

### Step 5: Add Health Checks (Optional)

Add health check endpoints for MCP servers:

```typescript
app.get('/api/health/mcp', async (req, res) => {
  const servers = [
    'entity-resolution',
    'issuance', 
    'bookbuild',
    'secondary',
    'investor',
    'export-audit',
  ];

  const health = await Promise.all(
    servers.map(async (name) => {
      try {
        const client = await connectToServer(name);
        const tools = await client.listTools();
        return { name, status: 'healthy', tools: tools.tools.length };
      } catch (error) {
        return { name, status: 'unhealthy', error: String(error) };
      }
    })
  );

  const allHealthy = health.every((s) => s.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json({ servers: health });
});
```

---

## Code Examples

### Standalone Mode with HTTP Transport

For production deployments, use HTTP transport instead of stdio.

**MCP Server with HTTP (server/src/mcp/servers/issuance/http.ts):**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';

const app = express();
const server = new McpServer({
  name: 'mcp-issuance',
  version: '1.0.0',
});

// Register tools (same as before)
server.tool('get_issuer_deals', /* ... */);

// SSE endpoint for MCP
app.get('/mcp', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/messages', res);
  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  // Handle incoming messages
  await transport.handlePostMessage(req, res);
});

app.listen(3001, () => {
  console.log('MCP Issuance server running on port 3001');
});
```

**MCP Client with HTTP:**

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function connectHTTP(url: string): Promise<Client> {
  const transport = new SSEClientTransport(new URL(url));
  const client = new Client({
    name: 'generative-ui-client',
    version: '1.0.0',
  });
  await client.connect(transport);
  return client;
}

// Usage
const issuanceClient = await connectHTTP('http://mcp-issuance:3001/mcp');
const result = await issuanceClient.callTool({
  name: 'get_issuer_deals',
  arguments: { issuerId: 'bmw-ag', limit: 10 },
});
```

### Docker Compose for Standalone Mode

```yaml
version: '3.8'
services:
  api:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - MCP_ISSUANCE_URL=http://mcp-issuance:3001/mcp
      - MCP_BOOKBUILD_URL=http://mcp-bookbuild:3002/mcp
      - MCP_SECONDARY_URL=http://mcp-secondary:3003/mcp
    depends_on:
      - mcp-issuance
      - mcp-bookbuild
      - mcp-secondary

  mcp-issuance:
    build:
      context: ./server
      dockerfile: Dockerfile.mcp
    command: node dist/mcp/servers/issuance/http.js
    ports:
      - "3001:3001"

  mcp-bookbuild:
    build:
      context: ./server
      dockerfile: Dockerfile.mcp
    command: node dist/mcp/servers/bookbuild/http.js
    ports:
      - "3002:3002"

  mcp-secondary:
    build:
      context: ./server
      dockerfile: Dockerfile.mcp
    command: node dist/mcp/servers/secondary/http.js
    ports:
      - "3003:3003"
```

---

## GPT-5 Compatibility

GPT-5 and other reasoning models require stricter JSON Schema compliance:

1. **All properties must be in `required`**: Unlike GPT-4, GPT-5 rejects schemas with optional fields not in the required array.

2. **Use descriptions for defaults**: Since all fields are required, tell the model what default to use:
   ```typescript
   limit: z.number().describe('Number of results (use 10 for default)')
   ```

3. **Handle defaults in execute functions**:
   ```typescript
   execute: async ({ issuerId, limit = 10 }) => {
     // limit defaults to 10 if model sends undefined
   }
   ```

4. **Use empty strings for optional filters**:
   ```typescript
   sector: z.string().describe('Filter by sector (use "" for all)')
   ```

See the `gpt5-compatibility` branch for a complete example of these changes.

---

## Next Steps

1. **Start with Embedded Mode**: Migrate to MCP using stdio transport first
2. **Add Monitoring**: Implement health checks and logging
3. **Evaluate Standalone**: If scaling is needed, migrate to HTTP transport
4. **Consider Caching**: Add response caching at the MCP client level
5. **Security**: Implement authentication for standalone MCP servers
