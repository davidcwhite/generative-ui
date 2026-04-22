import { db } from '../db.js';
import type { RunRecord, RunStatus } from '../agent/types.js';

function rowToRun(row: Record<string, unknown>): RunRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    status: row.status as RunStatus,
    prompt: String(row.prompt),
    artifactIds: JSON.parse(String(row.artifact_ids_json)),
    runtimeSessionId: row.runtime_session_id ? String(row.runtime_session_id) : null,
    error: row.error ? String(row.error) : null,
    startedAt: row.started_at == null ? null : Number(row.started_at),
    completedAt: row.completed_at == null ? null : Number(row.completed_at),
    createdAt: Number(row.created_at),
  };
}

const insertRunStmt = db.prepare(`
  INSERT INTO runs (
    id, session_id, status, prompt, artifact_ids_json,
    runtime_session_id, error, started_at, completed_at, created_at
  ) VALUES (
    @id, @session_id, @status, @prompt, @artifact_ids_json,
    @runtime_session_id, @error, @started_at, @completed_at, @created_at
  )
`);

const getRunStmt = db.prepare(`SELECT * FROM runs WHERE id = ?`);
const listRunsStmt = db.prepare(`
  SELECT * FROM runs
  WHERE session_id = ?
  ORDER BY created_at DESC
`);

const updateRunStatusStmt = db.prepare(`
  UPDATE runs
  SET status = @status,
      runtime_session_id = COALESCE(@runtime_session_id, runtime_session_id),
      error = @error,
      started_at = COALESCE(@started_at, started_at),
      completed_at = COALESCE(@completed_at, completed_at)
  WHERE id = @id
`);

export function insertRun(run: RunRecord): RunRecord {
  insertRunStmt.run({
    id: run.id,
    session_id: run.sessionId,
    status: run.status,
    prompt: run.prompt,
    artifact_ids_json: JSON.stringify(run.artifactIds),
    runtime_session_id: run.runtimeSessionId,
    error: run.error,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    created_at: run.createdAt,
  });

  return run;
}

export function getRunById(id: string): RunRecord | null {
  const row = getRunStmt.get(id);
  if (!row) return null;
  return rowToRun(row as Record<string, unknown>);
}

export function listRunsBySession(sessionId: string): RunRecord[] {
  return listRunsStmt.all(sessionId).map((row: unknown) => rowToRun(row as Record<string, unknown>));
}

export function updateRunStatus(
  id: string,
  updates: {
    status: RunStatus;
    runtimeSessionId?: string | null;
    error?: string | null;
    startedAt?: number | null;
    completedAt?: number | null;
  },
): void {
  updateRunStatusStmt.run({
    id,
    status: updates.status,
    runtime_session_id: updates.runtimeSessionId ?? null,
    error: updates.error ?? null,
    started_at: updates.startedAt ?? null,
    completed_at: updates.completedAt ?? null,
  });
}
