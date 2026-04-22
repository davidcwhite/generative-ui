import { db } from '../db.js';
import type { RunEventRecord, RunEventType } from '../agent/types.js';

function rowToRunEvent(row: Record<string, unknown>): RunEventRecord {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    type: row.type as RunEventType,
    data: JSON.parse(String(row.data_json)),
    createdAt: Number(row.created_at),
  };
}

const insertRunEventStmt = db.prepare(`
  INSERT INTO run_events (
    id, run_id, type, data_json, created_at
  ) VALUES (
    @id, @run_id, @type, @data_json, @created_at
  )
`);

const listRunEventsStmt = db.prepare(`
  SELECT * FROM run_events
  WHERE run_id = ?
  ORDER BY created_at ASC
`);

export function insertRunEvent(event: RunEventRecord): RunEventRecord {
  insertRunEventStmt.run({
    id: event.id,
    run_id: event.runId,
    type: event.type,
    data_json: JSON.stringify(event.data),
    created_at: event.createdAt,
  });

  return event;
}

export function listRunEvents(runId: string): RunEventRecord[] {
  return listRunEventsStmt.all(runId).map((row: unknown) => rowToRunEvent(row as Record<string, unknown>));
}
