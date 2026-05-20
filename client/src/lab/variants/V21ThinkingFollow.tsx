import { useEffect, useState } from 'react';
import { ThinkingBlock } from '../components/ThinkingBlock';
import type { VariantRenderProps } from '../types';

// V21 · Thinking follow.
// Mock timeline drives duration only — UI is just the OpenCode-style dot matrix.
// Inner dots pulse to primary green at peak; outer dots stay soft gray.

const MOCK_TIMELINE_LENGTH = 8;

const REVEAL_DELAY_MS = 420;
const LINGER_AFTER_COMPLETE_MS = 2800;

export function V21ThinkingFollow({ message, isLastMessage }: VariantRenderProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showBlock, setShowBlock] = useState(true);
  const active = visibleCount < MOCK_TIMELINE_LENGTH;

  useEffect(() => {
    setVisibleCount(0);
    setShowBlock(true);
  }, [message.id]);

  useEffect(() => {
    if (!isLastMessage && visibleCount < MOCK_TIMELINE_LENGTH) {
      setVisibleCount(MOCK_TIMELINE_LENGTH);
    }
  }, [isLastMessage, visibleCount]);

  useEffect(() => {
    if (visibleCount >= MOCK_TIMELINE_LENGTH || !isLastMessage) return;
    const timeout = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, MOCK_TIMELINE_LENGTH));
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [visibleCount, isLastMessage]);

  useEffect(() => {
    if (active) return;
    const timeout = window.setTimeout(() => {
      setShowBlock(false);
    }, LINGER_AFTER_COMPLETE_MS);
    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!showBlock) return null;

  return (
    <div className="px-3 py-2" aria-live="polite" aria-busy={active}>
      <ThinkingBlock size={18} />
    </div>
  );
}
