import { randomUUID } from 'node:crypto';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ArtifactRecord, RunRecord } from '../agent/types.js';
import { getArtifacts } from '../artifacts/service.js';
import { publishRunEvent } from '../events/service.js';
import { e2bRuntime } from '../runtime/e2b-adapter.js';
import { getRunById, updateRunStatus } from './repository.js';

function buildArtifactManifest(artifacts: ArtifactRecord[]): string {
  if (artifacts.length === 0) {
    return 'No artifacts attached.';
  }

  return artifacts
    .map((artifact) => {
      const preview = artifact.previewJson;
      const files = artifact.metadataJson.sandboxFiles
        .map((file) => `/home/user/${file.relativePath}`)
        .join(', ');
      const columns = preview?.sheets[0]?.headers.join(', ') || 'unknown';
      return `- ${artifact.originalName} (${artifact.rowCount} rows)\n  Sandbox files: ${files}\n  Columns: ${columns}`;
    })
    .join('\n');
}

function buildRunPrompt(run: RunRecord, artifacts: ArtifactRecord[]): string {
  return `You are a data analysis agent executing inside a persisted run.

The user prompt is:
${run.prompt}

Artifacts attached to this run:
${buildArtifactManifest(artifacts)}

Rules:
- If the task is multi-step, call plan_steps first.
- Use execute_code for analysis, statistics, transformations, charts, and anything involving reasoning over the uploaded data.
- Use run_terminal for quick file inspection or shell tasks.
- The uploaded files are already available in /home/user/.
- Keep the final response concise and useful.
- Prefer pandas for data loading and analysis.
`;
}

function createRunTools(runId: string, artifacts: ArtifactRecord[]) {
  return {
    plan_steps: {
      description: 'Show a structured task plan for this run.',
      parameters: z.object({
        title: z.string(),
        steps: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            tool: z.string().optional(),
          }),
        ),
      }),
      execute: async (args: { title: string; steps: Array<{ id: string; label: string; tool?: string }> }) => {
        publishRunEvent(runId, 'plan_steps', args);
        return args;
      },
    },

    execute_code: {
      description:
        'Execute Python or JavaScript against the attached run artifacts that already exist in /home/user/.',
      parameters: z.object({
        code: z.string(),
        language: z.enum(['python', 'javascript']).default('python'),
      }),
      execute: async (args: { code: string; language?: 'python' | 'javascript' }) => {
        const callId = randomUUID();
        publishRunEvent(runId, 'tool_call', {
          toolName: 'execute_code',
          toolCallId: callId,
          args,
        });
        const result = await e2bRuntime.executeCode(runId, args.code, args.language || 'python');
        publishRunEvent(runId, 'tool_result', {
          toolName: 'execute_code',
          toolCallId: callId,
          args,
          result,
        });
        return result;
      },
    },

    run_terminal: {
      description: 'Run a terminal command inside the run sandbox.',
      parameters: z.object({
        command: z.string(),
      }),
      execute: async (args: { command: string }) => {
        const callId = randomUUID();
        publishRunEvent(runId, 'tool_call', {
          toolName: 'run_terminal',
          toolCallId: callId,
          args,
        });
        const result = await e2bRuntime.runTerminal(runId, args.command);
        publishRunEvent(runId, 'tool_result', {
          toolName: 'run_terminal',
          toolCallId: callId,
          args,
          result,
        });
        return result;
      },
    },

    list_sandbox_files: {
      description: 'List files inside the run sandbox.',
      parameters: z.object({
        path: z.string().default('/home/user'),
      }),
      execute: async (args: { path: string }) => {
        const callId = randomUUID();
        publishRunEvent(runId, 'tool_call', {
          toolName: 'list_sandbox_files',
          toolCallId: callId,
          args,
        });
        const files = await e2bRuntime.listFiles(runId, args.path || '/home/user');
        const result = {
          success: true,
          files,
          path: args.path || '/home/user',
        };
        publishRunEvent(runId, 'tool_result', {
          toolName: 'list_sandbox_files',
          toolCallId: callId,
          args,
          result,
        });
        return result;
      },
    },
  };
}

export async function executeRun(runId: string): Promise<void> {
  const run = getRunById(runId);
  if (!run) return;

  updateRunStatus(runId, {
    status: 'running',
    startedAt: Date.now(),
  });
  publishRunEvent(runId, 'run_started', { runId });

  if (!e2bRuntime.isConfigured()) {
    const error = 'E2B_API_KEY not configured. Runtime is unavailable.';
    updateRunStatus(runId, {
      status: 'failed',
      error,
      completedAt: Date.now(),
    });
    publishRunEvent(runId, 'run_failed', { error });
    return;
  }

  try {
    const artifacts = getArtifacts(run.artifactIds);
    const sessionInfo = await e2bRuntime.ensureSession(runId);

    updateRunStatus(runId, {
      status: 'running',
      runtimeSessionId: sessionInfo?.sandboxId ?? null,
    });

    const writtenPaths = await e2bRuntime.materializeArtifacts(runId, artifacts);
    for (const path of writtenPaths) {
      publishRunEvent(runId, 'artifact_written', {
        path,
        source: 'artifact_materialization',
      });
    }

    const result: any = await generateText({
      model: openai('gpt-4o'),
      prompt: buildRunPrompt(run, artifacts),
      tools: createRunTools(runId, artifacts),
      maxSteps: 8,
    });

    if (result?.text) {
      publishRunEvent(runId, 'assistant_text_delta', {
        text: result.text,
      });
    }

    updateRunStatus(runId, {
      status: 'completed',
      completedAt: Date.now(),
    });
    publishRunEvent(runId, 'run_completed', {
      runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateRunStatus(runId, {
      status: 'failed',
      error: message,
      completedAt: Date.now(),
    });
    publishRunEvent(runId, 'run_failed', {
      error: message,
    });
  }
}
