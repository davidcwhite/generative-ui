# Use Cases

Each use case maps to a sequence of tool calls and UI components.

## 1. Mandate Pitching

**User**: "We're pitching BMW for a mandate"

```
User Query
    │
    ▼
┌──────────────────┐
│  resolve_entity  │ ──▶ Match "BMW" to issuer
└────────┬─────────┘
         │ (if ambiguous)
         ▼
┌──────────────────┐
│  EntityPicker    │ ──▶ User selects correct issuer
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ get_issuer_deals │ ──▶ Fetch BMW's bond history
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  IssuerTimeline  │ ──▶ Display deals with metrics
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│get_peer_comparison│──▶ Compare to auto sector peers
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ComparableDealsPanel│─▶ Show peer metrics table
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│generate_mandate_brief│▶ Create exportable document
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   ExportPanel    │ ──▶ Download options (PDF, PPT, Excel)
└──────────────────┘
```

**Tools**: `resolve_entity` → `get_issuer_deals` → `get_peer_comparison` → `generate_mandate_brief`

**Components**: EntityPicker → IssuerTimeline → ComparableDealsPanel → ExportPanel

---

## 2. Deal Analysis

**User**: "Show allocations for BMW's March 2024 deal"

```
User Query
    │
    ▼
┌──────────────────┐
│  resolve_entity  │ ──▶ Identify issuer
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  get_allocations │ ──▶ Fetch allocation breakdown
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│AllocationBreakdown│──▶ Pie + bar charts, top investors
└──────────────────┘
```

**Tools**: `resolve_entity` → `get_allocations`

**Components**: AllocationBreakdown

---

## 3. Secondary Performance

**User**: "How is BMW's 2024 bond trading?"

```
User Query
    │
    ▼
┌──────────────────┐
│  resolve_entity  │ ──▶ Identify issuer
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  get_performance │ ──▶ Fetch secondary market data
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│SecondaryPerformanceView│▶ Spread/price charts, drift
└──────────────────┘
```

**Tools**: `resolve_entity` → `get_performance`

**Components**: SecondaryPerformanceView

---

## 4. Market Surveillance

**User**: "Show recent EUR deals in auto sector"

```
User Query
    │
    ▼
┌──────────────────┐
│ get_market_deals │ ──▶ Fetch market-wide deals
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  MarketIssuance  │ ──▶ Summary stats + deals table
└──────────────────┘
```

**Tools**: `get_market_deals`

**Components**: MarketIssuance

---

## 5. Data-driven Filtering

**User**: "Filter these by currency" (after seeing market deals)

```
User Query
    │
    ▼
┌──────────────────┐
│ collect_filters  │ ──▶ Show filter form with dropdowns
│ (uses available  │     populated from availableFilters
│  Filters data)   │
└────────┬─────────┘
         │ User submits form
         ▼
┌──────────────────┐
│  FilterForm      │ ──▶ Dropdown options from real data
└────────┬─────────┘
         │ {currency: "EUR", issuer: "BMW"}
         ▼
┌──────────────────┐
│ get_market_deals │ ──▶ Fetch filtered deals
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  MarketIssuance  │ ──▶ Filtered results table
└──────────────────┘
```

**Key Feature**: Filter dropdown options come from `availableFilters` in the previous `get_market_deals` response, ensuring users can only select values that exist in the data.

**Tools**: `collect_filters` → `get_market_deals`

**Components**: FilterForm → MarketIssuance

---

## 6. Investor Analysis

**User**: "Which investors participated in Volkswagen deals?"

```
User Query
    │
    ▼
┌──────────────────┐
│  resolve_entity  │ ──▶ Identify issuer
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│get_participation_history│▶ Investor participation data
└────────┬─────────────┘
         │
         ▼
┌──────────────────┐
│    TableCard     │ ──▶ Participation history table
└──────────────────┘
```

**Tools**: `resolve_entity` → `get_participation_history`

**Components**: TableCard

---

## 7. Using the Data Dashboard

**User**: Clicks Dashboard icon in rail bar

```
Click Dashboard Icon
    │
    ▼
┌──────────────────┐
│  Dashboard View  │ ──▶ Tabbed interface loads
└────────┬─────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌──────────┐ ┌───────────┐
│Issuance│ │Allocations│ │Secondary │
│  View  │ │   View    │ │   View   │
└────────┘ └──────────┘ └───────────┘
```

**No AI involved** - Direct data views without conversational interface.

**Tabs**:
- **Issuance**: Recent deals table
- **Allocations**: Investor breakdown charts
- **Secondary**: Performance tracking

---

## 8. Multi-session Chat History

**User**: Hovers over History icon in rail bar

```
Hover History Icon
    │
    ▼
┌──────────────────┐
│ History Flyover  │ ──▶ Shows recent chat sessions
└────────┬─────────┘
         │ User clicks a session
         ▼
┌──────────────────┐
│  Load Session    │ ──▶ Restores messages from localStorage
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Canvas View     │ ──▶ Previous conversation displayed
└──────────────────┘
```

**Features**:
- Sessions auto-saved on message changes
- Title auto-generated from first user message
- Delete sessions individually
- Max 20 sessions retained

---

## Tool-to-Component Mapping

| Tool | Primary Component | Purpose |
|------|-------------------|---------|
| `resolve_entity` | EntityPicker | Disambiguate issuer names |
| `get_issuer_deals` | IssuerTimeline | Show deal history |
| `get_peer_comparison` | ComparableDealsPanel | Sector comparison |
| `get_allocations` | AllocationBreakdown | Investor breakdown |
| `get_performance` | SecondaryPerformanceView | Secondary trading |
| `get_participation_history` | TableCard | Investor participation |
| `generate_mandate_brief` | ExportPanel | Document export |
| `get_market_deals` | MarketIssuance | Market overview |
| `collect_filters` | FilterForm | Dynamic filter dropdowns |
| `show_table` | TableCard | Generic tables |
| `show_chart` | ChartCard | Generic charts |
| `confirm_action` | ApprovalCard | User confirmation |
