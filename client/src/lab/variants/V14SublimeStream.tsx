import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import { JsonInspector } from '../components/JsonInspector';
import { MandateBriefView } from '../components/MandateBriefView';
import {
  ProcessingWorkflow,
  type ProcessingWorkflowStep,
} from '../components/ProcessingWorkflow';
import type { VariantRenderProps } from '../types';
import { normalizeDcmMessageParts } from './dcmMessageNormalize';

const CHUNK_SIZE = 10;
const CHUNK_MS = 24;

const MOCK_SSE: Record<string, string> = {
  resolve_entity: [
    'data: {"event":"open","query":"BMW","scope":"issuer"}',
    'data: {"event":"alias","name":"Bayerische Motoren Werke AG"}',
    'data: {"event":"candidate","issuerId":"bmw-ag","score":0.98}',
    'data: {"event":"validate","country":"DE","ticker":"BMW"}',
    'data: {"event":"lock","entity":"BMW AG","confidence":"high"}',
    'data: {"event":"done","tool":"resolve_entity","elapsedMs":118}',
  ].join('\n'),
  get_issuer_deals: [
    'data: {"event":"cursor","issuerId":"bmw-ag","book":"EU IG"}',
    'data: {"event":"row","isin":"XS276000001","size":"EUR 500m"}',
    'data: {"event":"row","isin":"XS276000002","tenor":"5Y"}',
    'data: {"event":"row","isin":"XS276000003","coupon":"3.625%"}',
    'data: {"event":"summary","count":3,"notionalEurM":1750}',
    'data: {"event":"done","tool":"get_issuer_deals","elapsedMs":204}',
  ].join('\n'),
  generate_mandate_brief: [
    'data: {"event":"plan","sections":4,"tone":"brief-banker"}',
    'data: {"event":"draft","section":"issuer snapshot","tokens":42}',
    'data: {"event":"draft","section":"recent issuance","tokens":36}',
    'data: {"event":"draft","section":"market colour","tokens":28}',
    'data: {"event":"export","formats":["pdf","docx"],"status":"queued"}',
    'data: {"event":"done","tool":"generate_mandate_brief","elapsedMs":262}',
  ].join('\n'),
};

function mockBodyForTool(toolName: string): string {
  return (
    MOCK_SSE[toolName] ?? `data: {"event":"open","tool":"${toolName}"}`
  );
}

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

function SublimeStream({
  active,
  text,
}: {
  active: boolean;
  text: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lines = text.split('\n');
  const lastIndex = lines.length - 1;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div className="v14-stream" aria-label="Mock streamed data">
      <div className="v14-stream__label">receiving</div>
      <div ref={ref} className="v14-stream__viewport">
        <div className="v14-stream__stack">
          {lines.map((line, index) => (
            <div
              key={`${index}:${line}`}
              className={
                index === lastIndex
                  ? 'v14-stream__line v14-stream__line--current'
                  : 'v14-stream__line'
              }
            >
              {line}
              {active && index === lastIndex && (
                <span className="v14-stream__cursor" aria-hidden>
                  |
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// V14 · UX critique applied to V13: keep transparency, but make the
// stream quieter. Raw data is visible as ambient proof of work, while
// hierarchy and progressive disclosure keep the main stage readable.
export function V14SublimeStream({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const { mandateBrief, steps, trailingTexts } = useMemo(
    () => normalizeDcmMessageParts(message.parts),
    [message.id, message.parts],
  );
  const hasPayload =
    trailingTexts.length > 0 || Boolean(mandateBrief?.brief);

  const [streamTextByStepId, setStreamTextByStepId] = useState<
    Record<string, string>
  >({});

  const activeIndex = steps.findIndex((step) => step.state === 'running');
  const activeStepId = activeIndex >= 0 ? steps[activeIndex].id : '';
  const activeToolName =
    activeIndex >= 0 ? steps[activeIndex].toolName : '';
  const orchestrating =
    isLastMessage &&
    (status === 'submitted' || status === 'streaming') &&
    activeIndex >= 0;

  useEffect(() => {
    setStreamTextByStepId({});
  }, [message.id]);

  useEffect(() => {
    if (!orchestrating || !activeStepId || !activeToolName) return;

    const full = mockBodyForTool(activeToolName);
    let pos = 0;
    setStreamTextByStepId((prev) => ({ ...prev, [activeStepId]: '' }));

    const id = window.setInterval(() => {
      pos = Math.min(full.length, pos + CHUNK_SIZE);
      setStreamTextByStepId((prev) => ({
        ...prev,
        [activeStepId]: full.slice(0, pos),
      }));
      if (pos >= full.length) {
        window.clearInterval(id);
      }
    }, CHUNK_MS);

    return () => window.clearInterval(id);
  }, [orchestrating, activeStepId, activeToolName, message.id]);

  return (
    <ProcessingWorkflow
      steps={steps}
      status={status}
      isLastMessage={isLastMessage}
      messageId={message.id}
      hasPayload={hasPayload}
      renderInspector={renderStepInspector}
      orchestrating={orchestrating}
      hideStepMeta={({ step }) =>
        isLastMessage && Boolean(streamTextByStepId[step.id])
      }
      renderRowExtra={({ step }) => {
        const text = streamTextByStepId[step.id];
        return text ? (
          <SublimeStream active={step.state === 'running'} text={text} />
        ) : null;
      }}
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
