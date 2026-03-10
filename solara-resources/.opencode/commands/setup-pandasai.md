---
description: "Set up a PandasAI 2.3 SmartDataframe or SmartDatalake with LLM configuration"
agent: coder
subtask: false
---

Set up PandasAI 2.3 for this project. Ask the user:
1. Which LLM provider to use (Anthropic Claude / OpenAI / BambooLLM)
2. Whether they have one DataFrame or multiple (SmartDataframe vs SmartDatalake)
3. The data source (CSV path, Parquet, or in-memory DataFrame)
4. Any domain context/description for the dataset

Then create or update the relevant file with:
- LLM configuration using the chosen provider
- SmartDataframe or SmartDatalake initialization
- A `description` string with domain context
- A sample `.chat()` call with a representative query
- Error handling for common failures

Reference: `.opencode/skills/pandasai-query/SKILL.md`

Also add the required dependencies to `requirements.txt` if not already present:
- `pandasai==2.3.*`
- Provider-specific: `langchain-anthropic` / `langchain-openai`
