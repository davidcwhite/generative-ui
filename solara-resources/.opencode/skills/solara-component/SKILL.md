---
name: solara-component
description: "Scaffold and implement Solara reactive UI components, pages, and layouts for data analysis apps"
license: MIT
compatibility: opencode
metadata:
  audience: python-developers
  workflow: solara-development
  version: "1.0.0"
  framework: solara>=1.35
---

## Overview

Use this skill when building or modifying Solara reactive components, pages, and
layouts for the conversational data analysis platform.

## When to Use

Trigger this skill when the user asks to:
- Create a new Solara page or component
- Add interactivity (filters, dropdowns, sliders) to a dashboard
- Implement reactive state between components
- Build a layout with cards, columns, or rows
- Wire up chart components to data state

## Core Patterns

### Basic Component

```python
import solara
from typing import Callable

@solara.component
def FilterPanel(
    columns: list[str],
    selected: str | None,
    on_select: Callable[[str | None], None],
):
    with solara.Card("Filters"):
        solara.Select(
            label="Column",
            values=columns,
            value=selected,
            on_value=on_select,
        )
```

### Shared Reactive State

```python
# Top-level reactive variables (module scope)
current_dataset = solara.reactive(None)
nl_query = solara.reactive("")
query_result = solara.reactive(None)

@solara.component
def QueryInput():
    # Read reactive value; subscribe to changes automatically
    query, set_query = solara.use_state(nl_query.value)

    def submit():
        nl_query.value = query

    solara.InputText(label="Ask a question...", value=query, on_value=set_query)
    solara.Button("Run", on_click=submit)
```

### Background Task (for expensive queries)

```python
import asyncio

@solara.component
def DataLoader(path: str):
    data, set_data = solara.use_state(None)
    loading, set_loading = solara.use_state(False)

    async def load():
        set_loading(True)
        await asyncio.sleep(0)  # yield to event loop
        import pandas as pd
        set_data(pd.read_parquet(path))
        set_loading(False)

    solara.use_effect(load, [path])

    if loading:
        solara.ProgressLinear(True)
    elif data is not None:
        solara.Text(f"Loaded {len(data):,} rows")
```

### Page Layout

```python
@solara.component
def Page():
    with solara.Column():
        with solara.Row():
            solara.Title("Conversational Data Analysis")
        with solara.Row():
            with solara.Column(style="width: 300px"):
                FilterPanel(...)
            with solara.Column(style="flex: 1"):
                ResultsView(...)
```

## Layout Components Reference

| Component | Use |
|-----------|-----|
| `solara.Column()` | Vertical flex container |
| `solara.Row()` | Horizontal flex container |
| `solara.Card(title)` | Bordered card with optional title |
| `solara.AppBar(title)` | Top navigation bar |
| `solara.Sidebar()` | Collapsible sidebar |
| `solara.GridFixed(columns=N)` | CSS grid with fixed columns |

## Input Components Reference

| Component | Use |
|-----------|-----|
| `solara.InputText` | Single-line text input |
| `solara.Select` | Single-select dropdown |
| `solara.SelectMultiple` | Multi-select dropdown |
| `solara.SliderInt / SliderFloat` | Numeric range slider |
| `solara.Checkbox` | Boolean toggle |
| `solara.Button` | Action trigger |

## References

See `references/solara-reactivity.md` for deeper state management patterns.
See `references/solara-routing.md` for multi-page app routing.
