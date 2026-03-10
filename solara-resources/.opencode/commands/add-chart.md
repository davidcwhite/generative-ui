---
description: "Add a Plotly chart to an existing Solara component, wired to reactive state"
agent: coder
subtask: false
---

Add an interactive Plotly chart to an existing Solara component or page.

Ask the user:
1. Which file to modify
2. What data to visualize (column names, aggregation)
3. Chart type preference (bar, line, scatter, heatmap, indicator)

Then:
1. Read the target file
2. Add the appropriate Plotly figure using `plotly.express` or `plotly.graph_objects`
3. Wrap it in `solara.FigurePlotly(fig)`
4. Wire it to the existing reactive state if applicable

Follow patterns in `.opencode/skills/data-viz/SKILL.md`.

Apply `template="plotly_white"` and consistent `margin=dict(t=40, b=20, l=20, r=20)`.
