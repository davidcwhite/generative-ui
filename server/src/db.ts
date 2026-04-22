import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const RUNTIME_ROOT = resolve(process.cwd(), '../data/runtime');
const DB_PATH = resolve(RUNTIME_ROOT, 'app.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const runtimeRoot = RUNTIME_ROOT;
export const artifactStorageRoot = resolve(RUNTIME_ROOT, 'artifacts');

mkdirSync(artifactStorageRoot, { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    preview_json TEXT,
    schema_json TEXT,
    metadata_json TEXT NOT NULL,
    row_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT NOT NULL,
    artifact_ids_json TEXT NOT NULL,
    runtime_session_id TEXT,
    error TEXT,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS run_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);
  CREATE INDEX IF NOT EXISTS idx_runs_session_id ON runs(session_id);
  CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events(run_id, created_at);
`);
