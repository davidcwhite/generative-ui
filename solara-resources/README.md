# Solara Resources

A resource hub for building AI-powered conversational data analysis applications
using **Solara** and **PandasAI 2.3**.

## What's in this Repository

| Directory | Contents |
|-----------|----------|
| `.opencode/` | OpenCode configuration, agents, skills, and commands |
| `prds/` | Product Requirements Documents for the platform |
| `pages/` | Solara page modules (add your implementation here) |
| `assets/` | CSS theme overrides |

## Quick Start

### 1. Clone and set up Python environment

```bash
git clone https://github.com/davidcwhite/solara-resources.git
cd solara-resources

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and add your API key:
# ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run the example page

```bash
solara run pages/query.py
```

Then open http://localhost:8765 in your browser.

---

## OpenCode Skills

This repo includes three OpenCode skills for developing Solara + PandasAI apps:

| Skill | Trigger phrases |
|-------|----------------|
| `solara-component` | "create a component", "add a Solara page", "build a reactive UI" |
| `pandasai-query` | "set up PandasAI", "write a query", "configure the LLM" |
| `data-viz` | "add a chart", "visualize this data", "create a Plotly figure" |

### OpenCode Commands

| Command | What it does |
|---------|-------------|
| `/new-page` | Scaffold a new Solara page with layout and state |
| `/add-chart` | Add a Plotly chart to an existing component |
| `/setup-pandasai` | Initialize SmartDataframe with LLM configuration |

---

## Architecture

See the PRDs for detailed specifications:

- **[PRD-001](prds/PRD-001-project-overview.md)** — Vision, personas, tech stack decisions
- **[PRD-002](prds/PRD-002-conversational-analysis.md)** — NL query interface, PandasAI integration
- **[PRD-003](prds/PRD-003-dashboard-components.md)** — Dashboard components, layout, export

### Technology Choices

| Technology | Version | Role |
|------------|---------|------|
| Solara | ≥1.35 | Reactive Python web framework |
| PandasAI | 2.3.x | Natural language → pandas code generation |
| Anthropic Claude | claude-sonnet-4-6 | LLM backend for query generation |
| Plotly | ≥5.20 | Interactive data visualization |
| pandas | ≥2.0 | DataFrame processing |

---

## Development with OpenCode

This repository is configured for [OpenCode](https://opencode.ai). Start a session:

```bash
opencode
```

OpenCode will load the project agents (`coder`, `architect`, `analyst`) and make
the skills and commands available automatically.

### Agents

| Agent | Role |
|-------|------|
| `coder` (primary) | Implements Solara components and PandasAI integrations |
| `architect` | Designs system architecture and refines PRDs |
| `analyst` | Writes and debugs PandasAI queries |

---

## License

MIT
