import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import {
  MandateBriefView,
  type MandateBrief,
} from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';

const TOOL_LABELS: Record<string, string> = {
  resolve_entity: 'Resolving entity',
  get_issuer_deals: 'Loading issuer deals',
  generate_mandate_brief: 'Drafting mandate brief',
};

// V1 Minimal — the baseline: italic "Resolving…" line per tool, replaced
// by an inline summary when the result lands. Used as a comparison anchor
// for the richer variants.
export function V1Minimal({ message }: VariantRenderProps) {
  return (
    <div className="flex flex-col gap-3">
      {(message.parts ?? []).map((part, i) => {
        if (part.type === 'text') {
          return (
            <div key={i} className="markdown-content">
              <ReactMarkdown>{part.text}</ReactMarkdown>
            </div>
          );
        }
        if (part.type === 'tool-invocation') {
          const inv = part.toolInvocation;
          const label = TOOL_LABELS[inv.toolName] ?? inv.toolName;
          if (inv.state === 'call' || inv.state === 'partial-call') {
            return (
              <div key={inv.toolCallId} className="py-1 italic text-stone-500">
                {label}…
              </div>
            );
          }
          // result state
          if (inv.toolName === 'generate_mandate_brief') {
            const result = inv.result as
              | { brief: MandateBrief; exportFormats?: string[] }
              | undefined;
            if (result?.brief) {
              return (
                <MandateBriefView
                  key={inv.toolCallId}
                  brief={result.brief}
                  exportFormats={result.exportFormats}
                />
              );
            }
          }
          return (
            <div
              key={inv.toolCallId}
              className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600"
            >
              <div className="mb-1 font-medium text-stone-700">{label}</div>
              <JsonInspector value={inv.result} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
