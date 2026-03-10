# Solara Reactivity Reference

## Reactive Variables vs. useState

| Pattern | When to Use |
|---------|-------------|
| `solara.reactive(value)` | Shared state across multiple components (module-scope) |
| `solara.use_state(value)` | Local state within a single component |
| `solara.use_memo(fn, deps)` | Memoized derived values, recomputed when deps change |
| `solara.use_effect(fn, deps)` | Side effects (data loading, subscriptions) |

## Reactive Variable Deep Dive

```python
# Define at module scope — shared across all component instances
filter_column = solara.reactive("revenue")
date_range = solara.reactive((None, None))

@solara.component
def FilterControls():
    # .value reads the current value and subscribes to changes
    col = filter_column.value

    def on_change(new_col):
        filter_column.value = new_col  # triggers re-render of all subscribers

    solara.Select(label="Column", values=COLUMNS, value=col, on_value=on_change)
```

## Computed / Derived State

```python
@solara.component
def ResultCount(data, filters):
    # use_memo recalculates only when data or filters change
    filtered = solara.use_memo(
        lambda: apply_filters(data, filters),
        dependencies=[data, filters],
    )
    solara.Text(f"{len(filtered):,} rows match")
```

## Cross-Component Communication

Use reactive variables at module scope:

```python
# state.py
import solara

selected_rows = solara.reactive([])
active_chart_type = solara.reactive("bar")

# component_a.py
from .state import selected_rows

@solara.component
def DataTable(df):
    def on_select(rows):
        selected_rows.value = rows
    ...

# component_b.py
from .state import selected_rows

@solara.component
def DetailPanel():
    rows = selected_rows.value  # automatically re-renders when changed
    ...
```

## Async State Updates

For async operations use `asyncio` with care — Solara renders are synchronous:

```python
import asyncio
import solara

@solara.component
def AsyncLoader(url: str):
    result, set_result = solara.use_state(None)
    error, set_error = solara.use_state(None)

    async def fetch():
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                data = (await client.get(url)).json()
            set_result(data)
        except Exception as e:
            set_error(str(e))

    solara.use_effect(fetch, [url])

    if error:
        solara.Warning(f"Error: {error}")
    elif result is None:
        solara.ProgressLinear(True)
    else:
        solara.Text(str(result))
```
