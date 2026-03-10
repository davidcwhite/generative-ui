# PandasAI 2.3 API Reference

## Installation

```bash
pip install "pandasai==2.3.*"
# With Langchain LLM support:
pip install "pandasai[langchain]==2.3.*" langchain-anthropic
```

## SmartDataframe

### Constructor

```python
SmartDataframe(
    df: pd.DataFrame | str,          # DataFrame or path to CSV/Parquet
    name: str = "",                   # Optional dataset name
    description: str = "",            # Domain context for LLM
    config: SmartDatalakeConfig = {}, # See config options below
)
```

### Config Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `llm` | LLM | BambooLLM | Language model to use |
| `verbose` | bool | False | Print generated code |
| `enforce_privacy` | bool | False | Mask column names in LLM prompts |
| `save_charts` | bool | False | Persist chart images |
| `save_charts_path` | str | "exports/charts" | Directory for chart images |
| `open_charts` | bool | True | Open charts after generation |
| `max_retries` | int | 3 | Retry attempts on LLM error |
| `custom_whitelisted_dependencies` | list[str] | [] | Extra imports allowed in sandbox |
| `enable_cache` | bool | True | Cache LLM responses |
| `middlewares` | list | [] | Response transformation middlewares |

### Methods

```python
df.chat(query: str) -> str | pd.DataFrame | str  # str = chart path
df.clear_cache()                                   # Clear response cache
df.last_prompt                                     # Get last LLM prompt sent
df.last_code_generated                             # Get last Python code generated
df.last_code_executed                              # Get last executed code
df.last_result                                     # Get last raw result
```

## SmartDatalake

```python
SmartDatalake(
    dfs: list[pd.DataFrame | SmartDataframe],
    config: SmartDatalakeConfig = {},
)
lake.chat(query: str) -> str | pd.DataFrame | str
```

## Response Types

| Result | Type | Notes |
|--------|------|-------|
| Numeric answer | `int | float` | e.g., "What is the average?" |
| Text summary | `str` | Non-path string |
| Tabular result | `pd.DataFrame` | Multi-row results |
| Chart | `str` (file path) | Path to saved PNG |
| List | `list` | Simple enumeration answers |

## Built-in LLMs

```python
from pandasai.llm import BambooLLM     # PandasAI cloud (requires PANDASAI_API_KEY)
from pandasai.llm import OpenAI        # Requires OPENAI_API_KEY
from pandasai.llm import GooglePalm    # Requires GOOGLE_API_KEY
from pandasai.llm import HuggingFaceLLM
```

## Version 2.3 Changes from 2.2

- Improved code sandbox security — stricter import allowlist
- `custom_whitelisted_dependencies` replaces `custom_allowed_imports`
- Chart generation now requires explicit `save_charts=True`
- `SmartDatalake` supports heterogeneous schema DataFrames
- Response caching is on by default (set `enable_cache=False` to disable)
