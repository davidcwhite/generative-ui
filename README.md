# Primary Flow

Component-first AI interactions for Debt Capital Markets. Less wall of text, more getting things done.

Primary Flow replaces traditional chat-heavy LLM interfaces with structured UI components—forms, tables, charts, and approval gates—that let you accomplish tasks efficiently.

## Products

- **Primary Flow Canvas** - Conversational assistant with rich UI components for mandate pitching, deal analysis, and market surveillance
- **Primary Flow Data** - Dashboard views for browsing issuance, allocations, and secondary performance

## Who It's For

- **DCM Originators** - Mandate pitching and client relationship management
- **Syndicate Bankers** - Deal execution and pricing analysis
- **Credit Sales** - Investor targeting and allocation analysis

## Features

### Canvas (Chat)
- **Entity Resolution** - Disambiguate issuer names to canonical entities
- **Deal History** - View issuer bond issuance timelines with pricing metrics
- **Peer Comparison** - Compare issuers against sector peers
- **Allocation Analysis** - Breakdown by investor type and geography
- **Secondary Performance** - Track spread drift and price performance
- **Mandate Briefs** - Generate exportable pitch documents
- **Market Overview** - Browse recent deals across the market
- **Data-driven Filtering** - Dynamic dropdown filters populated from actual data
- **Chat History** - Persistent sessions with sidebar navigation

### Data (Dashboard)
- **Issuance View** - Recent deals table with filtering
- **Allocations View** - Investor breakdown charts
- **Secondary View** - Performance tracking

### Platform
- **Mobile Responsive** - Full functionality on mobile with hamburger menu
- **Password Protection** - Secure access with shared password
- **Component-first UX** - Structured interactions over free-form text

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for containerized deployment)
- OpenAI API key

### Local Development

```bash
# Clone and install
cd server && npm install
cd ../client && npm install

# Configure
cp server/.env.example server/.env
# Add: OPENAI_API_KEY=sk-your-key

# Run
cd server && npm run dev   # Terminal 1
cd client && npm run dev   # Terminal 2
```

Open http://localhost:5173

### Docker

```bash
# Create .env at project root
echo "OPENAI_API_KEY=sk-your-key" > .env
echo "APP_PASSWORD=your-password" >> .env

# Run
docker-compose up --build
```

Open http://localhost:5173

### Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Server | OpenAI API key (required) |
| `APP_PASSWORD` | Server | Shared access password (optional) |
| `CORS_ORIGIN` | Server | Allowed origin for CORS |
| `VITE_API_URL` | Client build | API endpoint URL |

## Example Prompts

- "We're pitching BMW for a mandate"
- "Show me Volkswagen's issuance history"
- "Compare Mercedes-Benz to auto sector peers"
- "What were the allocations on Siemens' last deal?"
- "Show secondary performance for BMW's March 2024 bond"
- "Generate a mandate brief for Porsche"
- "Show recent EUR deals in the auto sector"
- "Filter these by currency" (triggers dynamic filter dropdowns)

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Use Cases](docs/USE-CASES.md) - Workflows mapped to tools and UI
- [Components](docs/COMPONENTS.md) - UI component reference

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend**: Express, TypeScript, Vercel AI SDK
- **AI**: OpenAI GPT-4o with tool calling
- **Deployment**: Docker, Railway

## License

This work is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

You may use, share, and adapt this software for **non-commercial, educational purposes only**, provided you give appropriate credit and distribute any derivatives under the same license.

Copyright (c) 2026 David White
