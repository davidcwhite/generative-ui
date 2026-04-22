import type { ArtifactRecord } from '../agent/types.js';
import type { ExecutionResult, SandboxInfo, TerminalResult } from '../sandbox/e2b-client.js';

export interface RuntimeAdapter {
  isConfigured(): boolean;
  getSessionInfo(runId: string): SandboxInfo | null;
  ensureSession(runId: string): Promise<SandboxInfo | null>;
  materializeArtifacts(runId: string, artifacts: ArtifactRecord[]): Promise<string[]>;
  executeCode(runId: string, code: string, language?: 'python' | 'javascript'): Promise<ExecutionResult>;
  runTerminal(runId: string, command: string): Promise<TerminalResult>;
  listFiles(runId: string, path?: string): Promise<string[]>;
  disposeSession(runId: string): Promise<boolean>;
}
