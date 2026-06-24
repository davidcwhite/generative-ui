import type { HydrationMode } from '../issuance-components/useHydration';

/**
 * Uniform signature for every studio component: a typed payload plus the
 * shared hydration controls. No behaviour booleans — structural variants are
 * separate components, content differences live in `data`.
 */
export interface IssuanceComponentProps<T> {
  data: T;
  mode: HydrationMode;
  runId: number;
  delay?: number;
}
