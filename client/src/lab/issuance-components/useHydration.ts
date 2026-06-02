import { useEffect, useState } from 'react';

/**
 * Ordered phases a component passes through as it "writes itself in":
 *  frame    -> the bordered container exists
 *  scaffold -> skeleton placeholders for every slot
 *  labels   -> static labels/titles resolve
 *  data     -> real values + charts hydrate
 *  done     -> animations settled
 */
export const HYDRATION_PHASES = [
  'frame',
  'scaffold',
  'labels',
  'data',
  'done',
] as const;

export type HydrationPhase = (typeof HYDRATION_PHASES)[number];
export type HydrationMode = 'progressive' | 'instant';

interface UseHydrationOptions {
  /** progressive plays the staged build-in; instant jumps straight to done. */
  mode: HydrationMode;
  /** Bump to replay the sequence (changing it restarts the timers). */
  runId: number;
  /** Stagger before this component starts hydrating (ms). */
  delay?: number;
  /** Time between phases (ms). */
  stepMs?: number;
}

export interface HydrationState {
  phase: HydrationPhase;
  phaseIndex: number;
  /** True once the sequence has reached (or passed) the given phase. */
  atLeast: (phase: HydrationPhase) => boolean;
  done: boolean;
}

const LAST_INDEX = HYDRATION_PHASES.length - 1;

export function useHydration({
  mode,
  runId,
  delay = 0,
  stepMs = 380,
}: UseHydrationOptions): HydrationState {
  const [index, setIndex] = useState(() =>
    mode === 'instant' ? LAST_INDEX : 0,
  );

  useEffect(() => {
    if (mode === 'instant') {
      setIndex(LAST_INDEX);
      return;
    }

    setIndex(0);
    const timers: number[] = [];
    for (let i = 1; i <= LAST_INDEX; i += 1) {
      const timer = window.setTimeout(() => setIndex(i), delay + stepMs * i);
      timers.push(timer);
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [mode, runId, delay, stepMs]);

  const phase = HYDRATION_PHASES[index];

  return {
    phase,
    phaseIndex: index,
    atLeast: (target) => index >= HYDRATION_PHASES.indexOf(target),
    done: index >= LAST_INDEX,
  };
}
