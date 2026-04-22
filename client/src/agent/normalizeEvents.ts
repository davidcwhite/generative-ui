import type { AgentRun, RunEvent, TranscriptItem } from './types';

export function normalizeRunEvents(run: AgentRun | null, events: RunEvent[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];

  if (run) {
    items.push({
      id: `prompt-${run.id}`,
      kind: 'user_prompt',
      createdAt: run.createdAt,
      data: {
        prompt: run.prompt,
      },
    });
  }

  for (const event of events) {
    switch (event.type) {
      case 'assistant_text_delta':
        items.push({
          id: event.id,
          kind: 'assistant_text',
          createdAt: event.createdAt,
          data: event.data,
        });
        break;
      case 'plan_steps':
        items.push({
          id: event.id,
          kind: 'plan_steps',
          createdAt: event.createdAt,
          data: event.data,
        });
        break;
      case 'tool_call':
        items.push({
          id: event.id,
          kind: 'tool_call',
          createdAt: event.createdAt,
          data: event.data,
        });
        break;
      case 'tool_result':
        items.push({
          id: event.id,
          kind: 'tool_result',
          createdAt: event.createdAt,
          data: event.data,
        });
        break;
      case 'artifact_written':
        items.push({
          id: event.id,
          kind: 'artifact_written',
          createdAt: event.createdAt,
          data: event.data,
        });
        break;
      case 'run_failed':
      case 'run_completed':
      case 'run_started':
        items.push({
          id: event.id,
          kind: 'run_status',
          createdAt: event.createdAt,
          data: {
            type: event.type,
            ...event.data,
          },
        });
        break;
      default:
        break;
    }
  }

  return items.sort((a, b) => a.createdAt - b.createdAt);
}
