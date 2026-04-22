import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { artifactStorageRoot } from '../db.js';
import type {
  ArtifactRecord,
  ArtifactSandboxFile,
  ArtifactUploadPayload,
  ParsedFilePreview,
} from '../agent/types.js';
import {
  deleteArtifactById,
  getArtifactById,
  getArtifactsByIds,
  insertArtifact,
  listArtifactsBySession,
} from './repository.js';

function sanitizeFileName(name: string): string {
  return basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function deriveSchema(preview: ParsedFilePreview | null): Record<string, unknown> | null {
  if (!preview?.sheets.length) return null;
  const firstSheet = preview.sheets[0];
  return {
    columns: firstSheet.headers,
    sheets: preview.sheets.map((sheet) => ({
      name: sheet.name,
      headers: sheet.headers,
      rowCount: sheet.rowCount,
    })),
  };
}

function sheetRowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escapeField = (value: unknown): string => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [
    headers.map(escapeField).join(','),
    ...rows.map((row) => headers.map((header) => escapeField(row[header])).join(',')),
  ].join('\n');
}

function materializeSandboxFiles(artifactDir: string, preview: ParsedFilePreview | null): ArtifactSandboxFile[] {
  if (!preview) return [];

  const baseName = sanitizeFileName(preview.fileName).replace(/\.[^.]+$/, '');
  const sandboxFiles: ArtifactSandboxFile[] = [];

  for (const sheet of preview.sheets) {
    const suffix = preview.sheets.length > 1 ? `_${sheet.name.replace(/[^a-zA-Z0-9._-]/g, '_')}` : '';
    const relativePath = `${baseName}${suffix}.csv`;
    const storagePath = resolve(artifactDir, relativePath);
    writeFileSync(storagePath, sheetRowsToCsv(sheet.headers, sheet.rows), 'utf8');
    sandboxFiles.push({
      relativePath,
      storagePath,
      sheetName: sheet.name,
    });
  }

  return sandboxFiles;
}

export function createArtifactFromUpload(payload: ArtifactUploadPayload): ArtifactRecord {
  const id = randomUUID();
  const createdAt = Date.now();
  const safeName = sanitizeFileName(payload.fileName);
  const artifactDir = resolve(artifactStorageRoot, id);
  mkdirSync(artifactDir, { recursive: true });

  const binary = Buffer.from(payload.base64, 'base64');
  const storedFilePath = resolve(artifactDir, safeName);
  writeFileSync(storedFilePath, binary);

  const sandboxFiles = materializeSandboxFiles(artifactDir, payload.parsedData);

  const artifact: ArtifactRecord = {
    id,
    sessionId: payload.sessionId,
    kind: 'upload',
    originalName: payload.fileName,
    mimeType: payload.mimeType || 'application/octet-stream',
    storagePath: storedFilePath,
    previewJson: payload.parsedData,
    schemaJson: deriveSchema(payload.parsedData),
    metadataJson: {
      sizeBytes: payload.sizeBytes,
      sandboxFiles,
    },
    rowCount: payload.parsedData?.totalRows ?? 0,
    createdAt,
  };

  return insertArtifact(artifact);
}

export function listSessionArtifacts(sessionId: string): ArtifactRecord[] {
  return listArtifactsBySession(sessionId);
}

export function getArtifact(artifactId: string): ArtifactRecord | null {
  return getArtifactById(artifactId);
}

export function getArtifacts(artifactIds: string[]): ArtifactRecord[] {
  return getArtifactsByIds(artifactIds);
}

export function deleteArtifact(artifactId: string): boolean {
  const artifact = getArtifactById(artifactId);
  if (!artifact) return false;

  rmSync(resolve(artifactStorageRoot, artifactId), { recursive: true, force: true });
  return deleteArtifactById(artifactId);
}

export function getArtifactPreview(artifactId: string): ParsedFilePreview | null {
  const artifact = getArtifactById(artifactId);
  return artifact?.previewJson ?? null;
}

export function readArtifactSandboxFile(storagePath: string): string {
  return readFileSync(storagePath, 'utf8');
}

export function getArtifactPrimaryExtension(artifact: ArtifactRecord): string {
  return extname(artifact.originalName).toLowerCase();
}
