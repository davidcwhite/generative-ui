# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (React)                                │
│                                                                      │
│  ┌───────────┐    ┌─────────────────────────────────────────────┐   │
│  │ Password  │───▶│              Main App Shell                  │   │
│  │  Screen   │    │  ┌─────────┐  ┌─────────────────────────┐   │   │
│  └───────────┘    │  │ Rail    │  │  View Router            │   │   │
│                   │  │ Bar     │  │  ├─ Canvas (Chat)       │   │   │
│                   │  │ ├─ +    │  │  │  └─ DCM Components   │   │   │
│                   │  │ ├─ ⏱    │  │  └─ Data (Dashboard)    │   │   │
│                   │  │ └─ 📊   │  │     └─ Tabbed Views     │   │   │
│                   │  └─────────┘  └─────────────────────────┘   │   │
│                   │  ┌─────────────────────────────────────────┐│   │
│                   │  │ History Flyover (on hover)              ││   │
│                   │  └─────────────────────────────────────────┘│   │
│                   └─────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ SSE Stream
┌─────────────────────────────────┴───────────────────────────────────┐
│                        Server (Express)                              │
│                                                                      │
│  POST /api/auth/verify     POST /api/dcm/chat    POST /api/chat     │
│         │                         │                    │             │
│         ▼                         ▼                    ▼             │
│  ┌─────────────┐          ┌─────────────────┐  ┌─────────────────┐  │
│  │ APP_PASSWORD│          │  OpenAI GPT-4o  │  │  OpenAI GPT-4o  │  │
│  │   Check     │          │  + DCM Tools    │  │  + Data Tools   │  │
│  └─────────────┘          └────────┬────────┘  └────────┬────────┘  │
│                                    │                    │            │
│                           ┌────────▼────────────────────▼───────┐   │
│                           │           Tool Handler              │   │
│                           │  resolve_entity | get_issuer_deals  │   │
│                           │  get_peer_comparison | get_allocations│  │
│                           │  get_performance | generate_mandate  │   │
│                           │  get_market_deals | collect_filters  │   │
│                           │  show_table | show_chart | confirm   │   │
│                           └─────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Client Structure

### Navigation

- **Rail Bar** - Left sidebar with New Chat (+), History, and Dashboard icons
- **History Flyover** - Hover-triggered sidebar showing chat sessions
- **View Router** - Switches between Canvas (chat) and Data (dashboard) views
- **Mobile Menu** - Hamburger menu for mobile devices

### Views

| View | Route | Purpose |
|------|-------|---------|
| Canvas | `activeView='chat'` | Conversational AI with DCM components |
| Data | `activeView='dashboard'` | Dashboard with tabbed data views |

### Session Persistence

Chat sessions are stored in localStorage:
- Max 20 sessions retained
- Auto-saved on message changes
- Session includes: id, title, messages, timestamps

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

### Data-driven Filters

The `get_market_deals` tool returns `availableFilters` containing actual values from the dataset:
- `sectors`: Unique sector names
- `currencies`: Unique currencies
- `issuers`: Unique issuer names

The AI uses these to populate `collect_filters` dropdown options dynamically.

## Component Registry

Client maps tool names to React components:

```typescript
// Simplified pattern
switch (toolName) {
  case 'resolve_entity': return <EntityPicker {...result} />;
  case 'get_issuer_deals': return <IssuerTimeline {...result} />;
  case 'get_peer_comparison': return <ComparableDealsPanel {...result} />;
  case 'get_market_deals': return <MarketIssuance {...result} />;
  case 'collect_filters': return <FilterForm {...args} />;
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
| `server/src/mcp/data/deals.ts` | Deal data and filter utilities |
| `client/src/App.tsx` | Main app shell, routing, auth, chat UI |
| `client/src/components/Dashboard.tsx` | Dashboard with tabbed views |
| `client/src/components/dcm/` | DCM-specific UI components |
| `client/src/components/dashboard/` | Dashboard view components |