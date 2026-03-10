---
description: "Scaffold a new Solara page with standard layout, routing, and reactive state"
agent: coder
subtask: false
---

Scaffold a new Solara page for this project. Ask the user for:
1. The page name (e.g., "overview", "query", "settings")
2. What the page should display

Then create a file at `pages/{name}.py` with:
- A top-level `@solara.component` named `Page`
- Appropriate imports
- A basic layout using `solara.Column` and `solara.Card`
- Placeholder reactive state variables at the top of the file
- A docstring explaining the page's purpose

Follow the patterns in `.opencode/skills/solara-component/SKILL.md`.

After creating the page, show the user how to run it with:
```bash
solara run pages/{name}.py
```
