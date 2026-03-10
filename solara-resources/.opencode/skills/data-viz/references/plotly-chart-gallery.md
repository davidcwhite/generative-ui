# Plotly Chart Gallery for Solara Data Apps

## Time Series

```python
import plotly.express as px

# Multi-series line chart with range selector
fig = px.line(df, x="date", y="value", color="series", title="Trend Over Time")
fig.update_xaxes(
    rangeslider_visible=True,
    rangeselector=dict(
        buttons=[
            dict(count=1, label="1M", step="month", stepmode="backward"),
            dict(count=3, label="3M", step="month", stepmode="backward"),
            dict(count=1, label="YTD", step="year", stepmode="todate"),
            dict(step="all"),
        ]
    ),
)
```

## Distribution

```python
# Histogram with KDE overlay
fig = px.histogram(df, x="revenue", nbins=40, marginal="violin",
                   color="segment", opacity=0.7, barmode="overlay")

# Box plots by category
fig = px.box(df, x="region", y="revenue", color="region",
             points="outliers", notched=True)
```

## Composition

```python
# Stacked bar with percentage mode
fig = px.bar(df, x="month", y="revenue", color="product",
             barmode="stack", text_auto=".1%")

# Treemap for hierarchical data
fig = px.treemap(df, path=["region", "country", "product"],
                 values="revenue", color="growth_rate",
                 color_continuous_scale="RdYlGn", color_continuous_midpoint=0)
```

## Relationships

```python
# Bubble chart
fig = px.scatter(df, x="spend", y="revenue", size="customers",
                 color="region", hover_name="segment",
                 size_max=60, log_x=True)

# Parallel coordinates for multi-dimensional analysis
fig = px.parallel_coordinates(df,
    dimensions=["revenue", "cost", "margin", "growth"],
    color="segment_id",
    color_continuous_scale="Viridis",
)
```

## Geographic

```python
# Choropleth map
fig = px.choropleth(df, locations="country_code", color="revenue",
                    hover_name="country", color_continuous_scale="Blues",
                    title="Revenue by Country")
```

## Dashboards (Subplots)

```python
from plotly.subplots import make_subplots
import plotly.graph_objects as go

fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=["Revenue Trend", "By Region", "Distribution", "Top Products"],
    specs=[[{"type": "scatter"}, {"type": "bar"}],
           [{"type": "histogram"}, {"type": "bar"}]],
)

fig.add_trace(go.Scatter(x=trend_df["date"], y=trend_df["revenue"],
                          mode="lines", name="Revenue"), row=1, col=1)
fig.add_trace(go.Bar(x=region_df["region"], y=region_df["revenue"],
                     name="Region"), row=1, col=2)
# ... add more traces

fig.update_layout(height=700, showlegend=False, template="plotly_white")
solara.FigurePlotly(fig)
```
