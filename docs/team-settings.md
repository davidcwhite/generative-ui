# Portable team settings for React + Vite

This guide describes a minimal settings page where a team administrator configures how an AI assistant works. It is intentionally a normal settings surface rather than an onboarding wizard.

The page supports:

- General team and desk defaults
- A global system instruction
- Instructions scoped to one or more datasets
- Dataset enablement and default filters
- Reusable skills
- Multi-step workflows
- Shared saved prompts
- Automatic persistence

The examples use React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. Replace the local-storage adapter with an API in production.

## 1. Install the UI primitives

Initialize shadcn/ui in an existing Vite project:

```bash
npx shadcn@latest init
npx shadcn@latest add button input textarea select switch badge separator
```

The settings page only needs these primitives:

- Text fields: `Input` and `Textarea`
- Dataset and skill enablement: `Switch`
- Desk, field, and operator selection: `Select`
- Add, save, and delete actions: `Button`
- Dataset scope labels: `Badge`
- Section boundaries: `Separator`

Avoid wrapping every setting in a `Card`. A single content column with separators is calmer and easier to scan.

## 2. Suggested structure

```text
src/
  features/team-settings/
    TeamSettingsPage.tsx
    model.ts
    storage.ts
    ScopePicker.tsx
    sections/
      GeneralSettings.tsx
      InstructionSettings.tsx
      DataSettings.tsx
      SkillSettings.tsx
      WorkflowSettings.tsx
      PromptSettings.tsx
  components/ui/
    button.tsx
    input.tsx
    textarea.tsx
    select.tsx
    switch.tsx
    badge.tsx
    separator.tsx
```

Keep the data model independent from React so it can also be used by API handlers, validation, and tests.

## 3. Data contract

```ts
// model.ts
export type DatasetId = "issuance" | "allocations" | "comparables" | "pipeline"
export type Scope = "global" | DatasetId

export interface TeamProfile {
  teamName: string
  deskType: string
  currencies: string[]
}

export interface Instruction {
  id: string
  text: string
  scopes: Scope[]
  enabled: boolean
  createdAt: number
}

export interface FilterRule {
  id: string
  field: string
  operator: "is" | "is not" | "at least" | "at most"
  value: string
}

export interface DatasetConfig {
  id: DatasetId
  enabled: boolean
  filters: FilterRule[]
}

export interface SkillConfig {
  id: string
  enabled: boolean
  note?: string
}

export interface WorkflowStep {
  id: string
  label: string
  detail: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  enabled: boolean
  steps: WorkflowStep[]
}

export interface SavedPrompt {
  id: string
  title: string
  body: string
  scopes: Scope[]
}

export interface TeamSettings {
  version: 1
  profile: TeamProfile
  systemInstruction: string
  instructions: Instruction[]
  datasets: DatasetConfig[]
  skills: SkillConfig[]
  workflows: Workflow[]
  prompts: SavedPrompt[]
}
```

An instruction is either global or dataset-scoped. Global means it applies to every request. Dataset-scoped instructions can target several datasets:

```ts
const allocationRule: Instruction = {
  id: crypto.randomUUID(),
  text: "Report real-money share as the headline book-quality measure.",
  scopes: ["allocations"],
  enabled: true,
  createdAt: Date.now(),
}

const crossDatasetRule: Instruction = {
  id: crypto.randomUUID(),
  text: "Exclude self-led transactions unless explicitly requested.",
  scopes: ["issuance", "comparables"],
  enabled: true,
  createdAt: Date.now(),
}
```

When handling a request, combine the global instruction with rules for the datasets being queried:

```ts
export function applicableInstructions(
  settings: TeamSettings,
  datasets: DatasetId[],
): Instruction[] {
  return settings.instructions.filter(
    (instruction) =>
      instruction.enabled &&
      (instruction.scopes.includes("global") ||
        datasets.some((dataset) => instruction.scopes.includes(dataset))),
  )
}
```

## 4. Reference metadata

Keep display metadata separate from saved configuration:

```ts
export interface DatasetMeta {
  id: DatasetId
  name: string
  description: string
  filterFields: {
    field: string
    label: string
    suggestions: string[]
  }[]
}

export const DATASETS: DatasetMeta[] = [
  {
    id: "issuance",
    name: "Issuance",
    description: "Primary deals, pricing, size, tenor, spread, NIP, and books.",
    filterFields: [
      { field: "currency", label: "Currency", suggestions: ["EUR", "USD", "GBP"] },
      { field: "rating_bucket", label: "Rating bucket", suggestions: ["IG", "HY"] },
      { field: "self_led", label: "Self-led deals", suggestions: ["excluded", "included"] },
    ],
  },
  {
    id: "allocations",
    name: "Allocations",
    description: "Investor allocations by account type and geography.",
    filterFields: [
      {
        field: "investor_type",
        label: "Investor type",
        suggestions: ["Asset manager", "Insurance", "Bank", "Hedge fund"],
      },
      { field: "geography", label: "Geography", suggestions: ["Europe", "UK", "US", "Asia"] },
    ],
  },
  // Add comparables and pipeline in the same shape.
]
```

## 5. Defaults and persistence

```ts
// storage.ts
import type { TeamSettings } from "./model"

const STORAGE_KEY = "team-settings-v1"

export const DEFAULT_SETTINGS: TeamSettings = {
  version: 1,
  profile: {
    teamName: "",
    deskType: "DCM Syndicate",
    currencies: ["EUR"],
  },
  systemInstruction: "",
  instructions: [],
  datasets: [
    { id: "issuance", enabled: true, filters: [] },
    { id: "allocations", enabled: true, filters: [] },
    { id: "comparables", enabled: true, filters: [] },
    { id: "pipeline", enabled: true, filters: [] },
  ],
  skills: [],
  workflows: [],
  prompts: [],
}

export function loadSettings(): TeamSettings {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return DEFAULT_SETTINGS

    const parsed = JSON.parse(value) as TeamSettings
    return parsed.version === 1 ? parsed : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: TeamSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
```

Use local storage only for a prototype. In production:

1. Load settings with `GET /api/teams/:teamId/settings`.
2. Save changes with a debounced `PATCH`.
3. Validate payloads with Zod on both client and server.
4. Require an administrator role for writes.
5. Store `updatedBy`, `updatedAt`, and revision history for auditability.

## 6. Minimal page shell

Use a narrow navigation column and one content column. Each navigation item should reveal one section without changing the URL unless deep links are required.

```tsx
// TeamSettingsPage.tsx
import { useEffect, useState } from "react"
import type { TeamSettings } from "./model"
import { loadSettings, saveSettings } from "./storage"

type SectionId =
  | "general"
  | "instructions"
  | "data"
  | "skills"
  | "workflows"
  | "prompts"

const sections: { id: SectionId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "instructions", label: "Instructions" },
  { id: "data", label: "Data" },
  { id: "skills", label: "Skills" },
  { id: "workflows", label: "Workflows" },
  { id: "prompts", label: "Saved prompts" },
]

export function TeamSettingsPage() {
  const [settings, setSettings] = useState<TeamSettings>(loadSettings)
  const [section, setSection] = useState<SectionId>("general")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    saveSettings(settings)
    setSaved(true)
    const timer = window.setTimeout(() => setSaved(false), 1200)
    return () => window.clearTimeout(timer)
  }, [settings])

  return (
    <div className="flex min-h-screen flex-col bg-stone-50/40">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Team settings</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configure how the assistant works for your desk.
            </p>
          </div>
          <span aria-live="polite" className="text-xs text-muted-foreground">
            {saved ? "Saved" : ""}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-12 px-6">
        <nav aria-label="Settings" className="w-40 shrink-0 py-8">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? "page" : undefined}
              className={
                "mb-0.5 w-full rounded-md px-2.5 py-2 text-left text-sm " +
                (section === item.id
                  ? "bg-stone-100 font-medium text-stone-950"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900")
              }
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 py-8">
          {section === "general" && (
            <GeneralSettings settings={settings} onChange={setSettings} />
          )}
          {section === "instructions" && (
            <InstructionSettings settings={settings} onChange={setSettings} />
          )}
          {/* Render the remaining sections in the same way. */}
        </main>
      </div>
    </div>
  )
}
```

For mobile, replace the left navigation with a shadcn `Select` above the content.

## 7. Shared section layout

```tsx
import { Separator } from "@/components/ui/separator"

export function SettingsHeader(props: {
  title: string
  description: string
}) {
  return (
    <header className="mb-7">
      <h2 className="text-xl font-semibold tracking-tight">{props.title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {props.description}
      </p>
    </header>
  )
}

export function SettingGroup(props: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="py-6 first:pt-0">
      <h3 className="text-sm font-medium">{props.title}</h3>
      {props.description && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {props.description}
        </p>
      )}
      <div className="mt-4">{props.children}</div>
      <Separator className="mt-6" />
    </section>
  )
}
```

Use typography, whitespace, and separators for hierarchy. Avoid shadows, nested cards, large illustrations, progress indicators, and decorative badges.

## 8. General settings

```tsx
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function GeneralSettings({ settings, onChange }: SettingsProps) {
  const patchProfile = (patch: Partial<TeamSettings["profile"]>) =>
    onChange({
      ...settings,
      profile: { ...settings.profile, ...patch },
    })

  return (
    <>
      <SettingsHeader
        title="General"
        description="Basic details used to tailor terminology and defaults."
      />

      <SettingGroup title="Team">
        <div className="max-w-md space-y-4">
          <label className="block text-xs font-medium">
            Team name
            <Input
              className="mt-1.5"
              value={settings.profile.teamName}
              onChange={(event) => patchProfile({ teamName: event.target.value })}
              placeholder="EUR IG Syndicate"
            />
          </label>

          <label className="block text-xs font-medium">
            Desk
            <Select
              value={settings.profile.deskType}
              onValueChange={(deskType) => patchProfile({ deskType })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DCM Syndicate">DCM Syndicate</SelectItem>
                <SelectItem value="DCM Origination">DCM Origination</SelectItem>
                <SelectItem value="FIG DCM">FIG DCM</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>
      </SettingGroup>
    </>
  )
}
```

## 9. Scope picker

Global and dataset scopes should be mutually exclusive. Choosing Global clears dataset selections; choosing a dataset clears Global.

```tsx
import { Button } from "@/components/ui/button"
import type { Scope } from "./model"

const scopes: Scope[] = [
  "global",
  "issuance",
  "allocations",
  "comparables",
  "pipeline",
]

export function ScopePicker(props: {
  value: Scope[]
  onChange: (value: Scope[]) => void
}) {
  function toggle(scope: Scope) {
    if (scope === "global") {
      props.onChange(["global"])
      return
    }

    const datasets = props.value.filter((item) => item !== "global")
    const next = datasets.includes(scope)
      ? datasets.filter((item) => item !== scope)
      : [...datasets, scope]

    props.onChange(next.length ? next : ["global"])
  }

  return (
    <div role="group" aria-label="Applies to" className="flex flex-wrap gap-1.5">
      {scopes.map((scope) => {
        const selected = props.value.includes(scope)
        return (
          <Button
            key={scope}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            onClick={() => toggle(scope)}
            className="h-7 rounded-full px-2.5 text-xs capitalize"
          >
            {scope}
          </Button>
        )
      })}
    </div>
  )
}
```

## 10. Instructions

The system instruction is a single textarea. Dataset instructions are compact rows with an enabled switch, editable scopes, and a delete action.

```tsx
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export function InstructionSettings({ settings, onChange }: SettingsProps) {
  const [draft, setDraft] = useState("")
  const [scopes, setScopes] = useState<Scope[]>(["global"])

  function addInstruction() {
    if (!draft.trim()) return

    const instruction: Instruction = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      scopes,
      enabled: true,
      createdAt: Date.now(),
    }

    onChange({
      ...settings,
      instructions: [instruction, ...settings.instructions],
    })
    setDraft("")
    setScopes(["global"])
  }

  return (
    <>
      <SettingsHeader
        title="Instructions"
        description="Standing guidance for the team and its datasets."
      />

      <SettingGroup
        title="System instruction"
        description="Applied to every team conversation."
      >
        <Textarea
          rows={6}
          value={settings.systemInstruction}
          onChange={(event) =>
            onChange({ ...settings, systemInstruction: event.target.value })
          }
        />
      </SettingGroup>

      <SettingGroup
        title="Data instructions"
        description="Global or attached to one or more datasets."
      >
        <div className="divide-y border-y">
          {settings.instructions.map((instruction) => (
            <div key={instruction.id} className="flex items-start gap-3 py-4">
              <Switch
                checked={instruction.enabled}
                aria-label={`Enable ${instruction.text}`}
                onCheckedChange={(enabled) =>
                  onChange({
                    ...settings,
                    instructions: settings.instructions.map((item) =>
                      item.id === instruction.id ? { ...item, enabled } : item,
                    ),
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5">{instruction.text}</p>
                <ScopePicker
                  value={instruction.scopes}
                  onChange={(nextScopes) =>
                    onChange({
                      ...settings,
                      instructions: settings.instructions.map((item) =>
                        item.id === instruction.id
                          ? { ...item, scopes: nextScopes }
                          : item,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-stone-50 p-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Exclude self-led transactions unless requested."
          />
          <div className="mt-3 flex items-center justify-between">
            <ScopePicker value={scopes} onChange={setScopes} />
            <Button size="sm" onClick={addInstruction}>
              Add instruction
            </Button>
          </div>
        </div>
      </SettingGroup>
    </>
  )
}
```

## 11. Dataset filters

Each dataset should expose only fields that can safely be filtered. Render each rule as field, operator, and value controls:

```tsx
function addDefaultFilter(datasetId: DatasetId) {
  const metadata = DATASETS.find((dataset) => dataset.id === datasetId)!
  const firstField = metadata.filterFields[0]

  const filter: FilterRule = {
    id: crypto.randomUUID(),
    field: firstField.field,
    operator: "is",
    value: firstField.suggestions[0] ?? "",
  }

  onChange({
    ...settings,
    datasets: settings.datasets.map((dataset) =>
      dataset.id === datasetId
        ? { ...dataset, filters: [...dataset.filters, filter] }
        : dataset,
    ),
  })
}
```

Use shadcn `Select` for field and operator. Use `Input` for values so custom values remain possible. Suggestions may be rendered in a `Command`/combobox if the list is large.

Default filters must be overridable in chat. Explain this below the builder so administrators do not mistake a default for a security boundary. Authorization and row-level security must be enforced separately on the backend.

## 12. Skills, workflows, and prompts

These sections use the same compact row pattern:

- **Skills:** name, short description, optional example, `Switch`
- **Workflows:** name, description, `Switch`, expandable ordered steps
- **Saved prompts:** title, prompt body, scope badges, delete action

Example skill row:

```tsx
<div className="flex items-start gap-4 border-b py-4">
  <div className="min-w-0 flex-1">
    <h3 className="text-sm font-medium">{skill.name}</h3>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">
      {skill.description}
    </p>
    <p className="mt-1 text-xs italic text-muted-foreground">
      {skill.example}
    </p>
  </div>
  <Switch
    checked={skill.enabled}
    onCheckedChange={(enabled) => updateSkill(skill.id, { enabled })}
    aria-label={`Enable ${skill.name}`}
  />
</div>
```

Example workflow steps:

```tsx
<ol className="mt-4 space-y-3 border-l pl-4">
  {workflow.steps.map((step, index) => (
    <li key={step.id}>
      <p className="text-xs font-medium">
        {index + 1}. {step.label}
      </p>
      <p className="text-xs text-muted-foreground">{step.detail}</p>
    </li>
  ))}
</ol>
```

## 13. Motion

Use only a subtle section entrance and inline expansion. Disable both when reduced motion is requested:

```css
.settings-section-in {
  animation: settings-section-in 220ms ease-out both;
}

@keyframes settings-section-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-section-in {
    animation: none;
  }
}
```

Do not animate toggles beyond the built-in shadcn transition. Avoid page-scale slides, staggered entrances, and onboarding-style progress animations.

## 14. Accessibility checklist

- Use one `h1` for the page and one `h2` for the active section.
- Mark the active navigation item with `aria-current="page"`.
- Give every `Switch` an explicit accessible label.
- Use visible labels above inputs; placeholders are examples only.
- Set `aria-pressed` on selectable scope and currency buttons.
- Put save status in `aria-live="polite"`.
- Keep keyboard focus rings visible.
- Ensure delete actions have labels such as `Delete Weekly EUR IG recap`.
- On mobile, use a labelled section `Select`.

## 15. Production checklist

- Add schema validation and migrations for the versioned settings payload.
- Save server-side with optimistic UI and visible error recovery.
- Restrict write access to team administrators.
- Record revision history for system and data instructions.
- Distinguish default filters from security controls.
- Log which instruction IDs and skill versions were applied to each AI response.
- Add unit tests for scope resolution and filter serialization.
- Add interaction tests for adding, disabling, retagging, and deleting rules.
- Keep the settings surface direct: do not require users to complete setup before using the product.

