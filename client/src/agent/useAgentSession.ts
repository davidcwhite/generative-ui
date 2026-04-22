import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UploadedFile } from '../components/FileUploader';
import type { AgentRun, ArtifactRecord, RunEvent } from './types';
import { normalizeRunEvents } from './normalizeEvents';

const API_URL = import.meta.env.VITE_API_URL || '/api/dcm/chat';
const API_BASE = API_URL.replace('/api/dcm/chat', '');

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function toUploadedFile(artifact: ArtifactRecord): UploadedFile {
  return {
    id: artifact.id,
    name: artifact.originalName,
    size: artifact.metadataJson.sizeBytes,
    type: artifact.mimeType,
    file: new File([], artifact.originalName, { type: artifact.mimeType }),
    status: 'ready',
    parsedData: artifact.previewJson || undefined,
  };
}

function mergeEvents(existing: RunEvent[], incoming: RunEvent[]): RunEvent[] {
  const byId = new Map<string, RunEvent>();
  for (const event of [...existing, ...incoming]) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function useAgentSession(sessionId: string | null) {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [eventsByRunId, setEventsByRunId] = useState<Record<string, RunEvent[]>>({});
  const [isStartingRun, setIsStartingRun] = useState(false);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  const loadArtifacts = useCallback(async () => {
    if (!sessionId) {
      setArtifacts([]);
      return;
    }

    const response = await fetch(`${API_BASE}/api/artifacts?sessionId=${encodeURIComponent(sessionId)}`);
    if (!response.ok) return;
    const data = await response.json();
    setArtifacts(data.artifacts || []);
  }, [sessionId]);

  const loadRuns = useCallback(async () => {
    if (!sessionId) {
      setRuns([]);
      return;
    }

    const response = await fetch(`${API_BASE}/api/runs?sessionId=${encodeURIComponent(sessionId)}`);
    if (!response.ok) return;
    const data = await response.json();
    const fetchedRuns = (data.runs || []) as AgentRun[];
    setRuns(fetchedRuns);
    if (!selectedRunId && fetchedRuns.length > 0) {
      setSelectedRunId(fetchedRuns[0].id);
    }
  }, [selectedRunId, sessionId]);

  const loadRunEvents = useCallback(async (runId: string) => {
    const response = await fetch(`${API_BASE}/api/runs/${runId}/events`);
    if (!response.ok) return;
    const data = await response.json();
    setEventsByRunId((prev) => ({
      ...prev,
      [runId]: mergeEvents(prev[runId] || [], data.events || []),
    }));
  }, []);

  const subscribeToRun = useCallback(
    (runId: string) => {
      if (eventSourcesRef.current.has(runId)) return;

      const source = new EventSource(`${API_BASE}/api/runs/${runId}/stream`);
      source.onmessage = (event) => {
        const parsed = JSON.parse(event.data) as RunEvent;
        setEventsByRunId((prev) => ({
          ...prev,
          [runId]: mergeEvents(prev[runId] || [], [parsed]),
        }));

        if (parsed.type === 'run_started' || parsed.type === 'run_completed' || parsed.type === 'run_failed') {
          void loadRuns();
        }
      };
      source.onerror = () => {
        source.close();
        eventSourcesRef.current.delete(runId);
      };
      eventSourcesRef.current.set(runId, source);
    },
    [loadRuns],
  );

  useEffect(() => {
    void loadArtifacts();
    void loadRuns();
  }, [loadArtifacts, loadRuns]);

  useEffect(() => {
    if (!selectedRunId) return;
    void loadRunEvents(selectedRunId);
    subscribeToRun(selectedRunId);
  }, [selectedRunId, loadRunEvents, subscribeToRun]);

  useEffect(() => {
    return () => {
      for (const source of eventSourcesRef.current.values()) {
        source.close();
      }
      eventSourcesRef.current.clear();
    };
  }, []);

  const uploadParsedFiles = useCallback(
    async (files: UploadedFile[]) => {
      if (!sessionId) return;

      for (const file of files) {
        if (!file.parsedData) continue;

        const payload = {
          sessionId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          base64: await fileToBase64(file.file),
          parsedData: file.parsedData,
        };

        const response = await fetch(`${API_BASE}/api/artifacts/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      await loadArtifacts();
    },
    [loadArtifacts, sessionId],
  );

  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      await fetch(`${API_BASE}/api/artifacts/${artifactId}`, { method: 'DELETE' });
      setArtifacts((prev) => prev.filter((artifact) => artifact.id !== artifactId));
    },
    [],
  );

  const createRun = useCallback(
    async (prompt: string) => {
      if (!sessionId) return null;

      setIsStartingRun(true);
      try {
        const response = await fetch(`${API_BASE}/api/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            prompt,
            artifactIds: artifacts.map((artifact) => artifact.id),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start run');
        }

        const data = await response.json();
        const run = data.run as AgentRun;
        setRuns((prev) => [run, ...prev.filter((existing) => existing.id !== run.id)]);
        setSelectedRunId(run.id);
        subscribeToRun(run.id);
        return run;
      } finally {
        setIsStartingRun(false);
      }
    },
    [artifacts, sessionId, subscribeToRun],
  );

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId],
  );

  const selectedRunEvents = selectedRunId ? eventsByRunId[selectedRunId] || [] : [];
  const transcriptItems = useMemo(
    () => normalizeRunEvents(selectedRun, selectedRunEvents),
    [selectedRun, selectedRunEvents],
  );

  return {
    artifacts,
    uploadedFiles: artifacts.map(toUploadedFile),
    runs,
    selectedRun,
    selectedRunId,
    selectedRunEvents,
    transcriptItems,
    isStartingRun,
    setSelectedRunId,
    refreshArtifacts: loadArtifacts,
    refreshRuns: loadRuns,
    uploadParsedFiles,
    deleteArtifact,
    createRun,
  };
}
