// Mock chat endpoint for the UX experiments lab.
//
// Emits real Vercel AI SDK v4 data-stream chunks (the same protocol
// `useChat` expects from `streamText().toDataStreamResponse()`) without
// invoking an LLM. The canonical event sequence comes from
// `server/src/scenarios/bmwMandateBrief.ts`, so swapping this URL for
// the real `/api/dcm/chat` is a one-line change in the client.

import type express from 'express';
import {
  runBmwMandateBriefScenario,
  type Speed,
  type InjectError,
  type ScenarioEvent,
} from '../scenarios/bmwMandateBrief.js';

function parseSpeed(value: unknown): Speed {
  if (value === 'fast' || value === 'slow' || value === 'normal') return value;
  return 'normal';
}

function parseInjectError(value: unknown): InjectError {
  if (value === 'tool' || value === 'stream') return value;
  return 'none';
}

// Format an event in the AI SDK v4 data-stream protocol (the wire format
// produced by `streamText().toDataStreamResponse()` and consumed by
// `useChat`).
//
//   f:<json>  — start_step (messageId)
//   0:<json>  — text delta (string)
//   9:<json>  — tool_call ({ toolCallId, toolName, args })
//   a:<json>  — tool_result ({ toolCallId, result })
//   3:<json>  — error (string)
//   e:<json>  — finish_step ({ finishReason, isContinued })
//   d:<json>  — finish_message ({ finishReason })
function formatChunk(ev: ScenarioEvent): string | null {
  switch (ev.kind) {
    case 'start_step':
      return `f:${JSON.stringify({ messageId: ev.messageId })}\n`;
    case 'text':
      return `0:${JSON.stringify(ev.text)}\n`;
    case 'tool_call':
      return `9:${JSON.stringify({
        toolCallId: ev.toolCallId,
        toolName: ev.toolName,
        args: ev.args,
      })}\n`;
    case 'tool_result':
      return `a:${JSON.stringify({
        toolCallId: ev.toolCallId,
        result: ev.result,
      })}\n`;
    case 'error':
      return `3:${JSON.stringify(ev.message)}\n`;
    case 'finish_step':
      return `e:${JSON.stringify({
        finishReason: ev.finishReason,
        isContinued: false,
      })}\n`;
    case 'finish_message':
      return `d:${JSON.stringify({ finishReason: ev.finishReason })}\n`;
    default:
      return null;
  }
}

export async function mockDcmChatRoute(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const speed = parseSpeed(req.query.speed ?? req.body?.speed);
  const injectError = parseInjectError(
    req.query.injectError ?? req.body?.injectError,
  );

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Vercel-AI-Data-Stream', 'v1');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Detect actual client disconnects mid-stream. We use `res.on('close')`
  // (Express-recommended) because in Node 25 `req.on('close')` fires as
  // soon as the request body is consumed, not when the client aborts.
  let aborted = false;
  const onClose = () => {
    aborted = true;
  };
  res.on('close', onClose);

  try {
    for await (const ev of runBmwMandateBriefScenario({ speed, injectError })) {
      if (aborted) break;
      const chunk = formatChunk(ev);
      if (chunk) {
        res.write(chunk);
      }
    }
  } catch (error) {
    console.error('Mock chat stream error:', error);
    if (!aborted) {
      const message = error instanceof Error ? error.message : String(error);
      res.write(`3:${JSON.stringify(message)}\n`);
    }
  } finally {
    res.off('close', onClose);
    if (!aborted) res.end();
  }
}
