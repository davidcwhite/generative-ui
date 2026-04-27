import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
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

function prettyJson(value: unknown) {
  if (value === undefined) return 'No payload returned yet.';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderStepInspector(step: ProcessingWorkflowStep) {
  const stateLabel =
    step.state === 'done'
      ? 'Complete'
      : step.state === 'errored'
        ? 'Needs attention'
        : step.state === 'running'
          ? 'In progress'
          : 'Queued';

  const payload = [
    `tool: ${step.toolName}`,
    '',
    'input',
    prettyJson(step.args),
    '',
    'output',
    prettyJson(step.result),
  ].join('\n');

  return (
    <div className="v15-detail">
      <div className="v15-detail__head">
        <span className="v15-detail__title">Step detail</span>
        <span className={`v15-detail__pill v15-detail__pill--${step.state}`}>
          {stateLabel}
        </span>
      </div>
      <pre className="v15-detail__body">{payload}</pre>
    </div>
  );
}

function SoftFocusStream({
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
    <div className="v16-stream" aria-label="Mock streamed data">
      <div ref={ref} className="v16-stream__viewport">
        <div className="v16-stream__stack">
          {lines.map((line, index) => (
            <div
              key={`${index}:${line}`}
              className={
                index === lastIndex
                  ? 'v16-stream__line v16-stream__line--current'
                  : 'v16-stream__line'
              }
            >
              {line}
              {active && index === lastIndex && (
                <span className="v16-stream__cursor" aria-hidden>
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

// V16 · Conservative V15 fork: keep raw streamed records, but make the
// active line breathe with a softer focus treatment.
export function V16SoftFocusStream({
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
          <SoftFocusStream active={step.state === 'running'} text={text} />
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
