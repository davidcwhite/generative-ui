# PRD-003: Dashboard Components & UI

**Status:** Draft
**Version:** 1.0
**Date:** 2026-03-10
**Depends on:** PRD-001, PRD-002

---

## 1. Overview

This PRD specifies the functional requirements, component architecture, and
implementation details for the Dashboard — the view where users pin, arrange,
and share query results as a persistent, interactive dashboard.

---

## 2. Functional Requirements

### FR-01: Pinning Results

| ID | Requirement |
|----|-------------|
| FR-01.1 | Every result card in the query timeline has a "Pin to Dashboard" action |
| FR-01.2 | Pinned results appear immediately in the Dashboard tab |
| FR-01.3 | Users can add a title to a pinned result before pinning |
| FR-01.4 | Pinned charts retain their interactivity (zoom, hover, filter) |
| FR-01.5 | Maximum 12 pinned panels per session |

### FR-02: Dashboard Layout

| ID | Requirement |
|----|-------------|
| FR-02.1 | Pinned panels are displayed in a responsive grid (3 columns on desktop, 1 on mobile) |
| FR-02.2 | Users can remove a panel from the dashboard |
| FR-02.3 | Users can reorder panels via up/down controls |
| FR-02.4 | Each panel shows its title, result type badge, and timestamp |
| FR-02.5 | The dashboard shows an empty state illustration when no panels are pinned |

### FR-03: Chart Panel Types

| ID | Requirement |
|----|-------------|
| FR-03.1 | **Metric Card** — single numeric value with optional delta indicator |
| FR-03.2 | **Table Panel** — paginated DataFrame with search and column sort |
| FR-03.3 | **Chart Panel** — interactive Plotly figure (any chart type) |
| FR-03.4 | **Text Panel** — rendered Markdown for narrative insights |
| FR-03.5 | Each panel type has a distinct visual treatment (border color, icon) |

### FR-04: Filter Bar (Global Dashboard Filters)

| ID | Requirement |
|----|-------------|
| FR-04.1 | A collapsible filter bar appears above the dashboard grid |
| FR-04.2 | Filters are defined by the user (column name + filter type) |
| FR-04.3 | Supported filter types: date range, categorical multi-select, numeric range |
| FR-04.4 | Applying a filter re-runs the pinned query against the filtered DataFrame |
| FR-04.5 | Active filters are shown as dismissible chips above the dashboard |

### FR-05: Export

| ID | Requirement |
|----|-------------|
| FR-05.1 | Individual panels can be exported as PNG (charts) or CSV (tables) |
| FR-05.2 | The full dashboard can be exported as a PDF report |
| FR-05.3 | Export buttons appear on panel hover |

---

## 3. Technology Choices & Rationale

### Layout: Solara GridFixed + CSS Grid

**Why `solara.GridFixed` over custom CSS:**
- Integrates with Solara's reactive rendering — no manual DOM manipulation
- Column count is configurable via a single prop
- Handles responsive breakpoints when combined with CSS media queries

```python
@solara.component
def DashboardGrid(panels: list[DashboardPanel]):
    if not panels:
        EmptyDashboard()
        return

    with solara.GridFixed(columns=3, style="gap: 16px; padding: 16px"):
        for panel in panels:
            PanelCard(panel)
```

### Panel State: Typed Dataclass

```python
from dataclasses import dataclass, field
from datetime import datetime
import uuid

@dataclass
class DashboardPanel:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    result_type: str = "text"    # 'metric' | 'table' | 'chart' | 'text'
    value: object = None
    query: str = ""              # Original NL query that produced this
    created_at: datetime = field(default_factory=datetime.utcnow)
    figure_json: str | None = None  # Serialized Plotly figure (for chart panels)
```

**Why serialize the Plotly figure to JSON:**
Solara's reactive system passes objects by reference. Storing the figure as
JSON (`fig.to_json()`) ensures panels are truly independent and survive
state resets without holding references to stale DataFrame objects.

### Metric Card: Plotly Indicator

```python
import plotly.graph_objects as go
import solara

@solara.component
def MetricCard(title: str, value: float, reference: float | None = None):
    mode = "number+delta" if reference is not None else "number"
    fig = go.Figure(go.Indicator(
        mode=mode,
        value=value,
        delta={"reference": reference, "relative": True} if reference else None,
        title={"text": title, "font": {"size": 14}},
        number={"font": {"size": 32}},
    ))
    fig.update_layout(
        height=140,
        margin=dict(t=10, b=10, l=10, r=10),
        template="plotly_white",
    )
    solara.FigurePlotly(fig)
```

### Global Filter Application

Filters are applied by creating a filtered copy of the original DataFrame and
re-initializing SmartDataframe. This is intentionally stateless — no filter
mutation of the source data.

```python
def apply_filters(df: pd.DataFrame, filters: list[ActiveFilter]) -> pd.DataFrame:
    result = df.copy()
    for f in filters:
        if f.filter_type == "categorical":
            result = result[result[f.column].isin(f.values)]
        elif f.filter_type == "date_range":
            result = result[
                (result[f.column] >= f.min_value) &
                (result[f.column] <= f.max_value)
            ]
        elif f.filter_type == "numeric_range":
            result = result[
                (result[f.column] >= f.min_value) &
                (result[f.column] <= f.max_value)
            ]
    return result
```

### PDF Export: WeasyPrint

```python
def export_dashboard_pdf(panels: list[DashboardPanel]) -> bytes:
    """Render dashboard as HTML then convert to PDF via WeasyPrint."""
    import weasyprint
    html = render_dashboard_html(panels)
    return weasyprint.HTML(string=html).write_pdf()
```

**Why WeasyPrint over Playwright/Puppeteer:** Pure Python, no headless
browser required, no Node.js dependency. Sufficient for report-quality PDFs.

---

## 4. Component Hierarchy

```
DashboardPage
├── FilterBar (collapsible)
│   ├── AddFilterButton
│   ├── ActiveFilterChips
│   └── FilterConfigDialog (modal)
├── DashboardToolbar
│   ├── ExportPDFButton
│   └── ClearDashboardButton
└── DashboardGrid (GridFixed, columns=3)
    └── PanelCard × N
        ├── PanelHeader
        │   ├── PanelTitle (editable)
        │   ├── ResultTypeBadge
        │   └── PanelActions (hover-revealed)
        │       ├── ExportButton
        │       ├── MoveUpButton
        │       ├── MoveDownButton
        │       └── RemoveButton
        └── PanelBody
            ├── MetricCard (result_type == 'metric')
            ├── TablePanel (result_type == 'table')
            ├── ChartPanel (result_type == 'chart')
            └── TextPanel  (result_type == 'text')
```

---

## 5. Implementation Details

### Dashboard State

```python
# state.py additions
from typing import Literal

pinned_panels: solara.Reactive[list[DashboardPanel]] = solara.reactive([])
active_filters: solara.Reactive[list[ActiveFilter]] = solara.reactive([])
dashboard_filter_open: solara.Reactive[bool] = solara.reactive(False)
```

### Pin Action (from QueryResult)

```python
@solara.component
def ResultCard(result: QueryResult):
    show_pin_dialog, set_show_pin_dialog = solara.use_state(False)
    panel_title, set_panel_title = solara.use_state(result.query[:60])

    def confirm_pin():
        panel = DashboardPanel(
            title=panel_title,
            result_type=result.result_type,
            value=result.value,
            query=result.query,
            figure_json=result.value.to_json() if result.result_type == "chart" else None,
        )
        panels = pinned_panels.value.copy()
        panels.append(panel)
        pinned_panels.value = panels
        set_show_pin_dialog(False)

    # ... result display ...
    solara.Button("Pin to Dashboard", on_click=lambda: set_show_pin_dialog(True))

    if show_pin_dialog:
        with solara.Card("Pin to Dashboard"):
            solara.InputText(label="Panel title", value=panel_title, on_value=set_panel_title)
            solara.Button("Confirm", on_click=confirm_pin)
            solara.Button("Cancel", on_click=lambda: set_show_pin_dialog(False))
```

### Responsive Grid via CSS

```python
@solara.component
def DashboardGrid(panels: list[DashboardPanel]):
    with solara.Column(style="""
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 16px;
        padding: 16px;
    """):
        for panel in panels:
            PanelCard(panel=panel, key=panel.id)
```

Using CSS `auto-fill` + `minmax` provides automatic responsiveness without
needing JavaScript or media query callbacks.

---

## 6. Acceptance Criteria

| Criteria | Pass Condition |
|----------|----------------|
| Pin action | Result pinned and visible in Dashboard tab within 500ms |
| Grid layout | 3 columns on viewport ≥ 1024px, 1 column on < 640px |
| Remove panel | Panel removed immediately with no page reload |
| Filter application | Filtered DataFrame drives re-query within 15s |
| Metric card | Numeric values display with correct formatting and delta indicator |
| Chart panel | Plotly chart is fully interactive (hover, zoom, legend toggle) |
| PDF export | Generated PDF contains all visible panels, readable at A4 size |
| Empty state | Illustration + CTA shown when no panels are pinned |
