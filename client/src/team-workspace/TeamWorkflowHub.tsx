import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, Database, Download, FileCheck2, FileSpreadsheet, FileText, FolderOpen, History, Layers3, LayoutTemplate, Loader2, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, TriangleAlert, Upload, Users } from 'lucide-react';
import { TeamWorkspaceView } from './TeamWorkspaceView';
import { loadConfig } from './model';
import { canSaveDraft, COLUMNS, createRun, emptyStore, FIELDS, mappingProblems, money, newDraft, parseStore, runFacts, sampleRows, STORAGE_KEY, toConfig, WORKFLOW_META, type PrototypeStore, type WorkflowConfig, type WorkflowDraft, type WorkflowKind, type WorkflowRun } from './workflow-model';
import { downloadPreview, WorkflowPreview } from './WorkflowPreview';
import './workflows.css';

type View = 'home' | 'setup' | 'run' | 'review' | 'sources' | 'history' | 'settings';
const STEPS = ['Choose your output', 'Bring your data', 'Confirm the mapping'];

function Button({ children, onClick, primary = false, disabled = false, className = '' }: {
  children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; className?: string;
}) { return <button type="button" className={`wf-button ${primary ? 'wf-button--primary' : ''} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>; }

function Status({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <span className={`wf-status ${warning ? 'wf-status--warning' : ''}`}>{warning ? <TriangleAlert size={12} /> : <Check size={12} />}{children}</span>;
}

export function TeamWorkflowHub() {
  const [store, setStore] = useState<PrototypeStore>(() => {
    try { return parseStore(localStorage.getItem(STORAGE_KEY)); } catch { return emptyStore(); }
  });
  const [view, setView] = useState<View>('home');
  const [saveError, setSaveError] = useState(false);
  const [activeConfig, setActiveConfig] = useState<WorkflowConfig | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [period, setPeriod] = useState('');
  const [refreshed, setRefreshed] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const contentRef = useRef<HTMLElement>(null);
  const currentRun = store.runs.find(run => run.id === activeRunId);
  const teamName = store.workflows[0]?.team || loadConfig().profile.teamName || 'Your team';

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [store]);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [view, store.draft?.step]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!generating || !activeConfig) return;
    const timer = window.setTimeout(() => {
      const run = createRun(activeConfig, period);
      setStore(s => ({ ...s, runs: [run, ...s.runs].slice(0, 50) }));
      setActiveRunId(run.id);
      setGenerating(false);
      setView('review');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [generating, activeConfig, period]);

  const navigate = (next: View) => { setGenerating(false); setView(next); };
  const startSetup = (kind: WorkflowKind) => {
    setStore(s => ({ ...s, draft: newDraft(kind, teamName === 'Your team' ? '' : teamName) }));
    navigate('setup');
  };
  const updateDraft = (patch: Partial<WorkflowDraft>) => setStore(s => ({ ...s, draft: s.draft ? { ...s.draft, ...patch } : null }));
  const startRun = (config: WorkflowConfig, first = false) => {
    const count = store.runs.filter(run => run.config.id === config.id).length;
    setActiveConfig(config);
    setPeriod(config.kind === 'flash' ? `Northstar Energy · Edition ${count + 1}` : `Week ending 4 Sep 2026${count ? ` · Run ${count + 1}` : ''}`);
    setRefreshed(first);
    navigate('run');
  };
  const saveWorkflow = () => {
    if (!store.draft || !canSaveDraft(store.draft)) return;
    const config = toConfig(store.draft);
    setStore(s => ({ ...s, workflows: [...s.workflows.filter(w => w.id !== config.id), config], draft: null }));
    startRun(config, true);
  };
  const editWorkflow = (config: WorkflowConfig) => {
    setStore(s => ({ ...s, draft: { ...config, mapping: { ...config.mapping }, step: 0, loaded: true, confirmed: true } }));
    navigate('setup');
  };
  const updateRun = (patch: Partial<WorkflowRun>) => setStore(s => ({ ...s, runs: s.runs.map(run => run.id === activeRunId ? { ...run, ...patch } : run) }));
  const showRun = (run: WorkflowRun) => { setActiveRunId(run.id); navigate('review'); };

  return (
    <div className="wf-root">
      <header className="wf-header">
        <div className="wf-team-name"><div className="wf-team-avatar"><Users size={17} /></div><div><strong>{teamName}</strong><span>Primary Flow workspace</span></div></div>
        <span className="wf-prototype"><span />Interactive prototype</span>
      </header>
      <nav className="wf-nav" aria-label="Team workspace">
        {([{ id: 'home', label: 'Workflows', icon: Layers3 }, { id: 'sources', label: 'Sources', icon: Database }, { id: 'history', label: 'Run history', icon: History }] as const).map(item => (
          <button key={item.id} onClick={() => navigate(item.id)} aria-current={(view === item.id || (item.id === 'home' && ['setup', 'run', 'review'].includes(view))) ? 'page' : undefined}><item.icon size={15} />{item.label}{item.id === 'history' && store.runs.length > 0 && <span className="wf-count">{store.runs.length}</span>}</button>
        ))}
        <button className="wf-settings-nav" onClick={() => navigate('settings')} aria-label="Team settings" aria-current={view === 'settings' ? 'page' : undefined}><Settings2 size={15} /><span>Settings</span></button>
      </nav>
      <div className="wf-demo-note"><Sparkles size={13} /><span>Try the complete flow with sample data. Connections and PowerPoint export are not live.</span></div>
      {saveError && <div className="wf-error" role="alert">Browser storage is unavailable. Your changes will last only for this session.</div>}
      {view === 'settings' ? <TeamWorkspaceView /> : <main className="wf-content" ref={contentRef}>
        <div className={`wf-page ${view === 'review' ? 'wf-page--wide' : ''}`}>
          {view === 'home' && <>
            <div className="wf-intro"><div><div className="wf-eyebrow">TEAM WORKFLOWS</div><h1>Your data. A finished output.<br /><span>A little less work next time.</span></h1><p>Set up your team’s sources and template once.<br className="wf-desktop-break" /> Then refresh, review and put the output to work.</p></div><div className="wf-intro-art" aria-hidden="true"><div><FileSpreadsheet size={19} /><FileText size={19} /></div><span /><div className="wf-art-output"><LayoutTemplate size={25} /><CheckCircle2 size={13} /></div></div></div>

            {store.draft && <div className="wf-resume"><div><span className="wf-dot" /><strong>Finish setting up {store.draft.name || 'your workflow'}</strong><small>Step {store.draft.step + 1} of 3 · Saved in this browser</small></div><Button onClick={() => navigate('setup')}>Continue setup <ArrowRight size={14} /></Button></div>}

            {store.workflows.length > 0 && <section className="wf-section"><div className="wf-section-heading"><h2>Your workflows <span>{store.workflows.length}</span></h2><span>Configured for your team</span></div><div className="wf-saved-list">{store.workflows.map(config => {
              const latest = store.runs.find(run => run.config.id === config.id);
              return <div className="wf-saved-row" key={config.id}><div className="wf-file-icon"><LayoutTemplate size={20} /></div><div className="wf-row-body"><h3>{config.name}</h3><p>{WORKFLOW_META[config.kind].output} · {config.sourceMode === 'folder' ? 'Example shared folder' : 'Example file uploads'} · {latest?.reviewedAt ? 'Last run reviewed' : 'Ready for a sample run'}</p></div><button className="wf-text-button" aria-label={`Configure ${config.name}`} onClick={() => editWorkflow(config)}>Configure</button><Button primary onClick={() => startRun(config)}>Start next run <ArrowRight size={14} /></Button></div>;
            })}</div></section>}

            <section className="wf-section"><div className="wf-section-heading"><h2>{store.workflows.length ? 'Add another workflow' : 'Start with something your team already does'}</h2><span>2 focused workflows</span></div>
              <div className="wf-catalogue">{(['flash', 'newsletter'] as const).map(kind => <article className="wf-workflow-card" key={kind}>
                <div className={`wf-card-art wf-card-art--${kind}`}><WorkflowPreview kind={kind} compact /><span className="wf-art-badge">{WORKFLOW_META[kind].output} · PowerPoint template</span></div>
                <div className="wf-card-content"><div className="wf-card-type"><span>{kind === 'flash' ? 'A FOCUSED FIRST WIN' : 'BUILT FOR REPEAT USE'}</span><span>{WORKFLOW_META[kind].cadence}</span></div><h2>{WORKFLOW_META[kind].title}</h2><p>{WORKFLOW_META[kind].description}</p><div className="wf-card-footer"><span><FileCheck2 size={14} /> Review before export</span><Button onClick={() => startSetup(kind)} primary={kind === 'flash'}>Set up {kind === 'flash' ? 'deal flash' : 'newsletter'} <ArrowRight size={14} /></Button></div></div>
              </article>)}</div>
            </section>
            <section className="wf-how"><div><span>01</span><h3>Bring what you use today</h3><p>Your files, your team’s template, and the data already available.</p></div><div><span>02</span><h3>Confirm it once</h3><p>Check where each figure comes from. Keep the mapping for next time.</p></div><div><span>03</span><h3>Make the next run easier</h3><p>Refresh the inputs, resolve any changes, and review the output.</p></div></section>
            <div className="wf-pilot-note"><Clock3 size={18} /><div><strong>Prove the value, then expand.</strong><p>Capture today’s preparation time during setup. Record the full effort after review, including checks and corrections.</p></div></div>
          </>}

          {view === 'setup' && store.draft && <Setup draft={store.draft} update={updateDraft} onBack={() => navigate('home')} onSave={saveWorkflow} />}

          {view === 'run' && activeConfig && <>
            <button className="wf-back" onClick={() => navigate('home')}><ArrowLeft size={14} />All workflows</button>
            <div className="wf-page-title"><div className="wf-eyebrow">{WORKFLOW_META[activeConfig.kind].title.toUpperCase()} / NEW RUN</div><h1>Ready for this edition?</h1><p>Your template and mappings are saved. Just check what has changed.</p></div>
            <div className="wf-two-column"><section className="wf-panel"><div className="wf-panel-heading"><h2>Inputs for this run</h2><Status warning={!refreshed}>{refreshed ? 'All inputs ready' : '1 item needs attention'}</Status></div>
              <label className="wf-field">{activeConfig.kind === 'flash' ? 'Transaction / edition' : 'Reporting period'}<input value={period} onChange={e => setPeriod(e.target.value)} maxLength={100} disabled={generating} /><small>Sample data stays the same when you change the edition label.</small></label>
              <div className="wf-input-list">{WORKFLOW_META[activeConfig.kind].files.map((file, i) => <div className="wf-input-row" key={file}><div className="wf-file-icon">{i === 2 ? <FileText size={19} /> : <FileSpreadsheet size={19} />}</div><div><strong>{file}</strong><span>{i === 2 ? refreshed ? 'Current sample notes selected' : 'Previous edition · Refresh required' : 'Sample source available · Mapping unchanged'}</span></div>{i === 2 && !refreshed ? <TriangleAlert size={16} className="wf-amber" /> : <CheckCircle2 size={16} className="wf-green" />}</div>)}</div>
              {!refreshed && <div className="wf-attention"><TriangleAlert size={17} /><div><h3>Commentary belongs to the previous edition</h3><p>A saved source can still be out of date. Select the current sample notes before generating.</p><Button onClick={() => setRefreshed(true)}>Use current sample notes <RotateCcw size={13} /></Button></div></div>}
              <div className="wf-check-row"><ShieldCheck size={16} /><span>4 field mappings reused · Required figures available</span></div>
            </section><aside className="wf-run-summary"><WorkflowPreview kind={activeConfig.kind} compact /><h3>{activeConfig.name}</h3><p>{WORKFLOW_META[activeConfig.kind].output} · {WORKFLOW_META[activeConfig.kind].template}</p><div className="wf-run-stage"><CheckCircle2 size={15} /><span>Source setup saved</span></div><div className="wf-run-stage"><CheckCircle2 size={15} /><span>Mapping confirmed</span></div><div className="wf-run-stage"><FileCheck2 size={15} /><span>You review every output</span></div><Button primary disabled={!refreshed || !period.trim() || generating} onClick={() => setGenerating(true)}>{generating ? <><Loader2 size={15} className="wf-spin" />Building sample preview…</> : <>Generate sample preview <ArrowRight size={15} /></>}</Button><small>Uses fictional data. No AI request is sent.</small></aside></div>
          </>}

          {view === 'review' && currentRun && <Review run={currentRun} update={updateRun} onBack={() => navigate('home')} onNext={() => startRun(store.workflows.find(w => w.id === currentRun.config.id) || currentRun.config)} onDownload={() => { downloadPreview(currentRun); setToast('Sample HTML preview downloaded. PowerPoint export is planned.'); }} />}

          {view === 'sources' && <>
            <div className="wf-page-title"><div className="wf-eyebrow">TEAM SOURCES</div><h1>Keep the setup. Refresh the data.</h1><p>Each saved workflow remembers which inputs it needs and how to read them.</p></div>
            {!store.workflows.length ? <EmptyState icon={<Database size={25} />} title="Your sources start with a workflow" description="Choose the output you need first. We’ll ask for just the data that makes it possible." action={<Button primary onClick={() => navigate('home')}>Choose a workflow <ArrowRight size={14} /></Button>} /> : <div className="wf-source-grid">{store.workflows.map(config => <article className="wf-panel" key={config.id}><div className="wf-panel-heading"><div className="wf-file-icon"><FolderOpen size={21} /></div><span className="wf-neutral-tag">Sample binding</span></div><h2>{config.name}</h2><p>{config.sourceMode === 'folder' ? WORKFLOW_META[config.kind].folder : 'Files provided at each run'}</p><div className="wf-source-files">{WORKFLOW_META[config.kind].files.map(file => <div key={file}><FileSpreadsheet size={14} />{file}</div>)}</div><div className="wf-check-row"><CheckCircle2 size={15} />4 field mappings saved</div><Button onClick={() => editWorkflow(config)}>Review setup <ArrowRight size={14} /></Button></article>)}</div>}
            <p className="wf-footnote">This prototype saves configuration in this browser. Shared folder access, file ingestion and team sharing require backend integration.</p>
          </>}

          {view === 'history' && <>
            <div className="wf-page-title"><div className="wf-eyebrow">RUN HISTORY</div><h1>Every edition, with its context.</h1><p>Revisit the output, commentary and source mapping used for each sample run.</p></div>
            {!store.runs.length ? <EmptyState icon={<History size={25} />} title="The first run starts here" description="Set up a workflow and generate a preview. It will appear here, ready for review." action={<Button primary onClick={() => navigate('home')}>Explore workflows <ArrowRight size={14} /></Button>} /> : <div className="wf-history-list">{store.runs.map(run => <button className="wf-history-row" key={run.id} onClick={() => showRun(run)}><div className="wf-file-icon"><LayoutTemplate size={20} /></div><div><h3>{run.config.name}</h3><p>{run.period} · {new Date(run.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>{run.actualMinutes && <small>{run.actualMinutes} min recorded{run.config.baselineMinutes ? ` · ${run.config.baselineMinutes} min baseline` : ''} · Demo measurement</small>}</div><Status warning={!run.reviewedAt}>{run.reviewedAt ? 'Reviewed' : 'Needs review'}</Status><ChevronRight size={16} /></button>)}</div>}
          </>}
        </div>
      </main>}
      {toast && <div className="wf-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action: ReactNode }) {
  return <div className="wf-empty"><div>{icon}</div><h2>{title}</h2><p>{description}</p>{action}</div>;
}

function Setup({ draft, update, onBack, onSave }: { draft: WorkflowDraft; update: (patch: Partial<WorkflowDraft>) => void; onBack: () => void; onSave: () => void }) {
  const meta = WORKFLOW_META[draft.kind];
  const rows = sampleRows(draft.kind);
  const problems = mappingProblems(draft.mapping, rows);
  const baselineValid = !draft.baselineMinutes || (Number.isFinite(Number(draft.baselineMinutes)) && Number(draft.baselineMinutes) > 0);
  const stepValid = draft.step === 0 ? Boolean(draft.name.trim() && draft.team.trim() && baselineValid) : draft.step === 1 ? draft.loaded : canSaveDraft(draft);
  return <>
    <button className="wf-back" onClick={onBack}><ArrowLeft size={14} />All workflows <span>· Setup saved as you go</span></button>
    <ol className="wf-stepper" aria-label="Workflow setup progress">{STEPS.map((label, i) => <li key={label} aria-current={draft.step === i ? 'step' : undefined} className={i < draft.step ? 'wf-step-done' : ''}><span>{i < draft.step ? <Check size={13} /> : i + 1}</span><b>{label}</b></li>)}</ol>
    <div className="wf-page-title"><div className="wf-eyebrow">SET UP {meta.title.toUpperCase()}</div><h1>{['Start with the output.', 'Use the materials you already have.', 'A quick check. A reusable setup.'][draft.step]}</h1><p>{['Your team’s format, ready to use again. Give this workflow a name and a home.', 'Choose how your team will provide inputs. This walkthrough uses an example source pack.', 'We’ve suggested where each figure comes from. Confirm the currency column to complete the mapping.'][draft.step]}</p></div>
    {draft.step === 0 && <div className="wf-two-column"><section className="wf-panel wf-form-panel"><label className="wf-field">Workflow name<input value={draft.name} onChange={e => update({ name: e.target.value })} maxLength={80} placeholder={meta.name} /></label><label className="wf-field">Team<input value={draft.team} onChange={e => update({ team: e.target.value })} maxLength={60} /></label><div className="wf-form-divider" /><label className="wf-field">How long does this take today? <span className="wf-optional">Optional</span><div className="wf-unit-input"><input type="number" min="1" value={draft.baselineMinutes} onChange={e => update({ baselineMinutes: e.target.value })} placeholder={`e.g. ${meta.baseline}`} /><span>minutes per output</span></div><small>Include gathering data, building the output and checking it. This becomes your pilot baseline.</small></label>{!baselineValid && <p className="wf-field-error">Enter a positive number of minutes, or leave this blank.</p>}</section><aside className="wf-template-choice"><span className="wf-eyebrow">YOUR STARTING TEMPLATE</span><WorkflowPreview kind={draft.kind} compact /><div><h3>{meta.template}<CheckCircle2 size={16} /></h3><p>{meta.output} · Pricing, figures and editable commentary</p><small>An example template for this prototype. Your existing PowerPoint template would be configured during onboarding.</small></div></aside></div>}
    {draft.step === 1 && <div className="wf-two-column"><section className="wf-panel"><h2>How does your team work today?</h2><div className="wf-source-options">{(['files', 'folder'] as const).map(mode => <button key={mode} className={draft.sourceMode === mode ? 'wf-choice-selected' : ''} onClick={() => update({ sourceMode: mode, loaded: false, confirmed: false })} aria-pressed={draft.sourceMode === mode}>{mode === 'files' ? <Upload size={19} /> : <FolderOpen size={19} />}<strong>{mode === 'files' ? 'Upload files per run' : 'Reuse a shared folder'}</strong><span>{mode === 'files' ? 'Start with a familiar set of files.' : 'Keep a recurring source location.'}</span></button>)}</div><div className="wf-sample-picker"><div className="wf-file-icon"><FolderOpen size={23} /></div><h3>{draft.sourceMode === 'folder' ? meta.folder : 'Try the example source pack'}</h3><p>{draft.sourceMode === 'folder' ? 'See how a saved folder could supply each new edition.' : 'Explore onboarding with realistic filenames and fictional data.'}</p><Button onClick={() => update({ loaded: true })} disabled={draft.loaded}>{draft.loaded ? <><Check size={14} />Sample pack selected</> : <><Plus size={14} />{draft.sourceMode === 'folder' ? 'Use example folder' : 'Load sample files'}</>}</Button><small>No files are uploaded or connected in this prototype.</small></div></section><aside className="wf-panel wf-required"><div className="wf-panel-heading"><h2>What this output needs</h2><span>{draft.loaded ? '3' : '0'} / 3</span></div>{meta.files.map((file, i) => <div className="wf-required-row" key={file}><span className={draft.loaded ? 'wf-required-check' : 'wf-required-number'}>{draft.loaded ? <Check size={12} /> : i + 1}</span><div><strong>{['Core figures', draft.kind === 'flash' ? 'Allocation breakdown' : 'Market context', 'Team commentary'][i]}</strong><p>{draft.loaded ? file : ['A workbook with the main transaction figures.', draft.kind === 'flash' ? 'Final allocation by investor type.' : 'Supporting notes for the reporting period.', 'The context your team wants to add.'][i]}</p></div></div>)}<div className="wf-info-note"><ShieldCheck size={16} /><p>Confirm sources once. Future runs check for missing fields and outdated inputs.</p></div></aside></div>}
    {draft.step === 2 && <>
      <section className="wf-panel"><div className="wf-panel-heading"><div><h2>Check the source mapping</h2><p>{meta.files[0]} · {rows.length} sample {rows.length === 1 ? 'row' : 'rows'}</p></div><Status warning={problems.length > 0}>{problems.length ? `${problems.length} check${problems.length === 1 ? '' : 's'} to resolve` : 'All fields mapped'}</Status></div>
        <div className="wf-mapping-table"><div className="wf-mapping-head"><span>OUTPUT FIELD</span><span>SOURCE COLUMN</span><span>EXAMPLE VALUE</span></div>{FIELDS.map(field => <div className="wf-mapping-row" key={field.id}><div><strong>{field.label}</strong><small>{field.unit}</small></div><select aria-label={`${field.label} source column`} value={draft.mapping[field.id]} onChange={e => update({ mapping: { ...draft.mapping, [field.id]: e.target.value }, confirmed: false })} className={!draft.mapping[field.id] ? 'wf-needs-mapping' : ''}><option value="">Choose a column…</option>{COLUMNS.map(column => <option key={column}>{column}</option>)}</select><span>{draft.mapping[field.id] ? String(rows[0][draft.mapping[field.id]]) : <span className="wf-amber">Confirm CCY <ArrowLeft size={12} /></span>}</span></div>)}</div>
        {problems.length > 0 && <div className="wf-mapping-errors" role="status">{problems.map(problem => <p key={problem}><TriangleAlert size={13} />{problem}</p>)}</div>}
        <label className={`wf-confirm ${problems.length ? 'wf-confirm--disabled' : ''}`}><input type="checkbox" checked={draft.confirmed} disabled={problems.length > 0} onChange={e => update({ confirmed: e.target.checked })} /><span><strong>I’ve checked these fields against the sample source.</strong><small>Save this mapping for future editions. Changes in the source will need another check.</small></span></label>
      </section><div className="wf-info-note wf-mapping-note"><CheckCircle2 size={17} /><p>{draft.kind === 'flash' ? 'The sample allocation file totals €750m and matches the deal size. Allocation percentages are calculated from those amounts.' : 'The sample pack contains six EUR transactions. Issue size is supplied in millions; totals are calculated from those figures.'}</p></div>
    </>}
    <footer className="wf-step-footer"><Button onClick={() => draft.step === 0 ? onBack() : update({ step: draft.step - 1 })}><ArrowLeft size={14} />{draft.step === 0 ? 'Save and leave' : 'Back'}</Button><span>Step {draft.step + 1} of 3</span><Button primary disabled={!stepValid} onClick={() => draft.step === 2 ? onSave() : update({ step: draft.step + 1 })}>{draft.step === 2 ? 'Save setup & start a run' : 'Continue'}<ArrowRight size={14} /></Button></footer>
  </>;
}

function Review({ run, update, onBack, onNext, onDownload }: { run: WorkflowRun; update: (patch: Partial<WorkflowRun>) => void; onBack: () => void; onNext: () => void; onDownload: () => void }) {
  const [page, setPage] = useState(0);
  const [inspector, setInspector] = useState<'commentary' | 'sources'>('commentary');
  const [checked, setChecked] = useState(false);
  const [minutes, setMinutes] = useState('');
  useEffect(() => { setPage(0); setChecked(false); setMinutes(''); setInspector('commentary'); }, [run.id]);
  const validMinutes = !minutes || (Number.isFinite(Number(minutes)) && Number(minutes) > 0);
  return <>
    <button className="wf-back" onClick={onBack}><ArrowLeft size={14} />All workflows</button>
    <div className="wf-review-heading"><div><div className="wf-eyebrow">{run.config.name.toUpperCase()}</div><h1>{run.reviewedAt ? 'Ready for the team.' : 'The output is ready. Make it yours.'}</h1><p>{run.period} · {WORKFLOW_META[run.config.kind].output} · Sample data</p></div><Status warning={!run.reviewedAt}>{run.reviewedAt ? 'Reviewed' : 'Your review needed'}</Status></div>
    <div className="wf-review-layout"><section className="wf-preview-area"><div className="wf-preview-toolbar"><span><LayoutTemplate size={15} />Output preview</span><button className="wf-text-button" onClick={() => setInspector('sources')}>View source trail <ArrowRight size={13} /></button></div><div className="wf-preview-canvas"><WorkflowPreview kind={run.config.kind} run={run} page={page} /></div>{run.config.kind === 'newsletter' && <nav className="wf-slide-tabs" aria-label="Preview slide">{['Market overview', 'Transactions', 'Desk commentary'].map((label, i) => <button key={label} aria-pressed={page === i} onClick={() => setPage(i)}><span>{i + 1}</span>{label}</button>)}</nav>}<div className="wf-preview-caption"><ShieldCheck size={14} />Figures from the sample pack · Commentary editable · Human review required</div></section>
      <aside className="wf-review-inspector"><div className="wf-inspector-tabs"><button aria-pressed={inspector === 'commentary'} onClick={() => setInspector('commentary')}>Commentary</button><button aria-pressed={inspector === 'sources'} onClick={() => setInspector('sources')}>Source trail</button></div>
        {inspector === 'commentary' ? <div className="wf-inspector-body"><h2>Add your team’s perspective</h2><p>Edit the text directly. The preview updates with your changes.</p><label className="wf-field"><span className="wf-sr-only">Slide commentary</span><textarea value={run.commentary} maxLength={run.config.kind === 'flash' ? 180 : 300} onChange={e => { update({ commentary: e.target.value, reviewedAt: undefined, actualMinutes: undefined }); setChecked(false); }} rows={7} /></label><span className="wf-character-count">{run.commentary.length} / {run.config.kind === 'flash' ? 180 : 300}</span><div className="wf-info-note"><FileText size={15} /><p>Example commentary, not AI-generated. Check all interpretations against the sources.</p></div></div> : <div className="wf-inspector-body"><h2>From source to slide</h2><p>Saved with this run. Later setup changes won’t change this source trail.</p><div className="wf-evidence">{run.config.kind === 'newsletter' && <div><strong>Total issuance<span>{money(runFacts(run).total)}</span></strong><p>Weekly issuance.xlsx<br />Size_mm · Sum of rows 1–6</p></div>}{FIELDS.map(field => <div key={field.id}><strong>{field.label}<span>{String(run.rows[0][run.config.mapping[field.id]])}</span></strong><p>{WORKFLOW_META[run.config.kind].files[0]}<br />{run.config.mapping[field.id]} · Row 1 example</p></div>)}{run.config.kind === 'flash' && <div><strong>Asset managers<span>56%</span></strong><p>Final allocations.csv<br />€420m / €750m · Illustrative allocation</p></div>}</div></div>}
        <div className="wf-review-complete">{run.reviewedAt ? <><div className="wf-complete-title"><CheckCircle2 size={21} /><h3>Review complete</h3></div><p>This edition and its source mapping are saved in this browser.</p><Button primary onClick={onDownload}><Download size={15} />Download sample preview</Button><small>HTML preview · PowerPoint export is planned</small><button className="wf-text-button" onClick={onNext}>Try the next edition <ArrowRight size={14} /></button></> : <><label className="wf-confirm"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} /><span>I’ve checked the figures and commentary.</span></label><label className="wf-field">Total effort for this run <span className="wf-optional">Optional</span><div className="wf-unit-input"><input type="number" min="1" placeholder="Minutes, including review" value={minutes} onChange={e => setMinutes(e.target.value)} /><span>min</span></div></label>{!validMinutes && <p className="wf-field-error">Enter a positive number or leave this blank.</p>}<Button primary disabled={!checked || !validMinutes || !run.commentary.trim()} onClick={() => update({ reviewedAt: new Date().toISOString(), actualMinutes: minutes ? Number(minutes) : undefined })}><Check size={15} />Mark as reviewed</Button><small>Nothing is sent or shared with your team.</small></>}</div>
      </aside></div>
  </>;
}
