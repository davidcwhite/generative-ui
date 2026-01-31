# DCM Bond Issuance Assistant

AI-powered assistant for Debt Capital Markets professionals. Supports mandate pitching, deal analysis, peer comparison, and market surveillance through a conversational interface with rich UI components.

## Who It's For

- **DCM Originators** - Mandate pitching and client relationship management
- **Syndicate Bankers** - Deal execution and pricing analysis
- **Credit Sales** - Investor targeting and allocation analysis

## Features

- **Entity Resolution** - Disambiguate issuer names to canonical entities
- **Deal History** - View issuer bond issuance timelines with pricing metrics
- **Peer Comparison** - Compare issuers against sector peers
- **Allocation Analysis** - Breakdown by investor type and geography
- **Secondary Performance** - Track spread drift and price performance
- **Mandate Briefs** - Generate exportable pitch documents
- **Market Overview** - Browse recent deals across the market
- **Password Protection** - Secure access with shared password

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
