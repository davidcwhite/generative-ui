# PRD-002: Conversational Data Analysis — NL Query Interface

**Status:** Draft
**Version:** 1.0
**Date:** 2026-03-10
**Depends on:** PRD-001

---

## 1. Overview

This PRD specifies the functional requirements, technology choices, and
implementation details for the conversational data analysis feature — the
core interaction loop where users load data, ask natural language questions,
and receive structured results.

---

## 2. Functional Requirements

### FR-01: Data Loading

| ID | Requirement |
|----|-------------|
| FR-01.1 | Users can upload a CSV or Parquet file via drag-and-drop or file picker |
| FR-01.2 | The system previews the first 10 rows and inferred schema on upload |
| FR-01.3 | Users can provide a plain-English description of the dataset (stored as PandasAI `description`) |
| FR-01.4 | A loading indicator is shown while the file is being parsed |
| FR-01.5 | Files up to 500 MB are supported; larger files trigger a warning with sampling options |

### FR-02: Natural Language Query Input

| ID | Requirement |
|----|-------------|
| FR-02.1 | A persistent text input accepts natural language questions at all times |
| FR-02.2 | Users can submit via Enter key or a "Analyze" button |
| FR-02.3 | The input is disabled (with loading state) while a query is in progress |
| FR-02.4 | Suggested example queries are shown when no data has been queried yet |
| FR-02.5 | Users can re-run any previous query from the session history |

### FR-03: Result Display

| ID | Requirement |
|----|-------------|
| FR-03.1 | Text/numeric answers render in a styled result card with the original query |
| FR-03.2 | DataFrame results render in a paginated, sortable data table |
| FR-03.3 | Chart results render as interactive Plotly figures (not static images) |
| FR-03.4 | Each result shows the timestamp and query that produced it |
| FR-03.5 | Users can expand a "View generated code" disclosure panel to inspect LLM-generated Python |

### FR-04: Session History

| ID | Requirement |
|----|-------------|
| FR-04.1 | All queries and results are preserved in-memory for the session lifetime |
| FR-04.2 | History is displayed in reverse-chronological order (newest first) |
| FR-04.3 | Users can clear history with a confirmation dialog |
| FR-04.4 | History survives Solara hot-reloads during development |

### FR-05: Error Handling

| ID | Requirement |
|----|-------------|
| FR-05.1 | LLM API errors display a user-friendly message with retry option |
| FR-05.2 | PandasAI code execution errors show the failing code and error message |
| FR-05.3 | Ambiguous queries trigger a clarification prompt (ask user to rephrase) |
| FR-05.4 | Rate limit errors include a countdown timer before auto-retry |

---

## 3. Technology Choices & Rationale

### Data Loading: pandas + pyarrow

```python
import pandas as pd
import pyarrow.parquet as pq

def load_dataframe(file_path: str) -> pd.DataFrame:
    ext = file_path.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        return pd.read_csv(file_path, low_memory=False)
    elif ext in ("parquet", "pq"):
        return pd.read_parquet(file_path)
    raise ValueError(f"Unsupported file type: .{ext}")
```

**Why not Polars:** PandasAI 2.3 operates natively on `pd.DataFrame`. Polars
requires conversion overhead and is not in PandasAI's supported type list.

### NL Query Engine: PandasAI 2.3 SmartDataframe

```python
from pandasai import SmartDataframe
from pandasai.llm.langchain import LangchainLLM
from langchain_anthropic import ChatAnthropic

def create_smart_df(df: pd.DataFrame, description: str) -> SmartDataframe:
    llm = LangchainLLM(ChatAnthropic(
        model="claude-sonnet-4-6",
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        temperature=0,
    ))
    return SmartDataframe(
        df,
        description=description,
        config={
            "llm": llm,
            "verbose": os.getenv("DEBUG", "false").lower() == "true",
            "save_charts": True,
            "save_charts_path": "assets/charts/",
            "open_charts": False,
            "enable_cache": True,
            "max_retries": 2,
        },
    )
```

**Why `temperature=0`:** Deterministic code generation reduces hallucination
in numerical operations. The LLM's job here is code writing, not creativity.

### Result Type Detection

```python
from pathlib import Path
import pandas as pd

def classify_result(raw) -> tuple[str, object]:
    """Returns (result_type, value) where type is one of:
    'text' | 'number' | 'dataframe' | 'chart'
    """
    if isinstance(raw, pd.DataFrame):
        return "dataframe", raw
    if isinstance(raw, (int, float)):
        return "number", raw
    if isinstance(raw, str):
        p = Path(raw)
        if p.exists() and p.suffix.lower() in (".png", ".jpg", ".svg"):
            return "chart", str(p)
        return "text", raw
    if isinstance(raw, list):
        return "text", "\n".join(f"- {item}" for item in raw)
    return "text", str(raw)
```

---

## 4. Implementation Details

### Reactive State Model

```python
# state.py — module-level reactive variables
import solara
import pandas as pd
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class QueryResult:
    query: str
    result_type: str       # 'text' | 'number' | 'dataframe' | 'chart'
    value: object
    code: str | None       # LLM-generated Python code
    timestamp: datetime = field(default_factory=datetime.utcnow)
    error: str | None = None

# Reactive state
raw_df: solara.Reactive[pd.DataFrame | None] = solara.reactive(None)
dataset_description: solara.Reactive[str] = solara.reactive("")
query_history: solara.Reactive[list[QueryResult]] = solara.reactive([])
is_loading: solara.Reactive[bool] = solara.reactive(False)
```

### Component Hierarchy

```
Page
├── AppBar (title, dataset name badge)
├── Row
│   ├── DatasetPanel (left sidebar, 320px)
│   │   ├── FileUpload
│   │   ├── DataPreview (first 10 rows)
│   │   └── DescriptionInput
│   └── Column (flex: 1)
│       ├── QueryInput
│       │   ├── InputText
│       │   └── Button("Analyze")
│       └── ResultsTimeline
│           └── ResultCard × N (reverse chronological)
│               ├── QueryText
│               ├── ResultRenderer (text | table | chart)
│               ├── Timestamp
│               └── CodeDisclosure (collapsible)
```

### File Upload Component

```python
@solara.component
def FileUpload():
    def on_file(file_info):
        import tempfile, os
        with tempfile.NamedTemporaryFile(
            suffix=f".{file_info['name'].rsplit('.', 1)[-1]}",
            delete=False
        ) as tmp:
            tmp.write(file_info["data"])
            tmp_path = tmp.name

        try:
            df = load_dataframe(tmp_path)
            raw_df.value = df
        except Exception as e:
            solara.Warning(f"Failed to load file: {e}")
        finally:
            os.unlink(tmp_path)

    solara.FileDrop(
        label="Drop a CSV or Parquet file here",
        on_file=on_file,
        lazy=False,
    )
    if raw_df.value is not None:
        solara.Success(f"Loaded {len(raw_df.value):,} rows × {len(raw_df.value.columns)} columns")
```

### Query Execution (Thread-safe)

```python
import threading

def run_query_in_thread(smart_df: SmartDataframe, query: str):
    """Run PandasAI query in a background thread to avoid blocking Solara."""
    is_loading.value = True
    result = QueryResult(query=query, result_type="text", value="")

    def _run():
        try:
            raw = smart_df.chat(query)
            rtype, rval = classify_result(raw)
            result.result_type = rtype
            result.value = rval
            result.code = getattr(smart_df, "last_code_generated", None)
        except Exception as e:
            result.error = str(e)
        finally:
            history = query_history.value.copy()
            history.insert(0, result)
            query_history.value = history
            is_loading.value = False

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
```

---

## 5. Acceptance Criteria

| Criteria | Pass Condition |
|----------|----------------|
| File upload → preview | CSV/Parquet loads within 3s for files ≤ 50MB |
| NL query → result | Response appears within 15s (P95) |
| DataFrame result | Renders paginated table with sort controls |
| Chart result | Renders interactive Plotly figure (not static image) |
| Code disclosure | Generated Python code is viewable per result |
| Error state | Any exception shows friendly message + retry option |
| History persistence | Refresh via Solara hot-reload preserves in-memory state |
