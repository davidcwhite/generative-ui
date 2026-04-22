import type { ParsedFile } from '../utils/fileParser';

export interface ArtifactSandboxFile {
  relativePath: string;
  storagePath: string;
  sheetName?: string;
}

export interface ArtifactRecord {
  id: string;
  sessionId: string;
  kind: 'upload' | 'derived' | 'report' | 'chart' | 'log';
  originalName: string;
  mimeType: string;
  storagePath: string;
  previewJson: ParsedFile | null;
  schemaJson: Record<string, unknown> | null;
  metadataJson: {
    sizeBytes: number;
    sandboxFiles: ArtifactSandboxFile[];
  };
  rowCount: number;
  createdAt: number;
}

export interface AgentRun {
  id: string;
  sessionId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  prompt: string;
  artifactIds: string[];
  runtimeSessionId: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

export type RunEventType =
  | 'run_created'
  | 'run_started'
  | 'assistant_text_delta'
  | 'plan_steps'
  | 'step_started'
  | 'step_completed'
  | 'stdout'
  | 'artifact_written'
  | 'tool_call'
  | 'tool_result'
  | 'run_completed'
  | 'run_failed';

export interface RunEvent<T = Record<string, unknown>> {
  id: string;
  runId: string;
  type: RunEventType;
  data: T;
  createdAt: number;
}

export interface TranscriptItem {
  id: string;
  kind: 'user_prompt' | 'assistant_text' | 'plan_steps' | 'tool_result' | 'tool_call' | 'run_status' | 'artifact_written';
  createdAt: number;
  data: Record<string, unknown>;
}
