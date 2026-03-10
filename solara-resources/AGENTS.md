# Solara + PandasAI Resources — Agent Instructions

## Project Overview

This repository contains resources, skills, PRDs, and scaffolding for building
AI-powered conversational data analysis applications using:

- **Solara** (≥1.35) — Python reactive web framework for data apps
- **PandasAI 2.3** — Natural language querying layer over pandas DataFrames
- **Plotly** — Interactive charting library integrated with Solara
- **Python 3.10+** — Minimum runtime requirement

## Project Structure

```
.opencode/           OpenCode skills, agents, commands, and config
prds/                Product Requirements Documents (PRDs)
pages/               Solara page modules (when implementing the app)
assets/              CSS theme overrides and static assets
requirements.txt     Pinned Python dependencies
```

## Coding Standards

- Use type hints everywhere (Python 3.10+ syntax — `X | Y` unions)
- Prefer `@solara.component` decorator over class-based components
- Use `solara.reactive()` for shared state; `solara.use_state()` for local state
- Keep each Solara page in its own file under `pages/`
- PandasAI agents must be initialized with `pandasai==2.3.*` API surface
- Use `SmartDataframe` for single-DataFrame queries; `SmartDatalake` for multi-dataset

## PandasAI 2.3 Conventions

```python
from pandasai import SmartDataframe
from pandasai.llm.langchain import LangchainLLM  # or use pandasai built-in LLMs

# Always configure the LLM explicitly — never rely on global env defaults
llm = ...
df = SmartDataframe(raw_df, config={"llm": llm, "verbose": False})
result = df.chat("What is the average revenue by region?")
```

## Solara Component Conventions

```python
import solara

@solara.component
def MyComponent(data: list, title: str = "Chart"):
    # Use use_state for local UI state
    selected, set_selected = solara.use_state(None)

    with solara.Card(title):
        solara.Select(label="Item", values=data, value=selected, on_value=set_selected)
```

## References

- PRD-001: Project vision and technology decisions → `prds/PRD-001-project-overview.md`
- PRD-002: Conversational analysis requirements → `prds/PRD-002-conversational-analysis.md`
- PRD-003: Dashboard component requirements → `prds/PRD-003-dashboard-components.md`
- Solara docs: https://solara.dev/docs
- PandasAI docs: https://docs.pandas-ai.com
