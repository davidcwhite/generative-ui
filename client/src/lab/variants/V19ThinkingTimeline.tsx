import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MandateBriefView } from '../components/MandateBriefView';
import type { VariantRenderProps } from '../types';
import { normalizeDcmMessageParts } from './dcmMessageNormalize';

const CHUNK_SIZE = 8;
const CHUNK_MS = 22;

// Per-tool "thinking" narrative. Each running step types its body in,
// mirroring the reasoning-trace UX where the model narrates its plan.
const STAGE_COPY: Record<string, { title: string; body: string }> = {
  resolve_entity: {
    title: 'Resolving the issuer entity',
    body: "Confirming which issuer “BMW” refers to. The strongest match is Bayerische Motoren Werke AG (BMW AG), a German automaker in the single-A ratings band. I’ll lock that entity first so the rest of the brief is anchored to the right name, sector and ratings.",
  },
  get_issuer_deals: {
    title: 'Pulling recent issuance',
    body: "Gathering BMW’s recent EUR benchmark supply — the last few senior deals with size, tenor, coupon and spread. This gives me the issuance cadence and a read on where new issue premiums have been landing versus secondary.",
  },
  generate_mandate_brief: {
    title: 'Composing the mandate brief',
    body: "Drafting the brief from the resolved entity and deal history: issuer snapshot, issuance track record, peer comparison and investor demand. Keeping it concise and banker-ready, with the underlying data points available to inspect.",
  },
};

function stageCopyFor(toolName: string): { title: string; body: string } {
  return (
    STAGE_COPY[toolName] ?? {
      title: toolName,
      body: 'Working through this step.',
    }
  );
}

// Synthetic sources for the leading "search" checkpoint. Monograms avoid
// any external favicon requests while keeping the source-chip affordance.
interface SourceChip {
  label: string;
  mono: string;
  tint: string;
}

const SEARCH_SOURCES: SourceChip[] = [
  { label: 'bloomberg.com', mono: 'B', tint: '#1A1A1A' },
  { label: 'ft.com', mono: 'FT', tint: '#9b6a4a' },
  { label: 'bmwgroup.com', mono: 'M', tint: '#1c69d4' },
];
const SEARCH_SOURCES_MORE = 11;

type NodeState = 'running' | 'done';

function MagnifyingGlass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path strokeLinecap="round" d="M15.4 15.4L20 20" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </svg>
  );
}

function SourceChips() {
  return (
    <div className="v19-think__sources">
      {SEARCH_SOURCES.map((source) => (
        <span key={source.label} className="v19-think__chip">
          <span
            className="v19-think__chip-mono"
            style={{ backgroundColor: source.tint }}
            aria-hidden
          >
            {source.mono}
          </span>
          {source.label}
        </span>
      ))}
      <span className="v19-think__chip v19-think__chip--more">
        +{SEARCH_SOURCES_MORE} more
      </span>
    </div>
  );
}

// V19 · Reasoning-trace timeline. A quiet vertical rail with checkpoint
// markers: a search node with source chips, one node per tool step whose
// body types in while it runs, and a settled "Thought for Ns" node.
export function V19ThinkingTimeline({
  message,
  status,
  isLastMessage,
}: VariantRenderProps) {
  const { mandateBrief, steps, trailingTexts } = useMemo(
    () => normalizeDcmMessageParts(message.parts),
    [message.id, message.parts],
  );
  const hasPayload = trailingTexts.length > 0 || Boolean(mandateBrief?.brief);

  const [streamTextByStepId, setStreamTextByStepId] = useState<
    Record<string, string>
  >({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);

  const activeIndex = steps.findIndex((step) => step.state === 'running');
  const activeStepId = activeIndex >= 0 ? steps[activeIndex].id : '';
  const activeToolName = activeIndex >= 0 ? steps[activeIndex].toolName : '';
  const isStreaming = status === 'submitted' || status === 'streaming';
  const orchestrating = isLastMessage && isStreaming;
  const settled = isLastMessage ? status === 'ready' || status === 'error' : true;

  // Reset per message.
  useEffect(() => {
    setStreamTextByStepId({});
    setElapsedSeconds(null);
    startRef.current = null;
  }, [message.id]);

  // Track elapsed "thinking" time: clock starts at first activity and
  // freezes once the run settles.
  useEffect(() => {
    if (!isLastMessage) return;
    if (orchestrating && startRef.current === null) {
      startRef.current = performance.now();
    }
    if (settled && startRef.current !== null && elapsedSeconds === null) {
      const secs = Math.max(1, Math.round((performance.now() - startRef.current) / 1000));
      setElapsedSeconds(secs);
    }
  }, [isLastMessage, orchestrating, settled, elapsedSeconds]);

  // Character pump for the active step's narrative body.
  useEffect(() => {
    if (!orchestrating || !activeStepId || !activeToolName) return;

    const full = stageCopyFor(activeToolName).body;
    let pos = 0;
    setStreamTextByStepId((prev) => ({ ...prev, [activeStepId]: '' }));

    const id = window.setInterval(() => {
      pos = Math.min(full.length, pos + CHUNK_SIZE);
      setStreamTextByStepId((prev) => ({
        ...prev,
        [activeStepId]: full.slice(0, pos),
      }));
      if (pos >= full.length) window.clearInterval(id);
    }, CHUNK_MS);

    return () => window.clearInterval(id);
  }, [orchestrating, activeStepId, activeToolName, message.id]);

  const hasStarted = steps.length > 0 || orchestrating;
  if (!hasStarted) {
    // Opening text only, no tool steps yet — show a minimal placeholder.
    return (
      <div className="v19-think" aria-label="Thinking">
        <p className="v19-think__label v19-think__label--live">Thinking</p>
      </div>
    );
  }

  const showDoneNode = settled && steps.length > 0;
  const headerLabel =
    showDoneNode && elapsedSeconds !== null ? 'Reasoned' : 'Thinking';

  return (
    <div className="v19-think">
      <p
        className={`v19-think__label ${
          !showDoneNode ? 'v19-think__label--live' : ''
        }`}
      >
        {headerLabel}
      </p>

      <ol className="v19-think__list" role="list">
        {/* Search checkpoint */}
        <li className="v19-think__node">
          <span className="v19-think__marker v19-think__marker--icon" aria-hidden>
            <MagnifyingGlass />
          </span>
          <div className="v19-think__content">
            <p className="v19-think__title">Searching issuer and market sources</p>
            <SourceChips />
          </div>
        </li>

        {/* One node per tool step */}
        {steps.map((step) => {
          const copy = stageCopyFor(step.toolName);
          const nodeState: NodeState =
            step.state === 'done' || step.state === 'errored'
              ? 'done'
              : 'running';
          const body =
            nodeState === 'done'
              ? copy.body
              : (streamTextByStepId[step.id] ?? '');
          return (
            <li key={step.id} className="v19-think__node">
              <span
                className={`v19-think__marker v19-think__marker--dot v19-think__marker--${nodeState}`}
                aria-hidden
              />
              <div className="v19-think__content">
                <p className="v19-think__title">{copy.title}</p>
                {body && (
                  <p className="v19-think__body">
                    {body}
                    {nodeState === 'running' && (
                      <span className="v19-think__cursor" aria-hidden>
                        |
                      </span>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}

        {/* Settled checkpoint */}
        {showDoneNode && (
          <li className="v19-think__node v19-think__node--done">
            <span className="v19-think__marker v19-think__marker--icon v19-think__marker--check" aria-hidden>
              <Check />
            </span>
            <div className="v19-think__content">
              <p className="v19-think__title">
                {elapsedSeconds !== null
                  ? `Thought for ${elapsedSeconds}s`
                  : 'Thought it through'}
              </p>
              <p className="v19-think__done">Done</p>
            </div>
          </li>
        )}
      </ol>

      {/* Final response, revealed after the trace settles */}
      {settled && hasPayload && (
        <div className="v19-think__payload flex flex-col gap-4">
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
        </div>
      )}
    </div>
  );
}
