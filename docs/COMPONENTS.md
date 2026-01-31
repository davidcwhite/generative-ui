# UI Components

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
  filters: { sector?: string; currency?: string };
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

**Purpose**: Collect structured user input

**Props**: `title`, `fields` (text/select/date inputs)

**Behavior**: User submits form, values returned to assistant.

---

## Component Location

All DCM components: `client/src/components/dcm/`

Generic components: `client/src/components/`
