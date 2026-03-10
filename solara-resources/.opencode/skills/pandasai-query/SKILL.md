---
name: pandasai-query
description: "Configure PandasAI 2.3 agents, write natural language queries, and handle DataFrame responses in Solara apps"
license: MIT
compatibility: opencode
metadata:
  audience: data-engineers
  workflow: pandasai-integration
  version: "1.0.0"
  pandasai-version: "2.3.*"
---

## Overview

Use this skill when configuring PandasAI 2.3, writing NL queries, debugging
LLM-generated code, or integrating PandasAI responses into Solara components.

## When to Use

Trigger this skill when the user asks to:
- Set up a PandasAI SmartDataframe or SmartDatalake
- Write or debug a `.chat()` query
- Handle different response types (string, DataFrame, chart)
- Configure an LLM provider for PandasAI
- Add custom prompts or instructions to the PandasAI agent
- Handle privacy, security, or sandboxing requirements

## PandasAI 2.3 Setup

### Basic SmartDataframe

```python
import pandas as pd
from pandasai import SmartDataframe
from pandasai.llm import BambooLLM  # built-in; requires PANDASAI_API_KEY

llm = BambooLLM()  # or use Anthropic/OpenAI LLM (see below)

df = SmartDataframe(
    pd.read_csv("data/sales.csv"),
    config={
        "llm": llm,
        "verbose": False,           # Set True for dev/debugging
        "enforce_privacy": False,   # Set True to mask column names in LLM prompts
        "save_charts": True,        # Persist generated charts to disk
        "save_charts_path": "assets/charts/",
        "open_charts": False,       # Don't open charts in browser during server runs
    },
    description="Monthly sales data with columns: date, region, product, revenue, units_sold",
)
```

### Using Anthropic as the LLM

```python
from pandasai.llm.langchain import LangchainLLM
from langchain_anthropic import ChatAnthropic

anthropic_llm = ChatAnthropic(
    model="claude-sonnet-4-6",
    anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
)
llm = LangchainLLM(anthropic_llm)

df = SmartDataframe(raw_df, config={"llm": llm})
```

### Multi-Dataset with SmartDatalake

```python
from pandasai import SmartDatalake

lake = SmartDatalake(
    [sales_df, products_df, customers_df],
    config={"llm": llm, "verbose": False},
)

result = lake.chat("Which product category had the highest revenue growth last quarter?")
```

## Query Patterns

### Basic Query

```python
result = df.chat("What is the average revenue by region?")
# Returns: str (summary), DataFrame (tabular result), or Chart path
```

### Typed Response Handling

```python
import pandas as pd
from pathlib import Path

def handle_pandasai_result(result):
    """Normalize PandasAI response to (type, value) tuple."""
    if isinstance(result, pd.DataFrame):
        return "dataframe", result
    elif isinstance(result, str) and Path(result).exists():
        return "chart", result  # path to saved chart image
    elif isinstance(result, (int, float)):
        return "number", result
    else:
        return "text", str(result)
```

### Integrating with Solara

```python
import solara

@solara.component
def NLQueryInterface(df: pd.DataFrame, smart_df: SmartDataframe):
    query, set_query = solara.use_state("")
    result, set_result = solara.use_state(None)
    result_type, set_result_type = solara.use_state(None)
    loading, set_loading = solara.use_state(False)
    error, set_error = solara.use_state(None)

    def run_query():
        if not query.strip():
            return
        set_loading(True)
        set_error(None)
        try:
            raw = smart_df.chat(query)
            rtype, rval = handle_pandasai_result(raw)
            set_result_type(rtype)
            set_result(rval)
        except Exception as e:
            set_error(str(e))
        finally:
            set_loading(False)

    with solara.Column():
        solara.InputText(
            label="Ask a question about your data...",
            value=query,
            on_value=set_query,
        )
        solara.Button("Analyze", on_click=run_query, disabled=loading)

        if loading:
            solara.ProgressLinear(True)
        elif error:
            solara.Warning(f"Query failed: {error}")
        elif result is not None:
            if result_type == "dataframe":
                solara.DataFrame(result)
            elif result_type == "chart":
                solara.Image(result)
            else:
                solara.Markdown(f"**Result:** {result}")
```

## Custom Instructions (Prompt Customization)

```python
from pandasai.prompts import AbstractPrompt

# Add domain context to every query
df = SmartDataframe(
    raw_df,
    config={"llm": llm},
    description="""
    This dataset contains B2B SaaS subscription data.
    Key columns:
    - mrr: Monthly Recurring Revenue in USD
    - churn_rate: Monthly percentage of customers who cancelled
    - cohort_month: Month the customer first subscribed (YYYY-MM format)
    When calculating growth rates, use month-over-month unless specified.
    """,
)
```

## Debugging

```python
# Enable verbose mode to see generated Python code
df_debug = SmartDataframe(raw_df, config={"llm": llm, "verbose": True})
result = df_debug.chat("Show me the top 5 customers by revenue")
# Prints the LLM-generated Python code to stdout
```

## References

See `references/pandasai-2.3-api.md` for full API surface.
See `references/llm-providers.md` for all supported LLM configurations.
