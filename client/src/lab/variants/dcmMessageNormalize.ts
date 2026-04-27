import {
  type MandateBrief,
} from '../components/MandateBriefView';
import { type ProcessingWorkflowStep } from '../components/ProcessingWorkflow';
import type { VariantRenderProps } from '../types';

export const WORKFLOW_STAGE: Record<string, string> = {
  resolve_entity: 'Resolving issuer entity',
  get_issuer_deals: 'Pulling recent issuance',
  generate_mandate_brief: 'Composing mandate brief',
};

export function isErrored(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    'error' in (result as Record<string, unknown>)
  );
}

export function compactJson(value: unknown, maxLen = 140): string {
  if (value === undefined) return '';
  let str: string;
  try {
    str = JSON.stringify(value);
  } catch {
    return '';
  }
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

export function normalizeDcmMessageParts(
  parts: VariantRenderProps['message']['parts'],
) {
  const steps: ProcessingWorkflowStep[] = [];
  let mandateBrief:
    | { brief: MandateBrief; exportFormats?: string[] }
    | undefined;
  const trailingTexts: string[] = [];

  for (const part of parts ?? []) {
    if (part.type === 'tool-invocation') {
      const inv = part.toolInvocation;
      const args = (inv.args ?? {}) as Record<string, unknown>;
      const result = inv.state === 'result' ? inv.result : undefined;
      const state: ProcessingWorkflowStep['state'] =
        inv.state === 'result'
          ? isErrored(result)
            ? 'errored'
            : 'done'
          : 'running';
      steps.push({
        id: inv.toolCallId,
        toolName: inv.toolName,
        stage: WORKFLOW_STAGE[inv.toolName] ?? inv.toolName,
        state,
        args,
        result,
        argsPreview: compactJson(args, 120),
        resultPreview: compactJson(result, 160),
        hasResult: result !== undefined,
      });
      if (
        inv.toolName === 'generate_mandate_brief' &&
        inv.state === 'result' &&
        !isErrored(result)
      ) {
        mandateBrief = result as {
          brief: MandateBrief;
          exportFormats?: string[];
        };
      }
    } else if (part.type === 'text' && part.text.trim()) {
      trailingTexts.push(part.text);
    }
  }

  return { mandateBrief, steps, trailingTexts };
}

