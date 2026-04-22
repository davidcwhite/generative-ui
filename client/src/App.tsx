import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dashboard } from './components/Dashboard';
import { FilesView } from './components/FilesView';
import { CodeExecutionResult } from './components/CodeExecutionResult';
import { TerminalOutput } from './components/TerminalOutput';
import { WorkspacePanel } from './components/WorkspacePanel';
import type { UploadedFile } from './components/FileUploader';
import { useAgentSession } from './agent/useAgentSession';
import type { TranscriptItem } from './agent/types';

const AUTH_KEY = 'dcm-authenticated';
const SESSIONS_KEY = 'pf-chat-sessions-v2';
const ACTIVE_SESSION_KEY = 'pf-active-session-v2';
const API_URL = import.meta.env.VITE_API_URL || '/api/dcm/chat';
const API_BASE = API_URL.replace('/api/dcm/chat', '');

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function summarizePrompt(prompt: string): string {
  return prompt.slice(0, 40) + (prompt.length > 40 ? '...' : '');
}

function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? (JSON.parse(stored) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function ToolResult({ item }: { item: TranscriptItem }) {
  const data = item.data as Record<string, unknown>;
  const toolName = String(data.toolName || '');
  const args = (data.args || {}) as Record<string, unknown>;
  const result = (data.result || {}) as Record<string, unknown>;

  if (toolName === 'execute_code') {
    return (
      <CodeExecutionResult
        success={Boolean(result.success)}
        output={typeof result.output === 'string' ? result.output : undefined}
        error={typeof result.error === 'string' ? result.error : undefined}
        logs={Array.isArray(result.logs) ? (result.logs as string[]) : []}
        executionTime={typeof result.executionTime === 'number' ? result.executionTime : 0}
        results={Array.isArray(result.results) ? (result.results as Array<{ type: string; data: unknown }>) : undefined}
        code={typeof args.code === 'string' ? args.code : undefined}
        language={args.language === 'javascript' ? 'javascript' : 'python'}
      />
    );
  }

  if (toolName === 'run_terminal') {
    return (
      <TerminalOutput
        success={Boolean(result.success)}
        output={typeof result.output === 'string' ? result.output : ''}
        error={typeof result.error === 'string' ? result.error : undefined}
        exitCode={typeof result.exitCode === 'number' ? result.exitCode : 0}
        command={typeof args.command === 'string' ? args.command : undefined}
      />
    );
  }

  if (toolName === 'list_sandbox_files') {
    const files = Array.isArray(result.files) ? (result.files as string[]) : [];
    return (
      <div className="bg-stone-100 rounded-lg p-3">
        <div className="text-xs font-medium text-stone-500 mb-2">Sandbox files</div>
        <div className="flex flex-wrap gap-1">
          {files.map((file) => (
            <span key={file} className="px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-700">
              {file}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return <div className="text-sm text-stone-600">{toolName} completed.</div>;
}

function Transcript({ items }: { items: TranscriptItem[] }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">
      {items.length === 0 && (
        <div className="min-h-[55vh] flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">Run-first workflow</h2>
            <p className="mt-2 text-sm text-stone-500">Upload files, then tell the agent what to do with them.</p>
          </div>
        </div>
      )}
      {items.map((item) => {
        if (item.kind === 'user_prompt') {
          return (
            <div key={item.id} className="self-end bg-stone-100 rounded-2xl px-4 py-2.5 text-sm text-stone-800 max-w-[80%]">
              {String(item.data.prompt || '')}
            </div>
          );
        }

        if (item.kind === 'assistant_text') {
          return (
            <div key={item.id} className="text-sm text-stone-700 leading-relaxed">
              <ReactMarkdown>{String(item.data.text || '')}</ReactMarkdown>
            </div>
          );
        }

        if (item.kind === 'plan_steps') {
          const steps = Array.isArray(item.data.steps) ? (item.data.steps as Array<{ id: string; label: string }>) : [];
          return (
            <div key={item.id} className="bg-white border border-stone-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-stone-800 mb-3">{String(item.data.title || 'Plan')}</div>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center text-[10px] font-semibold">
                      {index + 1}
                    </span>
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (item.kind === 'tool_call') {
          return (
            <div key={item.id} className="italic text-sm text-stone-500">
              Running {String(item.data.toolName || 'tool')}...
            </div>
          );
        }

        if (item.kind === 'tool_result') {
          return (
            <div key={item.id}>
              <ToolResult item={item} />
            </div>
          );
        }

        if (item.kind === 'artifact_written') {
          return (
            <div key={item.id} className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Artifact materialized: {String(item.data.path || '')}
            </div>
          );
        }

        if (item.kind === 'run_status') {
          return (
            <div key={item.id} className="text-xs italic text-stone-400">
              {String(item.data.type || '').replace(/_/g, ' ')}
              {item.data.error ? `: ${String(item.data.error)}` : ''}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem(ACTIVE_SESSION_KEY));
  const [activeView, setActiveView] = useState<'chat' | 'files' | 'dashboard'>('chat');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [input, setInput] = useState('');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [uiFiles, setUiFiles] = useState<UploadedFile[]>([]);

  const {
    artifacts,
    uploadedFiles,
    runs,
    selectedRun,
    selectedRunId,
    selectedRunEvents,
    transcriptItems,
    isStartingRun,
    setSelectedRunId,
    uploadParsedFiles,
    deleteArtifact,
    createRun,
  } = useAgentSession(activeSessionId);

  useEffect(() => {
    if (!activeSessionId) {
      const session: ChatSession = {
        id: generateSessionId(),
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const next = [session, ...sessions];
      setSessions(next);
      saveSessions(next);
      setActiveSessionId(session.id);
      localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    setUiFiles(uploadedFiles);
  }, [uploadedFiles]);

  useEffect(() => {
    if (selectedRunId) {
      setIsWorkspaceOpen(true);
    }
  }, [selectedRunId]);

  const isRunActive = selectedRun?.status === 'queued' || selectedRun?.status === 'running' || isStartingRun;

  const createLocalSession = useCallback(() => {
    const session: ChatSession = {
      id: generateSessionId(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [session, ...sessions];
    setSessions(next);
    saveSessions(next);
    setActiveSessionId(session.id);
    localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
    setSelectedRunId(null);
    setInput('');
  }, [sessions, setSelectedRunId]);

  const handleFilesParsed = useCallback(async (files: UploadedFile[]) => {
    await uploadParsedFiles(files);
  }, [uploadParsedFiles]);

  const handleFileDelete = useCallback(async (artifactId: string) => {
    await deleteArtifact(artifactId);
    setUiFiles((prev) => prev.filter((file) => file.id !== artifactId));
  }, [deleteArtifact]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (activeSessionId) {
      const next = sessions.map((session) =>
        session.id === activeSessionId && session.title === 'New Chat'
          ? { ...session, title: summarizePrompt(input), updatedAt: Date.now() }
          : session,
      );
      setSessions(next);
      saveSessions(next);
    }

    await createRun(input);
    setInput('');
  }, [activeSessionId, createRun, input, sessions]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingAuth(true);
    setAuthError('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
      } else {
        setAuthError('Invalid password');
      }
    } catch {
      setAuthError('Failed to verify password');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-stone-800 text-center">Primary Flow</h1>
          <p className="mt-2 text-sm text-stone-500 text-center">Enter password to continue</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mt-6 w-full px-4 py-3 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
          />
          {authError && <p className="mt-3 text-sm text-red-500 text-center">{authError}</p>}
          <button
            type="submit"
            disabled={isCheckingAuth || !password.trim()}
            className="mt-4 w-full px-4 py-3 text-sm font-medium bg-stone-800 text-white rounded-xl hover:bg-stone-700 transition-colors disabled:bg-stone-300"
          >
            {isCheckingAuth ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#FAFAF8]">
      <aside className="w-60 border-r border-stone-200 bg-white p-4 flex flex-col gap-4">
        <div>
          <div className="text-lg font-semibold text-stone-900">Primary Flow</div>
          <div className="text-xs text-stone-500">Artifacts, runs, and workspace</div>
        </div>

        <button onClick={createLocalSession} className="px-3 py-2 rounded-lg bg-stone-900 text-white text-sm hover:bg-stone-800">
          New Chat
        </button>

        <div className="space-y-1">
          <button onClick={() => setActiveView('chat')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeView === 'chat' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
            Chat
          </button>
          <button onClick={() => setActiveView('files')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeView === 'files' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
            Files ({artifacts.length})
          </button>
          <button onClick={() => setActiveView('dashboard')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeView === 'dashboard' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
            Data Viewer
          </button>
          <button onClick={() => setIsWorkspaceOpen((value) => !value)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            {isWorkspaceOpen ? 'Hide Workspace' : 'Show Workspace'}
          </button>
        </div>

        <div className="border-t border-stone-200 pt-4 flex-1 overflow-y-auto">
          <div className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">Sessions</div>
          <div className="space-y-1">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  localStorage.setItem(ACTIVE_SESSION_KEY, session.id);
                  setSelectedRunId(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${session.id === activeSessionId ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem(AUTH_KEY);
            setIsAuthenticated(false);
          }}
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50"
        >
          Logout
        </button>
      </aside>

      {activeView === 'dashboard' ? (
        <Dashboard />
      ) : activeView === 'files' ? (
        <FilesView uploadedFiles={uiFiles} onFilesChange={setUiFiles} onFilesParsed={handleFilesParsed} onFileDelete={handleFileDelete} />
      ) : (
        <>
          <main className="flex-1 flex flex-col overflow-hidden">
            <header className="px-6 py-4 border-b border-stone-200 bg-[#FAFAF8]/80">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold text-stone-900">Agent Runs</h1>
                {selectedRun && <span className="text-xs text-stone-400">{selectedRun.status}</span>}
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              <Transcript items={transcriptItems} />
            </div>

            <footer className="px-6 pb-6 pt-3">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={artifacts.length > 0 ? 'Describe what the agent should do with the uploaded files...' : 'Upload files in the Files view, then describe the task...'}
                  disabled={isRunActive}
                  className="flex-1 bg-transparent outline-none text-sm placeholder-stone-400"
                />
                <span className="text-[11px] text-stone-400">{artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}</span>
                <button
                  type="submit"
                  disabled={!input.trim() || isRunActive}
                  className="p-2 rounded-full bg-stone-900 text-white disabled:bg-stone-200 disabled:text-stone-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </form>
            </footer>
          </main>

          {isWorkspaceOpen && (
            <WorkspacePanel
              artifacts={artifacts}
              runs={runs}
              selectedRun={selectedRun}
              events={selectedRunEvents}
              isRunning={isRunActive}
              onClose={() => setIsWorkspaceOpen(false)}
              onSelectRun={setSelectedRunId}
            />
          )}
        </>
      )}
    </div>
  );
}
