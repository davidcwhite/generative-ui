# `.agents/` — Cross-tool Agent Skills

This folder holds **Agent Skills** that any AI coding tool working on this repo can load. Skills are self-contained `SKILL.md` files (with YAML frontmatter) following the open [Agent Skills](https://agents.md/) standard popularised by Anthropic.

We intentionally use `.agents/skills/` rather than a tool-specific path so the skills are vendor-neutral and travel with the repo.

## Tool support

| Tool | Reads `.agents/skills/` natively? | How to opt in |
|---|---|---|
| **Cursor** | Yes | Nothing to do — Cursor scans `.cursor/skills/`, `.agents/skills/`, `.claude/skills/`, `.codex/skills/` automatically. See [Cursor docs](https://cursor.com/docs/skills). |
| **opencode** | Yes | Nothing to do — opencode scans `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` automatically. See [opencode docs](https://opencode.ai/docs/skills/). |
| **Claude Code** | Not yet | Symlink or copy `.claude/skills` → `.agents/skills` in your local checkout (per-developer choice; not committed). |

### Claude Code opt-in (one-time, per checkout)

```bash
ln -s ../.agents/skills .claude/skills
```

This is intentionally not committed so each contributor can choose whether to mirror the folder.

## Installed skills

### `frontend-design/`

Anthropic's official frontend design skill from [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design). Pushes the agent toward distinctive, intentional aesthetics and away from generic AI-generated UI patterns. Used as the **creative-direction** layer when generating any frontend code.

- Apache License 2.0 — full terms in [skills/frontend-design/LICENSE.txt](skills/frontend-design/LICENSE.txt)
- Copied verbatim — do not edit. If we need to customise it, fork into a separate skill folder so attribution stays intact.

### `generative-ui-design/`

Custom project skill that wires the agent into this repo's documented design system in [docs/ux/](../docs/ux/). Used as the **implementation-rules** layer — Card shell, gradient-header convention, stone palette, inline-SVG icons, React.memo + Recharts performance patterns, generative-UI tool-to-component flow.

Loaded automatically on UI tasks because of the keywords in its `description` frontmatter (React, Tailwind, components, dashboard, chat surfaces, etc.).

## Layout convention

```
.agents/
├── README.md                  ← this file
└── skills/
    └── <skill-name>/
        ├── SKILL.md           ← required, with YAML frontmatter (name, description)
        ├── LICENSE.txt        ← required if the skill came from a third party
        └── <other files>      ← optional supporting docs/scripts
```

## Adding a new skill

1. Create `.agents/skills/<your-skill-name>/SKILL.md` with frontmatter:

   ```yaml
   ---
   name: your-skill-name
   description: One sentence that includes the trigger keywords agents will match against. Be specific about WHEN this skill applies.
   ---
   ```

2. Keep the body focused — agents load the skill when the description matches, then read the body. Aim for a few KB.
3. If the skill came from a third party, copy its license file alongside `SKILL.md`.
4. List the new skill in this README's "Installed skills" section.

## Why not `AGENTS.md`?

`AGENTS.md` (the file at https://agents.md/) is for **rules and project context** — a single Markdown doc shared with agents on every interaction. Skills are a different concern: **named, on-demand capabilities** that agents load only when the task description matches. The two are complementary and we may add an `AGENTS.md` at the repo root later.
