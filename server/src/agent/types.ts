export type ArtifactKind = 'upload' | 'derived' | 'report' | 'chart' | 'log';
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ParsedSheetPreview {
  name: string;
  headers: string[];
  rows: Record<string, string | number | boolean | null>[];
  rowCount: number;
}

export interface ParsedFilePreview {
  fileName: string;
  sheets: ParsedSheetPreview[];
  totalRows: number;
  parseTime?: number;
}

export interface ArtifactSandboxFile {
  relativePath: string;
  storagePath: string;
  sheetName?: string;
}

export interface ArtifactRecord {
  id: string;
  sessionId: string;
  kind: ArtifactKind;
  originalName: string;
  mimeType: string;
  storagePath: string;
  previewJson: ParsedFilePreview | null;
  schemaJson: Record<string, unknown> | null;
  metadataJson: {
    sizeBytes: number;
    sandboxFiles: ArtifactSandboxFile[];
  };
  rowCount: number;
  createdAt: number;
}

export interface RunRecord {
  id: string;
  sessionId: string;
  status: RunStatus;
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

export interface RunEventRecord<T = Record<string, unknown>> {
  id: string;
  runId: string;
  type: RunEventType;
  data: T;
  createdAt: number;
}

export interface ArtifactUploadPayload {
  sessionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
  parsedData: ParsedFilePreview | null;
}
