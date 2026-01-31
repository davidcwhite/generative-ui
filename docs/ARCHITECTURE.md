# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
│                                                             │
│  ┌───────────┐    ┌──────────────────────────────────────┐ │
│  │ Password  │───▶│           Chat Interface              │ │
│  │  Screen   │    │  ┌─────────────────────────────────┐ │ │
│  └───────────┘    │  │     DCM UI Components           │ │ │
│                   │  │ EntityPicker | IssuerTimeline   │ │ │
│                   │  │ ComparableDeals | Allocations   │ │ │
│                   │  │ Performance | Export | Market   │ │ │
│                   │  └─────────────────────────────────┘ │ │
│                   └──────────────────────────────────────┘ │
└─────────────────────────────┬───────────────────────────────┘
                              │ SSE Stream
┌─────────────────────────────┴───────────────────────────────┐
│                     Server (Express)                         │
│                                                              │
│  POST /api/auth/verify     POST /api/dcm/chat               │
│         │                         │                          │
│         ▼                         ▼                          │
│  ┌─────────────┐          ┌─────────────────┐               │
│  │ APP_PASSWORD│          │  OpenAI GPT-4o  │               │
│  │   Check     │          │  + DCM Tools    │               │
│  └─────────────┘          └────────┬────────┘               │
│                                    │                         │
│                           ┌────────▼────────┐               │
│                           │   Tool Handler  │               │
│                           │  resolve_entity │               │
│                           │  get_issuer_deals│              │
│                           │  get_peer_comparison│           │
│                           │  get_allocations │              │
│                           │  get_performance │              │
│                           │  generate_mandate_brief│        │
│                           │  get_market_deals│              │
│                           └─────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

## Request Flow

1. **Authentication**: Client checks localStorage for auth state. If not authenticated, shows password screen. Validates via `POST /api/auth/verify`.

2. **Chat Message**: User sends message via `POST /api/dcm/chat`. Server streams response using SSE.

3. **Tool Execution**: AI decides which tools to call based on user intent. Tools execute and return structured data.

4. **UI Rendering**: Client receives tool results and renders appropriate DCM components based on tool name.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/verify` | POST | Validate password |
| `/api/dcm/chat` | POST | DCM assistant chat (SSE stream) |
| `/api/chat` | POST | General data assistant (SSE stream) |

## Tool Execution

Tools are defined with Zod schemas and executed server-side:

```typescript
// Tool definition pattern
const tool = {
  description: "What the tool does",
  parameters: z.object({ ... }),
  execute: async (args) => { ... }
}
```

The AI receives tool results and can:
- Call additional tools based on results
- Generate text responses
- Request user input via client-side tools

## Component Registry

Client maps tool names to React components:

```typescript
// Simplified pattern
switch (toolName) {
  case 'resolve_entity': return <EntityPicker {...result} />;
  case 'get_issuer_deals': return <IssuerTimeline {...result} />;
  case 'get_peer_comparison': return <ComparableDealsPanel {...result} />;
  // ...
}
```

## Data Flow

```
User Query
    │
    ▼
┌─────────────────┐
│ resolve_entity  │──▶ Disambiguate issuer name
└────────┬────────┘
         │ issuerId
         ▼
┌─────────────────┐
│ get_issuer_deals│──▶ Fetch deal history
└────────┬────────┘
         │ deals[]
         ▼
┌─────────────────┐
│ UI Component    │──▶ Render IssuerTimeline
└─────────────────┘
```

## Key Files

| Path | Purpose |
|------|---------|
| `server/src/index.ts` | Express server, endpoints, system prompts |
| `server/src/mcp/client.ts` | DCM tool definitions |
| `client/src/App.tsx` | Chat UI, auth, component routing |
| `client/src/components/dcm/` | DCM-specific UI components |
