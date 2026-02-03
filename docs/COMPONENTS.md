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
    name: string;
    sector: string;
    country: string;
    ratings: { sp?: string; moodys?: string; fitch?: string };
  }>;
}
```

**Behavior**: User clicks a card to select the correct issuer. Selection feeds back to assistant.

---

### IssuerTimeline

**Trigger**: `get_issuer_deals` result

**Purpose**: Display issuer's bond issuance history

**Data Shape**:
```typescript
{
  issuer: { name: string; sector: string };
  deals: Array<{
    isin: string;
    pricingDate: string;
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
  issuer: { id: string; name: string };
  sector: string;
  peers: Array<{
    id: string;
    name: string;
    dealCount: number;
    totalRaised: number;
    avgTenor: number;
    avgNip: number;
    avgOversubscription: number;
  }>;
  insight: string;
}
```

**Visual**: Table with issuer row highlighted. Indigo gradient header.

---

### AllocationBreakdown

**Trigger**: `get_allocations` result

**Purpose**: Show investor allocation by type and geography

**Data Shape**:
```typescript
{
  deal: { isin: string; issuer: string };
  summary: {
    totalInvestors: number;
    oversubscription: number;
    avgFillRate: number;
  };
  byType: Array<{ name: string; value: number }>;
  byGeography: Array<{ name: string; value: number }>;
  topInvestors: Array<{
    name: string;
    type: string;
    allocation: number;
    fillRate: number;
  }>;
}
```

**Visual**: Pie chart (by type) + bar chart (by geography) + top investors list. Emerald gradient header.

---

### SecondaryPerformanceView

**Trigger**: `get_performance` result

**Purpose**: Track secondary market performance

**Data Shape**:
```typescript
{
  deal: { isin: string; issuer: string; issueSpread: number; reofferPrice: number };
  trend: 'Tightening' | 'Widening' | 'Stable';
  metrics: {
    currentSpread: number;
    spreadDrift: number;
    avgVolume: number;
  };
  spreadHistory: Array<{ date: string; spread: number }>;
  priceHistory: Array<{ date: string; price: number }>;
}
```

**Visual**: Two line charts (spread over time, price over time) with reference lines. Violet gradient header. Drift color-coded.

---

### ExportPanel

**Trigger**: `generate_mandate_brief` result

**Purpose**: Export mandate brief in various formats

**Data Shape**:
```typescript
{
  sections: string[];
  formats: Array<{ id: string; label: string }>;
  provenance: {
    generatedAt: string;
    dataSources: string[];
    queryContext: string;
  };
}
```

**Visual**: Section badges, format buttons (PDF, PPT, Excel, Email). Amber gradient header.

---

### MarketIssuance

**Trigger**: `get_market_deals` result

**Purpose**: Market-wide deal overview

**Data Shape**:
```typescript
{
  filters: { sector?: string; currency?: string; issuer?: string };
  summary: {
    totalDeals: number;
    totalVolume: number;
    avgSpread: number;
    avgNip: number;
  };
  sectorBreakdown: Array<{ sector: string; count: number }>;
  deals: Array<{
    date: string;
    issuer: string;
    isin: string;
    size: number;
    tenor: string;
    spread: number;
    nip: number;
    oversubscription: number;
  }>;
  availableFilters: {
    sectors: string[];
    currencies: string[];
    issuers: string[];
  };
}
```

**Visual**: Summary stats, sector badges, scrollable deals table.

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
