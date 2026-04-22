import type express from 'express';
import { randomUUID } from 'node:crypto';
import type { RunEventRecord, RunEventType } from '../agent/types.js';
import { insertRunEvent, listRunEvents } from './repository.js';

const subscribers = new Map<string, Set<express.Response>>();

function writeSse(res: express.Response, event: RunEventRecord) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function publishRunEvent<T extends Record<string, unknown>>(
  runId: string,
  type: RunEventType,
  data: T,
): RunEventRecord<T> {
  const event: RunEventRecord<T> = {
    id: randomUUID(),
    runId,
    type,
    data,
    createdAt: Date.now(),
  };

  insertRunEvent(event as RunEventRecord);

  const runSubscribers = subscribers.get(runId);
  if (runSubscribers) {
    for (const res of runSubscribers) {
      writeSse(res, event as RunEventRecord);
    }
  }

  return event;
}

export function listEventsForRun(runId: string): RunEventRecord[] {
  return listRunEvents(runId);
}

export function subscribeToRunEvents(runId: string, res: express.Response): () => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const historicalEvents = listRunEvents(runId);
  for (const event of historicalEvents) {
    writeSse(res, event);
  }

  if (!subscribers.has(runId)) {
    subscribers.set(runId, new Set());
  }
  subscribers.get(runId)!.add(res);

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  return () => {
    clearInterval(heartbeat);
    subscribers.get(runId)?.delete(res);
    if (subscribers.get(runId)?.size === 0) {
      subscribers.delete(runId);
    }
  };
}
