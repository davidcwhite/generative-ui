import { db } from '../db.js';
import type { ArtifactRecord } from '../agent/types.js';

function rowToArtifact(row: Record<string, unknown>): ArtifactRecord {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    kind: row.kind as ArtifactRecord['kind'],
    originalName: String(row.original_name),
    mimeType: String(row.mime_type),
    storagePath: String(row.storage_path),
    previewJson: row.preview_json ? JSON.parse(String(row.preview_json)) : null,
    schemaJson: row.schema_json ? JSON.parse(String(row.schema_json)) : null,
    metadataJson: JSON.parse(String(row.metadata_json)),
    rowCount: Number(row.row_count),
    createdAt: Number(row.created_at),
  };
}

const insertArtifactStmt = db.prepare(`
  INSERT INTO artifacts (
    id, session_id, kind, original_name, mime_type, storage_path,
    preview_json, schema_json, metadata_json, row_count, created_at
  ) VALUES (
    @id, @session_id, @kind, @original_name, @mime_type, @storage_path,
    @preview_json, @schema_json, @metadata_json, @row_count, @created_at
  )
`);

const listArtifactsBySessionStmt = db.prepare(`
  SELECT * FROM artifacts
  WHERE session_id = ?
  ORDER BY created_at DESC
`);

const getArtifactByIdStmt = db.prepare(`
  SELECT * FROM artifacts
  WHERE id = ?
`);

const deleteArtifactStmt = db.prepare(`
  DELETE FROM artifacts
  WHERE id = ?
`);

export function insertArtifact(artifact: ArtifactRecord): ArtifactRecord {
  insertArtifactStmt.run({
    id: artifact.id,
    session_id: artifact.sessionId,
    kind: artifact.kind,
    original_name: artifact.originalName,
    mime_type: artifact.mimeType,
    storage_path: artifact.storagePath,
    preview_json: artifact.previewJson ? JSON.stringify(artifact.previewJson) : null,
    schema_json: artifact.schemaJson ? JSON.stringify(artifact.schemaJson) : null,
    metadata_json: JSON.stringify(artifact.metadataJson),
    row_count: artifact.rowCount,
    created_at: artifact.createdAt,
  });

  return artifact;
}

export function listArtifactsBySession(sessionId: string): ArtifactRecord[] {
  return listArtifactsBySessionStmt.all(sessionId).map((row: unknown) =>
    rowToArtifact(row as Record<string, unknown>),
  );
}

export function getArtifactById(id: string): ArtifactRecord | null {
  const row = getArtifactByIdStmt.get(id);
  if (!row) return null;
  return rowToArtifact(row as Record<string, unknown>);
}

export function getArtifactsByIds(ids: string[]): ArtifactRecord[] {
  return ids
    .map((id) => getArtifactById(id))
    .filter((artifact): artifact is ArtifactRecord => artifact !== null);
}

export function deleteArtifactById(id: string): boolean {
  return deleteArtifactStmt.run(id).changes > 0;
}
