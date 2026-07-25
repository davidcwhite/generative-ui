import { useSyncExternalStore } from 'react';
import type { CompsSpec } from './contract';
import { writeSpecToUrl } from './urlState';

/**
 * The chat → workspace hop.
 *
 * What travels is the spec, never the payload. The chat block shows numbers
 * frozen at the moment the agent answered; the workspace re-executes the same
 * recipe against live data. If the market has moved, the two disagree, and
 * that disagreement is information rather than a bug.
 */

interface Target {
  spec: CompsSpec;
  /** Bumped every request so repeat clicks on the same spec still navigate. */
  nonce: number;
}

let target: Target | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openInWorkspace(spec: CompsSpec) {
  target = { spec, nonce: (target?.nonce ?? 0) + 1 };
  writeSpecToUrl(spec);
  listeners.forEach((listener) => listener());
}

export function useWorkspaceTarget(): Target | null {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}
