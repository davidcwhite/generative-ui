import { useEffect, useMemo, useState } from 'react';
import {
  CURRENCY_OPTIONS,
  DATASETS,
  DATASET_META,
  DESK_TYPES,
  SKILL_LIBRARY,
  loadConfig,
  saveConfig,
  uid,
  type DatasetId,
  type FilterRule,
  type Instruction,
  type Scope,
  type WorkspaceConfig,
} from './model';
import { ScopeBadges, ScopePicker, Switch } from './primitives';

type SectionId = 'general' | 'instructions' | 'data' | 'skills' | 'workflows' | 'prompts';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'data', label: 'Data' },
  { id: 'skills', label: 'Skills' },
  { id: 'workflows', label: 'Workflows' },
  { id: 'prompts', label: 'Saved prompts' },
];

export function TeamWorkspaceView() {
  const [config, setConfig] = useState<WorkspaceConfig>(loadConfig);
  const [section, setSection] = useState<SectionId>('general');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    saveConfig({ ...config, completedOnboarding: true });
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [config]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#FCFCFB]">
      <header className="border-b border-stone-200 bg-white px-5 py-4 md:px-8">
        <div className="mx-auto flex w-full max-w-[1080px] items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold tracking-[-0.02em] text-stone-950">Team settings</h1>
            <p className="mt-0.5 text-xs text-stone-500">
              Configure how the assistant works for your desk.
            </p>
          </div>
          <span
            aria-live="polite"
            className={`text-[11px] text-stone-400 transition-opacity duration-200 ${
              saved ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Saved
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1080px] flex-1 gap-12 overflow-hidden px-5 md:px-8">
        <nav aria-label="Settings" className="hidden w-40 shrink-0 py-8 md:block">
          <ul className="space-y-0.5">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? 'page' : undefined}
                  className={`w-full rounded-md px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                    section === item.id
                      ? 'bg-stone-100 font-medium text-stone-950'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main key={section} className="tw-step-in min-w-0 flex-1 overflow-y-auto py-8">
          <div className="mb-6 md:hidden">
            <label htmlFor="team-settings-section" className="sr-only">
              Settings section
            </label>
            <select
              id="team-settings-section"
              value={section}
              onChange={(event) => setSection(event.target.value as SectionId)}
              className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-800"
            >
              {SECTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {section === 'general' && <GeneralSettings config={config} onChange={setConfig} />}
          {section === 'instructions' && (
            <InstructionSettings config={config} onChange={setConfig} />
          )}
          {section === 'data' && <DataSettings config={config} onChange={setConfig} />}
          {section === 'skills' && <SkillSettings config={config} onChange={setConfig} />}
          {section === 'workflows' && <WorkflowSettings config={config} onChange={setConfig} />}
          {section === 'prompts' && <PromptSettings config={config} onChange={setConfig} />}
        </main>
      </div>
    </div>
  );
}

function SettingsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7">
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-stone-950">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>
    </header>
  );
}

function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-200 py-6 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-stone-900">{title}</h3>
        {description && <p className="mt-1 text-xs leading-5 text-stone-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function GeneralSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const patchProfile = (patch: Partial<WorkspaceConfig['profile']>) =>
    onChange({ ...config, profile: { ...config.profile, ...patch } });

  const toggleCurrency = (currency: string) => {
    const active = config.profile.currencies.includes(currency);
    const currencies = active
      ? config.profile.currencies.filter((item) => item !== currency)
      : [...config.profile.currencies, currency];
    if (currencies.length > 0) patchProfile({ currencies });
  };

  return (
    <>
      <SettingsHeader
        title="General"
        description="Basic details used to tailor defaults and terminology for the team."
      />

      <SettingGroup title="Team">
        <div className="max-w-md space-y-4">
          <div>
            <label htmlFor="team-name" className="mb-1.5 block text-xs font-medium text-stone-700">
              Team name
            </label>
            <input
              id="team-name"
              value={config.profile.teamName}
              onChange={(event) => patchProfile({ teamName: event.target.value })}
              placeholder="EUR IG Syndicate"
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
            />
          </div>
          <div>
            <label htmlFor="desk-type" className="mb-1.5 block text-xs font-medium text-stone-700">
              Desk
            </label>
            <select
              id="desk-type"
              value={config.profile.deskType}
              onChange={(event) => patchProfile({ deskType: event.target.value })}
              className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-800 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
            >
              {DESK_TYPES.map((desk) => (
                <option key={desk}>{desk}</option>
              ))}
            </select>
          </div>
        </div>
      </SettingGroup>

      <SettingGroup
        title="Home currencies"
        description="Used as the default scope for market and issuance questions."
      >
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((currency) => {
            const active = config.profile.currencies.includes(currency);
            return (
              <button
                key={currency}
                type="button"
                onClick={() => toggleCurrency(currency)}
                aria-pressed={active}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
                  active
                    ? 'border-stone-800 bg-stone-900 text-white'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                {currency}
              </button>
            );
          })}
        </div>
      </SettingGroup>
    </>
  );
}

function InstructionSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['global']);

  const addRule = () => {
    if (!text.trim()) return;
    const instruction: Instruction = {
      id: uid('ins'),
      text: text.trim(),
      scopes,
      enabled: true,
      createdAt: Date.now(),
    };
    onChange({ ...config, instructions: [instruction, ...config.instructions] });
    setText('');
    setScopes(['global']);
    setAdding(false);
  };

  const patchRule = (id: string, patch: Partial<Instruction>) =>
    onChange({
      ...config,
      instructions: config.instructions.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule,
      ),
    });

  return (
    <>
      <SettingsHeader
        title="Instructions"
        description="Standing guidance for tone, conventions, and how specific datasets should be handled."
      />

      <SettingGroup
        title="System instruction"
        description="Applied to every conversation for this team."
      >
        <textarea
          value={config.macroInstruction}
          onChange={(event) => onChange({ ...config, macroInstruction: event.target.value })}
          rows={6}
          placeholder="Write for a syndicate desk. Quote spreads versus mid-swaps in basis points…"
          className="w-full resize-y rounded-md border border-stone-300 bg-white p-3 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
        />
      </SettingGroup>

      <SettingGroup
        title="Data instructions"
        description="Rules can be global or attached to one or more datasets."
      >
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {config.instructions.map((rule) => (
            <div key={rule.id} className="group flex items-start gap-3 py-4">
              <div className="pt-0.5">
                <Switch
                  checked={rule.enabled}
                  onChange={(enabled) => patchRule(rule.id, { enabled })}
                  label={`Enable ${rule.text}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-5 ${rule.enabled ? 'text-stone-800' : 'text-stone-400'}`}>
                  {rule.text}
                </p>
                <div className="mt-2">
                  <ScopePicker
                    value={rule.scopes}
                    onChange={(nextScopes) => patchRule(rule.id, { scopes: nextScopes })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...config,
                    instructions: config.instructions.filter((item) => item.id !== rule.id),
                  })
                }
                aria-label="Delete instruction"
                className="rounded p-1 text-stone-300 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <CloseIcon />
              </button>
            </div>
          ))}

          {config.instructions.length === 0 && !adding && (
            <p className="py-5 text-sm text-stone-400">No data instructions yet.</p>
          )}
        </div>

        {adding ? (
          <div className="tw-panel-in mt-4 rounded-lg bg-stone-50 p-4">
            <label htmlFor="new-instruction" className="sr-only">
              New instruction
            </label>
            <textarea
              id="new-instruction"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              autoFocus
              placeholder="Exclude self-led transactions from league tables unless explicitly requested."
              className="w-full resize-none rounded-md border border-stone-300 bg-white p-3 text-sm leading-5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <ScopePicker value={scopes} onChange={setScopes} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-md px-3 py-2 text-xs font-medium text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addRule}
                  disabled={!text.trim()}
                  className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:bg-stone-300"
                >
                  Add instruction
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-4 text-xs font-medium text-stone-600 hover:text-stone-950"
          >
            + Add instruction
          </button>
        )}
      </SettingGroup>
    </>
  );
}

function DataSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const [activeId, setActiveId] = useState<DatasetId>('issuance');
  const meta = DATASET_META[activeId];
  const dataset = config.datasets.find((item) => item.id === activeId)!;
  const linkedInstructions = config.instructions.filter((rule) => rule.scopes.includes(activeId));

  const patchDataset = (patch: Partial<typeof dataset>) =>
    onChange({
      ...config,
      datasets: config.datasets.map((item) =>
        item.id === activeId ? { ...item, ...patch } : item,
      ),
    });

  const addFilter = () => {
    const field = meta.filterFields[0];
    const filter: FilterRule = {
      id: uid('filter'),
      field: field.field,
      operator: 'is',
      value: field.suggestions[0] ?? '',
    };
    patchDataset({ filters: [...dataset.filters, filter] });
  };

  const patchFilter = (id: string, patch: Partial<FilterRule>) =>
    patchDataset({
      filters: dataset.filters.map((filter) =>
        filter.id === id ? { ...filter, ...patch } : filter,
      ),
    });

  return (
    <>
      <SettingsHeader
        title="Data"
        description="Control which datasets are available and the filters applied before the assistant queries them."
      />

      <div className="grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="space-y-1">
          {DATASETS.map((item) => {
            const enabled = config.datasets.find((entry) => entry.id === item.id)?.enabled;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] ${
                  activeId === item.id
                    ? 'bg-stone-100 font-medium text-stone-950'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                {item.name}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-stone-300'}`}
                />
              </button>
            );
          })}
        </div>

        <div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <h3 className="text-sm font-medium text-stone-900">{meta.name}</h3>
              <p className="mt-1 text-xs leading-5 text-stone-500">{meta.description}</p>
            </div>
            <Switch
              checked={dataset.enabled}
              onChange={(enabled) => patchDataset({ enabled })}
              label={`Enable ${meta.name}`}
            />
          </div>

          <div className="border-b border-stone-200 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-medium text-stone-800">Default filters</h4>
                <p className="mt-1 text-[11px] text-stone-500">
                  Applied automatically. Users can override them in chat.
                </p>
              </div>
              <button
                type="button"
                onClick={addFilter}
                className="text-xs font-medium text-stone-600 hover:text-stone-950"
              >
                + Add filter
              </button>
            </div>

            {dataset.filters.length === 0 ? (
              <p className="mt-4 text-xs text-stone-400">No default filters.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {dataset.filters.map((filter) => {
                  const field = meta.filterFields.find((item) => item.field === filter.field);
                  return (
                    <div key={filter.id} className="flex flex-wrap items-center gap-2">
                      <select
                        value={filter.field}
                        aria-label="Filter field"
                        onChange={(event) => {
                          const next = meta.filterFields.find(
                            (item) => item.field === event.target.value,
                          );
                          patchFilter(filter.id, {
                            field: event.target.value,
                            value: next?.suggestions[0] ?? '',
                          });
                        }}
                        className="h-8 rounded-md border border-stone-300 bg-white px-2 text-xs text-stone-700"
                      >
                        {meta.filterFields.map((item) => (
                          <option key={item.field} value={item.field}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        aria-label="Filter operator"
                        onChange={(event) =>
                          patchFilter(filter.id, {
                            operator: event.target.value as FilterRule['operator'],
                          })
                        }
                        className="h-8 rounded-md border border-stone-300 bg-white px-2 text-xs text-stone-600"
                      >
                        <option>is</option>
                        <option>is not</option>
                        <option>at least</option>
                        <option>at most</option>
                      </select>
                      <input
                        value={filter.value}
                        aria-label="Filter value"
                        list={`suggestions-${filter.id}`}
                        onChange={(event) => patchFilter(filter.id, { value: event.target.value })}
                        className="h-8 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 text-xs text-stone-800"
                      />
                      <datalist id={`suggestions-${filter.id}`}>
                        {(field?.suggestions ?? []).map((suggestion) => (
                          <option key={suggestion} value={suggestion} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        aria-label="Remove filter"
                        onClick={() =>
                          patchDataset({
                            filters: dataset.filters.filter((item) => item.id !== filter.id),
                          })
                        }
                        className="rounded p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="py-5">
            <h4 className="text-xs font-medium text-stone-800">Instructions</h4>
            {linkedInstructions.length === 0 ? (
              <p className="mt-3 text-xs text-stone-400">No instructions are attached to this dataset.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {linkedInstructions.map((instruction) => (
                  <li key={instruction.id} className="flex items-start gap-2 text-xs leading-5 text-stone-600">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                    {instruction.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SkillSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const enabledCount = useMemo(
    () => config.skills.filter((skill) => skill.enabled).length,
    [config.skills],
  );

  return (
    <>
      <SettingsHeader
        title="Skills"
        description={`${enabledCount} enabled. Skills add specialised analysis and output capabilities.`}
      />
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {SKILL_LIBRARY.map((meta) => {
          const skill = config.skills.find((item) => item.id === meta.id)!;
          return (
            <div key={meta.id} className="flex items-start gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-stone-900">{meta.name}</h3>
                  <span className="text-[10px] text-stone-400">{meta.category}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-stone-500">{meta.description}</p>
                <p className="mt-1 text-[11px] italic text-stone-400">{meta.example}</p>
              </div>
              <Switch
                checked={skill.enabled}
                onChange={(enabled) =>
                  onChange({
                    ...config,
                    skills: config.skills.map((item) =>
                      item.id === skill.id ? { ...item, enabled } : item,
                    ),
                  })
                }
                label={`Enable ${meta.name}`}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

function WorkflowSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <SettingsHeader
        title="Workflows"
        description="Reusable sequences of data queries, analysis, and output steps."
      />
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {config.workflows.map((workflow) => (
          <div key={workflow.id} className="py-4">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setExpanded(expanded === workflow.id ? null : workflow.id)}
                aria-expanded={expanded === workflow.id}
                className="min-w-0 flex-1 text-left"
              >
                <h3 className="text-sm font-medium text-stone-900">{workflow.name}</h3>
                <p className="mt-1 text-xs leading-5 text-stone-500">{workflow.description}</p>
              </button>
              <Switch
                checked={workflow.enabled}
                onChange={(enabled) =>
                  onChange({
                    ...config,
                    workflows: config.workflows.map((item) =>
                      item.id === workflow.id ? { ...item, enabled } : item,
                    ),
                  })
                }
                label={`Enable ${workflow.name}`}
              />
            </div>
            {expanded === workflow.id && (
              <ol className="tw-panel-in mt-4 space-y-3 border-l border-stone-200 pl-4">
                {workflow.steps.map((step, index) => (
                  <li key={step.id}>
                    <p className="text-xs font-medium text-stone-700">
                      {index + 1}. {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-400">{step.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function PromptSettings({
  config,
  onChange,
}: {
  config: WorkspaceConfig;
  onChange: (config: WorkspaceConfig) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['global']);

  const addPrompt = () => {
    if (!title.trim() || !body.trim()) return;
    onChange({
      ...config,
      prompts: [
        { id: uid('prompt'), title: title.trim(), body: body.trim(), scopes },
        ...config.prompts,
      ],
    });
    setTitle('');
    setBody('');
    setScopes(['global']);
    setAdding(false);
  };

  return (
    <>
      <SettingsHeader
        title="Saved prompts"
        description="Shared questions that appear as shortcuts in chat."
      />
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {config.prompts.map((prompt) => (
          <div key={prompt.id} className="group flex items-start gap-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-stone-900">{prompt.title}</h3>
                <ScopeBadges scopes={prompt.scopes} />
              </div>
              <p className="mt-1 text-xs leading-5 text-stone-500">{prompt.body}</p>
            </div>
            <button
              type="button"
              aria-label={`Delete ${prompt.title}`}
              onClick={() =>
                onChange({
                  ...config,
                  prompts: config.prompts.filter((item) => item.id !== prompt.id),
                })
              }
              className="rounded p-1 text-stone-300 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="tw-panel-in mt-4 space-y-3 rounded-lg bg-stone-50 p-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            aria-label="Prompt title"
            placeholder="Prompt name"
            className="h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="Prompt"
            rows={3}
            placeholder="What should the assistant be asked?"
            className="w-full resize-none rounded-md border border-stone-300 bg-white p-3 text-sm leading-5 outline-none placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ScopePicker value={scopes} onChange={setScopes} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="rounded-md px-3 py-2 text-xs font-medium text-stone-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addPrompt}
                disabled={!title.trim() || !body.trim()}
                className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white disabled:bg-stone-300"
              >
                Save prompt
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-4 text-xs font-medium text-stone-600 hover:text-stone-950"
        >
          + Add prompt
        </button>
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
