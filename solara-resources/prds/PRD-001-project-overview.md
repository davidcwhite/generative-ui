# PRD-001: Project Overview — Conversational Data Analysis Platform

**Status:** Draft
**Version:** 1.0
**Date:** 2026-03-10

---

## 1. Vision

Build an AI-powered conversational data analysis platform where users interact
with their data through natural language. The platform combines Solara's reactive
Python web framework with PandasAI 2.3's LLM-powered query engine to provide an
intuitive, code-free analysis experience — from raw dataset exploration to
publishing polished dashboards.

---

## 2. Goals

| Priority | Goal |
|----------|------|
| P0 | Users can upload or connect a dataset and immediately ask natural language questions |
| P0 | Responses render appropriately: text answers, data tables, or interactive charts |
| P1 | Session history preserves the conversation and all generated results |
| P1 | Users can pin results to a persistent dashboard |
| P2 | Multi-dataset analysis via SmartDatalake (join reasoning across tables) |
| P2 | Export results to CSV, PNG, or PDF |

---

## 3. Non-Goals

- Real-time streaming data ingestion (Phase 2)
- Multi-user collaboration with concurrent editing (Phase 2)
- Custom LLM fine-tuning or on-premise model hosting (Phase 3)
- SQL query editor or direct database connections (Phase 2)

---

## 4. Target Personas

### Data Analyst — Maya

Maya is a business analyst at a mid-sized SaaS company. She has strong domain
knowledge and is proficient in Excel, but limited Python experience. She spends
hours filtering pivot tables and writing repetitive SQL queries to answer one-off
stakeholder questions. She needs a tool that understands her business context and
returns accurate, presentation-ready results without writing code.

### Data Engineer — Sanjay

Sanjay builds and maintains the data pipelines that Maya relies on. He wants to
use this platform to prototype analyses quickly before productionizing them in
dbt or Airflow. He needs the ability to inspect the generated Python code, tweak
PandasAI configuration, and swap LLM providers.

### Business Stakeholder — Leila

Leila is a VP of Sales who occasionally wants to explore performance data directly
without waiting for a BI request queue. She needs an extremely simple interface:
one text box, and results that look polished enough to paste into a board deck.

---

## 5. Technology Stack

### Core Framework: Solara (≥1.35)

**Why Solara over Streamlit or Dash:**
- Pure Python reactive model — no separate frontend code required
- Component-based architecture scales to complex, multi-page apps
- First-class support for async operations and background tasks
- Native Jupyter notebook compatibility for prototyping
- Seamless integration with Plotly, Matplotlib, and ipywidgets

### NL Query Engine: PandasAI 2.3

**Why PandasAI over raw LLM prompting:**
- Generates and executes validated Python/pandas code — not just text
- Built-in code sandbox prevents unsafe operations
- SmartDatalake handles multi-table join reasoning automatically
- Response normalization (str / DataFrame / chart path) is built-in
- Active development with regular updates to support new LLMs

**Why version 2.3 specifically:**
- Improved sandbox security over 2.2 (stricter allowlist)
- `custom_whitelisted_dependencies` enables safe extension
- Stable API surface for building reliable integrations

### Visualization: Plotly (≥5.0)

**Why Plotly over Matplotlib or Bokeh:**
- Interactive by default — hover, zoom, filter without extra code
- `solara.FigurePlotly` provides native Solara integration
- Extensive chart type library (50+ chart types)
- Consistent theming via `pio.templates`

### LLM Backend: Anthropic Claude (claude-sonnet-4-6)

**Why Claude over GPT-4o for data analysis:**
- Superior instruction-following for structured code generation
- Lower hallucination rate on numerical reasoning tasks
- 200K context window handles large schema descriptions
- Available via LangChain integration with PandasAI

---

## 6. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Solara Application                        │
│                                                                  │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Data Upload  │   │  NL Query Engine │   │  Dashboard     │  │
│  │  & Preview   │──▶│  (PandasAI 2.3)  │──▶│  (Pinned       │  │
│  │  Component   │   │                  │   │   Results)     │  │
│  └──────────────┘   └────────┬─────────┘   └────────────────┘  │
│                               │                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Reactive State Layer                    │   │
│  │  current_df | query_history | pinned_results | ui_state  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   LLM Provider       │
                    │  (Anthropic Claude)  │
                    └─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Code Sandbox        │
                    │  (pandas execution)  │
                    └─────────────────────┘
```

---

## 7. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first meaningful answer | < 10 seconds from query submission |
| Query accuracy on structured data | > 85% correct on standard analytical questions |
| UI responsiveness | Page interactions < 100ms (excluding LLM calls) |
| LLM cost per session | < $0.05 for 10 typical queries (using claude-sonnet-4-6) |
| Error rate | < 5% of queries produce an unhandled exception |

---

## 8. Milestones

| Milestone | Scope |
|-----------|-------|
| M1 — Core Query Loop | File upload, SmartDataframe init, NL query → result display |
| M2 — Dashboard | Pin results, layout editor, multi-chart views |
| M3 — Multi-dataset | SmartDatalake, schema browser, join suggestions |
| M4 — Export & Share | CSV/PNG/PDF export, shareable session links |
