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

## 5. Investor Analysis

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
| `show_table` | TableCard | Generic tables |
| `show_chart` | ChartCard | Generic charts |
| `confirm_action` | ApprovalCard | User confirmation |
