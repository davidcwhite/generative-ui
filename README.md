# Data Assistant - Generative UI Demo

A chat application demonstrating generative UI patterns using the Vercel AI SDK and OpenAI. The assistant can query multiple data sources, display results in tables, and create interactive charts.

## Features

- **Multi-Source Queries**: Query bond trades, employees, or products from a unified interface
- **Interactive Tables**: Display data in formatted tables with summaries
- **Charts**: Visualize data with bar, line, pie, and area charts (animations disabled for instant rendering)
- **Forms**: Collect user input through dynamic forms
- **Approval Gates**: Confirm actions before execution
- **Conversation Persistence**: Chat history saved to localStorage (last 50 messages)

## Available Data Sources

### Bond Trades (100 records)
Bond trading data including Treasury, corporate, and sovereign bonds.

| Filter | Description |
|--------|-------------|
| bondName | Filter by bond name (partial match) |
| isin | Filter by exact ISIN |
| direction | BUY or SELL |
| counterparty | Filter by counterparty name |
| trader | Filter by trader name |
| status | PENDING, SETTLED, CANCELLED, or FAILED |
| fromDate | Start date (YYYY-MM-DD) |
| toDate | End date (YYYY-MM-DD) |

**Chart Aggregations**: `bond_trades:byCounterparty`, `bond_trades:byBond`, `bond_trades:byStatus`, `bond_trades:dailyVolume`, `bond_trades:buyVsSell`

### Employees (50 records)
Employee directory with department, salary, and location information.

| Filter | Description |
|--------|-------------|
| firstName | Filter by first name |
| lastName | Filter by last name |
| department | Engineering, Sales, Marketing, Finance, HR, Operations, Legal, Product |
| title | Filter by job title |
| location | Filter by office location |
| status | ACTIVE, ON_LEAVE, or TERMINATED |
| minSalary | Minimum salary |
| maxSalary | Maximum salary |

**Chart Aggregations**: `employees:byDepartment`, `employees:byLocation`, `employees:byStatus`, `employees:avgSalaryByDept`

### Products (75 records)
Product inventory with categories, pricing, and stock levels.

| Filter | Description |
|--------|-------------|
| name | Filter by product name |
| sku | Filter by SKU |
| category | Electronics, Furniture, Office, or Software |
| subcategory | Filter by subcategory |
| supplier | Filter by supplier name |
| status | IN_STOCK, LOW_STOCK, OUT_OF_STOCK, or DISCONTINUED |
| minPrice / maxPrice | Price range |
| minStock / maxStock | Stock level range |

**Chart Aggregations**: `products:byCategory`, `products:byStatus`, `products:bySupplier`, `products:valueByCategory`

## Tools

### `query_data`
Query any registered data source. All parameters are required (OpenAI strict mode).

| Parameter | Type | Description |
|-----------|------|-------------|
| dataSource | string | One of: `bond_trades`, `employees`, `products` |
| filtersJson | string | Filter criteria as JSON string, e.g. `"{\"department\":\"Engineering\"}"` or `"{}"` for no filters |
| limit | number | Maximum number of results to return |

### `show_chart`
Display interactive charts with aggregation.

| Parameter | Type | Description |
|-----------|------|-------------|
| title | string | Chart title |
| type | string | One of: `bar`, `line`, `pie`, `area` |
| aggregation | string | Format: `dataSource:aggregationType` (e.g., `employees:byDepartment`) |
| filtersJson | string | Filters as JSON string, or `"{}"` for no filters |

### `show_table`
Display custom tabular data.

| Parameter | Type | Description |
|-----------|------|-------------|
| title | string | Table title |
| columns | string[] | Column headers |
| rowsJson | string | Table rows as JSON array string |

### `collect_filters`
Show a form to collect user input. This is a client-side tool - the form is rendered in the browser and the result is sent back to the assistant.

### `confirm_action`
Request user confirmation before executing actions. Also a client-side tool with approval UI.

## Prerequisites

- Node.js 18+
- OpenAI API key (or compatible API)

## Setup

### 1. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Run the application

```bash
# Terminal 1: Start the server
cd server
npm run dev

# Terminal 2: Start the client
cd client
npm run dev
```

### 4. Open the app

Navigate to http://localhost:5173

## Example Prompts

**Multi-Source Queries:**
- "Show me all employees in Engineering"
- "Find products that are low on stock"
- "What bond trades are pending?"
- "List employees earning over $150k"

**Visualizations:**
- "Chart of employees by department"
- "Show product inventory value by category"
- "Daily trading volume as a line chart"
- "Average salary by department as a bar chart"

**Analytics:**
- "Which department has the most employees?"
- "What products are out of stock?"
- "Show trades by counterparty"
- "Compare buy vs sell trades"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Vite + React)                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │TableCard │  │ChartCard │  │FilterForm│  │ApprovalC.│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                         │                                    │
│              useChat + localStorage                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/SSE
┌─────────────────────────┴───────────────────────────────────┐
│                   Server (Express)                           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   streamText()                        │   │
│  │              (dynamic system prompt)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                Generic Tools                          │   │
│  │  • query_data       • show_chart    • show_table     │   │
│  │  • collect_filters  • confirm_action                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │               Data Source Registry                    │   │
│  │  ┌─────────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ Bond Trades │ │Employees │ │ Products │          │   │
│  │  │   (100)     │ │   (50)   │ │   (75)   │          │   │
│  │  └─────────────┘ └──────────┘ └──────────┘          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                    OpenAI API
```

## Project Structure

```
generative-ui/
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts              # Express server + dynamic prompt
│       ├── tools.ts              # Generic tool definitions
│       └── data/
│           ├── registry.ts       # Data source registry pattern
│           ├── bondTrades.ts     # Bond trade data + registration
│           ├── employees.ts      # Employee data + registration
│           └── products.ts       # Product data + registration
├── client/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # Chat UI + persistence
│       └── components/
│           ├── TableCard.tsx     # Table display
│           ├── ChartCard.tsx     # Recharts (no animation)
│           ├── FilterForm.tsx    # Dynamic forms
│           └── ApprovalCard.tsx  # Confirmation dialogs
├── .gitignore
└── README.md
```

## Adding a New Data Source

1. Create a new file in `server/src/data/` (e.g., `orders.ts`)
2. Define your data interface and generate mock data
3. Implement query, aggregate, and getSummary functions
4. Register with the registry:

```typescript
import { z } from 'zod';
import { registry, createDataSource } from './registry.js';

export interface Order {
  id: string;
  customerId: string;
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  // ... other fields
}

// Generate mock data
export const orders: Order[] = generateOrders(100);

// Query function
export function queryOrders(filters: OrderQuery): Order[] {
  return orders.filter(order => {
    if (filters.status && order.status !== filters.status) return false;
    // ... other filters
    return true;
  });
}

// Register the data source
const ordersDataSource = createDataSource<Order>({
  name: 'orders',
  description: 'Customer orders with items and shipping status',
  
  filterSchema: z.object({
    customerId: z.string().optional(),
    status: z.enum(['pending', 'shipped', 'delivered']).optional(),
    minTotal: z.number().optional(),
  }),
  
  columns: [
    { key: 'id', label: 'Order ID' },
    { key: 'customerId', label: 'Customer' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
  ],
  
  chartAggregations: [
    { key: 'byStatus', label: 'Orders by Status', xKey: 'name', yKey: 'count', recommendedType: 'pie' },
    { key: 'dailyOrders', label: 'Daily Orders', xKey: 'date', yKey: 'count', recommendedType: 'line' },
  ],
  
  query: (filters) => queryOrders(filters as OrderQuery),
  
  aggregate: (data, aggregationType) => {
    // Return array of {name, count} or similar based on aggregationType
    switch (aggregationType) {
      case 'byStatus':
        // ... aggregate by status
      default:
        return [];
    }
  },
  
  getSummary: (data) => ({
    totalOrders: data.length,
    totalValue: data.reduce((sum, o) => sum + o.total, 0),
  }),
});

registry.register(ordersDataSource);
```

5. Import the file in `tools.ts`:
```typescript
import './data/orders.js';
```

The new data source will automatically appear in the system prompt and be available to the AI.

## Technology Stack

- **Frontend**: Vite, React 18, TypeScript, Recharts
- **Backend**: Express, TypeScript, tsx (dev server)
- **AI**: Vercel AI SDK v4, OpenAI (configurable model)
- **Streaming**: Server-Sent Events (SSE)
- **Validation**: Zod (schema validation for all tool parameters)

## Key Patterns

### Data Source Registry
All data sources register with a central registry. The system prompt and tools are generated dynamically based on registered sources. Adding a new data source requires no changes to the core tools.

### OpenAI Strict Mode Compatibility
All tool parameters are required (no optional fields) to comply with OpenAI's function calling strict mode. Dynamic objects use JSON strings (`filtersJson`, `rowsJson`) instead of object types.

### Tool-Based UI Generation
The assistant doesn't generate HTML/JSX directly. Instead, it calls tools with structured data, and the client renders the appropriate React components. This ensures safety and consistency.

### Typed Tool Parts
Messages contain typed tool invocation parts (`tool-invocation`) with states:
- `partial-call` - Tool arguments streaming
- `call` - Tool called, waiting for result
- `result` - Tool executed, result available

### Client-Side Tools
Tools without an `execute` function (`collect_filters`, `confirm_action`) are rendered on the client. The user interacts with the UI, and results are sent back via `addToolResult`.

### Conversation Persistence
Chat history is saved to localStorage and restored on page load. Limited to 50 messages to prevent bloat. A "Clear History" button allows users to start fresh.

### No Chart Animations
Recharts animations are disabled (`isAnimationActive={false}`) for instant rendering without the jarring grow-in effect.

## License

MIT
