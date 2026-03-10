# Pages

Solara page modules live in this directory. Each file should export a top-level
`@solara.component` named `Page`.

## Convention

```
pages/
├── overview.py      # Landing / data upload page
├── query.py         # Conversational query interface (PRD-002)
├── dashboard.py     # Pinned results dashboard (PRD-003)
└── settings.py      # LLM and data source configuration
```

## Running a Single Page

```bash
solara run pages/query.py
```

## Running the Full Multi-Page App

Create a top-level `app.py` that imports and routes between pages:

```python
# app.py
import solara

routes = [
    solara.Route(path="/", component=..., label="Overview"),
    solara.Route(path="query", component=..., label="Query"),
    solara.Route(path="dashboard", component=..., label="Dashboard"),
    solara.Route(path="settings", component=..., label="Settings"),
]

@solara.component
def App():
    solara.AppLayout(children=[...])
```

Then run:

```bash
solara run app.py
```

## Creating a New Page

Use the OpenCode command:

```
/new-page
```

This scaffolds a new page file with standard layout and reactive state.
