import { useMemo, useState } from 'react';
import type { AgentRun, ArtifactRecord, RunEvent } from '../agent/types';

interface WorkspacePanelProps {
  artifacts: ArtifactRecord[];
  runs: AgentRun[];
  selectedRun: AgentRun | null;
  events: RunEvent[];
  isRunning: boolean;
  onClose: () => void;
  onSelectRun: (runId: string | null) => void;
}

interface StepStatus {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'done';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkspacePanel({
  artifacts,
  runs,
  selectedRun,
  events,
  isRunning,
  onClose,
  onSelectRun,
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'files' | 'runs'>('activity');

  const latestPlan = useMemo(() => {
    const planEvent = [...events].reverse().find((event) => event.type === 'plan_steps');
    if (!planEvent) return null;
    const steps = Array.isArray(planEvent.data.steps)
      ? (planEvent.data.steps as Array<{ id: string; label: string; tool?: string }>)
      : [];

    const statuses: StepStatus[] = steps.map((step) => ({
      id: step.id,
      label: step.label,
      status: 'pending',
    }));

    const completedTools = events
      .filter((event) => event.type === 'tool_result')
      .map((event) => String((event.data as Record<string, unknown>).toolName || ''));

    const runningTools = events
      .filter((event) => event.type === 'tool_call')
      .map((event) => String((event.data as Record<string, unknown>).toolName || ''));

    for (const [index, step] of steps.entries()) {
      if (step.tool && completedTools.includes(step.tool)) {
        statuses[index].status = 'done';
      } else if (step.tool && runningTools.includes(step.tool)) {
        statuses[index].status = 'in_progress';
      }
    }

    if (isRunning) {
      const firstPending = statuses.find((step) => step.status === 'pending');
      if (firstPending) firstPending.status = 'in_progress';
    }

    return {
      title: String(planEvent.data.title || 'Plan'),
      steps: statuses,
      completed: statuses.filter((step) => step.status === 'done').length,
      total: statuses.length,
    };
  }, [events, isRunning]);

  const activityItems = useMemo(
    () =>
      events.filter((event) =>
        ['tool_call', 'tool_result', 'artifact_written', 'run_started', 'run_completed', 'run_failed'].includes(event.type),
      ),
    [events],
  );

  const materializedFiles = useMemo(
    () =>
      events
        .filter((event) => event.type === 'artifact_written')
        .map((event) => String((event.data as Record<string, unknown>).path || '')),
    [events],
  );

  return (
    <div className="w-[380px] flex-shrink-0 border-l border-[#E5E5E3] bg-white flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E5E3] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-stone-800">Workspace</span>
          {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" title="Close panel">
          <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-[#E5E5E3]">
        {(['activity', 'files', 'runs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab ? 'text-stone-900 border-b-2 border-stone-800' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab === 'activity' ? 'Activity' : tab === 'files' ? 'Files' : 'Runs'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'activity' && (
          <div className="p-4 space-y-4">
            <div className={`px-3 py-2.5 rounded-lg border ${isRunning ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                <span className="text-xs font-medium text-stone-700">
                  Sandbox: {isRunning ? 'Running' : selectedRun ? selectedRun.status : 'Inactive'}
                </span>
              </div>
              {selectedRun && (
                <p className="text-[11px] text-stone-500 mt-1 ml-4">
                  Run {selectedRun.id.slice(0, 8)}
                </p>
              )}
            </div>

            {latestPlan && (
              <div className="p-3 bg-white border border-stone-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-stone-800">{latestPlan.title}</span>
                  <span className="text-[10px] text-stone-400 font-medium">
                    {latestPlan.completed}/{latestPlan.total}
                  </span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1 mb-3">
                  <div className="bg-emerald-500 h-1 rounded-full transition-all duration-500" style={{ width: `${latestPlan.total === 0 ? 0 : (latestPlan.completed / latestPlan.total) * 100}%` }} />
                </div>
                <div className="space-y-1.5">
                  {latestPlan.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2">
                      {step.status === 'done' ? (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : step.status === 'in_progress' ? (
                        <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-stone-300" />
                      )}
                      <span className={`text-xs ${step.status === 'done' ? 'text-stone-500 line-through' : step.status === 'in_progress' ? 'text-blue-700 font-medium' : 'text-stone-600'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activityItems.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="mt-2 text-xs text-stone-400">No activity yet</p>
                <p className="text-[11px] text-stone-400">Run events will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityItems.map((event) => (
                  <ActivityCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-4">
            {artifacts.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="mt-2 text-xs text-stone-400">No artifacts uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {artifacts.map((artifact) => (
                  <div key={artifact.id} className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-xs font-medium text-stone-800 truncate flex-1">{artifact.originalName}</span>
                      <span className="text-[10px] text-stone-400 flex-shrink-0">{formatFileSize(artifact.metadataJson.sizeBytes)}</span>
                    </div>
                    <div className="mt-1.5 ml-6 flex items-center gap-2 text-[11px] text-stone-500">
                      <span>{artifact.rowCount.toLocaleString()} rows</span>
                      <span className="text-stone-300">·</span>
                      <span>{artifact.previewJson?.sheets[0]?.headers.length || 0} columns</span>
                    </div>
                    <div className="mt-1.5 ml-6 space-y-1">
                      {artifact.metadataJson.sandboxFiles.map((file) => {
                        const sandboxPath = `/home/user/${file.relativePath}`;
                        const materialized = materializedFiles.includes(sandboxPath);
                        return (
                          <div key={sandboxPath} className="flex items-center gap-2 text-[10px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${materialized ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                            <span className={materialized ? 'text-emerald-700' : 'text-stone-500'}>{sandboxPath}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="p-4">
            {runs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-stone-400">No runs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    onClick={() => onSelectRun(run.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedRun?.id === run.id ? 'bg-stone-100 border-stone-300' : 'bg-white border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-stone-800 truncate">{run.prompt}</span>
                      <span className="text-[10px] text-stone-400">{run.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ event }: { event: RunEvent }) {
  const [expanded, setExpanded] = useState(false);
  const data = event.data as Record<string, unknown>;

  let label: string = event.type;
  let detail = '';
  let tone: 'stone' | 'blue' | 'emerald' | 'red' = 'stone';

  if (event.type === 'tool_call') {
    label = String(data.toolName || 'tool');
    detail = JSON.stringify(data.args || {});
    tone = 'blue';
  } else if (event.type === 'tool_result') {
    label = String(data.toolName || 'tool');
    detail = JSON.stringify(data.result || {});
    tone = (data.result as Record<string, unknown>)?.success === false ? 'red' : 'emerald';
  } else if (event.type === 'artifact_written') {
    label = 'artifact_written';
    detail = String(data.path || '');
    tone = 'emerald';
  } else if (event.type === 'run_failed') {
    detail = String(data.error || '');
    tone = 'red';
  }

  const classes =
    tone === 'blue'
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : tone === 'red'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-stone-50 border-stone-200 text-stone-700';

  return (
    <div className={`px-3 py-2 rounded-lg border cursor-pointer ${classes}`} onClick={() => setExpanded((value) => !value)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] opacity-70">{new Date(event.createdAt).toLocaleTimeString()}</span>
      </div>
      {detail && (
        <p className={`mt-1 text-[11px] ${expanded ? 'whitespace-pre-wrap break-all' : 'truncate'}`}>
          {detail}
        </p>
      )}
    </div>
  );
}
