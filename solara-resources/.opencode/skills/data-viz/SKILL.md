---
name: data-viz
description: "Add interactive Plotly charts and visualizations to Solara pages, wired to reactive state and PandasAI results"
license: MIT
compatibility: opencode
metadata:
  audience: data-developers
  workflow: visualization
  version: "1.0.0"
  libraries: "plotly>=5.0, matplotlib"
---

## Overview

Use this skill to add charts, visualizations, and interactive figures to Solara
components using Plotly (primary) or Matplotlib.

## When to Use

Trigger this skill when the user asks to:
- Add a chart (bar, line, scatter, pie, heatmap) to a Solara page
- Render a PandasAI-generated chart in the UI
- Build a reactive dashboard that updates charts when filters change
- Style or theme charts to match the application

## Plotly + Solara Integration

### Basic Chart Component

```python
import solara
import plotly.express as px
import pandas as pd

@solara.component
def RevenueChart(df: pd.DataFrame, group_by: str = "region"):
    fig = px.bar(
        df.groupby(group_by)["revenue"].sum().reset_index(),
        x=group_by,
        y="revenue",
        title=f"Revenue by {group_by.title()}",
        template="plotly_white",
        color=group_by,
    )
    fig.update_layout(showlegend=False, margin=dict(t=40, b=20, l=20, r=20))
    solara.FigurePlotly(fig)
```

### Reactive Chart (Updates on Filter Change)

```python
import solara
import plotly.express as px
from typing import Optional

@solara.component
def FilteredChart(df: pd.DataFrame):
    selected_region, set_region = solara.use_state(None)

    regions = ["All"] + sorted(df["region"].unique().tolist())

    # Filter data reactively
    filtered = solara.use_memo(
        lambda: df if selected_region in (None, "All")
                else df[df["region"] == selected_region],
        dependencies=[selected_region],
    )

    with solara.Card("Revenue Analysis"):
        solara.Select(
            label="Region",
            values=regions,
            value=selected_region or "All",
            on_value=lambda v: set_region(None if v == "All" else v),
        )
        fig = px.line(
            filtered,
            x="date",
            y="revenue",
            color="product",
            template="plotly_white",
        )
        solara.FigurePlotly(fig)
```

### Rendering PandasAI Chart Output

```python
from pathlib import Path
import solara

@solara.component
def PandasAIResult(result_type: str, result_value):
    if result_type == "dataframe":
        import pandas as pd
        solara.DataFrame(result_value, items_per_page=10)
    elif result_type == "chart":
        # PandasAI returns a file path string
        if Path(result_value).exists():
            solara.Image(result_value, width="100%")
        else:
            solara.Warning("Chart file not found")
    elif result_type == "number":
        solara.Text(f"{result_value:,.2f}", style="font-size: 2rem; font-weight: bold;")
    else:
        solara.Markdown(str(result_value))
```

## Chart Type Reference

### Bar Chart
```python
fig = px.bar(df, x="category", y="value", color="segment", barmode="group")
```

### Line Chart (Time Series)
```python
fig = px.line(df, x="date", y="metric", color="dimension", markers=True)
```

### Scatter Plot
```python
fig = px.scatter(df, x="x_col", y="y_col", size="size_col", color="label",
                 hover_data=["name", "description"])
```

### Heatmap (Correlation Matrix)
```python
import plotly.graph_objects as go
import numpy as np

corr = df.corr()
fig = go.Figure(go.Heatmap(
    z=corr.values,
    x=corr.columns,
    y=corr.index,
    colorscale="RdBu",
    zmid=0,
))
```

### KPI Card with Indicator
```python
fig = go.Figure(go.Indicator(
    mode="number+delta",
    value=current_value,
    delta={"reference": previous_value, "relative": True},
    title={"text": "MRR"},
    number={"prefix": "$"},
))
fig.update_layout(height=200, margin=dict(t=20, b=20, l=20, r=20))
solara.FigurePlotly(fig)
```

## Theming

```python
# Apply consistent template across all charts
import plotly.io as pio

pio.templates.default = "plotly_white"

# Custom color sequence
COLORS = ["#4C6EF5", "#38D9A9", "#FCC419", "#FF6B6B", "#845EF7"]
fig = px.bar(df, ..., color_discrete_sequence=COLORS)
```

## Matplotlib in Solara

```python
import solara
import matplotlib.pyplot as plt
import io

@solara.component
def MatplotlibChart(df):
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(df["revenue"], bins=30, edgecolor="white")
    ax.set_title("Revenue Distribution")
    ax.set_xlabel("Revenue")

    # Render via solara.FigureMatplotlib
    solara.FigureMatplotlib(fig)
    plt.close(fig)  # Always close to free memory
```

## References

See `references/plotly-chart-gallery.md` for complete chart type examples.
