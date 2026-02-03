# UI Components

## Layout Components

### Rail Bar

**Location**: `client/src/App.tsx`

**Purpose**: Left navigation sidebar with icon buttons

**Elements**:
- **PF Logo** - Brand icon at top
- **New Chat (+)** - Creates new chat session
- **History (clock)** - Triggers history flyover on hover
- **Dashboard (chart)** - Switches to Data view

**Behavior**: Fixed position, 64px wide. Icons show hover states. History button triggers flyover.

---

### History Flyover

**Location**: `client/src/App.tsx`

**Purpose**: Overlay sidebar showing chat history

**Trigger**: Hover over History icon in rail bar

**Elements**:
- Header with "History" title and bookmark icon
- "Recent" section label
- List of chat sessions (title + delete button)
- Empty state when no history

**Behavior**: 
- Appears on hover, stays open while mouse is inside
- Clicking session switches to it
- Delete button removes session with confirmation

---

### Mobile Menu

**Location**: `client/src/App.tsx`

**Purpose**: Hamburger menu for mobile devices

**Trigger**: Click hamburger icon (visible on small screens)

**Elements**:
- Full-screen overlay
- PF logo and close button
- Chat navigation
- Recent sessions list
- Dashboard link

---

## DCM Components

### EntityPicker

**Trigger**: `resolve_entity` returns multiple matches

**Purpose**: Disambiguate when issuer name matches multiple entities

**Data Shape**:
```typescript
{
  query: string;
  matches: Array<{
    id: string;
    lei: string;
    name: string;
    shortName: string;
    sector: string;
    country: string;
    ratings: Array<{ agency: string; rating: string }>;
  }>;
  onSelect: (issuerId: string) => void;
}
```

**Behavior**: User clicks a card to select the correct issuer. Selection feeds back to assistant via `onSelect` callback.

---

### IssuerTimeline

**Trigger**: `get_issuer_deals` result

**Purpose**: Display issuer's bond issuance history

**Data Shape**:
```typescript
{
  issuerName: string;
  deals: Array<{
    id: string;
    issuerName: string;
    isin: string;
    pricingDate: string;
    currency: string;
    size: number;
    tenor: string;
    coupon: number;
    spread: number;
    nip: number;
    oversubscription: number;
  }>;
  summary: {
    totalDeals: number;
    totalRaised: number;
    avgTenor: string;
    avgNip: number;
    avgOversubscription: number;
  };
}
```

**Visual**: Vertical timeline with deal cards. NIP color-coded (green ≤5bps, amber ≤10bps, red >10bps).

---

### ComparableDealsPanel

**Trigger**: `get_peer_comparison` result

**Purpose**: Compare issuer metrics against sector peers

**Data Shape**:
```typescript
{
  issuer: { id: string; name: string; sector: string };
  issuerSummary: {
    totalDeals: number;
    totalRaised: number;
    avgTenor: string;
    avgNip: number;
    avgOversubscription: number;
  };
  issuerDeals: Deal[];
  peers: Array<{
    issuerId: string;
    issuerName: string;
    deals: Deal[];
    summary: {
      totalDeals: number;
      totalRaised: number;
      avgTenor: string;
      avgNip: number;
      avgOversubscription: number;
    };
  }>;
  comparison: {
    nipVsPeers: string;
  };
}
```

**Visual**: Table with issuer row highlighted. Indigo gradient header. Shows recent deals preview.

---

### AllocationBreakdown

**Trigger**: `get_allocations` result

**Purpose**: Show investor allocation by type and geography

**Data Shape**:
```typescript
{
  deal: {
    id: string;
    issuer: string;
    size: number;
    oversubscription: number;
  };
  allocations: Array<{
    investorId: string;
    investorName: string;
    investorType: string;
    geography: string;
    orderSize: number;
    allocatedSize: number;
    fillRate: number;
  }>;
  breakdown: {
    byType: Array<{ type: string; amount: number; percentage: number }>;
    byGeography: Array<{ geography: string; amount: number; percentage: number }>;
  };
  summary: {
    totalInvestors: number;
    totalAllocated: number;
    avgFillRate: number;
  };
}
```

**Visual**: Pie chart (by type) + bar chart (by geography) + top investors list (from allocations). Emerald gradient header.

---

### SecondaryPerformanceView

**Trigger**: `get_performance` result

**Purpose**: Track secondary market performance

**Data Shape**:
```typescript
{
  bond: {
    isin: string;
    issuer: string;
    coupon: number;
    tenor: string;
    issueSpread: number;
    issuePrice: number;
  };
  performance: Array<{
    date: string;
    price: number;
    spread: number;
    yieldToMaturity: number;
    volumeTraded: number;
    daysFromPricing: number;
  }>;
  drift: number;
  summary: {
    currentSpread: number;
    issueSpread: number;
    drift: number;
    currentPrice: number;
    issuePrice: number;
    priceChange: number;
    avgDailyVolume: number;
  } | null;
  analysis: {
    trend: 'Tightening' | 'Widening' | 'Stable';
    interpretation: string;
  };
}
```

**Visual**: Two line charts (spread over time, price over time) with reference lines at issue values. Violet gradient header. Drift color-coded (green for tightening, red for widening).

---

### ExportPanel

**Trigger**: `generate_mandate_brief` result

**Purpose**: Export mandate brief in various formats

**Data Shape**:
```typescript
{
  brief: {
    issuerId: string;
    issuerName: string;
    generatedAt: string;
    sections: Array<{
      title: string;
      content: string;
      dataPoints?: Record<string, string | number>[];
    }>;
    provenance: {
      sources: string[];
      timestamp: string;
      queryContext: string;
    };
  };
  exportFormats: string[];  // e.g. ['pdf', 'pptx', 'xlsx', 'email']
  onExport?: (format: string) => void;
}
```

**Visual**: Section badges, format buttons (PDF, PPT, Excel, Email). Amber gradient header. Shows export confirmation and data provenance.

---

### MarketIssuance

**Trigger**: `get_market_deals` result

**Purpose**: Market-wide deal overview

**Data Shape**:
```typescript
{
  deals: Array<{
    id: string;
    issuerName: string;
    isin: string;
    pricingDate: string;
    currency: string;
    size: number;
    tenor: string;
    coupon: number;
    spread: number;
    nip: number;
    oversubscription: number;
  }>;
  summary: {
    totalDeals: number;
    totalVolume: number;
    avgSpread: number;
    avgNip: number;
    bySector: Array<{ sector: string; count: number; volume: number }>;
    byCurrency: Array<{ currency: string; count: number; volume: number }>;
  };
  filters: {
    sector: string;
    currency: string;
    showing: number;
  };
}
```

**Note**: The `availableFilters` for dropdowns (sectors, currencies, issuers) are returned by the `get_market_deals` tool response but not passed directly to this component. They are used by the AI to populate `collect_filters` form options.

**Visual**: Summary stats, sector badges, scrollable deals table with NIP color-coded.

---

## Generic Components

### TableCard

**Trigger**: `show_table` or `query_data` result

**Purpose**: Display tabular data

**Props**: `title`, `columns`, `rows`

---

### ChartCard

**Trigger**: `show_chart` result

**Purpose**: Render bar, line, pie, or area charts

**Props**: `title`, `type`, `data`, `xKey`, `yKey`

---

### ApprovalCard

**Trigger**: `confirm_action` tool call

**Purpose**: Gate actions behind user approval

**Props**: `summary`, `risk` (low/medium/high), `actions`

**Visual**: Risk badge color-coded. Action buttons. Cancel option.

---

### FilterForm

**Trigger**: `collect_filters` tool call

**Purpose**: Collect structured user input via form

**Props**: `title`, `fields` (text/select/date inputs)

**Data-driven Options**: When used after `get_market_deals`, dropdown options are populated from `availableFilters` in the response, ensuring filter values match actual data.

**Behavior**: User submits form, values returned to assistant. If user sends a new message while form is pending, form is auto-cancelled.

---

## Dashboard Views

### IssuanceView

**Location**: `client/src/components/dashboard/IssuanceView.tsx`

**Purpose**: Browse recent bond issuance

**Elements**: Deals table with issuer, date, size, tenor, spread, NIP columns

---

### AllocationsView

**Location**: `client/src/components/dashboard/AllocationsView.tsx`

**Purpose**: Aggregated allocation analytics

**Elements**: Charts showing investor type and geography breakdowns

---

### SecondaryView

**Location**: `client/src/components/dashboard/SecondaryView.tsx`

**Purpose**: Secondary market overview

**Elements**: Performance metrics and trend charts

---

## Component Location

| Category | Path |
|----------|------|
| DCM Components | `client/src/components/dcm/` |
| Dashboard Views | `client/src/components/dashboard/` |
| Generic Components | `client/src/components/` |
| Layout (Rail, History) | `client/src/App.tsx` |
