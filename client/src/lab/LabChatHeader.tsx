import type { ChangeEvent } from 'react';
import { variantOrder, variants } from './registry';
import type { LabInjectError, LabSpeed } from './types';

interface LabChatHeaderProps {
  activeVariantId: string;
  onVariantChange: (id: string) => void;
  speed: LabSpeed;
  onSpeedChange: (speed: LabSpeed) => void;
  injectError: LabInjectError;
  onInjectErrorChange: (mode: LabInjectError) => void;
  onReplay: () => void;
  isStreaming: boolean;
  onStop: () => void;
}

const SELECT_CLS =
  'h-8 rounded-md border border-stone-200 bg-white px-2 text-xs text-stone-700 hover:border-stone-300 focus:border-stone-400 focus:outline-none';

export function LabChatHeader({
  activeVariantId,
  onVariantChange,
  speed,
  onSpeedChange,
  injectError,
  onInjectErrorChange,
  onReplay,
  isStreaming,
  onStop,
}: LabChatHeaderProps) {
  const blurb = variants[activeVariantId]?.blurb;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          UX Lab
        </span>
        <select
          aria-label="Variant"
          value={activeVariantId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onVariantChange(e.target.value)
          }
          className={SELECT_CLS}
        >
          {variantOrder.map((id) => (
            <option key={id} value={id}>
              {variants[id].label}
            </option>
          ))}
        </select>
        <select
          aria-label="Speed"
          value={speed}
          onChange={(e) => onSpeedChange(e.target.value as LabSpeed)}
          className={SELECT_CLS}
        >
          <option value="fast">Speed · Fast</option>
          <option value="normal">Speed · Normal</option>
          <option value="slow">Speed · Slow</option>
        </select>
        <select
          aria-label="Inject error"
          value={injectError}
          onChange={(e) =>
            onInjectErrorChange(e.target.value as LabInjectError)
          }
          className={SELECT_CLS}
        >
          <option value="none">Errors · None</option>
          <option value="tool">Errors · Tool</option>
          <option value="stream">Errors · Stream</option>
        </select>
        <div className="ml-auto flex items-center gap-1.5">
          {isStreaming && (
            <button
              type="button"
              onClick={onStop}
              className="h-8 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onReplay}
            className="h-8 rounded-md bg-stone-900 px-3 text-xs font-medium text-white hover:bg-stone-800"
          >
            ↻ Replay
          </button>
        </div>
      </div>
      {blurb && <p className="text-[11px] text-stone-500">{blurb}</p>}
    </div>
  );
}
