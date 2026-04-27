import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import { MandateBriefView } from '../components/MandateBriefView';
import {
  ProcessingWorkflow,
  type ProcessingWorkflowStep,
} from '../components/ProcessingWorkflow';
import type { VariantRenderProps } from '../types';
import { normalizeDcmMessageParts } from './dcmMessageNormalize';

/** Kept in sync with `.term-v11-g` transition in `index.css` */
const COLLAPSE_DUR_MS = 450;
/** Tiny breath after the grid has closed, before the answer bloops in */
const POST_COLLAPSE_MS = 120;

function renderStepInspector(step: ProcessingWorkflowStep) {
  return (
    <div className="ml-6 mt-1 mb-1 flex flex-col gap-1.5 font-sans text-[11px] text-stone-600">
      <JsonInspector label="args" value={step.args} defaultOpen />
      {step.state !== 'pending' && step.state !== 'running' && (
        <JsonInspector label="result" value={step.result} defaultOpen />
      )}
    </div>
  );
}

// V12 adapter. It converts AI SDK message parts into portable workflow
// steps, then delegates the UX state/animation to `ProcessingWorkflow`.
export function V12ResponseBloop({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const { mandateBrief, steps, trailingTexts } = normalizeDcmMessageParts(
    message.parts,
  );
  const hasPayload =
    trailingTexts.length > 0 || Boolean(mandateBrief?.brief);

  return (
    <ProcessingWorkflow
      steps={steps}
      status={status}
      isLastMessage={isLastMessage}
      messageId={message.id}
      hasPayload={hasPayload}
      renderInspector={renderStepInspector}
      collapseDurationMs={COLLAPSE_DUR_MS}
      postCollapseDelayMs={POST_COLLAPSE_MS}
    >
      {trailingTexts.length > 0 && (
        <div className="markdown-content">
          <ReactMarkdown>{trailingTexts.join('')}</ReactMarkdown>
        </div>
      )}

      {mandateBrief?.brief && (
        <MandateBriefView
          brief={mandateBrief.brief}
          exportFormats={mandateBrief.exportFormats}
        />
      )}
    </ProcessingWorkflow>
  );
}
