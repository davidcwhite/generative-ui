import ReactMarkdown from 'react-markdown';
import { StepCard, type StepStatus } from '../components/StepCard';
import { FileChip } from '../components/FileChip';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

interface ToolMeta {
  title: string;
  subtitle: (args: Record<string, unknown>) => string;
  artifact?: (args: Record<string, unknown>) => {
    filename: string;
    language?: string;
  };
}

const TOOL_META: Record<string, ToolMeta> = {
  resolve_entity: {
    title: 'Resolving entity',
    subtitle: (args) => `query "${(args as { query?: string }).query ?? ''}"`,
  },
  get_issuer_deals: {
    title: 'Loading issuance history',
    subtitle: (args) =>
      `issuer ${(args as { issuerId?: string }).issuerId ?? ''}`,
  },
  generate_mandate_brief: {
    title: 'Drafting mandate brief',
    subtitle: (args) =>
      `${(args as { issuerId?: string }).issuerId ?? ''} · ${
        ((args as { sections?: string[] }).sections ?? []).length
      } sections`,
    artifact: (args) => ({
      filename: `${(args as { issuerId?: string }).issuerId ?? 'brief'}-mandate.md`,
      language: 'markdown',
    }),
  },
};

function formatDuration(ms?: number): string | undefined {
  if (ms === undefined) return undefined;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// V2 Claude Steps — collapsible operation card per tool. Mirrors the
// Claude "Writing to organiser.py" pattern: icon + verb + status + a
// disclosable artifact / arguments / result body.
export function V2ClaudeSteps({ message }: VariantRenderProps) {
  return (
    <div className="flex flex-col gap-3">
      {(message.parts ?? []).map((part, i) => {
        if (part.type === 'text') {
          if (!part.text.trim()) return null;
          return (
            <div key={i} className="markdown-content">
              <ReactMarkdown>{part.text}</ReactMarkdown>
            </div>
          );
        }
        if (part.type === 'tool-invocation') {
          const inv = part.toolInvocation;
          const meta = TOOL_META[inv.toolName] ?? {
            title: inv.toolName,
            subtitle: () => '',
          };
          const args = (inv.args ?? {}) as Record<string, unknown>;
          const status: StepStatus =
            inv.state === 'result' ? 'done' : 'running';
          const artifact = meta.artifact?.(args);
          const result =
            inv.state === 'result' ? (inv.result as unknown) : undefined;
          const isMandateBrief =
            inv.toolName === 'generate_mandate_brief' &&
            inv.state === 'result' &&
            (result as { brief?: MandateBrief })?.brief;

          return (
            <StepCard
              key={inv.toolCallId}
              status={status}
              title={meta.title}
              subtitle={meta.subtitle(args)}
              meta={status === 'done' ? formatDuration(undefined) : undefined}
              defaultExpanded={Boolean(isMandateBrief)}
            >
              <div className="flex flex-col gap-2">
                {artifact && (
                  <div>
                    <FileChip filename={artifact.filename} language={artifact.language} />
                  </div>
                )}
                {isMandateBrief ? (
                  <MandateBriefView
                    brief={(result as { brief: MandateBrief }).brief}
                    exportFormats={
                      (result as { exportFormats?: string[] }).exportFormats
                    }
                  />
                ) : (
                  <>
                    <JsonInspector label="Arguments" value={args} />
                    {status === 'done' && (
                      <JsonInspector label="Result" value={result} />
                    )}
                  </>
                )}
              </div>
            </StepCard>
          );
        }
        return null;
      })}
    </div>
  );
}
